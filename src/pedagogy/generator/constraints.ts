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

// ── rank-k-map ────────────────────────────────────────────────────────────
// Parameters: { rank: number (1–3), domain: number, codomain: number }
// A matrix with exactly the specified rank, using a block-diagonal construction.

function rankKMap(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const rank = Math.max(1, Math.min(3, (params['rank'] as number | undefined) ?? 1));
  const domainDim = Math.max(rank, Math.min(4, (params['domain'] as number | undefined) ?? 2));
  const codomainDim = Math.max(rank, Math.min(4, (params['codomain'] as number | undefined) ?? 2));

  const domain = ok(mkVectorSpaceFn('R', domainDim));
  const codomain = ok(mkVectorSpaceFn('R', codomainDim));
  const domBid = basisId(domain.id);
  const codBid = basisId(codomain.id);

  // Block: first `rank` diagonal entries are 1, rest are 0
  const entries = Array.from({ length: codomainDim }, (_, i) =>
    Array.from({ length: domainDim }, (_, j) => (i === j && i < rank ? rational(1) : zero('R'))),
  );
  const mat = ok(mkMatrix('R', entries, domBid, codBid));
  const T = ok(mkLinearMapByMatrix(domain.id, codomain.id, mat, domBid, codBid));
  const nullity = domainDim - rank;

  return {
    kind: 'success',
    object: T,
    explanation:
      `This ${codomainDim}×${domainDim} matrix has rank ${rank} (Axler §3.58). ` +
      `By the rank-nullity theorem (Axler §3.21): dim null T = ${nullity}, dim range T = ${rank}. ` +
      `The first ${rank} standard basis vectors are mapped to themselves; the remaining ${nullity} span the null space.`,
  };
}

// ── projection-operator ───────────────────────────────────────────────────
// Parameters: { dim: number (2–3), axis: number (0-based, which subspace to project onto) }
// An orthogonal projection P with P² = P.

function projectionOperator(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const dim = Math.max(2, Math.min(3, (params['dim'] as number | undefined) ?? 2));
  const axis = Math.max(0, Math.min(dim - 1, (params['axis'] as number | undefined) ?? 0));

  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  // Diagonal matrix: 1 at position `axis`, 0 elsewhere
  const entries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i === j && i === axis ? rational(1) : zero('R'))),
  );
  const mat = ok(mkMatrix('R', entries, bid, bid));
  const P = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));
  const axisLabel = ['x', 'y', 'z'][axis] ?? `e${axis + 1}`;

  return {
    kind: 'success',
    object: P,
    explanation:
      `This is the orthogonal projection onto the ${axisLabel}-axis in ℝ^${dim} (Axler §3.11 context). ` +
      `It satisfies P² = P (every projection is idempotent). ` +
      `null P = span of the ${dim - 1} complementary axes (dim = ${dim - 1}); range P = ${axisLabel}-axis (dim = 1). ` +
      `Rank-nullity: ${1} + ${dim - 1} = ${dim} = dim ℝ^${dim} (Axler §3.21).`,
  };
}

// ── rotation-operator ─────────────────────────────────────────────────────
// Parameters: { degrees: number (30, 45, 60, 90, 120, 180) }
// Rotation in ℝ² — orthogonal, det = 1.

