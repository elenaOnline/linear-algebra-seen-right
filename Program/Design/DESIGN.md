# LADR Visualizer — Design Language & Development Directives

**Source:** `Design Language.html` (full interactive reference), `chats/chat1.md` (design conversation and rationale)
**Status:** v0.1 · Bone palette default · pending integration with Phase 6+ codebase

This document translates the design language into directives that developers can act on. It does not repeat what is in `Design Language.html` verbatim — read that file first for the full treatment of each section. This file answers the question: "what does the design actually require of the implementation?"

---

## Architecture directives

### Mode structure

The app has two modes: **Browse** (concept catalog) and **Sandbox** (workbench). This is the most architecturally significant design decision. The current codebase ships Sandbox only; Browse is the next major UI layer, corresponding to Phase 7's chapter navigator and definition inspector.

Both modes share a single top-level shell:
- **Top bar**: brand mark, Browse ↔ Sandbox mode toggle, field pill (ℝ/ℂ), session indicator. The mode toggle is the only chrome element that differs between modes.
- **Palette and density controls**: global attributes on `<body>` or the root element — `data-palette` (bone/stone/slate/sage) and `data-density` (comfortable/compact). Components read tokens; they never hardcode hex values.

The current `App.tsx` is Sandbox-only. When Browse mode lands (Phase 7+), `App.tsx` needs a mode-switcher that replaces the main content area with the Browse layout while keeping the top bar identical.

### CSS token system

All colors, spacing, and type sizes are CSS custom properties defined in `Program/Design/app/styles.css`. **Do not use hardcoded hex values in component styles.** Every component must reference tokens. The token surface:

| Token group | Variables |
|---|---|
| Backgrounds | `--bg`, `--bg-2`, `--bg-3` |
| Panel surfaces | `--panel`, `--panel-2` |
| Text | `--ink`, `--ink-2`, `--ink-3`, `--ink-4` |
| Borders | `--line`, `--line-2`, `--line-3` |
| Accent | `--accent`, `--accent-soft`, `--accent-line`, `--accent-deep` |
| Kind badge tints | `--kind-geo`, `--kind-abs`, `--kind-mat`, `--kind-spec`, `--kind-sym` (and `-soft` variants) |
| Type scale | `--t-display`, `--t-h1`, `--t-h2`, `--t-body`, `--t-meta`, `--t-micro` |
| Spacing | `--pad`, `--pad-tight`, `--gap`, `--gap-tight`, `--radius`, `--radius-lg` |
| Fonts | `--font-sans`, `--font-mono`, `--font-math` |

The four palettes (Bone default, Stone, Slate, Sage) are implemented as `data-palette` attribute overrides. All four share identical token names; only the hex values differ. Switching palette is a single attribute change on the root.

**Practical first step**: the current codebase uses inline `style` objects with hardcoded colors. Migrating to CSS tokens does not need to happen all at once — add `styles.css` (or its token block) to the global stylesheet and convert components incrementally. The design does not require the full visual overhaul before Phase 7 begins, but every new component written in Phase 7+ must use tokens from day one.

### Fonts

