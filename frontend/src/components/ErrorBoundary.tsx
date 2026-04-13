/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in child component tree
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Auto-reload once on chunk load failures (happens after a new deploy when
    // the browser has stale JS chunk URLs cached in memory)
    const isChunkError = error.message?.includes('Importing a module') ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.name === 'ChunkLoadError';
    
    if (isChunkError) {
      const reloadKey = 'chunk_reload_attempt';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        return;
      }
    }
    
    // ALWAYS log errors (both dev and prod) for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo?.componentStack);
    
    // Send to Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          background: '#f5f5f5'
        }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle="We're sorry, but something unexpected happened. Please try again."
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                Reload Page
              </Button>,
              <Button key="home" onClick={this.handleGoHome}>
                Go to Dashboard
              </Button>,
            ]}
          >
            {/* Always show error details for debugging */}
            {this.state.error && (
              <div style={{ 
                textAlign: 'left', 
                background: '#fff1f0', 
                padding: 16, 
                borderRadius: 8,
                marginTop: 16 
              }}>
                <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: 300 }}>
                  <strong>Error:</strong> {this.state.error.toString()}
                  {'\n\n'}
                  <strong>Stack:</strong>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
