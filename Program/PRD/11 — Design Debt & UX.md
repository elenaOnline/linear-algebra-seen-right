# Phase 11 — Design Debt & UX

**Status:** Planned
**Master PRD:** `00 — Development Standards.md`
**Source document:** `Program/Design/Design Review Synthesis - standalone.html`
**Depends on:** Phase 10 complete.

---

## 1. Background and thesis

A design review of the live build surfaced nine findings. The reviewer's framing is blunt and accurate: "the product is a visualizer, but visualization is still the weakest part of every screen." The findings divide into three tiers by readiness — tactical fixes that are ready for code now, structural issues that require a design decision before code, and one capability gap that amounts to a product-scope question. Each finding is addressed in this PRD as one of four stages, ordered to ship value early while deferring the questions that genuinely require resolved design decisions.

The findings are numbered F-01 through F-09 throughout this document, corresponding to the review document's numbering. Tier A findings are structural (F-01, F-02, F-03), Tier B are tactical (F-04 through F-08), and Tier C is a capability gap (F-09). The staging below ships Tier B first because the tactical fixes are independent and high-value; Tier A second because those findings need design decisions that should be made with context from the improved Tier B experience; and F-09 last because it is a small implementation with large product-scope questions attached that benefit from being the last thing decided.

---

## 2. Stage 11A — Expression input and symbol palette

*Findings addressed: F-07 (symbol palette incoherence), F-08 (no live preview, misleading name field)*

These two findings both touch `ObjectInput.tsx` and are tightly coupled — they describe different failures of the same entry experience. Both are fully self-contained with no dependency on other stages.

### 2.1 Live expression preview (F-08)

The expression textarea currently accepts raw text with no feedback until the user presses "Add ↵". The experience gives no signal that a formula is well-formed, no confirmation that the type of object being created is what the user intended, and no indication whether the formula body will evaluate to a linear map. The "name" placeholder is genuinely confusing — it is the label the object will be referenced by, not a description, and users read it as wanting prose.

**Implementation.** Add a live preview element directly below the expression textarea, rendered via KaTeX. The preview should fire on every `handleChange` call, debounced by 80ms to avoid rendering noise on each keystroke. When the input is empty, the preview is empty. When the input parses successfully, the preview shows the typeset form of the expression — `(1, 2)` renders as a column vector, `[[1,2],[3,4]]` as a 2×2 matrix, `T(x, y) = (x+y, x-y)` as the function notation with typeset output. When the input fails to parse, the preview shows a small error chip with the parser's message in the same position, so errors are visible without modal interruption.

The preview element sits between the textarea row and the existing preview/error text that currently reads "3×2 matrix (ℝ)". The existing status line can be collapsed into the preview render itself (the typeset form is self-describing). For formula inputs, the preview renders the formula body as output — since the formula is already typeset in the source string, use `katex.renderToString` on the full label field.

Two attribute changes to the textarea: `spellCheck={false}` and `autoCorrect="off"` (React props). Both prevent browser interference with mathematical notation and are one-line changes.

The name field's placeholder changes from `"name"` to `"label"`. A helper line below it reads `"e.g. v₁, T, A"` in `var(--ink-4)` — small enough to be informational, not prominent enough to compete with the expression field.

The expression field should receive additional visual weight: increase the font size from `var(--t-meta)` to `var(--t-body)`, use `var(--font-math)` explicitly, and increase the minimum height to accommodate the live preview below it. The name field shrinks to a quieter 52px prefix, consistent with its diminished role.

### 2.2 Symbol palette unification (F-07)

The current 11-button symbol strip uses at least three typefaces at different sizes and weights. The symbols are decorative rather than compositional — clicking any of them inserts a string but no structured-insert behavior exists. The coverage is thin for serious mathematical entry: no fraction, no exponent, no matrix builder.

**Typography unification.** Every button in the palette should render its symbol via KaTeX's `renderToString`. This guarantees a single typeface (KaTeX's math font stack) at a single size, and means the rendering of ℝ in the palette exactly matches the rendering of ℝ in the canvas tiles. Replace the current static text buttons with `dangerouslySetInnerHTML` KaTeX renders, same pattern as `LatexText`. Use `display: inline-flex; align-items: center; justify-content: center` so the symbol is centered without the browser's default inline-block baseline behavior misaligning math glyphs.

