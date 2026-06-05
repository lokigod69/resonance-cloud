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
const categories = readFileSync('src/data/categories.ts', 'utf8')

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

const statTileRule = css.match(/\.stat-tile\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
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
assertIncludes(css, '.dashboard-library-tile', 'dashboard Library tile has dedicated glass styling')
assertIncludes(
  css,
  '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
  'dashboard glass has a non-backdrop fallback',
)
assertIncludes(categories, "code: 'ceb'", 'static vocabulary language metadata contains Bisaya/Cebuano')
assertNotIncludes(categories, "label: 'Bisaya / Cebuano (hidden: review)'", 'Bisaya/Cebuano is not hidden behind a review label')
assertNotIncludes(categories, "code: 'ceb',\n    value: 'Bisaya',\n    name: 'Bisaya / Cebuano',\n    nativeName: 'Bisaya / Cebuano',\n    label: 'Bisaya / Cebuano',\n    status: 'hidden'", 'Bisaya/Cebuano is visible in the static category selector')

console.log('dashboard home glass contract ok')
