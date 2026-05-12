import { Fragment, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, RefreshCw, Plus, X } from 'lucide-react'
import PillButton from '../shared/PillButton'
import { CATEGORY_GROUPS, PINNED_BOTTOM_CATEGORIES, type Category } from '@/data/categories'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { wordsEqual } from '@/lib/wordEquality'
import { MAX_WORDS } from '../wizardData'
import type { WizardState } from '../useWizardState'

interface FilledSlot {
  kind: 'filled'
  word: string
  translation: string
}
interface EmptySlot {
  kind: 'empty'
  word: string
  translation: string
}
type Slot = FilledSlot | EmptySlot

type ExpansionStatus = 'idle' | 'loading' | 'preview' | 'error'

interface CategoryPickerProps {
  state: WizardState
  onMergeWords: (words: string[]) => void
}

export default function CategoryPicker({ state, onMergeWords }: CategoryPickerProps) {
  const { profile } = useAuth()
  const { activeLanguage } = useLanguage()
  const { t, tp } = useTranslation()

  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null)
  const [suggestCount, setSuggestCount] = useState<number>(10)
  const [slots, setSlots] = useState<Slot[]>([])
  const [status, setStatus] = useState<ExpansionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Fetch sequence number so a stale resolve (from a previous category the
  // user already switched away from) cannot overwrite the active expansion.
  const fetchSeq = useRef(0)

  const targetLanguage = state.language || activeLanguage
  const baseLanguage = profile?.base_language || 'English'

  const visibleSlots = slots.slice(0, suggestCount)
  const displaySlots: Slot[] = [
    ...visibleSlots,
    ...Array.from({ length: Math.max(0, suggestCount - visibleSlots.length) }, (): Slot => ({
      kind: 'empty',
      word: '',
      translation: '',
    })),
  ]

  function resetExpansion() {
    setActiveCategoryName(null)
    setSlots([])
    setStatus('idle')
    setError(null)
    setNotice(null)
  }

  function handleTileClick(category: Category) {
    if (activeCategoryName === category.name) {
      // Toggle to close — discard local slot state for this category.
      resetExpansion()
      return
    }
    setSuggestCount(10) // Per-expansion default; not persistent across switches.
    setSlots([])
    setError(null)
    setNotice(null)
    setActiveCategoryName(category.name)
    fetchSuggestions(category.name)
  }

  async function fetchSuggestions(category: string) {
    const requestedCount = suggestCount
    if (!targetLanguage) {
      setError(t('generate.words.pickTargetLanguageFirst'))
      setStatus('error')
      return
    }
    const seq = ++fetchSeq.current
    setError(null)
    setNotice(null)
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
          category,
          target_language: targetLanguage,
          base_language: baseLanguage,
          count: requestedCount,
        }),
      })
      // Stale-fetch guard: if the user switched categories mid-flight, drop the result.
      if (seq !== fetchSeq.current) return
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null) as { detail?: string; error?: string } | null
        throw new Error(errorBody?.detail || errorBody?.error || `HTTP ${res.status}`)
      }
      const suggestionData = (await res.json()) as { words: Array<{ word: string; translation: string }> }
      if (seq !== fetchSeq.current) return
      const next: Slot[] = (suggestionData.words || []).slice(0, requestedCount).map((w) => ({
        kind: 'filled',
        word: w.word,
        translation: w.translation,
      }))
      if (next.length === 0) throw new Error(t('generate.words.noSuggestionsReturned'))
      setSlots(next)
      setStatus('preview')
    } catch (e) {
      if (seq !== fetchSeq.current) return
      setError(e instanceof Error ? e.message : t('generate.words.fetchSuggestionsFailed'))
      setStatus('error')
    }
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }

  function updateEmptySlot(index: number, field: 'word' | 'translation', value: string) {
    setSlots((prev) => {
      const next = [...prev]
      while (next.length <= index) {
        next.push({ kind: 'empty', word: '', translation: '' })
      }
      const current = next[index]
      if (current.kind === 'empty') {
        next[index] = { ...current, [field]: value }
      }
      return next
    })
  }

  function handleAddToList() {
    const extracted = displaySlots
      .map((s) => s.word.trim())
      .filter((w) => w.length > 0)
    if (extracted.length === 0) {
      setError(t('generate.words.addAtLeastOne'))
      return
    }
    const novel = extracted.filter(
      (incoming) => !state.words.some((existing) => wordsEqual(existing, incoming)),
    )
    if (novel.length === 0) {
      setNotice(t('generate.words.allAlreadyAdded'))
      return
    }
    onMergeWords(extracted)
    resetExpansion()
  }

  function renderTile(cat: Category) {
    const isActive = activeCategoryName === cat.name
    return (
      <button
        key={cat.name}
        type="button"
        onClick={() => handleTileClick(cat)}
        aria-expanded={isActive}
        className={`inline-flex items-center gap-1 rounded-full px-4 py-2 min-h-[44px] text-sm transition ${
          isActive
            ? 'bg-accent text-foreground border border-accent'
            : 'bg-card text-foreground/80 border border-border hover:bg-accent hover:border-accent'
        }`}
      >
        <span aria-hidden="true">{cat.emoji}</span> {t(cat.labelKey)}
      </button>
    )
  }

  function renderExpansion() {
    return (
      <motion.div
        key={`expansion-${activeCategoryName}`}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.18 }}
        className="w-full overflow-hidden"
      >
        <div className="w-full space-y-4 rounded-xl border border-border bg-card/40 p-4 mt-3">
          <div className="word-count-slider-wrap">
            <label htmlFor="suggest-count-slider" className="text-sm text-foreground/70">
              {tp('generate.wordCountSlider', suggestCount)}
            </label>
            <input
              id="suggest-count-slider"
              type="range"
              min={1}
              max={MAX_WORDS}
              step={1}
              value={suggestCount}
              disabled={status === 'loading'}
              onChange={(e) => {
                const nextCount = Number(e.target.value)
                setSuggestCount(nextCount)
                setSlots((prev) => prev.slice(0, nextCount))
              }}
              className="word-count-slider"
            />
            <div className="word-count-slider-endpoints" aria-hidden="true">
              <span>1</span>
              <span>{t('generate.words.maxCount', { max: MAX_WORDS })}</span>
            </div>
          </div>

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">{t('generate.words.findingWords')}</p>
            </div>
          )}

          {(status === 'preview' || status === 'error') && (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {displaySlots.map((slot, i) => (
                  <motion.li
                    key={i}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 min-h-[52px] rounded-xl bg-card border border-border px-3 py-2"
                  >
                    {slot.kind === 'filled' ? (
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-sm text-foreground/90 break-words">{slot.word}</span>
                        <span className="text-xs text-muted-foreground break-words">{slot.translation}</span>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <input
                          type="text"
                          placeholder={t('generate.words.wordPlaceholder')}
                          value={slot.word}
                          onChange={(e) => updateEmptySlot(i, 'word', e.target.value)}
                          className="flex-1 min-w-0 bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground outline-none py-1"
                        />
                        <input
                          type="text"
                          placeholder={t('generate.words.translationPlaceholder')}
                          value={slot.translation}
                          onChange={(e) => updateEmptySlot(i, 'translation', e.target.value)}
                          className="flex-1 sm:w-28 sm:flex-none min-w-0 bg-transparent text-xs text-foreground/60 placeholder:text-muted-foreground outline-none sm:text-right py-1"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                      aria-label={t('generate.words.removeWordAriaLabel')}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {notice && <p className="text-xs text-foreground/70">{notice}</p>}

          {(status === 'preview' || status === 'error') && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <PillButton
                glow
                onClick={handleAddToList}
                className="px-8 py-3 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                {t('generate.words.addToList')}
              </PillButton>
              <PillButton
                variant="secondary"
                onClick={() => activeCategoryName && fetchSuggestions(activeCategoryName)}
                className="px-5 py-2 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('generate.words.regenerateAll')}
              </PillButton>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // Render: each group's tile row, with the expansion inserted directly under
  // the group whose tile is currently active. Pinned-bottom categories render
  // as a free-floating row below all groups.
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-5"
    >
      <div className="w-full space-y-5 rounded-xl border border-border bg-card/40 p-4">
        {CATEGORY_GROUPS.map((group) => {
          const activeInGroup = group.categories.some((c) => c.name === activeCategoryName)
          return (
            <div key={group.label}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">
                <span aria-hidden="true">{group.emoji}</span> {t(group.groupKey)}
              </h3>
              <div className={`flex flex-wrap gap-2 ${group.categories.length === 1 ? 'justify-center' : ''}`}>
                {group.categories.map((cat) => renderTile(cat))}
              </div>
              <AnimatePresence initial={false}>
                {activeInGroup && <Fragment key="exp">{renderExpansion()}</Fragment>}
              </AnimatePresence>
            </div>
          )
        })}

        {PINNED_BOTTOM_CATEGORIES.length > 0 && (
          <div>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {PINNED_BOTTOM_CATEGORIES.map((cat) => renderTile(cat))}
            </div>
            <AnimatePresence initial={false}>
              {PINNED_BOTTOM_CATEGORIES.some((c) => c.name === activeCategoryName) && (
                <Fragment key="exp-pinned">{renderExpansion()}</Fragment>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
