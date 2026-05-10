# DEVLOG

Chronological session log. Most recent entry at the top. One entry per work session.

See `PRD/00 — Development Standards.md` §6.1 for the entry format. Brief reproduction:

```markdown
## YYYY-MM-DD — short session title

**Touched:** [layers, files, or "PRD set" / "dev-notes"]
**Status:** in progress / complete / blocked on [thing]

What I did, in 2–6 sentences. Outcomes, not narration.

**Notable:** [Surprises, decisions made, things that almost broke. Optional.]

**Next:** [If incomplete: what the next agent should pick up. Be specific.]
```

A devlog entry should usually be under 20 lines. If it's longer, the excess probably belongs in `NOTES.md`.

---

## 2026-05-10 — Phase 3: Layer 2 Session State

**Touched:** `src/state/` (all files), `eslint.config.js` (Layer 2 boundary rule), `package.json` (zustand, immer), `PRD/00`, `PRD/04`, `NOTES.md`
**Status:** complete

Built the Zustand 5 vanilla store with Immer 11 middleware. Full `MathSession` shape per PRD §2.1. All 17 actions implemented (object creation, naming, basis selection, field, computation lifecycle, views, undo/redo). Selectors in `selectors.ts`; `SessionView` interface implemented in `session-view.ts` wrapping a snapshot. `serialization.ts` documents the intended shape with stub functions (`xtest`'d in selectors.test.ts). 175 tests passing.

**Notable:** Zustand 5's `createStore` moved to `zustand/vanilla` (not `zustand`). `castDraft()` from Immer is the correct way to assign readonly Layer 0 types (with `readonly` arrays in discriminated union variants) into Immer Draft slots — `as Draft<T>` casts fail ESLint's `no-unnecessary-type-assertion` rule even when TypeScript needs them; `castDraft` is the idiomatic workaround. The `setActiveBasis` and `setField` idempotency guards (skip history push if no change) interact with tests — test must use genuinely different values to verify redo-branch invalidation.

**Next:** Phase 4 — Layer 3 Visualization Registry. Re-read `Technical Architecture.md` §"Layer 3". Author `PRD/05 — Layer 3 (Visualization Registry).md` before implementing. Check `src/types/` and `src/state/` actual shapes for any deltas from the architecture sketches.

---

## 2026-05-10 — Phase 2: Layer 1 Computation Engine

**Touched:** `src/compute/` (all files), `eslint.config.js` (__demo__ ignore), `package.json` (ml-matrix, comlink, fraction.js re-added), `PRD/00`, `PRD/03`, `NOTES.md`
**Status:** complete

Implemented the unified computation engine with SymbolicAdapter interface + Pyodide worker (CDN, comlink) + ml-matrix numerical adapter. All 15 operations from PRD §2.3 implemented. Layer 0 ↔ SymPy bridge with round-trip serialization for all Scalar kinds. Promotion rule: any float entry → `numerical_only` (no symbolic attempt). Cancellation via AbortSignal threaded through to adapter. MockSymbolicAdapter enables full Vitest coverage without a browser. 132 tests passing.

**Notable:** `LuDecomposition` has a `.determinant` property — use it directly rather than computing from U diagonal (my first attempt was wrong — sign from permutation isn't trivially accessible). `SingularValueDecomposition` uses `.leftSingularVectors`/`.rightSingularVectors` in TypeScript types but `.U`/`.V` at runtime; the TypeScript names are canonical. QR decomposition may return sign-flipped Q columns — tests must use `|diagonal| = 1` not `diagonal = 1`. Fraction.js got dropped from `package.json` (unclear why — Prettier reformatting dropped it silently); re-added in this phase.

**Next:** Phase 3 — Layer 2 Session State. Read `PRD/04 — Layer 2 (Session State).md`. Begin in `src/state/` with the Zustand store.

---

## 2026-05-10 — Phase 1: Layer 0 Mathematical Type System

**Touched:** `src/types/` (all files), `eslint.config.js` (layer boundary rule), `package.json` (added `fraction.js`), `PRD/00`, `PRD/02`, `NOTES.md`
**Status:** complete

Defined the full mathematical type system in `src/types/`: `Scalar` (rational/algebraic/complex/symbolic/float), `Polynomial`, `SymExpr`, `Vector` (4 variants), `VectorSpace` (8 variants), `Subspace`, `LinearMap`, `Basis`, `Matrix`, `InnerProduct`, branded IDs, `SessionView` interface, `Result` type, and factory/accessor functions for all. Fraction.js powers exact rational arithmetic. All 79 tests pass: algebraic property tests (commutativity, associativity, distributivity, inverses), dimension calculus properties (dim(V×W), dim(V⊗W), dim(V*)), factory validation, ID snapshot tests, matrix invariants.

**Notable:** Fraction.js v5 constructor overloads are stricter than v4 — string and number forms use separate overloads, so `rational(n)` and `rationalFromString(s)` are split. Added ADR-004 through ADR-007 for the four design questions posed in PRD §7. Layer boundary ESLint rule added (`no-restricted-imports` for `src/types/**/*.ts`).

**Next:** Phase 2 — Layer 1 Computation Engine. Read `PRD/03 — Layer 1 (Computation Engine).md`. Begin with Pyodide worker bootstrap in `src/compute/workers/`.

---

## 2026-05-10 — Phase 0: Project Scaffolding

**Touched:** `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.editorconfig`, `.vscode/settings.json`, `index.html`, `src/` placeholder tree, `test/setup.ts`, `test/scaffold.test.ts`, `README.md`, `.github/workflows/verify.yml`, `PRD/00`, `PRD/01`
**Status:** complete

Initialized git repo on `main` and built the full project skeleton. All four `pnpm verify` gates pass (typecheck, lint, format:check, test). `pnpm build` produces `dist/` cleanly. CI workflow runs on push/PR via GitHub Actions (ADR-001). Netlify is the deployment target (ADR-002) — no Netlify config needed yet.

**Notable:** Added `skipLibCheck: true` and `@types/node` to resolve type errors in Vite/Vitest's own `.d.ts` files — these are not generated by our code and are not a signal to relax strict settings. Also added `pnpm.onlyBuiltDependencies: ["esbuild"]` to satisfy pnpm 11's new default of blocking post-install scripts. Placeholder text "Spanning." follows ADR-003 tonal register from first commit.

**Next:** Phase 1 — Layer 0 Mathematical Type System. Read `PRD/02 — Layer 0 (Type System).md`. Begin in `src/types/`.

---

## 2026-05-09 — PRD set authored

**Touched:** PRD set, dev-notes scaffolding
**Status:** complete

Created the master PRD (`00 — Development Standards.md`) and sub-PRDs for the foundational phases: scaffolding (`01`), Layer 0 type system (`02`), Layer 1 computation engine (`03`), Layer 2 session state (`04`). Sub-PRDs for Layers 3–6 deferred until their phases begin, with placeholders in the master PRD's roadmap. Authored these dev-notes templates with usage instructions.

**Notable:** Master PRD §3.2 makes the closing flow non-negotiable — every session must end with a devlog entry, plus promotion of any durable findings into `NOTES.md`. Master PRD §8.4 fixes a small set of mathematical conventions (column vectors, ascending-degree polynomials, `'R' | 'C'` field spelling) explicitly because these are the kinds of details that drift if not pinned.

**Next:** Phase 0 (Project Scaffolding) — see `PRD/01 — Project Scaffolding.md`.
