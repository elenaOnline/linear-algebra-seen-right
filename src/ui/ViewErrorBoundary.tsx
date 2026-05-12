import { Component } from 'react';
import type { JSX, ReactNode, ErrorInfo } from 'react';

type Props = {
  readonly children: ReactNode;
  readonly renderer?: string | undefined;
};

type State = {
  readonly error: Error | null;
};

// Catches errors from renderer components so a single broken view can't unmount the entire app.
export class ViewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {}

  override render(): ReactNode {
    if (this.state.error !== null) {
      return <RendererError renderer={this.props.renderer} message={this.state.error.message} />;
    }
    return this.props.children;
  }
}

function RendererError({
  renderer,
  message,
}: {
  renderer?: string | undefined;
  message: string;
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '100px',
        padding: '12px',
        color: 'var(--ink-3)',
        fontSize: 'var(--t-meta)',
        fontFamily: 'var(--font-mono)',
        border: '1px dashed var(--line-2)',
        borderRadius: 'var(--radius)',
        gap: '4px',
      }}
    >
      <span style={{ color: 'var(--kind-spec)', fontWeight: 500 }}>
        {renderer ?? 'renderer'} failed to initialize
      </span>
      <span
        style={{
          color: 'var(--ink-4)',
          fontSize: 'var(--t-micro)',
          maxWidth: '240px',
          textAlign: 'center',
        }}
      >
        {message}
      </span>
    </div>
  );
}
