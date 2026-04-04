import { useState, useRef, useCallback, useEffect } from 'react'

export type TutorStatus = 'idle' | 'recording' | 'processing' | 'playing' | 'error'

export interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
}

interface VoiceChatResponse {
  user_text: string
  ai_text: string
  audio_base64: string
  audio_format: string
}

export interface UseVoiceTutorReturn {
  language: string | null
  status: TutorStatus
  messages: TutorMessage[]
  error: string | null
  isSupported: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
  initConversation: (lang: string) => Promise<void>
  resetConversation: () => void
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function playAudioBase64(base64: string, format: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: `audio/${format}` })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Audio playback failed'))
    }
    audio.play().catch(reject)
  })
}

function getMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export function useVoiceTutor(): UseVoiceTutorReturn {
  const [language, setLanguage] = useState<string | null>(null)
  const [status, setStatus] = useState<TutorStatus>('idle')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // Mirror messages in a ref so callbacks always have fresh data
  const messagesRef = useRef<TutorMessage[]>([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'

  const callVoiceChat = useCallback(
    async (audio_base64: string | null, lang: string): Promise<VoiceChatResponse> => {
      const res = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64,
          language: lang,
          history: messagesRef.current.slice(-20),
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errJson.error ?? `HTTP ${res.status}`)
      }

      return res.json()
    },
    [],
  )

  const initConversation = useCallback(
    async (lang: string) => {
      setLanguage(lang)
      setMessages([])
      messagesRef.current = []
      setError(null)
      setStatus('processing')

      try {
        const data = await callVoiceChat(null, lang)

        const assistantMsg: TutorMessage = { role: 'assistant', content: data.ai_text }
        setMessages([assistantMsg])

        setStatus('playing')
        await playAudioBase64(data.audio_base64, data.audio_format)
        setStatus('idle')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start conversation'
        setError(msg)
        setStatus('error')
      }
    },
    [callVoiceChat],
  )

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported in this browser. Please try Chrome or Safari.')
      setStatus('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = getMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop mic tracks after recording ends
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        chunksRef.current = []

        const currentLang = language
        if (!currentLang) return

        setStatus('processing')

        try {
          const audio_base64 = await blobToBase64(audioBlob)
          const data = await callVoiceChat(audio_base64, currentLang)

          setMessages((prev) => {
            const next = [...prev]
            if (data.user_text) next.push({ role: 'user', content: data.user_text })
            next.push({ role: 'assistant', content: data.ai_text })
            return next
          })

          setStatus('playing')
          await playAudioBase64(data.audio_base64, data.audio_format)
          setStatus('idle')
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Something went wrong. Tap to try again.'
          setError(msg)
          setStatus('error')
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setError(null)
      setStatus('recording')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.')
      } else {
        setError('Could not access microphone. Please check your device settings.')
      }
      setStatus('error')
    }
  }, [isSupported, language, callVoiceChat])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    mediaRecorderRef.current = null
  }, [])

  const resetConversation = useCallback(() => {
    // Stop any active recording
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    mediaRecorderRef.current = null

    // Stop mic stream
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    setLanguage(null)
    setMessages([])
    messagesRef.current = []
    setError(null)
    setStatus('idle')
  }, [])

  return {
    language,
    status,
    messages,
    error,
    isSupported,
    startRecording,
    stopRecording,
    initConversation,
    resetConversation,
  }
}
