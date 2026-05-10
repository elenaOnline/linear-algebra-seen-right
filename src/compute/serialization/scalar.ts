import Fraction from 'fraction.js';
import type { Scalar } from '../../types/scalar.ts';
import type { Polynomial } from '../../types/polynomial.ts';
import { mkPolynomial } from '../../types/polynomial.ts';
import { mkSymExpr } from '../../types/symexpr.ts';

// JSON-serializable form of a Scalar, safe to pass across the worker boundary.
// Phase 2 has authority to revise this format; SymExpr.serialized mirrors it.
export type SerializedScalar =
  | { readonly kind: 'rational'; readonly n: number; readonly d: number }
  | { readonly kind: 'float'; readonly v: number }
  | {
      readonly kind: 'complex';
      readonly re: SerializedScalar;
      readonly im: SerializedScalar;
    }
  | {
      readonly kind: 'algebraic';
      readonly minpoly: readonly SerializedScalar[];
      readonly approx: number;
    }
  | { readonly kind: 'symbolic'; readonly serialized: string; readonly vars: readonly string[] };

export function serializeScalar(s: Scalar): SerializedScalar {
  switch (s.kind) {
    case 'rational':
      // Fraction.js v5 uses bigint for n, d, s — convert to number for JSON transport.
      return { kind: 'rational', n: Number(s.value.n) * Number(s.value.s), d: Number(s.value.d) };
    case 'float':
      return { kind: 'float', v: s.value };
    case 'complex':
      return { kind: 'complex', re: serializeScalar(s.re), im: serializeScalar(s.im) };
    case 'algebraic':
      return {
        kind: 'algebraic',
        minpoly: s.minPoly.coefficients.map(serializeScalar),
        approx: s.approx,
      };
    case 'symbolic':
      return { kind: 'symbolic', serialized: s.expr.serialized, vars: [...s.expr.vars] };
  }
}

export function deserializeScalar(s: SerializedScalar): Scalar {
  switch (s.kind) {
    case 'rational':
      return { kind: 'rational', value: new Fraction(s.n, s.d) };
    case 'float':
      return { kind: 'float', value: s.v };
    case 'complex':
      return { kind: 'complex', re: deserializeScalar(s.re), im: deserializeScalar(s.im) };
    case 'algebraic': {
      const coeffs = s.minpoly.map(deserializeScalar);
      const polyResult = mkPolynomial('R', coeffs);
      if (!polyResult.ok) {
        // Degenerate: treat as float approximation
        return { kind: 'float', value: s.approx };
      }
      return { kind: 'algebraic', minPoly: polyResult.value, approx: s.approx };
    }
    case 'symbolic':
      return { kind: 'symbolic', expr: mkSymExpr(s.serialized, s.vars) };
  }
}

// Returns true when the matrix can attempt exact symbolic computation.
// Promotion rule (ADR-008): any float entry → numerical only.
export function scalarProvenance(s: Scalar): 'exact_possible' | 'numerical_only' {
  switch (s.kind) {
    case 'rational':
    case 'algebraic':
    case 'symbolic':
      return 'exact_possible';
    case 'float':
      return 'numerical_only';
    case 'complex':
      if (
        scalarProvenance(s.re) === 'numerical_only' ||
        scalarProvenance(s.im) === 'numerical_only'
      ) {
        return 'numerical_only';
      }
      return 'exact_possible';
  }
}

// Round-trip verification: deserialize(serialize(s)) is structurally equal to s.
export function roundTripScalar(s: Scalar): boolean {
  const serialized = serializeScalar(s);
  const deserialized = deserializeScalar(serialized);
  return structurallyEqualScalar(s, deserialized);
}

function structurallyEqualScalar(a: Scalar, b: Scalar): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'rational':
      if (b.kind !== 'rational') return false;
      return a.value.equals(b.value);
    case 'float':
      if (b.kind !== 'float') return false;
      return Math.abs(a.value - b.value) < 1e-12;
    case 'complex':
      if (b.kind !== 'complex') return false;
      return structurallyEqualScalar(a.re, b.re) && structurallyEqualScalar(a.im, b.im);
    case 'algebraic':
      if (b.kind !== 'algebraic') return false;
      return Math.abs(a.approx - b.approx) < 1e-12;
    case 'symbolic':
      if (b.kind !== 'symbolic') return false;
      return a.expr.serialized === b.expr.serialized;
  }
}

// Returns true for the minpoly coefficients of a polynomial (for algebraic kind).
export function serializePolynomialCoeffs(p: Polynomial): readonly SerializedScalar[] {
  return p.coefficients.map(serializeScalar);
}
