import type { LazyLocale, Locale } from '@/lib/translations'
import type { LocalizedText } from './types'

export type ScriptContentMessages = Readonly<Record<string, string>>

const loaders: Record<LazyLocale, () => Promise<{ default: ScriptContentMessages }>> = {
  es: () => import('./locales/es'),
  it: () => import('./locales/it'),
  pt: () => import('./locales/pt'),
  id: () => import('./locales/id'),
  pl: () => import('./locales/pl'),
  ru: () => import('./locales/ru'),
  ko: () => import('./locales/ko'),
  ja: () => import('./locales/ja'),
  ceb: () => import('./locales/ceb'),
}

const loaded: Partial<Record<LazyLocale, ScriptContentMessages>> = {}
const requests: Partial<Record<LazyLocale, Promise<ScriptContentMessages>>> = {}
const statuses: Partial<Record<LazyLocale, 'idle' | 'loading' | 'ready' | 'error'>> = {}
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeScriptContent(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function isScriptContentLocale(locale: Locale): locale is LazyLocale {
  return locale !== 'en' && locale !== 'de' && locale !== 'fr'
}

/** Stable, synchronous identity for an authored EN/DE/FR content tuple. */
export function scriptContentKey(text: LocalizedText): string {
  const source = `${text.en}\u001f${text.de}\u001f${text.fr}`
  let hash = 0x811c9dc5
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `v1_${(hash >>> 0).toString(16).padStart(8, '0')}_${source.length}`
}

export function getLoadedScriptContent(locale: Locale): ScriptContentMessages | undefined {
  return isScriptContentLocale(locale) ? loaded[locale] : undefined
}

export function getScriptContentStatus(locale: Locale) {
  return isScriptContentLocale(locale) ? statuses[locale] ?? 'idle' : 'ready'
}

export async function loadScriptContent(locale: Locale): Promise<ScriptContentMessages | undefined> {
  if (!isScriptContentLocale(locale)) return undefined
  if (loaded[locale]) return loaded[locale]
  if (requests[locale]) return requests[locale]

  statuses[locale] = 'loading'
  notify()
  const request = loaders[locale]().then(({ default: messages }) => {
    loaded[locale] = messages
    statuses[locale] = 'ready'
    delete requests[locale]
    notify()
    return messages
  }, (error: unknown) => {
    statuses[locale] = 'error'
    delete requests[locale]
    notify()
    throw error
  })
  requests[locale] = request
  return request
}

export function retryScriptContent(locale: Locale) {
  if (isScriptContentLocale(locale)) {
    statuses[locale] = 'idle'
    notify()
  }
  return loadScriptContent(locale)
}
