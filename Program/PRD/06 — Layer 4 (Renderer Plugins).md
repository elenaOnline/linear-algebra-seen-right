# Phase 5 — Layer 4: Renderer Plugins

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Layer 4: Renderer Plugins"
**Depends on:** Phases 0–4 complete. **AI-004 must be resolved before this phase touches the engine** (the Pyodide cold-start path has never been exercised in a real browser; Phase 5 is the first phase where renderers consume real engine output).

---

## 1. Goal

Make the math visible. Phase 4 produced a registry that knows *which* visualizers apply to which mathematical objects and dispatches `toProps`. Phase 5 builds the renderer components that consume those props, plus the minimal UI shell that mounts them. By the end of this phase, a user should be able to open the app, see at least one mathematical object rendered, and understand from the visual representation what they are looking at.

Phase 5 is large — it covers six renderer kinds and a UI shell — and will likely span multiple sessions. The phase is explicitly internally staged (§2.4). Each renderer can land independently; the registry already returns visualizers for renderers that aren't yet implemented, so the UI shell needs a graceful "renderer not yet implemented" placeholder.

---

## 2. Scope

### 2.1 UI shell

A minimal React shell sufficient to host renderers. Lives in `src/ui/`. Not a full application chrome — just enough to mount the renderer components.

Required:

- `src/ui/App.tsx` — root component. Replaces the current `app.tsx` placeholder ("Spanning.").
- `src/ui/ViewContainer.tsx` — wraps a single open view, dispatches on `RendererKind` to the appropriate renderer component, shows a placeholder when the renderer is not yet implemented or the props are stale.
- `src/ui/ViewGrid.tsx` — arranges currently open views in a CSS grid layout. Reads `session.views` from the Zustand store.
- `src/ui/ProvenanceBadge.tsx` — small indicator that surfaces whether a value is exact or numerical (per master PRD §8.1). Used by renderers that display computed scalars.
- `src/ui/LoadingState.tsx` — the rotating-message loading indicator, per ADR-003. Used wherever async computation is pending.

What's explicitly *not* in Phase 5: a toolbar, a sidebar for object creation, a chapter navigator. Those belong to Phase 6 (Interaction Layer) or Phase 7 (Pedagogy Layer).

### 2.2 RendererProps narrowing

Phase 4 left `RendererProps` as a discriminated union with `[key: string]: unknown` per member. Phase 5 replaces each member with a typed schema. Each renderer's prop schema lives alongside its component, and the union is re-exported from `src/registry/index.ts`.

The schemas are *deliberately minimal*. They contain only what the renderer actually consumes — objectId for hover/highlight bindings, the rendering data itself, and presentation hints (color, label, axis range). They do **not** carry full Layer 0 objects; `toProps` extracts what each renderer needs.

Per-renderer schemas — see §2.3 for the contracts.

### 2.3 The six renderers

Each renderer is a pure React component that takes its narrowed props and renders. Renderers have no knowledge of the Layer 0 type system, the session store, or the computation engine. They consume normalized props and produce DOM/SVG/canvas output.

**SymbolicRenderer** (`src/renderers/SymbolicRenderer.tsx`) — KaTeX

Props vocabulary: LaTeX strings, optional interactive slots (placeholders the user can click to inspect the substituted value), optional provenance tags per slot.

Used by: `coordinate-display` (Vector), `basis-display` (VectorSpace), `symbolic-formula` (LinearMap), any future visualizer that wants to display a formal mathematical expression. Also used by the chapter navigator (Phase 7) for definition text.

```typescript
type SymbolicProps = {
  readonly renderer: 'symbolic';
  readonly objectId: string;
  readonly latex: string;                        // KaTeX-rendered
  readonly inline?: boolean;                     // false → display style
  readonly provenance?: 'exact' | 'numerical';   // shows badge if present
  readonly interactiveSlots?: readonly {
    readonly id: string;
    readonly label: string;
  }[];
};
```

**MatrixRenderer** (`src/renderers/MatrixRenderer.tsx`) — D3/SVG

