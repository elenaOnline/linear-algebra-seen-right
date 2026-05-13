import type { JSX } from 'react';
import type { RendererKind } from '../registry/index.ts';

const KIND_META: Record<RendererKind, { label: string; cls: string }> = {
  geometric_2d: { label: 'Plot 2D', cls: 'geo' },
  geometric_3d: { label: 'Plot 3D', cls: 'geo' },
  diagram: { label: 'Draw as diagram', cls: 'abs' },
  matrix: { label: 'Matrix view', cls: 'mat' },
  chart: { label: 'Spectrum', cls: 'spec' },
  symbolic: { label: 'Symbolic', cls: 'sym' },
};

type Props = {
  readonly renderer: RendererKind;
};

export function KindBadge({ renderer }: Props): JSX.Element {
  const { label, cls } = KIND_META[renderer];
  return <span className={`kind-badge ${cls}`}>{label}</span>;
}
