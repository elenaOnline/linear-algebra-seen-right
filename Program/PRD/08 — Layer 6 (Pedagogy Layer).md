# Phase 8 — Layer 6: Pedagogy Layer

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Layer 6: Pedagogy Layer"
**Design references:** `Program/Design/Design Language.html §06–09`, `Program/Design/DESIGN.md`
**Depends on:** Phases 0–7 complete. Phase 7 (Design System Integration) is a hard prerequisite — every UI component in Phase 8 is built on the token system and shell structure that Phase 7 establishes.

---

## 1. Goal

Add the structure that turns a sandbox into a learning tool. After Phase 7, the app has correct visual foundations. After Phase 8, a user reading Axler's book can open the app, navigate to a chapter, click a definition to see its canonical example, explore it in the Sandbox, and ask for a counterexample.

Phase 8 adds two things that the design specifies but the previous phases don't deliver: **Browse mode** (the editorial catalog of LADR concepts) and the **full three-column Sandbox layout** (object library, canvas, inspector). These are the two modes the design describes as "two rooms in the same house," and Phase 8 makes both rooms habitable.

**Why this PRD is more skeletal than its predecessors.** The pedagogy layer differs from Layers 0–5 in two ways:

First, *the content is the work*. Definition records, scene templates, and constraint vocabulary are curated data. Writing every entry up-front before any feedback loop would produce records that are technically complete but pedagogically uneven.

Second, *the example generator is iterative by construction*. The architecture commits to "the initial set covers the ~30 most pedagogically useful cases" — those cases will reveal which constraints are easy to template. Pinning all 30 up-front would force premature decisions about API shape.

Phase 8 therefore specifies **mechanisms** carefully and **content** as a starter set with an explicit expansion process.

---

## 2. Scope

### 2.1 Definition catalog

Each definition in Axler's book becomes a `DefinitionRecord`. Records live in `src/pedagogy/definitions/` as a generated TypeScript module, produced by a build script (`scripts/build-definitions.ts`) that parses the `LADR_Definitions/` markdown files and merges hand-curated overrides.

```typescript
type DefinitionRecord = {
  readonly id:                string;          // e.g. 'def-1.20-vector-space'
  readonly axlerRef:          string;          // e.g. '1.20'
  readonly title:             string;          // e.g. 'Vector Space'
  readonly chapter:           number;
  readonly section:           string;          // e.g. '1.B'
  readonly formalStatement:   string;          // LaTeX
  readonly plainStatement?:   string;          // optional informal restatement
  readonly prerequisites:     readonly string[];     // ids of prerequisite definitions
  readonly linkedVisualizers: readonly string[];     // visualizer ids in the registry
  readonly examples:          readonly ExampleRef[];
  readonly nonexamples:       readonly ExampleRef[];
  readonly commonErrors?:     readonly string[];
  readonly exerciseRefs?:     readonly string[];     // ids of related exercise templates
};

type ExampleRef = {
  readonly templateId:        string;          // identifies a scene template (§2.2)
  readonly description:       string;          // one-line label shown next to the example
  readonly parameters?:       Readonly<Record<string, unknown>>;
};
```

**Build script.** `scripts/build-definitions.ts` uses `unified` + `remark-parse` (ADR-016) to parse each markdown file in `LADR_Definitions/`, extract `axlerRef`, `chapter`, `section`, and `formalStatement`, and emit a `DefinitionRecord`. Hand-curated fields (`linkedVisualizers`, `examples`, `nonexamples`, `commonErrors`) live in `src/pedagogy/definitions/overrides.ts` and are merged via field-level replace (ADR-016: overrides win for each named field; no deep merging). The script runs as `pnpm build:definitions` and its output (`src/pedagogy/definitions/generated.ts`) is checked into the repo.

**Starter scope.** Phase 8 ships records for Chapters 1 and 2 (~25 definitions). Remaining chapters are Phase 9+ content work.

### 2.2 Scene templates

A scene template is a parameterized recipe for constructing a session. Templates live in `src/pedagogy/templates/`.