**Structured inserts.** Replace a subset of the current single-glyph buttons with structured insertions that place the cursor in a meaningful position after inserting:

- **Fraction**: inserts `\frac{■}{■}` and places cursor in the numerator slot. For raw text entry this means inserting the literal string and moving selection to just after `\frac{`.
- **Superscript / subscript**: inserts `^{}` or `_{}` with cursor inside the braces.
- **Matrix builder**: a small 2-step popover — click once to open a 2×4 grid picker for rows/columns (same pattern as the "+" view menu: portal + getBoundingClientRect), click a cell to insert `[[■, ■], [■, ■]]` with the right count and cursor at the first slot.

These structured inserts replace the current `[[, ], [, ]]` and `(, )` template buttons, which insert literal commas and brackets in a non-compositional way.

**Grouping.** Organize the palette into semantic groups with a 1px `var(--line-2)` divider between them: Sets (ℝ, ℂ), Variables (λ, σ, α, β), Relations (∈, ⊆, ⊕, ⊗), Brackets (⟨·,·⟩, matrix builder), Structures (fraction, superscript, subscript). Less common symbols move into a "More…" popover that opens on a final button, rather than crowding the strip. The total visible strip should fit comfortably in the input bar at 1280px width without wrapping.

### 2.3 Acceptance criteria for 11A

Typing `T(x, y) = (x+y, x-y)` shows live-rendered typeset output below the input before the user presses Add. Spellcheck squiggles are absent from the expression field. Pressing the ℝ button inserts a KaTeX-rendered glyph visually identical to the ℝ that appears in canvas tiles. Pressing the fraction button inserts a fraction template with the cursor inside the numerator. The "name" field placeholder reads "label" with a helper line.

---

## 3. Stage 11B — Visual system and catalog

*Findings addressed: F-04 (blank catalog), F-05 (fragmented visual system), F-06 (fixed tile sizing)*

These three findings address the visual coherence of the product. F-05 is foundational — establishing a shared diagram theme is a prerequisite for F-04's thumbnail rendering, since thumbnails should use the same visual language as the Sandbox. F-06 is independent and can be implemented in parallel.

### 3.1 Shared diagram theme (F-05)

Every renderer currently defines its own colors, line weights, and type choices. The visual incoherence is not a matter of taste — it actively misleads users. When the abstract diagram uses yellow for one role and the chart renderer uses yellow for a different role, the shared color implies a relationship that doesn't exist. When the 2D and 3D plots have different axis weights and different vector terminus styles, the user can't tell whether the visual difference means something.

**DiagramTheme module.** Create `src/ui/theme/diagram.ts` exporting a single `DIAGRAM_THEME` constant. It defines every visual parameter used by any renderer: axis color, axis weight, grid color, grid weight, tick length, vector color family, vector weight, arrowhead size, label font, label size, background color. Renderers import `DIAGRAM_THEME` and use its values instead of hardcoded strings.

**Semantic color roles.** Define in `src/styles/tokens.css`:
```
--color-input:    #4a86c8   (blue — primary/free objects, inputs to maps)
--color-derived:  #a355b4   (purple — objects computed from other objects)
--color-basis:    #3a8a6b   (green — basis vectors, coordinate frames)
--color-null-space: #e8a84a (amber — kernel, null space, the "killed" direction)
--color-image:    #4ab4a3   (teal — range/image, the "surviving" direction)
--color-negative: #c45c3a   (rust — negated vectors, negative eigenvalues)
```
These replace all current hardcoded hex values in renderer files. The kernel's current amber and the range's current teal survive as `--color-null-space` and `--color-image` respectively, because they're already semantically coherent — the audit just formalizes what's implicitly there.

