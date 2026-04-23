import { useCallback, useEffect, useRef, useState } from 'react'
import type { GrokCategory } from '@/data/grokCategories'
import type { GrokVoice } from '@/data/grokVoices'
import { buildGrokSessionConfig } from '@/lib/grokSessionConfig'
import { supabase } from '@/lib/supabase'
import type { GrokLevel } from '@/lib/grokPedagogy'

export type GrokStatus = 'idle' | 'connecting' | 'recording' | 'thinking' | 'speaking' | 'error'

export interface GrokMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface StartGrokSessionParams {
  language: string
  languageDisplay: string
  level: GrokLevel
  nativeLanguageDisplay: string
  voice: GrokVoice
  category: GrokCategory | null
}

export interface UseGrokRealtimeReturn {
  status: GrokStatus
  messages: GrokMessage[]
  error: string | null
  isConnected: boolean
  startSession: (params: StartGrokSessionParams) => Promise<void>
  endSession: () => Promise<void>
  startListening: () => void
  sendTurn: () => void
}

const SILENT_MP3_URL = '/silent.mp3'
const PCM_SAMPLE_RATE = 24000
const PCM_FLUSH_SAMPLES = 2400

export function useGrokRealtime(): UseGrokRealtimeReturn {
  const [status, setStatus] = useState<GrokStatus>('idle')
  const [messages, setMessages] = useState<GrokMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const silentPrimerRef = useRef<HTMLAudioElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([])
  const playheadRef = useRef(0)
  const pendingInputFlushResolveRef = useRef<(() => void) | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const sessionParamsRef = useRef<StartGrokSessionParams | null>(null)
  const currentAssistantIndexRef = useRef<number | null>(null)
  const workletModuleLoadedRef = useRef(false)
  const pendingPcmChunksRef = useRef<Int16Array[]>([])
  const pendingPcmSampleCountRef = useRef(0)
  const conversationInsertedRef = useRef(false)
  const endedConversationIdsRef = useRef<Set<string>>(new Set())
  const currentUserIdRef = useRef<string | null>(null)
  const endingSessionRef = useRef(false)
  const mountedRef = useRef(true)
  const isConnectedRef = useRef(false)
  const statusRef = useRef<GrokStatus>('idle')

  const primeAudioForIOS = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      // iOS adds 'interrupted' (ring switch, Control Center, phone call) —
      // not in the standard AudioContextState union but we still need to resume.
      if (ctx.state !== 'running' && ctx.state !== 'closed') {
        void ctx.resume().catch(() => {})
      }
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(ctx.currentTime)
    } catch (err) {
      console.warn('[useVoiceTutor] iOS audio prime failed:', err)
    }

    try {
      if (!silentPrimerRef.current) {
        const el = new Audio(SILENT_MP3_URL)
        el.loop = true
        el.setAttribute('playsinline', 'true')
        el.setAttribute('webkit-playsinline', 'true')
        el.setAttribute('x-webkit-airplay', 'deny')
        el.controls = false
        try {
          (el as HTMLAudioElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true
        } catch { /* some browsers lack this property */ }
        silentPrimerRef.current = el
      }
      const primer = silentPrimerRef.current
      if (primer.paused) {
        // Must start inside the user gesture. Log the outcome so we can tell
        // via remote Safari Web Inspector whether the primer ever commits
        // the iOS audio session to the media category.
        const p = primer.play()
        if (p) {
          p.then(
            () => { console.log('[useVoiceTutor] silent primer: play() resolved') },
            (err) => { console.log('[useVoiceTutor] silent primer: play() rejected:', err?.name, err?.message) },
          )
        }
      }
    } catch (err) {
      console.warn('[useVoiceTutor] iOS silent primer failed:', err)
    }
  }, [])

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      workletModuleLoadedRef.current = false
    }
    const ctx = audioContextRef.current
    if (ctx.state !== 'running' && ctx.state !== 'closed') {
      await ctx.resume().catch(() => {})
    }
    return ctx
  }, [])

  const resetAudioQueue = useCallback(() => {
    for (const source of audioQueueRef.current) {
      try { source.stop() } catch { /* ignore */ }
      try { source.disconnect() } catch { /* ignore */ }
    }
    audioQueueRef.current = []
    playheadRef.current = 0
    pendingPcmChunksRef.current = []
    pendingPcmSampleCountRef.current = 0
  }, [])

  const updateEndedAt = useCallback(async (conversationId?: string | null) => {
    if (!conversationId || endedConversationIdsRef.current.has(conversationId)) return
    endedConversationIdsRef.current.add(conversationId)
    try {
      await supabase.from('speak_conversations')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', conversationId)
    } catch (err) {
      endedConversationIdsRef.current.delete(conversationId)
      console.warn('[grok-realtime] Failed to end conversation:', err)
    }
  }, [])

  const decodeBase64ToBytes = useCallback((base64: string) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  }, [])

  const queueAudioBuffer = useCallback(async (pcm: Int16Array) => {
    if (pcm.length === 0) return
    const ctx = await ensureAudioContext()
    const audioBuffer = ctx.createBuffer(1, pcm.length, PCM_SAMPLE_RATE)
    const channel = audioBuffer.getChannelData(0)
    for (let i = 0; i < pcm.length; i++) {
      channel[i] = pcm[i] / 0x8000
    }

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)

    const startAt = Math.max(ctx.currentTime, playheadRef.current)
    playheadRef.current = startAt + audioBuffer.duration
    audioQueueRef.current.push(source)

    source.onended = () => {
      try { source.disconnect() } catch { /* ignore */ }
      audioQueueRef.current = audioQueueRef.current.filter((node) => node !== source)
      if (audioQueueRef.current.length === 0) {
        playheadRef.current = 0
        if (mountedRef.current) {
          setStatus('idle')
        }
      }
    }

    source.start(startAt)
    if (mountedRef.current) setStatus('speaking')
  }, [ensureAudioContext])

  const flushPendingAudio = useCallback(async () => {
    if (pendingPcmSampleCountRef.current === 0) return

    const combined = new Int16Array(pendingPcmSampleCountRef.current)
    let offset = 0
    for (const chunk of pendingPcmChunksRef.current) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    pendingPcmChunksRef.current = []
    pendingPcmSampleCountRef.current = 0
    await queueAudioBuffer(combined)
  }, [queueAudioBuffer])

  const persistConversationStart = useCallback(async () => {
    if (conversationInsertedRef.current) return
    const params = sessionParamsRef.current
    const conversationId = conversationIdRef.current
    const userId = currentUserIdRef.current
    if (!params || !conversationId || !userId) return

    conversationInsertedRef.current = true
    try {
      await supabase.from('speak_conversations').insert({
        id: conversationId,
        user_id: userId,
        language: params.language,
        voice_name: params.voice,
        character_id: null,
        level: params.level,
        message_count: 1,
        title: null,
        started_at: new Date().toISOString(),
        provider: 'grok',
        gemini_character_mode_id: null,
        gemini_voice_name: null,
        gemini_accent_id: null,
        mode: 'freeform',
        grok_voice: params.voice,
        grok_category: params.category,
      })
    } catch (err) {
      conversationInsertedRef.current = false
      console.warn('[grok-realtime] Failed to create conversation:', err)
    }
  }, [])

  const appendAssistantDelta = useCallback((delta: string) => {
    if (!delta) return
    if (!conversationInsertedRef.current) {
      void persistConversationStart()
    }

    setMessages((prev) => {
      const existingIndex = currentAssistantIndexRef.current
      if (existingIndex === null) {
        const nextIndex = prev.length
        currentAssistantIndexRef.current = nextIndex
        return [...prev, { role: 'assistant', content: delta, timestamp: Date.now() }]
      }

      return prev.map((message, index) => (
        index === existingIndex
          ? { ...message, content: message.content + delta }
          : message
      ))
    })
  }, [persistConversationStart])

  const appendUserTranscript = useCallback((transcript: string) => {
    if (!transcript) return
    setMessages((prev) => [...prev, {
      role: 'user',
      content: transcript,
      timestamp: Date.now(),
    }])
  }, [])

  const handleSocketMessage = useCallback(async (event: MessageEvent<string>) => {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(event.data) as Record<string, unknown>
    } catch (err) {
      console.warn('[grok-realtime] Failed to parse socket message:', err)
      return
    }

    const type = typeof payload.type === 'string' ? payload.type : ''
    switch (type) {
      case 'response.text.delta': {
        appendAssistantDelta(typeof payload.delta === 'string' ? payload.delta : '')
        break
      }
      case 'response.output_audio.delta': {
        const delta = typeof payload.delta === 'string' ? payload.delta : ''
        if (!delta) break
        const bytes = decodeBase64ToBytes(delta)
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        const pcm = new Int16Array(bytes.byteLength / 2)
        for (let i = 0; i < pcm.length; i++) {
          pcm[i] = view.getInt16(i * 2, true)
        }
        pendingPcmChunksRef.current.push(pcm)
        pendingPcmSampleCountRef.current += pcm.length
        if (pendingPcmSampleCountRef.current >= PCM_FLUSH_SAMPLES) {
          await flushPendingAudio()
        }
        break
      }
      case 'response.done': {
        await flushPendingAudio()
        currentAssistantIndexRef.current = null
        if (mountedRef.current && audioQueueRef.current.length === 0) {
          setStatus('idle')
        }
        break
      }
      case 'conversation.item.input_audio_transcription.completed': {
        appendUserTranscript(typeof payload.transcript === 'string' ? payload.transcript : '')
        break
      }
      case 'input_audio_buffer.speech_started': {
        resetAudioQueue()
        if (mountedRef.current) setStatus('recording')
        break
      }
      case 'error': {
        console.error('[grok-realtime] Realtime error:', payload)
        const message = typeof payload.message === 'string'
          ? payload.message
          : typeof payload.error === 'string'
            ? payload.error
            : 'Grok realtime error'
        if (mountedRef.current) {
          setError(message)
          setStatus('error')
        }
        break
      }
      default:
        break
    }
  }, [appendAssistantDelta, appendUserTranscript, decodeBase64ToBytes, flushPendingAudio, resetAudioQueue])

  const fetchEphemeralToken = useCallback(async (): Promise<string> => {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !data.session?.access_token) {
      throw new Error('Missing authentication')
    }

    currentUserIdRef.current = data.session.user.id

    const response = await fetch('/api/grok-token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    })

    const json = await response.json().catch(() => null) as { value?: string; error?: string } | null
    if (!response.ok) {
      throw new Error(json?.error || 'Failed to fetch Grok token')
    }

    const token = json?.value
    if (!token) {
      throw new Error('Token exchange returned no client secret')
    }

    return token
  }, [])

  const flushPendingInputAudio = useCallback(async () => {
    const worklet = workletRef.current
    if (!worklet) return false

    return await new Promise<boolean>((resolve) => {
      let settled = false
      const complete = (timedOut: boolean) => {
        if (settled) return
        settled = true
        pendingInputFlushResolveRef.current = null
        clearTimeout(timeoutId)
        resolve(timedOut)
      }
      const timeoutId = window.setTimeout(() => {
        console.warn('[grok-realtime] Timed out waiting for input flush before commit')
        complete(true)
      }, 300)
      pendingInputFlushResolveRef.current = () => complete(false)
      try {
        worklet.port.postMessage({ type: 'flush_and_stop' })
      } catch (err) {
        console.warn('[grok-realtime] Failed to request input flush before commit:', err)
        complete(true)
      }
    })
  }, [])

  const pauseListeningCapture = useCallback(() => {
    if (micSourceRef.current) {
      try { micSourceRef.current.disconnect() } catch { /* ignore */ }
      micSourceRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const stopListening = useCallback(() => {
    pendingInputFlushResolveRef.current?.()
    pendingInputFlushResolveRef.current = null
    if (workletRef.current) {
      try { workletRef.current.port.postMessage({ type: 'reset' }) } catch { /* ignore */ }
      workletRef.current.port.onmessage = null
      try { workletRef.current.disconnect() } catch { /* ignore */ }
      workletRef.current = null
    }
    pauseListeningCapture()
    if (mountedRef.current) {
      setIsListening(false)
      if (statusRef.current === 'recording') setStatus('idle')
    }
  }, [pauseListeningCapture])

  const teardownSession = useCallback(async () => {
    endingSessionRef.current = true
    const closingConversationId = conversationIdRef.current
    stopListening()
    resetAudioQueue()

    const ws = wsRef.current
    wsRef.current = null
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try { ws.close(1000, 'session ended') } catch { /* ignore */ }
    }

    if (silentPrimerRef.current) {
      try {
        silentPrimerRef.current.pause()
        silentPrimerRef.current.currentTime = 0
        silentPrimerRef.current.removeAttribute('src')
        silentPrimerRef.current.load()
      } catch { /* ignore */ }
      silentPrimerRef.current = null
    }

    if (audioContextRef.current) {
      try { await audioContextRef.current.close() } catch { /* ignore */ }
      audioContextRef.current = null
    }

    workletModuleLoadedRef.current = false
    currentAssistantIndexRef.current = null
    if (mountedRef.current) {
      setIsConnected(false)
      setIsListening(false)
      setStatus('idle')
    }
    await updateEndedAt(closingConversationId)
    endingSessionRef.current = false
  }, [resetAudioQueue, stopListening, updateEndedAt])

  const teardownSessionRef = useRef(teardownSession)
  useEffect(() => { teardownSessionRef.current = teardownSession }, [teardownSession])

  const connectAndConfigure = useCallback(async (params: StartGrokSessionParams): Promise<void> => {
    primeAudioForIOS()
    setStatus('connecting')
    setError(null)

    const token = await fetchEphemeralToken()
    const ws = new WebSocket('wss://api.x.ai/v1/realtime', [`xai-client-secret.${token}`])
    const sessionConversationId = conversationIdRef.current
    wsRef.current = ws

    await new Promise<void>((resolve, reject) => {
      let settled = false

      ws.onopen = () => {
        try {
          ws.send(JSON.stringify(buildGrokSessionConfig(params)))
          ws.send(JSON.stringify({ type: 'response.create' }))
          setIsConnected(true)
          setStatus('idle')
          settled = true
          resolve()
        } catch (err) {
          settled = true
          reject(err)
        }
      }

      ws.onmessage = (event) => {
        void handleSocketMessage(event as MessageEvent<string>)
      }

      ws.onerror = () => {
        console.error('[grok-realtime] WebSocket error')
        if (!settled) {
          settled = true
          reject(new Error('Realtime connection failed'))
        }
        if (mountedRef.current) {
          setError('Realtime connection failed')
          setStatus('error')
        }
      }

      ws.onclose = (event) => {
        console.log('[grok-realtime] WebSocket closed:', event.code, event.reason)
        wsRef.current = null
        if (mountedRef.current) {
          setIsConnected(false)
          setIsListening(false)
        }
        if (!settled) {
          settled = true
          reject(new Error(`Realtime connection closed (${event.code})`))
        } else if (!endingSessionRef.current && mountedRef.current) {
          setStatus('idle')
        }
        void updateEndedAt(sessionConversationId)
      }
    })
  }, [fetchEphemeralToken, handleSocketMessage, primeAudioForIOS, updateEndedAt])

  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Grok session is not connected')
      setStatus('error')
      return
    }
    if (isListening) return

    try {
      setError(null)
      primeAudioForIOS()
      const ctx = await ensureAudioContext()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      if (!workletModuleLoadedRef.current) {
        await ctx.audioWorklet.addModule('/audioWorklets/grokPcmDownsampler.js')
        workletModuleLoadedRef.current = true
      }

      const source = ctx.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(ctx, 'grok-pcm-downsampler')
      source.connect(worklet)

      worklet.port.onmessage = (event: MessageEvent<{ type?: string; data?: string }>) => {
        if (event.data?.type === 'flush_complete') {
          pendingInputFlushResolveRef.current?.()
          return
        }
        if (event.data?.type !== 'pcm' || !event.data.data) return
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: btoa(event.data.data),
        }))
      }

      micSourceRef.current = source
      workletRef.current = worklet
      setIsListening(true)
      setStatus('recording')
    } catch (err) {
      console.error('[grok-realtime] Failed to start listening:', err)
      setError(err instanceof Error ? err.message : 'Failed to start microphone')
      setStatus('error')
    }
  }, [ensureAudioContext, isListening, primeAudioForIOS])

  const sendTurn = useCallback(async () => {
    if (statusRef.current !== 'recording') return

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      stopListening()
      setError('Grok session is not connected')
      setStatus('error')
      return
    }

    try {
      pauseListeningCapture()
      await flushPendingInputAudio()
      stopListening()
      if (endingSessionRef.current || wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      ws.send(JSON.stringify({ type: 'response.create' }))
      setError(null)
      setStatus('thinking')
    } catch (err) {
      console.error('[grok-realtime] Failed to send turn:', err)
      stopListening()
      setError(err instanceof Error ? err.message : 'Failed to send audio turn')
      setStatus('error')
    }
  }, [flushPendingInputAudio, pauseListeningCapture, stopListening])

  const endSession = useCallback(async () => {
    await teardownSession()
  }, [teardownSession])

  const startSession = useCallback(async (params: StartGrokSessionParams) => {
    // iOS audio unlock must run inside the user gesture before any await.
    primeAudioForIOS()
    await teardownSession()

    conversationIdRef.current = crypto.randomUUID()
    sessionParamsRef.current = params
    conversationInsertedRef.current = false
    endedConversationIdsRef.current.delete(conversationIdRef.current)
    currentAssistantIndexRef.current = null
    pendingPcmChunksRef.current = []
    pendingPcmSampleCountRef.current = 0
    playheadRef.current = 0
    setMessages([])
    setError(null)

    await connectAndConfigure(params)
  }, [connectAndConfigure, primeAudioForIOS, teardownSession])

  useEffect(() => { isConnectedRef.current = isConnected }, [isConnected])
  useEffect(() => { statusRef.current = status }, [status])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      void teardownSessionRef.current()
    }
  }, [])

  return {
    status,
    messages,
    error,
    isConnected,
    startSession,
    endSession,
    startListening,
    sendTurn,
  }
}
