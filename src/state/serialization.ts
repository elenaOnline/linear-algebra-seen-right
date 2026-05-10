// Serialization shape for MathSession.
//
// The store uses Record<string, T> throughout (IDs are branded strings, safe as record keys).
// The JSON serialized form mirrors this exactly — no Map<K,V> conversion needed.
// formula-kind LinearMaps are the exception: their .fn field is a function value that cannot
// be serialized; it is omitted on serialize and reconstructed on deserialize from the label
// via a known-formula registry — deferred to Phase 6+.
//
// Serialization is deferred to Phase 6+ when persistence is introduced.

import type { MathSession } from './types.ts';

export type SerializedSession = Omit<MathSession, 'pendingComputations' | 'computationCache'>;

export function serialize(_session: MathSession): SerializedSession {
  throw new Error('serialize: not yet implemented (Phase 6+)');
}

export function deserialize(_json: unknown): MathSession {
  throw new Error('deserialize: not yet implemented (Phase 6+)');
}
