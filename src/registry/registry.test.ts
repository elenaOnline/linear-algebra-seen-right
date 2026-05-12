import { describe, it, expect, beforeEach } from 'vitest';
import { VisualizerRegistry, registerDefaults, type MathObject, type Visualizer } from './index.ts';
import { mkVectorSpaceFn, _resetSpaceRegistry } from '../types/space.ts';
import { mkLinearMapByFormula, mkLinearMapByMatrix } from '../types/map.ts';
import { mkConcreteVector } from '../types/vector.ts';
import { mkMatrix } from '../types/matrix.ts';
import { rational } from '../types/scalar.ts';
import type { SessionView } from '../types/session-view.ts';
import type { VectorSpace } from '../types/space.ts';
import type { SpaceId, SubspaceId, BasisId, MapId } from '../types/ids.ts';

// Minimal SessionView that resolves spaces from a provided map.
function makeSession(spaces: Map<SpaceId, VectorSpace>): SessionView {
  return {
    getSpace: (id) => spaces.get(id),
    getSubspace: (_id: SubspaceId) => undefined,
    getBasis: (_id: BasisId) => undefined,
    getActiveBasis: (_id: SpaceId) => undefined,
    getSpaceForBasis: (_id: BasisId) => undefined,
    getCachedResult: (_key: string) => undefined,
    getMapDomain: (_id: MapId) => undefined,
    getMapCodomain: (_id: MapId) => undefined,
  };
}

beforeEach(() => {
  _resetSpaceRegistry();
});

describe('VisualizerRegistry — registration and retrieval', () => {
  it('getAll returns registered visualizers in order', () => {
    const reg = new VisualizerRegistry();
    const v1: Visualizer<MathObject> = {
      id: 'test-a',
      label: 'A',
      renderer: 'symbolic',
      applicable: () => true,
      toProps: (_obj, _s) => ({ renderer: 'symbolic', objectId: 'stub', isPending: true as const }),
    };
    const v2: Visualizer<MathObject> = {
      id: 'test-b',
      label: 'B',
      renderer: 'diagram',
      applicable: () => true,
      toProps: (_obj, _s) => ({ renderer: 'diagram', objectId: 'stub', isPending: true as const }),
    };
    reg.register('VectorSpace', [v1, v2]);
    expect(reg.getAll('VectorSpace').map((v) => v.id)).toEqual(['test-a', 'test-b']);
  });

  it('getById returns the registered visualizer', () => {
    const reg = new VisualizerRegistry();
    const v: Visualizer<MathObject> = {
      id: 'test-c',
      label: 'C',
      renderer: 'chart',
      applicable: () => true,
      toProps: (_obj, _s) => ({ renderer: 'chart', objectId: 'stub', isPending: true as const }),
    };
    reg.register('Matrix', [v]);
    expect(reg.getById('test-c')).toBe(v);
  });

  it('getById returns undefined for unknown id', () => {
    const reg = new VisualizerRegistry();
    expect(reg.getById('no-such')).toBeUndefined();
  });

  it('getAll returns empty array for unregistered kind', () => {
    const reg = new VisualizerRegistry();
    expect(reg.getAll('InnerProduct')).toEqual([]);
  });

  it('subsequent register calls append rather than replace', () => {
    const reg = new VisualizerRegistry();
    const v1: Visualizer<MathObject> = {
      id: 'append-a',
      label: 'A',
      renderer: 'symbolic',
      applicable: () => true,
      toProps: (_obj, _s) => ({ renderer: 'symbolic', objectId: 'stub', isPending: true as const }),
    };
    const v2: Visualizer<MathObject> = {
      id: 'append-b',
      label: 'B',
      renderer: 'diagram',
      applicable: () => true,
      toProps: (_obj, _s) => ({ renderer: 'diagram', objectId: 'stub', isPending: true as const }),
    };
    reg.register('Subspace', [v1]);
    reg.register('Subspace', [v2]);
    expect(reg.getAll('Subspace').map((v) => v.id)).toEqual(['append-a', 'append-b']);
  });

  it('duplicate id throws', () => {
    const reg = new VisualizerRegistry();
    const v: Visualizer<MathObject> = {
      id: 'dup',
      label: 'D',
      renderer: 'symbolic',
      applicable: () => true,
      toProps: (_obj, _s) => ({ renderer: 'symbolic', objectId: 'stub', isPending: true as const }),
    };
    reg.register('Basis', [v]);
    expect(() => reg.register('Basis', [v])).toThrow('dup');
  });
});

