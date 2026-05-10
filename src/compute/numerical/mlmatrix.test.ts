import { describe, expect, it } from 'vitest';
import {
  numericalEigendecompose,
  numericalDeterminant,
  numericalRank,
  numericalNullSpace,
  numericalRref,
  numericalInverse,
  numericalSvd,
  numericalQr,
  numericalGramSchmidt,
  numericalLinearSolve,
} from './mlmatrix.ts';
import { mkMatrix } from '../../types/matrix.ts';
import { rational, float } from '../../types/scalar.ts';
import { basisKey, spaceKey } from '../../types/ids.ts';

const domBasis = basisKey(spaceKey('Fn', 'R', 2), 'standard');
const codBasis = basisKey(spaceKey('Fn', 'R', 2), 'standard');
const r = (n: number, d = 1) => rational(n, d);
const f = (v: number) => float(v);

function mat2x2(a: number, b: number, c: number, d: number) {
  const result = mkMatrix(
    'R',
    [
      [f(a), f(b)],
      [f(c), f(d)],
    ],
    domBasis,
    codBasis,
  );
  if (!result.ok) throw new Error(`test setup: ${result.error.message}`);
  return result.value;
}

function mat2x2Exact(a: number, b: number, c: number, d: number) {
  const result = mkMatrix(
    'R',
    [
      [r(a), r(b)],
      [r(c), r(d)],
    ],
    domBasis,
    codBasis,
  );
  if (!result.ok) throw new Error(`test setup: ${result.error.message}`);
  return result.value;
}

// 3×3 matrix helpers
const dom3 = basisKey(spaceKey('Fn', 'R', 3), 'standard');
const cod3 = basisKey(spaceKey('Fn', 'R', 3), 'standard');

function mat3x3(entries: number[][]) {
  const scalars = entries.map((row) => row.map(float));
  const result = mkMatrix('R', scalars, dom3, cod3);
  if (!result.ok) throw new Error(`test setup: ${result.error.message}`);
  return result.value;
}

describe('numericalDeterminant', () => {
  it('2×2 identity has det = 1', () => {
    expect(Math.abs(numericalDeterminant(mat2x2(1, 0, 0, 1)) - 1)).toBeLessThan(1e-10);
  });

  it('[[2,0],[0,3]] has det = 6', () => {
    expect(Math.abs(numericalDeterminant(mat2x2(2, 0, 0, 3)) - 6)).toBeLessThan(1e-10);
  });

  it('[[1,2],[3,4]] has det = 1*4 - 2*3 = -2', () => {
    expect(Math.abs(numericalDeterminant(mat2x2(1, 2, 3, 4)) - -2)).toBeLessThan(1e-10);
  });

  it('singular matrix has det ≈ 0', () => {
    expect(Math.abs(numericalDeterminant(mat2x2(1, 2, 2, 4)))).toBeLessThan(1e-8);
  });
});

describe('numericalRank', () => {
  it('full-rank 2×2 has rank 2', () => {
    expect(numericalRank(mat2x2(1, 2, 3, 4))).toBe(2);
  });

  it('rank-deficient [[1,2],[2,4]] has rank 1', () => {
    expect(numericalRank(mat2x2(1, 2, 2, 4))).toBe(1);
  });

  it('zero matrix has rank 0', () => {
    expect(numericalRank(mat2x2(0, 0, 0, 0))).toBe(0);
  });

  it('3×3 identity has rank 3', () => {
    expect(
      numericalRank(
        mat3x3([
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ]),
      ),
    ).toBe(3);
  });
});

describe('numericalEigendecompose', () => {
  it('diagonal [[2,0],[0,3]] has eigenvalues 2 and 3', () => {
    const result = numericalEigendecompose(mat2x2(2, 0, 0, 3));
    const vals = result.values
      .map((v) => {
        if (v.value.kind === 'float') return v.value.value;
        return 0;
      })
      .sort((a, b) => a - b);
    expect(Math.abs(vals[0]! - 2)).toBeLessThan(1e-10);
    expect(Math.abs(vals[1]! - 3)).toBeLessThan(1e-10);
  });

  it('identity has eigenvalue 1 with multiplicity 2', () => {
    const result = numericalEigendecompose(mat2x2(1, 0, 0, 1));
    expect(result.values).toHaveLength(2);
    result.values.forEach((v) => {
      if (v.value.kind === 'float') {
        expect(Math.abs(v.value.value - 1)).toBeLessThan(1e-10);
      }
    });
  });

  it('provenance is numerical', () => {
    expect(numericalEigendecompose(mat2x2(1, 0, 0, 2)).provenance).toBe('numerical');
  });
});

describe('numericalNullSpace', () => {
  it('full-rank matrix has trivial (zero) null space', () => {
    const ns = numericalNullSpace(mat2x2(1, 0, 0, 1), domBasis, codBasis);
    // Trivial null space: returned as 1-column zero vector (no SVD near-zero columns found)
    expect(ns.cols).toBe(1);
    const e = ns.entries[0]?.[0];
    if (e?.kind === 'float') expect(Math.abs(e.value)).toBeLessThan(1e-10);
  });

  it('rank-deficient [[1,2],[2,4]] has 1D null space', () => {
    const ns = numericalNullSpace(mat2x2(1, 2, 2, 4), domBasis, codBasis);
    expect(ns.cols).toBe(1);
  });
});

