import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // Dev proxy for copilot — avoids CORS when running locally
      // In Docker, the browser calls http://localhost:3200 directly (CORS already open)
      '/copilot': {
        target: process.env.COPILOT_URL || 'http://127.0.0.1:3200',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/copilot/, ''),
      }
    }
  }
})
