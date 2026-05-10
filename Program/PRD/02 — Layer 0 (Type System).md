# Phase 1 — Layer 0: Mathematical Type System

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Layer 0: Mathematical Type System"
**Depends on:** Phase 0 complete

---

## 1. Goal

Establish the mathematical type system that every subsequent layer depends on. This is the most consequential phase of the whole project: every downstream layer is a consumer or manager of these types. Imprecision here propagates everywhere.

The phase produces no UI and no computation beyond what is needed to construct, identify, and structurally validate mathematical objects. Computation that requires more than constructor-level work — eigenvalues, Jordan form, null space, etc. — is Layer 1.

---

## 2. Scope

### 2.1 Types to define

The architecture document specifies the discriminated unions for `Scalar`, `Vector`, `VectorSpace`, `Subspace`, `LinearMap`, `Basis`, and `Matrix`. Phase 1 implements those, plus the supporting machinery they need to be useful. The full list:

- **Scalar** — discriminated union over `rational`, `algebraic`, `complex`, `symbolic`, `float` (per architecture).
- **Vector** — `concrete`, `abstract`, `polynomial`, `functional`.
- **VectorSpace** — `Fn`, `polynomial`, `matrix_space`, `abstract`, `quotient`, `dual`, `tensor`, `product`.
- **Subspace** — with `span`, `equations`, `named` representations.
- **LinearMap** — with `matrix`, `formula`, `basis_action` representations.
- **Basis** — ordered tuple bound to a `SpaceId`.
- **Matrix** — basis-dependent, `field × rows × cols × Scalar[][]`. Distinct from `LinearMap`.
- **InnerProduct** — referenced in the architecture but not fully sketched. Define here: discriminated union over `dot` (standard on `Fn`), `matrix` (Gram matrix on a chosen basis), and `formula` (function on a pair of vectors). Tied to a `SpaceId`.
- **Polynomial** — needed by `Scalar.algebraic` and elsewhere. Coefficient list in **ascending degree order** (per master PRD §8.4), with the field it is defined over.
- **SymExpr** — opaque handle to a SymPy-side expression. Layer 0 only declares the shape; the worker bridge populates it in Phase 2. Treat as `{ kind: 'symexpr'; serialized: string; vars: string[] }` or similar — decide in Layer 0 with awareness that Layer 1 will need to round-trip it.

### 2.2 Branded ID types

```typescript
type SpaceId    = string & { __brand: 'SpaceId' }
type SubspaceId = string & { __brand: 'SubspaceId' }
type MapId      = string & { __brand: 'MapId' }
type VectorId   = string & { __brand: 'VectorId' }
type BasisId    = string & { __brand: 'BasisId' }
type IPId       = string & { __brand: 'IPId' }
```

Each carries a constructor (e.g., `mkSpaceId(s: string): SpaceId`) so that ID generation has a single, lintable point. ID generation should produce stable, debug-friendly strings (e.g., `space:Fn:R3:1`, not opaque UUIDs) — this matters when reading state snapshots in tests and devlogs.

### 2.3 Constructors / factories

For each type, provide a factory function that:

- Takes the minimum sufficient inputs.
- Validates structural invariants (see §3) and returns a `Result<T, ConstructionError>` rather than throwing — invalid construction is a user-facing concern, not an invariant violation.
- Computes derived display fields (e.g., `dimension` cache for `Fn` and `polynomial` spaces) once at construction time.

Example shape (illustrative, not binding on naming):

```typescript
function mkVectorSpaceFn(field: Field, n: number): Result<VectorSpace, ConstructionError>
function mkVector(field: Field, components: Scalar[]): Result<Vector, ConstructionError>
function mkLinearMapByMatrix(
  domain: SpaceId, codomain: SpaceId,
  matrix: Matrix, domainBasis: BasisId, codomainBasis: BasisId,
): Result<LinearMap, ConstructionError>
```

### 2.4 Predicates and accessors

Layer 0 provides the structural queries that don't require Layer 1's symbolic/numerical machinery:

