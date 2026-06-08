import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfileAvatarUrl } from '@/hooks/useProfileAvatarUrl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Coins,
  ListOrdered,
  Languages,
  Users,
  FileText,
  BarChart3,
  Mic,
  Beaker,
  Images,
} from 'lucide-react'
import { useDialogs } from '@/contexts/DialogContext'
import { useTranslation } from '@/hooks/useTranslation'
import { MobileBottomNav } from './MobileBottomNav'
import { getPrimaryNavItems, isPrimaryNavItemActive } from './primaryNav'

const adminNav = [
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/queue', label: 'Job Queue', icon: ListOrdered },
  { to: '/admin/profiles', label: 'Profiles', icon: Languages },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/voices', label: 'Voices', icon: Mic },
  { to: '/admin/metrics', label: 'Metrics', icon: BarChart3 },
  { to: '/admin/observability/aggregate', label: 'Observability', icon: BarChart3 },
  { to: '/admin/layer2-lab', label: 'Layer 2 Lab', icon: Beaker },
  { to: '/admin/curriculum', label: 'Curriculum Images', icon: Images },
]

export function AppHeader() {
  const { profile, user, profileLoading } = useAuth()
  const avatarUrl = useProfileAvatarUrl(profile?.avatar_path, profile?.avatar_updated_at)
  const { t } = useTranslation()
  const location = useLocation()
  const isAdmin = profile?.role === 'admin'
  const { setProfileOpen, setRedeemOpen } = useDialogs()
  const mainNav = getPrimaryNavItems(t)

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <header className="app-topnav hidden md:flex fixed top-0 left-0 right-0 min-h-[var(--glassy-header-offset)] items-center px-4 md:px-6 pt-[calc(var(--app-safe-top)+0.5rem)] pb-2 gap-2 z-50 !backdrop-blur-3xl !backdrop-saturate-150 !bg-black/40">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="Lingwave dashboard">
          <LingwaveBrand markClassName="h-6" wordmarkClassName="h-5 sm:h-6" />
        </Link>

      {/* Desktop nav — center */}
      <nav className="hidden md:flex items-center gap-1 mx-auto">
        {mainNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex min-w-[60px] flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors lg:min-w-[68px] lg:px-4',
              isPrimaryNavItemActive(location.pathname, item)
                ? 'theme-chip-active'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}

        {/* Admin dropdown */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex min-w-[60px] flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors lg:min-w-[68px] lg:px-4',
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
      <MobileBottomNav />
    </>
  )
}
