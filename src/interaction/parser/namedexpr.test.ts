import { describe, it, expect, beforeEach } from 'vitest';
import { parseInput } from './parser.ts';
import { mkVectorSpaceFn, _resetSpaceRegistry } from '../../types/space.ts';
import { mkConcreteVector } from '../../types/vector.ts';
import { mkLinearMapByMatrix } from '../../types/map.ts';
import { mkMatrix } from '../../types/matrix.ts';
import { rational } from '../../types/scalar.ts';
import type { MathObjectRef } from '../../state/types.ts';
import type { BasisId } from '../../types/ids.ts';
import { _resetIdCounter } from '../../types/ids.ts';

beforeEach(() => {
  _resetSpaceRegistry();
  _resetIdCounter();
});

function setup(): {
  namedVectors: Record<string, MathObjectRef>;
  namedMaps: Record<string, MathObjectRef>;
} {
  const spaceR = mkVectorSpaceFn('R', 2);
  if (!spaceR.ok) throw new Error('space failed');
  const space = spaceR.value;
  const bid = space.id as unknown as BasisId;

  const vR = mkConcreteVector('R', space.id, [rational(1), rational(0)]);
  const wR = mkConcreteVector('R', space.id, [rational(0), rational(1)]);
  if (!vR.ok || !wR.ok) throw new Error('vec failed');

  const matR = mkMatrix(
    'R',
    [
      [rational(1), rational(0)],
      [rational(0), rational(1)],
    ],
    bid,
    bid,
  );
  if (!matR.ok) throw new Error('mat failed');
  const AR = mkLinearMapByMatrix(space.id, space.id, matR.value, bid, bid);
  const BR = mkLinearMapByMatrix(space.id, space.id, matR.value, bid, bid);
  if (!AR.ok || !BR.ok) throw new Error('map failed');

  return {
    namedVectors: {
      v: { kind: 'vector', id: vR.value.id },
      w: { kind: 'vector', id: wR.value.id },
    },
    namedMaps: {
      A: { kind: 'map', id: AR.value.id },
      B: { kind: 'map', id: BR.value.id },
    },
  };
}

describe('parseInput with namedObjects', () => {
  it('returns vector-expr for v + w', () => {
    const { namedVectors } = setup();
    const result = parseInput('v + w', namedVectors);
    expect(result.kind).toBe('vector-expr');
    if (result.kind === 'vector-expr') {
      expect(result.expression.op).toBe('add');
    }
  });

  it('returns vector-expr for v - w', () => {
    const { namedVectors } = setup();
    const result = parseInput('v - w', namedVectors);
    expect(result.kind).toBe('vector-expr');
    if (result.kind === 'vector-expr') {
      expect(result.expression.op).toBe('sub');
    }
  });

  it('returns vector-expr for 2v (scalar multiple)', () => {
    const { namedVectors } = setup();
    const result = parseInput('2v', namedVectors);
    expect(result.kind).toBe('vector-expr');
    if (result.kind === 'vector-expr') {
      expect(result.expression.op).toBe('scale');
    }
  });

  it('returns vector-expr for 2 * v', () => {
    const { namedVectors } = setup();
    const result = parseInput('2 * v', namedVectors);
    expect(result.kind).toBe('vector-expr');
    if (result.kind === 'vector-expr') {
      expect(result.expression.op).toBe('scale');
    }
  });

  it('returns map-expr for A * B (composition)', () => {
    const { namedMaps } = setup();
    const result = parseInput('A * B', namedMaps);
    expect(result.kind).toBe('map-expr');
    if (result.kind === 'map-expr') {
      expect(result.expression.op).toBe('compose');
    }
  });

  it('returns map-expr for A + B (sum)', () => {
    const { namedMaps } = setup();
    const result = parseInput('A + B', namedMaps);
    expect(result.kind).toBe('map-expr');
    if (result.kind === 'map-expr') {
      expect(result.expression.op).toBe('sum');
    }
  });

  it('falls back to literal parsing when no namedObjects supplied', () => {
    const result = parseInput('(1, 2)');
    expect(result.kind).toBe('vector');
  });

  it('falls back to literal parsing when names not found', () => {
    const result = parseInput('(1, 2)', {});
    expect(result.kind).toBe('vector');
  });

  it('parses map application A(v)', () => {
    const { namedVectors, namedMaps } = setup();
    const combined = { ...namedMaps, ...namedVectors };
    const result = parseInput('A(v)', combined);
    expect(result.kind).toBe('vector-expr');
    if (result.kind === 'vector-expr') {
      expect(result.expression.op).toBe('apply');
    }
  });
});
