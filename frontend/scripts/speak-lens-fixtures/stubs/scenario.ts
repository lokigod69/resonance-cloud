export type FixtureScenario = {
  kind: 'speak' | 'lens'
  locale: 'en' | 'de' | 'fr'
  baseLanguage: 'English' | 'German' | 'French'
  activeLanguage: string
  languageReady?: boolean
  speakListenMode?: boolean
  lensResult?: 'high' | 'low' | 'safety' | 'error' | 'stale'
  lensSaveResult?: 'all-inserted' | 'mixed'
  lensExistingWords?: Record<string, string[]>
  lensHintDelayMs?: Record<string, number>
}

export function scenario(): FixtureScenario {
  return (window as unknown as { __scenario: FixtureScenario }).__scenario
}
