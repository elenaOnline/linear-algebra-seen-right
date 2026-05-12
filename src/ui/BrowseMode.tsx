import { useState, useCallback } from 'react';
import type { JSX } from 'react';
import { DEFINITIONS } from '../pedagogy/definitions/index.ts';
import type { DefinitionRecord } from '../pedagogy/definitions/index.ts';
import { KindBadge } from './KindBadge.tsx';
import type { RendererKind } from '../registry/index.ts';

// ── Helpers ──────────────────────────────────────────────────────────────

const CHAPTER_LABELS: Record<number, string> = {
  1: 'Chapter 1 — Vector Spaces',
  2: 'Chapter 2 — Finite-Dimensional Vector Spaces',
  3: 'Chapter 3 — Linear Maps',
  4: 'Chapter 4 — Polynomials',
  5: 'Chapter 5 — Eigenvalues and Eigenvectors',
  6: 'Chapter 6 — Inner Product Spaces',
  7: 'Chapter 7 — Operators on Inner Product Spaces',
  8: 'Chapter 8 — Operators on Complex Vector Spaces',
  9: 'Chapter 9 — Multilinear Algebra and Determinants',
};

// Map a visualizer ID to the nearest RendererKind for the kind badge.
function vizToRenderer(vizId: string): RendererKind {
  if (
    vizId.startsWith('arrow') ||
    vizId.startsWith('coordinate-axes') ||
    vizId.startsWith('grid-deformation')
  )
    return 'geometric_2d';
  if (vizId === 'subspace-lattice' || vizId === 'kernel-range-diagram') return 'diagram';
  if (vizId === 'matrix-heatmap') return 'matrix';
  if (vizId === 'dimension-bars') return 'chart';
  return 'symbolic';
}

function primaryRenderer(def: DefinitionRecord): RendererKind {
  const first = def.linkedVisualizers[0];
  return first ? vizToRenderer(first) : 'symbolic';
}

// ── Concept card ─────────────────────────────────────────────────────────

type CardProps = {
  readonly def: DefinitionRecord;
  readonly isOpen: boolean;
  readonly onClick: () => void;
};

