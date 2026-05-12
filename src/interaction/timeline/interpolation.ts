import { float, toFloat } from '../../types/scalar.ts';
import { mkMatrix } from '../../types/matrix.ts';
import type { SessionSnapshot } from '../../state/types.ts';
import type { Vector } from '../../types/vector.ts';
import type { LinearMap } from '../../types/map.ts';

function lerpScalar(a: number, b: number, t: number): ReturnType<typeof float> {
  return float((1 - t) * a + t * b);
}

function interpolateVector(a: Vector, b: Vector, t: number): Vector {
  if (
    a.kind !== 'concrete' ||
    b.kind !== 'concrete' ||
    a.components.length !== b.components.length
  ) {
    return a;
  }
  const components = a.components.map((ca, i) => {
    const cb = b.components[i];
    if (cb === undefined) return ca;
    return lerpScalar(toFloat(ca), toFloat(cb), t);
  });
  return { ...a, components };
}

function interpolateMap(a: LinearMap, b: LinearMap, t: number): LinearMap {
  const ra = a.representation;
  const rb = b.representation;
  if (
    ra.kind !== 'matrix' ||
    rb.kind !== 'matrix' ||
    ra.matrix.rows !== rb.matrix.rows ||
    ra.matrix.cols !== rb.matrix.cols
  ) {
    return a;
  }
  const ma = ra.matrix;
  const mb = rb.matrix;
  const newEntries = ma.entries.map((row, r) =>
    row.map((ca, c) => {
      const cb = mb.entries[r]?.[c];
      if (cb === undefined) return ca;
      return lerpScalar(toFloat(ca), toFloat(cb), t);
    }),
  );
  const result = mkMatrix(ma.field, newEntries, ma.domainBasis, ma.codomainBasis);
  if (!result.ok) return a;
  return { ...a, representation: { ...ra, matrix: result.value } };
}

export function interpolateSnapshots(
  a: SessionSnapshot,
  b: SessionSnapshot,
  t: number,
): SessionSnapshot {
  // Spaces, bases, subspaces, namedObjects, selectedBasis, field: from a.
  // Vectors and maps: interpolate when IDs match and kinds are compatible.

  const vectors: Record<string, Vector> = { ...a.vectors };
  for (const id of Object.keys(a.vectors)) {
    const va = a.vectors[id];
    const vb = b.vectors[id];
    if (va !== undefined && vb !== undefined) {
      vectors[id] = interpolateVector(va, vb, t);
    }
  }

  const maps: Record<string, LinearMap> = { ...a.maps };
  for (const id of Object.keys(a.maps)) {
    const ma = a.maps[id];
    const mb = b.maps[id];
    if (ma !== undefined && mb !== undefined) {
      maps[id] = interpolateMap(ma, mb, t);
    }
  }

  return {
    field: a.field,
    spaces: a.spaces,
    subspaces: a.subspaces,
    bases: a.bases,
    innerProducts: a.innerProducts,
    selectedBasis: a.selectedBasis,
    namedObjects: a.namedObjects,
    vectors,
    maps,
  };
}
