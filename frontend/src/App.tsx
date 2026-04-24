import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthContext, useAuth, useAuthState } from '@/hooks/useAuth'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SkinProvider, useSkin } from '@/contexts/SkinContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ToastProvider } from '@/components/Toast'
import { AppLayout } from '@/components/layout/AppLayout'
import PolishGlassLayout from '@/components/layout/PolishGlassLayout'
import FerrariAdminLayout from '@/layouts/FerrariAdminLayout'
import LandingPage from '@/pages/LandingPage'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
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
import GenerateGO from '@/pages/GenerateGO'
import Users from '@/pages/admin/Users'
import Content from '@/pages/admin/Content'
import Metrics from '@/pages/admin/Metrics'
import Queue from '@/pages/admin/Queue'
import Profiles from '@/pages/admin/Profiles'
import Voices from '@/pages/admin/Voices'
import ObservabilityAggregate from '@/pages/admin/ObservabilityAggregate'
import ObservabilityWordDetail from '@/pages/admin/ObservabilityWordDetail'
import Music from '@/pages/Music'
import MusicPG from '@/pages/MusicPG'
import Speak from '@/pages/Speak'
import AdminRoute from '@/components/AdminRoute'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import SharePage from '@/pages/SharePage'

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

  return (
    <Routes>
      {/* Fully public routes — no auth, no redirect */}
      <Route path="/share/:shareId" element={<SharePage />} />
      <Route path="/v/:shareId" element={<SharePage />} />

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

        {/* User-facing routes — skin-aware layout */}
        {skin === 'glassy' ? (
          <Route element={<PolishGlassLayout />}>
            <Route path="/dashboard" element={<DashboardPG />} />
            <Route path="/decks" element={<DecksPG />} />
            <Route path="/generate" element={<GenerateGO />} />
            <Route path="/deck/:id" element={<DeckViewPG />} />
            <Route path="/study" element={<StudyModeSelector />} />
            <Route path="/study/video" element={<StudyPG />} />
            <Route path="/study/flashcard" element={<StudyFlashcard />} />
            <Route path="/study/audio" element={<StudyAudio />} />
            <Route path="/music" element={<MusicPG />} />
            <Route path="/speak" element={<Speak />} />
          </Route>
        ) : (
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/decks" element={<Decks />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/deck/:id" element={<DeckView />} />
            <Route path="/study" element={<StudyModeSelector />} />
            <Route path="/study/video" element={<Study />} />
            <Route path="/study/flashcard" element={<StudyFlashcard />} />
            <Route path="/study/audio" element={<StudyAudio />} />
            <Route path="/music" element={<Music />} />
            <Route path="/speak" element={<Speak />} />
          </Route>
        )}

        {/* Admin routes always use AppLayout regardless of skin */}
        <Route element={<AppLayout />}>
          <Route element={<AdminRoute />}>
            <Route path="/admin/queue" element={<Queue />} />
            <Route path="/admin/profiles" element={<Profiles />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/content" element={<Content />} />
            <Route path="/admin/metrics" element={<Metrics />} />
            <Route path="/admin/voices" element={<Voices />} />
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

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <SkinProvider>
      <ToastProvider>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
      </ToastProvider>
      </SkinProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
