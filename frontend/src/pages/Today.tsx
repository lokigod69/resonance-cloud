import { useEffect, useMemo, useState } from 'react'
import { getGuidedPathOverview, getGuidedTodayPathOptions } from '@/data/guidedLessons'
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
  buildGuidedCheckpointPlan,
  hasPendingGuidedCheckpoint,
} from '@/lib/guidedCheckpoint'
import {
  getSelectedGuidedVibe,
  setSelectedGuidedVibe,
} from '@/lib/todayVibe'
import '@/components/today/Today.css'

export default function Today() {
  const { user } = useAuth()
  const pathOptions = useMemo(() => getGuidedTodayPathOptions(), [])
  const defaultPathId = pathOptions[0]?.id ?? 'english-a1-practical-1'
  const [selectedPathId, setSelectedPathId] = useState(defaultPathId)
  const [selectedVibeId, setSelectedVibeId] = useState<ActiveGuidedVibeId>(() => (
    getSelectedGuidedVibe(defaultPathId)
  ))
  const [progress, setProgress] = useState<TodayProgressState>(() => createEmptyTodayProgressState())
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(undefined)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [knownItemIds, setKnownItemIds] = useState<Set<string>>(() => new Set())
  const overview = useMemo(
    () => getGuidedPathOverview(selectedPathId, progress, selectedVibeId, selectedLessonId),
    [progress, selectedLessonId, selectedPathId, selectedVibeId],
  )
  const checkpointPlan = useMemo(() => (
    hasPendingGuidedCheckpoint(progress, selectedVibeId)
      ? buildGuidedCheckpointPlan(progress, selectedVibeId)
      : undefined
  ), [progress, selectedVibeId])
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
    setSelectedVibeId(getSelectedGuidedVibe(selectedPathId))
    setSelectedLessonId(undefined)
    setSessionActive(false)
    setSessionKey((current) => current + 1)
    setKnownItemIds(new Set())
  }, [selectedPathId, user?.id])

  const persistProgress = (nextProgress: TodayProgressState) => {
    setProgress(nextProgress)
    writeTodayProgressState(user?.id, nextProgress)
  }

  const handleExitToIntro = () => {
    setSessionActive(false)
  }

  const handleSelectPath = (pathId: string) => {
    if (pathId === selectedPathId) return
    setSelectedPathId(pathId)
    setSelectedVibeId(getSelectedGuidedVibe(pathId))
    setSelectedLessonId(undefined)
    setSessionActive(false)
    setKnownItemIds(new Set())
    setSessionKey((current) => current + 1)
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
    setSelectedGuidedVibe(selectedPathId, vibeId)
    setSelectedVibeId(getSelectedGuidedVibe(selectedPathId))
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
    <div
      className="today-shell relative isolate mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:py-8"
      data-guided-vibe={selectedVibeId}
    >
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
            pathOptions={pathOptions}
            selectedPathId={selectedPathId}
            progress={progress}
            selectedVibeId={selectedVibeId}
            checkpointCard={checkpointPlan ? {
              href: `/today/checkpoint?vibe=${selectedVibeId}`,
              completedPathCount: checkpointPlan.completedPathCount,
            } : undefined}
            onSelectPath={handleSelectPath}
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
