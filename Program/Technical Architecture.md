# LADR Visualizer — Technical Architecture

## Design Principles

The application is a **mathematical sandbox**, not a presentation tool. The distinction matters architecturally: a presentation tool renders fixed scenes; a sandbox must allow any object to be composed with any other, inspected from multiple angles simultaneously, and passed through arbitrary computations. This means the internal representation of mathematical objects must be first-class — decoupled from both how they are computed and how they are rendered.

Two further principles follow from this:

**Honesty about dimension.** Geometry is used where geometry is honest (≤ 3D), and structured abstract representations are used where abstraction is the actual mathematical content. The rendering system should not attempt to collapse all concepts into a single visual metaphor.

**Exact and numerical computation are distinct.** The system tracks whether a result is symbolic/exact or floating-point approximate, and surfaces this distinction to the user. Many of the most important facts in LADR (eigenvalues of self-adjoint operators are real; the minimal polynomial roots are exactly the eigenvalues) are exact statements that a purely numerical engine would obscure.

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React + TypeScript | Component model maps cleanly to the multi-view, multi-object UI; TypeScript enforces the algebraic type system at compile time |
| Build | Vite | Native WASM support, fast HMR, good tree-shaking |
| Symbolic computation | Pyodide + SymPy (Web Worker) | Only serious option for exact minimal polynomials, Jordan form, polynomial factorization over ℚ, and generalized eigenspaces in a browser. math.js cannot do this. The ~10MB payload is acceptable for a tool of this scope. |
| Numerical computation | ml-matrix | Purpose-built for numerical linear algebra in JS; handles SVD, QR, eigendecomposition for floating-point visualization |
| 3D rendering | React Three Fiber (Three.js) | Declarative Three.js; fits naturally in a React component tree; handles vectors, grids, subspaces, ellipsoids, parallelepipeds |
| 2D rendering | D3.js (SVG) | Fine-grained control over geometric primitives; natural for coordinate-plane views, level sets, function graphs |
| Abstract diagrams | Dagre.js + custom SVG | Dagre handles directed-graph layout (spaces as nodes, maps as arrows); custom SVG layer renders the actual visual style |
| LaTeX display | KaTeX | Synchronous, fast, no server dependency |
| State management | Zustand | Minimal API, no boilerplate, works well with React concurrent mode |
| Polynomial/scalar arithmetic | Fraction.js + custom | Exact rational arithmetic for scalar computations that don't need full SymPy |

---

## System Architecture: Six Layers

The architecture is organized into six layers. The layers are ordered by dependency: lower layers do not know about higher ones. The visualization registry (Layer 3) is the primary coupling point between computation and presentation.

```
┌──────────────────────────────────────────────────┐
│  Layer 6: Pedagogy Layer                         │
│  (definition catalog, scene templates,           │
│   example generator, chapter navigation)         │
├──────────────────────────────────────────────────┤
│  Layer 5: Interaction Layer                      │
│  (drag, sliders, input parsing, animation,       │
│   view management)                               │
├──────────────────────────────────────────────────┤
│  Layer 4: Renderer Plugins                       │
│  (Geometric3D, Geometric2D, Diagram,             │
│   Matrix, Symbolic, Chart)                       │
├──────────────────────────────────────────────────┤
│  Layer 3: Visualization Registry  ←── cross-cutting
│  (maps types → applicable visualizers)           │
├──────────────────────────────────────────────────┤
│  Layer 2: Session State (Zustand)                │
│  (field, named objects, active bases, history)   │
├──────────────────────────────────────────────────┤
│  Layer 1: Computation Engine                     │
│  (Symbolic: Pyodide/SymPy | Numerical: ml-matrix)│
├──────────────────────────────────────────────────┤
│  Layer 0: Mathematical Type System               │
│  (the spine — all other layers consume this)     │
└──────────────────────────────────────────────────┘
```

---

### Layer 0: Mathematical Type System

