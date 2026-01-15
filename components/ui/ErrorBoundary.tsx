import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-rose-50 text-center">
          <AlertTriangle size={48} className="text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-rose-800 mb-2">排盘显示出错了</h2>
          <p className="text-xs text-rose-600 mb-4 bg-white p-3 rounded border border-rose-200 w-full overflow-auto text-left font-mono">
            {this.state.error?.toString() || "未知错误"}
          </p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-rose-600 text-white rounded-lg shadow font-bold text-sm">刷新页面重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}