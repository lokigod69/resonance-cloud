import { CharacterGrid } from './CharacterGrid'
import { GeminiModeVoicePicker, type GeminiSelection } from './GeminiModeVoicePicker'
import type { TutorCharacter } from '@/characterRegistry'

export type SpeakProvider = 'voxtral' | 'gemini'

interface VoiceTutorPickerProps {
  provider: SpeakProvider
  language: string
  disabled?: boolean
  onVoxtralSelect: (char: TutorCharacter) => void
  onGeminiSelect: (selection: GeminiSelection) => void
  initialGeminiModeId?: string | null
  initialGeminiVoiceName?: string | null
  initialGeminiAccentId?: string | null
}

export function VoiceTutorPicker({
  provider,
  language,
  disabled,
  onVoxtralSelect,
  onGeminiSelect,
  initialGeminiModeId,
  initialGeminiVoiceName,
  initialGeminiAccentId,
}: VoiceTutorPickerProps) {
  if (provider === 'gemini') {
    return (
      <GeminiModeVoicePicker
        language={language}
        disabled={disabled}
        onSelect={onGeminiSelect}
        initialModeId={initialGeminiModeId}
        initialVoiceName={initialGeminiVoiceName}
        initialAccentId={initialGeminiAccentId}
      />
    )
  }

  return <CharacterGrid onSelect={onVoxtralSelect} disabled={disabled} />
}
