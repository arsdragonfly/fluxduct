// Entry point - Live owns the app root; fixed DOM chrome is managed from Live
import React, { render } from '@use-gpu/live';
import { LiveApp } from './LiveApp';

function initApp() {
  render(<LiveApp />);
}

// Handle case where DOM is already loaded (ES modules)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}
