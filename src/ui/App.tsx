import { useState } from 'react';
import type { JSX } from 'react';
import { useStore } from 'zustand';
import { defaultStore } from '../state/index.ts';
import { ViewGrid } from './ViewGrid.tsx';
import { ObjectInput } from './ObjectInput.tsx';
import { TimelineProvider } from '../interaction/timeline/TimelineContext.tsx';
import { TimelineScrubBar } from './TimelineScrubBar.tsx';

type Mode = 'sandbox' | 'browse';

function BrowsePlaceholder(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '10px',
        color: 'var(--ink-3)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--t-meta)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--t-h2)',
          color: 'var(--ink-4)',
          fontFamily: 'var(--font-math)',
          fontStyle: 'italic',
        }}
      >
        The catalog
      </span>
      <span>Browse mode — coming in Phase 8.</span>
    </div>
  );
}

function SandboxLayout(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <main style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <ViewGrid />
      </main>
      <TimelineScrubBar />
      <ObjectInput />
    </div>
  );
}

function AppInner(): JSX.Element {
  const [mode, setMode] = useState<Mode>('sandbox');

  const historyCursor = useStore(defaultStore, (s) => s.historyCursor);
  const historyLength = useStore(defaultStore, (s) => s.history.length);
  const field = useStore(defaultStore, (s) => s.field);
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

        {/* Field pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '4px 10px 4px 9px',
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: '999px',
            fontSize: 'var(--t-micro)',
            color: 'var(--ink-2)',
            fontFamily: 'var(--font-mono)',
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
          <span style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic', fontSize: '13px' }}>
            {field === 'R' ? 'ℝ' : 'ℂ'}
          </span>
          <button
            onClick={() => defaultStore.getState().setField(field === 'R' ? 'C' : 'R')}
            style={{
              fontSize: 'var(--t-micro)',
              color: 'var(--ink-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1,
            }}
            title={`Switch to ${field === 'R' ? 'ℂ' : 'ℝ'}`}
          >
            ⇄
          </button>
        </div>

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
        {mode === 'sandbox' ? <SandboxLayout /> : <BrowsePlaceholder />}
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
