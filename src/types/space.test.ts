import { describe, expect, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  mkVectorSpaceFn,
  mkVectorSpacePoly,
  mkVectorSpaceMatrix,
  mkVectorSpaceAbstract,
  mkVectorSpaceQuotient,
  mkVectorSpaceDual,
  mkVectorSpaceTensor,
  mkVectorSpaceProduct,
  dim,
  isFiniteDim,
  fieldOf,
  _resetSpaceRegistry,
} from './space.ts';
import { mkSubspaceBySpan } from './subspace.ts';
import type { SessionView } from './session-view.ts';
import type { VectorSpace } from './space.ts';
import type { SpaceId, SubspaceId, BasisId, MapId } from './ids.ts';
import type { Subspace } from './subspace.ts';

// Minimal SessionView for tests
function makeSession(
  spaces: Map<SpaceId, VectorSpace>,
  subspaces?: Map<SubspaceId, Subspace>,
): SessionView {
  return {
    getSpace: (id) => spaces.get(id),
    getSubspace: (id) => subspaces?.get(id),
    getBasis: (_id: BasisId) => undefined,
    getActiveBasis: (_id: SpaceId) => undefined,
    getMapDomain: (_id: MapId) => undefined,
    getMapCodomain: (_id: MapId) => undefined,
  };
}

beforeEach(() => {
  _resetSpaceRegistry();
});

describe('mkVectorSpaceFn', () => {
  it('creates R^3', () => {
    const r = mkVectorSpaceFn('R', 3);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.kind).toBe('Fn');
      expect(r.value.field).toBe('R');
      if (r.value.kind === 'Fn') expect(r.value.n).toBe(3);
    }
  });

  it('deduplicates: same inputs produce the same object', () => {
    const a = mkVectorSpaceFn('R', 3);
    const b = mkVectorSpaceFn('R', 3);
    expect(a.ok && b.ok && a.value === b.value).toBe(true);
  });

  it('rejects non-positive dimension', () => {
    expect(mkVectorSpaceFn('R', 0).ok).toBe(false);
    expect(mkVectorSpaceFn('R', -1).ok).toBe(false);
  });

  it('rejects non-integer dimension', () => {
    expect(mkVectorSpaceFn('R', 1.5).ok).toBe(false);
  });
});

describe('mkVectorSpacePoly', () => {
  it('creates finite polynomial space', () => {
    const r = mkVectorSpacePoly('R', 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.kind).toBe('polynomial');
  });

  it('creates infinite polynomial space with null', () => {
    const r = mkVectorSpacePoly('R', null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(dim(r.value)).toBe('infinite');
    }
  });

  it('dim of P_3 is 4 (degrees 0, 1, 2, 3)', () => {
    const r = mkVectorSpacePoly('R', 3);
    if (r.ok) expect(dim(r.value)).toBe(4);
  });
});

