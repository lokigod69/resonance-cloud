import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(DIR, '../../src')
const stub = (name) => path.resolve(DIR, 'stubs', name)

export default defineConfig({
  root: DIR,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@/hooks/useAuth': stub('useAuth.ts'),
      '@/contexts/LanguageContext': stub('LanguageContext.ts'),
      '@/lib/analytics': stub('analytics.ts'),
      '@/lib/guidedAudio': stub('guidedAudio.ts'),
      '@/hooks/useGuidedSpeechRecognition': stub('useGuidedSpeechRecognition.ts'),
      '@/lib/guidedPhraseKeep': stub('guidedPhraseKeep.ts'),
      '@': SRC,
    },
  },
  build: {
    outDir: path.resolve(DIR, 'dist'),
    emptyOutDir: true,
    copyPublicDir: true,
    minify: false,
    target: 'esnext',
  },
  publicDir: path.resolve(DIR, '../../public'),
  logLevel: 'warn',
})
