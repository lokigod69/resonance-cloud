import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { syncTargetLanguageStores } from '@/lib/targetLanguage'
import { LanguageContext } from './LanguageContext'

const LEGACY_STORAGE_KEY = 'resonance_active_language'
const storageKeyFor = (userId: string | null | undefined) =>
  userId ? `resonance_active_language_${userId}` : null

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const userId = user?.id ?? null
  // The durable cross-device choice from onboarding. undefined while the profile
  // loads or before migration 20260727090000 exists; both read as "not there".
  const profileTargetLanguage = profile?.target_language?.trim() || null
  const [activeLanguage, setActiveLanguageState] = useState<string | null>(null)
  const [languageReady, setLanguageReady] = useState(false)

  // When user id changes (login / switch user), load that user's scoped language.
  // Re-runs when the profile's target_language arrives, so a fresh device (empty
  // localStorage) hydrates from the server-side choice instead of ignoring it.
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
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch { /* storage unavailable — resolution below degrades gracefully */ }

    const key = storageKeyFor(userId)!
    let stored: string | null = null
    try {
      stored = localStorage.getItem(key)
    } catch { /* treated as no stored value */ }
    if (stored) {
      setActiveLanguageState(stored)
      setLanguageReady(true)
      return
    }

    // Nothing on this device — the profile's target_language is the durable
    // choice (onboarding wrote it). It outranks the newest-deck guess.
    if (profileTargetLanguage) {
      try {
        localStorage.setItem(key, profileTargetLanguage)
      } catch { /* in-memory state still works for this session */ }
      setActiveLanguageState(profileTargetLanguage)
      syncTargetLanguageStores(userId, profileTargetLanguage)
      setLanguageReady(true)
      return
    }

    // Last resort — seed from their most recent deck
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
          try {
            localStorage.setItem(key, lang)
          } catch { /* in-memory state still works for this session */ }
          setActiveLanguageState(lang)
          // Deck-seeded language counts as the canonical choice too — Today and
          // the Library must agree with it, same as an explicit pick.
          syncTargetLanguageStores(userId, lang)
        }
        setLanguageReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [userId, profileTargetLanguage])

  const setActiveLanguage = useCallback((lang: string | null) => {
    setActiveLanguageState(lang)
    const key = storageKeyFor(userId)
    if (!key) return
    try {
      if (lang) {
        localStorage.setItem(key, lang)
        // Every picker in the app funnels through here — fan the choice out so
        // Today (guided key) and the Library (static key) follow the same language.
        // Clearing (lang === null, e.g. legacy resets) deliberately leaves the
        // other stores untouched: a wipe is not a choice.
        syncTargetLanguageStores(userId, lang)
      } else {
        localStorage.removeItem(key)
      }
    } catch {
      // Storage full/unavailable: the in-memory state above still drives this
      // session; persistence resumes on the next successful write.
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
