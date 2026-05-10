# LADR Visualizer — Development Standards (Master PRD)

This is the entry point for any agent (or human) starting work on the LADR Visualizer codebase. Read this file first. It does not duplicate the architecture — it tells you how to work within it.

---

## 1. What this PRD set is

The PRD set in `Program/PRD/` is the operational complement to the design documents in `Program/`. Their roles are distinct:

- **`Program/Project Overview.md`** — what the product is and why it exists. Treat as immutable framing.
- **`Program/Technical Architecture.md`** — the binding technical specification: the six layers, the type system shape, the computation engine contract, the visualization registry pattern. Treat as authoritative for architectural questions. Do not edit it without explicit user approval; if something in it feels wrong, raise an `Open Question` in `dev-notes/NOTES.md` rather than amending the spec unilaterally.
- **`Program/PRD/`** — *how* the architecture gets built: phase ordering, deliverables per layer, acceptance criteria, coding standards, agent working agreement, note-taking conventions. Living documents — agents can amend their own sub-PRDs as they discover new constraints, with the rules in §3.
- **`Program/dev-notes/`** — the working memory for agents: chronological session log (`DEVLOG.md`) and durable knowledge — decisions, gotchas, open questions (`NOTES.md`).
- **`Program/Necessary components.md`** — legacy. Ignore unless explicitly directed to it.

If the Project Overview, Technical Architecture, and a sub-PRD ever appear to conflict, the Technical Architecture wins, and the conflict goes into `NOTES.md` as an Open Question.

---

## 2. Source of truth hierarchy

When two sources disagree, resolve in this order (highest authority first):

1. Direct, explicit instruction from Elena in the current conversation
2. `Program/Project Overview.md` and `Program/Technical Architecture.md`
3. The relevant layer/phase sub-PRD in `Program/PRD/`
4. This master PRD (`00 — Development Standards.md`)
5. Decisions recorded in `dev-notes/NOTES.md`
6. Code currently in the repo
7. The agent's general training intuitions

Do not let item 7 override items 1–6 silently. If you need to deviate from a higher-authority source, surface the deviation explicitly to Elena before acting.

---

## 3. Working agreement for stateless agents

Every agent working on this project should treat itself as if it has no memory beyond the current conversation. Memory across sessions lives in files. The rules below are non-negotiable.

### 3.1 Onboarding flow at the start of every session

Before doing any work on this project:

1. Read `Program/Project Overview.md` and `Program/Technical Architecture.md` if architectural understanding is needed for the task.
2. Read this file (`PRD/00 — Development Standards.md`).
3. Read the sub-PRD(s) for the layer(s) being touched.
4. Skim the most recent ~5 entries of `dev-notes/DEVLOG.md` to understand current state and any in-flight work.
5. Skim `dev-notes/NOTES.md` end-to-end. It is meant to remain short enough for this to be cheap; if it is no longer cheap, that is a signal to consolidate, not to skip.
6. If the task touches code, run `git status` and `git log -n 10 --oneline` (or read the equivalent) to see what has actually been changed recently — file state is authoritative.

### 3.2 Closing flow at the end of every session

Before ending a session (or before handing back to Elena):

1. Append a session entry to `dev-notes/DEVLOG.md` (format in §6.1).
2. Promote anything durable from the devlog into `dev-notes/NOTES.md` (format in §6.2). Durable means: a future agent will need to know this even after the immediate task is forgotten.
3. If you made an architectural choice that the Technical Architecture did not pre-specify, record it as a Decision in `NOTES.md` with rationale. *Why* matters more than *what* — the rationale is what lets the next agent judge edge cases.
4. If you discovered a compatibility, version, or runtime gotcha (browser API quirk, library bug, WASM/worker constraint), record it as a Gotcha in `NOTES.md`.
5. If you left an unresolved question that needs Elena's input, record it as an Open Question in `NOTES.md` *and* surface it in your final response.

### 3.3 General principles