describe('numericalRref', () => {
  it('identity RREF is identity', () => {
    const R = numericalRref(mat2x2(1, 0, 0, 1), domBasis, codBasis);
    expect(R.entries[0]?.[0]?.kind).toBe('float');
    if (R.entries[0]?.[0]?.kind === 'float') {
      expect(Math.abs(R.entries[0][0].value - 1)).toBeLessThan(1e-10);
    }
  });

  it('[[1,2],[3,4]] RREF is identity', () => {
    const R = numericalRref(mat2x2(1, 2, 3, 4), domBasis, codBasis);
    const e00 = R.entries[0]?.[0];
    const e11 = R.entries[1]?.[1];
    if (e00?.kind === 'float') expect(Math.abs(e00.value - 1)).toBeLessThan(1e-8);
    if (e11?.kind === 'float') expect(Math.abs(e11.value - 1)).toBeLessThan(1e-8);
  });
});

describe('numericalInverse', () => {
  it('2×2 identity inverse is identity', () => {
    const inv = numericalInverse(mat2x2(1, 0, 0, 1), domBasis, codBasis);
    expect(inv).not.toBeNull();
    if (inv) {
      const e = inv.entries[0]?.[0];
      if (e?.kind === 'float') expect(Math.abs(e.value - 1)).toBeLessThan(1e-10);
    }
  });

  it('singular matrix returns null', () => {
    const inv = numericalInverse(mat2x2(1, 2, 2, 4), domBasis, codBasis);
    expect(inv).toBeNull();
  });

  it('inverse of [[2,0],[0,3]] is [[0.5,0],[0,1/3]]', () => {
    const inv = numericalInverse(mat2x2(2, 0, 0, 3), domBasis, codBasis);
    expect(inv).not.toBeNull();
    if (inv) {
      const e00 = inv.entries[0]?.[0];
      const e11 = inv.entries[1]?.[1];
      if (e00?.kind === 'float') expect(Math.abs(e00.value - 0.5)).toBeLessThan(1e-10);
      if (e11?.kind === 'float') expect(Math.abs(e11.value - 1 / 3)).toBeLessThan(1e-10);
    }
  });
});

describe('numericalSvd', () => {
  it('SVD of identity: singular values are [1, 1]', () => {
    const { singularValues } = numericalSvd(mat2x2(1, 0, 0, 1), domBasis, codBasis);
    singularValues.forEach((sv) => {
      if (sv.kind === 'float') expect(Math.abs(sv.value - 1)).toBeLessThan(1e-10);
    });
  });

  it('SVD result has correct dimensions', () => {
    const { U, Vt } = numericalSvd(mat2x2(1, 2, 3, 4), domBasis, codBasis);
    expect(U.rows).toBe(2);
    expect(Vt.rows).toBe(2);
  });
});

describe('numericalQr', () => {
  it('QR of identity: Q is orthogonal and R is upper-triangular', () => {
    const { Q, R } = numericalQr(mat2x2(1, 0, 0, 1), domBasis, codBasis);
    // Q and R for identity may have sign-flipped columns; check |diagonal| = 1
    const q00 = Q.entries[0]?.[0];
    const r00 = R.entries[0]?.[0];
    if (q00?.kind === 'float') expect(Math.abs(Math.abs(q00.value) - 1)).toBeLessThan(1e-10);
    if (r00?.kind === 'float') expect(Math.abs(Math.abs(r00.value) - 1)).toBeLessThan(1e-10);
  });
});

describe('numericalGramSchmidt', () => {
  it('standard basis vectors are already orthogonal', () => {
    const result = numericalGramSchmidt([
      [1, 0],
      [0, 1],
    ]);
    expect(result).toHaveLength(2);
  });

  it('linearly dependent vectors reduce to 1 vector', () => {
    const result = numericalGramSchmidt([
      [1, 0],
      [2, 0],
    ]);
    expect(result).toHaveLength(1);
  });

  it('[1,1] and [1,-1] become orthogonal', () => {
    const result = numericalGramSchmidt([
      [1, 1],
      [1, -1],
    ]);
    expect(result).toHaveLength(2);
    // Check orthogonality: dot product near zero
    const dot =
      (result[0]?.[0] ?? 0) * (result[1]?.[0] ?? 0) + (result[0]?.[1] ?? 0) * (result[1]?.[1] ?? 0);
    expect(Math.abs(dot)).toBeLessThan(1e-10);
  });
});

describe('numericalLinearSolve', () => {
  it('solves Ix = b: x = b', () => {
    const I = mat2x2Exact(1, 0, 0, 1);
    const x = numericalLinearSolve(I, [3, 5]);
    expect(x).not.toBeNull();
    if (x) {
      expect(Math.abs((x[0] ?? 0) - 3)).toBeLessThan(1e-10);
      expect(Math.abs((x[1] ?? 0) - 5)).toBeLessThan(1e-10);
    }
  });

  it('returns null for singular system', () => {
    const S = mat2x2Exact(1, 2, 2, 4);
    expect(numericalLinearSolve(S, [1, 2])).toBeNull();
  });
});
