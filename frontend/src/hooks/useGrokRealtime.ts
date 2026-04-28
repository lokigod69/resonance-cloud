import { useCallback, useEffect, useRef, useState } from 'react'
import type { GrokCategory } from '@/data/grokCategories'
import type { GrokVoice } from '@/data/grokVoices'
import { buildGrokSessionConfig, getGrokTurnProtocol } from '@/lib/grokSessionConfig'
import {
  getGrokIOSAudioSessionSnapshot,
  getNavigatorAudioSession,
  installGrokIOSAudioDiagnostics,
  isIOSLikeSafariRuntime,
  setIOSAudioSessionType,
} from '@/lib/grokIOSAudioDiagnostics'
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
const SILENT_FIRST_CHUNK_PEAK_THRESHOLD = 0.01
const GROK_REALTIME_MODEL = 'grok-voice-think-fast-1.0'
const GROK_REALTIME_URL = `wss://api.x.ai/v1/realtime?model=${encodeURIComponent(GROK_REALTIME_MODEL)}`
const INPUT_COMMIT_ACK_TIMEOUT_MS = 3000
const SERVER_VAD_SILENCE_MS = 500
const USER_TRANSCRIPT_DRAIN_TIMEOUT_MS = 2000
const PERSISTENCE_DRAIN_TIMEOUT_MS = 3000

type PendingInputCommit = {
  resolve: () => void
  reject: (error: Error) => void
  startedAt: number
  timeoutId: ReturnType<typeof window.setTimeout>
}

function readGrokAudioDebugFlag(): boolean {
  try {
    return typeof window !== 'undefined' &&
      window.localStorage.getItem('grokAudioDebug') === '1'
  } catch {
    return false
  }
}

const GROK_AUDIO_DEBUG = readGrokAudioDebugFlag()

function readLocalStorageFlag(key: string, expectedValue: string): boolean {
  try {
    return typeof window !== 'undefined' &&
      window.localStorage.getItem(key) === expectedValue
  } catch {
    return false
  }
}

function getGrokPlaybackMode(): 'webaudio-streaming' | 'html-buffered' {
  return readLocalStorageFlag('grokPlaybackMode', 'html-buffered')
    ? 'html-buffered'
    : 'webaudio-streaming'
}

function shouldRecreateIOSAudioContextAfterMic(): boolean {
  return readLocalStorageFlag('grokIOSRecreateAudioContextAfterMic', '1')
}

function shouldDisableIOSMicProcessing(): boolean {
  return readLocalStorageFlag('grokIOSMicProcessing', 'off')
}

function getGrokMicAudioConstraints(): MediaStreamConstraints['audio'] {
  return isIOSLikeSafariRuntime() && shouldDisableIOSMicProcessing()
    ? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
    : true
}

function readGrokVerifyL0Flag(): boolean {
  try {
    return typeof window !== 'undefined' &&
      window.localStorage.getItem('grokVerifyL0') === '1'
  } catch {
    return false
  }
}

const GROK_VERIFY_L0 = readGrokVerifyL0Flag()

const grokAudioDebug = (...args: unknown[]) => {
  if (GROK_AUDIO_DEBUG) {
    console.info('[grok-audio-debug]', ...args)
  }
}

function getIOSAudioSessionType(): string | null {
  return getNavigatorAudioSession()?.type ?? null
}

function grokVerifyDebug(...args: unknown[]): void {
  if (!GROK_VERIFY_L0) return
  console.log('[grok-verify-l0]', ...args)
}

function getAudioContextSnapshot(ctx: AudioContext | null) {
  if (!ctx) return { exists: false }
  const latencyCtx = ctx as AudioContext & { outputLatency?: number }
  return {
    exists: true,
    state: ctx.state,
    sampleRate: ctx.sampleRate,
    baseLatency: ctx.baseLatency,
    outputLatency: latencyCtx.outputLatency,
  }
}

function getPrimerSnapshot(primer: HTMLAudioElement | null) {
  if (!primer) return { exists: false }
  return {
    exists: true,
    paused: primer.paused,
    readyState: primer.readyState,
    currentTime: primer.currentTime,
    muted: primer.muted,
    volume: primer.volume,
  }
}

function getTrackSnapshot(track: MediaStreamTrack) {
  return {
    readyState: track.readyState,
    muted: track.muted,
    enabled: track.enabled,
  }
}

function getTrackSettingsSnapshot(track: MediaStreamTrack) {
  const settings = track.getSettings()
  return {
    sampleRate: settings.sampleRate,
    channelCount: settings.channelCount,
    echoCancellation: settings.echoCancellation,
    autoGainControl: settings.autoGainControl,
    noiseSuppression: settings.noiseSuppression,
  }
}

function getResponseId(payload: Record<string, unknown>): string | null {
  if (typeof payload.response_id === 'string') return payload.response_id
  const response = payload.response
  if (response && typeof response === 'object' && 'id' in response) {
    const id = (response as { id?: unknown }).id
    if (typeof id === 'string') return id
  }
  return null
}

function getEventId(payload: Record<string, unknown>): string | null {
  return typeof payload.event_id === 'string'
    ? payload.event_id
    : typeof payload.id === 'string'
      ? payload.id
      : null
}

function getItemId(payload: Record<string, unknown>): string | null {
  if (typeof payload.item_id === 'string') return payload.item_id
  const item = payload.item
  if (item && typeof item === 'object' && 'id' in item) {
    const id = (item as { id?: unknown }).id
    if (typeof id === 'string') return id
  }
  return null
}

function getPcmStats(pcm: Int16Array) {
  let peak = 0
  let sumSquares = 0
  for (let i = 0; i < pcm.length; i++) {
    const sample = pcm[i] / 0x8000
    const absValue = Math.abs(sample)
    if (absValue > peak) peak = absValue
    sumSquares += sample * sample
  }
  return {
    peak,
    rms: pcm.length === 0 ? 0 : Math.sqrt(sumSquares / pcm.length),
  }
}

function getAverage(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getMin(values: number[]): number | null {
  return values.length === 0 ? null : Math.min(...values)
}

function getMax(values: number[]): number | null {
  return values.length === 0 ? null : Math.max(...values)
}

function encodeZeroPcmBase64(sampleCount: number): string {
  return btoa('\0'.repeat(sampleCount * 2))
}

function combinePcmChunks(chunks: Int16Array[], sampleCount: number): Int16Array {
  const combined = new Int16Array(sampleCount)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }
  return combined
}

