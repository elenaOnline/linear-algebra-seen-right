// Build script: parses LADR_Definitions/ markdown files → src/pedagogy/definitions/generated.ts
// Run with: pnpm build:definitions
// Uses unified + remark-parse (ADR-016). Merge strategy: field-level replace from overrides.

import { readFileSync, readdirSync, writeFileSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root, Heading, Blockquote } from 'mdast';
import type { DefinitionRecord } from '../src/pedagogy/definitions/types.ts';
import { DEFINITION_OVERRIDES } from '../src/pedagogy/definitions/overrides.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DEFS_DIR = join(REPO_ROOT, 'LADR_Definitions');
const OUT_FILE = join(REPO_ROOT, 'src', 'pedagogy', 'definitions', 'generated.ts');

// ── Helpers ──────────────────────────────────────────────────────────────

function extractText(node: { children?: unknown[] }): string {
  if (!node.children) return '';
  return (node.children as Array<{ type: string; value?: string; children?: unknown[] }>)
    .map((child) => {
      if (child.type === 'text' || child.type === 'inlineCode') return child.value ?? '';
      if (child.children) return extractText(child as { children: unknown[] });
      return '';
    })
    .join('');
}

function chapterFromFolderName(folder: string): number {
  const m = folder.match(/^Chapter_(\d+)_/);
  return m ? parseInt(m[1]!, 10) : 0;
}

function slugFromFilename(filename: string): string {
  // '1.20_vector_space.md' → 'vector-space'
  return basename(filename, '.md')
    .replace(/^\d+\.\d+_/, '')
    .replace(/_/g, '-')
    .toLowerCase();
}

function axlerRefFromFilename(filename: string): string {
  const m = basename(filename, '.md').match(/^(\d+\.\d+)/);
  return m ? m[1]! : '';
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function makeId(axlerRef: string, slug: string): string {
  return `def-${axlerRef}-${slug}`;
}

// ── Parse a single markdown file ─────────────────────────────────────────

function parseDefinitionFile(
  filepath: string,
  chapter: number,
): Omit<
  DefinitionRecord,
  'section' | 'linkedVisualizers' | 'prerequisites' | 'examples' | 'nonexamples'
> {
  const src = readFileSync(filepath, 'utf-8');
  const file = basename(filepath);
  const axlerRef = axlerRefFromFilename(file);
  const slug = slugFromFilename(file);
  const id = makeId(axlerRef, slug);

  const tree = unified().use(remarkParse).parse(src) as Root;

  // Extract title from H3 heading
  let title = titleCase(slug);
  let formalStatement = '';

  for (const node of tree.children) {
    if (node.type === 'heading' && (node as Heading).depth === 3) {
      const headingText = extractText(node as Heading);
      // Remove the axlerRef prefix (e.g. "1.20 ") from the heading text
      title = headingText.replace(/^\d+\.\d+\s*/, '').trim();
      // Strip trailing LaTeX that's part of notation, keep the human title
      // e.g. "complex numbers, $\mathbb{C}$" → "complex numbers, $\mathbb{C}$" (keep as-is)
    }

    if (node.type === 'blockquote') {
      const bq = node as Blockquote;
      const lines: string[] = [];
      for (const child of bq.children) {
        lines.push(extractText(child as { children: unknown[] }));
      }
      formalStatement = lines.join('\n').trim();
    }
  }

  return { id, axlerRef, title, chapter, formalStatement };
}

// ── Scan all definition folders ───────────────────────────────────────────

function buildRecords(): DefinitionRecord[] {
  const records: DefinitionRecord[] = [];

  const chapterFolders = readdirSync(DEFS_DIR)
    .filter((f) => statSync(join(DEFS_DIR, f)).isDirectory())
    .sort();

  for (const folder of chapterFolders) {
    const chapter = chapterFromFolderName(folder);
    const folderPath = join(DEFS_DIR, folder);

    const files = readdirSync(folderPath)
      .filter((f) => f.endsWith('.md'))
      .sort((a, b) => {
        // Sort by numeric axlerRef
        const [majorA = 0, minorA = 0] = axlerRefFromFilename(a).split('.').map(Number);
        const [majorB = 0, minorB = 0] = axlerRefFromFilename(b).split('.').map(Number);
        return majorA !== majorB ? majorA - majorB : minorA - minorB;
      });

    for (const file of files) {
      const base = parseDefinitionFile(join(folderPath, file), chapter);
      const override = DEFINITION_OVERRIDES[base.id] ?? {};

      const record: DefinitionRecord = {
        ...base,
        section: override.section ?? `${chapter}.?`,
        linkedVisualizers: override.linkedVisualizers ?? ['symbolic-formula'],
        prerequisites: override.prerequisites ?? [],
        examples: override.examples ?? [],
        nonexamples: override.nonexamples ?? [],
        ...(override.plainStatement !== undefined && { plainStatement: override.plainStatement }),
        ...(override.commonErrors !== undefined && { commonErrors: override.commonErrors }),
      };

      records.push(record);
    }
  }

  return records;
}

// ── Emit TypeScript ───────────────────────────────────────────────────────

function emit(records: DefinitionRecord[]): string {
  const json = JSON.stringify(records, null, 2);
  return `// AUTO-GENERATED by scripts/build-definitions.ts — do not edit directly.
// Run \`pnpm build:definitions\` to regenerate.
import type { DefinitionRecord } from './types.ts';

export const DEFINITIONS: readonly DefinitionRecord[] = ${json} as const;
`;
}

// ── Main ──────────────────────────────────────────────────────────────────

const records = buildRecords();
writeFileSync(OUT_FILE, emit(records), 'utf-8');
console.log(`✓ Generated ${records.length} definition records → ${OUT_FILE}`);

// Validation
const missingOverrides = records.filter((r) => r.section.endsWith('.?'));
if (missingOverrides.length > 0) {
  console.warn(
    `⚠ ${missingOverrides.length} records missing section override:`,
    missingOverrides.map((r) => r.id),
  );
}
