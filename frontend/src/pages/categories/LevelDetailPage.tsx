import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Music, Volume2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/components/Toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import CardDetailModal, { type CardDetailModel } from '@/components/common/CardDetailModal'
import CurriculumEntryDetailModal from '@/components/categories/CurriculumEntryDetailModal'
import CurriculumEntryImage from '@/components/categories/CurriculumEntryImage'
import { LevelGenerateSongModal } from '@/components/song-generation/LevelGenerateSongModal'
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
  buildStaticCategoryLevelDeckName,
  importCurriculumLevel,
  importStaticCategoryLevel,
} from '@/lib/curriculumDeckBridge'
import { useActiveCurriculumImageSet } from '@/lib/curriculumImageSetConfig'
import { useStaticThematicAudio } from '@/hooks/useStaticThematicAudio'
import {
  STATIC_ANIMALS_ELISA_RAW_PROFILE_KEY,
  STATIC_ANIMALS_SERAFINA_RAW_PROFILE_KEY,
  STATIC_THEMATIC_CEB_YUMI_RAW_PROFILE_KEY,
  getStaticThematicVoiceProfileKeys,
} from '@/lib/staticThematicAudio'
import {
  getPublicCategoryGroups,
  getStaticCategorySelectedItems,
  resolveStaticCategoryTargetLanguageCode,
  type Category as StaticCategory,
  type CategoryGroup,
  type SelectedCategoryVocabularyItem,
} from '@/data/categories'
import {
  getAdjacentStaticLevelNumbers,
  getLocalizedStaticLevelLabel,
  readStaticLibraryTargetLanguage,
  resolveVisibleStaticLanguage,
  shouldShowStaticHelperTerm,
  staticLibraryRouteSuffix,
} from '@/lib/staticLibraryLanguage'
import { generatedCategoryEntryImagePath } from '@/lib/generatedCategoryImages'
import { curriculumEntryImagePath } from '@/lib/curriculumImagePath'
import { useCategoryScrollReset } from './useCategoryScrollReset'
import styles from './Categories.module.css'

