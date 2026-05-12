import type { JSX } from 'react';
import type { RendererKind } from '../registry/index.ts';

const KIND_META: Record<RendererKind, { label: string; cls: string }> = {
  geometric_2d: { label: 'geometric', cls: 'geo' },
  geometric_3d: { label: 'geometric', cls: 'geo' },
  diagram: { label: 'abstract diagram', cls: 'abs' },
  matrix: { label: 'matrix', cls: 'mat' },
  chart: { label: 'spectral', cls: 'spec' },
  symbolic: { label: 'symbolic', cls: 'sym' },
};

type Props = {
  readonly renderer: RendererKind;
};

export function KindBadge({ renderer }: Props): JSX.Element {
  const { label, cls } = KIND_META[renderer];
  return <span className={`kind-badge ${cls}`}>{label}</span>;
}
