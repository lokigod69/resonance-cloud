import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { listCurriculumCategories, type CurriculumCategory } from '@/data/curriculumCategories'
import {
  getPublicCategoryGroups,
  getStaticCategoryVocabularyItems,
  type Category as StaticCategory,
} from '@/data/categories'
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

const THEMATIC_PLACEHOLDER_COLORS = [
  ['#355070', '#6d597a'],
  ['#2f5d50', '#5f8d4e'],
  ['#6c584c', '#a98467'],
  ['#4a4e69', '#9a8c98'],
  ['#335c67', '#e09f3e'],
  ['#3d405b', '#81b29a'],
  ['#5c677d', '#7d8597'],
]

function stableColorPair(category: StaticCategory) {
  const key = category.id ?? category.name
  const total = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return THEMATIC_PLACEHOLDER_COLORS[total % THEMATIC_PLACEHOLDER_COLORS.length]
}

function ThematicCategoryHero({ category }: { category: StaticCategory }) {
  const [from, to] = stableColorPair(category)
  return (
    <div
      className={`${styles.heroPlaceholder} ${styles.thematicHeroPlaceholder}`}
      style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}
    >
      <span className={styles.heroEmoji} aria-hidden="true">{category.emoji}</span>
    </div>
  )
}

function thematicCategoryHref(category: StaticCategory) {
  return `/categories/${encodeURIComponent(category.id ?? category.name)}`
}

export default function CategoryListPage() {
  const { t, tp } = useTranslation()
  const { user } = useAuth()
  const categories = listCurriculumCategories()
  const thematicCategoryGroups = getPublicCategoryGroups()
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) => category.staticWordLevels?.length),
    }))
    .filter((group) => group.categories.length > 0)
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

      <section className={styles.categorySection} aria-labelledby="legacy-curriculum-categories">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="legacy-curriculum-categories" className={styles.sectionTitle}>
              {t('categories.legacySectionTitle')}
            </h2>
            <p className={styles.sectionDescription}>{t('categories.legacySectionDescription')}</p>
          </div>
        </div>

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

      <section className={styles.categorySection} aria-labelledby="thematic-static-categories">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="thematic-static-categories" className={styles.sectionTitle}>
              {t('categories.thematicSectionTitle')}
            </h2>
            <p className={styles.sectionDescription}>{t('categories.thematicSectionDescription')}</p>
          </div>
        </div>

        <div className={styles.thematicGroups}>
          {thematicCategoryGroups.map((group) => (
            <section key={group.label} className={styles.thematicGroup} aria-labelledby={`thematic-group-${group.label.replace(/\s+/g, '-').toLowerCase()}`}>
              <h3 id={`thematic-group-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className={styles.thematicGroupTitle}>
                <span aria-hidden="true">{group.emoji}</span>
                {t(group.groupKey)}
              </h3>
              <div className={styles.thematicGrid}>
                {group.categories.map((category) => {
                  const wordCount = getStaticCategoryVocabularyItems(category).length
                  const levelCount = category.staticWordLevels?.length ?? 0
                  return (
                    <Link
                      key={category.id ?? category.name}
                      to={thematicCategoryHref(category)}
                      className={`${styles.tile} ${styles.thematicTile}`}
                      aria-label={t('categories.openCategory', { title: t(category.labelKey) })}
                    >
                      <div className={styles.hero}>
                        <ThematicCategoryHero category={category} />
                      </div>
                      <div className={styles.tileBody}>
                        <p className={styles.thematicGroupLabel}>{t(group.groupKey)}</p>
                        <h2 className={styles.tileTitle}>
                          <span className={styles.tileEmoji} aria-hidden="true">{category.emoji}</span>
                          <span>{t(category.labelKey)}</span>
                        </h2>
                        <div className={styles.tileMeta}>
                          <span className={styles.chip}>{tp('categories.entryCount', wordCount)}</span>
                          <span className={styles.chip}>{tp('categories.levelCount', levelCount)}</span>
                        </div>
                        <span className={styles.tileAction}>
                          {t('categories.openCategoryAction')}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </section>
  )
}
