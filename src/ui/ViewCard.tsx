import { useState, useRef, useEffect } from 'react';
import type { JSX } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { defaultStore, sessionViewFrom } from '../state/index.ts';
import { visualizerRegistry, type MathObjectKind, type MathObject } from '../registry/index.ts';
import type { View, MathObjectRef, SessionSnapshot } from '../state/types.ts';
import type { VectorExpression, MapExpression } from '../types/derivation.ts';
import type { Scalar } from '../types/scalar.ts';
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

// --- Derivation label helpers ---

function scalarLabel(s: Scalar): string {
  if (s.kind === 'rational') {
    const v = Number(s.value);
    return Number.isInteger(v) ? String(v) : v.toPrecision(3);
  }
  return '~';
}

function nameForId(id: string, namedObjects: Record<string, MathObjectRef>): string {
  const entry = Object.entries(namedObjects).find(([, r]) => r.id === id);
  return entry ? entry[0] : id.slice(0, 4);
}

function formatVectorExpr(
  expr: VectorExpression,
  namedObjects: Record<string, MathObjectRef>,
): string {
  switch (expr.op) {
    case 'add':
      return `= ${nameForId(expr.left, namedObjects)} + ${nameForId(expr.right, namedObjects)}`;
    case 'sub':
      return `= ${nameForId(expr.left, namedObjects)} − ${nameForId(expr.right, namedObjects)}`;
    case 'scale':
      return `= ${scalarLabel(expr.scalar)}${nameForId(expr.vector, namedObjects)}`;
    case 'apply':
      return `= ${nameForId(expr.map, namedObjects)}(${nameForId(expr.vector, namedObjects)})`;
  }
}

function formatMapExpr(expr: MapExpression, namedObjects: Record<string, MathObjectRef>): string {
  switch (expr.op) {
    case 'compose':
      return `= ${nameForId(expr.left, namedObjects)} ∘ ${nameForId(expr.right, namedObjects)}`;
    case 'sum':
      return `= ${nameForId(expr.left, namedObjects)} + ${nameForId(expr.right, namedObjects)}`;
    case 'scale':
      return `= ${scalarLabel(expr.scalar)}${nameForId(expr.map, namedObjects)}`;
  }
}

// --- ViewCard ---

type Props = {
  readonly view: View;
  readonly onResizeStart?: (startX: number) => void;
};

export function ViewCard({ view, onResizeStart }: Props): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const prevComponentsRef = useRef<string | null>(null);
  const session = useStore(defaultStore);

  // Close menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (!menuBtnRef.current?.contains(target) && !portalRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Observe header width for narrow layout switching.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      if (entry) setIsNarrow(entry.contentRect.width < 150);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { closeView, openView } = defaultStore.getState();
  const sessionView = sessionViewFrom(session);
  const objectName = nameForRef(session, view.objectRef);
  const obj = resolveMathObject(session, view.objectRef);
  const footMeta = footMetaFor(session, view.objectRef);

  // Typed lookups for derivation-aware objects.
  const sessionVec =
    view.objectRef.kind === 'vector' ? session.vectors[view.objectRef.id] : undefined;
  const sessionMap = view.objectRef.kind === 'map' ? session.maps[view.objectRef.id] : undefined;

  // Pulse when a derived object's cached components update.
  useEffect(() => {
    const sig =
      sessionVec?.kind === 'concrete' && sessionVec.derivation
        ? JSON.stringify(sessionVec.components)
        : sessionMap?.derivation && sessionMap.representation.kind === 'matrix'
          ? JSON.stringify(sessionMap.representation.matrix.entries)
          : null;
    if (sig === null) return undefined;
    if (prevComponentsRef.current !== null && prevComponentsRef.current !== sig) {
      setIsPulsing(true);
      const t = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(t);
    }
    prevComponentsRef.current = sig;
    return undefined;
  }, [sessionVec, sessionMap]);

  // Derivation label for tile header.
  const derivationLabel: string | null =
    sessionVec?.kind === 'concrete' && sessionVec.derivation
      ? formatVectorExpr(sessionVec.derivation, session.namedObjects)
      : sessionMap?.derivation
        ? formatMapExpr(sessionMap.derivation, session.namedObjects)
        : null;

  const objectKind = objectKindFor(view.objectRef);
  const footMetaStr = footMeta;

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

  // Shared button styles.
  const iconBtnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 5px',
    fontSize: 'var(--t-meta)',
    color: 'var(--ink-4)',
    lineHeight: '1' as const,
    borderRadius: 'var(--radius)',
    flexShrink: 0,
  };

  // Buttons shared between narrow and wide layouts.
  const viewMenuBtn =
    otherVisualizers.length > 0 ? (
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
          flexShrink: 0,
        }}
      >
        + view
      </button>
    ) : null;

  const closeBtn = (
    <button
      onClick={() => closeView(view.id)}
      title="Close view"
      style={iconBtnStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--ink)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--ink-4)';
      }}
    >
      ✕
    </button>
  );

  const viewMenuPortal =
    menuOpen && menuRect !== null
      ? createPortal(
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
        )
      : null;

  const narrowHeader = (
    <div
      ref={headerRef}
      style={{
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel-2)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        padding: '5px 8px',
      }}
    >
      {/* Row 1: buttons right-aligned */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
        {viewMenuBtn}
        {closeBtn}
      </div>
      {/* Row 2: badge */}
      <div>
        <KindBadge renderer={view.kind} />
      </div>
      {/* Row 3: name + info, truncated */}
      <div
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-math)',
          fontStyle: 'italic',
          fontSize: 'var(--t-meta)',
          color: 'var(--ink)',
        }}
      >
        {objectName}
        {derivationLabel && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontStyle: 'normal',
              fontSize: 'var(--t-micro)',
              color: 'var(--color-derived)',
              marginLeft: '4px',
            }}
          >
            {derivationLabel}
          </span>
        )}
      </div>
    </div>
  );

  const wideHeader = (
    <div
      ref={headerRef}
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

      {/* Object name */}
      <span
        style={{
          fontFamily: 'var(--font-math)',
          fontStyle: 'italic',
          fontSize: 'var(--t-meta)',
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {objectName}
      </span>

      {/* Derivation label */}
      {derivationLabel !== null && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--t-micro)',
            color: 'var(--color-derived)',
            whiteSpace: 'nowrap',
            opacity: 0.85,
            flexShrink: 0,
          }}
        >
          {derivationLabel}
        </span>
      )}

      {/* Visualizer label — fills remaining space, truncates */}
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

      {viewMenuBtn}
      {closeBtn}
    </div>
  );

  return (
    <div
      className={`canvas-tile${isPulsing ? ' derived-pulse' : ''}`}
      style={{
        position: 'relative',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--panel)',
        height: '100%',
        width: '100%',
        minWidth: '100px',
        boxSizing: 'border-box',
      }}
    >
      {isNarrow ? narrowHeader : wideHeader}
      {viewMenuPortal}

      {/* tile-body — content centered */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
          background: 'var(--panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ height: '100%', width: '100%' }}>
          <ViewContainer view={view} />
        </div>
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
          }}
        >
          {footMetaStr}
        </span>
      </div>

      {/* Right-edge drag handle — always shown so any tile can be resized */}
      {onResizeStart && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            onResizeStart(e.clientX);
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
