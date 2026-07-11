import type { LucideIcon } from 'lucide-react'
import { CalendarDays, Camera, Home, Layers, Library, Mic } from 'lucide-react'
import { VISUAL_LENS_ENABLED } from '@/lib/productFlags'

export type PrimaryNavItem = {
  to: string
  label: string
  icon: LucideIcon
  activePaths?: readonly string[]
}

type Translate = (key: string) => string

// Home is the study entry (Word Tide + Dive in), so /study has no tab of its
// own; Media bundles the deck and music collections under one roof.
export function getPrimaryNavItems(t: Translate): PrimaryNavItem[] {
  const items: PrimaryNavItem[] = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: Home },
    { to: '/today', label: t('nav.today'), icon: CalendarDays },
    { to: '/decks', label: t('nav.media'), icon: Layers, activePaths: ['/deck', '/generate', '/music'] },
    { to: '/categories', label: t('nav.categories'), icon: Library },
  ]
  if (VISUAL_LENS_ENABLED) {
    items.push({ to: '/lens', label: t('nav.lens'), icon: Camera })
  }
  items.push({ to: '/speak', label: t('nav.speak'), icon: Mic })
  return items
}

export function isPrimaryNavItemActive(pathname: string, item: PrimaryNavItem) {
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true
  return item.activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ?? false
}