This is the most important single architectural decision. Every other layer — computation, state, rendering, pedagogy — operates on values from this type system. Getting it right means new features compose naturally; getting it wrong means constant impedance mismatches between layers.

The core types, in TypeScript:

```typescript
type Field = 'R' | 'C'

// Scalar: exact-or-approximate, with provenance tracked
type Scalar =
  | { kind: 'rational';    num: bigint; den: bigint }
  | { kind: 'algebraic';   minpoly: Polynomial; approx: number }
  | { kind: 'complex';     re: Scalar; im: Scalar }
  | { kind: 'symbolic';    expr: SymExpr }   // SymPy expression handle
  | { kind: 'float';       value: number }   // approximate — flagged in UI

// Vector
type Vector =
  | { kind: 'concrete';  field: Field; components: Scalar[] }
  | { kind: 'abstract';  label: string; spaceId: SpaceId }
  | { kind: 'polynomial'; field: Field; coefficients: Scalar[] }  // element of P_m(F)
  | { kind: 'functional'; fn: LinearFunctional }                  // element of V'

// Vector space
type VectorSpace =
  | { kind: 'Fn';           field: Field; n: number }
  | { kind: 'polynomial';   field: Field; maxDegree: number | null }
  | { kind: 'matrix_space'; field: Field; m: number; n: number }
  | { kind: 'abstract';     label: string; field: Field; dim: number | 'infinite' }
  | { kind: 'quotient';     parent: SpaceId; subspace: SubspaceId }
  | { kind: 'dual';         parent: SpaceId }
  | { kind: 'tensor';       factors: SpaceId[] }
  | { kind: 'product';      factors: SpaceId[] }

// Subspace
type Subspace = {
  ambient: SpaceId
  representation:
    | { kind: 'span';        generators: Vector[] }
    | { kind: 'equations';   matrix: Matrix }          // null space of this matrix
    | { kind: 'named';       name: SubspaceName }      // null T, range T, eigenspace, etc.
}

// Linear map
type LinearMap = {
  domain:    SpaceId
  codomain:  SpaceId
  representation:
    | { kind: 'matrix';       matrix: Matrix; domainBasis: BasisId; codomainBasis: BasisId }
    | { kind: 'formula';      fn: (v: Vector) => Vector; label: string }
    | { kind: 'basis_action'; pairs: [Vector, Vector][] }
}

// Basis
type Basis = {
  space: SpaceId
  vectors: Vector[]
  label: string   // e.g. "standard", "eigenbasis", "user-defined"
}

// Matrix (separate from linear map — a matrix is basis-dependent)
type Matrix = {
  field: Field
  rows: number
  cols: number
  entries: Scalar[][]
}
```

All objects are stored by ID in the session state. References between objects are by ID, not by pointer, which makes serialization and undo/redo straightforward.

---

### Layer 1: Computation Engine

The computation engine exposes a unified async interface over two internal tracks.

**Symbolic track** (Pyodide + SymPy, Web Worker)

Handles: exact eigenvalues over ℚ, minimal polynomial, characteristic polynomial, Jordan form, generalized eigenspaces, exact null space / range (over ℚ or ℤ), polynomial factorization over ℝ and ℂ, Gram-Schmidt with exact rational arithmetic.

SymPy is invoked via a persistent Web Worker to avoid restarting the Python runtime on each call. The worker maintains a Python-side session object holding any matrices or expressions that have been sent to it, so repeated calls on the same object are cheap.

**Numerical track** (ml-matrix, main thread or second worker)

Handles: floating-point eigenvalues/eigenvectors, SVD, QR, Cholesky, Gram-Schmidt approximation, large-matrix operations, heatmaps, operator norms, condition numbers.

**Unified API**

