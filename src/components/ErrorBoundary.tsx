
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">We encountered an error while rendering this component.</p>
          <Button 
            variant="outline" 
            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
