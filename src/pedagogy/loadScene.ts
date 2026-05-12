// Applies a SceneBuild to the live session store (ADR-017: resets first).
import { defaultStore } from '../state/index.ts';
import type { SceneBuild } from './templates/types.ts';

export function loadScene(build: SceneBuild): void {
  const store = defaultStore.getState();

  // ADR-017: replace, not accumulate
  store.resetSession();

  for (const space of build.spaces) store.addSpace(space);
  for (const basis of build.bases) store.addBasis(basis);
  for (const vector of build.vectors) store.addVector(vector);
  for (const map of build.maps) store.addMap(map);

  for (const { name, ref } of build.namedObjects) {
    store.nameObject(name, ref);
  }

  for (const { kind, objectId, refKind } of build.views) {
    store.openView(kind, { kind: refKind, id: objectId } as Parameters<typeof store.openView>[1]);
  }
}
