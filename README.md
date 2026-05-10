# LADR Visualizer

An interactive web sandbox built around Sheldon Axler's *Linear Algebra Done Right*. The goal is an environment in which the full conceptual arc of the book — from the definition of a vector space through spectral theory, singular value decomposition, and tensor products — can be explored, manipulated, and examined from multiple levels of abstraction simultaneously. Objects are user-defined (not pre-scripted); the interface is a mathematical sandbox, not a slide presentation.

For working standards, architecture, and the agent onboarding flow, see [`Program/PRD/00 — Development Standards.md`](Program/PRD/00%20—%20Development%20Standards.md).

## Commands

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start development server |
| `pnpm build` | Type-check and build for production |
| `pnpm typecheck` | Type-check without building |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm verify` | Run all gates: typecheck → lint → format:check → test |
