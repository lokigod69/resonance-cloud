import { AudioWaveform, Gem, Sparkles, type LucideIcon } from 'lucide-react'
import type { SpeakProvider } from './VoiceTutorPicker'
import { useTranslation } from '@/hooks/useTranslation'

interface ProviderToggleProps {
  value: SpeakProvider
  onChange: (provider: SpeakProvider) => void
  disabled?: boolean
  disabledReason?: string
  language?: string
}

const OPTIONS: Array<{ id: SpeakProvider; labelKey: string; Icon: LucideIcon }> = [
  { id: 'grok', labelKey: 'speak.mode.live', Icon: Sparkles },
  { id: 'voxtral', labelKey: 'speak.mode.characters', Icon: AudioWaveform },
  { id: 'gemini', labelKey: 'speak.mode.voices', Icon: Gem },
]

export function ProviderToggle({ value, onChange, disabled, disabledReason, language }: ProviderToggleProps) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        className="theme-panel grid grid-cols-3 gap-1 rounded-full p-1 backdrop-blur-xl"
        title={disabled ? disabledReason : undefined}
        aria-label={t('speak.mode.selectorAria')}
      >
        {OPTIONS.map((opt) => {
          const selected = value === opt.id
          const unsupportedForLanguage = language === 'fil' && opt.id === 'grok'
          const optionDisabled = disabled || unsupportedForLanguage
          const optionTitle = disabled
            ? disabledReason
            : unsupportedForLanguage
              ? t('speak.mode.liveUnavailableForTagalog')
              : undefined
          const Icon = opt.Icon
          const label = t(opt.labelKey)

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => { if (!optionDisabled && !selected) onChange(opt.id) }}
              disabled={optionDisabled}
              title={optionTitle}
              aria-pressed={selected}
              aria-label={label}
              className={`group flex min-h-12 items-center justify-center gap-2 rounded-full px-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70 disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 ${
                selected
                  ? 'theme-chip-active'
                  : 'text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-current' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
