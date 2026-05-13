import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';
import { KindBadge } from './KindBadge.tsx';

describe('ProvenanceBadge (exactness chip)', () => {
  it('renders "exact" label for exact provenance', () => {
    const { container } = render(<ProvenanceBadge provenance="exact" />);
    expect(container.textContent).toContain('exact');
  });

  it('applies the "exact" class for exact provenance', () => {
    const { container } = render(<ProvenanceBadge provenance="exact" />);
    expect(container.querySelector('.exactness-chip.exact')).not.toBeNull();
  });

  it('renders "approximate" label for numerical provenance', () => {
    const { container } = render(<ProvenanceBadge provenance="numerical" />);
    expect(container.textContent).toContain('approximate');
  });

  it('applies the "approx" class for numerical provenance', () => {
    const { container } = render(<ProvenanceBadge provenance="numerical" />);
    expect(container.querySelector('.exactness-chip.approx')).not.toBeNull();
  });

  it('applies the "approx" class for animated provenance', () => {
    const { container } = render(<ProvenanceBadge provenance="animated" />);
    expect(container.querySelector('.exactness-chip.approx')).not.toBeNull();
  });

  it('exact and numerical chips have different CSS classes', () => {
    const { container: c1 } = render(<ProvenanceBadge provenance="exact" />);
    const { container: c2 } = render(<ProvenanceBadge provenance="numerical" />);
    const exactCls = c1.querySelector('.exactness-chip')?.className;
    const approxCls = c2.querySelector('.exactness-chip')?.className;
    expect(exactCls).not.toBe(approxCls);
  });
});

describe('KindBadge', () => {
  it('renders "Plot 2D" label for geometric_2d', () => {
    const { container } = render(<KindBadge renderer="geometric_2d" />);
    expect(container.textContent).toContain('Plot 2D');
    expect(container.querySelector('.kind-badge.geo')).not.toBeNull();
  });

  it('renders "Plot 3D" label for geometric_3d', () => {
    const { container } = render(<KindBadge renderer="geometric_3d" />);
    expect(container.textContent).toContain('Plot 3D');
    expect(container.querySelector('.kind-badge.geo')).not.toBeNull();
  });

  it('renders "Draw as diagram" label for diagram', () => {
    const { container } = render(<KindBadge renderer="diagram" />);
    expect(container.textContent).toContain('Draw as diagram');
    expect(container.querySelector('.kind-badge.abs')).not.toBeNull();
  });

  it('renders "matrix" label for matrix', () => {
    const { container } = render(<KindBadge renderer="matrix" />);
    expect(container.querySelector('.kind-badge.mat')).not.toBeNull();
  });

  it('renders "spectral" label for chart', () => {
    const { container } = render(<KindBadge renderer="chart" />);
    expect(container.querySelector('.kind-badge.spec')).not.toBeNull();
  });

  it('renders "symbolic" label for symbolic', () => {
    const { container } = render(<KindBadge renderer="symbolic" />);
    expect(container.querySelector('.kind-badge.sym')).not.toBeNull();
  });
});