```typescript
interface ComputationEngine {
  // Returns exact result when possible; falls back to numerical
  eigendecompose(m: Matrix): Promise<{
    exact:     EigenResult | null   // null if not computable exactly
    numerical: EigenResult
  }>
  nullSpace(m: Matrix):    Promise<{ exact: Basis | null; numerical: Basis }>
  jordanForm(m: Matrix):   Promise<JordanResult>        // symbolic track only
  minimalPoly(m: Matrix):  Promise<Polynomial>          // symbolic track only
  svd(m: Matrix):          Promise<SVDResult>           // numerical track
  gramSchmidt(vs: Vector[], ip: InnerProduct): Promise<Vector[]>
  // ... etc.
}
```

The UI marks results with a provenance tag (exact / approximate) which is displayed to the user.

---

### Layer 2: Session State

The session is the global mathematical context. It is managed by Zustand and contains everything needed to reproduce a user's current state.

```typescript
type MathSession = {
  field:         Field
  spaces:        Map<SpaceId, VectorSpace>
  subspaces:     Map<SubspaceId, Subspace>
  maps:          Map<MapId, LinearMap>
  vectors:       Map<VectorId, Vector>
  bases:         Map<BasisId, Basis>
  innerProducts: Map<IPId, InnerProduct>
  selectedBasis: Map<SpaceId, BasisId>    // active basis per space
  namedObjects:  Map<string, MathObjectRef>  // "T", "V", "v₁", etc.
  views:         View[]                   // active simultaneous views
  history:       SessionSnapshot[]        // undo stack
}
```

**Basis as session-level state** is a deliberate design choice. Basis is not a property of a vector space — it is a choice made by the user. When the user changes the active basis for a space, every view that depends on that space (matrix representations, coordinate displays, change-of-basis animations) updates automatically because they all read from `session.selectedBasis`.

**Field as session-level state** similarly propagates everywhere. Switching from ℝ to ℂ changes how complex scalars are displayed, whether complex eigenvalues are shown, and which visualization templates are available.

---

### Layer 3: Visualization Registry

This is the cross-cutting layer that solves the definition-to-visualization coupling problem architecturally.

The registry maps each mathematical type to a list of **visualizers** — functions from a mathematical object to renderer-ready props. A visualizer specifies which renderer it targets, under what conditions it applies, and how to extract the relevant data from the object plus session context.

```typescript
type Visualizer<T extends MathObject> = {
  id:          string
  label:       string                          // shown in "View as..." menu
  renderer:    RendererKind
  applicable:  (obj: T, session: MathSession) => boolean
  toProps:     (obj: T, session: MathSession) => RendererProps
}

type RendererKind =
  | 'geometric_3d'
  | 'geometric_2d'
  | 'diagram'
  | 'matrix'
  | 'symbolic'
  | 'chart'

// Example registrations for LinearMap
visualizerRegistry.register<LinearMap>('LinearMap', [
  {
    id: 'grid-deformation-3d',
    label: 'Grid deformation (3D)',
    renderer: 'geometric_3d',
    applicable: (T, s) => dim(T.domain, s) <= 3 && dim(T.codomain, s) <= 3,
    toProps: (T, s) => extractGridDeformation(T, s),
  },
  {
    id: 'kernel-range-diagram',
    label: 'Kernel / range diagram',
    renderer: 'diagram',
    applicable: () => true,   // always applicable
    toProps: (T, s) => extractKernelRangeDiagram(T, s),
  },
  {
    id: 'matrix-heatmap',
    label: 'Matrix heatmap',
    renderer: 'matrix',
    applicable: () => true,
    toProps: (T, s) => extractMatrixView(T, s),
  },
  {
    id: 'eigenline-2d',
    label: 'Eigenlines (2D)',
    renderer: 'geometric_2d',
    applicable: (T, s) => dim(T.domain, s) === 2 && T.domain === T.codomain,
    toProps: (T, s) => extractEigenlines2D(T, s),
  },
])
```

The UI presents the list of applicable visualizers for the selected object as tabs or a "View as..." menu. Multiple views can be open simultaneously. Adding a new visualizer for an existing type requires only a new registry entry — no modifications to existing code.

