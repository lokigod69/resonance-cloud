import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { getPrimaryNavItems, isPrimaryNavItemActive } from './primaryNav'

export function MobileBottomNav() {
  const location = useLocation()
  const { t } = useTranslation()
  const navItems = getPrimaryNavItems(t)

  return (
    <nav
      aria-label="Primary navigation"
      className="app-bottomnav fixed inset-x-0 bottom-0 z-50 md:hidden px-1 pt-1 pb-[var(--app-safe-bottom)] !backdrop-blur-3xl !backdrop-saturate-150 !bg-black/40"
    >
      <div className="mx-auto grid h-[var(--mobile-bottom-nav-height)] max-w-md grid-cols-6 gap-0.5">
        {navItems.map((item) => {
          const active = isPrimaryNavItemActive(location.pathname, item)
          const Icon = item.icon

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] font-semibold leading-none transition-colors',
                active
                  ? 'theme-chip-active'
                  : 'text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
