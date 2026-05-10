# Phase 0 — Project Scaffolding

**Status:** Complete
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Tech Stack"

---

## 1. Goal

Bring the repository from empty to *ready for Layer 0 work*. Phase 0 is intentionally narrow: it does not produce any mathematical types, any computation, or any UI beyond a placeholder. Its single deliverable is a project skeleton that an agent picking up Layer 0 can begin coding in immediately, with no setup overhead.

The phase is complete when an agent can run a single command and get: typechecking, linting, formatting check, and test runner all passing on a placeholder source tree.

---

## 2. Deliverables

### 2.1 Repository initialization

- A git repository at the project root.
- A `.gitignore` covering `node_modules/`, build output, `.DS_Store`, IDE folders, and any local-only environment files.
- A `README.md` containing only: project name, one-paragraph summary copied (not paraphrased) from `Project Overview.md`, link to `Program/PRD/00 — Development Standards.md`, and the run/build/test commands. Keep it short — the README is for someone who has already read the architecture.

### 2.2 Toolchain

| Tool | Choice | Required configuration |
|---|---|---|
| Package manager | `pnpm` | `pnpm-lock.yaml` committed |
| Node version | LTS (≥20) pinned via `.nvmrc` and `engines` field | |
| Build / dev server | Vite | React + TypeScript template |
| TypeScript | latest stable | `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` |
| Linter | ESLint with `@typescript-eslint` | Error on `no-explicit-any`, `no-unused-vars`, `no-floating-promises`, `consistent-type-imports` |
| Formatter | Prettier | Default config except `printWidth: 100`, `singleQuote: true` |
| Test runner | Vitest | Co-located `*.test.ts` files; jsdom environment available but not default |
| Property testing | `fast-check` | Installed, no usage required yet |

If any of these choices conflicts with something Elena has stated previously, surface it as an Open Question in `dev-notes/NOTES.md` rather than silently substituting.

### 2.3 Folder layout

```
src/
  types/          # Layer 0 — mathematical type system (lives here from Phase 1)
  compute/        # Layer 1 — computation engine
    workers/      # Pyodide worker entry points
  state/          # Layer 2 — Zustand store
  registry/       # Layer 3 — visualization registry
  renderers/      # Layer 4 — renderer plugins (one folder per renderer)
  interaction/    # Layer 5 — interaction layer
  pedagogy/       # Layer 6 — pedagogy layer
  ui/             # cross-cutting React shell, layout, view manager
  lib/            # genuinely cross-cutting utilities (math/exact-arithmetic, parsers, etc.)
  app.tsx         # root component
  main.tsx        # entry point
public/
  pyodide/        # Pyodide assets — populated in Phase 2, empty placeholder for now
test/
  setup.ts        # vitest setup file
```

Phase 0 creates these directories (with a `.gitkeep` where empty) and a placeholder `app.tsx` that renders a single line of text confirming the build works. No other source files.

### 2.4 Scripts in `package.json`

At minimum:

- `dev` — `vite`
- `build` — `tsc -p . && vite build`
- `typecheck` — `tsc -p . --noEmit`
- `lint` — `eslint .`
- `format` — `prettier --write .`
- `format:check` — `prettier --check .`
- `test` — `vitest run`
- `test:watch` — `vitest`
- `verify` — runs `typecheck`, `lint`, `format:check`, and `test` in sequence; this is the gate for any commit

### 2.5 Continuous integration

A single GitHub Actions workflow (or equivalent if Elena prefers another host — record the choice as a Decision in `NOTES.md`) that runs `pnpm install --frozen-lockfile && pnpm verify` on push and PR. No deployment, no caching beyond the default. CI is a safety net here, not a release pipeline.

### 2.6 Editor configuration

An `.editorconfig` matching Prettier settings, and a `.vscode/settings.json` recommending the ESLint and Prettier extensions and enabling format-on-save. These are conveniences, not requirements; do not gate work on them.

---

## 3. Acceptance criteria

Phase 0 is complete when **all** of the following hold:

1. `pnpm install` succeeds on a fresh clone with no warnings beyond Vite's standard output.
2. `pnpm verify` exits zero. This means: typecheck passes, lint passes, format check passes, no failing tests (zero tests is acceptable here — the placeholder source has nothing to test).
3. `pnpm dev` serves a page that renders the placeholder text and hot-reloads on edit.
4. `pnpm build` produces a built bundle in `dist/` and exits zero.
5. CI runs `pnpm verify` on push and reports green.
6. The folder structure in §2.3 exists, with `.gitkeep` files where appropriate so empty directories are committed.
7. `Program/PRD/00 — Development Standards.md` §7 (Roadmap) is updated to mark Phase 0 as `Complete`.
8. A devlog entry is written summarizing the phase.

A phase is not complete just because individual deliverables landed. The whole acceptance set must hold simultaneously on a clean checkout.

---

## 4. Out of scope for Phase 0

- Any mathematical type definitions. These are Layer 0 / Phase 1.
- Any computation engine code, including Pyodide loading. The `public/pyodide/` directory is created empty.
- Any UI beyond the placeholder. View management, layouts, and routing belong to Phase 6 (Interaction Layer) or later.
- Storybook, end-to-end test harnesses, visual regression testing. These are likely useful eventually but are not gating.
- Tailwind / styling system selection. Defer; record any opinion as an Open Question.

If you find yourself wanting to add something Phase 0 does not list, ask whether it is genuinely required to *start* Layer 0. If not, defer it and record the deferral in `NOTES.md`.

---

## 5. Known risks and likely gotchas

- **Pyodide and Vite interaction.** Pyodide ships large WASM and Python stdlib assets. Phase 0 only creates the empty asset directory, but be aware: when Phase 2 begins, Vite's asset handling for Pyodide is a known sharp edge (the Pyodide team's recommended approach has shifted across recent versions). Do not preconfigure Vite for Pyodide in Phase 0; leave that decision to Phase 2 when the actual integration is in front of the agent.
- **Web Worker bundling.** Vite supports workers via `?worker` imports, but the syntax has gotchas around shared module graphs. Again, defer.
- **Strict TypeScript with React.** `noUncheckedIndexedAccess` interacts awkwardly with some React patterns (array `.map` with index access). Resolve case-by-case in higher phases; Phase 0 only needs the placeholder to typecheck.

These are flagged here so the agent doing Phase 0 doesn't over-configure Vite for problems that haven't arrived yet.

---

## 6. Open questions

- Hosting target for CI (GitHub Actions assumed; confirm or substitute).
- Eventual deployment target — static host (Cloudflare Pages, Vercel, GitHub Pages)? Decision can be deferred but note that Pyodide's asset size makes the choice non-trivial. Surface as an Open Question in `NOTES.md` if it becomes blocking.

---

## 7. Handoff to Phase 1

When Phase 0 is complete, the next agent should:

1. Read `02 — Layer 0 (Type System).md`.
2. Begin defining types in `src/types/`. The architecture's TypeScript sketches are the starting point but not the final form — expect to iterate.
3. Set up Vitest test files alongside types as they land.
