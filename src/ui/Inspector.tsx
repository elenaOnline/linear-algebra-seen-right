import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore, sessionViewFrom } from '../state/index.ts';
import type { MathObjectRef } from '../state/types.ts';
import { KindBadge } from './KindBadge.tsx';
import { LatexText } from './LatexText.tsx';
import { visualizerRegistry } from '../registry/index.ts';
import { computeRank, computeDet } from '../registry/helpers.ts';
import { defaultStore as store } from '../state/index.ts';
import { GeneratorPanel } from './GeneratorPanel.tsx';
import { DEFINITIONS } from '../pedagogy/definitions/index.ts';

type Props = {
  readonly selected: MathObjectRef | null;
  readonly originDefId?: string | null;
};

function KVRow({ k, v }: { readonly k: string; readonly v: string }): JSX.Element {
  return (
    <>
      <span
        style={{
          fontFamily: 'var(--font-math)',
          fontStyle: 'italic',
          fontSize: 'var(--t-meta)',
          color: 'var(--ink-3)',
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--t-meta)',
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {v}
      </span>
    </>
  );
}

export function Inspector({ selected, originDefId }: Props): JSX.Element {
  const session = useStore(defaultStore);
  const sessionView = sessionViewFrom(session);
  const { openView } = store.getState();

  if (selected === null) {
    const originDef = originDefId ? DEFINITIONS.find((d) => d.id === originDefId) : null;
    if (originDef) {
      return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-micro)',
              color: 'var(--ink-3)',
              marginBottom: '6px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Definition
          </div>
          <div
            style={{
              fontFamily: 'var(--font-math)',
              fontStyle: 'italic',
              fontSize: '15px',
              color: 'var(--ink)',
              marginBottom: '10px',
            }}
          >
            <LatexText text={originDef.title} />
          </div>
          {originDef.plainStatement && (
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--t-meta)',
                color: 'var(--ink-2)',
                lineHeight: 1.6,
                marginBottom: '8px',
              }}
            >
              <LatexText text={originDef.plainStatement} />
            </div>
          )}
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--t-meta)',
              color: 'var(--ink-2)',
              lineHeight: 1.6,
            }}
          >
            <LatexText text={originDef.formalStatement} />
          </div>
          <div
            style={{
              marginTop: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-micro)',
              color: 'var(--ink-4)',
              lineHeight: 1.6,
            }}
          >
            Select an object to inspect it.
          </div>
        </div>
      );
    }
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--t-micro)',
          padding: '20px',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Select an object
        <br />
        to inspect it.
      </div>
    );
  }

  const named = session.namedObjects;
  const name =
    Object.entries(named).find(([, r]) => r.kind === selected.kind && r.id === selected.id)?.[0] ??
    selected.id;

  // Gather definition properties
  const defProps: Array<[string, string]> = [];
  const computedProps: Array<[string, string]> = [];
  let objectKindLabel = '';

  if (selected.kind === 'vector') {
    const vec = session.vectors[selected.id];
    objectKindLabel = 'Vector';
    if (vec?.kind === 'concrete') {
      const space = session.spaces[vec.space];
      defProps.push(['field', vec.field === 'R' ? 'ℝ' : 'ℂ']);
      defProps.push(['space', space ? `ℝ^${space.kind === 'Fn' ? space.n : '?'}` : vec.space]);
      defProps.push(['dim', String(vec.components.length)]);
      defProps.push([
        'components',
        `(${vec.components.map((c) => (c.kind === 'rational' ? String(c.value) : '~')).join(', ')})`,
      ]);
    }
  } else if (selected.kind === 'space') {
    const sp = session.spaces[selected.id];
    objectKindLabel = 'Vector Space';
    if (sp) {
      defProps.push(['field', sp.field === 'R' ? 'ℝ' : 'ℂ']);
      if (sp.kind === 'Fn') {
        defProps.push(['dim', String(sp.n)]);
        defProps.push(['form', `ℝ^${sp.n}`]);
      }
    }
  } else if (selected.kind === 'map') {
    const map = session.maps[selected.id];
    objectKindLabel = 'Linear Map';
    if (map) {
      const domainSpace = session.spaces[map.domain];
      const codomainSpace = session.spaces[map.codomain];
      const domDim = domainSpace?.kind === 'Fn' ? domainSpace.n : '?';
      const codDim = codomainSpace?.kind === 'Fn' ? codomainSpace.n : '?';
      defProps.push(['field', session.field === 'R' ? 'ℝ' : 'ℂ']);
      defProps.push(['domain', `ℝ^${domDim}`]);
      defProps.push(['codomain', `ℝ^${codDim}`]);
      defProps.push(['form', map.representation.kind]);
      if (map.representation.kind === 'matrix') {
        const mat = map.representation.matrix;
        const rank = computeRank(mat);
        const nullity = mat.cols - rank;
        computedProps.push(['rank', String(rank)]);
        computedProps.push(['nullity', String(nullity)]);
        if (mat.rows === mat.cols) {
          const det = computeDet(mat);
          computedProps.push([
            'det',
            Number.isFinite(det) ? parseFloat(det.toPrecision(5)).toString() : '—',
          ]);
        }
      }
    }
  }

  // Applicable visualizers for "open" pills
  const objKindMap: Record<
    MathObjectRef['kind'],
    Parameters<typeof visualizerRegistry.getApplicable>[0] | null
  > = {
    space: 'VectorSpace',
    map: 'LinearMap',
    vector: 'Vector',
    subspace: 'Subspace',
    basis: 'Basis',
    innerProduct: 'InnerProduct',
  };
  const objKind = objKindMap[selected.kind];
  const obj = objKind
    ? (() => {
        switch (selected.kind) {
          case 'space':
            return session.spaces[selected.id];
          case 'map':
            return session.maps[selected.id];
          case 'vector':
            return session.vectors[selected.id];
          default:
            return undefined;
        }
      })()
    : undefined;

  const applicableVizs =
    objKind && obj ? visualizerRegistry.getApplicable(objKind, obj, sessionView) : [];

  return (
    <div
      style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      {/* Object header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--line)' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--t-micro)',
            color: 'var(--ink-3)',
            marginBottom: '4px',
          }}
        >
          {objectKindLabel}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-math)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '15px',
            letterSpacing: '-0.015em',
            color: 'var(--ink)',
            marginBottom: '8px',
          }}
        >
          {name}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {applicableVizs.slice(0, 1).map((v) => (
            <KindBadge key={v.id} renderer={v.renderer} />
          ))}
        </div>
      </div>

      {/* Definition properties */}
      {defProps.length > 0 && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-micro)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: '10px',
            }}
          >
            Definition
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 14px' }}>
            {defProps.map(([k, v]) => (
              <KVRow key={k} k={k} v={v} />
            ))}
          </div>
        </div>
      )}

      {/* Computed properties */}
      {computedProps.length > 0 && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-micro)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: '10px',
            }}
          >
            Computed
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 14px' }}>
            {computedProps.map(([k, v]) => (
              <KVRow key={k} k={k} v={v} />
            ))}
          </div>
        </div>
      )}

      {/* Available visualizations */}
      {applicableVizs.length > 0 && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-micro)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: '10px',
            }}
          >
            Open as
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {applicableVizs.map((viz) => (
              <button
                key={viz.id}
                onClick={() => openView(viz.renderer, selected)}
                style={{
                  padding: '4px 10px',
                  border: '1px solid var(--line-2)',
                  borderRadius: '999px',
                  fontSize: 'var(--t-meta)',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--ink-2)',
                  background: 'var(--panel)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--panel)';
                }}
              >
                {viz.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Example generator */}
      <GeneratorPanel />
    </div>
  );
}
