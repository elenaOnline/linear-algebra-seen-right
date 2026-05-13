// Single source of truth for all renderer visual parameters.
// All renderers (Geometric2D, Geometric3D, Diagram, Chart, Matrix) import from here.
// The hex values here are the canonical values; tokens.css defines CSS custom properties
// using the same values for React components that use CSS variables.
//
// ESLint blocks hex literals in src/renderers/ — add new colors here, not inline.

export const DIAGRAM_THEME = {
  // ── Semantic roles ──────────────────────────────────────────────────────
  // These map directly to the --color-* tokens in tokens.css.
  colorInput: '#4a86c8', // blue   — free objects, map inputs
  colorDerived: '#a355b4', // purple — computed / derived objects
  colorBasis: '#3a8a6b', // green  — basis vectors, coordinate frames
  colorNullSpace: '#e8a84a', // amber  — kernel, null space
  colorImage: '#4ab4a3', // teal   — range / image
  colorNegative: '#c45c3a', // rust   — negated vectors, negative eigenvalues

  // ── Basis-axis colors (distinct per axis — standard x/y/z convention) ──
  colorBasisX: '#ef4444', // red   — x-axis / e₁
  colorBasisY: '#22c55e', // green — y-axis / e₂
  colorBasisZ: '#3b82f6', // blue  — z-axis / e₃

  // ── Plot infrastructure ─────────────────────────────────────────────────
  axisColor: '#64748b', // slate-500
  axisWeight: 1.5,
  gridColor: '#e2e8f0', // slate-200
  gridColorDeformed: '#bfdbfe', // blue-200
  gridWeight: 0.5,
  tickLabelColor: '#94a3b8', // slate-400
  vectorWeight: 2.0,
  arrowheadSize: 8,
  canvasBg: '#f8fafc', // near-white — Three.js scene background

  // ── Diagram node colors ─────────────────────────────────────────────────
  nodeKernel: '#fef3c7', // amber-100 fill
  nodeKernelStroke: '#f59e0b',
  nodeRange: '#ccfbf1', // teal-100 fill
  nodeRangeStroke: '#14b8a6',
  nodeEigenspace: '#ede9fe', // violet-100 fill
  nodeEigenspaceStroke: '#7c3aed',
  nodeDefault: '#f1f5f9', // slate-100 fill
  nodeDefaultStroke: '#94a3b8',
  nodeText: '#1e293b',

  // ── Chart colors ────────────────────────────────────────────────────────
  chartRankFill: '#4ab4a3', // = colorImage (rank = dim range)
  chartNullityFill: '#e8a84a', // = colorNullSpace (nullity = dim kernel)
  chartBarFill: '#60a5fa', // blue-400 — generic bar
  chartBarNumerical: '#93c5fd', // blue-300 — numerical provenance

  // ── Matrix heatmap ──────────────────────────────────────────────────────
  matrixHeatBase: '#4f46e5', // indigo-600 — max-intensity cell
  matrixTextDark: '#111827',
  matrixTextLight: '#ffffff',
  matrixLabelColor: '#6b7280',
  matrixValueColor: '#374151',
  matrixZeroLine: '#d1d5db',
} as const;
