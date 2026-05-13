import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'eslint.config.js',
      'vite.config.ts',
      'src/compute/__demo__/**',
    ],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'test/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs['recommended'].rules,
      ...tseslint.configs['recommended-type-checked'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      'no-console': 'warn',
    },
  },
  // Layer boundary enforcement: Layer 0 (types) must not import from higher layers.
  {
    files: ['src/types/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/state*', '../state/*'],
              message: 'Layer 0 must not import from Layer 2 (state)',
            },
            {
              group: ['*/compute*', '../compute/*'],
              message: 'Layer 0 must not import from Layer 1 (compute)',
            },
            {
              group: ['*/registry*', '../registry/*'],
              message: 'Layer 0 must not import from Layer 3 (registry)',
            },
            {
              group: ['*/renderers*', '../renderers/*'],
              message: 'Layer 0 must not import from Layer 4 (renderers)',
            },
            {
              group: ['*/interaction*', '../interaction/*'],
              message: 'Layer 0 must not import from Layer 5 (interaction)',
            },
            {
              group: ['*/pedagogy*', '../pedagogy/*'],
              message: 'Layer 0 must not import from Layer 6 (pedagogy)',
            },
            { group: ['*/ui*', '../ui/*'], message: 'Layer 0 must not import from the UI layer' },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Renderers (Layer 4) must not import state, compute, or higher layers.
  // Renderers are pure components — they consume RendererProps only.
  {
    files: ['src/renderers/**/*.ts', 'src/renderers/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/state*', '../state/*', '../../state/*'],
              message: 'Renderers must not import from Layer 2 (state) — consume props only',
            },
            {
              group: ['*/compute*', '../compute/*', '../../compute/*'],
              message: 'Renderers must not import from Layer 1 (compute) — consume props only',
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Layer 2 (state) must not import from Layer 3 or above.
  {
    files: ['src/state/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/registry*', '../registry/*'],
              message: 'Layer 2 must not import from Layer 3 (registry)',
            },
            {
              group: ['*/renderers*', '../renderers/*'],
              message: 'Layer 2 must not import from Layer 4 (renderers)',
            },
            {
              group: ['*/interaction*', '../interaction/*'],
              message: 'Layer 2 must not import from Layer 5 (interaction)',
            },
            {
              group: ['*/pedagogy*', '../pedagogy/*'],
              message: 'Layer 2 must not import from Layer 6 (pedagogy)',
            },
            { group: ['*/ui*', '../ui/*'], message: 'Layer 2 must not import from the UI layer' },
          ],
        },
      ],
    },
  },
  // Renderer color enforcement: no hardcoded hex literals in renderer files.
  // All colors must come from DIAGRAM_THEME (src/ui/theme/diagram.ts).
  {
    files: ['src/renderers/**/*.ts', 'src/renderers/**/*.tsx'],
    ignores: ['src/renderers/**/*.test.ts', 'src/renderers/**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/i]',
          message:
            'Hardcoded hex color in a renderer. Add the color to DIAGRAM_THEME in src/ui/theme/diagram.ts and reference it there.',
        },
      ],
    },
  },
];
