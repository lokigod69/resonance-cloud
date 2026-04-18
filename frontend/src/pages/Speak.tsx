import { useEffect, useRef, useState } from 'react'
import { Mic, Volume2, ArrowLeft, Loader2, Play, Square, UserRoundCog, MessageSquarePlus, History, Signal } from 'lucide-react'
import { useVoiceTutor } from '@/hooks/useVoiceTutor'
import { useStudyWords } from '@/hooks/useStudyWords'
import { SpeakHistoryPanel } from '@/components/speak/SpeakHistoryPanel'
import { VoiceTutorPicker } from '@/components/speak/VoiceTutorPicker'
import { ProviderToggle } from '@/components/speak/ProviderToggle'
import {
  SCENARIO_CATEGORIES,
  drawScenes,
  type RoleplayScenario,
  type ScenarioCategory,
  ROLEPLAY_SCENARIOS,
} from '@/data/roleplayScenarios'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { SPEAK_LANGUAGES, LANGUAGES as ALL_LANGUAGES } from '@/lib/languages'

// Display order is locked to match the historical Speak grid layout so user
// muscle memory is preserved. New languages should be appended at the end.
const SPEAK_ORDER = ['en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'hi', 'ar', 'fil', 'id', 'ko']

const LANGUAGES = SPEAK_ORDER
  .map((code) => SPEAK_LANGUAGES.find((l) => l.code === code))
  .filter((l): l is NonNullable<typeof l> => l !== undefined)
  .map((l) => ({
    code: l.code,
    nativeName: l.nativeName,
  }))

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl bg-gray-800/60 w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export default function Speak() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  // Convert profile.base_language (e.g. "German") → 2-letter code ("de").
  // Backend voice-chat expects the 2-letter code as native_language.
  const baseLangCode = ALL_LANGUAGES.find((l) => l.value === profile?.base_language)?.code
  const tutor = useVoiceTutor(baseLangCode)
  const stopAllAudio = tutor.stopAllAudio
  const studyWords = useStudyWords(tutor.language)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [speakMode, setSpeakMode] = useState<'freeform' | 'roleplay'>('freeform')
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory | null>(null)
  const [drawnScenes, setDrawnScenes] = useState<RoleplayScenario[]>([])
  const [pickedScene, setPickedScene] = useState<RoleplayScenario | null>(null)
  type Correction = { original: string; corrected: string; explanation: string }
  const [corrections, setCorrections] = useState<Correction[] | null>(null)
  const [correctionsLoading, setCorrectionsLoading] = useState(false)

  // Reset corrections when conversation changes (new chat, voice change, etc.)
  useEffect(() => {
    setCorrections(null)
  }, [tutor.conversationId])

  // Clear roleplay UI state when leaving language/category flow
  useEffect(() => {
    if (!tutor.language) {
      setSelectedCategory(null)
      setDrawnScenes([])
      setPickedScene(null)
    }
  }, [tutor.language])

  useEffect(() => {
    return () => {
      stopAllAudio()
    }
  }, [stopAllAudio])

  const fetchCorrections = async () => {
    if (correctionsLoading || tutor.messages.length < 4) return
    setCorrectionsLoading(true)
    try {
      const res = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'corrections',
          transcript: tutor.messages.map((m) => ({ role: m.role, content: m.content })),
          language: tutor.language,
          native_language: baseLangCode || 'en',
        }),
      })
      const data = await res.json()
      const list: Correction[] = Array.isArray(data.corrections) ? data.corrections : []
      setCorrections(list)
      tutor.saveCorrections(list)
    } catch (err) {
      console.error('Corrections fetch failed:', err)
      setCorrections([])
    } finally {
      setCorrectionsLoading(false)
    }
  }

  const selectedLang = LANGUAGES.find((l) => l.code === tutor.language)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tutor.messages.length, tutor.status])

  const isBusy = tutor.status === 'processing' || tutor.status === 'playing'

  // ── State 1: Language Selection ─────────────────────────────────────────────
  if (!tutor.language) {
    return (
      <div className="flex flex-col min-h-full pb-20">
        <div className="sticky top-0 z-40 bg-gray-950 pt-6 pb-4">
          <div className="max-w-2xl mx-auto w-full px-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3">
                <Mic className="h-6 w-6 text-[var(--accent,#06b6d4)]" />
                <h1 className="text-xl font-semibold text-white">{t('speak.voiceTutor')}</h1>
              </div>
              <p className="text-sm text-gray-400 text-center mt-1">{t('speak.chooseLang')}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 pt-6">
          <div className="w-full max-w-2xl">
            <div className="flex gap-2 mb-6 justify-center">
              <button
                onClick={() => setSpeakMode('freeform')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  speakMode === 'freeform'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                }`}
              >
                {t('speak.freeformTab')}
              </button>
              <button
                onClick={() => setSpeakMode('roleplay')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  speakMode === 'roleplay'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                }`}
              >
                🎭 {t('speak.roleplayTab')}
              </button>
            </div>

            {!tutor.isSupported && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/40 text-yellow-300 text-sm">
                {t('speak.browserWarning')}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => tutor.selectLanguage(lang.code)}
                  disabled={tutor.status === 'processing'}
                  className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FlagIcon code={lang.code} className="w-10 h-auto" />
                  <span className="text-sm font-medium text-gray-200 text-center leading-tight">
                    {lang.nativeName}
                  </span>
                </button>
              ))}
            </div>

            {tutor.status === 'processing' && (
              <div className="flex items-center justify-center gap-2 mt-8 text-gray-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('speak.startingConversation')}
              </div>
            )}

            {tutor.status === 'error' && tutor.error && (
              <div className="mt-6 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
                {tutor.error}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── State 2 (Roleplay): Category → Scene → Level picker ─────────────────────
  if (speakMode === 'roleplay' && !tutor.voice) {
    const isStarting = tutor.status === 'processing'
    const goBack = () => {
      if (pickedScene) setPickedScene(null)
      else if (selectedCategory) { setSelectedCategory(null); setDrawnScenes([]) }
      else tutor.resetConversation()
    }

    return (
      <div className="flex flex-col min-h-full pb-20">
        <div className="sticky top-0 z-40 bg-gray-950 pt-4 pb-3 border-b border-white/5">
          <div className="max-w-2xl mx-auto w-full px-4 flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
            <span className="text-sm font-medium text-white">{selectedLang?.nativeName}</span>
            <span className="text-xs text-gray-500 ml-2">🎭 {t('speak.roleplayTab')}</span>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 pt-6">
          <div className="w-full max-w-2xl">
            {tutor.status === 'error' && tutor.error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
                {tutor.error}
              </div>
            )}

            {/* Category picker */}
            {!selectedCategory && (
              <>
                <h2 className="text-base font-semibold text-white mb-1">{t('speak.chooseCategory')}</h2>
                <p className="text-sm text-gray-400 mb-5">Pick a scenario type</p>
                <div className="grid grid-cols-2 gap-3">
                  {SCENARIO_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id)
                        setDrawnScenes(drawScenes(cat.id, 3))
                      }}
                      className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all"
                    >
                      <span className="text-3xl">{cat.emoji}</span>
                      <span className="text-sm font-medium text-gray-200 text-center leading-tight">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Scene picker */}
            {selectedCategory && !pickedScene && (
              <>
                <h2 className="text-base font-semibold text-white mb-1">{SCENARIO_CATEGORIES.find(c => c.id === selectedCategory)?.label}</h2>
                <p className="text-sm text-gray-400 mb-5">Pick a scene</p>
                <div className="space-y-3 mb-4">
                  {drawnScenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => setPickedScene(scene)}
                      className="w-full flex flex-col items-start gap-1 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all text-left"
                    >
                      <span className="text-sm font-medium text-white">{scene.title}</span>
                      <span className="text-xs text-gray-400">{scene.description}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const pool = ROLEPLAY_SCENARIOS.filter((s) => s.category === selectedCategory)
                    const surprise = pool[Math.floor(Math.random() * pool.length)]
                    setPickedScene(surprise)
                  }}
                  className="w-full px-4 py-3 rounded-xl text-sm text-purple-300 border border-purple-700/40 hover:bg-purple-900/20 transition-colors"
                >
                  🎲 {t('speak.surpriseMe')}
                </button>
              </>
            )}

            {/* Level picker (roleplay) */}
            {pickedScene && (
              <>
                <h2 className="text-xl font-semibold text-white mb-2">{pickedScene.title}</h2>
                <p className="text-sm text-gray-400 mb-6">{pickedScene.description}</p>
                {isStarting && (
                  <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('speak.startingConversation')}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 max-w-sm">
                  {[
                    { level: 'zero',         emoji: '🌱', title: t('speak.levelZero'),         desc: t('speak.levelZeroDesc') },
                    { level: 'beginner',     emoji: '📗', title: t('speak.levelBeginner'),     desc: t('speak.levelBeginnerDesc') },
                    { level: 'intermediate', emoji: '📘', title: t('speak.levelIntermediate'), desc: t('speak.levelIntermediateDesc') },
                    { level: 'advanced',     emoji: '📕', title: t('speak.levelAdvanced'),     desc: t('speak.levelAdvancedDesc') },
                  ].map((opt) => (
                    <button
                      key={opt.level}
                      onClick={() => tutor.startRoleplay(pickedScene, tutor.language!, opt.level)}
                      disabled={isStarting}
                      className="flex items-center gap-4 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all text-left disabled:opacity-50"
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{opt.title}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── State 2: Character / Voice Selection ────────────────────────────────────
  if (!tutor.voice) {
    const isStarting = tutor.status === 'processing'
    const isGeminiModeStage = tutor.provider === 'gemini' && tutor.geminiPickerStage === 'mode'
    const goBack = () => {
      if (isGeminiModeStage) {
        tutor.setGeminiPickerStage('voice')
      } else {
        tutor.cancelChangeVoice()
      }
    }
    const providerToggleDisabled =
      (!!tutor.conversationId && !tutor.isChangingVoice) || isBusy

    return (
      <div className="flex flex-col min-h-full pb-20">
        {/* Header — single Back button */}
        <div className="sticky top-0 z-40 bg-gray-950 pt-4 pb-3 border-b border-white/5">
          <div className="max-w-2xl mx-auto w-full px-4 flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
            <span className="text-sm font-medium text-white">{selectedLang?.nativeName}</span>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 pt-6">
          <div className="w-full max-w-2xl">
            {isStarting && (
              <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('speak.startingConversation')}
              </div>
            )}

            {tutor.status === 'error' && tutor.error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
                {tutor.error}
              </div>
            )}

            {/* Provider toggle lives on the voice-selection screen,
                not on the Gemini mode+accent stage. */}
            {!isGeminiModeStage && (
              <div className="mb-4">
                <ProviderToggle
                  value={tutor.provider}
                  onChange={tutor.setProvider}
                  disabled={providerToggleDisabled}
                  disabledReason={
                    isBusy && !tutor.isChangingVoice
                      ? 'Wait for the response to finish…'
                      : 'End the current conversation to switch providers.'
                  }
                />
              </div>
            )}

            <VoiceTutorPicker
              provider={tutor.provider}
              language={tutor.language!}
              disabled={isStarting}
              onVoxtralSelect={(char) => {
                if (tutor.isChangingVoice) {
                  tutor.applyVoxtralCharacterChange(char)
                } else {
                  tutor.startConversationWithCharacter(char)
                }
              }}
              onGeminiStart={({ mode, voiceName, accentId }) => {
                const params = {
                  characterModeId: mode.id,
                  characterModeName: mode.displayName,
                  voiceName,
                  version: mode.version,
                  accentId,
                }
                if (tutor.isChangingVoice) {
                  tutor.applyGeminiVoiceChange(params)
                } else {
                  tutor.startConversationWithGemini(params)
                }
              }}
              geminiStage={tutor.geminiPickerStage}
              geminiModeId={tutor.geminiModeId}
              geminiVoiceName={tutor.geminiVoiceName}
              geminiAccentId={tutor.geminiAccentId}
              onGeminiModeChange={(modeId) => tutor.setGeminiModeId(modeId)}
              onGeminiVoiceChange={(voiceName) => tutor.setGeminiVoiceName(voiceName)}
              onGeminiAccentChange={(accentId) => tutor.setGeminiAccentId(accentId)}
              onGeminiStageChange={(stage) => tutor.setGeminiPickerStage(stage)}
              confirmLabel={tutor.isChangingVoice ? 'Use this voice' : 'Start conversation'}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── State 2.5: Level Picker ────────────────────────────────────────────────
  if (!tutor.level || tutor.showLevelPicker) {
    return (
      <div className="flex flex-col min-h-full pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-gray-950 pt-4 pb-3 border-b border-white/5">
          <div className="max-w-2xl mx-auto w-full px-4 flex items-center gap-3">
            <button
              onClick={tutor.cancelLevelChange}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Back to voice selection"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
            <span className="text-sm font-medium text-white">{selectedLang?.nativeName}</span>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 pt-6">
          <div className="w-full max-w-sm">
            <h2 className="text-xl font-semibold text-white mb-2">
              {t('speak.howMuch', { language: selectedLang?.nativeName ?? '' })}
            </h2>
            <p className="text-sm text-gray-400 mb-8">{t('speak.levelHint')}</p>

            <div className="grid grid-cols-1 gap-3">
              {[
                { level: 'zero',         emoji: '🌱', title: t('speak.levelZero'),         desc: t('speak.levelZeroDesc') },
                { level: 'beginner',     emoji: '📗', title: t('speak.levelBeginner'),     desc: t('speak.levelBeginnerDesc') },
                { level: 'intermediate', emoji: '📘', title: t('speak.levelIntermediate'), desc: t('speak.levelIntermediateDesc') },
                { level: 'advanced',     emoji: '📕', title: t('speak.levelAdvanced'),     desc: t('speak.levelAdvancedDesc') },
              ].map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => tutor.selectLevel(opt.level)}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all text-left"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{opt.title}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
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
                      ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-200'
                      : 'bg-gray-800/50 border-white/10 text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  {tutor.studyMode ? '📖 Study Mode ON' : 'Study my words'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── State 3: Conversation ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-x-0 bottom-0 top-16 sm:top-20 z-30 flex flex-col bg-gray-950">
      {/* Conversation header */}
      <div className="shrink-0 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 py-3 max-w-5xl mx-auto w-full">
        <button
          onClick={tutor.resetConversation}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title={t('speak.backTooltip')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
          <div className="min-w-0">
            {tutor.isRoleplayMode ? (
              <>
                <p className="text-sm font-medium text-white truncate">🎭 {tutor.activeScenario?.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {tutor.activeNpcName} · {selectedLang?.nativeName}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white truncate">{tutor.character?.name ?? tutor.voice.name}</p>
                <p className="text-xs text-gray-500 truncate">{selectedLang?.nativeName}</p>
              </>
            )}
          </div>
        </div>

        {!tutor.isRoleplayMode && (
        <button
          onClick={tutor.changeLevel}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          title={t('speak.levelTooltip')}
        >
          <span className="text-sm">
            {tutor.level === 'zero' ? '🌱' : tutor.level === 'beginner' ? '📗' : tutor.level === 'intermediate' ? '📘' : tutor.level === 'advanced' ? '📕' : <Signal className="w-4 h-4" />}
          </span>
          <span className="hidden sm:inline">{t('speak.level')}</span>
        </button>
        )}

        {!tutor.isRoleplayMode && studyWords.hasWords && (
          <button
            onClick={() => tutor.toggleStudyMode(studyWords.studyWords)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0 ${
              tutor.studyMode
                ? 'bg-cyan-900/40 text-cyan-200 hover:bg-cyan-900/60'
                : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
            title={tutor.studyMode ? t('speak.studyOnTooltip') : t('speak.studyTooltip')}
          >
            <span className="text-sm">📖</span>
            <span className="hidden sm:inline">{tutor.studyMode ? t('speak.studyOn') : t('speak.study')}</span>
          </button>
        )}

        {!tutor.isRoleplayMode && (
        <button
          onClick={tutor.toggleListenMode}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0 ${
            tutor.listenMode
              ? 'bg-purple-900/40 text-purple-200 hover:bg-purple-900/60'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title={tutor.listenMode ? t('speak.listenOnTooltip') : t('speak.listenTooltip')}
        >
          <span className="text-sm">🎧</span>
          <span className="hidden sm:inline">{tutor.listenMode ? t('speak.listenOn') : t('speak.listen')}</span>
        </button>
        )}

        {!tutor.isRoleplayMode && (
        <button
          onClick={tutor.changeVoice}
          disabled={tutor.status === 'recording' || tutor.status === 'processing'}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title={t('speak.tutorTooltip')}
        >
          <UserRoundCog className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('speak.tutor')}</span>
        </button>
        )}

        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          title={t('speak.historyTooltip')}
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('speak.history')}</span>
        </button>

        <button
          onClick={tutor.newChat}
          disabled={isBusy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 shrink-0"
          title={t('speak.newChatTooltip')}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('speak.newChat')}</span>
        </button>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-5xl mx-auto w-full"
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
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-opacity duration-500 ${
                msg.role === 'user'
                  ? 'bg-cyan-900/50 text-white rounded-br-sm opacity-100'
                  : `bg-gray-800/60 text-gray-100 rounded-bl-sm ${!tutor.listenMode || msg.revealed ? 'opacity-100' : 'opacity-0'}${msg.audioBase64 || (tutor.listenMode && !msg.revealed) ? ' cursor-pointer active:bg-gray-700/60 transition-colors' : ''}`
              }`}
            >
              {msg.role === 'assistant' && !msg.revealed ? (
                <span className="flex items-center gap-1.5 text-gray-400 text-sm italic">
                  <span>🔊</span> {tutor.listenMode ? t('speak.tapToReveal') : t('speak.listening')}
                </span>
              ) : (
                <>
                  <p>{msg.content}</p>
                  {tutor.pendingAudio && msg.role === 'assistant' && i === tutor.messages.length - 1 && (
                    <button
                      onClick={tutor.playPendingAudio}
                      className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
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
            {corrections === null ? (
              <button
                onClick={fetchCorrections}
                disabled={correctionsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10 disabled:opacity-50"
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
                <p className="text-xs text-gray-500 text-center mb-2">{t('speak.reviewTitle')}</p>
                {corrections.map((c, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1">
                    <p className="text-sm text-red-400/80 line-through">{c.original}</p>
                    <p className="text-sm text-green-400/80">{c.corrected}</p>
                    <p className="text-xs text-gray-500">{c.explanation}</p>
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
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            {t('speak.waitingGreeting')}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <SpeakHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        baseLangCode={baseLangCode}
      />

      {/* Footer: mic controls */}
      <div
        className="shrink-0 border-t border-white/5 bg-gray-950/80 backdrop-blur-md select-none"
        style={{ WebkitTouchCallout: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="px-4 py-5 max-w-5xl mx-auto w-full">
        {tutor.status === 'error' && tutor.error && (
          <p className="text-red-400 text-xs text-center mb-3">{tutor.error}</p>
        )}

        <p className="text-xs text-gray-500 text-center mb-3 h-4">
          {tutor.status === 'idle' && t('speak.tapToSpeak')}
          {tutor.status === 'recording' && (
            <span className="text-red-400">{t('speak.recording')}</span>
          )}
          {tutor.status === 'processing' && t('speak.thinking')}
          {tutor.status === 'playing' && (
            <span className="text-cyan-400">{t('speak.speaking')}</span>
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
                ? 'bg-gray-700 cursor-not-allowed'
                : tutor.status === 'playing'
                ? 'bg-cyan-700'
                : tutor.status === 'error'
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-gray-800 hover:bg-gray-700 active:scale-95'
            }`}
            aria-label={tutor.status === 'recording' ? 'Tap to send' : 'Tap to speak'}
          >
            {tutor.status === 'processing' ? (
              <Loader2 className="h-7 w-7 text-gray-400 animate-spin" />
            ) : tutor.status === 'playing' ? (
              <Volume2 className="h-7 w-7 text-cyan-300" />
            ) : tutor.status === 'recording' ? (
              <Square className="h-6 w-6 text-white fill-white" />
            ) : (
              <Mic className="h-7 w-7 text-gray-300" />
            )}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
