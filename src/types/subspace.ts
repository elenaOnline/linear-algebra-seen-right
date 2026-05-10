import type { SpaceId, SubspaceId, MapId } from './ids.ts';
import type { Vector } from './vector.ts';
import type { Matrix } from './matrix.ts';
import type { Scalar } from './scalar.ts';
import type { Result } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { subspaceKey } from './ids.ts';
import { ok } from './result.ts';

// Canonical named subspaces that appear throughout LADR.
export type SubspaceName =
  | { readonly kind: 'null'; readonly mapId: MapId }
  | { readonly kind: 'range'; readonly mapId: MapId }
  | { readonly kind: 'eigenspace'; readonly mapId: MapId; readonly eigenvalue: Scalar }
  | {
      readonly kind: 'generalized_eigenspace';
      readonly mapId: MapId;
      readonly eigenvalue: Scalar;
      readonly order: number;
    };

export type Subspace = {
  readonly id: SubspaceId;
  readonly ambient: SpaceId;
  // knownDim is set after Layer 1 verifies the subspace's dimension (e.g., rank of span generators).
  // It is undefined when the dimension has not yet been computed.
  readonly knownDim?: number;
  readonly representation:
    | { readonly kind: 'span'; readonly generators: readonly Vector[] }
    | { readonly kind: 'equations'; readonly matrix: Matrix }
    | { readonly kind: 'named'; readonly name: SubspaceName };
};

export function mkSubspaceBySpan(
  ambient: SpaceId,
  generators: readonly Vector[],
  knownDim?: number,
): Result<Subspace, ConstructionError> {
  const id = subspaceKey(ambient, 'span');
  const subspace: Subspace = {
    id,
    ambient,
    ...(knownDim !== undefined ? { knownDim } : {}),
    representation: { kind: 'span', generators: [...generators] },
  };
  return ok(subspace);
}

export function mkSubspaceByEquations(
  ambient: SpaceId,
  matrix: Matrix,
  knownDim?: number,
): Result<Subspace, ConstructionError> {
  const id = subspaceKey(ambient, 'eqn');
  const subspace: Subspace = {
    id,
    ambient,
    ...(knownDim !== undefined ? { knownDim } : {}),
    representation: { kind: 'equations', matrix },
  };
  return ok(subspace);
}

export function mkSubspaceNamed(ambient: SpaceId, name: SubspaceName, knownDim?: number): Subspace {
  const tag = name.kind === 'eigenspace' ? `eig:${name.mapId}` : name.kind;
  const id = subspaceKey(ambient, tag);
  return {
    id,
    ambient,
    ...(knownDim !== undefined ? { knownDim } : {}),
    representation: { kind: 'named', name },
  };
}

// Structural check only: does this subspace claim to live in the given ambient space?
// Semantic verification (does the span actually close under addition/scalar multiplication?)
// is Layer 1 work.
export function isSubspaceOf(sub: Subspace, ambientId: SpaceId): boolean {
  return sub.ambient === ambientId;
}
