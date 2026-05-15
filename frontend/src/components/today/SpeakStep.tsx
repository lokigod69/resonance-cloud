import { AlertCircle, CheckCircle2, Eye, Loader2, Mic, MicOff, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GuidedLesson } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { checkGuidedSpeechAnswer, type GuidedSpeechCheckResult } from '@/lib/guidedSpeechCheck'
import { canUseGuidedSpeechRecognition, useGuidedSpeechRecognition } from '@/hooks/useGuidedSpeechRecognition'

export type SpeakCheckState = {
  status: 'idle' | 'requesting_permission' | 'recording' | 'transcribing' | 'passed' | 'close' | 'failed' | 'continued' | 'unsupported' | 'error'
  attempts: number
  transcriptMatch: number
  passed: boolean
}

type SpeakStepProps = {
  lesson: GuidedLesson
  onCheckStateChange: (state: SpeakCheckState) => void
}

export function SpeakStep({ lesson, onCheckStateChange }: SpeakStepProps) {
  const { t } = useTranslation()
  const attemptsRef = useRef(0)
  const statusRef = useRef<SpeakCheckState['status']>(canUseGuidedSpeechRecognition() ? 'idle' : 'unsupported')
  const [status, setStatus] = useState<SpeakCheckState['status']>(statusRef.current)
  const [transcriptMatch, setTranscriptMatch] = useState(0)
  const [checkResult, setCheckResult] = useState<GuidedSpeechCheckResult | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const speech = useGuidedSpeechRecognition({
    language: lesson.speak.language,
    maxRecordingSeconds: lesson.speak.maxRecordingSeconds,
  })
  const isSupported = speech.isSupported

  const updateStatus = (nextStatus: SpeakCheckState['status']) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }

  const publishState = (
    nextStatus: SpeakCheckState['status'],
    nextAttempts = attemptsRef.current,
    nextMatch = transcriptMatch,
  ) => {
    onCheckStateChange({
      status: nextStatus,
      attempts: nextAttempts,
      transcriptMatch: nextMatch,
      passed: nextStatus === 'passed',
    })
  }

  const finishAttempt = (nextTranscript: string) => {
    const nextAttempts = attemptsRef.current + 1
    const nextCheckResult = checkGuidedSpeechAnswer({
      transcript: nextTranscript,
      targetAnswer: lesson.speak.targetAnswer ?? lesson.speak.targetPhrase,
      acceptedAnswers: lesson.speak.acceptedAnswers,
      requiredTokens: lesson.speak.requiredTokens,
      optionalTokens: lesson.speak.optionalTokens,
    })
    const nextMatch = nextCheckResult.score
    const nextStatus = nextCheckResult.status === 'correct'
      ? 'passed'
      : nextCheckResult.status === 'close'
        ? 'close'
        : 'failed'

    attemptsRef.current = nextAttempts
    setTranscriptMatch(nextMatch)
    setCheckResult(nextCheckResult)
    updateStatus(nextStatus)
    publishState(nextStatus, nextAttempts, nextMatch)
  }

  useEffect(() => {
    if (speech.status === 'requesting_permission' || speech.status === 'recording' || speech.status === 'transcribing') {
      updateStatus(speech.status)
      publishState(speech.status)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- publishState reads current attempt/match refs and would make this effect noisy.
  }, [speech.status])

  useEffect(() => {
    if (speech.status === 'checked') {
      finishAttempt(speech.transcript)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- finishAttempt intentionally captures current lesson and attempt refs.
  }, [speech.status, speech.transcript])

  useEffect(() => {
    if (speech.status === 'error') {
      updateStatus('error')
      publishState('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- publishState reads current attempt/match refs and would make this effect noisy.
  }, [speech.status])

  const handleStart = () => {
    if (!isSupported) {
      updateStatus('unsupported')
      publishState('unsupported')
      return
    }
    setTranscriptMatch(0)
    setCheckResult(null)
    void speech.startRecording()
  }

  const handleStop = () => {
    speech.stopRecording()
  }

  const handleContinueAnyway = () => {
    updateStatus('continued')
    publishState('continued')
  }

  const feedbackVisible = status === 'passed' || status === 'close' || status === 'failed' || status === 'continued'
  const hintButtonLabel = hintVisible
    ? t('today.speak.hideHint')
    : isSupported
      ? t('today.speak.showHint')
      : t('today.speak.showSentence')
  const isRecording = speech.status === 'recording'
  const isBusy = speech.status === 'requesting_permission' || speech.status === 'transcribing'
  const expectedAnswer = lesson.speak.targetAnswer ?? lesson.speak.targetPhrase

  return (
    <div className="grid justify-items-center gap-5 text-center">
      <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
        {t('today.speak.prompt')}
      </p>

      <div className="w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {t('today.speak.cueLabel')}
        </p>
        <p className="mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
          {lesson.speak.germanPrompt ?? lesson.speak.baseCue}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={() => setHintVisible((current) => !current)}>
          <Eye className="h-4 w-4" />
          {hintButtonLabel}
        </Button>
        {isSupported && (
          <Button
            type="button"
            variant={isRecording ? 'destructive' : 'default'}
            className={cn(isRecording && 'today-speak-recordingButton')}
            onClick={isRecording ? handleStop : handleStart}
            disabled={isBusy}
          >
            {speech.status === 'transcribing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {speech.status === 'requesting_permission'
              ? t('today.speak.requestingPermission')
              : speech.status === 'transcribing'
                ? t('today.speak.transcribing')
                : isRecording
                  ? t('today.speak.stopRecording')
                  : t('today.speak.startRecording')}
          </Button>
        )}
      </div>

      {isRecording && (
        <div className="today-speak-recordingStatus inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
          <span className="today-speak-recordingDot" aria-hidden="true" />
          {t('today.speak.recording')}
        </div>
      )}

      {hintVisible && (
        <div className="inline-flex w-fit max-w-full rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
          {expectedAnswer}
        </div>
      )}

      {!isSupported && (
        <div className="grid gap-3 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          <p>{t('today.speak.unsupported')}</p>
        </div>
      )}

      {speech.error && (
        <div className="inline-flex max-w-xl items-center gap-2 rounded-lg border border-[color-mix(in_srgb,#f59e0b_48%,var(--border-subtle))] bg-[color-mix(in_srgb,#f59e0b_12%,transparent)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#f59e0b]" />
          <span>{speech.error}</span>
        </div>
      )}

      {speech.transcript && (
        <div className="w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_62%,transparent)] p-4 text-left">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('today.speak.heardLabel')}
          </p>
          <p className="mt-2 break-words text-base leading-7 text-[var(--text-primary)]">
            &quot;{speech.transcript}&quot;
          </p>
        </div>
      )}

      {feedbackVisible && (
        <div
          className={cn(
            'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
            status === 'passed'
              ? 'border-[color-mix(in_srgb,#34d399_54%,transparent)] bg-[color-mix(in_srgb,#34d399_13%,transparent)] text-[var(--text-primary)]'
              : status === 'close'
                ? 'border-[color-mix(in_srgb,#f59e0b_54%,transparent)] bg-[color-mix(in_srgb,#f59e0b_12%,transparent)] text-[var(--text-primary)]'
              : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] text-[var(--text-secondary)]',
          )}
        >
          {status === 'passed' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34d399]" />
          ) : status === 'close' ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-[#f59e0b]" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          )}
          <span>
            {status === 'passed'
              ? t('today.speak.passed')
              : status === 'close'
                ? t('today.speak.close')
                : status === 'continued'
                ? t('today.speak.continued')
                : t('today.speak.failed')}
          </span>
        </div>
      )}

      {(status === 'failed' || status === 'close') && checkResult && (
        <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.speak.expected', { answer: expectedAnswer })}
        </p>
      )}

      {(status === 'failed' || status === 'close' || status === 'error') && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={handleContinueAnyway}>
            {t('today.speak.continueAnyway')}
          </Button>
        </div>
      )}
    </div>
  )
}
