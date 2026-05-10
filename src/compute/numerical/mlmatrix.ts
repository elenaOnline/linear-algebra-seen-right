import {
  Matrix as MLMatrix,
  EigenvalueDecomposition,
  SingularValueDecomposition,
  QrDecomposition,
  LuDecomposition,
} from 'ml-matrix';
import type { Matrix } from '../../types/matrix.ts';
import type { BasisId, SpaceId } from '../../types/ids.ts';
import { mkMatrix } from '../../types/matrix.ts';
import { float } from '../../types/scalar.ts';
import { mkConcreteVector } from '../../types/vector.ts';
import { invariantViolation } from '../../types/errors.ts';
import type { EigenResult, SVDResult, QRResult } from '../types.ts';
import { matrixToNumberArray } from '../serialization/matrix.ts';

function toML(m: Matrix): MLMatrix {
  return new MLMatrix(matrixToNumberArray(m));
}

function fromMLMatrix(ml: MLMatrix, domainBasis: BasisId, codomainBasis: BasisId): Matrix {
  const entries = Array.from({ length: ml.rows }, (_, r) =>
    Array.from({ length: ml.columns }, (__, c) => float(ml.get(r, c))),
  );
  const result = mkMatrix('R', entries, domainBasis, codomainBasis);
  if (!result.ok) invariantViolation(`fromMLMatrix: ${result.error.message}`);
  return result.value;
}

// Eigendecomposition via QR algorithm (ml-matrix's EigenvalueDecomposition).
// .V columns are eigenvectors; .realEigenvalues / .imaginaryEigenvalues are the values.
export function numericalEigendecompose(m: Matrix): EigenResult {
  if (m.rows !== m.cols) {
    invariantViolation(`eigendecompose requires square matrix, got ${m.rows}×${m.cols}`);
  }
  const ml = toML(m);
  const eig = new EigenvalueDecomposition(ml);

  const re = eig.realEigenvalues;
  const im = eig.imaginaryEigenvalues;
  const V = eig.eigenvectorMatrix; // columns are eigenvectors

  const spaceId = m.domainBasis as unknown as SpaceId;

  const values = re.map((rv, i) => {
    const iv = im[i] ?? 0;
    const value =
      Math.abs(iv) < 1e-12 ? float(rv) : { kind: 'complex' as const, re: float(rv), im: float(iv) };
    return { value, algebraicMultiplicity: 1 };
  });

  const vectors = Array.from({ length: V.columns }, (_, c) => {
    const components = Array.from({ length: V.rows }, (__, r) => float(V.get(r, c)));
    const result = mkConcreteVector(m.field, spaceId, components);
    if (!result.ok) invariantViolation(`numericalEigendecompose: ${result.error.message}`);
    return result.value;
  });

  return { provenance: 'numerical', values, vectors };
}

export function numericalDeterminant(m: Matrix): number {
  if (m.rows !== m.cols) {
    invariantViolation(`determinant requires square matrix, got ${m.rows}×${m.cols}`);
  }
  // LuDecomposition exposes a precomputed .determinant property.
  return new LuDecomposition(toML(m)).determinant;
}

export function numericalRank(m: Matrix): number {
  const sv = new SingularValueDecomposition(toML(m));
  const svs = sv.diagonal;
  const first = svs[0] ?? 1;
  const tol = 1e-10 * Math.max(m.rows, m.cols) * first;
  return svs.filter((s) => Math.abs(s) > tol).length;
}

// Null space via SVD: columns of V with near-zero singular values.
export function numericalNullSpace(
  m: Matrix,
  domainBasis: BasisId,
  codomainBasis: BasisId,
): Matrix {
  const sv = new SingularValueDecomposition(toML(m));
  const svs = sv.diagonal;
  const first = svs[0] ?? 1;
  const tol = 1e-10 * Math.max(m.rows, m.cols) * first;
  const V = sv.rightSingularVectors;
  const nullCols: number[] = [];
  svs.forEach((s, i) => {
    if (Math.abs(s) < tol) nullCols.push(i);
  });

  if (nullCols.length === 0) {
    const zeroEntries = Array.from({ length: m.cols }, () => [float(0)]);
    const result = mkMatrix(m.field, zeroEntries, domainBasis, codomainBasis);
    if (!result.ok) invariantViolation(`numericalNullSpace: ${result.error.message}`);
    return result.value;
  }

  const entries = Array.from({ length: V.rows }, (_, r) => nullCols.map((c) => float(V.get(r, c))));
  const result = mkMatrix(m.field, entries, domainBasis, codomainBasis);
  if (!result.ok) invariantViolation(`numericalNullSpace: ${result.error.message}`);
  return result.value;
}

