import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build runs from any static host or sub-folder.
  base: './',
  // three.js is lazy-loaded with the 3D scenes; it is large by nature.
  build: { chunkSizeWarningLimit: 1200 },
  // `npm run dev:live` sends /api calls to the local API server.
  server: { proxy: { '/api': 'http://localhost:8080' } },
});
