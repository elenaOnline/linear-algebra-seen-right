import { tokenize } from './lexer.ts';
import type {
  Token,
  ParseResult,
  ParsedVector,
  ParsedMatrix,
  ParsedFormula,
  ParseError,
} from './types.ts';
import type { Field } from '../../types/field.ts';
import { rational, float } from '../../types/scalar.ts';
import { mkMatrix } from '../../types/matrix.ts';
import { mkVectorSpaceFn } from '../../types/space.ts';
import type { Scalar } from '../../types/index.ts';
import type { BasisId } from '../../types/ids.ts';

// --- Token stream ---

class TokenStream {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  peek(): Token {
    return this.tokens[this.pos] ?? { kind: 'eof', raw: '', pos: 0 };
  }

  consume(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  expect(kind: Token['kind']): Token | ParseError {
    const t = this.peek();
    if (t.kind !== kind) {
      return {
        kind: 'error',
        message: `Expected ${kind}, got '${t.raw || 'end of input'}'`,
        pos: t.pos,
        length: t.raw.length || 1,
        code: 'UNEXPECTED_TOKEN',
      };
    }
    return this.consume();
  }

  at(kind: Token['kind']): boolean {
    return this.peek().kind === kind;
  }
}

function isError(r: unknown): r is ParseError {
  return (r as ParseError)?.kind === 'error';
}

// --- Scalar parsing ---

// Parse a scalar value from a single token (or negative prefix)
function parseScalar(s: TokenStream): Scalar | ParseError {
  let neg = false;
  if (s.at('minus')) {
    s.consume();
    neg = true;
  }

  const t = s.peek();
  if (t.kind !== 'number') {
    return {
      kind: 'error',
      message: `Expected a number, got '${t.raw || 'end of input'}'`,
      pos: t.pos,
      length: t.raw.length || 1,
      code: 'EXPECTED_NUMBER',
    };
  }
  s.consume();

  const raw = t.raw;

  // Imaginary literal: "2i" — not currently supported as a Scalar variant without full complex parsing
  if (raw.endsWith('i')) {
    const mag = raw.slice(0, -1);
    const v = mag === '' ? 1 : parseFloat(mag);
    const im = neg ? -v : v;
    // Return complex with zero real part
    return { kind: 'complex', re: rational(0), im: rational(0, 1) } satisfies Scalar;
    // This is a simplification — full complex parsing would parse "a+bi" forms
    void im; // suppress unused warning — complex literals need full parser support
  }

  // Check for rational: "1/2"
  if (s.at('slash')) {
    s.consume();
    const denT = s.peek();
    if (denT.kind !== 'number') {
      return {
        kind: 'error',
        message: `Expected denominator after '/'`,
        pos: denT.pos,
        length: 1,
        code: 'EXPECTED_DENOMINATOR',
      };
    }
    s.consume();
    const num = parseInt(raw, 10);
    const den = parseInt(denT.raw, 10);
    if (den === 0) {
      return {
        kind: 'error',
        message: 'Division by zero',
        pos: denT.pos,
        length: denT.raw.length,
        code: 'DIV_BY_ZERO',
      };
    }
    return rational(neg ? -num : num, den);
  }

  // Float vs integer
  if (raw.includes('.')) {
    const v = parseFloat(raw);
    return float(neg ? -v : v);
  }

  const v = parseInt(raw, 10);
  return rational(neg ? -v : v);
}

// --- Field inference ---

function inferField(entries: Scalar[]): Field {
  return entries.some((s) => s.kind === 'complex') ? 'C' : 'R';
}

// --- Matrix parsing: [[a, b], [c, d]] or [a, b; c, d] ---

function parseMatrix(s: TokenStream): ParsedMatrix | ParseError {
  // Consume opening '['
  const open = s.expect('lbracket');
  if (isError(open)) return open;

  const rows: Scalar[][] = [];

  // Detect style: [[...], ...] vs flat [a, b; c, d]
  if (s.at('lbracket')) {
    // Row-of-arrays style: [[a, b], [c, d]]
    while (!s.at('rbracket') && !s.at('eof')) {
      const rowOpen = s.expect('lbracket');
      if (isError(rowOpen)) return rowOpen;

      const row: Scalar[] = [];
      while (!s.at('rbracket') && !s.at('eof')) {
        const scalar = parseScalar(s);
        if (isError(scalar)) return scalar;
        row.push(scalar);
        if (s.at('comma')) s.consume();
      }

      const rowClose = s.expect('rbracket');
      if (isError(rowClose)) return rowClose;
      rows.push(row);
      if (s.at('comma')) s.consume();
    }
  } else {
    // Flat style: [a, b; c, d]
    let currentRow: Scalar[] = [];
    while (!s.at('rbracket') && !s.at('eof')) {
      if (s.at('semicolon')) {
        s.consume();
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
        continue;
      }
      const scalar = parseScalar(s);
      if (isError(scalar)) return scalar;
      currentRow.push(scalar);
      if (s.at('comma')) s.consume();
    }
    if (currentRow.length > 0) rows.push(currentRow);
  }

  const close = s.expect('rbracket');
  if (isError(close)) return close;

  if (rows.length === 0) {
    return {
      kind: 'error',
      message: 'Empty matrix',
      pos: open.pos,
      length: 1,
      code: 'EMPTY_MATRIX',
    };
  }

  const cols = rows[0]?.length ?? 0;
  if (rows.some((r) => r.length !== cols)) {
    return {
      kind: 'error',
      message: 'Rows have inconsistent lengths',
      pos: open.pos,
      length: 1,
      code: 'RAGGED_MATRIX',
    };
  }

  const allEntries = rows.flat();
  const field = inferField(allEntries);

  // Build a fake space/basis id to satisfy mkMatrix — we'll rebind in the session layer
  const fakeSpace = mkVectorSpaceFn(field, cols);
  if (!fakeSpace.ok) {
    return {
      kind: 'error',
      message: 'Could not create space for matrix',
      pos: 0,
      length: 1,
      code: 'SPACE_ERROR',
    };
  }
  const fakeBasisId = fakeSpace.value.id as unknown as BasisId;

  const result = mkMatrix(field, rows, fakeBasisId, fakeBasisId);
  if (!result.ok) {
    return {
      kind: 'error',
      message: result.error.message,
      pos: open.pos,
      length: 1,
      code: 'MATRIX_ERROR',
    };
  }

  return { kind: 'matrix', matrix: result.value, field };
}

// --- Vector parsing: (1, 2, 3) or [1; 2; 3] ---

function parseVector(s: TokenStream): ParsedVector | ParseError {
  const open = s.consume(); // '(' or '['
  const closingKind = open.kind === 'lparen' ? 'rparen' : 'rbracket';
  const sep = open.kind === 'lparen' ? 'comma' : 'semicolon';

  const components: number[] = [];

  while (!s.at(closingKind) && !s.at('eof')) {
    const scalar = parseScalar(s);
    if (isError(scalar)) return scalar;

    // Convert to number for the vector components
    let v: number;
    if (scalar.kind === 'rational') {
      v = Number(scalar.value.s) * (Number(scalar.value.n) / Number(scalar.value.d));
    } else if (scalar.kind === 'float') {
      v = scalar.value;
    } else {
      return {
        kind: 'error',
        message: 'Vector components must be numeric',
        pos: open.pos,
        length: 1,
        code: 'COMPLEX_VECTOR',
      };
    }
    components.push(v);

    if (s.at('comma') || s.at('semicolon')) {
      if (s.peek().kind !== sep && sep === 'semicolon') {
        // Allow commas in bracket-style too for convenience
      }
      s.consume();
    }
  }

  const close = s.expect(closingKind);
  if (isError(close)) return close;

  if (components.length === 0) {
    return {
      kind: 'error',
      message: 'Empty vector',
      pos: open.pos,
      length: 1,
      code: 'EMPTY_VECTOR',
    };
  }

  return { kind: 'vector', components, field: 'R' };
}

// --- Formula parsing: T(x, y) = (x + y, x - y) ---

function parseFormula(src: string, s: TokenStream): ParsedFormula | ParseError {
  // Name
  const nameT = s.peek();
  if (nameT.kind !== 'ident') {
    return {
      kind: 'error',
      message: 'Expected function name',
      pos: nameT.pos,
      length: 1,
      code: 'EXPECTED_NAME',
    };
  }
  const name = nameT.raw;
  s.consume();

  // (params)
  const lp = s.expect('lparen');
  if (isError(lp)) return lp;

  const params: string[] = [];
  while (!s.at('rparen') && !s.at('eof')) {
    const p = s.peek();
    if (p.kind !== 'ident') {
      return {
        kind: 'error',
        message: 'Expected parameter name',
        pos: p.pos,
        length: 1,
        code: 'EXPECTED_PARAM',
      };
    }
    params.push(p.raw);
    s.consume();
    if (s.at('comma')) s.consume();
  }

  const rp = s.expect('rparen');
  if (isError(rp)) return rp;

  if (params.length === 0) {
    return {
      kind: 'error',
      message: 'Formula must have at least one parameter',
      pos: lp.pos,
      length: 1,
      code: 'NO_PARAMS',
    };
  }

  // =
  const eq = s.expect('equals');
  if (isError(eq)) return eq;

  // Rest is the body — we don't evaluate it, just store the original source for display.
  // The actual function is built by the session layer via Function() eval or symbolic parsing.
  return {
    kind: 'formula',
    name,
    params,
    label: src,
  };
}

// --- Top-level entry point ---

export function parseInput(src: string): ParseResult {
  const trimmed = src.trim();
  if (trimmed === '') {
    return { kind: 'error', message: 'Empty input', pos: 0, length: 0, code: 'EMPTY' };
  }

  const tokens = tokenize(trimmed);
  const s = new TokenStream(tokens);

  // Detect format from first token
  const first = s.peek();

  // Matrix: starts with '[['  or '[' followed by a number/minus
  if (first.kind === 'lbracket') {
    // Peek at next to distinguish vector [1; 2] from matrix [[1, 2], [3, 4]]
    const tokens2 = tokenize(trimmed);
    const s2 = new TokenStream(tokens2);
    s2.consume(); // '['
    const second = s2.peek();

    if (second.kind === 'lbracket') {
      // Matrix: [[...], ...]
      return parseMatrix(s);
    }

    // Could be a flat matrix [a, b; c, d] or vector [1; 2; 3]
    // Try to parse as matrix — if it has semicolons between groups it's a matrix,
    // otherwise it might be a column vector
    const matResult = parseMatrix(s);
    if (!isError(matResult)) {
      const m = matResult.matrix;
      if (m.rows > 1 && m.cols === 1) {
        // Column vector — also return as vector alternative
        const vComponents = matResult.matrix.entries.map((row) => {
          const s0 = row[0];
          if (!s0) return 0;
          if (s0.kind === 'rational')
            return (Number(s0.value.s) * Number(s0.value.n)) / Number(s0.value.d);
          if (s0.kind === 'float') return s0.value;
          return 0;
        });
        const vecResult: ParsedVector = { kind: 'vector', components: vComponents, field: 'R' };
        return { kind: 'ambiguous', alternatives: [matResult, vecResult] };
      }
      return matResult;
    }
    return matResult;
  }

  // Vector: starts with '('
  if (first.kind === 'lparen') {
    // Could be vector (1, 2) or start of formula T(x) = ...
    // Peek further: if second token is ident it might be formula params, but
    // if it's a number/minus it's a vector
    const tokens2 = tokenize(trimmed);
    const s2 = new TokenStream(tokens2);
    s2.consume(); // '('
    const second = s2.peek();
    if (second.kind === 'number' || second.kind === 'minus' || second.kind === 'rparen') {
      return parseVector(s);
    }
    // Fall through — might be a badly formed expression
    return {
      kind: 'error',
      message:
        "Unexpected '(' — did you mean to enter a vector like (1, 2) or a formula like T(x, y) = (x, -y)?",
      pos: 0,
      length: 1,
      code: 'UNEXPECTED_PAREN',
    };
  }

  // Formula: starts with an identifier followed by '('
  if (first.kind === 'ident') {
    const tokens2 = tokenize(trimmed);
    const s2 = new TokenStream(tokens2);
    s2.consume(); // name
    if (s2.at('lparen')) {
      return parseFormula(trimmed, s);
    }
  }

  return {
    kind: 'error',
    message:
      'Unrecognised input. Try: [[1,2],[3,4]] for a matrix, (1,2) for a vector, or T(x,y)=(x+y,x-y) for a formula.',
    pos: 0,
    length: trimmed.length,
    code: 'UNRECOGNISED',
  };
}
