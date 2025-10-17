/**
 * Main React entry point for PAYMINT popup
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Create root and render app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
} else {
  console.error('Root container not found');
}