# Phase 10 — Connected Sandbox

**Status:** Planned
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Layer 2: Session State", §"Layer 5: Interaction Layer"
**Action items:** AI-006, AI-007, AI-008, AI-009
**Depends on:** Phases 0–9 complete.

---

## 1. Goal

Make the sandbox behave like a sandbox. After Phase 9, the app has a functioning pedagogy layer and a collection of scene templates — but every session object is an independent concrete value, naming is cosmetic, and the session offers no representational category for objects defined in terms of other objects. A user who types `v + w` cannot refer to session variables named `v` and `w`; a user who loads the vector-addition template sees three arrows that coincidentally satisfy an additive relationship, with no enforcement that the third updates when the first two change. The interaction layer (Phase 6) made individual objects manipulable; Phase 10 makes them *related*.

The central architectural addition is **derived objects**: session members whose values are defined by an expression over other session objects and whose cached values recompute automatically when any dependency changes. This enables named-object referencing in the expression parser (so `v + w`, `A(v)`, and `A * B` are legal inputs), and it enables templates to express mathematical relationships as live expressions rather than coincidentally-matching concrete values. Together, the formula map evaluation bug, the Inspector's inert computed section, the absence of deletion, and the lack of named-object referencing all point to the same root: the session model is currently write-only and disconnected. Phase 10 addresses this as a unified body of work.

---

## 2. Scope

Phase 10 has four work items. Three of them (AI-006, AI-007, AI-008) are self-contained fixes to existing components that don't require architectural changes. The fourth (AI-009) is the architectural core that the other three ultimately point toward, and contains a Part A (parser extension) and Part B (derived objects in the session model) that must be implemented in that order.

### 2.1 AI-006 — Formula map evaluation

The expression parser supports formula-kind linear maps (`T(x, y) = (x+y, x−y)`) but the `applyParseResult` branch in `ObjectInput.tsx` always creates `mkLinearMapByFormula(space, space, (v) => v, label)` — the identity function — regardless of the formula body. ADR-014 (Phase 6) explicitly deferred formula evaluation; that deferral is now expired.

**Mechanism.** To construct the matrix of a linear map T: 𝔽ⁿ → 𝔽ⁿ from its formula, evaluate T at the n standard basis vectors. The j-th column of ℳ(T) is T(eⱼ), where eⱼ has components `(0, …, 1, …, 0)` with 1 in position j. This requires a scalar-expression evaluator that can substitute variable bindings (`{ x: 1, y: 0 }`) into the formula body and produce a rational output. The formula body is a comma-separated list of arithmetic expressions in the input variable names, bracketed in parentheses: `(expr₁, …, exprₘ)`.

**Scope of the evaluator.** The evaluator handles the linear arithmetic operations that can appear in a linear map formula: rational literals, variable references, addition, subtraction, unary negation, and multiplication by a rational literal (scalar multiple). Division is not supported at this stage. Non-linear terms (products of variables, powers) should produce a `UserFacingError` at evaluation time with a clear message: "This expression is not linear in the inputs." The evaluator lives in `src/interaction/parser/evaluate.ts` alongside the existing lexer and parser.

**Codomain inference.** The formula's output arity (number of comma-separated expressions) determines the codomain dimension. For `T(x, y) = (x+y, x−y)`, the output is 2-dimensional, so T: ℝ² → ℝ². For `T(x, y) = (x, y, x+y)`, T: ℝ² → ℝ³. The codomain space is created with `mkVectorSpaceFn` at evaluation time; the result is a `matrix`-representation `LinearMap`.

**Fallback.** If the formula body cannot be parsed (parse failure) or contains non-linear terms (evaluation failure), the error propagates as a `UserFacingError` displayed inline in `ObjectInput`. The formula-kind `LinearMap` with identity placeholder is never created; the user gets a clear error instead.

### 2.2 AI-007 — Inspector computed properties

`Inspector.tsx` renders rank, nullity, and determinant as the string `'—'` with a note "not yet computed." `useComputation` is the hook that bridges the Inspector to the engine; it is used by every renderer that depends on computed results but is not called from `Inspector.tsx` at all.

**What to wire up.** For a selected map with `representation.kind === 'matrix'`: call `useComputation` for rank, nullity, and (if square) determinant. The exact operation keys must match what `ChartRenderer` (dimension-bars) already uses — consult `src/renderers/ChartRenderer.tsx` to extract the operation descriptors and replicate them in the Inspector rather than inventing a parallel invocation path.

**Display.** While computation is pending, show a subtle loading indicator (a small spinner or the text "computing…" in mono) rather than `'—'`. Once computed, display the value. The Inspector is not a renderer and does not go through `toProps` / `LoadingProps` — it calls `useComputation` directly and reads the cached result from `session.computationCache`. This is the correct pattern for non-renderer consumers of computation results.

