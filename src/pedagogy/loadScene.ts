// Applies a SceneBuild to the live session store (ADR-017: resets first).
// Uses a single atomic store action to avoid React seeing intermediate states.
import { defaultStore } from '../state/index.ts';
import type { SceneBuild } from './templates/types.ts';

export function loadScene(build: SceneBuild): void {
  defaultStore.getState().applyScene(build);
}
