import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { InvisibleComputer } from './InvisibleComputer.tsx';
import './App.css';
import './tokens.css';

// The Invisible Online Computer is the public surface; the console dashboard
// lives at /console. The older panels are a toggle inside that page, not a
// route of their own — /console/legacy only opens the toggle on arrival.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const onConsole = path === '/console' || path === '/console/legacy';
const Surface = onConsole ? (
  <App surface={path === '/console/legacy' ? 'legacy' : 'dashboard'} />
) : (
  <InvisibleComputer />
);

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{Surface}</React.StrictMode>);
