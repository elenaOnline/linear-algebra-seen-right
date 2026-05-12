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
