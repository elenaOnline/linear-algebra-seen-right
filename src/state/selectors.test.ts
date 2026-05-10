import { describe, expect, it, beforeEach } from 'vitest';
import {
  getSpace,
  getNamed,
  getActiveBasis,
  dimOf,
  getCachedResult,
  pendingCount,
  findFnSpace,
} from './selectors.ts';
import type { SessionSnapshot, MathSession } from './types.ts';
import { INITIAL_SESSION } from './types.ts';
import {
  _resetSpaceRegistry,
  mkVectorSpaceFn,
  mkVectorSpacePoly,
  mkVectorSpaceAbstract,
} from '../types/space.ts';
import { _resetIdCounter } from '../types/ids.ts';
import { mkConcreteVector } from '../types/vector.ts';
import { mkBasis } from '../types/basis.ts';
import { rational } from '../types/scalar.ts';

function snap(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
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
    ...overrides,
  };
}

beforeEach(() => {
  _resetIdCounter();
  _resetSpaceRegistry();
});

describe('getSpace', () => {
  it('returns undefined for unknown id', () => {
    const r = mkVectorSpaceFn('R', 3);
    if (!r.ok) throw new Error('setup');
    expect(getSpace(snap(), r.value.id)).toBeUndefined();
  });

  it('returns the space for a known id', () => {
    const r = mkVectorSpaceFn('R', 3);
    if (!r.ok) throw new Error('setup');
    const s = snap({ spaces: { [r.value.id]: r.value } });
    expect(getSpace(s, r.value.id)).toEqual(r.value);
  });
});

describe('getNamed', () => {
  it('returns undefined for unknown name', () => {
    expect(getNamed(snap(), 'V')).toBeUndefined();
  });

  it('returns the ref for a known name', () => {
    const r = mkVectorSpaceFn('R', 2);
    if (!r.ok) throw new Error('setup');
    const ref = { kind: 'space' as const, id: r.value.id };
    const s = snap({ namedObjects: { V: ref } });
    expect(getNamed(s, 'V')).toEqual(ref);
  });
});

describe('dimOf', () => {
  it('returns undefined for unknown space', () => {
    const r = mkVectorSpaceFn('R', 3);
    if (!r.ok) throw new Error('setup');
    expect(dimOf(snap(), r.value.id)).toBeUndefined();
  });

  it('returns correct dim for Fn space', () => {
    const r = mkVectorSpaceFn('R', 4);
    if (!r.ok) throw new Error('setup');
    const s = snap({ spaces: { [r.value.id]: r.value } });
    expect(dimOf(s, r.value.id)).toBe(4);
  });

  it('returns infinite for unbounded polynomial space', () => {
    const r = mkVectorSpacePoly('R', null);
    if (!r.ok) throw new Error('setup');
    const s = snap({ spaces: { [r.value.id]: r.value } });
    expect(dimOf(s, r.value.id)).toBe('infinite');
  });
});

describe('getActiveBasis', () => {
  it('returns undefined when no basis set and space is not Fn', () => {
    const r = mkVectorSpaceAbstract('R', 'V', 3);
    if (!r.ok) throw new Error('setup');
    const s = snap({ spaces: { [r.value.id]: r.value } });
    expect(getActiveBasis(s, r.value.id)).toBeUndefined();
  });

  it('synthesises the standard basis for Fn with no explicit selection', () => {
    const r = mkVectorSpaceFn('R', 2);
    if (!r.ok) throw new Error('setup');
    const s = snap({ spaces: { [r.value.id]: r.value } });
    const basis = getActiveBasis(s, r.value.id);
    expect(basis).toBeDefined();
    expect(basis?.vectors).toHaveLength(2);
    expect(basis?.label).toBe('standard');
  });

  it('returns explicitly set basis', () => {
    const r = mkVectorSpaceFn('R', 2);
    if (!r.ok) throw new Error('setup');
    const v0 = mkConcreteVector('R', r.value.id, [rational(1), rational(0)]);
    const v1 = mkConcreteVector('R', r.value.id, [rational(0), rational(1)]);
    if (!v0.ok || !v1.ok) throw new Error('setup');
    const b = mkBasis(r.value, [v0.value, v1.value], 'my-basis');
    if (!b.ok) throw new Error('setup');
    const s = snap({
      spaces: { [r.value.id]: r.value },
      bases: { [b.value.id]: b.value },
      selectedBasis: { [r.value.id]: b.value.id },
    });
    const result = getActiveBasis(s, r.value.id);
    expect(result?.id).toBe(b.value.id);
  });
});

describe('getCachedResult', () => {
  it('returns undefined for uncached key', () => {
    expect(getCachedResult(INITIAL_SESSION, 'eigendecompose:abc')).toBeUndefined();
  });

  it('returns the result for a cached key', () => {
    const session: MathSession = {
      ...INITIAL_SESSION,
      computationCache: {
        'eigendecompose:abc': { key: 'eigendecompose:abc', result: 42, cachedAt: 0 },
      },
    };
    expect(getCachedResult(session, 'eigendecompose:abc')).toBe(42);
  });
});

describe('pendingCount', () => {
  it('returns 0 for empty pending', () => {
    expect(pendingCount(INITIAL_SESSION)).toBe(0);
  });
});

describe('findFnSpace', () => {
  it('returns undefined when no matching space exists', () => {
    expect(findFnSpace(snap(), 'R', 3)).toBeUndefined();
  });

  it('finds an existing Fn space', () => {
    const r = mkVectorSpaceFn('R', 3);
    if (!r.ok) throw new Error('setup');
    const s = snap({ spaces: { [r.value.id]: r.value } });
    expect(findFnSpace(s, 'R', 3)).toEqual(r.value);
  });

  it('does not match wrong field', () => {
    const r = mkVectorSpaceFn('R', 3);
    if (!r.ok) throw new Error('setup');
    const s = snap({ spaces: { [r.value.id]: r.value } });
    expect(findFnSpace(s, 'C', 3)).toBeUndefined();
  });
});

describe('serialization snapshot (xtest — Phase 6+)', () => {
  it.skip('serialize produces expected shape', () => {
    // Not yet implemented — remove .skip and add assertion when Phase 6 implements it.
  });
});
