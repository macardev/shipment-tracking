import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Three.js ayrı pakette: takip ekranı onu beklemeden açılır.
        manualChunks: { three: ['three'] },
      },
    },
  },
});
