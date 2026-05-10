export type ConstructionErrorCode =
  | 'EMPTY_COEFFICIENTS'
  | 'DIMENSION_MISMATCH'
  | 'INVALID_DIMENSION'
  | 'INVALID_FIELD'
  | 'EMPTY_BASIS'
  | 'INVALID_MATRIX'
  | 'EMPTY_FACTORS'
  | 'DIVISION_BY_ZERO'
  | 'NOT_FINITE_DIM'
  | 'INVALID_COMPONENT_COUNT'
  | 'INVALID_BASIS_SPACE'
  | 'INVALID_MAP_DIMENSIONS';

export type ConstructionError = {
  readonly code: ConstructionErrorCode;
  readonly message: string;
};

export type InvariantError = {
  readonly kind: 'invariant_violation';
  readonly message: string;
};

export function constructionError(code: ConstructionErrorCode, message: string): ConstructionError {
  return { code, message };
}

export function invariantViolation(message: string): never {
  throw new Error(`Invariant violation: ${message}`);
}
