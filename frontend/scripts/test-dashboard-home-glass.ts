import { readFileSync } from 'node:fs'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertIncludes(haystack: string, needle: string, message: string): void {
  assert(haystack.includes(needle), `${message}: expected to find "${needle}"`)
}

const css = readFileSync('src/index.css', 'utf8')
const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8')
const dashboardPg = readFileSync('src/pages/DashboardPG.tsx', 'utf8')

assertIncludes(
  dashboard,
  'data-text={greeting}',
  'classic dashboard exposes greeting text to the 3D title layer',
)
assertIncludes(
  dashboardPg,
  'data-text={greeting}',
  'glassy dashboard exposes greeting text to the 3D title layer',
)

const welcomeRule = css.match(/\.welcome-hero\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
assert(welcomeRule.length > 0, 'welcome hero CSS rule exists')
assert(
  !/letter-spacing:\s*-/.test(welcomeRule),
  'welcome hero uses neutral letter spacing so the 3D treatment stays sharp',
)
assertIncludes(
  css,
  '.welcome-hero::before',
  'welcome hero has one controlled extrusion layer instead of duplicated blurry shadows',
)
assertIncludes(
  css,
  'content: attr(data-text)',
  'welcome hero extrusion layer mirrors the greeting via data-text',
)

const statTileRule = css.match(/\.stat-tile\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
assert(statTileRule.length > 0, 'stat tile CSS rule exists')
assertIncludes(
  statTileRule,
  'var(--dashboard-glass-bg)',
  'stat tiles use the same dashboard glass recipe as the header',
)
assertIncludes(
  statTileRule,
  'backdrop-filter: blur(64px) saturate(1.55)',
  'stat tiles blur the starfield strongly enough to read as glass',
)
assertIncludes(
  css,
  '.stat-tile::before',
  'stat tiles include a glossy highlight layer',
)
assertIncludes(
  css,
  '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
  'dashboard glass has a non-backdrop fallback',
)

console.log('dashboard home glass contract ok')
