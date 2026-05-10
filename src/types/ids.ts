export type SpaceId = string & { readonly __brand: 'SpaceId' };
export type SubspaceId = string & { readonly __brand: 'SubspaceId' };
export type MapId = string & { readonly __brand: 'MapId' };
export type VectorId = string & { readonly __brand: 'VectorId' };
export type BasisId = string & { readonly __brand: 'BasisId' };
export type IPId = string & { readonly __brand: 'IPId' };

// Counter for disambiguation when the same content key is created multiple times
// in contexts that do not deduplicate (e.g., abstract spaces with user-supplied labels).
let _counter = 0;
function nextCounter(): number {
  return ++_counter;
}

export function mkSpaceId(key: string): SpaceId {
  return key as SpaceId;
}

export function mkSubspaceId(key: string): SubspaceId {
  return key as SubspaceId;
}

export function mkMapId(key: string): MapId {
  return key as MapId;
}

export function mkVectorId(key: string): VectorId {
  return key as VectorId;
}

export function mkBasisId(key: string): BasisId {
  return key as BasisId;
}

export function mkIPId(key: string): IPId {
  return key as IPId;
}

// Content-addressed ID generators — these produce stable, debug-friendly strings.
// Spaces with identical structural content share an ID.
export function spaceKey(kind: string, ...parts: (string | number)[]): SpaceId {
  return mkSpaceId(`space:${kind}:${parts.join(':')}`);
}

export function subspaceKey(ambient: SpaceId, tag: string): SubspaceId {
  return mkSubspaceId(`sub:${ambient}:${tag}:${nextCounter()}`);
}

export function mapKey(domain: SpaceId, codomain: SpaceId): MapId {
  return mkMapId(`map:${domain}:${codomain}:${nextCounter()}`);
}

export function vectorKey(space: SpaceId): VectorId {
  return mkVectorId(`vec:${space}:${nextCounter()}`);
}

export function basisKey(space: SpaceId, label: string): BasisId {
  return mkBasisId(`basis:${space}:${label}`);
}

export function ipKey(space: SpaceId): IPId {
  return mkIPId(`ip:${space}:${nextCounter()}`);
}

// Resets the counter — for use in tests only.
export function _resetIdCounter(): void {
  _counter = 0;
}
