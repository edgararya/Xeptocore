// frontend/src/renderer/main.jsx
// Renderer entry point: mounts <App /> into index.html.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