- **Write down anything you would not trivially re-derive.** If a fact took non-trivial effort to discover (a library quirk, a numerical edge case, a typing trick that resolves a circular import), it goes in `NOTES.md`. The default should be *write it down*, not *trust the next agent will figure it out*.
- **Avoid sprawl.** Notes that turn out to be wrong, obsolete, or duplicative should be edited or removed, not stacked. A session that consolidates `NOTES.md` is a productive session, not a wasted one. If `NOTES.md` exceeds ~400 lines, that is a signal to consolidate, not to keep growing it.
- **Prefer abstraction over analogy** in any explanation, comment, or note (this matches Elena's stated preference). Examples are useful as supplements; they should not stand in for the structural claim.
- **Surface, do not bury.** If you are uncertain or in disagreement with the spec, state it clearly. Do not paper over architectural tension with a workaround that hides the tension.
- **Leave the repo working.** Do not commit code that does not type-check, does not build, or breaks tests, unless you are explicitly handing off mid-task and have flagged it in the devlog.

---

## 4. Coding standards

### 4.1 Language and style

- TypeScript with `strict: true` and `noUncheckedIndexedAccess: true`. The mathematical type system is the spine; loosening strictness anywhere undermines that.
- Prefer discriminated unions (with a `kind` field) over class hierarchies. The architecture's type sketches already use this pattern; preserve it.
- No `any`. If you genuinely need to widen a type, use `unknown` and narrow at the consumer.
- Pure functions over mutation wherever feasible, especially in Layers 0–3. State mutation is the job of the Zustand store and nothing else.
- Async work returns `Promise<T>` with explicit return types. No `async` functions without an explicit return type annotation.
- Do not introduce a dependency that is not already in the Tech Stack table of `Technical Architecture.md` without recording a Decision in `NOTES.md` and flagging it to Elena.

### 4.2 Naming

- Mathematical objects use mathematical names: `Vector`, `Matrix`, `LinearMap`, `Subspace`, `Basis`, `InnerProduct`. Not `Vec`, `Mat`, `Map` (collides with `Map<K,V>`). Aliases are fine in tight local scope but not in exported APIs.
- IDs are branded types: `type SpaceId = string & { __brand: 'SpaceId' }`. This catches accidental cross-typing of `SpaceId` and `MapId` at compile time.
- Functions that return exact-or-numerical results follow the contract in `Technical Architecture.md` §"Unified API" — return `{ exact: T | null; numerical: T }`, not a sum type.

### 4.3 File and folder layout

The repo layout will be established in Phase 0. The conventions there are binding once set; do not rearrange folders without recording a Decision and updating affected sub-PRDs.

### 4.4 Comments

Comment the *why*, not the *what*. The code says what it does; the comment exists for things the code cannot say — the mathematical content, the reason for an unusual choice, the link to a definition file in `LADR_Definitions/`. Cite Axler chapter/section numbers where it disambiguates a definition (e.g., `// Axler 3.69 — isomorphism`).

---

## 5. Testing standards

Testing is a tool, not a ritual. Write tests where they earn their keep:

- **Always test:** the mathematical invariants in Layer 0 (e.g., `dim(V/U) = dim(V) - dim(U)`, `rank(T) + null(T) = dim(domain)`); the exact-vs-numerical contract in Layer 1; the registry's applicability predicates in Layer 3; anything with a non-obvious algebraic property.
- **Test on encounter, not on schedule:** when a bug is found, the fix lands with a regression test. Bugs without tests recur.
- **Do not test the trivially-typed.** A test that just re-states a TypeScript signature in runtime form is noise.
- **Numerical tests use tolerances.** Prefer `expect(Math.abs(a - b)).toBeLessThan(1e-10)` over equality. Where exactness is the contract (Layer 1 symbolic track), assert on the symbolic representation, not its float approximation.
- **Property-based tests are encouraged for Layer 0 and Layer 1.** `fast-check` against the algebraic axioms (associativity, distributivity, etc.) catches more than hand-written examples. This is a recommendation, not a requirement, until performance becomes an issue.

Test runner choice will be set in Phase 0.

---

## 6. Note-taking conventions

The dev-notes are the project's persistent memory. Treat them with the same care as code.

### 6.1 `DEVLOG.md` — chronological session log

Append-only at the top (most recent first). One entry per work session, regardless of length.

```markdown
## YYYY-MM-DD — short session title

**Touched:** Layer 0 type system, src/types/Vector.ts
**Status:** in progress / complete / blocked on [thing]

What I did, in 2–6 sentences. Focus on outcomes, not narration.

**Notable:** [Anything a future agent should glance at this entry to learn — surprises, decisions made, things that almost broke.]

**Next:** [If incomplete: what the next agent should pick up. Be specific.]
```

A devlog entry should usually be short — under 20 lines. If it is long, it usually means you are recording things that belong in `NOTES.md` instead.

### 6.2 `NOTES.md` — durable structured knowledge

Three sections, each independently maintained:

**Decisions** — non-trivial architectural or implementation choices that the Technical Architecture document did not pre-specify. ADR-style: each entry numbered, dated, with **Context**, **Choice**, **Why**, **Implications**. Decisions are not deleted when superseded; they are marked `Superseded by ADR-NNN` and a new entry is added.

**Gotchas** — durable runtime, version, or environmental constraints that future work needs to respect. Each entry is short: the constraint, where it bites, and the workaround if any.

**Open Questions** — questions waiting on Elena's input or on information not yet available. Each carries a `[OPEN]` tag until resolved; on resolution it is replaced with the resolution and a date, or moved into Decisions if the answer was architecturally significant.

Templates and examples are in `dev-notes/NOTES.md`.

### 6.3 What does *not* go in dev-notes

- Code-level documentation: that goes in code comments or in a per-folder `README.md` if a folder needs orienting.
- Restating what's in the Technical Architecture or sub-PRDs: link, don't duplicate.
- Personal narrative ("I was confused for a while…"): irrelevant to the next agent.
- Progress brags: the devlog records outcomes, not effort.

---

## 7. Roadmap

The build proceeds bottom-up through the architectural layers, because each higher layer depends on the contracts of the ones below.

| Phase | Sub-PRD | Status |
|---|---|---|
| 0. Project scaffolding | `01 — Project Scaffolding.md` | Complete |
| 1. Layer 0 — Mathematical Type System | `02 — Layer 0 (Type System).md` | Not started |
| 2. Layer 1 — Computation Engine | `03 — Layer 1 (Computation Engine).md` | Not started |
| 3. Layer 2 — Session State | `04 — Layer 2 (Session State).md` | Not started |
| 4. Layer 3 — Visualization Registry | *PRD to be authored when Phase 4 begins* | Not started |
| 5. Layer 4 — Renderer Plugins | *PRD to be authored when Phase 5 begins* | Not started |
| 6. Layer 5 — Interaction Layer | *PRD to be authored when Phase 6 begins* | Not started |
| 7. Layer 6 — Pedagogy Layer | *PRD to be authored when Phase 7 begins* | Not started |

Sub-PRDs for Phases 4–7 are deliberately deferred. The contracts at those layers depend on what is learned building Layers 0–2; specifying them now would either lock in premature decisions or be ignored when the time comes. Each will be authored as a discrete piece of work when its phase begins, using the same structure as the foundational sub-PRDs.

Phases are not strictly serial — there is room to begin sketching Layer 3's registry mechanism while Layer 1 is being completed, for instance — but each phase's *acceptance criteria* should be met before its successors' acceptance criteria are evaluated.

When updating phase status, change the `Status` column here and add a corresponding devlog entry.

---

## 8. Cross-cutting conventions

These are conventions that span layers. They are stated here once so sub-PRDs can refer to them without restating.

### 8.1 Exact vs. numerical results

Per the architecture, every computation that *can* be exact returns an `{ exact, numerical }` pair, with `exact: null` when no exact result is computable. UI elements that consume these results must display provenance — they are not interchangeable. Do not silently coerce one to the other; if a renderer needs only one track, it picks explicitly.

### 8.2 Async conventions

- All Layer 1 computation engine calls are async. They may take seconds (Pyodide cold-start, Jordan form on a moderate matrix). Callers must handle pending state, not block the UI.
- The Pyodide worker is initialized once per session and reused. Initialization can be slow (~1–3s); do not initialize it lazily inside a render path.
- Cancellation: long-running computations should be cancellable via an `AbortSignal`. The unified API contract in `Technical Architecture.md` will be amended in Phase 2 to include this; until then, treat cancellation support as a Layer 1 acceptance requirement.

### 8.3 Errors

- Errors that originate in user input (parse failure, dimensional mismatch a user could fix) are surfaced as structured `UserFacingError` objects with a human-readable message and a machine-readable error code. They are not thrown — they are returned via the result type or a discriminated union with the success case.
- Errors that originate in invariant violations (a Layer 0 function received an object whose `kind` it claims to handle but whose internal state is invalid) are thrown — these are bugs, not user input problems, and silent recovery would mask them.

### 8.4 Mathematical conventions

- Vectors are columns. Matrix-vector product is `M·v`, not `v·M`. The architecture's `Matrix` type stores `entries[row][col]`. A vector with `n` components, when treated as a matrix, has shape `n × 1`.
- Bases are ordered tuples, not sets. `Basis.vectors[i]` is the i-th basis vector. Coordinate vectors are written with respect to a specific basis; switching bases changes the coordinate vector even though the abstract vector is unchanged. This is why basis is session-level state.
- Polynomials store coefficients in **ascending degree order**: `coefficients[i]` is the coefficient of `x^i`. (This convention is stated here to prevent the alternate convention from creeping in via SymPy interop, which uses descending order — converters at the SymPy boundary must reverse.)
- `ℝ` and `ℂ` in the codebase are `Field = 'R' | 'C'`. Do not introduce `'real'`, `'complex'`, or any other spelling.

---

## 9. PRD index (re-stated for quick lookup)

- `00 — Development Standards.md` — this file
- `01 — Project Scaffolding.md` — Phase 0
- `02 — Layer 0 (Type System).md` — Phase 1
- `03 — Layer 1 (Computation Engine).md` — Phase 2
- `04 — Layer 2 (Session State).md` — Phase 3
- (Sub-PRDs for Layers 3–6 will be added as their phases begin.)

dev-notes:

- `dev-notes/DEVLOG.md` — chronological session log
- `dev-notes/NOTES.md` — Decisions, Gotchas, Open Questions
