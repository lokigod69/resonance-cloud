import { isNativeApp } from '@/lib/platform'

const DEFAULT_PUBLIC_WEB_ORIGIN = 'https://resonanz.pro'
const DEFAULT_NATIVE_AUTH_REDIRECT_URL = 'resonance://auth/callback'

function trimTrailingSlash(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.replace(/\/+$/, '')
}

function getWindowOrigin(): string | null {
  if (typeof window === 'undefined') return null
  const origin = window.location.origin
  return origin && origin !== 'null' ? origin : null
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

export function getPublicWebOrigin(): string {
  const configured = trimTrailingSlash(import.meta.env.VITE_PUBLIC_WEB_ORIGIN)
  if (configured) return configured
  if (!isNativeApp()) return getWindowOrigin() ?? DEFAULT_PUBLIC_WEB_ORIGIN
  return DEFAULT_PUBLIC_WEB_ORIGIN
}

export function getPublicApiOrigin(): string {
  return trimTrailingSlash(import.meta.env.VITE_PUBLIC_API_ORIGIN) ?? getPublicWebOrigin()
}

export function publicApiUrl(path: string): string {
  const normalizedPath = normalizePath(path)
  if (!isNativeApp()) return normalizedPath
  return `${getPublicApiOrigin()}${normalizedPath}`
}

export function getPublicWebUrl(path: string): string {
  return `${getPublicWebOrigin()}${normalizePath(path)}`
}

export function getOAuthRedirectTo(): string {
  if (isNativeApp()) {
    return trimTrailingSlash(import.meta.env.VITE_NATIVE_AUTH_REDIRECT_URL)
      ?? DEFAULT_NATIVE_AUTH_REDIRECT_URL
  }
  return `${getWindowOrigin() ?? getPublicWebOrigin()}/dashboard`
}
