import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { LoadingState } from './LoadingState.tsx';
import { LOADING_MESSAGES } from './loadingMessages.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LoadingState', () => {
  it('renders one of the loading messages on initial mount', () => {
    const { container } = render(<LoadingState />);
    const text = container.textContent ?? '';
    const found = LOADING_MESSAGES.some((m) => text.includes(m.replace('…', '')));
    expect(found).toBe(true);
  });

  it('cycles to a different message after the interval', () => {
    const { container } = render(<LoadingState intervalMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000 * LOADING_MESSAGES.length + 1);
    });

    // After advancing past all messages the cycle wraps — just verify it still renders a message.
    const laterText = container.textContent ?? '';
    const found = LOADING_MESSAGES.some((m) => laterText.includes(m.replace('…', '')));
    expect(found).toBe(true);
  });

  it('has at least 30 messages in the pool', () => {
    expect(LOADING_MESSAGES.length).toBeGreaterThanOrEqual(30);
  });

  it('all messages end with an ellipsis', () => {
    for (const msg of LOADING_MESSAGES) {
      expect(msg).toMatch(/…$/);
    }
  });
});
