# NOTES

Durable, structured knowledge for the LADR Visualizer project. Three sections:

- **Decisions** — non-trivial architectural or implementation choices not specified in `Technical Architecture.md`. ADR-style.
- **Gotchas** — runtime, version, or environmental constraints that future work must respect.
- **Open Questions** — items waiting on input from Elena, or on information not yet known.

This file is meant to stay short enough to skim end-to-end. If it crosses ~400 lines, consolidate (merge duplicates, remove resolved questions, prune stale gotchas) instead of letting it grow. See `PRD/00 — Development Standards.md` §6.2 for the full convention.

---

## Decisions

ADR-style. Numbered, dated. Each entry has **Context**, **Choice**, **Why**, **Implications**. Decisions are not deleted when superseded — mark `Superseded by ADR-NNN` and add a new entry.

Format template:

```markdown
### ADR-NNN — short title  (YYYY-MM-DD)

**Context.** What problem or fork prompted this decision.

**Choice.** What was chosen.

**Why.** Reasoning. This is the most important field — it's what lets a future agent judge edge cases.

**Implications.** Knock-on effects on other layers, conventions, or future work.
```

### ADR-017 — Session replace (not accumulate) on Browse definition activation  (2026-05-11)

**Context.** When the user clicks "Open in Sandbox" on a concept in Browse mode, two behaviors were possible: (a) replace — clear the current session and load the concept's canonical scene; (b) accumulate — add the concept's objects to the existing session.

**Choice.** Replace, with an explicit "save scene" affordance (localStorage snapshot) for users who want persistence.

**Why.** Accumulation rapidly produces a cluttered session with objects from multiple unrelated concepts and no clear compositional intent. The product is a sandbox, not a notebook — the user can always return to Browse and re-enter from a clean state. The "save scene" affordance handles the minority case where a user wants to preserve their current work before navigating.

**Implications.** `loadScene` must call a `resetSession` store action before applying the `SceneBuild`. The "save scene" affordance is a separate Phase 7+ feature (a button in the top bar that snapshots `SessionSnapshot` to `localStorage` under a user-supplied name). It does not need to exist for the initial "Open in Sandbox" flow to ship.

---

### ADR-016 — unified + remark-parse for definition build script  (2026-05-11)

**Context.** Phase 7's definition catalog requires parsing markdown files from `LADR_Definitions/` into `DefinitionRecord` objects. Options: hand-rolled parser vs. `unified` + `remark-parse`.

**Choice.** `unified` + `remark-parse`. Install as dev dependencies; used only in the build script (`scripts/build-definitions.ts`), not in the application bundle.

**Why.** The LADR_Definitions markdown files are structured enough to parse reliably with a proper AST; the heading hierarchy, code blocks, and front-matter follow a consistent convention. Hand-rolling a markdown parser would be slower to write and more fragile than the well-supported `unified` ecosystem. The typed AST (mdast) makes it straightforward to extract headings, paragraphs, and math blocks by node type.

**Implications.** The build script runs as `pnpm build:definitions` (or as a pre-build step via a Vite plugin). It produces a TypeScript file of `DefinitionRecord[]` at `src/pedagogy/definitions/generated.ts`. Hand-curated fields live in `src/pedagogy/definitions/overrides.ts` and are merged at build time (field-level replace — overrides win for each named field, no deep merging).

---

### ADR-015 — Animation timeline interpolates SessionSnapshot, not renderer props  (2026-05-11)

**Context.** The animation timeline (AI-005) needed to produce intermediate states between keyframes. Options: (a) interpolate at the renderer-props level — each renderer opts in and handles its own interpolation; (b) interpolate at the `SessionSnapshot` level — create an interpolated snapshot and pass it through `sessionViewFrom()` into `toProps`, which then produces interpolated renderer props automatically.

**Choice.** (b) — interpolate `SessionSnapshot` objects. `sessionViewFrom(interpolatedSnapshot)` is passed to `toProps` in `ViewContainer` when a fractional timeline position is active.

**Why.** (a) requires every renderer to implement interpolation logic, adding coupling and duplication. (b) requires zero renderer changes — the interpolated session view produces the correct intermediate renderer props through the existing registry machinery. The key insight is that `sessionViewFrom` accepts any `SessionSnapshot`, not just the live session's snapshot.

