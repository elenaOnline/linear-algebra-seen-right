import { describe, expect, it, beforeEach } from 'vitest';
import { createEngine } from './engine.ts';
import { createMockAdapter } from './symbolic/mock-adapter.ts';
import { mkMatrix } from '../types/matrix.ts';
import { rational, float } from '../types/scalar.ts';
import { basisKey, spaceKey, _resetIdCounter } from '../types/ids.ts';
import { _resetSpaceRegistry } from '../types/space.ts';

const dom = basisKey(spaceKey('Fn', 'R', 2), 'standard');
const cod = basisKey(spaceKey('Fn', 'R', 2), 'standard');
const r = (n: number, d = 1) => rational(n, d);

function mat2x2Exact(a: number, b: number, c: number, d: number) {
  const result = mkMatrix(
    'R',
    [
      [r(a), r(b)],
      [r(c), r(d)],
    ],
    dom,
    cod,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

beforeEach(() => {
  _resetIdCounter();
  _resetSpaceRegistry();
});

describe('engine with mock symbolic adapter', () => {
  const engine = createEngine(createMockAdapter());
  const diagM = mat2x2Exact(2, 0, 0, 3); // diagonal [[2,0],[0,3]]
  const identityM = mat2x2Exact(1, 0, 0, 1);

  it('ready resolves immediately with mock adapter', async () => {
    await expect(engine.ready).resolves.toBeUndefined();
  });

  describe('determinant', () => {
    it('exact det of [[2,0],[0,3]] is 6', async () => {
      const result = await engine.determinant(diagM);
      expect(result.exact?.kind).toBe('rational');
      if (result.exact?.kind === 'rational') {
        expect(result.exact.value.valueOf()).toBe(6);
      }
    });

    it('numerical det of [[2,0],[0,3]] is close to 6', async () => {
      const result = await engine.determinant(diagM);
      if (result.numerical.kind === 'float') {
        expect(Math.abs(result.numerical.value - 6)).toBeLessThan(1e-8);
      }
    });
  });

  describe('rank', () => {
    it('rank of [[2,0],[0,3]] is 2 (exact and numerical)', async () => {
      const result = await engine.rank(diagM);
      expect(result.exact).toBe(2);
      expect(result.numerical).toBe(2);
    });
  });

  describe('rref', () => {
    it('rref of [[2,0],[0,3]] is identity (exact)', async () => {
      const result = await engine.rref(diagM);
      expect(result.exact).not.toBeNull();
      if (result.exact) {
        const e00 = result.exact.entries[0]?.[0];
        const e11 = result.exact.entries[1]?.[1];
        if (e00?.kind === 'rational') expect(e00.value.valueOf()).toBe(1);
        if (e11?.kind === 'rational') expect(e11.value.valueOf()).toBe(1);
      }
    });
  });

  describe('inverse', () => {
    it('exact inverse of [[2,0],[0,3]] has entries 1/2 and 1/3', async () => {
      const result = await engine.inverse(diagM);
      expect(result.kind).toBe('success');
      if (result.kind === 'success' && result.exact) {
        const e00 = result.exact.entries[0]?.[0];
        const e11 = result.exact.entries[1]?.[1];
        if (e00?.kind === 'rational') expect(e00.value.valueOf()).toBeCloseTo(0.5);
        if (e11?.kind === 'rational') expect(e11.value.valueOf()).toBeCloseTo(1 / 3);
      }
    });
  });

  describe('characteristicPoly', () => {
    it('char poly of [[2,0],[0,3]] is x^2 - 5x + 6 (ascending: [6,-5,1])', async () => {
      const result = await engine.characteristicPoly(diagM);
      expect(result.coefficients).toHaveLength(3);
      // coefficients[0] = constant term = 6
      const c0 = result.coefficients[0];
      if (c0?.kind === 'rational') expect(c0.value.valueOf()).toBe(6);
    });
  });

  describe('minimalPoly', () => {
    it('minimal poly of identity [[1,0],[0,1]] is x - 1 (ascending: [-1,1])', async () => {
      const result = await engine.minimalPoly(identityM);
      expect(result.coefficients).toHaveLength(2);
      const c0 = result.coefficients[0];
      if (c0?.kind === 'rational') expect(c0.value.valueOf()).toBe(-1);
    });
  });

  describe('jordanForm', () => {
    it('jordan form of diagonal [[2,0],[0,3]] has 2 size-1 blocks', async () => {
      const result = await engine.jordanForm(diagM);
      expect(result.blocks).toHaveLength(2);
      const sizes = result.blocks.map((b) => b.size);
      expect(sizes).toEqual([1, 1]);
    });
  });

  describe('eigendecompose', () => {
    it('eigenvalues of [[2,0],[0,3]] are 2 and 3 (exact)', async () => {
      const result = await engine.eigendecompose(diagM);
      expect(result.exact?.values).toHaveLength(2);
      const exactVals = result.exact?.values
        .map((v) => (v.value.kind === 'rational' ? v.value.value.valueOf() : 0))
        .sort((a, b) => a - b);
      expect(exactVals?.[0]).toBe(2);
      expect(exactVals?.[1]).toBe(3);
    });
  });

  describe('provenance contract', () => {
    it('float-entry matrix produces null exact result', async () => {
      const floatResult = mkMatrix(
        'R',
        [
          [float(2), float(0)],
          [float(0), float(3)],
        ],
        dom,
        cod,
      );
      if (!floatResult.ok) throw new Error(floatResult.error.message);
      const rankResult = await engine.rank(floatResult.value);
      expect(rankResult.exact).toBeNull();
      expect(rankResult.numerical).toBeGreaterThan(0);
    });
  });

  describe('cancellation', () => {
    it('aborted signal causes promise to settle (mock resolves immediately)', async () => {
      const ctrl = new AbortController();
      ctrl.abort();
      // With mock adapter, abort has no effect — mock resolves immediately
      const result = await engine.rank(diagM, { signal: ctrl.signal });
      // Should still get a numerical result even if exact was aborted
      expect(result.numerical).toBeDefined();
    });
  });

  describe('svd', () => {
    it('SVD result has U, singularValues, Vt', async () => {
      const result = await engine.svd(diagM);
      expect(result.U.rows).toBe(2);
      expect(result.singularValues).toHaveLength(2);
      expect(result.Vt.rows).toBe(2);
    });
  });

  describe('qr', () => {
    it('QR result has Q and R', async () => {
      const result = await engine.qr(diagM);
      expect(result.Q.rows).toBe(2);
      expect(result.R.rows).toBe(2);
    });
  });
});
