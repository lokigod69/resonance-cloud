import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LanguageContext } from './LanguageContext'

const LEGACY_STORAGE_KEY = 'resonance_active_language'
const storageKeyFor = (userId: string | null | undefined) =>
  userId ? `resonance_active_language_${userId}` : null

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [activeLanguage, setActiveLanguageState] = useState<string | null>(null)
  const [languageReady, setLanguageReady] = useState(false)

  // When user id changes (login / switch user), load that user's scoped language
  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external system sync (localStorage scoped per userId); userId is async-loaded so lazy init is not viable
      setActiveLanguageState(null)
      // No user yet — nothing resolved. Consumers that need a user (e.g. the
      // generate flow) keep showing their loader until auth + language settle.
      setLanguageReady(false)
      return
    }
    setLanguageReady(false)
    // One-time migration: clear the old unscoped key
    localStorage.removeItem(LEGACY_STORAGE_KEY)

    const key = storageKeyFor(userId)!
    const stored = localStorage.getItem(key)
    if (stored) {
      setActiveLanguageState(stored)
      setLanguageReady(true)
      return
    }

    // No value stored for this user — seed from their most recent deck
    let cancelled = false
    supabase
      .from('decks')
      .select('target_language')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return
        const lang = data?.[0]?.target_language ?? null
        if (lang) {
          localStorage.setItem(key, lang)
          setActiveLanguageState(lang)
        }
        setLanguageReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const setActiveLanguage = useCallback((lang: string | null) => {
    setActiveLanguageState(lang)
    const key = storageKeyFor(userId)
    if (!key) return
    if (lang) {
      localStorage.setItem(key, lang)
    } else {
      localStorage.removeItem(key)
    }
  }, [userId])

  const value = useMemo(
    () => ({ activeLanguage, setActiveLanguage, languageReady }),
    [activeLanguage, setActiveLanguage, languageReady]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
