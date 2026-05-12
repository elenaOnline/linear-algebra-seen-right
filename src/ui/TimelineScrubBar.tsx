import { useRef } from 'react';
import type { JSX } from 'react';
import { useTimeline } from '../interaction/timeline/TimelineContext.tsx';

const TRACK_HEIGHT = 4;
const DOT_RADIUS = 6;

export function TimelineScrubBar(): JSX.Element {
  const { state, addKeyframe, setCurrentTime, play, pause } = useTimeline();
  const { keyframes, currentTime, isPlaying } = state;
  const trackRef = useRef<HTMLDivElement>(null);

  const frameCount = keyframes.length;
  const maxTime = Math.max(0, frameCount - 1);
  const progress = maxTime > 0 ? currentTime / maxTime : 0;

  function timeFromClientX(clientX: number): number {
    const track = trackRef.current;
    if (!track || maxTime === 0) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * maxTime;
  }

  function handleTrackMouseDown(e: React.MouseEvent<HTMLDivElement>): void {
    e.preventDefault();
    setCurrentTime(timeFromClientX(e.clientX));

    const handleMove = (me: MouseEvent) => {
      setCurrentTime(timeFromClientX(me.clientX));
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }

  const displayTime =
    frameCount === 0 ? '—' : `${Math.min(Math.round(currentTime) + 1, frameCount)} / ${frameCount}`;

  const emptyHint =
    frameCount === 0
      ? 'Add keyframes to animate.'
      : frameCount === 1
        ? 'Add a second keyframe to interpolate.'
        : null;

  return (
    <div
      style={{
        borderTop: '1px solid var(--line-2)',
        padding: '7px var(--pad)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--t-meta)',
        color: 'var(--ink-2)',
        background: 'var(--bg-2)',
      }}
    >
      {/* Play / Pause */}
      <button
        onClick={isPlaying ? pause : play}
        title={isPlaying ? 'Pause' : 'Play'}
        disabled={frameCount < 2}
        style={{
          padding: '2px 8px',
          fontSize: 'var(--t-meta)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--radius)',
          background: 'var(--panel)',
          color: frameCount >= 2 ? 'var(--ink-2)' : 'var(--ink-4)',
          cursor: frameCount >= 2 ? 'pointer' : 'default',
          flexShrink: 0,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Scrub track */}
      <div style={{ flex: 1, position: 'relative', padding: `${DOT_RADIUS}px 0` }}>
        <div
          ref={trackRef}
          onMouseDown={handleTrackMouseDown}
          style={{
            height: `${TRACK_HEIGHT}px`,
            background: 'var(--line-2)',
            borderRadius: '2px',
            position: 'relative',
            cursor: frameCount >= 2 ? 'pointer' : 'default',
          }}
        >
          {frameCount >= 2 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progress * 100}%`,
                background: 'var(--accent)',
                borderRadius: '2px',
                pointerEvents: 'none',
              }}
            />
          )}
          {frameCount >= 2 &&
            keyframes.map((kf, i) => {
              const pct = (i / maxTime) * 100;
              return (
                <div
                  key={i}
                  title={kf.label ?? `Keyframe ${i + 1}`}
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `${DOT_RADIUS * 2}px`,
                    height: `${DOT_RADIUS * 2}px`,
                    borderRadius: '50%',
                    background:
                      i <= Math.floor(currentTime) ? 'var(--accent)' : 'var(--accent-soft)',
                    border: '2px solid var(--bg)',
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                    outline: `1px solid var(--accent-line)`,
                  }}
                />
              );
            })}
        </div>
      </div>

      {/* Time display */}
      <span style={{ flexShrink: 0, minWidth: '3rem', textAlign: 'center', color: 'var(--ink-3)' }}>
        {emptyHint ?? displayTime}
      </span>

      {/* Add keyframe */}
      <button
        onClick={() => addKeyframe()}
        title="Capture current state as a keyframe"
        style={{
          padding: '2px 8px',
          fontSize: 'var(--t-meta)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--radius)',
          background: 'var(--panel)',
          color: 'var(--ink-2)',
          cursor: 'pointer',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
        }}
      >
        ⊕ Keyframe
      </button>
    </div>
  );
}
