import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { GuidedTargetLanguage } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

type GuidedLanguagePickerProps = {
  availableLanguages: GuidedTargetLanguage[]
  selectedLanguage: GuidedTargetLanguage
  onSelectLanguage: (language: GuidedTargetLanguage) => void
}

export function GuidedLanguagePicker({
  availableLanguages,
  selectedLanguage,
  onSelectLanguage,
}: GuidedLanguagePickerProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (availableLanguages.length < 2) return null

  const handleSelect = (language: GuidedTargetLanguage) => {
    onSelectLanguage(language)
    setExpanded(false)
  }

  return (
    <section
      className="today-language-pickerCompact"
      data-expanded={expanded}
      aria-label={t('today.language.title')}
    >
      <button
        type="button"
        className="today-language-pill inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[color-mix(in_srgb,var(--accent)_54%,var(--border-subtle))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="min-w-0 truncate">
          {t('today.language.compactLabel')}: {t(`today.language.${selectedLanguage}`)}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', expanded && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="today-language-pickerOptions mt-2 grid gap-2 sm:grid-cols-2">
          {availableLanguages.map((language) => {
            const isSelected = language === selectedLanguage
            return (
              <button
                key={language}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelect(language)}
                className={cn(
                  'today-language-option flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                  isSelected
                    ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_18%,transparent)]'
                    : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--app-bg)_16%,transparent)]',
                )}
              >
                <span className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                  {t(`today.language.${language}`)}
                </span>
                {isSelected && <Check className="ml-auto h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
