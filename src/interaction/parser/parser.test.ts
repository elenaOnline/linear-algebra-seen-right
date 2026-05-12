import { describe, it, expect } from 'vitest';
import { parseInput } from './parser.ts';

describe('parseInput — matrix', () => {
  it('parses a 2×2 matrix in row-of-arrays style', () => {
    const r = parseInput('[[1, 2], [3, 4]]');
    expect(r.kind).toBe('matrix');
    if (r.kind !== 'matrix') return;
    expect(r.matrix.rows).toBe(2);
    expect(r.matrix.cols).toBe(2);
  });

  it('parses a 2×2 matrix in flat semicolon style', () => {
    const r = parseInput('[1, 2; 3, 4]');
    expect(r.kind).toBe('matrix');
    if (r.kind !== 'matrix') return;
    expect(r.matrix.rows).toBe(2);
    expect(r.matrix.cols).toBe(2);
  });

  it('parses rational entries', () => {
    const r = parseInput('[[1/2, 3/4], [0, -1]]');
    expect(r.kind).toBe('matrix');
    if (r.kind !== 'matrix') return;
    expect(r.matrix.entries[0]?.[0]?.kind).toBe('rational');
  });

  it('parses negative entries', () => {
    const r = parseInput('[[-1, 2], [3, -4]]');
    expect(r.kind).toBe('matrix');
    if (r.kind !== 'matrix') return;
  });

  it('reports error for ragged rows', () => {
    const r = parseInput('[[1, 2], [3]]');
    expect(r.kind).toBe('error');
  });

  it('reports error for empty matrix', () => {
    const r = parseInput('[]');
    expect(r.kind).toBe('error');
  });

  it('infers R field for integer entries', () => {
    const r = parseInput('[[1, 0], [0, 1]]');
    if (r.kind !== 'matrix') return;
    expect(r.field).toBe('R');
  });
});

describe('parseInput — vector', () => {
  it('parses a 2-vector', () => {
    const r = parseInput('(1, 2)');
    expect(r.kind).toBe('vector');
    if (r.kind !== 'vector') return;
    expect(r.components).toHaveLength(2);
    expect(r.components[0]).toBeCloseTo(1);
    expect(r.components[1]).toBeCloseTo(2);
  });

  it('parses a 3-vector', () => {
    const r = parseInput('(1, -2, 3)');
    expect(r.kind).toBe('vector');
    if (r.kind !== 'vector') return;
    expect(r.components).toHaveLength(3);
  });

  it('parses negative components', () => {
    const r = parseInput('(-1, 0)');
    expect(r.kind).toBe('vector');
    if (r.kind !== 'vector') return;
    expect(r.components[0]).toBeCloseTo(-1);
  });

  it('parses decimal components', () => {
    const r = parseInput('(1.5, 0.25)');
    expect(r.kind).toBe('vector');
    if (r.kind !== 'vector') return;
    expect(r.components[0]).toBeCloseTo(1.5);
  });

  it('reports error for empty vector', () => {
    const r = parseInput('()');
    expect(r.kind).toBe('error');
  });
});

describe('parseInput — formula', () => {
  it('parses a valid formula', () => {
    const r = parseInput('T(x, y) = (x + y, x - y)');
    expect(r.kind).toBe('formula');
    if (r.kind !== 'formula') return;
    expect(r.name).toBe('T');
    expect(r.params).toEqual(['x', 'y']);
  });

  it('parses single-param formula', () => {
    const r = parseInput('f(x) = (x, 0)');
    expect(r.kind).toBe('formula');
    if (r.kind !== 'formula') return;
    expect(r.params).toHaveLength(1);
  });

  it('stores original source as label', () => {
    const src = 'T(x, y) = (x + y, x - y)';
    const r = parseInput(src);
    if (r.kind !== 'formula') return;
    expect(r.label).toBe(src);
  });
});

describe('parseInput — errors', () => {
  it('returns error for empty input', () => {
    expect(parseInput('').kind).toBe('error');
    expect(parseInput('   ').kind).toBe('error');
  });

  it('returns error for unrecognised input', () => {
    expect(parseInput('hello world').kind).toBe('error');
  });
});
