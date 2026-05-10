import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { mkPolynomial, degree, leadingCoefficient, constantTerm } from './polynomial.ts';
import { rational, eqScalar } from './scalar.ts';

const arbCoeff = fc.integer({ min: -10, max: 10 }).map((n) => rational(n));
const arbCoeffList = fc.array(arbCoeff, { minLength: 1, maxLength: 6 });

describe('mkPolynomial', () => {
  it('creates a valid polynomial', () => {
    const result = mkPolynomial('R', [rational(1), rational(2), rational(3)]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('polynomial');
      expect(result.value.coefficients.length).toBe(3);
    }
  });

  it('rejects empty coefficient list', () => {
    const result = mkPolynomial('R', []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('EMPTY_COEFFICIENTS');
  });

  it('preserves field', () => {
    const r = mkPolynomial('C', [rational(1)]);
    if (r.ok) expect(r.value.field).toBe('C');
  });
});

describe('degree', () => {
  it('degree of constant polynomial is 0', () => {
    const p = mkPolynomial('R', [rational(5)]);
    if (p.ok) expect(degree(p.value)).toBe(0);
  });

  it('degree matches coefficient count minus 1', () => {
    // 1 + 2x + 3x^2 has degree 2
    const p = mkPolynomial('R', [rational(1), rational(2), rational(3)]);
    if (p.ok) expect(degree(p.value)).toBe(2);
  });
});

describe('leadingCoefficient', () => {
  it('returns the last coefficient', () => {
    // coefficients in ascending order: [1, 2, 3] → leading is 3
    const p = mkPolynomial('R', [rational(1), rational(2), rational(3)]);
    if (p.ok) expect(eqScalar(leadingCoefficient(p.value), rational(3))).toBe(true);
  });
});

describe('constantTerm', () => {
  it('returns the first coefficient', () => {
    const p = mkPolynomial('R', [rational(7), rational(0), rational(1)]);
    if (p.ok) expect(eqScalar(constantTerm(p.value), rational(7))).toBe(true);
  });
});

describe('polynomial properties', () => {
  it('degree is always coefficients.length - 1', () => {
    fc.assert(
      fc.property(arbCoeffList, (coeffs) => {
        const r = mkPolynomial('R', coeffs);
        if (!r.ok) return false;
        return degree(r.value) === coeffs.length - 1;
      }),
    );
  });

  it('round-trip: coefficients are preserved', () => {
    fc.assert(
      fc.property(arbCoeffList, (coeffs) => {
        const r = mkPolynomial('R', coeffs);
        if (!r.ok) return false;
        return (
          r.value.coefficients.length === coeffs.length &&
          coeffs.every((c, i) => {
            const stored = r.value.coefficients[i];
            return stored !== undefined && eqScalar(c, stored);
          })
        );
      }),
    );
  });
});
