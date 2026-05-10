# Phase 3 — Layer 2: Session State

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Layer 2: Session State"
**Depends on:** Phase 1 (Layer 0) and Phase 2 (Layer 1) complete

---

## 1. Goal

Manage the global mathematical context of a user's session. The store is the single source of truth for: which mathematical objects exist, what they're named, the active basis per space, the chosen field, the history stack for undo/redo, and the currently open views.

Layer 2 is *thin*. It does not compute (Layer 1's job), it does not render (Layer 4's job), it does not parse user input (Layer 5's job). It holds state, exposes selectors, and dispatches changes. Doing more is over-reach.

---

## 2. Scope

### 2.1 Store shape

Implement the architecture's `MathSession` type as a Zustand store. Augment with what running the engine actually requires:

```typescript
type MathSession = {
  // Core mathematical content
  field:         Field
  spaces:        Map<SpaceId,    VectorSpace>
  subspaces:     Map<SubspaceId, Subspace>
  maps:          Map<MapId,      LinearMap>
  vectors:       Map<VectorId,   Vector>
  bases:         Map<BasisId,    Basis>
  innerProducts: Map<IPId,       InnerProduct>

  // Session-level choices
  selectedBasis: Map<SpaceId, BasisId>
  namedObjects:  Map<string, MathObjectRef>   // "T", "V", "v₁", etc.

  // Async computation state
  pendingComputations: Map<ComputationId, ComputationDescriptor>
  computationCache:    Map<ComputationKey, ComputationResult>

  // Views (set of currently open visualizers)
  views:         View[]

  // History for undo/redo
  history:       SessionSnapshot[]
  historyCursor: number
}
```

Rationale for additions beyond the architecture:

- `pendingComputations` makes async work observable — Layer 4 renders skeletons, Layer 6 disables actions waiting on results, etc.
- `computationCache` keeps repeated calls cheap. Keys are content-addressed (e.g., `eigendecompose:matrix-hash`) so the cache survives ID renaming. Eviction policy is LRU with a small bound (~256 entries) for now; revisit if memory becomes an issue.

### 2.2 Selectors

Expose a small selector library for the patterns consumers will repeat:

- `getSpace(state, id): VectorSpace | undefined`
- `getMatrixOf(state, mapId, sessionContext?): Matrix | undefined` — looks up a `LinearMap` and resolves its matrix in the currently selected bases for its domain and codomain. (Cached via `computationCache`.)
- `getActiveBasis(state, spaceId): Basis | undefined` — returns the basis from `selectedBasis`, falling back to a constructed standard basis where applicable (the standard basis on `Fn` is canonical and need not be created explicitly by the user).
- `getNamed(state, name): MathObjectRef | undefined`
- `dimOf(state, spaceId): number | 'infinite' | undefined`

Selectors are pure functions over `MathSession`. They live in `src/state/selectors.ts`. They never mutate. They never call Layer 1 — that is what `pendingComputations` is for.

### 2.3 Actions

Actions are the only way state changes. Define one action per logical operation:

- **Object creation:** `addSpace`, `addSubspace`, `addMap`, `addVector`, `addBasis`, `addInnerProduct`. Each accepts the constructed object (already validated by Layer 0 factories) and returns the assigned ID.
- **Object naming:** `nameObject(name, ref)`, `unname(name)`. Names are strings the user types ("T", "V", "v₁"); they map to typed `MathObjectRef = { kind: 'space' | 'map' | ... ; id: ... }` discriminated unions.
- **Basis selection:** `setActiveBasis(spaceId, basisId)`. Triggers no recomputation — observers re-derive on read.
- **Field switch:** `setField(field)`. Documented to invalidate visualizations of complex eigenvalues when switching to ℝ; the action itself does not delete objects.
- **Computation lifecycle:** `startComputation`, `completeComputation`, `failComputation`, `cancelComputation`. Driven by Layer 1's API responses.
- **Views:** `openView(view)`, `closeView(viewId)`, `setViewProps(viewId, props)`.
- **Undo/redo:** `undo()`, `redo()`. See §2.5.

Actions never return promises. Async work is initiated outside the store (in Layer 1 wrappers or Layer 5 handlers); the store records the pending state and the eventual result via separate actions.

### 2.4 IDs and the `namedObjects` map

The user thinks in names ("T", "V"). The store thinks in IDs. The mapping is many-to-one (one object can have multiple names — aliases — though this is not exposed in Phase 3) and one-name-to-one-ref (a name resolves to exactly one current object).

Renaming an object updates `namedObjects` only; the underlying ID is stable.

### 2.5 Undo / redo

History is a stack of `SessionSnapshot`s, each a structural-equality copy of the relevant slice of state at the moment of the action. Use Immer or an equivalent immutable-update library inside the store so snapshots are cheap (structural sharing).

- Most actions push a snapshot. Internal lifecycle actions (`startComputation`, `completeComputation`) do **not** push — undo should not rewind background computations.
- `undo()` decrements `historyCursor`; `redo()` increments. The current state is `history[historyCursor]`.
- A redo branch is invalidated by any new action — standard behavior.
- History bound: 100 entries. Older entries are dropped. Document this and surface to the user once UI exists.

### 2.6 Persistence (deferred but planned)

Phase 3 does **not** persist sessions. The store shape, however, is designed so that serialization is straightforward when persistence is added (Phase 6+). This means:

- All mathematical objects are referenced by ID (already true).
- `MathObjectRef` and similar tagged union references serialize by definition.
- `SymExpr` opaque handles are serialized via their stored string form (Phase 2 already arranged this).

Document the serialization shape (a JSON object closely mirroring `MathSession`) in a comment in `src/state/serialization.ts`. Even if no encoder is implemented, the shape is part of the spec.

### 2.7 `SessionView` from Layer 0

Layer 0 declares a read-only `SessionView` interface. Layer 2 implements it as a wrapper around the Zustand store. Pass the wrapper into Layer 0 functions that need it. This keeps the dependency direction clean (Layer 0 has no import of Zustand).

---

## 3. Tests

### 3.1 Action correctness

For each action, test that:

- The action mutates only the slices it should.
- Repeated calls are idempotent where they should be (e.g., `setActiveBasis` to the current value is a no-op for history).
- The history stack receives an entry for user-facing actions only.

### 3.2 Selectors

For each selector:

- Returns `undefined` for unknown IDs.
- Returns the correct object for known IDs.
- Cached selectors (those backed by `computationCache`) hit the cache on the second call and miss on the first.

### 3.3 Undo/redo

- Linear sequence: action → undo → redo → identical state.
- Branching: action A → action B → undo → action C invalidates redo of B.
- Bound: pushing > 100 entries drops the oldest.

### 3.4 Serialization shape

A test that constructs a representative session, runs the (possibly unimplemented) `serialize()` function, and asserts the output matches a snapshot. If `serialize()` is not yet implemented, this test is `xtest`'d but committed — its presence is the contract.

---

## 4. Acceptance criteria

Phase 3 is complete when:

1. The Zustand store at `src/state/store.ts` exposes the `MathSession` shape in §2.1.
2. All actions in §2.3 are implemented and tested.
3. All selectors in §2.2 are implemented and tested.
4. Undo/redo works as specified in §2.5.
5. Layer 0 functions that need session context accept `SessionView` and Layer 2 supplies an implementation.
6. Layer 2 has zero imports from Layer 3 or higher (enforced by the lint boundary rule introduced in Phase 1).
7. The store handles a contrived end-to-end flow: create space → create vector → create map → request eigendecomposition → receive result → undo back to empty. This flow is encoded as an integration test.
8. `pnpm verify` is green.
9. `Program/PRD/00 — Development Standards.md` §7 is updated.
10. A devlog entry is written.

---

## 5. Out of scope

- Persistence (deferred — see §2.6).
- Multi-session / collaborative state. The architecture explicitly excludes this.
- Optimistic updates. Computations either complete or don't; the store reflects whichever the engine reports.
- Time-travel debugging beyond simple undo/redo (e.g., jumping to arbitrary history points). The 100-entry stack is sufficient.

---

## 6. Open design questions

- **Snapshot granularity.** Does undo step back over an entire compound action, or over each sub-step? Recommendation: compound actions push a single snapshot, with sub-steps collapsed. Confirm.
- **Cache key strategy for `computationCache`.** Hashing matrices for cache keys is non-trivial. A canonical-form serializer is needed. This overlaps with Phase 2's worker bridge; reuse if possible.
- **Whether `setField` invalidates `selectedBasis`.** Switching from ℝ to ℂ keeps the same vector spaces meaningful (a real basis is also a complex basis), so probably no. Switching from ℂ to ℝ is more delicate — a complex basis isn't necessarily a real one. Decision needed.
- **View identity.** How do views compare for re-rendering? By position in the array? By a stable view ID? Recommendation: stable view IDs assigned on `openView`. Confirm.

---

## 7. Risks

- **Map serialization.** `Map<K, V>` does not serialize natively to JSON. Phase 3 either uses a serialization helper that converts maps to arrays-of-tuples, or replaces `Map` with plain objects keyed by ID. The former preserves type intent better; the latter is simpler. Decide and document.
- **Cache invalidation.** `computationCache` keyed on content survives ID renaming, but if a `Matrix` is mutated in place it becomes a stale cache hit. Phase 3 enforces immutability of mathematical objects in the store (Immer helps here) and adds a lint rule against mutating values returned from selectors.
- **Pending-computation memory leak.** If a request is fired and the user closes the view before it completes, the entry in `pendingComputations` lingers. Phase 3 either ties pending entries to view lifecycles or implements a TTL. Decide.

---

## 8. Handoff to Phase 4

When Phase 3 is complete, the project has a working spine: types, computation, state. The next phase (Layer 3 — Visualization Registry) is what makes that spine visible to a user. Its sub-PRD will be authored when Phase 4 begins.

Before authoring that sub-PRD, the agent should:

1. Re-read `Technical Architecture.md` §"Layer 3: Visualization Registry".
2. Skim the current `src/types/`, `src/state/`, and `src/compute/` to understand the actual shapes the registry has to dispatch on (which may differ from the architecture's sketches by then — record any deltas as Decisions).
3. Surface in `NOTES.md` any open architectural questions before drafting the registry PRD.
