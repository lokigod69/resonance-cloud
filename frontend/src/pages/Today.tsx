import { useEffect, useMemo, useState } from 'react'
import { getCurrentGuidedLesson } from '@/data/guidedLessons'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { TodayHero } from '@/components/today/TodayHero'
import { TodaySession } from '@/components/today/TodaySession'
import {
  createEmptyTodayProgressState,
  getTodayLessonStatus,
  markTodayLessonComplete,
  markTodayLessonSkipped,
  readTodayProgressState,
  restartTodayLessonProgress,
  writeTodayProgressState,
  type TodayLessonResult,
  type TodayProgressState,
} from '@/lib/todayProgress'
import { Button } from '@/components/ui/button'

export default function Today() {
  const lesson = useMemo(() => getCurrentGuidedLesson(), [])
  const { user } = useAuth()
  const { t } = useTranslation()
  const [progress, setProgress] = useState<TodayProgressState>(() => createEmptyTodayProgressState())
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const status = getTodayLessonStatus(progress, lesson)
  const terminalStatus = status === 'completed' || status === 'skipped'

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- user-scoped localStorage progress must refresh when the authenticated user changes
    setProgress(readTodayProgressState(user?.id))
    setSessionActive(false)
    setSessionKey((current) => current + 1)
  }, [user?.id])

  const persistProgress = (nextProgress: TodayProgressState) => {
    setProgress(nextProgress)
    writeTodayProgressState(user?.id, nextProgress)
  }

  const handleStart = () => {
    setSessionActive(true)
  }

  const handleSkip = () => {
    const nextProgress = markTodayLessonSkipped(progress, lesson)
    persistProgress(nextProgress)
    setSessionActive(false)
  }

  const handleComplete = (result: TodayLessonResult) => {
    const nextProgress = markTodayLessonComplete(progress, lesson, result)
    persistProgress(nextProgress)
  }

  const handleRestart = () => {
    const nextProgress = restartTodayLessonProgress(progress, lesson)
    persistProgress(nextProgress)
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
        <TodayHero
          lesson={lesson}
          status={status}
          isSessionActive={sessionActive}
          onStart={handleStart}
          onSkip={handleSkip}
          onRestart={handleRestart}
        />

        {terminalStatus && !sessionActive && (
          <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {status === 'completed' ? t('today.completedBadge') : t('today.skippedBadge')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {status === 'completed' ? t('today.completion.title') : t('today.skippedTitle')}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  {t('today.returningComplete')}
                </p>
              </div>
              <Button variant="outline" onClick={handleRestart}>
                {t('today.restartLesson')}
              </Button>
            </div>
          </section>
        )}

        {sessionActive && (
          <TodaySession
            key={sessionKey}
            lesson={lesson}
            onComplete={handleComplete}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  )
}
