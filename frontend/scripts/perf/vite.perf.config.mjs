import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const perfDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(perfDir, '..', '..')

export default defineConfig({
  root: frontendRoot,
  plugins: [react(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(frontendRoot, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(perfDir, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'vendor-phaser'
          return undefined
        },
      },
    },
  },
})
