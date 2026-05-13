import { useState, useRef, useCallback, useEffect } from 'react';
import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../state/index.ts';
import { ViewCard } from './ViewCard.tsx';
import type { View } from '../state/types.ts';

function defaultWidth(view: View): number {
  return ['geometric_2d', 'geometric_3d', 'diagram'].includes(view.kind) ? 320 : 220;
}

const MIN_TILE_WIDTH = 100;
const LS_KEY = 'ladr_col_widths_px';

function saveWidths(viewIds: string[], widths: number[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ids: viewIds, widths }));
  } catch {
    // ignore storage errors
  }
}

function loadWidths(viewIds: string[]): number[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ids: string[]; widths: number[] };
    if (parsed.ids.length === viewIds.length && parsed.ids.every((id, i) => id === viewIds[i])) {
      return parsed.widths;
    }
  } catch {
    // ignore
  }
  return null;
}

type Props = {
  readonly rows: 1 | 2;
};

export function ViewGrid({ rows }: Props): JSX.Element {
  const views = useStore(defaultStore, (s) => s.views);
  const [colWidths, setColWidths] = useState<number[]>([]);

  // Initialise / adjust colWidths when views change.
  useEffect(() => {
    if (views.length === 0) {
      setColWidths([]);
      return;
    }
    const ids = views.map((v) => v.id);
    const restored = loadWidths(ids);
    if (restored) {
      setColWidths(restored);
      return;
    }
    setColWidths(views.map(defaultWidth));
  }, [views.length]);

  // Persist on every resize (debounced).
  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback((ids: string[], widths: number[]) => {
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => saveWidths(ids, widths), 400);
  }, []);

  // Drag-resize a column — pixel delta applied directly.
  const onResizeStart = useCallback(
    (index: number, startX: number) => {
      const startWidths = [...colWidths];

      const onMove = (e: MouseEvent): void => {
        const deltaX = e.clientX - startX;
        const next = [...startWidths];
        next[index] = Math.max(
          MIN_TILE_WIDTH,
          (startWidths[index] ?? defaultWidth(views[index]!)) + deltaX,
        );
        setColWidths(next);
        persist(
          views.map((v) => v.id),
          next,
        );
      };

      const onUp = (): void => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [colWidths, persist, views],
  );

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

  const effectiveWidths = colWidths.length === views.length ? colWidths : views.map(defaultWidth);

  return (
    // Outer scroll container — horizontal always, vertical only in 2-tall mode.
    <div
      className="viewgrid-container"
      style={{
        height: '100%',
        overflowX: 'auto',
        overflowY: rows === 2 ? 'auto' : 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Inner flex row — 2× height in 2-tall mode so tiles fill double the viewport. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 'var(--gap)',
          padding: 'var(--pad)',
          height: rows === 1 ? '100%' : '200%',
          boxSizing: 'border-box',
        }}
      >
        {views.map((view, i) => (
          <div
            key={view.id}
            style={{
              flexShrink: 0,
              width: `${effectiveWidths[i] ?? defaultWidth(view)}px`,
              minWidth: `${MIN_TILE_WIDTH}px`,
              height: '100%',
            }}
          >
            <ViewCard view={view} onResizeStart={(startX) => onResizeStart(i, startX)} />
          </div>
        ))}
      </div>
    </div>
  );
}
