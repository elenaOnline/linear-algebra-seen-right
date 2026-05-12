import { describe, it, expect } from 'vitest';
import { evaluateFormulaBody, extractFormulaBody } from './evaluate.ts';

describe('extractFormulaBody', () => {
  it('extracts body after equals sign', () => {
    expect(extractFormulaBody('T(x, y) = (x + y, x - y)')).toBe('(x + y, x - y)');
  });
  it('returns trimmed input when no equals', () => {
    expect(extractFormulaBody('(x + y)')).toBe('(x + y)');
  });
});

describe('evaluateFormulaBody', () => {
  it('evaluates addition formula at standard basis vector e1', () => {
    const result = evaluateFormulaBody('(x + y, x - y)', { x: 1, y: 0 });
    expect(result).toEqual([1, 1]);
  });

  it('evaluates addition formula at standard basis vector e2', () => {
    const result = evaluateFormulaBody('(x + y, x - y)', { x: 0, y: 1 });
    expect(result).toEqual([1, -1]);
  });

  it('handles negation', () => {
    const result = evaluateFormulaBody('(-x, y)', { x: 1, y: 0 });
    expect(result).toEqual([-1, 0]);
  });

  it('handles scalar multiples', () => {
    const result = evaluateFormulaBody('(2*x, 3*y)', { x: 1, y: 0 });
    expect(result).toEqual([2, 0]);
  });

  it('handles rational coefficient', () => {
    const result = evaluateFormulaBody('(x/2, y)', { x: 1, y: 0 });
    expect(Array.isArray(result) && Math.abs(result[0]! - 0.5) < 1e-10).toBe(true);
  });

  it('recovers matrix of T(x,y)=(x+y, x-y)', () => {
    // Column 1: T(1,0) = (1, 1)
    const col1 = evaluateFormulaBody('(x + y, x - y)', { x: 1, y: 0 });
    // Column 2: T(0,1) = (1, -1)
    const col2 = evaluateFormulaBody('(x + y, x - y)', { x: 0, y: 1 });
    expect(col1).toEqual([1, 1]);
    expect(col2).toEqual([1, -1]);
    // Matrix is [[1,1],[1,-1]]
  });

  it('handles 3-variable formula', () => {
    const col1 = evaluateFormulaBody('(x + y + z, x - z)', { x: 1, y: 0, z: 0 });
    expect(col1).toEqual([1, 1]);
    const col2 = evaluateFormulaBody('(x + y + z, x - z)', { x: 0, y: 1, z: 0 });
    expect(col2).toEqual([1, 0]);
    const col3 = evaluateFormulaBody('(x + y + z, x - z)', { x: 0, y: 0, z: 1 });
    expect(col3).toEqual([1, -1]);
  });

  it('returns error string on unknown variable', () => {
    const result = evaluateFormulaBody('(x + z)', { x: 1 });
    expect(typeof result).toBe('string');
  });

  it('returns error on empty body', () => {
    const result = evaluateFormulaBody('()', {});
    expect(typeof result).toBe('string');
  });
});
