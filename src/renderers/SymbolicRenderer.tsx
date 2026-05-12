import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { SymbolicProps } from '../registry/index.ts';
import { ProvenanceBadge } from '../ui/ProvenanceBadge.tsx';

type Props = {
  readonly props: SymbolicProps;
};

export function SymbolicRenderer({ props }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      katex.render(props.latex, el, {
        displayMode: props.inline !== true,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      el.textContent = props.latex;
    }
  }, [props.latex, props.inline]);

  return (
    <div
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '4px',
        minHeight: '48px',
        fontFamily: 'KaTeX_Main, "Times New Roman", serif',
      }}
    >
      <div ref={containerRef} style={{ lineHeight: 1.6 }} />
      {props.provenance !== undefined && <ProvenanceBadge provenance={props.provenance} />}
    </div>
  );
}
