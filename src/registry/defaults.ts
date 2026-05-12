import type { VectorSpace, LinearMap, Vector } from '../types/index.ts';
import { dim } from '../types/space.ts';
import type {
  Visualizer,
  ChartProps,
  DiagramProps,
  Geometric2DProps,
  Geometric3DProps,
  LoadingProps,
  MatrixProps,
  SymbolicProps,
} from './types.ts';
import {
  mapDim,
  concreteVectorToLatex,
  computeRank,
  scalarToNumber,
  spaceDimLabel,
  spaceToLatex,
  spaceToDiagramLabel,
  matrixToProps,
} from './helpers.ts';
import type { VisualizerRegistry } from './registry.ts';

const LINEAR_MAP_VISUALIZERS: readonly Visualizer<LinearMap>[] = [
  {
    id: 'grid-deformation-3d',
    label: 'Grid deformation (3D)',
    renderer: 'geometric_3d',
    applicable: (T, session) => {
      const dd = mapDim(T, 'domain', session);
      const cd = mapDim(T, 'codomain', session);
      return dd > 0 && dd <= 3 && cd > 0 && cd <= 3;
    },
    toProps: (T, session): Geometric3DProps | LoadingProps => {
      if (T.representation.kind !== 'matrix') {
        return { renderer: 'geometric_3d', objectId: T.id, isPending: true };
      }
      const dd = mapDim(T, 'domain', session);
      if (dd !== 3) return { renderer: 'geometric_3d', objectId: T.id, isPending: true };
      const mat3 = T.representation.matrix;
      const e = (r: number, c: number): number =>
        scalarToNumber(mat3.entries[r]?.[c] ?? { kind: 'float', value: 0 });
      return {
        renderer: 'geometric_3d',
        objectId: T.id,
        kind: 'grid_deformation',
        gridDeformation: {
          matrix: [
            [e(0, 0), e(0, 1), e(0, 2)],
            [e(1, 0), e(1, 1), e(1, 2)],
            [e(2, 0), e(2, 1), e(2, 2)],
          ],
        },
        axisRange: [-5, 5],
      };
    },
  },
  {
    id: 'grid-deformation-2d',
    label: 'Grid deformation (2D)',
    renderer: 'geometric_2d',
    applicable: (T, session) =>
      mapDim(T, 'domain', session) === 2 && mapDim(T, 'codomain', session) === 2,
    toProps: (T, _session): Geometric2DProps | LoadingProps => {
      if (T.representation.kind !== 'matrix') {
        return { renderer: 'geometric_2d', objectId: T.id, isPending: true };
      }
      const mat = T.representation.matrix;
      const a = scalarToNumber(mat.entries[0]?.[0] ?? { kind: 'float', value: 0 });
      const b = scalarToNumber(mat.entries[0]?.[1] ?? { kind: 'float', value: 0 });
      const c = scalarToNumber(mat.entries[1]?.[0] ?? { kind: 'float', value: 0 });
      const d = scalarToNumber(mat.entries[1]?.[1] ?? { kind: 'float', value: 0 });
      return {
        renderer: 'geometric_2d',
        objectId: T.id,
        kind: 'grid_deformation',
        gridDeformation: {
          matrix: [
            [a, b],
            [c, d],
          ],
        },
        axisRange: [-5, 5],
      };
    },
  },
  {
    id: 'eigenline-2d',
    label: 'Eigenlines (2D)',
    renderer: 'geometric_2d',
    applicable: (T, session) => mapDim(T, 'domain', session) === 2 && T.domain === T.codomain,
    // Needs eigenvectors from the engine — returns loading until useComputation populates the cache.
    toProps: (T, _session) => ({ renderer: 'geometric_2d', objectId: T.id, isPending: true }),
  },
  {
    id: 'kernel-range-diagram',
    label: 'Kernel / range',
    renderer: 'diagram',
    applicable: () => true,
    toProps: (T, session): DiagramProps | LoadingProps => {
      if (T.representation.kind !== 'matrix') {
        return { renderer: 'diagram', objectId: T.id, isPending: true };
      }
      const mat = T.representation.matrix;
      const rank = computeRank(mat);
      const nullDim = mat.cols - rank;

      const domainSpace = session.getSpace(T.domain);
      const codomainSpace = session.getSpace(T.codomain);
      const domainLabel = domainSpace ? spaceToDiagramLabel(domainSpace) : 'V';
      const codomainLabel = codomainSpace ? spaceToDiagramLabel(codomainSpace) : 'W';
      const nullLabel = nullDim === 0 ? '{0}' : `null(T)  dim ${spaceDimLabel(nullDim)}`;
      const rangeLabel = rank === 0 ? '{0}' : `range(T)  dim ${spaceDimLabel(rank)}`;

      return {
        renderer: 'diagram',
        objectId: T.id,
        nodes: [
          { id: 'domain', label: domainLabel },
          { id: 'codomain', label: codomainLabel },
          { id: 'kernel', label: nullLabel, highlight: 'kernel' },
          { id: 'range', label: rangeLabel, highlight: 'range' },
        ],
        edges: [
          { from: 'domain', to: 'codomain', label: 'T' },
          { from: 'kernel', to: 'domain', label: '⊆', style: 'dashed' },
          { from: 'range', to: 'codomain', label: '⊆', style: 'dashed' },
        ],
      };
    },
  },
  {
    id: 'matrix-heatmap',
    label: 'Matrix heatmap',
    renderer: 'matrix',
    applicable: () => true,
    toProps: (T, _session): MatrixProps | LoadingProps => {
      if (T.representation.kind === 'matrix') {
        const rep = T.representation;
        return matrixToProps(rep.matrix, T.id, 'exact');
      }
      return { renderer: 'matrix', objectId: T.id, isPending: true };
    },
  },
  {
    id: 'dimension-bars',
    label: 'Rank / nullity',
    renderer: 'chart',
    applicable: () => true,
    toProps: (T, _session): ChartProps | LoadingProps => {
      if (T.representation.kind !== 'matrix') {
        return { renderer: 'chart', objectId: T.id, isPending: true };
      }
      const rank = computeRank(T.representation.matrix);
      const nullity = T.representation.matrix.cols - rank;
      return {
        renderer: 'chart',
        objectId: T.id,
        kind: 'dimension_bars',
        data: [
          { label: 'rank', value: rank },
          { label: 'nullity', value: nullity },
        ],
      };
    },
  },
  {
    id: 'symbolic-formula',
    label: 'Formula',
    renderer: 'symbolic',
    applicable: (T) => T.representation.kind === 'formula',
    toProps: (T, _session): SymbolicProps => ({
      renderer: 'symbolic',
      objectId: T.id,
      latex: (T.representation as Extract<typeof T.representation, { kind: 'formula' }>).label,
    }),
  },
];

