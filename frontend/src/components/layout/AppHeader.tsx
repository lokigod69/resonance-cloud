import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfileAvatarUrl } from '@/hooks/useProfileAvatarUrl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  Music,
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Coins,
  Menu,
  ListOrdered,
  Library,
  Languages,
  Users,
  FileText,
  BarChart3,
  Mic,
  Beaker,
} from 'lucide-react'
import { useDialogs } from '@/contexts/DialogContext'
import { useTranslation } from '@/hooks/useTranslation'

const adminNav = [
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/queue', label: 'Job Queue', icon: ListOrdered },
  { to: '/admin/profiles', label: 'Profiles', icon: Languages },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/voices', label: 'Voices', icon: Mic },
  { to: '/admin/metrics', label: 'Metrics', icon: BarChart3 },
  { to: '/admin/observability/aggregate', label: 'Observability', icon: BarChart3 },
  { to: '/admin/layer2-lab', label: 'Layer 2 Lab', icon: Beaker },
]

export function AppHeader() {
  const { profile, user, profileLoading } = useAuth()
  const avatarUrl = useProfileAvatarUrl(profile?.avatar_path, profile?.avatar_updated_at)
  const { t } = useTranslation()
  const location = useLocation()
  const isAdmin = profile?.role === 'admin'
  const { setProfileOpen, setRedeemOpen } = useDialogs()
  const [mobileOpen, setMobileOpen] = useState(false)

  const mainNav = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/decks', label: t('nav.decks'), icon: Library },
    { to: '/generate', label: t('nav.generate'), icon: Sparkles },
    { to: '/study', label: t('nav.study'), icon: BookOpen },
    { to: '/music', label: t('nav.music'), icon: Music },
    { to: '/speak', label: t('nav.speak'), icon: Mic },
  ]

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="app-topnav flex items-center px-4 md:px-6 py-2 gap-2 sticky top-0 z-40">
      {/* Mobile hamburger */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="p-4 flex items-center gap-2 border-b border-border">
              <Music className="h-5 w-5" />
              <span className="font-bold text-lg">Resonance</span>
            </div>
            <nav className="p-2 space-y-1">
              {mainNav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  data-tutorial-id={to === '/generate' ? 'dashboard.go_to_generate' : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                    location.pathname === to || location.pathname.startsWith(to + '/')
                      ? 'theme-chip-active'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <div className="my-2 border-t border-border" />
                  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Admin
                  </p>
                  {adminNav.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                        location.pathname === to || location.pathname.startsWith(to + '/')
                          ? 'theme-chip-active'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
        <Music className="h-5 w-5" />
        <span className="font-bold text-base sm:text-lg">Resonance</span>
      </Link>

      {/* Desktop nav — center */}
      <nav className="hidden md:flex items-center gap-1 mx-auto">
        {mainNav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            data-tutorial-id={to === '/generate' ? 'dashboard.go_to_generate' : undefined}
            className={cn(
              'flex min-w-[68px] flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              location.pathname === to || location.pathname.startsWith(to + '/')
                ? 'theme-chip-active'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}

        {/* Admin dropdown */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex min-w-[68px] flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  location.pathname.startsWith('/admin')
                    ? 'theme-chip-active'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                )}
              >
                <BarChart3 className="h-5 w-5" />
                Admin
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {adminNav.map(({ to, label, icon: Icon }) => (
                <DropdownMenuItem key={to} asChild>
                  <Link to={to} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

      {/* Right side: credits + profile */}
      <div className="flex items-center gap-2 ml-auto md:ml-0 shrink-0">
        {/* Credits */}
        <button
          onClick={() => setRedeemOpen(true)}
          className="flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-sm font-medium transition-colors"
        >
          <Coins className="h-4 w-4 text-primary" />
          <span>{typeof profile?.credits === 'number' ? profile.credits : profileLoading ? '...' : 0}</span>
        </button>

        {/* Profile button → opens modal */}
        <Button variant="ghost" className="flex min-h-11 items-center gap-2 px-2" onClick={() => setProfileOpen(true)}>
          <Avatar className="h-7 w-7">
            {avatarUrl && (
              <AvatarImage
                src={avatarUrl}
                alt=""
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="object-cover"
              />
            )}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm">{displayName}</span>
        </Button>
      </div>

    </header>
  )
}
