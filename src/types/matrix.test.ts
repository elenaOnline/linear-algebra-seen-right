import { describe, expect, it } from 'vitest';
import { mkMatrix, entry, isSquare, transpose } from './matrix.ts';
import { rational, eqScalar } from './scalar.ts';
import { basisKey, spaceKey } from './ids.ts';

const domBasis = basisKey(spaceKey('Fn', 'R', 2), 'standard');
const codBasis = basisKey(spaceKey('Fn', 'R', 3), 'standard');

const r = (n: number, d?: number) => rational(n, d);

describe('mkMatrix', () => {
  it('creates a valid 2x2 matrix', () => {
    const result = mkMatrix(
      'R',
      [
        [r(1), r(2)],
        [r(3), r(4)],
      ],
      domBasis,
      domBasis,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rows).toBe(2);
      expect(result.value.cols).toBe(2);
    }
  });

  it('creates a valid 3x2 matrix', () => {
    const result = mkMatrix(
      'R',
      [
        [r(1), r(2)],
        [r(3), r(4)],
        [r(5), r(6)],
      ],
      domBasis,
      codBasis,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rows).toBe(3);
      expect(result.value.cols).toBe(2);
    }
  });

  it('rejects non-rectangular entries', () => {
    const result = mkMatrix(
      'R',
      [[r(1), r(2)], [r(3)]], // second row has wrong length
      domBasis,
      codBasis,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_MATRIX');
  });

  it('rejects empty row list', () => {
    const result = mkMatrix('R', [], domBasis, codBasis);
    expect(result.ok).toBe(false);
  });
});

describe('entry', () => {
  it('accesses entries by row and col', () => {
    const m = mkMatrix(
      'R',
      [
        [r(1), r(2)],
        [r(3), r(4)],
      ],
      domBasis,
      domBasis,
    );
    if (!m.ok) return;
    expect(eqScalar(entry(m.value, 0, 1), r(2))).toBe(true);
    expect(eqScalar(entry(m.value, 1, 0), r(3))).toBe(true);
  });
});

describe('isSquare', () => {
  it('returns true for square matrices', () => {
    const m = mkMatrix(
      'R',
      [
        [r(1), r(0)],
        [r(0), r(1)],
      ],
      domBasis,
      domBasis,
    );
    if (m.ok) expect(isSquare(m.value)).toBe(true);
  });

  it('returns false for non-square matrices', () => {
    const m = mkMatrix('R', [[r(1), r(2), r(3)]], domBasis, codBasis);
    if (m.ok) expect(isSquare(m.value)).toBe(false);
  });
});

describe('transpose', () => {
  it('transposes a 2x3 matrix to 3x2', () => {
    const m = mkMatrix(
      'R',
      [
        [r(1), r(2), r(3)],
        [r(4), r(5), r(6)],
      ],
      domBasis,
      codBasis,
    );
    if (!m.ok) return;
    const t = transpose(m.value);
    expect(t.rows).toBe(3);
    expect(t.cols).toBe(2);
    expect(eqScalar(entry(t, 0, 0), r(1))).toBe(true);
    expect(eqScalar(entry(t, 2, 1), r(6))).toBe(true);
  });

  it('swaps domain/codomain bases on transpose', () => {
    const m = mkMatrix(
      'R',
      [
        [r(1), r(2)],
        [r(3), r(4)],
      ],
      domBasis,
      codBasis,
    );
    if (!m.ok) return;
    const t = transpose(m.value);
    expect(t.domainBasis).toBe(codBasis);
    expect(t.codomainBasis).toBe(domBasis);
  });
});
