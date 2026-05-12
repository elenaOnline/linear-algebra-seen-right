# ACTION ITEMS

Punch list of known issues and verification gates that should land before specific phases. This file differs from the others in dev-notes:

- **DEVLOG.md** — chronological session log (what happened).
- **NOTES.md** — durable reference (decisions, gotchas, open questions).
- **ACTION_ITEMS.md** — the working punch list (what needs to be done).

When an agent sits down to work, this is the file that tells them *whether anything is blocking* the phase they're about to start. When an agent resolves an item, they move it to the **Resolved** section with a date — entries are not deleted, so the project history of fixes stays auditable.

## How to add an item

Append to **Open items** with the next sequential `AI-NNN` ID. Each entry has:

- **What** — the concrete change or check required, with file paths or operation names.
- **Why** — what fails or degrades if this isn't done. The reason is what lets a future agent prioritize.
- **Where** — file:line or operation:argument references, so a reader can jump straight to the spot.
- **Blocks** — which phase(s) this should land before. `None` is fine if it's a quality-of-life fix.
- **Status** — `open`, `in-progress`, or `blocked on [dependency]`.

If an item turns out to be wrong or no longer applies, mark it `withdrawn (YYYY-MM-DD)` in **Resolved** with a brief reason rather than deleting it.

---

## Open items

*None.*

---

## Resolved items (Phase 10)

### AI-006  (resolved 2026-05-12)
### AI-007  (resolved 2026-05-12)
### AI-008  (resolved 2026-05-12)
### AI-009  (resolved 2026-05-12)

All four resolved in commit `f9a803c`. See DEVLOG for full details.

---

## Previously open items (now resolved)

### AI-006 — Fix formula map evaluation in ObjectInput  (open)

**What.** `ObjectInput.tsx:88` calls `mkLinearMapByFormula(space.id, space.id, (v) => v, fnLabel)` regardless of what the user typed — the identity function is always used. The parse result (`result.label`, `result.params`) is stored in the label but the formula body is never evaluated. Every formula map silently behaves as the identity.

**Why.** This is a correctness failure. A user typing `T(x, y) = (x + y, x - y)` sees the expression reflected in the tile header but the grid-deformation and kernel-range views show the identity transformation. This is actively misleading — worse than unsupported, because it looks like it worked.

**Where.** `src/ui/ObjectInput.tsx:81–95` (the `result.kind === 'formula'` branch). The parser in `src/interaction/parser/` produces `ParsedFormula` with `params: string[]` and `label: string` (the formula body as a string). The fix: evaluate the formula at standard basis vectors `e₁, e₂, …` to extract matrix columns — `T(eᵢ)` is a concrete vector, the columns stacked form `ℳ(T)`. This requires a small arithmetic expression evaluator for the formula body (substituting `x=1, y=0`, etc.), or alternatively sending the formula to the SymPy engine via `engine.formulaToMatrix`. ADR-014 acknowledged this was deferred; the engine is now fully operational and this is no longer acceptable as a placeholder.

**Blocks.** Phase 10 / Connected Sandbox.

**Status.** open

---

### AI-007 — Wire Inspector computed properties to the engine  (open)

**What.** `Inspector.tsx:113–117` shows rank, nullity, and det for maps but displays "—" with "not yet computed" for all three. `useComputation` exists at `src/ui/hooks/useComputation.ts` and is used by renderers; it is not called anywhere in `Inspector.tsx`. Wire it up for the selected map.

**Why.** The Inspector is the primary place where a user expects to learn properties of a mathematical object. Currently it is inert for every computed property — the entire "Computed" section is dead UI. Rank and nullity are especially important because the rank-nullity theorem is a central Chapter 3 result and the Inspector is where a user would verify it holds for their specific map.

**Where.** `src/ui/Inspector.tsx:212–243` (the "Computed" section). Add `useComputation` calls for `{ operation: 'rank', objectId: selected.id }` and `{ operation: 'nullity', objectId: selected.id }` and `{ operation: 'determinant', objectId: selected.id }` (if square). Replace the `'—'` placeholders with the actual results once computed; show a loading indicator during computation.

**Blocks.** Phase 10 / Connected Sandbox.

**Status.** open

---

### AI-008 — Object deletion + ObjectLibrary selection wiring  (open)

**What.** Two related gaps: (1) No way to delete an object from the session — the store has no `removeVector`, `removeMap`, or `removeSpace` actions, and neither the ObjectLibrary nor the Inspector has a delete affordance. Sessions accumulate objects with no recourse short of a full scene reset. (2) The `onSelect` callback is threaded from `App.tsx` through `ObjectLibrary` but it is unclear if clicking an item in `ObjectLibrary` actually calls it — the Inspector remains blank ("Select an object to inspect it.") unless the wiring is verified to work.

