import { useEffect, useRef, useState } from 'react'
import { Mic, Volume2, ArrowLeft, RotateCcw, Loader2, Play, Square, RefreshCw } from 'lucide-react'
import { useVoiceTutor } from '@/hooks/useVoiceTutor'
import { getVoicesForLanguage, type TutorVoice } from '@/voiceRegistry'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', nativeName: 'English' },
  { code: 'de', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'it', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'es', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'pt', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'nl', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'hi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'ar',  flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'fil', flag: '🇵🇭', nativeName: 'Filipino' },
  { code: 'id',  flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  { code: 'ko',  flag: '🇰🇷', nativeName: '한국어' },
]

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

function VoiceAvatar({ name, gender }: { name: string; gender: string }) {
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const sat = gender === 'female' ? '65%' : '55%'
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ backgroundColor: `hsl(${hue}, ${sat}, 45%)` }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function Speak() {
  const tutor = useVoiceTutor()
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)

  const selectedLang = LANGUAGES.find((l) => l.code === tutor.language)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tutor.messages.length, tutor.status])

  // Stop sample audio when leaving voice picker
  useEffect(() => {
    if (tutor.voice !== null) {
      sampleAudioRef.current?.pause()
      sampleAudioRef.current = null
      setPlayingVoiceId(null)
    }
  }, [tutor.voice])

  function toggleSample(e: React.MouseEvent, voice: TutorVoice) {
    e.stopPropagation()
    if (playingVoiceId === voice.id) {
      sampleAudioRef.current?.pause()
      sampleAudioRef.current = null
      setPlayingVoiceId(null)
      return
    }
    sampleAudioRef.current?.pause()
    const audio = new Audio(voice.sampleUrl)
    audio.onended = () => setPlayingVoiceId(null)
    sampleAudioRef.current = audio
    audio.play().catch(() => setPlayingVoiceId(null))
    setPlayingVoiceId(voice.id)
  }

  const isBusy = tutor.status === 'processing' || tutor.status === 'playing'

  // ── State 1: Language Selection ─────────────────────────────────────────────
  if (!tutor.language) {
    return (
      <div className="flex flex-col min-h-full pb-20">
        <div className="sticky top-0 z-40 bg-gray-950 pt-6 pb-4">
          <div className="max-w-2xl mx-auto w-full px-6">
            <div className="flex items-center gap-3 mb-1">
              <Mic className="h-6 w-6 text-[var(--accent,#06b6d4)]" />
              <h1 className="text-xl font-semibold text-white">Voice Tutor</h1>
            </div>
            <p className="text-sm text-gray-400">Choose a language to practice</p>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 pt-6">
          <div className="w-full max-w-2xl">
            {!tutor.isSupported && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/40 text-yellow-300 text-sm">
                Your browser may not support audio recording. Chrome or Safari recommended.
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
                  <span className="text-3xl">{lang.flag}</span>
                  <span className="text-sm font-medium text-gray-200 text-center leading-tight">
                    {lang.nativeName}
                  </span>
                </button>
              ))}
            </div>

            {tutor.status === 'processing' && (
              <div className="flex items-center justify-center gap-2 mt-8 text-gray-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting conversation…
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

  // ── State 2: Voice Picker ───────────────────────────────────────────────────
  if (!tutor.voice) {
    const voices = getVoicesForLanguage(tutor.language)
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
            <span className="text-xl">{selectedLang?.flag}</span>
            <span className="text-sm font-medium text-white">{selectedLang?.nativeName}</span>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 pt-6">
          <div className="w-full max-w-2xl">
            <h2 className="text-base font-semibold text-white mb-1">Choose your tutor's voice</h2>
            <p className="text-sm text-gray-400 mb-5">Tap a card to start, or preview with the play button</p>

            {isStarting && (
              <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting conversation…
              </div>
            )}

            {tutor.status === 'error' && tutor.error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
                {tutor.error}
              </div>
            )}

            <div className="space-y-1.5">
              {voices.map((voice) => {
                const isPlaying = playingVoiceId === voice.id
                return (
                  <button
                    key={voice.id}
                    onClick={() => tutor.startConversation(voice)}
                    disabled={isStarting}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left
                      ${isPlaying
                        ? 'bg-gray-800/80 border-cyan-500/40 animate-pulse'
                        : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60 hover:border-white/10'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <VoiceAvatar name={voice.name} gender={voice.gender} />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{voice.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{voice.gender}</p>
                    </div>
                    <button
                      onClick={(e) => toggleSample(e, voice)}
                      disabled={isStarting}
                      className="p-1.5 rounded-md text-gray-400 hover:text-cyan-400 hover:bg-white/5 transition-colors shrink-0"
                      title={isPlaying ? 'Stop preview' : 'Preview voice'}
                    >
                      {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── State 3: Conversation ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] overflow-hidden">
      {/* Conversation header */}
      <div className="shrink-0 border-b border-white/5 bg-gray-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 px-4 py-3 max-w-5xl mx-auto w-full">
        <button
          onClick={tutor.resetConversation}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Back to language selection"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl shrink-0">{selectedLang?.flag}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{tutor.voice.name}</p>
            <p className="text-xs text-gray-500 truncate">{selectedLang?.nativeName}</p>
          </div>
        </div>

        <button
          onClick={tutor.changeVoice}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          title="Change voice"
        >
          <RefreshCw className="h-3 w-3" />
          Voice
        </button>

        <button
          onClick={tutor.newChat}
          disabled={isBusy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 shrink-0"
          title="New conversation"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New Chat
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
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-opacity duration-500 ${
                msg.role === 'user'
                  ? 'bg-cyan-900/50 text-white rounded-br-sm opacity-100'
                  : `bg-gray-800/60 text-gray-100 rounded-bl-sm ${msg.revealed ? 'opacity-100' : 'opacity-0'}`
              }`}
            >
              {msg.role === 'assistant' && !msg.revealed ? (
                <span className="flex items-center gap-1.5 text-gray-400 text-sm italic">
                  <span>🎧</span> Listen...
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
                      <span>Tap to hear</span>
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
            Waiting for tutor to greet you…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer: mic controls */}
      <div className="shrink-0 border-t border-white/5 bg-gray-950/80 backdrop-blur-md z-10">
        <div className="px-4 py-5 max-w-5xl mx-auto w-full">
        {tutor.status === 'error' && tutor.error && (
          <p className="text-red-400 text-xs text-center mb-3">{tutor.error}</p>
        )}

        <p className="text-xs text-gray-500 text-center mb-3 h-4">
          {tutor.status === 'idle' && 'Tap and hold to speak'}
          {tutor.status === 'recording' && (
            <span className="text-red-400">Recording… release to send</span>
          )}
          {tutor.status === 'processing' && 'Thinking…'}
          {tutor.status === 'playing' && (
            <span className="text-cyan-400">Speaking…</span>
          )}
          {tutor.status === 'error' && 'Tap and hold to try again'}
        </p>

        <div className="flex justify-center">
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              if (!isBusy) tutor.startRecording()
            }}
            onPointerUp={() => {
              if (tutor.status === 'recording') tutor.stopRecording()
            }}
            onPointerLeave={() => {
              if (tutor.status === 'recording') tutor.stopRecording()
            }}
            disabled={isBusy}
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
            aria-label={tutor.status === 'recording' ? 'Recording — release to send' : 'Hold to speak'}
          >
            {tutor.status === 'processing' ? (
              <Loader2 className="h-7 w-7 text-gray-400 animate-spin" />
            ) : tutor.status === 'playing' ? (
              <Volume2 className="h-7 w-7 text-cyan-300" />
            ) : (
              <Mic
                className={`h-7 w-7 ${
                  tutor.status === 'recording' ? 'text-white' : 'text-gray-300'
                }`}
              />
            )}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
