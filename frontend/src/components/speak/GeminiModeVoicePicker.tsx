import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { GEMINI_CHARACTER_MODES, type GeminiCharacterMode } from '@/data/geminiCharacterModes'
import { GEMINI_VOICES } from '@/data/geminiVoices'
import { GEMINI_ACCENTS, DEFAULT_GEMINI_ACCENT_ID, type GeminiAccent } from '@/data/geminiAccents'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { VoiceSampleButton } from './VoiceSampleButton'
import type { GeminiPickerStage } from '@/hooks/useVoiceTutor'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { canUseExperimentalSpeakOptions } from '@/lib/speakCuration'

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

const GROUP_LABEL_KEYS: Record<GeminiAccent['group'], string> = {
  none: 'speak.accent.group.none',
  regional: 'speak.accent.group.regional',
  theatrical: 'speak.accent.group.theatrical',
}

const SECTION_LABEL_CLASS = 'text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider'

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
  confirmLabel,
}: GeminiModeVoicePickerProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const showTheatricalAccents = canUseExperimentalSpeakOptions(profile)
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)
  const [accentOpen, setAccentOpen] = useState(false)

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

  const startGemini = () => {
    if (!selectedMode || !selectedVoiceName) return
    onStart({
      mode: selectedMode,
      voiceName: selectedVoiceName,
      accentId,
    })
  }

  if (stage === 'voice') {
    return (
      <div>
        <p className={`${SECTION_LABEL_CLASS} mb-3`}>{t('speak.accent.voiceStyles')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GEMINI_VOICES.map((voice) => {
            const selected = selectedVoiceName === voice.name
            return (
              <div
                key={voice.name}
                className={`speak-glass-card relative transition-all ${
                  selected
                    ? 'border-[var(--accent)]/55 bg-[var(--accent-soft)] shadow-[0_0_0_1px_var(--accent-glow),0_18px_45px_var(--accent-glow)]'
                    : 'hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-glass-strong)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onVoiceChange(voice.name)
                    onStageChange('mode')
                  }}
                  disabled={disabled}
                  className="w-full flex min-h-[104px] flex-col items-start justify-center gap-1 px-4 py-4 pr-12 rounded-2xl text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-full">{voice.name}</span>
                  <span className="text-xs text-[var(--text-muted)] truncate max-w-full">{voice.tone}</span>
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
        <p className={`${SECTION_LABEL_CLASS} mb-3`}>{t('speak.accent.chooseVibe')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                className={`speak-glass-card flex min-h-[132px] flex-col items-start gap-2 px-4 py-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? 'border-[var(--accent)]/55 bg-[var(--accent-soft)] shadow-[0_0_0_1px_var(--accent-glow),0_18px_45px_var(--accent-glow)]'
                    : 'hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-glass-strong)]'
                }`}
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">{mode.displayName}</span>
                <span className="text-xs text-[var(--text-muted)] leading-snug">{mode.description}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const readySummary = [
    selectedVoiceName,
    selectedMode?.displayName ?? null,
  ]
    .filter(Boolean)
    .join(' / ')
  const accentSummary = selectedAccent.id === 'none' ? t('speak.accent.noneSelected') : selectedAccent.name

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 px-1">
      <div>
        <p className={SECTION_LABEL_CLASS}>{t('speak.accent.ready')}</p>
        <p className="mt-1 truncate text-sm text-[var(--text-secondary)]" title={readySummary}>
          {readySummary}
        </p>
      </div>

      <button
        type="button"
        onClick={startGemini}
        disabled={!selectedMode || !selectedVoiceName || disabled}
        className="speak-start-button w-full rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--on-accent)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:text-[var(--text-muted)] disabled:shadow-none"
      >
        {confirmLabel ?? t('speak.grok.startConversation')}
      </button>

      <Collapsible open={accentOpen} onOpenChange={setAccentOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-expanded={accentOpen}
            disabled={disabled}
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-glass-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${accentOpen ? 'rotate-180' : ''}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {t('speak.accent')} ({t('speak.accentOptional')})
              </span>
              <span className="mt-1 block truncate text-sm text-[var(--text-primary)]">
                {accentSummary}
              </span>
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 overscroll-contain pt-4 pr-1">
            <p className="text-xs text-[var(--accent-warm)]/90">
              {t('speak.accent.experimental')}
            </p>
            {(showTheatricalAccents
              ? (['none', 'regional', 'theatrical'] as const)
              : (['none', 'regional'] as const)
            ).map((group) => (
              <div key={group}>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  {t(GROUP_LABEL_KEYS[group])}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {accentGroups[group].map((accent) => {
                    const selected = accent.id === accentId
                    return (
                      <button
                        key={accent.id}
                        type="button"
                        onClick={() => {
                          onAccentChange(accent.id)
                          setAccentOpen(false)
                        }}
                        disabled={disabled}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected
                            ? 'border-[var(--accent)]/45 bg-[var(--accent-soft)] text-[var(--text-primary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] hover:bg-[var(--surface-glass-strong)]'
                        }`}
                      >
                        <span className="text-xs font-medium truncate">{accent.name}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-[var(--accent-2)] shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
