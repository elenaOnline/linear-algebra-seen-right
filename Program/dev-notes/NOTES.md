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

*(No gotchas recorded yet. Likely candidates as work begins: Pyodide + Vite asset handling, SymPy unevaluated-expression edge cases, Web Worker module graph quirks, `noUncheckedIndexedAccess` interaction with React.)*

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
