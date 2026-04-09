import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

interface LanguageContextValue {
  activeLanguage: string | null
  setActiveLanguage: (lang: string | null) => void
}

const LEGACY_STORAGE_KEY = 'resonance_active_language'
const storageKeyFor = (userId: string | null | undefined) =>
  userId ? `resonance_active_language_${userId}` : null

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeLanguage, setActiveLanguageState] = useState<string | null>(null)

  // When user id changes (login / switch user), load that user's scoped language
  useEffect(() => {
    if (!user) {
      setActiveLanguageState(null)
      return
    }
    // One-time migration: clear the old unscoped key
    localStorage.removeItem(LEGACY_STORAGE_KEY)

    const key = storageKeyFor(user.id)!
    const stored = localStorage.getItem(key)
    if (stored) {
      setActiveLanguageState(stored)
      return
    }

    // No value stored for this user — seed from their most recent deck
    let cancelled = false
    supabase
      .from('decks')
      .select('target_language')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return
        const lang = data?.[0]?.target_language ?? null
        if (lang) {
          localStorage.setItem(key, lang)
          setActiveLanguageState(lang)
        }
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const setActiveLanguage = (lang: string | null) => {
    setActiveLanguageState(lang)
    const key = storageKeyFor(user?.id)
    if (!key) return
    if (lang) {
      localStorage.setItem(key, lang)
    } else {
      localStorage.removeItem(key)
    }
  }

  return (
    <LanguageContext.Provider value={{ activeLanguage, setActiveLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
