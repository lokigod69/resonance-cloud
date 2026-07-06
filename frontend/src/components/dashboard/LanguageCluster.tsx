import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useTranslation } from '@/hooks/useTranslation'
import { WIZARD_LANGUAGES } from '@/lib/languages'

type LanguageClusterProps = {
  languages: string[]
  activeLanguage: string | null
  onSelect: (lang: string) => void
  /** When provided, an "+ Add language" affordance is shown that expands the
   *  wizard languages the learner hasn't started yet. Called with the canonical
   *  language value on selection. Omit to hide the add flow entirely. */
  onAddLanguage?: (lang: string) => void
}

type LanguageChoiceStyle = CSSProperties & {
  '--language-choice-offset': string
}

export function LanguageCluster({ languages, activeLanguage, onSelect, onAddLanguage }: LanguageClusterProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const closePanel = () => {
    setOpen(false)
    setAdding(false)
  }

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setAdding(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setAdding(false)
      }
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
  const activeIndex = Math.max(languages.indexOf(activeLanguage), 0)
  const addableLanguages = onAddLanguage
    ? WIZARD_LANGUAGES.filter((lang) => !languages.includes(lang.value))
    : []
  const canAdd = addableLanguages.length > 0
  // The panel is worth opening when there's something inside it — other
  // languages to switch to, or the add-language flow.
  const hasPanel = hasChoices || canAdd

  const handleSelect = (language: string) => {
    onSelect(language)
    closePanel()
  }

  const handleAdd = (language: string) => {
    onAddLanguage?.(language)
    closePanel()
  }

  const languageOptions = [
    ...languages.slice(0, activeIndex).reverse().map((language, optionIndex) => ({
      language,
      optionIndex,
      side: 'left' as const,
    })),
    ...languages.slice(activeIndex + 1).map((language, optionIndex) => ({
      language,
      optionIndex,
      side: 'right' as const,
    })),
  ].map(({ language, optionIndex, side }) => (
      <button
        key={language}
        type="button"
        aria-pressed={false}
        className="language-picker-choice lang-pill"
        data-side={side}
        data-option-index={optionIndex}
        style={{ '--language-choice-offset': `${(optionIndex + 1) * 8.25}rem` } as LanguageChoiceStyle}
        onClick={() => handleSelect(language)}
      >
        <FlagIcon code={language} className="w-6 h-auto" />
        <span>{t(`langName.${language}`)}</span>
      </button>
  ))

  return (
    <div
      ref={rootRef}
      className={`lang-cluster language-picker ${open ? 'is-open' : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' && hasPanel) setOpen(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') closePanel()
      }}
      onFocus={() => {
        if (hasPanel) setOpen(true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closePanel()
      }}
    >
      <button
        type="button"
        className="lang-pill lang-pill-active language-picker-trigger"
        onClick={() => {
          if (!hasPanel) return
          if (open) closePanel()
          else setOpen(true)
        }}
        aria-expanded={open}
        disabled={!hasPanel}
      >
        <FlagIcon code={activeLanguage} className="w-5 h-auto" />
        <span>{activeLabel}</span>
      </button>

      {hasPanel ? (
        <div className="language-picker-strip" role="group" aria-label={t('categories.targetLanguageLabel')}>
          {languageOptions}
          {canAdd ? (
            <div className="language-picker-add">
              {adding ? (
                addableLanguages.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    className="language-picker-add-option lang-pill"
                    onClick={() => handleAdd(lang.value)}
                  >
                    <FlagIcon code={lang.code} className="w-6 h-auto" />
                    <span>{t(`langName.${lang.value}`)}</span>
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  className="language-picker-add-trigger lang-pill"
                  onClick={() => setAdding(true)}
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>{t('dashboard.addLanguage')}</span>
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
