import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 7291,
    proxy: {
      '/api': 'http://localhost:8731',
      '/ws': {
        target: 'ws://localhost:8731',
        ws: true,
      },
    },
  },
})
