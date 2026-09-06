import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setIOSAudioSessionType } from '@/lib/grokIOSAudioDiagnostics'
import { ensureNativeMicrophonePermission } from '@/lib/nativeMicrophone'
import { publicApiUrl } from '@/lib/publicOrigins'
import { assertClientActive, withClientDeadline } from '@/lib/clientDeadline'
import type { GuidedSpeakLocale } from '@/data/guidedLessons'

export type GuidedSpeechRecognitionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'transcribing'
  | 'checked'
  | 'error'

export type UseGuidedSpeechRecognitionOptions = {
  language: GuidedSpeakLocale
  maxRecordingSeconds?: number
}

type GuidedTranscribeResponse = {
  transcript?: string
  error?: string
  detail?: string
}

const DEFAULT_MAX_RECORDING_SECONDS = 12
const MIN_AUDIO_BYTES = 100
const TRANSCRIPTION_TIMEOUT_MS = 20000

export type GuidedSpeechErrorKey =
  | 'today.speak.error.recordingTooShort'
  | 'today.speak.error.sessionExpired'
  | 'today.speak.error.quotaReached'
  | 'today.speak.error.transcriptionFailed'
  | 'today.speak.error.transcriptionTimeout'
  | 'today.speak.error.recordingFailed'
  | 'today.speak.error.microphoneBlocked'
  | 'today.speak.error.microphoneMissing'
  | 'today.speak.error.microphoneFailed'
  | 'today.speak.error.audioReadFailed'

class GuidedSpeechError extends Error {
  constructor(readonly translationKey: GuidedSpeechErrorKey) {
    super(translationKey)
  }
}

export function canUseGuidedSpeechRecognition(): boolean {
  return typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined'
}

