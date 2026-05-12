import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import type { JSX } from 'react';
import { TimelineScrubBar } from './TimelineScrubBar.tsx';
import { TimelineProvider } from '../interaction/timeline/TimelineContext.tsx';

afterEach(cleanup);

function Wrapper(): JSX.Element {
  return (
    <TimelineProvider>
      <TimelineScrubBar />
    </TimelineProvider>
  );
}

describe('TimelineScrubBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<Wrapper />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows the play button (▶) when not playing', () => {
    const { getByTitle } = render(<Wrapper />);
    const btn = getByTitle('Play');
    expect(btn.textContent).toBe('▶');
  });

  it('shows the ⊕ Keyframe button', () => {
    const { getByTitle } = render(<Wrapper />);
    const btn = getByTitle('Capture current state as a keyframe');
    expect(btn.textContent).toBe('⊕ Keyframe');
  });

  it('play button is disabled with fewer than 2 keyframes', () => {
    const { getByTitle } = render(<Wrapper />);
    const playBtn = getByTitle('Play') as HTMLButtonElement;
    expect(playBtn.disabled).toBe(true);
  });

  it('clicking ⊕ Keyframe adds a keyframe (play button becomes enabled after 2)', () => {
    const { getByTitle } = render(<Wrapper />);
    const addBtn = getByTitle('Capture current state as a keyframe');
    const playBtn = getByTitle('Play') as HTMLButtonElement;

    act(() => {
      addBtn.click();
    }); // 1 keyframe — still disabled
    expect(playBtn.disabled).toBe(true);

    act(() => {
      addBtn.click();
    }); // 2 keyframes — now enabled
    expect(playBtn.disabled).toBe(false);
  });

  it('shows ⏸ when playing', () => {
    const { getByTitle } = render(<Wrapper />);
    const addBtn = getByTitle('Capture current state as a keyframe');
    act(() => {
      addBtn.click();
    });
    act(() => {
      addBtn.click();
    });
    const playBtn = getByTitle('Play');
    act(() => {
      playBtn.click();
    });
    const pauseBtn = getByTitle('Pause');
    expect(pauseBtn.textContent).toBe('⏸');
  });
});
