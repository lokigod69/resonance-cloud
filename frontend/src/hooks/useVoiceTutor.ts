import { useState, useRef, useCallback, useEffect } from 'react'
import { type TutorVoice, getVoicesForLanguage } from '@/voiceRegistry'

export type TutorStatus = 'idle' | 'recording' | 'processing' | 'playing' | 'error'

export interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
  revealed: boolean
}

interface VoiceChatResponse {
  user_text: string
  ai_text: string
  audio_base64: string
  audio_format: string
}

export interface UseVoiceTutorReturn {
  language: string | null
  voice: TutorVoice | null
  status: TutorStatus
  messages: TutorMessage[]
  error: string | null
  isSupported: boolean
  pendingAudio: { base64: string; format: string } | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  selectLanguage: (lang: string) => void
  startConversation: (voice: TutorVoice) => Promise<void>
  changeVoice: () => void
  newChat: () => Promise<void>
  resetConversation: () => void
  playPendingAudio: () => Promise<void>
}

function saveVoicePreference(language: string, voiceId: string) {
  try {
    const prefs = JSON.parse(localStorage.getItem('voiceTutorPrefs') || '{}')
    prefs[language] = voiceId
    localStorage.setItem('voiceTutorPrefs', JSON.stringify(prefs))
  } catch {
    // localStorage unavailable
  }
}

function getSavedVoicePreference(language: string): string | null {
  try {
    const prefs = JSON.parse(localStorage.getItem('voiceTutorPrefs') || '{}')
    return prefs[language] || null
  } catch {
    return null
  }
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
    const mimeMap: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', pcm: 'audio/pcm' }
    const blob = new Blob([bytes], { type: mimeMap[format] || `audio/${format}` })
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
  const [voice, setVoice] = useState<TutorVoice | null>(null)
  const [status, setStatus] = useState<TutorStatus>('idle')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pendingAudio, setPendingAudio] = useState<{ base64: string; format: string } | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const messagesRef = useRef<TutorMessage[]>([])
  const voiceRef = useRef<TutorVoice | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    voiceRef.current = voice
  }, [voice])

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
    async (audio_base64: string | null, lang: string, v?: TutorVoice): Promise<VoiceChatResponse> => {
      const body: Record<string, unknown> = {
        audio_base64,
        language: lang,
        history: messagesRef.current.slice(-20).map(({ role, content }) => ({ role, content })),
        mime_type: mimeTypeRef.current,
      }
      if (v?.mistralVoiceId) body.voice_id = v.mistralVoiceId
      if (v?.elevenLabsId) body.elevenlabs_voice_id = v.elevenLabsId

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)

      let res: Response
      try {
        res = await fetch('/api/voice-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
      } catch (err) {
        clearTimeout(timer)
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Request timed out — please try again')
        }
        throw err
      }
      clearTimeout(timer)

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errJson.error ?? `HTTP ${res.status}`)
      }

      return res.json()
    },
    [],
  )

  const playPendingAudio = useCallback(async () => {
    if (!pendingAudio) return
    setStatus('playing')
    try {
      await playAudioBase64(pendingAudio.base64, pendingAudio.format)
    } catch {
      // ignore playback errors — user can tap again or proceed
    }
    setPendingAudio(null)
    setStatus('idle')
  }, [pendingAudio])

  // Reveal the last assistant message after 1.5s
  const scheduleReveal = useCallback(() => {
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, revealed: true } : m)),
      )
    }, 1500)
  }, [])

  const fetchAndPlayGreeting = useCallback(
    async (lang: string, v: TutorVoice) => {
      setStatus('processing')
      const data = await callVoiceChat(null, lang, v)
      const msg: TutorMessage = { role: 'assistant', content: data.ai_text, revealed: true }
      setMessages([msg])
      messagesRef.current = [msg]
      setPendingAudio({ base64: data.audio_base64, format: data.audio_format })
      setStatus('idle')
    },
    [callVoiceChat],
  )

  const selectLanguage = useCallback(
    (lang: string) => {
      setLanguage(lang)
      setVoice(null)
      voiceRef.current = null
      setMessages([])
      messagesRef.current = []
      setError(null)
      setStatus('idle')

      const voices = getVoicesForLanguage(lang)
      const savedId = getSavedVoicePreference(lang)
      const autoVoice =
        savedId
          ? (voices.find((v) => v.id === savedId) ?? (voices.length === 1 ? voices[0] : null))
          : voices.length === 1
          ? voices[0]
          : null

      if (autoVoice) {
        setVoice(autoVoice)
        voiceRef.current = autoVoice
        fetchAndPlayGreeting(lang, autoVoice).catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to start conversation')
          setStatus('error')
        })
      }
    },
    [fetchAndPlayGreeting],
  )

  const startConversation = useCallback(
    async (selectedVoice: TutorVoice) => {
      const lang = language
      if (!lang) return
      setVoice(selectedVoice)
      voiceRef.current = selectedVoice
      saveVoicePreference(lang, selectedVoice.id)
      setMessages([])
      messagesRef.current = []
      setError(null)
      try {
        await fetchAndPlayGreeting(lang, selectedVoice)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start conversation')
        setStatus('error')
      }
    },
    [language, fetchAndPlayGreeting],
  )

  const changeVoice = useCallback(() => {
    setVoice(null)
    voiceRef.current = null
    setMessages([])
    messagesRef.current = []
    setPendingAudio(null)
    setError(null)
    setStatus('idle')
  }, [])

  const newChat = useCallback(async () => {
    const lang = language
    const v = voiceRef.current
    if (!lang || !v) return
    setMessages([])
    messagesRef.current = []
    setPendingAudio(null)
    setError(null)
    try {
      await fetchAndPlayGreeting(lang, v)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }, [language, fetchAndPlayGreeting])

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
      mimeTypeRef.current = mimeType || 'audio/webm'
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        chunksRef.current = []

        const currentLang = language
        const currentVoice = voiceRef.current
        if (!currentLang) return

        setStatus('processing')

        try {
          const audio_base64 = await blobToBase64(audioBlob)
          const data = await callVoiceChat(audio_base64, currentLang, currentVoice ?? undefined)

          setMessages((prev) => {
            const next = [...prev]
            if (data.user_text) next.push({ role: 'user', content: data.user_text, revealed: true })
            next.push({ role: 'assistant', content: data.ai_text, revealed: false })
            return next
          })

          setStatus('playing')
          const audioPromise = playAudioBase64(data.audio_base64, data.audio_format)
          scheduleReveal()
          await audioPromise
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
  }, [isSupported, language, callVoiceChat, scheduleReveal])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    mediaRecorderRef.current = null
  }, [])

  const resetConversation = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    mediaRecorderRef.current = null

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    setLanguage(null)
    setVoice(null)
    voiceRef.current = null
    setMessages([])
    messagesRef.current = []
    setPendingAudio(null)
    setError(null)
    setStatus('idle')
  }, [])

  return {
    language,
    voice,
    status,
    messages,
    error,
    isSupported,
    pendingAudio,
    playPendingAudio,
    startRecording,
    stopRecording,
    selectLanguage,
    startConversation,
    changeVoice,
    newChat,
    resetConversation,
  }
}
