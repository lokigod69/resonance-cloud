import { useState } from 'react'
import { scenario } from './scenario'

export function useLanguage() {
  const [activeLanguage, setActiveLanguage] = useState(scenario().activeLanguage)
  return { activeLanguage, setActiveLanguage, availableLanguages: ['German', 'French', 'Indonesian'], languageReady: scenario().languageReady ?? true }
}
