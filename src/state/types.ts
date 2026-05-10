import type {
  Field,
  SpaceId,
  SubspaceId,
  MapId,
  VectorId,
  BasisId,
  IPId,
  VectorSpace,
  Subspace,
  LinearMap,
  Vector,
  Basis,
  InnerProduct,
} from '../types/index.ts';

// --- Named-object reference ---
// The user thinks in names ("T", "V", "v₁"); the store thinks in IDs.
export type MathObjectRef =
  | { readonly kind: 'space'; readonly id: SpaceId }
  | { readonly kind: 'subspace'; readonly id: SubspaceId }
  | { readonly kind: 'map'; readonly id: MapId }
  | { readonly kind: 'vector'; readonly id: VectorId }
  | { readonly kind: 'basis'; readonly id: BasisId }
  | { readonly kind: 'innerProduct'; readonly id: IPId };

// --- Views ---
export type ViewKind =
  | 'geometric_3d'
  | 'geometric_2d'
  | 'diagram'
  | 'matrix'
  | 'symbolic'
  | 'chart';

export type ViewId = string & { readonly __brand: 'ViewId' };

export type View = {
  readonly id: ViewId;
  readonly kind: ViewKind;
  readonly objectRef: MathObjectRef;
  readonly props: Record<string, unknown>;
};

// --- Computation lifecycle ---
export type ComputationId = string & { readonly __brand: 'ComputationId' };

// Content-addressed cache key: operation name + hash of serialized inputs.
export type ComputationKey = string;

export type ComputationStatus = 'pending' | 'complete' | 'failed' | 'cancelled';

export type ComputationDescriptor = {
  readonly id: ComputationId;
  readonly key: ComputationKey;
  readonly operation: string;
  readonly status: ComputationStatus;
  readonly startedAt: number;
  readonly error?: string;
};

export type CachedResult = {
  readonly key: ComputationKey;
  readonly result: unknown;
  readonly cachedAt: number;
};

// --- ID factories ---

let _computationCounter = 0;
let _viewCounter = 0;

export function mkComputationId(): ComputationId {
  return `comp:${++_computationCounter}` as ComputationId;
}

export function mkViewId(): ViewId {
  return `view:${++_viewCounter}` as ViewId;
}

export function _resetStateCounters(): void {
  _computationCounter = 0;
  _viewCounter = 0;
}

// --- Session snapshot ---
// The slice of state that undo/redo captures and restores.
// Does NOT include: pendingComputations, computationCache, views, history meta.
export type SessionSnapshot = {
  field: Field;
  spaces: Record<string, VectorSpace>;
  subspaces: Record<string, Subspace>;
  maps: Record<string, LinearMap>;
  vectors: Record<string, Vector>;
  bases: Record<string, Basis>;
  innerProducts: Record<string, InnerProduct>;
  // SpaceId string → BasisId string (avoids branded-ID issues in plain records)
  selectedBasis: Record<string, string>;
  namedObjects: Record<string, MathObjectRef>;
};

// --- Full session state ---
// Extends the snapshot with async state and history.
export type MathSession = SessionSnapshot & {
  pendingComputations: Record<string, ComputationDescriptor>;
  // Content-addressed cache, max 256 entries (evict oldest by cachedAt).
  computationCache: Record<ComputationKey, CachedResult>;
  views: View[];
  history: SessionSnapshot[];
  historyCursor: number;
};

export const INITIAL_SESSION: MathSession = {
  field: 'R',
  spaces: {},
  subspaces: {},
  maps: {},
  vectors: {},
  bases: {},
  innerProducts: {},
  selectedBasis: {},
  namedObjects: {},
  pendingComputations: {},
  computationCache: {},
  views: [],
  history: [
    {
      field: 'R',
      spaces: {},
      subspaces: {},
      maps: {},
      vectors: {},
      bases: {},
      innerProducts: {},
      selectedBasis: {},
      namedObjects: {},
    },
  ],
  historyCursor: 0,
};

export const MAX_HISTORY = 100;
export const MAX_CACHE = 256;
