import type { SpaceId, MapId, BasisId } from './ids.ts';
import type { Vector } from './vector.ts';
import type { Matrix } from './matrix.ts';
import type { Result } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { mapKey } from './ids.ts';
import { ok, err } from './result.ts';
import { constructionError } from './errors.ts';

export type LinearMap = {
  readonly id: MapId;
  readonly domain: SpaceId;
  readonly codomain: SpaceId;
  readonly representation:
    | {
        readonly kind: 'matrix';
        readonly matrix: Matrix;
        readonly domainBasis: BasisId;
        readonly codomainBasis: BasisId;
      }
    | {
        readonly kind: 'formula';
        // Function value — not serializable. Layer 5 (input parsing) creates these.
        // Serialization of formula-type maps is deferred to a later phase.
        readonly fn: (v: Vector) => Vector;
        readonly label: string;
      }
    | {
        readonly kind: 'basis_action';
        // T is defined by T(b_i) = image_i for each basis vector b_i.
        readonly pairs: ReadonlyArray<readonly [Vector, Vector]>;
      };
};

export function mkLinearMapByMatrix(
  domain: SpaceId,
  codomain: SpaceId,
  matrix: Matrix,
  domainBasis: BasisId,
  codomainBasis: BasisId,
): Result<LinearMap, ConstructionError> {
  // Matrix columns correspond to domain, rows to codomain.
  // matrix.cols must equal dim(domain) and matrix.rows must equal dim(codomain).
  // Full dimensional checks require SessionView; here we check the matrix's internal shape
  // matches the provided bases, which is a structural invariant.
  if (matrix.domainBasis !== domainBasis || matrix.codomainBasis !== codomainBasis) {
    return err(
      constructionError(
        'INVALID_MAP_DIMENSIONS',
        'Matrix basis references do not match provided basis IDs',
      ),
    );
  }
  const id = mapKey(domain, codomain);
  return ok({
    id,
    domain,
    codomain,
    representation: { kind: 'matrix', matrix, domainBasis, codomainBasis },
  });
}

export function mkLinearMapByFormula(
  domain: SpaceId,
  codomain: SpaceId,
  fn: (v: Vector) => Vector,
  label: string,
): LinearMap {
  return {
    id: mapKey(domain, codomain),
    domain,
    codomain,
    representation: { kind: 'formula', fn, label },
  };
}

export function mkLinearMapByBasisAction(
  domain: SpaceId,
  codomain: SpaceId,
  pairs: ReadonlyArray<readonly [Vector, Vector]>,
): Result<LinearMap, ConstructionError> {
  if (pairs.length === 0) {
    return err(
      constructionError('EMPTY_BASIS', 'Basis action requires at least one domain/image pair'),
    );
  }
  return ok({
    id: mapKey(domain, codomain),
    domain,
    codomain,
    representation: { kind: 'basis_action', pairs },
  });
}
