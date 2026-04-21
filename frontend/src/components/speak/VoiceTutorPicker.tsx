import { CharacterGrid } from './CharacterGrid'
import { GeminiModeVoicePicker, type GeminiSelection } from './GeminiModeVoicePicker'
import { GrokPicker } from './GrokPicker'
import type { TutorCharacter } from '@/characterRegistry'
import type { GrokCategory } from '@/data/grokCategories'
import type { GrokVoice } from '@/data/grokVoices'
import type { GeminiPickerStage } from '@/hooks/useVoiceTutor'

export type SpeakProvider = 'voxtral' | 'gemini' | 'grok'

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
  grokSelectedVoice?: GrokVoice | null
  grokSelectedCategory?: GrokCategory | 'free_chat' | null
  onGrokVoiceSelect?: (voice: GrokVoice) => void
  onGrokCategorySelect?: (category: GrokCategory | 'free_chat') => void
  onGrokStart?: () => void
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
  grokSelectedVoice,
  grokSelectedCategory,
  onGrokVoiceSelect,
  onGrokCategorySelect,
  onGrokStart,
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
  } else if (provider === 'grok') {
    return (
      <GrokPicker
        language={language}
        selectedVoice={grokSelectedVoice ?? null}
        selectedCategory={grokSelectedCategory ?? null}
        onSelectVoice={(voice) => onGrokVoiceSelect?.(voice)}
        onSelectCategory={(category) => onGrokCategorySelect?.(category)}
        onStart={() => onGrokStart?.()}
        isStarting={!!disabled}
      />
    )
  }

  return <CharacterGrid onSelect={onVoxtralSelect} disabled={disabled} />
}
