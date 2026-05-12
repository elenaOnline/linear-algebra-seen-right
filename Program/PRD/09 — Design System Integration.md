# Phase 7 — Design System Integration

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Design reference:** `Program/Design/Design Language.html`, `Program/Design/DESIGN.md`
**Depends on:** Phases 0–6 complete.

---

## 1. Goal

Establish the design language in the running codebase before any new UI layers are built. Phase 7 adds no new mathematical capabilities. Its output is a codebase where every existing component uses the CSS token system, the correct typefaces, and the honesty badge convention — and where the app shell has the mode-toggle structure that Phase 8 (Browse mode) can slot directly into.

The design principle this phase operationalizes is **Two modes, one room**: Browse and Sandbox share the same chrome, tokens, and badge system. That sharing is only possible if the system is established before either mode builds on it. A Sandbox that looks right before Phase 8 lands is not gold-plating; it is a prerequisite.

**What "done" means.** At the end of Phase 7, an agent opening the app sees:
- Warm paper background, Geist typeface, Geist Mono for labels, STIX Two Text italic for any rendered math
- A top bar with the brand mark, a Browse/Sandbox mode toggle (Browse stub navigates to a placeholder), a field pill, and undo/redo
- A kind badge and exact/approximate chip on every visualization tile
- No hardcoded hex values anywhere in component code

The Sandbox's mathematical functionality is unchanged; the visual and structural foundation is in place.

---

## 2. Scope

Five stages, ordered by dependency. Each stage should leave `pnpm verify` green before the next begins.

### Stage 1 — Foundation

**What.** Load the typefaces and make CSS tokens available globally.

1. Add Google Fonts link to `index.html`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=STIX+Two+Text:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
   ```

2. Create `src/styles/tokens.css` (or copy relevant sections from `Program/Design/app/styles.css`) and import it in `src/main.tsx`. At minimum: the `[data-palette="bone"]` root block, the kind-badge tint tokens, the type scale tokens, the spacing tokens, and the font-stack variables. The full `styles.css` from the design bundle can be imported wholesale; it does not need to be trimmed.

3. Add `data-palette="bone"` to `<body>` in `index.html`. This activates the Bone palette as the default.

4. Set `body { font-family: var(--font-sans); background: var(--bg); color: var(--ink); }` in the global stylesheet (or verify the tokens CSS already does so — it does, at line 166 of `styles.css`).

**Acceptance.** App loads, background changes to `#f2f1ef`, text renders in Geist. No visual regressions beyond the color/font changes.

### Stage 2 — App shell

**What.** Redesign `src/ui/App.tsx` to match the design's top-bar spec and introduce the Browse/Sandbox mode toggle.

The current header (title, field toggle, undo/redo) becomes the full top bar specified in `Design Language.html §02`:

```
┌─────────────────────────────────────────────────┐
│ [■] LADR Visualizer   Browse | Sandbox   ℝ ◦   ↩ ↪ │
└─────────────────────────────────────────────────┘
```

Specific changes:
- **Brand mark** — a small 22×22 square with `var(--ink)` background, STIX italic *L* in `var(--bg)`, followed by "LADR Visualizer" in Geist 500 and "by Axler" as a subdued `--ink-3` suffix.
- **Mode toggle** — a segmented button (Browse / Sandbox) styled as `.mode-toggle`. In Phase 7, clicking Browse renders a centered placeholder (`"Browse mode — coming in Phase 8"`) in the main content area; the Sandbox view is unchanged. The toggle is always present, not hidden.
- **Field pill** — `FieldToggle` restyled as the `.field-pill` from the design: a rounded pill with a small accent dot followed by the field name.
- **Undo/redo** — keep functionality, restyle to match the design's `--panel` button chrome.

App shell layout after Stage 2:
```
<div class="app">
  <header class="topbar"> ... </header>
  <main>                          ← Browse stub or Sandbox depending on mode
    { mode === 'sandbox' ? <SandboxLayout /> : <BrowsePlaceholder /> }
  </main>
</div>
```

