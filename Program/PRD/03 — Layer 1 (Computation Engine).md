# Phase 2 — Layer 1: Computation Engine

**Status:** Not started
**Master PRD:** `00 — Development Standards.md`
**Architecture references:** `Program/Technical Architecture.md` §"Layer 1: Computation Engine"
**Depends on:** Phase 1 complete (Layer 0 types must be stable)

---

## 1. Goal

Stand up the unified computation engine that Layers 2–6 will rely on. Two distinct backends — symbolic (Pyodide + SymPy in a Web Worker) and numerical (`ml-matrix`) — sit behind a single async API that returns `{ exact, numerical }` pairs.

Phase 2 produces the engine and a curated set of operations sufficient for the Layer 0 type system to be exercised meaningfully. It does **not** need to cover every operation listed in the architecture's "Unified API" sketch; it needs enough that Layer 2 (Session State) and a Layer 3 stub can be built on top.

---

## 2. Scope

### 2.1 Worker bootstrap

A persistent Pyodide worker initialized once per session.

- Worker entry at `src/compute/workers/sympy.worker.ts`, loaded via Vite's `?worker` syntax.
- Pyodide assets served from `public/pyodide/` (or via a CDN if Phase 2 chooses — record as Decision; CDN avoids bundling 10MB but introduces availability risk).
- Worker exposes a small message protocol (request/response with a `requestId` correlator). Use a typed channel (e.g., `comlink` or hand-rolled) — record the choice as a Decision.
- On first use, the worker imports SymPy. This is slow; the engine surfaces a `ready: Promise<void>` that consumers can await before issuing real calls.
- The worker holds a Python-side session dict mapping `string → SymPy object` so repeated operations on the same matrix do not re-serialize. The TS side mirrors that with a cache keyed by `MatrixId` (introduce this branded ID if needed).

### 2.2 Numerical track

`ml-matrix` calls run on the main thread for now. They are fast and synchronous internally; the async wrapping exists only to keep the unified API uniform. If profiling later shows blocking on large matrices (≳ 200×200), move ml-matrix to a second worker — that is a Phase 2 acceptance condition only if such matrices are actually exercised here, otherwise it is deferred and noted as a Gotcha.

### 2.3 Unified API surface

