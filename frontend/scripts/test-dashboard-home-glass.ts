import { existsSync, readFileSync } from 'node:fs'

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

function countIncludes(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

function assertOrdered(haystack: string, needles: string[], message: string): void {
  let previousIndex = -1
  for (const needle of needles) {
    const index = haystack.indexOf(needle)
    assert(index >= 0, `${message}: expected to find "${needle}"`)
    assert(index > previousIndex, `${message}: expected "${needle}" after the previous marker`)
    previousIndex = index
  }
}

const css = readFileSync('src/index.css', 'utf8')
const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8')
const dashboardPg = readFileSync('src/pages/DashboardPG.tsx', 'utf8')
const homeAccountStrip = readFileSync('src/components/dashboard/HomeAccountStrip.tsx', 'utf8')
const languageCluster = readFileSync('src/components/dashboard/LanguageCluster.tsx', 'utf8')
const missionCard = readFileSync('src/components/dashboard/TodayMissionCard.tsx', 'utf8')
const categories = readFileSync('src/data/categories.ts', 'utf8')
const translations = readFileSync('src/lib/translations.ts', 'utf8')
const packageJson = readFileSync('package.json', 'utf8')
const packageLock = readFileSync('package-lock.json', 'utf8')

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
assertNotIncludes(dashboard, 'DailyTodayPanel', 'classic dashboard removes the duplicated HEUTE panel')
assertNotIncludes(dashboardPg, 'DailyTodayPanel', 'glassy dashboard removes the duplicated HEUTE panel')
assertIncludes(dashboard, '<DashboardStreak', 'classic dashboard keeps the streak-only indicator')
assertIncludes(dashboardPg, '<DashboardStreak', 'glassy dashboard keeps the streak-only indicator')
assertIncludes(dashboard, 'dashboard-action-grid', 'classic dashboard uses the compact action grid')
assertIncludes(dashboardPg, 'dashboard-action-grid', 'glassy dashboard uses the compact action grid')
assertIncludes(dashboard, 'dashboard-study-row', 'classic dashboard groups the three study tiles below Library')
assertIncludes(dashboardPg, 'dashboard-study-row', 'glassy dashboard groups the three study tiles below Library')
assertOrdered(
  dashboard,
  ['TodayMissionCard', 'dashboard-study-row', 'queue="review"', 'queue="learn"', 'queue="strengthen"', 'dashboard-library-tile'],
  'classic dashboard leads with the mission card, then the practice row, then Library',
)
assertOrdered(
  dashboardPg,
  ['TodayMissionCard', 'dashboard-study-row', 'queue="review"', 'queue="learn"', 'queue="strengthen"', 'dashboard-library-tile'],
  'glassy dashboard leads with the mission card, then the practice row, then Library',
)
assertIncludes(dashboard, 'dashboard-mastered-pill', 'classic dashboard uses compact mastered summary')
assertIncludes(dashboardPg, 'dashboard-mastered-pill', 'glassy dashboard uses compact mastered summary')
assertNotIncludes(dashboard, 'mastered-circle', 'classic dashboard removes the oversized mastered circle')
assertNotIncludes(dashboardPg, 'mastered-circle', 'glassy dashboard removes the oversized mastered circle')

assertNotIncludes(missionCard, 'dashboard.mission.minutes', 'mission card shows no time estimate')

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
assertNotIncludes(languageCluster, 'useSkin', 'Language picker is back to the shared plain dropdown')
assertNotIncludes(languageCluster, 'LiquidGlassPopoverOverlay', 'Language picker no longer mounts liquid glass')
assertNotIncludes(
  languageCluster,
  "document.querySelector('.dashboard-wave-bg canvas')",
  'Language picker no longer samples the dashboard wave canvas',
)
assertNotIncludes(
  languageCluster,
  "'/brand/cosmos/cosmos-auth.webp'",
  'Language picker no longer owns a liquid glass fallback image',
)
assert(!existsSync('src/components/liquid-glass'), 'the WebGL liquid-glass path is fully removed (Option B: CSS lit-glass is the dashboard material)')
assertNotIncludes(dashboardPg, 'LiquidGlassActionTile', 'glassy dashboard no longer mounts WebGL tile glass')
assertNotIncludes(dashboardPg, 'liquid-glass', 'glassy dashboard has no liquid-glass UI import')
assert(
  countIncludes(dashboardPg, '<SrsActionTile') === 3,
  'glassy dashboard uses plain SRS action tiles for Review, New, and Train',
)
assertIncludes(dashboardPg, 'queue="learn"', 'the NEU / learn tile is still present as a plain action tile')
assertNotIncludes(dashboard, 'LiquidGlassActionTile', 'classic dashboard does not mount liquid glass tiles')

assertNotIncludes(packageJson, '@ogtirth/liquid-glass-oss', 'Liquid glass never returns as a dependency')
assertNotIncludes(packageLock, '@ogtirth/liquid-glass-oss', 'Liquid glass package is not locked as a dependency')

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

/* Lit-glass material contract: one token recipe on .dashboard-cosmic feeds
   every home surface; the skins only retune token values. The frost token
   must carry a brightness() lift — that is what makes the wave's light bloom
   inside the panels instead of drowning under heavy blur. */
const cosmicRule = css.match(/^\.dashboard-cosmic\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(cosmicRule.length > 0, 'dashboard cosmic root rule exists')
assertIncludes(cosmicRule, '--dashboard-glass-bg:', 'cosmic root defines the shared glass tint token')
assertIncludes(cosmicRule, '--dashboard-glass-frost:', 'cosmic root defines the shared frost token')
assertIncludes(cosmicRule, '--dashboard-glass-sheen:', 'cosmic root defines the shared sheen token')
assertIncludes(cosmicRule, 'brightness(', 'frost token gathers light so waves bloom through the glass')
const glassySkinRule = css.match(/\.skin-glassy\s+\.dashboard-cosmic\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
assert(glassySkinRule.length > 0, 'glassy skin token override exists')
assertIncludes(glassySkinRule, '--dashboard-glass-frost:', 'glassy skin retunes the frost token')
const classicSkinRule = css.match(/\.skin-classic\s+\.dashboard-cosmic\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
assert(classicSkinRule.length > 0, 'classic skin token override exists')
assertIncludes(classicSkinRule, '--dashboard-glass-frost:', 'classic skin retunes the frost token')

const statTileRule = css.match(/^\.stat-tile\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(statTileRule.length > 0, 'stat tile CSS rule exists')
assertIncludes(statTileRule, 'background: var(--dashboard-glass-bg)', 'stat tiles consume the shared glass tint')
assertIncludes(statTileRule, 'backdrop-filter: var(--dashboard-glass-frost)', 'stat tiles consume the shared frost')
assertNotIncludes(statTileRule, 'rgba(0, 0, 0, 0.86)', 'stat tiles dropped the near-opaque dark base')
const libraryTileRule = css.match(/^\.dashboard-library-tile\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(libraryTileRule.length > 0, 'library tile CSS rule exists')
assertIncludes(libraryTileRule, 'background: var(--dashboard-glass-bg)', 'library tile consumes the shared glass tint')
assertIncludes(libraryTileRule, 'backdrop-filter: var(--dashboard-glass-frost)', 'library tile consumes the shared frost')
assertNotIncludes(libraryTileRule, 'rgba(0, 0, 0, 0.86)', 'library tile dropped the near-opaque dark base')
const missionCardRule = css.match(/^\.dashboard-mission-card\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(missionCardRule.length > 0, 'mission card CSS rule exists')
assertIncludes(missionCardRule, 'background: var(--dashboard-glass-bg)', 'mission card consumes the shared glass tint')
assertIncludes(missionCardRule, 'backdrop-filter: var(--dashboard-glass-frost)', 'mission card consumes the shared frost')
const missionRimRule = css.match(/\.dashboard-mission-card::after\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
assert(missionRimRule.length > 0, 'mission card dawn rim exists')
assertIncludes(missionRimRule, 'mask-composite: exclude', 'dawn rim is a masked gradient ring, not a fill')
assertIncludes(missionRimRule, 'var(--accent-2)', 'dawn rim ignites with the gold accent')

/* Per-surface skin overrides must not return — the skins tune tokens only. */
for (const selector of [
  '.skin-glassy .stat-tile',
  '.skin-classic .stat-tile',
  '.skin-glassy .dashboard-library-tile',
  '.skin-classic .dashboard-library-tile',
]) {
  assertNotIncludes(css, `${selector} {`, `per-surface skin override "${selector}" stays collapsed into tokens`)
}
const disabledStatTileRule = css.match(/^\.stat-tile:disabled\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(disabledStatTileRule.length > 0, 'zero-count stat tile rule exists once, unscoped by skin')
assertIncludes(disabledStatTileRule, 'opacity: 1', 'zero-count tiles keep the full glass material')
assert(!existsSync('src/components/dashboard/DailyTodayPanel.tsx'), 'orphaned DailyTodayPanel component was removed')
assertNotIncludes(css, '.dashboard-today-panel', 'orphaned today-panel CSS was removed with its component')
const streakChipRule = css.match(/^\.dashboard-today-streak\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(streakChipRule.length > 0, 'streak chip CSS survives the today-panel cleanup')
const statTileBeforeRule = css.match(/^\.stat-tile::before\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
const libraryTileBeforeRule = css.match(/^\.dashboard-library-tile::before\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assertIncludes(statTileBeforeRule, 'opacity: var(--dashboard-glass-sheen)', 'stat tile sheen strength is skin-tuned via token')
assertIncludes(libraryTileBeforeRule, 'opacity: var(--dashboard-glass-sheen)', 'library tile sheen strength is skin-tuned via token')
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
  ['.stat-tile', 'SRS action tiles'],
  ['.dashboard-library-tile', 'Library action tile'],
] as const) {
  const escapedSelector = selector.replace('.', '\\.')
  const rule = css.match(
    new RegExp(`\\.skin-glassy\\s+\\.dashboard-cosmic\\s+${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\}`),
  )?.[0] ?? ''
  assert(rule.length === 0, `glassy ${label} material override is not tied to dashboard-cosmic stacking`)
}
const desktopActionGridRule = css.match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.dashboard-action-grid\s*\{[\s\S]*?\n\s*\}[\s\S]*?\n\}/)?.[0] ?? ''
assertIncludes(desktopActionGridRule, 'margin-top: clamp(', 'desktop action grid has a bounded shared spacer')
assertIncludes(desktopActionGridRule, '40dvh', 'desktop action grid is nudged relative to the 40dvh wave horizon')
assertNotIncludes(css, 'margin-top: auto', 'dashboard action grid is never bottom-pinned with auto margin')
assertIncludes(css, '.dashboard-library-tile', 'dashboard Library tile has dedicated glass styling')
assertIncludes(css, '.dashboard-study-row', 'dashboard has a dedicated row for the three study tiles')
assertIncludes(css, 'grid-template-columns: repeat(3, minmax(0, 1fr))', 'study tiles sit in a single three-column row')
assertIncludes(css, 'to right,', 'mobile study tile divider rotates horizontally for narrow columns')
assertIncludes(css, '@media (hover: hover) and (pointer: fine)', 'desktop language picker opens on pointer hover')
assertIncludes(css, '.language-picker:hover .language-picker-panel', 'desktop language picker keeps hover behavior')
assertIncludes(
  css,
  '@media (min-width: 768px) and (hover: hover) and (pointer: fine)',
  'desktop language picker expands as a horizontal strip instead of a drop-down',
)
assertIncludes(css, 'transform: translate(-50%, -50%) scale(0.98)', 'desktop picker strip is centered on the pill, not below it')
assertIncludes(css, 'calc(var(--app-safe-top) + 0.85rem)', 'mobile account strip sits below the iOS safe area')
assertIncludes(css, '.home-account-strip {', 'home account strip has explicit mobile spacing')
assertIncludes(css, 'margin-bottom: clamp(1.45rem, 4dvh, 2.35rem)', 'mobile account strip leaves breathing room before Welcome')
assertIncludes(css, '.language-picker::after', 'desktop language picker has a hover bridge into the panel')
assertNotIncludes(css, '.language-picker-panel--liquid', 'language picker no longer has liquid glass styling')
assertNotIncludes(css, 'liquid-glass-popover', 'language picker popover glass CSS was removed')
assertNotIncludes(css, '.stat-tile--liquid', 'tiles no longer use the WebGL liquid material class')
assertNotIncludes(css, 'liquid-glass-tile', 'tile WebGL canvas CSS was removed')
assertIncludes(css, 'rgba(5, 3, 8, 0.985)', 'language picker panel uses a near-opaque glass base')
assertIncludes(css, 'backdrop-filter: blur(96px) saturate(1.65)', 'language picker panel uses stronger glass blur')
assertIncludes(css, 'max-width: min(31rem, 88vw)', 'desktop Home action grid stays one mission-led column')
assertIncludes(css, 'min-height: clamp(5rem, 8dvh, 5.9rem)', 'desktop Home action tiles are larger than mobile tiles')
const backdropFallback = css.match(
  /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)\s*\{[\s\S]*?\n\}/g,
)?.join('\n') ?? ''
assert(backdropFallback.length > 0, 'dashboard glass has a non-backdrop fallback')
assertIncludes(backdropFallback, '.dashboard-mission-card', 'mission card is covered by the non-backdrop fallback')
assertIncludes(css, '@media (prefers-reduced-transparency: reduce)', 'reduced-transparency users get solid fills')
assertIncludes(translations, "'study.queue.strengthen': 'Train'", 'English strengthen queue label is short enough for the compact tile')
assertIncludes(categories, "code: 'ceb'", 'static vocabulary language metadata contains Bisaya/Cebuano')
assertNotIncludes(categories, "label: 'Bisaya / Cebuano (hidden: review)'", 'Bisaya/Cebuano is not hidden behind a review label')
assertNotIncludes(categories, "code: 'ceb',\n    value: 'Bisaya',\n    name: 'Bisaya / Cebuano',\n    nativeName: 'Bisaya / Cebuano',\n    label: 'Bisaya / Cebuano',\n    status: 'hidden'", 'Bisaya/Cebuano is visible in the static category selector')

console.log('dashboard home glass contract ok')
