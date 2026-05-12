export type { Constraint, ConstraintKind, GeneratorResult, ExampleGenerator } from './types.ts';
export { generate } from './constraints.ts';
import type { ConstraintKind } from './types.ts';

export const CONSTRAINT_LABELS: Record<ConstraintKind, string> = {
  // Chapter 1–2 (subspaces, dependence)
  'direct-sum-decomposition': 'Direct sum decomposition',
  'non-direct-sum': 'Non-direct sum example',
  'linearly-dependent-set-with-property': 'Linearly dependent set',
  // Chapter 3 (linear maps)
  'rank-k-map': 'Map of specified rank',
  'projection-operator': 'Orthogonal projection',
  'rotation-operator': 'Rotation operator',
  'diagonal-operator': 'Diagonal operator',
  'shear-operator': 'Shear operator',
  'scalar-multiple-of-identity': 'Scalar multiple of identity',
  'permutation-matrix': 'Permutation matrix',
  'triangular-operator': 'Triangular operator',
  'full-rank-rectangular': 'Full-rank rectangular map',
  // Chapter 5 (eigenvalues)
  'non-diagonalizable-operator': 'Non-diagonalizable operator',
  // Chapter 7–8 (spectral theory)
  'self-adjoint-with-spectrum': 'Self-adjoint with spectrum',
  'symmetric-indefinite': 'Symmetric indefinite operator',
  'unitary-but-not-orthogonal': 'Unitary (orthogonal) operator',
  // Chapter 8 (Jordan form)
  'nilpotent-operator': 'Nilpotent operator',
};

export const CONSTRAINT_DEFAULTS: Record<ConstraintKind, Readonly<Record<string, unknown>>> = {
  'nilpotent-operator': { index: 2 },
  'non-diagonalizable-operator': { dim: 2 },
  'direct-sum-decomposition': { dim: 2 },
  'non-direct-sum': {},
  'self-adjoint-with-spectrum': { eigenvalues: [1, -1] },
  'unitary-but-not-orthogonal': {},
  'linearly-dependent-set-with-property': { size: 2 },
  'rank-k-map': { rank: 1, domain: 2, codomain: 2 },
  'projection-operator': { dim: 2, axis: 0 },
  'rotation-operator': { degrees: 90 },
  'diagonal-operator': { entries: [2, -1] },
  'shear-operator': { dim: 2, shear: 1 },
  'scalar-multiple-of-identity': { scalar: 2, dim: 2 },
  'permutation-matrix': { perm: [1, 0] },
  'triangular-operator': { dim: 3, kind: 'upper' },
  'full-rank-rectangular': { rows: 3, cols: 2 },
  'symmetric-indefinite': { posEigenvalues: 1, negEigenvalues: 1 },
};
