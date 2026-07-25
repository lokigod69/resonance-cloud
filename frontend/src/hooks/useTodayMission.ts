import { useEffect, useState } from 'react'
import type { GuidedPathLessonCardStatus } from '@/data/guidedLessons'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import { readTodayProgressState, type TodayProgressState } from '@/lib/todayProgress'
import { getSelectedGuidedTargetLanguage } from '@/lib/todayLanguage'
import { getSelectedGuidedVibe } from '@/lib/todayVibe'

// guidedLessons.ts is a ~65k-line data module. It must NEVER be statically imported
// from the dashboard (it would swallow the home chunk); this hook loads it through a
// dynamic import so Rollup keeps it in the async chunk it already occupies for /today,
// and the dashboard merely warms that chunk before the learner taps into the lesson.
type GuidedLessonsModule = typeof import('@/data/guidedLessons')
type GuidedCheckpointModule = typeof import('@/lib/guidedCheckpoint')

export type TodayMission = {
  pathId: string
  pathShortTitle: string
  targetLanguage: string
  vibeId: ActiveGuidedVibeId
  /** Stable lesson id — lets Home snapshot {pathId, lessonId} and observe
   * completion in todayProgress without re-resolving the mission. */
  lessonId: string
  lessonNumber: number
  totalLessons: number
  completedCount: number
  lessonStatuses: GuidedPathLessonCardStatus[]
  lessonTitle: string
  phrase: string
  /** BCP-47 primary subtag of the target language, for `lang`/hyphenation on the phrase. */
  phraseLang: string | undefined
  estimatedMinutes: number
  isPathComplete: boolean
  checkpointPending: boolean
  startHref: string
  pathHref: string
  checkpointHref: string
}

export type TodayMissionState = {
  loading: boolean
  mission: TodayMission | null
}

type UseTodayMissionArgs = {
  /** Canonical language value from LanguageContext, e.g. 'German'. */
  activeLanguage: string | null
  /** profiles.base_language — picks the localized lesson title. */
  baseLanguage: string | null | undefined
  userId: string | undefined
  /** Gate so first-run/empty homes never pay the guided-data chunk download. */
  enabled: boolean
  /** Opt-in: when the active language has no guided path, fall back to the
   * learner's last-used guided language. Strict active-language matching is
   * the DEFAULT — a Korean-active home must never surface a Cebuano lesson.
   * No caller passes this today; it exists so the old behavior stays reachable
   * by name instead of by accident. */
  allowGuidedLanguageFallback?: boolean
}

// Deck/wizard languages use 'Bisaya'; guided content names the same language 'Cebuano'.
const DASHBOARD_TO_GUIDED_LANGUAGE: Record<string, string> = {
  Bisaya: 'Cebuano',
}

/**
 * Resolves the learner's one guided "mission of the day" for the dashboard hero:
 * the recommended lesson on the most relevant incomplete path for the active
 * language. Strict language matching is the default; the fallback to the
 * learner's last-used guided language requires the named opt-in. Returns
 * `mission: null` when guided content has nothing honest to offer, so the
 * dashboard can degrade to practice-only.
 */
