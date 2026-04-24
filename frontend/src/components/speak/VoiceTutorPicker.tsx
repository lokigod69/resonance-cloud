import { CharacterGrid } from './CharacterGrid'
import { GeminiModeVoicePicker, type GeminiSelection } from './GeminiModeVoicePicker'
import { GrokPicker, type GrokPickerStep } from './GrokPicker'
import type { TutorCharacter } from '@/characterRegistry'
import type { GrokCategory } from '@/data/grokCategories'
import type { GrokVoice } from '@/data/grokVoices'
import type { GeminiPickerStage } from '@/hooks/useVoiceTutor'
import type { GrokLevel } from '@/lib/grokPedagogy'

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
  grokStep?: GrokPickerStep
  grokLanguageName?: string
  grokSelectedVoice?: GrokVoice | null
  grokSelectedCategory?: GrokCategory | 'free_chat' | null
  grokSelectedLevel?: GrokLevel | null
  onGrokVoiceSelect?: (voice: GrokVoice) => void
  onGrokCategorySelect?: (category: GrokCategory | 'free_chat') => void
  onGrokLevelSelect?: (level: GrokLevel) => void
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
  grokStep,
  grokLanguageName,
  grokSelectedVoice,
  grokSelectedCategory,
  grokSelectedLevel,
  onGrokVoiceSelect,
  onGrokCategorySelect,
  onGrokLevelSelect,
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
        languageName={grokLanguageName ?? ''}
        step={grokStep ?? 'voice'}
        selectedVoice={grokSelectedVoice ?? null}
        selectedCategory={grokSelectedCategory ?? null}
        selectedLevel={grokSelectedLevel ?? null}
        onSelectVoice={(voice) => onGrokVoiceSelect?.(voice)}
        onSelectCategory={(category) => onGrokCategorySelect?.(category)}
        onSelectLevel={(level) => onGrokLevelSelect?.(level)}
        onStart={() => onGrokStart?.()}
        isStarting={!!disabled}
      />
    )
  }

  return <CharacterGrid onSelect={onVoxtralSelect} disabled={disabled} />
}
