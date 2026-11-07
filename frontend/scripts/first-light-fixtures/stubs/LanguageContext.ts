import { scenario } from './scenario'

export function useLanguage() {
  return { activeLanguage: scenario().activeLanguage ?? 'German', setActiveLanguage() {}, languageReady: true }
}
