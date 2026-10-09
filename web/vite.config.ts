import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/analyze': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
      '/apps': 'http://127.0.0.1:8000',
      '/devices': 'http://127.0.0.1:8000',
      '/users': 'http://127.0.0.1:8000',
      '/parent': 'http://127.0.0.1:8000',
      '/alerts': 'http://127.0.0.1:8000',
      '/reports': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})
