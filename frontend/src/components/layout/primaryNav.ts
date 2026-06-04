import type { LucideIcon } from 'lucide-react'
import { BookOpen, CalendarDays, Home, Library, Mic, Music } from 'lucide-react'

export type PrimaryNavItem = {
  to: string
  label: string
  icon: LucideIcon
  activePaths?: readonly string[]
}

type Translate = (key: string) => string

export function getPrimaryNavItems(t: Translate): PrimaryNavItem[] {
  return [
    { to: '/dashboard', label: t('nav.dashboard'), icon: Home },
    { to: '/today', label: t('nav.today'), icon: CalendarDays },
    { to: '/decks', label: t('nav.decks'), icon: Library, activePaths: ['/deck'] },
    { to: '/study', label: t('nav.study'), icon: BookOpen },
    { to: '/music', label: t('nav.music'), icon: Music },
    { to: '/speak', label: t('nav.speak'), icon: Mic },
  ]
}

export function isPrimaryNavItemActive(pathname: string, item: PrimaryNavItem) {
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true
  return item.activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ?? false
}
