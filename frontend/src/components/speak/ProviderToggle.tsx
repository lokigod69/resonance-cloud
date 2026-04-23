import type { SpeakProvider } from './VoiceTutorPicker'

interface ProviderToggleProps {
  value: SpeakProvider
  onChange: (provider: SpeakProvider) => void
  disabled?: boolean
  disabledReason?: string
  language?: string
}

const OPTIONS: Array<{ id: SpeakProvider; short: string; full: string }> = [
  { id: 'grok',    short: 'GROK', full: 'Grok'   },
  { id: 'voxtral', short: 'VOX', full: 'Voxtral' },
  { id: 'gemini',  short: 'GEM', full: 'Gemini'  },
]

export function ProviderToggle({ value, onChange, disabled, disabledReason, language }: ProviderToggleProps) {
  return (
    <div
      className="grid grid-cols-3 gap-2 w-full"
      title={disabled ? disabledReason : undefined}
      aria-label="TTS provider"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.id
        const unsupportedForLanguage = language === 'fil' && opt.id === 'grok'
        const optionDisabled = disabled || unsupportedForLanguage
        const optionTitle = disabled
          ? disabledReason
          : unsupportedForLanguage
            ? 'Grok does not support Tagalog yet'
            : undefined
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => { if (!optionDisabled && !selected) onChange(opt.id) }}
            disabled={optionDisabled}
            title={optionTitle}
            aria-pressed={selected}
            aria-label={opt.full}
            className={`h-14 rounded-2xl text-2xl font-bold tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              selected
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                : 'bg-gray-800/60 text-gray-300 border border-white/10 hover:bg-gray-700/70 hover:text-white'
            }`}
          >
            {opt.short}
          </button>
        )
      })}
    </div>
  )
}
