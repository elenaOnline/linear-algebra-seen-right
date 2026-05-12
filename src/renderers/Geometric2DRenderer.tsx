import { useMemo } from 'react';
import type { JSX } from 'react';
import { scaleLinear, ticks } from 'd3';
import type { Geometric2DProps } from '../registry/index.ts';

// Colors
const COLOR_AXIS = '#64748b'; // slate-500
const COLOR_TICK_LABEL = '#94a3b8'; // slate-400
const COLOR_GRID_ORIGINAL = '#e2e8f0'; // slate-200
const COLOR_GRID_DEFORMED = '#bfdbfe'; // blue-200
const COLOR_BASIS_E1 = '#ef4444'; // red-500
const COLOR_BASIS_E2 = '#22c55e'; // green-500
const COLOR_ARROW_DEFAULT = '#3b82f6'; // blue-500

const SVG_SIZE = 400;
const PADDING = 36;
const ARROWHEAD_SIZE = 7;

type Scale = ((v: number) => number) & { invert: (v: number) => number };

// --- Arrowhead markers ---

function ArrowheadDefs(): JSX.Element {
  const colors: [string, string][] = [
    ['arrow-blue', COLOR_ARROW_DEFAULT],
    ['arrow-red', COLOR_BASIS_E1],
    ['arrow-green', COLOR_BASIS_E2],
    ['arrow-gray', COLOR_AXIS],
  ];
  return (
    <defs>
      {colors.map(([id, color]) => (
        <marker
          key={id}
          id={id}
          markerWidth={ARROWHEAD_SIZE}
          markerHeight={ARROWHEAD_SIZE}
          refX={ARROWHEAD_SIZE - 1}
          refY={ARROWHEAD_SIZE / 2}
          orient="auto"
        >
          <path
            d={`M 0 0 L ${ARROWHEAD_SIZE} ${ARROWHEAD_SIZE / 2} L 0 ${ARROWHEAD_SIZE} z`}
            fill={color}
          />
        </marker>
      ))}
    </defs>
  );
}

function markerForColor(color: string | undefined): string {
  if (color === COLOR_BASIS_E1) return 'url(#arrow-red)';
  if (color === COLOR_BASIS_E2) return 'url(#arrow-green)';
  if (!color || color === COLOR_ARROW_DEFAULT) return 'url(#arrow-blue)';
  return 'url(#arrow-blue)';
}

// --- Axis and grid ---

