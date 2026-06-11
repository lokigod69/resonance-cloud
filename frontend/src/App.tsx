import { Suspense, useEffect } from 'react'
import { lazyWithRetry } from '@/utils/lazyWithRetry'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { AuthContext, useAuth, useAuthState } from '@/hooks/useAuth'
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
import ProfileModal from '@/components/ProfileModal'
import { RedeemCodeDialog } from '@/components/RedeemCodeDialog'
import LandingPage from '@/pages/LandingPage'
import Login from '@/pages/Login'
import { ComingSoonPlaceholder } from '@/components/games/ComingSoonPlaceholder'
import AdminRoute from '@/components/AdminRoute'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useCapacitorDeepLinks } from '@/hooks/useCapacitorDeepLinks'

const ResetPassword = lazyWithRetry(() => import('@/pages/ResetPassword'), 'reset-password')
const Onboarding = lazyWithRetry(() => import('@/pages/Onboarding'), 'onboarding')
const SharePage = lazyWithRetry(() => import('@/pages/SharePage'), 'share-page')
const HybridALanding = lazyWithRetry(() => import('@/landing-experiments/hybrid-a/HybridALanding'), 'hybrid-a-landing')
const HybridBLanding = lazyWithRetry(() => import('@/landing-experiments/hybrid-b/HybridBLanding'), 'hybrid-b-landing')
const LandingExperimentIndex = lazyWithRetry(() => import('@/landing-experiments/hybrid-a/LandingExperimentIndex'), 'landing-experiment-index')
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'), 'dashboard')
const DashboardPG = lazyWithRetry(() => import('@/pages/DashboardPG'), 'dashboard-pg')
const Today = lazyWithRetry(() => import('@/pages/Today'), 'today')
const GuidedCheckpoint = lazyWithRetry(() => import('@/pages/GuidedCheckpoint'), 'guided-checkpoint')
const CategoryListPage = lazyWithRetry(() => import('@/pages/categories/CategoryListPage'), 'category-list')
const CategoryDetailPage = lazyWithRetry(() => import('@/pages/categories/CategoryDetailPage'), 'category-detail')
const LevelDetailPage = lazyWithRetry(() => import('@/pages/categories/LevelDetailPage'), 'level-detail')
const GamesHub = lazyWithRetry(() => import('@/pages/GamesHub'), 'games-hub')
const Generate = lazyWithRetry(() => import('@/pages/Generate'), 'generate')
const GenerateGO = lazyWithRetry(() => import('@/pages/GenerateGO'), 'generate-go')
const Decks = lazyWithRetry(() => import('@/pages/Decks'), 'decks')
const DecksPG = lazyWithRetry(() => import('@/pages/DecksPG'), 'decks-pg')
const DeckView = lazyWithRetry(() => import('@/pages/DeckView'), 'deck-view')
const DeckViewPG = lazyWithRetry(() => import('@/pages/DeckViewPG'), 'deck-view-pg')
const VideoPlayer = lazyWithRetry(() => import('@/pages/VideoPlayer'), 'video-player')
const Study = lazyWithRetry(() => import('@/pages/Study'), 'study')
const StudyPG = lazyWithRetry(() => import('@/pages/StudyPG'), 'study-pg')
const StudyModeSelector = lazyWithRetry(() => import('@/pages/StudyModeSelector'), 'study-mode-selector')
const StudyFlashcard = lazyWithRetry(() => import('@/pages/StudyFlashcard'), 'study-flashcard')
const StudyAudio = lazyWithRetry(() => import('@/pages/StudyAudio'), 'study-audio')
const StudyCanvas = lazyWithRetry(() => import('@/pages/StudyCanvas'), 'study-canvas')
const CanvasDeckPicker = lazyWithRetry(() => import('@/pages/CanvasDeckPicker'), 'canvas-deck-picker')
const Music = lazyWithRetry(() => import('@/pages/Music'), 'music')
const MusicPG = lazyWithRetry(() => import('@/pages/MusicPG'), 'music-pg')
const Speak = lazyWithRetry(() => import('@/pages/Speak'), 'speak')
const Users = lazyWithRetry(() => import('@/pages/admin/Users'), 'admin-users')
const Content = lazyWithRetry(() => import('@/pages/admin/Content'), 'admin-content')
const Metrics = lazyWithRetry(() => import('@/pages/admin/Metrics'), 'admin-metrics')
const Queue = lazyWithRetry(() => import('@/pages/admin/Queue'), 'admin-queue')
const Profiles = lazyWithRetry(() => import('@/pages/admin/Profiles'), 'admin-profiles')
const Voices = lazyWithRetry(() => import('@/pages/admin/Voices'), 'admin-voices')
const Quotas = lazyWithRetry(() => import('@/pages/admin/Quotas'), 'admin-quotas')
const Layer2Lab = lazyWithRetry(() => import('@/pages/admin/Layer2Lab'), 'admin-layer2-lab')
const CurriculumImageSets = lazyWithRetry(() => import('@/pages/admin/CurriculumImageSets'), 'admin-curriculum-image-sets')
const ObservabilityAggregate = lazyWithRetry(() => import('@/pages/admin/ObservabilityAggregate'), 'admin-observability-aggregate')
const ObservabilityWordDetail = lazyWithRetry(() => import('@/pages/admin/ObservabilityWordDetail'), 'admin-observability-word-detail')
const SlicerGame = lazyWithRetry(() => import('@/games/slicer/SlicerGame'), 'slicer-game')
export const RUNNER_GAME_ROUTE_ENABLED = false

function RouteSuspenseFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <ParticleSpinner preset="spirograph" size={160} />
      <p className="text-sm text-muted-foreground opacity-70">Loading...</p>
    </div>
  )
}

function ProtectedRoute() {
  const { session, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ParticleSpinner preset="spirograph" size={160} />
        <p className="text-sm text-muted-foreground opacity-60">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function OnboardingRoute() {
  const { session, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ParticleSpinner preset="spirograph" size={160} />
        <p className="text-sm text-muted-foreground opacity-60">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function PublicRoute() {
  const { session, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ParticleSpinner preset="spirograph" size={160} />
        <p className="text-sm text-muted-foreground opacity-60">Loading...</p>
      </div>
    )
  }

  if (session) {
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
  const navigate = useNavigate()
  useCapacitorDeepLinks(navigate)

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
        <Route
          path="/games/runner"
          element={<ComingSoonPlaceholder />}
        />
        {/* Canvas is a headerless immersion mode (like the games above) — lifted out of the skin layouts so no global header overlaps its toolbar */}
        <Route path="/study/canvas" element={<StudyCanvas />} />

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
            <Route path="/study/flashcard" element={<StudyFlashcard />} />
            <Route path="/study/audio" element={<StudyAudio />} />
            <Route path="/study/canvas/select" element={<CanvasDeckPicker />} />
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
            <Route path="/study/flashcard" element={<StudyFlashcard />} />
            <Route path="/study/audio" element={<StudyAudio />} />
            <Route path="/study/canvas/select" element={<CanvasDeckPicker />} />
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
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
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
