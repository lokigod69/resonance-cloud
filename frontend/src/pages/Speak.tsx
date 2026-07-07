import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Volume2, VolumeX, ArrowLeft, Loader2, Play, Square, UserRoundCog, MessageSquarePlus, History, Signal, ChevronDown, SlidersHorizontal, ChevronRight } from 'lucide-react'
import { useVoiceTutor, type SpeakProvider } from '@/hooks/useVoiceTutor'
import { useGrokRealtime } from '@/hooks/useGrokRealtime'
import { useStudyWords } from '@/hooks/useStudyWords'
import { useLanguage } from '@/contexts/LanguageContext'
import { SpeakHistoryPanel } from '@/components/speak/SpeakHistoryPanel'
import { EndConversationScreen } from '@/components/speak/EndConversationScreen'
import { ExtractWordsModal } from '@/components/speak/ExtractWordsModal'
import { CharacterGrid } from '@/components/speak/CharacterGrid'
import { GeminiModeVoicePicker } from '@/components/speak/GeminiModeVoicePicker'
import { LiveDoorCard } from '@/components/speak/LiveDoorCard'
import { GrokPicker, type GrokPickerStep } from '@/components/speak/GrokPicker'
import { getAvatarColors, getStyleTutorAvatarUrl } from '@/components/speak/CharacterGrid.avatar'
import type { GrokCategory } from '@/data/grokCategories'
import { GROK_VOICES, type GrokVoice } from '@/data/grokVoices'
import { getGeminiCharacterMode } from '@/data/geminiCharacterModes'
import { getGeminiVoiceAvatarUrl } from '@/data/geminiVoices'
import { getCharacterById } from '@/characterRegistry'
import type { GrokLevel } from '@/lib/grokPedagogy'
import { installGrokIOSAudioDiagnostics } from '@/lib/grokIOSAudioDiagnostics'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { publicApiUrl } from '@/lib/publicOrigins'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { SPEAK_LANGUAGES, LANGUAGES as ALL_LANGUAGES } from '@/lib/languages'
import { getGeneratedDeckHref } from '@/lib/cardGenerationProgress'
import { formatSpeakApiError, type SpeakApiErrorPayload } from '@/lib/translations'