**Why.** Without deletion, every input mistake or exploratory object permanently occupies the session. Combined with no editing affordance, this makes the sandbox feel write-only. Without Inspector selection working, the Inspector column is permanently empty for user-created objects, which means the computed properties fix (AI-007) won't be reachable in practice.

**Where.** Store actions: add `removeVector(id)`, `removeMap(id)`, `removeSpace(id)` to `src/state/store.ts` (each removes the object and also closes any open views referencing it). ObjectLibrary: add delete button per item, call `onSelect` when an item is clicked. App.tsx/ObjectLibrary: verify the `onSelect → setSelected` chain reaches the Inspector.

**Blocks.** Phase 10 / Connected Sandbox.

**Status.** open

---

### AI-009 — Named-object referencing and derived (live) objects  (open)

This is the architectural item for Phase 10. It has two coupled parts.

**Part A — Named-object referencing in ObjectInput.**

**What.** The expression parser (`src/interaction/parser/`) only handles literals: `(1, 2)`, `[[1,0],[0,1]]`, `T(x,y) = …`. It cannot resolve names. Typing `v + w` when `v` and `w` are named session objects produces a parse error or treats them as unknown identifiers. Naming is therefore purely cosmetic — a label that lives in `session.namedObjects` with no computational role.

**Why.** This is the single largest gap between a static viewer and a sandbox. Named objects should be the primary unit of composition — the whole point of giving a vector a name is so you can reference it in later expressions. Without this, every object in the session is isolated; there is no way to express relationships between objects at all.

**Where.** `src/interaction/parser/lexer.ts` (add name token type), `src/interaction/parser/parser.ts` (add name-reference production rules), `src/ui/ObjectInput.tsx` (thread `session.namedObjects` into `parseInput` so the parser can resolve names at parse time). Supported operations to start: `v + w` (vector sum), `v - w` (vector difference), `λ * v` or `2v` (scalar multiple where λ is a rational literal), `A(v)` or `A v` (map application), `A * B` (map composition), `A + B` (map sum). These are all closed-form rational arithmetic; no engine required.

**Part B — Derived (live) objects in the session.**

**What.** When Part A's named-object expressions are evaluated, they currently would produce a concrete vector (a one-shot evaluation that is immediately independent of its inputs). The stronger behavior — and the one that addresses Elena's specific complaint about templates producing disconnected objects — is to store the *expression* in the session, not just its evaluated value, and recompute the cached value whenever a dependency changes.

**Concretely:** `w = v + u` creates a `DerivedVector` whose cached components are `v.components + u.components` at creation time, and are automatically recomputed whenever `v` or `u` change (e.g., via drag). Dragging `v` causes `w` to update in real time.

**Session model addition:**
```typescript
type DerivedVector = {
  readonly kind: 'derived'
  readonly field: Field
  readonly space: SpaceId
  readonly expression: VectorExpression   // see ADR-018
  components: readonly Scalar[]           // cached; recomputed on dep change
}

type VectorExpression =
  | { readonly op: 'add';   readonly left: VectorId; readonly right: VectorId }
  | { readonly op: 'sub';   readonly left: VectorId; readonly right: VectorId }
  | { readonly op: 'scale'; readonly scalar: Scalar;  readonly vector: VectorId }
  | { readonly op: 'apply'; readonly map: MapId;      readonly vector: VectorId }

type DerivedMap = {
  readonly kind: 'derived-map'
  readonly expression: MapExpression
  // … cached matrix entries
}

type MapExpression =
  | { readonly op: 'compose'; readonly left: MapId; readonly right: MapId }
  | { readonly op: 'sum';     readonly left: MapId; readonly right: MapId }
  | { readonly op: 'scale';   readonly scalar: Scalar; readonly map: MapId }
```

Store mutations (`updateVector`, `addVector`, `addMap`) trigger a `recomputeDerived()` pass that topologically walks the dependency graph and updates cached values for all transitively dependent derived objects. Computation is pure rational arithmetic — no engine call needed for addition/subtraction/scaling/application.

**Template updates:** All templates that currently hardcode compositional results (vector-addition-r2's `w`, linear-combination-builder's `combo`) should be updated to use `DerivedVector` expressions instead of concrete values.

**Why the full derived-object model is worth the complexity.** One-shot evaluation (Part A alone) is easy but doesn't address the core complaint: static templates that don't respond to user manipulation. With Part B, dragging `v₁` in the vector-addition template causes `w = v₁ + v₂` to update in real time — the sandbox now illustrates a mathematical relationship, not just a collection of static objects. This is the difference between a diagram and an interactive system.

