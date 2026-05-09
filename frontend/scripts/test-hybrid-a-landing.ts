import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

const app = read('src/App.tsx')
const copy = read('src/landing-experiments/hybrid-a/copy.ts')
const css = read('src/landing-experiments/hybrid-a/hybridA.css')
const landing = read('src/landing-experiments/hybrid-a/HybridALanding.tsx')
const mediaShowcase = read('src/landing-experiments/hybrid-a/assets/SonandaMediaShowcase.tsx')

assert(
  app.includes("import HybridALanding from '@/landing-experiments/hybrid-a/HybridALanding'")
    && app.includes('path="/a"')
    && app.includes('path="/landing/a"'),
  'Hybrid A must be exposed on /a and /landing/a without replacing /.'
)

assert(
  copy.includes('Make words resonate.')
    && copy.includes('Sonanda is an AI-powered language-learning instrument.')
    && !copy.includes('Reso' + 'nance'),
  'Hybrid A copy must use Sonanda language and avoid the old product name.'
)

const expectedLanguages = [
  'German',
  'French',
  'Italian',
  'Spanish',
  'English',
  'Cebuano',
  'Tagalog',
  'Korean',
  'Portuguese',
  'Japanese',
]

for (const language of expectedLanguages) {
  assert(copy.includes(`'${language}'`), `Missing language pill: ${language}`)
}

assert(
  (copy.match(/'German'|'French'|'Italian'|'Spanish'|'English'|'Cebuano'|'Tagalog'|'Korean'|'Portuguese'|'Japanese'/g)
    ?.length ?? 0) === 10,
  'Hybrid A must expose exactly the ten requested language labels.'
)

for (const color of ['#0B0F1A', '#F5F7F8', '#5B6CFF', '#7CFFCB', '#A78BFA', '#E5C07B']) {
  assert(css.includes(color), `Hybrid A CSS must include palette color ${color}`)
}

assert(
  landing.includes('SonandaInstrumentMockup')
    && landing.includes('FeatureCard')
    && landing.includes('LanguagePills')
    && landing.includes('SonandaMediaShowcase')
    && landing.includes('SonandaScrollStory')
    && landing.includes('hybridACopy.quote')
    && copy.includes('Words you can hear. Vocabulary you can feel.'),
  'Hybrid A landing must render the reusable visual asset components and quote.'
)

assert(
  landing.includes("from 'framer-motion'")
    && landing.includes('useScroll')
    && landing.includes('useTransform')
    && landing.includes('useReducedMotion'),
  'Hybrid A must include route-local framer-motion scroll parallax.'
)

assert(
  mediaShowcase.includes("DEMO_WORDS")
    && mediaShowcase.includes('videoUrl')
    && mediaShowcase.includes('thumbnail')
    && mediaShowcase.includes('<video'),
  'Hybrid A media showcase must reuse existing Supabase-backed landing thumbnails and videos.'
)

assert(
  css.includes('.hybrid-a-fixed-media')
    && css.includes('.hybrid-a-scroll-story')
    && css.includes('.hybrid-a-media-reel')
    && css.includes('position: sticky'),
  'Hybrid A CSS must include fixed atmosphere, sticky scroll story, and media reel styles.'
)

for (const asset of [
  'public/landing/hybrid-a/instrument-panel.svg',
  'public/landing/hybrid-a/waveform-signature.svg',
  'public/landing/hybrid-a/modality-glyphs.svg',
]) {
  assert(existsSync(join(root, asset)), `Missing static asset ${asset}`)
}

console.log('Hybrid A landing source checks passed.')