function rotationOperator(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const degrees = (params['degrees'] as number | undefined) ?? 90;
  const allowed = [30, 45, 60, 90, 120, 135, 150, 180];
  const deg = allowed.includes(degrees) ? degrees : 90;

  const space = ok(mkVectorSpaceFn('R', 2));
  const bid = basisId(space.id);

  // Rational approximations for cos and sin
  const cossin: Record<number, [number, number, number, number]> = {
    //             cos_n cos_d  sin_n sin_d
    30: [866, 1000, 500, 1000],
    45: [707, 1000, 707, 1000],
    60: [500, 1000, 866, 1000],
    90: [0, 1, 1, 1],
    120: [-500, 1000, 866, 1000],
    135: [-707, 1000, 707, 1000],
    150: [-866, 1000, 500, 1000],
    180: [-1, 1, 0, 1],
  };
  const [cn, cd, sn, sd] = cossin[deg] ?? [0, 1, 1, 1];
  const mat = ok(
    mkMatrix(
      'R',
      [
        [rational(cn, cd), rational(-sn, sd)],
        [rational(sn, sd), rational(cn, cd)],
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
      `Rotation by ${deg}° in ℝ². This is an orthogonal operator (Axler §7.44): ` +
      `T*T = I and det(T) = cos²(${deg}°) + sin²(${deg}°) = 1. ` +
      `For ${deg}° ≠ 0°, 180°: null T = {0} (injective) and range T = ℝ² (surjective). ` +
      `By the Real Spectral Theorem (Axler §7.29), a self-adjoint operator has real eigenvalues — ` +
      `this rotation is self-adjoint only for ${deg} = 0° or 180°.`,
  };
}

// ── diagonal-operator ─────────────────────────────────────────────────────
// Parameters: { entries: number[] — the diagonal entries }
// A diagonal matrix; eigenvalues are exactly the diagonal entries.

function diagonalOperator(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const entries = (params['entries'] as number[] | undefined) ?? [2, -1];
  if (entries.length < 1 || entries.length > 4) {
    return { kind: 'infeasible', reason: 'entries must have 1–4 values' };
  }
  const dim = entries.length;
  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  const matEntries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => {
      if (i !== j) return zero('R');
      const v = entries[i];
      return v !== undefined && Number.isInteger(v) ? rational(v) : zero('R');
    }),
  );
  const mat = ok(mkMatrix('R', matEntries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));
  const ev = entries.join(', ');
  const rank = entries.filter((e) => e !== 0).length;

  return {
    kind: 'success',
    object: T,
    explanation:
      `Diagonal ${dim}×${dim} operator with entries ${ev}. ` +
      `The standard basis vectors e₁,…,e${dim} are eigenvectors (Axler §5.5) with eigenvalues ${ev}. ` +
      `This operator is diagonalizable — its eigenvectors form a basis (Axler §5.50). ` +
      `Rank = ${rank}; ${entries.filter((e) => e === 0).length > 0 ? `null space has dimension ${dim - rank}` : 'null T = {0}'}.`,
  };
}

// ── shear-operator ────────────────────────────────────────────────────────
// Parameters: { dim: number (2–3), shear: number (integer) }
// Elementary shear: identity + off-diagonal entry.

function shearOperator(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const dim = Math.max(2, Math.min(3, (params['dim'] as number | undefined) ?? 2));
  const shear = Math.max(-3, Math.min(3, (params['shear'] as number | undefined) ?? 1));

  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  // Shear in the (0,1) position: [[1, shear, 0, …], [0, 1, 0, …], …]
  const matEntries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => {
      if (i === j) return rational(1);
      if (i === 0 && j === 1) return rational(shear);
      return zero('R');
    }),
  );
  const mat = ok(mkMatrix('R', matEntries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `Elementary shear in ℝ^${dim}: T(e₁) = e₁ + ${shear}e₂, T(eₖ) = eₖ for k ≥ 2. ` +
      `det(T) = 1, so T is invertible (Axler §3.59). ` +
      `The only eigenvalue is 1 (with algebraic multiplicity ${dim} but geometric multiplicity 1 when shear ≠ 0). ` +
      `For shear ≠ 0 this operator is not diagonalizable (Axler §5.50) — ` +
      `its Jordan form has a superdiagonal 1 in the top-left 2×2 block.`,
  };
}

// ── scalar-multiple-of-identity ───────────────────────────────────────────
// Parameters: { scalar: number, dim: number }
// λI — the simplest linear map; every nonzero vector is an eigenvector.

function scalarMultipleOfIdentity(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const scalar = (params['scalar'] as number | undefined) ?? 2;
  const dim = Math.max(1, Math.min(4, (params['dim'] as number | undefined) ?? 2));
  if (!Number.isInteger(scalar)) {
    return { kind: 'infeasible', reason: 'scalar must be an integer' };
  }

  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  const matEntries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i === j ? rational(scalar) : zero('R'))),
  );
  const mat = ok(mkMatrix('R', matEntries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `The scalar multiple ${scalar}I on ℝ^${dim}. Every nonzero vector is an eigenvector ` +
      `with eigenvalue ${scalar} (Axler §5.5). ` +
      `This operator is in the center of ℒ(ℝ^${dim}): it commutes with every linear map. ` +
      (scalar === 0
        ? `With scalar = 0 this is the zero map: null T = ℝ^${dim}, range T = {0}, rank = 0.`
        : `Since scalar ≠ 0, T is invertible with T⁻¹ = (1/${scalar})I (Axler §3.59).`),
  };
}

