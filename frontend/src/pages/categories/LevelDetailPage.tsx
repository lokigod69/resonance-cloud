import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import {
  getCurriculumCategoryBySlug,
  getCurriculumGloss,
  getCurriculumLevel,
  getLevelTitle,
  profileBaseLanguageToIso,
  type CurriculumEntry,
} from '@/data/curriculumCategories'
import styles from './Categories.module.css'

function entryImageUrl(entry: CurriculumEntry): string | null {
  return entry.image_url ?? entry.imageUrl ?? null
}

function usageExamples(entry: CurriculumEntry): string[] {
  return entry.usage_examples ?? entry.examples ?? []
}

export default function LevelDetailPage() {
  const { categorySlug, levelNumber } = useParams<{ categorySlug: string; levelNumber: string }>()
  const { profile } = useAuth()
  const { t, tp } = useTranslation()
  const category = getCurriculumCategoryBySlug(categorySlug)
  const level = getCurriculumLevel(categorySlug, levelNumber)
  const baseLanguageIso = profileBaseLanguageToIso(profile?.base_language)

  if (!category || !level) {
    return (
      <section className={styles.page}>
        <div className={styles.notFound}>
          <h1 className={styles.title}>
            {category ? t('categories.levelNotFound.title') : t('categories.notFound.title')}
          </h1>
          <p className={styles.subtitle}>
            {category ? t('categories.levelNotFound.body') : t('categories.notFound.body')}
          </p>
          <Link to={category ? `/categories/${category.slug}` : '/categories'} className={styles.backLink}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {category ? t('categories.backToCategory') : t('categories.backToCategories')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <Link to={`/categories/${category.slug}`} className={styles.backLink}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('categories.backToCategory')}
      </Link>

      <header className={styles.detailHero}>
        <div className={styles.detailEmoji} aria-hidden="true">{category.icon}</div>
        <div>
          <p className={styles.eyebrow}>
            {t('categories.levelLabel', { number: level.level })} · {tp('categories.entryCount', level.entries.length)}
          </p>
          <h1 className={styles.title}>{getLevelTitle(level)}</h1>
          <p className={styles.subtitle}>{category.title}</p>
        </div>
        <div className={styles.heroAction}>
          <button type="button" disabled aria-disabled="true" className={styles.disabledStudy}>
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>{t('categories.startLearning')}</span>
            <span className={styles.soonBadge}>{t('categories.comingSoon')}</span>
          </button>
        </div>
      </header>

      <div className={styles.entryGrid}>
        {level.entries.map((entry) => {
          const imageUrl = entryImageUrl(entry)
          const examples = usageExamples(entry)
          return (
            <article key={`${level.level}-${entry.term}`} className={styles.entryCard}>
              {imageUrl && <img src={imageUrl} alt="" loading="lazy" className={styles.entryImage} />}
              <div className={styles.entryTopline}>
                <h2 className={styles.term}>{entry.term}</h2>
              </div>
              <p className={styles.gloss}>{getCurriculumGloss(entry, baseLanguageIso)}</p>
              {(entry.ipa || entry.mnemonic || entry.etymology || examples.length > 0) && (
                <div className={styles.enrichment}>
                  {entry.ipa && <span><strong>{t('categories.entry.ipa')}</strong> {entry.ipa}</span>}
                  {entry.mnemonic && <span><strong>{t('categories.entry.mnemonic')}</strong> {entry.mnemonic}</span>}
                  {entry.etymology && <span><strong>{t('categories.entry.etymology')}</strong> {entry.etymology}</span>}
                  {examples.map((example) => (
                    <span key={example}><strong>{t('categories.entry.example')}</strong> {example}</span>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
