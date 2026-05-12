// Demo seed — populates the session with a few objects so the UI is visible
// before Phase 6 (interaction layer) lands. Remove this file and its import
// from main.tsx once the interaction layer ships.

import { defaultStore } from './state/index.ts';
import { mkVectorSpaceFn } from './types/space.ts';
import { mkConcreteVector } from './types/vector.ts';
import { mkLinearMapByFormula, mkLinearMapByMatrix } from './types/map.ts';
import { mkMatrix } from './types/matrix.ts';
import { rational } from './types/scalar.ts';
import type { BasisId } from './types/ids.ts';

export function seedDemo(): void {
  const { addSpace, addVector, addMap, nameObject, openView } = defaultStore.getState();

  // R^2 and R^3
  const r2 = mkVectorSpaceFn('R', 2);
  const r3 = mkVectorSpaceFn('R', 3);
  if (!r2.ok || !r3.ok) return;

  addSpace(r2.value);
  nameObject('V', { kind: 'space', id: r2.value.id });
  openView('symbolic', { kind: 'space', id: r2.value.id });

  addSpace(r3.value);
  nameObject('W', { kind: 'space', id: r3.value.id });
  openView('symbolic', { kind: 'space', id: r3.value.id });
  openView('geometric_3d', { kind: 'space', id: r3.value.id });

  // w = (1, -1, 2) in R^3 — exercises arrow-3d
  const w = mkConcreteVector('R', r3.value.id, [rational(1), rational(-1), rational(2)]);
  if (!w.ok) return;
  addVector(w.value);
  nameObject('w', { kind: 'vector', id: w.value.id });
  openView('symbolic', { kind: 'vector', id: w.value.id });
  openView('geometric_3d', { kind: 'vector', id: w.value.id });

  // v = (3/4, -1/2) in R^2
  const v = mkConcreteVector('R', r2.value.id, [rational(3, 4), rational(-1, 2)]);
  if (!v.ok) return;
  addVector(v.value);
  nameObject('v', { kind: 'vector', id: v.value.id });
  openView('symbolic', { kind: 'vector', id: v.value.id });
  openView('geometric_2d', { kind: 'vector', id: v.value.id });

  // A = [[1, 2], [3, 4]] — matrix representation of a linear map R^2 → R^2
  const basisId = r2.value.id as unknown as BasisId;
  const matrixA = mkMatrix(
    'R',
    [
      [rational(1), rational(2)],
      [rational(3), rational(4)],
    ],
    basisId,
    basisId,
  );
  if (!matrixA.ok) return;

  const A = mkLinearMapByMatrix(r2.value.id, r2.value.id, matrixA.value, basisId, basisId);
  if (!A.ok) return;
  addMap(A.value);
  nameObject('A', { kind: 'map', id: A.value.id });
  openView('matrix', { kind: 'map', id: A.value.id });
  openView('diagram', { kind: 'map', id: A.value.id });
  openView('geometric_2d', { kind: 'map', id: A.value.id });
  openView('chart', { kind: 'map', id: A.value.id });

  // T: R^2 → R^2, formula-kind (shows symbolic-formula visualizer)
  const T = mkLinearMapByFormula(
    r2.value.id,
    r2.value.id,
    (vec) => vec,
    'T(x, y) = (x + y,\\; x - y)',
  );
  addMap(T);
  nameObject('T', { kind: 'map', id: T.id });
  openView('symbolic', { kind: 'map', id: T.id });
}
