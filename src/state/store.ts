import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { castDraft } from 'immer';
import type { Draft } from 'immer';
import type {
  Field,
  SpaceId,
  BasisId,
  VectorId,
  MapId,
  VectorSpace,
  Subspace,
  LinearMap,
  Vector,
  Basis,
  InnerProduct,
} from '../types/index.ts';

import type {
  MathSession,
  SessionSnapshot,
  MathObjectRef,
  ViewKind,
  ViewId,
  View,
  ComputationId,
  ComputationKey,
  ComputationDescriptor,
  CachedResult,
} from './types.ts';
import { INITIAL_SESSION, MAX_HISTORY, MAX_CACHE, mkComputationId, mkViewId } from './types.ts';
import { recomputeDerived } from './derivation.ts';

export type MathStore = MathSession & {
  addSpace: (space: VectorSpace) => void;
  addSubspace: (subspace: Subspace) => void;
  addMap: (map: LinearMap) => void;
  addVector: (vector: Vector) => void;
  updateVector: (vector: Vector) => void;
  addBasis: (basis: Basis) => void;
  addInnerProduct: (ip: InnerProduct) => void;

  nameObject: (name: string, ref: MathObjectRef) => void;
  unname: (name: string) => void;

  setActiveBasis: (spaceId: SpaceId, basisId: BasisId) => void;
  setField: (field: Field) => void;

  // Computation lifecycle — does NOT push undo history.
  startComputation: (desc: { key: ComputationKey; operation: string }) => ComputationId;
  completeComputation: (id: ComputationId) => void;
  failComputation: (id: ComputationId, error: string) => void;
  cancelComputation: (id: ComputationId) => void;
  cacheResult: (key: ComputationKey, result: unknown) => void;

  openView: (kind: ViewKind, ref: MathObjectRef, props?: Record<string, unknown>) => ViewId;
  closeView: (id: ViewId) => void;
  setViewProps: (id: ViewId, props: Record<string, unknown>) => void;

  removeVector: (id: VectorId) => void;
  removeMap: (id: MapId) => void;
  removeSpace: (id: SpaceId) => void;

  undo: () => void;
  redo: () => void;

  // Reset all mathematical objects and views to a clean state (ADR-017).
  resetSession: () => void;

  // Apply a scene build atomically — resets the session and adds all objects in
  // one Immer transaction, avoiding any intermediate states that could cause
  // React to see a half-populated session during re-renders.
  applyScene: (build: {
    spaces: readonly VectorSpace[];
    bases: readonly Basis[];
    vectors: readonly Vector[];
    maps: readonly LinearMap[];
    namedObjects: readonly { name: string; ref: MathObjectRef }[];
    views: readonly { kind: ViewKind; objectId: string; refKind: MathObjectRef['kind'] }[];
  }) => void;
};

// --- History helpers ---

function captureSnapshot(draft: Draft<MathStore>): SessionSnapshot {
  return {
    field: draft.field,
    spaces: { ...draft.spaces },
    subspaces: { ...draft.subspaces },
    maps: { ...draft.maps },
    vectors: { ...draft.vectors },
    bases: { ...draft.bases },
    innerProducts: { ...draft.innerProducts },
    selectedBasis: { ...draft.selectedBasis },
    namedObjects: { ...draft.namedObjects },
  };
}

// Replace the snapshot-able slice of the draft with a stored snapshot.
// `castDraft` is Immer's official helper for assigning readonly types into Draft slots.
function applySnapshot(draft: Draft<MathStore>, snap: SessionSnapshot): void {
  draft.field = snap.field;
  draft.spaces = castDraft(snap.spaces);
  draft.subspaces = castDraft(snap.subspaces);
  draft.maps = castDraft(snap.maps);
  draft.vectors = castDraft(snap.vectors);
  draft.bases = castDraft(snap.bases);
  draft.innerProducts = castDraft(snap.innerProducts);
  draft.selectedBasis = castDraft(snap.selectedBasis);
  draft.namedObjects = castDraft(snap.namedObjects);
}

function pushSnapshot(draft: Draft<MathStore>): void {
  const snap = captureSnapshot(draft);
  // Drop redo branch
  draft.history.length = draft.historyCursor + 1;
  draft.history.push(castDraft(snap));
  if (draft.history.length > MAX_HISTORY) {
    draft.history.shift();
  }
  draft.historyCursor = draft.history.length - 1;
}

// --- Cache helpers ---

