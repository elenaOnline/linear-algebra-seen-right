# DEVLOG

Chronological session log. Most recent entry at the top. One entry per work session.

See `PRD/00 — Development Standards.md` §6.1 for the entry format. Brief reproduction:

```markdown
## YYYY-MM-DD — short session title

**Touched:** [layers, files, or "PRD set" / "dev-notes"]
**Status:** in progress / complete / blocked on [thing]

What I did, in 2–6 sentences. Outcomes, not narration.

**Notable:** [Surprises, decisions made, things that almost broke. Optional.]

**Next:** [If incomplete: what the next agent should pick up. Be specific.]
```

A devlog entry should usually be under 20 lines. If it's longer, the excess probably belongs in `NOTES.md`.

---

## 2026-05-12 — Phase 8 bug fixes (four issues post-launch)

**Touched:** `src/ui/LatexText.tsx` (new), `src/ui/BrowseMode.tsx`, `src/ui/ViewCard.tsx`, `src/ui/ViewContainer.tsx`, `src/state/store.ts`, `src/pedagogy/loadScene.ts`, `src/ui/App.tsx`
**Status:** complete

Fixed four issues discovered after Phase 8 deployment.

(1) **LaTeX not rendered in Browse mode.** New `LatexText` component splits text on `$...$` delimiters and runs math segments through `katex.renderToString` with `dangerouslySetInnerHTML`. Replaces raw text rendering in card teasers, expand blocks, and side-panel definition section.

(2) **"Open in Sandbox" produced an empty session.** Root cause: `loadScene` called `resetSession()` then `addSpace()`/`openView()` as separate Zustand `set()` calls. React could see the intermediate empty state. Fix: new `applyScene(build)` store action does the full reset + object insertion + view opening atomically in one Immer transaction, one `set()` call. `handleOpenInSandbox` now has try/catch — build failure keeps the user in Browse rather than silently clearing the session.

(3) **"+ view" dropdown obscured by renderer.** SVG/WebGL tile bodies create CSS stacking contexts that clip `position: absolute` children regardless of `z-index`. Fix: `createPortal(..., document.body)` with `position: fixed` coordinates from `getBoundingClientRect`. Outside-click handler via `window.addEventListener('mousedown')`.

(4) **Vector drag registers movement but doesn't update visual.** Root cause: `onArrowDrag` in `ViewContainer.tsx` called `mkConcreteVector(...)` which calls `vectorKey(space)` — a counter-based ID generator. Every drag created a new vector under a new ID. `updateVector` stored it at the new key; the view's `objectRef` still pointed to the original key. Fix: spread the original vector and replace only `components`, preserving `vec.id`.

**Next:** Phase 9 (Content Expansion). No new UI. Content work: definition records for Chapters 3–9, flesh out the 14 placeholder scene templates, expand generator constraints toward ~30.

## 2026-05-12 — Phase 8 complete: Pedagogy Layer

**Touched:** `src/pedagogy/` (new), `src/ui/BrowseMode.tsx` (new), `src/ui/ObjectLibrary.tsx` (new), `src/ui/Inspector.tsx` (new), `src/ui/GeneratorPanel.tsx` (new), `src/state/store.ts` (resetSession), `scripts/build-definitions.ts` (new), `package.json`, `PRD/00`, `PRD/08`
**Status:** complete

Definition build script (`scripts/build-definitions.ts`) parses all 135 markdown files in `LADR_Definitions/` using `unified` + `remark-parse` (ADR-016), merges field-level overrides from `src/pedagogy/definitions/overrides.ts`, and generates `src/pedagogy/definitions/generated.ts`. Chapter 1–2 definitions (24 records) have full overrides: sections, prerequisites, linked visualizers, examples, non-examples, and common errors.

Browse mode (`BrowseMode.tsx`): catalog grid auto-filling at minmax(280px,1fr), concept cards (Geist Mono title, STIX formalStatement teaser, "Read definition ⌄" expand, kind badge, prerequisite count), filter chips, search, and a fixed side panel (definition block, examples/non-examples, prerequisite pills, "Open in Sandbox" CTA). Chapters 3–9 cards render with default overrides (symbolic only).

Sandbox three-column layout: `ObjectLibrary` (left 220px — grouped objects with accent selection), `ViewGrid` (center, existing), `Inspector` (right 280px — definition properties, computed properties with `—` placeholders, "Open as" pill links).

`resetSession` store action (ADR-017) clears the session before loading a scene template. Five starter templates ship (`rn-vector-space`, `span-of-two-vectors-in-r2`, `linear-combination-builder`, `basis-as-coordinates`, `rank-nullity-2d`) plus 14 placeholder stubs.

Example generator (`GeneratorPanel.tsx`): 7 starter constraints — nilpotent operator, non-diagonalizable, self-adjoint with spectrum, direct sum, non-direct sum, linearly dependent set, unitary/orthogonal — each with an Axler-referencing explanation. "Add to session" opens matrix + diagram views. Rendered as a section in the Inspector panel. 312 tests passing.

**Next:** Phase 9 (Content Expansion) — definition records for Chapters 3–9, additional scene templates, expanding generator constraints toward ~30. No new UI; content follows Phase 8 patterns.

## 2026-05-12 — Phase 7 complete: Design System Integration

**Touched:** `index.html`, `src/main.tsx`, `src/styles/tokens.css` (new), `src/ui/App.tsx`, `src/ui/KindBadge.tsx` (new), `src/ui/ProvenanceBadge.tsx`, `src/ui/ViewCard.tsx`, `src/ui/ViewContainer.tsx`, `src/ui/ViewGrid.tsx`, `src/ui/ViewErrorBoundary.tsx`, `src/ui/LoadingState.tsx`, `src/ui/TimelineScrubBar.tsx`, `src/ui/ObjectInput.tsx`, `src/interaction/controls/FieldToggle.tsx`, `.prettierignore`, `PRD/00`, `PRD/09`
**Status:** complete

