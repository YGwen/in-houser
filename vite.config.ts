import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the static build works on GitHub Pages / Netlify subpaths.
  base: './',
  // three.js (~700 kB) is its own chunk, loaded only when the reveal renders a champion model.
  build: { chunkSizeWarningLimit: 800 },
});