Phase 2 implements the following operations (subset of the architecture's full sketch). All are async, return `{ exact: T | null; numerical: T }` unless noted.

**Linear algebra over a chosen basis (matrix-level):**

- `eigendecompose(M: Matrix): Promise<{ exact: EigenResult | null; numerical: EigenResult }>`
- `nullSpace(M: Matrix): Promise<{ exact: Basis | null; numerical: Basis }>`
- `rank(M: Matrix): Promise<{ exact: number | null; numerical: number }>`
- `rref(M: Matrix): Promise<{ exact: Matrix | null; numerical: Matrix }>`
- `inverse(M: Matrix): Promise<{ exact: Matrix | null; numerical: Matrix } | { error: 'singular' }>`
- `determinant(M: Matrix): Promise<{ exact: Scalar | null; numerical: Scalar }>`

**Symbolic-only (no numerical fallback that is meaningful):**

- `minimalPoly(M: Matrix): Promise<Polynomial>`
- `characteristicPoly(M: Matrix): Promise<Polynomial>`
- `jordanForm(M: Matrix): Promise<JordanResult>` — `JordanResult = { J: Matrix; P: Matrix; blocks: JordanBlock[] }`

**Numerical-only (exactness not meaningful at this scale):**

- `svd(M: Matrix): Promise<SVDResult>` — `{ U: Matrix; S: Scalar[]; V: Matrix }`
- `qr(M: Matrix): Promise<QRResult>`

**Vector-level (exactness depends on inputs):**

- `gramSchmidt(vectors: Vector[], ip: InnerProduct): Promise<{ exact: Vector[] | null; numerical: Vector[] }>`
- `linearCombinationSolver(target: Vector, generators: Vector[]): Promise<{ exact: Scalar[] | null; numerical: Scalar[] | null }>` — returns `null` for both if no solution; coefficient vector when one exists.

**Linear-map-level (uses bases from session):**

- `matrixOf(map: LinearMap, domainBasis: Basis, codomainBasis: Basis): Promise<{ exact: Matrix | null; numerical: Matrix }>`
- `applyMap(map: LinearMap, v: Vector): Promise<{ exact: Vector | null; numerical: Vector }>`

Operations beyond this list are deferred to later phases. Record which deferrals hurt as Open Questions.

### 2.4 Provenance and error handling

Every result carries provenance. The `EigenResult`, `Basis`, etc., types extend Layer 0's types with a `provenance: 'exact' | 'numerical'` discriminator at the result level — *not* per-scalar, because mixed provenance inside a single `Vector[]` is too granular to be useful at the consumer level. Per-scalar exactness is already encoded in `Scalar.kind`.

Errors:

- Invariant violations from upstream (e.g., `eigendecompose` called on a non-square matrix) throw — this is a bug, not a user input issue.
- Domain errors (e.g., `inverse` of singular matrix, `nullSpace` over a field SymPy can't handle) return a discriminated error union, not a thrown error. Consumers handle these explicitly.
- Worker crashes: the worker has a watchdog that restarts it on crash and rejects all outstanding promises with a `WorkerCrashed` error. Phase 2 implements the rejection path; restart is a stretch goal — note as Open Question if not implemented.

### 2.5 Cancellation

Every async operation accepts an optional `AbortSignal`:

```typescript
eigendecompose(M: Matrix, opts?: { signal?: AbortSignal }): Promise<...>
```

On abort:

- Pending Pyodide calls: send a "cancel" message to the worker. SymPy operations are not interruptible mid-computation, so cancellation either takes effect at the next operation boundary or, in extreme cases, requires worker restart. Document this constraint as a Gotcha.
- ml-matrix calls: not realistically cancellable (synchronous). Cancellation rejects the promise without affecting in-flight computation.

Cancellation matters because Layer 5 will issue many speculative computations (slider drag, animation timeline) and they must not pile up.

### 2.6 Layer 0 ↔ SymPy bridge

The trickiest part of Phase 2. Layer 0's `Matrix` (with `Scalar` entries) must round-trip through Python.

- Build a serializer that maps `Scalar → SymPy expression` and back. Rationals → `sympy.Rational`. Algebraics → carry the minimal polynomial as a `sympy.AlgebraicNumber` or a structured tuple. Floats → Python floats with provenance preserved on return. Symbolic expressions → re-serialized via SymPy's `srepr` for stability across calls.
- Matrix marshaling uses a compact JSON shape (a 2D array of serialized scalars), not pickle.
- Verify round-trip identity: `deserialize(serialize(M)) === M` structurally. This is a Vitest test, not just a smoke check.
- The `SymExpr` opaque handle from Layer 0 stores the serialized form. Phase 2 has authority to revise the Layer 0 shape if needed; record as a Decision.

### 2.7 Performance expectations

Phase 2 is not a performance phase, but baseline expectations:

- First call after page load (cold Pyodide): under 5 seconds in development, ideally under 3.
- Subsequent calls on small (≤ 4×4) matrices: under 200ms total, with most of that being message-passing overhead.
- ml-matrix operations on small matrices: under 10ms.

If observed performance is dramatically worse, treat as a blocker on phase completion and record findings as Gotchas.

---

## 3. Tests

### 3.1 Correctness

- Every operation has tests against hand-computed examples on 2×2 and 3×3 matrices.
- Eigendecomposition is tested on a defective (non-diagonalizable) matrix to confirm that the exact track returns `null` for an eigenbasis where appropriate, while the numerical track still produces a result.
- Symbolic operations (minimal polynomial, Jordan form) are tested on cases where the answer is well-known (identity, diagonal, single Jordan block, two Jordan blocks of distinct sizes).

### 3.2 Provenance

- Tests assert that for rational-input matrices, the exact track is non-null.
- Tests assert that for float-input matrices, the exact track is null *and* the numerical track is non-null.
- Tests assert that mixed-input matrices follow a documented promotion rule (define this rule and record it as a Decision).

### 3.3 Cancellation

- A test that issues a long-running call and aborts it; the promise rejects with the abort error within a reasonable time bound.

### 3.4 Worker boundary

- Round-trip serialization tests for every `Scalar` kind.
- A test that re-uses a cached SymPy session object across calls and verifies the cache hit path doesn't double-serialize.

---

## 4. Acceptance criteria

Phase 2 is complete when:

1. The Pyodide worker initializes successfully on a fresh page load and the `engine.ready` promise resolves.
2. All operations in §2.3 are implemented with the signatures specified.
3. The exact/numerical pair contract is honored everywhere — no operation returns just one half of the pair where both are meaningful.
4. Cancellation works for at least the worker-side path; main-thread cancellation is documented even if it only rejects-without-cancelling.
5. The Layer 0 ↔ SymPy bridge has round-trip tests for every `Scalar` kind.
6. `pnpm verify` is green, including the new tests.
7. A small example file in `src/compute/__demo__/` (excluded from production build) exercises the engine end-to-end and prints results — this is the smoke test an agent runs after touching anything in this layer.
8. `Program/PRD/00 — Development Standards.md` §7 is updated.
9. A devlog entry is written; any Pyodide/Vite quirks are recorded as Gotchas.

---

## 5. Out of scope

- Operations not listed in §2.3 (tensor decompositions, generalized eigenspaces beyond what Jordan form gives, polar decomposition, etc.) — deferred to the phase that needs them.
- Anything UI-facing, including loading spinners and progress reporting. The engine surfaces enough state (`ready`, in-flight count) for the UI to build its own indicators in Phase 6.
- Persistence of computation results across sessions. Result caching is in-memory only.
- Switching ml-matrix to a worker (unless profiling shows it's needed within Phase 2's scope).

---

## 6. Open design questions

- **CDN vs. bundled Pyodide assets.** Tradeoff: bundle size vs. CDN availability. Decide and record.
- **Comlink vs. hand-rolled message protocol.** Comlink is ergonomic but adds a dependency and some opacity around the wire format. Hand-rolled is more code but more auditable. Decide and record.
- **Promotion rules for mixed-provenance scalar inputs.** What does the engine do when called with a matrix that is `rational` in some entries and `float` in others? Recommendation: degrade to numerical, mark provenance, but the symbolic track might still attempt exact computation by promoting floats to rationals via a rationalization heuristic. Decide and record.
- **Whether `applyMap` on a `formula`-kind LinearMap can return exact results.** A formula like `T(x, y) = (x + y, x - y)` *is* exact, but only if the input `Vector` is exact. The engine needs a clear rule. Recommendation: provenance = min-of-input-and-formula. Confirm.
- **`AlgebraicNumber` representation for `Scalar.algebraic`.** SymPy supports several encodings; pick one and document the consequences for Layer 0.

---

## 7. Risks

- **Pyodide cold-start UX.** A 2–5 second wait on first load is noticeable. The architecture treats this as acceptable for a tool of this scope, but Phase 2 should at least ensure the wait doesn't block UI rendering — i.e., the engine must initialize lazily off the critical render path. Verify this.
- **SymPy's idiosyncrasies.** SymPy occasionally returns unevaluated expressions where you expect a closed form. Tests must check for both closed-form and unevaluated cases and decide which counts as an exact result.
- **Worker debugging.** Stack traces from inside the worker are useless without a source-mapped logger. Set up worker-side error reporting that surfaces the original error message and (where available) Python traceback to the main thread.
- **Coupling between Layer 1 and Layer 0's `SymExpr`.** If Phase 2 finds that Layer 0's shape is wrong, *do not* paper over it. Revise Layer 0, update its tests, and record the change as a Decision.

---

## 8. Handoff to Phase 3

When Phase 2 is complete, the next agent should:

1. Read `04 — Layer 2 (Session State).md`.
2. Begin building the Zustand store in `src/state/`. The session store consumes Layer 1 results — it is the layer where in-flight engine calls become observable session state.
3. Treat Phase 2's API surface as stable but not frozen — adding operations is fine; changing existing signatures requires a Decision.
