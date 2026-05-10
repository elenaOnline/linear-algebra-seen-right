// Browser-only. Creates a comlink-wrapped Pyodide worker.
// In tests, inject a MockSymbolicAdapter instead.
import { wrap } from 'comlink';
import type { SymbolicAdapter } from './protocol.ts';
import type { SerializedScalar } from '../serialization/scalar.ts';

type RemoteWorker = {
  ready: Promise<void>;
  eigendecompose(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  nullSpace(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  rank(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  rref(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  determinant(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  inverse(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  characteristicPoly(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  minimalPoly(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  jordanForm(entries: unknown, signal?: AbortSignal): Promise<unknown>;
  gramSchmidt(vectors: unknown, signal?: AbortSignal): Promise<unknown>;
};

export function createPyodideAdapter(): SymbolicAdapter {
  const worker = new Worker(new URL('../workers/sympy.worker.ts', import.meta.url), {
    type: 'module',
  });

  const remote = wrap(worker) as unknown as RemoteWorker;

  return {
    ready: remote.ready,

    eigendecompose: (e, s) =>
      remote.eigendecompose(e, s) as ReturnType<SymbolicAdapter['eigendecompose']>,
    nullSpace: (e, s) => remote.nullSpace(e, s) as ReturnType<SymbolicAdapter['nullSpace']>,
    rank: (e, s) => remote.rank(e, s) as ReturnType<SymbolicAdapter['rank']>,
    rref: (e, s) => remote.rref(e, s) as ReturnType<SymbolicAdapter['rref']>,
    determinant: (e, s) => remote.determinant(e, s) as ReturnType<SymbolicAdapter['determinant']>,
    inverse: (e, s) => remote.inverse(e, s) as ReturnType<SymbolicAdapter['inverse']>,
    characteristicPoly: (e, s) =>
      remote.characteristicPoly(e, s) as ReturnType<SymbolicAdapter['characteristicPoly']>,
    minimalPoly: (e, s) => remote.minimalPoly(e, s) as ReturnType<SymbolicAdapter['minimalPoly']>,
    jordanForm: (e, s) => remote.jordanForm(e, s) as ReturnType<SymbolicAdapter['jordanForm']>,
    gramSchmidt: (v: readonly (readonly SerializedScalar[])[], s?: AbortSignal) =>
      remote.gramSchmidt(v, s) as ReturnType<SymbolicAdapter['gramSchmidt']>,
  };
}
