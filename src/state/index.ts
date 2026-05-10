// Layer 2: Session State
//
// Contract for downstream consumers (Layers 3+):
//   - The store shape is MathSession + all action functions.
//   - Actions are the only way state changes. Never mutate store values directly.
//   - Computation lifecycle actions (start/complete/fail/cancel) do NOT push undo history.
//   - Undo/redo operates on the snapshot-able slice of state (objects + naming + bases + field).
//   - SessionView implementations are in session-view.ts; pass them to Layer 0/1 functions.
//   - Zero imports from Layer 3 or above.

export type {
  MathObjectRef,
  ViewKind,
  ViewId,
  View,
  ComputationId,
  ComputationKey,
  ComputationDescriptor,
  ComputationStatus,
  CachedResult,
  SessionSnapshot,
  MathSession,
} from './types.ts';

export {
  mkComputationId,
  mkViewId,
  _resetStateCounters,
  INITIAL_SESSION,
  MAX_HISTORY,
  MAX_CACHE,
} from './types.ts';

export type { MathStore, MathStoreApi } from './store.ts';
export { createMathStore, defaultStore } from './store.ts';

export {
  getSpace,
  getSubspace,
  getMap,
  getVector,
  getBasis,
  getNamed,
  getActiveBasis,
  dimOf,
  getCachedResult,
  pendingCount,
  findFnSpace,
} from './selectors.ts';

export { StoreSessionView, sessionViewFrom } from './session-view.ts';

export type { SerializedSession } from './serialization.ts';
export { serialize, deserialize } from './serialization.ts';
