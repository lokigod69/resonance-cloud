import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthContext, useAuth, useAuthState } from '@/hooks/useAuth'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SkinProvider, useSkin } from '@/contexts/SkinContext'
import { ToastProvider } from '@/components/Toast'
import { AppLayout } from '@/components/layout/AppLayout'
import PolishGlassLayout from '@/components/layout/PolishGlassLayout'
import LandingPage from '@/pages/LandingPage'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Generate from '@/pages/Generate'
import DeckView from '@/pages/DeckView'
import VideoPlayer from '@/pages/VideoPlayer'
import Study from '@/pages/Study'
import DashboardPG from '@/pages/DashboardPG'

import DeckViewPG from '@/pages/DeckViewPG'
import StudyPG from '@/pages/StudyPG'
import GenerateGO from '@/pages/GenerateGO'
import Users from '@/pages/admin/Users'
import Content from '@/pages/admin/Content'
import Metrics from '@/pages/admin/Metrics'
import Queue from '@/pages/admin/Queue'
import Profiles from '@/pages/admin/Profiles'
import Voices from '@/pages/admin/Voices'
import Music from '@/pages/Music'
import MusicPG from '@/pages/MusicPG'
import Speak from '@/pages/Speak'
import AdminRoute from '@/components/AdminRoute'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'

function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="glass rounded-xl px-8 py-6">
          <LoadingIndicator />
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function OnboardingRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="glass rounded-xl px-8 py-6">
          <LoadingIndicator />
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function PublicRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="glass rounded-xl px-8 py-6">
          <LoadingIndicator />
        </div>
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
            <Route path="/generate" element={<GenerateGO />} />
            <Route path="/deck/:id" element={<DeckViewPG />} />
            <Route path="/study" element={<StudyPG />} />
            <Route path="/music" element={<MusicPG />} />
            <Route path="/speak" element={<Speak />} />
          </Route>
        ) : (
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/deck/:id" element={<DeckView />} />
            <Route path="/study" element={<Study />} />
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
        <AppRoutes />
      </AuthProvider>
      </ToastProvider>
      </SkinProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
