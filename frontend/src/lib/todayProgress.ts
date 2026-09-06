import type { GuidedLesson } from '@/data/guidedLessons'
import { ACTIVE_GUIDED_VIBE_IDS, type ActiveGuidedVibeId } from '@/data/guidedVibes'

export type TodayLessonStatus = 'completed' | 'skipped'

export type TodayLessonResult = {
  buildAttempts: number
  buildUsedFallback?: boolean
  typeAttempts: number
  typePassed?: boolean
  typeUsedFallback?: boolean
  speakAttempts?: number
  speakTranscriptMatch?: number
  speakPassed?: boolean
  knownMarkedCount?: number
  reviewCorrect?: number
  reviewTotal?: number
  knownItemCount?: number
  /** B1 sessions only: complication-cloze and role-play stats (the shared fields above already carry their summed equivalents) */
  clozeBlanksTotal?: number
  clozeBlanksFirstTry?: number
  rolePlayTurnsPassed?: number
}

export type TodayCompletionSummary = {
  key: 'today.completion.summary' | 'today.completion.summaryWithKnown' | 'today.completion.summaryAllKnown'
  vars: Record<string, number>
}

export type TodayCompletionSummarySource = Pick<
  TodayLessonResult,
  'reviewCorrect' | 'reviewTotal' | 'knownItemCount' | 'knownMarkedCount'
>

export type TodayCompletionLine = {
  key:
    | TodayCompletionSummary['key']
    | 'today.completion.typePassed'
    | 'today.completion.typeWithHelp'
    | 'today.completion.speakPassed'
    | 'today.completion.speakContinued'
    | 'today.completion.speakSkipped'
    | 'today.completion.knownMarked'
  vars?: Record<string, number>
}

export type TodayVibeCompletion = {
  completedAt: string
  result?: TodayLessonResult
}

export type TodayLessonProgress = {
  status: TodayLessonStatus
  completedAt?: string
  skippedAt?: string
  result?: TodayLessonResult
  vibeCompletions?: Partial<Record<ActiveGuidedVibeId, TodayVibeCompletion>>
}

export type TodayCourseProgress = {
  baseLanguage: string
  targetLanguage: string
  currentLessonId: string
  completedLessonIds: string[]
  skippedLessonIds: string[]
  lessons: Record<string, TodayLessonProgress>
}

export type TodayProgressState = {
  schemaVersion: 2
  updatedAt: string
  courses: Record<string, TodayCourseProgress>
}

export type TodayProgressWriteResult = {
  state: TodayProgressState
  saved: boolean
}

export type TodayLessonDraftStep =
  | 'scene'
  | 'matchPairs'
  | 'pattern'
  | 'build'
  | 'type'
  | 'complication'
  | 'speak'
  | 'rolePlay'

export type TodayLessonDraft = {
  schemaVersion: 1
  pathId: string
  lessonId: string
  vibeId: ActiveGuidedVibeId
  step: TodayLessonDraftStep
  result: Partial<TodayLessonResult>
  updatedAt: string
}

export type TodayVisibleStatus = TodayLessonStatus | 'new'

const LEGACY_GUIDED_TODAY_PATH_ID = 'english-a1-practical'
const GUIDED_TODAY_PATH_ONE_ID = 'english-a1-practical-1'

export function todayProgressKey(userId: string) {
  return `resonance_today_progress_v1_${userId}`
}

export function todayLessonDraftKey(
  userId: string,
  pathId: string,
  lessonId: string,
  vibeId: ActiveGuidedVibeId,
) {
  return `resonance_today_lesson_draft_v1_${encodeURIComponent(userId)}_${encodeURIComponent(pathId)}_${encodeURIComponent(lessonId)}_${vibeId}`
}

export function createEmptyTodayProgressState(): TodayProgressState {
  return {
    schemaVersion: 2,
    updatedAt: new Date(0).toISOString(),
    courses: {},
  }
}

export function getTodayLessonStatus(
  state: TodayProgressState,
  lesson: GuidedLesson,
): TodayVisibleStatus {
  return state.courses[lesson.courseId]?.lessons[lesson.id]?.status ?? 'new'
}

export function getTodayLessonVibeStatus(
  state: TodayProgressState,
  lesson: GuidedLesson,
  vibeId: ActiveGuidedVibeId,
): TodayVisibleStatus {
  const progress = state.courses[lesson.courseId]?.lessons[lesson.id]
  if (progress?.vibeCompletions?.[vibeId]?.completedAt) {
    return 'completed'
  }

  if (progress?.status === 'skipped') {
    return 'skipped'
  }

  return 'new'
}

export function getCompletedTodayLessonVibeIds(
  state: TodayProgressState,
  lesson: Pick<GuidedLesson, 'courseId' | 'id'>,
): ActiveGuidedVibeId[] {
  const vibeCompletions = state.courses[lesson.courseId]?.lessons[lesson.id]?.vibeCompletions
  if (!vibeCompletions) return []

  return ACTIVE_GUIDED_VIBE_IDS.filter((vibeId) => Boolean(vibeCompletions[vibeId]?.completedAt))
}

