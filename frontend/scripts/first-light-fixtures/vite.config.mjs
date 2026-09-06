import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(DIR, '../../src')
const stub = (name) => path.resolve(DIR, 'stubs', name)

// Standalone config for the First Light fixture harness.
//
// Side-effecting app modules (network clients, auth context, the 2.8MB guided
// data chunk, the static-audio/curriculum libraries) are aliased to scenario-
// driven stubs in ./stubs. Everything the fixtures are actually proving stays
// REAL: FirstLightHome + siblings, useHomeVisit/useHomeRecommendation/
// useWordStates/useTodayMission, homeWordDetails, waveField, LingwaveWaves,
// translations + useTranslation, typedAnswer, todayProgress (localStorage).
//
// Alias order matters — @rollup/plugin-alias takes the first match, so every
// specific module path is listed before the catch-all '@'.
export default defineConfig({
  root: DIR,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@/lib/supabase': stub('supabase.ts'),
      // analytics imports the client by RELATIVE path — stub the module.
      '@/lib/analytics': stub('analytics.ts'),
      '@/components/Toast': stub('Toast.ts'),
      '@/hooks/useAuth': stub('useAuth.ts'),
      '@/contexts/LanguageContext': stub('LanguageContext.ts'),
      '@/contexts/DialogContext': stub('DialogContext.ts'),
      '@/hooks/useProfileAvatarUrl': stub('useProfileAvatarUrl.ts'),
      '@/hooks/usePronunciation': stub('usePronunciation.ts'),
      '@/lib/staticThematicAudio': stub('staticThematicAudio.ts'),
      '@/lib/curriculumDeckBridge': stub('curriculumDeckBridge.ts'),
      '@/data/categories': stub('categories.ts'),
      '@/data/guidedLessons': stub('guidedLessons.ts'),
      '@/lib/guidedCheckpoint': stub('guidedCheckpoint.ts'),
      '@': SRC,
    },
  },
  build: {
    outDir: path.resolve(DIR, 'dist'),
    emptyOutDir: true,
    minify: false,
    target: 'esnext',
  },
  logLevel: 'warn',
})
