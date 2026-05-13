// Static SVG thumbnails for Browse catalog cards — one per renderer kind.
// These are purely visual sketches; they are not rendered from the engine.
import type { JSX } from 'react';
import { DIAGRAM_THEME as T } from '../theme/diagram.ts';

const W = 120;
const H = 68;

const base: React.CSSProperties = { display: 'block', width: '100%', height: '100%' };

export function ThumbnailSymbolic(): JSX.Element {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={base}>
      <rect width={W} height={H} fill={T.canvasBg} />
      {/* Column vector bracket sketch */}
      <text x={28} y={22} fontSize={22} fill={T.axisColor} fontFamily="serif">
        ⎡
      </text>
      <text x={28} y={42} fontSize={22} fill={T.axisColor} fontFamily="serif">
        ⎢
      </text>
      <text x={28} y={62} fontSize={22} fill={T.axisColor} fontFamily="serif">
        ⎣
      </text>
      <text
        x={45}
        y={24}
        fontSize={10}
        fill={T.matrixValueColor}
        fontFamily="serif"
        fontStyle="italic"
      >
        x
      </text>
      <text
        x={45}
        y={42}
        fontSize={10}
        fill={T.matrixValueColor}
        fontFamily="serif"
        fontStyle="italic"
      >
        y
      </text>
      <text
        x={45}
        y={60}
        fontSize={10}
        fill={T.matrixValueColor}
        fontFamily="serif"
        fontStyle="italic"
      >
        z
      </text>
      <text x={57} y={22} fontSize={22} fill={T.axisColor} fontFamily="serif">
        ⎤
      </text>
      <text x={57} y={42} fontSize={22} fill={T.axisColor} fontFamily="serif">
        ⎥
      </text>
      <text x={57} y={62} fontSize={22} fill={T.axisColor} fontFamily="serif">
        ⎦
      </text>
    </svg>
  );
}

export function ThumbnailGeometric2D(): JSX.Element {
  const cx = 44;
  const cy = 44;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={base}>
      <rect width={W} height={H} fill={T.canvasBg} />
      {/* Faint grid */}
      {[-20, 0, 20, 40].map((d) => (
        <g key={d}>
          <line x1={cx + d} y1={8} x2={cx + d} y2={H - 4} stroke={T.gridColor} strokeWidth={0.5} />
          <line x1={4} y1={cy - d} x2={W - 4} y2={cy - d} stroke={T.gridColor} strokeWidth={0.5} />
        </g>
      ))}
      {/* Axes */}
      <line x1={4} y1={cy} x2={W - 4} y2={cy} stroke={T.axisColor} strokeWidth={1} />
      <line x1={cx} y1={4} x2={cx} y2={H - 4} stroke={T.axisColor} strokeWidth={1} />
      {/* Two vectors */}
      <line x1={cx} y1={cy} x2={cx + 36} y2={cy - 22} stroke={T.colorBasisX} strokeWidth={2} />
      <polygon
        points={`${cx + 36},${cy - 22} ${cx + 30},${cy - 15} ${cx + 39},${cy - 14}`}
        fill={T.colorBasisX}
      />
      <line x1={cx} y1={cy} x2={cx - 18} y2={cy - 28} stroke={T.colorInput} strokeWidth={2} />
      <polygon
        points={`${cx - 18},${cy - 28} ${cx - 10},${cy - 25} ${cx - 19},${cy - 19}`}
        fill={T.colorInput}
      />
    </svg>
  );
}

export function ThumbnailGeometric3D(): JSX.Element {
  // Isometric axis trident
  const o = { x: 50, y: 44 };
  const x2 = { x: o.x + 36, y: o.y + 10 };
  const y2 = { x: o.x - 36, y: o.y + 10 };
  const z2 = { x: o.x, y: o.y - 36 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={base}>
      <rect width={W} height={H} fill={T.canvasBg} />
      <line x1={o.x} y1={o.y} x2={x2.x} y2={x2.y} stroke={T.colorBasisX} strokeWidth={2} />
      <line x1={o.x} y1={o.y} x2={y2.x} y2={y2.y} stroke={T.colorBasisY} strokeWidth={2} />
      <line x1={o.x} y1={o.y} x2={z2.x} y2={z2.y} stroke={T.colorBasisZ} strokeWidth={2} />
      {/* Arrowheads */}
      <circle cx={x2.x} cy={x2.y} r={3} fill={T.colorBasisX} />
      <circle cx={y2.x} cy={y2.y} r={3} fill={T.colorBasisY} />
      <circle cx={z2.x} cy={z2.y} r={3} fill={T.colorBasisZ} />
      {/* A vector */}
      <line
        x1={o.x}
        y1={o.y}
        x2={o.x + 24}
        y2={o.y - 22}
        stroke={T.colorInput}
        strokeWidth={2}
        strokeDasharray="3 2"
      />
    </svg>
  );
}