export function getGuidedSpeechMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = isLikelySafari()
    ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export function useGuidedSpeechRecognition(options: UseGuidedSpeechRecognitionOptions) {
  const { language, maxRecordingSeconds = DEFAULT_MAX_RECORDING_SECONDS } = options
  const [status, setStatus] = useState<GuidedSpeechRecognitionStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<GuidedSpeechErrorKey | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef('')
  const stopTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const discardRecordingRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)
  const operationIdRef = useRef(0)
  const languageRef = useRef(language)

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }, [])

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const cancelPendingRequest = useCallback(() => {
    operationIdRef.current += 1
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
  }, [])

  const reset = useCallback(() => {
    cancelPendingRequest()
    clearStopTimer()
    chunksRef.current = []
    setTranscript('')
    setError(null)
    setStatus('idle')
  }, [cancelPendingRequest, clearStopTimer])

  const stopRecording = useCallback(() => {
    clearStopTimer()
    const recorder = mediaRecorderRef.current
    if (recorder?.state === 'recording') {
      recorder.stop()
    }
  }, [clearStopTimer])

  const transcribeAudio = useCallback(async (audioBlob: Blob, callerSignal: AbortSignal) => {
    if (audioBlob.size < MIN_AUDIO_BYTES) {
      throw new GuidedSpeechError('today.speak.error.recordingTooShort')
    }

    try {
      return await withClientDeadline(async (signal) => {
        const audio_base64 = await blobToBase64(audioBlob, signal)
        assertClientActive(signal)
        const { data, error: sessionError } = await supabase.auth.getSession()
        assertClientActive(signal)
        if (sessionError || !data.session?.access_token) {
          throw new GuidedSpeechError('today.speak.error.sessionExpired')
        }

        const response = await fetch(publicApiUrl('/api/guided-transcribe'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            audio_base64,
            mime_type: audioBlob.type || mimeTypeRef.current || 'audio/webm',
            language,
          }),
          signal,
        })

        const payload = await response.json().catch(() => ({})) as GuidedTranscribeResponse
        assertClientActive(signal)
        if (!response.ok) {
          if (response.status === 401) throw new GuidedSpeechError('today.speak.error.sessionExpired')
          if (response.status === 429) throw new GuidedSpeechError('today.speak.error.quotaReached')
          throw new GuidedSpeechError('today.speak.error.transcriptionFailed')
        }

        return payload.transcript?.trim() ?? ''
      }, TRANSCRIPTION_TIMEOUT_MS, callerSignal)
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new GuidedSpeechError('today.speak.error.transcriptionTimeout')
      }
      throw err
    }
  }, [language])

  const startRecording = useCallback(async () => {
    if (!canUseGuidedSpeechRecognition()) {
      setError('today.speak.error.microphoneFailed')
      setStatus('error')
      return
    }
    if (mediaRecorderRef.current?.state === 'recording') return

    reset()
    const operationId = operationIdRef.current
    setStatus('requesting_permission')

    try {
      setIOSAudioSessionType('play-and-record', 'guided-today-before-getUserMedia')
      await ensureNativeMicrophonePermission()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mountedRef.current || operationId !== operationIdRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const mimeType = getGuidedSpeechMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mimeTypeRef.current = recorder.mimeType || mimeType || 'audio/webm'
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onerror = () => {
        if (!mountedRef.current || operationId !== operationIdRef.current) return
        setError('today.speak.error.recordingFailed')
        setStatus('error')
        mediaRecorderRef.current = null
        releaseStream()
      }

      recorder.onstop = () => {
        clearStopTimer()
        const shouldDiscard = discardRecordingRef.current
        discardRecordingRef.current = false
        const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
        chunksRef.current = []
        releaseStream()
        mediaRecorderRef.current = null
        if (shouldDiscard) return
        const requestController = new AbortController()
        requestControllerRef.current?.abort()
        requestControllerRef.current = requestController
        setStatus('transcribing')
        void transcribeAudio(audioBlob, requestController.signal)
          .then((nextTranscript) => {
            if (!mountedRef.current || requestController.signal.aborted || operationId !== operationIdRef.current) return
            requestControllerRef.current = null
            setTranscript(nextTranscript)
            setStatus('checked')
          })
          .catch((err) => {
            if (!mountedRef.current || requestController.signal.aborted || operationId !== operationIdRef.current) return
            requestControllerRef.current = null
            setError(err instanceof GuidedSpeechError ? err.translationKey : 'today.speak.error.transcriptionFailed')
            setStatus('error')
          })
      }

      mediaRecorderRef.current = recorder
      if (isLikelySafari()) {
        recorder.start()
      } else {
        recorder.start(250)
      }
      setStatus('recording')
      stopTimerRef.current = window.setTimeout(() => {
        stopRecording()
      }, Math.max(1, maxRecordingSeconds) * 1000)
    } catch (err) {
      if (!mountedRef.current || operationId !== operationIdRef.current) return
      clearStopTimer()
      releaseStream()
      mediaRecorderRef.current = null
      setError(getMicrophoneErrorMessage(err))
      setStatus('error')
    }
  }, [clearStopTimer, maxRecordingSeconds, releaseStream, reset, stopRecording, transcribeAudio])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cancelPendingRequest()
      clearStopTimer()
      if (mediaRecorderRef.current?.state === 'recording') {
        discardRecordingRef.current = true
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
      releaseStream()
    }
  }, [cancelPendingRequest, clearStopTimer, releaseStream])

  useEffect(() => {
    if (languageRef.current === language) return
    languageRef.current = language
    cancelPendingRequest()
    clearStopTimer()
    if (mediaRecorderRef.current?.state === 'recording') {
      discardRecordingRef.current = true
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    releaseStream()
    chunksRef.current = []
    // A language switch invalidates both the external recorder and its UI result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranscript('')
    setError(null)
    setStatus('idle')
  }, [cancelPendingRequest, clearStopTimer, language, releaseStream])

  return {
    status,
    transcript,
    error,
    isSupported: canUseGuidedSpeechRecognition(),
    startRecording,
    stopRecording,
    reset,
  }
}

function blobToBase64(blob: Blob, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const onAbort = () => {
      reader.abort()
      reject((signal as AbortSignal & { reason?: unknown }).reason ?? new DOMException('Request cancelled', 'AbortError'))
    }
    reader.onloadend = () => {
      signal.removeEventListener('abort', onAbort)
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => {
      signal.removeEventListener('abort', onAbort)
      reject(new GuidedSpeechError('today.speak.error.audioReadFailed'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
      return
    }
    reader.readAsDataURL(blob)
  })
}

function getMicrophoneErrorMessage(err: unknown): GuidedSpeechErrorKey {
  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    return 'today.speak.error.microphoneBlocked'
  }
  if (err instanceof DOMException && err.name === 'NotFoundError') {
    return 'today.speak.error.microphoneMissing'
  }
  return 'today.speak.error.microphoneFailed'
}

function isLikelySafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    || /iPad|iPhone|iPod/.test(navigator.userAgent)
}
