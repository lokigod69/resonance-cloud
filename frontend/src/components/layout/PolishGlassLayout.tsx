import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Coins, User, Shield } from 'lucide-react'
import { RedeemCodeDialog } from '@/components/RedeemCodeDialog'
import ProfileModal from '@/components/ProfileModal'

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Generate', path: '/generate' },
  { label: 'Study', path: '/study' },
]

export default function PolishGlassLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isAdmin = profile?.role === 'admin'

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="w-screen min-h-screen relative bg-[var(--pg-base-dark,#0a0a0c)] text-white overflow-x-hidden overflow-y-auto selection:bg-teal-500/30 font-sans pg-scrollbar-hide">
      {/* Cinematic ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center z-50 pointer-events-auto bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/50 shadow-[0_0_15px_rgba(13,226,195,0.4)]">
            <div className="w-3 h-3 bg-teal-400 rounded-full animate-pulse" />
          </div>
          <span className="font-bold text-xl sm:text-2xl tracking-tight font-display text-white drop-shadow-md">
            RESONANZ
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden sm:flex gap-6 text-[0.95rem] font-medium text-gray-300 font-display items-center">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`cursor-pointer hover:-translate-y-0.5 transform hover:scale-105 transition-all outline-none ${
                isActive(item.path)
                  ? 'text-white drop-shadow-md'
                  : 'hover:text-[var(--pg-accent-teal)]'
              }`}
            >
              {item.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/queue')}
              className={`cursor-pointer hover:-translate-y-0.5 transform hover:scale-105 transition-all outline-none flex items-center gap-1.5 ${
                isActive('/admin')
                  ? 'text-white drop-shadow-md'
                  : 'text-gray-300 hover:text-[var(--pg-accent-teal)]'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </button>
          )}
          <button
            onClick={() => setRedeemOpen(true)}
            className="flex items-center gap-1.5 ml-4 border-l border-white/10 pl-4 text-xs text-gray-400 hover:text-[var(--pg-accent-teal)] transition-colors"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{profile?.credits ?? 0}</span>
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="ml-2 p-1.5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            title="Profile"
          >
            <User className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="sm:hidden p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-300"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-display font-medium transition-all ${
                    isActive(item.path)
                      ? 'text-white bg-white/5'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => { navigate('/admin/queue'); setMobileOpen(false) }}
                  className={`w-full text-left px-4 py-3 rounded-xl font-display font-medium transition-all flex items-center gap-2 ${
                    isActive('/admin')
                      ? 'text-white bg-white/5'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </button>
              )}
              <button
                onClick={() => { setRedeemOpen(true); setMobileOpen(false) }}
                className="w-full text-left px-4 py-3 rounded-xl font-display font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
              >
                <Coins className="h-4 w-4" />
                {profile?.credits ?? 0} credits
              </button>
              <button
                onClick={() => { setProfileOpen(true); setMobileOpen(false) }}
                className="w-full text-left px-4 py-3 rounded-xl font-display font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="w-full min-h-screen pt-20 sm:pt-24 pb-20 relative z-10">
        <Outlet />
      </main>

      <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  )
}
