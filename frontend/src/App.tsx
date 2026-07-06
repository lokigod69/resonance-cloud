import { Suspense, useEffect } from 'react'
import { lazyWithRetry } from '@/utils/lazyWithRetry'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext, useAuth, useAuthState } from '@/hooks/useAuth'
import type { AuthState } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { SkinProvider } from '@/contexts/SkinProvider'
import { useSkin } from '@/contexts/SkinContext'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { DialogProvider } from '@/contexts/DialogProvider'
import { useDialogs } from '@/contexts/DialogContext'
import { ToastProvider } from '@/components/ToastProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import PolishGlassLayout from '@/components/layout/PolishGlassLayout'
import FerrariAdminLayout from '@/layouts/FerrariAdminLayout'
import AdminRoute from '@/components/AdminRoute'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { useCapacitorDeepLinks } from '@/hooks/useCapacitorDeepLinks'
import {
  getPrimaryNavRouteImports,
  routeImports,
  scheduleIdleRoutePrefetch,
} from '@/routes/routeImports'
import { VISUAL_LENS_ENABLED } from '@/lib/productFlags'

const LandingPage = lazyWithRetry(routeImports.landingPage, 'landing-page')
const Login = lazyWithRetry(routeImports.login, 'login')
const ProfileModal = lazyWithRetry(() => import('@/components/ProfileModal'), 'profile-modal')
const RedeemCodeDialog = lazyWithRetry(
  () => import('@/components/RedeemCodeDialog').then((mod) => ({ default: mod.RedeemCodeDialog })),
  'redeem-code-dialog',
)
const ResetPassword = lazyWithRetry(routeImports.resetPassword, 'reset-password')
const Onboarding = lazyWithRetry(routeImports.onboarding, 'onboarding')
const SharePage = lazyWithRetry(routeImports.sharePage, 'share-page')
const HybridALanding = lazyWithRetry(routeImports.hybridALanding, 'hybrid-a-landing')
const HybridBLanding = lazyWithRetry(routeImports.hybridBLanding, 'hybrid-b-landing')
const LandingExperimentIndex = lazyWithRetry(routeImports.landingExperimentIndex, 'landing-experiment-index')
const Dashboard = lazyWithRetry(routeImports.dashboard, 'dashboard')
const DashboardPG = lazyWithRetry(routeImports.dashboardPG, 'dashboard-pg')
const Lens = lazyWithRetry(routeImports.lens, 'lens')
const Today = lazyWithRetry(routeImports.today, 'today')
const GuidedCheckpoint = lazyWithRetry(routeImports.guidedCheckpoint, 'guided-checkpoint')
const CategoryListPage = lazyWithRetry(routeImports.categoryList, 'category-list')
const CategoryDetailPage = lazyWithRetry(routeImports.categoryDetail, 'category-detail')
const LevelDetailPage = lazyWithRetry(routeImports.levelDetail, 'level-detail')
const GamesHub = lazyWithRetry(routeImports.gamesHub, 'games-hub')
const Generate = lazyWithRetry(routeImports.generate, 'generate')
const GenerateGO = lazyWithRetry(routeImports.generateGO, 'generate-go')
const Decks = lazyWithRetry(routeImports.decks, 'decks')
const DecksPG = lazyWithRetry(routeImports.decksPG, 'decks-pg')
const DeckView = lazyWithRetry(routeImports.deckView, 'deck-view')
const DeckViewPG = lazyWithRetry(routeImports.deckViewPG, 'deck-view-pg')
const VideoPlayer = lazyWithRetry(routeImports.videoPlayer, 'video-player')
const Study = lazyWithRetry(routeImports.study, 'study')
const StudyPG = lazyWithRetry(routeImports.studyPG, 'study-pg')
const StudyImage = lazyWithRetry(routeImports.studyImage, 'study-image')
const StudyImagePG = lazyWithRetry(routeImports.studyImagePG, 'study-image-pg')
const StudyModeSelector = lazyWithRetry(routeImports.studyModeSelector, 'study-mode-selector')
const StudyFlashcard = lazyWithRetry(routeImports.studyFlashcard, 'study-flashcard')
const StudyAudio = lazyWithRetry(routeImports.studyAudio, 'study-audio')
const StudyCanvas = lazyWithRetry(routeImports.studyCanvas, 'study-canvas')
const CanvasDeckPicker = lazyWithRetry(routeImports.canvasDeckPicker, 'canvas-deck-picker')
const Music = lazyWithRetry(routeImports.music, 'music')
const MusicPG = lazyWithRetry(routeImports.musicPG, 'music-pg')
const Speak = lazyWithRetry(routeImports.speak, 'speak')
const ScriptLab = lazyWithRetry(routeImports.scriptLab, 'script-lab')
const Users = lazyWithRetry(routeImports.adminUsers, 'admin-users')
const Content = lazyWithRetry(routeImports.adminContent, 'admin-content')
const Metrics = lazyWithRetry(routeImports.adminMetrics, 'admin-metrics')
const Queue = lazyWithRetry(routeImports.adminQueue, 'admin-queue')
const Profiles = lazyWithRetry(routeImports.adminProfiles, 'admin-profiles')
const Voices = lazyWithRetry(routeImports.adminVoices, 'admin-voices')
const Quotas = lazyWithRetry(routeImports.adminQuotas, 'admin-quotas')
const Layer2Lab = lazyWithRetry(routeImports.adminLayer2Lab, 'admin-layer2-lab')
const CurriculumImageSets = lazyWithRetry(routeImports.adminCurriculumImageSets, 'admin-curriculum-image-sets')
const ObservabilityAggregate = lazyWithRetry(routeImports.adminObservabilityAggregate, 'admin-observability-aggregate')
const ObservabilityWordDetail = lazyWithRetry(routeImports.adminObservabilityWordDetail, 'admin-observability-word-detail')
const ObservabilityCost = lazyWithRetry(routeImports.adminObservabilityCost, 'admin-observability-cost')
const SlicerGame = lazyWithRetry(routeImports.slicerGame, 'slicer-game')

