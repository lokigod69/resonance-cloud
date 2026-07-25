/* eslint-disable */
// Shared lazy accessor for the per-fixture scenario. Every stub reads through
// this at CALL time (never at module-eval time), so main.tsx can set
// window.__scenario after the static import graph has already evaluated.

export type WordRow = {
  lemma_key: string
  display_word: string
  translation: string | null
  word_ids: string[] | null
  deck_ids: string[] | null
  state: 'new' | 'learning' | 'reviewing' | 'mastered'
  due: boolean
  next_due_at: string | null
  consecutive_correct: number | null
  total_attempts: number | null
  last_attempt_at: string | null
  last_knew_it: boolean | null
}

export type GuidedLessonStub = {
  id: string
  lessonNumber: number
  title: string
  baseLanguage: string
  corePhrase: { targetText: string }
  estimatedMinutes: number
}

export type GuidedPathStub = {
  id: string
  shortTitle: string
  targetLanguage: string
  lessons: GuidedLessonStub[]
}

export type Scenario = {
  userId?: string
  baseLanguage?: string
  /** compute_word_states behaviour. */
  rpc?: 'ok' | 'error' | 'never'
  rpcDelayMs?: number
  words?: WordRow[]
  wordsByLanguage?: Record<string, WordRow[]>
  /** recall_attempts insert: false = always OK, true = always fails, n = fail first n. */
  insertFails?: boolean | number
  speakRows?: unknown[]
  guidedPaths?: GuidedPathStub[]
  /** Pins which lesson getGuidedPathOverview recommends (else first incomplete). */
  recommendedLessonId?: string
  /** Delays resolution of the dynamic import('@/data/guidedLessons'). */
  guidedDelayMs?: number
}

export function scenario(): Scenario {
  return ((window as any).__scenario ?? {}) as Scenario
}

export function record(kind: string, payload: unknown) {
  const w = window as any
  if (!w.__calls) w.__calls = []
  w.__calls.push({ kind, payload, at: Date.now() })
}