function ConceptCard({ def, isOpen, onClick }: CardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const renderer = primaryRenderer(def);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'var(--panel)',
        border: `1px solid ${isOpen ? 'var(--accent-line)' : 'var(--line)'}`,
        boxShadow: isOpen ? '0 0 0 1px var(--accent-line)' : undefined,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 14px 12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!isOpen) e.currentTarget.style.borderColor = 'var(--line-3)';
      }}
      onMouseLeave={(e) => {
        if (!isOpen) e.currentTarget.style.borderColor = 'var(--line)';
      }}
    >
      {/* Chapter reference */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--t-micro)',
          color: 'var(--ink-3)',
          letterSpacing: '0.02em',
        }}
      >
        §{def.axlerRef}
      </span>

      {/* Title */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          fontSize: 'var(--t-body)',
          letterSpacing: '-0.015em',
          lineHeight: 1.25,
          color: 'var(--ink)',
        }}
      >
        {def.title}
      </div>

      {/* Teaser */}
      <p
        style={{
          fontFamily: 'var(--font-math)',
          fontSize: '12.5px',
          color: 'var(--ink-2)',
          lineHeight: 1.55,
          margin: 0,
          display: expanded ? 'block' : '-webkit-box',
          WebkitLineClamp: expanded ? undefined : 2,
          WebkitBoxOrient: 'vertical',
          overflow: expanded ? 'visible' : 'hidden',
        }}
      >
        {def.formalStatement}
      </p>

      {/* Expanded formal definition */}
      {expanded && def.plainStatement && (
        <div
          style={{
            marginTop: '2px',
            padding: '10px 12px',
            background: 'var(--bg-2)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-math)',
            fontSize: '13px',
            lineHeight: 1.6,
            color: 'var(--ink)',
          }}
        >
          {def.plainStatement}
          <div
            style={{
              marginTop: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-micro)',
              color: 'var(--ink-3)',
            }}
          >
            Axler §{def.axlerRef}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
        }}
      >
        <KindBadge renderer={renderer} />
        {def.prerequisites.length > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-math)',
              fontStyle: 'italic',
              fontSize: 'var(--t-micro)',
              color: 'var(--ink-3)',
            }}
          >
            needs: {def.prerequisites.length} prereq{def.prerequisites.length > 1 ? 's' : ''}
          </span>
        )}
        {def.formalStatement.length > 80 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((x) => !x);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: 'var(--t-micro)',
              color: 'var(--ink-3)',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              marginLeft: 'auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            {expanded ? 'Less ⌃' : 'Read definition ⌄'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Side panel ────────────────────────────────────────────────────────────

type SidePanelProps = {
  readonly def: DefinitionRecord;
  readonly allDefs: readonly DefinitionRecord[];
  readonly onClose: () => void;
  readonly onOpenInSandbox: (def: DefinitionRecord) => void;
};

function SidePanel({ def, allDefs, onClose, onOpenInSandbox }: SidePanelProps): JSX.Element {
  const prereqDefs = def.prerequisites
    .map((id) => allDefs.find((d) => d.id === id))
    .filter(Boolean) as DefinitionRecord[];

  const renderer = primaryRenderer(def);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(560px, 46vw)',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--line-2)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-12px 0 32px rgba(22,22,20,0.06)',
        overflowY: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: '16px 22px 14px',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                color: 'var(--ink-3)',
                marginBottom: '4px',
              }}
            >
              §{def.section} · §{def.axlerRef}
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: '20px',
                letterSpacing: '-0.02em',
                margin: '0 0 8px',
                lineHeight: 1.2,
                color: 'var(--ink)',
              }}
            >
              {def.title}
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <KindBadge renderer={renderer} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--t-micro)',
                  color: 'var(--ink-3)',
                }}
              >
                always exact
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-3)',
              fontSize: '16px',
              padding: '2px 6px',
              borderRadius: 'var(--radius)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 22px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}
      >
        {/* Formal definition */}
        <section>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-micro)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: '8px',
            }}
          >
            Definition
          </div>
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-math)',
                fontSize: '15px',
                lineHeight: 1.6,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {def.formalStatement}
            </p>
            <div
              style={{
                marginTop: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                color: 'var(--ink-3)',
              }}
            >
              Axler §{def.axlerRef}
            </div>
          </div>
        </section>

        {/* Plain statement */}
        {def.plainStatement && (
          <section>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: '8px',
              }}
            >
              In plain terms
            </div>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--t-meta)',
                lineHeight: 1.6,
                color: 'var(--ink-2)',
                margin: 0,
              }}
            >
              {def.plainStatement}
            </p>
          </section>
        )}

        {/* Examples / non-examples */}
        {(def.examples.length > 0 || def.nonexamples.length > 0) && (
          <section>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: '8px',
              }}
            >
              Examples & Non-examples
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {def.examples.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--t-micro)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--kind-geo)',
                      marginBottom: '4px',
                    }}
                  >
                    Example
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-math)',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      lineHeight: 1.45,
                    }}
                  >
                    {ex.description}
                  </div>
                </div>
              ))}
              {def.nonexamples.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--t-micro)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--kind-spec)',
                      marginBottom: '4px',
                    }}
                  >
                    Non-example
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-math)',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      lineHeight: 1.45,
                    }}
                  >
                    {ex.description}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Common errors */}
        {def.commonErrors && def.commonErrors.length > 0 && (
          <section>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: '8px',
              }}
            >
              Common errors
            </div>
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {def.commonErrors.map((e, i) => (
                <li
                  key={i}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--t-meta)',
                    lineHeight: 1.55,
                    color: 'var(--ink-2)',
                  }}
                >
                  {e}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Prerequisites */}
        {prereqDefs.length > 0 && (
          <section>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: '8px',
              }}
            >
              Prerequisites
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {prereqDefs.map((p) => (
                <span
                  key={p.id}
                  style={{
                    padding: '3px 10px',
                    border: '1px solid var(--line-2)',
                    borderRadius: '999px',
                    fontSize: 'var(--t-meta)',
                    color: 'var(--ink-2)',
                    fontFamily: 'var(--font-math)',
                    fontStyle: 'italic',
                    background: 'var(--panel)',
                  }}
                >
                  {p.title}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Open in Sandbox */}
        {def.examples.length > 0 && (
          <section>
            <button
              onClick={() => onOpenInSandbox(def)}
              style={{
                padding: '9px 16px',
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--t-meta)',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                letterSpacing: '0.01em',
              }}
            >
              Open in Sandbox →
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Filter chip row ───────────────────────────────────────────────────────

type FilterKind = 'all' | RendererKind;

const FILTER_LABELS: Array<{ kind: FilterKind; label: string }> = [
  { kind: 'all', label: 'All' },
  { kind: 'geometric_2d', label: 'Geometric' },
  { kind: 'diagram', label: 'Abstract' },
  { kind: 'matrix', label: 'Matrix' },
  { kind: 'chart', label: 'Spectral' },
  { kind: 'symbolic', label: 'Symbolic' },
];

// ── BrowseMode ────────────────────────────────────────────────────────────

type BrowseModeProps = {
  readonly onOpenInSandbox: (def: DefinitionRecord) => void;
};

export function BrowseMode({ onOpenInSandbox }: BrowseModeProps): JSX.Element {
  const [openDefId, setOpenDefId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKind>('all');
  const [search, setSearch] = useState('');

  const panelOpen = openDefId !== null;
  const openDef = openDefId ? (DEFINITIONS.find((d) => d.id === openDefId) ?? null) : null;

  const handleCardClick = useCallback((id: string) => {
    setOpenDefId((prev) => (prev === id ? null : id));
  }, []);

  const handleClose = useCallback(() => setOpenDefId(null), []);

  const filteredDefs = DEFINITIONS.filter((d) => {
    if (filter !== 'all' && primaryRenderer(d) !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.axlerRef.includes(q) ||
        d.formalStatement.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by chapter
  const byChapter = new Map<number, DefinitionRecord[]>();
  for (const d of filteredDefs) {
    const arr = byChapter.get(d.chapter) ?? [];
    arr.push(d);
    byChapter.set(d.chapter, arr);
  }
  const chapters = [...byChapter.keys()].sort((a, b) => a - b);

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {/* Scrollable catalog */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 28px 80px',
          transition: 'padding-right 0.22s cubic-bezier(0.32,0.72,0.27,1)',
          paddingRight: panelOpen ? 'calc(min(560px, 46vw) + 28px)' : '28px',
        }}
      >
        {/* Browse header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '24px',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: 'var(--t-display)',
                letterSpacing: '-0.025em',
                margin: '0 0 6px',
                lineHeight: 1.1,
                color: 'var(--ink)',
              }}
            >
              The catalog
            </h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 'var(--t-meta)', margin: 0 }}>
              Definitions from Axler's{' '}
              <span style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic' }}>
                Linear Algebra Done Right
              </span>
            </p>
          </div>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              background: 'var(--panel)',
              border: '1px solid var(--line-2)',
              borderRadius: '7px',
              minWidth: '240px',
            }}
          >
            <span style={{ color: 'var(--ink-4)', fontSize: '13px' }}>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search definitions…"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                fontSize: 'var(--t-meta)',
                fontFamily: 'var(--font-sans)',
                color: 'var(--ink)',
              }}
            />
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {FILTER_LABELS.map(({ kind, label }) => (
            <button
              key={kind}
              onClick={() => setFilter(kind)}
              style={{
                padding: '5px 12px',
                border: '1px solid var(--line-2)',
                borderRadius: '999px',
                fontSize: 'var(--t-meta)',
                fontFamily: 'var(--font-sans)',
                color: filter === kind ? 'var(--bg)' : 'var(--ink-2)',
                background: filter === kind ? 'var(--ink)' : 'var(--panel)',
                borderColor: filter === kind ? 'var(--ink)' : 'var(--line-2)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chapter groups */}
        {chapters.map((ch) => {
          const defs = byChapter.get(ch) ?? [];
          return (
            <div key={ch}>
              {/* Chapter section label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  margin: '32px 0 14px',
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--t-micro)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                    margin: 0,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {CHAPTER_LABELS[ch] ?? `Chapter ${ch}`}
                </h3>
                <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--t-micro)',
                    color: 'var(--ink-4)',
                  }}
                >
                  {defs.length}
                </span>
              </div>
              {/* Card grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 'var(--gap)',
                }}
              >
                {defs.map((def) => (
                  <ConceptCard
                    key={def.id}
                    def={def}
                    isOpen={openDefId === def.id}
                    onClick={() => handleCardClick(def.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredDefs.length === 0 && (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: 'var(--ink-4)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--t-meta)',
            }}
          >
            No definitions match your filter.
          </div>
        )}
      </div>

      {/* Side panel */}
      {openDef && (
        <SidePanel
          def={openDef}
          allDefs={DEFINITIONS}
          onClose={handleClose}
          onOpenInSandbox={onOpenInSandbox}
        />
      )}
    </div>
  );
}
