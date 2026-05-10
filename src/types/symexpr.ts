// Opaque handle to a SymPy-side expression. Layer 1 populates these;
// Layer 0 only declares the shape. Consumers must not destructure internals —
// the serialized format is subject to change when Phase 2 builds the worker bridge.
export type SymExpr = {
  readonly kind: 'symexpr';
  readonly serialized: string;
  readonly vars: readonly string[];
};

export function mkSymExpr(serialized: string, vars: readonly string[]): SymExpr {
  return { kind: 'symexpr', serialized, vars: [...vars] };
}