This pattern also powers the pedagogy buttons ("Show in ℝ²", "Show abstract version"): they are filtered views of the visualizer registry.

---

### Layer 4: Renderer Plugins

Each renderer is a pure React component that accepts normalized props from the registry. Renderers do not know about the mathematical type system — they only know about their own geometry or diagram vocabulary.

**Geometric3DRenderer** (React Three Fiber)

Input vocabulary: vectors (arrows from origin or free), subspaces (planes, lines, points), parametric grids, ellipsoids, parallelepipeds, labeled axes, animated state transitions.

Supports camera orbit, zoom, axis toggling, and a "before / after" split view for transformations.

**Geometric2DRenderer** (D3 / SVG)

Input vocabulary: vectors (arrows), lines, planes, shaded regions, function graphs, level sets (for linear functionals), cosets (translated copies of a subspace), unit balls under various norms.

Also used for: number line (1D), Argand diagram (complex plane), coefficient trajectory plots.

**DiagramRenderer** (Dagre + SVG)

Input vocabulary: nodes (vector spaces, labeled with name and dimension), directed edges (linear maps, labeled with name and properties), highlighted subgraphs (kernel, range), dashed edges (dual maps), collapse edges (quotient maps).

Dagre computes layout; a custom SVG layer renders the visual style. Used for: kernel-range views, commutative diagrams, dual map reversal, tensor product construction, subspace inclusion lattices.

**MatrixRenderer** (D3)

Input vocabulary: matrix data with field, scalar type (exact/approximate), optional row/column labels, optional basis labels, optional operation trace (row reduction steps).

Renders as: entry grid, heatmap (color-coded magnitude), block structure overlay, row/column highlighting, singular value spectrum bar chart.

**SymbolicRenderer** (KaTeX)

Input vocabulary: LaTeX strings with optional interactive slots. Used for displaying definitions, formal statements, computed results (eigenvalues, minimal polynomial, SVD factorization, etc.).

**ChartRenderer** (D3)

Input vocabulary: spectral data (eigenvalue distributions), dimension bars (rank / nullity), singular value plots, basis coefficient bar charts. Primarily used as a fallback view for high-dimensional objects.

---

### Layer 5: Interaction Layer

The interaction layer governs how user actions modify session state and trigger recomputation. It has four sub-concerns:

**Direct manipulation.** Dragging a vector in a geometric view should update the vector in session state, trigger recomputation of any derived objects (null space membership test, projection, inner product), and propagate to all other views of the same object. This is handled by a drag callback registered per-renderer that dispatches to the Zustand store.

**Parameter controls.** Sliders for scalar coefficients in linear combinations, field selectors, basis toggles, exact/approximate display toggles, and the real/complex switch all read from and write to session state.

**Input parsing.** The user must be able to define objects by typing, e.g., `T(x, y, z) = (x + y, 2z)` for a linear map, or `[1, 2; 3, 4]` for a matrix. A small expression parser converts these into the Layer 0 type system representations. Ambiguous input triggers a disambiguation prompt rather than failing silently.

**Animation timeline.** Continuous transformations (basis change, SVD decomposition, Gram-Schmidt steps, grid deformation) are animated via a scrub bar. The timeline stores keyframe sessions (start state, end state) and interpolates between them. Discrete steps (Jordan chain, row reduction) advance one step at a time.

---

### Layer 6: Pedagogy Layer

**Definition catalog.** Each definition in LADR is a structured record:

```typescript
type DefinitionRecord = {
  id:              string
  title:           string
  chapter:         number
  formalStatement: string        // LaTeX
  prerequisites:   string[]      // ids of prerequisite definitions
  linkedVisualizers: string[]    // visualizer ids that illustrate this concept
  examples:        MathSession[] // pre-built session snapshots
  nonexamples:     MathSession[]
  commonErrors:    string[]
  exercises:       ExerciseTemplate[]
}
```

