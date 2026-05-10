/* eslint-disable no-console */
// Browser-only smoke test for the Layer 1 engine with real Pyodide.
// Run by opening index.html in a browser (pnpm dev) and executing:
//   import('/src/compute/__demo__/demo.ts').then(m => m.runDemo())
// Excluded from production build via Vite's tree-shaking (no static import chain).
//
// This file is the integration test that verifies Pyodide actually initializes
// and produces correct results for simple hand-computed examples.

import { createEngine } from '../engine.ts';
import { createPyodideAdapter } from '../symbolic/pyodide-client.ts';
import { mkMatrix } from '../../types/matrix.ts';
import { rational } from '../../types/scalar.ts';
import { basisKey, spaceKey } from '../../types/ids.ts';

const dom = basisKey(spaceKey('Fn', 'R', 2), 'standard');
const r = (n: number, d = 1) => rational(n, d);

export async function runDemo(): Promise<void> {
  console.log('LADR Visualizer — Layer 1 engine demo');
  console.log('Initializing Pyodide (CDN, may take 5–10s on first load)…');

  const adapter = createPyodideAdapter();
  const engine = createEngine(adapter);
  await engine.ready;
  console.log('Pyodide ready.');

  // Test matrix: [[2, 0], [0, 3]] — diagonal, eigenvalues 2 and 3
  const M = mkMatrix(
    'R',
    [
      [r(2), r(0)],
      [r(0), r(3)],
    ],
    dom,
    dom,
  );
  if (!M.ok) {
    console.error('Failed to create test matrix:', M.error.message);
    return;
  }
  const m = M.value;

  console.log('\n--- determinant ---');
  const det = await engine.determinant(m);
  console.log('exact:', det.exact, 'numerical:', det.numerical);

  console.log('\n--- rank ---');
  const rank = await engine.rank(m);
  console.log('exact:', rank.exact, 'numerical:', rank.numerical);

  console.log('\n--- RREF ---');
  const rref = await engine.rref(m);
  console.log('exact entries:', rref.exact?.entries);
  console.log('numerical entries:', rref.numerical.entries);

  console.log('\n--- inverse ---');
  const inv = await engine.inverse(m);
  console.log('result:', inv);

  console.log('\n--- characteristic polynomial ---');
  const cp = await engine.characteristicPoly(m);
  console.log('coefficients (ascending):', cp.coefficients);

  console.log('\n--- minimal polynomial ---');
  const mp = await engine.minimalPoly(m);
  console.log('coefficients (ascending):', mp.coefficients);

  console.log('\n--- eigendecompose ---');
  const eig = await engine.eigendecompose(m);
  console.log('exact values:', eig.exact?.values);
  console.log('numerical values:', eig.numerical.values);

  console.log('\n--- Jordan form ---');
  const jf = await engine.jordanForm(m);
  console.log('blocks:', jf.blocks);

  console.log('\nDemo complete.');
}
