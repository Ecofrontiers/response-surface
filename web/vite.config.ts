import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: resolve(__dirname, '..'),
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
