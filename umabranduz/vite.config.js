import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_API_URL — base URL of the UMA CMS API (contract cms-v1).
// Dev falls back to the local API; prod builds default to the deployed API host
// (override with a VITE_API_URL env var at build time). If the API is unreachable
// at runtime the storefront falls back to the cached/committed content snapshot.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || (mode === 'development' ? 'http://localhost:3000' : 'https://api.umabrand.uz'),
    ),
  },
}));
