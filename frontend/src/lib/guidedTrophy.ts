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
}

export function guidedTrophyClozeKey(
  pathId: string,
  vibe: ActiveGuidedVibeId,
  segment: GuidedSegmentReviewNumber,
) {
  return `guided_trophy_cloze_${pathId}_${vibe}_${segment}`
}

export function readGuidedTrophyClozeRecord(
  pathId: string,
  vibe: ActiveGuidedVibeId,
  segment: GuidedSegmentReviewNumber,
): GuidedTrophyClozeRecord | undefined {
  if (!canUseLocalStorage()) return undefined

  try {
    const raw = window.localStorage.getItem(guidedTrophyClozeKey(pathId, vibe, segment))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as GuidedTrophyClozeRecord
    if (!isGuidedTrophyClozeRecord(parsed, pathId, vibe, segment)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function writeGuidedTrophyClozeRecord(
  record: GuidedTrophyClozeRecord,
): GuidedTrophyClozeRecord {
  if (!canUseLocalStorage()) return record

  try {
    window.localStorage.setItem(
      guidedTrophyClozeKey(record.pathId, record.vibe, record.segment),
      JSON.stringify(record),
    )
  } catch {
    return record
  }

  return record
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
    items: items.map((item) => ({
      lineIndex: item.lineIndex,
      word: item.word,
      attempts: item.attempts,
      firstTryCorrect: item.firstTryCorrect,
      correct: item.correct,
    })),
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
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}
