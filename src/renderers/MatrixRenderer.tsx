import { useRef, useEffect } from 'react';
import type { JSX } from 'react';
import katex from 'katex';
import type { MatrixProps } from '../registry/index.ts';
import { ProvenanceBadge } from '../ui/ProvenanceBadge.tsx';

// Heatmap palette: white (0) → indigo (1), matches the project's accent color.
function heatmapColor(normalized: number): string {
  // Clamp to [0, 1]
  const t = Math.max(0, Math.min(1, normalized));
  // Interpolate: white → #4f46e5 (indigo-600)
  const r = Math.round(255 * (1 - t) + 79 * t);
  const g = Math.round(255 * (1 - t) + 70 * t);
  const b = Math.round(255 * (1 - t) + 229 * t);
  return `rgb(${r},${g},${b})`;
}

function textColorFor(normalized: number): string {
  return normalized > 0.55 ? '#ffffff' : '#111827';
}

type CellProps = {
  readonly latex: string;
  readonly heatValue?: number | undefined;
  readonly isCorner?: boolean | undefined;
};

function Cell({ latex, heatValue, isCorner }: CellProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isCorner) return;
    try {
      katex.render(latex, el, { displayMode: false, throwOnError: false, output: 'html' });
    } catch {
      el.textContent = latex;
    }
  }, [latex, isCorner]);

  const bg = heatValue !== undefined ? heatmapColor(heatValue) : 'transparent';
  const color = heatValue !== undefined ? textColorFor(heatValue) : 'inherit';

  return (
    <div
      ref={ref}
      style={{
        padding: '6px 8px',
        textAlign: 'center',
        fontSize: '0.82rem',
        background: bg,
        color,
        borderRadius: '2px',
        minWidth: '36px',
        fontFamily: isCorner ? 'system-ui, sans-serif' : undefined,
        opacity: isCorner ? 0 : 1,
      }}
    />
  );
}

type Props = {
  readonly props: MatrixProps;
};

export function MatrixRenderer({ props }: Props): JSX.Element {
  const { rows, cols, entries, heatmap, rowLabels, colLabels, provenance } = props;
  const hasColLabels = colLabels !== undefined && colLabels.length > 0;
  const hasRowLabels = rowLabels !== undefined && rowLabels.length > 0;

  const gridCols = (hasRowLabels ? 1 : 0) + cols;
  const gridRows = (hasColLabels ? 1 : 0) + rows;

  return (
    <div style={{ padding: '12px 16px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
        <span
          style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}
        >
          {rows}×{cols}
        </span>
        {provenance !== undefined && <ProvenanceBadge provenance={provenance} />}
      </div>

      {/* Matrix bracket + grid */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span
          style={{ fontSize: `${Math.max(1.5, rows * 0.55)}rem`, color: '#374151', lineHeight: 1 }}
        >
          ⎡
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, auto)`,
            gridTemplateRows: `repeat(${gridRows}, auto)`,
            gap: '2px',
          }}
        >
          {/* Corner placeholder (top-left when both labels present) */}
          {hasColLabels && hasRowLabels && <Cell latex="" isCorner />}

          {/* Column labels */}
          {hasColLabels &&
            (colLabels ?? []).map((label, c) => (
              <div
                key={c}
                style={{
                  padding: '2px 8px',
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  color: '#6b7280',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {label}
              </div>
            ))}

          {/* Data rows */}
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} style={{ display: 'contents' }}>
              {hasRowLabels && (
                <div
                  style={{
                    padding: '6px 8px 6px 0',
                    fontSize: '0.7rem',
                    color: '#6b7280',
                    fontFamily: 'system-ui, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {rowLabels?.[r] ?? ''}
                </div>
              )}
              {Array.from({ length: cols }, (_, c) => (
                <Cell key={c} latex={entries[r]?.[c] ?? ''} heatValue={heatmap?.[r]?.[c]} />
              ))}
            </div>
          ))}
        </div>
        <span
          style={{ fontSize: `${Math.max(1.5, rows * 0.55)}rem`, color: '#374151', lineHeight: 1 }}
        >
          ⎦
        </span>
      </div>
    </div>
  );
}
