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
assert(cardWordViewer.includes("import GeneratedMediaFrame from '@/components/media/GeneratedMediaFrame'"), 'CardWordViewerModal must use the shared generated media frame')
assert(cardWordViewer.includes('variant="modal"'), 'CardWordViewerModal must use modal-sized generated media framing')
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

const generatedMediaFrame = read('src/components/media/GeneratedMediaFrame.tsx')
assert(generatedMediaFrame.includes('export default function GeneratedMediaFrame'), 'GeneratedMediaFrame must export a reusable media frame')
assert(generatedMediaFrame.includes('aspect-video'), 'GeneratedMediaFrame must preserve 16:9 generated media')
assert(generatedMediaFrame.includes('object-contain'), 'GeneratedMediaFrame must support full-image contain display')
assert(generatedMediaFrame.includes('object-cover'), 'GeneratedMediaFrame must keep an explicit cover option for tiny/decorative thumbnails')
assert(generatedMediaFrame.includes('draggable={false}'), 'GeneratedMediaFrame images must disable native dragging')
assert(generatedMediaFrame.includes('onDragStart={(event) => event.preventDefault()}'), 'GeneratedMediaFrame images must prevent drag interference')

const wordDetailModal = read('src/components/dashboard/WordDetailModal.tsx')
assert(wordDetailModal.includes("import GeneratedMediaFrame from '@/components/media/GeneratedMediaFrame'"), 'WordDetailModal must use GeneratedMediaFrame')
assert(wordDetailModal.includes('max-w-4xl'), 'WordDetailModal must use a wider desktop detail layout')
assert(wordDetailModal.includes('variant="detail"'), 'WordDetailModal image must use detail media framing')
assert(!wordDetailModal.includes('h-48 rounded-xl overflow-hidden'), 'WordDetailModal image must not use the old fixed h-48 crop container')
assert(!wordDetailModal.includes('object-cover" />'), 'WordDetailModal main image must not crop generated cards with object-cover')
assert(wordDetailModal.includes('pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]'), 'WordDetailModal must preserve mobile safe-area padding')
assert(wordDetailModal.includes('word.video_url &&'), 'WordDetailModal must keep the Watch Video button gated by video_url')

const decksClassic = read('src/pages/Decks.tsx')
assert(decksClassic.includes("import GeneratedMediaFrame from '@/components/media/GeneratedMediaFrame'"), 'Classic Decks must use GeneratedMediaFrame for deck thumbnails')
assert(decksClassic.includes("deck_type?: 'video' | 'card'"), 'Classic Decks must type deck_type')
assert(decksClassic.includes("variant={deck.deck_type === 'card' ? 'deckPreview' : 'decorative'}"), 'Classic Decks must contain card deck previews and allow decorative video previews')
assert(!decksClassic.includes("backgroundImage: thumb ? `url(${thumb})` : 'none'"), 'Classic Decks must not rely on thumbnail CSS background images')

const indexCss = read('src/index.css')
assert(!indexCss.includes('.classic-deck-bg-layer'), 'Classic deck CSS must not keep the cover background thumbnail layer')
assert(indexCss.includes('.classic-deck-media'), 'Classic deck CSS must define a visible media preview area')
assert(indexCss.includes('.classic-deck-body'), 'Classic deck CSS must keep title and metadata below the media preview')

const decksPg = read('src/pages/DecksPG.tsx')
assert(decksPg.includes("import GeneratedMediaFrame from '@/components/media/GeneratedMediaFrame'"), 'Glassy Decks must use GeneratedMediaFrame where card previews need full image display')
assert(decksPg.includes("deck_type?: 'video' | 'card'"), 'Glassy Decks must type deck_type')
assert(decksPg.includes("variant={deck.deck_type === 'card' ? 'deckPreview' : 'decorative'}"), 'Glassy Decks grid must preserve card deck previews without breaking video previews')

const wordLibrary = read('src/components/dashboard/WordLibrary.tsx')
assert(wordLibrary.includes('object-cover'), 'WordLibrary tiny avatar thumbnails may remain cropped')

