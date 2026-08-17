import React from 'react';
import { createRoot } from 'react-dom/client';
import { loadContent, applyContent } from './content.js';
import '../styles.css';

// App.jsx MUST be imported dynamically AFTER applyContent(): its module evaluation
// snapshots product data (productBase, syncProductLanguage). A static import here
// silently breaks content loading — do not "clean up".
loadContent().then(async bundle => {
  applyContent(bundle);
  const { default: App } = await import('./App.jsx');
  createRoot(document.getElementById('root')).render(
    <React.StrictMode><App /></React.StrictMode>
  );
});
