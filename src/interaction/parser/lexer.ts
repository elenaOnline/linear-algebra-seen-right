import type { Token, TokenKind } from './types.ts';

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    // Skip whitespace
    if (/\s/.test(src[i] ?? '')) {
      i++;
      continue;
    }

    const pos = i;
    const ch = src[i] ?? '';

    // Single-char tokens
    const single: Record<string, TokenKind> = {
      '+': 'plus',
      '-': 'minus',
      '*': 'star',
      '/': 'slash',
      '^': 'caret',
      '(': 'lparen',
      ')': 'rparen',
      '[': 'lbracket',
      ']': 'rbracket',
      ',': 'comma',
      ';': 'semicolon',
      '=': 'equals',
    };

    if (ch in single) {
      tokens.push({ kind: single[ch] as TokenKind, raw: ch, pos });
      i++;
      continue;
    }

    // Number (integer or decimal, optionally followed by 'i' for imaginary)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let raw = '';
      while (i < src.length && /[0-9.]/.test(src[i] ?? '')) {
        raw += src[i];
        i++;
      }
      // Accept trailing 'i' as part of the number token for complex literals
      if (src[i] === 'i') {
        raw += 'i';
        i++;
      }
      tokens.push({ kind: 'number', raw, pos });
      continue;
    }

    // Identifier (letters, digits, underscore — starts with letter)
    if (/[a-zA-Z_]/.test(ch)) {
      let raw = '';
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i] ?? '')) {
        raw += src[i];
        i++;
      }
      tokens.push({ kind: 'ident', raw, pos });
      continue;
    }

    // Unknown character — emit as ident with a special mark so the parser can error
    tokens.push({ kind: 'ident', raw: ch, pos });
    i++;
  }

  tokens.push({ kind: 'eof', raw: '', pos: src.length });
  return tokens;
}
