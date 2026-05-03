import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for integration e2e tests — proxies /api to the test backend on port 9091 (HTTP, no SSL)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:9091',
        secure: false,
      },
    },
  },
})