**Implications.** `interpolateSnapshots(a, b, t)` (in `src/interaction/timeline/interpolation.ts`) interpolates concrete vector components and matrix entries for matching object IDs; structural fields (spaces, bases, names) are taken from `a`. Non-interpolatable objects (abstract vectors, formula maps) fall back to `a`'s value. The `obj` passed to `visualizer.toProps` still comes from the live session (correct type/ID selection); only the `sessionView` argument changes.

---

### ADR-014 — Hand-rolled recursive-descent parser for Phase 6 input  (2026-05-11)

**Context.** The PRD asked the agent to decide: hand-rolled recursive-descent parser vs. a library (Chevrotain, Nearley, PEG.js) for the expression grammar covering matrices, vectors, and formula-kind linear maps.

**Choice.** Hand-rolled. Located in `src/interaction/parser/` (lexer.ts, parser.ts, types.ts).

**Why.** The grammar has ~6 production rules: scalar, matrix row, matrix, vector, formula parameters, formula body. This is small enough that a hand-rolled parser is shorter than the library configuration would be. More importantly, hand-rolled parsers produce dramatically better diagnostic output — we can point at the exact failing token position and emit a human-readable error for each rule violation. Generated parsers produce opaque error messages that require substantial additional tooling to improve.

**Implications.** The parser is intentionally narrow — it does not evaluate formula bodies symbolically. Formula inputs store the raw source string and the parameter list; the actual function body evaluation is deferred to Phase 7 (pedagogy layer), which has a full symbolic engine. The `ParsedFormula` result currently produces an identity-placeholder `LinearMap` that displays the formula string symbolically but does not evaluate it.

---

### ADR-013 — Geometric3DRenderer uses raw Three.js + useEffect, not React Three Fiber  (2026-05-11)

**Context.** Phase 5 specified `Geometric3DRenderer` using React Three Fiber (R3F). After implementation, `@react-three/fiber` 9.6.1 crashed on every production deploy with `TypeError: Cannot read properties of undefined (reading 'S')` during Canvas initialization. The error originated in R3F's fiber reconciler startup code, fired before any scene objects were created, and propagated past all React boundaries to unmount the entire app. Downgrading Three.js (0.184 → 0.176) did not fix it; the root cause is a Rollup ESM module initialization ordering issue specific to R3F's production bundle.

**Choice.** Rewrote `Geometric3DRenderer` using raw Three.js + `useEffect`, with `OrbitControls` from `three/addons/controls/OrbitControls.js`. R3F and drei remain installed but are not imported.

**Why.** R3F's value is its declarative React-style scene API. For a standalone rendering view with a fixed scene structure driven by props, the imperitive `useEffect` approach is equally expressive and does not require the fiber reconciler. The same visual output (AxesHelper, ArrowHelper, LineSegments grid deformation, OrbitControls) is achieved without R3F. Chunk size also improved: 874KB → 492KB gzip.

**Implications.** Do not import `Canvas` or any R3F hook until the production-build bug is resolved upstream. A `getContext()` guard in the useEffect allows the component to exit gracefully in WebGL-less environments (tests, old browsers) without throwing. `ViewErrorBoundary` was added as an additional safety net; this is worth keeping regardless of whether R3F is ever reintroduced.

---

### ADR-012 — Lazy computation pattern via `useComputation` hook  (2026-05-10)

**Context.** Phase 5 renderers need computed results (eigenvalues, null spaces, SVD) to render their full output. Two options: (a) eager — dispatch all likely computations when an object enters the session; (b) lazy — each renderer signals what it needs, triggering the engine call on first render if not cached.

**Choice.** Lazy pattern. A `useComputation` hook in `src/ui/hooks/` checks the `computationCache`, returns the cached result immediately if present, and fires the engine call + stores the result via `completeComputation` action on success. `toProps` reads from the cache via `sessionView`; if the result is absent, it returns `LoadingProps` so the renderer shows `LoadingState` until the computation resolves.

**Why.** Eager dispatch wastes computation on views the user never opens. Lazy is honest about cost. The `useComputation` hook is the *only* place renderer-adjacent code touches the engine — an ESLint boundary rule blocks direct engine imports from `src/renderers/`.

