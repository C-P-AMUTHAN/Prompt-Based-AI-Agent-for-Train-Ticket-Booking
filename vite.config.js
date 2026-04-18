import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false, // Disable the error overlay temporarily
    },
    // Proxy API requests to backend during development
    proxy: {
      '/api': {
        target: 'https://railway-backend-uehg.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
});