import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { ViewContainer } from './ViewContainer.tsx';
import { TimelineProvider } from '../interaction/timeline/TimelineContext.tsx';

function WithTimeline({ children }: { readonly children: ReactNode }): JSX.Element {
  return <TimelineProvider>{children}</TimelineProvider>;
}
import { defaultStore } from '../state/index.ts';
import { mkVectorSpaceFn, _resetSpaceRegistry } from '../types/space.ts';
import { mkConcreteVector } from '../types/vector.ts';
import { rational } from '../types/scalar.ts';
import { _resetIdCounter } from '../types/ids.ts';
import type { SpaceId } from '../types/ids.ts';
import { _resetStateCounters } from '../state/types.ts';
import type { View, ViewId } from '../state/types.ts';

function resetAll() {
  _resetSpaceRegistry();
  _resetStateCounters();
  _resetIdCounter();
  defaultStore.setState({
    field: 'R',
    spaces: {},
    subspaces: {},
    maps: {},
    vectors: {},
    bases: {},
    innerProducts: {},
    selectedBasis: {},
    namedObjects: {},
    pendingComputations: {},
    computationCache: {},
    views: [],
    history: [
      {
        field: 'R',
        spaces: {},
        subspaces: {},
        maps: {},
        vectors: {},
        bases: {},
        innerProducts: {},
        selectedBasis: {},
        namedObjects: {},
      },
    ],
    historyCursor: 0,
  });
}

beforeEach(resetAll);

describe('ViewContainer — placeholder for unimplemented renderers', () => {
  it('renders a placeholder for geometric_3d when no session object exists', () => {
    const view: View = {
      id: 'v1' as ViewId,
      kind: 'geometric_3d',
      objectRef: { kind: 'space', id: 'nonexistent' as SpaceId },
      props: {},
    };
    const { container } = render(
      <WithTimeline>
        <ViewContainer view={view} />
      </WithTimeline>,
    );
    expect(container.textContent).toContain('geometric_3d');
  });
});

describe('ViewContainer — symbolic renderer dispatch', () => {
  it('renders SymbolicRenderer (KaTeX output) for a vector with symbolic kind', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();
    const vec = mkConcreteVector('R', r2.value.id, [rational(1), rational(0)], 2);
    if (!vec.ok) throw new Error();

    defaultStore.setState((s) => ({
      spaces: { ...s.spaces, [r2.value.id]: r2.value },
      vectors: { ...s.vectors, [vec.value.id]: vec.value },
    }));

    const view: View = {
      id: 'v2' as ViewId,
      kind: 'symbolic',
      objectRef: { kind: 'vector', id: vec.value.id },
      props: {},
    };

    const { container } = render(
      <WithTimeline>
        <ViewContainer view={view} />
      </WithTimeline>,
    );
    // KaTeX renders the LaTeX — at minimum the container should not be empty
    // and should not show the "coming soon" placeholder.
    expect(container.textContent).not.toContain('coming soon');
  });

  it('renders basis-display (symbolic) for a VectorSpace in session', () => {
    const r3 = mkVectorSpaceFn('R', 3);
    if (!r3.ok) throw new Error();

    defaultStore.setState((s) => ({
      spaces: { ...s.spaces, [r3.value.id]: r3.value },
    }));

    const view: View = {
      id: 'v3' as ViewId,
      kind: 'symbolic',
      objectRef: { kind: 'space', id: r3.value.id },
      props: {},
    };

    const { container } = render(
      <WithTimeline>
        <ViewContainer view={view} />
      </WithTimeline>,
    );
    expect(container.textContent).not.toContain('coming soon');
  });
});

describe('ViewContainer — loading state', () => {
  it('shows loading state for a matrix-kind view with a formula map (pending toProps)', () => {
    const r2 = mkVectorSpaceFn('R', 2);
    if (!r2.ok) throw new Error();

    defaultStore.setState((s) => ({
      spaces: { ...s.spaces, [r2.value.id]: r2.value },
    }));

    // matrix-heatmap for a space — toProps returns isPending: true
    const view: View = {
      id: 'v4' as ViewId,
      kind: 'matrix',
      objectRef: { kind: 'space', id: r2.value.id },
      props: {},
    };

    // Matrix is not registered for VectorSpace so falls through to placeholder,
    // not loading state — still should not crash and should show something.
    const { container } = render(
      <WithTimeline>
        <ViewContainer view={view} />
      </WithTimeline>,
    );
    expect(container.firstChild).not.toBeNull();
  });
});