```typescript
type SceneTemplate = {
  readonly id:          string;
  readonly title:       string;
  readonly description: string;
  readonly tags:        readonly string[];
  readonly parameters:  readonly TemplateParameter[];
  readonly build: (params: Readonly<Record<string, unknown>>) => SceneBuild;
};

type TemplateParameter = {
  readonly name:    string;
  readonly kind:    'scalar' | 'integer' | 'field' | 'choice';
  readonly default: unknown;
  readonly range?: readonly [number, number];
  readonly choices?: readonly string[];
};

type SceneBuild = {
  readonly spaces:       readonly VectorSpace[];
  readonly bases:        readonly Basis[];
  readonly vectors:      readonly Vector[];
  readonly maps:         readonly LinearMap[];
  readonly subspaces:    readonly Subspace[];
  readonly views:        readonly { kind: ViewKind; visualizerId: string; objectId: string; refKind: MathObjectRef['kind'] }[];
  readonly namedObjects: readonly { name: string; ref: MathObjectRef }[];
};
```

`build` is pure. `src/pedagogy/loadScene.ts` calls store actions in the correct order to apply a `SceneBuild`. Per ADR-017, `loadScene` calls `resetSession` before applying the build — the existing session is replaced, not accumulated.

**Starter templates:**
- `span-of-two-vectors-in-r3` — two vectors in ℝ³, their span as a subspace, with `arrow-3d` and `subspace-lattice` views.
- `linear-combination-builder` — three vectors in ℝ² with scalar sliders, the linear combination as a fourth arrow.
- `basis-as-coordinates` — a basis for ℝ² and a vector, with coordinate expression and geometric arrow.
- `rank-nullity-2d` — a 2D-to-2D linear map showing kernel, range, and the rank-nullity statement.
- `gram-schmidt-stepwise` — a list of vectors and the Gram-Schmidt process as a stepwise animation timeline.

### 2.3 Example/counterexample generator

Lives in `src/pedagogy/generator/`.

```typescript
type Constraint = {
  readonly kind:       ConstraintKind;
  readonly parameters: Readonly<Record<string, unknown>>;
};

type GeneratorResult =
  | { readonly kind: 'success'; readonly object: MathObject; readonly explanation: string }
  | { readonly kind: 'infeasible'; readonly reason: string }
  | { readonly kind: 'error'; readonly message: string };

interface ExampleGenerator {
  generate(constraint: Constraint, session: SessionView): Promise<GeneratorResult>;
}
```

Every successful generation includes a one-paragraph explanation referencing the relevant Axler definitions by id.

**Starter constraint set (seven):**
- `nilpotent-operator` (parameter: nilpotency index)
- `non-diagonalizable-operator` (parameter: dimension, Jordan structure)
- `direct-sum-decomposition` (parameters: ambient dimension, summand dimensions)
- `non-direct-sum` (parameters: ambient dimension, summand dimensions, intersection dimension)
- `self-adjoint-with-spectrum` (parameter: eigenvalue list)
- `unitary-but-not-orthogonal` (parameter: dimension; ℂ field only)
- `linearly-dependent-set-with-property` (parameter: dimension, set size, property)

Remaining ~23 constraints are Phase 9+ content work.

### 2.4 Browse mode — the catalog

Browse mode is the editorial view of the LADR concept catalog. It is the primary new UI surface in Phase 8, and its design is specified in detail in `Design Language.html §06`. Phase 7 established the mode toggle shell; Phase 8 fills the Browse side.

**Every component in §2.4 must use CSS tokens. No hardcoded hex values.**

**Layout.** The Browse view replaces the `<BrowsePlaceholder />` stub from Phase 7:

```
top bar (shared shell — from Phase 7)
├── browse header: title "The catalog" · subtitle · search field
├── filter chips: All / Geometric / Abstract / Matrix / Spectral / Symbolic
├── chapter groups (§1.A, §1.B, …)
│   └── .cat-grid: auto-fill at minmax(280px, 1fr)
│       └── .cat-card (per concept)
└── .side-panel (fixed right, shown when a card is open)
```

