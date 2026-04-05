import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Coins, User, Shield, LayoutDashboard, Sparkles, BookOpen, Music, Mic } from 'lucide-react'
import { RedeemCodeDialog } from '@/components/RedeemCodeDialog'
import ProfileModal from '@/components/ProfileModal'
import { useTranslation } from '@/hooks/useTranslation'

export default function PolishGlassLayout() {
  const location = useLocation()
  const { profile } = useAuth()
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
    { label: t('nav.decks'), path: '/dashboard', icon: LayoutDashboard },
    { label: t('nav.generate'), path: '/generate', icon: Sparkles },
    { label: t('nav.study'), path: '/study', icon: BookOpen },
    { label: t('nav.music'), path: '/music', icon: Music },
    { label: t('nav.speak'), path: '/speak', icon: Mic },
  ]

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="w-screen min-h-screen relative bg-[var(--pg-base-dark,#0a0a0c)] text-white overflow-x-hidden overflow-y-auto selection:bg-teal-500/30 font-sans pg-scrollbar-hide">
      {/* Cinematic ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
      {/* Perspective dot grid */}
      <div className="pg-dot-grid" aria-hidden="true" />

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full px-4 sm:px-6 py-2 flex items-center z-50 pointer-events-auto bg-[#0a0a0c]/80 backdrop-blur-md">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="sm:hidden p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-300"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile credits — visible only on mobile */}
        <button
          onClick={() => setRedeemOpen(true)}
          className="flex sm:hidden items-center gap-1 text-xs text-gray-400 ml-auto mr-2 hover:text-[var(--pg-accent-teal)] transition-colors"
        >
          <Coins className="w-3.5 h-3.5" />
          <span>{profile?.credits ?? 0}</span>
        </button>

        {/* Mobile profile button — visible only on mobile */}
        <button
          onClick={() => setProfileOpen(true)}
          className="flex sm:hidden items-center justify-center p-1.5 rounded-full hover:bg-white/10 transition-colors ml-1"
          aria-label="Settings"
        >
          <User className="h-4 w-4 text-gray-300" />
        </button>

        {/* Desktop centered nav with icons */}
        <div className="hidden sm:flex items-center gap-1 mx-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-display font-medium transition-all cursor-pointer ${
                isActive(item.path)
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-[var(--pg-accent-teal)] hover:bg-white/5'
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
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-[var(--pg-accent-teal)] hover:bg-white/5'
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-gray-300 hover:text-[var(--pg-accent-teal)] hover:bg-white/10 transition-colors"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{profile?.credits ?? 0}</span>
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
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
            className="fixed top-[60px] left-0 w-full z-40 sm:hidden bg-[#0a0a0c]/95 backdrop-blur-lg border-b border-white/5"
          >
            <div className="flex flex-col p-4 gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full text-left px-4 py-3 rounded-xl font-display font-medium transition-all flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'text-white bg-white/5'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                      ? 'text-white bg-white/5'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
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
