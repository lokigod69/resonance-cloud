import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import CurriculumEntryDetailModal from '@/components/categories/CurriculumEntryDetailModal'
import CurriculumEntryImage from '@/components/categories/CurriculumEntryImage'
import {
  getCurriculumEnrichmentBySlug,
  getCurriculumCategoryBySlug,
  getCurriculumGloss,
  getCurriculumLevel,
  getLevelTitle,
  profileBaseLanguageToIso,
  type CurriculumEnrichmentEntry,
  type CurriculumEntry,
} from '@/data/curriculumCategories'
import styles from './Categories.module.css'

export default function LevelDetailPage() {
  const { categorySlug, levelNumber } = useParams<{ categorySlug: string; levelNumber: string }>()
  const { profile } = useAuth()
  const { t, tp } = useTranslation()
  const [selectedEntry, setSelectedEntry] = useState<CurriculumEntry | null>(null)
  const category = getCurriculumCategoryBySlug(categorySlug)
  const level = getCurriculumLevel(categorySlug, levelNumber)
  const baseLanguageIso = profileBaseLanguageToIso(profile?.base_language)
  const enrichment = getCurriculumEnrichmentBySlug(categorySlug)
  const enrichmentByTerm = useMemo(() => {
    const result = new Map<string, CurriculumEnrichmentEntry>()
    const enrichmentLevel = enrichment?.levels.find((item) => item.level === level?.level)
    for (const item of enrichmentLevel?.entries ?? []) {
      result.set(item.term, item)
    }
    return result
  }, [enrichment, level?.level])

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
          const gloss = getCurriculumGloss(entry, baseLanguageIso)
          return (
            <button
              key={`${level.level}-${entry.term}`}
              type="button"
              className={styles.entryCard}
              onClick={() => setSelectedEntry(entry)}
              aria-label={t('categories.entry.openDetail', { term: entry.term, gloss })}
            >
              <CurriculumEntryImage
                languageIso={category.data.target_language}
                categorySlug={category.slug}
                term={entry.term}
                fallbackEmoji={category.icon}
                alt=""
                className={styles.entryImage}
              />
              <div className={styles.entryTopline}>
                <h2 className={styles.term}>{entry.term}</h2>
              </div>
              <p className={styles.gloss}>{gloss}</p>
            </button>
          )
        })}
      </div>

      <CurriculumEntryDetailModal
        entry={selectedEntry}
        enrichment={selectedEntry ? enrichmentByTerm.get(selectedEntry.term) ?? null : null}
        categorySlug={category.slug}
        languageIso={category.data.target_language}
        baseLanguageIso={baseLanguageIso}
        onClose={() => setSelectedEntry(null)}
      />
    </section>
  )
}
