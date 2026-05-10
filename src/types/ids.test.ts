import { describe, expect, it, beforeEach } from 'vitest';
import { mkSpaceId, spaceKey, basisKey, _resetIdCounter } from './ids.ts';

beforeEach(() => {
  _resetIdCounter();
});

describe('branded ID types', () => {
  it('mkSpaceId produces a SpaceId from a string', () => {
    const id = mkSpaceId('space:Fn:R:3');
    expect(typeof id).toBe('string');
    expect(id).toBe('space:Fn:R:3');
  });
});

describe('spaceKey (snapshot)', () => {
  it('produces a stable, debug-friendly string for Fn R 3', () => {
    const id = spaceKey('Fn', 'R', 3);
    expect(id).toBe('space:Fn:R:3');
  });

  it('produces a stable string for matrix space', () => {
    const id = spaceKey('mat', 'C', 2, 3);
    expect(id).toBe('space:mat:C:2:3');
  });
});

describe('basisKey (snapshot)', () => {
  it('produces a stable string for a named basis', () => {
    const spaceId = spaceKey('Fn', 'R', 3);
    const bId = basisKey(spaceId, 'standard');
    expect(bId).toBe('basis:space:Fn:R:3:standard');
  });
});
