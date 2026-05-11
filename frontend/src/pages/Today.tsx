import { useEffect, useMemo, useState } from 'react'
import { getGuidedPathOverview } from '@/data/guidedLessons'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import { useAuth } from '@/hooks/useAuth'
import { TodayCompactHeader } from '@/components/today/TodayHero'
import { TodayPathOverview } from '@/components/today/TodayPathOverview'
import { TodaySession } from '@/components/today/TodaySession'
import {
  createEmptyTodayProgressState,
  markTodayLessonComplete,
  readTodayProgressState,
  restartTodayLessonProgress,
  writeTodayProgressState,
  type TodayLessonResult,
  type TodayProgressState,
} from '@/lib/todayProgress'
import {
  getSelectedGuidedVibe,
  setSelectedGuidedVibe,
} from '@/lib/todayVibe'

const GUIDED_TODAY_PATH_ID = 'english-a1-practical'

export default function Today() {
  const { user } = useAuth()
  const [selectedVibeId, setSelectedVibeId] = useState<ActiveGuidedVibeId>(() => (
    getSelectedGuidedVibe(GUIDED_TODAY_PATH_ID)
  ))
  const [progress, setProgress] = useState<TodayProgressState>(() => createEmptyTodayProgressState())
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(undefined)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [knownItemIds, setKnownItemIds] = useState<Set<string>>(() => new Set())
  const overview = useMemo(
    () => getGuidedPathOverview(GUIDED_TODAY_PATH_ID, progress, selectedVibeId, selectedLessonId),
    [progress, selectedLessonId, selectedVibeId],
  )
  const lesson = overview.selectedLesson ?? overview.recommendedLesson ?? overview.lessons[0]?.lesson
  const nextLesson = useMemo(() => {
    if (!lesson) return undefined
    const currentIndex = overview.lessons.findIndex((entry) => entry.lesson.id === lesson.id)
    if (currentIndex < 0) return undefined
    return overview.lessons[currentIndex + 1]?.lesson
  }, [lesson, overview.lessons])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- user-scoped localStorage progress must refresh when the authenticated user changes
    setProgress(readTodayProgressState(user?.id))
    setSelectedLessonId(undefined)
    setSessionActive(false)
    setSessionKey((current) => current + 1)
    setKnownItemIds(new Set())
  }, [user?.id])

  const persistProgress = (nextProgress: TodayProgressState) => {
    setProgress(nextProgress)
    writeTodayProgressState(user?.id, nextProgress)
  }

  const handleExitToIntro = () => {
    setSessionActive(false)
  }

  const handleComplete = (result: TodayLessonResult) => {
    if (!lesson) return
    const nextProgress = markTodayLessonComplete(progress, lesson, result)
    persistProgress(nextProgress)
  }

  const handleRestart = () => {
    if (!lesson) return
    const nextProgress = restartTodayLessonProgress(progress, lesson)
    persistProgress(nextProgress)
    setKnownItemIds(new Set())
    setSessionKey((current) => current + 1)
    setSessionActive(true)
  }

  const handleSelectVibe = (vibeId: ActiveGuidedVibeId) => {
    setSelectedGuidedVibe(GUIDED_TODAY_PATH_ID, vibeId)
    setSelectedVibeId(getSelectedGuidedVibe(GUIDED_TODAY_PATH_ID))
    setSessionActive(false)
    setSessionKey((current) => current + 1)
    setKnownItemIds(new Set())
  }

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId)
    setKnownItemIds(new Set())
    setSessionKey((current) => current + 1)
  }

  const handleStartSelectedLesson = () => {
    setSessionActive(true)
  }

  const handleOpenNextLesson = () => {
    if (!nextLesson) {
      handleExitToIntro()
      return
    }

    setSelectedLessonId(nextLesson.id)
    setKnownItemIds(new Set())
    setSessionKey((current) => current + 1)
    setSessionActive(true)
  }

  return (
    <div className="relative isolate mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:py-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, var(--accent-glow), transparent 56%), linear-gradient(180deg, color-mix(in srgb, var(--surface-glass) 42%, transparent), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="grid gap-6">
        {!sessionActive && (
          <TodayPathOverview
            overview={overview}
            progress={progress}
            selectedVibeId={selectedVibeId}
            onSelectVibe={handleSelectVibe}
            onSelectLesson={handleSelectLesson}
            onStartLesson={handleStartSelectedLesson}
          />
        )}

        {sessionActive && lesson && <TodayCompactHeader lesson={lesson} />}

        {sessionActive && lesson && (
          <TodaySession
            key={sessionKey}
            lesson={lesson}
            nextLesson={nextLesson}
            knownItemIds={knownItemIds}
            onComplete={handleComplete}
            onRestart={handleRestart}
            onViewPath={handleExitToIntro}
            onOpenNextLesson={handleOpenNextLesson}
          />
        )}
      </div>
    </div>
  )
}
