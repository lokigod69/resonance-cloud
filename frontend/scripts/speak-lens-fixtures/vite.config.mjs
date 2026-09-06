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
      '@/lib/supabase': stub('supabase.ts'),
      '@/hooks/useAuth': stub('useAuth.ts'),
      '@/contexts/LanguageContext': stub('LanguageContext.ts'),
      '@/components/Toast': stub('Toast.ts'),
      '@/contexts/DialogContext': stub('DialogContext.ts'),
      '@/hooks/useProfileAvatarUrl': stub('useProfileAvatarUrl.ts'),
      '@/hooks/useVoiceTutor': stub('useVoiceTutor.ts'),
      '@/hooks/useGrokRealtime': stub('useGrokRealtime.ts'),
      '@/hooks/useStudyWords': stub('useStudyWords.ts'),
      '@/hooks/useExtractVocabulary': stub('useExtractVocabulary.ts'),
      '@/hooks/useSubmitImagelessImport': stub('useSubmitImagelessImport.ts'),
      '@/hooks/useLensScan': stub('useLensScan.ts'),
      '@/hooks/useLensSave': stub('useLensSave.ts'),
      '@/hooks/usePronunciation': stub('usePronunciation.ts'),
      '@': SRC,
    },
  },
  build: {
    outDir: path.resolve(DIR, 'dist'),
    emptyOutDir: true,
    copyPublicDir: false,
    minify: false,
    target: 'esnext',
  },
  publicDir: path.resolve(DIR, '../../public'),
  logLevel: 'warn',
})
