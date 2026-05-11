import type { GuidedLesson } from '@/data/guidedLessons'

export type TodayLessonStatus = 'completed' | 'skipped'

export type TodayLessonResult = {
  buildAttempts: number
  typeAttempts: number
  typeUsedFallback?: boolean
  speakAttempts?: number
  speakTranscriptMatch?: number
  speakPassed?: boolean
  knownMarkedCount?: number
  reviewCorrect?: number
  reviewTotal?: number
  knownItemCount?: number
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

export type TodayLessonProgress = {
  status: TodayLessonStatus
  completedAt?: string
  skippedAt?: string
  result?: TodayLessonResult
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
  schemaVersion: 1
  updatedAt: string
  courses: Record<string, TodayCourseProgress>
}

export type TodayVisibleStatus = TodayLessonStatus | 'new'

export function todayProgressKey(userId: string) {
  return `resonance_today_progress_v1_${userId}`
}

export function createEmptyTodayProgressState(): TodayProgressState {
  return {
    schemaVersion: 1,
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

export function markTodayLessonComplete(
  state: TodayProgressState,
  lesson: GuidedLesson,
  result: TodayLessonResult,
): TodayProgressState {
  const timestamp = new Date().toISOString()
  const course = getCourseProgress(state, lesson)
  const completedLessonIds = uniqueIds([...course.completedLessonIds, lesson.id])
  const skippedLessonIds = course.skippedLessonIds.filter((id) => id !== lesson.id)

  return {
    ...state,
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
      key: result.typeUsedFallback ? 'today.completion.typeWithHelp' : 'today.completion.typePassed',
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
    const parsed = JSON.parse(raw) as Partial<TodayProgressState>
    if (parsed.schemaVersion !== 1 || typeof parsed.courses !== 'object' || parsed.courses === null) {
      return createEmptyTodayProgressState()
    }
    return {
      schemaVersion: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
      courses: parsed.courses as Record<string, TodayCourseProgress>,
    }
  } catch {
    return createEmptyTodayProgressState()
  }
}

export function writeTodayProgressState(userId: string | undefined, state: TodayProgressState) {
  if (!userId || !canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.setItem(todayProgressKey(userId), JSON.stringify(state))
  } catch {
    return
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

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids))
}

function getKnownMarkedCount(result: Pick<TodayLessonResult, 'knownItemCount' | 'knownMarkedCount'>) {
  return Math.max(0, result.knownMarkedCount ?? result.knownItemCount ?? 0)
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}