**Subsequent correctness.** Once computed values populate the Inspector and the user makes changes (via drag or expression input) that invalidate the cache, the Inspector should automatically re-trigger computation. This is automatic: `updateVector` and the derived-object recomputation pass both clear `computationCache`, which causes `useComputation` to re-fire on the next render.

### 2.3 AI-008 — Deletion and selection wiring

**Deletion.** Add `removeVector(id: VectorId)`, `removeMap(id: MapId)`, and `removeSpace(id: SpaceId)` store actions. Each action removes the object from its record in the session, removes any `namedObjects` entries pointing to it, closes any open views whose `objectRef` references it, and clears any computation cache entries keyed to it. Removing a space should also remove vectors and maps that reference that space as domain or codomain (cascade), with the same view-closing and cache-clearing behavior. Add a delete affordance (a small ✕ button visible on hover) to each item in `ObjectLibrary`. Deleting a derived object does not cascade to its dependencies — it only removes the derived object itself.

**Selection wiring.** The `selected` / `setSelected` state in `SandboxLayout` and the `onSelect` prop threading through `ObjectLibrary` are already plumbed in `App.tsx`. Verify that clicking an item in `ObjectLibrary` calls `onSelect` and that the Inspector responds. If the wiring is already correct, this is a one-line confirmation test; if it is broken, fix the `ObjectLibrary` click handler. Either way, write a test that asserts `Inspector` receives a non-null `selected` prop after an `ObjectLibrary` click.

### 2.4 AI-009 — Named-object referencing and derived live objects

This is the core of Phase 10. It has two parts that must be implemented in sequence: Part A (parser extension) is a prerequisite for Part B (session model changes), because the parser must resolve names before it can create derived objects.

#### Part A — Named-object referencing in the expression parser

Extend `src/interaction/parser/` to resolve names from `session.namedObjects` at parse time. The change has two pieces: lexer and parser.

**Lexer (`lexer.ts`).** Add a `NameRef` token type emitted when the lexer encounters an identifier that is a key in the supplied `namedObjects` record. An identifier that is *not* a known name is still a parse error, not a `NameRef`; the user cannot introduce free variables. This keeps the parser deterministic.

**Parser (`parser.ts`).** Add production rules for the following expression forms, in addition to the existing literal forms:

| Input form | Condition | Result |
|---|---|---|
| `v + w` | both `v`, `w` are vector-kind names | `VectorExpression { op: 'add', left: v.id, right: w.id }` |
| `v - w` | both vector-kind | `VectorExpression { op: 'sub', left: v.id, right: w.id }` |
| `2v` or `2 * v` | `2` is a rational literal, `v` is vector-kind | `VectorExpression { op: 'scale', scalar: rational(2), vector: v.id }` |
| `A(v)` or `A v` | `A` is map-kind, `v` is vector-kind | `VectorExpression { op: 'apply', map: A.id, vector: v.id }` |
| `A * B` | both map-kind | `MapExpression { op: 'compose', left: A.id, right: B.id }` |
| `A + B` | both map-kind | `MapExpression { op: 'sum', left: A.id, right: B.id }` |

The `parseInput` signature changes to `parseInput(text: string, namedObjects?: Record<string, MathObjectRef>): ParseResult`. Callers that do not supply `namedObjects` (currently all tests) continue to work — name resolution simply never fires.

`ObjectInput.tsx` threads `session.namedObjects` into `parseInput`. The name input field retains its current behavior: a user-supplied label for the created object.

**Type mismatch errors.** If `v + w` is typed but `v` is a map-kind name, the parser should return a typed `UserFacingError`: "v is a linear map, not a vector." Object-kind checking belongs in the parser, not in `applyParseResult`.

**Dimension mismatch.** If `v + w` but `v` and `w` live in different spaces (different dimensions or different field), return a `UserFacingError` at parse time. The parser can check this by looking up the space IDs of the referenced objects.

#### Part B — Derived objects in the session model

**New types.** Add to `src/types/vector.ts`:

```typescript
export type VectorExpression =
  | { readonly op: 'add';   readonly left: VectorId; readonly right: VectorId }
  | { readonly op: 'sub';   readonly left: VectorId; readonly right: VectorId }
  | { readonly op: 'scale'; readonly scalar: Scalar;  readonly vector: VectorId }
  | { readonly op: 'apply'; readonly map: MapId;      readonly vector: VectorId }

export type DerivedVector = {
  readonly kind: 'derived'
  readonly id: VectorId
  readonly field: Field
  readonly space: SpaceId
  readonly expression: VectorExpression
  readonly components: readonly Scalar[]  // cached; see note below
}
```