- `dim(space: VectorSpace, session?: SessionView): number | 'infinite'` — dimension. Derived structurally for `Fn`, `polynomial` (when `maxDegree` is finite), `matrix_space`, `abstract` (from declared `dim`), `quotient` (`dim(parent) - dim(subspace)`), `dual` (`dim(parent)`), `product` (`sum`), `tensor` (`product`).
- `isFiniteDim(space: VectorSpace): boolean`.
- `field(space: VectorSpace): Field`.
- `isSubspaceOf(child: Subspace, ambient: SpaceId): boolean` — structural check only; semantic verification (does the span actually live in the ambient space?) is Layer 1.
- Discriminator helpers: `isFn`, `isPolynomial`, `isQuotient`, etc., as needed. Prefer `obj.kind === 'fn'` checks at call sites for narrowing; use helpers only when the type narrowing needs to wrap multiple checks.

`SessionView` here is a *read-only projection* of the Layer 2 store — Layer 0 must not import from `state/`. Define `SessionView` as an interface in `src/types/` whose actual implementation lives in Layer 2 and is passed in.

### 2.5 Scalar arithmetic

Layer 0 includes exact arithmetic on `Scalar.rational` and `Scalar.complex` of rationals, because these are needed for any structural validation (e.g., checking linear combinations). Operations:

- `add`, `sub`, `mul`, `div`, `neg`, `inv`, `eq` over `rational` and over `complex` of rationals.
- Constants: `zero(field)`, `one(field)`.
- Promotion: when a `rational` interacts with a `float` or `symbolic`, the result lifts to the more general type. `algebraic` and `symbolic` arithmetic delegates to Layer 1 — Layer 0 returns a placeholder that Layer 1 will eventually evaluate, *or* surfaces an error if Layer 1 isn't available.

Use `Fraction.js` as listed in the architecture. Do **not** roll your own bigint rational arithmetic.

---

## 3. Invariants

Each type carries structural invariants that the factory must enforce. Violations of these inside Layer 0 (e.g., from a Layer 0 transformation function producing an invalid object) are *bugs* and should throw. Construction with invalid inputs from outside Layer 0 returns `Result.err`.

Selected invariants:

- `Vector.concrete.components.length` matches the dimension of the space it claims to belong to (when that space is finite-dimensional and known).
- `Matrix.entries.length === rows`, and every row's length equals `cols`.
- `Basis.vectors.length` equals the dimension of `Basis.space` when known and finite.
- `Subspace.representation.kind === 'span'` ⇒ all `generators` belong to the ambient space's underlying field.
- `LinearMap.representation.kind === 'matrix'` ⇒ matrix dimensions equal `(dim(codomain), dim(domain))` and the bases reference the correct spaces.
- `Polynomial.coefficients` has at least one entry, and `coefficients` is stored in ascending degree order.
- `Scalar.complex` with both `re` and `im` of kind `rational` is preferred; mixing `re: rational` with `im: float` is permitted but should trigger a provenance flag at use sites.

The complete invariant list for each type lives in code as a `validate<T>(obj: T): Result<void, InvariantError>` function adjacent to the type definition. This is the spec.

---

## 4. Tests

Testing is non-negotiable for Layer 0. The whole point of this phase is that downstream layers can trust the types.

### 4.1 Unit tests

For each type, test:

- Factory accepts valid input.
- Factory rejects invalid input with the correct error code.
- Validators detect each invariant violation.
- Predicates and accessors return correct results on representative cases.

### 4.2 Property-based tests (`fast-check`)

Property tests cover the algebraic identities Layer 0 actually exposes:

- `Scalar` rational arithmetic: associativity, commutativity, distributivity, additive/multiplicative identities and inverses.
- Dimension calculus: `dim(V × W) === dim(V) + dim(W)`, `dim(V/U) === dim(V) - dim(U)` (where defined), `dim(V*) === dim(V)`.
- Polynomial coefficient round-trip: `fromArray(toArray(p)) === p`.

These are not smoke tests; they catch real bugs. Aim for ~20 properties total in this phase.

### 4.3 Snapshot tests for ID generation

A small snapshot test that confirms ID generation produces stable strings for canonical inputs (`mkSpaceId({kind: 'Fn', field: 'R', n: 3})` always produces the same ID). This protects against silent ID-collision bugs that would corrupt session state.

