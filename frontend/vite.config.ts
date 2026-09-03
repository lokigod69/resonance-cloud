import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'vendor-phaser'
          // The thematic library's language table must stay its own chunk:
          // without a boundary the bundler folds it into the ~730 kB category
          // chunk, and every light caller (the Home audio lookup, the Word
          // Stream hook) would drag the whole translation table onto the
          // home's critical path.
          if (/[\\/]src[\\/]data[\\/]staticCategoryLanguages\.ts$/.test(id)) return 'static-category-languages'
          return undefined
        },
      },
    },
  },
})
