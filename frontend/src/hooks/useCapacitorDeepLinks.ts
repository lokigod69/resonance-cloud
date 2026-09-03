import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { NavigateFunction } from 'react-router-dom'
import { isNativeApp } from '@/lib/platform'
import { getOAuthRedirectTo } from '@/lib/publicOrigins'
import { supabase } from '@/lib/supabase'

// resonanz.pro dropped 2026-09-03: the domain is dead and must not stay a
// trusted deep-link host.
const WEB_DEEP_LINK_HOSTS = new Set([
  'lingwave.ai',
  'www.lingwave.ai',
])

// Capacitor's getLaunchUrl() returns the LAST url opened for the whole process
// lifetime, not a one-shot launch value. Handle it exactly once per process or
// every re-run would replay it (audit 2026-09-03 F-02).
let launchUrlHandled = false
// A cold start can deliver the same OAuth callback through both appUrlOpen and
// getLaunchUrl; a PKCE code may only be exchanged once.
const inFlightExchanges = new Map<string, Promise<{ error: unknown }>>()

function routeFromUrl(rawUrl: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if ((url.protocol === 'https:' || url.protocol === 'http:') && WEB_DEEP_LINK_HOSTS.has(url.hostname)) {
    if (url.pathname.startsWith('/v/') || url.pathname.startsWith('/share/')) {
      return `${url.pathname}${url.search}${url.hash}`
    }
    return null
  }

  if (url.protocol === 'resonance:') {
    const schemePath = `/${url.host}${url.pathname}`
    if (schemePath.startsWith('/v/') || schemePath.startsWith('/share/')) {
      return `${schemePath}${url.search}${url.hash}`
    }
  }

  return null
}

function isNativeAuthCallbackUrl(url: URL): boolean {
  let expected: URL
  try {
    expected = new URL(getOAuthRedirectTo())
  } catch {
    return false
  }

  return url.protocol === expected.protocol
    && url.host === expected.host
    && url.pathname === expected.pathname
}

function exchangeCodeOnce(code: string): Promise<{ error: unknown }> {
  const existing = inFlightExchanges.get(code)
  if (existing) return existing
  const exchange = supabase.auth.exchangeCodeForSession(code)
    .then(({ error }) => ({ error }))
    .finally(() => {
      // Keep the entry: a consumed code must never be exchanged again.
    })
  inFlightExchanges.set(code, exchange)
  return exchange
}

async function handleAppUrlOpen(rawUrl: string, navigate: NavigateFunction): Promise<void> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return
  }

  if (isNativeAuthCallbackUrl(url)) {
    const code = url.searchParams.get('code')
    const oauthError = url.searchParams.get('error') ?? url.searchParams.get('error_code')
    if (!code || oauthError) {
      await Browser.close().catch(() => {})
      navigate('/login', { replace: true })
      return
    }

    const { error } = await exchangeCodeOnce(code)
    await Browser.close().catch(() => {})
    navigate(error ? '/login' : '/dashboard', { replace: true })
    return
  }

  const route = routeFromUrl(rawUrl)
  if (route) {
    navigate(route, { replace: true })
  }
}

export function useCapacitorDeepLinks(navigate: NavigateFunction): void {
  // react-router recreates `navigate` on every pathname change; read it through
  // a ref so the listener is registered once instead of per navigation.
  const navigateRef = useRef(navigate)
  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  useEffect(() => {
    if (!isNativeApp()) return

    let removeListener: (() => void) | null = null
    let active = true
    const handle = (url: string) => {
      void handleAppUrlOpen(url, navigateRef.current)
    }

    void App.addListener('appUrlOpen', (event) => {
      handle(event.url)
    }).then((listener) => {
      if (!active) {
        void listener.remove()
        return
      }
      removeListener = () => {
        void listener.remove()
      }
    })

    if (!launchUrlHandled) {
      launchUrlHandled = true
      void App.getLaunchUrl().then((launchUrl) => {
        if (launchUrl?.url) {
          handle(launchUrl.url)
        }
      })
    }

    return () => {
      active = false
      removeListener?.()
    }
  }, [])
}
