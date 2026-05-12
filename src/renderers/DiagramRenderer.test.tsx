import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DiagramRenderer } from './DiagramRenderer.tsx';
import type { DiagramProps } from '../registry/index.ts';

const twoNodeProps: DiagramProps = {
  renderer: 'diagram',
  objectId: 'test-map',
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  edges: [{ from: 'a', to: 'b', label: 'T' }],
};

const kernelRangeProps: DiagramProps = {
  renderer: 'diagram',
  objectId: 'test-map',
  nodes: [
    { id: 'domain', label: 'R2' },
    { id: 'codomain', label: 'R2' },
    { id: 'kernel', label: 'null(T)', highlight: 'kernel' },
    { id: 'range', label: 'range(T)', highlight: 'range' },
  ],
  edges: [
    { from: 'domain', to: 'codomain', label: 'T' },
    { from: 'kernel', to: 'domain', label: '⊆', style: 'dashed' },
    { from: 'range', to: 'codomain', label: '⊆', style: 'dashed' },
  ],
};

describe('DiagramRenderer', () => {
  it('renders without crashing for a 2-node graph', () => {
    const { container } = render(<DiagramRenderer props={twoNodeProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders an SVG element', () => {
    const { container } = render(<DiagramRenderer props={twoNodeProps} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders the correct number of node rects', () => {
    const { container } = render(<DiagramRenderer props={kernelRangeProps} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(4);
  });

  it('renders node labels as text', () => {
    const { container } = render(<DiagramRenderer props={twoNodeProps} />);
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('B');
  });

  it('renders edge label', () => {
    const { container } = render(<DiagramRenderer props={twoNodeProps} />);
    expect(container.textContent).toContain('T');
  });

  it('dashed edges render with strokeDasharray', () => {
    const { container } = render(<DiagramRenderer props={kernelRangeProps} />);
    const dashedPaths = [...container.querySelectorAll('path[stroke-dasharray]')];
    // Two dashed inclusion edges
    expect(dashedPaths.length).toBeGreaterThanOrEqual(2);
  });

  it('single-node diagram renders without edges', () => {
    const singleNode: DiagramProps = {
      renderer: 'diagram',
      objectId: 'test-space',
      nodes: [{ id: 'space', label: 'V (dim 3)' }],
      edges: [],
    };
    const { container } = render(<DiagramRenderer props={singleNode} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(1);
  });
});