`SandboxLayout` wraps what is currently `ViewGrid`. The three-column structure (object library | canvas | inspector) is Phase 8 work; in Phase 7, `SandboxLayout` is simply the current view grid with the correct token-based background.

**Acceptance.** Mode toggle visible, Browse stub renders without error, Sandbox view unchanged, field pill styled correctly, undo/redo functional.

### Stage 3 — Honesty system

**What.** Upgrade `ProvenanceBadge` to the full kind chip + exact/approximate chip specification from `Design Language.html §05`.

The two chips are independent:

**Kind chip** — declares the representation type:
```
.kind.kind-geo   → "geometric"
.kind.kind-abs   → "abstract diagram"
.kind.kind-mat   → "matrix"
.kind.kind-spec  → "spectral"
.kind.kind-sym   → "symbolic"
```

Mapping from registry `RendererKind`:
- `geometric_2d`, `geometric_3d` → `kind-geo`
- `diagram` → `kind-abs`
- `matrix` → `kind-mat`
- `chart` → `kind-spec`
- `symbolic` → `kind-sym`

**Exactness chip** — declares whether the value is exact or approximate:
- Exact (came from symbolic computation path) → `.exactness.is-exact` (sage green dot, "exact")
- Approximate (came from numerical path, or is a float-interpolated animation frame) → `.exactness.is-approx` (amber dot, "approximate")

The current `ProvenanceBadge` component carries provenance (`'exact'`, `'numerical'`, `'animated'`) which maps cleanly: `'exact'` → `is-exact`; `'numerical'` and `'animated'` → `is-approx`. The kind information comes from the view's `ViewKind`.

These chips must appear on every `ViewCard`. They are not optional for any kind of visualization.

**Acceptance.** Every view in the running Sandbox has both chips visible. `ProvenanceBadge` tests updated/passing.

### Stage 4 — Sandbox tile chrome

**What.** Migrate `ViewCard` and `ViewContainer` to the tile-head / tile-body / tile-foot structure from the design, and replace all remaining hardcoded hex values in Sandbox components with CSS tokens.

**Tile structure:**
```
ViewCard (.canvas-tile)
├── .tile-head   — kind badge · visualizer name · object name (math italic) · ⋯ menu · ✕
├── ViewContainer → .tile-body   — the visualization itself
└── .tile-foot   — basis label · field indicator · exactness chip
```

The `.tile-foot` is new. It surfaces the metadata that currently lives nowhere in the UI:
- Basis label (e.g. `std basis`, or the BasisId if unnamed) — Geist Mono, `--ink-3`
- Field (`ℝ` or `ℂ`) — `--font-math` italic
- Exactness chip (same component from Stage 3)

For the tile-foot, read basis and field from the session store (same data `ViewContainer` already uses for `sessionView`).

**Token migration.** Audit `App.tsx`, `ViewCard.tsx`, `ViewContainer.tsx`, `ViewGrid.tsx`, `ObjectInput.tsx`, `LoadingState.tsx`, `ViewErrorBoundary.tsx`, `TimelineScrubBar.tsx`, `ProvenanceBadge.tsx`. Replace every hardcoded hex value (`#e5e7eb`, `#374151`, etc.) with its corresponding CSS token. Use `Program/Design/DESIGN.md §CSS token system` as the mapping guide. The principle: if the hex matches a surface token (`--bg`, `--panel`, `--line`, etc.), use that token; if it's a one-off value not in the token set, question whether it should exist.

**LoadingState messages.** The existing gerund pool (`Spanning.`, `Diagonalizing.`, etc.) does not change — ADR-003 stands. The loading state component styling gets token treatment.

**Acceptance.** `grep -r '#[0-9a-fA-F]\{6\}' src/ui/` returns no results (or only in comments and SVG fill values with documented rationale). Tile-foot visible on all views. Visual regression: every view should look at least as good as before, and structurally cleaner.

### Stage 5 — Math input bar

**What.** Upgrade `ObjectInput` to the Symbolab-style two-row bar from `Design Language.html §07`.

The current input accepts raw expression strings (`[[1,2],[3,4]]`, `(1,-2)`, `T(x,y)=(x+y,x-y)`). The upgraded bar makes this entry feel mathematical rather than programmatic:

