import type { GuidedLesson } from '@/data/guidedLessons'
import { scenario } from './scenario'

type KeepCall = {
  lessonId: string
  pathId: string
  phrase: string
  preferredBaseLanguage: string | null | undefined
  deckName: string
}

type FixtureWindow = Window & {
  __keptPhrases?: KeepCall[]
  __keptPhraseRows?: Map<string, KeepCall>
}

export async function keepGuidedPhrase(
  lesson: GuidedLesson,
  preferredBaseLanguage: string | null | undefined,
  deckName: string,
) {
  const fixtureWindow = window as FixtureWindow
  const calls = (fixtureWindow.__keptPhrases ??= [])
  const call: KeepCall = {
    lessonId: lesson.id,
    pathId: lesson.pathId,
    phrase: lesson.corePhrase.targetText,
    preferredBaseLanguage,
    deckName,
  }
  calls.push(call)
  const rows = (fixtureWindow.__keptPhraseRows ??= new Map<string, KeepCall>())
  rows.set(`${lesson.id}:${lesson.vibeId}`, call)
  if (scenario().phraseKeep === 'lost-response-once' && calls.length === 1) {
    throw new Error('fixture simulates a committed row whose response was lost')
  }
  return { deckId: 'today-fixture-phrase-deck', wordId: `today-fixture-${lesson.id}`, inserted: true }
}
