import { readFileSync } from 'node:fs'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertIncludes(haystack: string, needle: string, message: string): void {
  assert(haystack.includes(needle), `${message}: expected to find "${needle}"`)
}

function assertNotIncludes(haystack: string, needle: string, message: string): void {
  assert(!haystack.includes(needle), `${message}: expected not to find "${needle}"`)
}

const css = readFileSync('src/index.css', 'utf8')
const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8')
const dashboardPg = readFileSync('src/pages/DashboardPG.tsx', 'utf8')
const homeAccountStrip = readFileSync('src/components/dashboard/HomeAccountStrip.tsx', 'utf8')
const languageCluster = readFileSync('src/components/dashboard/LanguageCluster.tsx', 'utf8')
const categories = readFileSync('src/data/categories.ts', 'utf8')
const translations = readFileSync('src/lib/translations.ts', 'utf8')

assertNotIncludes(
  dashboard,
  'data-text={greeting}',
  'classic dashboard does not use duplicated title extrusion text',
)
assertNotIncludes(
  dashboardPg,
  'data-text={greeting}',
  'glassy dashboard does not use duplicated title extrusion text',
)
assertIncludes(dashboard, 'dashboardLibraryHref', 'classic dashboard computes a language-aware Library href')
assertIncludes(dashboardPg, 'dashboardLibraryHref', 'glassy dashboard computes a language-aware Library href')
assertIncludes(dashboard, 'dashboard-library-tile', 'classic dashboard renders Library as a recognizable tile')
assertIncludes(dashboardPg, 'dashboard-library-tile', 'glassy dashboard renders Library as a recognizable tile')
assertIncludes(dashboard, 'staticLibraryRouteSuffix(activeLanguage)', 'classic dashboard sends active language into Library route')
assertIncludes(dashboardPg, 'staticLibraryRouteSuffix(activeLanguage)', 'glassy dashboard sends active language into Library route')
assertIncludes(dashboard, '<HomeAccountStrip />', 'classic dashboard renders account controls on Home only')
assertIncludes(dashboardPg, '<HomeAccountStrip />', 'glassy dashboard renders account controls on Home only')
assertIncludes(dashboard, 'dashboard-action-grid', 'classic dashboard uses the compact action grid')
assertIncludes(dashboardPg, 'dashboard-action-grid', 'glassy dashboard uses the compact action grid')
assertIncludes(dashboard, 'dashboard-mastered-pill', 'classic dashboard uses compact mastered summary')
assertIncludes(dashboardPg, 'dashboard-mastered-pill', 'glassy dashboard uses compact mastered summary')
assertNotIncludes(dashboard, 'mastered-circle', 'classic dashboard removes the oversized mastered circle')
assertNotIncludes(dashboardPg, 'mastered-circle', 'glassy dashboard removes the oversized mastered circle')

assertIncludes(homeAccountStrip, 'LingwaveBrand', 'Home account strip renders the Lingwave brand')
assertIncludes(homeAccountStrip, 'setRedeemOpen(true)', 'Home account strip opens credits modal')
assertIncludes(homeAccountStrip, 'setProfileOpen(true)', 'Home account strip opens profile modal')
assertIncludes(homeAccountStrip, 'home-account-strip', 'Home account strip has dedicated styling hook')

assertIncludes(languageCluster, 'FlagIcon', 'Language picker shows flags beside language choices')
assertIncludes(languageCluster, 'language-picker-trigger', 'Language picker uses a bounded trigger')
assertIncludes(languageCluster, 'language-picker-panel', 'Language picker uses a bounded panel instead of horizontal fan-out')
assertIncludes(languageCluster, 'aria-expanded={open}', 'Language picker exposes expanded state')
assertIncludes(languageCluster, 'is-open', 'Language picker exposes an open class for the mobile tap state')
assertNotIncludes(languageCluster, 'ChevronDown', 'Language picker trigger removes the chevron affordance')
assertNotIncludes(languageCluster, 'PILL_GAP', 'Language picker no longer uses fixed fan-out offsets')
assertNotIncludes(languageCluster, 'fanOffset', 'Language picker no longer fans languages off-screen')

