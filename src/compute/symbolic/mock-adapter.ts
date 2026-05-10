// Mock SymbolicAdapter for use in Vitest (Node environment).
// Returns pre-computed correct answers for the test matrices used in engine.test.ts.
// Not exported from the compute barrel — test-only import.

import type { SymbolicAdapter } from './protocol.ts';
import type {
  PyEigenResult,
  PyNullSpaceResult,
  PyRankResult,
  PyRrefResult,
  PyDetResult,
  PyInverseResult,
  PyPolyResult,
  PyJordanResult,
  PyGramSchmidtResult,
  PyError,
  SerializedMatrix,
} from './protocol.ts';
import type { SerializedScalar } from '../serialization/scalar.ts';

function r(n: number, d = 1): SerializedScalar {
  return { kind: 'rational', n, d };
}

function key(entries: SerializedMatrix): string {
  return JSON.stringify(entries);
}

function diagKey(): string {
  return key([
    [r(2), r(0)],
    [r(0), r(3)],
  ]);
}

function identityKey(): string {
  return key([
    [r(1), r(0)],
    [r(0), r(1)],
  ]);
}

export function createMockAdapter(): SymbolicAdapter {
  return {
    ready: Promise.resolve(),

    eigendecompose(entries, _signal): Promise<PyEigenResult | PyError> {
      if (key(entries) === diagKey()) {
        return Promise.resolve({
          kind: 'success',
          values: [
            { value: r(2), multiplicity: 1 },
            { value: r(3), multiplicity: 1 },
          ],
          vectors: [
            [r(1), r(0)],
            [r(0), r(1)],
          ],
        });
      }
      if (key(entries) === identityKey()) {
        return Promise.resolve({
          kind: 'success',
          values: [{ value: r(1), multiplicity: 2 }],
          vectors: [
            [r(1), r(0)],
            [r(0), r(1)],
          ],
        });
      }
      return Promise.resolve({ kind: 'error', message: 'mock: no answer for this matrix' });
    },

    nullSpace(entries, _signal): Promise<PyNullSpaceResult | PyError> {
      if (key(entries) === identityKey()) {
        return Promise.resolve({ kind: 'success', vectors: [] });
      }
      return Promise.resolve({ kind: 'success', vectors: [] });
    },

    rank(entries, _signal): Promise<PyRankResult | PyError> {
      if (key(entries) === diagKey() || key(entries) === identityKey()) {
        return Promise.resolve({ kind: 'success', rank: 2 });
      }
      return Promise.resolve({ kind: 'error', message: 'mock: no answer' });
    },

    rref(entries, _signal): Promise<PyRrefResult | PyError> {
      if (key(entries) === diagKey() || key(entries) === identityKey()) {
        return Promise.resolve({
          kind: 'success',
          matrix: [
            [r(1), r(0)],
            [r(0), r(1)],
          ],
          pivots: [0, 1],
        });
      }
      return Promise.resolve({ kind: 'error', message: 'mock: no answer' });
    },

    determinant(entries, _signal): Promise<PyDetResult | PyError> {
      if (key(entries) === diagKey()) return Promise.resolve({ kind: 'success', det: r(6) });
      if (key(entries) === identityKey()) return Promise.resolve({ kind: 'success', det: r(1) });
      return Promise.resolve({ kind: 'error', message: 'mock: no answer' });
    },

    inverse(entries, _signal): Promise<PyInverseResult | PyError> {
      if (key(entries) === diagKey()) {
        return Promise.resolve({
          kind: 'success',
          matrix: [
            [r(1, 2), r(0)],
            [r(0), r(1, 3)],
          ],
        });
      }
      if (key(entries) === identityKey()) {
        return Promise.resolve({
          kind: 'success',
          matrix: [
            [r(1), r(0)],
            [r(0), r(1)],
          ],
        });
      }
      return Promise.resolve({ kind: 'error', message: 'mock: no answer' });
    },

    characteristicPoly(entries, _signal): Promise<PyPolyResult | PyError> {
      // char poly of [[2,0],[0,3]] = x^2 - 5x + 6; ascending: [6, -5, 1]
      if (key(entries) === diagKey()) {
        return Promise.resolve({ kind: 'success', coefficients: [r(6), r(-5), r(1)] });
      }
      // char poly of identity = (1-x)^2 = x^2 - 2x + 1; ascending: [1, -2, 1]
      if (key(entries) === identityKey()) {
        return Promise.resolve({ kind: 'success', coefficients: [r(1), r(-2), r(1)] });
      }
      return Promise.resolve({ kind: 'error', message: 'mock: no answer' });
    },

    minimalPoly(entries, _signal): Promise<PyPolyResult | PyError> {
      if (key(entries) === diagKey()) {
        return Promise.resolve({ kind: 'success', coefficients: [r(6), r(-5), r(1)] });
      }
      // min poly of identity = x - 1; ascending: [-1, 1]
      if (key(entries) === identityKey()) {
        return Promise.resolve({ kind: 'success', coefficients: [r(-1), r(1)] });
      }
      return Promise.resolve({ kind: 'error', message: 'mock: no answer' });
    },

    jordanForm(entries, _signal): Promise<PyJordanResult | PyError> {
      if (key(entries) === diagKey()) {
        return Promise.resolve({
          kind: 'success',
          J: [
            [r(2), r(0)],
            [r(0), r(3)],
          ],
          P: [
            [r(1), r(0)],
            [r(0), r(1)],
          ],
          blocks: [
            { eigenvalue: r(2), size: 1 },
            { eigenvalue: r(3), size: 1 },
          ],
        });
      }
      return Promise.resolve({ kind: 'error', message: 'mock: no answer' });
    },

    gramSchmidt(vectors, _signal): Promise<PyGramSchmidtResult | PyError> {
      return Promise.resolve({ kind: 'success', vectors: [...vectors] });
    },
  };
}