Props vocabulary: entry grid (rationals/decimals/symbolic strings), optional row/column labels, optional basis labels for the domain/codomain, optional heatmap overlay (numerical magnitude → color), optional row-reduction trace.

Used by: `matrix-heatmap` (LinearMap), `coordinate-display` for vectors when display-as-column-matrix is selected.

```typescript
type MatrixProps = {
  readonly renderer: 'matrix';
  readonly objectId: string;
  readonly rows: number;
  readonly cols: number;
  readonly entries: readonly (readonly string[])[];   // LaTeX strings per cell
  readonly heatmap?: readonly (readonly number[])[];  // |value|, normalized
  readonly rowLabels?: readonly string[];
  readonly colLabels?: readonly string[];
  readonly provenance?: 'exact' | 'numerical';
};
```

**DiagramRenderer** (`src/renderers/DiagramRenderer.tsx`) — Dagre + SVG

Props vocabulary: nodes (vector spaces, named with dimension), directed edges (linear maps), highlighted subgraphs (kernel, range, eigenspace), dashed edges (dual maps), collapse edges (quotient maps).

Used by: `kernel-range-diagram` (LinearMap), `subspace-lattice` (VectorSpace), future commutative-diagram visualizers, future tensor-construction visualizers.

```typescript
type DiagramProps = {
  readonly renderer: 'diagram';
  readonly objectId: string;
  readonly nodes: readonly {
    readonly id: string;
    readonly label: string;          // e.g. "V (dim 3)"
    readonly highlight?: 'kernel' | 'range' | 'eigenspace' | 'none';
  }[];
  readonly edges: readonly {
    readonly from: string;
    readonly to: string;
    readonly label: string;          // e.g. "T"
    readonly style?: 'solid' | 'dashed' | 'collapse';
  }[];
};
```

**Geometric2DRenderer** (`src/renderers/Geometric2DRenderer.tsx`) — D3/SVG

Props vocabulary: vectors (arrows from origin or free), lines, planes (rendered as lines in 2D), shaded regions, function graphs, level sets, cosets (translated subspaces), unit balls under various norms, axes with optional grid.

Used by: `arrow-2d` (Vector), `coordinate-axes-2d` (VectorSpace), `grid-deformation-2d` (LinearMap), `eigenline-2d` (LinearMap), 1D number line via collapsed axis, Argand diagram.

```typescript
type Geometric2DProps = {
  readonly renderer: 'geometric_2d';
  readonly objectId: string;
  readonly kind: 'vector_arrow' | 'grid_deformation' | 'eigenlines' | 'axes_only' | 'argand';
  readonly arrows?: readonly {
    readonly from: readonly [number, number];
    readonly to: readonly [number, number];
    readonly color?: string;
    readonly label?: string;
  }[];
  readonly lines?: readonly {
    readonly point: readonly [number, number];
    readonly direction: readonly [number, number];
    readonly style?: 'solid' | 'dashed';
    readonly label?: string;
  }[];
  readonly gridDeformation?: {
    readonly matrix: readonly [readonly [number, number], readonly [number, number]];
  };
  readonly axisRange?: readonly [number, number];   // symmetric, default [-5, 5]
};
```

**ChartRenderer** (`src/renderers/ChartRenderer.tsx`) — D3

Props vocabulary: spectral data (eigenvalue distributions, possibly complex — plot in Argand), singular value plots, rank/nullity dimension bars, basis coefficient bar charts. The "fallback view" for high-dimensional objects where structural information matters more than geometric.

Used by: spectral views (Phase 5 may not register one initially — leave registration to a later phase as needed), dimension-bar visualizer (future).

```typescript
type ChartProps = {
  readonly renderer: 'chart';
  readonly objectId: string;
  readonly kind: 'spectrum' | 'singular_values' | 'dimension_bars' | 'coefficients';
  readonly data: readonly {
    readonly label: string;
    readonly value: number;
    readonly secondary?: number;     // e.g. imaginary part for complex eigenvalues
  }[];
  readonly provenance?: 'exact' | 'numerical';
};
```

