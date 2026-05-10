import type { SpaceId, SubspaceId, BasisId, MapId } from '../types/ids.ts';
import type { VectorSpace } from '../types/space.ts';
import type { Subspace } from '../types/subspace.ts';
import type { Basis } from '../types/basis.ts';
import type { SessionView } from '../types/session-view.ts';
import type { SessionSnapshot } from './types.ts';

export class StoreSessionView implements SessionView {
  constructor(private readonly snapshot: Readonly<SessionSnapshot>) {}

  getSpace(id: SpaceId): VectorSpace | undefined {
    return this.snapshot.spaces[id];
  }

  getSubspace(id: SubspaceId): Subspace | undefined {
    return this.snapshot.subspaces[id];
  }

  getBasis(id: BasisId): Basis | undefined {
    return this.snapshot.bases[id];
  }

  getActiveBasis(spaceId: SpaceId): BasisId | undefined {
    return this.snapshot.selectedBasis[spaceId] as BasisId | undefined;
  }

  getMapDomain(id: MapId): SpaceId | undefined {
    return this.snapshot.maps[id]?.domain;
  }

  getMapCodomain(id: MapId): SpaceId | undefined {
    return this.snapshot.maps[id]?.codomain;
  }
}

export function sessionViewFrom(snapshot: Readonly<SessionSnapshot>): SessionView {
  return new StoreSessionView(snapshot);
}
