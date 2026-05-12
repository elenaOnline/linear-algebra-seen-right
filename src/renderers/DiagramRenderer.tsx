import { useMemo } from 'react';
import type { JSX } from 'react';
import dagre from 'dagre';
import type { DiagramProps } from '../registry/index.ts';

const NODE_PADDING_X = 16;
const NODE_PADDING_Y = 10;
const FONT_SIZE = 13;
const CHAR_WIDTH = 7.5; // approximate px per character at FONT_SIZE

const HIGHLIGHT_COLORS: Record<string, string> = {
  kernel: '#fef3c7', // amber-100 fill
  'kernel-stroke': '#f59e0b',
  range: '#ccfbf1', // teal-100 fill
  'range-stroke': '#14b8a6',
  eigenspace: '#ede9fe', // violet-100 fill
  'eigenspace-stroke': '#7c3aed',
  none: '#f1f5f9', // slate-100 fill
  'none-stroke': '#94a3b8',
};

function nodeColors(highlight?: string): { fill: string; stroke: string; text: string } {
  const key = highlight ?? 'none';
  return {
    fill: HIGHLIGHT_COLORS[key] ?? HIGHLIGHT_COLORS['none'] ?? '#f1f5f9',
    stroke: HIGHLIGHT_COLORS[`${key}-stroke`] ?? HIGHLIGHT_COLORS['none-stroke'] ?? '#94a3b8',
    text: '#1e293b',
  };
}

function nodeSize(label: string): { width: number; height: number } {
  const width = Math.max(80, label.length * CHAR_WIDTH + NODE_PADDING_X * 2);
  const height = FONT_SIZE + NODE_PADDING_Y * 2;
  return { width, height };
}

type LayoutNode = {
  id: string;
  label: string;
  highlight?: string | undefined;
  x: number;
  y: number;
  width: number;
  height: number;
};

type LayoutEdge = {
  from: string;
  to: string;
  label: string;
  style?: string | undefined;
  points: { x: number; y: number }[];
};

function buildLayout(
  nodes: DiagramProps['nodes'],
  edges: DiagramProps['edges'],
): { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const { width, height } = nodeSize(node.label);
    g.setNode(node.id, { label: node.label, width, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.from, edge.to, { label: edge.label });
  }

  dagre.layout(g);

  const layoutNodes: LayoutNode[] = nodes.map((node) => {
    const n = g.node(node.id);
    return {
      id: node.id,
      label: node.label,
      highlight: node.highlight,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    };
  });

  const layoutEdges: LayoutEdge[] = edges.map((edge) => {
    const e = g.edge(edge.from, edge.to);
    return {
      from: edge.from,
      to: edge.to,
      label: edge.label,
      style: edge.style,
      points: e?.points ?? [],
    };
  });

  const graph = g.graph();
  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    width: graph.width ?? 200,
    height: graph.height ?? 120,
  };
}

function edgePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  const start = points[0];
  if (!start) return '';
  let d = `M ${start.x} ${start.y}`;
  if (points.length === 2) {
    const end = points[1];
    if (end) d += ` L ${end.x} ${end.y}`;
  } else {
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      if (p) d += ` L ${p.x} ${p.y}`;
    }
  }
  return d;
}

type Props = {
  readonly props: DiagramProps;
};

export function DiagramRenderer({ props }: Props): JSX.Element {
  const layout = useMemo(
    () => buildLayout(props.nodes, props.edges),
    // Deliberately keyed on identity+length rather than full array refs to avoid
    // rerunning dagre layout on every render while object counts stay the same.
    [props.objectId, props.nodes, props.edges],
  );

  const svgWidth = layout.width + 40;
  const svgHeight = layout.height + 40;

  return (
    <div style={{ padding: '12px', overflowX: 'auto' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ fontFamily: 'system-ui, sans-serif', fontSize: `${FONT_SIZE}px` }}
        aria-label="diagram"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker
            id="arrow-dashed"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Edges */}
        {layout.edges.map((edge, i) => {
          const isDashed = edge.style === 'dashed';
          const midPt = edge.points[Math.floor(edge.points.length / 2)];
          return (
            <g key={i}>
              <path
                d={edgePath(edge.points)}
                fill="none"
                stroke={isDashed ? '#94a3b8' : '#64748b'}
                strokeWidth={1.5}
                strokeDasharray={isDashed ? '5 3' : undefined}
                markerEnd={isDashed ? 'url(#arrow-dashed)' : 'url(#arrow)'}
              />
              {midPt && edge.label && (
                <text x={midPt.x} y={midPt.y - 6} textAnchor="middle" fontSize={11} fill="#64748b">
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {layout.nodes.map((node) => {
          const colors = nodeColors(node.highlight);
          const rx = node.x - node.width / 2;
          const ry = node.y - node.height / 2;
          return (
            <g key={node.id}>
              <rect
                x={rx}
                y={ry}
                width={node.width}
                height={node.height}
                rx={6}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={1.5}
              />
              <text
                x={node.x}
                y={node.y + FONT_SIZE / 3}
                textAnchor="middle"
                fill={colors.text}
                fontSize={FONT_SIZE}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