export function markTodayLessonComplete(
  state: TodayProgressState,
  lesson: GuidedLesson,
  result: TodayLessonResult,
): TodayProgressState {
  const timestamp = new Date().toISOString()
  const course = getCourseProgress(state, lesson)
  const currentLessonProgress = course.lessons[lesson.id]
  const completedLessonIds = uniqueIds([...course.completedLessonIds, lesson.id])
  const skippedLessonIds = course.skippedLessonIds.filter((id) => id !== lesson.id)
  const vibeCompletions = {
    ...currentLessonProgress?.vibeCompletions,
    [lesson.vibeId]: {
      completedAt: timestamp,
      result,
    },
  }

  return {
    ...state,
    schemaVersion: 2,
    updatedAt: timestamp,
    courses: {
      ...state.courses,
      [lesson.courseId]: {
        ...course,
        completedLessonIds,
        skippedLessonIds,
        lessons: {
          ...course.lessons,
          [lesson.id]: {
            status: 'completed',
            completedAt: timestamp,
            result,
            vibeCompletions,
          },
        },
      },
    },
  }
}

export function markTodayLessonSkipped(
  state: TodayProgressState,
  lesson: GuidedLesson,
): TodayProgressState {
  const timestamp = new Date().toISOString()
  const course = getCourseProgress(state, lesson)
  const skippedLessonIds = uniqueIds([...course.skippedLessonIds, lesson.id])
  const completedLessonIds = course.completedLessonIds.filter((id) => id !== lesson.id)

  return {
    ...state,
    schemaVersion: 2,
    updatedAt: timestamp,
    courses: {
      ...state.courses,
      [lesson.courseId]: {
        ...course,
        completedLessonIds,
        skippedLessonIds,
        lessons: {
          ...course.lessons,
          [lesson.id]: {
            status: 'skipped',
            skippedAt: timestamp,
          },
        },
      },
    },
  }
}

export function getTodayCompletionSummary(result: TodayCompletionSummarySource): TodayCompletionSummary {
  const knownItemCount = getKnownMarkedCount(result)
  const reviewCorrect = result.reviewCorrect ?? 0
  const reviewTotal = result.reviewTotal ?? 0

  if (knownItemCount > 0 && reviewTotal === 0) {
    return {
      key: 'today.completion.summaryAllKnown',
      vars: { known: knownItemCount },
    }
  }

  if (knownItemCount > 0) {
    return {
      key: 'today.completion.summaryWithKnown',
      vars: {
        correct: reviewCorrect,
        total: reviewTotal,
        known: knownItemCount,
      },
    }
  }

  return {
    key: 'today.completion.summary',
    vars: {
      correct: reviewCorrect,
      total: reviewTotal,
    },
  }
}

export function getTodayCompletionLines(result: TodayLessonResult): TodayCompletionLine[] {
  const hasV5Result = typeof result.speakPassed === 'boolean' || typeof result.typeUsedFallback === 'boolean'
  if (!hasV5Result) {
    return [getTodayCompletionSummary(result)]
  }

  const lines: TodayCompletionLine[] = [
    {
      key: result.typeUsedFallback || result.typePassed === false
        ? 'today.completion.typeWithHelp'
        : 'today.completion.typePassed',
    },
  ]

  if (result.speakPassed) {
    lines.push({ key: 'today.completion.speakPassed' })
  } else if ((result.speakAttempts ?? 0) > 0) {
    lines.push({ key: 'today.completion.speakContinued' })
  } else {
    lines.push({ key: 'today.completion.speakSkipped' })
  }

  const knownMarkedCount = getKnownMarkedCount(result)
  if (knownMarkedCount > 0) {
    lines.push({
      key: 'today.completion.knownMarked',
      vars: { known: knownMarkedCount },
    })
  }

  return lines
}

export function restartTodayLessonProgress(
  state: TodayProgressState,
  lesson: GuidedLesson,
): TodayProgressState {
  const course = getCourseProgress(state, lesson)
  const remainingLessons = { ...course.lessons }
  delete remainingLessons[lesson.id]

  return {
    ...state,
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    courses: {
      ...state.courses,
      [lesson.courseId]: {
        ...course,
        completedLessonIds: course.completedLessonIds.filter((id) => id !== lesson.id),
        skippedLessonIds: course.skippedLessonIds.filter((id) => id !== lesson.id),
        lessons: remainingLessons,
      },
    },
  }
}

export function readTodayProgressState(userId: string | undefined): TodayProgressState {
  if (!userId || !canUseLocalStorage()) {
    return createEmptyTodayProgressState()
  }

  try {
    const raw = window.localStorage.getItem(todayProgressKey(userId))
    if (!raw) return createEmptyTodayProgressState()
    const parsed = JSON.parse(raw) as { schemaVersion?: unknown; updatedAt?: unknown; courses?: unknown }
    if ((parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) || typeof parsed.courses !== 'object' || parsed.courses === null) {
      return createEmptyTodayProgressState()
    }
    return {
      schemaVersion: 2,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
      courses: migrateLegacyTodayCourseIds(parsed.courses as Record<string, TodayCourseProgress>),
    }
  } catch {
    return createEmptyTodayProgressState()
  }
}

