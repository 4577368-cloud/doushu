
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fixed ErrorBoundary class to correctly handle TypeScript state and props
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Use state property directly or in constructor
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Access state via this.state
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#dc2626' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>应用遇到错误</h1>
          <pre style={{ backgroundColor: '#f3f4f6', padding: '1rem', marginTop: '1rem', borderRadius: '0.5rem', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <p style={{ marginTop: '1rem', color: '#4b5563' }}>请检查控制台获取更多详细信息。</p>
        </div>
      );
    }

    // Access props via this.props
    return this.props.children;
  }
}

const mount = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Could not find root element to mount to");
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      {/* Fixed: Pass children to ErrorBoundary to satisfy its type requirements */}
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
