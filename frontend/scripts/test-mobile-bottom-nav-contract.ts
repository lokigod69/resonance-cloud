import { readFileSync } from 'node:fs'
import { createT } from '../src/lib/translations'
import { getPrimaryNavItems, isPrimaryNavItemActive } from '../src/components/layout/primaryNav'

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

assertEqual(tEn('nav.decks'), 'Cards', 'EN decks nav label')
assertEqual(tDe('nav.decks'), 'Karten', 'DE decks nav label')
assertEqual(tFr('nav.decks'), 'Cartes', 'FR decks nav label')

const items = getPrimaryNavItems(tEn)
assertArrayEqual(
  items.map((item) => item.to),
  ['/dashboard', '/today', '/decks', '/study', '/music', '/speak'],
  'primary nav routes',
)
assertArrayEqual(
  items.map((item) => item.label),
  ['Home', 'Today', 'Cards', 'Study', 'Music', 'Speak'],
  'primary nav labels',
)
assert(items.every((item) => item.to !== '/categories' && item.to !== '/generate'), 'primary nav excludes Library and Generate')

const cardsItem = items.find((item) => item.to === '/decks')
assert(cardsItem !== undefined, 'Cards item exists')
assert(isPrimaryNavItemActive('/deck/example-id', cardsItem), 'Cards tab is active for deck detail routes')
assert(isPrimaryNavItemActive('/decks', cardsItem), 'Cards tab is active for decks route')

const appHeader = readFileSync('src/components/layout/AppHeader.tsx', 'utf8')
const polishGlassLayout = readFileSync('src/components/layout/PolishGlassLayout.tsx', 'utf8')
const mobileBottomNav = readFileSync('src/components/layout/MobileBottomNav.tsx', 'utf8')
const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8')
const dashboardPg = readFileSync('src/pages/DashboardPG.tsx', 'utf8')

assertIncludes(appHeader, '<MobileBottomNav />', 'classic layout renders shared mobile bottom nav')
assertIncludes(polishGlassLayout, '<MobileBottomNav />', 'glassy layout renders shared mobile bottom nav')

for (const headerGlassClass of ['!backdrop-blur-3xl', '!backdrop-saturate-150', '!bg-black/40']) {
  assertIncludes(appHeader, headerGlassClass, `classic header uses ${headerGlassClass}`)
  assertIncludes(polishGlassLayout, headerGlassClass, `glassy header uses ${headerGlassClass}`)
  assertIncludes(mobileBottomNav, headerGlassClass, `mobile bottom nav mirrors header ${headerGlassClass}`)
}

assertIncludes(mobileBottomNav, 'pb-[var(--app-safe-bottom)]', 'mobile bottom nav preserves safe-area bottom padding')
assertNotIncludes(appHeader, 'SheetTrigger', 'classic mobile Sheet hamburger is removed')
assertNotIncludes(polishGlassLayout, 'mobileOpen', 'glassy mobile dropdown state is removed')
assertIncludes(polishGlassLayout, 'hidden md:flex', 'glassy desktop nav uses md breakpoint')
assertIncludes(polishGlassLayout, 'flex md:hidden', 'glassy mobile profile/credits use md breakpoint')

assertIncludes(dashboard, 'to="/categories"', 'classic Home links to Library')
assertIncludes(dashboardPg, 'to="/categories"', 'glassy Home links to Library')

process.stdout.write('mobile bottom nav contract checks passed\n')
