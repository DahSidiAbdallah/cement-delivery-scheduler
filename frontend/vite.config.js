// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
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
