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
const packageJson = readFileSync('package.json', 'utf8')
const packageLock = readFileSync('package-lock.json', 'utf8')
const liquidGlassRenderer = readFileSync('src/components/liquid-glass/LiquidGlassRenderer.ts', 'utf8')
const liquidGlassPopover = readFileSync('src/components/liquid-glass/LiquidGlassPopoverOverlay.tsx', 'utf8')

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
assertIncludes(languageCluster, 'useSkin', 'Language picker gates liquid glass by active skin')
assertIncludes(languageCluster, "skin === 'glassy'", 'Language picker only enables liquid glass on Glassy')
assertIncludes(languageCluster, 'LiquidGlassPopoverOverlay', 'Glassy language picker uses the vendored liquid glass popover')
assertIncludes(
  languageCluster,
  "document.querySelector('.dashboard-wave-bg canvas')",
  'Glassy language picker samples the live dashboard wave canvas in memory',
)
assertIncludes(
  languageCluster,
  "'/brand/cosmos/cosmos-auth.webp'",
  'Glassy liquid glass popover keeps a static cosmos fallback image',
)
assertIncludes(
  languageCluster,
  'hasChoices && useLiquidGlassPopover && open',
  'Glassy liquid glass renderer only mounts while the popover is open',
)

assertNotIncludes(packageJson, '@ogtirth/liquid-glass-oss', 'Liquid glass is vendored, not installed as a dependency')
assertNotIncludes(packageLock, '@ogtirth/liquid-glass-oss', 'Liquid glass package is not locked as a dependency')
assertIncludes(
  liquidGlassRenderer,
  'Copyright (c) 2026 Liquid Glass OSS contributors',
  'Vendored renderer retains the upstream MIT copyright notice',
)
assertIncludes(
  liquidGlassRenderer,
  'canvasSource: HTMLCanvasElement | null',
  'Vendored renderer stores a live canvas texture source',
)
assertIncludes(
  liquidGlassRenderer,
  'setCanvasSource(canvas: HTMLCanvasElement | null)',
  'Vendored renderer exposes a runtime canvas source setter',
)
assertIncludes(
  liquidGlassRenderer,
  'const source = this.canvasSource ?? this.video ?? this.image',
  'Vendored renderer prioritizes the live canvas source over video and image fallbacks',
)
assertIncludes(
  liquidGlassRenderer,
  'gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvasSource)',
  'Vendored renderer re-uploads the live canvas texture in memory each frame',
)
assertIncludes(
  liquidGlassRenderer,
  'this.canvasSource.width',
  'Vendored renderer sizes canvas-backed textures from canvas width',
)
assertIncludes(
  liquidGlassPopover,
  'new LiquidGlassRenderer(canvas, backgroundImage, mergedSettings)',
  'Glassy popover uses the vendored renderer',
)
assertIncludes(
  liquidGlassPopover,
  'renderer.setCanvasSource(canvasSource)',
  'Glassy popover forwards the live wave canvas into the renderer',
)
assertIncludes(
  liquidGlassPopover,
  'renderer.setBackgroundSampling(true)',
  'Glassy popover enables shader background sampling',
)

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
  'rgba(0, 0, 0, 0.86)',
  'stat tiles use a near-opaque dark glass base',
)
assertIncludes(
  statTileRule,
  'backdrop-filter: blur(48px) saturate(1.5)',
  'stat tiles use the header-grade blur and saturation',
)
assertIncludes(css, 'rgba(0, 0, 0, 0.86)', 'dashboard glass uses a dark base opaque enough to hide bright waves')
const libraryTileRule = css.match(/^\.dashboard-library-tile\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(libraryTileRule.length > 0, 'library tile CSS rule exists')
assertIncludes(libraryTileRule, 'rgba(0, 0, 0, 0.86)', 'library tile uses the same opaque frost base')
assertIncludes(libraryTileRule, 'backdrop-filter: blur(48px) saturate(1.5)', 'library tile uses header-grade blur')
const todayPanelRule = css.match(/^\.dashboard-today-panel\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assert(todayPanelRule.length > 0, 'streak surface CSS rule exists')
assertIncludes(todayPanelRule, 'rgba(0, 0, 0, 0.86)', 'streak surface uses the same opaque frost base')
assertIncludes(todayPanelRule, 'backdrop-filter: blur(48px) saturate(1.5)', 'streak surface uses header-grade blur')
const statTileBeforeRule = css.match(/^\.stat-tile::before\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
const libraryTileBeforeRule = css.match(/^\.dashboard-library-tile::before\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''
assertNotIncludes(statTileBeforeRule, 'var(--text-primary)', 'stat tiles remove text-primary sheen')
assertNotIncludes(libraryTileBeforeRule, 'var(--text-primary)', 'library tile removes text-primary sheen')
assertIncludes(statTileBeforeRule, 'opacity: 0', 'stat tile sheen is disabled for both skins')
assertIncludes(libraryTileBeforeRule, 'opacity: 0', 'library tile sheen is disabled for both skins')
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
  assert(rule.length === 0, `glassy no longer needs a separate ${label} material override`)
}
const desktopActionGridRule = css.match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.dashboard-action-grid\s*\{[\s\S]*?\n\s*\}[\s\S]*?\n\}/)?.[0] ?? ''
assertIncludes(desktopActionGridRule, 'margin-top: clamp(', 'desktop action grid has a bounded shared spacer')
assertNotIncludes(css, 'margin-top: auto', 'dashboard action grid is never bottom-pinned with auto margin')
assertIncludes(css, '.dashboard-library-tile', 'dashboard Library tile has dedicated glass styling')
assertIncludes(css, '@media (hover: hover) and (pointer: fine)', 'desktop language picker opens on pointer hover')
assertIncludes(css, '.language-picker:hover .language-picker-panel', 'desktop language picker keeps hover behavior')
assertIncludes(css, 'calc(var(--app-safe-top) + 0.85rem)', 'mobile account strip sits below the iOS safe area')
assertIncludes(css, '.home-account-strip {', 'home account strip has explicit mobile spacing')
assertIncludes(css, 'margin-bottom: clamp(1.45rem, 4dvh, 2.35rem)', 'mobile account strip leaves breathing room before Welcome')
assertIncludes(css, '.language-picker::after', 'desktop language picker has a hover bridge into the panel')
assertIncludes(css, '.skin-glassy .language-picker-panel--liquid', 'liquid language popover styling is Glassy-scoped')
assertIncludes(css, '.liquid-glass-popover-overlay__glass', 'Glassy liquid popover has a dedicated WebGL canvas layer')
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
