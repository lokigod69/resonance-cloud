import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { LiquidGlassPopoverOverlay } from '@/components/liquid-glass/LiquidGlassPopoverOverlay'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useSkin } from '@/contexts/SkinContext'
import { useTranslation } from '@/hooks/useTranslation'

type LanguageClusterProps = {
  languages: string[]
  activeLanguage: string | null
  onSelect: (lang: string) => void
}

const LIQUID_GLASS_FALLBACK_IMAGE = '/brand/cosmos/cosmos-auth.webp'

export function LanguageCluster({ languages, activeLanguage, onSelect }: LanguageClusterProps) {
  const { t } = useTranslation()
  const { skin } = useSkin()
  const [open, setOpen] = useState(false)
  const [waveCanvas, setWaveCanvas] = useState<HTMLCanvasElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const useLiquidGlassPopover = skin === 'glassy'

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

  useEffect(() => {
    if (!useLiquidGlassPopover || !open) return

    let frame = 0
    const syncWaveCanvas = () => {
      const canvas = document.querySelector('.dashboard-wave-bg canvas') as HTMLCanvasElement | null
      setWaveCanvas((current) => (current === canvas ? current : canvas))
      if (!canvas) frame = window.requestAnimationFrame(syncWaveCanvas)
    }

    syncWaveCanvas()

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [open, useLiquidGlassPopover])

  if (languages.length === 0 || !activeLanguage) return null

  const activeLabel = t(`langName.${activeLanguage}`)
  const hasChoices = languages.length > 1

  const handleSelect = (language: string) => {
    onSelect(language)
    setOpen(false)
  }

  const languageOptions = languages.map((language) => {
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
  })

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
    >
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
      </button>

      {hasChoices && useLiquidGlassPopover && open ? (
        <LiquidGlassPopoverOverlay
          backgroundImage={LIQUID_GLASS_FALLBACK_IMAGE}
          canvasSource={useLiquidGlassPopover ? waveCanvas : null}
          open={open}
          className="language-picker-panel language-picker-panel--liquid"
          aria-label={t('categories.targetLanguageLabel')}
        >
          {languageOptions}
        </LiquidGlassPopoverOverlay>
      ) : hasChoices ? (
        <div className="language-picker-panel" role="listbox" aria-label={t('categories.targetLanguageLabel')}>
          {languageOptions}
        </div>
      ) : null}
    </div>
  )
}
