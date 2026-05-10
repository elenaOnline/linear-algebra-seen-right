import type { SerializedScalar } from '../serialization/scalar.ts';

// JSON-safe types crossing the worker boundary.
// All arrays use readonly for immutability on the TS side.

export type SerializedMatrix = readonly (readonly SerializedScalar[])[];

export type PyEigenValue = {
  readonly value: SerializedScalar;
  readonly multiplicity: number;
};

export type PyEigenResult = {
  readonly kind: 'success';
  readonly values: readonly PyEigenValue[];
  readonly vectors: readonly (readonly SerializedScalar[])[];
};

export type PyNullSpaceResult = {
  readonly kind: 'success';
  readonly vectors: readonly (readonly SerializedScalar[])[];
};

export type PyRankResult = {
  readonly kind: 'success';
  readonly rank: number;
};

export type PyRrefResult = {
  readonly kind: 'success';
  readonly matrix: readonly (readonly SerializedScalar[])[];
  readonly pivots: readonly number[];
};

export type PyDetResult = {
  readonly kind: 'success';
  readonly det: SerializedScalar;
};

export type PyInverseResult =
  | { readonly kind: 'success'; readonly matrix: readonly (readonly SerializedScalar[])[] }
  | { readonly kind: 'singular' };

export type PyPolyResult = {
  readonly kind: 'success';
  readonly coefficients: readonly SerializedScalar[];
};

export type PyJordanBlock = {
  readonly eigenvalue: SerializedScalar;
  readonly size: number;
};

export type PyJordanResult = {
  readonly kind: 'success';
  readonly J: readonly (readonly SerializedScalar[])[];
  readonly P: readonly (readonly SerializedScalar[])[];
  readonly blocks: readonly PyJordanBlock[];
};

export type PyGramSchmidtResult = {
  readonly kind: 'success';
  readonly vectors: readonly (readonly SerializedScalar[])[];
};

export type PyError = {
  readonly kind: 'error';
  readonly message: string;
};

// Symbolic adapter interface — the Pyodide worker implements this,
// and the mock adapter in tests implements it too.
export interface SymbolicAdapter {
  readonly ready: Promise<void>;

  eigendecompose(entries: SerializedMatrix, signal?: AbortSignal): Promise<PyEigenResult | PyError>;

  nullSpace(entries: SerializedMatrix, signal?: AbortSignal): Promise<PyNullSpaceResult | PyError>;

  rank(entries: SerializedMatrix, signal?: AbortSignal): Promise<PyRankResult | PyError>;

  rref(entries: SerializedMatrix, signal?: AbortSignal): Promise<PyRrefResult | PyError>;

  determinant(entries: SerializedMatrix, signal?: AbortSignal): Promise<PyDetResult | PyError>;

  inverse(entries: SerializedMatrix, signal?: AbortSignal): Promise<PyInverseResult | PyError>;

  characteristicPoly(
    entries: SerializedMatrix,
    signal?: AbortSignal,
  ): Promise<PyPolyResult | PyError>;

  minimalPoly(entries: SerializedMatrix, signal?: AbortSignal): Promise<PyPolyResult | PyError>;

  jordanForm(entries: SerializedMatrix, signal?: AbortSignal): Promise<PyJordanResult | PyError>;

  gramSchmidt(
    vectors: readonly (readonly SerializedScalar[])[],
    signal?: AbortSignal,
  ): Promise<PyGramSchmidtResult | PyError>;
}
