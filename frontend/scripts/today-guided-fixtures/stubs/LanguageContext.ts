import { useState } from 'react'
import { scenario } from './scenario'

export function useLanguage() {
  const [activeLanguage, setActiveLanguage] = useState(scenario().activeLanguage ?? 'English')
  return { activeLanguage, setActiveLanguage, languageReady: true }
}
