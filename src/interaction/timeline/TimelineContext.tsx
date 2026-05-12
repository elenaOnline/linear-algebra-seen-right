import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { JSX, ReactNode } from 'react';
import { defaultStore } from '../../state/index.ts';
import { interpolateSnapshots } from './interpolation.ts';
import type { TimelineState, TimelineKeyframe } from './types.ts';
import type { SessionSnapshot } from '../../state/types.ts';

type TimelineContextValue = {
  readonly state: TimelineState;
  readonly addKeyframe: (label?: string) => void;
  readonly removeKeyframe: (index: number) => void;
  readonly setCurrentTime: (t: number) => void;
  readonly play: () => void;
  readonly pause: () => void;
  readonly interpolatedSnapshot: SessionSnapshot | null;
};

const TimelineContext = createContext<TimelineContextValue | null>(null);

const EMPTY: TimelineState = {
  keyframes: [],
  currentTime: 0,
  isPlaying: false,
};

function extractSnapshot(session: ReturnType<typeof defaultStore.getState>): SessionSnapshot {
  return {
    field: session.field,
    spaces: session.spaces,
    subspaces: session.subspaces,
    maps: session.maps,
    vectors: session.vectors,
    bases: session.bases,
    innerProducts: session.innerProducts,
    selectedBasis: session.selectedBasis,
    namedObjects: session.namedObjects,
  };
}

function computeInterpolated(
  keyframes: readonly TimelineKeyframe[],
  currentTime: number,
): SessionSnapshot | null {
  if (keyframes.length < 2) return null;
  const lo = Math.floor(currentTime);
  const hi = Math.ceil(currentTime);
  if (lo === hi) return null; // exactly on a keyframe — use live session
  const frameA = keyframes[lo];
  const frameB = keyframes[hi];
  if (frameA === undefined || frameB === undefined) return null;
  const t = currentTime - lo;
  return interpolateSnapshots(frameA.snapshot, frameB.snapshot, t);
}

type Props = { readonly children: ReactNode };

export function TimelineProvider({ children }: Props): JSX.Element {
  const [state, setState] = useState<TimelineState>(EMPTY);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const addKeyframe = useCallback((label?: string) => {
    const snapshot = extractSnapshot(defaultStore.getState());
    const keyframe: TimelineKeyframe = label !== undefined ? { snapshot, label } : { snapshot };
    setState((prev) => ({
      ...prev,
      keyframes: [...prev.keyframes, keyframe],
    }));
  }, []);

  const removeKeyframe = useCallback((index: number) => {
    setState((prev) => {
      const keyframes = prev.keyframes.filter((_, i) => i !== index);
      const maxTime = Math.max(0, keyframes.length - 1);
      return {
        ...prev,
        keyframes,
        currentTime: Math.min(prev.currentTime, maxTime),
        isPlaying: keyframes.length < 2 ? false : prev.isPlaying,
      };
    });
  }, []);

  const setCurrentTime = useCallback((t: number) => {
    setState((prev) => {
      const maxTime = Math.max(0, prev.keyframes.length - 1);
      return { ...prev, currentTime: Math.max(0, Math.min(t, maxTime)) };
    });
  }, []);

  const play = useCallback(() => {
    setState((prev) => {
      if (prev.keyframes.length < 2) return prev;
      // If at the end, restart from beginning
      const currentTime = prev.currentTime >= prev.keyframes.length - 1 ? 0 : prev.currentTime;
      return { ...prev, isPlaying: true, currentTime };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  // requestAnimationFrame playback loop
  useEffect(() => {
    if (!state.isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastTimeRef.current = null;
      }
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = (timestamp - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = timestamp;

      setState((prev) => {
        const maxTime = prev.keyframes.length - 1;
        const nextTime = prev.currentTime + dt * 0.5; // 0.5 units/sec
        if (nextTime >= maxTime) {
          return { ...prev, currentTime: maxTime, isPlaying: false };
        }
        return { ...prev, currentTime: nextTime };
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state.isPlaying]);

  const interpolatedSnapshot = computeInterpolated(state.keyframes, state.currentTime);

  const value: TimelineContextValue = {
    state,
    addKeyframe,
    removeKeyframe,
    setCurrentTime,
    play,
    pause,
    interpolatedSnapshot,
  };

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}

export function useTimeline(): TimelineContextValue {
  const ctx = useContext(TimelineContext);
  if (ctx === null) {
    throw new Error('useTimeline must be used inside <TimelineProvider>');
  }
  return ctx;
}
