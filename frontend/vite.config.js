// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // any request to these paths is proxied to your Flask server
    proxy: {
      '/auth':        'http://localhost:5000',
      '/clients':     'http://localhost:5000',
      '/products':    'http://localhost:5000',
      '/trucks':      'http://localhost:5000',
      '/orders':      'http://localhost:5000',
      '/deliveries':  'http://localhost:5000',
      '/schedule':    'http://localhost:5000',
    }
  }
});