Three typefaces, loaded from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=STIX+Two+Text:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
```

| Face | `--font-*` | Role |
|---|---|---|
| Geist 400/500 | `--font-sans` | All UI: headings, labels, body prose, buttons |
| Geist Mono 400/500 | `--font-mono` | Technical metadata: chapter refs, dimension labels, status text, concept-card titles |
| STIX Two Text italic | `--font-math` | **Mathematics only**: variables, operators, definitions, expression bar content |

**Critical rule**: STIX Two Text italic is never used for headings, section titles, or decoration. The italic signals "this is mathematics" — misusing it breaks the honesty system visually. The current KaTeX rendering already handles display math correctly; STIX is for inline math glyphs in prose and for the expression bar.

---

## Component directives

### Honesty badges (representation kind + exactness)

Every visualization tile and every concept card carries two chips. These are already partially implemented as `ProvenanceBadge` — reconcile the existing component with the design spec below.

**Kind badge** (`<span class="kind kind-geo">geometric</span>` etc.):
- Five kinds: `geometric`, `abstract diagram`, `matrix`, `spectral`, `symbolic`
- Pill shape, `--font-mono`, uppercase, 10.5px, colored by kind token
- A 5px dot before the label (CSS `::before`)
- The badge class maps to the registry's `RendererKind`: `geometric_2d`/`geometric_3d` → `kind-geo`; `diagram` → `kind-abs`; `matrix` → `kind-mat`; `chart` (spectral) → `kind-spec`; `symbolic` → `kind-sym`

**Exactness chip** (`<span class="exactness is-exact">exact</span>`):
- Two states: `is-exact` (sage green) and `is-approx` (amber)
- Same pill style, smaller
- Exact = came from symbolic computation; approximate = numerical

These chips appear on every visualization tile (head or foot), on every concept card in Browse mode, and in the side panel header. They are not optional.

### Visualization tiles (Sandbox canvas)

The sandbox canvas is a grid of tiles. Each tile has three zones:

```
┌─────────────────────────────────────┐
│ tile-head: kind badge · title · ⋯  │  ← .tile-head
├─────────────────────────────────────┤
│                                     │
│         visualization               │  ← .tile-body
│                                     │
├─────────────────────────────────────┤
│ basis · field · exactness chip      │  ← .tile-foot
└─────────────────────────────────────┘
```

The current `ViewCard` + `ViewContainer` pair maps to this structure:
- `ViewCard` ≈ `tile-head` (provides kind badge, object name, visualizer label, + view menu, ✕ close)
- `ViewContainer` renders into `tile-body`
- A new `tile-foot` component is needed for basis/field/exactness metadata

The tile chrome (head and foot) must be **identical across all visualization kinds** — only the body changes. This consistency is load-bearing: users learn the tile shape once and can swap visualizations without relearning the chrome.

### Object library (Sandbox left column)

Not yet implemented. When Phase 7+ adds the Browse/Sandbox mode structure, the left column holds the object library: a grouped list of every object in the session (Spaces, Operators & maps, Vectors, Inner products). Items show a math-italic name, type in mono, and a 2px left-border accent on the selected item.

**Relationship to current codebase**: the current session store already has all the objects; the library is a view over `session.spaces`, `session.maps`, `session.vectors`, etc. It replaces the implicit "all objects are shown as views" approach with an explicit selection-focused library.

### Inspector (Sandbox right column)

Not yet implemented. Right column: computed properties of the focused object. Key-value pairs: domain, codomain, field, basis (definition section), then rank, nullity, det, trace, nilpotency index, self-adjoint flag, minimal polynomial (computed section). Values in `--font-mono`; keys in `--font-math` italic.

The minimal polynomial and other symbolic invariants appear with a provenance line: `via SymPy · exact`. This is the exactness system applied to the inspector.

### Math input bar

The current `ObjectInput` component covers the basic input flow (expression field, parse, add). The design calls for an upgrade to a Symbolab-style two-row bar:
- **Top row**: template buttons for fractions, powers, matrix brackets, ⟨·,·⟩, ⊗, ⊕, ℝ, ℂ, λ, σ, ∈, ⊆. These insert templates into the expression field.
- **Bottom row**: italic STIX input field (not a plain text box), evaluate button with ↵ affordance.

The expression field renders math as math — italic glyphs, proper brackets. KaTeX live-preview is the right approach for Phase 7+.

### Browse — concept catalog

Not yet implemented (Phase 7). Layout:
- Top bar (shared shell)
- Browse header: title + subtitle + search field
- Filter chip row: representation kind filters (All, Geometric, Abstract, Matrix, Spectral, Symbolic)
- Concept grid: `repeat(auto-fill, minmax(280px, 1fr))`, cards grouped by chapter with section labels
- Side panel: slides in from the right when a card is clicked; the catalog reflows (gains right padding) rather than being overlaid

Each concept card anatomy (top-to-bottom):
1. Chapter reference — Geist Mono, muted (`--ink-3`)
2. Title — Geist Mono 500 (not STIX)
3. Mini-visualization preview — rendered SVG in the appropriate representation
4. Two-line teaser (clampable, with "Read definition ⌄" expand chip)
5. Footer: kind badge + prerequisite hint

---

## Interaction directives

### Browse → Sandbox handoff

"Open in Sandbox" on a concept's side panel:
1. Switches mode toggle to Sandbox
2. Instantiates a pre-populated session from the concept's canonical scene template (Phase 7 mechanism)
3. Opens the relevant visualizations as tiles in the canvas

This is the primary cross-mode flow. Every concept must have a canonical scene template for this to work. Phase 7's `loadScene` and `SceneTemplate` types are designed for exactly this.

### Sandbox → Browse (reverse)

Each object in the library carries a small chip that opens the corresponding catalog entry in the side panel without leaving the sandbox. The sandbox keeps its state; the panel overlays on the right.

### Concept expand in place

In Browse mode, a "Read definition ⌄" chip on each card expands the card in place — the teaser unclamps, the formal definition appears in an inset block, the card grows, neighbors reflow. No navigation, no panel, no modal. This is distinct from clicking the card body (which opens the side panel).

---

## Current codebase — gap analysis

The following gaps exist between the current implementation and the design spec. Ordered by phase relevance:

**Phase 7 (should be addressed at the start):**
1. CSS tokens not in use — inline styles throughout. Add the token stylesheet to `index.html`; convert new Phase 7 components to use tokens from day one.
2. Font stack not applied — Geist, Geist Mono, STIX Two Text not loaded. Add the Google Fonts link to `index.html`.
3. Top-bar shell needs mode toggle (Browse/Sandbox), field pill, and session indicator. The current header is minimal.
4. Browse mode does not exist — needs the full catalog grid, concept cards, and side panel.
5. Object library (left column) does not exist.
6. Inspector (right column) does not exist.
7. Math input bar lacks template palette and live STIX rendering.

**Post-Phase 7 (polish and completeness):**
8. `tile-foot` component (basis/field/exactness metadata) not implemented.
9. Compact density mode not wired (low priority).
10. Palette switcher not exposed in UI (low priority — Bone is the default and may remain the only shipped palette).

---

## Open design questions — answered

The five open questions from the Phase 6 → Phase 7 transition are resolved or constrained by the design:

1. **Markdown parser (ADR-016)**: The design does not specify a parser; the existing recommendation (`unified` + `remark-parse`) stands. Record as ADR-016.

2. **Override-merge strategy**: The design's `DefinitionRecord` shape (formal statement, examples, non-examples, linked visualizers, common errors) is clear and stable. Recommended merge strategy: **field-level replace** — the overrides file completely replaces named fields rather than deep-merging arrays. This matches the design's expectation that the override author is explicit about what they're supplying.

3. **Replace vs. accumulate on definition click**: The design specifies replace. Section 09 ("Cross-mode flow") states: "Browse mode's purpose is to seed the sandbox with concrete objects" via the "Open in Sandbox" CTA. Implicit in this is that clicking a new concept gives you that concept's session, not an accumulation. Record as ADR-017: session is replaced on definition activation; a "save scene" affordance (localStorage snapshot) is the persistence mechanism.

4. **`SceneBuild.views` missing `refKind`**: Confirmed bug in the PRD spec. The `views` field needs `refKind: MathObjectRef['kind']` alongside `objectId`. Fix this in `PRD/08` before Phase 7 implementation begins.

5. **`LADR_Definitions/` folder format**: The folder exists. The design's definition catalog expects each entry to have `axlerRef`, `chapter`, `section`, `formalStatement`, and hand-curated fields. The build script should parse the existing markdown files and merge with a `definition-overrides.ts`. The design's concept cards for Chapter 1 and 2 are the starter content target.

---

## Files in this directory

- `Design Language.html` — the primary design reference. Open in a browser. Contains the full visual spec: principles, palette swatches, type specimens, honesty badges, layout diagrams, do/don't table.
- `app/styles.css` — the CSS token definitions. Import this into the application; convert components to use its custom properties.
- `chats/chat1.md` — the full design conversation. Read if you need rationale for a decision that isn't explained in the design doc itself.
