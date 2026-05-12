import { useState, useRef } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../state/index.ts';
import { parseInput } from '../interaction/parser/index.ts';
import type { ParseResult } from '../interaction/parser/index.ts';
import { extractFormulaBody, evaluateFormulaBody } from '../interaction/parser/evaluate.ts';
import { mkVectorSpaceFn } from '../types/space.ts';
import { mkConcreteVector, mkDerivedVector } from '../types/vector.ts';
import { mkLinearMapByMatrix, mkDerivedMap } from '../types/map.ts';
import { mkMatrix } from '../types/matrix.ts';
import { rational, float } from '../types/scalar.ts';
import type { Scalar } from '../types/index.ts';
import type { BasisId, SpaceId } from '../types/ids.ts';
import type { VectorExpression, MapExpression } from '../types/derivation.ts';

const PLACEHOLDER_EXAMPLES = ['[[1, 2], [3, 4]]', '(1, -2, 3)', 'T(x, y) = (x + y, x - y)'];

function scalarToRational(v: number): Scalar {
  if (Number.isInteger(v)) return rational(v);
  const denom = 100;
  return rational(Math.round(v * denom), denom);
}

// Helper: resolve space and dimension from a vector expression.
function resolveVectorExprSpace(
  expr: VectorExpression,
  session: ReturnType<typeof defaultStore.getState>,
): { spaceId: SpaceId; dim: number } | null {
  let spaceId: string | undefined;
  let dim: number | undefined;
  if (expr.op === 'add' || expr.op === 'sub') {
    const v = session.vectors[expr.left];
    if (v?.kind === 'concrete') {
      spaceId = v.space;
      dim = v.components.length;
    }
  } else if (expr.op === 'scale') {
    const v = session.vectors[expr.vector];
    if (v?.kind === 'concrete') {
      spaceId = v.space;
      dim = v.components.length;
    }
  } else if (expr.op === 'apply') {
    const map = session.maps[expr.map];
    const codomainSpace = map ? session.spaces[map.codomain] : undefined;
    if (map && codomainSpace?.kind === 'Fn') {
      spaceId = map.codomain;
      dim = codomainSpace.n;
    }
  }
  if (!spaceId || dim === undefined) return null;
  return { spaceId: spaceId as SpaceId, dim };
}

type AddFn = ReturnType<typeof defaultStore.getState>['addVector'];
type AddMapFn = ReturnType<typeof defaultStore.getState>['addMap'];
type NameFn = ReturnType<typeof defaultStore.getState>['nameObject'];
type OpenFn = ReturnType<typeof defaultStore.getState>['openView'];

function applyVectorExpr(
  expr: VectorExpression,
  name: string,
  session: ReturnType<typeof defaultStore.getState>,
  addVector: AddFn,
  nameObject: NameFn,
  openView: OpenFn,
): string | null {
  const resolved = resolveVectorExprSpace(expr, session);
  if (!resolved)
    return 'Could not resolve vector dimensions — check objects exist and are compatible';
  const { spaceId, dim } = resolved;
  // Create with placeholder zeros; recomputeDerived (called by addVector) fills real values.
  const placeholder: Scalar[] = Array.from({ length: dim }, () => float(0));
  const derived = mkDerivedVector('R', spaceId, expr, placeholder);
  addVector(derived);
  nameObject(name || 'v', { kind: 'vector', id: derived.id });
  openView('symbolic', { kind: 'vector', id: derived.id });
  if (dim === 2) openView('geometric_2d', { kind: 'vector', id: derived.id });
  if (dim === 3) openView('geometric_3d', { kind: 'vector', id: derived.id });
  return null;
}

