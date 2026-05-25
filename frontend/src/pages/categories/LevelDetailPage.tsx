import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Check, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/components/Toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
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
import {
  getImportedCurriculumDeck,
  importCurriculumLevel,
} from '@/lib/curriculumDeckBridge'
import { useActiveCurriculumImageSet } from '@/lib/curriculumImageSetConfig'
import {
  STATIC_CATEGORY_TARGET_LANGUAGES,
  formatSelectedCategoryVocabularyLabel,
  getPublicCategoryGroups,
  getStaticCategorySelectedItems,
  type Category as StaticCategory,
  type CategoryGroup,
} from '@/data/categories'
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

function resolveVisibleLanguage(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  const matched = STATIC_CATEGORY_TARGET_LANGUAGES.find((language) => (
    language.value.toLowerCase() === normalized
    || language.code === normalized
    || language.label.toLowerCase() === normalized
    || language.name.toLowerCase() === normalized
    || language.nativeName.toLowerCase() === normalized
  ))
  return matched?.value ?? fallback
}

export default function LevelDetailPage() {
  const { categorySlug, levelNumber } = useParams<{ categorySlug: string; levelNumber: string }>()
  const { profile, user } = useAuth()
  const { activeLanguage } = useLanguage()
  const { t, tp } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [selectedEntry, setSelectedEntry] = useState<CurriculumEntry | null>(null)
  const [importedDeckId, setImportedDeckId] = useState<string | null>(null)
  const [deckLookupLoading, setDeckLookupLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const category = getCurriculumCategoryBySlug(categorySlug)
  const level = getCurriculumLevel(categorySlug, levelNumber)
  const staticCategory = category ? null : getStaticCategoryById(categorySlug)
  const [targetLanguage, setTargetLanguage] = useState(resolveVisibleLanguage(activeLanguage, 'English'))
  const [helperLanguage, setHelperLanguage] = useState(resolveVisibleLanguage(profile?.base_language, 'German'))
  const baseLanguageIso = profileBaseLanguageToIso(profile?.base_language)
  const { activeSetKey } = useActiveCurriculumImageSet(
    category?.data.target_language ?? 'en',
    category?.slug ?? null,
  )
  const enrichment = getCurriculumEnrichmentBySlug(categorySlug)
  const enrichmentByTerm = useMemo(() => {
    const result = new Map<string, CurriculumEnrichmentEntry>()
    const enrichmentLevel = enrichment?.levels.find((item) => item.level === level?.level)
    for (const item of enrichmentLevel?.entries ?? []) {
      result.set(item.term, item)
    }
    return result
  }, [enrichment, level?.level])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading/state when key (user/category/level) changes before async fetch; canonical fetch-on-key pattern
    setDeckLookupLoading(true)
    setImportedDeckId(null)

    if (!user?.id || !category || !level) {
      setDeckLookupLoading(false)
      return () => {
        cancelled = true
      }
    }

    void getImportedCurriculumDeck(supabase, user.id, category.slug, level.level)
      .then((row) => {
        if (cancelled) return
        setImportedDeckId(row?.id ?? null)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[categories] imported-deck lookup failed', error)
      })
      .finally(() => {
        if (cancelled) return
        setDeckLookupLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, category, level])

  const returnTo = useMemo(() => {
    if (!category || !level) return null
    return `/categories/${category.slug}/${level.level}`
  }, [category, level])

  const launchCanvas = useCallback(
    (deckId: string) => {
      if (!returnTo) return
      const params = new URLSearchParams({ deck: deckId, returnTo })
      navigate(`/study/canvas?${params.toString()}`)
    },
    [navigate, returnTo],
  )

  const handleStartLearning = useCallback(async () => {
    if (!category || !level || !returnTo) return

    if (importedDeckId) {
      launchCanvas(importedDeckId)
      return
    }

    setImporting(true)
    try {
      const deckId = await importCurriculumLevel(
        supabase,
        category,
        level,
        baseLanguageIso,
        getLevelTitle(level),
      )
      setImportedDeckId(deckId)
      launchCanvas(deckId)
    } catch (error) {
      console.error('[categories] curriculum import failed', error)
      toast(t('categories.importFailed'), 'error')
      setImporting(false)
    }
  }, [baseLanguageIso, category, importedDeckId, launchCanvas, level, returnTo, t, toast])

  if (staticCategory) {
    return renderStaticLevelDetail({
      category: staticCategory.category,
      group: staticCategory.group,
      levelNumber,
      targetLanguage,
      helperLanguage,
      setTargetLanguage,
      setHelperLanguage,
      t,
      tp,
    })
  }

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

  const studyActionDisabled = importing || deckLookupLoading
  const studyActionLabel = importing
    ? t('categories.importing')
    : importedDeckId
      ? t('categories.continueLearning')
      : t('categories.startLearning')

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
            {importedDeckId ? (
              <>
                {' · '}
                <span className={styles.tileImportedBadge}>
                  <Check className="h-3 w-3" aria-hidden="true" />
                  {t('categories.imported')}
                </span>
              </>
            ) : null}
          </p>
          <h1 className={styles.title}>{getLevelTitle(level)}</h1>
          <p className={styles.subtitle}>{category.title}</p>
        </div>
        <div className={styles.heroAction}>
          <button
            type="button"
            className={styles.studyAction}
            onClick={handleStartLearning}
            disabled={studyActionDisabled}
            aria-busy={importing || undefined}
          >
            {importing ? (
              <span className={styles.studyActionSpinner} aria-hidden="true" />
            ) : (
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{studyActionLabel}</span>
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
                activeImageSet={activeSetKey}
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
        activeImageSet={activeSetKey}
        onClose={() => setSelectedEntry(null)}
      />
    </section>
  )
}

function renderStaticLevelDetail({
  category,
  group,
  levelNumber,
  targetLanguage,
  helperLanguage,
  setTargetLanguage,
  setHelperLanguage,
  t,
  tp,
}: {
  category: StaticCategory
  group: CategoryGroup
  levelNumber?: string
  targetLanguage: string
  helperLanguage: string
  setTargetLanguage: (language: string) => void
  setHelperLanguage: (language: string) => void
  t: ReturnType<typeof useTranslation>['t']
  tp: ReturnType<typeof useTranslation>['tp']
}) {
  const parsedLevel = Number(levelNumber)
  const level = Number.isInteger(parsedLevel)
    ? category.staticWordLevels?.find((item) => item.level === parsedLevel)
    : null

  if (!level) {
    return (
      <section className={styles.page}>
        <div className={styles.notFound}>
          <h1 className={styles.title}>{t('categories.levelNotFound.title')}</h1>
          <p className={styles.subtitle}>{t('categories.levelNotFound.body')}</p>
          <Link to={`/categories/${category.id ?? category.name}`} className={styles.backLink}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('categories.backToCategory')}
          </Link>
        </div>
      </section>
    )
  }

  const selectedItems = getStaticCategorySelectedItems(category, level.words.length, level.level, targetLanguage, helperLanguage)
  const generateHref = `/generate?category=${encodeURIComponent(category.id ?? category.name)}&level=${level.level}`

  return (
    <section className={styles.page}>
      <Link to={`/categories/${category.id ?? category.name}`} className={styles.backLink}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('categories.backToCategory')}
      </Link>

      <header className={styles.detailHero}>
        <div className={`${styles.detailEmoji} ${styles.staticDetailEmoji}`} aria-hidden="true">{category.emoji}</div>
        <div>
          <p className={styles.eyebrow}>
            {t(group.groupKey)} · {t('categories.levelLabel', { number: level.level })} · {tp('categories.entryCount', selectedItems.length)}
          </p>
          <h1 className={styles.title}>{t(category.labelKey)}</h1>
          <p className={styles.subtitle}>{level.label}</p>
          <p className={styles.rowDescription}>{t('categories.noStaticStudyDeck')}</p>
        </div>
        <div className={styles.heroAction}>
          <Link to={generateHref} className={styles.studyAction}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('categories.generateDeckFromLevel')}
          </Link>
        </div>
      </header>

      <div className={styles.languagePairPanel}>
        <label>
          <span>{t('generate.words.targetVocabularyLanguageLabel')}</span>
          <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
            {STATIC_CATEGORY_TARGET_LANGUAGES.map((language) => (
              <option key={language.code} value={language.value}>{language.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('generate.words.helperVocabularyLanguageLabel')}</span>
          <select value={helperLanguage} onChange={(event) => setHelperLanguage(event.target.value)}>
            {STATIC_CATEGORY_TARGET_LANGUAGES.map((language) => (
              <option key={language.code} value={language.value}>{language.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.staticWordGrid}>
        {selectedItems.map((item) => (
          <article key={item.conceptId} className={styles.staticWordCard}>
            <CurriculumEntryImage
              languageIso="en"
              categorySlug={category.id ?? category.name}
              term={item.translations.en.term}
              fallbackEmoji={category.emoji}
              alt=""
              className={styles.entryImage}
            />
            <div>
              <h2 className={styles.term}>{item.targetTerm}</h2>
              {item.helperTerm && item.helperTerm !== item.targetTerm ? (
                <p className={styles.gloss}>{item.helperTerm}</p>
              ) : null}
            </div>
            <div className={styles.enrichment}>
              <span><strong>{t('categories.modal.partOfSpeech')}:</strong> {item.part_of_speech}</span>
              <span><strong>{t('categories.staticSense')}:</strong> {item.sense}</span>
              <span>{formatSelectedCategoryVocabularyLabel(item)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
