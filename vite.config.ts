import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 800 },
  server: {
    // During development, forward analytics events to the logging server
    // (npm run serve) if it is running.
    proxy: { '/api': 'http://localhost:8787' },
  },
});
