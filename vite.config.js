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
        main: fileURLToPath(new URL('./src/windows/queue/index.html', import.meta.url)),
        queue: fileURLToPath(new URL('./src/windows/queue/index.html', import.meta.url)),
        detail: fileURLToPath(new URL('./src/windows/detail/index.html', import.meta.url)),
        record: fileURLToPath(new URL('./src/windows/record/index.html', import.meta.url))
      }
    }
  }
});
