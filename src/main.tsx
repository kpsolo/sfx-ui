import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { startAnimatedFavicon } from './app/animatedFavicon';
import './index.css';

startAnimatedFavicon();

if (import.meta.env.DEV) {
  // GPU self test without HTML-in-Canvas: `await __sfxSelfTest()` in the console.
  (window as unknown as Record<string, unknown>).__sfxSelfTest = (show = true) =>
    import('./kit/dev/selfTest').then((m) => m.runSelfTest({ show }));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