Five stages. Stage 1: Google Fonts link (Geist, Geist Mono, STIX Two Text) in `index.html`; CSS token stylesheet (`src/styles/tokens.css`) imported in `main.tsx`; `data-palette="bone"` on `<body>`. Stage 2: `App.tsx` rewritten with design-spec top bar — brand mark (*L* in STIX italic), Browse/Sandbox mode toggle, field pill with accent dot and STIX italic field symbol, undo/redo. Stage 3: `ProvenanceBadge` upgraded to exactness chip (`.exactness-chip.exact` / `.exactness-chip.approx`); new `KindBadge` component (`.kind-badge.geo/.abs/.mat/.spec/.sym`) mapping all six `RendererKind` values. Stage 4: `ViewCard` rebuilt with tile-head/tile-body/tile-foot structure; tile-foot shows field + basis metadata; all eight Sandbox UI components migrated to CSS tokens (zero hardcoded hex values in `src/ui/`). Stage 5: `ObjectInput` upgraded with 11-button symbol palette (ℝ, ℂ, λ, σ, ∈, ⊆, ⊕, ⊗, ⟨·,·⟩, matrix/vector templates); expression field uses STIX italic font. One `MatrixRenderer` test updated for new badge text (`'approximate'` instead of `'≈'`). 312 tests passing. Live at https://linear-algebra-seen-right.netlify.app.

**Verified live:** `--bg: #f2f1ef` (Bone palette), `--font-sans: "Geist"`, 12 kind badges, Browse/Sandbox toggle, symbol palette buttons, zero JS errors.

**Next:** Phase 8 — Pedagogy Layer. Start with the definition build script (`scripts/build-definitions.ts`), then Browse mode UI. Every new component must use CSS tokens.

## 2026-05-11 — Roadmap restructured; PRD/09 authored; PRD/08 revised to Phase 8

**Touched:** `PRD/00` (roadmap §7), `PRD/08` (Phase 7 → Phase 8, architecture correction, design integration woven throughout), `PRD/09` (new — Phase 7: Design System Integration), `dev-notes/CONTEXT.md`
**Status:** complete

Inserted a new Phase 7 (Design System Integration) between Phase 6 and the Pedagogy Layer. Created `PRD/09 — Design System Integration.md` — five stages: foundation (fonts + tokens), app shell (top bar per design spec), honesty system (kind chip + exactness chip on all views), sandbox tile chrome (tile-head/body/foot structure, token migration for all components), math input bar (template palette, STIX italic expression field). Acceptance criterion: zero hardcoded hex values in `src/ui/`.

Revised PRD/08 to Phase 8. Key correction: the original PRD envisioned a "left rail chapter navigator inside the Sandbox" — the design supersedes this with Browse mode as a separate top-level view. PRD/08 now specifies (a) Browse mode (catalog grid, concept cards, side panel, "Open in Sandbox"), (b) the full three-column Sandbox layout (object library + canvas + inspector), and (c) all original pedagogy mechanisms (definition catalog, scene templates, example generator). All resolved design questions reflected throughout. Token mandate explicit in acceptance criteria.

Extended roadmap in PRD/00 to Phases 9 (Content Expansion) and 10 (UX Refinement) with brief descriptions; full PRDs authored at predecessor completion.

**Next:** Phase 7 — `PRD/09 — Design System Integration.md`. Start with Stage 1 (fonts + tokens).

## 2026-05-11 — Design language imported; Phase 7 open questions resolved

**Touched:** `Program/Design/` (new), `dev-notes/NOTES.md` (ADR-015 through ADR-017, design language note), `dev-notes/CONTEXT.md`, `dev-notes/ACTION_ITEMS.md`, `PRD/08` (`SceneBuild.views` type fix)
**Status:** complete

Fetched and imported the Claude Design bundle into `Program/Design/`. Primary artifacts: `Design Language.html` (open in browser; the full visual reference), `app/styles.css` (CSS token definitions), `DESIGN.md` (development directives and gap analysis). Design decisions: Bone palette (`#f2f1ef`, near-neutral warm paper) as default; Geist / Geist Mono / STIX Two Text italic as the three-face system; honesty badges (kind chip + exact/approximate chip) on every visualization; Browse mode (editorial catalog) + Sandbox mode (three-column workbench) sharing the same token system.

Resolved all five Phase 6→7 open design questions: ADR-016 (unified + remark-parse for build script), ADR-017 (replace on Browse activation, not accumulate), override-merge strategy (field-level replace), `SceneBuild.views` type corrected to include `refKind`, `LADR_Definitions/` folder confirmed viable. Full answers in `Program/Design/DESIGN.md`.

**Next:** Phase 7 — read `Program/Design/DESIGN.md` before writing any new UI components. New components must use CSS tokens from `Program/Design/app/styles.css`. First integration step: add Geist / Geist Mono / STIX Two Text font link to `index.html` and the token stylesheet to the app's global CSS.

## 2026-05-11 — Phase 6 complete: Animation timeline (AI-005)

**Touched:** `src/interaction/timeline/` (new), `src/ui/TimelineScrubBar.tsx` (new), `src/ui/ViewContainer.tsx`, `src/ui/App.tsx`, `src/interaction/index.ts`, `PRD/07`, `PRD/00 §7`, `ACTION_ITEMS.md`
**Status:** complete

Implemented the animation timeline to complete Phase 6. Created `TimelineKeyframe`/`TimelineState` types, `interpolateSnapshots(a, b, t)` (linearly interpolates concrete vector components and matrix entries for matching IDs; structural fields taken from `a`), `TimelineContext` (React context with `useState` + `requestAnimationFrame` playback at 0.5 units/second), and `TimelineScrubBar` (play/pause, draggable scrub track with keyframe dots, "⊕ Keyframe" button). `ViewContainer` now calls `useTimeline()` and substitutes `sessionViewFrom(interpolatedSnapshot)` for the live session view when a fractional time is active — zero renderer changes required, as planned. `App.tsx` wraps the tree with `TimelineProvider` and mounts `TimelineScrubBar` between the view grid and input bar. 30 new tests; total 304 passing. Verified live on Netlify: two keyframes captured, play button enables, display shows "1 / 2".

