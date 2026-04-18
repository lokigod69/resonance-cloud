import { CharacterGrid } from './CharacterGrid'
import { GeminiModeVoicePicker, type GeminiSelection } from './GeminiModeVoicePicker'
import type { TutorCharacter } from '@/characterRegistry'
import type { GeminiPickerStage } from '@/hooks/useVoiceTutor'

export type SpeakProvider = 'voxtral' | 'gemini'

interface VoiceTutorPickerProps {
  provider: SpeakProvider
  language: string
  disabled?: boolean
  onVoxtralSelect: (char: TutorCharacter) => void
  onGeminiStart: (selection: GeminiSelection) => void
  geminiStage: GeminiPickerStage
  geminiModeId?: string | null
  geminiVoiceName?: string | null
  geminiAccentId?: string | null
  onGeminiModeChange: (modeId: string) => void
  onGeminiVoiceChange: (voiceName: string) => void
  onGeminiAccentChange: (accentId: string) => void
  onGeminiStageChange: (stage: GeminiPickerStage) => void
  confirmLabel?: string
}

export function VoiceTutorPicker({
  provider,
  language,
  disabled,
  onVoxtralSelect,
  onGeminiStart,
  geminiStage,
  geminiModeId,
  geminiVoiceName,
  geminiAccentId,
  onGeminiModeChange,
  onGeminiVoiceChange,
  onGeminiAccentChange,
  onGeminiStageChange,
  confirmLabel,
}: VoiceTutorPickerProps) {
  if (provider === 'gemini') {
    return (
      <GeminiModeVoicePicker
        language={language}
        disabled={disabled}
        stage={geminiStage}
        selectedModeId={geminiModeId}
        selectedVoiceName={geminiVoiceName}
        selectedAccentId={geminiAccentId}
        onModeChange={onGeminiModeChange}
        onVoiceChange={onGeminiVoiceChange}
        onAccentChange={onGeminiAccentChange}
        onStageChange={onGeminiStageChange}
        onStart={onGeminiStart}
        confirmLabel={confirmLabel}
      />
    )
  }

  return <CharacterGrid onSelect={onVoxtralSelect} disabled={disabled} />
}
