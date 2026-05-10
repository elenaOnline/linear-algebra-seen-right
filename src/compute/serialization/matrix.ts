import type { Matrix } from '../../types/matrix.ts';
import type { BasisId } from '../../types/ids.ts';
import type { Field } from '../../types/field.ts';
import { mkMatrix } from '../../types/matrix.ts';
import type { SerializedScalar } from './scalar.ts';
import { serializeScalar, deserializeScalar, scalarProvenance } from './scalar.ts';
import type { MatrixProvenance } from '../types.ts';

export type SerializedMatrix = {
  readonly field: Field;
  readonly rows: number;
  readonly cols: number;
  readonly entries: readonly (readonly SerializedScalar[])[];
};

export function serializeMatrix(m: Matrix): SerializedMatrix {
  return {
    field: m.field,
    rows: m.rows,
    cols: m.cols,
    entries: m.entries.map((row) => row.map(serializeScalar)),
  };
}

export function deserializeMatrix(
  s: SerializedMatrix,
  domainBasis: BasisId,
  codomainBasis: BasisId,
): Matrix {
  const entries = s.entries.map((row) => row.map(deserializeScalar));
  const result = mkMatrix(s.field, entries, domainBasis, codomainBasis);
  if (!result.ok) {
    throw new Error(`deserializeMatrix: invalid matrix shape — ${result.error.message}`);
  }
  return result.value;
}

// Converts Matrix entries to a plain number[][] for ml-matrix.
export function matrixToNumberArray(m: Matrix): number[][] {
  return m.entries.map((row) => {
    return row.map((s) => {
      if (s.kind === 'rational') return s.value.valueOf();
      if (s.kind === 'float') return s.value;
      if (s.kind === 'complex') {
        // Use real part; callers should check that im === 0 before using this
        if (s.re.kind === 'rational') return s.re.value.valueOf();
        if (s.re.kind === 'float') return s.re.value;
        return 0;
      }
      if (s.kind === 'algebraic') return s.approx;
      return 0; // symbolic → not meaningful numerically
    });
  });
}

// Determine if any entry prevents exact symbolic computation.
export function matrixProvenance(m: Matrix): MatrixProvenance {
  for (const row of m.entries) {
    for (const s of row) {
      if (scalarProvenance(s) === 'numerical_only') return 'numerical_only';
    }
  }
  return 'exact_possible';
}
