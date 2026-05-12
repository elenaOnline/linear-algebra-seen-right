// Expression types for derived (live) mathematical objects.
// A derived vector or map stores one of these expressions alongside its cached value.
// The session's recomputeDerived pass re-evaluates the cache whenever dependencies change.

import type { VectorId, MapId } from './ids.ts';
import type { Scalar } from './scalar.ts';

export type VectorExpression =
  | { readonly op: 'add'; readonly left: VectorId; readonly right: VectorId }
  | { readonly op: 'sub'; readonly left: VectorId; readonly right: VectorId }
  | { readonly op: 'scale'; readonly scalar: Scalar; readonly vector: VectorId }
  | { readonly op: 'apply'; readonly map: MapId; readonly vector: VectorId };

export type MapExpression =
  | { readonly op: 'compose'; readonly left: MapId; readonly right: MapId }
  | { readonly op: 'sum'; readonly left: MapId; readonly right: MapId }
  | { readonly op: 'scale'; readonly scalar: Scalar; readonly map: MapId };
