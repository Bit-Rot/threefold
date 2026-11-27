import { defineConfig } from 'vite';

// base './' so the build works from any GitHub Pages sub-path (user.github.io/repo/)
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1500,
  },
});
