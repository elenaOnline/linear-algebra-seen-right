import type { Field } from './field.ts';
import type { BasisId } from './ids.ts';
import type { Scalar } from './scalar.ts';
import type { Result } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { ok, err } from './result.ts';
import { constructionError, invariantViolation } from './errors.ts';

// A matrix is basis-dependent: the same linear map has different matrices in different bases.
// Distinct from LinearMap — a Matrix is the coordinate representation, not the abstract map.
export type Matrix = {
  readonly kind: 'matrix';
  readonly field: Field;
  readonly rows: number;
  readonly cols: number;
  readonly entries: readonly (readonly Scalar[])[]; // entries[row][col]
  readonly domainBasis: BasisId;
  readonly codomainBasis: BasisId;
};

export function mkMatrix(
  field: Field,
  entries: readonly (readonly Scalar[])[],
  domainBasis: BasisId,
  codomainBasis: BasisId,
): Result<Matrix, ConstructionError> {
  if (entries.length === 0) {
    return err(constructionError('INVALID_MATRIX', 'Matrix must have at least one row'));
  }
  const rows = entries.length;
  const firstRow = entries[0];
  if (firstRow === undefined || firstRow.length === 0) {
    return err(constructionError('INVALID_MATRIX', 'Matrix must have at least one column'));
  }
  const cols = firstRow.length;
  for (let r = 1; r < rows; r++) {
    const row = entries[r];
    if (row === undefined || row.length !== cols) {
      return err(
        constructionError(
          'INVALID_MATRIX',
          `Row ${r} has ${row?.length ?? 0} entries but expected ${cols}`,
        ),
      );
    }
  }
  return ok({
    kind: 'matrix',
    field,
    rows,
    cols,
    entries: entries.map((row) => [...row]),
    domainBasis,
    codomainBasis,
  });
}

export function entry(m: Matrix, row: number, col: number): Scalar {
  const r = m.entries[row];
  if (r === undefined) invariantViolation(`Row ${row} out of bounds in ${m.rows}×${m.cols} matrix`);
  const c = r[col];
  if (c === undefined) invariantViolation(`Col ${col} out of bounds in ${m.rows}×${m.cols} matrix`);
  return c;
}

export function rowOf(m: Matrix, row: number): readonly Scalar[] {
  const r = m.entries[row];
  if (r === undefined) invariantViolation(`Row ${row} out of bounds in ${m.rows}×${m.cols} matrix`);
  return r;
}

export function isSquare(m: Matrix): boolean {
  return m.rows === m.cols;
}

export function transpose(m: Matrix): Matrix {
  const newEntries: Scalar[][] = Array.from({ length: m.cols }, (_, c) =>
    Array.from({ length: m.rows }, (__, r) => entry(m, r, c)),
  );
  // Transpose swaps domain/codomain bases
  const result = mkMatrix(m.field, newEntries, m.codomainBasis, m.domainBasis);
  if (!result.ok)
    invariantViolation('Transpose produced invalid matrix — original matrix was invalid');
  return result.value;
}
