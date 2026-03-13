import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }

          if (id.includes('/react-router') || id.includes('/@remix-run/')) {
            return 'router-vendor';
          }

          if (id.includes('/react-toastify/')) {
            return 'toast-vendor';
          }

          if (id.includes('/axios/')) {
            return 'http-vendor';
          }

          if (id.includes('/date-fns/')) {
            return 'date-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
});
