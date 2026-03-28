import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // lucide-react is standard ESM and should be optimized by Vite to avoid dynamic node_modules requests
  optimizeDeps: {
    include: ['lucide-react'],
    exclude: ['hardhat', '@nomicfoundation/hardhat-toolbox', '@nomicfoundation/hardhat-ethers', 'ethers'],
  },
  build: {
    rollupOptions: {
      external: ['hardhat', '@nomicfoundation/hardhat-toolbox', '@nomicfoundation/hardhat-ethers', 'ethers'],
    },
  },
});
