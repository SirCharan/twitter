"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="rounded-2xl border px-4 py-4"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--accent-dim)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm" style={{ color: "var(--negative)" }}>
              !
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Something went wrong
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{
              borderColor: "var(--accent-dim)",
              color: "var(--accent)",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