export function writeTodayProgressState(userId: string | undefined, state: TodayProgressState): boolean {
  if (!userId || !canUseLocalStorage()) {
    return false
  }

  try {
    window.localStorage.setItem(todayProgressKey(userId), JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

/**
 * Commits one lesson completion against the newest local snapshot. The returned
 * state is suitable for replacing a render closure that may be stale after a
 * storage event or another tab's earlier completion.
 */
export function commitTodayLessonCompletion(
  userId: string | undefined,
  lesson: GuidedLesson,
  result: TodayLessonResult,
): TodayProgressWriteResult {
  const state = markTodayLessonComplete(readTodayProgressState(userId), lesson, result)
  return {
    state,
    saved: writeTodayProgressState(userId, state),
  }
}

export function readTodayLessonDraft(
  userId: string | undefined,
  lesson: Pick<GuidedLesson, 'pathId' | 'id' | 'vibeId'>,
): TodayLessonDraft | undefined {
  if (!userId || !canUseLocalStorage()) return undefined

  try {
    const raw = window.localStorage.getItem(todayLessonDraftKey(userId, lesson.pathId, lesson.id, lesson.vibeId))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as unknown
    return isTodayLessonDraft(parsed, lesson) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function writeTodayLessonDraft(
  userId: string | undefined,
  draft: TodayLessonDraft,
): boolean {
  if (!userId || !canUseLocalStorage() || !isTodayLessonDraft(draft, draft)) return false

  try {
    window.localStorage.setItem(
      todayLessonDraftKey(userId, draft.pathId, draft.lessonId, draft.vibeId),
      JSON.stringify(draft),
    )
    return true
  } catch {
    return false
  }
}

export function clearTodayLessonDraft(
  userId: string | undefined,
  lesson: Pick<GuidedLesson, 'pathId' | 'id' | 'vibeId'>,
): boolean {
  if (!userId || !canUseLocalStorage()) return false

  try {
    window.localStorage.removeItem(todayLessonDraftKey(userId, lesson.pathId, lesson.id, lesson.vibeId))
    return true
  } catch {
    return false
  }
}

function getCourseProgress(state: TodayProgressState, lesson: GuidedLesson): TodayCourseProgress {
  return state.courses[lesson.courseId] ?? {
    baseLanguage: lesson.baseLanguage,
    targetLanguage: lesson.targetLanguage,
    currentLessonId: lesson.id,
    completedLessonIds: [],
    skippedLessonIds: [],
    lessons: {},
  }
}

function migrateLegacyTodayCourseIds(courses: Record<string, TodayCourseProgress>) {
  if (!(LEGACY_GUIDED_TODAY_PATH_ID in courses) || GUIDED_TODAY_PATH_ONE_ID in courses) {
    return courses
  }

  const {
    [LEGACY_GUIDED_TODAY_PATH_ID]: legacyCourse,
    ...remainingCourses
  } = courses

  return {
    ...remainingCourses,
    [GUIDED_TODAY_PATH_ONE_ID]: legacyCourse,
  }
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids))
}

function getKnownMarkedCount(result: Pick<TodayLessonResult, 'knownItemCount' | 'knownMarkedCount'>) {
  return Math.max(0, result.knownMarkedCount ?? result.knownItemCount ?? 0)
}

function canUseLocalStorage() {
  if (typeof window === 'undefined') return false
  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function isTodayLessonDraft(
  value: unknown,
  lesson: { pathId: string; id?: string; lessonId?: string; vibeId: ActiveGuidedVibeId },
): value is TodayLessonDraft {
  if (!isRecord(value) || value.schemaVersion !== 1) return false
  const lessonId = lesson.id ?? lesson.lessonId
  if (value.pathId !== lesson.pathId || value.lessonId !== lessonId || value.vibeId !== lesson.vibeId) return false
  if (!isTodayLessonDraftStep(value.step) || typeof value.updatedAt !== 'string' || !isRecord(value.result)) return false

  return Object.keys(value.result).every((key) => TODAY_LESSON_RESULT_KEYS.has(key as keyof TodayLessonResult))
    && Object.values(value.result).every((entry) => (
      typeof entry === 'number' || typeof entry === 'boolean' || entry === undefined
    ))
}

const TODAY_LESSON_RESULT_KEYS = new Set<keyof TodayLessonResult>([
  'buildAttempts',
  'buildUsedFallback',
  'typeAttempts',
  'typePassed',
  'typeUsedFallback',
  'speakAttempts',
  'speakTranscriptMatch',
  'speakPassed',
  'knownMarkedCount',
  'reviewCorrect',
  'reviewTotal',
  'knownItemCount',
  'clozeBlanksTotal',
  'clozeBlanksFirstTry',
  'rolePlayTurnsPassed',
])

function isTodayLessonDraftStep(value: unknown): value is TodayLessonDraftStep {
  return value === 'scene'
    || value === 'matchPairs'
    || value === 'pattern'
    || value === 'build'
    || value === 'type'
    || value === 'complication'
    || value === 'speak'
    || value === 'rolePlay'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
