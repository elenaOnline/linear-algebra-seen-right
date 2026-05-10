import Fraction from 'fraction.js';
import type { Polynomial } from './polynomial.ts';
import type { SymExpr } from './symexpr.ts';
import type { Field } from './field.ts';
import type { Result } from './result.ts';
import { ok, err } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { constructionError } from './errors.ts';

export type { Fraction };

export type Scalar =
  | { readonly kind: 'rational'; readonly value: Fraction }
  | { readonly kind: 'algebraic'; readonly minPoly: Polynomial; readonly approx: number }
  | { readonly kind: 'complex'; readonly re: Scalar; readonly im: Scalar }
  | { readonly kind: 'symbolic'; readonly expr: SymExpr }
  | { readonly kind: 'float'; readonly value: number };

// --- Constructors ---

export function rational(n: number, d?: number): Scalar {
  return { kind: 'rational', value: d !== undefined ? new Fraction(n, d) : new Fraction(n) };
}

export function rationalFromString(s: string): Scalar {
  return { kind: 'rational', value: new Fraction(s) };
}

export function float(value: number): Scalar {
  return { kind: 'float', value };
}

export function complex(re: Scalar, im: Scalar): Scalar {
  return { kind: 'complex', re, im };
}

export function algebraic(minPoly: Polynomial, approx: number): Scalar {
  return { kind: 'algebraic', minPoly, approx };
}

export function symbolic(expr: SymExpr): Scalar {
  return { kind: 'symbolic', expr };
}

// --- Constants ---

export function zero(field: Field): Scalar {
  if (field === 'C') return complex(rational(0), rational(0));
  return rational(0);
}

export function one(field: Field): Scalar {
  if (field === 'C') return complex(rational(1), rational(0));
  return rational(1);
}

// --- Type narrowing helpers ---

export function isRational(s: Scalar): s is { kind: 'rational'; value: Fraction } {
  return s.kind === 'rational';
}

export function isFloat(s: Scalar): s is { kind: 'float'; value: number } {
  return s.kind === 'float';
}

export function isComplex(s: Scalar): s is { kind: 'complex'; re: Scalar; im: Scalar } {
  return s.kind === 'complex';
}

export function isSymbolic(s: Scalar): s is { kind: 'symbolic'; expr: SymExpr } {
  return s.kind === 'symbolic';
}

export function isAlgebraic(
  s: Scalar,
): s is { kind: 'algebraic'; minPoly: Polynomial; approx: number } {
  return s.kind === 'algebraic';
}

// Returns true when a Scalar carries an exact rational value (no float approximation needed).
export function isExact(s: Scalar): boolean {
  if (s.kind === 'rational') return true;
  if (s.kind === 'algebraic') return true;
  if (s.kind === 'symbolic') return true;
  if (s.kind === 'complex') return isExact(s.re) && isExact(s.im);
  return false;
}

// --- Float approximation (for display and numerical comparisons) ---

export function toFloat(s: Scalar): number {
  switch (s.kind) {
    case 'rational':
      return s.value.valueOf();
    case 'float':
      return s.value;
    case 'algebraic':
      return s.approx;
    case 'complex':
      return toFloat(s.re); // projection to real part; callers should check im === 0
    case 'symbolic':
      return NaN; // requires Layer 1
  }
}

// --- Arithmetic (exact for rational and complex-of-rationals; degrades to float otherwise) ---

export function addScalar(a: Scalar, b: Scalar): Scalar {
  if (a.kind === 'rational' && b.kind === 'rational') {
    return { kind: 'rational', value: a.value.add(b.value) };
  }
  if (a.kind === 'complex' && b.kind === 'complex') {
    return complex(addScalar(a.re, b.re), addScalar(a.im, b.im));
  }
  // Promote rational to complex when the other operand is complex
  if (a.kind === 'rational' && b.kind === 'complex') {
    return complex(addScalar(a, b.re), b.im);
  }
  if (a.kind === 'complex' && b.kind === 'rational') {
    return complex(addScalar(a.re, b), a.im);
  }
  // Float promotion
  if (a.kind === 'float' || b.kind === 'float') {
    return float(toFloat(a) + toFloat(b));
  }
  // Algebraic/symbolic: degrade to float approximation in Layer 0
  return float(toFloat(a) + toFloat(b));
}

export function subScalar(a: Scalar, b: Scalar): Scalar {
  return addScalar(a, negScalar(b));
}

