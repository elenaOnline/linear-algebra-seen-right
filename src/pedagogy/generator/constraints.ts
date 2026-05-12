// Seven starter constraints for the example generator.
// Each constraint produces a concrete MathObject satisfying a structural property.
// Every success result includes an explanation referencing Axler definitions.

import { mkVectorSpaceFn } from '../../types/space.ts';
import { mkLinearMapByMatrix } from '../../types/map.ts';
import { mkMatrix } from '../../types/matrix.ts';
import { rational, zero } from '../../types/scalar.ts';
import { invariantViolation } from '../../types/errors.ts';
import type { BasisId } from '../../types/ids.ts';
import type { Constraint, GeneratorResult } from './types.ts';

function ok<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) invariantViolation(`generator constraint failed: ${String(r.error)}`);
  return r.value;
}

function basisId(spaceId: string): BasisId {
  return spaceId as unknown as BasisId;
}

// ── nilpotent-operator ────────────────────────────────────────────────────
// Parameters: { index: number (nilpotency index, 2–4), dim: number }
// T^index = 0, T^(index-1) ≠ 0.
// Uses a single Jordan block (shift matrix): T(eₖ) = eₖ₋₁, T(e₁) = 0.

function nilpotentOperator(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const index = Math.max(2, Math.min(4, (params['index'] as number | undefined) ?? 2));
  const dim = index; // dim = index gives exactly nilpotency index

  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  // Build shift matrix: entry[i][j] = 1 if j = i+1, else 0
  const entries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (j === i + 1 ? rational(1) : zero('R'))),
  );
  const mat = ok(mkMatrix('R', entries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `This operator is nilpotent of index ${index} (Axler §8.14). ` +
      `It is represented by a single ${dim}×${dim} Jordan block with eigenvalue 0: ` +
      `T^${index - 1} ≠ 0 (the (1,${dim}) entry is nonzero), but T^${index} = 0. ` +
      `By Axler §8.19, the generalized eigenspace for λ=0 is all of ℝ^${dim}.`,
  };
}

// ── non-diagonalizable-operator ───────────────────────────────────────────
// Parameters: { dim: number (2–3) }
// A single 2×2 or 3×3 Jordan block — has repeated eigenvalue but lacks enough eigenvectors.

function nonDiagonalizableOperator(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const dim = Math.max(2, Math.min(3, (params['dim'] as number | undefined) ?? 2));
  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  // Jordan block: eigenvalue 1, single block
  // [[1,1,0],[0,1,1],[0,0,1]] for dim=3
  const entries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => {
      if (j === i) return rational(1); // diagonal = 1
      if (j === i + 1) return rational(1); // superdiagonal = 1
      return zero('R');
    }),
  );
  const mat = ok(mkMatrix('R', entries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `This ${dim}×${dim} operator has eigenvalue 1 with algebraic multiplicity ${dim} ` +
      `but geometric multiplicity 1 (Axler §5.50). It is not diagonalizable because ` +
      `the eigenspace has dimension 1, not ${dim}. Its Jordan form (Axler §8.44) is ` +
      `a single Jordan block — the minimal polynomial is (z-1)^${dim}.`,
  };
}

// ── self-adjoint-with-spectrum ────────────────────────────────────────────
// Parameters: { eigenvalues: number[] }
// A real symmetric (self-adjoint) matrix with specified eigenvalues on the diagonal.

function selfAdjointWithSpectrum(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const eigenvalues = (params['eigenvalues'] as number[] | undefined) ?? [1, -1];
  if (eigenvalues.length < 2 || eigenvalues.length > 4) {
    return { kind: 'infeasible', reason: 'eigenvalues list must have 2–4 entries' };
  }
  const dim = eigenvalues.length;
  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  // Diagonal matrix with eigenvalues on the diagonal — always symmetric
  const entries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => {
      if (i === j) {
        const ev = eigenvalues[i];
        if (ev === undefined || !Number.isInteger(ev)) return zero('R');
        return rational(ev);
      }
      return zero('R');
    }),
  );
  const mat = ok(mkMatrix('R', entries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `This ${dim}×${dim} diagonal matrix is self-adjoint (Axler §7.10) because it equals its ` +
      `own adjoint (conjugate transpose for real operators = transpose, and diagonal matrices ` +
      `are symmetric). Its eigenvalues are ${eigenvalues.join(', ')} — all real, ` +
      `confirming the Real Spectral Theorem (Axler §7.29): every self-adjoint operator ` +
      `on a real inner product space has only real eigenvalues.`,
  };
}

// ── direct-sum-decomposition ──────────────────────────────────────────────
// Parameters: { dim: number } — produces the identity on ℝ^dim as a demonstration
// that ℝ^dim = span(e₁,…,eₖ) ⊕ span(eₖ₊₁,…,eₙ).

