import { Link, useLocation } from 'react-router-dom'
import { Layers, Music } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

// The Media tab bundles the deck and music collections; this switch sits at the
// top of both surfaces so they read as two rooms of the same place.
export function MediaSegments({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const segments = [
    { to: '/decks', label: t('nav.decks'), icon: Layers, active: pathname !== '/music' },
    { to: '/music', label: t('nav.music'), icon: Music, active: pathname === '/music' },
  ]

  return (
    // First element on its pages — pad past the notch under viewport-fit=cover.
    <div className={cn('flex w-full justify-center pt-[max(0.25rem,var(--app-safe-top))]', className)}>
      <nav
        aria-label={t('nav.media')}
        className="inline-flex gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] p-1 backdrop-blur-md"
      >
        {segments.map(({ to, label, icon: Icon, active }) => (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
              active
                ? 'theme-chip-active'
                : 'text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
