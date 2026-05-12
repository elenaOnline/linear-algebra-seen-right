import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../state/index.ts';
import { ViewCard } from './ViewCard.tsx';

export function ViewGrid(): JSX.Element {
  const views = useStore(defaultStore, (s) => s.views);

  if (views.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '8px',
          color: 'var(--ink-4)',
          fontFamily: 'var(--font-math)',
          fontStyle: 'italic',
          fontSize: 'var(--t-body)',
        }}
      >
        <span style={{ fontSize: 'var(--t-h2)', color: 'var(--ink-4)' }}>No views open.</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--t-meta)',
            fontStyle: 'normal',
            color: 'var(--ink-4)',
          }}
        >
          Add a mathematical object to begin.
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(views.length, 3)}, 1fr)`,
        gap: 'var(--gap)',
        padding: 'var(--pad)',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {views.map((view) => (
        <ViewCard key={view.id} view={view} />
      ))}
    </div>
  );
}