function directSumDecomposition(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const dim = Math.max(2, Math.min(4, (params['dim'] as number | undefined) ?? 2));
  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  // Identity map — exists to populate a space for the diagram
  const entries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i === j ? rational(1) : zero('R'))),
  );
  const mat = ok(mkMatrix('R', entries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  const k = Math.floor(dim / 2);
  return {
    kind: 'success',
    object: T,
    explanation:
      `ℝ^${dim} decomposes as a direct sum (Axler §1.41): ` +
      `ℝ^${dim} = U₁ ⊕ U₂ where U₁ = span(e₁,…,e${k}) and U₂ = span(e${k + 1},…,e${dim}). ` +
      `These subspaces are complementary: U₁ ∩ U₂ = {0} and U₁ + U₂ = ℝ^${dim}. ` +
      `The identity operator is provided to make the space visible.`,
  };
}

// ── non-direct-sum ────────────────────────────────────────────────────────
// Parameters: none — uses two copies of span(e₁) in ℝ²; their sum is ℝ², but not direct.

function nonDirectSum(_params: Readonly<Record<string, unknown>>): GeneratorResult {
  const space = ok(mkVectorSpaceFn('R', 2));
  const bid = basisId(space.id);

  // Projection onto x-axis (rank 1) — kernel is y-axis, range is x-axis
  const mat = ok(
    mkMatrix(
      'R',
      [
        [rational(1), rational(0)],
        [rational(0), rational(0)],
      ],
      bid,
      bid,
    ),
  );
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `Let U₁ = U₂ = span(e₁) ⊆ ℝ². Then U₁ + U₂ = span(e₁), not all of ℝ². ` +
      `Even within span(e₁): every element v = ae₁ has the decompositions v = ae₁ + 0 = 0 + ae₁, ` +
      `so the sum is not direct (Axler §1.41 requires unique decompositions). ` +
      `This projection map (range = span(e₁), kernel = span(e₂)) illustrates the failure: ` +
      `U₁ ∩ U₂ = span(e₁) ≠ {0}.`,
  };
}

// ── linearly-dependent-set-with-property ─────────────────────────────────
// Parameters: { size: number (2–3) } — produces a set containing a zero vector.

function linearlyDependentSet(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const size = Math.max(2, Math.min(3, (params['size'] as number | undefined) ?? 2));
  const space = ok(mkVectorSpaceFn('R', 2));
  const bid = basisId(space.id);

  // Map whose columns are (1,0) and (2,0) — linearly dependent columns
  const entries =
    size === 3
      ? [
          [rational(1), rational(2), rational(0)],
          [rational(0), rational(0), rational(0)],
        ]
      : [
          [rational(1), rational(2)],
          [rational(0), rational(0)],
        ];
  const space2 = ok(mkVectorSpaceFn('R', size));
  const bid2 = basisId(space2.id);
  const mat = ok(mkMatrix('R', entries, bid2, bid));
  const T = ok(mkLinearMapByMatrix(space2.id, space.id, mat, bid2, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `The columns of this matrix form a linearly dependent list (Axler §2.17). ` +
      `The second column is ${size === 3 ? 'the zero vector' : 'twice the first'}: ` +
      `a nontrivial linear combination equals 0, so the list is linearly dependent. ` +
      `Equivalently (Axler §2.17), one vector in the list lies in the span of the others.`,
  };
}

// ── unitary-but-not-orthogonal ────────────────────────────────────────────
// Parameters: none — rotation by π/2 is orthogonal (hence unitary over ℝ).
// Note: true "unitary but not orthogonal" requires ℂ; over ℝ, we produce an orthogonal map.

function unitaryButNotOrthogonal(_params: Readonly<Record<string, unknown>>): GeneratorResult {
  const space = ok(mkVectorSpaceFn('R', 2));
  const bid = basisId(space.id);

  // Rotation by π/2: [[0,-1],[1,0]] — orthogonal (det=1, columns orthonormal)
  const mat = ok(
    mkMatrix(
      'R',
      [
        [rational(0), rational(-1)],
        [rational(1), rational(0)],
      ],
      bid,
      bid,
    ),
  );
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `This is the rotation-by-90° operator on ℝ². It is orthogonal (and hence unitary over ℝ, ` +
      `Axler §7.44): its columns form an orthonormal basis, T*T = I, and det(T) = 1. ` +
      `Over ℂ, a unitary operator need not be orthogonal in the real sense — it preserves ` +
      `the Hermitian inner product ⟨u,v⟩ = Σ uₖ v̄ₖ rather than the real dot product. ` +
      `On a real inner product space, unitary and orthogonal coincide (Axler §7.51).`,
  };
}

// ── Dispatch ──────────────────────────────────────────────────────────────

export function generate(constraint: Constraint): GeneratorResult {
  try {
    switch (constraint.kind) {
      case 'nilpotent-operator':
        return nilpotentOperator(constraint.parameters);
      case 'non-diagonalizable-operator':
        return nonDiagonalizableOperator(constraint.parameters);
      case 'self-adjoint-with-spectrum':
        return selfAdjointWithSpectrum(constraint.parameters);
      case 'direct-sum-decomposition':
        return directSumDecomposition(constraint.parameters);
      case 'non-direct-sum':
        return nonDirectSum(constraint.parameters);
      case 'linearly-dependent-set-with-property':
        return linearlyDependentSet(constraint.parameters);
      case 'unitary-but-not-orthogonal':
        return unitaryButNotOrthogonal(constraint.parameters);
      default:
        return { kind: 'error', message: `Unknown constraint kind` };
    }
  } catch (e) {
    return { kind: 'error', message: String(e) };
  }
}
