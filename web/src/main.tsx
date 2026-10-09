import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  override state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('RootErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', color: '#f87171', fontFamily: 'monospace', background: '#090d16', minHeight: '100vh' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>UI Render Error Encountered</h2>
          <pre style={{ marginTop: '16px', background: '#020617', padding: '16px', borderRadius: '8px', border: '1px solid #334155', overflowX: 'auto', color: '#cbd5e1' }}>
            {this.state.error?.stack || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#06b6d4', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);

// Register PWA service worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('ServiceWorker registration error:', err);
    });
  });
}
