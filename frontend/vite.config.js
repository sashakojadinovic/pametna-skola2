/**
 * File: vite.config.js
 * Path: /frontend
 * Author: Saša Kojadinović
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      // Socket.IO (websocket) proxy
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
})
