// Renders a string that contains inline LaTeX delimited by $...$
// Non-math segments are rendered as plain text; math segments go through KaTeX.
import { useMemo } from 'react';
import type { JSX } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type Props = {
  readonly text: string;
  readonly style?: React.CSSProperties;
  readonly className?: string;
};

function renderMixed(text: string): string {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const latex = part.slice(1, -1);
        try {
          return katex.renderToString(latex, { throwOnError: false, output: 'html' });
        } catch {
          return part;
        }
      }
      // Escape HTML special chars in plain text segments
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    })
    .join('');
}

export function LatexText({ text, style, className }: Props): JSX.Element {
  const html = useMemo(() => renderMixed(text), [text]);
  return (
    <span
      className={className}
      style={{ fontFamily: 'var(--font-math)', ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
