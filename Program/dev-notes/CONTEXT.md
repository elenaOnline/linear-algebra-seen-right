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

## Where the project stands (2026-05-12)

**Phases 0–8 complete.** 312 tests passing (25 test files). GitHub: `elenaOnline/linear-algebra-seen-right`. Live at `https://linear-algebra-seen-right.netlify.app` (Netlify site ID `8fef8434-8fc8-4f31-8b3e-e098a1d27134`; GitHub auto-deploy link pending — trigger deploys manually from Netlify dashboard until configured).

**Phase 7 (Design System):** Bone palette (`#f2f1ef`); Geist/Geist Mono/STIX Two Text italic fonts; CSS tokens in `src/styles/tokens.css`; `KindBadge` + `ProvenanceBadge` on every tile; top-bar shell with Browse/Sandbox mode toggle; tile-head/body/foot structure; symbol palette in input bar. Zero hardcoded hex values in `src/ui/`.

**Phase 8 (Pedagogy Layer):** Browse mode (catalog grid with KaTeX-rendered definitions, concept cards, side panel, "Open in Sandbox"); Sandbox three-column layout (ObjectLibrary + ViewGrid + Inspector); `applyScene` store action for atomic scene loading; `loadScene.ts` + 5 real scene templates + 14 placeholder stubs; 7 example-generator constraints in `GeneratorPanel`; `pnpm build:definitions` script (unified+remark-parse) generating `src/pedagogy/definitions/generated.ts` from `LADR_Definitions/`. **Four post-launch bugs fixed:** LaTeX rendering (`LatexText` component), Open-in-Sandbox empty session (`applyScene` atomic action), "+ view" dropdown clipped by tile stacking context (React portal), vector drag not updating (ID preservation bug in `onArrowDrag`).

**Phase 9 (Content Expansion) — in progress, paused.** All 14 placeholder templates replaced with real builds (19 templates total). Chapter 3 overrides complete (30 definitions, §3.A–3.F). Generator constraints: 17 (target ~30). Chapters 4–9 overrides remain. After any override edits: `pnpm build:definitions` locally, commit `generated.ts`.

**Phase 10 (Connected Sandbox) — complete.** AI-006 (formula map evaluation), AI-007 (Inspector computed: rank/nullity/det), AI-008 (deletion + ObjectLibrary ✕ buttons), AI-009 (named-object referencing + `DerivedVector`/`DerivedMap` with live `recomputeDerived`). 338 tests. See ADR-018 + devlog.

**Phase 11 (Design Debt & UX) — in progress.** See `PRD/11 — Design Debt & UX.md`.
- **11A complete:** Live KaTeX preview in ObjectInput, context-aware two-palette system (label vs. expression), π/e/i as numeric constants, Tab slot navigation, `^` power in formula evaluator.
- **11B complete:** `DIAGRAM_THEME` single source of truth (`src/ui/theme/diagram.ts`); all five renderers import from it; ESLint enforces no raw hex in renderers. Six semantic color tokens in `tokens.css`. SVG catalog thumbnails in BrowseMode. Tile resizing (drag handle on ViewCard right edge, `fr`-unit column tracking in ViewGrid, localStorage persistence).
- **11C complete:** ADR-019 recorded (Option A: Sandbox tile headers use action verbs — Plot 2D/3D, Draw as diagram, Matrix view, Spectrum, Symbolic; Browse filter chips unchanged). `originDefId` threading so Inspector shows source definition on Browse→Sandbox entry. Derivation edge labels (`= v + w`, `= A ∘ B`) in tile-head chrome for derived objects. CSS pulse animation on derived tiles when `recomputeDerived` updates cached values.
- **11D next:** URL hash persistence via `CompressionStream`/`DecompressionStream`, localStorage auto-save last 5 sessions, Copy Link button in Sandbox toolbar.

**Phase 9 (Content Expansion) — paused, resumes after Phase 11.** Chapters 4–9 overrides, more generator constraints.

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

