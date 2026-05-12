# Phase 4 — Layer 3: Visualization Registry

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Layer 3: Visualization Registry"
**Depends on:** Phases 0–3 complete; AI-001, AI-002, AI-003 resolved

---

## 1. Goal

Provide a runtime mapping from mathematical object types to applicable visualizers. The registry is the cross-cutting layer that decouples Layer 0's type system from Layer 4's renderers: it knows which rendering strategies are sensible for which mathematical objects, without either side knowing about the other.

The registry is **pure TypeScript** — no React, no D3, no R3F. It has no side effects beyond its own internal map. It imports from Layers 0 and 2 (types and SessionView) only. It does not import from Layers 4, 5, or 6.

---

## 2. Scope

### 2.1 Core types

```typescript
// RendererKind — matches the renderer names declared in Technical Architecture §Layer 4.
// Defined here so the registry can tag props without importing from Layer 4.
export type RendererKind =
  | 'geometric_3d'
  | 'geometric_2d'
  | 'diagram'
  | 'matrix'
  | 'symbolic'
  | 'chart';

// RendererProps is a deliberate stub for Phase 4.
// Each member is tagged by renderer kind. Layer 4 (Phase 5) will narrow the
// index-signature members to typed fields; the discriminated union shape is stable.
export type RendererProps =
  | { readonly renderer: 'geometric_3d'; readonly [key: string]: unknown }
  | { readonly renderer: 'geometric_2d'; readonly [key: string]: unknown }
  | { readonly renderer: 'diagram';      readonly [key: string]: unknown }
  | { readonly renderer: 'matrix';       readonly [key: string]: unknown }
  | { readonly renderer: 'symbolic';     readonly [key: string]: unknown }
  | { readonly renderer: 'chart';        readonly [key: string]: unknown };

// MathObject — the union of all Layer 0 types that can be registered for visualization.
export type MathObject =
  | VectorSpace
  | Subspace
  | LinearMap
  | Vector
  | Basis
  | Matrix
  | InnerProduct;

// MathObjectKind — the string key used to register and look up visualizers.
// One kind per Layer 0 type family (not per variant — applicable predicates handle variants).
export type MathObjectKind =
  | 'VectorSpace'
  | 'Subspace'
  | 'LinearMap'
  | 'Vector'
  | 'Basis'
  | 'Matrix'
  | 'InnerProduct';

// Visualizer<T> — a single registered view strategy for objects of type T.
export type Visualizer<T extends MathObject> = {
  readonly id:         string;             // globally unique, e.g. 'eigenline-2d'
  readonly label:      string;             // shown in "View as…" menu
  readonly renderer:   RendererKind;
  readonly applicable: (obj: T, session: SessionView) => boolean;
  readonly toProps:    (obj: T, session: SessionView) => RendererProps;
};
```

**Departure from architecture sketch.** The architecture uses `MathSession` in `applicable` and `toProps`. We use `SessionView` instead. Rationale: `SessionView` is the read-only cross-layer interface defined in Layer 0 precisely for this purpose. Passing the full `MathSession` would import a Layer 2 type into the registry; `SessionView` is the correct abstraction.

### 2.2 `VisualizerRegistry` class

```typescript
class VisualizerRegistry {
  // Register one or more visualizers for a given MathObjectKind.
  // Registration is additive — subsequent calls for the same kind append, not replace.
  register<T extends MathObject>(kind: MathObjectKind, visualizers: Visualizer<T>[]): void;

  // Return all visualizers for `kind` where applicable(obj, session) is true,
  // in registration order.
  getApplicable<T extends MathObject>(
    kind: MathObjectKind,
    obj: T,
    session: SessionView,
  ): Visualizer<T>[];

  // Return the visualizer with the given id, or undefined.
  getById(id: string): Visualizer<MathObject> | undefined;

  // Return all registered visualizers for a kind (regardless of applicability).
  // Used by the "View as…" menu to build the full list before filtering.
  getAll(kind: MathObjectKind): Visualizer<MathObject>[];
}

export const visualizerRegistry = new VisualizerRegistry();

// For tests only.
export function _resetVisualizerRegistry(): void;
```

The class maintains two internal structures:
- `entries: Map<MathObjectKind, Visualizer<MathObject>[]>` — all registered visualizers, keyed by kind
- `byId: Map<string, Visualizer<MathObject>>` — secondary index for `getById`

IDs must be globally unique. `register` throws an `InvariantViolation` if a duplicate ID is registered.

### 2.3 Initial visualizer registrations

The default application registry (the exported `visualizerRegistry` singleton) is populated by a call to `registerDefaults(visualizerRegistry)` in `src/registry/index.ts`. Tests that need an isolated registry create a fresh `VisualizerRegistry()` and do not call `registerDefaults`.

**LinearMap visualizers** (registered under `'LinearMap'`)

| id | label | renderer | applicable |
|---|---|---|---|
| `grid-deformation-3d` | Grid deformation (3D) | `geometric_3d` | dim(domain) ≤ 3 && dim(codomain) ≤ 3 && dim > 0 |
| `grid-deformation-2d` | Grid deformation (2D) | `geometric_2d` | dim(domain) == 2 && dim(codomain) == 2 |
| `eigenline-2d` | Eigenlines (2D) | `geometric_2d` | dim(domain) == 2 && domain == codomain |
| `kernel-range-diagram` | Kernel / range | `diagram` | always |
| `matrix-heatmap` | Matrix heatmap | `matrix` | always |
| `symbolic-formula` | Formula | `symbolic` | map.representation.kind == 'formula' |

**VectorSpace visualizers** (registered under `'VectorSpace'`)

