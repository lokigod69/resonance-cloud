import { FlagIcon } from '@/components/ui/FlagIcon'
import { useTranslation } from '@/hooks/useTranslation'
import { STATIC_CATEGORY_TARGET_LANGUAGES } from '@/data/categories'
import styles from './Categories.module.css'

type LibraryLanguageChooserProps = {
  /** Receives the language `value` (e.g. "German") — the same shape the Library target uses. */
  onChoose: (languageValue: string) => void
}

/**
 * First-visit Library language chooser. Shown once, when the learner opens the Library with no
 * language chosen (no `?targetLanguage`, no stored preference, no active study language), so the
 * per-language nature of the packs is obvious and they pick deliberately instead of landing on a
 * silent English default. The choice is a Library-local target (persisted via
 * `staticLibraryLanguage`); it does not touch the global active language.
 */
export function LibraryLanguageChooser({ onChoose }: LibraryLanguageChooserProps) {
  const { t } = useTranslation()

  return (
    <section className={styles.languageChooser} aria-labelledby="library-language-chooser-title">
      <h1 id="library-language-chooser-title" className={styles.languageChooserTitle}>
        {t('categories.chooseLanguageTitle')}
      </h1>
      <div className={styles.languageChooserGrid}>
        {STATIC_CATEGORY_TARGET_LANGUAGES.map((language) => (
          <button
            key={language.code}
            type="button"
            className={styles.languageChooserOption}
            onClick={() => onChoose(language.value)}
          >
            <FlagIcon code={language.code} className={`${styles.languageChooserFlag} w-7 h-auto`} />
            <span className={styles.languageChooserLabel}>{language.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