**Implications.** `toProps` functions that need engine output must be written in two parts: (1) check cache via `session.computationCache`, return `LoadingProps` if absent, return real props if present. (2) The React component calls `useComputation` to ensure the cache is populated. `useComputation` is not yet implemented (deferred to Stage 3 when MatrixRenderer needs it); Stage 1–2 visualizers (`coordinate-display`, `basis-display`, `symbolic-formula`) derive their output purely from session state and never need the engine.

---

### ADR-011 — F^0 is a valid concrete vector space  (2026-05-10)

**Context.** `mkVectorSpaceFn(field, 0)` was rejected with `INVALID_DIMENSION`; `mkVectorSpaceAbstract(field, label, 0)` was already permitted. The asymmetry becomes visible in Layer 3 whenever a visualizer needs to render the kernel of an injective map, the intersection of disjoint subspaces, or V/V.

**Choice.** Allow F^0. `mkVectorSpaceFn` now accepts `n = 0`. `mkBasis` now permits an empty vector list when the space has dimension 0. The zero vector of F^0 is represented by `mkConcreteVector(field, space, [], 0)` — an empty component list, which the factory already handled correctly.

**Why.** Axler defines F^0 = {0} as a valid vector space. Rejecting it forces downstream code to special-case the 0-dim result every time the type system lies about the underlying math. Allowing it is cleaner and consistent with how abstract spaces already behave.

**Implications.** Visualizer `applicable` predicates in Layer 3 must handle `dim === 0` gracefully — most geometric visualizers should return `false` for 0-dim spaces (nothing to draw), while structural visualizers (kernel-range diagram, symbolic display) are still applicable and should render the trivial space as a single node labeled `{0}`.

---

### ADR-010 — Comlink for Pyodide worker protocol  (2026-05-10)

**Context.** PRD §6 asked comlink vs. hand-rolled message protocol.

**Choice.** comlink 4.4.2.

**Why.** comlink wraps the postMessage/onmessage protocol in a transparent async function call interface, eliminating request-ID correlation boilerplate. The wire format is standard structured clone + comlink's thin framing; it is auditable by reading comlink's source. The `SymbolicAdapter` interface in `protocol.ts` documents the contract independent of comlink, so if comlink is replaced (e.g., for Transferable performance), only `pyodide-client.ts` changes.

**Implications.** `AbortSignal` is not transferable; the signal cannot be sent across the comlink boundary to the worker. Cancellation is documented as "reject without interrupting in-flight computation" for SymPy calls. This is recorded in the PRD and is consistent with SymPy's non-interruptible Python execution.

---

### ADR-009 — Pyodide CDN: jsdelivr pinned to v0.27.0  (2026-05-10)

**Context.** PRD §2.1 posed CDN vs. bundled Pyodide as a Decision. 10MB bundle is too large to bundle; CDN is the only practical option for this project's scope.

**Choice.** `https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs` — pinned to a specific version for reproducibility.

**Why.** Bundling Pyodide within Vite is possible but adds significant build-time and bundle-size overhead. CDN is the official recommended approach for browser Pyodide. jsdelivr is the most reliable CDN for Pyodide (the official Pyodide CDN mirrors to jsdelivr). Version pinning prevents silent upgrades breaking SymPy API compatibility.

**Implications.** Phase 2's Netlify deploy must work with CDN resources (no CORS issues for jsDelivr from Netlify). Version upgrade requires testing on a preview deploy, not just `pnpm verify`. The version pin `v0.27.0` in `sympy.worker.ts` must be bumped deliberately.

---

### ADR-008 — Mixed-provenance scalar promotion rule  (2026-05-10)

**Context.** PRD §6 asked: what does the engine do when a matrix has both rational and float entries?

**Choice.** Any float entry in the matrix → `numerical_only` for the entire matrix; the exact (SymPy) track is skipped.

**Why.** Attempting exact computation with float entries would require rationalizing floats (a heuristic). The results would be meaningless exact-looking answers derived from approximations. Better to be honest: if the user provides float data, the result is numerical.

**Implications.** Users who want exact eigenvalues must enter rational coefficients. This is the mathematically honest behavior; Layer 5 (input parsing) should warn when float input is entered in contexts where exact results are desired.

---

### ADR-007 — Basis construction for tensor and quotient spaces deferred to Phase 2  (2026-05-10)

