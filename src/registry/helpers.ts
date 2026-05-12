import type { VectorSpace, LinearMap, Matrix, Scalar } from '../types/index.ts';
import type { SessionView } from '../types/session-view.ts';
import { dim } from '../types/space.ts';
import type { MatrixProps } from './types.ts';

// --- Applicability helpers ---

export function mapDim(map: LinearMap, which: 'domain' | 'codomain', session: SessionView): number {
  const spaceId = which === 'domain' ? map.domain : map.codomain;
  const space = session.getSpace(spaceId);
  if (!space) return -1;
  const d = dim(space, session);
  return d === 'infinite' ? -1 : d;
}

// --- Scalar helpers ---

export function scalarToLatex(s: Scalar): string {
  switch (s.kind) {
    case 'rational': {
      const f = s.value;
      // Fraction.js v5: .s, .n, .d are bigint. .s is sign (1n or -1n), .n is unsigned magnitude.
      if (f.d === 1n) return f.s < 0n ? `-${String(f.n)}` : String(f.n);
      if (f.s < 0n) return `-\\frac{${String(f.n)}}{${String(f.d)}}`;
      return `\\frac{${String(f.n)}}{${String(f.d)}}`;
    }
    case 'float':
      return String(parseFloat(s.value.toPrecision(4)));
    case 'algebraic':
      return String(parseFloat(s.approx.toPrecision(4)));
    case 'complex': {
      const re = scalarToLatex(s.re);
      const im = scalarToLatex(s.im);
      return `${re} + ${im}i`;
    }
    case 'symbolic':
      return s.expr.serialized;
  }
}

export function concreteVectorToLatex(components: readonly Scalar[]): string {
  if (components.length === 0) return '\\mathbf{0}';
  const entries = components.map(scalarToLatex).join(' \\\\ ');
  return `\\begin{pmatrix} ${entries} \\end{pmatrix}`;
}

export function scalarToNumber(s: Scalar): number {
  switch (s.kind) {
    case 'rational':
      return Number(s.value.s) * (Number(s.value.n) / Number(s.value.d));
    case 'float':
      return s.value;
    case 'algebraic':
      return s.approx;
    case 'complex':
      return scalarToNumber(s.re);
    case 'symbolic':
      return NaN;
  }
}

// Gaussian elimination rank over floats.
export function computeRank(matrix: Matrix): number {
  const rows = matrix.entries.map((row) => row.map(scalarToNumber));
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  if (m === 0 || n === 0) return 0;

  let rank = 0;
  let pivotRow = 0;
  for (let col = 0; col < n && pivotRow < m; col++) {
    let maxVal = 0;
    let maxRow = -1;
    for (let r = pivotRow; r < m; r++) {
      const v = Math.abs(rows[r]?.[col] ?? 0);
      if (v > maxVal) {
        maxVal = v;
        maxRow = r;
      }
    }
    if (maxVal < 1e-10 || maxRow === -1) continue;

    const tmp = rows[pivotRow];
    rows[pivotRow] = rows[maxRow] ?? [];
    rows[maxRow] = tmp ?? [];

    const pivotVal = rows[pivotRow]?.[col] ?? 1;
    for (let r = pivotRow + 1; r < m; r++) {
      const factor = (rows[r]?.[col] ?? 0) / pivotVal;
      for (let c = col; c < n; c++) {
        const rv = rows[r];
        if (rv) rv[c] = (rv[c] ?? 0) - factor * (rows[pivotRow]?.[c] ?? 0);
      }
    }
    rank++;
    pivotRow++;
  }
  return rank;
}

// Determinant via cofactor expansion (float arithmetic).
export function computeDet(matrix: Matrix): number {
  const n = matrix.rows;
  if (n !== matrix.cols) return NaN;
  const rows = matrix.entries.map((row) => row.map(scalarToNumber));
  return detRecursive(rows, n);
}

function detRecursive(rows: number[][], n: number): number {
  if (n === 1) return rows[0]?.[0] ?? 0;
  if (n === 2)
    return (rows[0]?.[0] ?? 0) * (rows[1]?.[1] ?? 0) - (rows[0]?.[1] ?? 0) * (rows[1]?.[0] ?? 0);
  let det = 0;
  for (let c = 0; c < n; c++) {
    const sub = rows.slice(1).map((row) => row.filter((_, j) => j !== c));
    det += (rows[0]?.[c] ?? 0) * (c % 2 === 0 ? 1 : -1) * detRecursive(sub, n - 1);
  }
  return det;
}

// --- Space label helpers ---

export function spaceDimLabel(d: number | 'infinite'): string {
  return d === 'infinite' ? '∞' : String(d);
}

// LaTeX format — for KaTeX consumers (SymbolicRenderer).
export function spaceToLatex(space: VectorSpace): string {
  const field = space.field === 'R' ? '\\mathbb{R}' : '\\mathbb{C}';
  switch (space.kind) {
    case 'Fn':
      return `${field}^{${String(space.n)}}`;
    case 'polynomial':
      return space.maxDegree === null
        ? `\\mathcal{P}(${field})`
        : `\\mathcal{P}_{${String(space.maxDegree)}}(${field})`;
    case 'matrix_space':
      return `\\mathcal{M}_{${String(space.m)} \\times ${String(space.n)}}(${field})`;
    case 'abstract':
      return space.label;
    default:
      return field;
  }
}

// Plain-text Unicode format — for SVG diagram nodes (DiagramRenderer).
export function spaceToDiagramLabel(space: VectorSpace): string {
  const F = space.field === 'R' ? 'ℝ' : 'ℂ';
  switch (space.kind) {
    case 'Fn':
      return space.n === 0 ? '{0}' : `${F}${space.n > 1 ? String(space.n) : ''}`;
    case 'polynomial':
      return space.maxDegree === null ? `P(${F})` : `P_${String(space.maxDegree)}(${F})`;
    case 'matrix_space':
      return `M_{${String(space.m)}×${String(space.n)}}(${F})`;
    case 'abstract':
      return space.label;
    default:
      return F;
  }
}

// --- Matrix toProps helper ---

export function matrixToProps(
  matrix: Matrix,
  objectId: string,
  provenance: 'exact' | 'numerical',
): MatrixProps {
  const allValues = matrix.entries.flat().map(scalarToNumber).filter(isFinite);
  const maxAbs = allValues.length > 0 ? Math.max(...allValues.map(Math.abs)) : 1;

  const entries = matrix.entries.map((row) => row.map(scalarToLatex));
  const heatmapData =
    maxAbs > 0
      ? matrix.entries.map((row) => row.map((s) => Math.abs(scalarToNumber(s)) / maxAbs))
      : null;

  const base: MatrixProps = {
    renderer: 'matrix',
    objectId,
    rows: matrix.rows,
    cols: matrix.cols,
    entries,
    provenance,
  };

  return heatmapData !== null ? { ...base, heatmap: heatmapData } : base;
}
