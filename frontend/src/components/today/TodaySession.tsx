import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { getGuidedMatchPairs, getGuidedReviewItems, type GuidedLesson } from '@/data/guidedLessons'
import type { TodayLessonResult } from '@/lib/todayProgress'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LessonMediaFrame } from '@/components/today/TodayHero'
import { MatchPairsStep } from '@/components/today/MatchPairsStep'
import { BuildPhraseStep, type BuildPhraseCheckState } from '@/components/today/BuildPhraseStep'
import { TypeRecallStep, type TypeRecallCheckState } from '@/components/today/TypeRecallStep'
import { ReviewStep, type ReviewStepResult } from '@/components/today/ReviewStep'
import { speakGuidedText } from '@/components/today/speech'

type TodaySessionProps = {
  lesson: GuidedLesson
  knownItemIds: Set<string>
  onComplete: (result: TodayLessonResult) => void
  onRestart: () => void
}

type SessionStep = 'scene' | 'matchPairs' | 'build' | 'type' | 'review' | 'complete'

const SESSION_STEPS: SessionStep[] = ['scene', 'matchPairs', 'build', 'type', 'review', 'complete']

export function TodaySession({ lesson, knownItemIds, onComplete, onRestart }: TodaySessionProps) {
  const { t } = useTranslation()
  const matchPairs = getGuidedMatchPairs(lesson)
  const reviewItems = getGuidedReviewItems(lesson, knownItemIds)
  const [stepIndex, setStepIndex] = useState(0)
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(() => new Set())
  const [buildState, setBuildState] = useState<BuildPhraseCheckState>({ status: 'idle', attempts: 0 })
  const [typeState, setTypeState] = useState<TypeRecallCheckState>({ status: 'idle', attempts: 0 })
  const [reviewResult, setReviewResult] = useState<ReviewStepResult>({ reviewCorrect: 0, reviewTotal: reviewItems.length })
  const step = SESSION_STEPS[stepIndex]
  const progress = Math.round(((stepIndex + 1) / SESSION_STEPS.length) * 100)
  const canGoBack = stepIndex > 0 && step !== 'complete'

  const canContinue =
    step === 'scene'
    || (step === 'matchPairs' && matchedPairIds.size === matchPairs.length)
    || (step === 'build' && buildState.status === 'correct')
    || (step === 'type' && typeState.status !== 'idle')

  const handleNext = () => {
    if (!canContinue) return
    setStepIndex((current) => Math.min(current + 1, SESSION_STEPS.length - 1))
  }

  const handleBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  const handleReviewFinish = (result: ReviewStepResult) => {
    setReviewResult(result)
    onComplete({
      buildAttempts: buildState.attempts,
      typeAttempts: typeState.attempts,
      reviewCorrect: result.reviewCorrect,
      reviewTotal: result.reviewTotal,
    })
    setStepIndex(SESSION_STEPS.indexOf('complete'))
  }

  return (
    <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <div className="mb-6 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t('today.sessionLabel')}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {t(`today.step.${step}`)}
            </h2>
          </div>
          <span className="text-sm text-[var(--text-muted)]">
            {t('today.progressLabel', { current: stepIndex + 1, total: SESSION_STEPS.length })}
          </span>
        </div>
        <Progress value={progress} className="h-1.5 bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)]" />
      </div>

      <div className="min-w-0">
        {step === 'scene' && <SceneStep lesson={lesson} />}
        {step === 'matchPairs' && (
          <MatchPairsStep
            lesson={lesson}
            matchedPairIds={matchedPairIds}
            onMatchedPairIdsChange={setMatchedPairIds}
          />
        )}
        {step === 'build' && (
          <BuildPhraseStep lesson={lesson} onCheckStateChange={setBuildState} />
        )}
        {step === 'type' && (
          <TypeRecallStep lesson={lesson} onCheckStateChange={setTypeState} />
        )}
        {step === 'review' && (
          <ReviewStep lesson={lesson} reviewItems={reviewItems} onFinish={handleReviewFinish} />
        )}
        {step === 'complete' && (
          <CompleteStep
            lesson={lesson}
            result={reviewResult}
            onRestart={onRestart}
          />
        )}
      </div>

      {step !== 'review' && step !== 'complete' && (
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
          <Button variant="ghost" onClick={handleBack} disabled={!canGoBack}>
            <ChevronLeft className="h-4 w-4" />
            {t('today.back')}
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            {step === 'type' && typeWasWrong(step, typeState) && (
              <span className="text-sm text-[var(--text-muted)]">
                {t('today.continueAfterWrong')}
              </span>
            )}
            <Button onClick={handleNext} disabled={!canContinue}>
              {t('today.continue')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function SceneStep({ lesson }: { lesson: GuidedLesson }) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)] lg:items-center">
      <LessonMediaFrame media={lesson.lessonMedia} />
      <div className="grid gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t('today.scene.situation')}
          </p>
          <p className="mt-2 text-lg leading-7 text-[var(--text-primary)]">
            {lesson.situation.de}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_64%,transparent)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t('today.corePhrase')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => speakGuidedText(lesson.corePhrase.targetText)}
            >
              <Volume2 className="h-4 w-4" />
              {t('today.listen')}
            </Button>
          </div>
          <p className="mt-3 break-words text-3xl font-semibold leading-tight text-[var(--text-primary)]">
            {lesson.corePhrase.targetText}
          </p>
          <p className="mt-3 break-words text-base leading-7 text-[var(--text-secondary)]">
            {lesson.corePhrase.baseText}
          </p>
        </div>
      </div>
    </div>
  )
}

function CompleteStep({
  lesson,
  result,
  onRestart,
}: {
  lesson: GuidedLesson
  result: ReviewStepResult
  onRestart: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)]">
        <CheckCircle2 className="h-7 w-7 text-[var(--accent)]" />
      </div>
      <div>
        <h3 className="text-3xl font-semibold text-[var(--text-primary)]">
          {t('today.completion.title')}
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.completion.summary', {
            correct: result.reviewCorrect,
            total: result.reviewTotal,
          })}
        </p>
      </div>
      <div className="mx-auto w-full max-w-xl rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] p-4 text-left">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {t('today.nextLesson')}
        </p>
        <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
          {lesson.nextLessonTeaser.title}
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {lesson.nextLessonTeaser.situation}
        </p>
      </div>
      <div>
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          {t('today.restartLesson')}
        </Button>
      </div>
    </div>
  )
}

function typeWasWrong(
  step: SessionStep,
  typeState: TypeRecallCheckState,
) {
  return step === 'type' && typeState.status === 'wrong'
}
