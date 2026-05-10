import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { serializeScalar, roundTripScalar, scalarProvenance } from './scalar.ts';
import { rational, float, complex, mkSymExpr } from '../../types/index.ts';
import { mkPolynomial } from '../../types/polynomial.ts';
import { algebraic, symbolic } from '../../types/scalar.ts';

const arbRational = fc
  .tuple(fc.integer({ min: -50, max: 50 }), fc.integer({ min: 1, max: 50 }))
  .map(([n, d]) => rational(n, d));

describe('serializeScalar / deserializeScalar round-trip', () => {
  it('rational: 3/4', () => {
    const s = rational(3, 4);
    expect(roundTripScalar(s)).toBe(true);
  });

  it('rational: negative -5/3', () => {
    const s = rational(-5, 3);
    const ser = serializeScalar(s);
    expect(ser.kind).toBe('rational');
    if (ser.kind === 'rational') {
      expect(ser.n).toBe(-5);
      expect(ser.d).toBe(3);
    }
    expect(roundTripScalar(s)).toBe(true);
  });

  it('float: 3.14', () => {
    const s = float(3.14);
    expect(roundTripScalar(s)).toBe(true);
  });

  it('complex: 1 + 2i (rational parts)', () => {
    const s = complex(rational(1), rational(2));
    expect(roundTripScalar(s)).toBe(true);
  });

  it('complex: nested complex', () => {
    const s = complex(rational(1, 3), rational(-2, 5));
    const ser = serializeScalar(s);
    expect(ser.kind).toBe('complex');
    if (ser.kind === 'complex') {
      expect(ser.re.kind).toBe('rational');
      expect(ser.im.kind).toBe('rational');
    }
  });

  it('symbolic: x + 1', () => {
    const s = symbolic(mkSymExpr('Add(Symbol(x), Integer(1))', ['x']));
    expect(roundTripScalar(s)).toBe(true);
  });

  it('algebraic: sqrt(2)', () => {
    // minpoly of sqrt(2) is x^2 - 2 = [-2, 0, 1] in ascending order
    const minPoly = mkPolynomial('R', [rational(-2), rational(0), rational(1)]);
    if (!minPoly.ok) throw new Error('test setup');
    const s = algebraic(minPoly.value, Math.SQRT2);
    const ser = serializeScalar(s);
    expect(ser.kind).toBe('algebraic');
    if (ser.kind === 'algebraic') {
      expect(ser.minpoly).toHaveLength(3);
      expect(Math.abs(ser.approx - Math.SQRT2)).toBeLessThan(1e-10);
    }
    expect(roundTripScalar(s)).toBe(true);
  });

  it('property: round-trip preserves all rational scalars', () => {
    fc.assert(fc.property(arbRational, (s) => roundTripScalar(s)));
  });
});

describe('scalarProvenance', () => {
  it('rational → exact_possible', () => {
    expect(scalarProvenance(rational(1, 2))).toBe('exact_possible');
  });

  it('float → numerical_only', () => {
    expect(scalarProvenance(float(1.5))).toBe('numerical_only');
  });

  it('complex(rational, rational) → exact_possible', () => {
    expect(scalarProvenance(complex(rational(1), rational(2)))).toBe('exact_possible');
  });

  it('complex(rational, float) → numerical_only', () => {
    expect(scalarProvenance(complex(rational(1), float(2.0)))).toBe('numerical_only');
  });

  it('symbolic → exact_possible', () => {
    const s = symbolic(mkSymExpr('Symbol(x)', ['x']));
    expect(scalarProvenance(s)).toBe('exact_possible');
  });
});
