import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { interpolateSnapshots } from './interpolation.ts';
import { rational, toFloat } from '../../types/scalar.ts';
import { mkVectorId, mkSpaceId, mkMapId, mkBasisId, _resetIdCounter } from '../../types/ids.ts';
import { mkMatrix } from '../../types/matrix.ts';
import type { SessionSnapshot } from '../../state/types.ts';
import type { Vector } from '../../types/vector.ts';
import type { LinearMap } from '../../types/map.ts';

beforeEach(() => {
  _resetIdCounter();
});

function emptySnapshot(): SessionSnapshot {
  return {
    field: 'R',
    spaces: {},
    subspaces: {},
    maps: {},
    vectors: {},
    bases: {},
    innerProducts: {},
    selectedBasis: {},
    namedObjects: {},
  };
}

function snapshotWithVectors(entries: [string, number, number][]): SessionSnapshot {
  const snap = emptySnapshot();
  const spaceId = mkSpaceId('space:Fn:R:2');
  const vectors: Record<string, Vector> = {};
  for (const [id, x, y] of entries) {
    vectors[id] = {
      kind: 'concrete',
      id: mkVectorId(id),
      field: 'R',
      space: spaceId,
      components: [rational(x), rational(y)],
    };
  }
  return { ...snap, vectors };
}

describe('interpolateSnapshots — vectors', () => {
  it('at t=0 returns a vector components unchanged', () => {
    const a = snapshotWithVectors([['v1', 1, 2]]);
    const b = snapshotWithVectors([['v1', 3, 6]]);
    const result = interpolateSnapshots(a, b, 0);
    const v = result.vectors['v1'];
    expect(v?.kind).toBe('concrete');
    if (v?.kind !== 'concrete') return;
    expect(toFloat(v.components[0]!)).toBeCloseTo(1);
    expect(toFloat(v.components[1]!)).toBeCloseTo(2);
  });

  it('at t=1 returns b vector components', () => {
    const a = snapshotWithVectors([['v1', 1, 2]]);
    const b = snapshotWithVectors([['v1', 3, 6]]);
    const result = interpolateSnapshots(a, b, 1);
    const v = result.vectors['v1'];
    if (v?.kind !== 'concrete') return;
    expect(toFloat(v.components[0]!)).toBeCloseTo(3);
    expect(toFloat(v.components[1]!)).toBeCloseTo(6);
  });

  it('at t=0.5 returns average of components', () => {
    const a = snapshotWithVectors([['v1', 0, 0]]);
    const b = snapshotWithVectors([['v1', 4, 8]]);
    const result = interpolateSnapshots(a, b, 0.5);
    const v = result.vectors['v1'];
    if (v?.kind !== 'concrete') return;
    expect(toFloat(v.components[0]!)).toBeCloseTo(2);
    expect(toFloat(v.components[1]!)).toBeCloseTo(4);
  });

  it('keeps vectors present only in a', () => {
    const a = snapshotWithVectors([
      ['v1', 1, 2],
      ['v2', 5, 5],
    ]);
    const b = snapshotWithVectors([['v1', 3, 6]]);
    const result = interpolateSnapshots(a, b, 0.5);
    expect(result.vectors['v2']).toBeDefined();
  });

  it('does not add vectors present only in b', () => {
    const a = snapshotWithVectors([['v1', 1, 2]]);
    const b = snapshotWithVectors([
      ['v1', 3, 6],
      ['v2', 5, 5],
    ]);
    const result = interpolateSnapshots(a, b, 0.5);
    expect(result.vectors['v2']).toBeUndefined();
  });

  it('keeps abstract vectors from a unchanged', () => {
    const spaceId = mkSpaceId('space:Fn:R:2');
    const snap = emptySnapshot();
    const abstractVec: Vector = {
      kind: 'abstract',
      id: mkVectorId('v1'),
      space: spaceId,
      label: 'v',
    };
    const a = { ...snap, vectors: { v1: abstractVec } };
    const concreteVec: Vector = {
      kind: 'concrete',
      id: mkVectorId('v1'),
      field: 'R',
      space: spaceId,
      components: [rational(3), rational(6)],
    };
    const b = { ...snap, vectors: { v1: concreteVec } };
    const result = interpolateSnapshots(a, b, 0.5);
    expect(result.vectors['v1']?.kind).toBe('abstract');
  });

  it('property: interpolate(a, b, 0) components match a', () => {
    const arbComponent = fc.integer({ min: -10, max: 10 });
    fc.assert(
      fc.property(arbComponent, arbComponent, arbComponent, arbComponent, (ax, ay, bx, by) => {
        const a = snapshotWithVectors([['v1', ax, ay]]);
        const b = snapshotWithVectors([['v1', bx, by]]);
        const result = interpolateSnapshots(a, b, 0);
        const v = result.vectors['v1'];
        if (v?.kind !== 'concrete') return false;
        return (
          Math.abs(toFloat(v.components[0]!) - ax) < 1e-9 &&
          Math.abs(toFloat(v.components[1]!) - ay) < 1e-9
        );
      }),
    );
  });

  it('property: interpolate(a, b, 1) components match b', () => {
    const arbComponent = fc.integer({ min: -10, max: 10 });
    fc.assert(
      fc.property(arbComponent, arbComponent, arbComponent, arbComponent, (ax, ay, bx, by) => {
        const a = snapshotWithVectors([['v1', ax, ay]]);
        const b = snapshotWithVectors([['v1', bx, by]]);
        const result = interpolateSnapshots(a, b, 1);
        const v = result.vectors['v1'];
        if (v?.kind !== 'concrete') return false;
        return (
          Math.abs(toFloat(v.components[0]!) - bx) < 1e-9 &&
          Math.abs(toFloat(v.components[1]!) - by) < 1e-9
        );
      }),
    );
  });

  it('property: interpolate(a, b, 0.5) components are the average', () => {
    const arbComponent = fc.integer({ min: -10, max: 10 });
    fc.assert(
      fc.property(arbComponent, arbComponent, arbComponent, arbComponent, (ax, ay, bx, by) => {
        const a = snapshotWithVectors([['v1', ax, ay]]);
        const b = snapshotWithVectors([['v1', bx, by]]);
        const result = interpolateSnapshots(a, b, 0.5);
        const v = result.vectors['v1'];
        if (v?.kind !== 'concrete') return false;
        return (
          Math.abs(toFloat(v.components[0]!) - (ax + bx) / 2) < 1e-9 &&
          Math.abs(toFloat(v.components[1]!) - (ay + by) / 2) < 1e-9
        );
      }),
    );
  });
});

