// Entry point - React renders the app with Redux, Live is embedded inside
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactApp } from './ReactApp';

function initApp() {
  const container = document.getElementById('react-root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<ReactApp />);
  }
}

// Handle case where DOM is already loaded (ES modules)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}
