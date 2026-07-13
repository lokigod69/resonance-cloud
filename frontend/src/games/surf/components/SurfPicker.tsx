import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Category } from '@/data/categories'
import { useTranslation } from '@/hooks/useTranslation'
import type { SurfMode } from '../engine/types'
import styles from '../styles.module.css'

export type SurfPickerOption = {
  id: string
  label: string
  count: number
  source: 'deck' | 'due'
}

type SurfPickerProps = {
  language: string | null
  returnTo: string
  options: SurfPickerOption[]
  packs: Category[]
  loading: boolean
  needsMoreWords: boolean
  onStartWords: (option: SurfPickerOption, mode: SurfMode) => void
  onStartPack: (category: Category, level: number, mode: SurfMode) => void
}

export function SurfPicker({
  language,
  returnTo,
  options,
  packs,
  loading,
  needsMoreWords,
  onStartWords,
  onStartPack,
}: SurfPickerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<SurfMode>('cruise')
  const [selectedPack, setSelectedPack] = useState<Category | null>(null)
  const levels = useMemo(
    () => selectedPack?.staticWordLevels?.map((level) => level.level) ?? [],
    [selectedPack],
  )

  return (
    <section className={styles.picker} aria-label={t('games.surf.title')}>
      <button type="button" className={styles.backButton} onClick={() => navigate(returnTo)}>
        {t('surf.picker.back')}
      </button>
      <div className={styles.pickerCard}>
        <p className={styles.completeKicker}>{t('games.surf.title')}</p>
        <h1>{t('games.surf.subtitle')}</h1>
        <div className={styles.modeToggle} aria-label={t('surf.picker.mode')}>
          <button
            type="button"
            className={mode === 'cruise' ? styles.modeActive : undefined}
            onClick={() => setMode('cruise')}
          >
            {t('surf.picker.mode.cruise')}
          </button>
          <button
            type="button"
            className={mode === 'rush' ? styles.modeActive : undefined}
            onClick={() => setMode('rush')}
          >
            {t('surf.picker.mode.rush')}
          </button>
        </div>

        <h2>{t('surf.picker.yourWords')}</h2>
        {loading && <p className={styles.pickerHint}>{t('surf.picker.loading')}</p>}
        <div className={styles.sourceList}>
          {options.map((option) => (
            <button key={option.id} type="button" className={styles.sourceCard} onClick={() => onStartWords(option, mode)}>
              <strong>{option.label}</strong>
              <span>{t('surf.picker.wordCount', { count: option.count })}</span>
            </button>
          ))}
        </div>
        {needsMoreWords && <p className={styles.pickerHint}>{t('surf.picker.needMoreWords')}</p>}

        <h2>{t('surf.picker.packs')}</h2>
        {selectedPack ? (
          <div className={styles.levelPicker}>
            <button type="button" className={styles.packHeading} onClick={() => setSelectedPack(null)}>
              {selectedPack.emoji} {t(selectedPack.labelKey)}
            </button>
            <div className={styles.levelChips}>
              {levels.map((level) => (
                <button key={level} type="button" onClick={() => onStartPack(selectedPack, level, mode)}>
                  {t('surf.picker.level', { level })}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.packGrid}>
            {packs.map((pack) => (
              <button key={pack.id ?? pack.name} type="button" className={styles.packCard} onClick={() => setSelectedPack(pack)}>
                <span aria-hidden="true">{pack.emoji}</span>
                {t(pack.labelKey)}
              </button>
            ))}
          </div>
        )}
        {language ? <p className={styles.pickerLanguage}>{language}</p> : null}
      </div>
    </section>
  )
}
