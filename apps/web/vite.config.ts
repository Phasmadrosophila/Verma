import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.VITE_API_PORT ?? 3000}`,
        changeOrigin: true
      }
    }
  }
})
