import { createEngine } from './engine.ts';
import type { ComputationEngine } from './engine.ts';
import { createMockAdapter } from './symbolic/mock-adapter.ts';
import { createPyodideAdapter } from './symbolic/pyodide-client.ts';

// Vitest sets import.meta.env.MODE to 'test'; Vite sets it to 'development' or 'production'.
const isTest =
  typeof import.meta !== 'undefined' &&
  (import.meta as { env?: { MODE?: string } }).env?.MODE === 'test';

// Singleton engine — shared across all computation calls in the app.
// Use `await engine.ready` before making symbolic computation calls.
let _engine: ComputationEngine | null = null;

function buildEngine(): ComputationEngine {
  const adapter = isTest ? createMockAdapter() : createPyodideAdapter();
  return createEngine(adapter);
}

export function getEngine(): ComputationEngine {
  if (_engine === null) {
    _engine = buildEngine();
  }
  return _engine;
}

// For tests only — reset so each test gets a fresh instance.
export function _resetEngine(): void {
  _engine = null;
}
