// Pyodide + SymPy Web Worker — browser only.
// Loaded via: new Worker(new URL('./sympy.worker.ts', import.meta.url), { type: 'module' })
// Exposed via comlink; consumers use PyodideWorkerClient in symbolic/pyodide-client.ts.
//
// Pyodide is loaded from CDN (ADR-009). SymPy is ~10MB; this cold-start cost is
// acknowledged in the architecture and surfaced via engine.ready.

import { expose } from 'comlink';

// CDN URL pinned to a stable Pyodide release (ADR-009).
// Update this string when upgrading Pyodide; test on a Netlify preview first.
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs';

// Python module string evaluated once on initialization.
// Implements the SymPy-side bridge: deserialization, computation, reserialization.
const PYTHON_MODULE = `
import sympy as sp
import json

def _d(s):
    """Deserialize a JSON scalar dict to a SymPy expression."""
    k = s['kind']
    if k == 'rational':
        return sp.Rational(int(s['n']), int(s['d']))
    if k == 'float':
        return sp.Float(s['v'])
    if k == 'complex':
        return _d(s['re']) + sp.I * _d(s['im'])
    if k == 'algebraic':
        x = sp.Symbol('_x')
        coeffs = [_d(c) for c in s['minpoly']]
        poly = sum(coeffs[i] * x**i for i in range(len(coeffs)))
        try:
            return sp.AlgebraicNumber((sp.Poly(poly, x), sp.Float(s['approx'])))
        except Exception:
            return sp.Float(s['approx'])
    if k == 'symbolic':
        return sp.sympify(s['serialized'])
    return sp.Integer(0)

def _s(expr):
    """Serialize a SymPy expression to a JSON scalar dict."""
    try:
        expr = sp.nsimplify(expr, rational=True, tolerance=1e-10)
    except Exception:
        pass
    if isinstance(expr, sp.Integer):
        return {'kind': 'rational', 'n': int(expr), 'd': 1}
    if isinstance(expr, sp.Rational):
        return {'kind': 'rational', 'n': int(expr.p), 'd': int(expr.q)}
    if isinstance(expr, sp.Float):
        return {'kind': 'float', 'v': float(expr)}
    if expr.is_real == False or (hasattr(expr, 'is_real') and expr.is_real is False):
        try:
            re, im = expr.as_real_imag()
            return {'kind': 'complex', 're': _s(re), 'im': _s(im)}
        except Exception:
            pass
    fs = expr.free_symbols
    return {'kind': 'symbolic', 'serialized': str(sp.srepr(expr)), 'vars': [str(v) for v in fs]}

def _dm(rows):
    """Deserialize a list-of-lists to a SymPy Matrix."""
    return sp.Matrix([[_d(c) for c in row] for row in rows])

def _sm(M):
    """Serialize a SymPy Matrix to a list-of-lists."""
    return [[_s(M[r, c]) for c in range(M.cols)] for r in range(M.rows)]

def eigendecompose(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    try:
        evects = M.eigenvects()
        values = [{'value': _s(val), 'multiplicity': int(mult)} for val, mult, _ in evects]
        vectors = [
            [_s(v[i, 0]) for i in range(v.rows)]
            for _, _, vecs in evects for v in vecs
        ]
        return json.dumps({'kind': 'success', 'values': values, 'vectors': vectors})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def null_space(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    try:
        ns = M.nullspace()
        vecs = [[_s(v[i, 0]) for i in range(v.rows)] for v in ns]
        return json.dumps({'kind': 'success', 'vectors': vecs})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def rank(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    try:
        return json.dumps({'kind': 'success', 'rank': int(M.rank())})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def rref(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    try:
        R, pivots = M.rref()
        return json.dumps({'kind': 'success', 'matrix': _sm(R), 'pivots': list(pivots)})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def determinant(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    try:
        return json.dumps({'kind': 'success', 'det': _s(M.det())})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def inverse(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    try:
        if M.det() == 0:
            return json.dumps({'kind': 'singular'})
        return json.dumps({'kind': 'success', 'matrix': _sm(M.inv())})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def characteristic_poly(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    x = sp.Symbol('x')
    try:
        p = M.charpoly(x)
        coeffs = [_s(c) for c in reversed(p.all_coeffs())]  # ascending order
        return json.dumps({'kind': 'success', 'coefficients': coeffs})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def minimal_poly(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    x = sp.Symbol('x')
    try:
        p = M.minpoly(x)
        coeffs = [_s(c) for c in reversed(p.all_coeffs())]  # ascending order
        return json.dumps({'kind': 'success', 'coefficients': coeffs})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def jordan_form(rows_json):
    rows = json.loads(rows_json)
    M = _dm(rows)
    try:
        J, P = M.jordan_form()
        blocks = []
        n = J.shape[0]
        i = 0
        while i < n:
            ev = J[i, i]
            size = 1
            while i + size < n and J[i + size, i + size] == ev and abs(J[i + size - 1, i + size] - 1) < 1e-10:
                size += 1
            blocks.append({'eigenvalue': _s(ev), 'size': size})
            i += size
        return json.dumps({'kind': 'success', 'J': _sm(J), 'P': _sm(P), 'blocks': blocks})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})

def gram_schmidt(vecs_json):
    vecs_raw = json.loads(vecs_json)
    try:
        vecs = [sp.Matrix([_d(c) for c in row]) for row in vecs_raw]
        gs = sp.GramSchmidt(vecs)
        result = [[_s(v[i, 0]) for i in range(v.rows)] for v in gs]
        return json.dumps({'kind': 'success', 'vectors': result})
    except Exception as e:
        return json.dumps({'kind': 'error', 'message': str(e)})
`;