function addToCache(draft: Draft<MathStore>, key: ComputationKey, result: unknown): void {
  draft.computationCache[key] = castDraft<CachedResult>({ key, result, cachedAt: Date.now() });
  const keys = Object.keys(draft.computationCache);
  if (keys.length > MAX_CACHE) {
    const oldest = keys
      .map((k) => ({
        k,
        t: (draft.computationCache[k] as CachedResult | undefined)?.cachedAt ?? 0,
      }))
      .sort((a, b) => a.t - b.t)
      .slice(0, keys.length - MAX_CACHE);
    for (const { k } of oldest) {
      delete draft.computationCache[k];
    }
  }
}

// --- Store factory ---
// Returns a Zustand vanilla store (no React bindings).
// Tests create fresh instances via createMathStore(); the app uses defaultStore.

export function createMathStore(): StoreApi<MathStore> {
  return createStore<MathStore>()(
    immer((set) => ({
      ...INITIAL_SESSION,

      addSpace: (space) =>
        set((draft) => {
          draft.spaces[space.id] = castDraft(space);
          pushSnapshot(draft);
        }),

      addSubspace: (subspace) =>
        set((draft) => {
          draft.subspaces[subspace.id] = castDraft(subspace);
          pushSnapshot(draft);
        }),

      addMap: (map) =>
        set((draft) => {
          draft.maps[map.id] = castDraft(map);
          recomputeDerived(draft);
          pushSnapshot(draft);
        }),

      addVector: (vector) =>
        set((draft) => {
          draft.vectors[vector.id] = castDraft(vector);
          recomputeDerived(draft);
          pushSnapshot(draft);
        }),

      // Does NOT push undo history — drag updates fire at ~60fps and would saturate the stack.
      updateVector: (vector) =>
        set((draft) => {
          draft.vectors[vector.id] = castDraft(vector);
          recomputeDerived(draft);
          // Invalidate any cached computations that depended on this vector.
          draft.computationCache = {};
        }),

      addBasis: (basis) =>
        set((draft) => {
          draft.bases[basis.id] = castDraft(basis);
          pushSnapshot(draft);
        }),

      addInnerProduct: (ip) =>
        set((draft) => {
          draft.innerProducts[ip.id] = castDraft(ip);
          pushSnapshot(draft);
        }),

      nameObject: (name, ref) =>
        set((draft) => {
          draft.namedObjects[name] = castDraft(ref);
          pushSnapshot(draft);
        }),

      unname: (name) =>
        set((draft) => {
          delete draft.namedObjects[name];
          pushSnapshot(draft);
        }),

      setActiveBasis: (spaceId, basisId) =>
        set((draft) => {
          if (draft.selectedBasis[spaceId] === basisId) return;
          draft.selectedBasis[spaceId] = basisId;
          pushSnapshot(draft);
        }),

      setField: (field) =>
        set((draft) => {
          if (draft.field === field) return;
          draft.field = field;
          pushSnapshot(draft);
        }),

      startComputation: ({ key, operation }) => {
        const id = mkComputationId();
        set((draft) => {
          draft.pendingComputations[id] = castDraft<ComputationDescriptor>({
            id,
            key,
            operation,
            status: 'pending',
            startedAt: Date.now(),
          });
        });
        return id;
      },

      completeComputation: (id) =>
        set((draft) => {
          delete draft.pendingComputations[id];
        }),

      failComputation: (id, error) =>
        set((draft) => {
          const desc = draft.pendingComputations[id] as ComputationDescriptor | undefined;
          if (desc) {
            draft.pendingComputations[id] = castDraft<ComputationDescriptor>({
              ...desc,
              status: 'failed',
              error,
            });
          }
        }),

      cancelComputation: (id) =>
        set((draft) => {
          delete draft.pendingComputations[id];
        }),

      cacheResult: (key, result) =>
        set((draft) => {
          addToCache(draft, key, result);
        }),

      openView: (kind, ref, props = {}) => {
        const id = mkViewId();
        set((draft) => {
          draft.views.push(castDraft<View>({ id, kind, objectRef: ref, props }));
        });
        return id;
      },

      closeView: (id) =>
        set((draft) => {
          draft.views = draft.views.filter((v) => v.id !== id);
        }),

      setViewProps: (id, props) =>
        set((draft) => {
          const view = draft.views.find((v) => v.id === id);
          if (view) {
            (view as { props: Record<string, unknown> }).props = props;
          }
        }),

      removeVector: (id) =>
        set((draft) => {
          delete draft.vectors[id];
          for (const name of Object.keys(draft.namedObjects)) {
            if (draft.namedObjects[name]?.kind === 'vector' && draft.namedObjects[name]?.id === id)
              delete draft.namedObjects[name];
          }
          draft.views = draft.views.filter(
            (v) => !(v.objectRef.kind === 'vector' && v.objectRef.id === id),
          );
          draft.computationCache = {};
          pushSnapshot(draft);
        }),

      removeMap: (id) =>
        set((draft) => {
          delete draft.maps[id];
          for (const name of Object.keys(draft.namedObjects)) {
            if (draft.namedObjects[name]?.kind === 'map' && draft.namedObjects[name]?.id === id)
              delete draft.namedObjects[name];
          }
          draft.views = draft.views.filter(
            (v) => !(v.objectRef.kind === 'map' && v.objectRef.id === id),
          );
          draft.computationCache = {};
          pushSnapshot(draft);
        }),

      removeSpace: (id) =>
        set((draft) => {
          delete draft.spaces[id];
          for (const name of Object.keys(draft.namedObjects)) {
            if (draft.namedObjects[name]?.kind === 'space' && draft.namedObjects[name]?.id === id)
              delete draft.namedObjects[name];
          }
          draft.views = draft.views.filter(
            (v) => !(v.objectRef.kind === 'space' && v.objectRef.id === id),
          );
          // Cascade: remove vectors and maps that reference this space
          for (const vid of Object.keys(draft.vectors)) {
            const v = draft.vectors[vid];
            if (v && 'space' in v && v.space === id) {
              delete draft.vectors[vid];
              for (const name of Object.keys(draft.namedObjects)) {
                if (
                  draft.namedObjects[name]?.kind === 'vector' &&
                  draft.namedObjects[name]?.id === vid
                )
                  delete draft.namedObjects[name];
              }
              draft.views = draft.views.filter(
                (view) => !(view.objectRef.kind === 'vector' && view.objectRef.id === vid),
              );
            }
          }
          for (const mid of Object.keys(draft.maps)) {
            const m = draft.maps[mid];
            if (m && (m.domain === id || m.codomain === id)) {
              delete draft.maps[mid];
              for (const name of Object.keys(draft.namedObjects)) {
                if (
                  draft.namedObjects[name]?.kind === 'map' &&
                  draft.namedObjects[name]?.id === mid
                )
                  delete draft.namedObjects[name];
              }
              draft.views = draft.views.filter(
                (view) => !(view.objectRef.kind === 'map' && view.objectRef.id === mid),
              );
            }
          }
          draft.computationCache = {};
          pushSnapshot(draft);
        }),

      undo: () =>
        set((draft) => {
          if (draft.historyCursor <= 0) return;
          draft.historyCursor -= 1;
          const snap = draft.history[draft.historyCursor];
          if (snap) applySnapshot(draft, snap);
        }),

      redo: () =>
        set((draft) => {
          if (draft.historyCursor >= draft.history.length - 1) return;
          draft.historyCursor += 1;
          const snap = draft.history[draft.historyCursor];
          if (snap) applySnapshot(draft, snap);
        }),

      resetSession: () =>
        set((draft) => {
          applySnapshot(draft, {
            field: 'R',
            spaces: {},
            subspaces: {},
            maps: {},
            vectors: {},
            bases: {},
            innerProducts: {},
            selectedBasis: {},
            namedObjects: {},
          });
          draft.views = [];
          draft.computationCache = {};
          draft.pendingComputations = {};
          draft.history = [
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
          ];
          draft.historyCursor = 0;
        }),

      applyScene: (build) =>
        set((draft) => {
          // Reset everything in the same Immer transaction to avoid React seeing
          // intermediate states between resetSession and the subsequent addSpace/openView calls.
          applySnapshot(draft, {
            field: draft.field, // preserve current field
            spaces: {},
            subspaces: {},
            maps: {},
            vectors: {},
            bases: {},
            innerProducts: {},
            selectedBasis: {},
            namedObjects: {},
          });
          draft.views = [];
          draft.computationCache = {};
          draft.pendingComputations = {};

          for (const space of build.spaces) draft.spaces[space.id] = castDraft(space);
          for (const basis of build.bases) draft.bases[basis.id] = castDraft(basis);
          for (const vector of build.vectors) draft.vectors[vector.id] = castDraft(vector);
          for (const map of build.maps) draft.maps[map.id] = castDraft(map);
          for (const { name, ref } of build.namedObjects) {
            draft.namedObjects[name] = castDraft(ref);
          }
          for (const { kind, objectId, refKind } of build.views) {
            const viewId = mkViewId();
            draft.views.push(
              castDraft<View>({
                id: viewId,
                kind,
                objectRef: { kind: refKind, id: objectId } as MathObjectRef,
                props: {},
              }),
            );
          }

          // Push one snapshot for the whole scene load.
          pushSnapshot(draft);
        }),
    })),
  );
}

export const defaultStore = createMathStore();
export type MathStoreApi = ReturnType<typeof createMathStore>;
