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
const hybridBRoute = read('src/landing-experiments/hybrid-b/HybridBLanding.tsx')
const hybridBCss = read('src/landing-experiments/hybrid-b/hybridB.css')
const index = read('src/landing-experiments/hybrid-a/LandingExperimentIndex.tsx')
const staticHtml = read('public/landing/hybrid-b/Sonanda.html')

assert(
  app.includes("import HybridBLanding from '@/landing-experiments/hybrid-b/HybridBLanding'")
    && app.includes('path="/b"')
    && app.includes('path="/landing/b"'),
  'Hybrid B must be exposed on /b and /landing/b without replacing /.'
)

assert(
  hybridBRoute.includes('src="/landing/hybrid-b/Sonanda.html"')
    && hybridBRoute.includes("document.title = 'Sonanda — Hybrid B Voyage'")
    && hybridBRoute.includes('Sonanda Hybrid B - Voyage Direction'),
  'Hybrid B route must render the public Hybrid B static artifact.'
)

assert(
  hybridBCss.includes('.hybrid-b-frame')
    && hybridBCss.includes('height: 100vh')
    && hybridBCss.includes('#0E0B2E'),
  'Hybrid B route CSS must provide a full-viewport framed preview.'
)

assert(
  index.includes('href="/landing/a"')
    && index.includes('href="/landing/b"')
    && index.includes('Hybrid A - Studio Instrument')
    && index.includes('Hybrid B - Voyage Direction')
    && !index.includes('<strong>Placeholder</strong>\\n              <small>Not built</small>\\n            </div>\\n            <div className="hybrid-a-index-item" aria-disabled="true">\\n              <span>B</span>'),
  'Landing experiment index must expose both active Hybrid A and Hybrid B previews.'
)

for (const path of [
  'public/landing/hybrid-b/Sonanda.html',
  'public/landing/hybrid-b/assets/cosmos-hero.webp',
  'public/landing/hybrid-b/assets/cosmos-languages.webp',
]) {
  assert(existsSync(join(root, path)), `Missing Hybrid B public asset ${path}`)
}

assert(staticHtml.includes('Sonanda — Hybrid B Voyage'), 'Hybrid B public HTML must preserve page identity.')
assert(staticHtml.includes('Let the language <span>sing for you.</span>'), 'Hybrid B hero copy must be current.')
assert(
  staticHtml.includes('Bring a word to life through <span>image, video, and music.</span>'),
  'Hybrid B generation copy must include music.'
)
assert(staticHtml.includes('A word becomes a song.'), 'Hybrid B music section heading must be current.')
assert(staticHtml.includes('feel the language'), 'Hybrid B quote must be current.')
assert(staticHtml.includes('the soul of languages'), 'Hybrid B slogan must be current.')
assert((staticHtml.match(/class="stamp-flag flag-/g)?.length ?? 0) === 10, 'Hybrid B must render ten CSS flag marks.')
assert((staticHtml.match(/<span class="mint-dot"/g)?.length ?? 0) === 1, 'Hybrid B must keep exactly one mint status dot.')

for (const oldText of [
  'Bring a word to life through <span>image and video.</span>',
  'A word becomes a field of clues.',
  'Create a word world',
  'feel beyond language',
  'The sound that travels',
  'the sound that travels',
  'stamp-code',
  'No 04',
  'Duolingo',
  'Babbel',
  'Headspace',
  'Calm',
]) {
  assert(!staticHtml.includes(oldText), `Hybrid B public HTML still contains old/forbidden text: ${oldText}`)
}

console.log('Hybrid B landing source checks passed.')
