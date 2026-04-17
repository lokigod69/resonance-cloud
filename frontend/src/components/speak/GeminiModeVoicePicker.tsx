import { useCallback, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { GEMINI_CHARACTER_MODES, type GeminiCharacterMode } from '@/data/geminiCharacterModes'
import { GEMINI_VOICES } from '@/data/geminiVoices'
import { VoiceSampleButton } from './VoiceSampleButton'
import { GeminiAccentPicker } from './GeminiAccentPicker'
import { GEMINI_ACCENTS, DEFAULT_GEMINI_ACCENT_ID } from '@/data/geminiAccents'

export interface GeminiSelection {
  mode: GeminiCharacterMode
  voiceName: string
  accentId: string
}

interface GeminiModeVoicePickerProps {
  language: string
  disabled?: boolean
  onSelect: (selection: GeminiSelection) => void
  initialModeId?: string | null
  initialVoiceName?: string | null
  initialAccentId?: string | null
}

export function GeminiModeVoicePicker({
  language,
  disabled,
  onSelect,
  initialModeId,
  initialVoiceName,
  initialAccentId,
}: GeminiModeVoicePickerProps) {
  const initialMode = initialModeId
    ? GEMINI_CHARACTER_MODES.find((m) => m.id === initialModeId) ?? null
    : null
  const [mode, setMode] = useState<GeminiCharacterMode | null>(initialMode)
  const [voiceName, setVoiceName] = useState<string | null>(
    initialMode && initialVoiceName ? initialVoiceName : null,
  )
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)
  const resolvedInitialAccent = initialAccentId && GEMINI_ACCENTS.some((a) => a.id === initialAccentId)
    ? initialAccentId
    : DEFAULT_GEMINI_ACCENT_ID
  const [accentId, setAccentId] = useState<string>(resolvedInitialAccent)

  // Changing accent invalidates any currently-playing sample — user will want
  // to re-hear the same voice with the new accent. Clearing nowPlaying tears
  // down the active VoiceSampleButton via its own effect.
  const handleAccentChange = useCallback((next: string) => {
    setNowPlaying(null)
    setAccentId(next)
  }, [])

  // Stage 1 — Mode picker
  if (!mode) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Choose a character mode
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {GEMINI_CHARACTER_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m)}
              disabled={disabled}
              className="flex flex-col items-start gap-1 px-3 py-3 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <span className="text-sm font-medium text-white">{m.name}</span>
              <span className="text-[11px] text-gray-400 leading-tight">{m.description}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Stage 2 — Voice picker
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setMode(null); setVoiceName(null); setNowPlaying(null) }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Back to modes"
          aria-label="Back to modes"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{mode.name}</p>
          <p className="text-xs text-gray-500 truncate">{mode.description}</p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Pick a voice
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {GEMINI_VOICES.map((v) => {
            const selected = voiceName === v.name
            return (
              <div
                key={v.name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                  selected
                    ? 'bg-cyan-900/30 border-cyan-500/40'
                    : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setVoiceName(v.name)}
                  disabled={disabled}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left disabled:opacity-50"
                >
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${selected ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                  <span className="text-sm font-medium text-white truncate">{v.name}</span>
                  <span className="text-xs text-gray-500 truncate">· {v.tone}</span>
                </button>
                <VoiceSampleButton
                  voiceName={v.name}
                  language={language}
                  characterModeId={mode.id}
                  version={mode.version}
                  accentId={accentId}
                  nowPlaying={nowPlaying}
                  onPlayStart={setNowPlaying}
                  onPlayEnd={() => setNowPlaying(null)}
                />
              </div>
            )
          })}
        </div>
      </div>

      <GeminiAccentPicker
        selectedAccentId={accentId}
        onSelect={handleAccentChange}
        disabled={disabled}
      />

      <div className="sticky bottom-0 pt-3 pb-1 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
        <button
          type="button"
          onClick={() => {
            if (!voiceName) return
            onSelect({ mode, voiceName, accentId })
          }}
          disabled={!voiceName || disabled}
          className="w-full px-4 py-3 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {voiceName ? `Start conversation with ${mode.name} · ${voiceName}` : 'Pick a voice to continue'}
        </button>
      </div>
    </div>
  )
}