Add to `src/types/map.ts` (alongside `MatrixRepresentation` and `FormulaRepresentation`):

```typescript
export type MapExpression =
  | { readonly op: 'compose'; readonly left: MapId; readonly right: MapId }
  | { readonly op: 'sum';     readonly left: MapId; readonly right: MapId }
  | { readonly op: 'scale';   readonly scalar: Scalar; readonly map: MapId }

// DerivedMap is a LinearMap with a DerivedRepresentation
export type DerivedRepresentation = {
  readonly kind: 'derived'
  readonly expression: MapExpression
  readonly matrix: Matrix  // cached; columns are ℳ(T)(eᵢ)
  readonly domainBasis: BasisId
  readonly codomainBasis: BasisId
}
```

`DerivedVector` joins the `Vector` union; `DerivedRepresentation` joins `LinearMap.representation`. Existing consumers that branch on `vec.kind` or `map.representation.kind` need to add `'derived'` cases — for rendering, reading `.components` (vectors) or `.representation.matrix` (maps) is sufficient, since these are the cached concrete values.

**Caching semantics.** The `components` field of `DerivedVector` and the `matrix` field of `DerivedRepresentation` are cached evaluated values, not source-of-truth data. The source of truth is the `expression`. In TypeScript terms, the cached fields are `readonly` in the type (they are not mutated directly by external code) but are updated via Immer in the store's `recomputeDerived` pass. This is the same pattern as `computationCache` in `MathSession` — an internal cache that happens to live in the session state.

**Derivation recomputation.** Add `src/state/derivation.ts` with a single exported function `recomputeDerived(draft: Draft<MathStore>): void`. This function:

1. Builds a dependency graph from the current session's derived objects — for each `DerivedVector` / `DerivedMap`, record which concrete or derived object IDs it depends on.
2. Detects cycles (a derived object transitively depending on itself). If a cycle exists, mark the offending derived objects as having an error state and do not recompute them; this should not be possible if the factory enforces acyclicity at creation time, but the recomputation pass should be defensive.
3. Produces a topological ordering of derived objects (dependencies before dependents).
4. Evaluates each derived object in order using the current session state: for `VectorExpression`, pure rational arithmetic on component arrays; for `MapExpression`, matrix arithmetic on the cached representation matrices. The evaluation is all TypeScript — no engine call.
5. Updates the cached field in the Immer draft.

`recomputeDerived` is called at the end of every store mutation action that can affect object values: `updateVector`, `addVector`, `addMap`, `addSpace`, `applyScene`, and the new `removeVector` / `removeMap` / `removeSpace` actions. It is not called by `cacheResult`, `startComputation`, or other purely bookkeeping actions.