describe('mkVectorSpaceMatrix', () => {
  it('creates 2x3 matrix space', () => {
    const r = mkVectorSpaceMatrix('R', 2, 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(dim(r.value)).toBe(6);
  });

  it('rejects zero dimensions', () => {
    expect(mkVectorSpaceMatrix('R', 0, 3).ok).toBe(false);
    expect(mkVectorSpaceMatrix('R', 2, 0).ok).toBe(false);
  });
});

describe('mkVectorSpaceAbstract', () => {
  it('creates abstract space with finite dim', () => {
    const r = mkVectorSpaceAbstract('C', 'V', 5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(dim(r.value)).toBe(5);
  });

  it('creates abstract infinite-dimensional space', () => {
    const r = mkVectorSpaceAbstract('R', 'H', 'infinite');
    if (r.ok) expect(dim(r.value)).toBe('infinite');
  });
});

describe('dim (structural)', () => {
  it('dim(Fn(R, n)) = n', () => {
    [1, 2, 3, 10].forEach((n) => {
      const r = mkVectorSpaceFn('R', n);
      if (r.ok) expect(dim(r.value)).toBe(n);
    });
  });

  it('dim(M_{m,n}) = m*n', () => {
    const r = mkVectorSpaceMatrix('R', 3, 4);
    if (r.ok) expect(dim(r.value)).toBe(12);
  });

  it('dual space has same dim as parent', () => {
    const parent = mkVectorSpaceFn('R', 4);
    if (!parent.ok) return;
    const dual = mkVectorSpaceDual(parent.value.id, 'R');
    const session = makeSession(new Map([[parent.value.id, parent.value]]));
    expect(dim(dual, session)).toBe(4);
  });

  it('product space dim = sum of factor dims', () => {
    const a = mkVectorSpaceFn('R', 2);
    const b = mkVectorSpaceFn('R', 3);
    if (!a.ok || !b.ok) return;
    const prod = mkVectorSpaceProduct([a.value.id, b.value.id], 'R');
    if (!prod.ok) return;
    const session = makeSession(
      new Map([
        [a.value.id, a.value],
        [b.value.id, b.value],
      ]),
    );
    expect(dim(prod.value, session)).toBe(5);
  });

  it('tensor space dim = product of factor dims', () => {
    const a = mkVectorSpaceFn('R', 2);
    const b = mkVectorSpaceFn('R', 3);
    if (!a.ok || !b.ok) return;
    const tensor = mkVectorSpaceTensor([a.value.id, b.value.id], 'R');
    if (!tensor.ok) return;
    const session = makeSession(
      new Map([
        [a.value.id, a.value],
        [b.value.id, b.value],
      ]),
    );
    expect(dim(tensor.value, session)).toBe(6);
  });

  it('returns infinite without session for dual', () => {
    const parent = mkVectorSpaceFn('R', 3);
    if (!parent.ok) return;
    const dual = mkVectorSpaceDual(parent.value.id, 'R');
    expect(dim(dual)).toBe('infinite');
  });
});

describe('isFiniteDim', () => {
  it('Fn spaces are finite-dimensional', () => {
    const r = mkVectorSpaceFn('R', 5);
    if (r.ok) expect(isFiniteDim(r.value)).toBe(true);
  });

  it('unbounded polynomial spaces are infinite-dimensional', () => {
    const r = mkVectorSpacePoly('R', null);
    if (r.ok) expect(isFiniteDim(r.value)).toBe(false);
  });
});

describe('fieldOf', () => {
  it('returns the field of a space', () => {
    const r = mkVectorSpaceFn('C', 2);
    if (r.ok) expect(fieldOf(r.value)).toBe('C');
  });
});

describe('dimension calculus properties', () => {
  const arbDim = fc.integer({ min: 1, max: 10 });

  it('dim(V x W) = dim(V) + dim(W)', () => {
    fc.assert(
      fc.property(arbDim, arbDim, (m, n) => {
        _resetSpaceRegistry();
        const v = mkVectorSpaceFn('R', m);
        const w = mkVectorSpaceFn('R', n);
        if (!v.ok || !w.ok) return false;
        const prod = mkVectorSpaceProduct([v.value.id, w.value.id], 'R');
        if (!prod.ok) return false;
        const session = makeSession(
          new Map([
            [v.value.id, v.value],
            [w.value.id, w.value],
          ]),
        );
        return dim(prod.value, session) === m + n;
      }),
    );
  });

  it('dim(V ⊗ W) = dim(V) * dim(W)', () => {
    fc.assert(
      fc.property(arbDim, arbDim, (m, n) => {
        _resetSpaceRegistry();
        const v = mkVectorSpaceFn('R', m);
        const w = mkVectorSpaceFn('R', n);
        if (!v.ok || !w.ok) return false;
        const tensor = mkVectorSpaceTensor([v.value.id, w.value.id], 'R');
        if (!tensor.ok) return false;
        const session = makeSession(
          new Map([
            [v.value.id, v.value],
            [w.value.id, w.value],
          ]),
        );
        return dim(tensor.value, session) === m * n;
      }),
    );
  });

  it('dim(V*) = dim(V) for finite-dimensional V', () => {
    fc.assert(
      fc.property(arbDim, (n) => {
        _resetSpaceRegistry();
        const v = mkVectorSpaceFn('R', n);
        if (!v.ok) return false;
        const dual = mkVectorSpaceDual(v.value.id, 'R');
        const session = makeSession(new Map([[v.value.id, v.value]]));
        return dim(dual, session) === n;
      }),
    );
  });
});

describe('quotient space with known subspace dim', () => {
  it('dim(V/U) = dim(V) - dim(U) when knownDim is set', () => {
    _resetSpaceRegistry();
    const v = mkVectorSpaceFn('R', 5);
    if (!v.ok) return;
    const sub = mkSubspaceBySpan(v.value.id, [], 2);
    if (!sub.ok) return;
    const quot = mkVectorSpaceQuotient(v.value.id, sub.value.id, 'R');
    const session: SessionView = {
      getSpace: (id) => (id === v.value.id ? v.value : undefined),
      getSubspace: (id) => (id === sub.value.id ? sub.value : undefined),
      getBasis: (_id: BasisId) => undefined,
      getActiveBasis: (_id: SpaceId) => undefined,
      getMapDomain: (_id: MapId) => undefined,
      getMapCodomain: (_id: MapId) => undefined,
    };
    expect(dim(quot, session)).toBe(3);
  });
});
