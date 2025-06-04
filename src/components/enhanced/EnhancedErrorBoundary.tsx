
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentWillUnmount() {
    // Clean up any pending timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  retry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  autoRetry = () => {
    if (this.state.retryCount < 3) {
      const timeout = setTimeout(() => {
        this.retry();
      }, 1000 * Math.pow(2, this.state.retryCount)); // Exponential backoff
      
      this.retryTimeouts.push(timeout);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Something went wrong
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            
            <div className="space-y-3">
              <Button onClick={this.retry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              {this.state.retryCount < 3 && (
                <Button variant="outline" onClick={this.autoRetry} className="w-full">
                  Auto Retry ({3 - this.state.retryCount} attempts left)
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                onClick={() => window.location.reload()} 
                className="w-full text-sm"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
