import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App.tsx';
import './styles/index.css';

// Fix for many Ethereum-related libraries that expect Buffer to be global
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

import { Web3Provider } from './context/Web3Context';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </StrictMode>
);
