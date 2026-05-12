import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../../state/index.ts';
import type { Field } from '../../types/field.ts';

export function FieldToggle(): JSX.Element {
  const field = useStore(defaultStore, (s) => s.field);
  const { setField } = defaultStore.getState();

  const toggle = (f: Field): void => {
    if (f !== field) setField(f);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        borderRadius: '7px',
        padding: '2px',
      }}
    >
      {(['R', 'C'] as Field[]).map((f) => (
        <button
          key={f}
          onClick={() => toggle(f)}
          style={{
            padding: '4px 12px',
            borderRadius: '5px',
            fontSize: 'var(--t-meta)',
            fontFamily: 'var(--font-math)',
            fontStyle: 'italic',
            color: field === f ? 'var(--ink)' : 'var(--ink-3)',
            background: field === f ? 'var(--panel)' : 'transparent',
            border: 'none',
            cursor: field === f ? 'default' : 'pointer',
            boxShadow:
              field === f ? '0 1px 0 var(--line-2), 0 1px 3px rgba(22,22,20,0.04)' : 'none',
          }}
        >
          {f === 'R' ? 'ℝ' : 'ℂ'}
        </button>
      ))}
    </div>
  );
}
