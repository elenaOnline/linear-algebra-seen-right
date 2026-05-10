// Layer 0: Mathematical Type System
//
// Contract for downstream consumers:
//   - All mathematical objects are immutable discriminated unions with a `kind` field.
//   - All objects stored in the session carry a branded ID type.
//   - Factories return Result<T, ConstructionError>; invariant violations throw.
//   - Scalar arithmetic is exact for `rational` and `complex`-of-rationals.
//     Float and algebraic combinations degrade gracefully; symbolic arithmetic
//     requires Layer 1 (Pyodide/SymPy).
//   - `dim()` requires a SessionView for quotient/dual/tensor/product spaces.
//   - This layer has zero imports from src/state/, src/compute/, or above.

export type { Result } from './result.ts';
export { ok, err, isOk, mapResult } from './result.ts';

export type { ConstructionError, ConstructionErrorCode, InvariantError } from './errors.ts';
export { constructionError, invariantViolation } from './errors.ts';

export type { Field } from './field.ts';
export { isField } from './field.ts';

export type { SymExpr } from './symexpr.ts';
export { mkSymExpr } from './symexpr.ts';

export type { SpaceId, SubspaceId, MapId, VectorId, BasisId, IPId } from './ids.ts';
export {
  mkSpaceId,
  mkSubspaceId,
  mkMapId,
  mkVectorId,
  mkBasisId,
  mkIPId,
  spaceKey,
  subspaceKey,
  mapKey,
  vectorKey,
  basisKey,
  ipKey,
  _resetIdCounter,
} from './ids.ts';

export type { Scalar, Fraction } from './scalar.ts';
export {
  rational,
  float,
  complex,
  algebraic,
  symbolic,
  zero,
  one,
  isRational,
  isFloat,
  isComplex,
  isSymbolic,
  isAlgebraic,
  isExact,
  toFloat,
  addScalar,
  subScalar,
  mulScalar,
  negScalar,
  divScalar,
  invScalar,
  eqScalar,
  isZeroScalar,
} from './scalar.ts';

export type { Polynomial } from './polynomial.ts';
export {
  mkPolynomial,
  degree,
  leadingCoefficient,
  constantTerm,
  hasOnlyRationalCoefficients,
} from './polynomial.ts';

export type { SessionView } from './session-view.ts';

export type { VectorSpace } from './space.ts';
export {
  mkVectorSpaceFn,
  mkVectorSpacePoly,
  mkVectorSpaceMatrix,
  mkVectorSpaceAbstract,
  mkVectorSpaceQuotient,
  mkVectorSpaceDual,
  mkVectorSpaceTensor,
  mkVectorSpaceProduct,
  fieldOf,
  dim,
  isFiniteDim,
  _resetSpaceRegistry,
} from './space.ts';

export type { Vector, LinearFunctional } from './vector.ts';
export {
  mkConcreteVector,
  mkAbstractVector,
  mkPolynomialVector,
  mkFunctionalVector,
  componentCount,
} from './vector.ts';

export type { Subspace, SubspaceName } from './subspace.ts';
export {
  mkSubspaceBySpan,
  mkSubspaceByEquations,
  mkSubspaceNamed,
  isSubspaceOf,
} from './subspace.ts';

export type { Basis } from './basis.ts';
export { mkBasis, basisDim, basisVector } from './basis.ts';

export type { Matrix } from './matrix.ts';
export { mkMatrix, entry, rowOf, isSquare, transpose } from './matrix.ts';

export type { LinearMap } from './map.ts';
export { mkLinearMapByMatrix, mkLinearMapByFormula, mkLinearMapByBasisAction } from './map.ts';

export type { InnerProduct } from './inner-product.ts';
export { mkDotProduct, mkMatrixInnerProduct, mkFormulaInnerProduct } from './inner-product.ts';