describe('VisualizerRegistry — getApplicable filtering', () => {
  it('returns only applicable visualizers', () => {
    const reg = new VisualizerRegistry();
    const always: Visualizer<MathObject> = {
      id: 'always',
      label: 'Always',
      renderer: 'symbolic',
      applicable: () => true,
      toProps: (_obj, _s) => ({ renderer: 'symbolic', objectId: 'stub', isPending: true as const }),
    };
    const never: Visualizer<MathObject> = {
      id: 'never',
      label: 'Never',
      renderer: 'chart',
      applicable: () => false,
      toProps: (_obj, _s) => ({ renderer: 'chart', objectId: 'stub', isPending: true as const }),
    };
    reg.register('VectorSpace', [always, never]);
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const result = reg.getApplicable('VectorSpace', r2.value, session);
    expect(result.map((v) => v.id)).toEqual(['always']);
  });

  it('preserves registration order in results', () => {
    const reg = new VisualizerRegistry();
    const ids = ['first', 'second', 'third'];
    const visualizers = ids.map(
      (id): Visualizer<MathObject> => ({
        id,
        label: id,
        renderer: 'symbolic',
        applicable: () => true,
        toProps: (_obj, _s) => ({
          renderer: 'symbolic',
          objectId: 'stub',
          isPending: true as const,
        }),
      }),
    );
    reg.register('Vector', visualizers);
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const vec = mkConcreteVector('R', r2.value.id, [rational(1), rational(0)], 2);
    if (!vec.ok) throw new Error();
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const result = reg.getApplicable('Vector', vec.value, session);
    expect(result.map((v) => v.id)).toEqual(ids);
  });
});

describe('VisualizerRegistry — cross-kind isolation', () => {
  it('registering a Vector visualizer does not affect LinearMap results', () => {
    const reg = new VisualizerRegistry();
    registerDefaults(reg);
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const spaces = new Map([[r2.value.id, r2.value]]);
    const session = makeSession(spaces);
    const T = mkLinearMapByFormula(r2.value.id, r2.value.id, (v) => v, 'id');
    const beforeCount = reg.getApplicable('LinearMap', T, session).length;

    reg.register('Vector', [
      {
        id: 'extra-vector-viz',
        label: 'Extra',
        renderer: 'chart',
        applicable: () => true,
        toProps: (_obj, _s) => ({ renderer: 'chart', objectId: 'stub', isPending: true as const }),
      },
    ]);
    const afterCount = reg.getApplicable('LinearMap', T, session).length;
    expect(beforeCount).toBe(afterCount);
  });
});

describe('Default LinearMap visualizers', () => {
  let reg: VisualizerRegistry;

  beforeEach(() => {
    reg = new VisualizerRegistry();
    registerDefaults(reg);
  });

  it('2D endomorphism gets at least 4 visualizers', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const spaces = new Map([[r2.value.id, r2.value]]);
    const session = makeSession(spaces);
    const T = mkLinearMapByFormula(r2.value.id, r2.value.id, (v) => v, 'id');
    const result = reg.getApplicable('LinearMap', T, session);
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it('grid-deformation-3d: applicable for 3D→3D, not for 5D→5D', () => {
    const r3 = mkVectorSpaceFn('R', 3);
    const r5 = mkVectorSpaceFn('R', 5);
    if (!r3.ok || !r5.ok) throw new Error();
    const spaces3 = new Map([[r3.value.id, r3.value]]);
    const spaces5 = new Map([[r5.value.id, r5.value]]);
    const T3 = mkLinearMapByFormula(r3.value.id, r3.value.id, (v) => v, 'id3');
    const T5 = mkLinearMapByFormula(r5.value.id, r5.value.id, (v) => v, 'id5');
    const v3 = reg.getById('grid-deformation-3d');
    expect(v3).toBeDefined();
    if (!v3) return;
    expect(v3.applicable(T3, makeSession(spaces3))).toBe(true);
    expect(v3.applicable(T5, makeSession(spaces5))).toBe(false);
  });

  it('eigenline-2d: applicable for 2D endomorphism, not for 2D→3D', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    const r3 = mkVectorSpaceFn('R', 3);
    if (!r2.ok || !r3.ok) throw new Error();
    const spaces = new Map([
      [r2.value.id, r2.value],
      [r3.value.id, r3.value],
    ]);
    const session = makeSession(spaces);
    const T_endo = mkLinearMapByFormula(r2.value.id, r2.value.id, (v) => v, 'endo');
    const T_rect = mkLinearMapByFormula(r2.value.id, r3.value.id, (v) => v, 'rect');
    const viz = reg.getById('eigenline-2d');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(T_endo, session)).toBe(true);
    expect(viz.applicable(T_rect, session)).toBe(false);
  });

  it('kernel-range-diagram: always applicable', () => {
    const r5 = mkVectorSpaceFn('R', 5);
    if (!r5.ok) throw new Error();
    const session = makeSession(new Map([[r5.value.id, r5.value]]));
    const T = mkLinearMapByFormula(r5.value.id, r5.value.id, (v) => v, 'id');
    const viz = reg.getById('kernel-range-diagram');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(T, session)).toBe(true);
  });

  it('matrix-heatmap: always applicable', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const T = mkLinearMapByFormula(r2.value.id, r2.value.id, (v) => v, 'id');
    const viz = reg.getById('matrix-heatmap');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(T, session)).toBe(true);
  });

  it('symbolic-formula: applicable for formula-kind, not for matrix-kind', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const basisId = r2.value.id as unknown as BasisId;
    const entries = [
      [rational(1), rational(0)],
      [rational(0), rational(1)],
    ];
    const mat = mkMatrix('R', entries, basisId, basisId);
    if (!mat.ok) throw new Error();
    const T_formula = mkLinearMapByFormula(r2.value.id, r2.value.id, (v) => v, 'f');
    const T_matrix = mkLinearMapByMatrix(r2.value.id, r2.value.id, mat.value, basisId, basisId);
    if (!T_matrix.ok) throw new Error();
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const viz = reg.getById('symbolic-formula');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(T_formula, session)).toBe(true);
    expect(viz.applicable(T_matrix.value, session)).toBe(false);
  });

  it('grid-deformation-3d: not applicable for 0-dim space (ADR-011)', () => {
    const r0 = mkVectorSpaceFn('R', 0);
    if (!r0.ok) throw new Error();
    const session = makeSession(new Map([[r0.value.id, r0.value]]));
    const T = mkLinearMapByFormula(r0.value.id, r0.value.id, (v) => v, 'zero');
    const viz = reg.getById('grid-deformation-3d');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(T, session)).toBe(false);
  });
});

