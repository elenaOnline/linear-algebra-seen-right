import type { SpaceId, IPId } from './ids.ts';
import type { Matrix } from './matrix.ts';
import type { SymExpr } from './symexpr.ts';
import type { Result } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { ipKey } from './ids.ts';
import { ok, err } from './result.ts';
import { constructionError } from './errors.ts';

// An inner product is tied to a specific vector space.
// The value ⟨u, v⟩ for given u, v requires Layer 1 computation.
export type InnerProduct =
  | {
      readonly kind: 'dot';
      readonly id: IPId;
      readonly space: SpaceId;
    }
  | {
      readonly kind: 'matrix';
      readonly id: IPId;
      readonly space: SpaceId;
      // Gram matrix G: ⟨u, v⟩ = u^T G v
      readonly gramMatrix: Matrix;
    }
  | {
      readonly kind: 'formula';
      readonly id: IPId;
      readonly space: SpaceId;
      // SymPy expression for ⟨u, v⟩; populated by Layer 1 when parsing user formulas.
      readonly expr: SymExpr;
    };

export function mkDotProduct(space: SpaceId): InnerProduct {
  return { kind: 'dot', id: ipKey(space), space };
}

export function mkMatrixInnerProduct(
  space: SpaceId,
  gramMatrix: Matrix,
): Result<InnerProduct, ConstructionError> {
  if (!gramMatrix.rows || gramMatrix.rows !== gramMatrix.cols) {
    return err(
      constructionError(
        'INVALID_MATRIX',
        `Gram matrix must be square, got ${gramMatrix.rows}×${gramMatrix.cols}`,
      ),
    );
  }
  return ok({ kind: 'matrix', id: ipKey(space), space, gramMatrix });
}

export function mkFormulaInnerProduct(space: SpaceId, expr: SymExpr): InnerProduct {
  return { kind: 'formula', id: ipKey(space), space, expr };
}