export function mulScalar(a: Scalar, b: Scalar): Scalar {
  if (a.kind === 'rational' && b.kind === 'rational') {
    return { kind: 'rational', value: a.value.mul(b.value) };
  }
  if (a.kind === 'complex' && b.kind === 'complex') {
    // (a+bi)(c+di) = (ac - bd) + (ad + bc)i
    return complex(
      subScalar(mulScalar(a.re, b.re), mulScalar(a.im, b.im)),
      addScalar(mulScalar(a.re, b.im), mulScalar(a.im, b.re)),
    );
  }
  if (a.kind === 'rational' && b.kind === 'complex') {
    return complex(mulScalar(a, b.re), mulScalar(a, b.im));
  }
  if (a.kind === 'complex' && b.kind === 'rational') {
    return complex(mulScalar(a.re, b), mulScalar(a.im, b));
  }
  if (a.kind === 'float' || b.kind === 'float') {
    return float(toFloat(a) * toFloat(b));
  }
  return float(toFloat(a) * toFloat(b));
}

export function negScalar(a: Scalar): Scalar {
  if (a.kind === 'rational') return { kind: 'rational', value: a.value.neg() };
  if (a.kind === 'complex') return complex(negScalar(a.re), negScalar(a.im));
  if (a.kind === 'float') return float(-a.value);
  return float(-toFloat(a));
}

export function divScalar(a: Scalar, b: Scalar): Result<Scalar, ConstructionError> {
  if (b.kind === 'rational' && b.value.equals(0)) {
    return err(constructionError('DIVISION_BY_ZERO', 'Division by zero'));
  }
  if (b.kind === 'float' && b.value === 0) {
    return err(constructionError('DIVISION_BY_ZERO', 'Division by zero'));
  }
  if (b.kind === 'complex') {
    // Division by complex: multiply by conjugate / |b|^2
    const bConj = complex(b.re, negScalar(b.im));
    const bNormSq = addScalar(mulScalar(b.re, b.re), mulScalar(b.im, b.im));
    const divResult = divScalar(bNormSq, one('R'));
    if (!divResult.ok) return divResult;
    return ok(mulScalar(mulScalar(a, bConj), divResult.value));
  }
  const inv = invScalar(b);
  if (!inv.ok) return inv;
  return ok(mulScalar(a, inv.value));
}

export function invScalar(a: Scalar): Result<Scalar, ConstructionError> {
  if (a.kind === 'rational') {
    if (a.value.equals(0)) {
      return err(constructionError('DIVISION_BY_ZERO', 'Multiplicative inverse of zero'));
    }
    return ok({ kind: 'rational', value: a.value.inverse() });
  }
  if (a.kind === 'float') {
    if (a.value === 0) {
      return err(constructionError('DIVISION_BY_ZERO', 'Multiplicative inverse of zero'));
    }
    return ok(float(1 / a.value));
  }
  if (a.kind === 'complex') {
    // 1/(a+bi) = (a-bi)/(a²+b²)
    const normSq = addScalar(mulScalar(a.re, a.re), mulScalar(a.im, a.im));
    const invNorm = invScalar(normSq);
    if (!invNorm.ok) return invNorm;
    return ok(complex(mulScalar(a.re, invNorm.value), mulScalar(negScalar(a.im), invNorm.value)));
  }
  return ok(float(1 / toFloat(a)));
}

// Exact equality for rational and complex-of-rationals; approximation elsewhere.
export function eqScalar(a: Scalar, b: Scalar): boolean {
  if (a.kind === 'rational' && b.kind === 'rational') {
    return a.value.equals(b.value);
  }
  if (a.kind === 'float' && b.kind === 'float') {
    return a.value === b.value;
  }
  if (a.kind === 'complex' && b.kind === 'complex') {
    return eqScalar(a.re, b.re) && eqScalar(a.im, b.im);
  }
  if (a.kind === 'rational' && b.kind === 'complex') {
    return eqScalar(a, b.re) && eqScalar(zero('R'), b.im);
  }
  if (a.kind === 'complex' && b.kind === 'rational') {
    return eqScalar(a.re, b) && eqScalar(a.im, zero('R'));
  }
  // Approximate comparison for other kinds
  return Math.abs(toFloat(a) - toFloat(b)) < Number.EPSILON;
}

export function isZeroScalar(s: Scalar): boolean {
  return eqScalar(s, rational(0));
}
