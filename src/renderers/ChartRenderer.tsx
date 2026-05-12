import { useMemo } from 'react';
import type { JSX } from 'react';
import { scaleLinear } from 'd3';
import type { ChartProps } from '../registry/index.ts';

const COLOR_RANK = '#2dd4bf'; // teal-400 — matches DiagramRenderer range highlight
const COLOR_NULLITY = '#fbbf24'; // amber-400 — matches DiagramRenderer kernel highlight
const COLOR_BAR = '#60a5fa'; // blue-400

const FONT = 'system-ui, sans-serif';

// --- Stacked bar (dimension_bars) ---

function DimensionBars({
  data,
  width,
  height,
}: {
  data: ChartProps['data'];
  width: number;
  height: number;
}): JSX.Element {
  const rankEntry = data.find((d) => d.label === 'rank');
  const nullityEntry = data.find((d) => d.label === 'nullity');
  const rank = rankEntry?.value ?? 0;
  const nullity = nullityEntry?.value ?? 0;
  const total = rank + nullity;

  const pad = { top: 24, right: 20, bottom: 48, left: 20 };
  const barH = 40;
  const barY = (height - pad.top - pad.bottom) / 2 - barH / 2 + pad.top;
  const barW = width - pad.left - pad.right;

  const rankW = total > 0 ? (rank / total) * barW : 0;
  const nullW = total > 0 ? (nullity / total) * barW : 0;

  const rankLabel = `rank = ${rank}`;
  const nullLabel = `nullity = ${nullity}`;
  const theoremLabel = `rank + nullity = ${total} = dim V`;

  return (
    <g>
      {/* Rank segment */}
      {rankW > 0 && (
        <rect x={pad.left} y={barY} width={rankW} height={barH} fill={COLOR_RANK} rx={4} />
      )}
      {/* Nullity segment */}
      {nullW > 0 && (
        <rect
          x={pad.left + rankW}
          y={barY}
          width={nullW}
          height={barH}
          fill={COLOR_NULLITY}
          rx={4}
        />
      )}
      {/* Segment border between them */}
      {rankW > 0 && nullW > 0 && (
        <line
          x1={pad.left + rankW}
          y1={barY}
          x2={pad.left + rankW}
          y2={barY + barH}
          stroke="white"
          strokeWidth={2}
        />
      )}
      {/* Rank label */}
      {rankW >= 50 && (
        <text
          x={pad.left + rankW / 2}
          y={barY + barH / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fill="white"
          fontFamily={FONT}
          fontWeight="600"
        >
          {rankLabel}
        </text>
      )}
      {/* Nullity label */}
      {nullW >= 50 && (
        <text
          x={pad.left + rankW + nullW / 2}
          y={barY + barH / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fill="#92400e"
          fontFamily={FONT}
          fontWeight="600"
        >
          {nullLabel}
        </text>
      )}
      {/* Rank-nullity theorem statement */}
      <text
        x={width / 2}
        y={barY + barH + 24}
        textAnchor="middle"
        fontSize={11}
        fill="#6b7280"
        fontFamily={FONT}
      >
        {theoremLabel}
      </text>
      {/* Corner labels for very small segments */}
      {rankW < 50 && (
        <text
          x={pad.left}
          y={barY - 6}
          textAnchor="start"
          fontSize={11}
          fill="#0d9488"
          fontFamily={FONT}
        >
          {rankLabel}
        </text>
      )}
      {nullW < 50 && (
        <text
          x={pad.left + barW}
          y={barY - 6}
          textAnchor="end"
          fontSize={11}
          fill="#b45309"
          fontFamily={FONT}
        >
          {nullLabel}
        </text>
      )}
    </g>
  );
}

// --- Standard horizontal bar chart ---

function BarChart({
  data,
  width,
  height,
  provenance,
}: {
  data: ChartProps['data'];
  width: number;
  height: number;
  provenance?: 'exact' | 'numerical' | undefined;
}): JSX.Element {
  const pad = { top: 16, right: 24, bottom: 16, left: 72 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const barH = Math.min(24, chartH / Math.max(data.length, 1) - 4);
  const barGap = chartH / Math.max(data.length, 1);

  const maxVal = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const xScale = useMemo(
    () => scaleLinear().domain([0, maxVal]).range([0, chartW]),
    [maxVal, chartW],
  );

  return (
    <g transform={`translate(${pad.left},${pad.top})`}>
      {data.map((d, i) => {
        const barW = xScale(Math.abs(d.value));
        const cy = i * barGap + barGap / 2;
        const isNeg = d.value < 0;
        const color = provenance === 'numerical' ? '#93c5fd' : COLOR_BAR;
        return (
          <g key={d.label}>
            <text x={-6} y={cy + 4} textAnchor="end" fontSize={11} fill="#374151" fontFamily={FONT}>
              {d.label}
            </text>
            <rect
              x={isNeg ? -barW : 0}
              y={cy - barH / 2}
              width={barW}
              height={barH}
              fill={color}
              rx={2}
            />
            <text
              x={barW + 4}
              y={cy + 4}
              textAnchor="start"
              fontSize={10}
              fill="#6b7280"
              fontFamily={FONT}
            >
              {d.value.toPrecision(4)}
              {d.secondary !== undefined
                ? `${d.secondary >= 0 ? '+' : ''}${d.secondary.toPrecision(3)}i`
                : ''}
            </text>
          </g>
        );
      })}
      {/* Zero line */}
      <line x1={0} y1={0} x2={0} y2={chartH} stroke="#d1d5db" strokeWidth={1} />
    </g>
  );
}

// --- Main renderer ---

const SVG_W = 400;
const SVG_H = 220;

type Props = {
  readonly props: ChartProps;
};

export function ChartRenderer({ props }: Props): JSX.Element {
  const { kind, data, provenance } = props;

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{ display: 'block' }}
        fontFamily={FONT}
      >
        {kind === 'dimension_bars' ? (
          <DimensionBars data={data} width={SVG_W} height={SVG_H} />
        ) : (
          <BarChart data={data} width={SVG_W} height={SVG_H} provenance={provenance} />
        )}
      </svg>
    </div>
  );
}
