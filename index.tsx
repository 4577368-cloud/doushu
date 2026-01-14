
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ==============================
// ✅ PWA Service Worker 注册（安全、无报错）
// ==============================
if ('serviceWorker' in navigator) {
  const isProduction =
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD);

  // In AI Studio environment, we must ensure the Service Worker is registered from the same origin.
  // Using a relative path and checking the hostname to avoid cross-origin registration failures.
  if (isProduction || window.location.hostname.includes('usercontent.goog')) {
    window.addEventListener('load', () => {
      // ✅ Use relative path to ensure it matches current origin
      const swPath = './sw.js';

      navigator.serviceWorker
        .register(swPath)
        .then((registration) => {
          console.log('✅ PWA Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.warn('⚠️ PWA Service Worker registration failed:', error);
        });
    });
  }
}