## Current src/ structure (Phase 8 complete)

```
src/
  styles/
    tokens.css        CSS custom properties — Bone palette (default), 3 alternates, kind tints,
                      type scale, spacing, font stacks. Import once in main.tsx.
  interaction/
    controls/         FieldToggle.tsx
    parser/           lexer, parser, types, index, parser.test
    timeline/         types.ts, interpolation.ts, TimelineContext.tsx (+ tests)
    index.ts          exports TimelineProvider, useTimeline
  pedagogy/
    definitions/      types.ts, overrides.ts, generated.ts (auto), index.ts
    templates/        types.ts, starters.ts (19 real templates — Ch1-3), index.ts + getTemplateById()
    generator/        types.ts, constraints.ts (7 starter), index.ts
    loadScene.ts      calls store.applyScene(build) — ADR-017
  ui/
    App.tsx           top bar (brand, Browse/Sandbox toggle, field pill, undo/redo); SandboxLayout
                      (three-column: ObjectLibrary|ViewGrid|Inspector); BrowseMode wired
    BrowseMode.tsx    catalog grid, concept cards, side panel, "Open in Sandbox" CTA
    ViewCard.tsx      tile-head/body/foot; "+" view dropdown via React portal (escapes overflow)
    ViewContainer.tsx integration hub — onArrowDrag preserves original vector ID (bug fix)
    ViewGrid.tsx      grid layout using ViewCard
    ObjectInput.tsx   expression parser input bar + symbol palette
    ObjectLibrary.tsx left column — grouped math objects, accent selection
    Inspector.tsx     right column — kv properties, "Open as" pills, GeneratorPanel
    GeneratorPanel.tsx constraint picker + 7 generator constraints
    KindBadge.tsx     kind chip (geometric/abstract/matrix/spectral/symbolic)
    LatexText.tsx     renders $...$  inline LaTeX via katex.renderToString
    ProvenanceBadge.tsx  exactness chip (exact/approximate)
    ViewErrorBoundary.tsx  class error boundary
    TimelineScrubBar.tsx   play/pause, scrub track, ⊕ Keyframe button
    LoadingState.tsx  rotating gerund messages
    hooks/
      useComputation.ts
scripts/
  build-definitions.ts  pnpm build:definitions — unified+remark-parse → generated.ts
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
5. **`Program/Design/DESIGN.md`** — design language directives. All new components use CSS tokens.
6. **`dev-notes/DEVLOG.md`** — skim the most recent 5 entries.
7. **`dev-notes/NOTES.md`** — skim ADRs 011–017, gotchas (especially `mkConcreteVector` ID bug, Zustand selector, R3F crash), open questions.
8. **`dev-notes/ACTION_ITEMS.md`** — no open items.
9. **`Program/PRD/08 — Layer 6 (Pedagogy Layer).md`** — Phase 8 complete, for reference.
10. **`Program/PRD/09 — Design System Integration.md`** — Phase 7 complete, for reference.

---

## The working agreement, in one paragraph

This project assumes every agent is stateless — memory of prior work lives only in files. The dev-notes are the bridge. Every session must end with a devlog entry, and anything a future agent needs (a decision rationale, a library quirk, an open question) must be promoted to NOTES or ACTION_ITEMS before the session closes. Sub-PRDs are amendable by agents working in their phase; the architecture document and project overview are not. The full agreement is in master PRD §3.

---

## Stylistic notes

The PRDs are written in prose, not bullet lists, because that matches Elena's communication preference and because nuance lives in the connective tissue between claims. Match the register — verbose where verbose helps, terse where terse helps, never flat.

The placeholder text Phase 0 shipped is `"Spanning."` — single word, gerund, no apology. Loading messages draw on mathematical vocabulary: *Composing*, *Diagonalizing*, *Tensoring*, *Resolving*, *Conjugating*. Verbs that already sound like processes do double duty as evocative English and as honest descriptions of what the engine is doing.
