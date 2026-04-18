import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { GEMINI_CHARACTER_MODES, type GeminiCharacterMode } from '@/data/geminiCharacterModes'
import { GEMINI_VOICES } from '@/data/geminiVoices'
import { GEMINI_ACCENTS, DEFAULT_GEMINI_ACCENT_ID, type GeminiAccent } from '@/data/geminiAccents'
import { VoiceSampleButton } from './VoiceSampleButton'
import type { GeminiPickerStage } from '@/hooks/useVoiceTutor'

export interface GeminiSelection {
  mode: GeminiCharacterMode
  voiceName: string
  accentId: string
}

interface GeminiModeVoicePickerProps {
  language: string
  disabled?: boolean
  stage: GeminiPickerStage
  selectedModeId?: string | null
  selectedVoiceName?: string | null
  selectedAccentId?: string | null
  onModeChange: (modeId: string) => void
  onVoiceChange: (voiceName: string) => void
  onAccentChange: (accentId: string) => void
  onStageChange: (stage: GeminiPickerStage) => void
  onStart: (selection: GeminiSelection) => void
  confirmLabel?: string
}

const GROUP_LABELS: Record<GeminiAccent['group'], string> = {
  none: 'None',
  regional: 'Regional',
  theatrical: 'Theatrical',
}

const SECTION_LABEL_CLASS = 'text-xs font-semibold text-gray-400 uppercase tracking-wider'
const FOOTER_SAFE_AREA_STYLE = {
  paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))',
}

export function GeminiModeVoicePicker({
  language,
  disabled,
  stage,
  selectedModeId,
  selectedVoiceName,
  selectedAccentId,
  onModeChange,
  onVoiceChange,
  onAccentChange,
  onStageChange,
  onStart,
  confirmLabel = 'Start conversation',
}: GeminiModeVoicePickerProps) {
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)

  const selectedMode = selectedModeId
    ? GEMINI_CHARACTER_MODES.find((mode) => mode.id === selectedModeId) ?? null
    : null
  const accentId = selectedAccentId ?? DEFAULT_GEMINI_ACCENT_ID
  const selectedAccent = GEMINI_ACCENTS.find((accent) => accent.id === accentId) ?? GEMINI_ACCENTS[0]

  const accentGroups = useMemo(
    () => ({
      none: GEMINI_ACCENTS.filter((accent) => accent.group === 'none'),
      regional: GEMINI_ACCENTS.filter((accent) => accent.group === 'regional'),
      theatrical: GEMINI_ACCENTS.filter((accent) => accent.group === 'theatrical'),
    }),
    [],
  )

  if (stage === 'voice') {
    return (
      <div>
        <p className={`${SECTION_LABEL_CLASS} mb-3`}>VOICE STYLES</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GEMINI_VOICES.map((voice) => {
            const selected = selectedVoiceName === voice.name
            return (
              <div
                key={voice.name}
                className={`relative rounded-2xl border transition-colors ${
                  selected
                    ? 'bg-cyan-900/30 border-cyan-500/40'
                    : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60 hover:border-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onVoiceChange(voice.name)
                    onStageChange('mode')
                  }}
                  disabled={disabled}
                  className="w-full flex flex-col items-start gap-1 px-3 py-3 pr-10 rounded-2xl text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium text-white truncate max-w-full">{voice.name}</span>
                  <span className="text-xs text-gray-400 truncate max-w-full">{voice.tone}</span>
                </button>
                <div className="absolute top-1.5 right-1.5">
                  <VoiceSampleButton
                    voiceName={voice.name}
                    language={language}
                    nowPlaying={nowPlaying}
                    onPlayStart={setNowPlaying}
                    onPlayEnd={() => setNowPlaying(null)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (stage === 'mode') {
    return (
      <div>
        <p className={`${SECTION_LABEL_CLASS} mb-3`}>CHOOSE A VIBE</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GEMINI_CHARACTER_MODES.map((mode) => {
            const selected = selectedModeId === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  onModeChange(mode.id)
                  onStageChange('accent')
                }}
                disabled={disabled}
                className={`flex flex-col items-start gap-1 px-3 py-4 rounded-2xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected
                    ? 'bg-cyan-900/30 border-cyan-500/40'
                    : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60 hover:border-white/10'
                }`}
              >
                <span className="text-sm font-medium text-white">{mode.displayName}</span>
                <span className="text-xs text-gray-400 leading-snug">{mode.description}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // stage === 'accent'
  const summary = [
    selectedVoiceName,
    selectedMode?.name ?? null,
    selectedAccent.id === 'none' ? 'No accent' : selectedAccent.name,
  ]
    .filter(Boolean)
    .join(' / ')

  return (
    <div className="flex flex-col min-h-[70vh]">
      <div className="mb-3">
        <p className={SECTION_LABEL_CLASS}>Accent (optional)</p>
        <p className="text-xs text-amber-200/90 mt-1">
          Experimental — accents can override the voice&apos;s natural gender or tone.
        </p>
      </div>

      <div className="flex-1 space-y-4 pr-1">
        {(['none', 'regional', 'theatrical'] as const).map((group) => (
          <div key={group}>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {GROUP_LABELS[group]}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {accentGroups[group].map((accent) => {
                const selected = accent.id === accentId
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => onAccentChange(accent.id)}
                    disabled={disabled}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      selected
                        ? 'bg-cyan-900/30 border-cyan-500/40 text-white'
                        : 'bg-gray-800/50 border-white/5 text-gray-200 hover:bg-gray-700/60'
                    }`}
                  >
                    <span className="text-xs font-medium truncate">{accent.name}</span>
                    {selected && <Check className="h-3.5 w-3.5 text-cyan-300 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div
        className="sticky bottom-0 pt-4 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent"
        style={FOOTER_SAFE_AREA_STYLE}
      >
        <p className="text-xs text-gray-400 mb-2 truncate" title={summary}>
          {summary}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!selectedMode || !selectedVoiceName) return
            onStart({
              mode: selectedMode,
              voiceName: selectedVoiceName,
              accentId,
            })
          }}
          disabled={!selectedMode || !selectedVoiceName || disabled}
          className="w-full px-4 py-3 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
