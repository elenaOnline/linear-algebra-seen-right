# Pre-Stage-5 Prerequisites

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Depends on:** Phases 0–4 complete, Phase 5 Stages 1–4 complete
**Precedes:** Phase 5 Stage 5 — `Geometric2DRenderer`

---

## 1. Purpose

Stage 5 (`Geometric2DRenderer`) is the first renderer that displays geometric data — vectors as arrows, axes, grid deformations, eigenlines. For it to render anything meaningful beyond loading spinners, several structural gaps need to be closed first. This PRD captures what needs to land before Stage 5 begins.

Three of the items listed here were bugs caught in a pre-Stage-5 audit and are already resolved. The rest are forward-looking prerequisites.

---

## 2. Already resolved (in the pre-Stage-5 audit session)

- **Dead `case 'diagram'`** in `src/ui/ViewContainer.tsx` — duplicate switch case removed.
- **LaTeX strings in SVG nodes** — `kernel-range-diagram.toProps` and `subspace-lattice.toProps` were calling `spaceToLatex()` (a KaTeX-format function) for DiagramRenderer node labels, which rendered as raw LaTeX text like `\mathbb{R}^2`. Fixed by adding `spaceToDiagramLabel()` that uses Unicode (ℝ, ℂ) and plain notation.
- **`objectId: T.domain` in LinearMap toProps** — All LinearMap `toProps` functions were setting `objectId` to the map's domain `SpaceId` rather than the map's own `MapId`. Phase 6 interaction wiring will bind `objectId` to the rendered view for click/drag callbacks; using the wrong ID would silently break that binding. Fixed by changing to `objectId: T.id` throughout.

---

## 3. Prerequisites to resolve before Stage 5

### 3.1 Split `src/registry/index.ts`

**Why now.** The file is 550+ lines and will cross ~700 lines after Stage 5 adds geometric `toProps` bodies with component extraction, axis data, and grid data. Splitting before Stage 5 adds more content is significantly cleaner than splitting after.

**Split plan:**

```
src/registry/
├── types.ts          — RendererKind, RendererProps (and subtypes), MathObject, MathObjectKind, Visualizer<T>
├── helpers.ts        — scalarToLatex, scalarToNumber, concreteVectorToLatex, spaceToLatex, spaceToDiagramLabel, spaceDimLabel, computeRank, matrixToProps, mapDim helper
├── defaults.ts       — LINEAR_MAP_VISUALIZERS, VECTOR_SPACE_VISUALIZERS, VECTOR_VISUALIZERS, registerDefaults()
└── index.ts          — VisualizerRegistry class, visualizerRegistry singleton, re-exports from types.ts
```

All current consumers import from `src/registry/index.ts`. The re-export pattern keeps those imports unchanged.

**Acceptance.** `pnpm verify` green. No import paths in other files need to change.

---

### 3.2 Wire `useComputation` to the engine

**Why.** The `useComputation` hook in `src/ui/hooks/useComputation.ts` has the right shape but is not connected to anything — it has no reference to a `ComputationEngine` instance. Stage 5's geometric visualizers fall into two categories:

- **No engine needed (immediate rendering):** `arrow-2d` for concrete vectors, `coordinate-axes-2d`, `grid-deformation-2d` for matrix-kind maps. These can ship real `toProps` bodies right now without any computation.

- **Engine needed (currently `LoadingProps`):** `grid-deformation-2d` for formula-kind maps, `eigenline-2d` (needs eigenvectors). These require the `matrixOf` or `eigendecompose` engine operations.

The decision: Stage 5 can ship the first group immediately. The second group ships loading spinners until `useComputation` is wired. However, the hook architecture needs to be in place and functional before Stage 5 ships *any* view that the user expects to animate or update.

**What "wired" means concretely:**
1. A shared `ComputationEngine` instance (using `PyodideClient` in production, `MockSymbolicAdapter` in tests) exported from a new `src/compute/engineInstance.ts` — analogous to how `defaultStore` is the shared Zustand instance.
2. `useComputation` updated to call `engine.matrixOf(...)` or `engine.eigendecompose(...)` depending on the operation key, and write results via `defaultStore.getState().completeComputation(...)`.
3. A `ComputationKey` derivation function that content-addresses the operation + inputs so cache hits work correctly.

**Scope decision.** Building and testing the real Pyodide path is gated on AI-004 (already resolved). The engine instance can use `MockSymbolicAdapter` in tests and `PyodideClient` in the app. Stage 5's `toProps` bodies for the formula-kind cases should be written to read from `session.getCachedResult(key)` and return `LoadingProps` when absent, with the component calling `useComputation` to trigger the fill.

**Acceptance.** A test that:
1. Creates a formula-kind map in the store
2. Opens a `'diagram'` view for it (triggering `useComputation` for a mock operation)
3. Confirms the view eventually transitions from `LoadingState` to rendered content once the mock resolves

---

### 3.3 Fix `spaceIdOfMatrix` cast in `engine.ts`

**Why.** Three places in `src/compute/engine.ts` (lines ~101–103, ~357, ~409) use `as unknown as SpaceId` to convert a `BasisId` into a `SpaceId` when tagging result vectors (eigenvectors, null-space vectors). This was deferred from AI-001 with the note "works for square operators because nothing reads the SpaceId structurally yet."

Stage 5 will wire `useComputation` to real engine calls. When `eigendecompose` returns eigenvectors, those vectors will be tagged with the wrong `SpaceId`. Any subsequent session store action, visualizer `applicable` predicate, or `toProps` that checks `v.space` will get incorrect results.

**What "fixed" means:**
- Thread a `SessionView` parameter through to `eigendecompose`, `nullSpace`, and `gramSchmidt` in the `ComputationEngine` interface.
- Replace the `spaceIdOfMatrix` helper with a proper lookup: `sessionView.getSpaceForBasis(M.domainBasis)`.
- This is a small change to the interface (add optional `sessionView?: SessionView` to `opts`) and the three call sites in the Engine class.

This should land in the same session as 3.2, since the engine instance and its interface will be touched anyway.

---

### 3.4 Update `src/demo.ts` for Stage 5

**Why.** The current demo shows symbolic, matrix, and diagram views. Stage 5 will add geometric views. The demo should include a concrete vector view that exercises `arrow-2d` so the geometric renderer is visible immediately on the dev server.

**Change.** Add an explicit vector in ℝ² (already exists as `v = (3/4, -1/2)`) opened as a `'geometric_2d'` view. This triggers `arrow-2d.toProps` which can extract components from the concrete vector without any engine call.

**Acceptance.** `pnpm dev` shows a view card with a rendered 2D arrow for the vector.

---

## 4. Acceptance criteria for this PRD

This PRD is complete when:

1. `src/registry/index.ts` split into `types.ts`, `helpers.ts`, `defaults.ts`, `index.ts`; all existing consumers unchanged; `pnpm verify` green.
2. `src/compute/engineInstance.ts` exports a shared engine instance.
3. `useComputation` is functionally wired: it can trigger an engine call, write to `computationCache`, and the component re-renders with the result.
4. `spaceIdOfMatrix` cast removed from `engine.ts`; result vectors from `eigendecompose` and `nullSpace` carry correct `SpaceId`s.
5. Demo seed includes a `'geometric_2d'` view for the existing concrete vector.
6. `pnpm verify` green throughout.

---

## 5. Out of scope

- Full implementation of Stage 5 renderer (`Geometric2DRenderer` itself)
- D3 installation (needed by Stage 5, deferred until Stage 5 begins)
- Any changes to `PRD/06 — Layer 4 (Renderer Plugins).md` itself
- Pedagogy layer, interaction layer
