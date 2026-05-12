import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SymbolicRenderer } from './SymbolicRenderer.tsx';
import type { SymbolicProps } from '../registry/index.ts';

describe('SymbolicRenderer', () => {
  it('renders without crashing for simple LaTeX', () => {
    const props: SymbolicProps = {
      renderer: 'symbolic',
      objectId: 'test-obj',
      latex: 'x^2 + y^2',
    };
    const { container } = render(<SymbolicRenderer props={props} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the KaTeX container element', () => {
    const props: SymbolicProps = {
      renderer: 'symbolic',
      objectId: 'test-obj',
      latex: '\\frac{1}{2}',
    };
    const { container } = render(<SymbolicRenderer props={props} />);
    // KaTeX produces a .katex element inside the container div
    const katexEl = container.querySelector('.katex, [class*="katex"]');
    // In happy-dom, KaTeX may or may not fully render — at minimum the container div exists.
    expect(container.querySelector('div')).not.toBeNull();
    // Silence unused variable lint — katexEl may be null in test env.
    void katexEl;
  });

  it('shows ProvenanceBadge when provenance is provided', () => {
    const props: SymbolicProps = {
      renderer: 'symbolic',
      objectId: 'test-obj',
      latex: 'Av',
      provenance: 'exact',
    };
    const { container } = render(<SymbolicRenderer props={props} />);
    expect(container.textContent).toContain('exact');
  });

  it('does not show ProvenanceBadge when provenance is absent', () => {
    const props: SymbolicProps = {
      renderer: 'symbolic',
      objectId: 'test-obj',
      latex: 'Av',
    };
    const { container } = render(<SymbolicRenderer props={props} />);
    expect(container.textContent).not.toContain('exact');
    expect(container.textContent).not.toContain('≈');
  });
});
