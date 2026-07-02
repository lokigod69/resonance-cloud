import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useTranslation } from '@/hooks/useTranslation'

type LanguageClusterProps = {
  languages: string[]
  activeLanguage: string | null
  onSelect: (lang: string) => void
}

type LanguageChoiceStyle = CSSProperties & {
  '--language-choice-offset': string
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
  const activeIndex = Math.max(languages.indexOf(activeLanguage), 0)

  const handleSelect = (language: string) => {
    onSelect(language)
    setOpen(false)
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
        if (event.pointerType === 'mouse' && hasChoices) setOpen(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setOpen(false)
      }}
      onFocus={() => {
        if (hasChoices) setOpen(true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        type="button"
        className="lang-pill lang-pill-active language-picker-trigger"
        onClick={() => hasChoices && setOpen((value) => !value)}
        aria-expanded={open}
        disabled={!hasChoices}
      >
        <FlagIcon code={activeLanguage} className="w-5 h-auto" />
        <span>{activeLabel}</span>
      </button>

      {hasChoices ? (
        <div className="language-picker-strip" role="group" aria-label={t('categories.targetLanguageLabel')}>
          {languageOptions}
        </div>
      ) : null}
    </div>
  )
}