export function useTodayMission({ activeLanguage, baseLanguage, userId, enabled, allowGuidedLanguageFallback = false }: UseTodayMissionArgs): TodayMissionState {
  const [state, setState] = useState<TodayMissionState>({ loading: true, mission: null })

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setState({ loading: true, mission: null })

    void (async () => {
      try {
        const [lessonsModule, checkpointModule] = await Promise.all([
          import('@/data/guidedLessons'),
          import('@/lib/guidedCheckpoint'),
        ])
        if (cancelled) return
        const progress = readTodayProgressState(userId)
        const mission = buildTodayMission({ lessonsModule, checkpointModule, progress, activeLanguage, baseLanguage, allowGuidedLanguageFallback })
        setState({ loading: false, mission })
      } catch {
        if (!cancelled) setState({ loading: false, mission: null })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeLanguage, allowGuidedLanguageFallback, baseLanguage, enabled, userId])

  return state
}

function buildTodayMission(input: {
  lessonsModule: GuidedLessonsModule
  checkpointModule: GuidedCheckpointModule
  progress: TodayProgressState
  activeLanguage: string | null
  baseLanguage: string | null | undefined
  allowGuidedLanguageFallback: boolean
}): TodayMission | null {
  const { lessonsModule, checkpointModule, progress, activeLanguage, baseLanguage, allowGuidedLanguageFallback } = input

  const guidedLanguage = resolveMissionLanguage(lessonsModule, progress, activeLanguage, allowGuidedLanguageFallback)
  if (!guidedLanguage) return null

  const path = pickMissionPath(lessonsModule, progress, guidedLanguage)
  if (!path) return null

  const vibeId = getSelectedGuidedVibe(path.id)
  const overview = lessonsModule.getGuidedPathOverview(path.id, progress, vibeId)
  const lesson = overview.recommendedLesson ?? overview.selectedLesson
  if (!lesson) return null

  const lessonTitle = lessonsModule.resolveGuidedBaseContent(lesson.title, {
    preferredBaseLanguage: baseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text
  const speakLocale = lessonsModule.GUIDED_TARGET_LANGUAGE_SPEAK_LOCALES[path.targetLanguage]?.[0]
  const query = `path=${encodeURIComponent(path.id)}&vibe=${encodeURIComponent(vibeId)}`

  return {
    pathId: path.id,
    pathShortTitle: path.shortTitle,
    targetLanguage: path.targetLanguage,
    vibeId,
    lessonId: lesson.id,
    lessonNumber: lesson.lessonNumber,
    totalLessons: overview.totalLessons,
    completedCount: overview.completedCount,
    lessonStatuses: overview.lessons.map((entry) => entry.status),
    lessonTitle,
    phrase: lesson.corePhrase.targetText,
    phraseLang: speakLocale ? speakLocale.split('-')[0] : undefined,
    estimatedMinutes: lesson.estimatedMinutes,
    isPathComplete: overview.isComplete,
    checkpointPending: checkpointModule.hasPendingGuidedCheckpoint(progress, vibeId),
    startHref: `/today?${query}&start=1`,
    pathHref: `/today?${query}`,
    checkpointHref: `/today/checkpoint?${query}`,
  }
}

function resolveMissionLanguage(
  lessonsModule: GuidedLessonsModule,
  progress: TodayProgressState,
  activeLanguage: string | null,
  allowGuidedLanguageFallback: boolean,
): string | null {
  const guidedLanguages = new Set<string>(
    lessonsModule.getGuidedTodayPathOptions().map((path) => path.targetLanguage),
  )
  const mapped = activeLanguage ? (DASHBOARD_TO_GUIDED_LANGUAGE[activeLanguage] ?? activeLanguage) : null
  if (mapped && guidedLanguages.has(mapped)) return mapped

  // The active deck language has no guided path (e.g. Korean). Strict matching
  // stops here by default — a home hero must never cross languages. The
  // fallback to the learner's last-used guided language survives only behind
  // the named opt-in, and even then only when they have actually engaged with
  // guided lessons.
  if (!allowGuidedLanguageFallback) return null
  const hasGuidedProgress = Object.values(progress.courses).some(
    (course) => course.completedLessonIds.length > 0 || course.skippedLessonIds.length > 0,
  )
  if (!hasGuidedProgress) return null

  const stored = getSelectedGuidedTargetLanguage()
  return guidedLanguages.has(stored) ? stored : null
}

function pickMissionPath(
  lessonsModule: GuidedLessonsModule,
  progress: TodayProgressState,
  guidedLanguage: string,
) {
  const candidates = lessonsModule
    .getGuidedTodayPathOptions()
    .filter((path) => path.targetLanguage === guidedLanguage)
  if (candidates.length === 0) return null

  const scored = candidates.map((metadata) => {
    const lessons = lessonsModule.getGuidedPathLessons(metadata.id)
    const course = progress.courses[metadata.id]
    const completedIds = new Set(course?.completedLessonIds ?? [])
    const isComplete = lessons.length > 0 && lessons.every((lesson) => completedIds.has(lesson.id))

    let lastActivityAt: string | null = null
    for (const lessonProgress of Object.values(course?.lessons ?? {})) {
      const stamps = [
        lessonProgress.completedAt,
        lessonProgress.skippedAt,
        ...Object.values(lessonProgress.vibeCompletions ?? {}).map((completion) => completion?.completedAt),
      ]
      for (const stamp of stamps) {
        if (stamp && (!lastActivityAt || stamp > lastActivityAt)) lastActivityAt = stamp
      }
    }

    return { metadata, isComplete, lastActivityAt }
  })

  // Continue where the learner actually is: the most recently touched unfinished path
  // wins, then the first untouched path in canonical order, and only when every path
  // is finished do we surface the last one in its "complete" state.
  const activeIncomplete = scored
    .filter((entry) => !entry.isComplete && entry.lastActivityAt)
    .sort((a, b) => (a.lastActivityAt! < b.lastActivityAt! ? 1 : -1))

  const picked = activeIncomplete[0] ?? scored.find((entry) => !entry.isComplete) ?? scored[scored.length - 1]
  return picked.metadata
}
