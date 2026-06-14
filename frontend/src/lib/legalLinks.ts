import { Browser } from '@capacitor/browser'
import { getPublicWebUrl } from '@/lib/publicOrigins'
import { isNativeApp } from '@/lib/platform'

export const LEGAL_LINKS = [
  { href: '/privacy', labelKey: 'legal.privacy' },
  { href: '/terms', labelKey: 'legal.terms' },
  { href: '/cookies', labelKey: 'legal.cookies' },
  { href: '/contact', labelKey: 'legal.contact' },
  { href: '/support', labelKey: 'legal.support' },
] as const

export type LegalLinkPath = typeof LEGAL_LINKS[number]['href']

type PreventableEvent = {
  preventDefault: () => void
}

export function handleLegalLinkClick(event: PreventableEvent, path: LegalLinkPath): void {
  if (!isNativeApp()) return

  event.preventDefault()
  void Browser.open({ url: getPublicWebUrl(path) }).catch((error) => {
    console.error('[legal] Could not open legal link', { path, error })
  })
}
