# CONTEXT — Project briefing for a fresh agent

Read this file if you have no memory of prior conversations on the LADR Visualizer project. It captures the arc of the work so far, the user's stated preferences, design intent that lives outside the formal documents, and where to pick up. After reading this, proceed to the standard onboarding flow in `PRD/00 — Development Standards.md` §3.1.

This file is *narrative and meta*. It does not duplicate the formal specs — it points at them, and supplies the context that an agent picking up cold would otherwise lack.

---

## The user

Elena. The persistent details that should shape how you work with her:

**Communication preferences (in her own words).** "I almost always would prefer abstraction to analogies. I find analogies to create ambiguity, especially in conceptual discussions. I like examples, but as a supplement, not a substitute. Finally, I would rather be given a more nuanced and complex answer than one that has been flattened or stripped." She means this — write in prose paragraphs, not bullet lists; preserve nuance rather than collapsing to clean takeaways; use examples to supplement claims, not stand in for them. The PRD set deliberately mirrors this register.

**Technical depth.** Elena engages seriously with mathematical and software-architecture content. Assume comfort with discriminated unions, type theory, linear algebra at the level of Axler's book, the distinction between symbolic and numerical computation. Do not flatten technical explanations.

**Working environment.** The code repo is at `/Users/elenamaher/code/claude/LADR/`. There is a separate Obsidian vault at `/Users/elenamaher/Documents/obsidian general/everything/3 - Main/LADR/`. The `Program/PRD/dev-notes` structure in the code repo is the authoritative copy for development.

**Design intent: "joyful-but-substantive."** Her phrase. Rotating gerund loading messages (*Spanning.*, *Diagonalizing.*, etc.), non-apologetic error copy, empty states that are evocative not bureaucratic. ADR-003 in `NOTES.md`. Affects everything from Phase 0 forward.

**Working style.** Elena values periodic step-back reviews — she will explicitly ask for them before major phases. She trusts agent technical judgment on implementation details (she deferred on ESLint warning policy, accepted architectural decisions without pushback), but she expects to be consulted on decisions that are "difficult to modify later." She is direct and trusts directness in return. Do not bury concerns in lists of compliments.

---

## What this project is

A web-based mathematical sandbox for exploring concepts from Sheldon Axler's *Linear Algebra Done Right*. The core commitment: geometric views where geometry is honest (≤ 3D), structured abstract representations (diagrams, matrix heatmaps, symbolic) where abstraction is the actual mathematical content. A sandbox, not a presentation tool. For full framing: `Program/Project Overview.md`. For the binding technical spec: `Program/Technical Architecture.md`.

---

## Where the project stands (2026-05-11)

**Phases 0–6 complete.** 304 tests passing (25 test files). Live at `https://linear-algebra-seen-right.netlify.app` (Netlify site ID: `8fef8434-8fc8-4f31-8b3e-e098a1d27134`).

**Phase 5 complete.** All six renderers ship: SymbolicRenderer (KaTeX), MatrixRenderer (CSS heatmap), DiagramRenderer (dagre), Geometric2DRenderer (D3/SVG, drag-to-edit), ChartRenderer (rank-nullity bar), Geometric3DRenderer (raw Three.js + useEffect — **NOT** R3F, see ADR-013). The `Geometric3DRenderer` lazy-loads via `React.lazy` in ViewContainer.

**Phase 6 complete.** All interaction layer features ship:
- Stage 1 (view management): `ViewCard` with object name, visualizer label, "+ view" dropdown, ✕ close button.
- Stage 2 (input parsing): hand-rolled recursive-descent parser in `src/interaction/parser/`. Accepts `[[1,2],[3,4]]` (matrix), `(1,-2,3)` (vector), `T(x,y) = (x+y, x-y)` (formula). `ObjectInput` component in App footer.
- Stage 3 (direct manipulation): `Geometric2DProps.onArrowDrag` callback; `ViewContainer` wires it for vector refs; `updateVector` action in the store.
- Stage 4 (parameter controls): `FieldToggle` (ℝ/ℂ) and undo/redo buttons in App header.
- Stage 5 (animation timeline): `src/interaction/timeline/` — `TimelineKeyframe`/`TimelineState` types, `interpolateSnapshots(a, b, t)`, `TimelineContext` (RAF playback), `TimelineScrubBar` UI. `ViewContainer` injects interpolated snapshot; zero renderer changes (ADR-015).

