import type { Field } from './field.ts';
import type { SpaceId, SubspaceId } from './ids.ts';
import type { SessionView } from './session-view.ts';
import type { Result } from './result.ts';
import type { ConstructionError } from './errors.ts';
import { spaceKey } from './ids.ts';
import { ok, err } from './result.ts';
import { constructionError } from './errors.ts';

export type VectorSpace =
  | { readonly kind: 'Fn'; readonly id: SpaceId; readonly field: Field; readonly n: number }
  | {
      readonly kind: 'polynomial';
      readonly id: SpaceId;
      readonly field: Field;
      // null means unbounded degree (infinite-dimensional polynomial space)
      readonly maxDegree: number | null;
    }
  | {
      readonly kind: 'matrix_space';
      readonly id: SpaceId;
      readonly field: Field;
      readonly m: number;
      readonly n: number;
    }
  | {
      readonly kind: 'abstract';
      readonly id: SpaceId;
      readonly field: Field;
      readonly dim: number | 'infinite';
      readonly label: string;
    }
  | {
      readonly kind: 'quotient';
      readonly id: SpaceId;
      readonly field: Field;
      readonly parent: SpaceId;
      readonly subspace: SubspaceId;
    }
  | { readonly kind: 'dual'; readonly id: SpaceId; readonly field: Field; readonly parent: SpaceId }
  | {
      readonly kind: 'tensor';
      readonly id: SpaceId;
      readonly field: Field;
      readonly factors: readonly SpaceId[];
    }
  | {
      readonly kind: 'product';
      readonly id: SpaceId;
      readonly field: Field;
      readonly factors: readonly SpaceId[];
    };

// Content-addressed space registry — structurally identical spaces share an ID and object.
const _spaceRegistry = new Map<string, VectorSpace>();

function registerSpace(key: string, space: VectorSpace): VectorSpace {
  const existing = _spaceRegistry.get(key);
  if (existing !== undefined) return existing;
  _spaceRegistry.set(key, space);
  return space;
}

// For tests only.
export function _resetSpaceRegistry(): void {
  _spaceRegistry.clear();
}

// --- Factories ---

export function mkVectorSpaceFn(field: Field, n: number): Result<VectorSpace, ConstructionError> {
  if (!Number.isInteger(n) || n <= 0) {
    return err(
      constructionError('INVALID_DIMENSION', `Fn dimension must be a positive integer, got ${n}`),
    );
  }
  const key = `space:Fn:${field}:${n}`;
  const id = spaceKey('Fn', field, n);
  return ok(registerSpace(key, { kind: 'Fn', id, field, n }));
}

export function mkVectorSpacePoly(
  field: Field,
  maxDegree: number | null,
): Result<VectorSpace, ConstructionError> {
  if (maxDegree !== null && (!Number.isInteger(maxDegree) || maxDegree < 0)) {
    return err(
      constructionError(
        'INVALID_DIMENSION',
        `Polynomial maxDegree must be a non-negative integer or null, got ${maxDegree}`,
      ),
    );
  }
  const degStr = maxDegree === null ? 'inf' : String(maxDegree);
  const key = `space:poly:${field}:${degStr}`;
  const id = spaceKey('poly', field, degStr);
  return ok(registerSpace(key, { kind: 'polynomial', id, field, maxDegree }));
}

export function mkVectorSpaceMatrix(
  field: Field,
  m: number,
  n: number,
): Result<VectorSpace, ConstructionError> {
  if (!Number.isInteger(m) || m <= 0 || !Number.isInteger(n) || n <= 0) {
    return err(
      constructionError(
        'INVALID_DIMENSION',
        `Matrix space dimensions must be positive integers, got ${m}×${n}`,
      ),
    );
  }
  const key = `space:mat:${field}:${m}:${n}`;
  const id = spaceKey('mat', field, m, n);
  return ok(registerSpace(key, { kind: 'matrix_space', id, field, m, n }));
}