**Geometric3DRenderer** (`src/renderers/Geometric3DRenderer.tsx`) — React Three Fiber

Props vocabulary: vectors (arrows from origin), subspaces (planes through origin, lines through origin), parametric grids (deformed by a linear map), ellipsoids (image of unit sphere under a linear map), parallelepipeds, labeled axes, animated state transitions.

Used by: `arrow-3d` (Vector), `coordinate-axes-3d` (VectorSpace), `grid-deformation-3d` (LinearMap). Highest implementation cost — leave for last in the staging order (§2.4).

```typescript
type Geometric3DProps = {
  readonly renderer: 'geometric_3d';
  readonly objectId: string;
  readonly kind: 'vector_arrow' | 'grid_deformation' | 'axes_only';
  readonly arrows?: readonly {
    readonly from: readonly [number, number, number];
    readonly to: readonly [number, number, number];
    readonly color?: string;
    readonly label?: string;
  }[];
  readonly planes?: readonly {
    readonly normal: readonly [number, number, number];
    readonly offset?: readonly [number, number, number];   // default origin
    readonly label?: string;
  }[];
  readonly gridDeformation?: {
    readonly matrix: readonly [
      readonly [number, number, number],
      readonly [number, number, number],
      readonly [number, number, number],
    ];
  };
  readonly axisRange?: readonly [number, number];   // symmetric, default [-5, 5]
};
```

### 2.4 Staging order

Implement in this order. Each renderer should land complete with tests and the `toProps` bodies for its visualizers, before the next is started. The UI shell ships first because nothing is demonstrable without it.

1. **UI shell** — `App`, `ViewContainer`, `ViewGrid`, `ProvenanceBadge`, `LoadingState`. Renders a placeholder for every renderer kind.
2. **SymbolicRenderer** + `coordinate-display`, `basis-display`, `symbolic-formula` toProps. Simplest, validates the dispatch pipeline.
3. **MatrixRenderer** + `matrix-heatmap` toProps. Tests provenance display.
4. **DiagramRenderer** + `kernel-range-diagram`, `subspace-lattice` toProps. Validates the Dagre layout integration.
5. **Geometric2DRenderer** + `arrow-2d`, `coordinate-axes-2d`, `grid-deformation-2d`, `eigenline-2d` toProps. First geometric view; users can finally see vectors as arrows.
6. **ChartRenderer** + at least one chart visualizer (suggested: a `spectrum` visualizer for `LinearMap` showing the eigenvalue distribution).
7. **Geometric3DRenderer** + `arrow-3d`, `coordinate-axes-3d`, `grid-deformation-3d` toProps. Last because R3F has the steepest learning curve and the largest bundle impact.

Each stage's session ends with a devlog entry, `pnpm verify` green, and the staged renderer demonstrably rendering its registered visualizers in the dev server.

### 2.5 toProps replacement

Each renderer-implementing stage replaces the stub `toProps` bodies for that renderer's visualizers in `src/registry/index.ts`. The stubs currently return only `{ renderer, objectId, kind }`; real `toProps` extract the rendering data from the math object and the session.

Example: `arrow-2d` currently returns `{ renderer: 'geometric_2d', objectId: v.id, kind: 'vector_arrow' }`. The Phase-5 version extracts the vector's two components (or computes them in the active basis if the vector is `abstract`) and returns:

```typescript
{
  renderer: 'geometric_2d',
  objectId: v.id,
  kind: 'vector_arrow',
  arrows: [{
    from: [0, 0],
    to: [extractedComponentX, extractedComponentY],
    color: '#3b82f6',
    label: nameForObject(v.id, session) ?? '',
  }],
  axisRange: [-5, 5],
}
```

For visualizers that need engine output (e.g., `eigenline-2d` needs eigenvectors), `toProps` is *async-aware* only in the sense that it reads from `session.computationCache`. It does not call the engine itself — that's the interaction layer's job. If the required computation isn't cached yet, `toProps` returns a "loading" variant of the prop schema and the renderer displays `LoadingState`.

