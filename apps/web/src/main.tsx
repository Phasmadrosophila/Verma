import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Verma web root element is missing');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
