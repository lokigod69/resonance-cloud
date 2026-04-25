import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Coins, User, Shield, LayoutDashboard, Library, Sparkles, BookOpen, Music, Mic } from 'lucide-react'
import { RedeemCodeDialog } from '@/components/RedeemCodeDialog'
import ProfileModal from '@/components/ProfileModal'
import { useTranslation } from '@/hooks/useTranslation'

export default function PolishGlassLayout() {
  const location = useLocation()
  const { profile, profileLoading } = useAuth()
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isAdmin = profile?.role === 'admin'

  const navItems = [
    { label: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { label: t('nav.decks'), path: '/decks', icon: Library },
    { label: t('nav.generate'), path: '/generate', icon: Sparkles },
    { label: t('nav.study'), path: '/study', icon: BookOpen },
    { label: t('nav.music'), path: '/music', icon: Music },
    { label: t('nav.speak'), path: '/speak', icon: Mic },
  ]

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="app-shell w-screen min-h-screen relative overflow-x-hidden overflow-y-auto font-sans pg-scrollbar-hide">
      {/* Cinematic ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full blur-[120px] pointer-events-none z-0 bg-[var(--accent-glow)]" />
      {/* Perspective dot grid */}
      <div className="pg-dot-grid" aria-hidden="true" />

      {/* Top Navigation */}
      <nav className="app-topnav fixed top-0 left-0 w-full px-4 sm:px-6 py-2 flex items-center z-50 pointer-events-auto">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="sm:hidden p-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile credits — visible only on mobile */}
        <button
          onClick={() => setRedeemOpen(true)}
          className="flex sm:hidden items-center gap-1 text-xs text-[var(--text-muted)] ml-auto mr-2 hover:text-[var(--accent)] transition-colors"
        >
          <Coins className="w-3.5 h-3.5" />
          <span>{typeof profile?.credits === 'number' ? profile.credits : profileLoading ? '...' : 0}</span>
        </button>

        {/* Mobile profile button — visible only on mobile */}
        <button
          onClick={() => setProfileOpen(true)}
          className="flex sm:hidden items-center justify-center p-1.5 rounded-full hover:bg-[var(--accent-soft)] transition-colors ml-1"
          aria-label="Settings"
        >
          <User className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>

        {/* Desktop centered nav with icons */}
        <div className="hidden sm:flex items-center gap-1 mx-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-display font-medium transition-all cursor-pointer ${
                isActive(item.path)
                  ? 'theme-chip-active'
                  : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin/queue"
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-display font-medium transition-all cursor-pointer ${
                isActive('/admin')
                  ? 'theme-chip-active'
                  : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]'
              }`}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          )}
        </div>

        {/* Right side: credits + profile */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={() => setRedeemOpen(true)}
            className="theme-chip flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{typeof profile?.credits === 'number' ? profile.credits : profileLoading ? '...' : 0}</span>
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="p-1.5 rounded-full hover:bg-[var(--accent-soft)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Profile"
          >
            <User className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="app-topnav fixed top-[60px] left-0 w-full z-40 sm:hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full text-left px-4 py-3 rounded-xl font-display font-medium transition-all flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'theme-chip-active'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin/queue"
                  className={`w-full text-left px-4 py-3 rounded-xl font-display font-medium transition-all flex items-center gap-2 ${
                    isActive('/admin')
                      ? 'theme-chip-active'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="w-full min-h-screen pt-16 sm:pt-20 pb-20 relative z-10">
        <Outlet />
      </main>

      <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  )
}