**Factory functions.** Add `mkDerivedVector(field, space, expression, currentVectors, currentMaps): Result<DerivedVector, UserFacingError>` to `src/types/vector.ts`. The factory evaluates the expression immediately using the supplied `currentVectors`/`currentMaps` to produce the initial `components`, enforces that the expression is acyclic (by resolving dependencies transitively and checking for the new vector's prospective ID), and returns an error if the expression is invalid (missing references, type mismatches, dimension mismatches). A parallel `mkDerivedMap` factory in `src/types/map.ts`.

**ObjectInput changes.** In `applyParseResult`, when the result is a `VectorExpression` or `MapExpression`, call `mkDerivedVector` or `mkDerivedMap` instead of evaluating to a concrete value. The derived object is then added to the session via `addVector` / `addMap` as normal; the store's post-mutation `recomputeDerived` call establishes its initial cached value.

**Template updates.** Update the following templates in `src/pedagogy/templates/starters.ts` to use derived objects for their compositional values:

- `vector-addition-r2`: `w` is currently `mkConcreteVector([rational(4), rational(1)])`. Replace with `mkDerivedVector(field, space, {op:'add', left:v1.id, right:v2.id}, {[v1.id]:v1, [v2.id]:v2}, {})`.
- `linear-combination-builder`: `combo` is currently `mkConcreteVector([rational(3), rational(2)])`. Replace with `mkDerivedVector(field, space, {op:'add', left: scaled_v1.id, right: scaled_v2.id}, ...)` — or more directly, use nested expressions once they are supported (see §3 below for scope note).
- `direct-sum-two-lines`: `v = (2,3)` is a sample vector, not compositionally derived — leave as concrete.
- `gram-schmidt-stepwise`: `orthoComp = v₂ - proj_{v₁}(v₂)` is a derived computation, but projection is not in the supported `VectorExpression` operations. Leave as concrete for now; Phase 11+ can add a `project` expression op.

---

## 3. Out of scope

**Nested / composed expressions.** `(2v₁ + 3v₂)` requires a derived vector whose expression is `scale(2, v1) + scale(3, v2)`, which requires nesting two expression levels. Part A's grammar supports one operation at a time: `2v` and `v + w` are legal, but `2v + 3w` is not. A user who wants `2v + 3w` creates `a = 2v`, `b = 3w`, then `c = a + b`. This is more verbose but keeps the type system and recomputation logic simple for Phase 10; nested expressions are a natural Phase 11 extension.

**Deletion cascades for derived objects.** If `v` is deleted and `w = v + u` is a derived vector depending on `v`, this Phase marks `w` as having a broken dependency but does not auto-delete it. The Inspector should show `w` as "broken" (dependency missing) and offer a delete button. Full cascade deletion (remove `w` when `v` is deleted) is a Phase 11 UX refinement.

**Editing existing objects.** Changing a concrete vector's components via the Inspector (not via drag) is not addressed here. The current affordances for mutation are drag (for 2D concrete vectors) and expression input (for new objects). Inline matrix editing and vector component editing in the Inspector are Phase 11.

**Bidirectional drag on derived objects.** A `DerivedVector` does not support the `onArrowDrag` handler — dragging a derived vector's arrow would require inverting the expression, which is not generally possible. The `onArrowDrag` wiring in `ViewContainer` checks `vec.kind === 'concrete'` before enabling drag; `'derived'` vectors render as non-draggable.

---

## 4. Implementation order

The four work items have the following dependency structure: AI-008 (deletion/selection) is independent and can land at any time. AI-007 (Inspector computed) requires no architectural changes and can also land independently. AI-006 (formula maps) requires only the expression evaluator, which is new code but not architecturally entangled. AI-009 Part A (parser extension) should land before AI-009 Part B (derived objects) because the parser changes are tested more easily in isolation. The recommended order:

1. AI-008: deletion + selection (no type changes, fast to ship and test)
2. AI-007: Inspector computed (no type changes, directly observable in the UI)
3. AI-006: formula map evaluator (`src/interaction/parser/evaluate.ts`, update `ObjectInput.tsx`)
4. AI-009A: parser extension (name resolution, `VectorExpression` / `MapExpression` parse results)
5. AI-009B: derived types in `src/types/`, derivation recomputation in `src/state/derivation.ts`, `ObjectInput` integration, template updates

---

## 5. Tests

**AI-006.** Unit tests for `evaluate.ts`: `evaluateFormula('(x + y, x - y)', {x: rational(1), y: rational(0)})` returns `[rational(1), rational(1)]`. Test non-linear input (`x * y`) returns an error. Test that `ObjectInput` creates a `matrix`-representation map with correct columns for a sample formula.

**AI-007.** Test that the Inspector renders computed values (not `'—'`) after a `useComputation` call resolves. Use the existing `MockAdapter` pattern from renderer tests.

**AI-008.** Test that `removeVector` removes the vector, closes its views, and removes its `namedObjects` entry. Test that `removeSpace` cascades to dependent vectors/maps. Test that `ObjectLibrary` calls `onSelect` on item click.

**AI-009A.** Unit tests for the extended parser: `parseInput('v + w', { v: {kind:'vector', id:vId}, w: {kind:'vector', id:wId} })` returns `{kind: 'vector-expression', expression: {op:'add', ...}}`. Test type mismatch error (map + vector). Test dimension mismatch error.

**AI-009B.** Unit tests for `recomputeDerived`: given a session with `v1=(1,2)`, `v2=(3,1)`, and `w = v1 + v2`, after `updateVector(v1 with components (2,2))`, `w.components` equals `(5,3)`. Test that a cycle in the derivation graph does not cause infinite recomputation. Property test (fast-check): for any two concrete vectors of the same dimension, a `DerivedVector` with `{op:'add'}` has components equal to the componentwise sum of its inputs.

---

## 6. Acceptance criteria

Phase 10 is complete when:

1. Typing `T(x, y) = (x + y, x - y)` in `ObjectInput` creates a matrix-representation map `[[1,1],[1,-1]]`, not the identity.
2. Selecting a matrix-representation map in `ObjectLibrary` populates the Inspector's "Computed" section with actual rank, nullity, and (if square) determinant values.
3. Objects can be deleted from the session via the `ObjectLibrary` ✕ button; deletion closes associated views and removes the object from `namedObjects`.
4. Typing `v + w` in `ObjectInput` where `v` and `w` are named session vectors creates a `DerivedVector` whose arrow updates in real time when `v` is dragged.
5. The vector-addition-r2 template shows `w` tracking `v₁` and `v₂` as they are dragged.
6. `pnpm verify` green; test count ≥ 340 (Phase 9 baseline: 312 + ~28 new tests from this phase).
