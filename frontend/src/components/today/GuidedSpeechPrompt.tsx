import { AlertCircle, CheckCircle2, Eye, Loader2, Mic, Square, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { checkGuidedSpeechAnswer, type GuidedSpeechCheckResult } from '@/lib/guidedSpeechCheck'
import { canUseGuidedSpeechRecognition, useGuidedSpeechRecognition } from '@/hooks/useGuidedSpeechRecognition'
import type { GuidedSpeakLocale } from '@/data/guidedLessons'

export type GuidedSpeechPromptCheckState = {
  status: 'idle' | 'requesting_permission' | 'recording' | 'transcribing' | 'passed' | 'close' | 'failed' | 'continued' | 'unsupported' | 'error'
  attempts: number
  transcriptMatch: number
  passed: boolean
}

type GuidedSpeechPromptProps = {
  prompt: string
  cueText: string
  cueLabel?: string
  targetAnswer: string
  displayAnswer?: string
  acceptedAnswers?: string[]
  requiredTokens?: string[]
  optionalTokens?: string[]
  language: GuidedSpeakLocale
  maxRecordingSeconds?: number
  showHintButton?: boolean
  cueCardClassName?: string
  cueTextClassName?: string
  onCheckStateChange: (state: GuidedSpeechPromptCheckState) => void
  onContinueAnyway?: () => void
  allowContinueWhenUnsupported?: boolean
}

export function GuidedSpeechPrompt({
  prompt,
  cueText,
  cueLabel,
  targetAnswer,
  displayAnswer,
  acceptedAnswers,
  requiredTokens,
  optionalTokens,
  language,
  maxRecordingSeconds,
  showHintButton = true,
  cueCardClassName,
  cueTextClassName,
  onCheckStateChange,
  onContinueAnyway,
  allowContinueWhenUnsupported = false,
}: GuidedSpeechPromptProps) {
  const { t } = useTranslation()
  const attemptsRef = useRef(0)
  const statusRef = useRef<GuidedSpeechPromptCheckState['status']>(canUseGuidedSpeechRecognition() ? 'idle' : 'unsupported')
  const [status, setStatus] = useState<GuidedSpeechPromptCheckState['status']>(statusRef.current)
  const [transcriptMatch, setTranscriptMatch] = useState(0)
  const [checkResult, setCheckResult] = useState<GuidedSpeechCheckResult | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const speech = useGuidedSpeechRecognition({ language, maxRecordingSeconds })
  const isSupported = speech.isSupported

  const updateStatus = (nextStatus: GuidedSpeechPromptCheckState['status']) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }

  const publishState = (
    nextStatus: GuidedSpeechPromptCheckState['status'],
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
      targetAnswer,
      acceptedAnswers,
      requiredTokens,
      optionalTokens,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- finishAttempt intentionally captures current prompt config and attempt refs.
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
    onContinueAnyway?.()
  }

  const feedbackVisible = status === 'passed' || status === 'close' || status === 'failed' || status === 'continued'
  const hintButtonLabel = hintVisible
    ? t('today.speak.hideHint')
    : isSupported
      ? t('today.speak.showHint')
      : t('today.speak.showSentence')
  const isRecording = speech.status === 'recording'
  const isBusy = speech.status === 'requesting_permission' || speech.status === 'transcribing'
  const expectedAnswer = displayAnswer ?? targetAnswer
  const transcriptFeedbackVisible = Boolean(feedbackVisible && speech.transcript)
  const transcriptFeedbackLabel = status === 'passed'
    ? t('today.speak.passed')
    : status === 'close'
      ? t('today.speak.close')
      : status === 'continued'
        ? t('today.speak.continued')
        : t('today.speak.failed')
  const canShowContinueAnyway = status === 'failed'
    || status === 'close'
    || status === 'error'
    || (allowContinueWhenUnsupported && status === 'unsupported')

  return (
    <div className="grid justify-items-center gap-5 text-center">
      <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
        {prompt}
      </p>

      <div className={cn('w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4', cueCardClassName)}>
        {cueLabel && (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {cueLabel}
          </p>
        )}
        <p className={cn('mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl', !cueLabel && 'mt-0', cueTextClassName)}>
          {cueText}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {showHintButton && (
          <Button type="button" variant="outline" onClick={() => setHintVisible((current) => !current)}>
            <Eye className="h-4 w-4" />
            {hintButtonLabel}
          </Button>
        )}
        {isSupported && (
          <div className="today-speak-recordingControl">
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
                <Square className="h-3.5 w-3.5 fill-current" />
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
            <span className="today-speak-recordingDotSlot" aria-hidden="true">
              <span className={cn('today-speak-recordingDot', !isRecording && 'today-speak-recordingDot--idle')} />
            </span>
          </div>
        )}
      </div>

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
        <div
          className={cn(
            'today-speak-transcriptCard w-full max-w-2xl rounded-lg border p-4 text-left',
            status === 'passed' && 'today-speak-transcriptCard--passed',
            status === 'close' && 'today-speak-transcriptCard--close',
            (status === 'failed' || status === 'continued') && 'today-speak-transcriptCard--failed',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t('today.speak.heardLabel')}
            </p>
            {transcriptFeedbackVisible && (
              <span
                className={cn(
                  'today-speak-transcriptResult inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                  status === 'passed' && 'today-speak-transcriptResult--passed',
                  status === 'close' && 'today-speak-transcriptResult--close',
                  (status === 'failed' || status === 'continued') && 'today-speak-transcriptResult--failed',
                )}
              >
                {status === 'passed' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : status === 'close' ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                {transcriptFeedbackLabel}
              </span>
            )}
          </div>
          <p className="mt-2 break-words text-base leading-7 text-[var(--text-primary)]">
            &quot;{speech.transcript}&quot;
          </p>
        </div>
      )}

      {(status === 'failed' || status === 'close') && checkResult && (
        <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.speak.expected', { answer: expectedAnswer })}
        </p>
      )}

      {canShowContinueAnyway && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={handleContinueAnyway}>
            {t('today.speak.continueAnyway')}
          </Button>
        </div>
      )}
    </div>
  )
}
