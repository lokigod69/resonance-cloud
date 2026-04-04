import { useEffect, useRef } from 'react'
import { Mic, Volume2, ArrowLeft, RotateCcw, Loader2 } from 'lucide-react'
import { useVoiceTutor } from '@/hooks/useVoiceTutor'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', nativeName: 'English' },
  { code: 'de', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'it', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'es', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'pt', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'nl', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'hi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'ar', flag: '🇸🇦', nativeName: 'العربية' },
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

export default function Speak() {
  const tutor = useVoiceTutor()
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const selectedLang = LANGUAGES.find((l) => l.code === tutor.language)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tutor.messages.length, tutor.status])

  const isBusy = tutor.status === 'processing' || tutor.status === 'playing'

  // ── Language Selection ──────────────────────────────────────────────────────
  if (!tutor.language) {
    return (
      <div className="flex flex-col min-h-full pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-gray-950 pt-6 pb-4">
          <div className="max-w-2xl mx-auto w-full px-6">
            <div className="flex items-center gap-3 mb-1">
              <Mic className="h-6 w-6 text-[var(--accent,#06b6d4)]" />
              <h1 className="text-xl font-semibold text-white">Voice Tutor</h1>
            </div>
            <p className="text-sm text-gray-400">Choose a language to practice</p>
          </div>
        </div>

        {/* Language grid */}
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
                  onClick={() => tutor.initConversation(lang.code)}
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

  // ── Conversation View ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)]">
      {/* Conversation header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-gray-950 shrink-0">
        <button
          onClick={tutor.resetConversation}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Back to language selection"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{selectedLang?.flag}</span>
          <span className="text-sm font-medium text-white">{selectedLang?.nativeName}</span>
        </div>

        <button
          onClick={tutor.resetConversation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="New conversation"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {tutor.messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-900/50 text-white rounded-br-sm'
                  : 'bg-gray-800/60 text-gray-100 rounded-bl-sm'
              }`}
            >
              {msg.content}
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
      <div className="shrink-0 border-t border-white/5 bg-gray-950 px-4 py-5">
        {/* Error message */}
        {tutor.status === 'error' && tutor.error && (
          <p className="text-red-400 text-xs text-center mb-3">{tutor.error}</p>
        )}

        {/* Status text */}
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

        {/* Mic button */}
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
  )
}
