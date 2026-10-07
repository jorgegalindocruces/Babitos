import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work both at / and under /Babitos/ on GitHub Pages.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
});
