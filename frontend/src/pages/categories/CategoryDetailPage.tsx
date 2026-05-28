import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import {
  getCurriculumCategoryBySlug,
  getLevelDescription,
  getLevelTitle,
} from '@/data/curriculumCategories'
import {
  getPublicCategoryGroups,
  getStaticCategorySelectedItems,
  getStaticCategoryVocabularyItems,
  type Category as StaticCategory,
  type CategoryGroup,
} from '@/data/categories'
import { listImportedCurriculumDecks } from '@/lib/curriculumDeckBridge'
import { generatedCategoryHeroImagePath } from '@/lib/generatedCategoryImages'
import { staticLibraryRouteSuffix, readStaticLibraryTargetLanguage, resolveVisibleStaticLanguage } from '@/lib/staticLibraryLanguage'
import CurriculumEntryImage from '@/components/categories/CurriculumEntryImage'
import styles from './Categories.module.css'

function getStaticCategoryById(categoryId: string | undefined): { category: StaticCategory; group: CategoryGroup } | null {
  if (!categoryId) return null
  const normalized = categoryId.trim().toLowerCase()
  for (const group of getPublicCategoryGroups()) {
    for (const category of group.categories) {
      if (!category.staticWordLevels?.length) continue
      if (category.id?.toLowerCase() === normalized || category.name.toLowerCase() === normalized) {
        return { category, group }
      }
    }
  }
  return null
}

function StaticCategoryDetailVisual({ category }: { category: StaticCategory }) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageSrc = category.id ? generatedCategoryHeroImagePath('en', category.id) : null

  if (imageSrc && !imageFailed) {
    return (
      <img
        src={imageSrc}
        alt=""
        className={`${styles.detailEmoji} ${styles.staticDetailImage}`}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div className={`${styles.detailEmoji} ${styles.staticDetailEmoji}`} aria-hidden="true">
      {category.emoji}
    </div>
  )
}

export default function CategoryDetailPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>()
  const [searchParams] = useSearchParams()
  const { profile, user } = useAuth()
  const { activeLanguage } = useLanguage()
  const { t, tp } = useTranslation()
  const category = getCurriculumCategoryBySlug(categorySlug)
  const staticCategory = category ? null : getStaticCategoryById(categorySlug)
  const targetLanguage = readStaticLibraryTargetLanguage(searchParams.get('targetLanguage'), activeLanguage)
  const helperLanguage = resolveVisibleStaticLanguage(profile?.base_language, 'German')
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

  if (staticCategory) {
    return renderStaticCategoryDetail({
      category: staticCategory.category,
      group: staticCategory.group,
      targetLanguage,
      helperLanguage,
      t,
      tp,
    })
  }

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

function renderStaticCategoryDetail({
  category,
  group,
  targetLanguage,
  helperLanguage,
  t,
  tp,
}: {
  category: StaticCategory
  group: CategoryGroup
  targetLanguage: string
  helperLanguage: string
  t: ReturnType<typeof useTranslation>['t']
  tp: ReturnType<typeof useTranslation>['tp']
}) {
  const vocabularyItems = getStaticCategoryVocabularyItems(category)
  const levelCount = category.staticWordLevels?.length ?? 0
  const categorySlug = category.id ?? category.name

  return (
    <section className={styles.page}>
      <Link to={`/categories${staticLibraryRouteSuffix(targetLanguage)}`} className={styles.backLink}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('categories.backToCategories')}
      </Link>

      <header className={styles.detailHero}>
        <StaticCategoryDetailVisual category={category} />
        <div>
          <p className={styles.eyebrow}>{t(group.groupKey)}</p>
          <h1 className={styles.title}>{t(category.labelKey)}</h1>
          <p className={styles.subtitle}>{category.description}</p>
          <div className={styles.tileMeta}>
            <span className={styles.chip}>{tp('categories.entryCount', vocabularyItems.length)}</span>
            <span className={styles.chip}>{tp('categories.levelCount', levelCount)}</span>
          </div>
        </div>
      </header>

      <div className={styles.levelPreviewGrid}>
        {(category.staticWordLevels ?? []).map((level) => {
          const previewItems = getStaticCategorySelectedItems(category, 4, level.level, targetLanguage, helperLanguage)
          return (
            <Link
              key={level.level}
              to={`/categories/${categorySlug}/level/${level.level}${staticLibraryRouteSuffix(targetLanguage)}`}
              className={styles.levelPreviewCard}
            >
              <div className={styles.levelPreviewCollage} aria-hidden="true">
                {previewItems.map((item) => (
                  <CurriculumEntryImage
                    key={item.conceptId}
                    languageIso="en"
                    categorySlug={categorySlug}
                    term={item.translations.en.term}
                    fallbackEmoji={category.emoji}
                    alt=""
                    className={styles.levelPreviewImage}
                  />
                ))}
                {previewItems.length === 0 ? (
                  <div className={styles.levelPreviewFallback}>{level.level}</div>
                ) : null}
              </div>
              <div className={styles.levelPreviewBody}>
                <span className={styles.levelBadge}>{level.level}</span>
                <h2 className={styles.rowTitle}>{t('categories.levelLabel', { number: level.level })}</h2>
                <p className={styles.rowDescription}>{level.label}</p>
                <p className={styles.rowMeta}>{tp('categories.entryCount', level.words.length)}</p>
                <span className={styles.rowAction}>
                  {t('categories.openLevelAction')}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