describe('interpolateSnapshots — maps', () => {
  it('interpolates matrix entries at t=0.5', () => {
    const snap = emptySnapshot();
    const spaceId = mkSpaceId('space:Fn:R:2');
    const basisId = mkBasisId('basis:test');

    const makeMap = (a: number, b: number, c: number, d: number): LinearMap => {
      const mat = mkMatrix(
        'R',
        [
          [rational(a), rational(b)],
          [rational(c), rational(d)],
        ],
        basisId,
        basisId,
      );
      if (!mat.ok) throw new Error('bad matrix');
      return {
        id: mkMapId('m1'),
        domain: spaceId,
        codomain: spaceId,
        representation: {
          kind: 'matrix',
          matrix: mat.value,
          domainBasis: basisId,
          codomainBasis: basisId,
        },
      };
    };

    const mapA = makeMap(0, 0, 0, 0);
    const mapB = makeMap(2, 4, 6, 8);
    const a = { ...snap, maps: { m1: mapA } };
    const b = { ...snap, maps: { m1: mapB } };
    const result = interpolateSnapshots(a, b, 0.5);
    const m = result.maps['m1'];
    if (m?.representation.kind !== 'matrix') return;
    const { entries } = m.representation.matrix;
    expect(toFloat(entries[0]![0]!)).toBeCloseTo(1);
    expect(toFloat(entries[0]![1]!)).toBeCloseTo(2);
    expect(toFloat(entries[1]![0]!)).toBeCloseTo(3);
    expect(toFloat(entries[1]![1]!)).toBeCloseTo(4);
  });

  it('keeps formula maps from a unchanged', () => {
    const snap = emptySnapshot();
    const spaceId = mkSpaceId('space:Fn:R:2');
    const formulaMap: LinearMap = {
      id: mkMapId('m1'),
      domain: spaceId,
      codomain: spaceId,
      representation: { kind: 'formula', fn: (v) => v, label: 'identity' },
    };
    const basisId = mkBasisId('basis:test');
    const mat = mkMatrix(
      'R',
      [
        [rational(1), rational(0)],
        [rational(0), rational(1)],
      ],
      basisId,
      basisId,
    );
    if (!mat.ok) throw new Error('bad matrix');
    const matrixMap: LinearMap = {
      id: mkMapId('m1'),
      domain: spaceId,
      codomain: spaceId,
      representation: {
        kind: 'matrix',
        matrix: mat.value,
        domainBasis: basisId,
        codomainBasis: basisId,
      },
    };
    const a = { ...snap, maps: { m1: formulaMap } };
    const b = { ...snap, maps: { m1: matrixMap } };
    const result = interpolateSnapshots(a, b, 0.5);
    expect(result.maps['m1']?.representation.kind).toBe('formula');
  });
});

describe('interpolateSnapshots — structural fields', () => {
  it('preserves field from a', () => {
    const a = { ...emptySnapshot(), field: 'R' as const };
    const b = { ...emptySnapshot(), field: 'C' as const };
    const result = interpolateSnapshots(a, b, 0.5);
    expect(result.field).toBe('R');
  });

  it('preserves namedObjects from a', () => {
    const snap = emptySnapshot();
    const ref = { kind: 'vector' as const, id: mkVectorId('v1') };
    const a = { ...snap, namedObjects: { v: ref } };
    const b = snap;
    const result = interpolateSnapshots(a, b, 0.5);
    expect(result.namedObjects['v']).toEqual(ref);
  });

  it('does not mutate a or b', () => {
    const a = snapshotWithVectors([['v1', 1, 2]]);
    const b = snapshotWithVectors([['v1', 3, 6]]);
    const aComponentBefore = toFloat(
      (a.vectors['v1'] as Extract<Vector, { kind: 'concrete' }>).components[0]!,
    );
    interpolateSnapshots(a, b, 0.5);
    const aComponentAfter = toFloat(
      (a.vectors['v1'] as Extract<Vector, { kind: 'concrete' }>).components[0]!,
    );
    expect(aComponentAfter).toBe(aComponentBefore);
  });
});
