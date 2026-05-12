import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createMathStore } from './store.ts';
import { mkVectorSpaceFn, _resetSpaceRegistry } from '../types/space.ts';
import { mkConcreteVector, mkDerivedVector } from '../types/vector.ts';
import { rational, float } from '../types/scalar.ts';
import { _resetIdCounter } from '../types/ids.ts';
import type { Scalar } from '../types/scalar.ts';

beforeEach(() => {
  _resetSpaceRegistry();
  _resetIdCounter();
});

function toNum(s: Scalar): number {
  if (s.kind === 'rational')
    return Number(s.value.s < 0n ? -Number(s.value.n) : Number(s.value.n)) / Number(s.value.d);
  if (s.kind === 'float') return s.value;
  return 0;
}

function setup2dSpace() {
  const spaceR = mkVectorSpaceFn('R', 2);
  if (!spaceR.ok) throw new Error('mkVectorSpaceFn failed');
  return spaceR.value;
}

function makeVec(spaceId: ReturnType<typeof setup2dSpace>['id'], x: number, y: number) {
  const r = mkConcreteVector('R', spaceId, [rational(x), rational(y)]);
  if (!r.ok) throw new Error('mkConcreteVector failed');
  return r.value;
}

describe('recomputeDerived — via store mutations', () => {
  it('derived add vector updates when dependency is dragged', () => {
    const store = createMathStore();
    const space = setup2dSpace();
    const v1 = makeVec(space.id, 1, 2);
    const v2 = makeVec(space.id, 3, -1);
    const w = mkDerivedVector('R', space.id, { op: 'add', left: v1.id, right: v2.id }, [
      float(4),
      float(1),
    ]);

    store.getState().addSpace(space);
    store.getState().addVector(v1);
    store.getState().addVector(v2);
    store.getState().addVector(w);

    // Drag v1 to (2, 0) — w should become (5, -1)
    store
      .getState()
      .updateVector({
        kind: 'concrete',
        id: v1.id,
        field: 'R',
        space: v1.space,
        components: [rational(2), rational(0)],
      });

    const after = store.getState().vectors[w.id];
    if (!after || after.kind !== 'concrete') throw new Error('expected concrete');
    expect(toNum(after.components[0]!)).toBeCloseTo(5, 5);
    expect(toNum(after.components[1]!)).toBeCloseTo(-1, 5);
  });

  it('derived subtraction works correctly', () => {
    const store = createMathStore();
    const space = setup2dSpace();
    const v1 = makeVec(space.id, 4, 3);
    const v2 = makeVec(space.id, 1, 1);
    const d = mkDerivedVector('R', space.id, { op: 'sub', left: v1.id, right: v2.id }, [
      float(3),
      float(2),
    ]);

    store.getState().addSpace(space);
    store.getState().addVector(v1);
    store.getState().addVector(v2);
    store.getState().addVector(d);

    const result = store.getState().vectors[d.id];
    if (!result || result.kind !== 'concrete') throw new Error('expected concrete');
    expect(toNum(result.components[0]!)).toBeCloseTo(3, 5);
    expect(toNum(result.components[1]!)).toBeCloseTo(2, 5);
  });

  it('scale derivation updates when base vector changes', () => {
    const store = createMathStore();
    const space = setup2dSpace();
    const v = makeVec(space.id, 1, 2);
    const scaled = mkDerivedVector(
      'R',
      space.id,
      { op: 'scale', scalar: rational(3), vector: v.id },
      [float(3), float(6)],
    );

    store.getState().addSpace(space);
    store.getState().addVector(v);
    store.getState().addVector(scaled);

    // Update v to (2, 1) — scaled should become (6, 3)
    store
      .getState()
      .updateVector({
        kind: 'concrete',
        id: v.id,
        field: 'R',
        space: v.space,
        components: [rational(2), rational(1)],
      });

    const result = store.getState().vectors[scaled.id];
    if (!result || result.kind !== 'concrete') throw new Error('expected concrete');
    expect(toNum(result.components[0]!)).toBeCloseTo(6, 5);
    expect(toNum(result.components[1]!)).toBeCloseTo(3, 5);
  });

  it('deletion removes object, views, and named entries', () => {
    const store = createMathStore();
    const space = setup2dSpace();
    const v = makeVec(space.id, 1, 0);

    store.getState().addSpace(space);
    store.getState().addVector(v);
    store.getState().nameObject('v', { kind: 'vector', id: v.id });
    store.getState().openView('geometric_2d', { kind: 'vector', id: v.id });

    expect(Object.keys(store.getState().vectors)).toHaveLength(1);
    expect(store.getState().views).toHaveLength(1);

    store.getState().removeVector(v.id);

    expect(Object.keys(store.getState().vectors)).toHaveLength(0);
    expect(store.getState().views).toHaveLength(0);
    expect(store.getState().namedObjects['v']).toBeUndefined();
  });

  it('removeSpace cascades to dependent vectors', () => {
    const store = createMathStore();
    const space = setup2dSpace();
    const v = makeVec(space.id, 1, 0);

    store.getState().addSpace(space);
    store.getState().addVector(v);

    store.getState().removeSpace(space.id);

    expect(Object.keys(store.getState().spaces)).toHaveLength(0);
    expect(Object.keys(store.getState().vectors)).toHaveLength(0);
  });

  it('property: derived add always equals componentwise sum', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -10, max: 10 }), fc.integer({ min: -10, max: 10 })),
        fc.tuple(fc.integer({ min: -10, max: 10 }), fc.integer({ min: -10, max: 10 })),
        ([ax, ay], [bx, by]) => {
          _resetSpaceRegistry();
          _resetIdCounter();
          const store = createMathStore();
          const spaceR = mkVectorSpaceFn('R', 2);
          if (!spaceR.ok) return false;
          const space = spaceR.value;
          const vaR = mkConcreteVector('R', space.id, [rational(ax), rational(ay)]);
          const vbR = mkConcreteVector('R', space.id, [rational(bx), rational(by)]);
          if (!vaR.ok || !vbR.ok) return false;
          const va = vaR.value;
          const vb = vbR.value;
          const w = mkDerivedVector('R', space.id, { op: 'add', left: va.id, right: vb.id }, [
            float(ax + bx),
            float(ay + by),
          ]);

          store.getState().addSpace(space);
          store.getState().addVector(va);
          store.getState().addVector(vb);
          store.getState().addVector(w);

          const result = store.getState().vectors[w.id];
          if (!result || result.kind !== 'concrete') return false;
          const c0 = result.components[0];
          const c1 = result.components[1];
          if (!c0 || !c1) return false;
          return Math.abs(toNum(c0) - (ax + bx)) < 0.01 && Math.abs(toNum(c1) - (ay + by)) < 0.01;
        },
      ),
    );
  });
});