**Where.** `src/state/types.ts` (new types), `src/state/store.ts` (new `DerivedVector`/`DerivedMap` handling in all mutation actions), `src/types/vector.ts` (factory for derived vectors), new `src/state/derivation.ts` (dependency graph walker and recomputation logic), `src/pedagogy/templates/starters.ts` (update compositional templates), `src/ui/ObjectInput.tsx` (create derived instead of concrete when expression references named objects).

**Blocks.** Phase 10 / Connected Sandbox. Should land before Phase 9 content expansion is completed (derived objects make the templates substantially more pedagogically honest).

**Status.** open

---

## Resolved items

### AI-005 — Phase 6 Stage 5: Animation timeline  (resolved 2026-05-11)

**What.** Implement the animation timeline to complete Phase 6 acceptance criterion 4: "The animation timeline supports continuous interpolation for numerical matrices and stepwise advancement for discrete sequences."

**Why.** Phase 6 cannot be marked Complete until this lands. The remaining Phase 6 acceptance criteria are mostly met (drag, controls, parser, view management), but the timeline is explicitly listed. It is also the feature that most directly demonstrates the architectural claim that math objects are decoupled from rendering — the same renderers update automatically when fed an interpolated session, without any renderer-level changes.

**Where.** New directory `src/interaction/timeline/`. Changes to `src/ui/App.tsx`, `src/ui/ViewContainer.tsx`. New `src/ui/TimelineScrubBar.tsx`.

**Blocks.** Phase 6 → Complete.

**Status.** resolved 2026-05-11

**Resolution.** Implemented in full: `src/interaction/timeline/types.ts`, `interpolation.ts`, `TimelineContext.tsx`, `src/ui/TimelineScrubBar.tsx`. `ViewContainer` injects `sessionViewFrom(interpolatedSnapshot)` when a fractional time is active. `App.tsx` wraps with `TimelineProvider` and mounts `TimelineScrubBar`. ADR-015 validated — zero renderer changes needed. 30 new tests; total 304 passing. Live at https://linear-algebra-seen-right.netlify.app.

**Original plan (for reference):**

*Architecture decision (pre-made — record as ADR-015):* The timeline interpolates `SessionSnapshot` objects, not renderer props. `sessionViewFrom(interpolatedSnapshot)` feeds the result directly into `toProps`. Renderers need zero changes. This is cleaner than the PRD's "renderer opt-in" framing and achieves identical visual output. The only renderer-visible change is that interpolated views should carry provenance `'animated'` rather than `'exact'` or `'numerical'` — which is a `toProps`-level concern, not a renderer concern.

**Files to create:**

1. **`src/interaction/timeline/types.ts`**
   ```typescript
   type TimelineKeyframe = {
     readonly snapshot: SessionSnapshot;
     readonly label?: string;  // e.g. "identity" or "rotation 45°"
   };
   type TimelineState = {
     readonly keyframes: readonly TimelineKeyframe[];
     readonly currentTime: number;  // 0 … keyframes.length-1 (continuous float)
     readonly isPlaying: boolean;
   };
   ```

2. **`src/interaction/timeline/interpolation.ts`** — `interpolateSnapshots(a, b, t)`:
   - Only interpolates `vectors` and `maps` (spaces, bases, namedObjects are taken from `a`)
   - For each vector in `a` and `b` with matching ID: linearly interpolate `components`; if kinds differ, return `a`'s value
   - For each map in `a` and `b` with matching ID: if both are `representation.kind === 'matrix'`, interpolate entries pairwise; otherwise return `a`'s value
   - Scalar interpolation: use float representation for intermediate values (`s = (1-t)*va + t*vb`)
   - Returns a new `SessionSnapshot` (deep clone of `a` with interpolated values)

3. **`src/interaction/timeline/TimelineContext.tsx`**
   ```typescript
   type TimelineContextValue = {
     state: TimelineState;
     addKeyframe: (label?: string) => void;     // captures current live session
     removeKeyframe: (index: number) => void;
     setCurrentTime: (t: number) => void;
     play: () => void;
     pause: () => void;
     // The interpolated snapshot at currentTime, or null if no keyframes / at index 0
     interpolatedSnapshot: SessionSnapshot | null;
   };
   ```
   Provider uses `useState` for timeline state and `requestAnimationFrame` for playback. Playback advances `currentTime` at a fixed rate (e.g. 0.5 units/second — so a 3-keyframe timeline takes ~4 seconds end-to-end). When `currentTime` reaches the end, pause.

4. **`src/ui/TimelineScrubBar.tsx`**
   - Horizontal track with dot markers at each keyframe index
   - Draggable scrub: click/drag on the track sets `currentTime` (clamped to `[0, keyframes.length-1]`)
   - Play/Pause button (▶ / ⏸)
   - "⊕ Keyframe" button — calls `addKeyframe` with a default label
   - Shown only when `keyframes.length > 0` OR always (to encourage use)
   - Lives in `App.tsx` between `<main>` and `<ObjectInput />`

