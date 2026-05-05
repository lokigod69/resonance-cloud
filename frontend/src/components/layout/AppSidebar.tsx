import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Users,
  FileText,
  BarChart3,
  Music,
  ListOrdered,
  Languages,
  Mic,
  DollarSign,
  ShieldCheck,
  Beaker,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { useState } from 'react'

const mainNav = [
  { to: '/dashboard', label: 'Decks', icon: LayoutDashboard },
  { to: '/generate', label: 'Generate', icon: Sparkles },
  { to: '/study', label: 'Study', icon: BookOpen },
]

const adminNav = [
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/queue', label: 'Job Queue', icon: ListOrdered },
  { to: '/admin/profiles', label: 'Profiles', icon: Languages },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/voices', label: 'Voices', icon: Mic },
  { to: '/admin/metrics', label: 'Metrics', icon: BarChart3 },
  { to: '/admin/quotas', label: 'Quotas', icon: ShieldCheck },
  { to: '/admin/costs', label: 'Costs', icon: DollarSign },
  { to: '/admin/layer2-lab', label: 'Layer 2 Lab', icon: Beaker },
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-2">
        <Music className="h-6 w-6" />
        <span className="font-bold text-lg">Resonance</span>
      </div>
      <Separator />
      <nav className="flex-1 p-2 space-y-1">
        {mainNav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === to || location.pathname.startsWith(to + '/')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <Separator className="my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </p>
            {adminNav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === to || location.pathname.startsWith(to + '/')
                    ? 'bg-accent text-accent-foreground'
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
    </div>
  )
}

export function AppSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <NavContent />
      </aside>

      {/* Mobile sidebar */}
      <div className="md:hidden fixed top-0 left-0 z-40 p-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <NavContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
