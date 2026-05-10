import { describe, expect, it, beforeEach } from 'vitest';
import { createMathStore } from './store.ts';
import { _resetStateCounters } from './types.ts';
import { _resetSpaceRegistry, mkVectorSpaceFn } from '../types/space.ts';
import { _resetIdCounter, basisKey } from '../types/ids.ts';
import { mkConcreteVector } from '../types/vector.ts';
import { mkLinearMapByFormula } from '../types/map.ts';
import { rational } from '../types/scalar.ts';

function freshStore() {
  return createMathStore();
}

function makeR2() {
  const r = mkVectorSpaceFn('R', 2);
  if (!r.ok) throw new Error('test setup');
  return r.value;
}

function makeVec(spaceId: ReturnType<typeof makeR2>['id']) {
  const r = mkConcreteVector('R', spaceId, [rational(1), rational(0)]);
  if (!r.ok) throw new Error('test setup');
  return r.value;
}

beforeEach(() => {
  _resetStateCounters();
  _resetIdCounter();
  _resetSpaceRegistry();
});

describe('addSpace', () => {
  it('adds a space to the store', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    const state = store.getState();
    expect(state.spaces[space.id]).toBeDefined();
  });

  it('pushes a history entry', () => {
    const store = freshStore();
    const before = store.getState().history.length;
    store.getState().addSpace(makeR2());
    expect(store.getState().history.length).toBe(before + 1);
  });

  it('does not mutate other slices', () => {
    const store = freshStore();
    store.getState().addSpace(makeR2());
    const state = store.getState();
    expect(Object.keys(state.maps)).toHaveLength(0);
    expect(Object.keys(state.vectors)).toHaveLength(0);
  });
});

describe('addVector', () => {
  it('adds a vector to the store', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    const vec = makeVec(space.id);
    store.getState().addVector(vec);
    expect(store.getState().vectors[vec.id]).toBeDefined();
  });
});

describe('nameObject / unname', () => {
  it('names and retrieves a space', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    store.getState().nameObject('V', { kind: 'space', id: space.id });
    expect(store.getState().namedObjects['V']).toEqual({ kind: 'space', id: space.id });
  });

  it('unname removes the name', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    store.getState().nameObject('V', { kind: 'space', id: space.id });
    store.getState().unname('V');
    expect(store.getState().namedObjects['V']).toBeUndefined();
  });

  it('unname pushes a history entry', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    store.getState().nameObject('V', { kind: 'space', id: space.id });
    const before = store.getState().historyCursor;
    store.getState().unname('V');
    expect(store.getState().historyCursor).toBe(before + 1);
  });
});

describe('setActiveBasis', () => {
  it('sets the active basis for a space', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    const basisId = basisKey(space.id, 'standard');
    store.getState().setActiveBasis(space.id, basisId);
    expect(store.getState().selectedBasis[space.id]).toBe(basisId);
  });

  it('is idempotent: setting the same basis does not push history', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    const basisId = basisKey(space.id, 'standard');
    store.getState().setActiveBasis(space.id, basisId);
    const cursor = store.getState().historyCursor;
    store.getState().setActiveBasis(space.id, basisId); // same value
    expect(store.getState().historyCursor).toBe(cursor);
  });
});

describe('setField', () => {
  it('changes the field', () => {
    const store = freshStore();
    store.getState().setField('C');
    expect(store.getState().field).toBe('C');
  });

  it('is idempotent: setting the same field does not push history', () => {
    const store = freshStore();
    const cursor = store.getState().historyCursor;
    store.getState().setField('R'); // already 'R'
    expect(store.getState().historyCursor).toBe(cursor);
  });
});

describe('computation lifecycle', () => {
  it('startComputation adds to pending', () => {
    const store = freshStore();
    const id = store.getState().startComputation({
      key: 'eigendecompose:abc',
      operation: 'eigendecompose',
    });
    expect(store.getState().pendingComputations[id]).toBeDefined();
  });

  it('startComputation does NOT push history', () => {
    const store = freshStore();
    const cursor = store.getState().historyCursor;
    store.getState().startComputation({ key: 'k', operation: 'rank' });
    expect(store.getState().historyCursor).toBe(cursor);
  });

  it('completeComputation removes from pending', () => {
    const store = freshStore();
    const id = store.getState().startComputation({ key: 'k', operation: 'rank' });
    store.getState().completeComputation(id);
    expect(store.getState().pendingComputations[id]).toBeUndefined();
  });

  it('cancelComputation removes from pending', () => {
    const store = freshStore();
    const id = store.getState().startComputation({ key: 'k', operation: 'rank' });
    store.getState().cancelComputation(id);
    expect(store.getState().pendingComputations[id]).toBeUndefined();
  });

  it('cacheResult stores in computationCache', () => {
    const store = freshStore();
    store.getState().cacheResult('eigendecompose:abc', { eigenvalues: [1, 2] });
    const cached = store.getState().computationCache['eigendecompose:abc'];
    expect(cached).toBeDefined();
    expect((cached as { result: unknown } | undefined)?.result).toEqual({ eigenvalues: [1, 2] });
  });
});

