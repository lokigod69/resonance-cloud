import { readFileSync } from 'node:fs'
import { createT } from '../src/lib/translations'
import { getPrimaryNavItems, isPrimaryNavItemActive } from '../src/components/layout/primaryNav'
import { VISUAL_LENS_ENABLED } from '../src/lib/productFlags'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertArrayEqual<T>(actual: T[], expected: T[], message: string) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), message)
}

function assertIncludes(haystack: string, needle: string, message: string) {
  assert(haystack.includes(needle), message)
}

function assertNotIncludes(haystack: string, needle: string, message: string) {
  assert(!haystack.includes(needle), message)
}

const tEn = createT('en')
const tDe = createT('de')
const tFr = createT('fr')

assertEqual(tEn('nav.dashboard'), 'Home', 'EN dashboard nav label')
assertEqual(tDe('nav.dashboard'), 'Home', 'DE dashboard nav label')
assertEqual(tFr('nav.dashboard'), 'Accueil', 'FR dashboard nav label')

assertEqual(tEn('nav.media'), 'Media', 'EN media nav label')
assertEqual(tDe('nav.media'), 'Medien', 'DE media nav label')
assertEqual(tFr('nav.media'), 'Médias', 'FR media nav label')

const items = getPrimaryNavItems(tEn)
// Lens is a flag-gated tab — the expected set follows the flag so toggling it
// off doesn't break this contract.
assertArrayEqual(
  items.map((item) => item.to),
  VISUAL_LENS_ENABLED
    ? ['/dashboard', '/today', '/decks', '/categories', '/lens', '/speak']
    : ['/dashboard', '/today', '/decks', '/categories', '/speak'],
  'primary nav routes',
)
assertArrayEqual(
  items.map((item) => item.label),
  VISUAL_LENS_ENABLED
    ? ['Home', 'Today', 'Media', 'Library', 'Lens', 'Speak']
    : ['Home', 'Today', 'Media', 'Library', 'Speak'],
  'primary nav labels',
)
assert(items.every((item) => item.to !== '/study'), 'primary nav excludes Study — home is the study entry')

const mediaItem = items.find((item) => item.to === '/decks')
assert(mediaItem !== undefined, 'Media item exists')
assert(isPrimaryNavItemActive('/decks', mediaItem), 'Media tab is active for decks route')
assert(isPrimaryNavItemActive('/deck/example-id', mediaItem), 'Media tab is active for deck detail routes')
assert(isPrimaryNavItemActive('/music', mediaItem), 'Media tab is active for the music route')
assert(isPrimaryNavItemActive('/generate', mediaItem), 'Media tab is active for the generate route')

const appHeader = readFileSync('src/components/layout/AppHeader.tsx', 'utf8')
const appLayout = readFileSync('src/components/layout/AppLayout.tsx', 'utf8')
const polishGlassLayout = readFileSync('src/components/layout/PolishGlassLayout.tsx', 'utf8')
const mobileBottomNav = readFileSync('src/components/layout/MobileBottomNav.tsx', 'utf8')
const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8')
const dashboardPg = readFileSync('src/pages/DashboardPG.tsx', 'utf8')
const indexHtml = readFileSync('index.html', 'utf8')

assertIncludes(appHeader, '<MobileBottomNav />', 'classic layout renders shared mobile bottom nav')
assertIncludes(polishGlassLayout, '<MobileBottomNav />', 'glassy layout renders shared mobile bottom nav')
assertIncludes(indexHtml, 'viewport-fit=cover', 'Capacitor/iOS viewport reserves safe-area variables')

// Nav chrome paints via the theme contract (--nav-bg et al.), not hardcoded
// glass utility overrides.
assertIncludes(appHeader, 'app-topnav', 'classic header uses the themed top-nav surface')
assertIncludes(polishGlassLayout, 'app-topnav', 'glassy header uses the themed top-nav surface')
assertIncludes(mobileBottomNav, 'app-bottomnav', 'mobile bottom nav uses the themed bottom-nav surface')

assertIncludes(mobileBottomNav, 'pb-[var(--app-safe-bottom)]', 'mobile bottom nav preserves safe-area bottom padding')
assertNotIncludes(appHeader, 'SheetTrigger', 'classic mobile Sheet hamburger is removed')
assertNotIncludes(polishGlassLayout, 'mobileOpen', 'glassy mobile dropdown state is removed')
assertIncludes(appHeader, 'hidden md:flex', 'classic top navigation is desktop-only')
assertIncludes(polishGlassLayout, 'hidden md:flex', 'glassy top navigation is desktop-only')
assertNotIncludes(polishGlassLayout, 'flex md:hidden', 'glassy mobile profile/credits are not rendered in the global header')
assertIncludes(appLayout, 'pt-[var(--classic-content-top-offset)]', 'classic main content uses a responsive desktop-only top offset')
assertIncludes(polishGlassLayout, 'pt-[var(--glassy-content-top-offset)]', 'glassy main content uses a responsive desktop-only top offset')

assertIncludes(dashboard, 'HomeAccountStrip', 'classic Home renders the home-only account strip')
assertIncludes(dashboardPg, 'HomeAccountStrip', 'glassy Home renders the home-only account strip')
// Library and Lens live in the primary nav now — home pages must not re-render
// them as tiles.
assertNotIncludes(dashboard, 'dashboard-library-tile', 'classic Home dropped the Library/Lens tiles')
assertNotIncludes(dashboardPg, 'dashboard-library-tile', 'glassy Home dropped the Library/Lens tiles')

process.stdout.write('mobile bottom nav contract checks passed\n')
