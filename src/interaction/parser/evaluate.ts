// Evaluates the body of a linear-map formula by substituting variable bindings.
//
// A formula body looks like "(x + y, x - y)" — a paren-wrapped comma-separated
// list of arithmetic expressions. Each expression may contain variable names,
// rational literals, addition, subtraction, unary minus, and scalar multiplication.
// Non-linear terms (variable * variable) produce an error at evaluation time.
//
// Usage: extract the body from the full formula string (everything after '='),
// then call evaluateFormulaBody(body, params, binding) to get the output vector.

import { tokenize } from './lexer.ts';
import type { Token } from './types.ts';

type EvalError = { ok: false; message: string };
type EvalOk = { ok: true; value: number };
type EvalResult = EvalOk | EvalError;

function evalOk(value: number): EvalOk {
  return { ok: true, value };
}
function evalErr(message: string): EvalError {
  return { ok: false, message };
}
function isErr(r: EvalResult): r is EvalError {
  return !r.ok;
}

// --- Token stream for evaluator ---

class EvalStream {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}
  peek(): Token {
    return this.tokens[this.pos] ?? { kind: 'eof', raw: '', pos: 0 };
  }
  consume(): Token {
    return this.tokens[this.pos++] ?? { kind: 'eof', raw: '', pos: 0 };
  }
  at(kind: Token['kind']): boolean {
    return this.peek().kind === kind;
  }
}

// --- Recursive-descent arithmetic evaluator ---
// Grammar:
//   expr    ::= term ( ('+' | '-') term )*
//   term    ::= power ( ('*' | '/') power )*
//   power   ::= unary ( '^' power )?   — right-associative
//   unary   ::= '-' unary | primary
//   primary ::= number | ident | '(' expr ')'

function parseExpr(s: EvalStream, vars: Record<string, number>): EvalResult {
  let left = parseTerm(s, vars);
  if (isErr(left)) return left;
  while (s.at('plus') || s.at('minus')) {
    const op = s.consume().kind;
    const right = parseTerm(s, vars);
    if (isErr(right)) return right;
    left = evalOk(op === 'plus' ? left.value + right.value : left.value - right.value);
  }
  return left;
}

function parseTerm(s: EvalStream, vars: Record<string, number>): EvalResult {
  let left = parsePower(s, vars);
  if (isErr(left)) return left;
  while (s.at('star') || s.at('slash')) {
    const op = s.consume().kind;
    const right = parsePower(s, vars);
    if (isErr(right)) return right;
    if (op === 'slash' && right.value === 0) return evalErr('Division by zero');
    left = evalOk(op === 'star' ? left.value * right.value : left.value / right.value);
  }
  return left;
}

function parsePower(s: EvalStream, vars: Record<string, number>): EvalResult {
  const base = parseUnary(s, vars);
  if (isErr(base)) return base;
  if (s.at('caret')) {
    s.consume();
    const exp = parsePower(s, vars); // right-associative: 2^3^4 = 2^(3^4)
    if (isErr(exp)) return exp;
    return evalOk(Math.pow(base.value, exp.value));
  }
  return base;
}

function parseUnary(s: EvalStream, vars: Record<string, number>): EvalResult {
  if (s.at('minus')) {
    s.consume();
    const r = parseUnary(s, vars);
    if (isErr(r)) return r;
    return evalOk(-r.value);
  }
  return parsePrimary(s, vars);
}

function parsePrimary(s: EvalStream, vars: Record<string, number>): EvalResult {
  const t = s.peek();

  if (t.kind === 'number') {
    s.consume();
    const raw = t.raw;
    if (raw.endsWith('i')) return evalErr('Complex literals not supported in formula bodies');
    const v = raw.includes('.') ? parseFloat(raw) : parseInt(raw, 10);
    if (!isFinite(v)) return evalErr(`Invalid number: ${raw}`);
    // Check for rational: number / number
    if (s.at('slash')) {
      s.consume();
      const denT = s.peek();
      if (denT.kind !== 'number') return evalErr('Expected denominator');
      s.consume();
      const den = parseInt(denT.raw, 10);
      if (den === 0) return evalErr('Division by zero');
      return evalOk(v / den);
    }
    return evalOk(v);
  }

  if (t.kind === 'ident') {
    s.consume();
    const val = vars[t.raw];
    if (val === undefined) return evalErr(`Unknown variable '${t.raw}'`);
    return evalOk(val);
  }

  if (t.kind === 'lparen') {
    s.consume();
    const inner = parseExpr(s, vars);
    if (isErr(inner)) return inner;
    if (!s.at('rparen')) return evalErr("Expected ')'");
    s.consume();
    return inner;
  }

  return evalErr(`Unexpected token '${t.raw || 'end of input'}'`);
}

// --- Public API ---

/**
 * Extract the formula body from a full formula string like "T(x, y) = (x + y, x - y)".
 * Returns everything after the '=' sign, trimmed.
 */
export function extractFormulaBody(formulaStr: string): string {
  const eqIdx = formulaStr.indexOf('=');
  if (eqIdx === -1) return formulaStr.trim();
  return formulaStr.slice(eqIdx + 1).trim();
}

/**
 * Evaluate a formula body like "(x + y, x - y)" with variable bindings like {x: 1, y: 0}.
 * Returns the output vector as an array of numbers, or an error message.
 */
export function evaluateFormulaBody(body: string, vars: Record<string, number>): number[] | string {
  const trimmed = body.trim();
  if (!trimmed.startsWith('(')) {
    return `Formula body must start with '(' — got: ${trimmed.slice(0, 20)}`;
  }

  // Strip outer parens and split on commas at depth 0
  const inner = trimmed.slice(1);
  const exprs: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++;
    else if (inner[i] === ')') {
      if (depth === 0) {
        exprs.push(inner.slice(start, i));
        break;
      }
      depth--;
    } else if (inner[i] === ',' && depth === 0) {
      exprs.push(inner.slice(start, i));
      start = i + 1;
    }
  }

  if (exprs.length === 0) return 'Empty formula body';

  const results: number[] = [];
  for (const exprStr of exprs) {
    const tokens = tokenize(exprStr.trim());
    const s = new EvalStream(tokens);
    const result = parseExpr(s, vars);
    if (isErr(result)) return result.message;
    if (!s.at('eof')) return `Unexpected tokens after expression: '${s.peek().raw}'`;
    results.push(result.value);
  }
  return results;
}