**Context.** The `Basis` type is defined in Layer 0 and the factory `mkBasis` validates that vector count matches space dimension. For `tensor` and `quotient` spaces, constructing a canonical basis requires either knowing a basis for each factor/parent (tensor case) or representing coset representatives (quotient case) — both involve structural reasoning that overlaps with Layer 1 computation.

**Choice.** Declare the `Basis` type in Phase 1; defer factory calls on tensor/quotient spaces to Phase 2.

**Why.** The `mkBasis` factory can still be called on tensor/quotient spaces if the caller supplies vectors with the correct `space` ID and count. Phase 1 enforces the dimension check structurally when dimension is computable. Phase 2 can add higher-level helper functions (`mkTensorProductBasis`, `mkQuotientBasis`) that build basis vectors using Layer 1 facilities.

**Implications.** Phase 2 should add construction helpers. Nothing in Phase 1 prevents the type from being used; callers just have to supply basis vectors manually.

---

### ADR-006 — Space deduplication via content-addressed module-level registry  (2026-05-10)

**Context.** PRD §7 (open design question) asks whether factories should deduplicate structurally identical spaces. The session state uses `SpaceId` as key in Maps, so two R^3 spaces with different object references but the same content would create two entries.

**Choice.** Module-level `Map<string, VectorSpace>` in `src/types/space.ts`. Factories key by a content string (e.g., `space:Fn:R:3`). First call creates and registers; subsequent calls with the same content return the same object.

**Why.** Makes `selectedBasis: Map<SpaceId, BasisId>` behave correctly — dragging a vector into a pre-existing R^3 and a "newly created" R^3 should update the same basis slot. Without dedup, the user would see two R^3 entries in the session store that are mathematically the same space.

**Implications.** Tests must call `_resetSpaceRegistry()` in `beforeEach` to avoid cross-test leakage. Abstract spaces are keyed by `field+dim+label`, so two abstract spaces labeled the same share an ID — this is a feature (consistent with the equality semantics) but worth documenting for users.

---

### ADR-005 — SymExpr wire format: serialized string + vars list  (2026-05-10)

**Context.** Layer 0 must declare `SymExpr`'s shape without knowing how Phase 2 will marshal expressions across the Web Worker boundary.

**Choice.** `{ kind: 'symexpr'; serialized: string; vars: readonly string[] }`. The `serialized` field holds a string representation of the SymPy expression; `vars` lists the free variables. This is opaque to all Layer 0 consumers.

**Why.** Minimal: only what consumers need to know (that there is a serialized form and which variables appear free). Phase 2 has authority to revise the format when the worker bridge is built — it may switch to a binary encoding, a structured JSON form, or a different string dialect. Keeping it opaque ensures no consumers will break.

**Implications.** Phase 2 agent should record a revision of this ADR if the wire format changes. Consumers must never destructure `serialized` or assume its grammar.

---

### ADR-004 — Scalar.rational stores Fraction (Fraction.js) not {num: bigint; den: bigint}  (2026-05-10)

**Context.** Technical Architecture §Layer 0 sketches `{ kind: 'rational'; num: bigint; den: bigint }`. Fraction.js is listed in the Tech Stack for rational arithmetic.

**Choice.** `{ kind: 'rational'; value: Fraction }` where `Fraction` is the Fraction.js class.

**Why.** Using the Fraction type directly avoids wrapping and unwrapping: all arithmetic operations (`add`, `mul`, `inverse`, etc.) are native Fraction methods. The bigint sketch in the architecture was illustrative; the Tech Stack table is authoritative on Fraction.js as the implementation.

**Implications.** Fraction.js uses JS numbers internally (`.n`, `.d`) — not bigints — so precision is limited to 2^53 for numerator/denominator. For the range of values in a linear algebra sandbox this is sufficient. If exact large-integer arithmetic becomes necessary (e.g., symbolic determinant over very large integer matrices), revisit.

---

### ADR-001 — CI host: GitHub Actions  (2026-05-09)

**Context.** The Phase 0 sub-PRD assumed GitHub Actions for CI without confirming. Originally posed as Open Question on 2026-05-09.

**Choice.** GitHub Actions.

**Why.** Confirmed by Elena. Aligns with the GitHub-hosted-repo assumption baked into tooling defaults; no integration overhead.

