import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setIOSAudioSessionType } from '@/lib/grokIOSAudioDiagnostics'
import { ensureNativeMicrophonePermission } from '@/lib/nativeMicrophone'
import { publicApiUrl } from '@/lib/publicOrigins'
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
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef('')
  const stopTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const discardRecordingRef = useRef(false)

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

  const reset = useCallback(() => {
    clearStopTimer()
    chunksRef.current = []
    setTranscript('')
    setError(null)
    setStatus('idle')
  }, [clearStopTimer])

  const stopRecording = useCallback(() => {
    clearStopTimer()
    const recorder = mediaRecorderRef.current
    if (recorder?.state === 'recording') {
      recorder.stop()
    }
  }, [clearStopTimer])

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < MIN_AUDIO_BYTES) {
      throw new Error('Keine verwertbare Aufnahme erkannt. Bitte versuche es noch einmal.')
    }

    const audio_base64 = await blobToBase64(audioBlob)
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !data.session?.access_token) {
      throw new Error('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.')
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 20000)
    try {
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
        signal: controller.signal,
      })

      const payload = await response.json().catch(() => ({})) as GuidedTranscribeResponse
      if (!response.ok) {
        throw new Error(payload.error ?? payload.detail ?? 'Transkription fehlgeschlagen.')
      }

      return payload.transcript?.trim() ?? ''
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Transkription hat zu lange gedauert. Bitte versuche es erneut.')
      }
      throw err
    } finally {
      window.clearTimeout(timer)
    }
  }, [language])

  const startRecording = useCallback(async () => {
    if (!canUseGuidedSpeechRecognition()) {
      setError('Audioaufnahme ist in diesem Browser nicht verfuegbar.')
      setStatus('error')
      return
    }
    if (mediaRecorderRef.current?.state === 'recording') return

    reset()
    setStatus('requesting_permission')

    try {
      setIOSAudioSessionType('play-and-record', 'guided-today-before-getUserMedia')
      await ensureNativeMicrophonePermission()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
        setError('Aufnahme fehlgeschlagen. Bitte versuche es erneut.')
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
        setStatus('transcribing')
        void transcribeAudio(audioBlob)
          .then((nextTranscript) => {
            if (!mountedRef.current) return
            setTranscript(nextTranscript)
            setStatus('checked')
          })
          .catch((err) => {
            if (!mountedRef.current) return
            setError(err instanceof Error ? err.message : 'Transkription fehlgeschlagen.')
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
      clearStopTimer()
      releaseStream()
      mediaRecorderRef.current = null
      setError(getMicrophoneErrorMessage(err))
      setStatus('error')
    }
  }, [clearStopTimer, maxRecordingSeconds, releaseStream, reset, stopRecording, transcribeAudio])

  useEffect(() => () => {
    mountedRef.current = false
    clearStopTimer()
    if (mediaRecorderRef.current?.state === 'recording') {
      discardRecordingRef.current = true
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    releaseStream()
  }, [clearStopTimer, releaseStream])

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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(new Error('Audio konnte nicht gelesen werden.'))
    reader.readAsDataURL(blob)
  })
}

function getMicrophoneErrorMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    return 'Mikrofonzugriff blockiert. Bitte erlaube das Mikrofon im Browser.'
  }
  if (err instanceof DOMException && err.name === 'NotFoundError') {
    return 'Kein Mikrofon gefunden.'
  }
  return 'Mikrofon konnte nicht gestartet werden. Bitte pruefe die Browser- oder Geraeteeinstellungen.'
}

function isLikelySafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    || /iPad|iPhone|iPod/.test(navigator.userAgent)
}