describe('Default VectorSpace visualizers', () => {
  let reg: VisualizerRegistry;

  beforeEach(() => {
    reg = new VisualizerRegistry();
    registerDefaults(reg);
  });

  it('basis-display: always applicable', () => {
    const r5 = mkVectorSpaceFn('R', 5);
    if (!r5.ok) throw new Error();
    const session = makeSession(new Map([[r5.value.id, r5.value]]));
    const viz = reg.getById('basis-display');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(r5.value, session)).toBe(true);
  });

  it('coordinate-axes-3d: applicable for R^3, not R^2', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    const r3 = mkVectorSpaceFn('R', 3);
    if (!r2.ok || !r3.ok) throw new Error();
    const session = makeSession(
      new Map([
        [r2.value.id, r2.value],
        [r3.value.id, r3.value],
      ]),
    );
    const viz = reg.getById('coordinate-axes-3d');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(r3.value, session)).toBe(true);
    expect(viz.applicable(r2.value, session)).toBe(false);
  });

  it('coordinate-axes-2d: applicable for R^2, not R^3', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    const r3 = mkVectorSpaceFn('R', 3);
    if (!r2.ok || !r3.ok) throw new Error();
    const session = makeSession(
      new Map([
        [r2.value.id, r2.value],
        [r3.value.id, r3.value],
      ]),
    );
    const viz = reg.getById('coordinate-axes-2d');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(r2.value, session)).toBe(true);
    expect(viz.applicable(r3.value, session)).toBe(false);
  });
});

describe('Default Vector visualizers', () => {
  let reg: VisualizerRegistry;

  beforeEach(() => {
    reg = new VisualizerRegistry();
    registerDefaults(reg);
  });

  it('arrow-2d: applicable for R^2 vector, not R^3 vector', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    const r3 = mkVectorSpaceFn('R', 3);
    if (!r2.ok || !r3.ok) throw new Error();
    const v2 = mkConcreteVector('R', r2.value.id, [rational(1), rational(0)], 2);
    const v3 = mkConcreteVector('R', r3.value.id, [rational(1), rational(0), rational(0)], 3);
    if (!v2.ok || !v3.ok) throw new Error();
    const session = makeSession(
      new Map([
        [r2.value.id, r2.value],
        [r3.value.id, r3.value],
      ]),
    );
    const viz = reg.getById('arrow-2d');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(v2.value, session)).toBe(true);
    expect(viz.applicable(v3.value, session)).toBe(false);
  });

  it('arrow-3d: applicable for R^3 vector, not R^2 vector', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    const r3 = mkVectorSpaceFn('R', 3);
    if (!r2.ok || !r3.ok) throw new Error();
    const v2 = mkConcreteVector('R', r2.value.id, [rational(1), rational(0)], 2);
    const v3 = mkConcreteVector('R', r3.value.id, [rational(1), rational(0), rational(0)], 3);
    if (!v2.ok || !v3.ok) throw new Error();
    const session = makeSession(
      new Map([
        [r2.value.id, r2.value],
        [r3.value.id, r3.value],
      ]),
    );
    const viz = reg.getById('arrow-3d');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(v3.value, session)).toBe(true);
    expect(viz.applicable(v2.value, session)).toBe(false);
  });

  it('coordinate-display: always applicable', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const v = mkConcreteVector('R', r2.value.id, [rational(1), rational(0)], 2);
    if (!v.ok) throw new Error();
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const viz = reg.getById('coordinate-display');
    expect(viz).toBeDefined();
    if (!viz) return;
    expect(viz.applicable(v.value, session)).toBe(true);
  });
});