function LevelNavigation({
  previousLevelHref,
  nextLevelHref,
  t,
}: {
  previousLevelHref?: string | null
  nextLevelHref?: string | null
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (!previousLevelHref && !nextLevelHref) return null

  return (
    <nav className={styles.levelNavBar} aria-label="Level navigation">
      {previousLevelHref ? (
        <Link to={previousLevelHref} className={styles.levelNavPill}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t('categories.previousLevel')}</span>
        </Link>
      ) : null}
      {nextLevelHref ? (
        <Link to={nextLevelHref} className={styles.levelNavPill}>
          <span>{t('categories.nextLevel')}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  )
}

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

export default function LevelDetailPage() {
  const { categorySlug, levelNumber } = useParams<{ categorySlug: string; levelNumber: string }>()
  const [searchParams] = useSearchParams()
  const { profile, user } = useAuth()
  const { activeLanguage } = useLanguage()
  const { t, tp, locale } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [selectedEntry, setSelectedEntry] = useState<CurriculumEntry | null>(null)
  const [importedDeckId, setImportedDeckId] = useState<string | null>(null)
  const [deckLookupLoading, setDeckLookupLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const category = getCurriculumCategoryBySlug(categorySlug)
  const level = getCurriculumLevel(categorySlug, levelNumber)
  const staticCategory = category ? null : getStaticCategoryById(categorySlug)
  const targetLanguage = readStaticLibraryTargetLanguage(searchParams.get('targetLanguage'), activeLanguage)
  const helperLanguage = resolveVisibleStaticLanguage(profile?.base_language, 'German')
  useCategoryScrollReset()
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
    return (
      <StaticLevelDetail
        category={staticCategory.category}
        levelNumber={levelNumber}
        targetLanguage={targetLanguage}
        helperLanguage={helperLanguage}
        locale={locale}
        t={t}
        tp={tp}
      />
    )
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
  const currentLevelIndex = category.levels.findIndex((item) => item.level === level.level)
  const previousLevel = currentLevelIndex > 0 ? category.levels[currentLevelIndex - 1] : null
  const nextLevel = currentLevelIndex >= 0 && currentLevelIndex < category.levels.length - 1
    ? category.levels[currentLevelIndex + 1]
    : null
  const previousLevelHref = previousLevel ? `/categories/${category.slug}/level/${previousLevel.level}` : null
  const nextLevelHref = nextLevel ? `/categories/${category.slug}/level/${nextLevel.level}` : null

  return (
    <section className={styles.page}>
      <div className={styles.levelTopBar}>
        <Link to={`/categories/${category.slug}`} className={styles.backLink}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('categories.backToCategory')}
        </Link>
        <LevelNavigation previousLevelHref={previousLevelHref} nextLevelHref={nextLevelHref} t={t} />
      </div>

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

function StaticLevelDetail({
  category,
  levelNumber,
  targetLanguage,
  helperLanguage,
  locale,
  t,
  tp,
}: {
  category: StaticCategory
  levelNumber?: string
  targetLanguage: string
  helperLanguage: string
  locale: ReturnType<typeof useTranslation>['locale']
  t: ReturnType<typeof useTranslation>['t']
  tp: ReturnType<typeof useTranslation>['tp']
}) {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [selectedItem, setSelectedItem] = useState<SelectedCategoryVocabularyItem | null>(null)
  const [importedDeckId, setImportedDeckId] = useState<string | null>(null)
  const [deckLookupLoading, setDeckLookupLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [levelSongModalOpen, setLevelSongModalOpen] = useState(false)
  const [levelSongDeckId, setLevelSongDeckId] = useState<string | null>(null)
  const [levelSongImporting, setLevelSongImporting] = useState(false)
  const parsedLevel = Number(levelNumber)
  const level = Number.isInteger(parsedLevel)
    ? category.staticWordLevels?.find((item) => item.level === parsedLevel)
    : null
  const targetLanguageCode = resolveStaticCategoryTargetLanguageCode(targetLanguage)
  const selectedItems = useMemo(
    () => level
      ? getStaticCategorySelectedItems(
        category,
        level.words.length,
        level.level,
        targetLanguage,
        helperLanguage,
        { dedupeTargetTerms: false },
      )
      : [],
    [category, helperLanguage, level, targetLanguage],
  )
  const levelSongWords = useMemo(
    () => selectedItems.map((item) => ({ target: item.targetTerm, gloss: item.helperTerm })),
    [selectedItems],
  )
  const conceptIds = useMemo(() => selectedItems.map((item) => item.conceptId), [selectedItems])
  const categorySlug = category.id ?? category.name
  const staticVoiceProfileKeys = useMemo(
    () => getStaticThematicVoiceProfileKeys({ targetLanguageCode, categorySlug }),
    [categorySlug, targetLanguageCode],
  )
  const staticAudioEnabled = Boolean(level)
    && (targetLanguageCode === 'ceb'
      || targetLanguageCode === 'id'
      || (targetLanguageCode === 'en' && categorySlug === 'animals'))
  const staticAudio = useStaticThematicAudio({
    enabled: staticAudioEnabled,
    targetLanguageCode,
    categorySlug,
    levelNumber: level?.level ?? 0,
    conceptIds,
    voiceProfileKeys: staticVoiceProfileKeys,
  })

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets imported static deck state when route/user keys change before async lookup
    setDeckLookupLoading(true)
    setImportedDeckId(null)
    setLevelSongDeckId(null)

    if (!user?.id || !level) {
      setDeckLookupLoading(false)
      return () => {
        cancelled = true
      }
    }

    void getImportedCurriculumDeck(supabase, user.id, categorySlug, level.level, targetLanguage)
      .then((row) => {
        if (cancelled) return
        setImportedDeckId(row?.id ?? null)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[categories] static imported-deck lookup failed', error)
      })
      .finally(() => {
        if (cancelled) return
        setDeckLookupLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [categorySlug, level, targetLanguage, user?.id])

  const ensureStaticLevelImported = useCallback(async () => {
    if (!level) {
      throw new Error('Static category level not found')
    }
    if (!user?.id) {
      throw new Error('Authentication required')
    }

    if (importedDeckId) {
      return importedDeckId
    }

    const existing = await getImportedCurriculumDeck(supabase, user.id, categorySlug, level.level, targetLanguage)
    if (existing?.id) {
      setImportedDeckId(existing.id)
      return existing.id
    }

    const deckName = buildStaticCategoryLevelDeckName(t(category.labelKey), level.level)
    const deckId = await importStaticCategoryLevel(
      supabase,
      category,
      level.level,
      targetLanguage,
      helperLanguage,
      deckName,
    )
    setImportedDeckId(deckId)
    return deckId
  }, [category, categorySlug, helperLanguage, importedDeckId, level, t, targetLanguage, user?.id])

  const handleStaticImport = useCallback(async () => {
    if (!level) return

    setImporting(true)
    try {
      const deckId = await ensureStaticLevelImported()
      navigate(`/deck/${deckId}`)
    } catch (error) {
      console.error('[categories] static import failed', error)
      toast(t('categories.importFailed'), 'error')
      setImporting(false)
    }
  }, [ensureStaticLevelImported, level, navigate, t, toast])

  const handleGenerateLevelSong = useCallback(async () => {
    if (!level || levelSongImporting) return

    setLevelSongImporting(true)
    try {
      const deckId = await ensureStaticLevelImported()
      setLevelSongDeckId(deckId)
      setLevelSongModalOpen(true)
    } catch (error) {
      console.error('[categories] static import before level song failed', error)
      toast(t('categories.importFailed'), 'error')
    } finally {
      setLevelSongImporting(false)
    }
  }, [ensureStaticLevelImported, level, levelSongImporting, t, toast])

  if (!level) {
    return (
      <section className={styles.page}>
        <div className={styles.notFound}>
          <h1 className={styles.title}>{t('categories.levelNotFound.title')}</h1>
          <p className={styles.subtitle}>{t('categories.levelNotFound.body')}</p>
          <Link to={`/categories/${categorySlug}${staticLibraryRouteSuffix(targetLanguage)}`} className={styles.backLink}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('categories.backToCategory')}
          </Link>
        </div>
      </section>
    )
  }

  const importDisabled = importing || deckLookupLoading
  const importLabel = importing
    ? t('categories.importing')
    : importedDeckId
      ? t('categories.openDeck')
      : t('categories.importLevel')
  const localizedLevelLabel = getLocalizedStaticLevelLabel(level, locale)
  const staticLevels = category.staticWordLevels ?? []
  const { previousLevelNumber, nextLevelNumber } = getAdjacentStaticLevelNumbers(staticLevels, level.level)
  const previousLevelHref = previousLevelNumber
    ? `/categories/${categorySlug}/level/${previousLevelNumber}${staticLibraryRouteSuffix(targetLanguage)}`
    : null
  const nextLevelHref = nextLevelNumber
    ? `/categories/${categorySlug}/level/${nextLevelNumber}${staticLibraryRouteSuffix(targetLanguage)}`
    : null

  return (
    <section className={styles.page}>
      <div className={styles.levelTopBar}>
        <Link to={`/categories/${categorySlug}${staticLibraryRouteSuffix(targetLanguage)}`} className={styles.backLink}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('categories.backToCategory')}
        </Link>
        <LevelNavigation previousLevelHref={previousLevelHref} nextLevelHref={nextLevelHref} t={t} />
      </div>

      <header className={styles.detailHero}>
        <div className={`${styles.detailEmoji} ${styles.staticDetailEmoji}`} aria-hidden="true">{category.emoji}</div>
        <div>
          <p className={styles.eyebrow}>
            {t('categories.levelLabel', { number: level.level })} · {tp('categories.entryCount', selectedItems.length)}
          </p>
          <h1 className={`${styles.title} ${styles.levelHeroTitle}`}>{localizedLevelLabel}</h1>
          <p className={styles.subtitle}>{t(category.labelKey)}</p>
        </div>
      </header>

      <div className={styles.staticImportPanel}>
        <button
          type="button"
          className={`${styles.studyAction} ${styles.staticImportAction}`}
          onClick={handleStaticImport}
          disabled={importDisabled}
          aria-busy={importing || undefined}
        >
          {importing ? (
            <span className={styles.studyActionSpinner} aria-hidden="true" />
          ) : (
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{importLabel}</span>
        </button>
        <button
          type="button"
          className={`${styles.studyAction} ${styles.staticImportAction}`}
          onClick={handleGenerateLevelSong}
          disabled={levelSongImporting || deckLookupLoading}
          aria-busy={levelSongImporting || undefined}
        >
          {levelSongImporting ? (
            <span className={styles.studyActionSpinner} aria-hidden="true" />
          ) : (
            <Music className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{t('categories.generateLevelSong')}</span>
        </button>
      </div>

      <div className={styles.staticWordGrid}>
        {selectedItems.map((item) => (
          <article
            key={item.conceptId}
            className={styles.staticWordCard}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedItem(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSelectedItem(item)
              }
            }}
          >
            <StaticWordCard
              item={item}
              category={category}
              hasElisaAudio={staticAudio.hasAudio(item.conceptId, STATIC_ANIMALS_ELISA_RAW_PROFILE_KEY)}
              hasSerafinaAudio={staticAudio.hasAudio(item.conceptId, STATIC_ANIMALS_SERAFINA_RAW_PROFILE_KEY)}
              hasCebuanoAudio={staticAudio.hasAudio(item.conceptId, STATIC_THEMATIC_CEB_YUMI_RAW_PROFILE_KEY)}
              hasIndonesianAudio={targetLanguageCode === 'id' && staticAudio.hasAudio(item.conceptId)}
              showMissingAudioMarker={
                import.meta.env.DEV
                && staticAudioEnabled
              }
              onPlayIndonesian={() => void staticAudio.play(item.conceptId)}
              onPlayCebuano={() => void staticAudio.play(item.conceptId, STATIC_THEMATIC_CEB_YUMI_RAW_PROFILE_KEY)}
              onPlayElisa={() => void staticAudio.play(item.conceptId, STATIC_ANIMALS_ELISA_RAW_PROFILE_KEY)}
              onPlaySerafina={() => void staticAudio.play(item.conceptId, STATIC_ANIMALS_SERAFINA_RAW_PROFILE_KEY)}
            />
          </article>
        ))}
      </div>
      <StaticCategoryEntryDetailModal
        item={selectedItem}
        category={category}
        hasAudio={selectedItem
          ? staticAudio.hasAudio(
            selectedItem.conceptId,
            targetLanguageCode === 'ceb' ? STATIC_THEMATIC_CEB_YUMI_RAW_PROFILE_KEY : undefined,
          )
          : false}
        onPlayAudio={selectedItem
          ? () => void staticAudio.play(
            selectedItem.conceptId,
            targetLanguageCode === 'ceb' ? STATIC_THEMATIC_CEB_YUMI_RAW_PROFILE_KEY : undefined,
          )
          : undefined}
        onClose={() => setSelectedItem(null)}
        t={t}
      />
      {levelSongDeckId ? (
        <LevelGenerateSongModal
          open={levelSongModalOpen}
          onOpenChange={(open) => {
            setLevelSongModalOpen(open)
            if (!open) setLevelSongDeckId(null)
          }}
          categorySlug={categorySlug}
          levelNumber={level.level}
          targetLanguage={targetLanguage}
          deckId={levelSongDeckId}
          displayTitle={localizedLevelLabel}
          wordList={levelSongWords}
          credits={profile?.credits ?? 0}
          onSubmitted={() => {
            void refreshProfile()
          }}
        />
      ) : null}
    </section>
  )
}

function StaticWordCard({
  item,
  category,
  hasElisaAudio,
  hasSerafinaAudio,
  hasCebuanoAudio,
  hasIndonesianAudio,
  showMissingAudioMarker,
  onPlayCebuano,
  onPlayIndonesian,
  onPlayElisa,
  onPlaySerafina,
}: {
  item: SelectedCategoryVocabularyItem
  category: StaticCategory
  hasElisaAudio: boolean
  hasSerafinaAudio: boolean
  hasCebuanoAudio: boolean
  hasIndonesianAudio: boolean
  showMissingAudioMarker: boolean
  onPlayCebuano: () => void
  onPlayIndonesian: () => void
  onPlayElisa: () => void
  onPlaySerafina: () => void
}) {
  return (
    <>
      <div className={styles.staticWordMedia}>
            <CurriculumEntryImage
              languageIso="en"
              categorySlug={category.id ?? category.name}
              term={item.translations.en.term}
              fallbackEmoji={category.emoji}
              alt=""
              className={styles.entryImage}
            />
        {hasCebuanoAudio ? (
          <button
            type="button"
            className={`${styles.staticAudioButton} ${styles.staticAudioButtonRight}`}
            onClick={(event) => {
              event.stopPropagation()
              onPlayCebuano()
            }}
            aria-label={`Play pronunciation for ${item.targetTerm}`}
            title={`Play ${item.targetTerm}`}
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        {hasIndonesianAudio ? (
          <button
            type="button"
            className={`${styles.staticAudioButton} ${styles.staticAudioButtonRight}`}
            onClick={(event) => {
              event.stopPropagation()
              onPlayIndonesian()
            }}
            aria-label={`Play pronunciation for ${item.targetTerm}`}
            title={`Play ${item.targetTerm}`}
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        {hasSerafinaAudio ? (
          <button
            type="button"
            className={`${styles.staticAudioButton} ${styles.staticAudioButtonLeft}`}
            onClick={(event) => {
              event.stopPropagation()
              onPlaySerafina()
            }}
            aria-label={`Play Serafina pronunciation for ${item.targetTerm}`}
            title={`Play Serafina ${item.targetTerm}`}
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            <span className={styles.staticAudioButtonBadge}>S</span>
          </button>
        ) : null}
        {hasElisaAudio ? (
          <button
            type="button"
            className={`${styles.staticAudioButton} ${styles.staticAudioButtonRight}`}
            onClick={(event) => {
              event.stopPropagation()
              onPlayElisa()
            }}
            aria-label={`Play Elisa pronunciation for ${item.targetTerm}`}
            title={`Play Elisa ${item.targetTerm}`}
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            <span className={styles.staticAudioButtonBadge}>E</span>
          </button>
        ) : null}
        {!hasCebuanoAudio && !hasIndonesianAudio && !hasElisaAudio && !hasSerafinaAudio && showMissingAudioMarker ? (
          <span className={styles.staticAudioMissing} title="Missing static audio">TTS</span>
        ) : null}
      </div>
      <div className={styles.staticWordCopy}>
        <h2 className={styles.term}>{item.targetTerm}</h2>
        {shouldShowStaticHelperTerm(item) ? (
          <p className={styles.staticWordTranslation}>{item.helperTerm}</p>
        ) : null}
      </div>
    </>
  )
}

function StaticCategoryEntryDetailModal({
  item,
  category,
  hasAudio,
  onPlayAudio,
  onClose,
  t,
}: {
  item: SelectedCategoryVocabularyItem | null
  category: StaticCategory
  hasAudio: boolean
  onPlayAudio?: () => void
  onClose: () => void
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (!item) return <CardDetailModal model={null} onClose={onClose} />

  const categorySlug = category.id ?? category.name
  const englishTerm = item.translations.en.term
  const imageSrc = generatedCategoryEntryImagePath('en', categorySlug, englishTerm)
    ?? curriculumEntryImagePath('en', categorySlug, englishTerm)

  const model: CardDetailModel = {
    title: item.targetTerm,
    image: {
      src: imageSrc,
      alt: t('categories.modal.imageAlt', { term: item.targetTerm }),
      fallbackEmoji: category.emoji,
      aspect: '16:9',
    },
    primaryText: shouldShowStaticHelperTerm(item) ? item.helperTerm : undefined,
    primaryAction: hasAudio && onPlayAudio ? {
      label: 'Play',
      ariaLabel: `Play pronunciation for ${item.targetTerm}`,
      onClick: onPlayAudio,
      icon: <Volume2 className="h-4 w-4" aria-hidden="true" />,
    } : undefined,
    sections: [],
  }

  return <CardDetailModal model={model} onClose={onClose} />
}
