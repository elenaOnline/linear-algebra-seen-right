import type { Matrix } from '../../types/index.ts';
import type { Field } from '../../types/field.ts';
import type { VectorExpression, MapExpression } from '../../types/derivation.ts';
export type { VectorExpression, MapExpression };

// Lexer tokens
export type TokenKind =
  | 'number'
  | 'ident'
  | 'plus'
  | 'minus'
  | 'star'
  | 'slash'
  | 'caret'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'comma'
  | 'semicolon'
  | 'equals'
  | 'eof';

export type Token = {
  readonly kind: TokenKind;
  readonly raw: string;
  readonly pos: number; // byte offset in source
};

// Parse results

export type ParseError = {
  readonly kind: 'error';
  readonly message: string;
  readonly pos: number;
  readonly length: number;
  readonly code: string;
};

// A parsed matrix (may produce a LinearMap or standalone Matrix)
export type ParsedMatrix = {
  readonly kind: 'matrix';
  readonly matrix: Matrix;
  readonly field: Field;
};

// A parsed vector
export type ParsedVector = {
  readonly kind: 'vector';
  readonly components: readonly number[];
  readonly field: Field;
};

// A parsed linear map formula: T(x, y) = (x+y, x-y)
export type ParsedFormula = {
  readonly kind: 'formula';
  readonly name: string; // "T"
  readonly params: readonly string[]; // ["x", "y"]
  readonly label: string; // original formula string for display
};

// Named-object expression results

export type ParsedVectorExpr = {
  readonly kind: 'vector-expr';
  readonly expression: VectorExpression;
};

export type ParsedMapExpr = {
  readonly kind: 'map-expr';
  readonly expression: MapExpression;
};

// When the same text is valid as multiple things
export type ParsedAmbiguous = {
  readonly kind: 'ambiguous';
  readonly alternatives: readonly ParseResult[];
};

export type ParseResult =
  | ParsedMatrix
  | ParsedVector
  | ParsedFormula
  | ParsedVectorExpr
  | ParsedMapExpr
  | ParsedAmbiguous
  | ParseError;
