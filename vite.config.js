import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work at the canonical https://babitos.es/ root and keep
  // the legacy /Babitos/ GitHub Pages URL usable as a fallback.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
});