This means Phase 5 needs a small extension to `RendererProps`: each member can carry an `isPending?: true` flag with an `expectedRenderer` field for the loading variant. Add this once during stage 1 (UI shell).

### 2.6 Engine integration: who calls what when

This is the design question Phase 5 must answer cleanly. Two valid patterns:

(a) **Eager**: when an object enters the session, the store dispatches background engine calls for all "likely" derived data (eigendecomposition, SVD, null space). Renderers read only from the cache.

(b) **Lazy**: renderers signal what they need via a `useComputation(...)` hook that triggers the engine call if not cached. Renderers stay declarative; the hook lives in `src/ui/`.

Phase 5 should pick (b) — the lazy pattern — and implement a small `useComputation` hook in `src/ui/hooks/`. Rationale: eager dispatch wastes computation on views the user never opens; lazy is honest about the cost. The hook handles three states: `pending`, `success`, `error`, and writes results into the `computationCache` action of the store. `toProps` reads the cache.

This is a Phase 5 architectural decision that needs an ADR. Record it.

### 2.7 Visual style

Minimal but coherent. Phase 5 does not need a full design system. Pick:

- A small palette (≤ 8 colors) used consistently across renderers. Suggested: blue for primary vectors, red for eigenvectors, gray for axes/grid, amber for kernel highlights, teal for range highlights.
- Typography that pairs with KaTeX (it ships with KaTeX_Main; the surrounding UI should use a humanist sans-serif that doesn't clash — Inter or system-ui is fine).
- A consistent border-radius and spacing scale.
- Light theme only for Phase 5. Dark theme is a quality-of-life add later.

Style choices may be made by the implementing agent without surfacing them as ADRs, unless they affect cross-renderer consistency.

### 2.8 Tone — loading and error copy

All loading states use the rotating-message style per ADR-003. Curate a pool of 30–50 messages during stage 1; the pool lives in `src/ui/loadingMessages.ts` as a frozen array. Examples: *Composing…*, *Diagonalizing…*, *Decomposing…*, *Spanning…*, *Conjugating…*, *Resolving…*, *Tensoring…*, *Projecting…*, *Reducing…*, *Pivoting…*, *Mapping…*, *Triangulating…*. The renderer cycles through the pool at a 1–2 second cadence.

Error copy is concise and non-apologetic. Avoid "Sorry, something went wrong"; prefer "This map isn't representable as a matrix in the current basis." Identify what failed and what the user could do, never blame the user.

---

## 3. Tests

### 3.1 UI shell

- `ViewContainer` renders the correct component for each `RendererKind`, including the "not yet implemented" placeholder for unimplemented renderers.
- `ViewGrid` reads from a mock session and lays out views correctly.
- `LoadingState` cycles through messages from the pool.
- `ProvenanceBadge` displays the right indicator for exact vs. numerical values.

### 3.2 Per-renderer tests

Each renderer has tests at two levels:

**Component tests** (using React Testing Library or Vitest's DOM environment): render the component with representative props, assert that the expected DOM/SVG output is present. Snapshot tests are acceptable for stable visuals but should be reviewed when they change — a snapshot mismatch is the test, not the answer.

**toProps tests**: each `toProps` body has a test that constructs a representative Layer 0 object + session view, calls `toProps`, and asserts the resulting prop shape. This validates the extraction logic independently of the renderer itself.

### 3.3 Pending-state contract

A test that triggers `useComputation` for an uncached operation, asserts the renderer shows `LoadingState`, then resolves the promise and asserts the renderer transitions to the success state.

### 3.4 End-to-end smoke test

One integration test per renderer that mounts the full pipeline (registry → toProps → renderer) on a representative session and asserts the rendered output. This is the test that catches dispatch bugs.

---

## 4. Acceptance criteria

Phase 5 is complete when:

1. The UI shell renders the placeholder view for every `RendererKind`, including the "not yet implemented" state for any renderer that has not been built (during staged completion).
2. All six renderers are implemented and pass their component and toProps tests.
3. The `RendererProps` discriminated union has typed schemas per member; no `[key: string]: unknown` remains.
4. All visualizers registered in Phase 4 have real `toProps` bodies (no stubs left).
5. `useComputation` hook is implemented and used by `toProps` functions that need engine results.
6. The loading message pool exists in `src/ui/loadingMessages.ts` with at least 30 entries, all following ADR-003 style.
7. **AI-004 is resolved** — Pyodide cold-start verified on a Netlify preview deploy before any renderer consumes real engine output.
8. ESLint boundary rule blocks renderer files from importing `src/state/`, `src/compute/`, or higher layers directly. Renderers only consume props.
9. `pnpm verify` is green.
10. A devlog entry per staged completion (at minimum: UI shell, each renderer); `Program/PRD/00 §7` roadmap updated.

Phase 5 is *internally staged* (§2.4): the phase can be considered complete only when all stages have landed. Partial completion is an in-progress state, not a "complete" state.

---

## 5. Out of scope

- Drag interactions on rendered objects. The renderer accepts a `onObjectClick`/`onObjectDrag` callback prop, but the actual drag logic and its dispatch to the session store is Phase 6 (Interaction Layer).
- Parameter controls (sliders, toggles) for adjusting object data live. Phase 6.
- Input parsing — typing a matrix or formula. Phase 6.
- Animation timeline. Phase 6.
- Definition catalog / chapter navigation. Phase 7.
- Scene templates. Phase 7.
- Export to image or PDF. Deferred indefinitely.
- Dark theme. Deferred.

---

## 6. Open design questions

- **Resize behavior.** Should each view be resizable independently? Phase 5 recommendation: views fill their grid cell, and the grid layout responds to viewport size. Resizing individual views is a Phase 6 concern (it's a user interaction).
- **R3F bundle impact.** Three.js + R3F adds ~600KB minified. Acceptable for the project's scope but worth noting in NOTES.md. If bundle size becomes a concern, consider lazy-loading `Geometric3DRenderer` so 3D code only loads when a 3D view is opened.
- **Empty session.** What does the app look like when no objects exist in the session? Phase 5 recommendation: a single welcome card with a brief description of the tool and a "create an example" call-to-action (the actual button is wired in Phase 6 or Phase 7).

---

## 7. Risks

- **R3F + Vite + WebGL in test environment.** Vitest's jsdom doesn't have WebGL. Component tests for `Geometric3DRenderer` cannot exercise the actual rendering; they should test props-to-scene-graph translation in isolation, with the WebGL rendering verified manually in the dev server.
- **D3 imperative API in React.** D3's pattern of mutating DOM directly conflicts with React's declarative model. Use D3 for scales, layouts, and computations; let React render the JSX. Avoid `d3.select` inside a render path.
- **KaTeX bundle size and CSP.** KaTeX is ~280KB but ships with everything inlined. CSP-wise, KaTeX uses inline styles which require `'unsafe-inline'` or a nonce; the Netlify deploy may need a `_headers` rule. Verify during stage 2.
- **Renderer-engine coupling via `useComputation`.** The hook is the *only* place a renderer-adjacent file touches the engine. Lint rules should forbid direct engine imports anywhere under `src/renderers/`. Place the hook in `src/ui/hooks/`, not in `src/renderers/`.

---

## 8. Handoff to Phase 6

When Phase 5 is complete, the math is visible but inert — vectors render as arrows but can't be dragged, formulas display but can't be typed, sliders don't exist. Phase 6 (Interaction Layer) makes the renderers responsive to user input and adds the input affordances (typing, sliders, drag, animation timeline) that turn the tool from a viewer into a sandbox.

The Phase 6 PRD is at `PRD/07 — Layer 5 (Interaction Layer).md`. Before starting Phase 6, the agent should:

1. Read `Technical Architecture.md` §"Layer 5: Interaction Layer".
2. Skim the renderer components to understand which props are currently static and which need to become live.
3. Verify that all Phase 5 acceptance criteria genuinely hold — partial completion in Phase 5 will leak into Phase 6 as ambiguity.