export function mkVectorSpaceAbstract(
  field: Field,
  label: string,
  d: number | 'infinite',
): Result<VectorSpace, ConstructionError> {
  if (d !== 'infinite' && (!Number.isInteger(d) || d < 0)) {
    return err(
      constructionError(
        'INVALID_DIMENSION',
        `Abstract space dimension must be a non-negative integer or 'infinite', got ${String(d)}`,
      ),
    );
  }
  // Abstract spaces are keyed by label+field+dim — same label implies same space.
  const dimStr = d === 'infinite' ? 'inf' : String(d);
  const key = `space:abs:${field}:${dimStr}:${label}`;
  const id = spaceKey('abs', field, dimStr, label);
  return ok(registerSpace(key, { kind: 'abstract', id, field, dim: d, label }));
}

export function mkVectorSpaceQuotient(
  parent: SpaceId,
  subspace: SubspaceId,
  field: Field,
): VectorSpace {
  const key = `space:quot:${parent}:${subspace}`;
  const id = spaceKey('quot', parent, subspace);
  return registerSpace(key, { kind: 'quotient', id, field, parent, subspace });
}

export function mkVectorSpaceDual(parent: SpaceId, field: Field): VectorSpace {
  const key = `space:dual:${parent}`;
  const id = spaceKey('dual', parent);
  return registerSpace(key, { kind: 'dual', id, field, parent });
}

export function mkVectorSpaceTensor(
  factors: readonly SpaceId[],
  field: Field,
): Result<VectorSpace, ConstructionError> {
  if (factors.length === 0) {
    return err(constructionError('EMPTY_FACTORS', 'Tensor product requires at least one factor'));
  }
  const key = `space:tensor:${factors.join(',')}`;
  const id = spaceKey('tensor', factors.join(','));
  return ok(registerSpace(key, { kind: 'tensor', id, field, factors: [...factors] }));
}

export function mkVectorSpaceProduct(
  factors: readonly SpaceId[],
  field: Field,
): Result<VectorSpace, ConstructionError> {
  if (factors.length === 0) {
    return err(constructionError('EMPTY_FACTORS', 'Product space requires at least one factor'));
  }
  const key = `space:prod:${factors.join(',')}`;
  const id = spaceKey('prod', factors.join(','));
  return ok(registerSpace(key, { kind: 'product', id, field, factors: [...factors] }));
}

// --- Accessors ---

export function fieldOf(space: VectorSpace): Field {
  return space.field;
}

// Returns the dimension of a vector space. For spaces that reference other spaces by ID
// (quotient, dual, tensor, product), a SessionView is required. Returns 'infinite' when
// the dimension cannot be determined from structural information alone.
export function dim(space: VectorSpace, session?: SessionView): number | 'infinite' {
  switch (space.kind) {
    case 'Fn':
      return space.n;
    case 'polynomial':
      return space.maxDegree === null ? 'infinite' : space.maxDegree + 1;
    case 'matrix_space':
      return space.m * space.n;
    case 'abstract':
      return space.dim;
    case 'dual': {
      if (!session) return 'infinite';
      const parent = session.getSpace(space.parent);
      if (!parent) return 'infinite';
      return dim(parent, session);
    }
    case 'quotient': {
      if (!session) return 'infinite';
      const parent = session.getSpace(space.parent);
      const sub = session.getSubspace(space.subspace);
      if (!parent) return 'infinite';
      const pd = dim(parent, session);
      if (pd === 'infinite') return 'infinite';
      // Subspace dimension: use knownDim if available, else conservative
      if (!sub || sub.knownDim === undefined) return 'infinite';
      return pd - sub.knownDim;
    }
    case 'tensor': {
      if (!session) return 'infinite';
      let result = 1;
      for (const factorId of space.factors) {
        const factor = session.getSpace(factorId);
        if (!factor) return 'infinite';
        const d = dim(factor, session);
        if (d === 'infinite') return 'infinite';
        result *= d;
      }
      return result;
    }
    case 'product': {
      if (!session) return 'infinite';
      let result = 0;
      for (const factorId of space.factors) {
        const factor = session.getSpace(factorId);
        if (!factor) return 'infinite';
        const d = dim(factor, session);
        if (d === 'infinite') return 'infinite';
        result += d;
      }
      return result;
    }
  }
}

export function isFiniteDim(space: VectorSpace, session?: SessionView): boolean {
  return dim(space, session) !== 'infinite';
}