**Implications.** Phase 0 lands `.github/workflows/verify.yml` running `pnpm install --frozen-lockfile && pnpm verify` on push and PR. No deployment from CI — deployment is Netlify's concern (see ADR-002).

---

### ADR-003 — Loading & progress communication: joyful-but-substantive  (2026-05-09)

**Context.** Pyodide's 2–5s cold start is the most prominent wait state, but not the only one — symbolic operations on larger matrices, Jordan form, scene-template loading, and animation set-up will all introduce latencies the user experiences. Whether and how to communicate during these waits is a design choice that sets the tool's tonal register.

**Choice.** Adopt a rotating short-message style modeled on Claude Code's "thinking" messages: short, evocative verb/gerund forms, varied, playful but not saccharine, never apologetic. For the LADR Visualizer specifically, draw on the mathematical vocabulary the project is already steeped in. Words like *Composing*, *Diagonalizing*, *Spanning*, *Tensoring*, *Conjugating*, *Resolving*, *Decomposing* do double duty: evocative as English and referencing the actual operations the engine is performing.

**Why.** Elena's stated design intent — "joyful-but-substantive" is her phrasing and captures the bar precisely. The mathematical vocabulary is unusually well-suited to this pattern. Adopting the style early sets the tonal register for the whole tool and rules out the flat-corporate defaults ("Loading…", "Initializing computation engine…") that would be tonally off-key.

**Implications.**
- All loading and progress states throughout the tool follow this pattern, not just Pyodide cold-start. Long symbolic computations, scene-template loads, Gram-Schmidt animation set-up, etc.
- Phase 0's placeholder text adopts the style — the first commit should already be tonally on-key, not deferred until Phase 2 ships the loading machinery.
- Phase 2 implements a rotating message pool with random selection on a ~1–2 second cadence. The pool is curated, not auto-generated; aim for ~30–50 messages so repetition is rare within a single load.
- Adjacent UI affordances (empty states, error copy, undo notifications) should also avoid the flat-corporate register, though they need not strictly use the gerund pattern.
- A future ADR may codify the message pool itself once curated; for now, leave its construction to the implementing phase but constrain the style.

---

### ADR-002 — Static host: Netlify  (2026-05-09)

**Context.** Pyodide's ~10–12MB asset payload makes static-host choice non-trivial: bandwidth caps, WASM MIME types, and COOP/COEP headers all matter. Originally posed as Open Question on 2026-05-09.

**Choice.** Netlify.

**Why.** Elena's preferred static host. Concrete suitability check:
- *Bandwidth.* Free tier is 100GB/month; with proper caching ≈ 8,300 cold loads/month. Adequate for the project's expected scale; Pro tier scales to ~85,000 if needed.
- *WASM MIME.* Netlify serves `.wasm` with `application/wasm` by default. Verify in Phase 2; if a `_headers` override is needed, add it then.
- *Caching.* Pyodide assets are versioned/immutable, so they cache effectively at Netlify's edge and in browsers — first load is the only expensive one for a returning user.
- *COOP/COEP headers.* Required *only* if Pyodide is configured with `SharedArrayBuffer`. Defer this decision to Phase 2; if SAB is enabled, add the headers via `netlify.toml`. Until then, no special headers are required.

**Implications.**
- Phase 0 does not need Netlify configuration files yet — the build output `dist/` from `pnpm build` is the only artifact Netlify needs, and it'll work with default settings.
- Phase 2 verifies WASM MIME serving is correct on a Netlify deploy preview before declaring Pyodide integration complete.
- If SAB is later enabled, ADR-002 is revised (or superseded) to document the header config.

---

## Gotchas

Each entry: the constraint, where it bites, and the workaround if any. Keep entries terse — this is reference material, not narrative.

Format:

```markdown
### Short title

**Constraint.** What it is.
**Bites at.** Where the constraint shows up (specific layer, file, operation).
**Workaround.** How to handle it; "none — accept the constraint" is a valid answer.
```

### Zustand `useStore` selector must return a primitive, not an object literal

