import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getGuidedPathOverview,
  getGuidedTodayPathOptions,
  isGuidedLanguageLoaded,
  loadGuidedLessonsForLanguage,
  type GuidedPathMetadata,
  type GuidedTargetLanguage,
} from '@/data/guidedLessons'
import { isActiveGuidedVibeId, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { useAuth } from '@/hooks/useAuth'
import { TodayPathOverview } from '@/components/today/TodayPathOverview'
import { TodaySession } from '@/components/today/TodaySession'
import {
  commitTodayLessonCompletion,
  readTodayProgressState,
  type TodayLessonResult,
  type TodayProgressState,
} from '@/lib/todayProgress'
import {
  countCompletedGuidedCheckpointPaths,
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
import { useLanguage } from '@/contexts/LanguageContext'
import { toGuidedLanguageName, toWizardLanguageName } from '@/lib/targetLanguage'
import { trackLearningAction } from '@/lib/analytics'
import { BETA_TARGET_LANGUAGES } from '@/lib/languages'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import '@/components/today/Today.css'

// Guided-space names of the beta target languages ('Bisaya' → 'Cebuano').
const BETA_GUIDED_LANGUAGES = new Set(BETA_TARGET_LANGUAGES.map((lang) => toGuidedLanguageName(lang)))

function scrollTodayToTop() {
  if (typeof window === 'undefined') return

  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  })
}