function encodePcm16MonoWav(pcm: Int16Array, sampleRate: number): Blob {
  const dataBytes = pcm.length * 2
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataBytes, true)
  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(44 + i * 2, pcm[i], true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function sleepWithCancel(ms: number): { promise: Promise<void>; cancel: () => void } {
  let timer: ReturnType<typeof window.setTimeout> | null = null
  const promise = new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, ms)
  })
  return {
    promise,
    cancel: () => {
      if (timer !== null) window.clearTimeout(timer)
    },
  }
}

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
  const pendingInputCommitRef = useRef<PendingInputCommit | null>(null)
  const commitAckRecoveryPendingClearRef = useRef(false)
  const conversationIdRef = useRef<string | null>(null)
  const sessionParamsRef = useRef<StartGrokSessionParams | null>(null)
  const currentAssistantIndexRef = useRef<number | null>(null)
  const pendingAssistantContentRef = useRef<string>('')
  const assistantResponseSeqRef = useRef(0)
  const audioChunkSeqRef = useRef(0)
  const firstChunkSeenForResponseRef = useRef<Set<number>>(new Set())
  const micCycleSeqRef = useRef(0)
  const currentAudioResponseKeyRef = useRef<string | null>(null)
  const currentResponseAudioChunksRef = useRef(0)
  const currentResponseFirstFivePeaksRef = useRef<number[]>([])
  const currentResponseFirstFiveRmsRef = useRef<number[]>([])
  const currentResponsePeaksRef = useRef<number[]>([])
  const currentResponseRmsRef = useRef<number[]>([])
  const currentResponseTextDeltaSeenRef = useRef(false)
  const lastTrackStopAtRef = useRef<number | null>(null)
  const grokVerifyResponseSequenceRef = useRef(0)
  const grokVerifyTextDeltaAccumRef = useRef('')
  const grokVerifyAudioTranscriptAccumRef = useRef('')
  const workletModuleLoadedRef = useRef(false)
  const pendingPcmChunksRef = useRef<Int16Array[]>([])
  const pendingPcmSampleCountRef = useRef(0)
  const htmlBufferedPcmChunksRef = useRef<Int16Array[]>([])
  const htmlBufferedPcmSampleCountRef = useRef(0)
  const htmlBufferedAudioRef = useRef<HTMLAudioElement | null>(null)
  const conversationInsertedRef = useRef(false)
  const pendingConversationInsertRef = useRef<Promise<void> | null>(null)
  const pendingPersistencePromisesRef = useRef<Set<Promise<unknown>>>(new Set())
  const pendingUserTranscriptResolveRef = useRef<(() => void) | null>(null)
  const inputAudioAppendedRef = useRef(false)
  const teardownPromiseRef = useRef<Promise<void> | null>(null)
  const endedConversationIdsRef = useRef<Set<string>>(new Set())
  const currentUserIdRef = useRef<string | null>(null)
  const endingSessionRef = useRef(false)
  const responseInProgressRef = useRef(false)
  const audioSessionTypeAtResponseCreateRef = useRef<string | null>(null)
  const audioSessionTypeAtFirstAudioDeltaRef = useRef<string | null>(null)
  const outputContextRecreatedAfterMicRef = useRef(false)
  const mountedRef = useRef(true)
  const isConnectedRef = useRef(false)
  const statusRef = useRef<GrokStatus>('idle')

  const primeAudioForIOS = useCallback(() => {
    if (GROK_AUDIO_DEBUG) {
      installGrokIOSAudioDiagnostics({
        getAudioContext: () => audioContextRef.current,
        getPrimer: () => silentPrimerRef.current,
        log: grokAudioDebug,
      })
    }
    setIOSAudioSessionType('playback', 'prime-before-greeting')
    if (GROK_AUDIO_DEBUG) {
      grokAudioDebug('primeAudioForIOS:entry', {
        context: getAudioContextSnapshot(audioContextRef.current),
        primer: getPrimerSnapshot(silentPrimerRef.current),
      })
    }
    try {
      const createdContext = GROK_AUDIO_DEBUG ? !audioContextRef.current : false
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('primeAudioForIOS:context-ready', {
          createdContext,
          context: getAudioContextSnapshot(ctx),
        })
      }
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
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('primeAudioForIOS:silent-buffer-started', {
          created: true,
          connected: true,
          started: true,
          context: getAudioContextSnapshot(ctx),
        })
      }
    } catch (err) {
      console.warn('[useVoiceTutor] iOS audio prime failed:', err)
    }

    try {
      const createdPrimer = GROK_AUDIO_DEBUG ? !silentPrimerRef.current : false
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
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('primeAudioForIOS:primer-ready', {
          createdPrimer,
          primer: getPrimerSnapshot(primer),
        })
      }
      if (primer.paused) {
        // Must start inside the user gesture. Log the outcome so we can tell
        // via remote Safari Web Inspector whether the primer ever commits
        // the iOS audio session to the media category.
        const p = primer.play()
        if (p) {
          p.then(
            () => {
              if (GROK_AUDIO_DEBUG) {
                grokAudioDebug('primeAudioForIOS:primer-play-resolved', {
                  primer: getPrimerSnapshot(primer),
                })
              }
            },
            (err) => {
              if (GROK_AUDIO_DEBUG) {
                grokAudioDebug('primeAudioForIOS:primer-play-rejected', {
                  name: err?.name,
                  message: err?.message,
                  primer: getPrimerSnapshot(primer),
                })
              }
            },
          )
        }
      }
    } catch (err) {
      console.warn('[useVoiceTutor] iOS silent primer failed:', err)
    }
  }, [])

  const ensureAudioContext = useCallback(async () => {
    let createdContext = false
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      workletModuleLoadedRef.current = false
      createdContext = true
    }
    const ctx = audioContextRef.current
    const stateBeforeResume = GROK_AUDIO_DEBUG ? ctx.state : null
    if (ctx.state !== 'running' && ctx.state !== 'closed') {
      await ctx.resume().catch(() => {})
    }
    if (GROK_AUDIO_DEBUG) {
      grokAudioDebug('ensureAudioContext', {
        createdContext,
        stateBeforeResume,
        stateAfterResume: ctx.state,
        context: getAudioContextSnapshot(ctx),
      })
    }
    return ctx
  }, [])

  const resetAudioQueue = useCallback(() => {
    for (const source of audioQueueRef.current) {
      try { source.stop() } catch { /* ignore */ }
      try { source.disconnect() } catch { /* ignore */ }
    }
    if (htmlBufferedAudioRef.current) {
      try { htmlBufferedAudioRef.current.pause() } catch { /* ignore */ }
      try { URL.revokeObjectURL(htmlBufferedAudioRef.current.src) } catch { /* ignore */ }
      htmlBufferedAudioRef.current = null
    }
    audioQueueRef.current = []
    playheadRef.current = 0
    pendingPcmChunksRef.current = []
    pendingPcmSampleCountRef.current = 0
    htmlBufferedPcmChunksRef.current = []
    htmlBufferedPcmSampleCountRef.current = 0
  }, [])

  const updateEndedAt = useCallback(async (conversationId?: string | null) => {
    if (!conversationId || endedConversationIdsRef.current.has(conversationId)) return
    endedConversationIdsRef.current.add(conversationId)
    try {
      const { error } = await supabase.from('speak_conversations')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', conversationId)
      if (error) throw error
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
    const responseSeq = assistantResponseSeqRef.current
    const chunkSeq = audioChunkSeqRef.current + 1
    audioChunkSeqRef.current = chunkSeq

    if (responseSeq > 0 && !firstChunkSeenForResponseRef.current.has(responseSeq)) {
      firstChunkSeenForResponseRef.current.add(responseSeq)
      const { peak, rms } = getPcmStats(pcm)
      if (peak < SILENT_FIRST_CHUNK_PEAK_THRESHOLD) {
        grokAudioDebug('queueAudioBuffer:skipped-silent-first-chunk', {
          assistantResponseSeq: responseSeq,
          audioChunkSeq: chunkSeq,
          peak,
          rms,
          sampleCount: pcm.length,
        })
        return
      }
    }

    const ctx = await ensureAudioContext()
    const audioBuffer = ctx.createBuffer(1, pcm.length, PCM_SAMPLE_RATE)
    const channel = audioBuffer.getChannelData(0)
    for (let i = 0; i < pcm.length; i++) {
      channel[i] = pcm[i] / 0x8000
    }

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)

    const queueLengthBefore = GROK_AUDIO_DEBUG ? audioQueueRef.current.length : 0
    const playheadBefore = GROK_AUDIO_DEBUG ? playheadRef.current : 0
    const startAt = Math.max(ctx.currentTime, playheadRef.current)
    playheadRef.current = startAt + audioBuffer.duration
    audioQueueRef.current.push(source)

    if (GROK_AUDIO_DEBUG) {
      const queueLengthAfter = audioQueueRef.current.length
      const { peak, rms } = getPcmStats(pcm)
      grokAudioDebug('queueAudioBuffer:scheduled', {
        assistantResponseSeq: responseSeq,
        audioChunkSeq: chunkSeq,
        sampleCount: pcm.length,
        peak,
        rms,
        playbackSeconds: pcm.length / PCM_SAMPLE_RATE,
        contextState: ctx.state,
        contextCurrentTime: ctx.currentTime,
        playheadBefore,
        startAt,
        queueLengthBefore,
        queueLengthAfter,
      })
    }

    source.onended = () => {
      try { source.disconnect() } catch { /* ignore */ }
      audioQueueRef.current = audioQueueRef.current.filter((node) => node !== source)
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('queueAudioBuffer:ended', {
          assistantResponseSeq: responseSeq,
          audioChunkSeq: chunkSeq,
          eventTime: ctx.currentTime,
          queueLengthAtEnd: audioQueueRef.current.length,
          playheadAtEnd: playheadRef.current,
        })
      }
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

    const combined = combinePcmChunks(pendingPcmChunksRef.current, pendingPcmSampleCountRef.current)

    pendingPcmChunksRef.current = []
    pendingPcmSampleCountRef.current = 0
    await queueAudioBuffer(combined)
  }, [queueAudioBuffer])

  const playHtmlBufferedAudio = useCallback(async (responseSequence: number): Promise<boolean> => {
    if (htmlBufferedPcmSampleCountRef.current === 0) return true

    const combined = combinePcmChunks(htmlBufferedPcmChunksRef.current, htmlBufferedPcmSampleCountRef.current)
    htmlBufferedPcmChunksRef.current = []
    htmlBufferedPcmSampleCountRef.current = 0

    setIOSAudioSessionType('playback', 'html-buffered-before-play')
    const wavBlob = encodePcm16MonoWav(combined, PCM_SAMPLE_RATE)
    const url = URL.createObjectURL(wavBlob)
    if (htmlBufferedAudioRef.current) {
      try { htmlBufferedAudioRef.current.pause() } catch { /* ignore */ }
      try { URL.revokeObjectURL(htmlBufferedAudioRef.current.src) } catch { /* ignore */ }
    }

    const audio = new Audio(url)
    ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')
    audio.preload = 'auto'
    audio.volume = 1
    htmlBufferedAudioRef.current = audio
    audio.onended = () => {
      if (htmlBufferedAudioRef.current === audio) {
        htmlBufferedAudioRef.current = null
      }
      URL.revokeObjectURL(url)
      if (mountedRef.current) setStatus('idle')
    }
    audio.onerror = () => {
      if (htmlBufferedAudioRef.current === audio) {
        htmlBufferedAudioRef.current = null
      }
      URL.revokeObjectURL(url)
      if (mountedRef.current) {
        setError('Failed to play Grok audio')
        setStatus('error')
      }
    }

    grokAudioDebug('htmlBufferedPlayback:play', {
      responseSequence,
      sampleCount: combined.length,
      durationSeconds: combined.length / PCM_SAMPLE_RATE,
      blobBytes: wavBlob.size,
      audioSession: getGrokIOSAudioSessionSnapshot(),
    })
    if (mountedRef.current) setStatus('speaking')
    try {
      await audio.play()
      return true
    } catch (err) {
      console.warn('[grok-realtime] HTML buffered playback failed:', err)
      if (htmlBufferedAudioRef.current === audio) {
        htmlBufferedAudioRef.current = null
      }
      URL.revokeObjectURL(url)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to play Grok audio')
        setStatus('error')
      }
      grokAudioDebug('htmlBufferedPlayback:play-rejected', {
        responseSequence,
        audioSession: getGrokIOSAudioSessionSnapshot(),
        message: err instanceof Error ? err.message : String(err),
      })
      return false
    }
  }, [])

  const trackPersistencePromise = useCallback(<T,>(promise: Promise<T>) => {
    const tracked = promise as Promise<unknown>
    pendingPersistencePromisesRef.current.add(tracked)
    void tracked.finally(() => {
      pendingPersistencePromisesRef.current.delete(tracked)
    })
    return promise
  }, [])

  const persistConversationStart = useCallback(async () => {
    if (conversationInsertedRef.current) return
    if (pendingConversationInsertRef.current) {
      await pendingConversationInsertRef.current
      return
    }

    const params = sessionParamsRef.current
    const conversationId = conversationIdRef.current
    const userId = currentUserIdRef.current
    if (!params || !conversationId || !userId) return
    const capturedConversationId = conversationId

    const insertPromise = (async () => {
      try {
        const { error } = await supabase.from('speak_conversations').insert({
          id: capturedConversationId,
          user_id: userId,
          language: params.language,
          voice_name: params.voice,
          character_id: null,
          level: params.level,
          message_count: 0,
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
        if (error) throw error
        if (conversationIdRef.current !== capturedConversationId) {
          console.warn('[grok-realtime] Stale conversation insert completed for dead session:', capturedConversationId)
          return
        }
        conversationInsertedRef.current = true
      } catch (err) {
        if (conversationIdRef.current !== capturedConversationId) {
          console.warn('[grok-realtime] Stale conversation insert failed for dead session:', capturedConversationId, err)
          return
        }
        conversationInsertedRef.current = false
        console.warn('[grok-realtime] Failed to create conversation:', err)
      } finally {
        if (conversationIdRef.current === capturedConversationId) {
          pendingConversationInsertRef.current = null
        }
      }
    })()

    pendingConversationInsertRef.current = insertPromise
    await insertPromise
  }, [])

  const persistSpeakMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    const conversationId = conversationIdRef.current
    if (!conversationId || !content) return
    await persistConversationStart()
    if (!conversationInsertedRef.current) return
    try {
      const { error: insertError } = await supabase.from('speak_messages').insert({
        conversation_id: conversationId,
        role,
        content,
      })
      if (insertError) throw insertError

      const { error: rpcError } = await supabase.rpc('increment_speak_message_count', {
        conv_id: conversationId,
        inc: 1,
      })
      if (rpcError) throw rpcError
    } catch (err) {
      console.warn('[grok-realtime] Failed to persist message:', err)
    }
  }, [persistConversationStart])

  const appendAssistantDelta = useCallback((delta: string) => {
    if (!delta) return
    if (!conversationInsertedRef.current) {
      void trackPersistencePromise(persistConversationStart())
    }

    pendingAssistantContentRef.current += delta

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
  }, [persistConversationStart, trackPersistencePromise])

  const appendUserTranscript = useCallback((transcript: string) => {
    if (!transcript) return
    setMessages((prev) => [...prev, {
      role: 'user',
      content: transcript,
      timestamp: Date.now(),
    }])
  }, [])

  const prepareIOSPlaybackRouteAfterMic = useCallback(async (reason: string) => {
    const beforeType = getIOSAudioSessionType()
    setIOSAudioSessionType('playback', reason)
    let recreatedOutputContext = false

    if (
      isIOSLikeSafariRuntime() &&
      shouldRecreateIOSAudioContextAfterMic() &&
      audioQueueRef.current.length === 0 &&
      pendingPcmSampleCountRef.current === 0
    ) {
      if (audioContextRef.current) {
        try { await audioContextRef.current.close() } catch { /* ignore */ }
        audioContextRef.current = null
      }
      workletModuleLoadedRef.current = false
      primeAudioForIOS()
      recreatedOutputContext = true
      outputContextRecreatedAfterMicRef.current = true
      grokAudioDebug('iosAudioSession:recreated-output-context-after-mic', {
        reason,
      })
    }

    const ctx = await ensureAudioContext()
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    const afterType = getIOSAudioSessionType()
    grokAudioDebug('sendTurn:ios-playback-route-prepared', {
      reason,
      beforeType,
      afterType,
      contextState: ctx.state,
      recreatedOutputContext,
    })
    return {
      beforeType,
      afterType,
      contextState: ctx.state,
      recreatedOutputContext,
    }
  }, [ensureAudioContext, primeAudioForIOS])

  const rejectPendingInputCommit = useCallback((message: string) => {
    const pending = pendingInputCommitRef.current
    if (!pending) return
    window.clearTimeout(pending.timeoutId)
    pendingInputCommitRef.current = null
    pending.reject(new Error(message))
  }, [])

  const waitForInputCommitAck = useCallback(() => {
    if (pendingInputCommitRef.current) {
      rejectPendingInputCommit('Previous audio turn did not commit. Please try again.')
    }

    return new Promise<void>((resolve, reject) => {
      const startedAt = performance.now()
      const timeoutId = window.setTimeout(() => {
        const pending = pendingInputCommitRef.current
        if (!pending || pending.startedAt !== startedAt) return
        pendingInputCommitRef.current = null
        grokAudioDebug('sendTurn:commit-ack-timeout', {
          msSinceCommitSent: performance.now() - startedAt,
        })
        reject(new Error('Audio turn did not commit. Please try again.'))
      }, INPUT_COMMIT_ACK_TIMEOUT_MS)

      pendingInputCommitRef.current = {
        resolve,
        reject,
        startedAt,
        timeoutId,
      }
    })
  }, [rejectPendingInputCommit])

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
      case 'response.created': {
        responseInProgressRef.current = true
        if (audioSessionTypeAtResponseCreateRef.current === null) {
          audioSessionTypeAtResponseCreateRef.current = getIOSAudioSessionType()
        }
        if (GROK_AUDIO_DEBUG) {
          grokAudioDebug('response.created', {
            responseId: getResponseId(payload),
          })
        }
        break
      }
      case 'response.text.delta': {
        const delta = typeof payload.delta === 'string' ? payload.delta : ''
        if (GROK_AUDIO_DEBUG) currentResponseTextDeltaSeenRef.current = true
        if (GROK_VERIFY_L0) grokVerifyTextDeltaAccumRef.current += delta
        appendAssistantDelta(delta)
        break
      }
      case 'response.output_audio_transcript.delta': {
        const delta = typeof payload.delta === 'string' ? payload.delta : ''
        if (GROK_VERIFY_L0) grokVerifyAudioTranscriptAccumRef.current += delta
        appendAssistantDelta(delta)
        break
      }
      case 'response.output_audio_transcript.done': {
        const transcript = typeof payload.transcript === 'string'
          ? payload.transcript
          : typeof payload.text === 'string'
            ? payload.text
            : ''
        const accumulated = pendingAssistantContentRef.current
        if (transcript && transcript !== accumulated) {
          console.warn('[grok-realtime] Assistant transcript mismatch:', {
            accumulatedLength: accumulated.length,
            transcriptLength: transcript.length,
          })
        }
        break
      }
      case 'response.output_audio.delta': {
        const delta = typeof payload.delta === 'string' ? payload.delta : ''
        if (!delta) break
        const responseId = getResponseId(payload)
        const responseKey = responseId ?? '__current_response__'
        if (currentAudioResponseKeyRef.current !== responseKey) {
          currentAudioResponseKeyRef.current = responseKey
          currentResponseAudioChunksRef.current = 0
          currentResponseFirstFivePeaksRef.current = []
          currentResponseFirstFiveRmsRef.current = []
          currentResponsePeaksRef.current = []
          currentResponseRmsRef.current = []
          audioSessionTypeAtFirstAudioDeltaRef.current = getIOSAudioSessionType()
          assistantResponseSeqRef.current += 1
          if (GROK_AUDIO_DEBUG) {
            grokAudioDebug('response.audio:first-delta', {
              responseSequence: assistantResponseSeqRef.current,
              responseId,
              audioChunkSeqAtStart: audioChunkSeqRef.current,
              audioSessionType: audioSessionTypeAtFirstAudioDeltaRef.current,
            })
          }
        }
        currentResponseAudioChunksRef.current += 1
        const bytes = decodeBase64ToBytes(delta)
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        const pcm = new Int16Array(bytes.byteLength / 2)
        for (let i = 0; i < pcm.length; i++) {
          pcm[i] = view.getInt16(i * 2, true)
        }
        if (GROK_AUDIO_DEBUG) {
          const stats = getPcmStats(pcm)
          if (currentResponseFirstFivePeaksRef.current.length < 5) {
            currentResponseFirstFivePeaksRef.current.push(stats.peak)
            currentResponseFirstFiveRmsRef.current.push(stats.rms)
          }
          currentResponsePeaksRef.current.push(stats.peak)
          currentResponseRmsRef.current.push(stats.rms)
        }
        if (getGrokPlaybackMode() === 'html-buffered') {
          htmlBufferedPcmChunksRef.current.push(pcm)
          htmlBufferedPcmSampleCountRef.current += pcm.length
        } else {
          pendingPcmChunksRef.current.push(pcm)
          pendingPcmSampleCountRef.current += pcm.length
          if (pendingPcmSampleCountRef.current >= PCM_FLUSH_SAMPLES) {
            await flushPendingAudio()
          }
        }
        break
      }
      case 'response.done': {
        const playbackMode = getGrokPlaybackMode()
        let playbackStarted = true
        if (playbackMode === 'html-buffered') {
          playbackStarted = await playHtmlBufferedAudio(assistantResponseSeqRef.current)
        } else {
          await flushPendingAudio()
        }
        responseInProgressRef.current = false
        const finalAssistantText = pendingAssistantContentRef.current
        const audioSessionTypeAtResponseDone = getIOSAudioSessionType()
        if (GROK_AUDIO_DEBUG) {
          grokAudioDebug('response.done', {
            responseSequence: assistantResponseSeqRef.current,
            audioChunksReceived: currentResponseAudioChunksRef.current,
            assistantTranscriptLength: finalAssistantText.length,
            textDeltaEventsArrived: currentResponseTextDeltaSeenRef.current,
            firstFivePeaks: currentResponseFirstFivePeaksRef.current,
            firstFiveRms: currentResponseFirstFiveRmsRef.current,
            minPeak: getMin(currentResponsePeaksRef.current),
            maxPeak: getMax(currentResponsePeaksRef.current),
            averageRms: getAverage(currentResponseRmsRef.current),
            audioSessionTypeAtResponseCreate: audioSessionTypeAtResponseCreateRef.current,
            audioSessionTypeAtFirstAudioDelta: audioSessionTypeAtFirstAudioDeltaRef.current,
            audioSessionTypeAtResponseDone,
            outputContextRecreatedAfterMic: outputContextRecreatedAfterMicRef.current,
            playbackMode,
          })
        }
        currentAudioResponseKeyRef.current = null
        currentResponseAudioChunksRef.current = 0
        currentResponseFirstFivePeaksRef.current = []
        currentResponseFirstFiveRmsRef.current = []
        currentResponsePeaksRef.current = []
        currentResponseRmsRef.current = []
        currentResponseTextDeltaSeenRef.current = false
        audioSessionTypeAtResponseCreateRef.current = null
        audioSessionTypeAtFirstAudioDeltaRef.current = null
        outputContextRecreatedAfterMicRef.current = false
        if (GROK_VERIFY_L0) {
          const responseSequence = grokVerifyResponseSequenceRef.current + 1
          grokVerifyResponseSequenceRef.current = responseSequence
          grokVerifyDebug({
            responseSequence,
            textDeltaAccum: grokVerifyTextDeltaAccumRef.current || null,
            audioTranscriptAccum: grokVerifyAudioTranscriptAccumRef.current || null,
            finalMerged: finalAssistantText,
          })
          grokVerifyTextDeltaAccumRef.current = ''
          grokVerifyAudioTranscriptAccumRef.current = ''
        }
        pendingAssistantContentRef.current = ''
        currentAssistantIndexRef.current = null
        if (finalAssistantText) {
          void trackPersistencePromise(persistSpeakMessage('assistant', finalAssistantText))
        }
        if (
          mountedRef.current &&
          audioQueueRef.current.length === 0 &&
          htmlBufferedAudioRef.current === null &&
          playbackStarted
        ) {
          setStatus('idle')
        }
        break
      }
      case 'input_audio_buffer.committed': {
        const pending = pendingInputCommitRef.current
        if (getGrokTurnProtocol() === 'server_vad') {
          const route = await prepareIOSPlaybackRouteAfterMic('server-vad-input-committed')
          grokAudioDebug('serverVad:ios-playback-route-prepared', {
            event: 'input_audio_buffer.committed',
            eventId: getEventId(payload),
            itemId: getItemId(payload),
            ...route,
          })
        }
        if (commitAckRecoveryPendingClearRef.current) {
          if (pending) {
            rejectPendingInputCommit('Audio turn did not commit. Please try again.')
          }
          if (GROK_AUDIO_DEBUG) {
            grokAudioDebug('input_audio_buffer:committed-stale-after-timeout', {
              eventId: getEventId(payload),
              itemId: getItemId(payload),
            })
          }
          break
        }
        if (pending) {
          const msSinceCommitSent = performance.now() - pending.startedAt
          window.clearTimeout(pending.timeoutId)
          pendingInputCommitRef.current = null
          grokAudioDebug('input_audio_buffer:committed', {
            eventId: getEventId(payload),
            itemId: getItemId(payload),
            msSinceCommitSent,
          })
          pending.resolve()
        } else if (GROK_AUDIO_DEBUG) {
          grokAudioDebug('input_audio_buffer:committed', {
            eventId: getEventId(payload),
            itemId: getItemId(payload),
            msSinceCommitSent: null,
          })
        }
        break
      }
      case 'input_audio_buffer.cleared': {
        commitAckRecoveryPendingClearRef.current = false
        if (GROK_AUDIO_DEBUG) {
          grokAudioDebug('input_audio_buffer:cleared', {
            eventId: getEventId(payload),
          })
        }
        break
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = typeof payload.transcript === 'string' ? payload.transcript : ''
        appendUserTranscript(transcript)
        void trackPersistencePromise(persistSpeakMessage('user', transcript))
        pendingUserTranscriptResolveRef.current?.()
        pendingUserTranscriptResolveRef.current = null
        break
      }
      case 'input_audio_buffer.speech_started': {
        resetAudioQueue()
        if (mountedRef.current) setStatus('recording')
        break
      }
      case 'input_audio_buffer.speech_stopped': {
        if (getGrokTurnProtocol() === 'server_vad') {
          const route = await prepareIOSPlaybackRouteAfterMic('server-vad-speech-stopped')
          grokAudioDebug('serverVad:ios-playback-route-prepared', {
            event: 'input_audio_buffer.speech_stopped',
            eventId: getEventId(payload),
            itemId: getItemId(payload),
            ...route,
          })
        }
        if (GROK_AUDIO_DEBUG) {
          grokAudioDebug('input_audio_buffer:speech_stopped', {
            eventId: getEventId(payload),
            itemId: getItemId(payload),
          })
        }
        break
      }
      case 'response.cancelled':
      case 'response.canceled': {
        responseInProgressRef.current = false
        rejectPendingInputCommit('Realtime response was cancelled')
        break
      }
      case 'response.error':
      case 'response.failed': {
        responseInProgressRef.current = false
        rejectPendingInputCommit('Grok response failed')
        const responseError = payload.error
        const message = typeof payload.message === 'string'
          ? payload.message
          : responseError && typeof responseError === 'object' && 'message' in responseError
            ? String((responseError as { message?: unknown }).message)
            : 'Grok response failed'
        console.error('[grok-realtime] Realtime response error:', payload)
        if (mountedRef.current) {
          setError(message)
          setStatus('error')
        }
        break
      }
      case 'error': {
        console.error('[grok-realtime] Realtime error:', payload)
        responseInProgressRef.current = false
        rejectPendingInputCommit('Grok realtime error')
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
  }, [appendAssistantDelta, appendUserTranscript, decodeBase64ToBytes, flushPendingAudio, persistSpeakMessage, playHtmlBufferedAudio, prepareIOSPlaybackRouteAfterMic, rejectPendingInputCommit, resetAudioQueue, trackPersistencePromise])

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

  const appendServerVadSilence = useCallback((ws: WebSocket) => {
    const silenceSamples = Math.round((PCM_SAMPLE_RATE * SERVER_VAD_SILENCE_MS) / 1000)
    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: encodeZeroPcmBase64(silenceSamples),
    }))
    if (GROK_AUDIO_DEBUG) {
      grokAudioDebug('sendTurn:server-vad-silence-appended', {
        silenceMs: SERVER_VAD_SILENCE_MS,
        sampleCount: silenceSamples,
      })
    }
  }, [])

  const pauseListeningCapture = useCallback(() => {
    if (GROK_AUDIO_DEBUG) {
      const tracks = streamRef.current?.getAudioTracks() ?? []
      grokAudioDebug('pauseListeningCapture:entry', {
        micCycleId: micCycleSeqRef.current,
        context: getAudioContextSnapshot(audioContextRef.current),
        tracksBeforeStop: tracks.map(getTrackSnapshot),
      })
    }
    if (micSourceRef.current) {
      try { micSourceRef.current.disconnect() } catch { /* ignore */ }
      micSourceRef.current = null
    }
    if (streamRef.current) {
      const stoppedAt = GROK_AUDIO_DEBUG ? performance.now() : null
      if (GROK_AUDIO_DEBUG) lastTrackStopAtRef.current = stoppedAt
      streamRef.current.getTracks().forEach((track) => track.stop())
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('pauseListeningCapture:tracks-stopped', {
          micCycleId: micCycleSeqRef.current,
          stoppedAt,
          finalTracks: streamRef.current.getAudioTracks().map(getTrackSnapshot),
        })
      }
      streamRef.current = null
    }
    setIOSAudioSessionType('playback', 'after-mic-release')
    if (GROK_AUDIO_DEBUG) {
      grokAudioDebug('pauseListeningCapture:playback-route-restored', {
        micCycleId: micCycleSeqRef.current,
        audioSession: getGrokIOSAudioSessionSnapshot(),
      })
    }
  }, [])

  const stopListening = useCallback(() => {
    if (GROK_AUDIO_DEBUG) {
      grokAudioDebug('stopListening:entry', {
        micCycleId: micCycleSeqRef.current,
        contextBeforeStop: getAudioContextSnapshot(audioContextRef.current),
        lastTrackStopAt: lastTrackStopAtRef.current,
      })
    }
    pendingInputFlushResolveRef.current?.()
    pendingInputFlushResolveRef.current = null
    if (workletRef.current) {
      try { workletRef.current.port.postMessage({ type: 'reset' }) } catch { /* ignore */ }
      workletRef.current.port.onmessage = null
      try { workletRef.current.disconnect() } catch { /* ignore */ }
      workletRef.current = null
    }
    pauseListeningCapture()
    setIOSAudioSessionType('playback', 'after-mic-release')
    if (GROK_AUDIO_DEBUG) {
      grokAudioDebug('stopListening:complete', {
        micCycleId: micCycleSeqRef.current,
        contextAfterStop: getAudioContextSnapshot(audioContextRef.current),
        audioSession: getGrokIOSAudioSessionSnapshot(),
        lastTrackStopAt: lastTrackStopAtRef.current,
      })
    }
    if (mountedRef.current) {
      setIsListening(false)
      if (statusRef.current === 'recording') setStatus('idle')
    }
  }, [pauseListeningCapture])

  const flushFinalUserTurnBeforeClose = useCallback(async (ws: WebSocket | null) => {
    if (!inputAudioAppendedRef.current || !ws || ws.readyState !== WebSocket.OPEN) {
      stopListening()
      return
    }

    try {
      pauseListeningCapture()
      await flushPendingInputAudio()
      stopListening()
      if (ws.readyState !== WebSocket.OPEN) return

      const turnProtocol = getGrokTurnProtocol()
      if (turnProtocol === 'server_vad') {
        appendServerVadSilence(ws)
        inputAudioAppendedRef.current = false
        return
      }

      const transcriptCompleted = new Promise<void>((resolve) => {
        pendingUserTranscriptResolveRef.current = resolve
      })
      const commitAck = waitForInputCommitAck()
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      await commitAck
      if (ws.readyState !== WebSocket.OPEN) return
      if (responseInProgressRef.current) {
        inputAudioAppendedRef.current = false
        return
      }
      const preparedRoute = await prepareIOSPlaybackRouteAfterMic('before-response-create')
      audioSessionTypeAtResponseCreateRef.current = preparedRoute.afterType
      ws.send(JSON.stringify({ type: 'response.create' }))
      responseInProgressRef.current = true
      inputAudioAppendedRef.current = false

      const timeout = sleepWithCancel(USER_TRANSCRIPT_DRAIN_TIMEOUT_MS)
      try {
        await Promise.race([
          transcriptCompleted,
          timeout.promise,
        ])
      } finally {
        timeout.cancel()
      }
    } catch (err) {
      console.warn('[grok-realtime] Failed to flush final user turn before close:', err)
      stopListening()
    } finally {
      pendingUserTranscriptResolveRef.current = null
    }
  }, [appendServerVadSilence, flushPendingInputAudio, pauseListeningCapture, prepareIOSPlaybackRouteAfterMic, stopListening, waitForInputCommitAck])

  const drainPendingPersistence = useCallback(async () => {
    const pending = Array.from(pendingPersistencePromisesRef.current)
    if (pending.length === 0) return

    const timeout = sleepWithCancel(PERSISTENCE_DRAIN_TIMEOUT_MS)
    try {
      await Promise.race([
        Promise.allSettled(pending),
        timeout.promise,
      ])
    } finally {
      timeout.cancel()
    }
  }, [])

  const teardownSession = useCallback(async () => {
    if (teardownPromiseRef.current) return teardownPromiseRef.current

    const teardownPromise = (async () => {
      endingSessionRef.current = true
      const closingConversationId = conversationIdRef.current
      const ws = wsRef.current

      try {
        await flushFinalUserTurnBeforeClose(ws)
        await drainPendingPersistence()
        resetAudioQueue()

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
        currentAudioResponseKeyRef.current = null
        currentResponseAudioChunksRef.current = 0
        currentResponseFirstFivePeaksRef.current = []
        currentResponseFirstFiveRmsRef.current = []
        currentResponsePeaksRef.current = []
        currentResponseRmsRef.current = []
        currentResponseTextDeltaSeenRef.current = false
        audioSessionTypeAtResponseCreateRef.current = null
        audioSessionTypeAtFirstAudioDeltaRef.current = null
        outputContextRecreatedAfterMicRef.current = false
        responseInProgressRef.current = false
        rejectPendingInputCommit('Grok realtime session ended')
        if (GROK_VERIFY_L0) {
          grokVerifyTextDeltaAccumRef.current = ''
          grokVerifyAudioTranscriptAccumRef.current = ''
        }
        pendingConversationInsertRef.current = null
        pendingPersistencePromisesRef.current.clear()
        pendingUserTranscriptResolveRef.current = null
        commitAckRecoveryPendingClearRef.current = false
        inputAudioAppendedRef.current = false
        htmlBufferedPcmChunksRef.current = []
        htmlBufferedPcmSampleCountRef.current = 0
        if (mountedRef.current) {
          setIsConnected(false)
          setIsListening(false)
          setStatus('idle')
        }
        await updateEndedAt(closingConversationId)
      } finally {
        endingSessionRef.current = false
        teardownPromiseRef.current = null
      }
    })()

    teardownPromiseRef.current = teardownPromise
    return teardownPromise
  }, [drainPendingPersistence, flushFinalUserTurnBeforeClose, rejectPendingInputCommit, resetAudioQueue, updateEndedAt])

  const teardownSessionRef = useRef(teardownSession)
  useEffect(() => { teardownSessionRef.current = teardownSession }, [teardownSession])

  const connectAndConfigure = useCallback(async (params: StartGrokSessionParams): Promise<void> => {
    primeAudioForIOS()
    setStatus('connecting')
    setError(null)

    const token = await fetchEphemeralToken()
    const ws = new WebSocket(GROK_REALTIME_URL, [`xai-client-secret.${token}`])
    const sessionConversationId = conversationIdRef.current
    wsRef.current = ws

    await new Promise<void>((resolve, reject) => {
      let settled = false

      ws.onopen = () => {
        try {
          const sessionConfig = buildGrokSessionConfig(params)
          if (GROK_AUDIO_DEBUG) {
            grokAudioDebug('grokSessionConfig:sent', {
              model: GROK_REALTIME_MODEL,
              websocketUrl: GROK_REALTIME_URL,
              voice: sessionConfig.session.voice,
              turn_detection: sessionConfig.session.turn_detection,
              inputRate: sessionConfig.session.audio.input.format.rate,
              outputRate: sessionConfig.session.audio.output.format.rate,
              sessionKeys: Object.keys(sessionConfig.session),
            })
          }
          ws.send(JSON.stringify(sessionConfig))
          setIOSAudioSessionType('playback', 'prime-before-greeting')
          audioSessionTypeAtResponseCreateRef.current = getIOSAudioSessionType()
          outputContextRecreatedAfterMicRef.current = false
          ws.send(JSON.stringify({ type: 'response.create' }))
          responseInProgressRef.current = true
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
        responseInProgressRef.current = false
        rejectPendingInputCommit('Realtime connection failed')
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
        responseInProgressRef.current = false
        commitAckRecoveryPendingClearRef.current = false
        rejectPendingInputCommit('Realtime connection closed')
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
  }, [fetchEphemeralToken, handleSocketMessage, primeAudioForIOS, rejectPendingInputCommit, updateEndedAt])

  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Grok session is not connected')
      setStatus('error')
      return
    }
    if (commitAckRecoveryPendingClearRef.current) {
      setError('Audio turn did not commit. Please try again.')
      setStatus('idle')
      return
    }
    if (isListening) return

    try {
      let micCycleId = 0
      if (GROK_AUDIO_DEBUG) {
        micCycleId = micCycleSeqRef.current + 1
        micCycleSeqRef.current = micCycleId
      }
      setError(null)
      primeAudioForIOS()
      const ctx = await ensureAudioContext()
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('startListening:before-getUserMedia', {
          micCycleId,
          context: getAudioContextSnapshot(ctx),
          audioSession: getGrokIOSAudioSessionSnapshot(),
        })
      }
      setIOSAudioSessionType('play-and-record', 'before-getUserMedia')
      const useIOSMicProcessingOff = isIOSLikeSafariRuntime() && shouldDisableIOSMicProcessing()
      const audioConstraints = getGrokMicAudioConstraints()
      if (useIOSMicProcessingOff) {
        grokAudioDebug('startListening:ios-mic-processing-off', {
          micCycleId,
        })
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      streamRef.current = stream
      if (GROK_AUDIO_DEBUG) {
        const audioTracks = stream.getAudioTracks()
        grokAudioDebug('startListening:after-getUserMedia', {
          micCycleId,
          context: getAudioContextSnapshot(ctx),
          audioSession: getGrokIOSAudioSessionSnapshot(),
          tracks: audioTracks.map((track) => ({
            ...getTrackSnapshot(track),
            settings: getTrackSettingsSnapshot(track),
          })),
        })
      }

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
        inputAudioAppendedRef.current = true
      }

      micSourceRef.current = source
      workletRef.current = worklet
      setIsListening(true)
      setStatus('recording')
    } catch (err) {
      console.error('[grok-realtime] Failed to start listening:', err)
      setIOSAudioSessionType('playback', 'after-mic-release')
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
    if (commitAckRecoveryPendingClearRef.current) {
      stopListening()
      setError('Audio turn did not commit. Please try again.')
      setStatus('idle')
      return
    }
    if (responseInProgressRef.current) {
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('sendTurn:response-in-progress-skip', {
          micCycleId: micCycleSeqRef.current,
        })
      }
      stopListening()
      setError('Grok is still responding. Please try again.')
      setStatus('idle')
      return
    }

    try {
      const turnProtocol = getGrokTurnProtocol()
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('sendTurn:entry', {
          micCycleId: micCycleSeqRef.current,
          turnProtocol,
          contextBeforeCommit: getAudioContextSnapshot(audioContextRef.current),
          lastTrackStopAt: lastTrackStopAtRef.current,
        })
      }
      pauseListeningCapture()
      await flushPendingInputAudio()
      stopListening()
      if (endingSessionRef.current || wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return

      if (turnProtocol === 'server_vad') {
        appendServerVadSilence(ws)
        inputAudioAppendedRef.current = false
        setError(null)
        setStatus('thinking')
        if (GROK_AUDIO_DEBUG) {
          grokAudioDebug('sendTurn:server-vad-awaiting-response', {
            micCycleId: micCycleSeqRef.current,
          })
        }
        return
      }

      if (GROK_AUDIO_DEBUG) {
        const commitAt = performance.now()
        grokAudioDebug('sendTurn:before-commit', {
          micCycleId: micCycleSeqRef.current,
          commitAt,
          msSinceTrackStop: lastTrackStopAtRef.current === null ? null : commitAt - lastTrackStopAtRef.current,
          contextBeforeCommit: getAudioContextSnapshot(audioContextRef.current),
        })
      }
      const commitAck = waitForInputCommitAck()
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      grokAudioDebug('sendTurn:commit-sent', {
        micCycleId: micCycleSeqRef.current,
      })
      try {
        await commitAck
      } catch (err) {
        if (ws.readyState === WebSocket.OPEN) {
          commitAckRecoveryPendingClearRef.current = true
          ws.send(JSON.stringify({ type: 'input_audio_buffer.clear' }))
        }
        inputAudioAppendedRef.current = false
        setError(err instanceof Error ? err.message : 'Audio turn did not commit. Please try again.')
        setStatus('idle')
        return
      }
      if (endingSessionRef.current || wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return
      const preparedRoute = await prepareIOSPlaybackRouteAfterMic('before-response-create')
      audioSessionTypeAtResponseCreateRef.current = preparedRoute.afterType
      ws.send(JSON.stringify({ type: 'response.create' }))
      responseInProgressRef.current = true
      grokAudioDebug('sendTurn:response-create-after-commit', {
        micCycleId: micCycleSeqRef.current,
      })
      if (GROK_AUDIO_DEBUG) {
        grokAudioDebug('sendTurn:after-commit', {
          micCycleId: micCycleSeqRef.current,
          contextAfterCommit: getAudioContextSnapshot(audioContextRef.current),
        })
      }
      inputAudioAppendedRef.current = false
      setError(null)
      setStatus('thinking')
    } catch (err) {
      console.error('[grok-realtime] Failed to send turn:', err)
      stopListening()
      setError(err instanceof Error ? err.message : 'Failed to send audio turn')
      setStatus('error')
    }
  }, [appendServerVadSilence, flushPendingInputAudio, pauseListeningCapture, prepareIOSPlaybackRouteAfterMic, stopListening, waitForInputCommitAck])

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
    pendingConversationInsertRef.current = null
    pendingPersistencePromisesRef.current.clear()
    pendingUserTranscriptResolveRef.current = null
    inputAudioAppendedRef.current = false
    teardownPromiseRef.current = null
    endedConversationIdsRef.current.delete(conversationIdRef.current)
    currentAssistantIndexRef.current = null
    pendingAssistantContentRef.current = ''
    if (GROK_AUDIO_DEBUG) {
      assistantResponseSeqRef.current = 0
      audioChunkSeqRef.current = 0
      firstChunkSeenForResponseRef.current.clear()
      micCycleSeqRef.current = 0
      currentAudioResponseKeyRef.current = null
      currentResponseAudioChunksRef.current = 0
      currentResponseTextDeltaSeenRef.current = false
      lastTrackStopAtRef.current = null
    }
    if (GROK_VERIFY_L0) {
      grokVerifyResponseSequenceRef.current = 0
      grokVerifyTextDeltaAccumRef.current = ''
      grokVerifyAudioTranscriptAccumRef.current = ''
    }
    pendingPcmChunksRef.current = []
    pendingPcmSampleCountRef.current = 0
    htmlBufferedPcmChunksRef.current = []
    htmlBufferedPcmSampleCountRef.current = 0
    audioSessionTypeAtResponseCreateRef.current = null
    audioSessionTypeAtFirstAudioDeltaRef.current = null
    outputContextRecreatedAfterMicRef.current = false
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
