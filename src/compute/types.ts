import type { Scalar } from '../types/scalar.ts';
import type { Matrix } from '../types/matrix.ts';
import type { Polynomial } from '../types/polynomial.ts';
import type { Basis } from '../types/basis.ts';
import type { Vector } from '../types/vector.ts';

export type Provenance = 'exact' | 'numerical';

// A pair result: every operation that can produce both exact and numerical results.
// exact is null when symbolic computation is unavailable or inapplicable.
export type ExactNumerical<T> = {
  readonly exact: T | null;
  readonly numerical: T;
};

export type EigenValue = {
  readonly value: Scalar;
  readonly algebraicMultiplicity: number;
};

export type EigenResult = {
  readonly provenance: Provenance;
  readonly values: readonly EigenValue[];
  readonly vectors: readonly Vector[];
};

export type JordanBlock = {
  readonly eigenvalue: Scalar;
  readonly size: number;
};

export type JordanResult = {
  readonly J: Matrix;
  readonly P: Matrix;
  readonly blocks: readonly JordanBlock[];
};

export type SVDResult = {
  readonly U: Matrix;
  readonly singularValues: readonly Scalar[];
  readonly Vt: Matrix;
};

export type QRResult = {
  readonly Q: Matrix;
  readonly R: Matrix;
};

// Union for operations that may fail with domain errors.
export type InverseResult =
  | { readonly kind: 'success'; readonly exact: Matrix | null; readonly numerical: Matrix }
  | { readonly kind: 'singular' };

export type EngineError =
  | { readonly kind: 'worker_crashed'; readonly message: string }
  | { readonly kind: 'computation_failed'; readonly message: string }
  | { readonly kind: 'aborted' }
  | { readonly kind: 'not_square'; readonly rows: number; readonly cols: number };

// Whether a matrix's scalar entries permit exact symbolic computation.
// Any float entry degrades the whole matrix to numerical-only.
export type MatrixProvenance = 'exact_possible' | 'numerical_only';

export { Basis, Polynomial };
