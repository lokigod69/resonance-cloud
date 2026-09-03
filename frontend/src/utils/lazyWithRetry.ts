import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RELOAD_FLAG_PREFIX = 'lazyWithRetry:reloaded:'
const RELOAD_TIMEOUT_MS = 10_000

function isDynamicImportFailure(error: unknown): boolean {
  if (!error) return false
  if (error instanceof Error) {
    const name = error.name
    const message = error.message ?? ''
    if (name === 'ChunkLoadError') return true
    if (message.includes('Failed to fetch dynamically imported module')) return true
    if (message.includes('error loading dynamically imported module')) return true
    if (message.includes('Importing a module script failed')) return true
    if (message.includes('Expected a JavaScript module script')) return true
    if (message.includes('Expected a JavaScript-or-Wasm module script')) return true
    // Vite's preload helper rejects with this when a route's CSS chunk is gone
    // after a deploy (audit 2026-09-03 F-03).
    if (message.includes('Unable to preload CSS')) return true
  }
  return false
}

// React.lazy's public generic is constrained to ComponentType<any>; keep the escape hatch here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  key: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const flag = `${RELOAD_FLAG_PREFIX}${key}`
    try {
      const mod = await factory()
      try {
        window.sessionStorage.removeItem(flag)
      } catch {
        // sessionStorage unavailable — fine, the reload guard is best-effort
      }
      return mod
    } catch (error) {
      if (!isDynamicImportFailure(error)) throw error
      let alreadyReloaded = false
      try {
        alreadyReloaded = window.sessionStorage.getItem(flag) === '1'
      } catch {
        alreadyReloaded = false
      }
      if (alreadyReloaded) throw error
      let flagWritten = false
      try {
        window.sessionStorage.setItem(flag, '1')
        flagWritten = true
      } catch {
        // Storage unavailable (e.g., Safari private mode) — cannot guard against a reload loop
      }
      if (!flagWritten) throw error
      window.location.reload()
      return new Promise<{ default: T }>((_resolve, reject) => {
        window.setTimeout(() => reject(error), RELOAD_TIMEOUT_MS)
      })
    }
  })
}