function applyMapExpr(
  expr: MapExpression,
  name: string,
  session: ReturnType<typeof defaultStore.getState>,
  addMap: AddMapFn,
  nameObject: NameFn,
  openView: OpenFn,
): string | null {
  let domainId: string | undefined;
  let codomainId: string | undefined;
  if (expr.op === 'compose') {
    domainId = session.maps[expr.right]?.domain;
    codomainId = session.maps[expr.left]?.codomain;
  } else if (expr.op === 'sum') {
    domainId = session.maps[expr.left]?.domain;
    codomainId = session.maps[expr.left]?.codomain;
  } else if (expr.op === 'scale') {
    domainId = session.maps[expr.map]?.domain;
    codomainId = session.maps[expr.map]?.codomain;
  }
  if (!domainId || !codomainId) return 'Could not determine map dimensions for expression';

  const dId = domainId as SpaceId;
  const cId = codomainId as SpaceId;
  const domSpace = session.spaces[dId];
  const codSpace = session.spaces[cId];
  const domDim = domSpace?.kind === 'Fn' ? domSpace.n : 2;
  const codDim = codSpace?.kind === 'Fn' ? codSpace.n : 2;

  const domBid = dId as unknown as BasisId;
  const codBid = cId as unknown as BasisId;
  // Zero-filled placeholder matrix; recomputeDerived fills real values.
  const zeroRows: Scalar[][] = Array.from({ length: codDim }, () =>
    Array.from({ length: domDim }, () => float(0)),
  );
  const mat = mkMatrix('R', zeroRows, domBid, codBid);
  if (!mat.ok) return mat.error.message;
  const derived = mkDerivedMap(dId, cId, expr, mat.value, domBid, codBid);
  if (!derived.ok) return derived.error.message;
  addMap(derived.value);
  nameObject(name || 'T', { kind: 'map', id: derived.value.id });
  openView('matrix', { kind: 'map', id: derived.value.id });
  if (codDim === 2 && domDim === 2) openView('diagram', { kind: 'map', id: derived.value.id });
  return null;
}

function applyParseResult(
  result: ParseResult,
  name: string,
  session: ReturnType<typeof defaultStore.getState>,
): string | null {
  const { addSpace, addVector, addMap, nameObject, openView } = defaultStore.getState();

  if (result.kind === 'error') return result.message;

  if (result.kind === 'ambiguous') {
    return applyParseResult(result.alternatives[0] ?? result, name, session);
  }

  if (result.kind === 'vector') {
    const n = result.components.length;
    const space = mkVectorSpaceFn(result.field, n);
    if (!space.ok) return space.error.message;
    let spaceId = space.value.id;
    if (!session.spaces[spaceId]) addSpace(space.value);
    const scalars = result.components.map(scalarToRational);
    const vec = mkConcreteVector(result.field, spaceId, scalars);
    if (!vec.ok) return vec.error.message;
    addVector(vec.value);
    const label = name || `v${Object.keys(session.vectors).length + 1}`;
    nameObject(label, { kind: 'vector', id: vec.value.id });
    openView('symbolic', { kind: 'vector', id: vec.value.id });
    if (n === 2) openView('geometric_2d', { kind: 'vector', id: vec.value.id });
    if (n === 3) openView('geometric_3d', { kind: 'vector', id: vec.value.id });
    return null;
  }

  if (result.kind === 'matrix') {
    const rows = result.matrix.rows;
    const cols = result.matrix.cols;
    const field = result.field;
    const domainSpace = mkVectorSpaceFn(field, cols);
    const codomainSpace = mkVectorSpaceFn(field, rows);
    if (!domainSpace.ok) return domainSpace.error.message;
    if (!codomainSpace.ok) return codomainSpace.error.message;
    if (!session.spaces[domainSpace.value.id]) addSpace(domainSpace.value);
    if (!session.spaces[codomainSpace.value.id]) addSpace(codomainSpace.value);
    const domainBasisId = domainSpace.value.id as unknown as BasisId;
    const codomainBasisId = codomainSpace.value.id as unknown as BasisId;
    const map = mkLinearMapByMatrix(
      domainSpace.value.id,
      codomainSpace.value.id,
      result.matrix,
      domainBasisId,
      codomainBasisId,
    );
    if (!map.ok) return map.error.message;
    addMap(map.value);
    const label = name || `A${Object.keys(session.maps).length + 1}`;
    nameObject(label, { kind: 'map', id: map.value.id });
    openView('matrix', { kind: 'map', id: map.value.id });
    if (rows === 2 && cols === 2) {
      openView('geometric_2d', { kind: 'map', id: map.value.id });
      openView('diagram', { kind: 'map', id: map.value.id });
    }
    return null;
  }

  if (result.kind === 'formula') {
    const n = result.params.length;
    const field = 'R';

    // Evaluate the formula body at each standard basis vector to recover the matrix columns.
    const body = extractFormulaBody(result.label);
    const columns: number[][] = [];
    for (let j = 0; j < n; j++) {
      const binding: Record<string, number> = {};
      result.params.forEach((p, i) => {
        binding[p] = i === j ? 1 : 0;
      });
      const col = evaluateFormulaBody(body, binding);
      if (typeof col === 'string') return `Formula error: ${col}`;
      columns.push(col);
    }

    // Infer codomain dimension from the output arity of the first column.
    const m = columns[0]?.length ?? n;
    const domainSpace = mkVectorSpaceFn(field, n);
    const codomainSpace = mkVectorSpaceFn(field, m);
    if (!domainSpace.ok) return domainSpace.error.message;
    if (!codomainSpace.ok) return codomainSpace.error.message;
    if (!session.spaces[domainSpace.value.id]) addSpace(domainSpace.value);
    if (!session.spaces[codomainSpace.value.id]) addSpace(codomainSpace.value);

    const domBid = domainSpace.value.id as unknown as BasisId;
    const codBid = codomainSpace.value.id as unknown as BasisId;

    // Build rows from columns: rows[i][j] = columns[j][i].
    const rows: Scalar[][] = Array.from({ length: m }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const v = columns[j]?.[i] ?? 0;
        return Number.isInteger(v) ? rational(v) : float(v);
      }),
    );
    const mat = mkMatrix(field, rows, domBid, codBid);
    if (!mat.ok) return mat.error.message;
    const map = mkLinearMapByMatrix(
      domainSpace.value.id,
      codomainSpace.value.id,
      mat.value,
      domBid,
      codBid,
    );
    if (!map.ok) return map.error.message;

    addMap(map.value);
    const label = name || result.name || 'T';
    nameObject(label, { kind: 'map', id: map.value.id });
    openView('matrix', { kind: 'map', id: map.value.id });
    if (n === 2 && m === 2) {
      openView('geometric_2d', { kind: 'map', id: map.value.id });
      openView('diagram', { kind: 'map', id: map.value.id });
    }
    return null;
  }

  if (result.kind === 'vector-expr') {
    const err2 = applyVectorExpr(result.expression, name, session, addVector, nameObject, openView);
    return err2;
  }

  if (result.kind === 'map-expr') {
    const err2 = applyMapExpr(result.expression, name, session, addMap, nameObject, openView);
    return err2;
  }

  return 'Unhandled parse result';
}

