# Phase 6 — Layer 5: Interaction Layer

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Layer 5: Interaction Layer"
**Depends on:** Phases 0–5 complete.

---

## 1. Goal

Turn the renderers from static views into a responsive sandbox. The user must be able to define mathematical objects (typing a matrix, dragging a vector, entering a linear map formula), parameterize them (sliders for scalars, toggles for field selection, basis selectors), and watch the consequences propagate through every open view simultaneously.

Phase 6 is where the project's foundational claim — that this is a *sandbox*, not a presentation system — becomes operative. The architecture's design principle "the internal representation of mathematical objects must be first-class — decoupled from both how they are computed and how they are rendered" is what makes the interaction layer possible; Phase 6 is the layer that exercises that decoupling.

---

## 2. Scope

The architecture identifies four sub-concerns for this layer. Phase 6 implements all four, in roughly the staging order below.

### 2.1 Direct manipulation

Dragging a vector in a geometric view should update the vector in session state, trigger any cached derived computations to invalidate, and propagate to all other open views of the same vector.

**Mechanism.** Each geometric renderer accepts a `onObjectDrag?: (objectId, newData) => void` prop. The renderer's drag implementation calls this callback during drag (throttled to ~16ms for smooth update) and on drop. A wrapper component in `src/interaction/` connects the callback to the Zustand store, dispatching the appropriate update action.

**Scope of "draggable" in Phase 6.**

