import type { SpaceId, SubspaceId, BasisId, MapId } from './ids.ts';
import type { VectorSpace } from './space.ts';
import type { Subspace } from './subspace.ts';
import type { Basis } from './basis.ts';

// Read-only projection of the Layer 2 store, defined here in Layer 0 so that
// Layer 0 accessors (dim, isSubspaceOf, etc.) can accept it without importing
// from src/state/. Layer 2 implements this interface against the Zustand store.
export interface SessionView {
  getSpace(id: SpaceId): VectorSpace | undefined;
  getSubspace(id: SubspaceId): Subspace | undefined;
  getBasis(id: BasisId): Basis | undefined;
  getActiveBasis(spaceId: SpaceId): BasisId | undefined;
  getMapDomain(id: MapId): SpaceId | undefined;
  getMapCodomain(id: MapId): SpaceId | undefined;
}
