import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { translations, type Locale } from '../src/lib/translations.ts'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    process.stdout.write(`  ok  ${name}\n`)
    return
  }

  failures += 1
  process.stderr.write(`  FAIL ${name}\n`)
  if (detail !== undefined) process.stderr.write(`        ${formatDetail(detail)}\n`)
}

function assertIncludes(name: string, source: string, needle: string) {
  assert(name, source.includes(needle), `expected to find ${needle}`)
}

function assertNotIncludes(name: string, source: string, needle: string) {
  assert(name, !source.includes(needle), `expected not to find ${needle}`)
}

const activeLocales = Object.keys(translations) as Locale[]
const requiredKeys = [
  'dashboard.firstRun.title',
  'dashboard.firstRun.subtitle',
  'dashboard.firstRun.startLesson',
  'dashboard.firstRun.createDeck',
  'dashboard.signedOut.title',
  'dashboard.signedOut.body',
  'dashboard.signedOut.signIn',
  'today.betaLabel',
  'today.betaMessage',
  'landing.privateBeta',
  'today.vibe.bright.label',
  'today.vibe.bright.description',
  'today.vibe.wistful.label',
  'today.vibe.wistful.description',
  'today.vibe.sharp.label',
  'today.vibe.sharp.description',
  'generate.productLane.creditsAvailable',
  'generate.productLane.cardText.helper',
  'generate.productLane.standard.helper',
  'generate.productLane.premium.helper',
  'generate.productLane.video.helper',
] as const

process.stdout.write('\n[landing first-session i18n]\n')
for (const locale of activeLocales) {
  const localeTranslations = translations[locale]
  const missing = requiredKeys.filter((key) => !localeTranslations[key])
  assert(`${locale} has Landing L1 keys`, missing.length === 0, missing)
  assert(
    `${locale} credit balance copy preserves count interpolation`,
    localeTranslations['generate.productLane.creditsAvailable']?.includes('{count}') === true,
    localeTranslations['generate.productLane.creditsAvailable'],
  )
}

assert(
  'English dashboard first-run title matches approved copy',
  translations.en['dashboard.firstRun.title']?.startsWith('Welcome to Lingwave') === true,
  translations.en['dashboard.firstRun.title'],
)
assert(
  'English landing CTA matches approved copy',
  translations.en['landing.heroCta'] === 'Start learning free',
  translations.en['landing.heroCta'],
)
assert(
  'English landing subheadline plainly explains Lingwave',
  translations.en['landing.subheadlineMain'] === 'Lingwave turns the words you want to learn into songs, scenes and conversations — so they stay with you.',
  translations.en['landing.subheadlineMain'],
)

const dashboardSource = readSource('../src/pages/Dashboard.tsx')
const todaySource = readSource('../src/pages/Today.tsx')
const heroSource = readSource('../src/components/landing/HeroSection.tsx')
const todayHeroSource = readSource('../src/components/today/TodayHero.tsx')
const productLaneSource = readSource('../src/components/generate/steps/ProductLaneStep.tsx')
const premiumSelectorsSource = readSource('../src/components/generate/shared/PremiumVisualSelectors.tsx')
const packageSource = readSource('../package.json')

process.stdout.write('\n[first-session source contracts]\n')
assertIncludes('dashboard renders first-run title key', dashboardSource, 'dashboard.firstRun.title')
assertIncludes('dashboard first-run primary CTA points to Today', dashboardSource, 'to="/today"')
assertIncludes('dashboard first-run secondary CTA points to Generate', dashboardSource, 'to="/generate"')
assertNotIncludes('dashboard no longer links anonymous sign-in to /auth', dashboardSource, 'to="/auth"')
assertIncludes('today renders calm beta message key', todaySource, 'today.betaMessage')
assertNotIncludes('today no longer shows destructive build banner copy', todaySource, 'Today is being built')
assertNotIncludes('today beta banner does not use destructive background class', todaySource, 'bg-destructive')
assertIncludes('landing nav renders sign-in key', heroSource, 'landing.signIn')
assertIncludes('landing renders private beta pill key', heroSource, 'landing.privateBeta')
assertIncludes('full vibe picker renders translated one-liners', todayHeroSource, 'todayVibeDescriptionKey')
assertIncludes('vibe description helper resolves description keys', todayHeroSource, '.description')
assertIncludes('product lane step renders credit balance', productLaneSource, 'generate.productLane.creditsAvailable')
assertIncludes('product lane tiles pass helper copy', productLaneSource, 'helper:')
assertIncludes('product lane visual selector renders helper text', premiumSelectorsSource, 'helper={option.helper}')
assertIncludes('landing polish contract script is runnable from package.json', packageSource, 'test:landing-polish')

process.stdout.write(`\n${passes} passed, ${failures} failed\n`)
if (failures > 0) process.exit(1)

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function formatDetail(detail: unknown) {
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}
