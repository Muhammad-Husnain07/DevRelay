import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/gw': 'http://localhost:3000',
      '/receive': 'http://localhost:3000',
      '/socket.io': 'http://localhost:3000'
    }
  }
});