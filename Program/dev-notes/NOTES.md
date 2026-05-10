# NOTES

Durable, structured knowledge for the LADR Visualizer project. Three sections:

- **Decisions** — non-trivial architectural or implementation choices not specified in `Technical Architecture.md`. ADR-style.
- **Gotchas** — runtime, version, or environmental constraints that future work must respect.
- **Open Questions** — items waiting on input from Elena, or on information not yet known.

This file is meant to stay short enough to skim end-to-end. If it crosses ~400 lines, consolidate (merge duplicates, remove resolved questions, prune stale gotchas) instead of letting it grow. See `PRD/00 — Development Standards.md` §6.2 for the full convention.

---

## Decisions

ADR-style. Numbered, dated. Each entry has **Context**, **Choice**, **Why**, **Implications**. Decisions are not deleted when superseded — mark `Superseded by ADR-NNN` and add a new entry.

Format template:

```markdown
### ADR-NNN — short title  (YYYY-MM-DD)

**Context.** What problem or fork prompted this decision.

**Choice.** What was chosen.

**Why.** Reasoning. This is the most important field — it's what lets a future agent judge edge cases.

**Implications.** Knock-on effects on other layers, conventions, or future work.
```

### ADR-007 — Basis construction for tensor and quotient spaces deferred to Phase 2  (2026-05-10)

**Context.** The `Basis` type is defined in Layer 0 and the factory `mkBasis` validates that vector count matches space dimension. For `tensor` and `quotient` spaces, constructing a canonical basis requires either knowing a basis for each factor/parent (tensor case) or representing coset representatives (quotient case) — both involve structural reasoning that overlaps with Layer 1 computation.

**Choice.** Declare the `Basis` type in Phase 1; defer factory calls on tensor/quotient spaces to Phase 2.

**Why.** The `mkBasis` factory can still be called on tensor/quotient spaces if the caller supplies vectors with the correct `space` ID and count. Phase 1 enforces the dimension check structurally when dimension is computable. Phase 2 can add higher-level helper functions (`mkTensorProductBasis`, `mkQuotientBasis`) that build basis vectors using Layer 1 facilities.

**Implications.** Phase 2 should add construction helpers. Nothing in Phase 1 prevents the type from being used; callers just have to supply basis vectors manually.

---

### ADR-006 — Space deduplication via content-addressed module-level registry  (2026-05-10)

**Context.** PRD §7 (open design question) asks whether factories should deduplicate structurally identical spaces. The session state uses `SpaceId` as key in Maps, so two R^3 spaces with different object references but the same content would create two entries.

**Choice.** Module-level `Map<string, VectorSpace>` in `src/types/space.ts`. Factories key by a content string (e.g., `space:Fn:R:3`). First call creates and registers; subsequent calls with the same content return the same object.

**Why.** Makes `selectedBasis: Map<SpaceId, BasisId>` behave correctly — dragging a vector into a pre-existing R^3 and a "newly created" R^3 should update the same basis slot. Without dedup, the user would see two R^3 entries in the session store that are mathematically the same space.

**Implications.** Tests must call `_resetSpaceRegistry()` in `beforeEach` to avoid cross-test leakage. Abstract spaces are keyed by `field+dim+label`, so two abstract spaces labeled the same share an ID — this is a feature (consistent with the equality semantics) but worth documenting for users.

---

### ADR-005 — SymExpr wire format: serialized string + vars list  (2026-05-10)

**Context.** Layer 0 must declare `SymExpr`'s shape without knowing how Phase 2 will marshal expressions across the Web Worker boundary.

**Choice.** `{ kind: 'symexpr'; serialized: string; vars: readonly string[] }`. The `serialized` field holds a string representation of the SymPy expression; `vars` lists the free variables. This is opaque to all Layer 0 consumers.

