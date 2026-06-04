import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { NavigateFunction } from 'react-router-dom'
import { isNativeApp } from '@/lib/platform'
import { getOAuthRedirectTo } from '@/lib/publicOrigins'
import { supabase } from '@/lib/supabase'

const WEB_DEEP_LINK_HOSTS = new Set(['resonanz.pro', 'www.resonanz.pro'])

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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
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
  useEffect(() => {
    if (!isNativeApp()) return

    let removeListener: (() => void) | null = null
    let active = true

    void App.addListener('appUrlOpen', (event) => {
      void handleAppUrlOpen(event.url, navigate)
    }).then((listener) => {
      if (!active) {
        void listener.remove()
        return
      }
      removeListener = () => {
        void listener.remove()
      }
    })

    void App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        void handleAppUrlOpen(launchUrl.url, navigate)
      }
    })

    return () => {
      active = false
      removeListener?.()
    }
  }, [navigate])
}
