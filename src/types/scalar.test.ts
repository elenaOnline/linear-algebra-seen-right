import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  rational,
  rationalFromString,
  float,
  complex,
  zero,
  one,
  addScalar,
  subScalar,
  mulScalar,
  negScalar,
  divScalar,
  invScalar,
  eqScalar,
  isZeroScalar,
  toFloat,
} from './scalar.ts';

// ---- Arbitraries ----

const arbSmallInt = fc.integer({ min: -50, max: 50 });
const arbNonZeroInt = fc.integer({ min: 1, max: 50 });

const arbRational = fc.tuple(arbSmallInt, arbNonZeroInt).map(([n, d]) => rational(n, d));
const arbNonZeroRational = fc
  .tuple(fc.integer({ min: 1, max: 50 }), arbNonZeroInt)
  .map(([n, d]) => rational(n, d));
const arbRealComplex = fc
  .tuple(arbSmallInt, arbNonZeroInt, arbSmallInt, arbNonZeroInt)
  .map(([an, ad, bn, bd]) => complex(rational(an, ad), rational(bn, bd)));

// ---- Unit tests ----

describe('rational constructor', () => {
  it('creates a rational scalar', () => {
    const s = rational(3, 4);
    expect(s.kind).toBe('rational');
    if (s.kind === 'rational') expect(s.value.valueOf()).toBeCloseTo(0.75);
  });

  it('normalizes fractions', () => {
    const s = rational(4, 8);
    if (s.kind === 'rational') expect(s.value.valueOf()).toBeCloseTo(0.5);
  });

  it('creates from string', () => {
    const s = rationalFromString('3/4');
    if (s.kind === 'rational') expect(s.value.valueOf()).toBeCloseTo(0.75);
  });
});

describe('zero / one constants', () => {
  it('zero R is rational 0', () => {
    const z = zero('R');
    expect(z.kind).toBe('rational');
    expect(isZeroScalar(z)).toBe(true);
  });

  it('one R is rational 1', () => {
    const o = one('R');
    expect(eqScalar(o, rational(1))).toBe(true);
  });

  it('zero C is complex 0+0i', () => {
    const z = zero('C');
    expect(z.kind).toBe('complex');
    expect(isZeroScalar(z)).toBe(true);
  });

  it('one C is 1+0i', () => {
    const o = one('C');
    expect(o.kind).toBe('complex');
    if (o.kind === 'complex') {
      expect(eqScalar(o.re, rational(1))).toBe(true);
      expect(eqScalar(o.im, rational(0))).toBe(true);
    }
  });
});

describe('addScalar', () => {
  it('adds two rationals exactly', () => {
    const s = addScalar(rational(1, 2), rational(1, 3));
    expect(eqScalar(s, rational(5, 6))).toBe(true);
  });

  it('adds rational + complex', () => {
    const result = addScalar(rational(1), complex(rational(2), rational(3)));
    expect(result.kind).toBe('complex');
    if (result.kind === 'complex') {
      expect(eqScalar(result.re, rational(3))).toBe(true);
      expect(eqScalar(result.im, rational(3))).toBe(true);
    }
  });

  it('adds two complex numbers', () => {
    const a = complex(rational(1), rational(2));
    const b = complex(rational(3), rational(4));
    const result = addScalar(a, b);
    expect(result.kind).toBe('complex');
    if (result.kind === 'complex') {
      expect(eqScalar(result.re, rational(4))).toBe(true);
      expect(eqScalar(result.im, rational(6))).toBe(true);
    }
  });
});

describe('mulScalar', () => {
  it('multiplies two rationals exactly', () => {
    const s = mulScalar(rational(2, 3), rational(3, 4));
    expect(eqScalar(s, rational(1, 2))).toBe(true);
  });

  it('multiplies complex numbers: (1+2i)(3+4i) = -5+10i', () => {
    const a = complex(rational(1), rational(2));
    const b = complex(rational(3), rational(4));
    const result = mulScalar(a, b);
    if (result.kind === 'complex') {
      expect(eqScalar(result.re, rational(-5))).toBe(true);
      expect(eqScalar(result.im, rational(10))).toBe(true);
    } else {
      expect.fail('Expected complex result');
    }
  });
});

describe('negScalar', () => {
  it('negates a rational', () => {
    expect(eqScalar(negScalar(rational(3, 4)), rational(-3, 4))).toBe(true);
  });

  it('negates a complex', () => {
    const n = negScalar(complex(rational(1), rational(2)));
    if (n.kind === 'complex') {
      expect(eqScalar(n.re, rational(-1))).toBe(true);
      expect(eqScalar(n.im, rational(-2))).toBe(true);
    } else {
      expect.fail('Expected complex result');
    }
  });
});

