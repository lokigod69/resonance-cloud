import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getGuidedPathOverview,
  getGuidedTodayPathOptions,
  type GuidedPathMetadata,
  type GuidedTargetLanguage,
} from '@/data/guidedLessons'
import { isActiveGuidedVibeId, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { useAuth } from '@/hooks/useAuth'
import { TodayPathOverview } from '@/components/today/TodayPathOverview'
import { TodaySession } from '@/components/today/TodaySession'
import {
  createEmptyTodayProgressState,
  markTodayLessonComplete,
  readTodayProgressState,
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
import {
  getSelectedGuidedTargetLanguage,
  setSelectedGuidedTargetLanguage,
} from '@/lib/todayLanguage'
import '@/components/today/Today.css'

export default function Today() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const pathOptions = useMemo(() => getGuidedTodayPathOptions(), [])
  const availableLanguages = useMemo(() => collectAvailableLanguages(pathOptions), [pathOptions])
  const initialLanguage = useMemo(() => {
    const stored = getSelectedGuidedTargetLanguage()
    return availableLanguages.includes(stored) ? stored : (availableLanguages[0] ?? 'English')
  }, [availableLanguages])
  const queryPathId = useMemo(
    () => resolveTodayPathId(searchParams.get('path'), pathOptions),
    [pathOptions, searchParams],
  )
  const queryPathLanguage = useMemo(() => (
    queryPathId
      ? pathOptions.find((path) => path.id === queryPathId)?.targetLanguage
      : undefined
  ), [pathOptions, queryPathId])
  const [selectedLanguage, setSelectedLanguageState] = useState<GuidedTargetLanguage>(
    queryPathLanguage ?? initialLanguage,
  )
  const defaultPathId = useMemo(
    () => pickDefaultPathForLanguage(pathOptions, selectedLanguage),
    [pathOptions, selectedLanguage],
  )
  const queryVibeId = resolveTodayVibeId(searchParams.get('vibe'))
  const initialPathId = queryPathId ?? defaultPathId
  const [selectedPathId, setSelectedPathId] = useState(initialPathId)
  const [selectedVibeId, setSelectedVibeId] = useState<ActiveGuidedVibeId>(() => (
    queryVibeId ?? getSelectedGuidedVibe(initialPathId)
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
    setSelectedVibeId(queryVibeId ?? getSelectedGuidedVibe(selectedPathId))
    setSelectedLessonId(undefined)
    setSessionActive(false)
    setSessionKey((current) => current + 1)
    setKnownItemIds(new Set())
  }, [queryVibeId, selectedPathId, user?.id])

  useEffect(() => {
    if (queryPathId) setSelectedPathId(queryPathId)
  }, [queryPathId])

  useEffect(() => {
    if (queryPathLanguage && queryPathLanguage !== selectedLanguage) {
      setSelectedLanguageState(queryPathLanguage)
      setSelectedGuidedTargetLanguage(queryPathLanguage)
    }
  }, [queryPathLanguage, selectedLanguage])

  const persistProgress = (nextProgress: TodayProgressState) => {
    setProgress(nextProgress)
    writeTodayProgressState(user?.id, nextProgress)
  }

  const handleExitToIntro = () => {
    setSessionActive(false)
  }

  const handleSelectPath = (pathId: string) => {
    if (pathId === selectedPathId) return
    const pathLanguage = pathOptions.find((path) => path.id === pathId)?.targetLanguage
    if (pathLanguage && pathLanguage !== selectedLanguage) {
      setSelectedLanguageState(pathLanguage)
      setSelectedGuidedTargetLanguage(pathLanguage)
    }
    setSelectedPathId(pathId)
    setSelectedVibeId(getSelectedGuidedVibe(pathId))
    setSelectedLessonId(undefined)
    setSessionActive(false)
    setKnownItemIds(new Set())
    setSessionKey((current) => current + 1)
  }

  const handleSelectLanguage = (language: GuidedTargetLanguage) => {
    if (language === selectedLanguage) return
    const nextPathId = pickDefaultPathForLanguage(pathOptions, language)
    setSelectedLanguageState(language)
    setSelectedGuidedTargetLanguage(language)
    setSelectedPathId(nextPathId)
    setSelectedVibeId(getSelectedGuidedVibe(nextPathId))
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

  const handleStartSelectedLesson = (lessonId?: string) => {
    if (lessonId) {
      setSelectedLessonId(lessonId)
      setKnownItemIds(new Set())
      setSessionKey((current) => current + 1)
    }
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
            selectedLanguage={selectedLanguage}
            availableLanguages={availableLanguages}
            checkpointCard={checkpointPlan ? {
              href: `/today/checkpoint?path=${selectedPathId}&vibe=${selectedVibeId}`,
              completedPathCount: checkpointPlan.completedPathCount,
            } : undefined}
            pathCheckHref={`/today/checkpoint?mode=path-check&path=${selectedPathId}&vibe=${selectedVibeId}`}
            onSelectPath={handleSelectPath}
            onSelectVibe={handleSelectVibe}
            onSelectLanguage={handleSelectLanguage}
            onSelectLesson={handleSelectLesson}
            onStartLesson={handleStartSelectedLesson}
          />
        )}

        {sessionActive && lesson && (
          <TodaySession
            key={sessionKey}
            lesson={lesson}
            nextLesson={nextLesson}
            knownItemIds={knownItemIds}
            onComplete={handleComplete}
            onViewPath={handleExitToIntro}
            onOpenNextLesson={handleOpenNextLesson}
          />
        )}
      </div>
    </div>
  )
}

function resolveTodayPathId(value: string | null, pathOptions: Array<{ id: string }>) {
  return pathOptions.some((path) => path.id === value) ? value! : undefined
}

function resolveTodayVibeId(value: string | null): ActiveGuidedVibeId | undefined {
  return isActiveGuidedVibeId(value) ? value : undefined
}

function collectAvailableLanguages(pathOptions: GuidedPathMetadata[]): GuidedTargetLanguage[] {
  const seen = new Set<GuidedTargetLanguage>()
  const ordered: GuidedTargetLanguage[] = []
  for (const path of pathOptions) {
    if (!seen.has(path.targetLanguage)) {
      seen.add(path.targetLanguage)
      ordered.push(path.targetLanguage)
    }
  }
  return ordered
}

function pickDefaultPathForLanguage(
  pathOptions: GuidedPathMetadata[],
  language: GuidedTargetLanguage,
): string {
  return (
    pathOptions.find((path) => path.targetLanguage === language)?.id
    ?? pathOptions[0]?.id
    ?? 'english-a1-practical-1'
  )
}