**Top row (template palette):**
Clickable buttons that insert templates into the expression field. Phase 7 ships a minimal useful set:
- Math symbols: `ℝ`, `ℂ`, `λ`, `σ`, `∈`, `⊆`, `⊕`, `⊗`
- Structural: fraction `a/b`, power `xⁿ`, subscript `xᵢ`, matrix `[[ ]]`, vector `( )`
- Inner product: `⟨·,·⟩`

Templates insert placeholder text the user fills in; they do not evaluate.

**Bottom row (expression field):**
- A prompt glyph in STIX italic (`≫` or similar) left of the input field
- The expression field itself: still accepts the existing parser syntax, but styled with `var(--font-math)` and italic so it *looks* mathematical as the user types
- Name field inline (not separate — a small `name:` prefix in `--ink-3` before the expression, or retain separate as a labeled pair; agent's call based on what looks cleanest)
- Evaluate button (`Evaluate ↵`) styled as `.eval-btn`

**Scope boundary.** The template buttons insert text strings; they do not implement a visual math editor. Full Symbolab-style rendered-while-typing math is Phase 8+ work. Phase 7 ships the visual structure and the symbol palette; the expression is still a text string under the hood.

**Acceptance.** Symbol palette visible and functional (buttons insert correct text). Expression field uses STIX italic font. Existing parse-and-add flow unchanged. `pnpm verify` green.

---

## 3. Tests

Stage 1–2 require no new tests; visual changes are verified manually. Stages 3–5 require:

- **Stage 3:** Update `ProvenanceBadge.test.tsx` to assert both kind chip and exactness chip are rendered with correct class names. Add a test that checks `RendererKind` → kind CSS class mapping.
- **Stage 4:** Update `ViewContainer.test.tsx` to assert `.tile-foot` is rendered. No new tests for token migration (visual changes); existing tests must stay green.
- **Stage 5:** Update `ObjectInput`-related tests (or create `InputBar.test.tsx`) to assert template buttons render and insert text. Existing parse flow tests must pass unchanged.

---

## 4. Acceptance criteria

Phase 7 is complete when:

1. Geist, Geist Mono, and STIX Two Text load correctly in the deployed app.
2. All CSS custom properties resolve from the Bone palette token set; `var(--bg)`, `var(--ink)`, `var(--accent)` etc. are all defined.
3. The top bar matches the design spec: brand mark, Browse/Sandbox mode toggle, field pill, undo/redo.
4. Clicking Browse shows a placeholder; the Sandbox view is intact.
5. Every visualization tile shows a kind badge and an exactness chip.
6. Every visualization tile has a tile-foot with basis, field, and exactness metadata.
7. No hardcoded hex values remain in `src/ui/` (outside of SVG fill values with documented rationale).
8. The math input bar has a template symbol palette and an STIX-italic expression field.
9. `pnpm verify` is green. All 304+ existing tests pass.
10. Devlog entries written; `Program/PRD/00 §7` roadmap updated to mark Phase 7 complete.

---

## 5. Out of scope (Phase 7 specifically)

- Browse mode UI (catalog grid, concept cards, side panel). That is Phase 8.
- Sandbox object library (left column) and inspector (right column). Phase 8.
- Dark theme or alternative palettes. The Bone default is the only shipped palette; the token system supports palette switching but no UI to expose it is needed until post-Phase 8 polish.
- Compact density mode wiring. The tokens exist (`data-density="compact"`); no UI toggle needed yet.
- Full visual math editing in the input bar (rendered-while-typing LaTeX). Phase 8+.
- Animation refinements, hover effects, transitions beyond what already exists.

---

## 6. Design references

Every decision in this phase should be grounded in the design documents rather than improvised:

- `Program/Design/Design Language.html` — open in browser. Visual ground truth.
- `Program/Design/app/styles.css` — the CSS token definitions to import.
- `Program/Design/DESIGN.md` — development directives including the token table, font rules, and component-by-component notes.

When in doubt, the design document wins over any current convention in the codebase. The point of this phase is to make the codebase conform to the design, not to adapt the design to the codebase.
