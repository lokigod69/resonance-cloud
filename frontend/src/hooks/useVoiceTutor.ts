import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { type TutorVoice, TUTOR_VOICES, getVoicesForLanguage } from '@/voiceRegistry'
import { type TutorCharacter, resolveCharacterVoice } from '@/characterRegistry'
import { supabase } from '@/lib/supabase'
import { playAudioViaContext, playAudioViaElement } from '@/lib/audioUtils'
import {
  type RoleplayScenario,
  pickContextVariant,
  pickNpcName,
  pickNpcMood,
  compileScenarioPrompt,
} from '@/data/roleplayScenarios'
import { getGeminiCharacterMode } from '@/data/geminiCharacterModes'

const IS_SAFARI = typeof navigator !== 'undefined' && (
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  || /iPad|iPhone|iPod/.test(navigator.userAgent)
)

// Looped HTMLAudioElement pointing at /silent.mp3 forces iOS' audio session
// onto the "media" channel. Without this, Web Audio stays on the "ringer"
// channel and the first post-async playback is silently dropped until a
// MediaStream (e.g. mic) activates the session. Pattern per swevans/unmute:
// play a short silent file continuously; the session category persists as
// long as the element is playing. A real file is used instead of an inline
// data URL because some iOS Safari versions silently reject data-URL audio.
const SILENT_MP3_URL = '/silent.mp3'

export type TutorStatus = 'idle' | 'recording' | 'processing' | 'playing' | 'error'

export interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
  revealed: boolean
  audioBase64?: string
  audioFormat?: string
}

interface VoiceChatResponse {
  user_text: string
  ai_text: string
  audio_base64: string
  audio_format: string
}

export type SpeakProvider = 'voxtral' | 'gemini' | 'grok'
export type GeminiPickerStage = 'voice' | 'mode' | 'accent'

export interface GeminiTutorParams {
  characterModeId: string
  characterModeName: string
  voiceName: string
  version: number
  accentId?: string
}

export interface UseVoiceTutorReturn {
  language: string | null
  voice: TutorVoice | null
  character: TutorCharacter | null
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
  startConversationWithCharacter: (char: TutorCharacter) => Promise<void>
  startConversationWithGemini: (params: GeminiTutorParams) => Promise<void>
  startRoleplay: (scenario: RoleplayScenario, language: string, level: string) => Promise<void>
  isRoleplayMode: boolean
  activeScenario: RoleplayScenario | null
  activeNpcName: string | null
  selectLevel: (level: string) => Promise<void>
  changeVoice: () => void
  cancelChangeVoice: () => void
  changeLevel: () => void
  cancelLevelChange: () => void
  showLevelPicker: boolean
  newChat: () => Promise<void>
  resetConversation: () => void
  studyMode: boolean
  toggleStudyMode: (words: Array<{ word: string; translation: string }>) => void
  listenMode: boolean
  toggleListenMode: () => void
  revealMessage: (index: number) => void
  playPendingAudio: () => Promise<void>
  replayMessageAudio: (message: TutorMessage) => Promise<void>
  saveCorrections: (corrections: unknown) => Promise<void>
  conversationId: string | null
  provider: SpeakProvider
  setProvider: (provider: SpeakProvider) => void
  geminiModeId: string | null
  geminiModeName: string | null
  geminiVoiceName: string | null
  geminiAccentId: string
  geminiPickerStage: GeminiPickerStage
  setGeminiModeId: (modeId: string | null) => void
  setGeminiVoiceName: (voiceName: string | null) => void
  setGeminiAccentId: (accentId: string) => void
  setGeminiPickerStage: (stage: GeminiPickerStage) => void
  stopAllAudio: () => void
  isChangingVoice: boolean
  applyGeminiVoiceChange: (params: GeminiTutorParams) => Promise<void>
  applyVoxtralCharacterChange: (char: TutorCharacter) => Promise<void>
}

const LS_PROVIDER = 'resonance_speak_provider'
const LS_GEMINI_MODE = 'resonance_speak_gemini_mode_id'
const LS_GEMINI_VOICE = 'resonance_speak_gemini_voice_name'
const LS_GEMINI_ACCENT = 'resonance_speak_gemini_accent_id'
const DEFAULT_ACCENT_ID = 'none'

function readStoredProvider(): SpeakProvider {
  if (typeof window === 'undefined') return 'grok'
  const raw = window.localStorage.getItem(LS_PROVIDER)
  if (raw === 'gemini') return 'gemini'
  if (raw === 'voxtral') return 'voxtral'
  if (raw === 'grok') return 'grok'
  return 'grok'
}

function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

function writeStored(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  if (value === null) window.localStorage.removeItem(key)
  else window.localStorage.setItem(key, value)
}

// ── Speak history persistence helpers ─────────────────────────────────────────

async function getConversationUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ─────────────────────────────────────────────────────────────────────────────

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

