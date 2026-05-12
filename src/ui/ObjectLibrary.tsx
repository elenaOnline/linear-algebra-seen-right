import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../state/index.ts';
import type { MathObjectRef } from '../state/types.ts';
import type { SpaceId, VectorId, MapId } from '../types/ids.ts';

type Props = {
  readonly selected: MathObjectRef | null;
  readonly onSelect: (ref: MathObjectRef) => void;
};

type LibItem = {
  ref: MathObjectRef;
  name: string;
  typeLabel: string;
};

export function ObjectLibrary({ selected, onSelect }: Props): JSX.Element {
  const session = useStore(defaultStore);
  const named = session.namedObjects;

  const spaces: LibItem[] = Object.entries(session.spaces).map(([id, sp]) => {
    const name =
      Object.entries(named).find(([, r]) => r.kind === 'space' && r.id === id)?.[0] ?? id;
    const dim = sp.kind === 'Fn' ? `ℝ^${sp.n}` : sp.kind;
    return { ref: { kind: 'space' as const, id: id as SpaceId }, name, typeLabel: dim };
  });

  const vectors: LibItem[] = Object.entries(session.vectors).map(([id, v]) => {
    const name =
      Object.entries(named).find(([, r]) => r.kind === 'vector' && r.id === id)?.[0] ?? id;
    const typeLabel = v.kind === 'concrete' ? `vec · ℝ^${v.components.length}` : 'vec';
    return { ref: { kind: 'vector' as const, id: id as VectorId }, name, typeLabel };
  });

  const maps: LibItem[] = Object.entries(session.maps).map(([id]) => {
    const name = Object.entries(named).find(([, r]) => r.kind === 'map' && r.id === id)?.[0] ?? id;
    return { ref: { kind: 'map' as const, id: id as MapId }, name, typeLabel: 'linear map' };
  });

  const groups: Array<{ label: string; items: LibItem[] }> = [
    { label: 'Spaces', items: spaces },
    { label: 'Vectors', items: vectors },
    { label: 'Maps', items: maps },
  ].filter((g) => g.items.length > 0);

  const isSelected = (ref: MathObjectRef) =>
    selected !== null && selected.kind === ref.kind && selected.id === ref.id;

  if (groups.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--t-micro)',
          padding: '20px',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Objects you define
        <br />
        appear here.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: '4px' }}>
          {/* Group header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-micro)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
            }}
          >
            <span>{g.label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}>{g.items.length}</span>
          </div>
          {/* Items */}
          {g.items.map((item) => (
            <div
              key={`${item.ref.kind}:${item.ref.id}`}
              onClick={() => onSelect(item.ref)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                cursor: 'pointer',
                color: 'var(--ink)',
                borderLeft: `2px solid ${isSelected(item.ref) ? 'var(--accent)' : 'transparent'}`,
                background: isSelected(item.ref) ? 'var(--accent-soft)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isSelected(item.ref)) e.currentTarget.style.background = 'var(--bg-2)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected(item.ref)) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-math)',
                  fontStyle: 'italic',
                  fontSize: '13.5px',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--t-micro)',
                  color: 'var(--ink-3)',
                  flexShrink: 0,
                }}
              >
                {item.typeLabel}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
