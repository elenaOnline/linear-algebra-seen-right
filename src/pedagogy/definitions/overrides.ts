import type { DefinitionRecord } from './types.ts';

// Hand-curated fields merged over the parsed markdown records.
// Merge strategy: field-level replace — each key here completely replaces
// the corresponding generated field (no deep array merging).
// Only supply what you want to override; missing keys use parsed defaults.

type DefinitionOverride = Partial<
  Pick<
    DefinitionRecord,
    | 'section'
    | 'plainStatement'
    | 'prerequisites'
    | 'linkedVisualizers'
    | 'examples'
    | 'nonexamples'
    | 'commonErrors'
  >
>;

// Section lookup derived from Axler's chapter structure:
//   1.A  Complex Numbers      — 1.1 … 1.10
//   1.B  Definition of VS     — 1.11 … 1.32
//   1.C  Subspaces            — 1.33 … 1.45
//   2.A  Span & Lin. Indep.   — 2.1 … 2.25
//   2.B  Bases                — 2.26 … 2.44

export const DEFINITION_OVERRIDES: Record<string, DefinitionOverride> = {
  // ── Chapter 1.A — Complex Numbers ──────────────────────────────────────
  'def-1.1-complex-numbers': {
    section: '1.A',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: [],
    examples: [
      { templateId: 'complex-arithmetic', description: '3 + 4i, addition and multiplication' },
    ],
    nonexamples: [],
  },
  'def-1.5-subtraction-division': {
    section: '1.A',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-1.1-complex-numbers'],
    examples: [],
    nonexamples: [],
  },
  'def-1.8-list-length': {
    section: '1.A',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: [],
    examples: [],
    nonexamples: [],
  },

  // ── Chapter 1.B — Definition of Vector Space ───────────────────────────
  'def-1.11-fn-coordinate': {
    section: '1.B',
    linkedVisualizers: ['coordinate-axes-2d', 'coordinate-axes-3d', 'symbolic-formula'],
    prerequisites: ['def-1.1-complex-numbers', 'def-1.8-list-length'],
    examples: [{ templateId: 'rn-as-fn', description: 'ℝ² as F² with n=2' }],
    nonexamples: [],
  },
  'def-1.13-addition-in-fn': {
    section: '1.B',
    linkedVisualizers: ['arrow-2d', 'symbolic-formula'],
    prerequisites: ['def-1.11-fn-coordinate'],
    examples: [{ templateId: 'vector-addition-r2', description: '(1,2) + (3,-1) = (4,1) in ℝ²' }],
    nonexamples: [],
  },
  'def-1.17-additive-inverse-in-fn': {
    section: '1.B',
    linkedVisualizers: ['arrow-2d', 'symbolic-formula'],
    prerequisites: ['def-1.13-addition-in-fn'],
    examples: [],
    nonexamples: [],
  },
  'def-1.18-scalar-multiplication-in-fn': {
    section: '1.B',
    linkedVisualizers: ['arrow-2d', 'symbolic-formula'],
    prerequisites: ['def-1.11-fn-coordinate'],
    examples: [],
    nonexamples: [],
  },
  'def-1.19-addition-scalar-multiplication': {
    section: '1.B',
    linkedVisualizers: ['basis-display', 'symbolic-formula'],
    prerequisites: ['def-1.13-addition-in-fn', 'def-1.18-scalar-multiplication-in-fn'],
    examples: [],
    nonexamples: [],
  },
  'def-1.20-vector-space': {
    section: '1.B',
    plainStatement:
      'A set V with addition and scalar multiplication satisfying 8 properties: commutativity, associativity, additive identity, additive inverse, multiplicative identity, and two distributive laws.',
    linkedVisualizers: ['basis-display', 'symbolic-formula'],
    prerequisites: ['def-1.19-addition-scalar-multiplication'],
    examples: [
      {
        templateId: 'rn-vector-space',
        description: 'ℝⁿ with standard addition and scalar multiplication',
      },
      { templateId: 'polynomial-space', description: '𝒫(𝔽) — polynomials over 𝔽' },
    ],
    nonexamples: [],
    commonErrors: [
      'Forgetting to verify the additive identity is unique to V, not just any set element.',
      'Assuming F^n is the only vector space.',
    ],
  },
  'def-1.21-vector-point': {
    section: '1.B',
    linkedVisualizers: ['arrow-2d', 'coordinate-axes-2d', 'symbolic-formula'],
    prerequisites: ['def-1.11-fn-coordinate'],
    examples: [],
    nonexamples: [],
  },
  'def-1.22-real-complex-vector-space': {
    section: '1.B',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-1.20-vector-space'],
    examples: [],
    nonexamples: [],
  },

  // ── Chapter 1.C — Subspaces ────────────────────────────────────────────
  'def-1.33-subspace': {
    section: '1.C',
    plainStatement:
      'A subset U of V is a subspace if it is also a vector space under the same operations. Equivalently: U contains 0, is closed under addition, and closed under scalar multiplication.',
    linkedVisualizers: ['subspace-lattice', 'coordinate-axes-2d', 'symbolic-formula'],
    prerequisites: ['def-1.20-vector-space'],
    examples: [
      { templateId: 'line-through-origin-r2', description: 'A line through the origin in ℝ²' },
      { templateId: 'zero-subspace', description: '{0} — the trivial subspace of any V' },
    ],
    nonexamples: [
      { templateId: 'affine-line-r2', description: 'A line not through the origin in ℝ²' },
    ],
    commonErrors: [
      'Forgetting to check that U contains the additive identity 0.',
      'Assuming any subset of a vector space is a subspace.',
    ],
  },
  'def-1.36-sum-of-subspaces': {
    section: '1.C',
    linkedVisualizers: ['subspace-lattice', 'symbolic-formula'],
    prerequisites: ['def-1.33-subspace'],
    examples: [
      {
        templateId: 'sum-of-two-lines-r2',
        description: 'Sum of two lines through origin = ℝ² when they are distinct',
      },
    ],
    nonexamples: [],
  },
  'def-1.41-direct-sum': {
    section: '1.C',
    plainStatement:
      'A sum V₁ + ⋯ + Vₘ is direct if every element has a unique decomposition. For two subspaces: V₁ ⊕ V₂ iff V₁ ∩ V₂ = {0}.',
    linkedVisualizers: ['subspace-lattice', 'symbolic-formula'],
    prerequisites: ['def-1.36-sum-of-subspaces'],
    examples: [
      { templateId: 'direct-sum-two-lines', description: 'Two complementary lines in ℝ²' },
    ],
    nonexamples: [
      {
        templateId: 'non-direct-sum',
        description: 'U₁ = U₂ — sum is not direct since U₁ ∩ U₂ ≠ {0}',
      },
    ],
    commonErrors: [
      'Confusing V₁ + V₂ (may have non-unique decompositions) with V₁ ⊕ V₂ (unique decompositions).',
    ],
  },

  // ── Chapter 2.A — Span and Linear Independence ─────────────────────────
  'def-2.2-linear-combination': {
    section: '2.A',
    plainStatement: 'A linear combination of v₁,…,vₘ is a₁v₁ + ⋯ + aₘvₘ for some scalars a₁,…,aₘ.',
    linkedVisualizers: ['arrow-2d', 'symbolic-formula'],
    prerequisites: ['def-1.20-vector-space'],
    examples: [
      { templateId: 'linear-combination-builder', description: '3(1,0) + 2(0,1) = (3,2) in ℝ²' },
    ],
    nonexamples: [],
  },
  'def-2.4-span': {
    section: '2.A',
    plainStatement:
      'The span of a list of vectors is the set of all their linear combinations. span() = {0}.',
    linkedVisualizers: ['arrow-2d', 'coordinate-axes-2d', 'symbolic-formula'],
    prerequisites: ['def-2.2-linear-combination'],
    examples: [
      {
        templateId: 'span-of-two-vectors-in-r2',
        description: 'span of (1,0) and (0,1) = ℝ²',
      },
    ],
    nonexamples: [
      {
        templateId: 'span-one-vector',
        description: 'span of a single nonzero vector is a line, not all of ℝ²',
      },
    ],
  },
  'def-2.7-spans': {
    section: '2.A',
    linkedVisualizers: ['subspace-lattice', 'symbolic-formula'],
    prerequisites: ['def-2.4-span'],
    examples: [],
    nonexamples: [],
  },
  'def-2.9-finite-dimensional-vector-space': {
    section: '2.A',
    linkedVisualizers: ['basis-display', 'symbolic-formula'],
    prerequisites: ['def-2.4-span'],
    examples: [
      {
        templateId: 'rn-vector-space',
        description: 'ℝⁿ is spanned by its n standard basis vectors',
      },
    ],
    nonexamples: [
      {
        templateId: 'polynomial-space',
        description: '𝒫(𝔽) — polynomials of all degrees — is infinite-dimensional',
      },
    ],
  },
  'def-2.10-polynomial': {
    section: '2.A',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-1.20-vector-space'],
    examples: [],
    nonexamples: [],
  },
  'def-2.11-degree-of-a-polynomial': {
    section: '2.A',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-2.10-polynomial'],
    examples: [],
    nonexamples: [],
  },
  'def-2.13-infinite-dimensional-vector-space': {
    section: '2.A',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-2.9-finite-dimensional-vector-space'],
    examples: [
      {
        templateId: 'polynomial-space',
        description: '𝒫(𝔽) requires infinitely many spanning vectors',
      },
    ],
    nonexamples: [
      { templateId: 'rn-vector-space', description: 'ℝⁿ is finite-dimensional for any finite n' },
    ],
  },
  'def-2.15-linearly-independent': {
    section: '2.A',
    plainStatement:
      'A list v₁,…,vₘ is linearly independent if the only way a₁v₁ + ⋯ + aₘvₘ = 0 is a₁ = ⋯ = aₘ = 0.',
    linkedVisualizers: ['arrow-2d', 'coordinate-axes-2d', 'symbolic-formula'],
    prerequisites: ['def-2.2-linear-combination'],
    examples: [
      {
        templateId: 'basis-as-coordinates',
        description: 'Standard basis vectors (1,0) and (0,1) in ℝ²',
      },
    ],
    nonexamples: [
      {
        templateId: 'linearly-dependent-pair',
        description: '(1,2) and (2,4) — second is a scalar multiple of first',
      },
    ],
    commonErrors: [
      'Confusing linear independence of a list with the zero vector — any list containing 0 is linearly dependent.',
    ],
  },
  'def-2.17-linearly-dependent': {
    section: '2.A',
    linkedVisualizers: ['arrow-2d', 'symbolic-formula'],
    prerequisites: ['def-2.15-linearly-independent'],
    examples: [{ templateId: 'linearly-dependent-pair', description: '(1,2) and (2,4) in ℝ²' }],
    nonexamples: [],
  },

  // ── Chapter 2.B — Bases ────────────────────────────────────────────────
  'def-2.26-basis': {
    section: '2.B',
    plainStatement:
      'A basis of V is a linearly independent list that spans V. Equivalently: every vector in V can be written uniquely as a linear combination of the basis vectors.',
    linkedVisualizers: ['basis-display', 'coordinate-axes-2d', 'arrow-2d', 'symbolic-formula'],
    prerequisites: ['def-2.15-linearly-independent', 'def-2.4-span'],
    examples: [
      {
        templateId: 'basis-as-coordinates',
        description: 'Standard basis e₁=(1,0), e₂=(0,1) for ℝ²',
      },
      {
        templateId: 'non-standard-basis',
        description: '(1,1) and (1,-1) — a non-standard basis for ℝ²',
      },
    ],
    nonexamples: [
      {
        templateId: 'linearly-dependent-pair',
        description: '(1,0) and (2,0) — linearly dependent, not a basis',
      },
    ],
    commonErrors: [
      'A basis is an ordered list, not a set — order matters when computing coordinates.',
      'The same space has many different bases; none is intrinsically preferred.',
    ],
  },

  // ── Chapter 3.A — The Vector Space of Linear Maps ──────────────────────
  'def-3.1-linear-map': {
    section: '3.A',
    plainStatement:
      'A linear map T: V → W preserves the two operations of vector spaces: it distributes over addition (T(u+v) = Tu + Tv) and commutes with scalar multiplication (T(λv) = λTv). Equivalently, T(au + bv) = aTu + bTv for all scalars a, b.',
    linkedVisualizers: [
      'matrix-heatmap',
      'grid-deformation-2d',
      'kernel-range-diagram',
      'symbolic-formula',
    ],
    prerequisites: ['def-1.20-vector-space'],
    examples: [
      { templateId: 'linear-map-matrix', description: 'T(x,y) = (x+y, x−y) — a full-rank 2×2 map' },
      {
        templateId: 'rank-nullity-2d',
        description: 'Projection (x,y) ↦ (x,0) — rank 1, nullity 1',
      },
    ],
    nonexamples: [],
    commonErrors: [
      'The zero map T = 0 is a linear map (T(v) = 0 for all v).',
      'Linearity requires T(0) = 0; any map with T(0) ≠ 0 (e.g. a translation) is not linear.',
    ],
  },
  'def-3.5-addition-scalar-multiplication-on-l': {
    section: '3.A',
    plainStatement:
      'The set ℒ(V, W) of all linear maps from V to W is itself a vector space under pointwise addition (S+T)(v) = Sv + Tv and scalar multiplication (λT)(v) = λ(Tv).',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.1-linear-map', 'def-1.20-vector-space'],
    examples: [],
    nonexamples: [],
  },
  'def-3.7-product-of-linear-maps': {
    section: '3.A',
    plainStatement:
      'The product ST of linear maps S ∈ ℒ(V, W) and T ∈ ℒ(U, V) is their composition: (ST)(u) = S(Tu). This is the same as function composition, and the matrix of ST is the matrix product M(S)M(T).',
    linkedVisualizers: ['matrix-heatmap', 'grid-deformation-2d', 'symbolic-formula'],
    prerequisites: ['def-3.1-linear-map'],
    examples: [
      {
        templateId: 'matrix-product-r2',
        description: 'A = x-scaling, B = shear; AB = scale-then-shear',
      },
    ],
    nonexamples: [],
    commonErrors: ['Matrix multiplication is not commutative in general: AB ≠ BA.'],
  },

  // ── Chapter 3.B — Null Spaces and Ranges ──────────────────────────────
  'def-3.11-null-space': {
    section: '3.B',
    plainStatement:
      'The null space (kernel) of T is the set of vectors T sends to zero. It is always a subspace of the domain V. By the rank-nullity theorem (Axler §3.21), dim null T + dim range T = dim V.',
    linkedVisualizers: [
      'kernel-range-diagram',
      'dimension-bars',
      'matrix-heatmap',
      'symbolic-formula',
    ],
    prerequisites: ['def-3.1-linear-map', 'def-1.33-subspace'],
    examples: [
      {
        templateId: 'null-space-demo',
        description: 'P(x,y) = (x,0): null P = y-axis, dim null P = 1',
      },
      { templateId: 'rank-nullity-2d', description: 'Same projection — rank 1, nullity 1' },
    ],
    nonexamples: [
      { templateId: 'injective-map-r2', description: 'Shear: null T = {0}, nullity = 0' },
    ],
    commonErrors: [
      'null T is a subspace of the domain V, not of the codomain W.',
      'null T = {0} is exactly the condition for T to be injective (Axler §3.15).',
    ],
  },
  'def-3.14-injective': {
    section: '3.B',
    plainStatement:
      'T is injective (one-to-one) if distinct vectors map to distinct images: Tu = Tv implies u = v. Equivalently (Axler §3.15), T is injective iff null T = {0}.',
    linkedVisualizers: [
      'kernel-range-diagram',
      'dimension-bars',
      'grid-deformation-2d',
      'symbolic-formula',
    ],
    prerequisites: ['def-3.11-null-space'],
    examples: [
      {
        templateId: 'injective-map-r2',
        description: 'Shear T(x,y)=(x+y,y): null T = {0}, injective',
      },
      { templateId: 'invertible-map-r2', description: 'Rotation: full rank, injective' },
    ],
    nonexamples: [
      { templateId: 'null-space-demo', description: 'Projection: null P ≠ {0}, not injective' },
    ],
    commonErrors: [
      'For operators on a finite-dimensional space, injective ⟺ surjective ⟺ invertible.',
    ],
  },
  'def-3.16-range': {
    section: '3.B',
    plainStatement:
      'The range (image) of T is the set of all outputs Tv as v ranges over V. It is always a subspace of the codomain W. dim range T = rank T.',
    linkedVisualizers: [
      'kernel-range-diagram',
      'dimension-bars',
      'matrix-heatmap',
      'symbolic-formula',
    ],
    prerequisites: ['def-3.1-linear-map', 'def-1.33-subspace'],
    examples: [
      {
        templateId: 'null-space-demo',
        description: 'P(x,y)=(x,0): range P = x-axis, dim range P = 1',
      },
      { templateId: 'injective-map-r2', description: 'Shear: range T = ℝ², dim range T = 2' },
    ],
    nonexamples: [],
    commonErrors: ['range T is a subspace of the codomain W, not of the domain V.'],
  },
  'def-3.19-surjective': {
    section: '3.B',
    plainStatement:
      'T is surjective (onto) if every element of W is in the range of T: range T = W. For operators on a finite-dimensional space, surjective ⟺ injective ⟺ invertible.',
    linkedVisualizers: ['kernel-range-diagram', 'dimension-bars', 'symbolic-formula'],
    prerequisites: ['def-3.16-range'],
    examples: [
      { templateId: 'invertible-map-r2', description: 'Rotation: range T = ℝ², surjective' },
      { templateId: 'injective-map-r2', description: 'Shear: full rank, surjective' },
    ],
    nonexamples: [
      { templateId: 'null-space-demo', description: 'Projection: range P = x-axis ≠ ℝ²' },
    ],
    commonErrors: [
      'A map from ℝ³ to ℝ² can be surjective (rank 2) but never injective.',
      'A map from ℝ² to ℝ³ can be injective (nullity 0) but never surjective.',
    ],
  },

  // ── Chapter 3.C — Matrices ─────────────────────────────────────────────
  'def-3.29-matrix': {
    section: '3.C',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-1.8-list-length'],
    examples: [
      {
        templateId: 'linear-map-matrix',
        description: '2×2 matrix [[1,1],[1,−1]] from T(x,y)=(x+y,x−y)',
      },
    ],
    nonexamples: [],
  },
  'def-3.31-matrix-of-a-linear-map': {
    section: '3.C',
    plainStatement:
      'Given bases for V and W, the matrix ℳ(T) encodes T by recording where each basis vector goes: the k-th column is the coordinate vector of Tvₖ in the W-basis.',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.29-matrix', 'def-2.26-basis', 'def-3.1-linear-map'],
    examples: [
      { templateId: 'linear-map-matrix', description: 'T(x,y)=(x+y,x−y) → ℳ(T)=[[1,1],[1,−1]]' },
      { templateId: 'rank-nullity-2d', description: 'Projection → ℳ(P)=[[1,0],[0,0]]' },
    ],
    nonexamples: [],
    commonErrors: [
      'The matrix of T depends on the chosen bases; the same T has different matrices relative to different bases.',
    ],
  },
  'def-3.34-matrix-addition': {
    section: '3.C',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.29-matrix'],
    examples: [],
    nonexamples: [],
  },
  'def-3.36-scalar-multiplication-of-a-matrix': {
    section: '3.C',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.29-matrix'],
    examples: [],
    nonexamples: [],
  },
  'def-3.41-matrix-multiplication': {
    section: '3.C',
    plainStatement:
      'The (j,k) entry of AB is the dot product of the j-th row of A with the k-th column of B. Matrix multiplication corresponds exactly to composition of linear maps: ℳ(ST) = ℳ(S)ℳ(T).',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.29-matrix', 'def-3.7-product-of-linear-maps'],
    examples: [
      {
        templateId: 'matrix-product-r2',
        description: 'A (scaling) · B (shear) = AB (compound transformation)',
      },
    ],
    nonexamples: [],
    commonErrors: [
      'AB is defined only when the number of columns of A equals the number of rows of B.',
      'AB ≠ BA in general — matrix multiplication is not commutative.',
    ],
  },
  'def-3.52-column-rank-row-rank': {
    section: '3.C',
    linkedVisualizers: ['matrix-heatmap', 'dimension-bars', 'symbolic-formula'],
    prerequisites: ['def-3.29-matrix', 'def-2.4-span'],
    examples: [
      {
        templateId: 'rank-nullity-2d',
        description: 'Projection [[1,0],[0,0]]: column rank = 1 = row rank',
      },
    ],
    nonexamples: [],
  },
  'def-3.54-transpose': {
    section: '3.C',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.29-matrix'],
    examples: [],
    nonexamples: [],
    commonErrors: ['(AB)ᵗ = BᵗAᵗ — transpose reverses the order of a product.'],
  },
  'def-3.58-rank': {
    section: '3.C',
    plainStatement:
      'The rank of a matrix A equals the dimension of its column space (= row space by Axler §3.57). For a linear map T, rank T = dim range T.',
    linkedVisualizers: [
      'dimension-bars',
      'kernel-range-diagram',
      'matrix-heatmap',
      'symbolic-formula',
    ],
    prerequisites: ['def-3.52-column-rank-row-rank', 'def-3.16-range'],
    examples: [
      { templateId: 'rank-nullity-2d', description: 'Projection: rank 1 (range = x-axis)' },
      { templateId: 'invertible-map-r2', description: 'Rotation: rank 2 (range = ℝ²)' },
    ],
    nonexamples: [],
    commonErrors: [
      'Rank is a property of both the linear map and its matrix (they agree given a choice of bases).',
    ],
  },

  // ── Chapter 3.D — Invertibility and Isomorphisms ──────────────────────
  'def-3.59-invertible-inverse-linear-map': {
    section: '3.D',
    plainStatement:
      'A linear map T ∈ ℒ(V, W) is invertible if there exists a linear map S ∈ ℒ(W, V) with ST = I_V and TS = I_W. The inverse S is unique and denoted T⁻¹. For operators on finite-dimensional spaces: invertible ⟺ injective ⟺ surjective.',
    linkedVisualizers: [
      'matrix-heatmap',
      'grid-deformation-2d',
      'kernel-range-diagram',
      'symbolic-formula',
    ],
    prerequisites: ['def-3.14-injective', 'def-3.19-surjective'],
    examples: [
      {
        templateId: 'invertible-map-r2',
        description: 'Rotation by 60°: det = 1, T⁻¹ = rotation by −60°',
      },
      { templateId: 'injective-map-r2', description: 'Shear [[1,1],[0,1]]: det = 1, invertible' },
    ],
    nonexamples: [
      {
        templateId: 'null-space-demo',
        description: 'Projection [[1,0],[0,0]]: det = 0, not invertible',
      },
    ],
    commonErrors: [
      'Not every linear map is invertible — a map is invertible only if it is both injective and surjective.',
      'For an n×n matrix A: det(A) ≠ 0 ⟺ A is invertible.',
    ],
  },
  'def-3.69-isomorphism-isomorphic': {
    section: '3.D',
    plainStatement:
      'An isomorphism is an invertible linear map. Two vector spaces are isomorphic (V ≅ W) iff they have the same dimension — over the same field, every n-dimensional space is isomorphic to 𝔽ⁿ.',
    linkedVisualizers: ['matrix-heatmap', 'grid-deformation-2d', 'symbolic-formula'],
    prerequisites: ['def-3.59-invertible-inverse-linear-map'],
    examples: [
      {
        templateId: 'invertible-map-r2',
        description: 'Any invertible T: ℝ² → ℝ² is an isomorphism',
      },
    ],
    nonexamples: [],
    commonErrors: [
      'Isomorphic spaces are structurally identical as vector spaces; however they may look different as geometric objects.',
    ],
  },
  'def-3.73-matrix-of-a-vector': {
    section: '3.D',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-3.29-matrix', 'def-2.26-basis'],
    examples: [
      {
        templateId: 'basis-as-coordinates',
        description: 'v = (3/4, −1/2) → column vector [3/4; −1/2]',
      },
    ],
    nonexamples: [],
  },
  'def-3.79-identity-matrix': {
    section: '3.D',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.29-matrix'],
    examples: [],
    nonexamples: [],
  },
  'def-3.80-invertible-inverse-matrix': {
    section: '3.D',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.79-identity-matrix', 'def-3.59-invertible-inverse-linear-map'],
    examples: [
      {
        templateId: 'invertible-map-r2',
        description: 'Rotation matrix: A⁻¹ = transpose (since AᵗA = I)',
      },
    ],
    nonexamples: [],
    commonErrors: ['(AB)⁻¹ = B⁻¹A⁻¹ — inverse reverses the order of a product.'],
  },

  // ── Chapter 3.E — Products and Quotients ──────────────────────────────
  'def-3.87-product-of-vector-spaces': {
    section: '3.E',
    plainStatement:
      'The product V₁ × ⋯ × Vₘ is a new vector space whose elements are m-tuples (v₁,…,vₘ) with componentwise operations. dim(V₁ × ⋯ × Vₘ) = dim V₁ + ⋯ + dim Vₘ.',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-1.20-vector-space'],
    examples: [],
    nonexamples: [],
  },
  'def-3.97-translate': {
    section: '3.E',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-1.33-subspace'],
    examples: [
      {
        templateId: 'affine-line-r2',
        description: 'The coset (1,1) + span{(1,0)} — a horizontal line at y=1',
      },
    ],
    nonexamples: [],
  },
  'def-3.99-quotient-space': {
    section: '3.E',
    plainStatement:
      'The quotient space V/U has elements that are cosets v + U of U in V. Two vectors v, w define the same coset iff v − w ∈ U. dim(V/U) = dim V − dim U.',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-3.97-translate', 'def-1.33-subspace'],
    examples: [
      { templateId: 'affine-line-r2', description: 'ℝ²/{y-axis}: each coset is a vertical line' },
    ],
    nonexamples: [],
    commonErrors: ['Elements of V/U are sets (cosets), not individual vectors.'],
  },
  'def-3.102-addition-scalar-multiplication-on-quotient': {
    section: '3.E',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-3.99-quotient-space'],
    examples: [],
    nonexamples: [],
  },
  'def-3.104-quotient-map': {
    section: '3.E',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-3.99-quotient-space', 'def-3.1-linear-map'],
    examples: [],
    nonexamples: [],
  },

  // ── Chapter 3.F — Duality ─────────────────────────────────────────────
  'def-3.108-linear-functional': {
    section: '3.F',
    plainStatement:
      'A linear functional is a linear map φ: V → 𝔽 (scalar-valued). Examples: dot product with a fixed vector, definite integral on a function space, evaluation of a polynomial at a point.',
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.1-linear-map'],
    examples: [],
    nonexamples: [],
  },
  'def-3.110-dual-space': {
    section: '3.F',
    plainStatement:
      "The dual space V' = ℒ(V, 𝔽) is the vector space of all linear functionals on V. dim V' = dim V.",
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-3.108-linear-functional', 'def-3.5-addition-scalar-multiplication-on-l'],
    examples: [],
    nonexamples: [],
  },
  'def-3.112-dual-basis': {
    section: '3.F',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-3.110-dual-space', 'def-2.26-basis'],
    examples: [],
    nonexamples: [],
    commonErrors: [
      "The dual basis φ₁,…,φₙ satisfies φⱼ(vₖ) = 1 if j=k, else 0 — it is the unique basis of V' dual to v₁,…,vₙ.",
    ],
  },
  'def-3.118-dual-map': {
    section: '3.F',
    plainStatement:
      "The dual map T' ∈ ℒ(W', V') is defined by T'(φ) = φ ∘ T. Its matrix (in dual bases) is the transpose of the matrix of T.",
    linkedVisualizers: ['matrix-heatmap', 'symbolic-formula'],
    prerequisites: ['def-3.110-dual-space', 'def-3.1-linear-map'],
    examples: [],
    nonexamples: [],
  },
  'def-3.121-annihilator': {
    section: '3.F',
    linkedVisualizers: ['symbolic-formula'],
    prerequisites: ['def-3.110-dual-space', 'def-1.33-subspace'],
    examples: [],
    nonexamples: [],
    commonErrors: [
      "The annihilator U⁰ ⊆ V' consists of all linear functionals that vanish on U. dim U⁰ = dim V − dim U.",
    ],
  },
};