**Notable:** ADR-015 (interpolate `SessionSnapshot` objects, not renderer props) validated in practice — adding the timeline required zero renderer changes, exactly as the pre-made architectural decision predicted. The `requestAnimationFrame` loop uses `isPlaying` as the `useEffect` dependency so the loop starts/stops cleanly on state transitions without leaking animation frames.

**Next:** Phase 7 (Pedagogy Layer). Before starting implementation, resolve the open design questions flagged in `PRD/08 §6`: confirm `unified`+`remark-parse` as ADR-016, specify override-merge strategy (field-level replace), record "replace on click" as ADR-017, fix the `SceneBuild.views` missing `refKind` field. `LADR_Definitions/` folder exists at project root, organized by chapter — build script approach is viable.

## 2026-05-11 — Hotfix: React error #185 in App.tsx (Zustand selector returning object)

**Touched:** `src/ui/App.tsx`
**Status:** complete

`App.tsx` used `useStore(defaultStore, (s) => ({ historyCursor: s.historyCursor, history: s.history }))` — a selector that returns a new object literal on every call. Zustand's `useStore` wraps React's `useSyncExternalStore`, which compares snapshots with `Object.is`. A new object is never equal to the previous one, so React kept scheduling re-renders until "Maximum update depth exceeded" (error #185). Fix: split into two primitive selectors (`s.historyCursor` and `s.history.length`), which are stable numbers. Gotcha recorded in NOTES.md.

---

## 2026-05-11 — Phase 6: Interaction Layer (Stages 1–4)

**Touched:** `src/ui/ViewCard.tsx` (new), `src/ui/ObjectInput.tsx` (new), `src/ui/App.tsx` (ObjectInput + FieldToggle + undo/redo in header), `src/ui/ViewGrid.tsx` (switched to ViewCard), `src/ui/ViewContainer.tsx` (drag callback + onArrowDrag wiring), `src/interaction/parser/` (new: lexer, parser, types, index), `src/interaction/parser/parser.test.ts` (new), `src/interaction/controls/FieldToggle.tsx` (new), `src/registry/types.ts` (Geometric2DProps.onArrowDrag), `src/renderers/Geometric2DRenderer.tsx` (Scale type extended with .invert, drag handle on arrow tips), `src/state/store.ts` (updateVector action), `PRD/00`, `PRD/07`
**Status:** in progress (Phase 6, Stages 1–4 complete)

**Stage 1 — View management.** `ViewCard` component replaces the plain div-with-header in ViewGrid. Each card header shows: object name (resolved by reverse-lookup from namedObjects), current visualizer label, "+ view" dropdown of other applicable visualizers for the same object, close button (✕). "View as..." adds a new view via `openView`; close dispatches `closeView`. Header controls use inline hover styles with event target refs.

**Stage 2 — Expression parser.** Hand-rolled recursive-descent parser in `src/interaction/parser/`. Lexer handles numbers, identifiers, and all mathematical punctuation. Grammar covers: `[[a,b],[c,d]]` and `[a,b;c,d]` for matrices, `(a,b,c)` for vectors, and `Name(x,y) = (expr, expr)` for formula-kind linear maps. Returns `ParsedMatrix | ParsedVector | ParsedFormula | ParsedAmbiguous | ParseError` — never throws. `ObjectInput` component in the App footer: name field + expression textarea + "Add" button. As-you-type preview shows "2×2 matrix (ℝ)" etc.; errors show inline. Enter submits. On success: the object is added to the session, named, and default views are opened automatically.

**Stage 3 — Direct manipulation.** `Geometric2DRenderer` accepts `onArrowDrag` callback on `Geometric2DProps`. Arrow tips show a draggable circle handle (cursor: grab) that captures mousemove events on the window, converts SVG pixel coordinates back to math coordinates via D3 `.invert()`, and calls the callback. `ViewContainer` wires the callback for `vector` object refs in `geometric_2d` views: creates an updated concrete vector and dispatches `updateVector` (which does NOT push undo history, to avoid saturating the stack at 60fps). `Scale` type extended with `.invert` to satisfy D3's invert method.

**Stage 4 — Parameter controls.** `FieldToggle` (ℝ/ℂ) in the App header bound to `setField`. Undo/redo buttons (↩/↪) in header, disabled when no history.

274 tests passing (22 test files). `pnpm verify` green. Deployed to https://linear-algebra-seen-right.netlify.app.

**Next:** Phase 6 remaining — animation timeline (`src/interaction/timeline/`), reorder drag on ViewGrid, `BasisSelector` control, `ScalarSlider`. Then PRD acceptance criteria: end-to-end integration test (type T(x,y)=(x+y,x-y) → drag basis image → eigenline updates). Animation timeline is the largest remaining item.

---

## 2026-05-11 — Hotfix: replace R3F with raw Three.js in Geometric3DRenderer

**Touched:** `src/renderers/Geometric3DRenderer.tsx` (rewrite), `src/renderers/Geometric3DRenderer.test.tsx` (rewrite), `src/ui/ViewContainer.tsx` (removed Suspense wrapper, lazy still active), `src/ui/ViewErrorBoundary.tsx` (new), `package.json` (three downgraded to 0.176.0, @types/three to 0.176.0), `Program/dev-notes/NOTES.md` (R3F gotcha)
**Status:** complete

Production deploy crashed with `TypeError: Cannot read properties of undefined (reading 'S')` at `Geometric3DRenderer` Canvas initialization. Both 3D views crashed simultaneously, propagated past all error boundaries, and unmounted the entire React tree. Downgrading Three.js from 0.184.0 to 0.176.0 did not fix it — confirming the root cause is R3F 9.6.1's fiber initialization in Rollup's bundled ESM output, not a Three.js version mismatch.

Fix: rewrote `Geometric3DRenderer` using raw Three.js + `useEffect` — no `@react-three/fiber`, no `@react-three/drei`. The same visual output (AxesHelper, ArrowHelper, LineSegments grid deformation, OrbitControls from `three/addons`) achieved without R3F's fiber reconciler. Added a `getContext()` guard so the useEffect exits cleanly in environments without WebGL (tests, old browsers). The lazy-load split is preserved. Chunk size reduced from 874KB to 492KB (gzip: 235KB → 123KB) by eliminating R3F + drei.

Added `ViewErrorBoundary` class component wrapping each view's rendered output — future renderer failures will show an inline error card rather than crashing the app.

Confirmed working: [linear-algebra-seen-right.netlify.app](https://linear-algebra-seen-right.netlify.app) loads clean — all views render, no console errors.

**Notable:** R3F gotcha recorded in NOTES.md. The `@react-three/fiber` and `@react-three/drei` packages remain installed but are unused.

**Next:** Phase 6 — Layer 5 (Interaction Layer).

---

## 2026-05-11 — Phase 5 Stages 6–7: ChartRenderer + Geometric3DRenderer (Phase 5 complete)

**Touched:** `src/renderers/ChartRenderer.tsx` (new), `src/renderers/ChartRenderer.test.tsx` (new), `src/renderers/Geometric3DRenderer.tsx` (new), `src/renderers/Geometric3DRenderer.test.tsx` (new), `src/registry/defaults.ts` (dimension-bars, coordinate-axes-3d, arrow-3d, grid-deformation-3d toProps), `src/ui/ViewContainer.tsx` (ChartRenderer wired, Geometric3DRenderer lazy-loaded), `src/demo.ts` (chart view for A, 3D space view, 3D vector w), `package.json` + `pnpm-lock.yaml` (three, @types/three, @react-three/fiber, @react-three/drei), `PRD/00` (Phase 5 marked Complete)
**Status:** complete (Phase 5)

**Stage 6 — ChartRenderer.** SVG + D3 scales. Two rendering modes: `DimensionBars` (rank-nullity stacked bar, teal/amber matching DiagramRenderer's color palette) and `BarChart` (standard horizontal bars for spectrum, singular_values, coefficients). Added `dimension-bars` visualizer to LinearMap defaults — extracts rank and nullity via `computeRank` with no engine call. Demo now shows a chart card for map A displaying rank = 2, nullity = 0.

**Stage 7 — Geometric3DRenderer.** React Three Fiber + Three.js. Uses `THREE.AxesHelper` for coordinate axes, `THREE.ArrowHelper` for vector arrows, and custom `BufferGeometry`/`LineSegments` for the deformed XY-plane grid. Lazy-loaded via `React.lazy` in ViewContainer — the ~600KB R3F bundle only loads when the first 3D view opens. Updated toProps for `coordinate-axes-3d` (axes_only), `arrow-3d` (concrete 3D vector), and `grid-deformation-3d` (3×3 matrix-kind maps; defers to LoadingProps for 2D or formula-kind). Demo now includes ℝ³ with coordinate axes view and vector w = (1, -1, 2) with arrow-3d view. Tests mock `@react-three/fiber` and `@react-three/drei` since WebGL is unavailable in happy-dom; prop-shape tests run directly against the TypeScript types.

257 tests passing (21 test files). `pnpm verify` green.

**Notable:** `getByTestId` in RTL finds multiple elements when the mocked Canvas renders both an outer div and an inner Suspense path renders one too. Use `container.querySelector` instead for scoped single-element lookup. Lambda closures in `toProps` require materializing `T.representation.matrix` before the lambda to preserve TypeScript's narrowed type.

**Next:** Phase 6 — Layer 5 (Interaction Layer). Read `PRD/07 — Layer 5 (Interaction Layer).md`. Staging order: direct manipulation (drag callbacks), parameter controls, expression parser, animation timeline, view management. This is where the sandbox becomes operative.

---

## 2026-05-11 — Phase 5 Stage 5: Geometric2DRenderer

**Touched:** `src/renderers/Geometric2DRenderer.tsx` (new), `src/renderers/Geometric2DRenderer.test.tsx` (new), `src/registry/defaults.ts` (`arrow-2d`, `coordinate-axes-2d`, `grid-deformation-2d` toProps), `src/ui/ViewContainer.tsx` (wired renderer), `src/registry/registry.test.ts` (Geometric2D toProps tests), `src/demo.ts` (added geometric_2d view for map A), `package.json` + `pnpm-lock.yaml` (D3 added)
**Status:** complete (Stage 5)

Installed `d3 7.9.0` and `@types/d3 7.4.3`. Built `Geometric2DRenderer` — pure React + SVG, D3 used only for `scaleLinear` and `ticks` (no DOM mutation). Handles four `kind` values: `vector_arrow` (arrow from origin), `axes_only` (coordinate plane), `grid_deformation` (deformed integer grid with basis image arrows), `eigenlines` (lines through origin in given directions). Arrowhead markers defined in SVG `<defs>` with per-color variants (blue, red, green, gray). Grid deformation renders original grid as dashed gray, deformed grid as solid blue-200, and the images of e₁/e₂ as red/green arrows.

Updated `toProps` in `defaults.ts`: `arrow-2d` now returns real `Geometric2DProps` for concrete 2D vectors; `coordinate-axes-2d` returns `axes_only`; `grid-deformation-2d` extracts the 2×2 matrix entries for matrix-kind maps (formula-kind still returns `LoadingProps`). `eigenline-2d` remains loading — needs engine eigenvectors. Demo seed now opens a `'geometric_2d'` view for map A, showing a grid deformation. 243 tests passing (19 test files).

**Notable:** Two-step narrowing pattern required for `RendererProps` tests: first `'isPending' in props` to eliminate `LoadingProps` from the union (since `LoadingProps.renderer` is the broad `RendererKind`, it survives a `renderer === 'geometric_2d'` check alone), then `props.renderer !== 'geometric_2d'` to reach `Geometric2DProps`. The `useMemo` dependency arrays use `[axisRange[0], axisRange[1]]` rather than `[axisRange]` — the tuple reference changes on every render when declared inline, but the scalar values are stable.

**Next:** Phase 5 Stage 6 — `ChartRenderer`. Suggested starter: a `spectrum` visualizer for `LinearMap` showing eigenvalue distribution. D3 is already installed. After that, Stage 7 — `Geometric3DRenderer` (React Three Fiber + R3F, largest bundle impact, left for last per PRD §2.4).

---

## 2026-05-11 — New agent onboarding

**Touched:** dev-notes (read-only), PRD set (read-only)
**Status:** complete

Read through the full onboarding sequence per PRD §3.1: CONTEXT.md, Project Overview, Technical Architecture, master PRD, all 8 sub-PRDs (01–08), the most recent devlog entries, NOTES.md end-to-end, and ACTION_ITEMS.md. Checked git status and log. No code changes made.

Current state: Phases 0–4 complete and committed through Phase 3 (30c8a1e); Phases 4, 05a, and Phase 5 Stages 1–4 are implemented but not yet committed. All action items (AI-001 through AI-004) resolved. Next task is Phase 5 Stage 5 — Geometric2DRenderer.

**Next:** Phase 5 Stage 5 — `Geometric2DRenderer`. Install D3 first (`pnpm add d3`). `arrow-2d` for concrete vectors and `coordinate-axes-2d` can ship real `toProps` immediately (no engine needed). `grid-deformation-2d` for matrix-kind maps also needs no engine. `eigenline-2d` and formula-kind grid deformation need `useComputation` + engine — they ship loading states until wired.

---

## 2026-05-11 — PRD/05a: Pre-Stage-5 Prerequisites

**Touched:** `src/registry/` (split into types.ts + helpers.ts + registry.ts + defaults.ts + index.ts), `src/compute/engine.ts` (spaceIdOfMatrix fix + SessionView threading), `src/compute/engineInstance.ts` (new), `src/ui/hooks/useComputation.ts` (stability fix + cacheResult wiring), `src/demo.ts` (geometric_2d view added), `Program/PRD/05a`
**Status:** complete

Registry split: `index.ts` (550 lines) → types.ts (RendererProps schemas, Visualizer<T>), helpers.ts (scalarToLatex/scalarToNumber/computeRank/spaceToLatex/spaceToDiagramLabel etc.), registry.ts (VisualizerRegistry class), defaults.ts (all three visualizer arrays + registerDefaults). index.ts is now a 25-line singleton+re-export file. All external imports unchanged.

`spaceIdOfMatrix` cast: added `session?: SessionView` to `opts` on `eigendecompose`, `nullSpace`, and `applyMap` in the `ComputationEngine` interface and `Engine` class. Proper lookup via `session.getSpaceForBasis(M.domainBasis)` with fallback to the old cast.

`engineInstance.ts`: exports `getEngine()` (lazy singleton), `getEngineSync()`, `_resetEngine()`. Uses `createMockAdapter()` in test mode (via `import.meta.env.MODE`), `createPyodideAdapter()` in production. Does not lazily import Pyodide — deferred to the worker setup.

`useComputation`: stable `computeRef` pattern avoids re-firing on every render; `inFlightRef` prevents duplicate concurrent calls; writes result via `defaultStore.getState().cacheResult(key, result)`.

Demo: added `'geometric_2d'` view for vector `v` — renders `LoadingState` placeholder until Stage 5 wires the `arrow-2d.toProps`. 229 tests passing.

---

## 2026-05-11 — Pre-Stage-5 audit + bug fixes

**Touched:** `src/ui/ViewContainer.tsx`, `src/registry/index.ts`, `Program/PRD/05a — Pre-Stage-5 Prerequisites.md`
**Status:** complete

Three bugs fixed: (1) dead `case 'diagram'` in ViewContainer switch — removed duplicate; (2) `spaceToLatex()` was being called for SVG text nodes in DiagramRenderer, producing raw LaTeX like `\mathbb{R}^2` — added `spaceToDiagramLabel()` using Unicode (ℝ, ℂ) and plain notation; (3) all LinearMap `toProps` were using `objectId: T.domain` (a SpaceId) instead of `objectId: T.id` (the MapId) — replaced throughout. Authored `PRD/05a — Pre-Stage-5 Prerequisites.md` covering four items to resolve before Stage 5: registry file split, `useComputation` engine wiring + `spaceIdOfMatrix` cast removal, and demo update for geometric view.

**Notable:** ESLint `explicit-function-return-type` warnings in test files: ruled cosmetic and left as-is per Elena. 229 tests passing.

---

## 2026-05-11 — Phase 5 Stage 4: DiagramRenderer

**Touched:** `src/renderers/DiagramRenderer.tsx`, `src/renderers/DiagramRenderer.test.tsx`, `src/registry/index.ts` (computeRank, spaceDimLabel, kernel-range-diagram/subspace-lattice toProps), `src/ui/ViewContainer.tsx`, `src/demo.ts`, `package.json` (dagre + @types/dagre)
**Status:** complete (Stage 4)

Installed `dagre 0.8.5` + `@types/dagre 0.7.54`. Built `DiagramRenderer` — pure React + SVG, dagre for automatic graph layout (left-to-right rankdir). Nodes rendered as colored rounded rectangles with highlight palette (kernel→amber, range→teal, eigenspace→violet, default→slate). Edges rendered as SVG paths with arrowhead markers; dashed style for inclusions. Added `computeRank` (Gaussian elimination over floats, reusing `scalarToNumber`) and `spaceDimLabel` helpers. `kernel-range-diagram.toProps` now returns real `DiagramProps` for matrix-kind maps — 4 nodes (domain, codomain, null(T), range(T)) with correct dimensions from rank. `subspace-lattice.toProps` returns a single-node diagram with space name + dimension. Demo updated to show a diagram card for map A = [[1,2],[3,4]]. 229 tests passing (18 test files).

**Notable:** ESLint flagged `eslint-disable react-hooks/exhaustive-deps` as an error because the rule isn't configured in the project. Removed the comment; dependencies keyed on `[props.objectId, props.nodes, props.edges]` (array identity, not content length). `.netlify/state.json` added to `.prettierignore` to prevent Netlify CLI artifacts from failing `format:check`.

**Next:** Phase 5 Stage 5 — `Geometric2DRenderer` + `arrow-2d`, `coordinate-axes-2d`, `grid-deformation-2d`, `eigenline-2d` toProps. Requires D3 for scale/axis computation. This is the first renderer that shows vectors as arrows and makes the tool feel like a geometric sandbox.

---

## 2026-05-11 — AI-004: Netlify deploy + Pyodide cold-start verification

**Touched:** `netlify.toml` (new), `.nvmrc` (24→20), `package.json` (removed `engines.pnpm`), `Program/dev-notes/ACTION_ITEMS.md`, `NOTES.md`
**Status:** complete

Created `linear-algebra-seen-right.netlify.app` (site ID `8fef8434-8fc8-4f31-8b3e-e098a1d27134`). Resolved 4 successive build failures: (1) old `src/app.tsx` conflict on case-sensitive Linux fs → deleted; (2) pnpm 11 `ERR_PNPM_IGNORED_BUILDS` → revert to Netlify's default pnpm 10.30.3; (3) Node 24/npm 11 crash on `engines.pnpm` field → removed; (4) same crash with Node 20/npm 10.8.2 → switched build command from `npm install && npm run build` to `pnpm install && pnpm build`. Verified in Chrome: (a) Pyodide v0.27.0 initializes ✓; (b) SymPy eigenvalues of [[1,2],[2,1]] = {-1, 3} ✓; (c) `pyodide.asm.wasm` MIME = `application/wasm` ✓; (d) cold-start ~5.76s (includes sympy package load, ~1s over budget — acceptable for a dev deploy). No JS console errors.

**Notable:** Netlify intercepts both `npm install` and `pnpm install` commands and uses its own pnpm build. Setting `PNPM_VERSION` overrides this to a specific version; leaving it unset uses pnpm 10.30.3 which is stable and respects `onlyBuiltDependencies`. The `engines.pnpm` field in `package.json` is npm-incompatible and should not be used.

**Next:** Phase 5 Stage 4 — DiagramRenderer (requires `dagre`). All action items resolved. No new blockers.

---

## 2026-05-11 — Phase 5 Stage 3: MatrixRenderer + useComputation hook

**Touched:** `src/renderers/MatrixRenderer.tsx`, `src/ui/hooks/useComputation.ts`, `src/registry/index.ts` (matrix-heatmap toProps, scalarToNumber, matrixToProps helpers), `src/types/session-view.ts` (getCachedResult), `src/state/session-view.ts` (ViewableSession), `src/demo.ts`, `src/ui/ViewContainer.tsx`
**Status:** complete (Stage 3)

Added `getCachedResult(key: string): unknown` to `SessionView` interface. `StoreSessionView` now accepts a `ViewableSession` type (SessionSnapshot with optional computationCache) so it can serve the cache without forcing all callers to pass a full MathSession. Updated all inline `SessionView` stubs in tests. Built `useComputation` hook — checks cache, fires engine call on miss, handles cancellation. Built `MatrixRenderer` (pure React/CSS grid, no D3 — sufficient for this stage; D3 colour/SVD enhancements deferred). `matrix-heatmap.toProps` now returns real `MatrixProps` for matrix-kind LinearMaps (entries as LaTeX, heatmap normalized by max absolute value); formula/basis-action kinds return `LoadingProps`. Demo seed updated with a 2×2 integer matrix map A = [[1,2],[3,4]]. 222 tests passing (17 test files).

**Notable:** `exactOptionalPropertyTypes: true` requires optional props be typed as `T | undefined`, not just `T?` on the consuming side — the `CellProps.heatValue` field and `matrixToProps` return both needed explicit `| undefined` or use null-then-spread patterns. Matrix bracket rendering uses Unicode ⎡⎦ scaled by row count (CSS `font-size`) — not true stretchy brackets but visually acceptable without MathJax overhead.

**Next:** Phase 5 Stage 4 — `DiagramRenderer` (requires `dagre` install) + `kernel-range-diagram`, `subspace-lattice` toProps. These are the first visualizers that require structural reasoning about the map (kernel dimension, range dimension) from the session.

---

## 2026-05-10 — Phase 5 Stages 1–2: UI shell + SymbolicRenderer

**Touched:** `src/ui/` (all new files), `src/renderers/SymbolicRenderer.tsx`, `src/registry/index.ts` (RendererProps narrowing + toProps rewrite), `vite.config.ts`, `eslint.config.js`, `package.json`, `Program/dev-notes/` (NOTES, DEVLOG)
**Status:** complete (Stages 1–2)

Installed `katex`, `@types/katex`, `happy-dom`, `@testing-library/react`. Configured Vitest to use `happy-dom` for `*.test.tsx` via `environmentMatchGlobs`. Added ESLint boundary rule blocking `src/renderers/` from importing `src/state/` or `src/compute/`. Narrowed `RendererProps` from index-signature stubs to typed discriminated union (`SymbolicProps`, `MatrixProps`, `DiagramProps`, `Geometric2DProps`, `Geometric3DProps`, `ChartProps`, `LoadingProps`). Rewrote all `toProps` stubs: geometric/diagram/matrix visualizers return `LoadingProps`; symbolic visualizers (`coordinate-display`, `basis-display`, `symbolic-formula`) return real LaTeX via `scalarToLatex` / `spaceToLatex` helpers. Built `loadingMessages.ts` (34 messages), `LoadingState`, `ProvenanceBadge`, `ViewContainer`, `ViewGrid`, `App`. `SymbolicRenderer` uses KaTeX. 215 tests passing (16 test files, 4 new `.test.tsx`).

**Notable:** Fraction.js v5 types `.s`, `.n`, `.d` as `bigint` — use `1n` not `1` in comparisons (NOTES.md gotcha). happy-dom preserves hex colors without `rgb()` conversion — color assertions in tests must use hex values. KaTeX "quirks mode" warning in tests is harmless (happy-dom lacks DOCTYPE). `RendererProps` narrowing required refactoring the `renderWithProps` dispatcher in `ViewContainer` to use a `ConcreteRendererProps` type after the `LoadingProps` early-return check, since TypeScript doesn't narrow discriminated unions through `'isPending' in props` guards.

**Next:** Phase 5 Stage 3 — `MatrixRenderer` + `useComputation` hook. Stage 4 — `DiagramRenderer` (requires `dagre`). Then `Geometric2DRenderer`, `ChartRenderer`, `Geometric3DRenderer`.

---

## 2026-05-10 — Phase 4: Layer 3 Visualization Registry

**Touched:** `src/registry/index.ts`, `src/registry/registry.test.ts`, `Program/PRD/05 — Layer 3 (Visualization Registry).md`
**Status:** complete

Authored `PRD/05` then implemented `VisualizerRegistry` in `src/registry/index.ts`. Exports: `VisualizerRegistry` class, `Visualizer<T>`, `RendererKind`, `RendererProps` (stub union), `MathObjectKind`, `MathObject`, `visualizerRegistry` singleton, and `registerDefaults`. Default registrations: 6 LinearMap visualizers, 4 VectorSpace visualizers, 3 Vector visualizers. `RendererProps` uses a discriminated union with index-signature members — Phase 5 narrows each member to typed fields. 23 new tests; 199 passing total.

**Notable:** `Visualizer<T>` uses bivariant method typing so `Visualizer<MathObject>[]` is directly assignable to `Visualizer<T>[]` — the `as Visualizer<T>[]` cast in `getApplicable` was flagged as unnecessary by ESLint and removed. The `SessionView` interface now includes `getSpaceForBasis` (AI-001) — all three test stubs for `SessionView` in the registry tests include it. `RendererProps` union members include `readonly [key: string]: unknown` which TypeScript and Prettier accept cleanly.

**Next:** Phase 5 — Layer 4 Renderer Plugins. Read `Technical Architecture.md` §"Layer 4". Author `PRD/06`. Requires React, R3F, D3. Also: AI-004 (Pyodide cold-start verification on Netlify) should land before Phase 5 work touches the engine.

---

## 2026-05-10 — Pre-Phase 4: AI-001, AI-002, AI-003 resolved

**Touched:** `src/types/session-view.ts`, `src/types/space.ts`, `src/types/basis.ts`, `src/types/space.test.ts`, `src/state/session-view.ts`, `src/state/selectors.ts`, `src/compute/engine.ts`, `src/compute/types.ts`, `Program/dev-notes/` (all four files), `Program/dev-notes/NOTES.md` (ADR-011)
**Status:** complete

Resolved the three Phase 4 blockers. AI-001: added `getSpaceForBasis(id: BasisId): SpaceId | undefined` to `SessionView` interface and `StoreSessionView`; propagated to the `dimOf` inline view object. AI-002: introduced `MatrixOfResult` discriminated union (mirrors `InverseResult`); `matrixOf` now returns `Promise<MatrixOfResult>` with `{ kind: 'not_representable' }` instead of the null cast. AI-003: `mkVectorSpaceFn` now accepts `n = 0`; `mkBasis` allows empty vector list when `dim(space) === 0`; the zero vector of F^0 is an empty-component concrete vector (factory already handled this). All 176 tests pass.

**Notable:** DEVLOG test counts for Phases 1–3 appear inflated (DEVLOG says 386; actual run is 177). The layer counts add correctly to 79+53+45 = 177 — the Phase 2 and Phase 3 counts in the prior entries are wrong. Not worth correcting old entries; the discrepancy should not be interpreted as missing test coverage. The `spaceIdOfMatrix` helper in `engine.ts` still uses an internal cast (no session context available at the engine level); this is noted in the AI-001 resolved entry.

**Next:** Phase 4 — author `PRD/05 — Layer 3 (Visualization Registry).md` then implement `src/registry/index.ts`.

---

## 2026-05-10 — Phase 3: Layer 2 Session State

**Touched:** `src/state/` (all files), `eslint.config.js` (Layer 2 boundary rule), `package.json` (zustand, immer), `PRD/00`, `PRD/04`, `NOTES.md`
**Status:** complete

Built the Zustand 5 vanilla store with Immer 11 middleware. Full `MathSession` shape per PRD §2.1. All 17 actions implemented (object creation, naming, basis selection, field, computation lifecycle, views, undo/redo). Selectors in `selectors.ts`; `SessionView` interface implemented in `session-view.ts` wrapping a snapshot. `serialization.ts` documents the intended shape with stub functions (`xtest`'d in selectors.test.ts). 175 tests passing.

**Notable:** Zustand 5's `createStore` moved to `zustand/vanilla` (not `zustand`). `castDraft()` from Immer is the correct way to assign readonly Layer 0 types (with `readonly` arrays in discriminated union variants) into Immer Draft slots — `as Draft<T>` casts fail ESLint's `no-unnecessary-type-assertion` rule even when TypeScript needs them; `castDraft` is the idiomatic workaround. The `setActiveBasis` and `setField` idempotency guards (skip history push if no change) interact with tests — test must use genuinely different values to verify redo-branch invalidation.

**Next:** Phase 4 — Layer 3 Visualization Registry. Re-read `Technical Architecture.md` §"Layer 3". Author `PRD/05 — Layer 3 (Visualization Registry).md` before implementing. Check `src/types/` and `src/state/` actual shapes for any deltas from the architecture sketches.

---

## 2026-05-10 — Phase 2: Layer 1 Computation Engine

**Touched:** `src/compute/` (all files), `eslint.config.js` (__demo__ ignore), `package.json` (ml-matrix, comlink, fraction.js re-added), `PRD/00`, `PRD/03`, `NOTES.md`
**Status:** complete

Implemented the unified computation engine with SymbolicAdapter interface + Pyodide worker (CDN, comlink) + ml-matrix numerical adapter. All 15 operations from PRD §2.3 implemented. Layer 0 ↔ SymPy bridge with round-trip serialization for all Scalar kinds. Promotion rule: any float entry → `numerical_only` (no symbolic attempt). Cancellation via AbortSignal threaded through to adapter. MockSymbolicAdapter enables full Vitest coverage without a browser. 132 tests passing.

**Notable:** `LuDecomposition` has a `.determinant` property — use it directly rather than computing from U diagonal (my first attempt was wrong — sign from permutation isn't trivially accessible). `SingularValueDecomposition` uses `.leftSingularVectors`/`.rightSingularVectors` in TypeScript types but `.U`/`.V` at runtime; the TypeScript names are canonical. QR decomposition may return sign-flipped Q columns — tests must use `|diagonal| = 1` not `diagonal = 1`. Fraction.js got dropped from `package.json` (unclear why — Prettier reformatting dropped it silently); re-added in this phase.

**Next:** Phase 3 — Layer 2 Session State. Read `PRD/04 — Layer 2 (Session State).md`. Begin in `src/state/` with the Zustand store.

---

## 2026-05-10 — Phase 1: Layer 0 Mathematical Type System

**Touched:** `src/types/` (all files), `eslint.config.js` (layer boundary rule), `package.json` (added `fraction.js`), `PRD/00`, `PRD/02`, `NOTES.md`
**Status:** complete

Defined the full mathematical type system in `src/types/`: `Scalar` (rational/algebraic/complex/symbolic/float), `Polynomial`, `SymExpr`, `Vector` (4 variants), `VectorSpace` (8 variants), `Subspace`, `LinearMap`, `Basis`, `Matrix`, `InnerProduct`, branded IDs, `SessionView` interface, `Result` type, and factory/accessor functions for all. Fraction.js powers exact rational arithmetic. All 79 tests pass: algebraic property tests (commutativity, associativity, distributivity, inverses), dimension calculus properties (dim(V×W), dim(V⊗W), dim(V*)), factory validation, ID snapshot tests, matrix invariants.

**Notable:** Fraction.js v5 constructor overloads are stricter than v4 — string and number forms use separate overloads, so `rational(n)` and `rationalFromString(s)` are split. Added ADR-004 through ADR-007 for the four design questions posed in PRD §7. Layer boundary ESLint rule added (`no-restricted-imports` for `src/types/**/*.ts`).

**Next:** Phase 2 — Layer 1 Computation Engine. Read `PRD/03 — Layer 1 (Computation Engine).md`. Begin with Pyodide worker bootstrap in `src/compute/workers/`.

---

## 2026-05-10 — Phase 0: Project Scaffolding

**Touched:** `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.editorconfig`, `.vscode/settings.json`, `index.html`, `src/` placeholder tree, `test/setup.ts`, `test/scaffold.test.ts`, `README.md`, `.github/workflows/verify.yml`, `PRD/00`, `PRD/01`
**Status:** complete

Initialized git repo on `main` and built the full project skeleton. All four `pnpm verify` gates pass (typecheck, lint, format:check, test). `pnpm build` produces `dist/` cleanly. CI workflow runs on push/PR via GitHub Actions (ADR-001). Netlify is the deployment target (ADR-002) — no Netlify config needed yet.

**Notable:** Added `skipLibCheck: true` and `@types/node` to resolve type errors in Vite/Vitest's own `.d.ts` files — these are not generated by our code and are not a signal to relax strict settings. Also added `pnpm.onlyBuiltDependencies: ["esbuild"]` to satisfy pnpm 11's new default of blocking post-install scripts. Placeholder text "Spanning." follows ADR-003 tonal register from first commit.

**Next:** Phase 1 — Layer 0 Mathematical Type System. Read `PRD/02 — Layer 0 (Type System).md`. Begin in `src/types/`.

---

## 2026-05-09 — PRD set authored

**Touched:** PRD set, dev-notes scaffolding
**Status:** complete

Created the master PRD (`00 — Development Standards.md`) and sub-PRDs for the foundational phases: scaffolding (`01`), Layer 0 type system (`02`), Layer 1 computation engine (`03`), Layer 2 session state (`04`). Sub-PRDs for Layers 3–6 deferred until their phases begin, with placeholders in the master PRD's roadmap. Authored these dev-notes templates with usage instructions.

**Notable:** Master PRD §3.2 makes the closing flow non-negotiable — every session must end with a devlog entry, plus promotion of any durable findings into `NOTES.md`. Master PRD §8.4 fixes a small set of mathematical conventions (column vectors, ascending-degree polynomials, `'R' | 'C'` field spelling) explicitly because these are the kinds of details that drift if not pinned.

**Next:** Phase 0 (Project Scaffolding) — see `PRD/01 — Project Scaffolding.md`.