const dashboard = read('src/pages/Dashboard.tsx')
const dashboardPg = read('src/pages/DashboardPG.tsx')
for (const [name, source] of [['Dashboard', dashboard], ['DashboardPG', dashboardPg]]) {
  assert(source.includes('useSearchParams'), `${name} must read dashboard word/lang query params`)
  assert(source.includes("params.set('returnTo', '/dashboard')"), `${name} Watch Video must return to dashboard`)
  assert(source.includes("params.set('returnMode', 'wordModal')"), `${name} Watch Video must request word modal return mode`)
  assert(source.includes("params.set('returnLang', returnLang)"), `${name} Watch Video must include return language when available`)
  assert(source.includes("const queryWordId = searchParams.get('word')"), `${name} must read word query param`)
  assert(source.includes("const queryLang = searchParams.get('lang')"), `${name} must read lang query param`)
  assert(source.includes('setSelectedWord(foundWord)'), `${name} must reopen WordDetailModal from query word`)
  assert(source.includes("nextParams.delete('word')"), `${name} modal close must clear word query param`)
  assert(source.includes("nextParams.delete('lang')"), `${name} modal close must clear lang query param`)
}

const videoPlayer = read('src/pages/VideoPlayer.tsx')
assert(videoPlayer.includes("const returnMode = searchParams.get('returnMode')"), 'VideoPlayer must read returnMode')
assert(videoPlayer.includes("const returnLang = searchParams.get('returnLang')"), 'VideoPlayer must read returnLang')
assert(videoPlayer.includes("params.set('returnMode', returnMode)"), 'VideoPlayer previous/next navigation must preserve returnMode')
assert(videoPlayer.includes("params.set('returnLang', returnLang)"), 'VideoPlayer previous/next navigation must preserve returnLang')
assert(videoPlayer.includes("params.set('word', currentWordId)"), 'VideoPlayer dashboard close target must use the current word id')
assert(videoPlayer.includes("params.set('lang', returnLang)"), 'VideoPlayer dashboard close target must include return language')
assert(videoPlayer.includes('navigate(getCloseTarget(current?.id ?? wordId), { replace: true })'), 'VideoPlayer close must replace history with the current-word return target')
assert(videoPlayer.includes('return returnTo || `/deck/${deckId}`'), 'VideoPlayer must keep existing close fallback behavior')

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

// ── Profile avatar upload regressions ───────────────────────────────────
const profileModal = read('src/components/ProfileModal.tsx')
assert(profileModal.includes("from '@/hooks/useProfileAvatarUrl'"), 'ProfileModal must use useProfileAvatarUrl')
assert(profileModal.includes("'profile-avatars'") || profileModal.includes('AVATAR_BUCKET'), 'ProfileModal must reference the profile-avatars bucket')
assert(profileModal.includes("`${user.id}/${AVATAR_FILENAME}`") || profileModal.includes('avatarObjectPath(user.id)'), 'ProfileModal must upload to the fixed <user_id>/avatar.jpg path')
assert(profileModal.includes("accept=\"image/jpeg,image/png,image/webp\""), 'ProfileModal must restrict file picker to jpeg/png/webp')
assert(profileModal.includes('MAX_INPUT_BYTES = 5 * 1024 * 1024'), 'ProfileModal must enforce a 5 MB max input size')
assert(profileModal.includes("upsert: true"), 'ProfileModal upload must overwrite the existing avatar object')
assert(profileModal.includes('avatar_path: path'), 'ProfileModal must persist avatar_path on success')
assert(profileModal.includes('avatar_path: null'), 'ProfileModal remove must clear avatar_path')
assert(profileModal.includes("t('profile.avatar.upload')"), 'ProfileModal must use upload translation key')
assert(profileModal.includes("t('profile.avatar.replace')"), 'ProfileModal must use replace translation key')
assert(profileModal.includes("t('profile.avatar.remove')"), 'ProfileModal must use remove translation key')
assert(profileModal.includes("t('profile.avatar.invalid')"), 'ProfileModal must surface invalid-image translation')
assert(profileModal.includes("t('profile.avatar.tooLarge')"), 'ProfileModal must surface size-too-large translation')
assert(profileModal.includes('refreshProfile()'), 'ProfileModal must refresh profile after avatar updates')
assert(profileModal.includes('squareCropResizeToJpeg'), 'ProfileModal must crop and resize to jpeg client-side')

