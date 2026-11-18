import { Component } from "react";

/** Last-resort safety net: a render crash shows a friendly screen instead of a blank page. */
export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error("UI crashed:", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-950 px-6 text-center text-zinc-100">
        <div className="text-6xl">🎞️</div>
        <h1 className="font-display text-2xl font-bold">The reel snapped</h1>
        <p className="max-w-sm text-sm text-zinc-400">Something went wrong on this page. Reload to get back to the movies.</p>
        <button onClick={() => { window.location.href = "/"; }} className="rounded-xl bg-gradient-to-r from-brand-rose to-brand-violet px-6 py-2.5 text-sm font-semibold">Back to home</button>
      </div>
    );
  }
}
