import { useStore } from 'zustand';
import { defaultStore } from '../../state/index.ts';
import type { MathStore } from '../../state/store.ts';

export function useSession(): MathStore {
  return useStore(defaultStore);
}

export function useSessionSelector<T>(selector: (state: MathStore) => T): T {
  return useStore(defaultStore, selector);
}