export function ThumbnailDiagram(): JSX.Element {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={base}>
      <rect width={W} height={H} fill={T.canvasBg} />
      {/* Domain node */}
      <rect
        x={6}
        y={20}
        width={42}
        height={28}
        rx={6}
        fill={T.nodeKernel}
        stroke={T.nodeKernelStroke}
        strokeWidth={1.5}
      />
      <text
        x={27}
        y={38}
        textAnchor="middle"
        fontSize={10}
        fill={T.nodeText}
        fontFamily="serif"
        fontStyle="italic"
      >
        V
      </text>
      {/* Codomain node */}
      <rect
        x={72}
        y={20}
        width={42}
        height={28}
        rx={6}
        fill={T.nodeRange}
        stroke={T.nodeRangeStroke}
        strokeWidth={1.5}
      />
      <text
        x={93}
        y={38}
        textAnchor="middle"
        fontSize={10}
        fill={T.nodeText}
        fontFamily="serif"
        fontStyle="italic"
      >
        W
      </text>
      {/* Arrow */}
      <line
        x1={48}
        y1={34}
        x2={70}
        y2={34}
        stroke={T.axisColor}
        strokeWidth={1.5}
        markerEnd="url(#arr)"
      />
      <defs>
        <marker id="arr" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={T.axisColor} />
        </marker>
      </defs>
      <text
        x={59}
        y={28}
        textAnchor="middle"
        fontSize={9}
        fill={T.axisColor}
        fontFamily="serif"
        fontStyle="italic"
      >
        T
      </text>
    </svg>
  );
}

export function ThumbnailMatrix(): JSX.Element {
  const vals = [
    [0.9, 0.3, 0.1],
    [0.4, 0.8, 0.5],
    [0.1, 0.6, 0.95],
  ];
  const cw = 24;
  const ch = 18;
  const ox = 18;
  const oy = 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={base}>
      <rect width={W} height={H} fill={T.canvasBg} />
      {vals.map((row, r) =>
        row.map((v, c) => {
          const base2 = parseInt(T.matrixHeatBase.slice(1, 3), 16);
          const baseG = parseInt(T.matrixHeatBase.slice(3, 5), 16);
          const baseB = parseInt(T.matrixHeatBase.slice(5, 7), 16);
          const rr = Math.round(255 * (1 - v) + base2 * v);
          const gg = Math.round(255 * (1 - v) + baseG * v);
          const bb = Math.round(255 * (1 - v) + baseB * v);
          return (
            <rect
              key={`${r}-${c}`}
              x={ox + c * cw}
              y={oy + r * ch}
              width={cw - 2}
              height={ch - 2}
              rx={2}
              fill={`rgb(${rr},${gg},${bb})`}
            />
          );
        }),
      )}
    </svg>
  );
}

export function ThumbnailChart(): JSX.Element {
  const rankH = 30;
  const nullH = 16;
  const bw = 28;
  const by = H - 14;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={base}>
      <rect width={W} height={H} fill={T.canvasBg} />
      {/* Rank bar */}
      <rect x={22} y={by - rankH} width={bw} height={rankH} rx={3} fill={T.chartRankFill} />
      <text
        x={36}
        y={by + 10}
        textAnchor="middle"
        fontSize={8}
        fill={T.axisColor}
        fontFamily="system-ui"
      >
        rank
      </text>
      {/* Nullity bar */}
      <rect x={70} y={by - nullH} width={bw} height={nullH} rx={3} fill={T.chartNullityFill} />
      <text
        x={84}
        y={by + 10}
        textAnchor="middle"
        fontSize={8}
        fill={T.axisColor}
        fontFamily="system-ui"
      >
        nullity
      </text>
      {/* Baseline */}
      <line x1={10} y1={by} x2={W - 10} y2={by} stroke={T.axisColor} strokeWidth={1} />
    </svg>
  );
}

type RendererKind = 'symbolic' | 'geometric_2d' | 'geometric_3d' | 'diagram' | 'matrix' | 'chart';

const THUMBNAILS: Record<RendererKind, () => JSX.Element> = {
  symbolic: ThumbnailSymbolic,
  geometric_2d: ThumbnailGeometric2D,
  geometric_3d: ThumbnailGeometric3D,
  diagram: ThumbnailDiagram,
  matrix: ThumbnailMatrix,
  chart: ThumbnailChart,
};

export function CatalogThumbnail({ kind }: { readonly kind: RendererKind }): JSX.Element {
  const Component = THUMBNAILS[kind] ?? ThumbnailSymbolic;
  return (
    <div
      style={{
        width: '100%',
        height: '68px',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: T.canvasBg,
        marginBottom: '10px',
        flexShrink: 0,
      }}
    >
      <Component />
    </div>
  );
}
