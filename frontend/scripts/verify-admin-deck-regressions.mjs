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
assert(deckView.includes("import CardWordViewerModal from '@/components/deck/CardWordViewerModal'"), 'DeckView must use the shared card word viewer modal')
assert(deckView.includes('viewerOpen && viewerWord && isCardDeck'), 'DeckView must render the card viewer modal for card decks')
assert(deckView.includes('viewerOpen && viewerWord && !isCardDeck'), 'DeckView must keep rendering the video viewer modal for video decks')
assert(!deckView.includes("navigate(`/study/flashcard?deck=${deck.id}`)"), 'DeckView card clicks must not navigate directly to flashcard study')
assert(deckView.includes('setViewerOpen(true)'), 'DeckView completed-card clicks must open a viewer modal')

const cardWordViewer = read('src/components/deck/CardWordViewerModal.tsx')
assert(cardWordViewer.includes('export default function CardWordViewerModal'), 'CardWordViewerModal must export the shared modal component')
assert(cardWordViewer.includes('<WordInfoPanel'), 'CardWordViewerModal must reuse WordInfoPanel for rating and metadata')
assert(cardWordViewer.includes("e.key === 'Escape'"), 'CardWordViewerModal must close on Escape')
assert(cardWordViewer.includes("e.key === 'ArrowLeft'"), 'CardWordViewerModal must support previous keyboard navigation')
assert(cardWordViewer.includes("e.key === 'ArrowRight'"), 'CardWordViewerModal must support next keyboard navigation')
assert(!cardWordViewer.includes('<video'), 'CardWordViewerModal must not render video playback UI')
assert(!cardWordViewer.includes('VideoControls'), 'CardWordViewerModal must not render video controls')
assert(!cardWordViewer.includes('VolumeControl'), 'CardWordViewerModal must not render volume controls')
assert(!cardWordViewer.includes('VersionBadge'), 'CardWordViewerModal must not render version toggles')

assert(deckViewPg.includes('draggable={false}'), 'DeckViewPG card thumbnails must disable native image dragging')
assert(deckViewPg.includes("isCardDeck ? 'pointer-events-none select-none' : ''"), 'DeckViewPG card thumbnails must not block carousel gestures')

const translations = read('src/lib/translations.ts')
assert(translations.includes("'deckview.cardFailure'"), 'translations must include image/card failure copy')
assert(translations.includes("'deckview.cardCreation'"), 'translations must include image/card creation copy')
assert(deckView.includes("t('deckview.cardFailure')"), 'DeckView failed card copy must use image/card failure copy')
assert(deckView.includes("t('deckview.cardCreation')"), 'DeckView processing card copy must use image/card creation copy')
assert(deckViewPg.includes("t('deckview.cardFailure')"), 'DeckViewPG failed card copy must use image/card failure copy')
assert(deckViewPg.includes("t('deckview.cardCreation')"), 'DeckViewPG processing card copy must use image/card creation copy')

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