// Numerical RREF via Gaussian elimination with partial pivoting.
export function numericalRref(m: Matrix, domainBasis: BasisId, codomainBasis: BasisId): Matrix {
  const data = matrixToNumberArray(m);
  const rows = data.length;
  const cols = data[0]?.length ?? 0;
  const tol = 1e-10;
  let pivotRow = 0;

  for (let col = 0; col < cols && pivotRow < rows; col++) {
    let maxRow = pivotRow;
    let maxVal = Math.abs(data[pivotRow]?.[col] ?? 0);
    for (let r = pivotRow + 1; r < rows; r++) {
      const val = Math.abs(data[r]?.[col] ?? 0);
      if (val > maxVal) {
        maxVal = val;
        maxRow = r;
      }
    }
    if (maxVal < tol) continue;

    const tmp = data[pivotRow];
    data[pivotRow] = data[maxRow] ?? [];
    data[maxRow] = tmp ?? [];

    const pivotVal = data[pivotRow]?.[col] ?? 1;
    const pivotRowData = data[pivotRow];
    if (pivotRowData) {
      for (let c = 0; c < cols; c++) {
        pivotRowData[c] = (pivotRowData[c] ?? 0) / pivotVal;
      }
    }

    for (let r = 0; r < rows; r++) {
      if (r === pivotRow) continue;
      const factor = data[r]?.[col] ?? 0;
      const rRow = data[r];
      if (rRow) {
        for (let c = 0; c < cols; c++) {
          rRow[c] = (rRow[c] ?? 0) - factor * (data[pivotRow]?.[c] ?? 0);
        }
      }
    }
    pivotRow++;
  }

  const entries = data.map((row) => row.map((v) => float(v)));
  const result = mkMatrix(m.field, entries, domainBasis, codomainBasis);
  if (!result.ok) invariantViolation(`numericalRref: ${result.error.message}`);
  return result.value;
}

export function numericalInverse(
  m: Matrix,
  domainBasis: BasisId,
  codomainBasis: BasisId,
): Matrix | null {
  if (m.rows !== m.cols) {
    invariantViolation(`inverse requires square matrix, got ${m.rows}×${m.cols}`);
  }
  const ml = toML(m);
  const lu = new LuDecomposition(ml);
  if (lu.isSingular()) return null;

  const identity = MLMatrix.identity(m.rows);
  const inv = lu.solve(identity);
  return fromMLMatrix(inv, domainBasis, codomainBasis);
}

// SVD: U, S (as singular value array), Vt = V^T.
// ml-matrix's .V columns are the right singular vectors, so Vt = V.transpose().
export function numericalSvd(m: Matrix, domainBasis: BasisId, codomainBasis: BasisId): SVDResult {
  const sv = new SingularValueDecomposition(toML(m));
  const U = fromMLMatrix(sv.leftSingularVectors, codomainBasis, codomainBasis);
  const Vt = fromMLMatrix(sv.rightSingularVectors.transpose(), domainBasis, domainBasis);
  const singularValues = sv.diagonal.map((v) => float(v));
  return { U, singularValues, Vt };
}

export function numericalQr(m: Matrix, domainBasis: BasisId, codomainBasis: BasisId): QRResult {
  const qr = new QrDecomposition(toML(m));
  const Q = fromMLMatrix(qr.orthogonalMatrix, codomainBasis, codomainBasis);
  const R = fromMLMatrix(qr.upperTriangularMatrix, domainBasis, codomainBasis);
  return { Q, R };
}

// Classical Gram-Schmidt orthogonalization on float vectors.
export function numericalGramSchmidt(vectors: number[][]): number[][] {
  const result: number[][] = [];
  for (const v of vectors) {
    let u = [...v];
    for (const w of result) {
      const dot = u.reduce((acc, ui, i) => acc + ui * (w[i] ?? 0), 0);
      const wNormSq = w.reduce((acc, wi) => acc + wi * wi, 0);
      if (wNormSq < 1e-14) continue;
      const scale = dot / wNormSq;
      u = u.map((ui, i) => ui - scale * (w[i] ?? 0));
    }
    const norm = Math.sqrt(u.reduce((acc, ui) => acc + ui * ui, 0));
    if (norm < 1e-12) continue;
    result.push(u);
  }
  return result;
}

// Solve Ax = b numerically; returns null if no unique solution.
export function numericalLinearSolve(A: Matrix, b: number[]): number[] | null {
  if (A.rows !== b.length) {
    invariantViolation(`linearSolve: A has ${A.rows} rows but b has ${b.length} entries`);
  }
  try {
    const ml = toML(A);
    const lu = new LuDecomposition(ml);
    if (lu.isSingular()) return null;
    const bMat = MLMatrix.columnVector(b);
    const x = lu.solve(bMat);
    return Array.from({ length: x.rows }, (_, i) => x.get(i, 0));
  } catch {
    return null;
  }
}
