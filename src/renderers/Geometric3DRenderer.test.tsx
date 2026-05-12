// Geometric3DRenderer uses raw Three.js + useEffect. The WebGL setup is guarded by
// a getContext() check, so in happy-dom (no WebGL) the effect exits cleanly and the
// component renders its div/canvas shell without crashing.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Geometric3DRenderer } from './Geometric3DRenderer.tsx';
import type { Geometric3DProps } from '../registry/index.ts';

const axesProps: Geometric3DProps = {
  renderer: 'geometric_3d',
  objectId: 'test-space',
  kind: 'axes_only',
  axisRange: [-5, 5],
};

const arrowProps: Geometric3DProps = {
  renderer: 'geometric_3d',
  objectId: 'test-vec',
  kind: 'vector_arrow',
  arrows: [{ from: [0, 0, 0], to: [1, 2, 3], color: '#3b82f6' }],
  axisRange: [-5, 5],
};

const gridProps: Geometric3DProps = {
  renderer: 'geometric_3d',
  objectId: 'test-map',
  kind: 'grid_deformation',
  gridDeformation: {
    matrix: [
      [1, 0, 0],
      [0, 2, 0],
      [0, 0, 1],
    ],
  },
  axisRange: [-5, 5],
};

describe('Geometric3DRenderer', () => {
  it('renders a container div for axes_only', () => {
    const { container } = render(<Geometric3DRenderer props={axesProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a canvas element', () => {
    const { container } = render(<Geometric3DRenderer props={axesProps} />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('renders without crashing for vector_arrow', () => {
    const { container } = render(<Geometric3DRenderer props={arrowProps} />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('renders without crashing for grid_deformation', () => {
    const { container } = render(<Geometric3DRenderer props={gridProps} />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('renders without crashing when arrows array is empty', () => {
    const empty: Geometric3DProps = { ...arrowProps, arrows: [] };
    const { container } = render(<Geometric3DRenderer props={empty} />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });
});

// Prop shape validation — independent of rendering.
describe('Geometric3DRenderer — prop shape validation', () => {
  it('axisRange is optional', () => {
    const noRange: Geometric3DProps = {
      renderer: 'geometric_3d',
      objectId: 'x',
      kind: 'axes_only',
    };
    expect(noRange.axisRange).toBeUndefined();
  });

  it('gridDeformation matrix has correct shape', () => {
    expect(gridProps.gridDeformation?.matrix).toHaveLength(3);
    expect(gridProps.gridDeformation?.matrix[0]).toHaveLength(3);
  });

  it('arrow from/to have three components', () => {
    const arrow = arrowProps.arrows?.[0];
    expect(arrow?.from).toHaveLength(3);
    expect(arrow?.to).toHaveLength(3);
  });
});
