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
  level: string | null
  status: TutorStatus
  messages: TutorMessage[]
  error: string | null
  isSupported: boolean
  pendingAudio: { base64: string; format: string } | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  stopRecordingIfActive: () => void
  selectLanguage: (lang: string) => void
  startConversation: (voice: TutorVoice) => Promise<void>
  selectLevel: (level: string) => Promise<void>
  changeVoice: () => void
  changeLevel: () => void
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

/**
 * Play base64-encoded audio through the Web Audio API.
 * AudioContext must already be unlocked (resumed) before calling.
 */
async function playAudioViaContext(base64: string, _format: string, ctx: AudioContext): Promise<void> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer as ArrayBuffer)
  return new Promise<void>((resolve) => {
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.onended = () => resolve()
    source.start(0)
  })
}

/** Fallback: play via HTMLAudioElement (works on desktop, blocked by iOS in non-gesture contexts) */
function playAudioViaElement(base64: string, format: string): Promise<void> {
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

function getNativeLanguage(): string {
  return (typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : null) || 'en'
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
  const [level, setLevel] = useState<string | null>(null)
  const [status, setStatus] = useState<TutorStatus>('idle')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pendingAudio, setPendingAudio] = useState<{ base64: string; format: string } | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const messagesRef = useRef<TutorMessage[]>([])
  const voiceRef = useRef<TutorVoice | null>(null)
  const levelRef = useRef<string | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')
  const statusRef = useRef<TutorStatus>('idle')
  const recordingStartTime = useRef<number>(0)
  const discardRecordingRef = useRef<boolean>(false)
  const acquiringStreamRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    voiceRef.current = voice
  }, [voice])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    levelRef.current = level
  }, [level])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
      }
      mediaRecorderRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
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
        level: levelRef.current || 'intermediate',
        native_language: getNativeLanguage(),
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

  /**
   * Ensure the AudioContext is created and in 'running' state.
   * Must be called inside a user gesture on iOS to "unlock" it.
   * Once unlocked, audio can be played from any context (including onstop callbacks).
   */
  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  /**
   * Play audio using AudioContext if available and running, falling back to HTMLAudioElement.
   */
  const playAudio = useCallback(async (base64: string, format: string) => {
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      await playAudioViaContext(base64, format, audioContextRef.current)
      return
    }
    await playAudioViaElement(base64, format)
  }, [])

  const playPendingAudio = useCallback(async () => {
    if (!pendingAudio) return
    await ensureAudioContext()  // Unlock AudioContext on "Tap to hear" gesture
    setStatus('playing')
    try {
      await playAudio(pendingAudio.base64, pendingAudio.format)
    } catch {
      // ignore playback errors — user can tap again or proceed
    }
    setPendingAudio(null)
    setStatus('idle')
  }, [pendingAudio, ensureAudioContext, playAudio])

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

      // Unlock AudioContext on the user gesture (voice/language card click)
      await ensureAudioContext()

      const data = await callVoiceChat(null, lang, v)
      const msg: TutorMessage = { role: 'assistant', content: data.ai_text, revealed: true }
      setMessages([msg])
      messagesRef.current = [msg]

      // Try auto-play, fall back to Tap to hear
      try {
        setStatus('playing')
        await playAudio(data.audio_base64, data.audio_format)
        setStatus('idle')
      } catch {
        // Auto-play blocked — fall back to Tap to hear
        setPendingAudio({ base64: data.audio_base64, format: data.audio_format })
        setStatus('idle')
      }
    },
    [callVoiceChat, ensureAudioContext, playAudio],
  )

  const selectLanguage = useCallback(
    (lang: string) => {
      setLanguage(lang)
      setVoice(null)
      voiceRef.current = null
      setLevel(null)
      levelRef.current = null
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

        const savedLevel = localStorage.getItem(`voice-tutor-level-${lang}`)
        if (savedLevel) {
          // Both voice and level are saved — skip both pickers, go straight to conversation
          setLevel(savedLevel)
          levelRef.current = savedLevel
          fetchAndPlayGreeting(lang, autoVoice).catch((err) => {
            setError(err instanceof Error ? err.message : 'Failed to start conversation')
            setStatus('error')
          })
        }
        // No saved level → voice is set, level is null → State 2.5 (level picker) renders
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
      setError(null)

      // Voice change with existing history — restore saved level, skip level picker
      const savedLevel = localStorage.getItem(`voice-tutor-level-${lang}`)
      if (savedLevel && messagesRef.current.length > 0) {
        setLevel(savedLevel)
        levelRef.current = savedLevel
        setStatus('idle')
        return
      }
      // Otherwise leave level null → State 2.5 (level picker) renders
    },
    [language],
  )

  const selectLevel = useCallback(
    async (selectedLevel: string) => {
      setStatus('processing')
      setLevel(selectedLevel)
      levelRef.current = selectedLevel
      if (language) {
        localStorage.setItem(`voice-tutor-level-${language}`, selectedLevel)
      }
      const lang = language
      const v = voiceRef.current
      if (!lang || !v) return
      if (messagesRef.current.length === 0) {
        try {
          await fetchAndPlayGreeting(lang, v)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to start conversation')
          setStatus('error')
        }
      } else {
        setStatus('idle')
      }
    },
    [language, fetchAndPlayGreeting],
  )

  const changeVoice = useCallback(() => {
    setVoice(null)
    voiceRef.current = null
    setPendingAudio(null)
    setError(null)
    setStatus('idle')
  }, [])

  const changeLevel = useCallback(() => {
    setLevel(null)
    levelRef.current = null
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

  /**
   * Acquire a MediaStream if one isn't already active.
   * Kept alive across recordings to avoid iOS Safari re-prompting for mic permission.
   */
  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks()
      const allAlive = tracks.length > 0 && tracks.every(t => t.readyState === 'live')
      if (allAlive) return streamRef.current
      // Stream died (e.g., user revoked permission in OS settings) — clean up
      streamRef.current = null
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    return stream
  }, [])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported in this browser. Please try Chrome or Safari.')
      setStatus('error')
      return
    }

    // Guard: don't start if already recording or processing
    if (statusRef.current === 'recording' || statusRef.current === 'processing') {
      return
    }
    if (acquiringStreamRef.current) return

    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
      mediaRecorderRef.current = null
    }

    discardRecordingRef.current = false
    acquiringStreamRef.current = true

    try {
      // Unlock AudioContext on mic press (user gesture) — enables onstop auto-play on iOS
      await ensureAudioContext()

      const stream = await ensureStream()
      acquiringStreamRef.current = false

      const mimeType = getMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      // Use recorder's actual mimeType — authoritative, especially on Safari
      mimeTypeRef.current = recorder.mimeType || mimeType || 'audio/webm'

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false
          return
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
        chunksRef.current = []

        // Guard: if no audio data was captured (iOS Safari quirk), silently discard
        if (audioBlob.size === 0) {
          setStatus('idle')
          return
        }

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

          // Reveal AI text after 1.5s regardless of whether audio plays
          scheduleReveal()

          // Play via AudioContext (unlocked on mic press) — works from onstop on iOS.
          // Falls back to pendingAudio if AudioContext unavailable or decoding fails.
          try {
            setStatus('playing')
            await playAudio(data.audio_base64, data.audio_format)
            setStatus('idle')
          } catch {
            // AudioContext failed — fall back to Tap to hear
            setPendingAudio({ base64: data.audio_base64, format: data.audio_format })
            setStatus('idle')
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Something went wrong. Tap to try again.'
          setError(msg)
          setStatus('error')
        }
      }

      mediaRecorderRef.current = recorder
      recordingStartTime.current = Date.now()
      recorder.start(250) // 250ms timeslice — prevents 0-byte ondataavailable on iOS Safari
      setError(null)
      setPendingAudio(null)
      setStatus('recording')
    } catch (err) {
      acquiringStreamRef.current = false
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.')
      } else {
        setError('Could not access microphone. Please check your device settings.')
      }
      setStatus('error')
    }
  }, [isSupported, language, callVoiceChat, scheduleReveal, ensureStream, ensureAudioContext, playAudio])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      const duration = Date.now() - recordingStartTime.current
      if (duration < 500) {
        // Too short — discard without sending to API
        discardRecordingRef.current = true
        recorder.stop()
        mediaRecorderRef.current = null
        setStatus('idle')
        return
      }
      recorder.stop()
    }
    mediaRecorderRef.current = null
  }, [])

  const stopRecordingIfActive = useCallback(() => {
    if (statusRef.current === 'recording') {
      stopRecording()
    }
  }, [stopRecording])

  const releaseResources = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
      mediaRecorderRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
  }, [])

  const resetConversation = useCallback(() => {
    releaseResources()

    setLanguage(null)
    setVoice(null)
    voiceRef.current = null
    setLevel(null)
    levelRef.current = null
    setMessages([])
    messagesRef.current = []
    setPendingAudio(null)
    setError(null)
    setStatus('idle')
  }, [releaseResources])

  return {
    language,
    voice,
    level,
    status,
    messages,
    error,
    isSupported,
    pendingAudio,
    playPendingAudio,
    startRecording,
    stopRecording,
    stopRecordingIfActive,
    selectLanguage,
    startConversation,
    selectLevel,
    changeVoice,
    changeLevel,
    newChat,
    resetConversation,
  }
}
