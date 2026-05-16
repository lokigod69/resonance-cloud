import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import {
  getCurriculumCategoryBySlug,
  getLevelDescription,
  getLevelTitle,
} from '@/data/curriculumCategories'
import { listImportedCurriculumDecks } from '@/lib/curriculumDeckBridge'
import styles from './Categories.module.css'

export default function CategoryDetailPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>()
  const { user } = useAuth()
  const { t, tp } = useTranslation()
  const category = getCurriculumCategoryBySlug(categorySlug)
  const [importedLevels, setImportedLevels] = useState<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false
    if (!user?.id || !category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets imported-levels when user/category clears; canonical reset-on-key pattern
      setImportedLevels(new Set())
      return () => {
        cancelled = true
      }
    }

    void listImportedCurriculumDecks(supabase, user.id)
      .then((rows) => {
        if (cancelled) return
        const next = new Set<number>()
        for (const row of rows) {
          if (
            row.curriculum_category_slug === category.slug
            && typeof row.curriculum_level === 'number'
          ) {
            next.add(row.curriculum_level)
          }
        }
        setImportedLevels(next)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[categories] imported-decks lookup failed', error)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, category])

  const importedTickLabel = useMemo(() => t('categories.imported'), [t])

  if (!category) {
    return (
      <section className={styles.page}>
        <div className={styles.notFound}>
          <h1 className={styles.title}>{t('categories.notFound.title')}</h1>
          <p className={styles.subtitle}>{t('categories.notFound.body')}</p>
          <Link to="/categories" className={styles.backLink}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('categories.backToCategories')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <Link to="/categories" className={styles.backLink}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('categories.backToCategories')}
      </Link>

      <header className={styles.detailHero}>
        <div className={styles.detailEmoji} aria-hidden="true">{category.icon}</div>
        <div>
          <p className={styles.eyebrow}>{tp('categories.levelCount', category.levelCount)}</p>
          <h1 className={styles.title}>{category.title}</h1>
          <p className={styles.subtitle}>{category.description}</p>
        </div>
      </header>

      <div className={styles.levelList}>
        {category.levels.map((level) => {
          const description = getLevelDescription(level)
          const isImported = importedLevels.has(level.level)
          return (
            <Link
              key={level.level}
              to={`/categories/${category.slug}/${level.level}`}
              className={styles.levelRow}
            >
              <span className={styles.levelBadge}>{level.level}</span>
              <div>
                <span className={styles.rowTitleWrap}>
                  <h2 className={styles.rowTitle}>{getLevelTitle(level)}</h2>
                  {isImported ? (
                    <span
                      className={styles.importedTick}
                      role="img"
                      aria-label={importedTickLabel}
                      title={importedTickLabel}
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
                {description && <p className={styles.rowDescription}>{description}</p>}
                <span className={styles.rowMeta}>{tp('categories.entryCount', level.entries.length)}</span>
              </div>
              <span className={styles.rowAction}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
