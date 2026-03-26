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
import Settings from '@/pages/Settings'
import Study from '@/pages/Study'
import DashboardPG from '@/pages/DashboardPG'
import GeneratePG from '@/pages/GeneratePG'
import DeckViewPG from '@/pages/DeckViewPG'
import StudyPG from '@/pages/StudyPG'
import GlassOrbLayout from '@/components/layout/GlassOrbLayout'
import DashboardGO from '@/pages/DashboardGO'
import GenerateGO from '@/pages/GenerateGO'
import StudyGO from '@/pages/StudyGO'
import Users from '@/pages/admin/Users'
import Content from '@/pages/admin/Content'
import Metrics from '@/pages/admin/Metrics'
import Queue from '@/pages/admin/Queue'
import Profiles from '@/pages/admin/Profiles'
import AdminRoute from '@/components/AdminRoute'

function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="glass rounded-xl px-8 py-4 flex items-center gap-3">
          <svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground">Loading...</p>
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
        <div className="glass rounded-xl px-8 py-4">
          <p className="text-muted-foreground">Loading...</p>
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
        <div className="glass rounded-xl px-8 py-4">
          <p className="text-muted-foreground">Loading...</p>
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
        {skin === 'glass-orb' ? (
          <Route element={<GlassOrbLayout />}>
            <Route path="/dashboard" element={<DashboardGO />} />
            <Route path="/generate" element={<GenerateGO />} />
            <Route path="/deck/:id" element={<DeckView />} /> {/* TODO: create DeckViewGO */}
            <Route path="/study" element={<StudyGO />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        ) : skin === 'polish-glass' ? (
          <Route element={<PolishGlassLayout />}>
            <Route path="/dashboard" element={<DashboardPG />} />
            <Route path="/generate" element={<GeneratePG />} />
            <Route path="/deck/:id" element={<DeckViewPG />} />
            <Route path="/study" element={<StudyPG />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        ) : (
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/deck/:id" element={<DeckView />} />
            <Route path="/study" element={<Study />} />
            <Route path="/settings" element={<Settings />} />
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