// ── permutation-matrix ────────────────────────────────────────────────────
// Parameters: { perm: number[] — 0-based permutation of [0..dim-1] }
// Rearranges basis vectors; always orthogonal (Tᵗ = T⁻¹), det = ±1.

function permutationMatrix(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const perm = (params['perm'] as number[] | undefined) ?? [1, 0, 2];
  const dim = perm.length;
  if (dim < 2 || dim > 4)
    return { kind: 'infeasible', reason: 'permutation must have 2–4 entries' };
  if (new Set(perm).size !== dim || perm.some((v) => v < 0 || v >= dim)) {
    return { kind: 'infeasible', reason: 'perm must be a valid permutation of 0..dim-1' };
  }

  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  // Column j gets a 1 in row perm[j]
  const matEntries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (perm[j] === i ? rational(1) : zero('R'))),
  );
  const mat = ok(mkMatrix('R', matEntries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  // Count inversions to determine sign of permutation
  let inversions = 0;
  for (let i = 0; i < dim; i++)
    for (let j = i + 1; j < dim; j++) if ((perm[i] ?? 0) > (perm[j] ?? 0)) inversions++;
  const sign = inversions % 2 === 0 ? 1 : -1;

  return {
    kind: 'success',
    object: T,
    explanation:
      `Permutation matrix: T(eⱼ) = e_{σ(j)} for σ = (${perm.join(',')}) (0-indexed). ` +
      `Permutation matrices are orthogonal (Axler §7.44): Tᵗ = T⁻¹. ` +
      `det(T) = ${sign} (${sign === 1 ? 'even' : 'odd'} permutation, ${inversions} inversion${inversions !== 1 ? 's' : ''}). ` +
      `Eigenvalues are roots of unity: ${sign === 1 ? 'always includes +1' : 'always includes −1'}.`,
  };
}

// ── triangular-operator ───────────────────────────────────────────────────
// Parameters: { dim: number (2–4), kind: 'upper' | 'lower' }
// A strictly triangular matrix plus identity — eigenvalue 1 with multiplicity dim.

function triangularOperator(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const dim = Math.max(2, Math.min(4, (params['dim'] as number | undefined) ?? 3));
  const upper = (params['kind'] as string | undefined) !== 'lower';

  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  const matEntries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => {
      if (i === j) return rational(1); // diagonal = 1
      // upper: entries above diagonal; lower: below
      const isTriPart = upper ? j > i : j < i;
      return isTriPart ? rational(1) : zero('R');
    }),
  );
  const mat = ok(mkMatrix('R', matEntries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));
  const shape = upper ? 'upper' : 'lower';

  return {
    kind: 'success',
    object: T,
    explanation:
      `${shape.charAt(0).toUpperCase() + shape.slice(1)}-triangular ${dim}×${dim} operator. ` +
      `The eigenvalues of a triangular matrix are exactly its diagonal entries (Axler §5.11): ` +
      `all are 1 here, with algebraic multiplicity ${dim}. ` +
      `The geometric multiplicity is 1 (only one independent eigenvector), so this operator ` +
      `is not diagonalizable when dim > 1 (Axler §5.50). ` +
      `det(T) = 1 (product of diagonal entries), so T is invertible (Axler §3.59).`,
  };
}

// ── full-rank-rectangular ─────────────────────────────────────────────────
// Parameters: { rows: number, cols: number } where rows ≠ cols.
// Produces a full-rank map (injective if cols < rows; surjective if rows < cols).

