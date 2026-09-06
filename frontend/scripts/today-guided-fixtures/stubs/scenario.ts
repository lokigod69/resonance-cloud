export type TodayFixtureScenario = {
  route: string
  baseLanguage?: 'English' | 'German' | 'French'
  activeLanguage?: string
  speech?: 'unsupported' | 'error'
  phraseKeep?: 'success' | 'lost-response-once'
}

export function scenario(): TodayFixtureScenario {
  return (window as unknown as { __scenario: TodayFixtureScenario }).__scenario
}