**No open action items.** AI-001 through AI-005 all resolved. **Phases 0–7 complete.** Phase 8 (Pedagogy Layer) is next. Read `PRD/08` and `Program/Design/DESIGN.md §Browse mode` before starting. No Phase 8 components may use hardcoded hex values — Phase 7 established the full CSS token system for this purpose.

---

## Key architectural decisions

**RendererProps** is a discriminated union with `LoadingProps` as the "not ready yet" member. `toProps(obj, sessionView)` checks `sessionView.getCachedResult(key)` and returns `LoadingProps` when computation isn't cached. `ViewContainer` renders `<LoadingState />` for pending props. `useComputation` in `src/ui/hooks/useComputation.ts` is the only place that triggers engine calls — renderers never call the engine directly (ESLint boundary enforced).

**`ViewContainer`** (`src/ui/ViewContainer.tsx`) is the integration hub. It: subscribes to the store, builds `sessionView`, finds the applicable visualizer, calls `toProps`, wraps in `ViewErrorBoundary`, and dispatches to `renderConcrete`. The `onArrowDrag` callback is wired here for vector-kind objects in 2D views. **For the timeline (AI-005): this is where the interpolated session view will be injected** — if `TimelineProvider` has an active interpolated snapshot, use `sessionViewFrom(interpolatedSnapshot)` instead of `sessionViewFrom(session)` when calling `toProps`.

**`visualizerRegistry`** singleton (from `src/registry/index.ts`). For tests: use `new VisualizerRegistry()` directly. `_resetSpaceRegistry()` in `beforeEach` to avoid cross-test ID deduplication leakage.

**`sessionViewFrom(snapshot)`** (`src/state/session-view.ts`): wraps any `SessionSnapshot` into a `SessionView` that `toProps` can consume. This is the key to the timeline: interpolating two snapshots and calling `sessionViewFrom` gives you a `SessionView` that renders the interpolated state without touching the live session or any renderer code.

**`engineInstance.ts`**: `getEngine()` lazy singleton. `import.meta.env.MODE === 'test'` selects MockAdapter vs. PyodideClient.

**Netlify build config** (`netlify.toml`): `pnpm install && pnpm build`, Node 20 (`.nvmrc = '20'`). `engines.pnpm` must be absent from `package.json` — npm crashes on it.

**Zustand selectors**: ALWAYS return primitives from selectors, never object literals. `useStore(store, s => ({ a: s.x }))` causes infinite re-renders via `useSyncExternalStore`'s `Object.is` comparison. Use `useStore(store, s => s.x)` separately for each value. See NOTES.md gotcha.

---

## Registry structure (post-split)

```
src/registry/
├── types.ts      — RendererKind, all RendererProps subtypes, MathObject, MathObjectKind, Visualizer<T>
├── helpers.ts    — scalarToLatex, scalarToNumber, computeRank, spaceToLatex, spaceToDiagramLabel, matrixToProps, mapDim
├── registry.ts   — VisualizerRegistry class
├── defaults.ts   — LINEAR_MAP_VISUALIZERS, VECTOR_SPACE_VISUALIZERS, VECTOR_VISUALIZERS, registerDefaults()
└── index.ts      — visualizerRegistry singleton + re-exports everything above
```

All imports outside the registry use `from '../registry/index.ts'` — nothing changed for consumers.

---

## The demo seed

`src/demo.ts` is imported by `main.tsx` and populates the session with demo objects on every page load. It is marked for removal when Phase 6 is complete and users can create everything via `ObjectInput`. Current demo: ℝ² (symbolic + coord axes), ℝ³ (symbolic + geometric_3d axes), vector v = (3/4, -1/2) in ℝ² (symbolic + arrow-2d — draggable), vector w = (1, -1, 2) in ℝ³ (symbolic + arrow-3d), map A = [[1,2],[3,4]]: ℝ²→ℝ² (matrix heatmap + kernel/range diagram + grid-deformation-2d + rank/nullity chart), formula map T: T(x,y)=(x+y, x-y) (symbolic formula + kernel/range diagram).

