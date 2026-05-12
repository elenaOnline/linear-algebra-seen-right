import { lazy, useCallback } from 'react';
import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore, sessionViewFrom } from '../state/index.ts';
import { useTimeline } from '../interaction/timeline/TimelineContext.tsx';
import { rational } from '../types/scalar.ts';
import {
  visualizerRegistry,
  type RendererKind,
  type RendererProps,
  type LoadingProps,
  type SymbolicProps,
  type MatrixProps,
  type DiagramProps,
  type Geometric2DProps,
  type Geometric3DProps,
  type ChartProps,
  type MathObjectKind,
  type MathObject,
} from '../registry/index.ts';

type ConcreteRendererProps =
  | SymbolicProps
  | MatrixProps
  | DiagramProps
  | Geometric2DProps
  | Geometric3DProps
  | ChartProps;
import type { View, MathObjectRef, SessionSnapshot } from '../state/types.ts';
import { LoadingState } from './LoadingState.tsx';
import { ViewErrorBoundary } from './ViewErrorBoundary.tsx';

// Renderers — added one per stage as Phase 5 progresses.
import { SymbolicRenderer } from '../renderers/SymbolicRenderer.tsx';
import { MatrixRenderer } from '../renderers/MatrixRenderer.tsx';
import { DiagramRenderer } from '../renderers/DiagramRenderer.tsx';
import { Geometric2DRenderer } from '../renderers/Geometric2DRenderer.tsx';
import { ChartRenderer } from '../renderers/ChartRenderer.tsx';

// Lazy-loaded: Three.js + R3F add ~600KB minified; defer until first 3D view opens.
const Geometric3DRenderer = lazy(() =>
  import('../renderers/Geometric3DRenderer.tsx').then((m) => ({
    default: m.Geometric3DRenderer,
  })),
);

type Props = {
  readonly view: View;
};

function refKindToObjectKind(kind: MathObjectRef['kind']): MathObjectKind | null {
  switch (kind) {
    case 'space':
      return 'VectorSpace';
    case 'map':
      return 'LinearMap';
    case 'vector':
      return 'Vector';
    case 'subspace':
      return 'Subspace';
    case 'basis':
      return 'Basis';
    case 'innerProduct':
      return 'InnerProduct';
  }
}

function resolveMathObject(snap: SessionSnapshot, ref: MathObjectRef): MathObject | undefined {
  switch (ref.kind) {
    case 'space':
      return snap.spaces[ref.id];
    case 'map':
      return snap.maps[ref.id];
    case 'vector':
      return snap.vectors[ref.id];
    case 'subspace':
      return snap.subspaces[ref.id];
    case 'basis':
      return snap.bases[ref.id];
    case 'innerProduct':
      return snap.innerProducts[ref.id];
  }
}

function RendererPlaceholder({ renderer }: { readonly renderer: RendererKind }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '80px',
        color: 'var(--ink-4)',
        fontSize: 'var(--t-meta)',
        fontFamily: 'var(--font-mono)',
        border: '1px dashed var(--line-2)',
        borderRadius: 'var(--radius)',
      }}
    >
      {renderer} — no applicable view
    </div>
  );
}

function renderConcrete(
  props: ConcreteRendererProps,
  onArrowDrag?: (i: number, x: number, y: number) => void,
): JSX.Element {
  switch (props.renderer) {
    case 'symbolic':
      return <SymbolicRenderer props={props} />;
    case 'matrix':
      return <MatrixRenderer props={props} />;
    case 'diagram':
      return <DiagramRenderer props={props} />;
    case 'geometric_2d':
      return <Geometric2DRenderer props={{ ...props, onArrowDrag }} />;
    case 'chart':
      return <ChartRenderer props={props} />;
    case 'geometric_3d':
      return <Geometric3DRenderer props={props} />;
  }
}

function renderWithProps(
  props: RendererProps,
  onArrowDrag?: (i: number, x: number, y: number) => void,
): JSX.Element {
  if ((props as LoadingProps).isPending === true) {
    return <LoadingState />;
  }
  return renderConcrete(props as ConcreteRendererProps, onArrowDrag);
}

export function ViewContainer({ view }: Props): JSX.Element {
  const session = useStore(defaultStore);
  const { interpolatedSnapshot } = useTimeline();

  // Hooks must be called unconditionally — before any early returns.
  const onArrowDrag = useCallback(
    (_arrowIndex: number, x: number, y: number) => {
      if (view.objectRef.kind !== 'vector') return;
      const vec = session.vectors[view.objectRef.id];
      if (!vec || vec.kind !== 'concrete' || vec.components.length !== 2) return;
      // Preserve the original vector ID — mkConcreteVector would generate a new one,
      // which would be stored under a different key and leave the view's objectRef stale.
      const updated: typeof vec = {
        ...vec,
        components: [rational(Math.round(x * 100), 100), rational(Math.round(y * 100), 100)],
      };
      defaultStore.getState().updateVector(updated);
    },
    [view.objectRef, session.vectors],
  );

  const sessionView =
    interpolatedSnapshot !== null
      ? sessionViewFrom(interpolatedSnapshot)
      : sessionViewFrom(session);

  const objectKind = refKindToObjectKind(view.objectRef.kind);
  if (objectKind === null) {
    return <RendererPlaceholder renderer={view.kind} />;
  }

  const obj = resolveMathObject(session, view.objectRef);
  if (obj === undefined) {
    return <RendererPlaceholder renderer={view.kind} />;
  }

  // Find the first applicable visualizer matching the view's renderer kind.
  const applicable = visualizerRegistry
    .getApplicable(objectKind, obj, sessionView)
    .filter((v) => v.renderer === view.kind);

  if (applicable.length === 0) {
    return <RendererPlaceholder renderer={view.kind} />;
  }

  const visualizer = applicable[0];
  if (visualizer === undefined) {
    return <RendererPlaceholder renderer={view.kind} />;
  }

  const rendererProps = visualizer.toProps(obj, sessionView);
  const dragHandler =
    view.kind === 'geometric_2d' && view.objectRef.kind === 'vector' ? onArrowDrag : undefined;

  return (
    <ViewErrorBoundary renderer={view.kind}>
      {renderWithProps(rendererProps, dragHandler)}
    </ViewErrorBoundary>
  );
}
