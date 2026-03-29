import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App.tsx';
import './styles/index.css';

// Fix for many Ethereum-related libraries that expect Buffer to be global
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
