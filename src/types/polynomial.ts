import type { Field } from './field.ts';
import type { Scalar } from './scalar.ts';
import type { Result } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { ok, err } from './result.ts';
import { constructionError } from './errors.ts';

// Coefficients in ascending degree order: coefficients[i] is the coefficient of x^i.
// Always has at least one entry. An empty polynomial is not representable.
// (Axler §2.A uses ascending-degree convention; SymPy uses descending — converters
// at the Layer 1 boundary must reverse when crossing into Python.)
export type Polynomial = {
  readonly kind: 'polynomial';
  readonly field: Field;
  readonly coefficients: readonly Scalar[];
};

export function mkPolynomial(
  field: Field,
  coefficients: readonly Scalar[],
): Result<Polynomial, ConstructionError> {
  if (coefficients.length === 0) {
    return err(
      constructionError('EMPTY_COEFFICIENTS', 'Polynomial must have at least one coefficient'),
    );
  }
  return ok({ kind: 'polynomial', field, coefficients });
}

export function degree(p: Polynomial): number {
  return p.coefficients.length - 1;
}

export function leadingCoefficient(p: Polynomial): Scalar {
  const last = p.coefficients[p.coefficients.length - 1];
  if (last === undefined) {
    throw new Error('Invariant violation: polynomial has no coefficients');
  }
  return last;
}

export function constantTerm(p: Polynomial): Scalar {
  const first = p.coefficients[0];
  if (first === undefined) {
    throw new Error('Invariant violation: polynomial has no coefficients');
  }
  return first;
}

// Evaluates whether a polynomial has only rational coefficients (needed for minimal poly checks).
export function hasOnlyRationalCoefficients(p: Polynomial): boolean {
  return p.coefficients.every((c) => c.kind === 'rational');
}
