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
};
