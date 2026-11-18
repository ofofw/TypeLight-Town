import { Component, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/** An unexpected error while drawing a page shows a way back instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error(error);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page blocker">
        <div className="blocker__card" role="alert">
          <h1>出了点小问题</h1>
          <p>已经保存的进度还在这台设备上。点“重新加载”回到游戏。</p>
          <button type="button" className="btn btn--primary btn--large" onClick={() => location.reload()}>
            重新加载
          </button>
        </div>
      </main>
    );
  }
}
