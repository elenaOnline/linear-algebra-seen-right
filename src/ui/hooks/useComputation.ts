import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../../state/index.ts';
import type { ComputationKey } from '../../state/types.ts';

type UseComputationResult<T> =
  | { status: 'pending' }
  | { status: 'success'; result: T }
  | { status: 'error'; message: string };

// Checks the session computationCache for `key`. If present, returns the cached result.
// If absent, calls `compute()` to fire the operation; `compute` is only called once per
// key (subsequent renders are no-ops while in-flight). When done, writes via `cacheResult`.
//
// Per ADR-012: this hook is the *only* place renderer-adjacent code triggers engine calls.
// It lives in src/ui/hooks/ so renderers themselves remain pure prop consumers.
export function useComputation<T>(
  key: ComputationKey | null,
  compute: () => Promise<T>,
): UseComputationResult<T> {
  const cached = useStore(defaultStore, (s) =>
    key !== null ? s.computationCache[key] : undefined,
  );

  // Stable refs so the effect doesn't re-fire when `compute` function identity changes.
  const computeRef = useRef(compute);
  computeRef.current = compute;

  // Track whether a compute is in-flight for this key to avoid duplicate calls.
  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (key === null || cached !== undefined) return;
    if (inFlightRef.current === key) return;

    inFlightRef.current = key;
    let cancelled = false;

    computeRef
      .current()
      .then((result) => {
        if (!cancelled) {
          defaultStore.getState().cacheResult(key, result);
        }
      })
      .catch(() => {
        // Errors are silent for now; the view stays in LoadingState.
        // Phase 6 should surface engine errors to the user.
      })
      .finally(() => {
        if (!cancelled) inFlightRef.current = null;
      });

    return () => {
      cancelled = true;
      inFlightRef.current = null;
    };
  }, [key, cached]);

  if (key === null) return { status: 'pending' };
  if (cached === undefined) return { status: 'pending' };
  return { status: 'success', result: cached.result as T };
}