| id | label | renderer | applicable |
|---|---|---|---|
| `basis-display` | Basis display | `symbolic` | always |
| `subspace-lattice` | Subspace lattice | `diagram` | always |
| `coordinate-axes-3d` | Coordinate axes (3D) | `geometric_3d` | space.kind == 'Fn' && dim == 3 |
| `coordinate-axes-2d` | Coordinate plane | `geometric_2d` | space.kind == 'Fn' && dim == 2 |

**Vector visualizers** (registered under `'Vector'`)

| id | label | renderer | applicable |
|---|---|---|---|
| `arrow-3d` | Arrow (3D) | `geometric_3d` | space resolves to Fn(_, 3) |
| `arrow-2d` | Arrow (2D) | `geometric_2d` | space resolves to Fn(_, 2) |
| `coordinate-display` | Coordinates | `symbolic` | always |

`toProps` functions for Phase 4 return minimal placeholder props — enough to confirm the renderer tag and the object identity, but not full renderer data. Phase 5 fills in the actual geometry. Example:

```typescript
{
  id: 'arrow-2d',
  label: 'Arrow (2D)',
  renderer: 'geometric_2d',
  applicable: (v, session) => {
    const space = session.getSpace(v.space);
    return space?.kind === 'Fn' && space.n === 2;
  },
  toProps: (v, _session) => ({
    renderer: 'geometric_2d',
    objectId: v.id,
    kind: 'vector_arrow',
    // Phase 5 will add: components, color, label, etc.
  }),
}
```

### 2.4 Zero-dimensional spaces (ADR-011)

Geometric visualizers (`geometric_2d`, `geometric_3d`) must explicitly return `false` from `applicable` when the relevant space has `dim === 0`. There is nothing to draw for the trivial vector space. Structural visualizers (`diagram`, `symbolic`) remain applicable — they render `{0}` as a single labeled node.

---

## 3. Tests

All tests use isolated `VisualizerRegistry` instances (not `visualizerRegistry`). Registry state does not leak between tests.

### 3.1 Registration and retrieval

- `getApplicable` returns only visualizers where `applicable` is true.
- `getApplicable` returns visualizers in registration order.
- `getById` finds a registered visualizer; returns undefined for unknown IDs.
- `getAll` returns all visualizers for a kind regardless of applicability.
- Duplicate ID throws `InvariantViolation`.

### 3.2 Applicability predicates for default visualizers

For each initial registration in §2.3, at least one test verifying:
- A case where `applicable` returns true
- A case where `applicable` returns false (if the predicate is non-trivial)

Focus cases:
- `grid-deformation-3d`: applicable for a 3D→3D map, not for a 5D→5D map.
- `eigenline-2d`: applicable for a 2D→2D (endomorphism), not for a 2D→3D map.
- `arrow-2d`: applicable for a vector in R^2, not for a vector in R^3.
- Geometric visualizers on a 0-dim space: applicable returns false.
- `kernel-range-diagram` on a formula-kind map: applicable returns true.

### 3.3 Open/closed property

Test that adding a new visualizer via `register()` does not affect `getApplicable` results for a different MathObjectKind. Adding a Vector visualizer must not change what LinearMap returns.

### 3.4 toProps shape

For each default visualizer, `toProps` should return an object whose `renderer` field matches the visualizer's declared `renderer`. This is the only contract Phase 4 can assert — the full prop schema is Phase 5's job.

---

## 4. Acceptance criteria

Phase 4 is complete when:

1. `src/registry/index.ts` exports `VisualizerRegistry`, `Visualizer<T>`, `RendererKind`, `RendererProps`, `MathObjectKind`, `MathObject`, and `visualizerRegistry`.
2. All default visualizers in §2.3 are registered.
3. `getApplicable` for a `LinearMap` in a 2D domain returns at least 4 visualizers (including `eigenline-2d`, `kernel-range-diagram`, `matrix-heatmap`, and one of the grid visualizers).
4. `registry/index.ts` has zero imports from `src/ui/`, `src/renderers/`, `src/interaction/`, or `src/pedagogy/`. Checked by inspection (or future lint rule).
5. All tests pass (`pnpm verify` green).
6. A devlog entry is written.

---

## 5. Out of scope

- Actual renderer prop schemas (Phase 5 fills these in when renderers are implemented).
- React components (Layer 4/5).
- Dynamic visualizer loading or lazy registration.
- Visualizer ordering/priority (registration order is sufficient for Phase 4).
- Persistence of visualizer state (which visualizers are currently open is Layer 2's `views` — the registry doesn't manage open/closed state).

---

## 6. Open design questions

- **`toProps` return type per renderer.** Phase 5 will want `toProps` for `geometric_3d` visualizers to return a narrower type than `RendererProps`. The current stub union allows this via standard discriminated-union narrowing once the field schemas are filled in. No structural change needed.
- **Session context in `register`.** Some visualizers might need session-level constants at registration time (e.g., current field). For now, `applicable` and `toProps` receive a live `SessionView` at call time — this is sufficient and avoids stale captures. If lazy per-session registration becomes necessary, that is a Phase 5+ concern.

---

## 7. Handoff to Phase 5

When Phase 4 is complete, the registry is populated but the renderer props are stubs. Phase 5 (Layer 4: Renderer Plugins) will:

1. Define concrete prop schemas for each renderer kind (narrowing the index-signature stubs).
2. Implement the actual renderer components that consume those props.
3. Replace the stub `toProps` bodies in the default visualizers with real extraction logic.

The registry itself is not expected to change in Phase 5 — only the `toProps` bodies and `RendererProps` narrowing. If the registry API requires modification during Phase 5, that should be treated as a Phase 4 revision and documented in NOTES.md.