**Specific fixes from the review.** Symbolic vector centering: in `SymbolicRenderer`, the KaTeX output for column vectors should be wrapped in a container that aligns the numeric column rather than the full bounding box. The parentheses in \\begin{pmatrix} are wide; the visual center of a column vector is the digit column, not the total glyph width. Apply `text-align: center` on the digit cells rather than on the bounding box. The 2D and 3D geometric renderers should share the same axis weight (1.5px), grid color (`--color-axis` at 0.15 opacity), and arrowhead style.

**Enforcement.** ESLint rule: add a `no-restricted-syntax` rule that flags any hex color literal inside `src/renderers/` or `src/ui/`. If a renderer hard-codes a color, the lint step fails. This is the code-enforced part the review calls for.

### 3.2 Catalog thumbnails (F-04)

The Browse catalog currently shows text-only cards on a product whose value proposition is visualization. The reviewer's observation is accurate: a glossary is what this looks like, not a doorway into a visual system.

**Thumbnail approach.** Reserve a `120px × 68px` area at the top of each `ConceptCard` before the section reference. For the initial implementation, thumbnails are static SVG assets grouped by the `primaryRenderer` of the definition — not live engine renders. Static SVGs per renderer category are fast to implement, load instantly, and are sufficient to break the all-text problem.

Define one SVG per renderer kind:
- `symbolic`: a typeset column vector and a matrix in monochrome
- `geometric_2d`: two arrows on a faint grid, at a 30° angle to each other
- `geometric_3d`: a simple 3D axis trident with a vector
- `diagram`: a two-node graph with a directed edge (A → B)
- `matrix`: a 3×3 heatmap with a blue gradient
- `chart`: two bars of different heights labeled "rank" and "nullity"

These SVGs live in `src/ui/assets/thumbnails/` and are inlined as React components for zero network overhead. The `ConceptCard` imports the appropriate thumbnail based on `primaryRenderer(def)`.

A secondary improvement from the review: fix the LaTeX rendering bug in definitions where raw LaTeX like `\mathbb{F}^n = \{(x_1,...,x_n):x_k \in \mathbb{F}\}` is displaying as literal text rather than typeset output. This affects `formalStatement` fields where the parser failed to recognize a `$...$` delimiter boundary. The fix is in the `LatexText` component's regex — the current `\$[^$]+\$` pattern fails on `formalStatement` strings that open with `\$` but contain unescaped braces. Extend the regex to handle `\$[^\$]+\$` correctly and add a fallback that renders the string with `renderToString({ throwOnError: false })` if the initial split returns only one part.

### 3.3 Tile resizing (F-06)

Every Sandbox tile is fixed to an equal share of the grid's `1fr`. The user has no way to communicate that one view deserves more space than others. On a reasonably sized screen with three tiles open, each gets roughly 400px wide — functional for a matrix heatmap, cramped for a 3D geometric view, wasteful for a single symbolic display.

**Implementation.** Switch the ViewGrid from `gridTemplateColumns: repeat(N, 1fr)` to a CSS grid with explicitly tracked column sizes, stored in component state. Add a drag handle on the right border of each tile. On `mousedown` on the border, capture the column positions and update them on `mousemove`, with a `requestAnimationFrame` throttle. On `mouseup`, write the final sizes to `localStorage` under a key derived from the current view IDs. On next mount with the same view layout, restore the sizes.

The drag behavior mirrors the existing `onArrowDrag` pattern in `ViewContainer` — `useRef` for the start position, `window.addEventListener('mousemove'/'mouseup')` during drag, cleanup in the same event's mouseup handler.

**Default size heuristics.** Not all tiles are born equal. The `ViewGrid` should apply size defaults by renderer kind when a view is first opened, before the user has expressed a preference:
- `geometric_2d`, `geometric_3d`, `diagram`: 1.4fr (larger default)
- `matrix`, `chart`, `symbolic`: 0.8fr (smaller default)

These defaults are overridden by any user-set size. They are not persisted — only user-set sizes persist.

**Vertical resizing.** Row resizing is out of scope for 11B. The grid is single-row; vertical space is controlled by the container height, not tracked per-tile.

### 3.4 Acceptance criteria for 11B

Every renderer imports colors from CSS tokens; `pnpm lint` fails if a hex literal appears in renderer code. The Browse catalog shows a per-category SVG thumbnail on every definition card. Dragging a tile border resizes it; the size survives reload. The 2D and 3D plots use identical axis weights.