**Why.** Minimal: only what consumers need to know (that there is a serialized form and which variables appear free). Phase 2 has authority to revise the format when the worker bridge is built — it may switch to a binary encoding, a structured JSON form, or a different string dialect. Keeping it opaque ensures no consumers will break.

**Implications.** Phase 2 agent should record a revision of this ADR if the wire format changes. Consumers must never destructure `serialized` or assume its grammar.

---

### ADR-004 — Scalar.rational stores Fraction (Fraction.js) not {num: bigint; den: bigint}  (2026-05-10)

**Context.** Technical Architecture §Layer 0 sketches `{ kind: 'rational'; num: bigint; den: bigint }`. Fraction.js is listed in the Tech Stack for rational arithmetic.

**Choice.** `{ kind: 'rational'; value: Fraction }` where `Fraction` is the Fraction.js class.

**Why.** Using the Fraction type directly avoids wrapping and unwrapping: all arithmetic operations (`add`, `mul`, `inverse`, etc.) are native Fraction methods. The bigint sketch in the architecture was illustrative; the Tech Stack table is authoritative on Fraction.js as the implementation.

**Implications.** Fraction.js uses JS numbers internally (`.n`, `.d`) — not bigints — so precision is limited to 2^53 for numerator/denominator. For the range of values in a linear algebra sandbox this is sufficient. If exact large-integer arithmetic becomes necessary (e.g., symbolic determinant over very large integer matrices), revisit.

---

### ADR-001 — CI host: GitHub Actions  (2026-05-09)

**Context.** The Phase 0 sub-PRD assumed GitHub Actions for CI without confirming. Originally posed as Open Question on 2026-05-09.

**Choice.** GitHub Actions.

**Why.** Confirmed by Elena. Aligns with the GitHub-hosted-repo assumption baked into tooling defaults; no integration overhead.

**Implications.** Phase 0 lands `.github/workflows/verify.yml` running `pnpm install --frozen-lockfile && pnpm verify` on push and PR. No deployment from CI — deployment is Netlify's concern (see ADR-002).

---

### ADR-003 — Loading & progress communication: joyful-but-substantive  (2026-05-09)

**Context.** Pyodide's 2–5s cold start is the most prominent wait state, but not the only one — symbolic operations on larger matrices, Jordan form, scene-template loading, and animation set-up will all introduce latencies the user experiences. Whether and how to communicate during these waits is a design choice that sets the tool's tonal register.

**Choice.** Adopt a rotating short-message style modeled on Claude Code's "thinking" messages: short, evocative verb/gerund forms, varied, playful but not saccharine, never apologetic. For the LADR Visualizer specifically, draw on the mathematical vocabulary the project is already steeped in. Words like *Composing*, *Diagonalizing*, *Spanning*, *Tensoring*, *Conjugating*, *Resolving*, *Decomposing* do double duty: evocative as English and referencing the actual operations the engine is performing.

**Why.** Elena's stated design intent — "joyful-but-substantive" is her phrasing and captures the bar precisely. The mathematical vocabulary is unusually well-suited to this pattern. Adopting the style early sets the tonal register for the whole tool and rules out the flat-corporate defaults ("Loading…", "Initializing computation engine…") that would be tonally off-key.

**Implications.**
- All loading and progress states throughout the tool follow this pattern, not just Pyodide cold-start. Long symbolic computations, scene-template loads, Gram-Schmidt animation set-up, etc.
- Phase 0's placeholder text adopts the style — the first commit should already be tonally on-key, not deferred until Phase 2 ships the loading machinery.
- Phase 2 implements a rotating message pool with random selection on a ~1–2 second cadence. The pool is curated, not auto-generated; aim for ~30–50 messages so repetition is rare within a single load.
- Adjacent UI affordances (empty states, error copy, undo notifications) should also avoid the flat-corporate register, though they need not strictly use the gerund pattern.
- A future ADR may codify the message pool itself once curated; for now, leave its construction to the implementing phase but constrain the style.

---