- Vectors in `Geometric2DRenderer` and `Geometric3DRenderer` — drag the tip, components update.
- Vectors with `kind: 'abstract'` cannot be dragged geometrically; the wrapper checks and the drag handle is suppressed at the renderer level.
- Subspace generators (the `span` representation's generator vectors) — drag updates the subspace.
- Linear map images of basis vectors (visible in `grid-deformation-2d/3d`) — drag updates the corresponding column of the matrix representation. This is the visualization-as-input pattern that makes the tool feel responsive.

**Out of Phase 6 scope.** Dragging eigenvectors (eigenvectors are *derived* — they cannot be edited directly, only the underlying operator can). Dragging entries of a matrix heatmap (treat as display-only in Phase 6; matrix editing happens via input parsing). Rotating the 3D camera with drag is renderer-level affordance and may already be in Phase 5 via R3F's `OrbitControls`.

### 2.2 Parameter controls

Sliders, selectors, toggles. Implemented as React components in `src/interaction/controls/`. Each control is bound to a session-state slice via a small adapter — the control receives the current value as a prop and dispatches an update action on change.

**Controls to implement.**

- `ScalarSlider` — adjust a single rational scalar within a range. Used for: matrix entry editing, linear combination coefficients, animation parameter scrub.
- `FieldToggle` — ℝ / ℂ switch. Bound to `session.field`. Master PRD §8.4 fixes the spelling.
- `BasisSelector` — dropdown choosing among bases for a given space. Bound to `session.selectedBasis[spaceId]`.
- `ExactNumericalToggle` — when both tracks are available, choose which to display. Local to a view, not session-level.
- `ProvenanceFilter` — show only exact results, only numerical, or both. Affects the renderer's prop extraction, lives in view props.

Controls live next to the view they affect — either in a small overlay on the view, or in an inspector panel adjacent to the grid. Phase 6 picks one (recommendation: per-view overlay for object-specific controls, session-level inspector for global state like field). Decide and record.

### 2.3 Input parsing

The user must be able to define objects by typing. A small expression parser lives in `src/interaction/parser/`. The grammar is intentionally narrow — this is not a CAS frontend, it's an entry mechanism for the object kinds the type system supports.

**Grammars to support, in priority order.**

1. **Matrix literal**: `[[1, 2, 3], [4, 5, 6]]` or the more compact `[1, 2; 3, 4]`. Whitespace-insensitive. Entries can be rationals (`1/2`), integers, decimals (`1.5` → parsed as float with provenance flag), or simple complex literals (`1+2i`). The parser produces a `Matrix` value with the appropriate field inferred.
2. **Vector literal**: `(1, 2, 3)` or `[1; 2; 3]`. Produces a concrete vector in the appropriate `Fn` space.
3. **Polynomial literal**: `2*x^2 + 3*x + 1`. Coefficients in the configured field. Produces a `Polynomial`.
4. **Linear map by formula**: `T(x, y, z) = (x + y, 2z, x - z)`. Produces a `LinearMap` with `representation.kind === 'formula'`.
5. **Linear map by matrix**: bare matrix literal in a "Define linear map" context. Produces a `LinearMap` with `representation.kind === 'matrix'` and an inferred standard-basis domain/codomain.

**Error handling.** Per master PRD §8.3, parse errors are `UserFacingError` objects, *not* exceptions. The parser returns `Result<T, UserFacingError>`. Errors include: position, expected vs. found tokens, a one-line human-readable message, and a machine-readable error code. The UI surfaces the position by highlighting the offending span in the input field.

**Ambiguity.** Where input is ambiguous (e.g., `[1, 2]` could be a 2-vector or a 1×2 matrix), the parser does **not** guess. It returns a `disambiguation` result with the alternatives, and the UI shows a small inline picker. This is the master PRD §3.3 "surface, don't bury" principle: silent guessing creates phantom bugs.

**Library choice.** Phase 6 should pick: hand-rolled recursive-descent parser, or a library (Chevrotain, Nearley, PEG.js). Recommendation: hand-rolled. The grammar is small enough (~6 production rules), and the diagnostic quality of hand-rolled parsers is dramatically better than generated ones for tools at this scale. Record as ADR.

### 2.4 Animation timeline

Continuous transformations — basis change, SVD decomposition unfolding, Gram-Schmidt steps, grid deformation interpolation — are animated via a scrub bar.

**Data model.** A timeline is a list of keyframes; each keyframe is a `SessionSnapshot` (the same shape the undo stack uses). The animation interpolates between consecutive keyframes by:

- For numerical scalars: linear interpolation between values.
- For matrices: linear interpolation entry-wise (caveat: this is *not* a group-theoretically correct interpolation through SO(n) etc., it's a visual hint; the architecture treats this as visualization, not as a mathematical claim).
- For discrete steps (Jordan chain, row reduction): no interpolation; the scrub bar advances stepwise.

**Mechanism.** A `TimelineProvider` context in `src/interaction/timeline/` exposes the current scrub position. Renderers that opt into animation read from this context and interpolate their props. Most renderers do not need to opt in; only `Geometric2DRenderer`, `Geometric3DRenderer`, `MatrixRenderer`, and (for stepwise) `DiagramRenderer` do.

**Out of Phase 6 scope.** Recording user actions into a timeline automatically. Loop playback. Variable-speed playback. Phase 6 ships a static keyframe list + scrub + play/pause; the rest can be added later.

### 2.5 View management

Opening, closing, and arranging views.

Phase 5 shipped a `ViewGrid` that reads `session.views` and renders them. Phase 6 adds the controls that mutate `session.views`:

- A "View as…" menu, populated by `visualizerRegistry.getApplicable(kind, obj, session)`. Each menu item dispatches `openView`.
- A close button on each view that dispatches `closeView`.
- A drag handle on each view that reorders views within the grid (the grid arrangement is stored as an ordering on `session.views`).
- Optional: a "duplicate view" affordance for opening the same visualizer twice with different parameters (e.g., two copies of `grid-deformation-2d` side-by-side showing before/after, useful for the same-name visualizer but different rendered states during animation).

---

## 3. Tests

### 3.1 Drag dispatch

Component-level tests using React Testing Library: simulate a drag on a vector arrow, assert the store receives the correct update action with the correct new components. Verify that views of the same vector update in tandem (subscribe two `ViewContainer`s and assert both re-render with new props).

### 3.2 Parser

Per-grammar tests, including:

- Valid input parses to the expected Layer 0 value.
- Invalid input returns a `UserFacingError` with the correct error code.
- Ambiguous input returns a `disambiguation` result with all valid alternatives.
- Position information in errors points at the correct span.

Property-based tests (`fast-check`) for the matrix/vector grammars: generate a random matrix, serialize it via a known printer, parse it back, assert round-trip identity. This catches whitespace, separator, and field-inference bugs.

### 3.3 Controls

Each control: assert it renders with the current value, dispatches the correct action on change, and is disabled when the bound value isn't editable (e.g., `BasisSelector` is disabled for spaces with only one registered basis).

### 3.4 Timeline

A timeline with three keyframes; scrub to position 0.5 between keyframes 1 and 2; assert the interpolated session value matches the expected mid-state. Test that stepwise animations (Jordan chain) advance correctly with discrete scrub positions.

### 3.5 End-to-end integration

One representative flow: user types `T(x, y) = (x + y, x - y)` in the linear-map input, the parser produces a `LinearMap`, the session stores it, the registry returns applicable visualizers, `grid-deformation-2d` and `eigenline-2d` views open, the user drags one of the basis-image vectors, the underlying matrix updates, eigenvalues recompute via the engine, and the eigenline view updates accordingly. This test is the proof that the four layers (compute, state, registry, renderers) and the interaction layer all compose correctly.

---

## 4. Acceptance criteria

Phase 6 is complete when:

1. Drag-to-edit works for vectors in both 2D and 3D renderers, for subspace generators, and for linear map image vectors in grid-deformation views.
2. The five parameter controls in §2.2 are implemented and bound to session state.
3. The expression parser handles all five grammars in §2.3, with structured errors and disambiguation prompts where ambiguous.
4. The animation timeline supports continuous interpolation for numerical matrices and stepwise advancement for discrete sequences.
5. The "View as…" menu, close button, and reorder drag work on every view in the grid.
6. The end-to-end integration test in §3.5 passes.
7. `pnpm verify` is green.
8. All Phase 6 changes are visible in the dev server with smooth interaction (no perceptible lag on a typical drag).
9. Devlog entries written; `Program/PRD/00 §7` roadmap updated.

---

## 5. Out of scope

- Keyboard shortcuts beyond what's necessary for input fields. A full shortcut system can come later.
- Undo/redo UI buttons (the actions exist in the store from Phase 3; surfacing them is a single button each and may land opportunistically).
- Recording user actions into a timeline automatically. Phase 6 keyframes are manually constructed.
- Collaborative editing. Architecture excludes.
- Touch gestures. Mouse and keyboard only for Phase 6; touch can be added if/when needed.
- Mobile responsiveness as a first-class goal. The tool is expected to be used on desktop or large tablet; layouts can degrade on smaller screens but shouldn't be designed for them.

---

## 6. Open design questions

- **Where do parameter controls live visually?** Recommendation: per-view overlays for object-specific controls (scalar sliders that adjust a vector), a session-level inspector panel for global state (field toggle, default axis range). Confirm.
- **Parser library or hand-rolled?** Recommendation: hand-rolled. Confirm in an ADR.
- **Throttle rate for drag callbacks.** Recommendation: 16ms (one frame at 60fps). If engine recomputation can't keep up, lower the dispatch rate but keep the visual update at 16ms — interpolate from the last engine result.
- **Disambiguation UI shape.** When `[1, 2]` could be a vector or a matrix, what does the user see? Recommendation: a small inline chip with "as vector / as matrix" buttons, picker dismisses on selection. Confirm.

---

## 7. Risks

- **Drag performance with engine round-trips.** Dragging a vector that's the input to an expensive symbolic computation (e.g., Jordan form of a matrix derived from the vector) will produce a recompute every 16ms. The engine cache (Layer 2 §2.1) handles repeat queries; new positions are new cache keys. Mitigate: dragging dispatches the update but does *not* trigger the symbolic track of the engine — only numerical updates run during drag. On drop, both tracks run. This is consistent with master PRD §8.1's exact-vs-numerical distinction; record it as a Decision when implemented.
- **Parser ambiguity proliferating.** The five grammars share enough surface syntax (`[`, `(`, parens, commas, semicolons) that ambiguity cases will multiply. Mitigate: each grammar is parsed in a context-specific entry field where possible (a "Define matrix" field only parses matrix grammar). Cross-grammar entry is the exception, and disambiguation handles it.
- **Animation correctness vs. honesty.** Linear interpolation of matrix entries between two keyframes does *not* in general produce a geometrically meaningful intermediate state (it can pass through singular matrices, for instance). This is acceptable for visualization — the architecture treats animation as illustrative, not as a mathematical claim — but the UI should not present interpolated states as if they were exact computed results. Make sure provenance badges read `'animated'` (or similar) during scrub, not `'exact'`.

---

## 8. Handoff to Phase 7

When Phase 6 is complete, the tool is a working sandbox: a user can define objects, manipulate them, and observe consequences across views. What it lacks is *guidance* — a user who doesn't already know linear algebra can't tell what to do with it. Phase 7 (Pedagogy Layer) adds the definition catalog, scene templates, example/counterexample generator, and chapter navigation that turn the sandbox into a learning tool.

The Phase 7 PRD is at `PRD/08 — Layer 6 (Pedagogy Layer).md`. It is more open-ended than the prior phases by design — see its §1 for why.