const SYMBOL_PALETTE: Array<{ label: string; insert: string; title: string }> = [
  { label: 'ℝ', insert: 'R', title: 'Real field' },
  { label: 'ℂ', insert: 'C', title: 'Complex field' },
  { label: 'λ', insert: 'λ', title: 'Eigenvalue' },
  { label: 'σ', insert: 'σ', title: 'Singular value' },
  { label: '∈', insert: '∈', title: 'Element of' },
  { label: '⊆', insert: '⊆', title: 'Subspace of' },
  { label: '⊕', insert: '⊕', title: 'Direct sum' },
  { label: '⊗', insert: '⊗', title: 'Tensor product' },
  { label: '⟨·,·⟩', insert: '⟨·,·⟩', title: 'Inner product' },
  { label: '[ ]', insert: '[[, ], [, ]]', title: '2×2 matrix template' },
  { label: '( )', insert: '(, )', title: 'Vector template' },
];

export function ObjectInput(): JSX.Element {
  const [text, setText] = useState('');
  const [nameText, setNameText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const insertSymbol = (insert: string): void => {
    const el = inputRef.current;
    if (!el) {
      handleChange(text + insert);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + insert + text.slice(end);
    handleChange(next);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insert.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const views = useStore(defaultStore, (s) => s.views);
  const placeholder = PLACEHOLDER_EXAMPLES[placeholderIdx % PLACEHOLDER_EXAMPLES.length] ?? '';
  const canSubmit = !!text.trim() && !error;

  const handleChange = (val: string): void => {
    setText(val);
    setError(null);
    if (val.trim() === '') {
      setPreview(null);
      return;
    }
    const namedObjects = defaultStore.getState().namedObjects;
    const result = parseInput(val, namedObjects);
    if (result.kind === 'error') {
      setPreview(null);
      setError(result.message);
    } else if (result.kind === 'matrix') {
      setPreview(
        `${result.matrix.rows}×${result.matrix.cols} matrix (${result.field === 'R' ? 'ℝ' : 'ℂ'})`,
      );
      setError(null);
    } else if (result.kind === 'vector') {
      setPreview(`${result.components.length}-vector (${result.field === 'R' ? 'ℝ' : 'ℂ'})`);
      setError(null);
    } else if (result.kind === 'formula') {
      setPreview(`Linear map — ${result.name}(${result.params.join(', ')})`);
      setError(null);
    } else if (result.kind === 'vector-expr') {
      setPreview(`Derived vector expression`);
      setError(null);
    } else if (result.kind === 'map-expr') {
      setPreview(`Derived map expression`);
      setError(null);
    } else if (result.kind === 'ambiguous') {
      setPreview(`Ambiguous — interpreted as ${result.alternatives[0]?.kind ?? '?'}`);
      setError(null);
    }
  };

  const handleSubmit = (): void => {
    if (!text.trim()) return;
    const currentSession = defaultStore.getState();
    const namedObjects = currentSession.namedObjects;
    const err = applyParseResult(
      parseInput(text.trim(), namedObjects),
      nameText.trim(),
      currentSession,
    );
    if (err) {
      setError(err);
    } else {
      setText('');
      setNameText('');
      setPreview(null);
      setError(null);
      setPlaceholderIdx((i) => i + 1);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        padding: '8px var(--pad) 10px',
        borderTop: '1px solid var(--line-2)',
        background: 'var(--bg-2)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {/* Symbol palette */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 'var(--t-micro)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-4)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginRight: '4px',
          }}
        >
          Insert
        </span>
        {SYMBOL_PALETTE.map(({ label, insert, title }) => (
          <button
            key={label}
            onClick={() => insertSymbol(insert)}
            title={title}
            style={{
              height: '24px',
              minWidth: '28px',
              padding: '0 6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--line-2)',
              background: 'var(--panel)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-math)',
              fontStyle: 'italic',
              fontSize: '13px',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--line-3)';
              e.currentTarget.style.background = 'var(--bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line-2)';
              e.currentTarget.style.background = 'var(--panel)';
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
        {/* Name input */}
        <input
          value={nameText}
          onChange={(e) => setNameText(e.target.value)}
          placeholder="name"
          style={{
            width: '60px',
            padding: '6px 8px',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--t-meta)',
            fontFamily: 'var(--font-math)',
            fontStyle: 'italic',
            background: 'var(--panel)',
            color: 'var(--ink)',
            flexShrink: 0,
            outline: 'none',
          }}
        />

        {/* Expression input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={1}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: `1px solid ${error ? 'var(--kind-spec)' : 'var(--line-2)'}`,
            borderRadius: 'var(--radius)',
            fontSize: 'var(--t-meta)',
            fontFamily: 'var(--font-math)',
            fontStyle: 'italic',
            resize: 'none',
            background: 'var(--panel)',
            color: 'var(--ink)',
            outline: 'none',
            lineHeight: '1.4',
          }}
        />

        {/* Add button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            padding: '6px 14px',
            background: canSubmit ? 'var(--ink)' : 'var(--bg-3)',
            color: canSubmit ? 'var(--bg)' : 'var(--ink-4)',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: canSubmit ? 'pointer' : 'default',
            fontSize: 'var(--t-meta)',
            fontFamily: 'var(--font-sans)',
            flexShrink: 0,
            letterSpacing: '0.01em',
          }}
        >
          Add ↵
        </button>
      </div>

      {/* Preview / error */}
      {(preview ?? error) && (
        <div
          style={{
            marginTop: '4px',
            fontSize: 'var(--t-micro)',
            fontFamily: 'var(--font-mono)',
            color: error ? 'var(--kind-spec)' : 'var(--ink-3)',
            paddingLeft: '66px',
          }}
        >
          {error ?? preview}
        </div>
      )}

      {/* Empty state hint */}
      {views.length === 0 && !text && (
        <div
          style={{
            marginTop: '4px',
            fontSize: 'var(--t-micro)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-4)',
            paddingLeft: '66px',
          }}
        >
          Try: [[1, 2], [3, 4]] · (1, -2) · T(x, y) = (x + y, x - y)
        </div>
      )}
    </div>
  );
}
