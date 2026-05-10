// Layer 1: Computation Engine
//
// Public surface for downstream consumers (Layer 2+).
// Consumers receive a ComputationEngine via createEngine(adapter).
// In the browser, pass createPyodideAdapter() as the adapter.
// In tests, pass createMockAdapter().

export type {
  ComputationEngine,
  ExactNumerical,
  EigenResult,
  SVDResult,
  QRResult,
  InverseResult,
  JordanResult,
} from './engine.ts';
export { createEngine } from './engine.ts';
export type { Provenance, EigenValue, JordanBlock } from './types.ts';
export type { SymbolicAdapter } from './symbolic/protocol.ts';
export { serializeScalar, deserializeScalar, scalarProvenance } from './serialization/scalar.ts';
export { serializeMatrix, matrixProvenance } from './serialization/matrix.ts';
