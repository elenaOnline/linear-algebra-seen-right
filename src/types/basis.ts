import type { SpaceId, BasisId } from './ids.ts';
import type { Vector } from './vector.ts';
import type { VectorSpace } from './space.ts';
import type { Result } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { basisKey } from './ids.ts';
import { ok, err } from './result.ts';
import { constructionError } from './errors.ts';
import { dim } from './space.ts';

export type Basis = {
  readonly id: BasisId;
  readonly space: SpaceId;
  readonly vectors: readonly Vector[];
  readonly label: string;
};

export function mkBasis(
  space: VectorSpace,
  vectors: readonly Vector[],
  label: string,
): Result<Basis, ConstructionError> {
  if (vectors.length === 0) {
    return err(constructionError('EMPTY_BASIS', 'Basis must contain at least one vector'));
  }
  // Check dimension consistency when the space has a known finite dimension.
  const d = dim(space);
  if (d !== 'infinite' && vectors.length !== d) {
    return err(
      constructionError(
        'DIMENSION_MISMATCH',
        `Space has dimension ${d} but basis has ${vectors.length} vectors`,
      ),
    );
  }
  // Verify each vector claims to belong to this space.
  for (const v of vectors) {
    if (v.space !== space.id) {
      return err(
        constructionError(
          'INVALID_BASIS_SPACE',
          `Vector with space ${v.space} does not belong to space ${space.id}`,
        ),
      );
    }
  }
  const id = basisKey(space.id, label);
  return ok({ id, space: space.id, vectors: [...vectors], label });
}

export function basisDim(b: Basis): number {
  return b.vectors.length;
}

export function basisVector(b: Basis, i: number): Vector {
  const v = b.vectors[i];
  if (v === undefined) {
    throw new Error(
      `Invariant violation: basis index ${i} out of range (length ${b.vectors.length})`,
    );
  }
  return v;
}