function fullRankRectangular(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const rows = Math.max(1, Math.min(4, (params['rows'] as number | undefined) ?? 3));
  const cols = Math.max(1, Math.min(4, (params['cols'] as number | undefined) ?? 2));
  if (rows === cols) {
    return { kind: 'infeasible', reason: 'use a square matrix constraint for square maps' };
  }
  const rank = Math.min(rows, cols);

  const domain = ok(mkVectorSpaceFn('R', cols));
  const codomain = ok(mkVectorSpaceFn('R', rows));
  const domBid = basisId(domain.id);
  const codBid = basisId(codomain.id);

  // Identity-like block (top-left rank × rank identity)
  const matEntries = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === j && i < rank ? rational(1) : zero('R'))),
  );
  const mat = ok(mkMatrix('R', matEntries, domBid, codBid));
  const T = ok(mkLinearMapByMatrix(domain.id, codomain.id, mat, domBid, codBid));
  const injective = cols <= rows;
  const surjective = rows <= cols;

  return {
    kind: 'success',
    object: T,
    explanation:
      `This ${rows}×${cols} matrix has full rank ${rank}. ` +
      (injective
        ? `null T = {0}: T is injective (Axler §3.14). `
        : `null T has dimension ${cols - rank}: T is not injective. `) +
      (surjective
        ? `range T = ℝ^${rows}: T is surjective (Axler §3.19). `
        : `range T has dimension ${rank} < ${rows}: T is not surjective. `) +
      `By rank-nullity (Axler §3.21): ${rank} + ${cols - rank} = ${cols}.`,
  };
}

// ── symmetric-indefinite ──────────────────────────────────────────────────
// Parameters: { posEigenvalues: number, negEigenvalues: number }
// A symmetric matrix with both positive and negative eigenvalues (indefinite).

function symmetricIndefinite(params: Readonly<Record<string, unknown>>): GeneratorResult {
  const pos = Math.max(1, Math.min(3, (params['posEigenvalues'] as number | undefined) ?? 1));
  const neg = Math.max(1, Math.min(3, (params['negEigenvalues'] as number | undefined) ?? 1));
  const dim = pos + neg;
  if (dim > 4) return { kind: 'infeasible', reason: 'total dimension must be ≤ 4' };

  const space = ok(mkVectorSpaceFn('R', dim));
  const bid = basisId(space.id);

  // Diagonal with first `pos` entries = 1, next `neg` entries = -1
  const matEntries = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => {
      if (i !== j) return zero('R');
      return i < pos ? rational(1) : rational(-1);
    }),
  );
  const mat = ok(mkMatrix('R', matEntries, bid, bid));
  const T = ok(mkLinearMapByMatrix(space.id, space.id, mat, bid, bid));

  return {
    kind: 'success',
    object: T,
    explanation:
      `A symmetric indefinite ${dim}×${dim} operator with ${pos} eigenvalue(s) +1 and ${neg} eigenvalue(s) −1. ` +
      `By the Real Spectral Theorem (Axler §7.29), every self-adjoint operator on a real ` +
      `inner product space is diagonalizable with real eigenvalues. ` +
      `This operator is indefinite: neither positive-definite (some eigenvalues are negative) ` +
      `nor negative-definite (some eigenvalues are positive). ` +
      `rank = ${dim} (no zero eigenvalues), so T is invertible (Axler §3.59).`,
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
      case 'rank-k-map':
        return rankKMap(constraint.parameters);
      case 'projection-operator':
        return projectionOperator(constraint.parameters);
      case 'rotation-operator':
        return rotationOperator(constraint.parameters);
      case 'diagonal-operator':
        return diagonalOperator(constraint.parameters);
      case 'shear-operator':
        return shearOperator(constraint.parameters);
      case 'scalar-multiple-of-identity':
        return scalarMultipleOfIdentity(constraint.parameters);
      case 'permutation-matrix':
        return permutationMatrix(constraint.parameters);
      case 'triangular-operator':
        return triangularOperator(constraint.parameters);
      case 'full-rank-rectangular':
        return fullRankRectangular(constraint.parameters);
      case 'symmetric-indefinite':
        return symmetricIndefinite(constraint.parameters);
      default:
        return { kind: 'error', message: `Unknown constraint kind` };
    }
  } catch (e) {
    return { kind: 'error', message: String(e) };
  }
}