**Constraint.** `useStore(store, selector)` wraps React's `useSyncExternalStore`. That API compares the selector's return value with `Object.is` between renders. If the selector returns a new object literal on every call — even one containing stable primitive values — `Object.is({}, {})` is always `false`, so React sees the state as perpetually changing and enters an infinite re-render loop, throwing error #185 ("Maximum update depth exceeded").
**Bites at.** Any component using `useStore(defaultStore, (s) => ({ a: s.x, b: s.y }))`. Crashed `App.tsx` in Phase 6 in production (the demo seed's first `openView` call triggered a store update, which triggered the loop).
**Workaround.** Either (a) use separate `useStore` calls for each value — `const x = useStore(store, s => s.x)` — so each returns a primitive; or (b) import `useShallow` from `zustand/react/shallow` and wrap the object selector. Option (a) is simpler for small numbers of values. Never return a new object literal from a selector without shallow equality protection.

---

### R3F 9.x fails to initialize in Vite/Rollup production bundle

**Constraint.** `@react-three/fiber` 9.6.1 throws `TypeError: Cannot read properties of undefined (reading 'S')` during Canvas initialization in a Vite production build. The error fires in R3F's fiber reconciler initialization code (not in user scene code), crashes before any Three.js scene objects are created, and propagates past React Suspense boundaries — taking down the entire app. Downgrading Three.js (0.184 → 0.176) does not fix it. The root cause is a module initialization order issue in Rollup's ESM output where R3F's module-level initialization code runs before some Three.js namespace bindings are resolved.
**Bites at.** Any component that imports and renders `<Canvas>` from `@react-three/fiber` in a Vite production build. The error does not reproduce in development (`pnpm dev`) or in tests (mocked Canvas).
**Workaround.** Use raw Three.js + `useEffect` instead of R3F. `THREE.WebGLRenderer`, `THREE.AxesHelper`, `THREE.ArrowHelper`, `THREE.LineSegments`, and `OrbitControls` from `three/addons/controls/OrbitControls.js` are sufficient for the current renderer and avoid the reconciler initialization entirely. `@react-three/fiber` and `@react-three/drei` remain installed but unused — do not import `Canvas` or any R3F hook until this is resolved upstream.

---

### `import.meta.env.MODE` in engineInstance.ts

**Constraint.** `engineInstance.ts` uses `import.meta.env.MODE === 'test'` to pick MockAdapter vs. PyodideClient. This is a Vite/Vitest-specific API — it works in the browser build and in Vitest, but it will fail if someone tries to run the file outside those environments (e.g., raw Node.js or a non-Vite bundler).
**Bites at.** `src/compute/engineInstance.ts`. If the project ever adds a non-Vite test runner or a Node.js script that imports this file.
**Workaround.** None needed for current setup. If a non-Vite environment is added, wrap in `typeof import.meta !== 'undefined'` or pass the adapter as a parameter instead.

---

### `useComputation` in-flight deduplication uses a ref, not store state

**Constraint.** `useComputation` tracks whether a computation is in-flight using `inFlightRef` (a React ref), not via the Zustand `pendingComputations` store slice. Multiple components calling `useComputation` with the same key will each fire their own `compute()` call — there is no cross-component deduplication.
**Bites at.** `src/ui/hooks/useComputation.ts`. If the same computation key is used by two simultaneously mounted components (e.g., two views of the same map both showing `eigenline-2d`).
**Workaround.** For now: tolerable (race condition resolves correctly because `cacheResult` is idempotent — the last write wins). Proper fix: check `state.pendingComputations` for the key before calling `compute()`, and call `startComputation` to register the in-flight entry. Deferred to Phase 6 when the pending state becomes user-visible.

---

### Netlify build: npm crashes on `engines.pnpm` and Node 24

**Constraint.** npm 10/11 crashes with `Cannot read properties of null (reading 'matches')` when `package.json` has `"engines": { "pnpm": ">=8" }`. Separately, Node 24 (npm 11) has the same crash. Both produce an opaque error that hides the real cause.
**Bites at.** Any Netlify deploy that uses the `npm run build` or `npm install` command.
**Workaround.** Remove non-npm keys from `engines` (keep only `"node": ">=20"`). Also set `.nvmrc` to `20` not `24`. Use `pnpm install && pnpm build` in `netlify.toml` — Netlify's bundled pnpm (10.30.3) works correctly and respects `onlyBuiltDependencies`.

---

### KaTeX quirks-mode warning in Vitest / happy-dom

**Constraint.** KaTeX logs "KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype." in tests. happy-dom simulates a document without a `DOCTYPE` declaration, which triggers quirks mode.
**Bites at.** Any `*.test.tsx` file that renders `SymbolicRenderer` or any component that calls KaTeX. Appears as a console warning, not a test failure.
**Workaround.** None needed — KaTeX still renders correctly (the warning is cosmetic). Suppress or ignore in test output. Adding a DOCTYPE to happy-dom's document is possible via `document.doctype` manipulation in `test/setup.ts`, but the current noise level is acceptable.

---

### Fraction.js v5: .s, .n, .d are typed as bigint

**Constraint.** `Fraction` class from Fraction.js v5 types `.s` (sign), `.n` (numerator magnitude), `.d` (denominator) as `bigint`. TypeScript will reject comparisons with number literals like `=== 1` — use `=== 1n` instead.
**Bites at.** Any code that reads Fraction properties directly — primarily `scalarToLatex` in `src/registry/index.ts`.
**Workaround.** Use bigint literals: `f.d === 1n`, `f.s < 0n`. ADR-004 documents that at runtime the values are JS numbers, but the TypeScript types say bigint.

---

### Matrix lacks reverse lookup to SpaceId *(resolved AI-001, 2026-05-10)*

`SessionView` now has `getSpaceForBasis(id: BasisId): SpaceId | undefined`. The `spaceIdOfMatrix` helper in `engine.ts` still uses the old cast internally (it's not wired to a session); Layer 3 should thread a `SessionView` through to engine calls and use this method when reconstructing result vectors.

### matrixOf returns null-cast-as-Matrix for unsupported map kinds *(resolved AI-002, 2026-05-10)*

`matrixOf` now returns `Promise<MatrixOfResult>` where `MatrixOfResult` is a discriminated union `{ kind: 'success'; ... } | { kind: 'not_representable' }`. Callers must match on `kind` before accessing matrix data.

### Zustand 5: createStore moved to zustand/vanilla

**Constraint.** In Zustand 5, the vanilla (non-React) `createStore` is exported from `zustand/vanilla`, not `zustand`. Importing from `zustand` gives the React hook version.
**Bites at.** Any non-React code (tests, server code, Layer 2 store factory) that creates a store without React.
**Workaround.** `import { createStore } from 'zustand/vanilla'`. The React hook wrapper is a separate step if needed.

### castDraft vs. `as Draft<T>` for Immer readonly assignments

**Constraint.** Layer 0 types have `readonly` arrays (e.g., `readonly SpaceId[]` in tensor/product VectorSpace). Assigning them into Immer Draft slots requires removing the readonly, but `as Draft<T>` casts trigger ESLint's `no-unnecessary-type-assertion` rule (even when TypeScript actually needs them due to the readonly mismatch). The rule's analysis differs from TypeScript's actual assignability check.
**Bites at.** `src/state/store.ts` — any action that assigns a Layer 0 type with deeply readonly fields into a Draft slot.
**Workaround.** Use `castDraft(value)` from Immer. It's a runtime no-op that converts `T → Draft<T>`. ESLint doesn't flag it as an unnecessary assertion because it's a function call, not a cast expression.

### Undo/redo idempotency interactions with tests

**Constraint.** `setField` and `setActiveBasis` are guarded: if the new value equals the current value, they return without pushing a history entry. A test that calls `setField('C')` when the state is already `field='C'` (e.g., right after `undo()` that landed on a C snapshot) is a no-op and does NOT invalidate the redo branch.
**Bites at.** Tests for redo-branch invalidation must use values that actually change the state.
**Workaround.** In redo-branch tests, always use a value that differs from the current undo'd state. The test is "new action after undo invalidates redo", not "same action after undo invalidates redo".

---

### ml-matrix TypeScript types vs. runtime property names

**Constraint.** `SingularValueDecomposition` TypeScript types use `.leftSingularVectors` / `.rightSingularVectors`, while `EigenvalueDecomposition` uses `.eigenvectorMatrix`. The runtime also has `.U` and `.V` as aliases, but the TypeScript declarations don't expose them.
**Bites at.** `src/compute/numerical/mlmatrix.ts` — always use the TypeScript-declared names.
**Workaround.** Use `.leftSingularVectors`, `.rightSingularVectors`, `.eigenvectorMatrix` — these match both the TypeScript types and runtime.

### QR decomposition sign convention

**Constraint.** ml-matrix's `QrDecomposition` may return sign-flipped column vectors in Q (and correspondingly in R) for the Householder QR algorithm. Q is still orthogonal and R is still upper-triangular, but diagonal entries may be negative.
**Bites at.** Tests for QR of identity and similar "known" matrices.
**Workaround.** Test `|diagonal|` equals expected magnitude rather than checking sign.

### LuDecomposition has a .determinant property

**Constraint.** Computing determinant from the U diagonal times permutation sign is error-prone. `LuDecomposition` exposes `.determinant` directly.
**Bites at.** Any manual determinant computation via LU.
**Workaround.** Use `lu.determinant` — it is already computed correctly by the library.

### Fraction.js silently dropped from package.json

**Constraint.** After `pnpm add fraction.js` in Phase 1, Prettier's reformat of `package.json` appeared to drop the entry (or it was never written). The package remained importable as a transitive dep, so typecheck passed, but a fresh `pnpm install --frozen-lockfile` would fail.
**Bites at.** CI fresh installs, new developer checkouts.
**Workaround.** Re-added in Phase 2. Watch for this pattern with any `pnpm add` call followed by Prettier format — verify `package.json` has the new dep before committing.

### noUncheckedIndexedAccess + internal array invariants

**Constraint.** TypeScript returns `T | undefined` for any array index access under `noUncheckedIndexedAccess`, even when the index is provably in bounds (e.g., last element of a non-empty array).
**Bites at.** `src/types/polynomial.ts` (`leadingCoefficient`, `constantTerm`), `src/types/matrix.ts` (`entry`, `rowOf`), and anywhere else with invariant-protected array access.
**Workaround.** Check for `undefined` and throw an `invariantViolation()` in cases guaranteed by the factory to be valid. The throw documents that the only way to reach it is a bug, not user input.

### pnpm 11 build script security defaults

**Constraint.** pnpm 11 blocks post-install build scripts by default. `esbuild` (used by Vite internally) needs a build script to install its native binary.
**Bites at.** `pnpm install` — exits with `ERR_PNPM_IGNORED_BUILDS` if `esbuild` is not approved.
**Workaround.** Add `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }` to `package.json`. Already done in Phase 0. Any future package that requires a build script must be added to this list.

### skipLibCheck required for Vite + Vitest type defs

**Constraint.** Vite and Vitest ship `.d.ts` files that reference Node.js internals (`node:http`, `Buffer`, etc.) and use optional property conventions that conflict with `exactOptionalPropertyTypes: true`.
**Bites at.** `tsc --noEmit` — fails with dozens of errors in `node_modules` if `skipLibCheck: false`.
**Workaround.** `skipLibCheck: true` in `tsconfig.json`. This is the canonical Vite + TypeScript setup; it does not relax strictness on our own code.

---

## Open Questions

Items waiting on Elena's input or on information not yet known. Each carries `[OPEN]` until resolved. On resolution, replace with the resolution and a date, or — if architecturally significant — move into Decisions.

Format:

```markdown
### Short title  [OPEN]
Posed: YYYY-MM-DD

The question, in 1–3 sentences. What blocks resolution. What the asker would do absent an answer (the default).
```

### Design language document  [RESOLVED 2026-05-11]

**Resolution.** Design language created by Claude Design and imported into the project. Primary reference: `Program/Design/Design Language.html` (open in browser). Development directives: `Program/Design/DESIGN.md`. CSS tokens: `Program/Design/app/styles.css`. Design conversation/rationale: `Program/Design/chats/chat1.md`.

Summary of design decisions: Bone palette (near-neutral warm paper) as default; Geist for UI, Geist Mono for technical metadata, STIX Two Text italic for mathematics only; honesty badges on every visualization (kind: geometric/abstract/matrix/spectral/symbolic + exact/approximate chip); Browse mode (editorial catalog) + Sandbox mode (three-column workbench) sharing the same token system. The five Phase 6→7 open questions are answered in `Program/Design/DESIGN.md §Open design questions — answered`.

### Zero-dimensional concrete spaces (F^0)  [RESOLVED 2026-05-10]

**Resolution.** Allow F^0. See ADR-011. `mkVectorSpaceFn(field, 0)` now succeeds; `mkBasis` allows empty basis for dim-0 spaces; the zero vector of F^0 is `mkConcreteVector(field, space, [], 0)` (empty component list).