export default function Today() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { activeLanguage, setActiveLanguage, languageReady } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const pathOptions = useMemo(() => getGuidedTodayPathOptions(), [])
  // Every language with authored paths (all 12) — the resolution set. A legacy
  // Korean/Russian learner keeps their course even though the SWITCHER below
  // only offers the beta eight.
  const allGuidedLanguages = useMemo(() => collectAvailableLanguages(pathOptions), [pathOptions])
  const availableLanguages = useMemo(
    () => allGuidedLanguages.filter((language) => BETA_GUIDED_LANGUAGES.has(language)),
    [allGuidedLanguages],
  )
  const initialLanguage = useMemo(() => {
    // The app-wide active language is the canonical choice (onboarding/home/
    // library all funnel into it); the guided key is its synced mirror and
    // covers the cold-load moment before the provider resolves. Both resolve
    // against ALL guided languages, not the beta subset — trimming here would
    // silently bounce a legacy learner into English.
    const canonical = toGuidedLanguageName(activeLanguage)
    if (allGuidedLanguages.includes(canonical as GuidedTargetLanguage)) {
      return canonical as GuidedTargetLanguage
    }
    const stored = getSelectedGuidedTargetLanguage()
    return allGuidedLanguages.includes(stored) ? stored : (availableLanguages[0] ?? 'English')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot initial value; selectedLanguage state owns later changes
  }, [allGuidedLanguages, availableLanguages])
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
  const [loadedLanguage, setLoadedLanguage] = useState<GuidedTargetLanguage | null>(() => (
    isGuidedLanguageLoaded(queryPathLanguage ?? initialLanguage)
      ? (queryPathLanguage ?? initialLanguage)
      : null
  ))
  const [failedLanguage, setFailedLanguage] = useState<GuidedTargetLanguage | null>(null)
  const [languageLoadAttempt, setLanguageLoadAttempt] = useState(0)
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
  const [progress, setProgress] = useState<TodayProgressState>(() => readTodayProgressState(user?.id))
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(undefined)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [knownItemIds, setKnownItemIds] = useState<Set<string>>(() => new Set())
  // Ten lightweight rows read the registry after the language import resolves.
  // Memoizing only the path/progress would preserve the pre-import empty result.
  const overview = getGuidedPathOverview(selectedPathId, progress, selectedVibeId, selectedLessonId)
  const checkpointPlan = (
    hasPendingGuidedCheckpoint(progress, { userId: user?.id ?? '', targetLanguage: selectedLanguage, vibe: selectedVibeId })
      ? { completedPathCount: countCompletedGuidedCheckpointPaths(progress, selectedLanguage, selectedVibeId) }
      : undefined
  )
  const lesson = overview.selectedLesson ?? overview.recommendedLesson ?? overview.lessons[0]?.lesson
  const nextLesson = useMemo(() => {
    if (!lesson) return undefined
    const currentIndex = overview.lessons.findIndex((entry) => entry.lesson.id === lesson.id)
    if (currentIndex < 0) return undefined
    return overview.lessons[currentIndex + 1]?.lesson
  }, [lesson, overview.lessons])

  useEffect(() => {
    let active = true
    if (!isGuidedLanguageLoaded(selectedLanguage)) setLoadedLanguage(null)
    setFailedLanguage(null)
    void loadGuidedLessonsForLanguage(selectedLanguage)
      .then(() => {
        if (active) setLoadedLanguage(selectedLanguage)
      })
      .catch(() => {
        if (active) setFailedLanguage(selectedLanguage)
      })
    return () => {
      active = false
    }
  }, [languageLoadAttempt, selectedLanguage])

  useEffect(() => {

    setProgress(readTodayProgressState(user?.id))
    setSelectedVibeId(queryVibeId ?? getSelectedGuidedVibe(selectedPathId))
    setSelectedLessonId(undefined)
    setSessionActive(false)
    setSessionKey((current) => current + 1)
    setKnownItemIds(new Set())
  }, [queryVibeId, selectedPathId, user?.id])

  useEffect(() => {
    if (queryPathId) {

      setSelectedPathId(queryPathId)
    }
  }, [queryPathId])

  useEffect(() => {
    if (queryPathLanguage && queryPathLanguage !== selectedLanguage) {
      setSelectedLanguageState(queryPathLanguage)
      setSelectedGuidedTargetLanguage(queryPathLanguage)
      // One language everywhere: following a path link is a language switch too.
      setActiveLanguage(toWizardLanguageName(queryPathLanguage))
    }
  }, [queryPathLanguage, selectedLanguage, setActiveLanguage])

  // The provider resolves activeLanguage asynchronously: a cold /today load can
  // run the one-shot initializer first and freeze a stale guided-key mirror
  // (e.g. a returning learner whose guided key predates the canonical model).
  // Adopt the canonical language exactly once when it arrives — unless a ?path=
  // deep link or an already-running session owns the page.
  const canonicalAdoptedRef = useRef(false)
  useEffect(() => {
    if (canonicalAdoptedRef.current || !languageReady || queryPathId) return
    canonicalAdoptedRef.current = true
    if (sessionActive) return
    const canonical = toGuidedLanguageName(activeLanguage)
    if (!canonical || canonical === selectedLanguage) return
    if (!allGuidedLanguages.includes(canonical as GuidedTargetLanguage)) return

    setSelectedLanguageState(canonical as GuidedTargetLanguage)
    setSelectedGuidedTargetLanguage(canonical as GuidedTargetLanguage)
    setSelectedPathId(pickDefaultPathForLanguage(pathOptions, canonical as GuidedTargetLanguage))
  }, [languageReady, queryPathId, sessionActive, activeLanguage, selectedLanguage, allGuidedLanguages, pathOptions])

  // The dashboard's mission card deep-links with `start=1` to drop straight into the
  // recommended lesson. Consume the flag (so refresh/back land on the overview) and open
  // the session. Declared after the progress-hydration effect above: both state updates
  // land in the same commit, so the session resolves its lesson from real progress.
  const shouldAutoStart = searchParams.get('start') === '1'
  useEffect(() => {
    if (!shouldAutoStart) return
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      params.delete('start')
      return params
    }, { replace: true })

    setSessionActive(true)
    scrollTodayToTop()
  }, [shouldAutoStart, setSearchParams])

  const handleExitToIntro = () => {
    setSessionActive(false)
  }

  const syncTodaySearchParams = (next: {
    pathId?: string
    vibeId?: ActiveGuidedVibeId
  }) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      if (next.pathId) params.set('path', next.pathId)
      if (next.vibeId) params.set('vibe', next.vibeId)
      return params
    }, { replace: true })
  }

  const handleSelectPath = (pathId: string) => {
    if (pathId === selectedPathId) return
    const pathLanguage = pathOptions.find((path) => path.id === pathId)?.targetLanguage
    const nextVibeId = getSelectedGuidedVibe(pathId)
    if (pathLanguage && pathLanguage !== selectedLanguage) {
      setSelectedLanguageState(pathLanguage)
      setSelectedGuidedTargetLanguage(pathLanguage)
      setActiveLanguage(toWizardLanguageName(pathLanguage))
    }
    setSelectedPathId(pathId)
    setSelectedVibeId(nextVibeId)
    syncTodaySearchParams({ pathId, vibeId: nextVibeId })
    setSelectedLessonId(undefined)
    setSessionActive(false)
    setKnownItemIds(new Set())
    setSessionKey((current) => current + 1)
  }

  const handleSelectLanguage = (language: GuidedTargetLanguage) => {
    if (language === selectedLanguage) return
    const nextPathId = pickDefaultPathForLanguage(pathOptions, language)
    const nextVibeId = selectedVibeId
    setSelectedLanguageState(language)
    setSelectedGuidedTargetLanguage(language)
    // One language everywhere: the Today picker is a full language switch.
    setActiveLanguage(toWizardLanguageName(language))
    setSelectedPathId(nextPathId)
    setSelectedGuidedVibe(nextPathId, nextVibeId)
    setSelectedVibeId(nextVibeId)
    syncTodaySearchParams({ pathId: nextPathId, vibeId: nextVibeId })
    setSelectedLessonId(undefined)
    setSessionActive(false)
    setKnownItemIds(new Set())
    setSessionKey((current) => current + 1)
  }

  const handleComplete = (result: TodayLessonResult) => {
    if (!lesson) return false
    const completion = commitTodayLessonCompletion(user?.id, lesson, result)
    if (!completion.saved) return false
    // Pin the lesson before installing progress so the recommendation advancing
    // cannot swap the completion screen to the next lesson.
    setSelectedLessonId(lesson.id)
    setProgress(completion.state)
    trackLearningAction('guided_step', { lesson_id: lesson.id, step_type: 'lesson_complete' })
    return true
  }

  const handleSelectVibe = (vibeId: ActiveGuidedVibeId) => {
    setSelectedGuidedVibe(selectedPathId, vibeId)
    setSelectedVibeId(vibeId)
    syncTodaySearchParams({ vibeId })
    setSessionActive(false)
    setSessionKey((current) => current + 1)
    setKnownItemIds(new Set())
  }

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId)
    setKnownItemIds(new Set())
    setSessionKey((current) => current + 1)
    setSessionActive(true)
    scrollTodayToTop()
  }

  const handleStartSelectedLesson = (lessonId?: string) => {
    const startLessonId = lessonId ?? lesson?.id
    if (startLessonId) {
      setSelectedLessonId(startLessonId)
      setKnownItemIds(new Set())
      setSessionKey((current) => current + 1)
    }
    setSessionActive(true)
    scrollTodayToTop()
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
    scrollTodayToTop()
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
        {failedLanguage === selectedLanguage ? (
          <div className="grid min-h-[45vh] place-items-center gap-4 text-center" role="alert">
            <p className="text-sm text-[var(--text-secondary)]">{t('errors.route.title')}</p>
            <Button type="button" onClick={() => setLanguageLoadAttempt((attempt) => attempt + 1)}>
              {t('errors.route.retry')}
            </Button>
          </div>
        ) : loadedLanguage !== selectedLanguage ? (
          <div className="grid min-h-[45vh] place-items-center" role="status" aria-live="polite">
            <p className="text-sm text-[var(--text-secondary)]">{t('common.loading')}</p>
          </div>
        ) : !sessionActive ? (
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
        ) : null}

        {loadedLanguage === selectedLanguage && sessionActive && lesson && (
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
