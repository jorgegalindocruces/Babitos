import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work at the canonical https://babitos.es/ root and remain
  // compatible with subpath previews. GitHub redirects its /Babitos/ URL to
  // the configured canonical domain while that custom domain is active.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
});
