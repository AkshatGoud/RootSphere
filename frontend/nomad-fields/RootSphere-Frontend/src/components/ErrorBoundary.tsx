import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-red-500">error</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Something went wrong</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              An unexpected error occurred. Please reload the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-primary-dark transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
