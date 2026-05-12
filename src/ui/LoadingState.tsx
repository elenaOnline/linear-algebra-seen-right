import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { LOADING_MESSAGES } from './loadingMessages.ts';

type Props = {
  readonly intervalMs?: number;
};

export function LoadingState({ intervalMs = 1400 }: Props): JSX.Element {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '80px',
        color: 'var(--ink-3)',
        fontStyle: 'italic',
        fontFamily: 'var(--font-math)',
        fontSize: 'var(--t-body)',
        userSelect: 'none',
      }}
    >
      {LOADING_MESSAGES[index]}
    </div>
  );
}
