import { readFileSync } from 'node:fs'
import path from 'node:path'

const appSource = readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8')

const failures: string[] = []

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message)
}

const eagerPageImports = Array.from(
  appSource.matchAll(/^import\s+(\w+)\s+from\s+['"]@\/pages\/([^'"]+)['"]/gm),
)

const allowedEagerPages = new Set(['LandingPage', 'Login'])
const unexpectedEagerPages = eagerPageImports
  .map((match) => match[1])
  .filter((pageName) => !allowedEagerPages.has(pageName))

expect(
  eagerPageImports.some((match) => match[1] === 'LandingPage'),
  'LandingPage must remain eagerly imported for first paint',
)
expect(
  eagerPageImports.some((match) => match[1] === 'Login'),
  'Login must remain eagerly imported for first paint',
)
expect(
  unexpectedEagerPages.length === 0,
  `Only LandingPage and Login may be eager page imports; found: ${unexpectedEagerPages.join(', ')}`,
)

for (const routeComponent of [
  'Dashboard',
  'DashboardPG',
  'Decks',
  'DecksPG',
  'CategoryListPage',
  'CategoryDetailPage',
  'LevelDetailPage',
  'Generate',
  'GenerateGO',
  'DeckView',
  'DeckViewPG',
  'Study',
  'StudyPG',
  'StudyModeSelector',
  'StudyFlashcard',
  'StudyAudio',
  'StudyCanvas',
  'CanvasDeckPicker',
  'Music',
  'MusicPG',
  'Speak',
  'Today',
  'GuidedCheckpoint',
  'Users',
  'Content',
  'Metrics',
  'Queue',
  'Profiles',
  'Voices',
  'Quotas',
  'Layer2Lab',
  'CurriculumImageSets',
  'ObservabilityAggregate',
  'ObservabilityWordDetail',
]) {
  expect(
    appSource.includes(`const ${routeComponent} = lazyWithRetry(`),
    `${routeComponent} must be lazy-loaded with lazyWithRetry`,
  )
}

expect(
  appSource.includes('function RouteSuspenseFallback()'),
  'App.tsx must define one shared route Suspense fallback',
)
expect(
  appSource.includes('<Suspense fallback={<RouteSuspenseFallback />}>'),
  'App routes must use the shared Suspense fallback',
)

if (failures.length > 0) {
  console.error('Route code splitting contract failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Route code splitting contract passed')