## Current src/ structure relevant to Phase 6 completion

```
src/
  interaction/
    controls/         FieldToggle.tsx
    parser/           lexer, parser, types, index, parser.test
    timeline/         types.ts, interpolation.ts, TimelineContext.tsx (+ tests)
    index.ts          exports TimelineProvider, useTimeline
  ui/
    App.tsx           TimelineProvider wrapper; header + ViewGrid + TimelineScrubBar + ObjectInput
    ViewCard.tsx      per-view card with header controls
    ViewContainer.tsx integration hub — injects interpolated sessionView when timeline active
    ViewGrid.tsx      grid layout using ViewCard
    ObjectInput.tsx   expression parser input bar
    ViewErrorBoundary.tsx  class error boundary
    TimelineScrubBar.tsx   play/pause, scrub track, ⊕ Keyframe button
    hooks/
      useComputation.ts
```

---

## Design language

A full design language was created by Claude Design and imported into the project (2026-05-11). The design covers the full Browse + Sandbox UI, palette/typography/spacing tokens, honesty badge system, and cross-mode flow. Every component written in Phase 7+ must use design tokens rather than hardcoded values. Phase 7 migrates existing Sandbox components; Phase 8 and beyond builds new components natively on the token system.

**Primary references:**
- `Program/Design/Design Language.html` — open in browser; the full visual reference (principles, palette swatches, type specimens, layout diagrams, do/don't table)
- `Program/Design/DESIGN.md` — development directives: what the design requires of the implementation, gap analysis against the current codebase, Phase 7 open questions answered
- `Program/Design/app/styles.css` — the CSS token definitions; import into the app's global stylesheet
- `Program/Design/chats/chat1.md` — the full design conversation with rationale

Key decisions from the design session: **Bone palette** (near-neutral `#f2f1ef`) as default; **Geist** for UI, **Geist Mono** for technical metadata, **STIX Two Text italic** for mathematics only; honesty badges on every visualization (kind badge + exact/approximate chip); Browse mode (editorial catalog) and Sandbox mode (three-column workbench) sharing the same token system.

## Documents to read (in order, for new agents)

1. **This file** (`dev-notes/CONTEXT.md`) — you're here.
2. **`Program/Project Overview.md`** — framing.
3. **`Program/Technical Architecture.md`** — binding technical spec.
4. **`Program/PRD/00 — Development Standards.md`** — master PRD, working agreement.
5. **`Program/PRD/08 — Layer 6 (Pedagogy Layer).md`** — Phase 8 sub-PRD (not started). Current phase.
6. **`Program/Design/DESIGN.md`** — design language directives; read before any Phase 8 UI work.
7. **`Program/PRD/09 — Design System Integration.md`** — Phase 7 sub-PRD (complete, for reference).
7. **`dev-notes/DEVLOG.md`** — skim the most recent 5 entries.
8. **`dev-notes/NOTES.md`** — skim end-to-end (ADRs 011–017, gotchas, open questions).
9. **`dev-notes/ACTION_ITEMS.md`** — currently no open items.

---

## The working agreement, in one paragraph

This project assumes every agent is stateless — memory of prior work lives only in files. The dev-notes are the bridge. Every session must end with a devlog entry, and anything a future agent needs (a decision rationale, a library quirk, an open question) must be promoted to NOTES or ACTION_ITEMS before the session closes. Sub-PRDs are amendable by agents working in their phase; the architecture document and project overview are not. The full agreement is in master PRD §3.

---

## Stylistic notes

The PRDs are written in prose, not bullet lists, because that matches Elena's communication preference and because nuance lives in the connective tissue between claims. Match the register — verbose where verbose helps, terse where terse helps, never flat.

The placeholder text Phase 0 shipped is `"Spanning."` — single word, gerund, no apology. Loading messages draw on mathematical vocabulary: *Composing*, *Diagonalizing*, *Tensoring*, *Resolving*, *Conjugating*. Verbs that already sound like processes do double duty as evocative English and as honest descriptions of what the engine is doing.