const welcomeRule = css.match(/\.welcome-hero\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
assert(welcomeRule.length > 0, 'welcome hero CSS rule exists')
assert(
  !/letter-spacing:\s*-/.test(welcomeRule),
  'welcome hero uses neutral letter spacing so the 3D treatment stays sharp',
)
assertNotIncludes(
  css,
  '.welcome-hero::before',
  'welcome hero removes the pseudo-element extrusion layer',
)
assertNotIncludes(
  css,
  'content: attr(data-text)',
  'welcome hero does not duplicate the greeting through generated content',
)

const statTileRule = css.match(/^\.stat-tile\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(statTileRule.length > 0, 'stat tile CSS rule exists')
assertIncludes(
  statTileRule,
  'var(--dashboard-glass-bg)',
  'stat tiles use a shared dashboard glass recipe',
)
assertIncludes(
  statTileRule,
  'backdrop-filter: blur(64px) saturate(1.5)',
  'stat tiles use the header-grade blur and saturation',
)
assertIncludes(
  css,
  '.stat-tile::before',
  'stat tiles include a glossy highlight layer',
)
assertIncludes(css, 'rgba(0, 0, 0, 0.54)', 'dashboard glass uses an opaque black glass base like the header')
const glassyDashboardCosmicRule = css.match(/\.skin-glassy\s+\.dashboard-cosmic\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
assert(glassyDashboardCosmicRule.length > 0, 'glassy dashboard cosmic override exists')
assertIncludes(
  glassyDashboardCosmicRule,
  'isolation: isolate',
  'glassy dashboard uses Classic wave containment instead of dropping the dashboard isolate',
)
assertNotIncludes(
  glassyDashboardCosmicRule,
  'isolation: auto',
  'glassy dashboard no longer removes the dashboard isolate that Classic uses for full waves',
)
for (const [selector, label] of [
  ['.dashboard-today-panel', 'today panel'],
  ['.stat-tile', 'SRS action tiles'],
  ['.dashboard-library-tile', 'Library action tile'],
] as const) {
  const escapedSelector = selector.replace('.', '\\.')
  const rule = css.match(
    new RegExp(`\\.skin-glassy\\s+\\.dashboard-cosmic\\s+${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\}`),
  )?.[0] ?? ''
  assert(rule.length > 0, `glassy-scoped milk-glass override exists for ${label}`)
  assertIncludes(rule, 'backdrop-filter: blur(64px) saturate(1.5)', `${label} uses header-grade frosted blur`)
  assertIncludes(rule, '-webkit-backdrop-filter: blur(64px) saturate(1.5)', `${label} includes WebKit frosted blur`)
  assertIncludes(rule, 'color-mix(in srgb, var(--text-primary) 24%', `${label} uses a milky highlight layer`)
}
assertIncludes(css, '.dashboard-library-tile', 'dashboard Library tile has dedicated glass styling')
assertIncludes(css, '@media (hover: hover) and (pointer: fine)', 'desktop language picker opens on pointer hover')
assertIncludes(css, '.language-picker:hover .language-picker-panel', 'desktop language picker keeps hover behavior')
assertIncludes(css, 'calc(var(--app-safe-top) + 0.85rem)', 'mobile account strip sits below the iOS safe area')
assertIncludes(css, '.home-account-strip {', 'home account strip has explicit mobile spacing')
assertIncludes(css, 'margin-bottom: clamp(1.45rem, 4dvh, 2.35rem)', 'mobile account strip leaves breathing room before Welcome')
assertIncludes(css, '.language-picker::after', 'desktop language picker has a hover bridge into the panel')
assertIncludes(css, 'rgba(5, 3, 8, 0.985)', 'language picker panel uses a near-opaque glass base')
assertIncludes(css, 'backdrop-filter: blur(96px) saturate(1.65)', 'language picker panel uses stronger glass blur')
assertIncludes(css, 'max-width: min(46rem, 72vw)', 'desktop Home action grid uses available width')
assertIncludes(css, 'min-height: 8.25rem', 'desktop Home action tiles are larger than mobile tiles')
assertIncludes(
  css,
  '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
  'dashboard glass has a non-backdrop fallback',
)
assertIncludes(translations, "'study.queue.strengthen': 'Train'", 'English strengthen queue label is short enough for the compact tile')
assertIncludes(categories, "code: 'ceb'", 'static vocabulary language metadata contains Bisaya/Cebuano')
assertNotIncludes(categories, "label: 'Bisaya / Cebuano (hidden: review)'", 'Bisaya/Cebuano is not hidden behind a review label')
assertNotIncludes(categories, "code: 'ceb',\n    value: 'Bisaya',\n    name: 'Bisaya / Cebuano',\n    nativeName: 'Bisaya / Cebuano',\n    label: 'Bisaya / Cebuano',\n    status: 'hidden'", 'Bisaya/Cebuano is visible in the static category selector')

console.log('dashboard home glass contract ok')