Clicking a definition in the chapter navigation loads its canonical examples into the session and opens the linked visualizers.

**Scene templates.** Pre-composed session snapshots for the standard pedagogical scenarios: span-building, basis-as-coordinate-system, rank-nullity, Gram-Schmidt, spectral theorem, SVD, etc. Templates are parameterized — "basis change" can be instantiated for any user-defined pair of bases.

**Example/counterexample generator.** A constraint-based system that wraps the computation engine. The user selects a structural constraint (e.g., "nilpotent operator of index 3", "two subspaces whose sum is not direct", "self-adjoint with eigenvalues 1, −1, 2") and the generator produces a concrete instance in the lowest dimension where it is non-trivial. Constraints are templates, not a general solver; the initial set covers the ~30 most pedagogically useful cases.

**Chapter navigation.** A sidebar mapping LADR's chapter/section structure to definition catalog entries. Selecting a section loads the relevant definitions, linked examples, and recommended scene templates.

---

## Data Flow: User Action to Rendered View

A complete round-trip, as an example: the user defines a new linear map by typing a formula.

```
1. User types "T(x, y) = (x + y, x - y)" in the input field

2. Input parser (Layer 5) → LinearMap object in the Layer 0 type system,
   with representation { kind: 'formula', fn: ..., label: 'T' }

3. Session store (Layer 2) assigns it an ID and registers it as a named object "T"

4. Computation engine (Layer 1) is invoked asynchronously:
   - Numerical: ml-matrix computes matrix representation in standard basis,
     eigenvalues, SVD
   - Symbolic: SymPy worker computes exact eigenvalues, minimal polynomial

5. Results are written back to the session store, tagged with provenance

6. Visualization registry (Layer 3) queries applicable visualizers for LinearMap
   in a 2D domain: returns grid-deformation-2d, kernel-range-diagram,
   matrix-heatmap, eigenline-2d, symbolic-formula

7. Active views (whatever the user has open) re-render via their renderer plugins (Layer 4),
   each consuming the updated session state

8. The pedagogy layer (Layer 6) highlights "T" in the definition catalog,
   suggesting linked concepts (null space, injectivity, rank-nullity)
```

---

## Deferred Scope

The following are excluded from the initial build and should not be designed around:

- **Infinite-dimensional function spaces in full generality.** Polynomial spaces and finite-dimensional function spaces are in scope; general L² or C[0,1] are not. These require a different computational model (sampling, truncation) that is better treated as a separate module.
- **Finite fields.** Axler restricts to ℝ and ℂ; finite fields are out of scope.
- **General constraint solving for the example generator.** The initial generator uses templated constraints. Arbitrary constraint specification (a user typing a new structural property) requires a general satisfiability layer that is deferred.
- **Collaborative / multi-user sessions.** The session model is single-user.
- **Export to LaTeX or PDF.** Useful but not part of the core sandbox functionality.
- **Tensor products and multilinear forms in geometric view.** These will be symbolic and diagrammatic only initially. Geometric intuition for tensors is misleading below a certain level of sophistication; premature visualization is counterproductive.

---

## Summary of Key Architectural Decisions

**The mathematical type system is the spine.** All other layers are either consumers of it (renderers, computation engine) or managers of it (session state). This is the decision that most determines whether the sandbox is genuinely composable or not.

**Symbolic and numerical computation are separate tracks with a unified interface.** The distinction between exact and approximate results is not just a display preference — it reflects a real mathematical distinction that the system should preserve and surface.

**The visualization registry decouples object types from rendering.** This is how the "show me this differently" functionality works without hard-coded conditionals throughout the codebase.

**Basis is session-level state, not object-level state.** This ensures that basis changes propagate coherently to all views simultaneously, which is the correct mathematical behavior.

**The pedagogy layer is a consumer of the lower layers, not a separate application.** Definitions, examples, and scene templates are parameterized views into the session and visualization systems — not a parallel architecture.
