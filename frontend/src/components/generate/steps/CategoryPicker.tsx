import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2, Sparkles } from 'lucide-react'
import PillButton from '../shared/PillButton'
import {
  PINNED_BOTTOM_CATEGORIES,
  STATIC_CATEGORY_TARGET_LANGUAGES,
  getPublicCategoryGroups,
  getStaticCategorySelectedItems,
  type Category,
  type SelectedCategoryVocabularyItem,
} from '@/data/categories'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import type { WizardState } from '../useWizardState'

const MIN_CATEGORY_WORD_COUNT = 5
const DEFAULT_CATEGORY_WORD_COUNT = 5
const MAX_CATEGORY_WORD_COUNT = 10

type ExpansionStatus = 'idle' | 'loading' | 'error'

interface CategoryPickerProps {
  state: WizardState
  onMergeWords: (words: string[]) => void
  onMergeVocabularyItems?: (items: SelectedCategoryVocabularyItem[]) => void
  onTargetLanguageChange?: (language: string) => void
}

type SuggestWordsResponse = {
  words?: Array<{ word?: unknown; translation?: unknown } | string>
}

function extractSuggestedWords(data: SuggestWordsResponse, requestedCount: number): string[] {
  if (!Array.isArray(data.words)) return []
  return data.words
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim()
      return typeof entry.word === 'string' ? entry.word.trim() : ''
    })
    .filter((word) => word.length > 0)
    .slice(0, requestedCount)
}

function resolveVisibleLanguage(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  const matched = STATIC_CATEGORY_TARGET_LANGUAGES.find((language) => (
    language.value.toLowerCase() === normalized
    || language.code === normalized
    || language.label.toLowerCase() === normalized
    || (language.code === 'ceb' && normalized === 'cebuano')
  ))
  return matched?.value ?? fallback
}

