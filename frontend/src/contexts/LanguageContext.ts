import { createContext, useContext } from 'react'

export interface LanguageContextValue {
  activeLanguage: string | null
  setActiveLanguage: (lang: string | null) => void
  /** False until the active language has finished resolving (localStorage read +
   *  any deck-seed query). Lets consumers show a loader instead of flashing a
   *  picker that then auto-advances. */
  languageReady: boolean
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