---

## 5. Acceptance criteria

Phase 1 is complete when:

1. All types in §2.1 are defined in `src/types/`, each in its own file, exported through `src/types/index.ts`.
2. All factories in §2.3 are implemented with `Result`-returning signatures.
3. All predicates in §2.4 are implemented and used somewhere in tests.
4. Layer 0 has zero imports from `src/state/`, `src/compute/`, `src/registry/`, or any higher-numbered layer. Enforce with an ESLint rule (`eslint-plugin-boundaries` or hand-written `no-restricted-imports`).
5. Test coverage: every factory and validator has at least one passing unit test; the property-test set in §4.2 is implemented and passing.
6. `pnpm verify` is green.
7. A short module-level comment in `src/types/index.ts` summarizes the layer's contract for downstream consumers.
8. The `SessionView` interface is defined in Layer 0 (Layer 2 will implement it) and Layer 0 functions that need session context accept it as a parameter rather than reaching for it.
9. `Program/PRD/00 — Development Standards.md` §7 (Roadmap) is updated.
10. A devlog entry is written.

---

## 6. Out of scope for Phase 1

- Computation that requires Pyodide or ml-matrix. Even something as simple as "is this set of vectors linearly independent" goes through Layer 1, because the answer requires linear-system solving.
- Inner product computation (the *value* of `⟨u, v⟩`). The `InnerProduct` type is defined in Layer 0; evaluation is Layer 1.
- Dual map construction, tensor map construction. The `dual` and `tensor` *spaces* are in scope; the maps that act on them require Layer 1.
- Any rendering or UI.

---

## 7. Open design questions

These should be resolved during Phase 1, with the resolution recorded as a Decision in `NOTES.md`.

- **`Result` vs. exceptions for factory failures.** Architecture is silent. This PRD specifies `Result<T, E>`. If the agent doing Phase 1 has a strong reason to prefer exceptions (e.g., better React error-boundary integration), surface it as an Open Question before committing to one.
- **`SymExpr` opaque handle shape.** Architecture says "SymPy expression handle" without specifying the wire format. Phase 1 picks a tentative shape; Phase 2 may revise based on what crosses the worker boundary efficiently. The Phase 1 choice should anticipate that revision (i.e., keep `SymExpr` opaque to consumers — they should never destructure it).
- **`Basis` for `tensor` and `quotient` spaces.** Constructing a basis on these requires structural work that overlaps with computation. Phase 1 declares the type but *may* leave construction to Phase 2 if it requires Layer 1 facilities. Document the choice.
- **Equality semantics.** Two `VectorSpace` objects with `kind: 'Fn', field: 'R', n: 3` are mathematically the same space. Are they `===`? This depends on whether factories deduplicate. Phase 1 must make a choice and document it. Recommendation: factories deduplicate via a content-addressed cache, so structurally identical spaces share an ID. This makes `selectedBasis: Map<SpaceId, BasisId>` behave correctly without the user having to identify spaces by reference.

---

## 8. Risks

- **Premature abstraction.** It is tempting to build a typeclass-style framework for "operations that work on any vector space." Resist. Add abstraction only when a second concrete need shows up — the architecture's discriminated unions are deliberately concrete.
- **TypeScript variance edge cases.** Discriminated unions with branded subtypes occasionally produce confusing variance errors at the boundary between layers. Where this happens, prefer adding a small named type alias to clarify intent over fighting the compiler with casts.
- **Underspecified `abstract` spaces.** A `VectorSpace` of `kind: 'abstract'` carries `dim` and `field` but no concrete vector representation. Many Layer 0 operations cannot apply. Document which operations refuse abstract spaces vs. which proceed structurally.

---

## 9. Handoff to Phase 2

When Phase 1 is complete, the next agent should:

1. Read `03 — Layer 1 (Computation Engine).md`.
2. Begin Pyodide bootstrapping in `src/compute/workers/`.
3. Treat Layer 0's `SymExpr` shape as a starting point; the Phase 2 agent has authority to revise it as part of building the worker bridge, with the change recorded as a Decision.
