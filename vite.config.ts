import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['manifold-3d'],
  },
  assetsInclude: ['**/*.wasm'],
});
