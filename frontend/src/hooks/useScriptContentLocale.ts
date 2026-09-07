import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { Locale } from '@/lib/translations'
import {
  getLoadedScriptContent,
  getScriptContentStatus,
  isScriptContentLocale,
  loadScriptContent,
  retryScriptContent,
  subscribeScriptContent,
} from '@/lib/scriptlab/contentLocales'

export function useScriptContentLocale(locale: Locale) {
  const messages = useSyncExternalStore(
    subscribeScriptContent,
    () => getLoadedScriptContent(locale),
    () => undefined,
  )
  const status = useSyncExternalStore(
    subscribeScriptContent,
    () => getScriptContentStatus(locale),
    () => 'ready' as const,
  )
  const required = isScriptContentLocale(locale)

  useEffect(() => {
    if (!isScriptContentLocale(locale) || getLoadedScriptContent(locale)) return
    void loadScriptContent(locale).catch(() => undefined)
  }, [locale])

  const retry = useCallback(() => retryScriptContent(locale), [locale])

  return {
    messages,
    ready: !required || messages !== undefined,
    failed: status === 'error',
    retry,
  }
}
