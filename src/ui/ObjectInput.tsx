import { useState, useRef, useEffect, useCallback } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import katex from 'katex';
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
import { scalarToLatex } from '../registry/helpers.ts';

// ── Logic helpers (unchanged from Phase 10) ──────────────────────────────

function scalarToRational(v: number): Scalar {
  if (Number.isInteger(v)) return rational(v);
  const denom = 100;
  return rational(Math.round(v * denom), denom);
}

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
  if (result.kind === 'ambiguous')
    return applyParseResult(result.alternatives[0] ?? result, name, session);

  if (result.kind === 'vector') {
    const n = result.components.length;
    const space = mkVectorSpaceFn(result.field, n);
    if (!space.ok) return space.error.message;
    const spaceId = space.value.id;
    if (!session.spaces[spaceId]) addSpace(space.value);
    const scalars = result.components.map(scalarToRational);
    const vec = mkConcreteVector(result.field, spaceId, scalars);
    if (!vec.ok) return vec.error.message;
    addVector(vec.value);
    nameObject(name || `v${Object.keys(session.vectors).length + 1}`, {
      kind: 'vector',
      id: vec.value.id,
    });
    openView('symbolic', { kind: 'vector', id: vec.value.id });
    if (n === 2) openView('geometric_2d', { kind: 'vector', id: vec.value.id });
    if (n === 3) openView('geometric_3d', { kind: 'vector', id: vec.value.id });
    return null;
  }

  if (result.kind === 'matrix') {
    const { rows, cols } = result.matrix;
    const field = result.field;
    const domainSpace = mkVectorSpaceFn(field, cols);
    const codomainSpace = mkVectorSpaceFn(field, rows);
    if (!domainSpace.ok) return domainSpace.error.message;
    if (!codomainSpace.ok) return codomainSpace.error.message;
    if (!session.spaces[domainSpace.value.id]) addSpace(domainSpace.value);
    if (!session.spaces[codomainSpace.value.id]) addSpace(codomainSpace.value);
    const domBid = domainSpace.value.id as unknown as BasisId;
    const codBid = codomainSpace.value.id as unknown as BasisId;
    const map = mkLinearMapByMatrix(
      domainSpace.value.id,
      codomainSpace.value.id,
      result.matrix,
      domBid,
      codBid,
    );
    if (!map.ok) return map.error.message;
    addMap(map.value);
    nameObject(name || `A${Object.keys(session.maps).length + 1}`, {
      kind: 'map',
      id: map.value.id,
    });
    openView('matrix', { kind: 'map', id: map.value.id });
    if (rows === 2 && cols === 2) {
      openView('geometric_2d', { kind: 'map', id: map.value.id });
      openView('diagram', { kind: 'map', id: map.value.id });
    }
    return null;
  }

  if (result.kind === 'formula') {
    const n = result.params.length;
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
    const m = columns[0]?.length ?? n;
    const domainSpace = mkVectorSpaceFn('R', n);
    const codomainSpace = mkVectorSpaceFn('R', m);
    if (!domainSpace.ok) return domainSpace.error.message;
    if (!codomainSpace.ok) return codomainSpace.error.message;
    if (!session.spaces[domainSpace.value.id]) addSpace(domainSpace.value);
    if (!session.spaces[codomainSpace.value.id]) addSpace(codomainSpace.value);
    const domBid = domainSpace.value.id as unknown as BasisId;
    const codBid = codomainSpace.value.id as unknown as BasisId;
    const matRows: Scalar[][] = Array.from({ length: m }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const v = columns[j]?.[i] ?? 0;
        return Number.isInteger(v) ? rational(v) : float(v);
      }),
    );
    const mat = mkMatrix('R', matRows, domBid, codBid);
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
    nameObject(name || result.name || 'T', { kind: 'map', id: map.value.id });
    openView('matrix', { kind: 'map', id: map.value.id });
    if (n === 2 && m === 2) {
      openView('geometric_2d', { kind: 'map', id: map.value.id });
      openView('diagram', { kind: 'map', id: map.value.id });
    }
    return null;
  }

  if (result.kind === 'vector-expr')
    return applyVectorExpr(result.expression, name, session, addVector, nameObject, openView);
  if (result.kind === 'map-expr')
    return applyMapExpr(result.expression, name, session, addMap, nameObject, openView);

  return 'Unhandled parse result';
}

