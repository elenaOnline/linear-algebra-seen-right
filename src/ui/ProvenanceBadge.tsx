import type { JSX } from 'react';

type Provenance = 'exact' | 'numerical' | 'animated';

type Props = {
  readonly provenance: Provenance;
};

export function ProvenanceBadge({ provenance }: Props): JSX.Element {
  const cls = provenance === 'exact' ? 'exact' : 'approx';
  const label = provenance === 'exact' ? 'exact' : 'approximate';
  const title = provenance === 'exact' ? 'Exact result' : 'Numerical approximation';
  return (
    <span className={`exactness-chip ${cls}`} title={title}>
      {label}
    </span>
  );
}
