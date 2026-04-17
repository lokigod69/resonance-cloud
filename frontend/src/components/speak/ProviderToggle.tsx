import type { SpeakProvider } from './VoiceTutorPicker'

interface ProviderToggleProps {
  value: SpeakProvider
  onChange: (provider: SpeakProvider) => void
  disabled?: boolean
  disabledReason?: string
}

const OPTIONS: Array<{ id: SpeakProvider; label: string }> = [
  { id: 'voxtral', label: 'Voxtral' },
  { id: 'gemini',  label: 'Gemini' },
]

export function ProviderToggle({ value, onChange, disabled, disabledReason }: ProviderToggleProps) {
  return (
    <div
      className="inline-flex items-center p-1 rounded-full bg-gray-800/60 border border-white/5"
      title={disabled ? disabledReason : undefined}
      aria-label="TTS provider"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => { if (!disabled && !selected) onChange(opt.id) }}
            disabled={disabled}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selected
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-pressed={selected}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
