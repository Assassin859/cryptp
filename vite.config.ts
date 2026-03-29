import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // To exclude specific polyfills, add them to this list.
      exclude: [],
      // Whether to polyfill `node:` protocol imports.
      globals: {
        Buffer: true, // can also be 'build', 'dev', or false
        global: true,
        process: true,
      },
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      // Manual aliases are no longer needed for core modules, 
      // but we keep specific overrides if necessary.
    },
  },
  // lucide-react is standard ESM and should be optimized by Vite to avoid dynamic node_modules requests
  optimizeDeps: {
    include: [
      'lucide-react',
      '@ethereumjs/vm', '@ethereumjs/common', '@ethereumjs/tx', '@ethereumjs/util', '@ethereumjs/evm', '@ethereumjs/blockchain', '@ethereumjs/statemanager'
    ],
    exclude: ['hardhat', '@nomicfoundation/hardhat-toolbox', '@nomicfoundation/hardhat-ethers', 'ethers'],
    esbuildOptions: {
      target: 'esnext',
      supported: {
        'top-level-await': true,
      },
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['hardhat', '@nomicfoundation/hardhat-toolbox', '@nomicfoundation/hardhat-ethers'],
      output: {
        manualChunks: {
          'vendor-evm': [
            '@ethereumjs/vm', '@ethereumjs/common', '@ethereumjs/tx', 
            '@ethereumjs/util', '@ethereumjs/evm', '@ethereumjs/blockchain', 
            '@ethereumjs/statemanager'
          ],
          'vendor-web3': ['ethers', '@noble/hashes'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    target: 'esnext',
    supported: {
      'top-level-await': true,
    },
  },
});
