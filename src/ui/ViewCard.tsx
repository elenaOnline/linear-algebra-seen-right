import { useState, useRef, useEffect } from 'react';
import type { JSX } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { defaultStore, sessionViewFrom } from '../state/index.ts';
import { visualizerRegistry, type MathObjectKind, type MathObject } from '../registry/index.ts';
import type { View, MathObjectRef, SessionSnapshot } from '../state/types.ts';
import { ViewContainer } from './ViewContainer.tsx';
import { KindBadge } from './KindBadge.tsx';

// --- Helpers ---

function objectKindFor(ref: MathObjectRef): MathObjectKind | null {
  switch (ref.kind) {
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

function nameForRef(snap: SessionSnapshot, ref: MathObjectRef): string {
  const entry = Object.entries(snap.namedObjects).find(
    ([, r]) => r.kind === ref.kind && r.id === ref.id,
  );
  return entry ? entry[0] : ref.kind;
}

function footMetaFor(snap: SessionSnapshot, ref: MathObjectRef): string {
  const field = snap.field === 'R' ? 'ℝ' : 'ℂ';
  switch (ref.kind) {
    case 'vector': {
      const vec = snap.vectors[ref.id];
      if (vec?.kind === 'concrete') {
        const basisId = snap.selectedBasis[vec.space];
        const basisLabel = basisId ? (snap.bases[basisId]?.label ?? basisId) : 'std basis';
        return `${field} · ${basisLabel}`;
      }
      return field;
    }
    case 'space':
      return field;
    case 'map': {
      const map = snap.maps[ref.id];
      if (map?.representation.kind === 'matrix') {
        const { domainBasis } = map.representation;
        const basisLabel = snap.bases[domainBasis]?.label ?? domainBasis;
        return `${field} · basis: ${basisLabel}`;
      }
      return field;
    }
    default:
      return field;
  }
}

// --- ViewCard ---

type Props = {
  readonly view: View;
  readonly isResizable?: boolean;
  readonly onResizeStart?: (startX: number) => void;
};

export function ViewCard({ view, isResizable = false, onResizeStart }: Props): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const session = useStore(defaultStore);

  // Close menu on outside click — exclude both the trigger button and the portal content
  // so that clicking a menu item in the portal fires its onClick before the menu closes.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuBtnRef.current?.contains(target) && !portalRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [menuOpen]);
  const { closeView, openView } = defaultStore.getState();
  const sessionView = sessionViewFrom(session);

  const objectName = nameForRef(session, view.objectRef);
  const objectKind = objectKindFor(view.objectRef);
  const obj = resolveMathObject(session, view.objectRef);
  const footMeta = footMetaFor(session, view.objectRef);

  const activeVisualizer =
    objectKind && obj
      ? visualizerRegistry
          .getApplicable(objectKind, obj, sessionView)
          .find((v) => v.renderer === view.kind)
      : undefined;

  const otherVisualizers =
    objectKind && obj
      ? visualizerRegistry
          .getApplicable(objectKind, obj, sessionView)
          .filter((v) => v.renderer !== view.kind)
      : [];

  return (
    <div
      className="canvas-tile"
      style={{
        position: 'relative',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--panel)',
      }}
    >
      {/* tile-head */}
      <div
        style={{
          padding: '7px 10px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--panel-2)',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          flexShrink: 0,
          minHeight: '34px',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <KindBadge renderer={view.kind} />

        {/* Object name — math italic */}
        <span
          style={{
            fontFamily: 'var(--font-math)',
            fontStyle: 'italic',
            fontSize: 'var(--t-meta)',
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
          }}
        >
          {objectName}
        </span>

        {/* Visualizer label */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--t-micro)',
            color: 'var(--ink-3)',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeVisualizer?.label ?? view.kind}
        </span>

        {/* "View as…" menu — portaled to document.body so it escapes tile overflow:hidden */}
        {otherVisualizers.length > 0 && (
          <div style={{ flexShrink: 0 }}>
            <button
              ref={menuBtnRef}
              onClick={() => {
                const rect = menuBtnRef.current?.getBoundingClientRect() ?? null;
                setMenuRect(rect);
                setMenuOpen((o) => !o);
              }}
              title="View as…"
              style={{
                background: 'none',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                padding: '2px 7px',
                fontSize: 'var(--t-micro)',
                color: 'var(--ink-3)',
                fontFamily: 'var(--font-mono)',
                lineHeight: '1.4',
              }}
            >
              + view
            </button>
            {menuOpen &&
              menuRect !== null &&
              createPortal(
                <div
                  ref={portalRef}
                  style={{
                    position: 'fixed',
                    top: menuRect.bottom + 4,
                    right: window.innerWidth - menuRect.right,
                    background: 'var(--panel)',
                    border: '1px solid var(--line-2)',
                    borderRadius: 'var(--radius)',
                    boxShadow: '0 4px 14px rgba(22,22,20,0.12)',
                    zIndex: 9999,
                    minWidth: '160px',
                    overflow: 'hidden',
                  }}
                >
                  {otherVisualizers.map((viz) => (
                    <button
                      key={viz.id}
                      onClick={() => {
                        openView(viz.renderer, view.objectRef);
                        setMenuOpen(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '7px 12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--t-meta)',
                        color: 'var(--ink)',
                        fontFamily: 'var(--font-sans)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      {viz.label}
                    </button>
                  ))}
                </div>,
                document.body,
              )}
          </div>
        )}

        {/* Close */}
        <button
          onClick={() => closeView(view.id)}
          title="Close view"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 5px',
            fontSize: 'var(--t-meta)',
            color: 'var(--ink-4)',
            lineHeight: 1,
            borderRadius: 'var(--radius)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--ink-4)';
          }}
        >
          ✕
        </button>
      </div>

      {/* tile-body */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, background: 'var(--panel)' }}>
        <ViewContainer view={view} />
      </div>

      {/* tile-foot */}
      <div
        style={{
          padding: '5px 10px',
          borderTop: '1px solid var(--line)',
          background: 'var(--panel-2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--t-micro)',
            color: 'var(--ink-3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontStyle:
              view.objectRef.kind === 'vector' || view.objectRef.kind === 'space'
                ? 'normal'
                : 'normal',
          }}
        >
          {footMeta}
        </span>
      </div>

      {/* Right-edge drag handle — shown on all tiles except the last in the row */}
      {isResizable && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            onResizeStart?.(e.clientX);
          }}
          style={{
            position: 'absolute',
            top: 0,
            right: -4,
            width: 8,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 2,
              height: 32,
              borderRadius: 1,
              background: 'var(--line-3)',
              opacity: 0,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0';
            }}
          />
        </div>
      )}
    </div>
  );
}
