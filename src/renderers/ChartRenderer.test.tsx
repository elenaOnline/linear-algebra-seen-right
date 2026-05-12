import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChartRenderer } from './ChartRenderer.tsx';
import type { ChartProps } from '../registry/index.ts';

const dimensionBarsProps: ChartProps = {
  renderer: 'chart',
  objectId: 'test-map',
  kind: 'dimension_bars',
  data: [
    { label: 'rank', value: 2 },
    { label: 'nullity', value: 1 },
  ],
};

const spectrumProps: ChartProps = {
  renderer: 'chart',
  objectId: 'test-map-2',
  kind: 'spectrum',
  data: [
    { label: 'λ₁', value: -1 },
    { label: 'λ₂', value: 3 },
  ],
  provenance: 'exact',
};

const emptyDataProps: ChartProps = {
  renderer: 'chart',
  objectId: 'test-map-3',
  kind: 'singular_values',
  data: [],
};

describe('ChartRenderer', () => {
  it('renders an SVG for dimension_bars', () => {
    const { container } = render(<ChartRenderer props={dimensionBarsProps} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders rect elements for the rank and nullity segments', () => {
    const { container } = render(<ChartRenderer props={dimensionBarsProps} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(2);
  });

  it('renders an SVG for a spectrum bar chart', () => {
    const { container } = render(<ChartRenderer props={spectrumProps} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders one bar per data entry in bar chart mode', () => {
    const { container } = render(<ChartRenderer props={spectrumProps} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(spectrumProps.data.length);
  });

  it('renders without crashing when data is empty', () => {
    const { container } = render(<ChartRenderer props={emptyDataProps} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders the rank-nullity theorem label for dimension_bars', () => {
    const { container } = render(<ChartRenderer props={dimensionBarsProps} />);
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    expect(texts.some((t) => t.includes('rank + nullity'))).toBe(true);
  });
});