const useProfileAvatarUrl = read('src/hooks/useProfileAvatarUrl.ts')
assert(useProfileAvatarUrl.includes("'profile-avatars'"), 'useProfileAvatarUrl must read from profile-avatars bucket')
assert(useProfileAvatarUrl.includes('createSignedUrl'), 'useProfileAvatarUrl must mint signed URLs')
assert(useProfileAvatarUrl.includes('avatarUpdatedAt'), 'useProfileAvatarUrl must include cache-busting from avatar_updated_at')

const appHeaderAvatar = read('src/components/layout/AppHeader.tsx')
assert(appHeaderAvatar.includes('useProfileAvatarUrl'), 'AppHeader must consume useProfileAvatarUrl')
assert(appHeaderAvatar.includes('AvatarImage'), 'AppHeader must render AvatarImage when an avatar exists')
assert(appHeaderAvatar.includes('AvatarFallback'), 'AppHeader must keep AvatarFallback for initials')

const polishGlassAvatar = read('src/components/layout/PolishGlassLayout.tsx')
assert(polishGlassAvatar.includes('useProfileAvatarUrl'), 'PolishGlassLayout must consume useProfileAvatarUrl')
assert(polishGlassAvatar.includes('AvatarImage'), 'PolishGlassLayout must render AvatarImage when an avatar exists')
assert(polishGlassAvatar.includes('<User className="h-4 w-4'), 'PolishGlassLayout must keep User icon fallback')

const useAuth = read('src/hooks/useAuth.ts')
assert(useAuth.includes('avatar_path'), 'useAuth must select avatar_path')
assert(useAuth.includes('avatar_updated_at'), 'useAuth must select avatar_updated_at')

const supabaseLib = read('src/lib/supabase.ts')
assert(supabaseLib.includes('avatar_path?: string | null'), 'Profile type must include avatar_path')
assert(supabaseLib.includes('avatar_updated_at?: string | null'), 'Profile type must include avatar_updated_at')
assert(supabaseLib.includes("'avatar_path' | 'avatar_updated_at'"), 'AuthProfile must include avatar fields')

const avatarMigration = read('supabase/migrations/20260504000000_profile_avatar_upload.sql')
assert(avatarMigration.includes("'profile-avatars'"), 'Migration must create the profile-avatars bucket')
assert(avatarMigration.includes('false,\n  2097152'), 'Migration must declare the bucket private with a size cap')
assert(avatarMigration.includes("auth.uid()::text || '/avatar.jpg'"), 'Migration policies must scope to <uid>/avatar.jpg')
assert(avatarMigration.includes('"Users read own avatar"'), 'Migration must add own-avatar select policy')
assert(avatarMigration.includes('"Users insert own avatar"'), 'Migration must add own-avatar insert policy')
assert(avatarMigration.includes('"Users update own avatar"'), 'Migration must add own-avatar update policy')
assert(avatarMigration.includes('"Users delete own avatar"'), 'Migration must add own-avatar delete policy')
assert(avatarMigration.includes("'avatar_path'"), 'Migration must extend the safe-update column list with avatar_path')
assert(avatarMigration.includes("'avatar_updated_at'"), 'Migration must extend the safe-update column list with avatar_updated_at')
assert(!/v_safe_update_columns text\[\][^;]*'role'/s.test(avatarMigration), 'Migration must not expose role to the safe-update list')
assert(!/v_safe_update_columns text\[\][^;]*'credits'/s.test(avatarMigration), 'Migration must not expose credits to the safe-update list')
assert(avatarMigration.includes("coalesce(new.role, 'learner') <> 'learner'"), 'Migration must keep the Phase 1A insert-time role/credits check')

console.log('admin/deck regression checks passed')
