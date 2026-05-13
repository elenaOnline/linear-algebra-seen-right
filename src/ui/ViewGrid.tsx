import { useState, useRef, useCallback, useEffect } from 'react';
import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../state/index.ts';
import { ViewCard } from './ViewCard.tsx';
import type { View } from '../state/types.ts';

// Heuristic default column width (in fr units) by renderer kind.
function defaultFr(view: View): number {
  if (['geometric_2d', 'geometric_3d', 'diagram'].includes(view.kind)) return 1.4;
  return 0.8;
}

const LS_KEY = 'ladr_col_widths';

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
    // Only restore if the view IDs match exactly (same session).
    if (parsed.ids.length === viewIds.length && parsed.ids.every((id, i) => id === viewIds[i])) {
      return parsed.widths;
    }
  } catch {
    // ignore
  }
  return null;
}

export function ViewGrid(): JSX.Element {
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
    setColWidths(views.map(defaultFr));
  }, [views.length]);

  // Persist on every resize.
  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback((ids: string[], widths: number[]) => {
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => saveWidths(ids, widths), 400);
  }, []);

  // Drag-resize a column.
  const onResizeStart = useCallback(
    (index: number, startX: number) => {
      const startWidths = [...colWidths];
      const totalFr = startWidths.reduce((s, w) => s + w, 0);

      const onMove = (e: MouseEvent): void => {
        const deltaX = e.clientX - startX;
        // Convert pixel delta to fractional units using the container width.
        const containerWidth =
          (document.querySelector('.viewgrid-container') as HTMLElement)?.offsetWidth ?? 800;
        const frPerPx = totalFr / containerWidth;
        const delta = deltaX * frPerPx;
        const next = [...startWidths];
        // Clamp so each column stays at least 0.3fr.
        next[index] = Math.max(0.3, (startWidths[index] ?? 1) + delta);
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

  const effectiveWidths = colWidths.length === views.length ? colWidths : views.map(defaultFr);
  const template = effectiveWidths.map((w) => `${w}fr`).join(' ');

  return (
    <div
      className="viewgrid-container"
      style={{
        display: 'grid',
        gridTemplateColumns: template,
        gap: 'var(--gap)',
        padding: 'var(--pad)',
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {views.map((view, i) => (
        <ViewCard
          key={view.id}
          view={view}
          isResizable={i < views.length - 1}
          onResizeStart={(startX) => onResizeStart(i, startX)}
        />
      ))}
    </div>
  );
}
