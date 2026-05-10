import type { Field } from './field.ts';
import type { SpaceId, VectorId } from './ids.ts';
import type { Scalar } from './scalar.ts';
import type { Polynomial } from './polynomial.ts';
import type { SymExpr } from './symexpr.ts';
import type { Result } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { vectorKey } from './ids.ts';
import { ok, err } from './result.ts';
import { constructionError } from './errors.ts';

// A linear functional on a space: a member of V', the dual space of V.
export type LinearFunctional = {
  readonly space: SpaceId;
  readonly expr: SymExpr;
};

export type Vector =
  | {
      readonly kind: 'concrete';
      readonly id: VectorId;
      readonly field: Field;
      readonly space: SpaceId;
      readonly components: readonly Scalar[];
    }
  | {
      readonly kind: 'abstract';
      readonly id: VectorId;
      readonly space: SpaceId;
      readonly label: string;
    }
  | {
      readonly kind: 'polynomial';
      readonly id: VectorId;
      readonly space: SpaceId;
      readonly poly: Polynomial;
    }
  | {
      readonly kind: 'functional';
      readonly id: VectorId;
      readonly space: SpaceId;
      readonly functional: LinearFunctional;
    };

export function mkConcreteVector(
  field: Field,
  space: SpaceId,
  components: readonly Scalar[],
  expectedDim?: number,
): Result<Vector, ConstructionError> {
  if (expectedDim !== undefined && components.length !== expectedDim) {
    return err(
      constructionError(
        'INVALID_COMPONENT_COUNT',
        `Vector has ${components.length} components but space has dimension ${expectedDim}`,
      ),
    );
  }
  const id = vectorKey(space);
  return ok({ kind: 'concrete', id, field, space, components: [...components] });
}

export function mkAbstractVector(space: SpaceId, label: string): Vector {
  return { kind: 'abstract', id: vectorKey(space), space, label };
}

export function mkPolynomialVector(space: SpaceId, poly: Polynomial): Vector {
  return { kind: 'polynomial', id: vectorKey(space), space, poly };
}

export function mkFunctionalVector(space: SpaceId, functional: LinearFunctional): Vector {
  return { kind: 'functional', id: vectorKey(space), space, functional };
}

export function componentCount(v: Vector): number | 'unknown' {
  if (v.kind === 'concrete') return v.components.length;
  if (v.kind === 'polynomial') return v.poly.coefficients.length;
  return 'unknown';
}