type PyodideType = {
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => (...args: unknown[]) => string };
};

let _pyodide: PyodideType | null = null;

async function initializePyodide(): Promise<PyodideType> {
  // Dynamic import of the CDN module — standard pattern for Pyodide in ES module workers
  const { loadPyodide } = (await import(/* @vite-ignore */ PYODIDE_CDN)) as {
    loadPyodide: (opts: Record<string, unknown>) => Promise<PyodideType>;
  };

  const pyodide = await loadPyodide({ indexURL: PYODIDE_CDN.replace('pyodide.mjs', '') });
  await pyodide.runPython(`
import micropip
await micropip.install('sympy')
  `);
  pyodide.runPython(PYTHON_MODULE);
  return pyodide;
}

let _readyPromise: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (_readyPromise === null) {
    _readyPromise = initializePyodide().then((py) => {
      _pyodide = py;
    });
  }
  return _readyPromise;
}

function callPy(fnName: string, jsonArg: string): unknown {
  if (_pyodide === null) throw new Error('Pyodide not initialized');
  const fn = _pyodide.globals.get(fnName);
  return fn(jsonArg);
}

const workerApi = {
  ready: ensureReady(),

  async eigendecompose(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('eigendecompose', JSON.stringify(entries)) as string);
  },

  async nullSpace(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('null_space', JSON.stringify(entries)) as string);
  },

  async rank(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('rank', JSON.stringify(entries)) as string);
  },

  async rref(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('rref', JSON.stringify(entries)) as string);
  },

  async determinant(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('determinant', JSON.stringify(entries)) as string);
  },

  async inverse(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('inverse', JSON.stringify(entries)) as string);
  },

  async characteristicPoly(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('characteristic_poly', JSON.stringify(entries)) as string);
  },

  async minimalPoly(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('minimal_poly', JSON.stringify(entries)) as string);
  },

  async jordanForm(entries: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('jordan_form', JSON.stringify(entries)) as string);
  },

  async gramSchmidt(vectors: unknown[][], _signal?: AbortSignal): Promise<unknown> {
    await ensureReady();
    return JSON.parse(callPy('gram_schmidt', JSON.stringify(vectors)) as string);
  },
};

expose(workerApi);
