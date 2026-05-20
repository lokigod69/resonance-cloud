import { AlertCircle, Eye, Loader2, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { checkGuidedSpeechAnswer } from '@/lib/guidedSpeechCheck'
import { canUseGuidedSpeechRecognition, useGuidedSpeechRecognition } from '@/hooks/useGuidedSpeechRecognition'
import type { GuidedSpeakLocale } from '@/data/guidedLessons'

const TODAY_SPEECH_MIC_ASSET = '/guided/today/speech-microphone-orb.png'

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

  const handleTryAgain = () => {
    speech.reset()
    setTranscriptMatch(0)
    updateStatus(isSupported ? 'idle' : 'unsupported')
    publishState(isSupported ? 'idle' : 'unsupported', attemptsRef.current, 0)
  }

  const feedbackVisible = status === 'passed' || status === 'close' || status === 'failed' || status === 'continued'
  const hintButtonLabel = isSupported ? t('today.speak.showHint') : t('today.speak.showSentence')
  const isRecording = speech.status === 'recording'
  const isBusy = speech.status === 'requesting_permission' || speech.status === 'transcribing'
  const expectedAnswer = displayAnswer ?? targetAnswer
  const resultVisible = Boolean(feedbackVisible && speech.transcript)
  const canRetry = status === 'failed' || status === 'close' || status === 'error'
  const transcriptFeedbackLabel = status === 'passed'
    ? t('today.speak.passed')
    : status === 'close'
      ? t('today.speak.close')
      : status === 'continued'
      ? t('today.speak.continued')
      : t('today.speak.failed')
  const canShowContinueAnyway = allowContinueWhenUnsupported && status === 'unsupported'

  return (
    <div className="today-speech-prompt grid justify-items-center gap-5 text-center" data-speech-state={status}>
      <p className="today-step-prompt max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
        {prompt}
      </p>

      <div className={cn('today-speech-cueCard w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4', cueCardClassName)}>
        {cueLabel && (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {cueLabel}
          </p>
        )}
        <p className={cn('mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl', !cueLabel && 'mt-0', cueTextClassName)}>
          {cueText}
        </p>
      </div>

      <div className="today-speech-orbStage" data-result-visible={resultVisible}>
        {resultVisible ? (
          <div className="today-speech-resultStage" aria-live="polite">
            <p className="today-speech-resultLabel">
              {transcriptFeedbackLabel}
            </p>
            <p className="today-speech-resultPhrase">
              {expectedAnswer}
            </p>
            <p className="today-speech-heardLine">
              {t('today.speak.heardLabel')}: &quot;{speech.transcript}&quot;
            </p>
            {canRetry && (
              <Button type="button" variant="outline" className="today-speech-retryButton" onClick={handleTryAgain}>
                {t('speak.tapRetry')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <img
              src={TODAY_SPEECH_MIC_ASSET}
              alt=""
              className="today-speech-micAsset"
              draggable={false}
              aria-hidden="true"
            />
            {isSupported && (
              <div className="today-speak-recordingControl">
                <button
                  type="button"
                  className={cn('today-speech-primaryAction', isRecording && 'today-speak-recordingButton')}
                  data-recording={isRecording}
                  onClick={isRecording ? handleStop : handleStart}
                  disabled={isBusy}
                  aria-label={speech.status === 'requesting_permission'
                    ? t('today.speak.requestingPermission')
                    : speech.status === 'transcribing'
                      ? t('today.speak.transcribing')
                      : isRecording
                        ? t('today.speak.stopRecording')
                        : t('today.speak.startRecording')}
                >
                  {speech.status === 'transcribing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <span className="today-speech-buttonHotspot" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {speech.status === 'requesting_permission'
                      ? t('today.speak.requestingPermission')
                      : speech.status === 'transcribing'
                        ? t('today.speak.transcribing')
                        : isRecording
                          ? t('today.speak.stopRecording')
                          : t('today.speak.startRecording')}
                  </span>
                </button>
              </div>
            )}
            {!isSupported && (
              <span className="today-speech-primaryAction today-speech-primaryAction--unsupported" aria-hidden="true">
                <Mic className="h-5 w-5" />
              </span>
            )}
            <p className="today-speech-actionHint">
              {speech.status === 'requesting_permission'
                    ? t('today.speak.requestingPermission')
                    : speech.status === 'transcribing'
                      ? t('today.speak.transcribing')
                      : isRecording
                        ? t('today.speak.stopRecording')
                        : t('today.speak.startRecording')}
            </p>
          </>
        )}
      </div>

      <div className="today-speech-secondaryActions flex flex-wrap items-center justify-center gap-3">
        {showHintButton && !hintVisible && (
          <Button type="button" variant="outline" onClick={() => setHintVisible(true)}>
            <Eye className="h-4 w-4" />
            {hintButtonLabel}
          </Button>
        )}
        {showHintButton && hintVisible && (
          <div className="today-speech-hint inline-flex w-fit max-w-full rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
            {expectedAnswer}
          </div>
        )}
      </div>

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
