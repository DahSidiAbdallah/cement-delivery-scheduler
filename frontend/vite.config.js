// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173, // Default Vite port
    strictPort: true, // Don't try to find another port if 5173 is in use
    hmr: {
      // For development with network access
      host: 'localhost',
      port: 5173,
    },
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth/, '/auth'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[VITE PROXY] Request Headers:', JSON.stringify(proxyReq.getHeaders(), null, 2))
          })
        }
      },
      '/clients': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/clients/, '/clients'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[VITE PROXY] Request Headers:', JSON.stringify(proxyReq.getHeaders(), null, 2))
          })
        }
      },
      '/products': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/products/, '/products'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[VITE PROXY] Request Headers:', JSON.stringify(proxyReq.getHeaders(), null, 2))
          })
        }
      },
      '/trucks': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/trucks/, '/trucks'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[VITE PROXY] Request Headers:', JSON.stringify(proxyReq.getHeaders(), null, 2))
          })
        }
      },
      '/orders': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/orders/, '/orders'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[VITE PROXY] Request Headers:', JSON.stringify(proxyReq.getHeaders(), null, 2))
          })
        }
      },
      '/deliveries': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/deliveries/, '/deliveries'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[VITE PROXY] Request Headers:', JSON.stringify(proxyReq.getHeaders(), null, 2))
          })
        }
      },
      // add other paths similarly...
    }
  }
})