describe('divScalar', () => {
  it('divides two rationals exactly', () => {
    const result = divScalar(rational(1), rational(2));
    expect(result.ok).toBe(true);
    if (result.ok) expect(eqScalar(result.value, rational(1, 2))).toBe(true);
  });

  it('returns err on division by zero', () => {
    const result = divScalar(rational(1), rational(0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DIVISION_BY_ZERO');
  });
});

describe('invScalar', () => {
  it('inverts a rational', () => {
    const result = invScalar(rational(3, 4));
    expect(result.ok).toBe(true);
    if (result.ok) expect(eqScalar(result.value, rational(4, 3))).toBe(true);
  });

  it('returns err for inverse of zero', () => {
    const result = invScalar(rational(0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DIVISION_BY_ZERO');
  });
});

describe('toFloat', () => {
  it('converts rational to float', () => {
    expect(toFloat(rational(1, 4))).toBeCloseTo(0.25);
  });

  it('converts float scalar to float', () => {
    expect(toFloat(float(3.14))).toBeCloseTo(3.14);
  });
});

// ---- Property-based tests ----

describe('rational arithmetic properties', () => {
  it('commutativity of addition', () => {
    fc.assert(
      fc.property(arbRational, arbRational, (a, b) => {
        return eqScalar(addScalar(a, b), addScalar(b, a));
      }),
    );
  });

  it('commutativity of multiplication', () => {
    fc.assert(
      fc.property(arbRational, arbRational, (a, b) => {
        return eqScalar(mulScalar(a, b), mulScalar(b, a));
      }),
    );
  });

  it('associativity of addition', () => {
    fc.assert(
      fc.property(arbRational, arbRational, arbRational, (a, b, c) => {
        return eqScalar(addScalar(addScalar(a, b), c), addScalar(a, addScalar(b, c)));
      }),
    );
  });

  it('associativity of multiplication', () => {
    fc.assert(
      fc.property(arbRational, arbRational, arbRational, (a, b, c) => {
        return eqScalar(mulScalar(mulScalar(a, b), c), mulScalar(a, mulScalar(b, c)));
      }),
    );
  });

  it('distributivity: a*(b+c) = a*b + a*c', () => {
    fc.assert(
      fc.property(arbRational, arbRational, arbRational, (a, b, c) => {
        return eqScalar(mulScalar(a, addScalar(b, c)), addScalar(mulScalar(a, b), mulScalar(a, c)));
      }),
    );
  });

  it('additive identity: a + 0 = a', () => {
    fc.assert(
      fc.property(arbRational, (a) => {
        return eqScalar(addScalar(a, zero('R')), a);
      }),
    );
  });

  it('multiplicative identity: a * 1 = a', () => {
    fc.assert(
      fc.property(arbRational, (a) => {
        return eqScalar(mulScalar(a, one('R')), a);
      }),
    );
  });

  it('additive inverse: a + (-a) = 0', () => {
    fc.assert(
      fc.property(arbRational, (a) => {
        return eqScalar(addScalar(a, negScalar(a)), zero('R'));
      }),
    );
  });

  it('multiplicative inverse: a * (1/a) = 1 for non-zero a', () => {
    fc.assert(
      fc.property(arbNonZeroRational, (a) => {
        const inv = invScalar(a);
        if (!inv.ok) return false;
        return eqScalar(mulScalar(a, inv.value), one('R'));
      }),
    );
  });

  it('subtraction: a - b = a + (-b)', () => {
    fc.assert(
      fc.property(arbRational, arbRational, (a, b) => {
        return eqScalar(subScalar(a, b), addScalar(a, negScalar(b)));
      }),
    );
  });
});

describe('complex arithmetic properties', () => {
  it('commutativity of complex addition', () => {
    fc.assert(
      fc.property(arbRealComplex, arbRealComplex, (a, b) => {
        return eqScalar(addScalar(a, b), addScalar(b, a));
      }),
    );
  });

  it('complex multiplicative inverse: z * (1/z) = 1 for non-zero z', () => {
    fc.assert(
      fc.property(arbNonZeroRational, arbNonZeroRational, (re, im) => {
        const z = complex(re, im);
        const inv = invScalar(z);
        if (!inv.ok) return false;
        const product = mulScalar(z, inv.value);
        return eqScalar(product, one('C'));
      }),
    );
  });
});
