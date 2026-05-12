export type ExampleRef = {
  readonly templateId: string;
  readonly description: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
};

export type DefinitionRecord = {
  readonly id: string; // e.g. 'def-1.20-vector-space'
  readonly axlerRef: string; // e.g. '1.20'
  readonly title: string; // e.g. 'Vector Space'
  readonly chapter: number;
  readonly section: string; // e.g. '1.B'
  readonly formalStatement: string; // raw text (LaTeX inline with $...$)
  readonly plainStatement?: string;
  readonly prerequisites: readonly string[]; // def ids
  readonly linkedVisualizers: readonly string[];
  readonly examples: readonly ExampleRef[];
  readonly nonexamples: readonly ExampleRef[];
  readonly commonErrors?: readonly string[];
  readonly exerciseRefs?: readonly string[];
};
