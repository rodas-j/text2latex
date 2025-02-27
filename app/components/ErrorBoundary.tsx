import React, { Component, ErrorInfo, ReactNode } from "react";
import { clearConvexCache } from "~/utils/convex-helpers";
import { ConvexReactClient } from "convex/react";

interface ErrorBoundaryProps {
  children: ReactNode;
  convexClient: ConvexReactClient;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRefreshing: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRefreshing: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      isRefreshing: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);

    // Check if it's a Convex error
    if (
      error.toString().includes("Convex") ||
      error.toString().includes("getHistory")
    ) {
      this.handleConvexError();
    }
  }

  handleConvexError = (): void => {
    const { convexClient } = this.props;

    // Set refreshing state
    this.setState({ isRefreshing: true });

    // Clear Convex cache
    clearConvexCache(convexClient);

    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  render(): ReactNode {
    const { hasError, error, isRefreshing } = this.state;
    const { children } = this.props;

    if (hasError) {
      // If we're already refreshing, show a loading message
      if (isRefreshing) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
            <h2 className="text-xl font-bold mb-4">
              Refreshing application...
            </h2>
            <p className="text-gray-500 mb-4">
              Please wait while we fix the issue.
            </p>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        );
      }

      // Check if it's a Convex error
      const isConvexError =
        error?.toString().includes("Convex") ||
        error?.toString().includes("getHistory");

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>

          {isConvexError ? (
            <>
              <p className="text-gray-500 mb-4">
                We encountered an issue with the data connection. This is
                usually caused by cached data.
              </p>
              <button
                onClick={this.handleConvexError}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Refresh and Fix
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 mb-4">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Refresh Page
              </button>
            </>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
