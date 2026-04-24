import { AudioWaveform, Gem, Sparkles, type LucideIcon } from 'lucide-react'
import type { SpeakProvider } from './VoiceTutorPicker'

interface ProviderToggleProps {
  value: SpeakProvider
  onChange: (provider: SpeakProvider) => void
  disabled?: boolean
  disabledReason?: string
  language?: string
}

const OPTIONS: Array<{ id: SpeakProvider; short: string; full: string; Icon: LucideIcon }> = [
  { id: 'grok', short: 'GROK', full: 'Grok', Icon: Sparkles },
  { id: 'voxtral', short: 'VOX', full: 'Voxtral', Icon: AudioWaveform },
  { id: 'gemini', short: 'GEM', full: 'Gemini', Icon: Gem },
]

export function ProviderToggle({ value, onChange, disabled, disabledReason, language }: ProviderToggleProps) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        className="grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-[0_18px_55px_rgba(2,6,23,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
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
          const Icon = opt.Icon

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => { if (!optionDisabled && !selected) onChange(opt.id) }}
              disabled={optionDisabled}
              title={optionTitle}
              aria-pressed={selected}
              aria-label={opt.full}
              className={`group flex min-h-12 items-center justify-center gap-2 rounded-full px-2 text-sm font-bold tracking-[0.18em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 ${
                selected
                  ? 'bg-indigo-300/15 text-white shadow-[0_12px_30px_rgba(79,70,229,0.22),inset_0_1px_0_rgba(255,255,255,0.24)]'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-indigo-100' : 'text-slate-500 group-hover:text-slate-200'}`} />
              <span>{opt.short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