describe('views', () => {
  it('openView adds a view and returns a ViewId', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    const id = store.getState().openView('geometric_2d', { kind: 'space', id: space.id });
    expect(store.getState().views).toHaveLength(1);
    expect(store.getState().views[0]?.id).toBe(id);
  });

  it('closeView removes the view', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    const id = store.getState().openView('matrix', { kind: 'space', id: space.id });
    store.getState().closeView(id);
    expect(store.getState().views).toHaveLength(0);
  });

  it('setViewProps updates view props', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    const id = store.getState().openView('symbolic', { kind: 'space', id: space.id });
    store.getState().setViewProps(id, { showGrid: true });
    const view = store.getState().views[0];
    expect(view?.props?.showGrid).toBe(true);
  });
});

describe('undo / redo', () => {
  it('undo reverses the last action', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    expect(Object.keys(store.getState().spaces)).toHaveLength(1);
    store.getState().undo();
    expect(Object.keys(store.getState().spaces)).toHaveLength(0);
  });

  it('redo re-applies after undo', () => {
    const store = freshStore();
    const space = makeR2();
    store.getState().addSpace(space);
    store.getState().undo();
    store.getState().redo();
    expect(Object.keys(store.getState().spaces)).toHaveLength(1);
  });

  it('linear sequence: action → undo → redo → same state', () => {
    const store = freshStore();
    store.getState().setField('C');
    const afterAction = store.getState().field;
    store.getState().undo();
    expect(store.getState().field).toBe('R');
    store.getState().redo();
    expect(store.getState().field).toBe(afterAction);
  });

  it('new action after undo invalidates redo branch', () => {
    const store = freshStore();
    store.getState().setField('C'); // A: field=C, cursor=1
    store.getState().addSpace(makeR2()); // B: field=C+space, cursor=2
    store.getState().undo(); // back to field=C, no space, cursor=1
    store.getState().setField('R'); // C: field=R — invalidates B, cursor=2
    // history is [init, C, R]; cursor=2, no future
    const cursorAfterC = store.getState().historyCursor;
    store.getState().redo(); // no-op — already at end
    expect(store.getState().historyCursor).toBe(cursorAfterC);
  });

  it('undo at the beginning is a no-op', () => {
    const store = freshStore();
    store.getState().undo();
    expect(store.getState().historyCursor).toBe(0);
  });

  it('redo at the end is a no-op', () => {
    const store = freshStore();
    store.getState().redo();
    expect(store.getState().historyCursor).toBe(0);
  });

  it('history bound: pushing 101 entries drops the oldest', () => {
    const store = freshStore();
    for (let i = 0; i < 101; i++) {
      store.getState().setField(i % 2 === 0 ? 'R' : 'C');
    }
    expect(store.getState().history.length).toBeLessThanOrEqual(100);
  });
});

describe('end-to-end integration: create → compute → undo', () => {
  it('full session flow passes', () => {
    const store = freshStore();

    // Create R^2
    const space = makeR2();
    store.getState().addSpace(space);
    expect(Object.keys(store.getState().spaces)).toHaveLength(1);

    // Create a vector in R^2
    const vec = makeVec(space.id);
    store.getState().addVector(vec);
    expect(Object.keys(store.getState().vectors)).toHaveLength(1);

    // Create a linear map (identity via formula)
    const map = mkLinearMapByFormula(space.id, space.id, (v) => v, 'identity');
    store.getState().addMap(map);
    expect(Object.keys(store.getState().maps)).toHaveLength(1);

    // Name the objects
    store.getState().nameObject('V', { kind: 'space', id: space.id });
    store.getState().nameObject('T', { kind: 'map', id: map.id });
    expect(store.getState().namedObjects['V']).toBeDefined();
    expect(store.getState().namedObjects['T']).toBeDefined();

    // Simulate starting an eigendecomposition
    const compId = store.getState().startComputation({
      key: 'eigendecompose:identity',
      operation: 'eigendecompose',
    });
    expect(store.getState().pendingComputations[compId]).toBeDefined();

    // Computation completes
    store.getState().completeComputation(compId);
    store.getState().cacheResult('eigendecompose:identity', { values: [{ value: 1 }] });
    expect(store.getState().pendingComputations[compId]).toBeUndefined();
    expect(store.getState().computationCache['eigendecompose:identity']).toBeDefined();

    // Undo back to empty (5 pushable actions: addSpace, addVector, addMap, nameV, nameT)
    const fullCursor = store.getState().historyCursor;
    for (let i = 0; i < fullCursor; i++) {
      store.getState().undo();
    }
    // Back to initial state (cursor 0)
    expect(store.getState().historyCursor).toBe(0);
    expect(Object.keys(store.getState().spaces)).toHaveLength(0);
    expect(Object.keys(store.getState().vectors)).toHaveLength(0);
  });
});
