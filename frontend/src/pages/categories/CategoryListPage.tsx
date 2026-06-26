import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { listCurriculumCategories, type CurriculumCategory } from '@/data/curriculumCategories'
import { generatedCategoryHeroImagePath } from '@/lib/generatedCategoryImages'
import {
  STATIC_CATEGORY_TARGET_LANGUAGES,
  getPublicCategoryGroups,
  type Category as StaticCategory,
} from '@/data/categories'
import { listImportedCurriculumDecks } from '@/lib/curriculumDeckBridge'
import {
  hasStoredStaticLibraryTargetLanguage,
  persistStaticLibraryTargetLanguage,
  readStaticLibraryTargetLanguage,
  staticLibraryRouteSuffix,
} from '@/lib/staticLibraryLanguage'
import { LibraryLanguageChooser } from './LibraryLanguageChooser'
import { useCategoryScrollReset } from './useCategoryScrollReset'
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
  const [imageFailed, setImageFailed] = useState(false)
  const imageSrc = category.id ? generatedCategoryHeroImagePath('en', category.id) : null
  const [from, to] = stableColorPair(category)

  if (imageSrc && !imageFailed) {
    return (
      <img
        src={imageSrc}
        alt=""
        loading="lazy"
        className={styles.heroImage}
        onError={() => setImageFailed(true)}
      />
    )
  }

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
  const { t } = useTranslation()
  const { user } = useAuth()
  const { activeLanguage, languageReady } = useLanguage()
  const [searchParams] = useSearchParams()
  useCategoryScrollReset()
  const categories = listCurriculumCategories()
  const [targetLanguage, setTargetLanguage] = useState(() => readStaticLibraryTargetLanguage(searchParams.get('targetLanguage'), activeLanguage))
  const [languagePicked, setLanguagePicked] = useState(false)

  // First-visit chooser: only when there's genuinely nothing to go on — no route language, no
  // stored Library preference, and no active study language — so we don't interrupt learners who
  // already have a language while still catching the brand-new cold start. `activeLanguage`
  // resolves asynchronously (LanguageProvider seeds it from storage/decks after mount), so it can
  // only be trusted once `languageReady`. Derived (not effect state) so the decision can't get
  // stuck once the active language arrives: `null` = still deciding (don't flash the library),
  // `false` = proceed, `true` = show the chooser.
  const hasExplicitLibraryChoice =
    Boolean(searchParams.get('targetLanguage')) || hasStoredStaticLibraryTargetLanguage()
  const needsLanguageChoice: boolean | null =
    languagePicked || hasExplicitLibraryChoice ? false : !languageReady ? null : !activeLanguage

  const handleChooseLanguage = (languageValue: string) => {
    persistStaticLibraryTargetLanguage(languageValue)
    setTargetLanguage(languageValue)
    setLanguagePicked(true)
  }
  const thematicCategoryGroups = getPublicCategoryGroups()
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) => category.staticWordLevels?.length),
    }))
    .filter((group) => group.categories.length > 0)
  const [importedCategorySlugs, setImportedCategorySlugs] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Only persist once we've resolved to proceed into the library (false) — not while deciding
    // (null) or showing the first-visit chooser (true), so we never store a silent default.
    if (needsLanguageChoice !== false) return
    persistStaticLibraryTargetLanguage(targetLanguage)
  }, [targetLanguage, needsLanguageChoice])

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

  if (needsLanguageChoice === null) {
    // Still deciding whether to prompt (waiting for the active language to settle) — render a
    // bare page rather than flashing the library and then swapping in the chooser.
    return <section className={styles.page} aria-busy="true" />
  }

  if (needsLanguageChoice) {
    return (
      <section className={styles.page}>
        <LibraryLanguageChooser onChoose={handleChooseLanguage} />
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('categories.title')}</h1>
        </div>
        <label className={styles.libraryLanguageSelect}>
          <select
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            aria-label={t('categories.targetLanguageLabel')}
          >
            {STATIC_CATEGORY_TARGET_LANGUAGES.map((language) => (
              <option key={language.code} value={language.value}>{language.label}</option>
            ))}
          </select>
        </label>
      </header>

      <section className={styles.categorySection} aria-labelledby="thematic-static-categories">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="thematic-static-categories" className={styles.sectionTitle}>
              {t('categories.thematicSectionTitle')}
            </h2>
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
                  return (
                    <Link
                      key={category.id ?? category.name}
                      to={`${thematicCategoryHref(category)}${staticLibraryRouteSuffix(targetLanguage)}`}
                      className={`${styles.tile} ${styles.thematicTile}`}
                      aria-label={t('categories.openCategory', { title: t(category.labelKey) })}
                    >
                      <div className={styles.hero}>
                        <ThematicCategoryHero category={category} />
                      </div>
                      <div className={styles.tileBody}>
                        <h2 className={styles.tileTitle}>
                          <span className={styles.tileEmoji} aria-hidden="true">{category.emoji}</span>
                          <span>{t(category.labelKey)}</span>
                        </h2>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className={`${styles.categorySection} ${styles.basicVocabularySection}`} aria-labelledby="legacy-curriculum-categories">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="legacy-curriculum-categories" className={styles.sectionTitle}>
              {t('categories.legacySectionTitle')}
            </h2>
          </div>
        </div>

        <div className={styles.basicGrid}>
          {categories.map((category) => {
            const isImported = importedCategorySlugs.has(category.slug)
            return (
              <Link
                key={category.slug}
                to={`/categories/${category.slug}`}
                className={`${styles.tile} ${styles.basicTile}`}
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
    </section>
  )
}