### ADR-002 — Static host: Netlify  (2026-05-09)

**Context.** Pyodide's ~10–12MB asset payload makes static-host choice non-trivial: bandwidth caps, WASM MIME types, and COOP/COEP headers all matter. Originally posed as Open Question on 2026-05-09.

**Choice.** Netlify.

**Why.** Elena's preferred static host. Concrete suitability check:
- *Bandwidth.* Free tier is 100GB/month; with proper caching ≈ 8,300 cold loads/month. Adequate for the project's expected scale; Pro tier scales to ~85,000 if needed.
- *WASM MIME.* Netlify serves `.wasm` with `application/wasm` by default. Verify in Phase 2; if a `_headers` override is needed, add it then.
- *Caching.* Pyodide assets are versioned/immutable, so they cache effectively at Netlify's edge and in browsers — first load is the only expensive one for a returning user.
- *COOP/COEP headers.* Required *only* if Pyodide is configured with `SharedArrayBuffer`. Defer this decision to Phase 2; if SAB is enabled, add the headers via `netlify.toml`. Until then, no special headers are required.

**Implications.**
- Phase 0 does not need Netlify configuration files yet — the build output `dist/` from `pnpm build` is the only artifact Netlify needs, and it'll work with default settings.
- Phase 2 verifies WASM MIME serving is correct on a Netlify deploy preview before declaring Pyodide integration complete.
- If SAB is later enabled, ADR-002 is revised (or superseded) to document the header config.

---

## Gotchas

Each entry: the constraint, where it bites, and the workaround if any. Keep entries terse — this is reference material, not narrative.

Format:

```markdown
### Short title

**Constraint.** What it is.
**Bites at.** Where the constraint shows up (specific layer, file, operation).
**Workaround.** How to handle it; "none — accept the constraint" is a valid answer.
```

### noUncheckedIndexedAccess + internal array invariants

**Constraint.** TypeScript returns `T | undefined` for any array index access under `noUncheckedIndexedAccess`, even when the index is provably in bounds (e.g., last element of a non-empty array).
**Bites at.** `src/types/polynomial.ts` (`leadingCoefficient`, `constantTerm`), `src/types/matrix.ts` (`entry`, `rowOf`), and anywhere else with invariant-protected array access.
**Workaround.** Check for `undefined` and throw an `invariantViolation()` in cases guaranteed by the factory to be valid. The throw documents that the only way to reach it is a bug, not user input.

### pnpm 11 build script security defaults

**Constraint.** pnpm 11 blocks post-install build scripts by default. `esbuild` (used by Vite internally) needs a build script to install its native binary.
**Bites at.** `pnpm install` — exits with `ERR_PNPM_IGNORED_BUILDS` if `esbuild` is not approved.
**Workaround.** Add `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }` to `package.json`. Already done in Phase 0. Any future package that requires a build script must be added to this list.

### skipLibCheck required for Vite + Vitest type defs

**Constraint.** Vite and Vitest ship `.d.ts` files that reference Node.js internals (`node:http`, `Buffer`, etc.) and use optional property conventions that conflict with `exactOptionalPropertyTypes: true`.
**Bites at.** `tsc --noEmit` — fails with dozens of errors in `node_modules` if `skipLibCheck: false`.
**Workaround.** `skipLibCheck: true` in `tsconfig.json`. This is the canonical Vite + TypeScript setup; it does not relax strictness on our own code.

---

## Open Questions

Items waiting on Elena's input or on information not yet known. Each carries `[OPEN]` until resolved. On resolution, replace with the resolution and a date, or — if architecturally significant — move into Decisions.

Format:

```markdown
### Short title  [OPEN]
Posed: YYYY-MM-DD

The question, in 1–3 sentences. What blocks resolution. What the asker would do absent an answer (the default).
```

*(No open questions. Resolved items have been moved to Decisions: ADR-001 [CI host], ADR-002 [static host].)*
