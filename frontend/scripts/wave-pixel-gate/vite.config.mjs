import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DIR = path.dirname(fileURLToPath(import.meta.url))

// Standalone config for the pixel-identity harness. Deliberately does NOT
// extend the app's vite.config.ts (no tailwind, no PWA, no env plumbing) —
// the harness only needs JSX + the `@` alias into src/.
export default defineConfig({
  root: DIR,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(DIR, '../../src') },
  },
  build: {
    outDir: path.resolve(DIR, 'dist'),
    emptyOutDir: true,
    minify: false,
    target: 'esnext',
  },
  logLevel: 'warn',
})
