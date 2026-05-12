// Recomputes cached values for all derived vectors and maps in the session draft.
// Called at the end of every store mutation that can affect object values.
// Uses float arithmetic for simplicity; the small accuracy loss is acceptable for
// interactive exploration.

import type { Draft } from 'immer';
import { castDraft } from 'immer';
import type { MathStore } from './store.ts';
import type { VectorExpression, MapExpression } from '../types/derivation.ts';
import type { Scalar } from '../types/scalar.ts';
import { float } from '../types/scalar.ts';

// --- Scalar helpers ---

function toNum(s: Scalar): number {
  switch (s.kind) {
    case 'rational':
      return Number(s.value.s) * (Number(s.value.n) / Number(s.value.d));
    case 'float':
      return s.value;
    case 'algebraic':
      return s.approx;
    case 'complex':
      return toNum(s.re);
    case 'symbolic':
      return NaN;
  }
}

function fromNum(v: number): Scalar {
  return float(v);
}

// --- Vector expression evaluator ---

function evalVectorExpr(expr: VectorExpression, draft: Draft<MathStore>): readonly Scalar[] | null {
  switch (expr.op) {
    case 'add':
    case 'sub': {
      const left = draft.vectors[expr.left];
      const right = draft.vectors[expr.right];
      if (!left || left.kind !== 'concrete') return null;
      if (!right || right.kind !== 'concrete') return null;
      if (left.components.length !== right.components.length) return null;
      return left.components.map((l, i) => {
        const rv = right.components[i];
        if (!rv) return l;
        return fromNum(expr.op === 'add' ? toNum(l) + toNum(rv) : toNum(l) - toNum(rv));
      });
    }
    case 'scale': {
      const vec = draft.vectors[expr.vector];
      if (!vec || vec.kind !== 'concrete') return null;
      const s = toNum(expr.scalar);
      return vec.components.map((c) => fromNum(s * toNum(c)));
    }
    case 'apply': {
      const map = draft.maps[expr.map];
      const vec = draft.vectors[expr.vector];
      if (!map || map.representation.kind !== 'matrix') return null;
      if (!vec || vec.kind !== 'concrete') return null;
      const mat = map.representation.matrix;
      if (mat.cols !== vec.components.length) return null;
      return mat.entries.map((row) =>
        fromNum(
          row.reduce(
            (sum, entry, j) => sum + toNum(entry) * toNum(vec.components[j] ?? float(0)),
            0,
          ),
        ),
      );
    }
  }
}

// --- Map expression evaluator (returns row-major entries) ---

function evalMapExpr(expr: MapExpression, draft: Draft<MathStore>): number[][] | null {
  switch (expr.op) {
    case 'sum':
    case 'compose': {
      const left = draft.maps[expr.left];
      const right = draft.maps[expr.right];
      if (!left || left.representation.kind !== 'matrix') return null;
      if (!right || right.representation.kind !== 'matrix') return null;
      const A = left.representation.matrix.entries.map((r) => r.map(toNum));
      const B = right.representation.matrix.entries.map((r) => r.map(toNum));
      if (expr.op === 'sum') {
        if (A.length !== B.length || (A[0]?.length ?? 0) !== (B[0]?.length ?? 0)) return null;
        return A.map((row, i) => row.map((v, j) => v + (B[i]?.[j] ?? 0)));
      }
      // compose: A * B — A is left (outer), B is right (inner)
      const m = A.length;
      const k = B.length;
      const n = B[0]?.length ?? 0;
      if ((A[0]?.length ?? 0) !== k) return null;
      return Array.from({ length: m }, (_, i) =>
        Array.from({ length: n }, (_, j) =>
          Array.from({ length: k }, (_, l) => (A[i]?.[l] ?? 0) * (B[l]?.[j] ?? 0)).reduce(
            (s, v) => s + v,
            0,
          ),
        ),
      );
    }
    case 'scale': {
      const map = draft.maps[expr.map];
      if (!map || map.representation.kind !== 'matrix') return null;
      const s = toNum(expr.scalar);
      return map.representation.matrix.entries.map((row) => row.map((e) => s * toNum(e)));
    }
  }
}

// --- Dependency graph for topological sort ---

function vecDeps(expr: VectorExpression): string[] {
  switch (expr.op) {
    case 'add':
    case 'sub':
      return [expr.left, expr.right];
    case 'scale':
      return [expr.vector];
    case 'apply':
      return [expr.map, expr.vector];
  }
}

function mapDeps(expr: MapExpression): string[] {
  switch (expr.op) {
    case 'compose':
    case 'sum':
      return [expr.left, expr.right];
    case 'scale':
      return [expr.map];
  }
}

// Simple topological sort — returns ids in evaluation order.
// IDs that are not derived are treated as leaves (always available).
function topoSort(derivedIds: string[], depsOf: (id: string) => string[]): string[] {
  const order: string[] = [];
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of depsOf(id)) visit(dep);
    if (derivedIds.includes(id)) order.push(id);
  }

  for (const id of derivedIds) visit(id);
  return order;
}

// --- Main export ---

export function recomputeDerived(draft: Draft<MathStore>): void {
  // Collect derived vector IDs
  const derivedVecIds = Object.keys(draft.vectors).filter(
    (id) => draft.vectors[id]?.kind === 'concrete' && draft.vectors[id]?.derivation != null,
  );

  // Collect derived map IDs
  const derivedMapIds = Object.keys(draft.maps).filter((id) => draft.maps[id]?.derivation != null);

  // Topologically sort vectors
  const sortedVecIds = topoSort(derivedVecIds, (id) => {
    const v = draft.vectors[id];
    return v?.kind === 'concrete' && v.derivation ? vecDeps(v.derivation) : [];
  });

  // Topologically sort maps
  const sortedMapIds = topoSort(derivedMapIds, (id) => {
    const m = draft.maps[id];
    return m?.derivation ? mapDeps(m.derivation) : [];
  });

  // Recompute vectors in topo order
  for (const id of sortedVecIds) {
    const vec = draft.vectors[id];
    if (!vec || vec.kind !== 'concrete' || !vec.derivation) continue;
    const newComponents = evalVectorExpr(vec.derivation, draft);
    if (newComponents) {
      draft.vectors[id] = castDraft({ ...vec, components: newComponents });
    }
  }

  // Recompute maps in topo order
  for (const id of sortedMapIds) {
    const map = draft.maps[id];
    if (!map || !map.derivation || map.representation.kind !== 'matrix') continue;
    const newEntries = evalMapExpr(map.derivation, draft);
    if (newEntries) {
      const oldRep = map.representation;
      const newMatrix = {
        ...oldRep.matrix,
        entries: newEntries.map((row) => row.map((v) => fromNum(v))),
      };
      draft.maps[id] = castDraft({
        ...map,
        representation: { ...oldRep, matrix: newMatrix },
      });
    }
  }
}
