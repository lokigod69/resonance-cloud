import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RELOAD_FLAG_PREFIX = 'lazyWithRetry:reloaded:'

function isDynamicImportFailure(error: unknown): boolean {
  if (!error) return false
  if (error instanceof Error) {
    const name = error.name
    const message = error.message ?? ''
    if (name === 'ChunkLoadError') return true
    if (message.includes('Failed to fetch dynamically imported module')) return true
    if (message.includes('error loading dynamically imported module')) return true
    if (message.includes('Importing a module script failed')) return true
    if (message.includes('Expected a JavaScript-or-Wasm module script')) return true
  }
  return false
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
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
      try {
        window.sessionStorage.setItem(flag, '1')
      } catch {
        // ignore
      }
      window.location.reload()
      return new Promise<{ default: T }>(() => undefined)
    }
  })
}
