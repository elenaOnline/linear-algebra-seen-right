import { useState } from 'react';
import type { JSX } from 'react';
import { defaultStore } from '../state/index.ts';
import { generate, CONSTRAINT_LABELS, CONSTRAINT_DEFAULTS } from '../pedagogy/generator/index.ts';
import type { ConstraintKind, GeneratorResult } from '../pedagogy/generator/index.ts';
import type { LinearMap } from '../types/map.ts';

const KINDS = Object.keys(CONSTRAINT_LABELS) as ConstraintKind[];

export function GeneratorPanel(): JSX.Element {
  const [kind, setKind] = useState<ConstraintKind>('nilpotent-operator');
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleGenerate = (): void => {
    setRunning(true);
    const params = CONSTRAINT_DEFAULTS[kind];
    const r = generate({ kind, parameters: params });
    setResult(r);
    setRunning(false);
  };

  const handleAdd = (): void => {
    if (result?.kind !== 'success') return;
    const map = result.object as LinearMap;
    const store = defaultStore.getState();
    store.addMap(map);
    if (map.representation.kind === 'matrix') {
      store.openView('matrix', { kind: 'map', id: map.id });
      store.openView('diagram', { kind: 'map', id: map.id });
    } else {
      store.openView('symbolic', { kind: 'map', id: map.id });
    }
    setResult(null);
  };

  return (
    <div
      style={{
        padding: '14px 16px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--t-micro)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}
      >
        Construct example
      </div>

      {/* Constraint picker */}
      <select
        value={kind}
        onChange={(e) => {
          setKind(e.target.value as ConstraintKind);
          setResult(null);
        }}
        style={{
          padding: '6px 8px',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--radius)',
          background: 'var(--panel)',
          color: 'var(--ink)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--t-meta)',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {CONSTRAINT_LABELS[k]}
          </option>
        ))}
      </select>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={running}
        style={{
          padding: '7px 14px',
          background: 'var(--ink)',
          color: 'var(--bg)',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--t-meta)',
          cursor: running ? 'default' : 'pointer',
          opacity: running ? 0.6 : 1,
        }}
      >
        Generate
      </button>

      {/* Result */}
      {result !== null && (
        <div
          style={{
            padding: '10px 12px',
            background:
              result.kind === 'success' ? 'var(--kind-geo-soft)' : 'var(--kind-spec-soft)',
            border: `1px solid ${result.kind === 'success' ? 'var(--kind-geo)' : 'var(--kind-spec)'}`,
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {result.kind === 'success' && (
            <>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--t-meta)',
                  lineHeight: 1.6,
                  color: 'var(--ink-2)',
                  margin: 0,
                }}
              >
                {result.explanation}
              </p>
              <button
                onClick={handleAdd}
                style={{
                  padding: '5px 12px',
                  background: 'var(--panel)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--t-meta)',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                  alignSelf: 'flex-start',
                }}
              >
                Add to session
              </button>
            </>
          )}
          {result.kind === 'infeasible' && (
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--t-meta)',
                color: 'var(--ink-2)',
                margin: 0,
              }}
            >
              Infeasible: {result.reason}
            </p>
          )}
          {result.kind === 'error' && (
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                color: 'var(--kind-spec)',
                margin: 0,
              }}
            >
              {result.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
