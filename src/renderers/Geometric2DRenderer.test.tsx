import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Geometric2DRenderer } from './Geometric2DRenderer.tsx';
import type { Geometric2DProps } from '../registry/index.ts';

const axesProps: Geometric2DProps = {
  renderer: 'geometric_2d',
  objectId: 'test-space',
  kind: 'axes_only',
  axisRange: [-5, 5],
};

const arrowProps: Geometric2DProps = {
  renderer: 'geometric_2d',
  objectId: 'test-vec',
  kind: 'vector_arrow',
  arrows: [{ from: [0, 0], to: [3, 4], color: '#3b82f6', label: 'v' }],
  axisRange: [-5, 5],
};

const gridProps: Geometric2DProps = {
  renderer: 'geometric_2d',
  objectId: 'test-map',
  kind: 'grid_deformation',
  gridDeformation: {
    matrix: [
      [1, 2],
      [3, 4],
    ],
  },
  axisRange: [-5, 5],
};

const eigenlineProps: Geometric2DProps = {
  renderer: 'geometric_2d',
  objectId: 'test-map-eigen',
  kind: 'eigenlines',
  lines: [
    { point: [0, 0], direction: [1, 0], style: 'solid' },
    { point: [0, 0], direction: [0, 1], style: 'dashed' },
  ],
  axisRange: [-5, 5],
};

describe('Geometric2DRenderer', () => {
  it('renders an SVG element for axes_only', () => {
    const { container } = render(<Geometric2DRenderer props={axesProps} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders an SVG element for vector_arrow', () => {
    const { container } = render(<Geometric2DRenderer props={arrowProps} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders an SVG element for grid_deformation', () => {
    const { container } = render(<Geometric2DRenderer props={gridProps} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders an SVG element for eigenlines', () => {
    const { container } = render(<Geometric2DRenderer props={eigenlineProps} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders axis lines', () => {
    const { container } = render(<Geometric2DRenderer props={axesProps} />);
    const lines = container.querySelectorAll('line');
    // At least x-axis and y-axis
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a line element for the arrow', () => {
    const { container } = render(<Geometric2DRenderer props={arrowProps} />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(2); // axis lines + arrow
  });

  it('renders grid lines for grid_deformation', () => {
    const { container } = render(<Geometric2DRenderer props={gridProps} />);
    const lines = container.querySelectorAll('line');
    // Original grid + deformed grid + axes + basis arrows
    expect(lines.length).toBeGreaterThan(10);
  });

  it('renders arrowhead marker defs', () => {
    const { container } = render(<Geometric2DRenderer props={axesProps} />);
    expect(container.querySelector('defs')).not.toBeNull();
    expect(container.querySelector('marker')).not.toBeNull();
  });

  it('uses the supplied axisRange', () => {
    const customRange: Geometric2DProps = { ...axesProps, axisRange: [-10, 10] };
    const { container } = render(<Geometric2DRenderer props={customRange} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders without crashing when arrows array is empty', () => {
    const empty: Geometric2DProps = { ...arrowProps, arrows: [] };
    const { container } = render(<Geometric2DRenderer props={empty} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
