import { useEffect, useRef, useState } from 'react'
import { Mic, Volume2, ArrowLeft, Loader2, Play, Square, RefreshCw, MessageSquarePlus, History, Signal } from 'lucide-react'
import { useVoiceTutor } from '@/hooks/useVoiceTutor'
import { useStudyWords } from '@/hooks/useStudyWords'
import { CharacterGrid } from '@/components/speak/CharacterGrid'
import { SpeakHistoryPanel } from '@/components/speak/SpeakHistoryPanel'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useTranslation } from '@/hooks/useTranslation'
import { SPEAK_LANGUAGES } from '@/lib/languages'

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
  const tutor = useVoiceTutor()
  const studyWords = useStudyWords(tutor.language)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

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
            <div className="flex items-center gap-3 mb-1">
              <Mic className="h-6 w-6 text-[var(--accent,#06b6d4)]" />
              <h1 className="text-xl font-semibold text-white">{t('speak.voiceTutor')}</h1>
            </div>
            <p className="text-sm text-gray-400">{t('speak.chooseLang')}</p>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 pt-6">
          <div className="w-full max-w-2xl">
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

  // ── State 2: Character Selection ─────────────────────────────────────────────
  if (!tutor.voice) {
    const isStarting = tutor.status === 'processing'

    return (
      <div className="flex flex-col min-h-full pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-gray-950 pt-4 pb-3 border-b border-white/5">
          <div className="max-w-2xl mx-auto w-full px-4 flex items-center gap-3">
            <button
              onClick={tutor.resetConversation}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Back to language selection"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
            <span className="text-sm font-medium text-white">{selectedLang?.nativeName}</span>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 pt-6">
          <div className="w-full max-w-2xl">
            <h2 className="text-base font-semibold text-white mb-1">Choose your tutor</h2>
            <p className="text-sm text-gray-400 mb-5">Pick a teaching style or character</p>

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

            <CharacterGrid
              onSelect={(char) => tutor.startConversationWithCharacter(char)}
              disabled={isStarting}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── State 2.5: Level Picker ────────────────────────────────────────────────
  if (!tutor.level) {
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
          title="Back to language selection"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{tutor.character?.name ?? tutor.voice.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {tutor.character?.subtitle ? `${tutor.character.subtitle} · ` : ''}{selectedLang?.nativeName}
            </p>
          </div>
        </div>

        <button
          onClick={tutor.changeLevel}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
          title="Change level"
        >
          <span className="text-sm">
            {tutor.level === 'zero' ? '🌱' : tutor.level === 'beginner' ? '📗' : tutor.level === 'intermediate' ? '📘' : tutor.level === 'advanced' ? '📕' : <Signal className="w-4 h-4" />}
          </span>
          <span className="hidden sm:inline">{t('speak.level')}</span>
        </button>

        {studyWords.hasWords && (
          <button
            onClick={() => tutor.toggleStudyMode(studyWords.studyWords)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0 ${
              tutor.studyMode
                ? 'bg-cyan-900/40 text-cyan-200 hover:bg-cyan-900/60'
                : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
            title={tutor.studyMode ? 'Study Mode ON' : 'Study my words'}
          >
            <span className="text-sm">📖</span>
            <span className="hidden sm:inline">{tutor.studyMode ? 'Study ON' : 'Study'}</span>
          </button>
        )}

        <button
          onClick={tutor.changeVoice}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          title="Change tutor"
        >
          <RefreshCw className="h-3 w-3" />
          <span className="hidden sm:inline">Tutor</span>
        </button>

        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          title="Conversation history"
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('speak.history')}</span>
        </button>

        <button
          onClick={tutor.newChat}
          disabled={isBusy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 shrink-0"
          title="New conversation"
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
              onClick={msg.role === 'assistant' && msg.audioBase64 ? () => tutor.replayMessageAudio(msg) : undefined}
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-opacity duration-500 ${
                msg.role === 'user'
                  ? 'bg-cyan-900/50 text-white rounded-br-sm opacity-100'
                  : `bg-gray-800/60 text-gray-100 rounded-bl-sm ${msg.revealed ? 'opacity-100' : 'opacity-0'}${msg.audioBase64 ? ' cursor-pointer active:bg-gray-700/60 transition-colors' : ''}`
              }`}
            >
              {msg.role === 'assistant' && !msg.revealed ? (
                <span className="flex items-center gap-1.5 text-gray-400 text-sm italic">
                  <span>🎧</span> {t('speak.listening')}
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
