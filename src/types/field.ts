export type Field = 'R' | 'C';

export function isField(s: unknown): s is Field {
  return s === 'R' || s === 'C';
}