function RouteSuspenseFallback() {
  return <LingwaveLoader fullScreen />
}

function FullScreenRouteLoading() {
  return <LingwaveLoader fullScreen />
}

function shouldWaitForProfileGate(auth: AuthState) {
  return Boolean(
    auth.session &&
    !auth.profileLoadError &&
    (!auth.profileReady || auth.profileLoading)
  )
}

function shouldRedirectToOnboarding(auth: AuthState, pathname: string) {
  const { session, profile, profileReady, profileLoading, profileLoadError } = auth

  return Boolean(
    session &&
    profileReady &&
    !profileLoading &&
    !profileLoadError &&
    profile &&
    !profile.base_language?.trim() &&
    pathname !== '/onboarding'
  )
}

function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.loading || shouldWaitForProfileGate(auth)) {
    return <FullScreenRouteLoading />
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />
  }

  if (shouldRedirectToOnboarding(auth, location.pathname)) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />
  }

  return <Outlet />
}

function OnboardingRoute() {
  const { session, loading: authLoading } = useAuth()

  if (authLoading) {
    return <FullScreenRouteLoading />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function PublicRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.loading || shouldWaitForProfileGate(auth)) {
    return <FullScreenRouteLoading />
  }

  if (auth.session) {
    if (shouldRedirectToOnboarding(auth, location.pathname)) {
      return <Navigate to="/onboarding" replace state={{ from: location }} />
    }

    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthState()
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
}

function AppRoutes() {
  const { skin } = useSkin()
  const { session } = useAuth()
  const navigate = useNavigate()
  useCapacitorDeepLinks(navigate)

  // Warm the primary-nav route chunks so in-app transitions are cache hits.
  // Only for signed-in users: logged-out visitors on the landing page should
  // not pay for app chunks they may never open.
  useEffect(() => {
    if (!session) return
    return scheduleIdleRoutePrefetch(getPrimaryNavRouteImports(skin))
  }, [skin, session])

  return (
    <Suspense fallback={<RouteSuspenseFallback />}>
    <Routes>
      {/* Fully public routes — no auth, no redirect */}
      <Route path="/share/:shareId" element={<SharePage />} />
      <Route path="/v/:shareId" element={<SharePage />} />
      <Route path="/a" element={<HybridALanding />} />
      <Route path="/b" element={<HybridBLanding />} />
      <Route path="/landing" element={<LandingExperimentIndex />} />
      <Route path="/landing/a" element={<HybridALanding />} />
      <Route path="/landing/b" element={<HybridBLanding />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Onboarding (auth required, no layout, no base_language check) */}
      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute />}>
        {/* Video player is full-screen, no layout */}
        <Route path="/deck/:id/word/:wordId" element={<VideoPlayer />} />
        <Route
          path="/games/slicer"
          element={<SlicerGame />}
        />
        {/* Canvas is a headerless immersion mode (like the games above) — lifted out of the skin layouts so no global header overlaps its toolbar */}
        <Route path="/study/canvas" element={<StudyCanvas />} />
        {VISUAL_LENS_ENABLED ? <Route path="/lens" element={<Lens />} /> : null}

        {/* User-facing routes — skin-aware layout */}
        {skin === 'glassy' ? (
          <Route element={<PolishGlassLayout />}>
            <Route path="/dashboard" element={<DashboardPG />} />
            <Route path="/today" element={<Today />} />
            <Route path="/today/checkpoint" element={<GuidedCheckpoint />} />
            <Route path="/categories" element={<CategoryListPage />} />
            <Route path="/categories/:categorySlug" element={<CategoryDetailPage />} />
            <Route path="/categories/:categorySlug/level/:levelNumber" element={<LevelDetailPage />} />
            <Route path="/categories/:categorySlug/:levelNumber" element={<LevelDetailPage />} />
            <Route path="/games" element={<GamesHub />} />
            <Route path="/decks" element={<DecksPG />} />
            <Route path="/generate" element={<GenerateGO />} />
            <Route path="/deck/:id" element={<DeckViewPG />} />
            <Route path="/study" element={<StudyModeSelector />} />
            <Route path="/study/video" element={<StudyPG />} />
            <Route path="/study/image" element={<StudyImagePG />} />
            <Route path="/study/flashcard" element={<StudyFlashcard />} />
            <Route path="/study/audio" element={<StudyAudio />} />
            <Route path="/study/canvas/select" element={<CanvasDeckPicker />} />
            <Route path="/alphabet" element={<ScriptLab />} />
            <Route path="/alphabet/:scriptId" element={<ScriptLab />} />
            <Route path="/music" element={<MusicPG />} />
            <Route path="/speak" element={<Speak />} />
          </Route>
        ) : (
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/today" element={<Today />} />
            <Route path="/today/checkpoint" element={<GuidedCheckpoint />} />
            <Route path="/categories" element={<CategoryListPage />} />
            <Route path="/categories/:categorySlug" element={<CategoryDetailPage />} />
            <Route path="/categories/:categorySlug/level/:levelNumber" element={<LevelDetailPage />} />
            <Route path="/categories/:categorySlug/:levelNumber" element={<LevelDetailPage />} />
            <Route path="/games" element={<GamesHub />} />
            <Route path="/decks" element={<Decks />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/deck/:id" element={<DeckView />} />
            <Route path="/study" element={<StudyModeSelector />} />
            <Route path="/study/video" element={<Study />} />
            <Route path="/study/image" element={<StudyImage />} />
            <Route path="/study/flashcard" element={<StudyFlashcard />} />
            <Route path="/study/audio" element={<StudyAudio />} />
            <Route path="/study/canvas/select" element={<CanvasDeckPicker />} />
            <Route path="/alphabet" element={<ScriptLab />} />
            <Route path="/alphabet/:scriptId" element={<ScriptLab />} />
            <Route path="/music" element={<Music />} />
            <Route path="/speak" element={<Speak />} />
          </Route>
        )}

        {/* Admin routes always use AppLayout regardless of skin */}
        <Route element={<AppLayout />}>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Navigate to="/admin/content" replace />} />
            <Route path="/admin/queue" element={<Queue />} />
            <Route path="/admin/profiles" element={<Profiles />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/content" element={<Content />} />
            <Route path="/admin/metrics" element={<Metrics />} />
            <Route path="/admin/voices" element={<Voices />} />
            <Route path="/admin/quotas" element={<Quotas />} />
            <Route path="/admin/layer2-lab" element={<Layer2Lab />} />
            <Route path="/admin/curriculum" element={<CurriculumImageSets />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<FerrariAdminLayout />}>
            <Route path="/admin/observability/aggregate" element={<ObservabilityAggregate />} />
            <Route path="/admin/observability/cost" element={<ObservabilityCost />} />
            <Route path="/admin/observability/word/:wordId" element={<ObservabilityWordDetail />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

function DocumentLanguageSync() {
  const { locale } = useTranslation()

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}

function AppShellDialogs() {
  const { profileOpen, setProfileOpen, redeemOpen, setRedeemOpen } = useDialogs()
  return (
    <>
      <Suspense fallback={null}>
        {profileOpen ? <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} /> : null}
        {redeemOpen ? <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} /> : null}
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <SkinProvider>
      <ToastProvider>
      <AuthProvider>
        <LanguageProvider>
          <DialogProvider>
            <DocumentLanguageSync />
            <AppRoutes />
            <AppShellDialogs />
          </DialogProvider>
        </LanguageProvider>
      </AuthProvider>
      </ToastProvider>
      </SkinProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
