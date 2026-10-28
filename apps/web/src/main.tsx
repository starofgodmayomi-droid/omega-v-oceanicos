import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { InvisibleComputer } from './InvisibleComputer.tsx';
import './App.css';
import './tokens.css';

// The Invisible Online Computer is the public surface; the full console keeps
// its own path so every existing panel stays reachable.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const Surface = path === '/console' ? App : InvisibleComputer;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Surface />
  </React.StrictMode>
);
