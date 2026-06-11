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
import ResetPassword from '@/pages/ResetPassword'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Today from '@/pages/Today'
import GuidedCheckpoint from '@/pages/GuidedCheckpoint'
import CategoryListPage from '@/pages/categories/CategoryListPage'
import CategoryDetailPage from '@/pages/categories/CategoryDetailPage'
import LevelDetailPage from '@/pages/categories/LevelDetailPage'
import Generate from '@/pages/Generate'
import DeckView from '@/pages/DeckView'
import VideoPlayer from '@/pages/VideoPlayer'
import Study from '@/pages/Study'
import DashboardPG from '@/pages/DashboardPG'
import Decks from '@/pages/Decks'
import DecksPG from '@/pages/DecksPG'

import DeckViewPG from '@/pages/DeckViewPG'
import StudyPG from '@/pages/StudyPG'
import StudyModeSelector from '@/pages/StudyModeSelector'
import StudyFlashcard from '@/pages/StudyFlashcard'
import StudyAudio from '@/pages/StudyAudio'
import StudyCanvas from '@/pages/StudyCanvas'
import CanvasDeckPicker from '@/pages/CanvasDeckPicker'
import GamesHub from '@/pages/GamesHub'
import { ComingSoonPlaceholder } from '@/components/games/ComingSoonPlaceholder'
import GenerateGO from '@/pages/GenerateGO'
import Users from '@/pages/admin/Users'
import Content from '@/pages/admin/Content'
import Metrics from '@/pages/admin/Metrics'
import Queue from '@/pages/admin/Queue'
import Profiles from '@/pages/admin/Profiles'
import Voices from '@/pages/admin/Voices'
import Quotas from '@/pages/admin/Quotas'
import Layer2Lab from '@/pages/admin/Layer2Lab'
import CurriculumImageSets from '@/pages/admin/CurriculumImageSets'
import ObservabilityAggregate from '@/pages/admin/ObservabilityAggregate'
import ObservabilityWordDetail from '@/pages/admin/ObservabilityWordDetail'
import Music from '@/pages/Music'
import MusicPG from '@/pages/MusicPG'
import Speak from '@/pages/Speak'
import AdminRoute from '@/components/AdminRoute'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import SharePage from '@/pages/SharePage'
import HybridALanding from '@/landing-experiments/hybrid-a/HybridALanding'
import HybridBLanding from '@/landing-experiments/hybrid-b/HybridBLanding'
import LandingExperimentIndex from '@/landing-experiments/hybrid-a/LandingExperimentIndex'
import { useCapacitorDeepLinks } from '@/hooks/useCapacitorDeepLinks'

const SlicerGame = lazyWithRetry(() => import('@/games/slicer/SlicerGame'), 'slicer-game')
export const RUNNER_GAME_ROUTE_ENABLED = false

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
          element={(
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><ParticleSpinner preset="spirograph" size={160} /></div>}>
              <SlicerGame />
            </Suspense>
          )}
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
