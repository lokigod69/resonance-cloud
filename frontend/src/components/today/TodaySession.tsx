import { ChevronRight, Trophy, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { getGuidedMatchPairs, type GuidedLesson } from '@/data/guidedLessons'
import { guidedVibes } from '@/data/guidedVibes'
import type { TodayLessonResult } from '@/lib/todayProgress'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LessonMediaFrame } from '@/components/today/TodayHero'
import { MatchPairsStep } from '@/components/today/MatchPairsStep'
import { BuildPhraseStep, type BuildPhraseCheckState } from '@/components/today/BuildPhraseStep'
import { TypeRecallStep, type TypeRecallCheckState } from '@/components/today/TypeRecallStep'
import { SpeakStep, type SpeakCheckState } from '@/components/today/SpeakStep'
import { speakGuidedText } from '@/components/today/speech'
import { canUseGuidedSpeechRecognition } from '@/hooks/useGuidedSpeechRecognition'
import { TODAY_SESSION_STEPS } from '@/components/today/sessionSteps'

type TodaySessionProps = {
  lesson: GuidedLesson
  nextLesson?: GuidedLesson
  knownItemIds: Set<string>
  onComplete: (result: TodayLessonResult) => void
  onViewPath: () => void
  onOpenNextLesson: () => void
}

export function TodaySession({
  lesson,
  nextLesson,
  knownItemIds,
  onComplete,
  onViewPath,
  onOpenNextLesson,
}: TodaySessionProps) {
  const { t } = useTranslation()
  const matchPairs = getGuidedMatchPairs(lesson)
  const [stepIndex, setStepIndex] = useState(0)
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(() => new Set())
  const [buildState, setBuildState] = useState<BuildPhraseCheckState>({ status: 'idle', attempts: 0 })
  const [typeState, setTypeState] = useState<TypeRecallCheckState>({ status: 'idle', attempts: 0, usedFallback: false })
  const [speakState, setSpeakState] = useState<SpeakCheckState>(() => ({
    status: canUseGuidedSpeechRecognition() ? 'idle' : 'unsupported',
    attempts: 0,
    transcriptMatch: 0,
    passed: false,
  }))
  const step = TODAY_SESSION_STEPS[stepIndex]
  const progress = Math.round(((stepIndex + 1) / TODAY_SESSION_STEPS.length) * 100)

  const canContinue =
    step === 'scene'
    || (step === 'matchPairs' && matchedPairIds.size === matchPairs.length)
    || (step === 'build' && buildState.status === 'correct')
    || (step === 'type' && typeState.status !== 'idle')
    || (step === 'speak' && canContinueFromSpeak(speakState))

  const handleNext = () => {
    if (!canContinue) return

    if (step === 'speak') {
      completeLesson()
      return
    }

    setStepIndex((current) => Math.min(current + 1, TODAY_SESSION_STEPS.length - 1))
  }

  const completeLesson = () => {
    const completedResult: TodayLessonResult = {
      buildAttempts: buildState.attempts,
      typeAttempts: typeState.attempts,
      typeUsedFallback: typeState.usedFallback,
      speakAttempts: speakState.attempts,
      speakTranscriptMatch: speakState.transcriptMatch,
      speakPassed: speakState.passed,
      knownMarkedCount: knownItemIds.size,
    }
    onComplete(completedResult)
    setStepIndex(TODAY_SESSION_STEPS.indexOf('complete'))
  }

  return (
    <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <div className="mb-6 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {t('today.lessonInProgress')}
            </h2>
          </div>
          <span className="text-sm text-[var(--text-muted)]">
            {t('today.progressLabel', { current: stepIndex + 1, total: TODAY_SESSION_STEPS.length })}
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
        {step === 'speak' && (
          <SpeakStep lesson={lesson} onCheckStateChange={setSpeakState} />
        )}
        {step === 'complete' && (
          <CompleteStep
            lesson={lesson}
            nextLesson={nextLesson}
            onViewPath={onViewPath}
            onOpenNextLesson={onOpenNextLesson}
          />
        )}
      </div>

      {step !== 'complete' && (
        <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-5">
          <Button onClick={handleNext} disabled={!canContinue}>
            {t('today.continue')}
            <ChevronRight className="h-4 w-4" />
          </Button>
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
              onClick={() => speakGuidedText(lesson.corePhrase.targetText, lesson.speak.language)}
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
  nextLesson,
  onViewPath,
  onOpenNextLesson,
}: {
  lesson: GuidedLesson
  nextLesson?: GuidedLesson
  onViewPath: () => void
  onOpenNextLesson: () => void
}) {
  const { t } = useTranslation()
  const vibe = guidedVibes[lesson.vibeId]

  return (
    <div className="grid gap-5 text-center">
      <div className="today-completion-vibeBadge mx-auto" aria-label={vibe.label}>
        {guidedVibes[lesson.vibeId].emblem?.url && (
          <img
            src={guidedVibes[lesson.vibeId].emblem?.url}
            alt=""
            className="today-completion-vibeBadgeImage"
            draggable={false}
          />
        )}
      </div>
      <div>
        <h3 className="text-3xl font-semibold text-[var(--text-primary)]">
          {t('today.completion.title')}
        </h3>
      </div>
      <div className="today-trophy-panel mx-auto w-full max-w-sm rounded-lg border border-[color-mix(in_srgb,var(--accent)_42%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <Trophy className="h-4 w-4 text-[var(--accent)]" />
          {t('today.trophyWord.title')}
        </p>
        <div className="mt-3">
          <p className="break-words text-4xl font-semibold leading-tight text-[var(--text-primary)]">
            {lesson.trophyWord.word}
          </p>
          <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">
            {lesson.trophyWord.meaning}
          </p>
          {lesson.trophyWord.example && (
            <p className="mt-2 break-words text-xs leading-5 text-[var(--text-muted)]">
              {lesson.trophyWord.example}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {nextLesson ? (
          <Button onClick={onOpenNextLesson}>
            {t('today.nextLesson')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onViewPath}>
            {t('today.path.backToPath')}
          </Button>
        )}
        {nextLesson && (
          <Button variant="outline" onClick={onViewPath}>
            {t('today.path.backToPath')}
          </Button>
        )}
      </div>
    </div>
  )
}

function canContinueFromSpeak(speakState: SpeakCheckState) {
  return speakState.status === 'passed'
    || speakState.status === 'continued'
    || speakState.status === 'unsupported'
}
