import { createContext, useContext } from 'react'

export interface LanguageContextValue {
  activeLanguage: string | null
  setActiveLanguage: (lang: string | null) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
