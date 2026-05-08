import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, RefreshCw, Wand2, X, Zap } from 'lucide-react'
import PillButton from '../shared/PillButton'
import { CATEGORY_GROUPS } from '@/data/categories'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import {
  PREMIUM_QUICK_MODE_OPTIONS,
  type PremiumQuickMode,
  type WizardState,
  type WizardAction,
} from '../useWizardState'

// NOTE: suggest-words endpoint requires the local orchestrator (port 8090).
// In production (Vercel), this feature is non-functional until the endpoint
// is deployed as a serverless function. See cloud migration plan.

type Mode = 'idle' | 'picking' | 'loading' | 'preview'

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

interface CategoryPickerProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  onConfirm: () => void
  onSwitchToManual: () => void
  onQuickGenerate?: (words: string[]) => void
  onPremiumQuickModeGenerate?: (words: string[], mode: PremiumQuickMode) => void
}

export default function CategoryPicker({
  state,
  dispatch,
  onConfirm,
  onSwitchToManual,
  onQuickGenerate,
  onPremiumQuickModeGenerate,
}: CategoryPickerProps) {
  const { profile } = useAuth()
  const { activeLanguage } = useLanguage()
  const { tp } = useTranslation()
  const [mode, setMode] = useState<Mode>('idle')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [suggestCount, setSuggestCount] = useState<number>(10)
  const [slots, setSlots] = useState<Slot[]>([])
  const [error, setError] = useState<string | null>(null)

  const targetLanguage = state.language || activeLanguage
  const baseLanguage = profile?.base_language || 'English'
  const visibleSlots = slots.slice(0, suggestCount)
  const displaySlots = [
    ...visibleSlots,
    ...Array.from({ length: Math.max(0, suggestCount - visibleSlots.length) }, (): Slot => ({
      kind: 'empty',
      word: '',
      translation: '',
    })),
  ]

  async function fetchSuggestions(category: string) {
    const requestedCount = suggestCount
    if (!targetLanguage) {
      setError('Pick a target language first')
      return
    }
    setError(null)
    setActiveCategory(category)
    setMode('loading')
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error('Your session expired. Please sign in again.')
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
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null) as { detail?: string; error?: string } | null
        throw new Error(errorBody?.detail || errorBody?.error || `HTTP ${res.status}`)
      }
      const suggestionData = (await res.json()) as { words: Array<{ word: string; translation: string }> }
      const next: Slot[] = (suggestionData.words || []).slice(0, requestedCount).map((w) => ({
        kind: 'filled',
        word: w.word,
        translation: w.translation,
      }))
      if (next.length === 0) throw new Error('No suggestions returned')
      setSlots(next)
      setMode('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch suggestions')
      setMode('picking')
    }
  }

  function removeSlot(index: number) {
    setSlots(prev => prev.filter((_, i) => i !== index))
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

  function handleGenerateDeck() {
    const words = displaySlots
      .map((s) => s.word.trim())
      .filter((w) => w.length > 0)
    if (words.length === 0) {
      setError('Add at least one word')
      return
    }
    dispatch({ type: 'SET_WORDS', words })
    onConfirm()
  }

  function renderCountSlider(disabled = false) {
    return (
      <div className="word-count-slider-wrap mb-6">
        <label htmlFor="suggest-count-slider" className="text-sm text-foreground/70">
          {tp('generate.wordCountSlider', suggestCount)}
        </label>
        <input
          id="suggest-count-slider"
          type="range"
          min={1}
          max={20}
          step={1}
          value={suggestCount}
          disabled={disabled}
          onChange={(e) => {
            const nextCount = Number(e.target.value)
            setSuggestCount(nextCount)
            setSlots(prev => prev.slice(0, nextCount))
          }}
          className="word-count-slider"
        />
        <div className="word-count-slider-endpoints" aria-hidden="true">
          <span>1</span>
          <span>Max 20</span>
        </div>
      </div>
    )
  }

  if (mode === 'idle') {
    return (
      <div className="flex w-full flex-col items-center gap-3 pb-2">
        <button
          type="button"
          className="words-choice-button"
          onClick={onSwitchToManual}
        >
          Type Your Own
        </button>
        <button
          type="button"
          className="words-choice-button"
          onClick={() => setMode('picking')}
        >
          Pick a Category
        </button>
      </div>
    )
  }

  if (mode === 'picking') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-5"
      >
        {renderCountSlider()}
        <div className="w-full space-y-5 rounded-xl border border-border bg-card/40 p-4">
          {CATEGORY_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center"><span aria-hidden="true">{group.emoji}</span> {group.label}</h3>
              <div className={`flex flex-wrap gap-2 ${group.categories.length === 1 ? 'justify-center' : ''}`}>
                {group.categories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => fetchSuggestions(cat.name)}
                    className="inline-flex items-center gap-1 rounded-full px-4 py-2 min-h-[44px] text-sm text-foreground/80 bg-card border border-border hover:bg-accent hover:border-accent transition"
                  >
                    <span aria-hidden="true">{cat.emoji}</span> {cat.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={() => setMode('idle')}
          className="text-xs text-muted-foreground hover:text-foreground/70 transition"
        >
          ← Back
        </button>
      </motion.div>
    )
  }

  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
        {renderCountSlider(true)}
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Finding words…</p>
      </div>
    )
  }

  // preview
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{activeCategory}</p>
        <button
          type="button"
          onClick={() => setMode('picking')}
          className="text-xs text-muted-foreground hover:text-foreground/70 transition"
        >
          Change category
        </button>
      </div>

      {renderCountSlider()}

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
                    placeholder="word"
                    value={slot.word}
                    onChange={(e) => updateEmptySlot(i, 'word', e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground outline-none py-1"
                  />
                  <input
                    type="text"
                    placeholder="translation"
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
                aria-label="Remove word"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-col items-center gap-3 pt-2">
        {onQuickGenerate && state.productLane === 'card_premium' ? (
          <div className="grid w-full grid-cols-2 gap-2">
            <CategoryQuickButton
              label="Quick Generate"
              primary
              onClick={() => submitQuickChoice()}
            />
            {PREMIUM_QUICK_MODE_OPTIONS.map((option) => (
              <CategoryQuickButton
                key={option.value}
                label={option.label}
                onClick={() => submitQuickChoice(option.value)}
              />
            ))}
            <CategoryQuickButton label="Customize" onClick={handleGenerateDeck} />
          </div>
        ) : (
          <>
            {onQuickGenerate && (
              <PillButton
                glow
                onClick={() => submitQuickChoice()}
              >
                <Zap className="h-4 w-4" />
                Quick Generate
              </PillButton>
            )}
            <PillButton variant={onQuickGenerate ? 'secondary' : undefined} glow={!onQuickGenerate} onClick={handleGenerateDeck}>
              <Wand2 className="h-4 w-4" />
              Customize
            </PillButton>
          </>
        )}
        <PillButton
          variant="secondary"
          onClick={() => activeCategory && fetchSuggestions(activeCategory)}
        >
          <RefreshCw className="h-4 w-4" />
          Regenerate All
        </PillButton>
      </div>
    </motion.div>
  )

  function submitQuickChoice(mode?: PremiumQuickMode) {
    const words = displaySlots.map((s) => s.word.trim()).filter((w) => w.length > 0)
    if (words.length === 0) {
      setError('Add at least one word')
      return
    }
    dispatch({ type: 'SET_WORDS', words })
    dispatch({ type: 'CHOOSE_PATH', path: 'quick' })
    if (mode) {
      onPremiumQuickModeGenerate?.(words, mode)
    } else {
      onQuickGenerate?.(words)
    }
  }
}

function CategoryQuickButton({
  label,
  onClick,
  primary = false,
}: {
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[46px] rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
        primary
          ? 'border-[var(--pg-accent-teal)] bg-[rgba(13,226,195,0.12)] text-[var(--pg-accent-teal)]'
          : 'border-border/60 bg-card/50 text-foreground/85 hover:border-[var(--pg-accent-teal)]/40 hover:text-foreground'
      }`}
    >
      {primary ? <Zap className="mr-1.5 inline h-4 w-4" /> : null}
      {label}
    </button>
  )
}
