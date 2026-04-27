import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const wheel = read('src/components/ui/GenerationWheelLoader.tsx')
assert(wheel.includes('export function GenerationWheelLoader'), 'GenerationWheelLoader must be exported')
assert(wheel.includes('conic-gradient'), 'GenerationWheelLoader must render a conic gradient')

const deckView = read('src/pages/DeckView.tsx')
const deckViewPg = read('src/pages/DeckViewPG.tsx')
assert(deckView.includes('<GenerationWheelLoader size={112}'), 'DeckView generation flow must render the wheel')
assert(deckViewPg.includes('<GenerationWheelLoader size={120}'), 'DeckViewPG generation flow must render the wheel')
assert(!deckView.includes('<Loader2 className="h-4 w-4 text-primary animate-spin"'), 'DeckView generation status must not render the blue Loader2 spinner')

const queuePosition = read('src/components/QueuePositionDisplay.tsx')
assert(!queuePosition.includes('Loader2'), 'QueuePositionDisplay must not render a spinner')
assert(!queuePosition.includes('animate-spin'), 'QueuePositionDisplay must keep queue status labels text/static')

const app = read('src/App.tsx')
assert(app.includes('path="/admin" element={<Navigate to="/admin/content" replace />}'), '/admin must default to Content')

for (const path of ['src/components/layout/AppHeader.tsx', 'src/components/layout/AppSidebar.tsx']) {
  const source = read(path)
  const navStart = source.indexOf('const adminNav = [')
  const navEnd = source.indexOf(']', navStart)
  const navBlock = source.slice(navStart, navEnd)
  assert(navBlock.includes('/admin/content'), `${path} must include Content in admin nav`)
  assert(navBlock.indexOf('/admin/content') < navBlock.indexOf('/admin/queue'), `${path} must list Content before Job Queue`)
}

const glassLayout = read('src/components/layout/PolishGlassLayout.tsx')
assert(!glassLayout.includes('to="/admin/queue"'), 'Glassy admin entry must not default to Job Queue')
assert(glassLayout.includes('to="/admin/content"'), 'Glassy admin entry must default to Content')

const ferrariLayout = read('src/layouts/FerrariAdminLayout.tsx')
assert(ferrariLayout.includes('to="/admin/content"'), 'Observability back link must return to Content')

const adminRoute = read('src/components/AdminRoute.tsx')
assert(adminRoute.includes('sessionUserId'), 'AdminRoute must key admin checks by user id')
assert(!adminRoute.includes('[authLoading, session]'), 'AdminRoute must not rerun admin checks for same-user token refreshes')

console.log('admin/deck regression checks passed')