const VECTOR_SPACE_VISUALIZERS: readonly Visualizer<VectorSpace>[] = [
  {
    id: 'basis-display',
    label: 'Basis display',
    renderer: 'symbolic',
    applicable: () => true,
    toProps: (V, _session): SymbolicProps => ({
      renderer: 'symbolic',
      objectId: V.id,
      latex: spaceToLatex(V),
    }),
  },
  {
    id: 'subspace-lattice',
    label: 'Subspace lattice',
    renderer: 'diagram',
    applicable: () => true,
    toProps: (V, session): DiagramProps => {
      const d = dim(V, session);
      const label = `${spaceToDiagramLabel(V)}  dim ${spaceDimLabel(d)}`;
      return {
        renderer: 'diagram',
        objectId: V.id,
        nodes: [{ id: 'space', label }],
        edges: [],
      };
    },
  },
  {
    id: 'coordinate-axes-3d',
    label: 'Coordinate axes (3D)',
    renderer: 'geometric_3d',
    applicable: (V) => V.kind === 'Fn' && V.n === 3,
    toProps: (V, _session): Geometric3DProps => ({
      renderer: 'geometric_3d',
      objectId: V.id,
      kind: 'axes_only',
      axisRange: [-5, 5],
    }),
  },
  {
    id: 'coordinate-axes-2d',
    label: 'Coordinate plane',
    renderer: 'geometric_2d',
    applicable: (V) => V.kind === 'Fn' && V.n === 2,
    toProps: (V, _session): Geometric2DProps => ({
      renderer: 'geometric_2d',
      objectId: V.id,
      kind: 'axes_only',
      axisRange: [-5, 5],
    }),
  },
];

const VECTOR_VISUALIZERS: readonly Visualizer<Vector>[] = [
  {
    id: 'arrow-3d',
    label: 'Arrow (3D)',
    renderer: 'geometric_3d',
    applicable: (v, session) => {
      const space = session.getSpace(v.space);
      return space?.kind === 'Fn' && space.n === 3;
    },
    toProps: (v, _session): Geometric3DProps | LoadingProps => {
      if (v.kind !== 'concrete' || v.components.length !== 3) {
        return { renderer: 'geometric_3d', objectId: v.id, isPending: true };
      }
      const x = scalarToNumber(v.components[0] ?? { kind: 'float', value: 0 });
      const y = scalarToNumber(v.components[1] ?? { kind: 'float', value: 0 });
      const z = scalarToNumber(v.components[2] ?? { kind: 'float', value: 0 });
      return {
        renderer: 'geometric_3d',
        objectId: v.id,
        kind: 'vector_arrow',
        arrows: [{ from: [0, 0, 0], to: [x, y, z], color: '#3b82f6' }],
        axisRange: [-5, 5],
      };
    },
  },
  {
    id: 'arrow-2d',
    label: 'Arrow (2D)',
    renderer: 'geometric_2d',
    applicable: (v, session) => {
      const space = session.getSpace(v.space);
      return space?.kind === 'Fn' && space.n === 2;
    },
    toProps: (v, _session): Geometric2DProps | LoadingProps => {
      if (v.kind !== 'concrete' || v.components.length !== 2) {
        return { renderer: 'geometric_2d', objectId: v.id, isPending: true };
      }
      const x = scalarToNumber(v.components[0] ?? { kind: 'float', value: 0 });
      const y = scalarToNumber(v.components[1] ?? { kind: 'float', value: 0 });
      return {
        renderer: 'geometric_2d',
        objectId: v.id,
        kind: 'vector_arrow',
        arrows: [{ from: [0, 0], to: [x, y], color: '#3b82f6' }],
        axisRange: [-5, 5],
      };
    },
  },
  {
    id: 'coordinate-display',
    label: 'Coordinates',
    renderer: 'symbolic',
    applicable: () => true,
    toProps: (v, _session): SymbolicProps => ({
      renderer: 'symbolic',
      objectId: v.id,
      latex:
        v.kind === 'concrete'
          ? concreteVectorToLatex(v.components)
          : `\\mathbf{${v.kind === 'abstract' ? v.label : '?'}}`,
    }),
  },
];

export function registerDefaults(registry: VisualizerRegistry): void {
  registry.register('LinearMap', LINEAR_MAP_VISUALIZERS);
  registry.register('VectorSpace', VECTOR_SPACE_VISUALIZERS);
  registry.register('Vector', VECTOR_VISUALIZERS);
}