export default function CategoryPicker({
  state,
  onMergeWords,
  onMergeVocabularyItems,
  onTargetLanguageChange,
}: CategoryPickerProps) {
  const { profile } = useAuth()
  const { activeLanguage } = useLanguage()
  const { t } = useTranslation()

  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [selectedStaticLevel, setSelectedStaticLevel] = useState<number | null>(null)
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<string>(
    resolveVisibleLanguage(state.language || activeLanguage, 'English'),
  )
  const [selectedHelperLanguage, setSelectedHelperLanguage] = useState<string>(
    resolveVisibleLanguage(profile?.base_language, 'German'),
  )
  const [helperLanguageTouched, setHelperLanguageTouched] = useState(false)
  const [suggestCount, setSuggestCount] = useState<number>(DEFAULT_CATEGORY_WORD_COUNT)
  const [status, setStatus] = useState<ExpansionStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Fetch sequence number so a stale resolve (from a previous category the
  // user already switched away from) cannot overwrite the active expansion.
  const fetchSeq = useRef(0)

  const targetLanguage = selectedTargetLanguage || state.language || activeLanguage || 'English'
  const helperLanguage = selectedHelperLanguage || profile?.base_language || 'German'

  useEffect(() => {
    if (helperLanguageTouched) return
    setSelectedHelperLanguage(resolveVisibleLanguage(profile?.base_language, 'German'))
  }, [helperLanguageTouched, profile?.base_language])

  function resetExpansion() {
    fetchSeq.current += 1
    setIsOpen(false)
    setActiveCategory(null)
    setSelectedStaticLevel(null)
    setSuggestCount(DEFAULT_CATEGORY_WORD_COUNT)
    setStatus('idle')
    setError(null)
  }

  function toggleDrawer() {
    setIsOpen((current) => {
      if (current) {
        fetchSeq.current += 1
        setActiveCategory(null)
        setSelectedStaticLevel(null)
        setSuggestCount(DEFAULT_CATEGORY_WORD_COUNT)
        setStatus('idle')
        setError(null)
      }
      return !current
    })
  }

  function handleTileClick(category: Category) {
    fetchSeq.current += 1
    setActiveCategory(category)
    setSelectedStaticLevel(category.staticWordLevels?.[0]?.level ?? null)
    setSuggestCount(DEFAULT_CATEGORY_WORD_COUNT)
    setStatus('idle')
    setError(null)
  }

  function handleTargetLanguageChange(language: string) {
    setSelectedTargetLanguage(language)
    onTargetLanguageChange?.(language)
  }

  function handleHelperLanguageChange(language: string) {
    setHelperLanguageTouched(true)
    setSelectedHelperLanguage(language)
  }

  function renderLanguagePairControls() {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="static-category-target-language" className="mb-2 block text-sm font-semibold text-foreground">
            {t('generate.words.targetVocabularyLanguageLabel')}
          </label>
          <select
            id="static-category-target-language"
            value={targetLanguage}
            disabled={status === 'loading'}
            onChange={(event) => handleTargetLanguageChange(event.target.value)}
            className="min-h-[40px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
          >
            {STATIC_CATEGORY_TARGET_LANGUAGES.map((language) => (
              <option key={language.code} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="static-category-helper-language" className="mb-2 block text-sm font-semibold text-foreground">
            {t('generate.words.helperVocabularyLanguageLabel')}
          </label>
          <select
            id="static-category-helper-language"
            value={helperLanguage}
            disabled={status === 'loading'}
            onChange={(event) => handleHelperLanguageChange(event.target.value)}
            className="min-h-[40px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
          >
            {STATIC_CATEGORY_TARGET_LANGUAGES.map((language) => (
              <option key={language.code} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  async function fetchSuggestions(category: Category, count: number) {
    const requestedCount = count
    if (!targetLanguage) {
      setError(t('generate.words.pickTargetLanguageFirst'))
      setStatus('error')
      return
    }

    const staticItems = getStaticCategorySelectedItems(category, requestedCount, selectedStaticLevel ?? undefined, targetLanguage, helperLanguage)
    if (staticItems.length > 0) {
      onMergeVocabularyItems?.(staticItems)
      if (!onMergeVocabularyItems) onMergeWords(staticItems.map((item) => item.targetTerm))
      resetExpansion()
      return
    }

    const seq = ++fetchSeq.current
    setError(null)
    setStatus('loading')
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error(t('generate.words.sessionExpired'))
      }

      const res = await fetch('/api/suggest-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          // category is the API contract value
          category: category.name,
          target_language: targetLanguage,
          base_language: helperLanguage,
          count: requestedCount,
        }),
      })
      if (seq !== fetchSeq.current) return
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null) as { detail?: string; error?: string } | null
        throw new Error(errorBody?.detail || errorBody?.error || `HTTP ${res.status}`)
      }
      const suggestionData = (await res.json()) as SuggestWordsResponse
      if (seq !== fetchSeq.current) return
      const suggestedWords = extractSuggestedWords(suggestionData, requestedCount)
      if (suggestedWords.length === 0) throw new Error(t('generate.words.noSuggestionsReturned'))
      onMergeWords(suggestedWords)
      resetExpansion()
    } catch (e) {
      if (seq !== fetchSeq.current) return
      setError(e instanceof Error ? e.message : t('generate.words.fetchSuggestionsFailed'))
      setStatus('error')
    }
  }

  function renderTile(cat: Category) {
    const isActive = activeCategory?.name === cat.name
    return (
      <button
        key={cat.name}
        type="button"
        onClick={() => handleTileClick(cat)}
        aria-pressed={isActive}
        className={`inline-flex min-h-[44px] items-center gap-1 rounded-full border px-4 py-2 text-sm transition ${
          isActive
            ? 'border-accent bg-accent text-foreground shadow-[0_0_18px_rgba(138,167,199,0.22)]'
            : 'border-border bg-card text-foreground/80 hover:border-accent hover:bg-accent'
        }`}
      >
        <span aria-hidden="true">{cat.emoji}</span> {t(cat.labelKey)}
      </button>
    )
  }

  const selectedLabel = activeCategory ? t(activeCategory.labelKey) : null
  const publicCategoryGroups = getPublicCategoryGroups()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3"
    >
      <button
        type="button"
        onClick={toggleDrawer}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 text-left transition hover:border-accent hover:bg-card"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t('generate.words.categoryDrawerTitle')}
          </span>
          <span className="mt-1 block text-sm text-foreground/80">
            {selectedLabel ?? t('generate.words.categoryDrawerHint')}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="category-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="w-full space-y-5 rounded-xl border border-border bg-card/40 p-4">
              {renderLanguagePairControls()}

              {activeCategory && selectedLabel && (
                <div className="rounded-2xl border border-accent/50 bg-accent/10 p-4 shadow-[0_0_28px_rgba(138,167,199,0.14)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t('generate.words.selectedCategoryLabel')}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        <span aria-hidden="true">{activeCategory.emoji}</span> {selectedLabel}
                      </p>
                    </div>
                    <PillButton
                      glow
                      onClick={() => { void fetchSuggestions(activeCategory, suggestCount) }}
                      disabled={status === 'loading'}
                      className="px-5 py-3 text-sm font-semibold"
                    >
                      {status === 'loading' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {t('generate.words.addCategoryWords', { count: suggestCount })}
                    </PillButton>
                  </div>

                  <div className="word-count-slider-wrap mt-5">
                    {activeCategory.staticWordLevels && activeCategory.staticWordLevels.length > 1 && (
                      <div className="mb-5">
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          {t('generate.words.categoryLevelLabel')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {activeCategory.staticWordLevels.map((level) => (
                            <button
                              key={level.level}
                              type="button"
                              onClick={() => setSelectedStaticLevel(level.level)}
                              aria-pressed={selectedStaticLevel === level.level}
                              disabled={status === 'loading'}
                              className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                selectedStaticLevel === level.level
                                  ? 'border-accent bg-accent text-foreground'
                                  : 'border-border bg-card text-foreground/75 hover:border-accent hover:bg-accent/60'
                              }`}
                            >
                              {t('categories.levelLabel', { number: level.level })}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <label htmlFor="suggest-count-slider" className="text-sm font-semibold text-foreground">
                      {t('generate.words.categoryAmountLabel', { count: suggestCount })}
                    </label>
                    <input
                      id="suggest-count-slider"
                      type="range"
                      min={MIN_CATEGORY_WORD_COUNT}
                      max={MAX_CATEGORY_WORD_COUNT}
                      step={1}
                      value={suggestCount}
                      disabled={status === 'loading'}
                      onChange={(e) => setSuggestCount(Number(e.target.value))}
                      className="word-count-slider"
                    />
                    <div className="word-count-slider-endpoints" aria-hidden="true">
                      <span>{MIN_CATEGORY_WORD_COUNT}</span>
                      <span>{t('generate.words.maxCount', { max: MAX_CATEGORY_WORD_COUNT })}</span>
                    </div>
                  </div>

                  {status === 'loading' && (
                    <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('generate.words.findingWords')}
                    </p>
                  )}
                  {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                </div>
              )}

              {publicCategoryGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="mb-3 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <span aria-hidden="true">{group.emoji}</span> {t(group.groupKey)}
                  </h3>
                  <div className={`flex flex-wrap gap-2 ${group.categories.length === 1 ? 'justify-center' : ''}`}>
                    {group.categories.map((cat) => renderTile(cat))}
                  </div>
                </div>
              ))}

              {PINNED_BOTTOM_CATEGORIES.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {PINNED_BOTTOM_CATEGORIES.map((cat) => renderTile(cat))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