---

## 4. Stage 11C — Tag vocabulary and Browse–Sandbox continuity

*Findings addressed: F-01 (tag vocabulary), F-02 (definitions don't persist into Sandbox), F-03 (flat grid, no relational display)*

These are the Tier A structural findings. F-01 needs a vocabulary decision before code. F-02 and F-03 can be implemented once F-01 is resolved because they depend on how objects are categorized and labeled in the unified system. The design decision for F-01 should be made before this stage begins and recorded as an ADR.

### 4.1 Tag vocabulary disambiguation (F-01)

The five words — Geometric, Abstract, Matrix, Spectral, Symbolic — currently serve two different roles: as content taxonomy in Browse (filtering definitions by mathematical flavor) and as view-mode labels in the Sandbox (identifying which renderer type a tile is using). The review is correct that this is the single most confusing thing in the product, and it must be resolved before new surface area is added on top of the ambiguity.

**The decision.** This PRD does not make the vocabulary decision — that belongs in a pre-implementation design conversation recorded as ADR-019. The two options from the review are:

*Option A — Content taxonomy keeps the five words; Sandbox gets verbs.* Browse filter chips read: Geometric, Abstract, Matrix, Spectral, Symbolic (describing the mathematical object). Sandbox tile headers and `KindBadge` components use action verbs: Plot 2D, Plot 3D, Draw as diagram, Matrix view, Spectrum, Symbolic. These are functionally descriptive rather than categorically labeling.

*Option B — Sandbox keeps the five words as view modes; Browse gets content categories.* Browse filter chips become: Vector Spaces, Maps & Morphisms, Matrices, Spectra, Inner Products — more faithful to Axler's chapter structure. The Sandbox retains its current labels unchanged.

The review leans toward Option A (verbs for view modes), and this PRD's recommendation is Option A — the Sandbox is about *what you do with an object*, not what kind of object it is, and verbs communicate that better. But the decision must be confirmed before implementation.

**Implementation (once ADR-019 is recorded).** The vocabulary lives in three places: `CONSTRAINT_LABELS` in `generator/index.ts`, the `KindBadge` component label lookup, and the `FILTER_LABELS` array in `BrowseMode.tsx`. Renaming is a string replacement in those three places plus any tests that assert on the labels. The change is small once decided; the cost is entirely in the decision itself.

### 4.2 Definition context in Sandbox (F-02)

When a user clicks "Open in Sandbox" from a Browse definition, they land in the Sandbox with pre-populated objects but no trace of the definition that brought them there. The Inspector shows "Select an object to inspect it." The objects have no visible connection to the definition.

**Inspector default state.** When the Sandbox is entered from a Browse definition click (via `handleOpenInSandbox` in `App.tsx`), store the source definition ID in a new piece of App state — `originDefId: string | null`. Pass it to `Inspector` as a prop. When `selected === null` and `originDefId !== null`, the Inspector's empty state renders the definition's title, `formalStatement`, and plain statement instead of the generic "Select an object" message. This replaces a dead panel with the primary motivation for the current session.

The `originDefId` resets to `null` when the user clicks "New session" or navigates back to Browse independently. It persists across object creation within the session.

**Object backreferences.** Objects spawned by a definition template carry the definition ID in their `namedObjects` registration context — not in the session data model (that would be over-engineering), but via a new optional `origin?: string` field on the tile chrome in `ViewCard`. When a view is opened by `applyScene` and an `originDefId` is set, `App.tsx` passes the origin down to `ViewGrid`, which passes it to `ViewCard`. The tile header renders a small `"from §1.20"` in `var(--ink-4)` using `var(--font-mono)` at `var(--t-micro)` — visible but quiet.

**Back affordance.** A `"← §1.20 Vector space"` breadcrumb in the Sandbox toolbar (App.tsx top bar, right of the Browse/Sandbox toggle) renders when `originDefId` is set. Clicking it returns to Browse with the corresponding card open in the side panel. This requires no new routing — the existing `setMode('browse')` call plus passing `openDefId` as state handles it.

### 4.3 Relational object display (F-03)

The review's strongest pedagogical observation: "linear algebra is the study of how objects transform under maps. The relationships are the content. Hiding them behind a tile grid means the visualizer is showing the nouns but not the verbs."

Phase 10 partially addressed this by implementing `DerivedVector` and `DerivedMap` with live recomputation. Finding F-03 asks for the relational structure to be *visible*, not merely functional. Three levels of implementation, in increasing complexity:

**Level 1 — Typographic edges (11C scope).** Objects derived from other objects show their dependencies in the tile chrome. The `ViewCard` already has access to `view.objectRef`. When the object has a `derivation` field (introduced in Phase 10), the tile header renders a small dependency line: `"= v₁ + v₂"` for a sum, `"= A(v)"` for an application, `"= A × B"` for a composition. This resolves named objects via `session.namedObjects` to display human-readable labels rather than IDs. The implementation is entirely in `ViewCard.tsx`, reading from the session's vectors/maps records.

**Level 2 — Co-animation signal (partially done).** When the user drags v₁ and the dependent w updates in real time, this is already working from Phase 10. The missing piece is a visual signal that the update is happening relationally, not coincidentally. Add a brief pulse animation (0.15s `box-shadow` flash using `--color-derived`) to the tile border of derived objects when their value recomputes. This communicates "this tile updated because you changed something else" without requiring the user to discover it by trial and error.

**Level 3 — On-canvas edges (post-11C scope).** Physical lines connecting related tiles on the Sandbox canvas are not in scope for 11C. They require rethinking the ViewGrid layout model (tiles as nodes in a positioned graph rather than cells in a CSS grid), which is a Phase 12+ architectural change. Level 1 and 2 deliver the core pedagogical value with minimal structural impact.

### 4.4 Acceptance criteria for 11C

ADR-019 exists recording the vocabulary decision. KindBadge and Browse filter chips use the resolved vocabulary. Entering Sandbox from Browse with a definition shows the definition in the Inspector's default state. Derived object tiles show their derivation in the tile header (e.g. `"= v₁ + v₂"`). Dragging v₁ causes a visible pulse on derived tiles.

---

## 5. Stage 11D — Session persistence and sharing

*Finding addressed: F-09 (no memory, no shareable state)*

The review frames this as the product-identity question: a visualizer with no persistence is a demo; with shareable, durable state it becomes a medium. The "smallest viable" direction is URL-hash serialization — accounts and galleries are Phase 12+. This stage ships URL hash serialization and local-storage auto-save only, and explicitly defers the product question about whether the long-term vision is single-player (Desmos) or collaborative-medium (Observable).

### 5.1 URL hash serialization

`SessionSnapshot` is already a plain record (`field`, `spaces`, `vectors`, `maps`, `bases`, `innerProducts`, `selectedBasis`, `namedObjects`) without circular references. It serializes cleanly to JSON. The views array (`View[]`) also serializes. Together they constitute all the information needed to fully restore a Sandbox session.

**Serialization.** Create `src/state/persistence.ts` with `serializeSession(session: MathSession): string` (JSON of snapshot + views, gzip-compressed, base64-encoded — the compressed form of a typical 3-object session is under 500 bytes, well within URL hash limits) and `deserializeSession(hash: string): { snapshot: SessionSnapshot, views: View[] } | null` (decompresses and validates; returns null on failure rather than throwing). Use the `CompressionStream` / `DecompressionStream` Web API (available in all modern browsers) for gzip. The compressed+encoded string becomes the URL hash: `#session=<encoded>`.

**Integration.** In `App.tsx`, add two effects: one that writes the hash on every `defaultStore` state change (debounced 500ms to avoid thrashing the browser history), and one that reads the hash on mount and calls `store.applyScene(deserialized)` if a valid session is found. The write effect uses `history.replaceState` (not `pushState`) to avoid polluting the back-stack with every drag event.

For `DerivedVector` and `DerivedMap` objects (introduced in Phase 10), the derivation expression must serialize as part of the vector/map record. Since `derivation` is already a plain JSON-serializable field on `ConcreteVector` and `LinearMap`, this requires no additional work.

**Formula maps** (`representation.kind === 'formula'`) cannot serialize — the `fn` field is a JavaScript function. When serializing, formula-kind maps are serialized as `null` and restored as empty. A warning is shown in the "Copy link" tooltip if the session contains formula maps. Matrix-kind and derived-kind maps serialize fully.

### 5.2 Local-storage auto-save

On every significant state change (debounced 2000ms, not fired during drag to avoid 60fps writes), write the current serialized session to `localStorage` under a rotating key: `ladr_session_0` through `ladr_session_4`, with a separate `ladr_session_meta` entry holding the metadata (timestamp, number of objects, first named object as title). This gives a "Recent" list of up to five sessions.

In `BrowseMode.tsx` (or a new `RecentPanel` component in the Sandbox sidebar), surface the recent list as a small section above the catalog: "Recent — 3 sessions" with a compact list showing timestamp and session title. Clicking a recent item calls `store.applyScene(deserialized)` and switches to Sandbox mode. This list is hidden when empty.

### 5.3 Copy link button

A "⌘ Copy link" button in the Sandbox top bar (right side, near the Browse/Sandbox toggle) calls `navigator.clipboard.writeText(window.location.href)` and briefly shows a "Copied!" confirmation. The button is disabled when the session is empty. If the session contains formula maps that were excluded from serialization, the tooltip reads "Note: formula maps are not included in the link."

### 5.4 Open question (not resolved in this PRD)

The review asks: is the long-term vision a single-player workbench (Desmos) or a shareable medium (Observable)? This PRD deliberately does not answer it. URL-hash serialization and local-storage auto-save are useful and reversible regardless of which direction is chosen — they're the floor, not the ceiling. The question of accounts, galleries, and collaborative sessions is deferred to Phase 12+ and should be decided with user feedback from Phase 11D.

### 5.5 Acceptance criteria for 11D

Loading the Sandbox with a session hash restores all objects and views correctly. Reloading an empty-hash URL shows an empty Sandbox. The "Copy link" button copies a URL that, when opened in a fresh tab, reproduces the session. The recent-sessions list shows the last 5 Sandbox sessions and restoring one works correctly.

---

## 6. Implementation order

The four stages are mostly independent, but have two soft ordering constraints: 11B should land before 11C because the DiagramTheme module from 11B gives 11C's derived-object pulse animation a clean color token to use. 11A can land before or after 11B independently.

The hard constraint is that 11C requires ADR-019 (the tag vocabulary decision) to be made first. The implementation of 11C itself is then straightforward. 11D is fully independent and can land at any point after 10.

Recommended order: 11A → 11B → (ADR-019 decision) → 11C → 11D.

---

## 7. Appendix items (intentionally deferred)

The review surfaced six additional observations that were parked out of scope for this synthesis. They are captured here so they don't fall through:

**Catalog scope.** Browse currently shows only definitions. Propositions, theorems, exercises, and examples are not in scope today; this should be decided explicitly before Phase 9 content work reaches a chapter that would benefit from theorem entries.

**Onboarding.** First-time visitors land on a wall of text-only cards with no guided path. A "start here" flow is distinct from the catalog problem and warrants its own PRD after Phase 11 stabilizes the catalog's visual quality.

**The "+ view" affordance.** The concept of multiple representations of the same object is central to the product's value but undersold by a tiny outlined button in the tile header. Better discoverability — a contextual prompt when an object has no views, or a more prominent visual affordance — should be addressed in Phase 12.

**Timeline discoverability.** The timeline/keyframe scrub bar is buried at the bottom of the Sandbox with no framing. "Where linear algebra becomes a movie" is a strong user story that currently has no entry point. This belongs in a pass on the Sandbox information hierarchy.

**Mobile and tablet.** The tile grid needs a narrow-width audit. Students use iPads. Out of scope here; should be addressed before any public-facing promotion.

**Accessibility.** Color-only encoding of the kind badges and diagram arrow roles fails for roughly 8% of male users. A token-level audit should accompany the DiagramTheme work in 11B as a follow-on rather than a blocker.
