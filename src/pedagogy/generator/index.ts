export type { Constraint, ConstraintKind, GeneratorResult, ExampleGenerator } from './types.ts';
export { generate } from './constraints.ts';
import type { ConstraintKind } from './types.ts';

export const CONSTRAINT_LABELS: Record<ConstraintKind, string> = {
  'nilpotent-operator': 'Nilpotent operator',
  'non-diagonalizable-operator': 'Non-diagonalizable operator',
  'direct-sum-decomposition': 'Direct sum decomposition',
  'non-direct-sum': 'Non-direct sum',
  'self-adjoint-with-spectrum': 'Self-adjoint with spectrum',
  'unitary-but-not-orthogonal': 'Unitary (orthogonal) operator',
  'linearly-dependent-set-with-property': 'Linearly dependent set',
};

export const CONSTRAINT_DEFAULTS: Record<ConstraintKind, Readonly<Record<string, unknown>>> = {
  'nilpotent-operator': { index: 2 },
  'non-diagonalizable-operator': { dim: 2 },
  'direct-sum-decomposition': { dim: 2 },
  'non-direct-sum': {},
  'self-adjoint-with-spectrum': { eigenvalues: [1, -1] },
  'unitary-but-not-orthogonal': {},
  'linearly-dependent-set-with-property': { size: 2 },
};
