import type { MathObject } from '../../registry/index.ts';
import type { SessionView } from '../../types/session-view.ts';

export type ConstraintKind =
  | 'nilpotent-operator'
  | 'non-diagonalizable-operator'
  | 'direct-sum-decomposition'
  | 'non-direct-sum'
  | 'self-adjoint-with-spectrum'
  | 'unitary-but-not-orthogonal'
  | 'linearly-dependent-set-with-property'
  | 'rank-k-map'
  | 'projection-operator'
  | 'rotation-operator'
  | 'diagonal-operator'
  | 'shear-operator'
  | 'scalar-multiple-of-identity'
  | 'permutation-matrix'
  | 'triangular-operator'
  | 'full-rank-rectangular'
  | 'symmetric-indefinite';

export type Constraint = {
  readonly kind: ConstraintKind;
  readonly parameters: Readonly<Record<string, unknown>>;
};

export type GeneratorResult =
  | { readonly kind: 'success'; readonly object: MathObject; readonly explanation: string }
  | { readonly kind: 'infeasible'; readonly reason: string }
  | { readonly kind: 'error'; readonly message: string };

export interface ExampleGenerator {
  generate(constraint: Constraint, session: SessionView): Promise<GeneratorResult>;
}
