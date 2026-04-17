import { useMemo, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
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
  onBackToProviders: () => void
  onStart: (selection: GeminiSelection) => void
}

const GROUP_LABELS: Record<GeminiAccent['group'], string> = {
  none: 'None',
  regional: 'Regional',
  theatrical: 'Theatrical',
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
  onBackToProviders,
  onStart,
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
      <div className="flex flex-col min-h-[70vh]">
        <div className="mb-5">
          <button
            type="button"
            onClick={onBackToProviders}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h3 className="mt-4 text-xl font-semibold text-white">Choose a voice</h3>
          <p className="mt-1 text-sm text-gray-400">Listen to a neutral sample, then continue.</p>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {GEMINI_VOICES.map((voice) => {
            const selected = selectedVoiceName === voice.name
            return (
              <button
                key={voice.name}
                type="button"
                onClick={() => onVoiceChange(voice.name)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected
                    ? 'bg-cyan-900/30 border-cyan-500/40'
                    : 'bg-gray-800/50 border-white/5 hover:bg-gray-700/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{voice.name}</p>
                  <p className="text-xs text-gray-500 truncate">{voice.tone}</p>
                </div>
                <VoiceSampleButton
                  voiceName={voice.name}
                  language={language}
                  nowPlaying={nowPlaying}
                  onPlayStart={setNowPlaying}
                  onPlayEnd={() => setNowPlaying(null)}
                />
              </button>
            )
          })}
        </div>

        <div className="sticky bottom-0 pt-4 pb-1 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
          <button
            type="button"
            onClick={() => {
              if (!selectedVoiceName) return
              onStageChange('mode')
            }}
            disabled={!selectedVoiceName || disabled}
            className="w-full px-4 py-3 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'mode') {
    return (
      <div className="flex flex-col min-h-[70vh]">
        <div className="mb-5">
          <button
            type="button"
            onClick={() => onStageChange('voice')}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h3 className="mt-4 text-xl font-semibold text-white">Choose a mode</h3>
          <p className="mt-1 text-sm text-gray-400">Pick the speaking style for this conversation.</p>
        </div>

        <div className="flex-1 grid grid-cols-1 gap-2 content-start">
          {GEMINI_CHARACTER_MODES.map((mode) => {
            const selected = selectedModeId === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onModeChange(mode.id)}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected
                    ? 'bg-cyan-900/30 border-cyan-500/40 text-white'
                    : 'bg-gray-800/50 border-white/5 text-gray-200 hover:bg-gray-700/60'
                }`}
              >
                <span className="text-sm font-medium">{mode.displayName}</span>
                {selected && <Check className="h-4 w-4 text-cyan-300 shrink-0" />}
              </button>
            )
          })}
        </div>

        <div className="sticky bottom-0 pt-4 pb-1 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
          <button
            type="button"
            onClick={() => {
              if (!selectedModeId) return
              onStageChange('accent')
            }}
            disabled={!selectedModeId || disabled}
            className="w-full px-4 py-3 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[70vh]">
      <div className="mb-5">
        <button
          type="button"
          onClick={() => onStageChange('mode')}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h3 className="mt-4 text-xl font-semibold text-white">Optional accent</h3>
        <p className="mt-1 text-sm text-gray-400">Current selection: {selectedAccent.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {(['none', 'regional', 'theatrical'] as const).map((group) => (
          <div key={group}>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {GROUP_LABELS[group]}
            </p>
            <div className="space-y-2">
              {accentGroups[group].map((accent) => {
                const selected = accent.id === accentId
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => onAccentChange(accent.id)}
                    disabled={disabled}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      selected
                        ? 'bg-cyan-900/30 border-cyan-500/40 text-white'
                        : 'bg-gray-800/50 border-white/5 text-gray-200 hover:bg-gray-700/60'
                    }`}
                  >
                    <span className="text-sm font-medium">{accent.name}</span>
                    {selected && <Check className="h-4 w-4 text-cyan-300 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 pt-4 pb-1 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
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
          Start conversation
        </button>
      </div>
    </div>
  )
}
