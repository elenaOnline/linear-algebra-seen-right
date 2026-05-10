import type {
  Field,
  SpaceId,
  SubspaceId,
  MapId,
  BasisId,
  VectorId,
  VectorSpace,
  Subspace,
  LinearMap,
  Vector,
  Basis,
  InnerProduct,
} from '../types/index.ts';
import { dim } from '../types/space.ts';
import { mkBasis } from '../types/basis.ts';
import { rational } from '../types/scalar.ts';
import { mkConcreteVector } from '../types/vector.ts';
import type { SessionSnapshot, MathSession, MathObjectRef } from './types.ts';

// Selectors are pure functions over session state.
// They never mutate and never call Layer 1.

export function getSpace(state: SessionSnapshot, id: SpaceId): VectorSpace | undefined {
  return state.spaces[id as string];
}

export function getSubspace(state: SessionSnapshot, id: SubspaceId): Subspace | undefined {
  return state.subspaces[id as string];
}

export function getMap(state: SessionSnapshot, id: MapId): LinearMap | undefined {
  return state.maps[id as string];
}

export function getVector(state: SessionSnapshot, id: VectorId): Vector | undefined {
  return state.vectors[id as string];
}

export function getBasis(state: SessionSnapshot, id: BasisId): Basis | undefined {
  return state.bases[id as string];
}

export function getInnerProduct(state: SessionSnapshot, id: string): InnerProduct | undefined {
  return state.innerProducts[id];
}

export function getNamed(state: SessionSnapshot, name: string): MathObjectRef | undefined {
  return state.namedObjects[name];
}

// Returns the active basis for a space.
// For Fn spaces with no explicit selection, synthesises the standard basis
// so callers never have to special-case the "no user-set basis" path.
export function getActiveBasis(state: SessionSnapshot, spaceId: SpaceId): Basis | undefined {
  const basisId = state.selectedBasis[spaceId as string];
  if (basisId !== undefined) {
    return state.bases[basisId];
  }

  // Synthesise standard basis for Fn spaces (canonical — need not be stored explicitly).
  const space = state.spaces[spaceId as string];
  if (!space || space.kind !== 'Fn') return undefined;

  const standardVectors = Array.from({ length: space.n }, (_, i) => {
    const components = Array.from({ length: space.n }, (__, j) => rational(i === j ? 1 : 0));
    const vr = mkConcreteVector(space.field, space.id, components, space.n);
    if (!vr.ok) return undefined;
    return vr.value;
  });

  if (standardVectors.some((v) => v === undefined)) return undefined;

  const basisResult = mkBasis(
    space,
    standardVectors as NonNullable<(typeof standardVectors)[0]>[],
    'standard',
  );
  if (!basisResult.ok) return undefined;
  return basisResult.value;
}

// Returns dim of a space via a read-only SessionView built from the snapshot.
export function dimOf(state: SessionSnapshot, spaceId: SpaceId): number | 'infinite' | undefined {
  const space = state.spaces[spaceId as string];
  if (!space) return undefined;

  const view = {
    getSpace: (id: SpaceId): VectorSpace | undefined => state.spaces[id as string],
    getSubspace: (id: SubspaceId): Subspace | undefined => state.subspaces[id as string],
    getBasis: (id: BasisId): Basis | undefined => state.bases[id as string],
    getActiveBasis: (id: SpaceId): BasisId | undefined =>
      state.selectedBasis[id as string] as BasisId | undefined,
    getMapDomain: (id: MapId): SpaceId | undefined => state.maps[id as string]?.domain,
    getMapCodomain: (id: MapId): SpaceId | undefined => state.maps[id as string]?.codomain,
  };

  return dim(space, view);
}

export function getCachedResult(state: MathSession, key: string): unknown {
  const entry = state.computationCache[key];
  return entry?.result;
}

export function pendingCount(state: MathSession): number {
  return Object.keys(state.pendingComputations).length;
}

export function findFnSpace(
  state: SessionSnapshot,
  field: Field,
  n: number,
): VectorSpace | undefined {
  return Object.values(state.spaces).find(
    (s): s is VectorSpace & { kind: 'Fn'; n: number } =>
      s.kind === 'Fn' && s.field === field && ((s as VectorSpace & { n?: number }).n ?? -1) === n,
  );
}
