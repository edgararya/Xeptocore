// frontend/vite.config.mjs
// Vite builds only the renderer (React UI). The Electron main process under
// src/main is plain CommonJS and is not bundled.

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const frontendDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('./src/renderer', import.meta.url)),
  // Relative asset URLs so the built index.html also works under file://.
  base: './',
  plugins: [react()],
  css: {
    // Look for postcss.config.js in frontend/, not in the renderer root.
    postcss: frontendDir,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: fileURLToPath(new URL('./dist/renderer', import.meta.url)),
    emptyOutDir: true,
  },
});