const SPEAK_ORDER = ['en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'hi', 'ar', 'ru', 'ceb', 'fil', 'id', 'ko']
const GROK_LEVEL_VALUES: GrokLevel[] = ['zero', 'beginner', 'intermediate', 'advanced']
const DEFAULT_GROK_VOICE: GrokVoice = 'eve'
const DEFAULT_GROK_CATEGORY: GrokCategory | 'free_chat' = 'free_chat'

type ExtractModalSource = {
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  conversationId?: string
  targetLanguage: string
  baseLanguage: string
  defaultDeckName: string
}

const LANGUAGES = SPEAK_ORDER
  .map((code) => SPEAK_LANGUAGES.find((l) => l.code === code))
  .filter((l): l is NonNullable<typeof l> => l !== undefined)
  .map((l) => ({
    code: l.code,
    nativeName: l.nativeName,
    value: l.value,
  }))

const GROK_CATEGORY_LABEL_KEYS: Record<GrokCategory | 'free_chat', string> = {
  free_chat: 'speak.grok.freeChat',
  travel: 'speak.grok.category.travel',
  business: 'speak.grok.category.business',
  romance: 'speak.grok.category.romance',
  philosophy: 'speak.grok.category.philosophy',
  daily_life: 'speak.grok.category.daily_life',
  food: 'speak.grok.category.food',
  arts: 'speak.grok.category.arts',
  news: 'speak.grok.category.news',
}

// ── Last-used setup per language (the "ready room" memory) ──────────────────

type LastSpeakSetup =
  | { kind: 'grok'; voice: GrokVoice; category: GrokCategory | 'free_chat' }
  | { kind: 'voxtral'; characterId: string }
  | { kind: 'gemini'; modeId: string; voiceName: string; accentId: string }

const lastSetupKey = (lang: string) => `speak-last-setup-${lang}`

function readLastSetup(lang: string): LastSpeakSetup | null {
  try {
    const raw = localStorage.getItem(lastSetupKey(lang))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastSpeakSetup
    if (parsed.kind === 'grok' || parsed.kind === 'voxtral' || parsed.kind === 'gemini') return parsed
    return null
  } catch {
    return null
  }
}

function writeLastSetup(lang: string, setup: LastSpeakSetup) {
  try {
    localStorage.setItem(lastSetupKey(lang), JSON.stringify(setup))
  } catch { /* storage full/blocked — ready room just won't remember */ }
}

function TypingIndicator() {
  return (
    <div className="speak-typing flex items-center gap-1 px-4 py-3 rounded-2xl w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function SpeakRippleField() {
  return <div className="speak-ripple-field" aria-hidden="true" />
}

function SpeakSelectionShell({
  children,
  maxWidth = 'max-w-6xl',
  className = '',
}: {
  children: ReactNode
  maxWidth?: string
  className?: string
}) {
  return (
    <div className={`speak-page-shell speak-setup-scroll relative isolate ${className}`}>
      <div className="speak-page-aura" aria-hidden="true" />
      <SpeakRippleField />
      <div className={`speak-setup-scroll-inner relative z-10 mx-auto w-full ${maxWidth} px-4 py-6 sm:px-6 sm:py-8 lg:px-8`}>
        {children}
      </div>
    </div>
  )
}

/** Ready-room avatar with graceful initial fallback (mascots may 404 offline). */
function ReadyAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [imageFailed, setImageFailed] = useState(false)
  const colors = getAvatarColors(name, 'female')

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImageFailed(true)}
        className="h-24 w-24 rounded-full object-cover"
        style={{ border: `2px solid ${colors.ringColor}` }}
      />
    )
  }
  return (
    <div
      className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function isGrokLevel(value: string | null): value is GrokLevel {
  return value === 'zero' || value === 'beginner' || value === 'intermediate' || value === 'advanced'
}

function readGrokAudioDebugFlag(): boolean {
  try {
    return typeof window !== 'undefined' &&
      window.localStorage.getItem('grokAudioDebug') === '1'
  } catch {
    return false
  }
}

function formatRecordingDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

const levelEmoji = (level: string | null) =>
  level === 'zero' ? '🌱' : level === 'beginner' ? '📗' : level === 'intermediate' ? '📘' : level === 'advanced' ? '📕' : null

export default function Speak() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { profile } = useAuth()
  const { activeLanguage, setActiveLanguage, languageReady } = useLanguage()
  const baseLangCode = ALL_LANGUAGES.find((l) => l.value === profile?.base_language)?.code
  const tutor = useVoiceTutor(baseLangCode)
  const grok = useGrokRealtime()
  const endGrokSession = grok.endSession
  const stopAllAudio = tutor.stopAllAudio
  const endGrokSessionRef = useRef(endGrokSession)
  const stopAllAudioRef = useRef(stopAllAudio)
  useEffect(() => { endGrokSessionRef.current = endGrokSession }, [endGrokSession])
  useEffect(() => { stopAllAudioRef.current = stopAllAudio }, [stopAllAudio])
  useEffect(() => {
    installGrokIOSAudioDiagnostics({
      log: readGrokAudioDebugFlag()
        ? (...args: unknown[]) => console.info('[grok-audio-debug]', ...args)
        : undefined,
    })
  }, [])
  const studyWords = useStudyWords(tutor.language)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [levelMenuOpen, setLevelMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeProvider, setActiveProvider] = useState<SpeakProvider>('grok')
  // The casting screen (Live door + tutor grid) vs the ready room. The ready
  // room shows whenever a last-used setup exists and the learner hasn't asked
  // to recast.
  const [showCasting, setShowCasting] = useState(false)
  // Collapsible "Browse tutors & voices" section on the casting screen. null
  // means "follow the default open/closed rule"; once the learner toggles it
  // their choice sticks.
  const [browseOverride, setBrowseOverride] = useState<boolean | null>(null)
  const [grokFlowActive, setGrokFlowActive] = useState(false)
  const [lastSetup, setLastSetup] = useState<LastSpeakSetup | null>(null)
  const [selectedGrokVoice, setSelectedGrokVoice] = useState<GrokVoice | null>(DEFAULT_GROK_VOICE)
  const [selectedGrokCategory, setSelectedGrokCategory] = useState<GrokCategory | 'free_chat' | null>(DEFAULT_GROK_CATEGORY)
  const [grokLevel, setGrokLevel] = useState<GrokLevel | null>(null)
  const [grokPickerStep, setGrokPickerStep] = useState<GrokPickerStep>('voice')
  const [grokSessionActive, setGrokSessionActive] = useState(false)
  const [grokShowTranscript, setGrokShowTranscript] = useState(false)
  const [extractSource, setExtractSource] = useState<ExtractModalSource | null>(null)

  type Correction = { original: string; corrected: string; explanation: string }
  const [corrections, setCorrections] = useState<Correction[] | null>(null)
  const [correctionsLoading, setCorrectionsLoading] = useState(false)
  const [correctionsError, setCorrectionsError] = useState<string | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const selectedLang = LANGUAGES.find((l) => l.code === tutor.language)
  const targetLanguageCode = tutor.language ?? selectedLang?.code ?? 'en'
  const extractBaseLanguageCode = baseLangCode ?? 'en'
  const defaultExtractDeckName = `${t('speak.extractWords.defaultDeckName')} - ${new Date().toLocaleDateString()}`
  const activeMessages = activeProvider === 'grok' && grokSessionActive ? grok.messages : tutor.messages
  const isBusy = activeProvider === 'grok'
    ? grok.status === 'connecting' || grok.status === 'speaking'
    : tutor.status === 'processing' || tutor.status === 'playing'

  const levelOptions = GROK_LEVEL_VALUES.map((level) => ({
    level,
    emoji: level === 'zero' ? '🌱' : level === 'beginner' ? '📗' : level === 'intermediate' ? '📘' : '📕',
    title: level === 'zero'
      ? t('speak.levelZero')
      : level === 'beginner'
        ? t('speak.levelBeginner')
        : level === 'intermediate'
          ? t('speak.levelIntermediate')
          : t('speak.levelAdvanced'),
    desc: level === 'zero'
      ? t('speak.levelZeroDesc')
      : level === 'beginner'
        ? t('speak.levelBeginnerDesc')
        : level === 'intermediate'
          ? t('speak.levelIntermediateDesc')
          : t('speak.levelAdvancedDesc'),
  }))

  const getGrokCategoryLabel = (category: GrokCategory | 'free_chat' | null) => {
    return t(GROK_CATEGORY_LABEL_KEYS[category ?? 'free_chat'])
  }

  const grokCategoryLabel = getGrokCategoryLabel(selectedGrokCategory)
  const grokHeaderName = selectedGrokVoice ? `${grokCategoryLabel} · ${selectedGrokVoice}` : grokCategoryLabel
  const recordingTimerLabel = formatRecordingDuration(recordingSeconds)

  const clearGrokUiState = () => {
    setSelectedGrokVoice(DEFAULT_GROK_VOICE)
    setSelectedGrokCategory(DEFAULT_GROK_CATEGORY)
    setGrokPickerStep('voice')
    setGrokFlowActive(false)
    setGrokSessionActive(false)
    setGrokShowTranscript(false)
  }

  // What the ready room shows for the remembered setup.
  const lastSetupDisplay = useMemo(() => {
    if (!lastSetup) return null
    if (lastSetup.kind === 'grok') {
      const voice = GROK_VOICES.find((v) => v.id === lastSetup.voice)
      if (!voice) return null
      return {
        name: voice.displayName,
        detail: `${t('speak.live.title')} · ${getGrokCategoryLabel(lastSetup.category)}`,
        avatarUrl: undefined as string | undefined,
      }
    }
    if (lastSetup.kind === 'voxtral') {
      const char = getCharacterById(lastSetup.characterId)
      if (!char) return null
      return {
        name: char.name,
        detail: selectedLang?.nativeName ?? '',
        avatarUrl: char.avatarUrl || getStyleTutorAvatarUrl(char.name),
      }
    }
    const mode = getGeminiCharacterMode(lastSetup.modeId)
    if (!mode) return null
    return {
      name: lastSetup.voiceName,
      detail: mode.displayName,
      avatarUrl: getGeminiVoiceAvatarUrl(lastSetup.voiceName),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSetup, selectedLang?.nativeName, t])

  const fetchCorrections = async () => {
    if (correctionsLoading || activeMessages.length < 4 || !tutor.language) return
    setCorrectionsLoading(true)
    setCorrectionsError(null)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.access_token) {
        setCorrectionsError(t('speak.history.sessionExpired'))
        return
      }

      const res = await fetch(publicApiUrl('/api/voice-chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          mode: 'corrections',
          transcript: activeMessages.map((m) => ({ role: m.role, content: m.content })),
          language: tutor.language,
          native_language: baseLangCode || 'en',
        }),
      })
      const data = await res.json().catch(() => null) as ({ corrections?: unknown } & SpeakApiErrorPayload) | null
      if (!res.ok) {
        console.warn('[Speak] Corrections request failed:', {
          status: res.status,
          error: data?.error,
          detail: data?.detail,
          retry_after_seconds: data?.retry_after_seconds,
        })
        setCorrectionsError(res.status === 401
          ? t('speak.history.sessionExpired')
          : formatSpeakApiError(t, res.status, data, 'speak.correctionsUnavailable'))
        return
      }
      if (!data || !Array.isArray(data.corrections)) {
        console.warn('[Speak] Corrections response missing corrections array:', data)
        setCorrectionsError(t('speak.correctionsUnavailable'))
        return
      }

      const list = data.corrections as Correction[]
      setCorrections(list)
      if (activeProvider !== 'grok') {
        tutor.saveCorrections(list)
      }
    } catch (err) {
      console.error('Corrections fetch failed:', err)
      setCorrectionsError(t('speak.correctionsUnavailable'))
    } finally {
      setCorrectionsLoading(false)
    }
  }

  const startGrokConversationWithLevel = async (
    level: GrokLevel,
    categoryOverride?: GrokCategory | 'free_chat',
    voiceOverride?: GrokVoice,
  ) => {
    const voice = voiceOverride ?? selectedGrokVoice
    const category = categoryOverride ?? selectedGrokCategory
    if (!tutor.language || !selectedLang || !voice || !category) return

    writeLastSetup(tutor.language, { kind: 'grok', voice, category })
    setLastSetup({ kind: 'grok', voice, category })
    setCorrections(null)
    setCorrectionsError(null)
    setGrokShowTranscript(false)
    setGrokSessionActive(true)
    try {
      await grok.startSession({
        language: tutor.language,
        languageDisplay: selectedLang.value,
        level,
        nativeLanguageDisplay: profile?.base_language ?? 'English',
        voice,
        category: category === 'free_chat' ? null : category,
      })
    } catch (err) {
      console.error('Grok session start failed:', err)
    }
  }

  const handleGrokReconnect = async () => {
    if (grok.status === 'connecting') return
    setGrokSessionActive(true)
    try {
      await grok.reconnect()
    } catch (err) {
      console.error('Grok reconnect failed:', err)
    }
  }

  const handleGrokStart = async () => {
    if (!selectedGrokVoice) {
      setGrokPickerStep('voice')
      return
    }
    if (!selectedGrokCategory) {
      setGrokPickerStep('mode')
      return
    }
    if (!grokLevel || !tutor.language) {
      setGrokPickerStep('level')
      return
    }
    localStorage.setItem(`voice-tutor-level-${tutor.language}`, grokLevel)
    await startGrokConversationWithLevel(grokLevel)
  }

  const handleGrokLevelSelect = (level: GrokLevel) => {
    if (!tutor.language) return
    localStorage.setItem(`voice-tutor-level-${tutor.language}`, level)
    setGrokLevel(level)
  }

  const resetGrokConversation = async () => {
    await grok.endSession()
    clearGrokUiState()
    setCorrections(null)
    setCorrectionsError(null)
  }

  const handleEndGrokConversation = async () => {
    await grok.endSession()
    setCorrections(null)
    setCorrectionsError(null)
    setGrokSessionActive(false)
    setGrokShowTranscript(grok.messages.length > 0)
  }

  const startNewGrokConversation = () => {
    setGrokShowTranscript(false)
    setGrokSessionActive(false)
    setCorrections(null)
    setCorrectionsError(null)
    setGrokFlowActive(false)
  }

  const openExtractWords = (source: Omit<ExtractModalSource, 'defaultDeckName'> & { defaultDeckName?: string }) => {
    setExtractSource({
      ...source,
      defaultDeckName: source.defaultDeckName ?? defaultExtractDeckName,
    })
  }

  const handleImportedDeck = (deckId: string) => {
    setExtractSource(null)
    navigate(getGeneratedDeckHref(deckId))
  }

  const handleEndTutorConversation = async () => {
    setCorrections(null)
    setCorrectionsError(null)
    await tutor.endConversation()
  }

  // ── Casting-screen actions ──────────────────────────────────────────────

  const selectSpeakLanguage = (code: string, value: string) => {
    setLangMenuOpen(false)
    if (code === tutor.language) return
    tutor.selectLanguage(code)
    setActiveLanguage(value)
    setShowCasting(false)
  }

  const handleVoxtralSelect = (char: ReturnType<typeof getCharacterById>) => {
    if (!char || !tutor.language) return
    if (tutor.isChangingVoice) {
      void tutor.applyVoxtralCharacterChange(char)
    } else {
      tutor.setProvider('voxtral')
      void tutor.startConversationWithCharacter(char)
    }
    writeLastSetup(tutor.language, { kind: 'voxtral', characterId: char.id })
    setLastSetup({ kind: 'voxtral', characterId: char.id })
    setActiveProvider('voxtral')
    setShowCasting(false)
  }

  const handleClassicVoiceSelect = (voiceName: string) => {
    tutor.setProvider('gemini')
    tutor.setGeminiVoiceName(voiceName)
    tutor.setGeminiPickerStage('mode')
    setActiveProvider('gemini')
  }

  const startFromLastSetup = () => {
    if (!lastSetup || !tutor.language) return
    if (lastSetup.kind === 'grok') {
      setActiveProvider('grok')
      setSelectedGrokVoice(lastSetup.voice)
      setSelectedGrokCategory(lastSetup.category)
      if (grokLevel) {
        void startGrokConversationWithLevel(grokLevel, lastSetup.category, lastSetup.voice)
      } else {
        setGrokFlowActive(true)
        setGrokPickerStep('level')
      }
      return
    }
    if (lastSetup.kind === 'voxtral') {
      const char = getCharacterById(lastSetup.characterId)
      if (!char) {
        setShowCasting(true)
        return
      }
      setActiveProvider('voxtral')
      tutor.setProvider('voxtral')
      void tutor.startConversationWithCharacter(char)
      return
    }
    const mode = getGeminiCharacterMode(lastSetup.modeId)
    if (!mode) {
      setShowCasting(true)
      return
    }
    setActiveProvider('gemini')
    tutor.setProvider('gemini')
    void tutor.startConversationWithGemini({
      characterModeId: mode.id,
      characterModeName: mode.displayName,
      voiceName: lastSetup.voiceName,
      version: mode.version,
      accentId: lastSetup.accentId,
    })
  }

  const extractModal = extractSource ? (
    <ExtractWordsModal
      messages={extractSource.messages}
      conversationId={extractSource.conversationId}
      targetLanguage={extractSource.targetLanguage}
      baseLanguage={extractSource.baseLanguage}
      defaultDeckName={extractSource.defaultDeckName}
      onClose={() => setExtractSource(null)}
      onImported={handleImportedDeck}
    />
  ) : null

  // Language switcher dialog — shared by every selection screen header.
  const languageMenu = (
    <Dialog open={langMenuOpen} onOpenChange={setLangMenuOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('speak.changeLanguage')}</DialogTitle>
          <DialogDescription>{t('speak.chooseLang')}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[55dvh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {LANGUAGES.map((lang) => {
            const selected = lang.code === tutor.language
            return (
              <button
                key={lang.code}
                onClick={() => selectSpeakLanguage(lang.code, lang.value)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? 'border-[var(--accent)]/45 bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] hover:bg-[var(--surface-glass-strong)]'
                }`}
              >
                <FlagIcon code={lang.code} className="w-6 h-auto shrink-0" />
                <span className="truncate text-sm font-medium">{lang.nativeName}</span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )

  // Ready-room level switcher — writes the shared per-language level key that
  // every provider reads at conversation start.
  const levelMenu = (
    <Dialog open={levelMenuOpen} onOpenChange={setLevelMenuOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('speak.howMuch', { language: selectedLang?.nativeName ?? '' })}</DialogTitle>
          <DialogDescription>{t('speak.levelHint')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2">
          {levelOptions.map((opt) => {
            const selected = opt.level === grokLevel
            return (
              <button
                key={opt.level}
                onClick={() => {
                  if (tutor.language) localStorage.setItem(`voice-tutor-level-${tutor.language}`, opt.level)
                  setGrokLevel(opt.level)
                  setLevelMenuOpen(false)
                }}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selected
                    ? 'border-[var(--accent)]/45 bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] hover:bg-[var(--surface-glass-strong)]'
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--text-primary)]">{opt.title}</span>
                  <span className="block text-xs text-[var(--text-muted)]">{opt.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )

  const languageChip = (
    <button
      onClick={() => setLangMenuOpen(true)}
      className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70"
      title={t('speak.changeLanguage')}
    >
      <FlagIcon code={tutor.language ?? 'en'} className="w-6 h-auto shrink-0" />
      <span className="text-sm font-medium text-[var(--text-primary)]">{selectedLang?.nativeName}</span>
      <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
    </button>
  )

  useEffect(() => {
    setCorrections(null)
    setCorrectionsError(null)
  }, [tutor.conversationId, activeProvider, grokSessionActive])

  useEffect(() => {
    const isRecording =
      (activeProvider === 'grok' && grok.status === 'recording') ||
      (activeProvider !== 'grok' && tutor.status === 'recording')

    if (!isRecording) {
      setRecordingSeconds(0)
      return
    }

    const startedAt = Date.now()
    setRecordingSeconds(0)
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [activeProvider, grok.status, tutor.status])

  // Inherit the app-wide active language: Speak opens ready to practice the
  // language the learner is studying, instead of asking every visit. The
  // language grid only renders for users with no speak-capable language.
  useEffect(() => {
    if (!languageReady || tutor.language) return
    const code = LANGUAGES.find((l) => l.value === activeLanguage)?.code
    if (code) tutor.selectLanguage(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageReady, activeLanguage, tutor.language])

  useEffect(() => {
    if (!tutor.language) {
      setGrokLevel(null)
      setLastSetup(null)
      setShowCasting(false)
      clearGrokUiState()
      void endGrokSessionRef.current()
      return
    }

    const savedLevel = localStorage.getItem(`voice-tutor-level-${tutor.language}`)
    setGrokLevel(isGrokLevel(savedLevel) ? savedLevel : null)
    setLastSetup(readLastSetup(tutor.language))
    setShowCasting(false)
    clearGrokUiState()
    void endGrokSessionRef.current()
  }, [tutor.language])

  useEffect(() => {
    return () => {
      stopAllAudioRef.current()
      void endGrokSessionRef.current()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeProvider, grok.messages.length, grok.status, grokSessionActive, tutor.messages.length, tutor.status])

  if (!tutor.language) {
    return (
      <SpeakSelectionShell className="pb-20">
        <div className="pt-2 pb-4">
          <div className="max-w-3xl mx-auto w-full px-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
                  <Mic className="h-5 w-5 text-[var(--accent)]" />
                </span>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{t('speak.voiceTutor')}</h1>
              </div>
              <p className="text-sm theme-muted-text text-center mt-1">{t('speak.chooseLang')}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-0 pt-6">
          <div className="w-full max-w-5xl">
            {!tutor.isSupported && (
              <div className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-950/25 px-4 py-3 text-sm text-amber-200 backdrop-blur-xl">
                {t('speak.browserWarning')}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => selectSpeakLanguage(lang.code, lang.value)}
                  disabled={tutor.status === 'processing'}
                  className="speak-glass-card group flex min-h-[128px] flex-col items-center justify-center gap-3 px-4 py-5 text-center transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--field-bg)] shadow-sm transition-transform group-hover:scale-[1.03]">
                    <FlagIcon code={lang.code} className="w-10 h-auto" />
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)] text-center leading-tight">
                    {lang.nativeName}
                  </span>
                </button>
              ))}
            </div>

            {tutor.status === 'processing' && (
              <div className="flex items-center justify-center gap-2 mt-8 theme-muted-text text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('speak.startingConversation')}
              </div>
            )}

            {tutor.status === 'error' && tutor.error && (
              <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-950/25 px-4 py-3 text-sm text-red-200 backdrop-blur-xl">
                {tutor.error}
              </div>
            )}
          </div>
        </div>
      </SpeakSelectionShell>
    )
  }

  if ((activeProvider === 'grok' && !grokSessionActive && !grokShowTranscript) || (activeProvider !== 'grok' && !tutor.voice)) {
    const isStarting = activeProvider === 'grok' && grokFlowActive ? grok.status === 'connecting' : tutor.status === 'processing'
    const inGeminiStages = tutor.provider === 'gemini' && tutor.geminiPickerStage !== 'voice' && !!tutor.geminiVoiceName
    const showReadyRoom = !grokFlowActive && !inGeminiStages && !tutor.isChangingVoice && !showCasting && !!lastSetup && !!lastSetupDisplay
    const savedLevelLabel = levelOptions.find((opt) => opt.level === (isGrokLevel(tutor.level) ? tutor.level : grokLevel))
    const grokAvailable = tutor.language !== 'fil'
    const voxtralAvailable = tutor.language !== 'fil' && tutor.language !== 'ceb'
    // The Live door is the hero; browse-tutors collapses under it for organic
    // first-timers, but stays open when there's no Live door (fil / voice
    // change) or the learner explicitly came here to recast.
    const liveDoorVisible = grokAvailable && !tutor.isChangingVoice
    const browseDefaultOpen = !liveDoorVisible || showCasting || tutor.isChangingVoice
    const browseOpen = browseOverride ?? browseDefaultOpen

    const goBack = () => {
      if (grokFlowActive) {
        if (grokPickerStep === 'level') {
          setGrokPickerStep('mode')
          return
        }
        if (grokPickerStep === 'mode') {
          setGrokPickerStep('voice')
          return
        }
        setGrokFlowActive(false)
        return
      }

      if (inGeminiStages) {
        if (tutor.geminiPickerStage === 'accent') {
          tutor.setGeminiPickerStage('mode')
        } else {
          tutor.setGeminiPickerStage('voice')
        }
        return
      }

      if (tutor.isChangingVoice) {
        tutor.cancelChangeVoice()
        return
      }

      if (showCasting && lastSetup) {
        setShowCasting(false)
      }
    }
    const showBack = grokFlowActive || inGeminiStages || tutor.isChangingVoice || (showCasting && !!lastSetup)
    const pickerShellMaxWidth = grokFlowActive ? 'max-w-6xl' : showReadyRoom ? 'max-w-xl' : 'max-w-5xl'

    return (
      <SpeakSelectionShell maxWidth={pickerShellMaxWidth} className="pb-20">
        <div className="theme-panel mb-6 flex items-center gap-2 rounded-2xl px-3 py-3">
          <div className="flex w-full items-center gap-2">
            {showBack && (
              <button
                onClick={goBack}
                className="rounded-xl p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70"
                title={t('speak.backTooltip')}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            {languageChip}
            <div className="flex-1" />
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
              title={t('speak.historyTooltip')}
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('speak.history')}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center">
          <div className="w-full">
            {isStarting && (
              <div className="flex items-center gap-2 mb-4 theme-muted-text text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('speak.startingConversation')}
              </div>
            )}

            {grokFlowActive && grok.error && (
              <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-950/25 px-4 py-3 text-sm text-red-200 backdrop-blur-xl">
                {grok.error}
              </div>
            )}

            {!grokFlowActive && tutor.status === 'error' && tutor.error && (
              <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-950/25 px-4 py-3 text-sm text-red-200 backdrop-blur-xl">
                {tutor.error}
              </div>
            )}

            {grokFlowActive ? (
              <GrokPicker
                language={tutor.language}
                languageName={selectedLang?.nativeName ?? ''}
                step={grokPickerStep}
                selectedVoice={selectedGrokVoice}
                selectedCategory={selectedGrokCategory}
                selectedLevel={grokLevel}
                onSelectVoice={(voice) => {
                  setSelectedGrokVoice(voice)
                  setGrokPickerStep('mode')
                }}
                onSelectCategory={(category) => {
                  setSelectedGrokCategory(category)
                  // Level is remembered per language — only first-timers see
                  // the level step.
                  if (grokLevel) {
                    void startGrokConversationWithLevel(grokLevel, category)
                  } else {
                    setGrokPickerStep('level')
                  }
                }}
                onSelectLevel={handleGrokLevelSelect}
                onStart={() => { void handleGrokStart() }}
                isStarting={isStarting}
              />
            ) : inGeminiStages ? (
              <GeminiModeVoicePicker
                disabled={isStarting}
                stage={tutor.geminiPickerStage}
                selectedModeId={tutor.geminiModeId}
                selectedVoiceName={tutor.geminiVoiceName}
                selectedAccentId={tutor.geminiAccentId}
                onModeChange={(modeId) => tutor.setGeminiModeId(modeId)}
                onAccentChange={(accentId) => tutor.setGeminiAccentId(accentId)}
                onStageChange={(stage) => tutor.setGeminiPickerStage(stage)}
                onStart={({ mode, voiceName, accentId }) => {
                  const params = {
                    characterModeId: mode.id,
                    characterModeName: mode.displayName,
                    voiceName,
                    version: mode.version,
                    accentId,
                  }
                  if (tutor.language) {
                    writeLastSetup(tutor.language, { kind: 'gemini', modeId: mode.id, voiceName, accentId })
                    setLastSetup({ kind: 'gemini', modeId: mode.id, voiceName, accentId })
                  }
                  if (tutor.isChangingVoice) {
                    void tutor.applyGeminiVoiceChange(params)
                  } else {
                    void tutor.startConversationWithGemini(params)
                  }
                }}
                confirmLabel={tutor.isChangingVoice ? t('speak.accent.useThisVoice') : t('speak.grok.startConversation')}
              />
            ) : showReadyRoom && lastSetupDisplay ? (
              <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 pt-6 text-center">
                <ReadyAvatar name={lastSetupDisplay.name} avatarUrl={lastSetupDisplay.avatarUrl} />
                <div>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">{lastSetupDisplay.name}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{lastSetupDisplay.detail}</p>
                  {savedLevelLabel && (
                    <button
                      type="button"
                      onClick={() => setLevelMenuOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-glass-strong)] hover:text-[var(--text-primary)]"
                      title={t('speak.levelTooltip')}
                    >
                      <span>{savedLevelLabel.emoji}</span>
                      {savedLevelLabel.title}
                      <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={startFromLastSetup}
                  disabled={isStarting}
                  className="speak-start-button inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-4 text-sm font-bold text-[var(--on-accent)] transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/80 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:text-[var(--text-muted)] disabled:shadow-none"
                >
                  <Mic className="h-4 w-4" />
                  {t('speak.ready.startTalking')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCasting(true)}
                  className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {t('speak.ready.changeTutor')}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {liveDoorVisible && (
                  <LiveDoorCard
                    disabled={isStarting}
                    onEnter={() => {
                      setActiveProvider('grok')
                      setGrokFlowActive(true)
                      setGrokPickerStep('voice')
                    }}
                  />
                )}
                <div>
                  <button
                    type="button"
                    onClick={() => setBrowseOverride(!browseOpen)}
                    aria-expanded={browseOpen}
                    aria-controls="speak-browse-panel"
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-5 py-3.5 text-left transition-colors hover:bg-[var(--surface-glass-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
                  >
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{t('speak.casting.browseTutors')}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform duration-300 ${browseOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div id="speak-browse-panel" className="speak-browse-panel mt-3" data-open={browseOpen}>
                    <div>
                      <CharacterGrid
                        language={tutor.language}
                        disabled={isStarting}
                        voxtralAvailable={voxtralAvailable}
                        onSelect={handleVoxtralSelect}
                        onClassicVoiceSelect={handleClassicVoiceSelect}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <SpeakHistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          baseLangCode={baseLangCode}
          onExtractConversation={(conversation) => openExtractWords(conversation)}
        />
        {languageMenu}
        {levelMenu}
        {extractModal}
      </SpeakSelectionShell>
    )
  }

  if (activeProvider !== 'grok' && (!tutor.level || tutor.showLevelPicker)) {
    return (
      <SpeakSelectionShell maxWidth="max-w-xl" className="pb-20">
        <div className="theme-panel mb-6 flex items-center gap-3 rounded-2xl px-3 py-3">
          <div className="flex w-full items-center gap-3">
            <button
              onClick={tutor.cancelLevelChange}
              className="rounded-xl p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70"
              title={t('speak.backTooltip')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <FlagIcon code={tutor.language} className="w-6 h-auto shrink-0" />
            <span className="text-sm font-medium text-[var(--text-primary)]">{selectedLang?.nativeName}</span>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center">
          <div className="w-full">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              {t('speak.howMuch', { language: selectedLang?.nativeName ?? '' })}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-8">{t('speak.levelHint')}</p>

            <div className="grid grid-cols-1 gap-3">
              {levelOptions.map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => {
                    void tutor.selectLevel(opt.level)
                  }}
                  className="speak-glass-card flex items-center gap-4 px-5 py-4 text-left transition-all hover:-translate-y-0.5"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{opt.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {studyWords.hasWords && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => tutor.toggleStudyMode(studyWords.studyWords)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    tutor.studyMode
                      ? 'border-[var(--accent-2)]/40 bg-[var(--accent-2-soft)] text-[var(--accent-2)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] hover:bg-[var(--surface-glass-strong)]'
                  }`}
                >
                  {tutor.studyMode ? `📖 ${t('speak.studyOn')}` : t('speak.studyTooltip')}
                </button>
              </div>
            )}
          </div>
        </div>
      </SpeakSelectionShell>
    )
  }

  if (activeProvider !== 'grok' && tutor.isEnded && (tutor.endedMessages.length > 0 || tutor.messages.length > 0)) {
    const endedTutor = tutor.provider === 'gemini' ? 'gemini' : 'voxtral'
    const endedMessages = (tutor.endedMessages.length > 0 ? tutor.endedMessages : tutor.messages)
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }))

    return (
      <>
        <EndConversationScreen
          tutor={endedTutor}
          messages={endedMessages}
          conversationId={tutor.conversationId}
          targetLanguage={targetLanguageCode}
          baseLanguage={extractBaseLanguageCode}
          onStartNew={() => { void tutor.newChat() }}
          onExtract={() => openExtractWords({
            messages: endedMessages,
            conversationId: tutor.conversationId ?? undefined,
            targetLanguage: targetLanguageCode,
            baseLanguage: extractBaseLanguageCode,
          })}
        />
        {extractModal}
      </>
    )
  }

  if (grokShowTranscript && grok.messages.length > 0) {
    return (
      <div className="speak-chat-shell fixed inset-x-0 bottom-[var(--fixed-bottom-ui-offset)] top-[var(--glassy-route-top-offset)] z-30 flex flex-col">
        <div className="speak-chatbar shrink-0 border-b">
          <div className="flex items-center gap-2 px-4 py-3 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FlagIcon code={tutor.language} className="w-6 h-auto shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{grokHeaderName}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{t('speak.conversationEnded')}</p>
              </div>
            </div>

            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors shrink-0"
              title={t('speak.historyTooltip')}
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('speak.history')}</span>
            </button>
          </div>
        </div>

        <div
          ref={chatRef}
          className="speak-scroll-region flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-5xl mx-auto w-full"
          style={{ scrollbarWidth: 'thin' }}
        >
          {grok.messages.map((msg, i) => (
            <div
              key={`${msg.role}-${msg.timestamp}-${i}`}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed long-copy ${
                  msg.role === 'user'
                    ? 'speak-message-user rounded-br-sm'
                    : 'speak-message-assistant rounded-bl-sm'
                }`}
              >
                <p className="long-copy">{msg.content}</p>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        <SpeakHistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          baseLangCode={baseLangCode}
          onExtractConversation={(conversation) => openExtractWords(conversation)}
        />

        <div className="speak-chatbar shrink-0 border-t">
          <div className="px-4 pt-5 pb-[calc(var(--app-safe-bottom)+1.25rem)] max-w-5xl mx-auto w-full">
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={startNewGrokConversation}
                className="speak-accent-action px-5 py-3 rounded-full text-sm font-medium transition-colors"
              >
                {t('speak.startNewConversation')}
              </button>
              <button
                type="button"
                onClick={() => openExtractWords({
                  messages: grok.messages.map((msg) => ({ role: msg.role, content: msg.content })),
                  targetLanguage: targetLanguageCode,
                  baseLanguage: extractBaseLanguageCode,
                })}
                className="px-5 py-3 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-glass-strong)]"
              >
                {t('speak.extractWords.button')}
              </button>
            </div>
          </div>
        </div>
        {extractModal}
      </div>
    )
  }

  if (activeProvider === 'grok' && grokSessionActive) {
    const grokDisconnected = !grok.isConnected && grok.status !== 'connecting'
    const grokButtonDisabled =
      grokDisconnected ||
      grok.status === 'connecting' ||
      grok.status === 'thinking' ||
      grok.status === 'speaking'
    const grokStatusLabel =
      grokDisconnected
        ? grok.error || t('speak.error.sessionNotConnected')
        : grok.status === 'recording'
        ? `${t('speak.listeningNow')} ${recordingTimerLabel}`
        : grok.status === 'thinking'
          ? t('speak.thinking')
          : grok.status === 'speaking'
            ? t('speak.speaking')
            : grok.status === 'connecting'
              ? t('speak.startingConversation')
              : grok.status === 'error'
                ? grok.error || t('speak.tapRetry')
                : t('speak.tapToSpeak')
    const grokStatusClass =
      grokDisconnected
        ? 'text-red-300'
        : grok.status === 'recording'
        ? 'text-red-300'
        : grok.status === 'thinking'
          ? 'text-[var(--text-secondary)]'
          : grok.status === 'speaking'
            ? 'text-[var(--accent)]'
            : grok.status === 'connecting'
              ? 'text-[var(--text-muted)]'
              : grok.status === 'error'
                ? 'text-red-300'
                : 'text-[var(--accent-2)]'
    const grokButtonOuterClass =
      grokDisconnected
        ? 'border-red-400/30 bg-red-500/5 shadow-[0_0_28px_rgba(239,68,68,0.18)]'
        : grok.status === 'idle'
        ? 'border-[var(--accent-2)]/30 bg-[var(--accent-2-soft)] shadow-[0_0_46px_var(--accent-glow)]'
        : grok.status === 'recording'
          ? 'border-red-400/60 bg-gradient-to-br from-fuchsia-500/20 via-red-500/10 to-blue-500/10 shadow-[0_0_52px_rgba(239,68,68,0.35)] animate-pulse'
          : grok.status === 'thinking'
            ? 'border-[var(--border-strong)] bg-[var(--field-bg)] shadow-[0_0_32px_var(--accent-glow)] animate-pulse'
            : grok.status === 'speaking'
              ? 'border-[var(--accent)]/35 bg-[var(--accent-soft)] shadow-[0_0_44px_var(--accent-glow)]'
              : grok.status === 'connecting'
                ? 'border-[var(--border-strong)] bg-[var(--field-bg)] shadow-[0_0_24px_var(--accent-glow)]'
                : 'border-red-400/30 bg-red-500/5 shadow-[0_0_28px_rgba(239,68,68,0.18)]'
    const grokButtonInnerClass =
      grokDisconnected
        ? 'bg-[var(--surface-2)] text-red-100'
        : grok.status === 'idle' || grok.status === 'recording'
        ? 'bg-[var(--accent)] text-[var(--on-accent)]'
        : grok.status === 'thinking'
          ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
        : grok.status === 'speaking'
            ? 'bg-[var(--accent)] text-[var(--on-accent)]'
            : grok.status === 'connecting'
              ? 'bg-[var(--surface-2)] text-[var(--text-secondary)]'
              : 'bg-[var(--surface-2)] text-red-100'

    return (
      <div className="speak-chat-shell fixed inset-x-0 bottom-[var(--fixed-bottom-ui-offset)] top-[var(--glassy-route-top-offset)] z-30 flex flex-col">
        <div className="speak-chatbar shrink-0 border-b">
          <div className="flex items-center gap-2 px-4 py-3 max-w-5xl mx-auto w-full">
            <button
              onClick={() => { void resetGrokConversation() }}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors"
              title={t('speak.backTooltip')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FlagIcon code={tutor.language} className="w-6 h-auto shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{grokHeaderName}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{selectedLang?.nativeName}</p>
              </div>
            </div>

            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors shrink-0"
              title={t('speak.historyTooltip')}
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('speak.history')}</span>
            </button>

            <button
              onClick={() => { void handleEndGrokConversation() }}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs text-red-200 bg-red-950/40 border border-red-500/20 hover:bg-red-950/60 transition-colors shrink-0"
              title={t('speak.endConversation')}
            >
              {t('speak.endConversation')}
            </button>
          </div>
        </div>

        <div
          ref={chatRef}
          className="speak-scroll-region flex-1 overflow-y-auto px-6 pt-8 pb-[calc(var(--app-safe-bottom)+2rem)] max-w-5xl mx-auto w-full"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-8 text-center">
            <div className="space-y-2">
              <p className={`text-xs font-medium uppercase tracking-[0.28em] transition-colors duration-300 ${grokStatusClass}`}>
                {grokStatusLabel}
              </p>
              {grok.status === 'error' && grok.error && !grokDisconnected && (
                <p className="text-xs text-[var(--text-muted)]">{t('speak.tapRetry')}</p>
              )}
            </div>

            <button
              onClick={() => {
                if (grokDisconnected) return
                if (grok.status === 'idle' || grok.status === 'error') {
                  grok.startListening()
                } else if (grok.status === 'recording') {
                  grok.sendTurn()
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={grokButtonDisabled}
              style={{ WebkitTouchCallout: 'none' }}
              className={`relative flex h-28 w-28 items-center justify-center rounded-full p-4 transition-all duration-300 select-none touch-none ${
                grokButtonDisabled
                  ? 'cursor-not-allowed opacity-90'
                  : 'cursor-pointer hover:scale-[1.03] active:scale-95'
              }`}
              aria-label={
                grok.status === 'recording'
                  ? t('speak.recording')
                  : grokDisconnected
                    ? t('speak.reconnect')
                  : grok.status === 'error'
                    ? t('speak.tapRetry')
                    : t('speak.tapToSpeak')
              }
            >
              <span aria-hidden className={`absolute inset-0 rounded-full border transition-all duration-300 ${grokButtonOuterClass}`} />
              <span className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${grokButtonInnerClass}`}>
                {grok.status === 'connecting' || grok.status === 'thinking' ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : grok.status === 'speaking' ? (
                  <Volume2 className="h-8 w-8" />
                ) : grok.status === 'recording' ? (
                  <Square className="h-7 w-7 fill-current" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </span>
            </button>

            {grokDisconnected && (
              <button
                type="button"
                onClick={() => { void handleGrokReconnect() }}
                disabled={grok.status === 'connecting'}
                className="speak-accent-action px-5 py-2.5 rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {grok.status === 'connecting' ? t('speak.startingConversation') : t('speak.reconnect')}
              </button>
            )}

            <button
              onClick={() => { void handleEndGrokConversation() }}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors sm:hidden"
            >
              {t('speak.endConversation')}
            </button>
          </div>
        </div>

        <SpeakHistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          baseLangCode={baseLangCode}
          onExtractConversation={(conversation) => openExtractWords(conversation)}
        />
        {extractModal}
      </div>
    )
  }

  if (!tutor.voice) return null

  const sheetRowClass =
    'flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-glass-strong)] disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="speak-chat-shell fixed inset-x-0 bottom-[var(--fixed-bottom-ui-offset)] top-[var(--glassy-route-top-offset)] z-30 flex flex-col">
      <div className="speak-chatbar shrink-0 border-b">
        <div className="flex items-center gap-2 px-4 py-3 max-w-5xl mx-auto w-full">
          <button
            onClick={() => { void handleEndTutorConversation() }}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors"
            title={t('speak.backTooltip')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FlagIcon code={tutor.language} className="w-6 h-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{tutor.character?.name ?? tutor.voice.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {tutor.geminiModeName
                  ? `${tutor.geminiModeName}${selectedLang?.nativeName ? ` · ${selectedLang.nativeName}` : ''}`
                  : selectedLang?.nativeName}
              </p>
            </div>
          </div>

          {/* Quick mute toggle for the tutor's auto-speak — kept as a bare
              icon so the header stays uncluttered. Only shown for TTS tutors;
              the Grok live header is a separate block and never renders this. */}
          <button
            onClick={tutor.toggleMuted}
            aria-pressed={tutor.muted}
            aria-label={tutor.muted ? t('speak.unmuteTutor') : t('speak.muteTutor')}
            title={tutor.muted ? t('speak.unmuteTutor') : t('speak.muteTutor')}
            className={`flex items-center justify-center p-2 rounded-lg transition-colors shrink-0 ${
              tutor.muted
                ? 'text-[var(--accent)] hover:bg-[var(--accent-soft)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
            }`}
          >
            {tutor.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Every conversation control lives in one settings sheet with
              written-out labels — the old icon strip was cut off on mobile
              and unreadable without tooltips. */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors shrink-0"
            title={t('speak.settings')}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{t('speak.settings')}</span>
          </button>
        </div>
      </div>

      <div
        ref={chatRef}
        className="speak-scroll-region flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-5xl mx-auto w-full"
        style={{ scrollbarWidth: 'thin' }}
      >
        {tutor.messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              onClick={msg.role === 'assistant' ? () => {
                if (tutor.listenMode && !msg.revealed) {
                  tutor.revealMessage(i)
                } else if (msg.audioBase64) {
                  tutor.replayMessageAudio(msg)
                }
              } : undefined}
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-opacity duration-500 long-copy ${
                msg.role === 'user'
                  ? 'speak-message-user rounded-br-sm opacity-100'
                  : `speak-message-assistant rounded-bl-sm ${!tutor.listenMode || msg.revealed ? 'opacity-100' : 'opacity-0'}${msg.audioBase64 || (tutor.listenMode && !msg.revealed) ? ' cursor-pointer active:bg-[var(--accent-soft)] transition-colors' : ''}`
              }`}
            >
              {msg.role === 'assistant' && !msg.revealed ? (
                <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm italic">
                  <span>🔊</span> {tutor.listenMode ? t('speak.tapToReveal') : t('speak.listening')}
                </span>
              ) : (
                <>
                  <p className="long-copy">{msg.content}</p>
                  {tutor.pendingAudio && msg.role === 'assistant' && i === tutor.messages.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        tutor.playPendingAudio()
                      }}
                      disabled={tutor.status === 'playing'}
                      className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-2)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{t('speak.tapToHear')}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {tutor.messages.length >= 4 && (
          <div className="mt-6 flex flex-col items-center gap-4">
            {correctionsError && (
              <div className="text-center text-sm text-amber-200 px-4 py-3 bg-amber-950/30 border border-amber-400/20 rounded-lg">
                {correctionsError}
              </div>
            )}
            {corrections === null ? (
              <button
                onClick={fetchCorrections}
                disabled={correctionsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors border border-[var(--border-subtle)] disabled:opacity-50"
              >
                {correctionsLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('speak.reviewLoading')}</span>
                  </>
                ) : (
                  <>
                    <span>📝</span>
                    <span>{t('speak.reviewButton')}</span>
                  </>
                )}
              </button>
            ) : corrections.length === 0 ? (
              <div className="text-center text-sm text-green-400/80 px-4 py-3 bg-green-900/20 rounded-lg">
                ✅ {t('speak.reviewPerfect')}
              </div>
            ) : (
              <div className="w-full max-w-lg space-y-3">
                <p className="text-xs text-[var(--text-muted)] text-center mb-2">{t('speak.reviewTitle')}</p>
                {corrections.map((c, i) => (
                  <div key={i} className="theme-panel rounded-lg p-3 space-y-1 long-copy">
                    <p className="text-sm text-red-400/80 line-through long-copy">{c.original}</p>
                    <p className="text-sm text-green-400/80 long-copy">{c.corrected}</p>
                    <p className="text-xs text-[var(--text-muted)] long-copy">{c.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tutor.status === 'processing' && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}

        {tutor.messages.length === 0 && tutor.status !== 'processing' && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            {t('speak.waitingGreeting')}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <SpeakHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        baseLangCode={baseLangCode}
        onExtractConversation={(conversation) => openExtractWords(conversation)}
      />
      {extractModal}

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('speak.settings')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <button
              onClick={() => {
                setSheetOpen(false)
                tutor.changeLevel()
              }}
              className={sheetRowClass}
            >
              <span className="text-lg">{levelEmoji(tutor.level) ?? <Signal className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-primary)]">{t('speak.level')}</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {levelOptions.find((opt) => opt.level === tutor.level)?.title ?? t('speak.levelTooltip')}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            </button>

            {studyWords.hasWords && (
              <button
                onClick={() => {
                  tutor.toggleStudyMode(studyWords.studyWords)
                  const nextMode = !tutor.studyMode
                  toast(nextMode ? t('speak.studyModeOnToast') : t('speak.studyModeOffToast'), 'info')
                }}
                className={sheetRowClass}
                aria-pressed={tutor.studyMode}
              >
                <span className="text-lg">📖</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--text-primary)]">{t('speak.study')}</span>
                  <span className="block text-xs text-[var(--text-muted)]">
                    {tutor.studyMode ? t('speak.studyOnTooltip') : t('speak.studyTooltip')}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  tutor.studyMode
                    ? 'bg-[var(--accent-2-soft)] text-[var(--accent-2)]'
                    : 'bg-[var(--field-bg)] text-[var(--text-muted)]'
                }`}>
                  {tutor.studyMode ? t('speak.settingsOn') : t('speak.settingsOff')}
                </span>
              </button>
            )}

            <button
              onClick={tutor.toggleListenMode}
              className={sheetRowClass}
              aria-pressed={tutor.listenMode}
            >
              <span className="text-lg">🎧</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-primary)]">{t('speak.listen')}</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {tutor.listenMode ? t('speak.listenOnTooltip') : t('speak.listenTooltip')}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                tutor.listenMode
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'bg-[var(--field-bg)] text-[var(--text-muted)]'
              }`}>
                {tutor.listenMode ? t('speak.settingsOn') : t('speak.settingsOff')}
              </span>
            </button>

            <button
              onClick={tutor.toggleMuted}
              className={sheetRowClass}
              aria-pressed={!tutor.muted}
            >
              <span className="text-lg">{tutor.muted ? '🔇' : '🔊'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-primary)]">{t('speak.sound')}</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {tutor.muted ? t('speak.soundOffTooltip') : t('speak.soundTooltip')}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                !tutor.muted
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'bg-[var(--field-bg)] text-[var(--text-muted)]'
              }`}>
                {!tutor.muted ? t('speak.settingsOn') : t('speak.settingsOff')}
              </span>
            </button>

            <button
              onClick={() => {
                setSheetOpen(false)
                tutor.changeVoice()
              }}
              disabled={tutor.status === 'recording' || tutor.status === 'processing'}
              className={sheetRowClass}
            >
              <UserRoundCog className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-primary)]">{t('speak.tutor')}</span>
                <span className="block text-xs text-[var(--text-muted)]">{t('speak.tutorTooltip')}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            </button>

            <button
              onClick={() => {
                setSheetOpen(false)
                setHistoryOpen(true)
              }}
              className={sheetRowClass}
            >
              <History className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-primary)]">{t('speak.history')}</span>
                <span className="block text-xs text-[var(--text-muted)]">{t('speak.historyTooltip')}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            </button>

            <button
              onClick={() => {
                setSheetOpen(false)
                setNewChatConfirmOpen(true)
              }}
              disabled={isBusy}
              className={sheetRowClass}
            >
              <MessageSquarePlus className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-primary)]">{t('speak.newChat')}</span>
                <span className="block text-xs text-[var(--text-muted)]">{t('speak.newChatTooltip')}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newChatConfirmOpen} onOpenChange={setNewChatConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('speak.newChatConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('speak.newChatConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setNewChatConfirmOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => {
                setNewChatConfirmOpen(false)
                void handleEndTutorConversation()
              }}
              className="speak-accent-action px-4 py-2 rounded-lg text-sm"
            >
              {t('speak.newChatConfirmAction')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className="speak-chatbar shrink-0 border-t select-none"
        style={{ WebkitTouchCallout: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="px-4 pt-5 pb-[calc(var(--app-safe-bottom)+1.25rem)] max-w-5xl mx-auto w-full">
          {tutor.status === 'error' && tutor.error && (
            <p className="text-red-400 text-xs text-center mb-3">{tutor.error}</p>
          )}

          <p className="text-xs text-[var(--text-muted)] text-center mb-3 h-4">
            {tutor.status === 'idle' && t('speak.tapToSpeak')}
            {tutor.status === 'recording' && (
              <span className="text-red-400">
                {t('speak.recording')}
                <span className="ml-2 font-mono tabular-nums">{recordingTimerLabel}</span>
              </span>
            )}
            {tutor.status === 'processing' && t('speak.thinking')}
            {tutor.status === 'playing' && (
              <span className="text-[var(--accent-2)]">{t('speak.speaking')}</span>
            )}
            {tutor.status === 'error' && t('speak.tapRetry')}
          </p>

          <div className="flex justify-center">
            <button
              onClick={() => {
                if (tutor.status === 'recording') {
                  tutor.stopRecordingIfActive()
                } else if (!isBusy) {
                  tutor.startRecording()
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={isBusy}
              style={{ WebkitTouchCallout: 'none' }}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all select-none touch-none ${
                tutor.status === 'recording'
                  ? 'bg-red-600 animate-pulse scale-110'
                  : tutor.status === 'processing'
                    ? 'bg-[var(--surface-2)] cursor-not-allowed'
                    : tutor.status === 'playing'
                      ? 'bg-[var(--accent-2)]'
                      : tutor.status === 'error'
                        ? 'bg-[var(--surface-2)] hover:bg-[var(--accent-soft)]'
                        : 'bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] active:scale-95'
              }`}
              aria-label={tutor.status === 'recording' ? t('speak.tapToSend') : t('speak.tapToSpeak')}
            >
              {tutor.status === 'processing' ? (
                <Loader2 className="h-7 w-7 text-[var(--text-muted)] animate-spin" />
              ) : tutor.status === 'playing' ? (
                <Volume2 className="h-7 w-7 text-[var(--on-accent)]" />
              ) : tutor.status === 'recording' ? (
                <Square className="h-6 w-6 text-[var(--on-accent)] fill-current" />
              ) : (
                <Mic className="h-7 w-7 text-[var(--text-secondary)]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
