import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { listCurriculumCategories, type CurriculumCategory } from '@/data/curriculumCategories'
import { listImportedCurriculumDecks } from '@/lib/curriculumDeckBridge'
import styles from './Categories.module.css'

function CategoryHero({ category }: { category: CurriculumCategory }) {
  const [imageFailed, setImageFailed] = useState(false)
  const heroSrc = `/curriculum/categories/en/${category.slug}/hero.webp`

  if (imageFailed) {
    return (
      <div className={styles.heroPlaceholder}>
        <span className={styles.heroEmoji} aria-hidden="true">{category.icon}</span>
      </div>
    )
  }

  return (
    <img
      src={heroSrc}
      alt=""
      loading="lazy"
      className={styles.heroImage}
      onError={() => setImageFailed(true)}
    />
  )
}

export default function CategoryListPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const categories = listCurriculumCategories()
  const [importedCategorySlugs, setImportedCategorySlugs] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    if (!user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets imported categories when user clears; canonical reset-on-key pattern
      setImportedCategorySlugs(new Set())
      return () => {
        cancelled = true
      }
    }

    void listImportedCurriculumDecks(supabase, user.id)
      .then((rows) => {
        if (cancelled) return
        const next = new Set<string>()
        for (const row of rows) {
          if (row.curriculum_category_slug) {
            next.add(row.curriculum_category_slug)
          }
        }
        setImportedCategorySlugs(next)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[categories] imported-decks lookup failed', error)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t('categories.eyebrow')}</p>
          <h1 className={styles.title}>{t('categories.title')}</h1>
          <p className={styles.subtitle}>{t('categories.subtitle')}</p>
        </div>
        <Link to="/generate" className={styles.generateAction}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('categories.generateFromCategories')}
        </Link>
      </header>

      <div className={styles.grid}>
        {categories.map((category) => {
          const isImported = importedCategorySlugs.has(category.slug)
          return (
            <Link
              key={category.slug}
              to={`/categories/${category.slug}`}
              className={styles.tile}
              aria-label={t('categories.openCategory', { title: category.title })}
            >
              <div className={styles.hero}>
                <CategoryHero category={category} />
              </div>
              <div className={styles.tileBody}>
                <h2 className={styles.tileTitle}>
                  <span className={styles.tileEmoji} aria-hidden="true">{category.icon}</span>
                  <span>{category.title}</span>
                </h2>
                {isImported ? (
                  <div className={styles.tileMeta}>
                    <span className={styles.tileImportedBadge}>
                      <Check className="h-3 w-3" aria-hidden="true" />
                      {t('categories.imported')}
                    </span>
                  </div>
                ) : null}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
