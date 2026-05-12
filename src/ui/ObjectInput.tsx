import { useState, useRef } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../state/index.ts';
import { parseInput } from '../interaction/parser/index.ts';
import type { ParseResult } from '../interaction/parser/index.ts';
import { mkVectorSpaceFn } from '../types/space.ts';
import { mkConcreteVector } from '../types/vector.ts';
import { mkLinearMapByMatrix, mkLinearMapByFormula } from '../types/map.ts';
import { rational } from '../types/scalar.ts';
import type { Scalar } from '../types/index.ts';
import type { BasisId } from '../types/ids.ts';

const PLACEHOLDER_EXAMPLES = ['[[1, 2], [3, 4]]', '(1, -2, 3)', 'T(x, y) = (x + y, x - y)'];

function scalarToRational(v: number): Scalar {
  if (Number.isInteger(v)) return rational(v);
  const denom = 100;
  return rational(Math.round(v * denom), denom);
}

function applyParseResult(result: ParseResult, name: string): string | null {
  const { addSpace, addVector, addMap, nameObject, openView } = defaultStore.getState();
  const session = defaultStore.getState();

  if (result.kind === 'error') return result.message;

  if (result.kind === 'ambiguous') {
    return applyParseResult(result.alternatives[0] ?? result, name);
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
    const space = mkVectorSpaceFn(field, n);
    if (!space.ok) return space.error.message;
    if (!session.spaces[space.value.id]) addSpace(space.value);
    const fnLabel = result.label;
    const map = mkLinearMapByFormula(space.value.id, space.value.id, (v) => v, fnLabel);
    addMap(map);
    const label = result.name || 'T';
    nameObject(label, { kind: 'map', id: map.id });
    openView('symbolic', { kind: 'map', id: map.id });
    if (n === 2) openView('diagram', { kind: 'map', id: map.id });
    return null;
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
    const result = parseInput(val);
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
    } else if (result.kind === 'ambiguous') {
      setPreview(`Ambiguous — interpreted as ${result.alternatives[0]?.kind ?? '?'}`);
      setError(null);
    }
  };

  const handleSubmit = (): void => {
    if (!text.trim()) return;
    const err = applyParseResult(parseInput(text.trim()), nameText.trim());
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
