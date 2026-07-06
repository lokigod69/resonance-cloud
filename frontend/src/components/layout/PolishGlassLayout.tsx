import { Suspense } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfileAvatarUrl } from '@/hooks/useProfileAvatarUrl'
import { Coins, Shield, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { useDialogs } from '@/contexts/DialogContext'
import { useTranslation } from '@/hooks/useTranslation'
import { MobileBottomNav } from './MobileBottomNav'
import { getPrimaryNavItems, isPrimaryNavItemActive } from './primaryNav'

export default function PolishGlassLayout() {
  const location = useLocation()
  const { profile, profileLoading } = useAuth()
  const avatarUrl = useProfileAvatarUrl(profile?.avatar_path, profile?.avatar_updated_at)
  const { t } = useTranslation()
  const { setProfileOpen, setRedeemOpen } = useDialogs()

  const isAdmin = profile?.role === 'admin'
  const navItems = getPrimaryNavItems(t)

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  const isSpeakRoute = location.pathname.startsWith('/speak')

  return (
    <div className={`app-shell w-full min-h-dvh relative font-sans pg-scrollbar-hide ${
      isSpeakRoute ? 'overflow-visible' : 'overflow-x-hidden overflow-y-auto'
    }`}>
      <div className="glassy-atmosphere" aria-hidden="true">
        <div className="glassy-atmosphere-haze" />
        <div className="glassy-atmosphere-floor" />
        <div className="glassy-atmosphere-vignette" />
      </div>

      <nav className="app-topnav hidden md:flex fixed top-0 left-0 w-full min-h-[var(--glassy-header-offset)] px-4 sm:px-6 pt-[calc(var(--app-safe-top)+0.5rem)] pb-2 items-center gap-2 z-50 pointer-events-auto !backdrop-blur-3xl !backdrop-saturate-150 !bg-black/40">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="Lingwave dashboard">
          <LingwaveBrand markClassName="h-6" wordmarkClassName="h-5 sm:h-6" />
        </Link>

        <div className="flex items-center gap-1 mx-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex min-w-[58px] flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-display font-medium transition-all cursor-pointer lg:px-4 ${
                isPrimaryNavItemActive(location.pathname, item)
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
              to="/admin/content"
              className={`flex min-w-[58px] flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-display font-medium transition-all cursor-pointer lg:px-4 ${
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

        <div className="flex items-center gap-2 shrink-0">
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
            {avatarUrl ? (
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={avatarUrl}
                  alt=""
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  className="object-cover"
                />
                <AvatarFallback className="text-[10px]">
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-4 w-4" />
            )}
          </button>
        </div>
      </nav>

      <MobileBottomNav />

      <main className={`w-full pt-[var(--glassy-content-top-offset)] pb-[var(--glassy-main-bottom-padding)] relative z-10 ${
        isSpeakRoute ? 'min-h-0' : 'min-h-dvh'
      }`}>
        <Suspense fallback={<LingwaveLoader className="min-h-[calc(100dvh-8rem)]" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