**Files to modify:**

5. **`src/ui/ViewContainer.tsx`** — import `useTimeline()` context. If `interpolatedSnapshot !== null`, compute `sessionView = sessionViewFrom(interpolatedSnapshot)` instead of `sessionViewFrom(session)`. Pass this to `visualizer.toProps(obj, sessionView)`. The `obj` still comes from the live session (so the correct object is selected), but its geometry is derived from the interpolated snapshot.

6. **`src/ui/App.tsx`** — wrap the component tree with `<TimelineProvider>`. Add `<TimelineScrubBar />` between `<main>` and `<ObjectInput />`.

**Stepwise sequences** (Jordan chain, row reduction): represent as discrete keyframes with no fractional interpolation needed — just snap to the nearest integer index when `t` is not between 0 and `keyframes.length-1`. The user builds these manually by adding a keyframe at each step. The scrub bar advances discretely (clicking jumps to the next keyframe, not interpolating).

**Tests to write:**
- `interpolation.ts`: property test — `interpolateSnapshots(a, b, 0)` equals `a`, `interpolateSnapshots(a, b, 1)` equals `b`, `interpolateSnapshots(a, b, 0.5)` averages the components
- `TimelineContext`: renders without crashing, addKeyframe captures the current session, playback advances `currentTime`
- `TimelineScrubBar`: renders without crashing, shows play button and track

**Acceptance check:** After this lands, Phase 6 is complete. Run `pnpm verify`, confirm green. Manually: in the running app, define two vectors with different positions, add a keyframe, drag the vector to a new position, add another keyframe, press play — the vector should animate smoothly between the two positions.

---

## Resolved items

### AI-004 — Pyodide cold-start on Netlify  (resolved 2026-05-11)
**Resolution.** Deployed to `https://linear-algebra-seen-right.netlify.app` (site ID `8fef8434-8fc8-4f31-8b3e-e098a1d27134`). Verified in a real browser session via console injection:
- (a) Pyodide v0.27.0 initialized successfully from CDN — no errors
- (b) SymPy eigenvalue computation on [[1,2],[2,1]] returned "-1,3" (correct: eigenvalues are −1 and 3)
- (c) `pyodide.asm.wasm` served from jsdelivr with `Content-Type: application/wasm` ✓
- (d) Cold-start (loadPyodide + loadPackage("sympy")): ~5.76s — slightly over the 3-5s budget but within 1 reload's margin; bare Pyodide init without sympy load is faster. Budget is still reasonable.

Build config notes (required to get Netlify build working — see `netlify.toml` and `NOTES.md` gotcha):
- Removed `"pnpm": ">=8"` from `engines` in `package.json` — npm 10/11 crash on non-npm engine keys
- Updated `.nvmrc` from `24` to `20` — Node 24 + npm 11 same crash
- Build command `pnpm install && pnpm build` (Netlify auto-uses its bundled pnpm 10.30.3 which respects `onlyBuiltDependencies`)

### AI-003 — F^0 decision  (resolved 2026-05-10)
**Resolution.** Allow F^0. `mkVectorSpaceFn(field, 0)` now succeeds. `mkBasis` now permits an empty vector list when `dim(space) === 0`. `mkConcreteVector` already handled the empty-component case correctly. Open Question in NOTES.md resolved; ADR-011 added.

### AI-001 — Add reverse lookup from BasisId to SpaceId on SessionView  (resolved 2026-05-10)
**Resolution.** Added `getSpaceForBasis(id: BasisId): SpaceId | undefined` to the `SessionView` interface (`src/types/session-view.ts`) and implemented it in `StoreSessionView` (`src/state/session-view.ts`). The `dimOf` selector inline view object in `src/state/selectors.ts` updated to include the new method. Test stubs in `src/types/space.test.ts` updated. The `spaceIdOfMatrix` helper in `engine.ts` still uses a cast (it reconstructs the SpaceId from the BasisId string, which works for the current ID scheme but should be properly threaded through once Layer 3 wires the engine to the session).

### AI-002 — Replace `null as unknown as Matrix` in `matrixOf`  (resolved 2026-05-10)
**Resolution.** Added `MatrixOfResult` discriminated union to `src/compute/types.ts` (mirrors `InverseResult`). Updated `ComputationEngine.matrixOf` interface and the `Engine` implementation to return `Promise<MatrixOfResult>`. The `formula`-kind map now returns `{ kind: 'not_representable' }` instead of a null-cast. No callers existed to update.