function getMimeType(): string {
  // Safari/iOS reports WebM as supported but the implementation is buggy —
  // MediaRecorder produces zero ondataavailable events with WebM.
  // Always use audio/mp4 on Safari.
  const types = IS_SAFARI
    ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export function useVoiceTutor(baseLang?: string): UseVoiceTutorReturn {
  const baseLangRef = useRef<string | undefined>(baseLang)
  useEffect(() => { baseLangRef.current = baseLang }, [baseLang])
  const resolveNativeLanguage = (): string => {
    if (baseLangRef.current) return baseLangRef.current
    return (typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : null) || 'en'
  }

  const [language, setLanguage] = useState<string | null>(null)
  const [voice, setVoice] = useState<TutorVoice | null>(null)
  const [character, setCharacter] = useState<TutorCharacter | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [provider, setProviderState] = useState<SpeakProvider>(() => readStoredProvider())
  const [geminiModeId, setGeminiModeId] = useState<string | null>(() => readStored(LS_GEMINI_MODE))
  const [geminiVoiceName, setGeminiVoiceName] = useState<string | null>(() => readStored(LS_GEMINI_VOICE))
  const [geminiAccentId, setGeminiAccentId] = useState<string>(() => readStored(LS_GEMINI_ACCENT) ?? DEFAULT_ACCENT_ID)
  const [geminiPickerStage, setGeminiPickerStageState] = useState<GeminiPickerStage>('voice')
  const providerRef = useRef<SpeakProvider>(provider)
  const geminiModeIdRef = useRef<string | null>(geminiModeId)
  const geminiVoiceNameRef = useRef<string | null>(geminiVoiceName)
  const geminiAccentIdRef = useRef<string>(geminiAccentId)
  const geminiModeName = useMemo(
    () => (geminiModeId ? getGeminiCharacterMode(geminiModeId)?.displayName ?? null : null),
    [geminiModeId],
  )
  const [status, setStatus] = useState<TutorStatus>('idle')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pendingAudio, setPendingAudio] = useState<{ base64: string; format: string } | null>(null)
  const [showLevelPicker, setShowLevelPicker] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isChangingVoice, setIsChangingVoice] = useState(false)
  const [studyMode, setStudyMode] = useState(false)
  const studyModeRef = useRef(false)
  const studyWordsRef = useRef<Array<{ word: string; translation: string }>>([])
  const [listenMode, setListenMode] = useState(false)
  const listenModeRef = useRef(false)

  // ── Roleplay mode state ──
  const [isRoleplayMode, setIsRoleplayMode] = useState(false)
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null)
  const [activeNpcName, setActiveNpcName] = useState<string | null>(null)
  const isRoleplayRef = useRef(false)
  const scenarioPromptRef = useRef<string | null>(null)
  const roleplayMetaRef = useRef<{
    scenarioId: string
    npcName: string
    variantId: string
    title: string
  } | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const silentPrimerRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const messagesRef = useRef<TutorMessage[]>([])
  const voiceRef = useRef<TutorVoice | null>(null)
  const characterRef = useRef<TutorCharacter | null>(null)
  const previousStateRef = useRef<{
    voice: TutorVoice
    character: TutorCharacter | null
    messages: TutorMessage[]
    studyMode: boolean
    studyWords: Array<{ word: string; translation: string }>
    conversationId: string | null
    messageCount: number
    provider: SpeakProvider
    geminiModeId: string | null
    geminiVoiceName: string | null
    geminiAccentId: string
  } | null>(null)
  const levelRef = useRef<string | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')
  const statusRef = useRef<TutorStatus>('idle')
  const recordingStartTime = useRef<number>(0)
  const discardRecordingRef = useRef<boolean>(false)
  const acquiringStreamRef = useRef(false)
  const conversationIdRef = useRef<string | null>(null)
  const convMessageCountRef = useRef<number>(0)
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const activeAudioElRef = useRef<HTMLAudioElement | null>(null)
  const playbackGenerationRef = useRef(0)
  const audioTaskGenerationRef = useRef(0)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    voiceRef.current = voice
  }, [voice])

  useEffect(() => {
    characterRef.current = character
  }, [character])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    providerRef.current = provider
    writeStored(LS_PROVIDER, provider)
  }, [provider])

  useEffect(() => {
    geminiModeIdRef.current = geminiModeId
    writeStored(LS_GEMINI_MODE, geminiModeId)
  }, [geminiModeId])

  useEffect(() => {
    geminiVoiceNameRef.current = geminiVoiceName
    writeStored(LS_GEMINI_VOICE, geminiVoiceName)
  }, [geminiVoiceName])

  useEffect(() => {
    geminiAccentIdRef.current = geminiAccentId
    writeStored(LS_GEMINI_ACCENT, geminiAccentId)
  }, [geminiAccentId])

  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'

  // ── Speak history: fire-and-forget persistence ────────────────────────────

  const createConversation = useCallback(async (lang: string, greeting: string) => {
    try {
      const userId = await getConversationUserId()
      if (!userId) return

      const id = crypto.randomUUID()
      conversationIdRef.current = id
      setConversationId(id)
      convMessageCountRef.current = 1

      const rp = roleplayMetaRef.current
      const isGemini = providerRef.current === 'gemini'
      await supabase.from('speak_conversations').insert({
        id,
        user_id: userId,
        language: lang,
        voice_name: rp
          ? rp.npcName
          : (isGemini
              ? geminiVoiceNameRef.current
              : (characterRef.current?.name ?? voiceRef.current?.name ?? null)),
        character_id: rp || isGemini ? null : (characterRef.current?.id ?? null),
        level: levelRef.current ?? null,
        message_count: 1,
        title: rp ? rp.title : greeting.slice(0, 80),
        started_at: new Date().toISOString(),
        provider: providerRef.current,
        gemini_character_mode_id: isGemini ? geminiModeIdRef.current : null,
        gemini_voice_name: isGemini ? geminiVoiceNameRef.current : null,
        gemini_accent_id: isGemini ? geminiAccentIdRef.current : null,
        ...(rp
          ? {
              mode: 'roleplay',
              scenario_id: rp.scenarioId,
              npc_name: rp.npcName,
              context_variant: rp.variantId,
            }
          : { mode: 'freeform' }),
      })

      await supabase.from('speak_messages').insert({
        conversation_id: id,
        role: 'assistant',
        content: greeting,
      })
    } catch (err) {
      console.warn('[speak-history] Failed to create conversation:', err)
    }
  }, [])

  const persistMessages = useCallback(async (userText: string | null, aiText: string) => {
    const convId = conversationIdRef.current
    if (!convId) return

    try {
      const rows: Array<{ conversation_id: string; role: string; content: string }> = []
      if (userText) rows.push({ conversation_id: convId, role: 'user', content: userText })
      rows.push({ conversation_id: convId, role: 'assistant', content: aiText })

      await supabase.from('speak_messages').insert(rows)

      convMessageCountRef.current += rows.length
      await supabase.rpc('increment_speak_message_count', {
        conv_id: convId,
        inc: rows.length,
      })
    } catch (err) {
      console.warn('[speak-history] Failed to persist messages:', err)
    }
  }, [])

  const endConversation = useCallback(async () => {
    const convId = conversationIdRef.current
    if (!convId) return

    conversationIdRef.current = null
    setConversationId(null)
    convMessageCountRef.current = 0

    try {
      await supabase.from('speak_conversations')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', convId)
    } catch (err) {
      console.warn('[speak-history] Failed to end conversation:', err)
    }
  }, [])

  const saveCorrections = useCallback(async (corrections: unknown) => {
    const convId = conversationIdRef.current
    if (!convId) return
    try {
      await supabase.from('speak_conversations')
        .update({ corrections })
        .eq('id', convId)
    } catch (err) {
      console.warn('[speak-history] Failed to save corrections:', err)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  const callVoiceChat = useCallback(
    async (audio_base64: string | null, lang: string, v?: TutorVoice): Promise<VoiceChatResponse> => {
      const body: Record<string, unknown> = {
        audio_base64,
        language: lang,
        history: messagesRef.current.slice(-20).map(({ role, content }) => ({ role, content })),
        mime_type: mimeTypeRef.current,
        level: levelRef.current || 'intermediate',
        native_language: resolveNativeLanguage(),
      }

      // Provider + Voice + character resolution
      if (providerRef.current === 'gemini' && geminiModeIdRef.current && geminiVoiceNameRef.current) {
        body.provider = 'gemini'
        body.gemini_character_mode_id = geminiModeIdRef.current
        body.gemini_voice_name = geminiVoiceNameRef.current
        body.gemini_accent_id = geminiAccentIdRef.current
        // Inject a lightweight vibe directive so the LLM can colour text to
        // match the selected Gemini mode (not just TTS pronunciation).
        // Level-scaled: 'zero' gets the lightest "flavor" tier, 'beginner'
        // the "hint" tier, 'intermediate'/'advanced' the full directive.
        // Single-injection invariant: server never re-prepends this string
        // into the greeting user message.
        const vibeMode = getGeminiCharacterMode(geminiModeIdRef.current)
        if (vibeMode) {
          const currentLevel = levelRef.current || 'intermediate'
          const tier =
            currentLevel === 'zero'     ? vibeMode.geminiVibeFlavor :
            currentLevel === 'beginner' ? vibeMode.geminiVibeHint :
                                          vibeMode.geminiVibeDirective
          body.gemini_vibe_directive = tier
        }
        // Intentionally no character_* fields — Gemini mode stays TTS-only
        // for the style prompt; the vibe directive above is the text-layer
        // equivalent and is handled by a dedicated server branch.
      } else {
        const currentChar = characterRef.current
        if (currentChar) {
          const resolved = resolveCharacterVoice(currentChar, lang)
          if (resolved.mistralVoiceId) body.voice_id = resolved.mistralVoiceId
          if (resolved.elevenLabsId) body.elevenlabs_voice_id = resolved.elevenLabsId
          body.character_name = currentChar.name
          body.character_tier = currentChar.tier
          if (currentChar.identity) body.character_identity = currentChar.identity
          body.character_directive = currentChar.directive
        } else {
          if (v?.mistralVoiceId) body.voice_id = v.mistralVoiceId
          if (v?.elevenLabsId) body.elevenlabs_voice_id = v.elevenLabsId
        }
      }

      if (studyModeRef.current && studyWordsRef.current.length > 0) {
        body.study_words = studyWordsRef.current
      }

      // Roleplay: inject scenario prompt; on initial (no audio) call, send sentinel
      if (isRoleplayRef.current && scenarioPromptRef.current) {
        body.mode = 'roleplay'
        body.scenarioPrompt = scenarioPromptRef.current
        // Tutor persona fields should not apply in roleplay
        delete body.character_name
        delete body.character_tier
        delete body.character_identity
        delete body.character_directive
        if (!audio_base64) {
          body.message = '__ROLEPLAY_OPEN__'
        }
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)

      let res: Response
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !data.session?.access_token) {
          throw new Error('Your session expired. Please sign in again.')
        }

        res = await fetch('/api/voice-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
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
   * Synchronous iOS audio unlock. Must be called inside a user-gesture handler
   * before any await. Dual-primer pattern per swevans/unmute:
   *   1. AudioContext silent buffer — unlocks Web Audio API output.
   *   2. HTMLAudioElement looping a silent MP3 — forces iOS' audio session
   *      onto the "media" channel instead of "ringer". Without #2, first
   *      Web Audio playback after a multi-second async gap is silently
   *      dropped on iOS (ringer channel not fully activated) until a
   *      MediaStream flips the session. The HTMLAudioElement primer
   *      achieves the same category-commit without mic permission cost.
   */
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

  /**
   * Ensure the AudioContext is created and in 'running' state.
   * Must be called inside a user gesture on iOS to "unlock" it.
   * Once unlocked, audio can be played from any context (including onstop callbacks).
   */
  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    const ctx = audioContextRef.current
    if (ctx.state !== 'running' && ctx.state !== 'closed') {
      await ctx.resume().catch(() => {})
    }
    return ctx
  }, [])

  const stopPlayback = useCallback((invalidateTasks: boolean) => {
    if (invalidateTasks) {
      audioTaskGenerationRef.current++
    }
    playbackGenerationRef.current++
    if (activeSourceRef.current) {
      const source = activeSourceRef.current
      activeSourceRef.current = null
      try { source.stop(0) } catch { /* already stopped */ }
      try { source.disconnect() } catch { /* ignore */ }
    }
    if (activeAudioElRef.current) {
      const el = activeAudioElRef.current
      activeAudioElRef.current = null
      const src = el.src
      try { el.pause() } catch { /* ignore */ }
      try { el.currentTime = 0 } catch { /* ignore */ }
      try { el.dispatchEvent(new Event('ended')) } catch { /* ignore */ }
      try { el.removeAttribute('src') } catch { /* ignore */ }
      try { el.src = '' } catch { /* ignore */ }
      try { el.load() } catch { /* ignore */ }
      if (src.startsWith('blob:')) {
        try { URL.revokeObjectURL(src) } catch { /* ignore */ }
      }
    }
  }, [])

  const stopAllAudio = useCallback(() => {
    stopPlayback(true)
    setPendingAudio(null)
    if (statusRef.current === 'playing') {
      setStatus('idle')
    }
  }, [stopPlayback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio()
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
      if (silentPrimerRef.current) {
        try { silentPrimerRef.current.pause() } catch { /* ignore */ }
        silentPrimerRef.current = null
      }
      // Fire-and-forget: mark conversation ended when user navigates away
      if (conversationIdRef.current) {
        const convId = conversationIdRef.current
        conversationIdRef.current = null
        supabase.from('speak_conversations')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', convId)
          .then(() => {}, () => {})
      }
    }
  }, [stopAllAudio])

  /**
   * Play audio via HTMLAudioElement on Safari/iOS, or AudioContext elsewhere.
   * iOS routes AudioContext output to the ringer audio-session category, which
   * can be silently downgraded after an idle wait; HTMLAudioElement uses the
   * media category, matching the reliable voice-sample playback path.
   */
  const playAudio = useCallback(async (base64: string, format: string) => {
    stopPlayback(false)
    const generation = ++playbackGenerationRef.current
    const isAborted = () => playbackGenerationRef.current !== generation
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      const own: { node: AudioBufferSourceNode | null } = { node: null }
      await playAudioViaContext(base64, format, audioContextRef.current, (source) => {
        own.node = source
        activeSourceRef.current = source
      }, isAborted)
      if (activeSourceRef.current === own.node) {
        activeSourceRef.current = null
      }
      return
    }
    const own: { el: HTMLAudioElement | null } = { el: null }
    await playAudioViaElement(base64, format, (audio) => {
      own.el = audio
      activeAudioElRef.current = audio
    }, isAborted)
    if (activeAudioElRef.current === own.el) {
      activeAudioElRef.current = null
    }
  }, [stopPlayback])

  const playPendingAudio = useCallback(async () => {
    if (!pendingAudio) return
    if (statusRef.current === 'playing') return
    const taskGeneration = audioTaskGenerationRef.current
    await ensureAudioContext()  // Unlock AudioContext on "Tap to hear" gesture
    if (audioTaskGenerationRef.current !== taskGeneration) return
    setStatus('playing')
    try {
      await playAudio(pendingAudio.base64, pendingAudio.format)
    } catch {
      // ignore playback errors — user can tap again or proceed
    }
    if (audioTaskGenerationRef.current !== taskGeneration) return
    setPendingAudio(null)
    setStatus('idle')
  }, [pendingAudio, ensureAudioContext, playAudio])

  // Reveal the last assistant message after 1.5s
  const scheduleReveal = useCallback(() => {
    setTimeout(() => {
      if (listenModeRef.current) return
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, revealed: true } : m)),
      )
    }, 1500)
  }, [])

  const fetchAndPlayGreeting = useCallback(
    async (lang: string, v: TutorVoice) => {
      const taskGeneration = audioTaskGenerationRef.current
      setStatus('processing')

      // Unlock AudioContext on the user gesture (voice/language card click)
      await ensureAudioContext()
      if (audioTaskGenerationRef.current !== taskGeneration) return

      const data = await callVoiceChat(null, lang, v)
      if (audioTaskGenerationRef.current !== taskGeneration) return
      const msg: TutorMessage = {
        role: 'assistant',
        content: data.ai_text,
        revealed: !listenModeRef.current,
        audioBase64: data.audio_base64 || undefined,
        audioFormat: data.audio_format || undefined,
      }
      setMessages([msg])
      messagesRef.current = [msg]
      createConversation(lang, data.ai_text)

      if (data.audio_base64) {
        // Try auto-play, fall back to Tap to hear
        try {
          setStatus('playing')
          await playAudio(data.audio_base64, data.audio_format)
          if (audioTaskGenerationRef.current !== taskGeneration) return
          setStatus('idle')
        } catch {
          // Auto-play blocked — fall back to Tap to hear
          if (audioTaskGenerationRef.current !== taskGeneration) return
          setPendingAudio({ base64: data.audio_base64, format: data.audio_format })
          setStatus('idle')
        }
      } else {
        // TTS failed on server — show text only, no error
        if (audioTaskGenerationRef.current !== taskGeneration) return
        setStatus('idle')
      }
    },
    [callVoiceChat, ensureAudioContext, playAudio, createConversation],
  )

  const selectLanguage = useCallback(
    (lang: string) => {
      stopAllAudio()
      endConversation()
      setLanguage(lang)
      setVoice(null)
      voiceRef.current = null
      setCharacter(null)
      characterRef.current = null
      setLevel(null)
      levelRef.current = null
      setMessages([])
      messagesRef.current = []
      setError(null)
      setStatus('idle')
      studyModeRef.current = false
      studyWordsRef.current = []
      setStudyMode(false)
      // Exit roleplay when switching language
      isRoleplayRef.current = false
      setIsRoleplayMode(false)
      setActiveScenario(null)
      setActiveNpcName(null)
      scenarioPromptRef.current = null
      roleplayMetaRef.current = null
      setGeminiPickerStageState('voice')
    },
    [endConversation, stopAllAudio],
  )

  const startConversationWithCharacter = useCallback(
    async (char: TutorCharacter) => {
      primeAudioForIOS()
      const lang = language
      if (!lang) return

      // iOS: unlock AudioContext on the user gesture before any await
      await ensureAudioContext()

      // Defensive: ensure roleplay state is cleared if entering freeform from any path
      isRoleplayRef.current = false
      scenarioPromptRef.current = null
      roleplayMetaRef.current = null
      setIsRoleplayMode(false)
      setActiveScenario(null)
      setActiveNpcName(null)

      // End any prior conversation (e.g. when switching tutors via changeVoice)
      stopAllAudio()
      endConversation()
      previousStateRef.current = null
      // Clear prior message history so the greeting request does not carry
      // stale turns (possibly from a different language) into the new session.
      setMessages([])
      messagesRef.current = []

      const resolved = resolveCharacterVoice(char, lang)
      const syntheticVoice: TutorVoice = {
        id: `char_${char.id}_${lang}`,
        name: char.name,
        language: lang,
        gender: char.gender,
        mistralVoiceId: resolved.mistralVoiceId,
        elevenLabsId: resolved.elevenLabsId,
        sampleUrl: '',
      }

      setCharacter(char)
      characterRef.current = char
      setVoice(syntheticVoice)
      voiceRef.current = syntheticVoice
      setError(null)

      // Check for saved level — skip level picker if available
      const savedLevel = localStorage.getItem(`voice-tutor-level-${lang}`)
      if (savedLevel) {
        setLevel(savedLevel)
        levelRef.current = savedLevel
        try {
          await fetchAndPlayGreeting(lang, syntheticVoice)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to start conversation')
          setStatus('error')
        }
      }
      // Otherwise level is null → State 2.5 (level picker) renders
    },
    [language, fetchAndPlayGreeting, endConversation, ensureAudioContext, primeAudioForIOS, stopAllAudio],
  )

  const startConversationWithGemini = useCallback(
    async (params: GeminiTutorParams) => {
      primeAudioForIOS()
      const lang = language
      if (!lang) return

      await ensureAudioContext()

      // Clear roleplay + prior Voxtral character — Gemini has no character tier
      isRoleplayRef.current = false
      scenarioPromptRef.current = null
      roleplayMetaRef.current = null
      setIsRoleplayMode(false)
      setActiveScenario(null)
      setActiveNpcName(null)

      stopAllAudio()
      endConversation()
      previousStateRef.current = null
      // Clear prior message history so the greeting request does not carry
      // stale turns (possibly from a different language) into the new session.
      setMessages([])
      messagesRef.current = []

      // Synthetic voice so the rest of the state machine (greeting, conversation
      // header, replay buttons) works unchanged. `TutorCharacter` is left null
      // for Gemini since mode prompts are TTS-only and must not influence the LLM.
      const syntheticVoice: TutorVoice = {
        id: `gemini_${params.characterModeId}_${params.voiceName}_${lang}`,
        name: params.voiceName,
        language: lang,
        gender: 'female',
        mistralVoiceId: '',
        sampleUrl: '',
      }

      setCharacter(null)
      characterRef.current = null
      setGeminiModeId(params.characterModeId)
      geminiModeIdRef.current = params.characterModeId
      setGeminiVoiceName(params.voiceName)
      geminiVoiceNameRef.current = params.voiceName
      const nextAccent = params.accentId ?? DEFAULT_ACCENT_ID
      setGeminiAccentId(nextAccent)
      geminiAccentIdRef.current = nextAccent
      setGeminiPickerStageState('mode')
      setVoice(syntheticVoice)
      voiceRef.current = syntheticVoice
      setError(null)

      const savedLevel = localStorage.getItem(`voice-tutor-level-${lang}`)
      if (savedLevel) {
        setLevel(savedLevel)
        levelRef.current = savedLevel
        try {
          await fetchAndPlayGreeting(lang, syntheticVoice)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to start conversation')
          setStatus('error')
        }
      }
    },
    [language, fetchAndPlayGreeting, endConversation, ensureAudioContext, primeAudioForIOS, stopAllAudio],
  )

  // Hot-swap (Part 3): change the active voice/character mid-conversation
  // without ending the dialogue. Preserves messages, conversationId, level,
  // study/listen modes; updates the existing speak_conversations row so
  // history persistence reflects the new provider/voice/mode/accent.
  const applyGeminiVoiceChange = useCallback(
    async (params: GeminiTutorParams) => {
      primeAudioForIOS()
      const lang = language
      if (!lang) return

      await ensureAudioContext()
      stopAllAudio()

      setProviderState('gemini')
      providerRef.current = 'gemini'
      setGeminiModeId(params.characterModeId)
      geminiModeIdRef.current = params.characterModeId
      setGeminiVoiceName(params.voiceName)
      geminiVoiceNameRef.current = params.voiceName
      const nextAccent = params.accentId ?? DEFAULT_ACCENT_ID
      setGeminiAccentId(nextAccent)
      geminiAccentIdRef.current = nextAccent
      setGeminiPickerStageState('voice')

      const syntheticVoice: TutorVoice = {
        id: `gemini_${params.characterModeId}_${params.voiceName}_${lang}`,
        name: params.voiceName,
        language: lang,
        gender: 'female',
        mistralVoiceId: '',
        sampleUrl: '',
      }
      setCharacter(null)
      characterRef.current = null
      setVoice(syntheticVoice)
      voiceRef.current = syntheticVoice

      const convId = conversationIdRef.current
      if (convId) {
        try {
          await supabase.from('speak_conversations').update({
            provider: 'gemini',
            gemini_character_mode_id: params.characterModeId,
            gemini_voice_name: params.voiceName,
            gemini_accent_id: nextAccent,
            voice_name: params.voiceName,
            character_id: null,
          }).eq('id', convId)
        } catch (err) {
          console.warn('[speak-history] Failed to apply voice swap:', err)
        }
      }

      previousStateRef.current = null
      setIsChangingVoice(false)
      setError(null)
      setStatus('idle')
    },
    [language, ensureAudioContext, primeAudioForIOS, stopAllAudio],
  )

  const applyVoxtralCharacterChange = useCallback(
    async (char: TutorCharacter) => {
      primeAudioForIOS()
      const lang = language
      if (!lang) return

      await ensureAudioContext()
      stopAllAudio()

      const resolved = resolveCharacterVoice(char, lang)
      const syntheticVoice: TutorVoice = {
        id: `char_${char.id}_${lang}`,
        name: char.name,
        language: lang,
        gender: char.gender,
        mistralVoiceId: resolved.mistralVoiceId,
        elevenLabsId: resolved.elevenLabsId,
        sampleUrl: '',
      }

      setProviderState('voxtral')
      providerRef.current = 'voxtral'
      setCharacter(char)
      characterRef.current = char
      setVoice(syntheticVoice)
      voiceRef.current = syntheticVoice

      const convId = conversationIdRef.current
      if (convId) {
        try {
          await supabase.from('speak_conversations').update({
            provider: 'voxtral',
            character_id: char.id,
            voice_name: char.name,
            gemini_character_mode_id: null,
            gemini_voice_name: null,
            gemini_accent_id: null,
          }).eq('id', convId)
        } catch (err) {
          console.warn('[speak-history] Failed to apply voice swap:', err)
        }
      }

      previousStateRef.current = null
      setIsChangingVoice(false)
      setError(null)
      setStatus('idle')
    },
    [language, ensureAudioContext, primeAudioForIOS, stopAllAudio],
  )

  // Provider toggle preserves the Gemini mode/voice selection so users can
  // flip back without re-picking. Active state (voice, character, messages)
  // is cleared because those ARE provider-specific — EXCEPT during a hot-swap
  // (mid-conversation voice change) where the history must survive the toggle.
  const setProvider = useCallback((next: SpeakProvider) => {
    if (next === providerRef.current) return
    stopAllAudio()
    setProviderState(next)
    providerRef.current = next
    setGeminiPickerStageState('voice')
    setVoice(null)
    voiceRef.current = null
    setCharacter(null)
    characterRef.current = null
    if (!conversationIdRef.current) {
      setMessages([])
      messagesRef.current = []
    }
    setPendingAudio(null)
    setError(null)
    setStatus('idle')
  }, [stopAllAudio])

  const startRoleplay = useCallback(
    async (scenario: RoleplayScenario, lang: string, selectedLevel: string) => {
      primeAudioForIOS()
      await ensureAudioContext()
      stopAllAudio()
      endConversation()
      previousStateRef.current = null

      const variant = pickContextVariant(scenario)
      const npcName = pickNpcName(scenario)
      const mood = pickNpcMood(scenario)
      const compiled = compileScenarioPrompt(scenario, npcName, mood, variant)

      // Pick a random gendered voice for the target language
      const langVoices = getVoicesForLanguage(lang)
      const pool = langVoices.length > 0 ? langVoices : TUTOR_VOICES.filter((v) => v.language === 'en')
      const randomVoice = pool[Math.floor(Math.random() * pool.length)]

      // Clear tutor character — roleplay has none
      setCharacter(null)
      characterRef.current = null
      setVoice(randomVoice)
      voiceRef.current = randomVoice

      setLanguage(lang)
      setLevel(selectedLevel)
      levelRef.current = selectedLevel
      localStorage.setItem(`voice-tutor-level-${lang}`, selectedLevel)

      // Roleplay state
      setIsRoleplayMode(true)
      isRoleplayRef.current = true
      setActiveScenario(scenario)
      setActiveNpcName(npcName)
      scenarioPromptRef.current = compiled
      roleplayMetaRef.current = {
        scenarioId: scenario.id,
        npcName,
        variantId: variant.id,
        title: scenario.title,
      }

      // Clear any prior session
      setMessages([])
      messagesRef.current = []
      setPendingAudio(null)
      setError(null)
      studyModeRef.current = false
      studyWordsRef.current = []
      setStudyMode(false)
      listenModeRef.current = false
      setListenMode(false)

      try {
        await fetchAndPlayGreeting(lang, randomVoice)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start scenario')
        setStatus('error')
      }
    },
    [endConversation, fetchAndPlayGreeting, ensureAudioContext, primeAudioForIOS, stopAllAudio],
  )

  const selectLevel = useCallback(
    async (selectedLevel: string) => {
      primeAudioForIOS()
      const isInitial = !levelRef.current
      setLevel(selectedLevel)
      levelRef.current = selectedLevel
      if (language) {
        localStorage.setItem(`voice-tutor-level-${language}`, selectedLevel)
      }
      setShowLevelPicker(false)

      if (isInitial) {
        const lang = language
        const v = voiceRef.current
        if (!lang || !v) return
        try {
          await fetchAndPlayGreeting(lang, v)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to start conversation')
          setStatus('error')
        }
      }
    },
    [language, fetchAndPlayGreeting, primeAudioForIOS],
  )

  const changeVoice = useCallback(() => {
    // Snapshot full conversation state so cancelChangeVoice can restore it.
    // Voxtral: character is non-null. Gemini: character is null but the
    // provider + mode + voice triple identifies the session. Snapshot on
    // `voiceRef.current` alone so both providers can be restored.
    if (voiceRef.current) {
      previousStateRef.current = {
        voice: voiceRef.current,
        character: characterRef.current,
        messages: messagesRef.current,
        studyMode: studyModeRef.current,
        studyWords: studyWordsRef.current,
        conversationId: conversationIdRef.current,
        messageCount: convMessageCountRef.current,
        provider: providerRef.current,
        geminiModeId: geminiModeIdRef.current,
        geminiVoiceName: geminiVoiceNameRef.current,
        geminiAccentId: geminiAccentIdRef.current,
      }
    }
    stopAllAudio()
    // Hot-swap: if we're inside a live conversation, keep history/studyMode/
    // listenMode/conversationId in place so the next turn uses the new voice
    // without restarting the dialogue.
    const isHotSwap = !!conversationIdRef.current
    setIsChangingVoice(isHotSwap)
    if (providerRef.current === 'gemini') {
      setGeminiPickerStageState('voice')
    }
    setVoice(null)
    voiceRef.current = null
    setCharacter(null)
    characterRef.current = null
    if (!isHotSwap) {
      setMessages([])
      messagesRef.current = []
      studyModeRef.current = false
      studyWordsRef.current = []
      setStudyMode(false)
      listenModeRef.current = false
      setListenMode(false)
    }
    setPendingAudio(null)
    setError(null)
    setStatus('idle')
    setShowLevelPicker(false)
  }, [stopAllAudio])

  const toggleStudyMode = useCallback((words: Array<{ word: string; translation: string }>) => {
    const newMode = !studyModeRef.current
    studyModeRef.current = newMode
    setStudyMode(newMode)
    studyWordsRef.current = newMode ? words : []
  }, [])

  const toggleListenMode = useCallback(() => {
    const newMode = !listenModeRef.current
    listenModeRef.current = newMode
    setListenMode(newMode)

    if (!newMode) {
      setMessages((prev) => prev.map((m) =>
        m.role === 'assistant' && !m.revealed ? { ...m, revealed: true } : m
      ))
      messagesRef.current = messagesRef.current.map((m) =>
        m.role === 'assistant' && !m.revealed ? { ...m, revealed: true } : m
      )
    } else {
      setMessages((prev) => prev.map((m) =>
        m.role === 'assistant' ? { ...m, revealed: false } : m
      ))
      messagesRef.current = messagesRef.current.map((m) =>
        m.role === 'assistant' ? { ...m, revealed: false } : m
      )
    }
  }, [])

  const revealMessage = useCallback((index: number) => {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, revealed: true } : m)))
    messagesRef.current = messagesRef.current.map((m, i) =>
      i === index ? { ...m, revealed: true } : m
    )
  }, [])

  const changeLevel = useCallback(() => {
    stopAllAudio()
    setShowLevelPicker(true)
  }, [stopAllAudio])

  const cancelLevelChange = useCallback(() => {
    setShowLevelPicker(false)
    // If no level was ever set, user is still in initial flow — fall back to character grid
    if (!levelRef.current) {
      changeVoice()
    }
  }, [changeVoice])

  const newChat = useCallback(async () => {
    const lang = language
    const v = voiceRef.current
    if (!lang || !v) return
    stopAllAudio()
    endConversation()
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
  }, [language, fetchAndPlayGreeting, endConversation, stopAllAudio])

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
    primeAudioForIOS()
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

      recorder.ondataavailable = (e: BlobEvent) => {
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
        if (audioBlob.size < 100) {
          // No valid audio recording can be under 1KB — this is just container headers
          setStatus('idle')
          return
        }

        const currentLang = language
        const currentVoice = voiceRef.current
        const taskGeneration = audioTaskGenerationRef.current
        if (!currentLang) return

        setStatus('processing')

        try {
          const audio_base64 = await blobToBase64(audioBlob)
          const data = await callVoiceChat(audio_base64, currentLang, currentVoice ?? undefined)
          if (audioTaskGenerationRef.current !== taskGeneration) return

          setMessages((prev) => {
            const next = [...prev]
            if (data.user_text) next.push({ role: 'user', content: data.user_text, revealed: true })
            next.push({
              role: 'assistant',
              content: data.ai_text,
              revealed: false,
              audioBase64: data.audio_base64 || undefined,
              audioFormat: data.audio_format || undefined,
            })
            return next
          })
          persistMessages(data.user_text || null, data.ai_text)

          // Reveal AI text after 1.5s regardless of whether audio plays
          scheduleReveal()

          if (data.audio_base64) {
            // Play via AudioContext (unlocked on mic press) — works from onstop on iOS.
            // Falls back to pendingAudio if AudioContext unavailable or decoding fails.
            try {
              setStatus('playing')
              await playAudio(data.audio_base64, data.audio_format)
              if (audioTaskGenerationRef.current !== taskGeneration) return
              setStatus('idle')
            } catch {
              // AudioContext failed — fall back to Tap to hear
              if (audioTaskGenerationRef.current !== taskGeneration) return
              setPendingAudio({ base64: data.audio_base64, format: data.audio_format })
              setStatus('idle')
            }
          } else {
            // TTS failed on server — show text only, no error
            if (audioTaskGenerationRef.current !== taskGeneration) return
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
      // Safari's MediaRecorder doesn't reliably support the timeslice parameter —
      // ondataavailable may never fire. Use start() without timeslice on Safari.
      if (IS_SAFARI) {
        recorder.start()  // Single ondataavailable on stop()
      } else {
        recorder.start(250)  // Periodic chunks every 250ms
      }
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
  }, [isSupported, language, callVoiceChat, scheduleReveal, ensureStream, ensureAudioContext, playAudio, persistMessages, primeAudioForIOS])

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
    if (silentPrimerRef.current) {
      try { silentPrimerRef.current.pause() } catch { /* ignore */ }
      silentPrimerRef.current = null
    }
  }, [])

  const resetConversation = useCallback(() => {
    stopAllAudio()
    endConversation()
    releaseResources()

    setLanguage(null)
    setVoice(null)
    voiceRef.current = null
    setCharacter(null)
    characterRef.current = null
    previousStateRef.current = null
    setShowLevelPicker(false)
    setLevel(null)
    levelRef.current = null
    setMessages([])
    messagesRef.current = []
    setPendingAudio(null)
    setError(null)
    setStatus('idle')
    setIsChangingVoice(false)
    studyModeRef.current = false
    studyWordsRef.current = []
    setStudyMode(false)
    listenModeRef.current = false
    setListenMode(false)
    // Roleplay cleanup
    isRoleplayRef.current = false
    setIsRoleplayMode(false)
    setActiveScenario(null)
    setActiveNpcName(null)
    scenarioPromptRef.current = null
    roleplayMetaRef.current = null
    setGeminiPickerStageState('voice')
  }, [releaseResources, endConversation, stopAllAudio])

  const cancelChangeVoice = useCallback(() => {
    const prev = previousStateRef.current
    if (prev) {
      setVoice(prev.voice)
      voiceRef.current = prev.voice
      setCharacter(prev.character)
      characterRef.current = prev.character
      setMessages(prev.messages)
      messagesRef.current = prev.messages
      studyModeRef.current = prev.studyMode
      studyWordsRef.current = prev.studyWords
      setStudyMode(prev.studyMode)
      conversationIdRef.current = prev.conversationId
      setConversationId(prev.conversationId)
      convMessageCountRef.current = prev.messageCount
      // Restore provider + Gemini selection so the in-flight session is whole.
      // callVoiceChat reads the refs, so keep those in sync with state.
      setProviderState(prev.provider)
      providerRef.current = prev.provider
      setGeminiModeId(prev.geminiModeId)
      geminiModeIdRef.current = prev.geminiModeId
      setGeminiVoiceName(prev.geminiVoiceName)
      geminiVoiceNameRef.current = prev.geminiVoiceName
      setGeminiAccentId(prev.geminiAccentId)
      geminiAccentIdRef.current = prev.geminiAccentId
      previousStateRef.current = null
      setIsChangingVoice(false)
    } else {
      resetConversation()
    }
  }, [resetConversation])

  const replayMessageAudio = useCallback(async (message: TutorMessage) => {
    if (!message.audioBase64 || message.role !== 'assistant') return
    if (statusRef.current === 'playing') return
    await playAudio(message.audioBase64, message.audioFormat || 'mp3')
  }, [playAudio])

  return {
    language,
    voice,
    character,
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
    startConversationWithCharacter,
    startConversationWithGemini,
    startRoleplay,
    isRoleplayMode,
    activeScenario,
    activeNpcName,
    selectLevel,
    changeVoice,
    cancelChangeVoice,
    changeLevel,
    cancelLevelChange,
    showLevelPicker,
    newChat,
    resetConversation,
    replayMessageAudio,
    studyMode,
    toggleStudyMode,
    listenMode,
    toggleListenMode,
    revealMessage,
    saveCorrections,
    conversationId,
    provider,
    setProvider,
    geminiModeId,
    geminiModeName,
    geminiVoiceName,
    geminiAccentId,
    geminiPickerStage,
    setGeminiModeId,
    setGeminiVoiceName,
    setGeminiAccentId,
    setGeminiPickerStage: setGeminiPickerStageState,
    stopAllAudio,
    isChangingVoice,
    applyGeminiVoiceChange,
    applyVoxtralCharacterChange,
  }
}
