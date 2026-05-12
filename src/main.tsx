import './styles/tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.tsx';
import { seedDemo } from './demo.ts';

seedDemo();

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element not found — check index.html has <div id="root">.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