Component: `src/pedagogy/BrowseMode.tsx` (or `src/ui/BrowseMode.tsx`; agent's call on placement). Reads from the generated `DefinitionRecord[]`.

**Concept card anatomy.** Per `Design Language.html §06` and `styles.css` `.cat-card`:
- Chapter reference — Geist Mono, `--ink-3`
- Title — Geist Mono 500 (not STIX, not Geist. Mono specifically.)
- Mini-visualization preview — a 96px-tall SVG rendered in the representation the card claims; use the visualizer registry's `toProps` → renderer pipeline for this, same as the Sandbox. The kind badge it shows must match the preview.
- Two-line teaser (clampable) + "Read definition ⌄" expand chip
- Footer: kind badge + prerequisite hint

**Two opening patterns:**
- **Expand in place** — "Read definition ⌄" chip unclamps the tease; if the definition has a `formalStatement`, the full STIX-typeset definition appears in an inset block. Card grows; neighbors reflow. Stateless, no side effects.
- **Open side panel** — clicking the card body opens the fixed `.side-panel`. The catalog reflows: it loses its max-width and gains right padding equal to the panel width. No dimming overlay. The panel is a sister column, not a dialog. Multiple concepts can be clicked through — the panel updates in place.

**Side panel contents:**
1. Header: chapter ref, title, kind badge, exactness chip, prerequisites
2. Formal definition in a `.def-box` — STIX Two Text, `--font-math`, `font-size: 15.5px`
3. Canonical visualization rendered larger, with kind badge and viz-foot metadata
4. Examples and non-examples in a two-column grid
5. Related concepts as pill links
6. Action row: primary CTA is **"Open in Sandbox"** (calls `loadScene` with the definition's first example template, switches mode to Sandbox per ADR-017)

The "Open in Sandbox" flow is the most important interaction in the product (per `Design Language.html §09`). It must work end-to-end in Phase 8.

### 2.5 Sandbox three-column layout

The design specifies a three-column Sandbox workbench. Phase 7 left this as a single-column view grid. Phase 8 adds the outer columns.

**This is Sandbox work, not Browse mode work.** It uses the same token system and applies to the Sandbox mode the user already has.

**Layout:**
```
.sandbox
├── .sb-lib (256px)      — object library
├── .sb-canvas (flex 1)  — view grid (current ViewGrid moves here)
└── .sb-insp (320px)     — inspector
math input bar (.sb-input, grid-area: input)
```

**Object library** (`src/ui/ObjectLibrary.tsx`):
A grouped list of every object in the current session, by kind (Spaces, Maps, Vectors, Inner Products). Each item: a math-italic name in STIX, a type label in Geist Mono, and a 2px left-border accent (`var(--accent)`) on the selected item. Clicking an item focuses it — the inspector updates and the nearest canvas tile for that object becomes "focused" (subtle accent border). The library is a view over the store's `spaces`, `maps`, `vectors`, etc. — no new state needed.

Each library item has a small chip that opens the corresponding Browse mode side panel (if a matching `DefinitionRecord` exists) without leaving the Sandbox. The Sandbox keeps its state; the panel slides in over the right inspector column.

**Inspector** (`src/ui/Inspector.tsx`):
Properties of the focused object in flat key-value pairs. Styling per `styles.css` `.kv-grid`:
- Keys: STIX Two Text italic, `--ink-3`
- Values: Geist Mono, tabular-nums

Definition section: domain, codomain, field, basis.
Computed section: rank, nullity, det, trace, structural flags (self-adjoint? nilpotent? invertible?) with yes/no answers.
Minimal polynomial (or analogous invariant) with provenance: `via SymPy · exact`.
Available visualizations: pill links for each applicable visualizer the user can drop into the canvas.

For Phase 8, computed properties can be read from the computation cache where available and show `—` (en-dash) when not yet computed. The `useComputation` hook pattern from Phase 6 applies here.

### 2.6 Generator panel

Accessed from a "Construct example…" button in the Browse mode side panel's action row (or from the inspector's available-visualizations section in Sandbox mode).

The panel is a modal or a right-side drawer (agent's call — the design defers on this). It contains:
- A constraint picker: a dropdown or segmented list of the seven starter `ConstraintKind` values
- Parameter inputs: each `TemplateParameter` renders as an appropriate input (number input for scalar/integer, dropdown for choice, field toggle for field)
- A "Generate" button that dispatches to `ExampleGenerator.generate()`
- The result: on success, the constructed object's name, a brief description, and the explanation paragraph; on infeasible, the reason; on error, the message

On "Add to session": calls store actions to add the generated object, opens the applicable visualizations.

---

## 3. Tests

### 3.1 Definition catalog

- Build script parses every file in `LADR_Definitions/` without error.
- Every record has a valid `axlerRef`, `chapter`, `section`.
- Every `linkedVisualizers` entry exists in the registry.
- Overrides file merges cleanly (field-level replace; no orphaned override IDs).

### 3.2 Scene templates

For each starter template:
- `build(defaults)` produces a `SceneBuild` whose objects type-check against Layer 0.
- `loadScene` applied to an empty session produces the expected `session.spaces`, `session.vectors`, `session.maps`, `session.views`.
- After `loadScene`, the session is the template's content and nothing else (ADR-017 reset).
- Parameter variations produce structurally correct variations.

### 3.3 Example generator

For each starter constraint:
- Default parameters produce a `success` result.
- The constructed object actually satisfies the constraint (verified against the engine).
- Infeasible combinations return `infeasible` with a clear reason.
- Explanation references at least one Axler definition by id.

### 3.4 Browse mode

- Concept cards render for all Chapter 1–2 definitions (no missing cards, no crashes on mount).
- "Read definition ⌄" expand chip expands and collapses the card inline.
- Clicking a card body opens the side panel with the correct definition content.
- Clicking a second card updates the panel without reopening or flickering.
- Kind badge on each card matches the first entry in `linkedVisualizers` (or the first `ExampleRef`'s visualizer).
- "Open in Sandbox" switches mode to Sandbox and populates the session with the definition's canonical example.

### 3.5 Sandbox three-column layout

- Object library renders all objects from the session, grouped correctly.
- Selecting a library item focuses the inspector and the relevant canvas tile.
- Inspector renders key-value pairs for a focused map and a focused vector without crashing.
- Computed properties that are available in cache display; unavailable properties show `—`.

### 3.6 End-to-end pedagogy flow

A test that simulates: switch to Browse → click "Vector Space" definition → assert side panel opens with correct formal statement → click "Open in Sandbox" → assert mode is Sandbox and `session.spaces` contains a vector space → assert a view is open for it.

---

## 4. Acceptance criteria

Phase 8 is complete when:

1. Build script produces `DefinitionRecord`s for all ~25 Chapter 1–2 definitions.
2. At least 5 scene templates are implemented and tested.
3. At least 5 example-generator constraints are implemented and tested with explanation fields.
4. Browse mode is live: concept grid, in-place expand, side panel, "Open in Sandbox".
5. Sandbox three-column layout is live: object library, canvas (existing view grid), inspector.
6. The end-to-end test in §3.6 passes.
7. `pnpm build:definitions` runs without error as part of `pnpm build`.
8. **No hardcoded hex values in any Phase 8 component.** Every new component uses CSS tokens.
9. `pnpm verify` is green.
10. Devlog entries written; `Program/PRD/00 §7` roadmap updated to mark Phase 8 complete.

**Note on "complete".** Phase 8's completion means the mechanisms work end-to-end with the starter content set. Filling out Chapters 3–9, adding the remaining ~23 generator constraints, and curating the scene template library are Phase 9 content work.

---

## 5. Out of scope (Phase 8 specifically)

- Chapters 3–9 definition records. Starter scope is Chapters 1–2.
- More than the seven starter generator constraints.
- Exercise problem authoring (only references tracked in `DefinitionRecord`).
- Quizzes, progress tracking, spaced repetition.
- Multi-user features.
- Export of scenes to a static URL.
- Dark theme or palette switching UI (tokens support it; no toggle needed until Phase 10).
- Compact density mode UI (same).
- Full visual math editing in the input bar (rendered-while-typing).
- Localization.

---

## 6. Resolved design questions

All open design questions from the original Phase 7 PRD are resolved:

- **Markdown parser**: `unified` + `remark-parse` (ADR-016).
- **Override merge strategy**: field-level replace (ADR-016).
- **Replace vs. accumulate on "Open in Sandbox"**: replace (ADR-017). `loadScene` calls `resetSession` first.
- **`SceneBuild.views` type**: includes `refKind: MathObjectRef['kind']` (corrected in this PRD).
- **`LADR_Definitions/` folder format**: folder exists, organized by chapter, build script approach is viable.
- **Chapter navigator architecture**: the original PRD envisioned a "left rail in the Sandbox." The design supersedes this — Browse mode is a separate top-level view, not a panel inside the Sandbox. The "chapter navigator" is Browse mode itself.

---

## 7. Handoff to Phase 9 and beyond

After Phase 8, the full layer stack is in place and the design system is expressed everywhere. Future work is content and polish:

- **Phase 9 (Content Expansion)** — definition records for Chapters 3–9, additional scene templates, expanding the generator constraint set toward ~30.
- **Phase 10 (UX Refinement)** — compact density toggle, alternate palette option, animation polish, accessibility pass, hover refinements for Browse mode cards.

Neither phase requires new ADRs at the architectural level. They follow the patterns Phase 8 establishes.
