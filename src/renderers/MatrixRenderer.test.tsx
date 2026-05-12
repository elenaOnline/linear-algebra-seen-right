import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MatrixRenderer } from './MatrixRenderer.tsx';
import type { MatrixProps } from '../registry/index.ts';

const identity2x2: MatrixProps = {
  renderer: 'matrix',
  objectId: 'test-map',
  rows: 2,
  cols: 2,
  entries: [
    ['1', '0'],
    ['0', '1'],
  ],
};

describe('MatrixRenderer', () => {
  it('renders without crashing for a 2×2 matrix', () => {
    const { container } = render(<MatrixRenderer props={identity2x2} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows rows × cols label', () => {
    const { container } = render(<MatrixRenderer props={identity2x2} />);
    expect(container.textContent).toContain('2×2');
  });

  it('renders a 3×3 matrix without crashing', () => {
    const props: MatrixProps = {
      renderer: 'matrix',
      objectId: 'test-3x3',
      rows: 3,
      cols: 3,
      entries: [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
      ],
    };
    const { container } = render(<MatrixRenderer props={props} />);
    expect(container.textContent).toContain('3×3');
  });

  it('shows provenance badge when provided', () => {
    const props: MatrixProps = { ...identity2x2, provenance: 'numerical' };
    const { container } = render(<MatrixRenderer props={props} />);
    expect(container.textContent).toContain('approximate');
  });

  it('does not show provenance badge when absent', () => {
    const { container } = render(<MatrixRenderer props={identity2x2} />);
    expect(container.textContent).not.toContain('exact');
    expect(container.textContent).not.toContain('≈');
  });

  it('renders heatmap cells with background color when heatmap provided', () => {
    const props: MatrixProps = {
      ...identity2x2,
      heatmap: [
        [1, 0],
        [0, 1],
      ],
    };
    const { container } = render(<MatrixRenderer props={props} />);
    // Heatmap cells get inline background styles — check that the matrix still renders
    expect(container.firstChild).not.toBeNull();
  });

  it('renders column labels when provided', () => {
    const props: MatrixProps = {
      ...identity2x2,
      colLabels: ['e₁', 'e₂'],
    };
    const { container } = render(<MatrixRenderer props={props} />);
    expect(container.textContent).toContain('e₁');
    expect(container.textContent).toContain('e₂');
  });
});