// ── Live preview ─────────────────────────────────────────────────────────

function buildPreviewLatex(result: ParseResult, rawText: string): string | null {
  if (result.kind === 'error') return null;

  if (result.kind === 'vector') {
    const comps = result.components.map((c) =>
      Number.isInteger(c) ? String(c) : parseFloat(c.toPrecision(5)).toString(),
    );
    if (comps.length === 0) return null;
    if (comps.length === 1) return comps[0] ?? null;
    return `\\begin{pmatrix} ${comps.join(' \\\\ ')} \\end{pmatrix}`;
  }

  if (result.kind === 'matrix') {
    const rows = result.matrix.entries.map((row) => row.map((s) => scalarToLatex(s)).join(' & '));
    return `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
  }

  if (result.kind === 'ambiguous') {
    const first = result.alternatives[0];
    if (first) return buildPreviewLatex(first, rawText);
    return null;
  }

  // For formulas and named expressions, try rendering the raw text as KaTeX.
  // Most formula syntax (T(x,y)=(x+y,x-y), v+w, A*B) renders legibly.
  return rawText.trim();
}

function tryRenderKatex(latex: string): string | null {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false, output: 'html' });
  } catch {
    return null;
  }
}

// ── Symbol palette definition ─────────────────────────────────────────────

type PaletteSymbol = { kind: 'symbol'; latex: string; insert: string; title: string };
type PaletteAction = {
  kind: 'action';
  latex: string;
  title: string;
  action: 'fraction' | 'superscript' | 'subscript' | 'matrix';
};
type PaletteItem = PaletteSymbol | PaletteAction;

const PALETTE_GROUPS: Array<{ label: string; items: PaletteItem[] }> = [
  {
    label: 'Sets',
    items: [
      { kind: 'symbol', latex: '\\mathbb{R}', insert: 'R', title: 'Real field ℝ' },
      { kind: 'symbol', latex: '\\mathbb{C}', insert: 'C', title: 'Complex field ℂ' },
    ],
  },
  {
    label: 'Variables',
    items: [
      { kind: 'symbol', latex: '\\lambda', insert: 'λ', title: 'Eigenvalue λ' },
      { kind: 'symbol', latex: '\\sigma', insert: 'σ', title: 'Singular value σ' },
      { kind: 'symbol', latex: '\\alpha', insert: 'α', title: 'Alpha α' },
      { kind: 'symbol', latex: '\\beta', insert: 'β', title: 'Beta β' },
    ],
  },
  {
    label: 'Relations',
    items: [
      { kind: 'symbol', latex: '\\in', insert: '∈', title: 'Element of ∈' },
      { kind: 'symbol', latex: '\\subseteq', insert: '⊆', title: 'Subspace ⊆' },
      { kind: 'symbol', latex: '\\oplus', insert: '⊕', title: 'Direct sum ⊕' },
    ],
  },
  {
    label: 'Structures',
    items: [
      { kind: 'action', latex: '\\tfrac{a}{b}', title: 'Fraction (inserts /)', action: 'fraction' },
      {
        kind: 'action',
        latex: 'x^{n}',
        title: 'Power / superscript (inserts ^)',
        action: 'superscript',
      },
      { kind: 'action', latex: 'x_{n}', title: 'Subscript (inserts _)', action: 'subscript' },
      {
        kind: 'action',
        latex: '\\begin{smallmatrix}\\cdot&\\cdot\\\\\\cdot&\\cdot\\end{smallmatrix}',
        title: 'Matrix builder',
        action: 'matrix',
      },
    ],
  },
];

const PALETTE_MORE: PaletteSymbol[] = [
  { kind: 'symbol', latex: '\\otimes', insert: '⊗', title: 'Tensor product ⊗' },
  {
    kind: 'symbol',
    latex: '\\langle\\cdot,\\cdot\\rangle',
    insert: '⟨·,·⟩',
    title: 'Inner product ⟨·,·⟩',
  },
  { kind: 'symbol', latex: '\\perp', insert: '⊥', title: 'Orthogonal ⊥' },
  { kind: 'symbol', latex: '\\ker', insert: 'ker', title: 'Kernel ker' },
  { kind: 'symbol', latex: '\\text{im}', insert: 'im', title: 'Image im' },
  { kind: 'symbol', latex: '\\det', insert: 'det', title: 'Determinant det' },
  { kind: 'symbol', latex: '\\text{tr}', insert: 'tr', title: 'Trace tr' },
];

// Pre-render palette latex to HTML at module load time.
const PALETTE_RENDERED = new Map<string, string>();
[...PALETTE_GROUPS.flatMap((g) => g.items), ...PALETTE_MORE].forEach((item) => {
  const html = tryRenderKatex(item.latex);
  if (html) PALETTE_RENDERED.set(item.latex, html);
});

// ── Matrix template builder ──────────────────────────────────────────────

function buildMatrixTemplate(rows: number, cols: number): { text: string; cursorOffset: number } {
  const rowStrs = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => '').join(', '),
  );
  const text = '[' + rowStrs.map((r) => `[${r}]`).join(', ') + ']';
  // Place cursor inside the first [, i.e., at position 2 ([[)
  return { text, cursorOffset: 2 };
}

// ── Component ────────────────────────────────────────────────────────────

const PLACEHOLDER_EXAMPLES = ['[[1, 2], [3, 4]]', '(1, -2, 3)', 'T(x, y) = (x + y, x - y)'];

export function ObjectInput(): JSX.Element {
  const [text, setText] = useState('');
  const [nameText, setNameText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [katexHtml, setKatexHtml] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // More palette popover
  const [showMore, setShowMore] = useState(false);
  const [moreRect, setMoreRect] = useState<DOMRect | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Matrix picker popover
  const [showMatrixPicker, setShowMatrixPicker] = useState(false);
  const [matrixPickerRect, setMatrixPickerRect] = useState<DOMRect | null>(null);
  const [matrixHover, setMatrixHover] = useState<[number, number] | null>(null);
  const matrixButtonRef = useRef<HTMLButtonElement>(null);
  const matrixMenuRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const views = useStore(defaultStore, (s) => s.views);
  const placeholder = PLACEHOLDER_EXAMPLES[placeholderIdx % PLACEHOLDER_EXAMPLES.length] ?? '';
  const canSubmit = !!text.trim() && !error;

  // Close more menu on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (!moreButtonRef.current?.contains(t) && !moreMenuRef.current?.contains(t))
        setShowMore(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showMore]);

  // Close matrix picker on outside click
  useEffect(() => {
    if (!showMatrixPicker) return;
    const handler = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (!matrixButtonRef.current?.contains(t) && !matrixMenuRef.current?.contains(t))
        setShowMatrixPicker(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showMatrixPicker]);

  // Debounced KaTeX live preview
  useEffect(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (!text.trim()) {
      setKatexHtml(null);
      return;
    }
    previewTimerRef.current = setTimeout(() => {
      const namedObjects = defaultStore.getState().namedObjects;
      const result = parseInput(text.trim(), namedObjects);
      const latex = buildPreviewLatex(result, text.trim());
      setKatexHtml(latex ? tryRenderKatex(latex) : null);
    }, 80);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [text]);

  const insertAt = useCallback(
    (insert: string, cursorAfterInsert?: number): void => {
      const el = inputRef.current;
      if (!el) {
        setText((prev) => prev + insert);
        return;
      }
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      const next = text.slice(0, start) + insert + text.slice(end);
      setText(next);
      setError(null);
      requestAnimationFrame(() => {
        el.focus();
        const pos =
          cursorAfterInsert !== undefined ? start + cursorAfterInsert : start + insert.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [text],
  );

  const insertSymbol = (item: PaletteSymbol): void => insertAt(item.insert);

  const insertAction = (action: PaletteAction['action']): void => {
    if (action === 'fraction') {
      insertAt('/');
    } else if (action === 'superscript') {
      insertAt('^');
    } else if (action === 'subscript') {
      insertAt('_');
    } else if (action === 'matrix') {
      const rect = matrixButtonRef.current?.getBoundingClientRect() ?? null;
      setMatrixPickerRect(rect);
      setShowMatrixPicker((s) => !s);
      setShowMore(false);
    }
  };

  const insertMatrix = (rows: number, cols: number): void => {
    const { text: tmpl, cursorOffset } = buildMatrixTemplate(rows, cols);
    insertAt(tmpl, cursorOffset);
    setShowMatrixPicker(false);
  };

  const handleChange = (val: string): void => {
    setText(val);
    if (!val.trim()) {
      setError(null);
      return;
    }
    const namedObjects = defaultStore.getState().namedObjects;
    const result = parseInput(val, namedObjects);
    setError(result.kind === 'error' ? result.message : null);
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
      setError(null);
      setKatexHtml(null);
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
        gap: '5px',
      }}
    >
      {/* ── Symbol palette ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1px',
          flexWrap: 'nowrap',
          overflowX: 'auto',
        }}
      >
        {PALETTE_GROUPS.map((group, gi) => (
          <div
            key={group.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1px',
              paddingRight: gi < PALETTE_GROUPS.length - 1 ? '6px' : 0,
              marginRight: gi < PALETTE_GROUPS.length - 1 ? '5px' : 0,
              borderRight: gi < PALETTE_GROUPS.length - 1 ? '1px solid var(--line)' : 'none',
              flexShrink: 0,
            }}
          >
            {group.items.map((item) => {
              const renderedHtml = PALETTE_RENDERED.get(item.latex);
              if (item.kind === 'action' && item.action === 'matrix') {
                return (
                  <button
                    key={item.latex}
                    ref={matrixButtonRef}
                    onClick={() => insertAction(item.action)}
                    title={item.title}
                    style={paletteButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line-3)';
                      e.currentTarget.style.background = 'var(--bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line-2)';
                      e.currentTarget.style.background = 'var(--panel)';
                    }}
                  >
                    {renderedHtml ? (
                      <span dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>M</span>
                    )}
                  </button>
                );
              }
              return (
                <button
                  key={item.latex}
                  onClick={() =>
                    item.kind === 'symbol' ? insertSymbol(item) : insertAction(item.action)
                  }
                  title={item.title}
                  style={paletteButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line-3)';
                    e.currentTarget.style.background = 'var(--bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line-2)';
                    e.currentTarget.style.background = 'var(--panel)';
                  }}
                >
                  {renderedHtml ? (
                    <span dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                  ) : (
                    <span
                      style={{
                        fontFamily: 'var(--font-math)',
                        fontStyle: 'italic',
                        fontSize: '12px',
                      }}
                    >
                      {item.kind === 'symbol' ? item.insert : '?'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* More button */}
        <button
          ref={moreButtonRef}
          onClick={() => {
            const rect = moreButtonRef.current?.getBoundingClientRect() ?? null;
            setMoreRect(rect);
            setShowMore((s) => !s);
          }}
          title="More symbols"
          style={{
            ...paletteButtonStyle,
            minWidth: '28px',
            color: 'var(--ink-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
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
          ···
        </button>
      </div>

      {/* ── Input row ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
        {/* Label field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <input
            value={nameText}
            onChange={(e) => setNameText(e.target.value)}
            placeholder="label"
            style={{
              width: '52px',
              padding: '6px 8px',
              border: '1px solid var(--line-2)',
              borderRadius: 'var(--radius)',
              fontSize: 'var(--t-meta)',
              fontFamily: 'var(--font-math)',
              fontStyle: 'italic',
              background: 'var(--panel)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-4)',
              paddingLeft: '2px',
            }}
          >
            e.g. v₁, T, A
          </span>
        </div>

        {/* Expression textarea */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={1}
          spellCheck={false}
          autoCorrect="off"
          autoComplete="off"
          style={{
            flex: 1,
            padding: '7px 10px',
            border: `1px solid ${error ? 'var(--kind-spec)' : 'var(--line-2)'}`,
            borderRadius: 'var(--radius)',
            fontSize: '14px',
            fontFamily: 'var(--font-mono)',
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
            padding: '7px 14px',
            background: canSubmit ? 'var(--ink)' : 'var(--bg-3)',
            color: canSubmit ? 'var(--bg)' : 'var(--ink-4)',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: canSubmit ? 'pointer' : 'default',
            fontSize: 'var(--t-meta)',
            fontFamily: 'var(--font-sans)',
            flexShrink: 0,
            letterSpacing: '0.01em',
            alignSelf: 'flex-start',
          }}
        >
          Add ↵
        </button>
      </div>

      {/* ── Live preview / error ────────────────────────────────────── */}
      {error && (
        <div
          style={{
            fontSize: 'var(--t-micro)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--kind-spec)',
            paddingLeft: '58px',
          }}
        >
          {error}
        </div>
      )}
      {!error && katexHtml && (
        <div
          style={{
            paddingLeft: '58px',
            display: 'flex',
            alignItems: 'center',
            minHeight: '28px',
            color: 'var(--ink-2)',
          }}
          dangerouslySetInnerHTML={{ __html: katexHtml }}
        />
      )}

      {/* Empty state hint */}
      {views.length === 0 && !text && (
        <div
          style={{
            fontSize: 'var(--t-micro)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-4)',
            paddingLeft: '58px',
          }}
        >
          Try: [[1, 2], [3, 4]] · (1, -2) · T(x, y) = (x + y, x - y)
        </div>
      )}

      {/* ── More symbols popover ────────────────────────────────────── */}
      {showMore &&
        moreRect &&
        createPortal(
          <div
            ref={moreMenuRef}
            style={{
              position: 'fixed',
              top: moreRect.top - 8,
              transform: 'translateY(-100%)',
              right: window.innerWidth - moreRect.right,
              background: 'var(--panel)',
              border: '1px solid var(--line-2)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 4px 14px rgba(22,22,20,0.12)',
              zIndex: 9999,
              padding: '6px',
              display: 'flex',
              gap: '3px',
              flexWrap: 'wrap',
              maxWidth: '240px',
            }}
          >
            {PALETTE_MORE.map((item) => {
              const html = PALETTE_RENDERED.get(item.latex);
              return (
                <button
                  key={item.latex}
                  onClick={() => {
                    insertSymbol(item);
                    setShowMore(false);
                  }}
                  title={item.title}
                  style={paletteButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line-3)';
                    e.currentTarget.style.background = 'var(--bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line-2)';
                    e.currentTarget.style.background = 'var(--panel)';
                  }}
                >
                  {html ? (
                    <span dangerouslySetInnerHTML={{ __html: html }} />
                  ) : (
                    <span
                      style={{
                        fontFamily: 'var(--font-math)',
                        fontStyle: 'italic',
                        fontSize: '12px',
                      }}
                    >
                      {item.insert}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      {/* ── Matrix size picker ─────────────────────────────────────── */}
      {showMatrixPicker &&
        matrixPickerRect &&
        createPortal(
          <div
            ref={matrixMenuRef}
            style={{
              position: 'fixed',
              top: matrixPickerRect.top - 8,
              transform: 'translateY(-100%)',
              left: matrixPickerRect.left,
              background: 'var(--panel)',
              border: '1px solid var(--line-2)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 4px 14px rgba(22,22,20,0.12)',
              zIndex: 9999,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--ink-4)',
                marginBottom: '4px',
              }}
            >
              {matrixHover ? `${matrixHover[0]}×${matrixHover[1]} matrix` : 'Select size'}
            </div>
            {Array.from({ length: 4 }, (_, r) => (
              <div key={r} style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: 4 }, (_, c) => {
                  const rows = r + 1;
                  const cols = c + 1;
                  const isHovered =
                    matrixHover !== null && rows <= matrixHover[0] && cols <= matrixHover[1];
                  return (
                    <div
                      key={c}
                      onMouseEnter={() => setMatrixHover([rows, cols])}
                      onMouseLeave={() => setMatrixHover(null)}
                      onClick={() => insertMatrix(rows, cols)}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        background: isHovered ? 'var(--ink)' : 'var(--line)',
                        transition: 'background 0.08s',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Shared style for palette buttons
const paletteButtonStyle: React.CSSProperties = {
  height: '24px',
  minWidth: '26px',
  padding: '0 5px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--line-2)',
  background: 'var(--panel)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  flexShrink: 0,
};