function Axes({
  xScale,
  yScale,
  range,
}: {
  xScale: Scale;
  yScale: Scale;
  range: readonly [number, number];
}): JSX.Element {
  const [lo, hi] = range;
  const x0 = xScale(0);
  const y0 = yScale(0);
  const xLeft = xScale(lo);
  const xRight = xScale(hi);
  const yTop = yScale(hi);
  const yBottom = yScale(lo);
  const tickValues = ticks(lo, hi, Math.min(hi - lo, 10));

  return (
    <g>
      {/* x-axis */}
      <line
        x1={xLeft}
        y1={y0}
        x2={xRight}
        y2={y0}
        stroke={COLOR_AXIS}
        strokeWidth={1.5}
        markerEnd="url(#arrow-gray)"
      />
      {/* y-axis */}
      <line
        x1={x0}
        y1={yBottom}
        x2={x0}
        y2={yTop}
        stroke={COLOR_AXIS}
        strokeWidth={1.5}
        markerEnd="url(#arrow-gray)"
      />
      {/* x-axis ticks + labels */}
      {tickValues.map((t) => {
        if (t === 0) return null;
        const tx = xScale(t);
        return (
          <g key={`xt-${t}`}>
            <line x1={tx} y1={y0 - 4} x2={tx} y2={y0 + 4} stroke={COLOR_AXIS} strokeWidth={1} />
            <text
              x={tx}
              y={y0 + 16}
              textAnchor="middle"
              fontSize={10}
              fill={COLOR_TICK_LABEL}
              fontFamily="system-ui, sans-serif"
            >
              {t}
            </text>
          </g>
        );
      })}
      {/* y-axis ticks + labels */}
      {tickValues.map((t) => {
        if (t === 0) return null;
        const ty = yScale(t);
        return (
          <g key={`yt-${t}`}>
            <line x1={x0 - 4} y1={ty} x2={x0 + 4} y2={ty} stroke={COLOR_AXIS} strokeWidth={1} />
            <text
              x={x0 - 8}
              y={ty + 3}
              textAnchor="end"
              fontSize={10}
              fill={COLOR_TICK_LABEL}
              fontFamily="system-ui, sans-serif"
            >
              {t}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// --- Arrow rendering ---

function Arrow({
  from,
  to,
  color,
  label,
  xScale,
  yScale,
  onDrag,
}: {
  from: readonly [number, number];
  to: readonly [number, number];
  color?: string | undefined;
  label?: string | undefined;
  xScale: Scale;
  yScale: Scale;
  onDrag?: ((x: number, y: number) => void) | undefined;
}): JSX.Element {
  const x1 = xScale(from[0]);
  const y1 = yScale(from[1]);
  const x2 = xScale(to[0]);
  const y2 = yScale(to[1]);
  const c = color ?? COLOR_ARROW_DEFAULT;

  // Shorten the line slightly at the tip so the arrowhead marker aligns cleanly.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const shorten = len > 0 ? (ARROWHEAD_SIZE * 0.6) / len : 0;
  const x2s = x2 - dx * shorten;
  const y2s = y2 - dy * shorten;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2s}
        y2={y2s}
        stroke={c}
        strokeWidth={2}
        markerEnd={markerForColor(c)}
      />
      {label !== undefined && len > 0 && (
        <text
          x={x2 + (dx / len) * 12}
          y={y2 + (dy / len) * 12}
          textAnchor="middle"
          fontSize={12}
          fill={c}
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
        >
          {label}
        </text>
      )}
      {/* Draggable tip handle */}
      {onDrag !== undefined && (
        <circle
          cx={x2}
          cy={y2}
          r={6}
          fill={c}
          fillOpacity={0.15}
          stroke={c}
          strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onMouseDown={(e) => {
            e.preventDefault();
            const svg = (e.currentTarget as SVGElement).closest('svg');
            if (!svg) return;
            const handleMove = (me: MouseEvent): void => {
              const rect = svg.getBoundingClientRect();
              const svgX = ((me.clientX - rect.left) / rect.width) * SVG_SIZE;
              const svgY = ((me.clientY - rect.top) / rect.height) * SVG_SIZE;
              const mathX = xScale.invert(svgX);
              const mathY = yScale.invert(svgY);
              onDrag(mathX, mathY);
            };
            const handleUp = (): void => {
              window.removeEventListener('mousemove', handleMove);
              window.removeEventListener('mouseup', handleUp);
            };
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
          }}
        />
      )}
    </g>
  );
}

// --- Grid deformation ---

type Mat2 = readonly [readonly [number, number], readonly [number, number]];

function transform(m: Mat2, x: number, y: number): [number, number] {
  return [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y];
}

function GridDeformation({
  matrix,
  xScale,
  yScale,
  axisRange,
}: {
  matrix: Mat2;
  xScale: Scale;
  yScale: Scale;
  axisRange: readonly [number, number];
}): JSX.Element {
  const [lo, hi] = axisRange;
  // Grid lines from lo+1 to hi-1 (leave room for axes arrow)
  const gridLo = Math.ceil(lo) + 1;
  const gridHi = Math.floor(hi) - 1;

  const originalLines: JSX.Element[] = [];
  const deformedLines: JSX.Element[] = [];

  // Horizontal lines: y = k, x from gridLo to gridHi
  for (let k = gridLo; k <= gridHi; k++) {
    // Original
    originalLines.push(
      <line
        key={`oh-${k}`}
        x1={xScale(gridLo)}
        y1={yScale(k)}
        x2={xScale(gridHi)}
        y2={yScale(k)}
        stroke={COLOR_GRID_ORIGINAL}
        strokeWidth={1}
        strokeDasharray="3 3"
      />,
    );
    // Deformed: transform both endpoints
    const [tx1, ty1] = transform(matrix, gridLo, k);
    const [tx2, ty2] = transform(matrix, gridHi, k);
    deformedLines.push(
      <line
        key={`dh-${k}`}
        x1={xScale(tx1)}
        y1={yScale(ty1)}
        x2={xScale(tx2)}
        y2={yScale(ty2)}
        stroke={COLOR_GRID_DEFORMED}
        strokeWidth={1.5}
      />,
    );
  }

  // Vertical lines: x = j, y from gridLo to gridHi
  for (let j = gridLo; j <= gridHi; j++) {
    originalLines.push(
      <line
        key={`ov-${j}`}
        x1={xScale(j)}
        y1={yScale(gridLo)}
        x2={xScale(j)}
        y2={yScale(gridHi)}
        stroke={COLOR_GRID_ORIGINAL}
        strokeWidth={1}
        strokeDasharray="3 3"
      />,
    );
    const [tx1, ty1] = transform(matrix, j, gridLo);
    const [tx2, ty2] = transform(matrix, j, gridHi);
    deformedLines.push(
      <line
        key={`dv-${j}`}
        x1={xScale(tx1)}
        y1={yScale(ty1)}
        x2={xScale(tx2)}
        y2={yScale(ty2)}
        stroke={COLOR_GRID_DEFORMED}
        strokeWidth={1.5}
      />,
    );
  }

  // Basis image arrows: T(e1) = col 0, T(e2) = col 1
  const [e1x, e1y] = transform(matrix, 1, 0);
  const [e2x, e2y] = transform(matrix, 0, 1);

  return (
    <g>
      {originalLines}
      {deformedLines}
      <Arrow from={[0, 0]} to={[e1x, e1y]} color={COLOR_BASIS_E1} xScale={xScale} yScale={yScale} />
      <Arrow from={[0, 0]} to={[e2x, e2y]} color={COLOR_BASIS_E2} xScale={xScale} yScale={yScale} />
    </g>
  );
}

// --- Eigenline rendering ---

function Eigenline({
  point,
  direction,
  style,
  xScale,
  yScale,
  axisRange,
}: {
  point: readonly [number, number];
  direction: readonly [number, number];
  style?: 'solid' | 'dashed' | undefined;
  xScale: Scale;
  yScale: Scale;
  axisRange: readonly [number, number];
}): JSX.Element {
  // Extend the line to the axis range boundary in both directions.
  const [lo, hi] = axisRange;
  const [dx, dy] = direction;

  // Parameterize: (x, y) = (point[0] + t*dx, point[1] + t*dy). Find t bounds.
  const ts: number[] = [];
  if (Math.abs(dx) > 1e-10) {
    ts.push((lo - point[0]) / dx);
    ts.push((hi - point[0]) / dx);
  }
  if (Math.abs(dy) > 1e-10) {
    ts.push((lo - point[1]) / dy);
    ts.push((hi - point[1]) / dy);
  }
  if (ts.length === 0) return <></>;

  const tMin = Math.max(Math.min(...ts), -1000);
  const tMax = Math.min(Math.max(...ts), 1000);

  const x1 = point[0] + tMin * dx;
  const y1 = point[1] + tMin * dy;
  const x2 = point[0] + tMax * dx;
  const y2 = point[1] + tMax * dy;

  return (
    <line
      x1={xScale(x1)}
      y1={yScale(y1)}
      x2={xScale(x2)}
      y2={yScale(y2)}
      stroke={COLOR_ARROW_DEFAULT}
      strokeWidth={1.5}
      strokeDasharray={style === 'dashed' ? '5 4' : undefined}
      opacity={0.7}
    />
  );
}

// --- Main renderer ---

type Props = {
  readonly props: Geometric2DProps;
};

export function Geometric2DRenderer({ props }: Props): JSX.Element {
  const { kind, arrows, lines, gridDeformation, axisRange = [-5, 5], onArrowDrag } = props;

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain(axisRange)
        .range([PADDING, SVG_SIZE - PADDING]),
    // Depend on the individual values: axisRange is a readonly tuple and its reference
    // changes on every render when declared inline, but the values are stable.
    [axisRange[0], axisRange[1]],
  );

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain(axisRange)
        .range([SVG_SIZE - PADDING, PADDING]),
    [axisRange[0], axisRange[1]],
  );

  return (
    <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <ArrowheadDefs />
        <Axes xScale={xScale} yScale={yScale} range={axisRange} />

        {kind === 'grid_deformation' && gridDeformation !== undefined && (
          <GridDeformation
            matrix={gridDeformation.matrix}
            xScale={xScale}
            yScale={yScale}
            axisRange={axisRange}
          />
        )}

        {(kind === 'vector_arrow' || kind === 'eigenlines' || kind === 'axes_only') &&
          lines?.map((ln, i) => (
            <Eigenline
              key={i}
              point={ln.point}
              direction={ln.direction}
              style={ln.style}
              xScale={xScale}
              yScale={yScale}
              axisRange={axisRange}
            />
          ))}

        {(kind === 'vector_arrow' || kind === 'eigenlines' || kind === 'grid_deformation') &&
          arrows?.map((a, i) => (
            <Arrow
              key={i}
              from={a.from}
              to={a.to}
              color={a.color}
              label={a.label}
              xScale={xScale}
              yScale={yScale}
              onDrag={onArrowDrag ? (x, y) => onArrowDrag(i, x, y) : undefined}
            />
          ))}
      </svg>
    </div>
  );
}
