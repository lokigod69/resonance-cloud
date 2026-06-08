import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useTranslation } from '@/hooks/useTranslation'

type LanguageClusterProps = {
  languages: string[]
  activeLanguage: string | null
  onSelect: (lang: string) => void
}

export function LanguageCluster({ languages, activeLanguage, onSelect }: LanguageClusterProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (languages.length === 0 || !activeLanguage) return null

  const activeLabel = t(`langName.${activeLanguage}`)
  const hasChoices = languages.length > 1

  const handleSelect = (language: string) => {
    onSelect(language)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="lang-cluster language-picker">
      <button
        type="button"
        className="lang-pill lang-pill-active language-picker-trigger"
        onClick={() => hasChoices && setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={!hasChoices}
      >
        <FlagIcon code={activeLanguage} className="w-5 h-auto" />
        <span>{activeLabel}</span>
        {hasChoices ? (
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        ) : null}
      </button>

      {open ? (
        <div className="language-picker-panel" role="listbox" aria-label={t('categories.targetLanguageLabel')}>
          {languages.map((language) => {
            const selected = language === activeLanguage
            return (
              <button
                key={language}
                type="button"
                role="option"
                aria-selected={selected}
                className={`language-picker-option ${selected ? 'is-selected' : ''}`}
                onClick={() => handleSelect(language)}
              >
                <FlagIcon code={language} className="w-6 h-auto" />
                <span>{t(`langName.${language}`)}</span>
                {selected ? <Check className="ml-auto h-4 w-4" aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