describe('Geometric2D toProps', () => {
  let reg: VisualizerRegistry;

  beforeEach(() => {
    reg = new VisualizerRegistry();
    registerDefaults(reg);
  });

  it('arrow-2d toProps returns geometric_2d with arrows for a concrete 2D vector', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const v = mkConcreteVector('R', r2.value.id, [rational(3, 4), rational(-1, 2)], 2);
    if (!v.ok) throw new Error();
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const viz = reg.getById('arrow-2d');
    expect(viz).toBeDefined();
    if (!viz) return;
    const props = viz.toProps(v.value, session);
    expect(props.renderer).toBe('geometric_2d');
    // Two-step narrowing: eliminate LoadingProps first, then narrow to Geometric2DProps.
    if ('isPending' in props) return;
    if (props.renderer !== 'geometric_2d') return;
    expect(props.kind).toBe('vector_arrow');
    expect(props.arrows).toHaveLength(1);
    const arrow = props.arrows?.[0];
    expect(arrow?.to[0]).toBeCloseTo(0.75);
    expect(arrow?.to[1]).toBeCloseTo(-0.5);
  });

  it('coordinate-axes-2d toProps returns axes_only for R^2', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const viz = reg.getById('coordinate-axes-2d');
    expect(viz).toBeDefined();
    if (!viz) return;
    const props = viz.toProps(r2.value, session);
    expect(props.renderer).toBe('geometric_2d');
    if ('isPending' in props) return;
    if (props.renderer !== 'geometric_2d') return;
    expect(props.kind).toBe('axes_only');
  });

  it('grid-deformation-2d toProps returns grid_deformation for matrix-kind map', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const basisId = r2.value.id as unknown as BasisId;
    const mat = mkMatrix(
      'R',
      [
        [rational(1), rational(2)],
        [rational(3), rational(4)],
      ],
      basisId,
      basisId,
    );
    if (!mat.ok) throw new Error();
    const A = mkLinearMapByMatrix(r2.value.id, r2.value.id, mat.value, basisId, basisId);
    if (!A.ok) throw new Error();
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const viz = reg.getById('grid-deformation-2d');
    expect(viz).toBeDefined();
    if (!viz) return;
    const props = viz.toProps(A.value, session);
    expect(props.renderer).toBe('geometric_2d');
    if ('isPending' in props) return;
    if (props.renderer !== 'geometric_2d') return;
    expect(props.kind).toBe('grid_deformation');
    expect(props.gridDeformation?.matrix[0][0]).toBeCloseTo(1);
    expect(props.gridDeformation?.matrix[0][1]).toBeCloseTo(2);
    expect(props.gridDeformation?.matrix[1][0]).toBeCloseTo(3);
    expect(props.gridDeformation?.matrix[1][1]).toBeCloseTo(4);
  });

  it('grid-deformation-2d toProps returns LoadingProps for formula-kind map', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const T = mkLinearMapByFormula(r2.value.id, r2.value.id, (v) => v, 'id');
    const session = makeSession(new Map([[r2.value.id, r2.value]]));
    const viz = reg.getById('grid-deformation-2d');
    expect(viz).toBeDefined();
    if (!viz) return;
    const props = viz.toProps(T, session);
    expect((props as { isPending?: boolean }).isPending).toBe(true);
  });
});

describe('toProps renderer tag invariant', () => {
  it('toProps always returns a props object whose renderer matches the visualizer renderer', () => {
    const reg = new VisualizerRegistry();
    registerDefaults(reg);
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const spaces = new Map([[r2.value.id, r2.value]]);
    const session = makeSession(spaces);
    const T = mkLinearMapByFormula(r2.value.id, r2.value.id, (v) => v, 'id');

    for (const viz of reg.getAll('LinearMap')) {
      const props = viz.toProps(T, session);
      expect(props.renderer).toBe(viz.renderer);
    }
  });
});
