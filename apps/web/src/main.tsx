import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { InvisibleComputer } from './InvisibleComputer.tsx';
import './App.css';
import './tokens.css';

// The Invisible Online Computer is the public surface; the console dashboard
// lives at /console and the older panels at /console/legacy, so the two are
// never stacked on one page.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const Surface =
  path === '/console' ? (
    <App surface="dashboard" />
  ) : path === '/console/legacy' ? (
    <App surface="legacy" />
  ) : (
    <InvisibleComputer />
  );

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{Surface}</React.StrictMode>);
