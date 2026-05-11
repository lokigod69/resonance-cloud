import { CheckCircle2, Eye, Mic, MicOff, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GuidedLesson } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  canUseBrowserSpeechRecognition,
  createBrowserSpeechRecognizer,
  getSpeechWordOverlap,
  type BrowserSpeechRecognizer,
} from '@/components/today/speechRecognition'

export type SpeakCheckState = {
  status: 'idle' | 'listening' | 'passed' | 'failed' | 'continued' | 'unsupported'
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
  const recognitionRef = useRef<BrowserSpeechRecognizer | null>(null)
  const attemptsRef = useRef(0)
  const statusRef = useRef<SpeakCheckState['status']>(canUseBrowserSpeechRecognition() ? 'idle' : 'unsupported')
  const [status, setStatus] = useState<SpeakCheckState['status']>(statusRef.current)
  const [transcript, setTranscript] = useState('')
  const [transcriptMatch, setTranscriptMatch] = useState(0)
  const [hintVisible, setHintVisible] = useState(false)
  const isSupported = canUseBrowserSpeechRecognition()

  useEffect(() => () => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
  }, [])

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
    const nextMatch = getSpeechWordOverlap(nextTranscript, lesson.speak.targetPhrase)
    const nextStatus = nextMatch >= lesson.speak.passingThreshold ? 'passed' : 'failed'

    attemptsRef.current = nextAttempts
    setTranscript(nextTranscript)
    setTranscriptMatch(nextMatch)
    updateStatus(nextStatus)
    publishState(nextStatus, nextAttempts, nextMatch)
  }

  const handleRecognitionError = () => {
    const nextAttempts = attemptsRef.current + 1
    attemptsRef.current = nextAttempts
    setTranscriptMatch(0)
    updateStatus('failed')
    publishState('failed', nextAttempts, 0)
  }

  const handleStart = () => {
    const recognizer = createBrowserSpeechRecognizer({
      lang: lesson.speak.language,
      onResult: finishAttempt,
      onError: handleRecognitionError,
      onEnd: () => {
        if (statusRef.current === 'listening') {
          updateStatus('idle')
        }
      },
    })

    if (!recognizer) {
      updateStatus('unsupported')
      publishState('unsupported')
      return
    }

    recognitionRef.current = recognizer
    setTranscript('')
    setTranscriptMatch(0)
    updateStatus('listening')
    try {
      recognizer.start()
    } catch {
      handleRecognitionError()
    }
  }

  const handleStop = () => {
    recognitionRef.current?.stop()
  }

  const handleContinueAnyway = () => {
    updateStatus('continued')
    publishState('continued')
  }

  const feedbackVisible = status === 'passed' || status === 'failed' || status === 'continued'
  const hintButtonLabel = hintVisible
    ? t('today.speak.hideHint')
    : isSupported
      ? t('today.speak.showHint')
      : t('today.speak.showSentence')

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
          {lesson.speak.baseCue}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={() => setHintVisible((current) => !current)}>
          <Eye className="h-4 w-4" />
          {hintButtonLabel}
        </Button>
        {isSupported && (
          <Button type="button" onClick={status === 'listening' ? handleStop : handleStart}>
            {status === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {status === 'listening' ? t('today.speak.stopRecording') : t('today.speak.startRecording')}
          </Button>
        )}
      </div>

      {hintVisible && (
        <div className="inline-flex w-fit max-w-full rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
          {lesson.speak.targetPhrase}
        </div>
      )}

      {!isSupported && (
        <div className="grid gap-3 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          <p>{t('today.speak.unsupported')}</p>
        </div>
      )}

      {transcript && (
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.speak.heard', { transcript })}
        </p>
      )}

      {feedbackVisible && (
        <div
          className={cn(
            'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
            status === 'passed'
              ? 'border-[color-mix(in_srgb,#34d399_54%,transparent)] bg-[color-mix(in_srgb,#34d399_13%,transparent)] text-[var(--text-primary)]'
              : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] text-[var(--text-secondary)]',
          )}
        >
          {status === 'passed' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34d399]" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          )}
          <span>
            {status === 'passed'
              ? t('today.speak.passed')
              : status === 'continued'
                ? t('today.speak.continued')
                : t('today.speak.failed')}
          </span>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={handleContinueAnyway}>
            {t('today.speak.continueAnyway')}
          </Button>
        </div>
      )}
    </div>
  )
}
