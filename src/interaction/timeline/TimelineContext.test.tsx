import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { TimelineProvider, useTimeline } from './TimelineContext.tsx';
import { defaultStore } from '../../state/index.ts';
import { _resetSpaceRegistry } from '../../types/space.ts';
import { _resetIdCounter } from '../../types/ids.ts';
import { _resetStateCounters } from '../../state/types.ts';
import { INITIAL_SESSION } from '../../state/types.ts';

function resetAll() {
  _resetSpaceRegistry();
  _resetStateCounters();
  _resetIdCounter();
  defaultStore.setState(INITIAL_SESSION);
}

beforeEach(resetAll);
afterEach(cleanup);

// Helper: consumer component that exposes timeline context via data attributes
function TimelineConsumer(): JSX.Element {
  const tl = useTimeline();
  return (
    <div
      data-keyframe-count={tl.state.keyframes.length}
      data-is-playing={String(tl.state.isPlaying)}
      data-current-time={tl.state.currentTime}
      data-has-interpolated={String(tl.interpolatedSnapshot !== null)}
    >
      <button onClick={() => tl.addKeyframe()}>add</button>
      <button onClick={() => tl.play()}>play</button>
      <button onClick={() => tl.pause()}>pause</button>
      <button onClick={() => tl.setCurrentTime(0.5)}>scrub</button>
    </div>
  );
}

function Wrapper({ children }: { readonly children: ReactNode }): JSX.Element {
  return <TimelineProvider>{children}</TimelineProvider>;
}

describe('TimelineProvider', () => {
  it('renders without crashing with zero keyframes', () => {
    const { container } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('starts with zero keyframes and not playing', () => {
    const { getByRole } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    const btn = getByRole('button', { name: 'add' }).parentElement!;
    expect(btn.dataset['keyframeCount']).toBe('0');
    expect(btn.dataset['isPlaying']).toBe('false');
  });

  it('addKeyframe increases keyframe count', () => {
    const { getByRole } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    const addBtn = getByRole('button', { name: 'add' });
    act(() => {
      addBtn.click();
    });
    const div = addBtn.parentElement!;
    expect(div.dataset['keyframeCount']).toBe('1');
  });

  it('interpolatedSnapshot is null when fewer than 2 keyframes', () => {
    const { getByRole } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    const addBtn = getByRole('button', { name: 'add' });
    const div = addBtn.parentElement!;
    expect(div.dataset['hasInterpolated']).toBe('false');

    act(() => {
      addBtn.click();
    }); // 1 keyframe
    expect(div.dataset['hasInterpolated']).toBe('false');
  });

  it('interpolatedSnapshot is null when at an integer time (exactly on a keyframe)', () => {
    const { getByRole } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    const addBtn = getByRole('button', { name: 'add' });
    act(() => {
      addBtn.click();
    }); // keyframe 0
    act(() => {
      addBtn.click();
    }); // keyframe 1
    // currentTime is still 0 (integer) — no interpolation
    const div = addBtn.parentElement!;
    expect(div.dataset['hasInterpolated']).toBe('false');
  });

  it('interpolatedSnapshot is non-null between two keyframes', () => {
    const { getByRole } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    const addBtn = getByRole('button', { name: 'add' });
    const scrubBtn = getByRole('button', { name: 'scrub' });
    act(() => {
      addBtn.click();
    }); // keyframe 0
    act(() => {
      addBtn.click();
    }); // keyframe 1
    act(() => {
      scrubBtn.click();
    }); // currentTime = 0.5
    const div = addBtn.parentElement!;
    expect(div.dataset['hasInterpolated']).toBe('true');
  });

  it('play sets isPlaying to true', () => {
    const { getByRole } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    const addBtn = getByRole('button', { name: 'add' });
    const playBtn = getByRole('button', { name: 'play' });
    act(() => {
      addBtn.click();
    }); // keyframe 0
    act(() => {
      addBtn.click();
    }); // keyframe 1
    act(() => {
      playBtn.click();
    });
    const div = addBtn.parentElement!;
    expect(div.dataset['isPlaying']).toBe('true');
  });

  it('pause sets isPlaying to false', () => {
    const { getByRole } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    const addBtn = getByRole('button', { name: 'add' });
    const playBtn = getByRole('button', { name: 'play' });
    const pauseBtn = getByRole('button', { name: 'pause' });
    act(() => {
      addBtn.click();
    });
    act(() => {
      addBtn.click();
    });
    act(() => {
      playBtn.click();
    });
    act(() => {
      pauseBtn.click();
    });
    const div = addBtn.parentElement!;
    expect(div.dataset['isPlaying']).toBe('false');
  });

  it('play does nothing with fewer than 2 keyframes', () => {
    const { getByRole } = render(
      <Wrapper>
        <TimelineConsumer />
      </Wrapper>,
    );
    const playBtn = getByRole('button', { name: 'play' });
    act(() => {
      playBtn.click();
    });
    const div = playBtn.parentElement!;
    expect(div.dataset['isPlaying']).toBe('false');
  });
});

describe('useTimeline — outside provider', () => {
  it('throws when used outside TimelineProvider', () => {
    // Suppress the expected React error boundary console output in tests
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<TimelineConsumer />)).toThrow(
      'useTimeline must be used inside <TimelineProvider>',
    );
    console.error = consoleError;
  });
});
