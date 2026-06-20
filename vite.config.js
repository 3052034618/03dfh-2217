import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        queue: fileURLToPath(new URL('./queue.html', import.meta.url)),
        detail: fileURLToPath(new URL('./detail.html', import.meta.url)),
        record: fileURLToPath(new URL('./record.html', import.meta.url)),
        history: fileURLToPath(new URL('./history.html', import.meta.url))
      }
    }
  }
});
