import { useState, useCallback } from 'react';
import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../state/index.ts';
import { ViewGrid } from './ViewGrid.tsx';
import { ObjectInput } from './ObjectInput.tsx';
import { ObjectLibrary } from './ObjectLibrary.tsx';
import { Inspector } from './Inspector.tsx';
import { TimelineProvider } from '../interaction/timeline/TimelineContext.tsx';
import { TimelineScrubBar } from './TimelineScrubBar.tsx';
import { BrowseMode } from './BrowseMode.tsx';
import { loadScene } from '../pedagogy/loadScene.ts';
import { getTemplateById } from '../pedagogy/templates/index.ts';
import type { DefinitionRecord } from '../pedagogy/definitions/index.ts';
import type { MathObjectRef } from '../state/types.ts';

type Mode = 'sandbox' | 'browse';

type SandboxLayoutProps = {
  readonly originDefId: string | null;
  readonly gridRows: 1 | 2;
};

function SandboxLayout({ originDefId, gridRows }: SandboxLayoutProps): JSX.Element {
  const [selected, setSelected] = useState<MathObjectRef | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Three-column workbench */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '220px 1fr 280px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Object library */}
        <div
          style={{
            background: 'var(--panel)',
            borderRight: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: '9px 14px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--panel-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                fontWeight: 500,
              }}
            >
              Objects
            </span>
          </div>
          <ObjectLibrary selected={selected} onSelect={setSelected} />
        </div>

        {/* Canvas */}
        <div
          style={{
            background: 'var(--bg)',
            borderRight: '1px solid var(--line)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <ViewGrid rows={gridRows} />
          </div>
        </div>

        {/* Inspector */}
        <div
          style={{
            background: 'var(--panel)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: '9px 14px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--panel-2)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--t-micro)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                fontWeight: 500,
              }}
            >
              Inspector
            </span>
          </div>
          <Inspector selected={selected} originDefId={originDefId} />
        </div>
      </div>

      {/* Bottom bar */}
      <TimelineScrubBar />
      <ObjectInput />
    </div>
  );
}

function AppInner(): JSX.Element {
  const [mode, setMode] = useState<Mode>('sandbox');
  const [originDefId, setOriginDefId] = useState<string | null>(null);
  const [gridRows, setGridRows] = useState<1 | 2>(1);

  const handleOpenInSandbox = useCallback((def: DefinitionRecord) => {
    try {
      const firstExample = def.examples[0];
      if (!firstExample) return;
      const template = getTemplateById(firstExample.templateId);
      if (!template) return;
      const build = template.build(firstExample.parameters ?? {});
      loadScene(build);
      setOriginDefId(def.id);
      setMode('sandbox');
    } catch (e) {
      // Template build failure — log and stay in Browse mode rather than
      // silently resetting the session to an empty state.
      console.error('[Open in Sandbox] scene template failed:', e);
    }
  }, []);

  const historyCursor = useStore(defaultStore, (s) => s.historyCursor);
  const historyLength = useStore(defaultStore, (s) => s.history.length);
  const { undo, redo } = defaultStore.getState();
  const canUndo = historyCursor > 0;
  const canRedo = historyCursor < historyLength - 1;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Top bar ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          padding: '10px 20px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
          flexShrink: 0,
        }}
      >
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              background: 'var(--ink)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--bg)',
              fontFamily: 'var(--font-math)',
              fontStyle: 'italic',
              fontSize: '14px',
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            L
          </div>
          <span
            style={{
              fontSize: 'var(--t-body)',
              fontWeight: 500,
              letterSpacing: '-0.005em',
              color: 'var(--ink)',
            }}
          >
            LADR Visualizer
          </span>
          <span
            style={{
              fontSize: 'var(--t-micro)',
              color: 'var(--ink-3)',
              fontFamily: 'var(--font-mono)',
              marginLeft: '2px',
            }}
          >
            by Axler
          </span>
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: '7px',
            padding: '2px',
          }}
        >
          {(['browse', 'sandbox'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '4px 14px',
                borderRadius: '5px',
                fontSize: 'var(--t-meta)',
                color: mode === m ? 'var(--ink)' : 'var(--ink-3)',
                background: mode === m ? 'var(--panel)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                boxShadow:
                  mode === m ? '0 1px 0 var(--line-2), 0 1px 3px rgba(22,22,20,0.04)' : 'none',
                fontFamily: 'var(--font-sans)',
                textTransform: 'capitalize',
                letterSpacing: '0',
              }}
            >
              {m === 'browse' ? 'Browse' : 'Sandbox'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Card height toggle */}
        <button
          onClick={() => setGridRows((r) => (r === 1 ? 2 : 1))}
          title={gridRows === 1 ? 'Switch to 2-tall card layout' : 'Switch to 1-tall card layout'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: '999px',
            fontSize: 'var(--t-micro)',
            color: 'var(--ink-2)',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
              flexShrink: 0,
            }}
          />
          {gridRows === 1 ? '1×' : '2×'}
        </button>

        {/* Undo / redo */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(
            [
              { label: '↩', action: undo, can: canUndo, title: 'Undo' },
              { label: '↪', action: redo, can: canRedo, title: 'Redo' },
            ] as const
          ).map(({ label, action, can, title }) => (
            <button
              key={title}
              onClick={action}
              disabled={!can}
              title={title}
              style={{
                padding: '3px 8px',
                fontSize: '0.85rem',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--radius)',
                background: 'var(--panel)',
                color: can ? 'var(--ink-2)' : 'var(--ink-4)',
                cursor: can ? 'pointer' : 'default',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {mode === 'sandbox' ? (
          <SandboxLayout originDefId={originDefId} gridRows={gridRows} />
        ) : (
          <BrowseMode onOpenInSandbox={handleOpenInSandbox} />
        )}
      </div>
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <TimelineProvider>
      <AppInner />
    </TimelineProvider>
  );
}
