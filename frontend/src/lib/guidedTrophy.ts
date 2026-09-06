import {
  getGuidedPathLessons,
  resolveGuidedLessonVariant,
  type GuidedLessonTrophyWord,
} from '@/data/guidedLessons'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'

export type GuidedTrophyClozeItem = {
  lineIndex: number
  word: string
  attempts: number
  firstTryCorrect: boolean
  correct: boolean
}

export type GuidedTrophyClozeRecord = {
  completedAt: string
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibe: ActiveGuidedVibeId
  linesAttempted: number
  wordsAttempted: number
  correctCount: number
  items: GuidedTrophyClozeItem[]
  completionKind?: 'cloze' | 'word-review'
}

export type GuidedTrophyScope = {
  userId: string
  pathId: string
  vibe: ActiveGuidedVibeId
  segment: GuidedSegmentReviewNumber
}

export type GuidedTrophyWriteResult = {
  record: GuidedTrophyClozeRecord
  saved: boolean
  alreadyCompleted: boolean
}

export function guidedTrophyClozeKey(
  scope: GuidedTrophyScope,
) {
  return `guided_trophy_cloze_v2_${encodeURIComponent(scope.userId)}_${encodeURIComponent(scope.pathId)}_${scope.vibe}_${scope.segment}`
}

export function readGuidedTrophyClozeRecord(
  scope: GuidedTrophyScope,
): GuidedTrophyClozeRecord | undefined {
  if (!scope.userId || !canUseLocalStorage()) return undefined

  try {
    const raw = window.localStorage.getItem(guidedTrophyClozeKey(scope))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as GuidedTrophyClozeRecord
    if (!isGuidedTrophyClozeRecord(parsed, scope.pathId, scope.vibe, scope.segment)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function writeGuidedTrophyClozeRecord(
  userId: string | undefined,
  record: GuidedTrophyClozeRecord,
): GuidedTrophyWriteResult {
  if (!userId || !canUseLocalStorage()) return { record, saved: false, alreadyCompleted: false }

  const scope: GuidedTrophyScope = {
    userId,
    pathId: record.pathId,
    vibe: record.vibe,
    segment: record.segment,
  }

  try {
    const existing = readGuidedTrophyClozeRecord(scope)
    if (existing) return { record: existing, saved: true, alreadyCompleted: true }
    window.localStorage.setItem(
      guidedTrophyClozeKey(scope),
      JSON.stringify(record),
    )
  } catch {
    return { record, saved: false, alreadyCompleted: false }
  }

  return { record, saved: true, alreadyCompleted: false }
}

export function createGuidedTrophyClozeRecord(
  pathId: string,
  vibe: ActiveGuidedVibeId,
  segment: GuidedSegmentReviewNumber,
  items: GuidedTrophyClozeItem[],
  completedAt: Date = new Date(),
): GuidedTrophyClozeRecord {
  return {
    completedAt: completedAt.toISOString(),
    pathId,
    segment,
    vibe,
    linesAttempted: items.length,
    wordsAttempted: items.length,
    correctCount: items.filter((item) => item.correct).length,
    completionKind: 'cloze',
    items: items.map((item) => ({
      lineIndex: item.lineIndex,
      word: item.word,
      attempts: item.attempts,
      firstTryCorrect: item.firstTryCorrect,
      correct: item.correct,
    })),
  }
}

export function isGuidedTrophyClozeComplete(
  items: Array<Pick<GuidedTrophyClozeItem, 'correct'>>,
  expectedCount: number,
) {
  return expectedCount > 0 && items.length === expectedCount && items.every((item) => item.correct)
}

export function createGuidedTrophyWordReviewRecord(
  pathId: string,
  vibe: ActiveGuidedVibeId,
  segment: GuidedSegmentReviewNumber,
  completedAt: Date = new Date(),
): GuidedTrophyClozeRecord {
  return {
    completedAt: completedAt.toISOString(),
    pathId,
    segment,
    vibe,
    linesAttempted: 0,
    wordsAttempted: 0,
    correctCount: 0,
    items: [],
    completionKind: 'word-review',
  }
}

export function getGuidedTrophyWordsForSegment(
  pathId: string,
  segment: GuidedSegmentReviewNumber,
  vibe: ActiveGuidedVibeId,
): GuidedLessonTrophyWord[] {
  return getGuidedPathLessons(pathId)
    .filter((lesson) => (
      segment === 1
        ? lesson.lessonNumber >= 1 && lesson.lessonNumber <= 5
        : lesson.lessonNumber >= 6 && lesson.lessonNumber <= 10
    ))
    .map((lesson) => resolveGuidedLessonVariant(lesson, vibe).trophyWord)
}

export function getTrophyClozeAcceptedAnswers(word: string) {
  const original = word.trim()
  const lower = original.toLowerCase()
  const stripped = stripAnswerPunctuation(original)
  const strippedLower = stripped.toLowerCase()
  return uniqueNonEmpty([original, lower, stripped, strippedLower])
}

function stripAnswerPunctuation(value: string) {
  return value.replace(/[.,!?;:'"()[\]{}]/g, '').trim()
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function isGuidedTrophyClozeRecord(
  value: GuidedTrophyClozeRecord,
  pathId: string,
  vibe: ActiveGuidedVibeId,
  segment: GuidedSegmentReviewNumber,
): value is GuidedTrophyClozeRecord {
  return typeof value.completedAt === 'string'
    && value.pathId === pathId
    && value.vibe === vibe
    && value.segment === segment
    && typeof value.linesAttempted === 'number'
    && typeof value.wordsAttempted === 'number'
    && typeof value.correctCount === 'number'
    && (value.completionKind === undefined || value.completionKind === 'cloze' || value.completionKind === 'word-review')
    && Array.isArray(value.items)
    && value.items.every((item) => (
      typeof item.lineIndex === 'number'
      && typeof item.word === 'string'
      && typeof item.attempts === 'number'
      && typeof item.firstTryCorrect === 'boolean'
      && typeof item.correct === 'boolean'
    ))
}

function canUseLocalStorage() {
  if (typeof window === 'undefined') return false
  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}
