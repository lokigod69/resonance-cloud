import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Wand2 } from 'lucide-react'
import { GlassInput, WordChips, type GlassInputHandle } from '../shared/GlassInput'
import PillButton from '../shared/PillButton'
import PremiumQuickModePanel from '../shared/PremiumQuickModePanel'
import { MAX_WORDS } from '../wizardData'
import {
  type PremiumQuickMode,
  type WizardState,
  type WizardAction,
} from '../useWizardState'
import CategoryPicker from './CategoryPicker'
import { usePlan } from '@/hooks/usePlan'
import { useTranslation } from '@/hooks/useTranslation'
import { wordsEqual } from '@/lib/wordEquality'
import type { SelectedCategoryVocabularyItem } from '@/data/categories'

interface WordsStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  onQuickGenerate: (words: string[]) => void
  onPremiumQuickModeGenerate?: (words: string[], mode: PremiumQuickMode) => void
  onCustomize?: () => void
}

export default function WordsStep({
  state,
  dispatch,
  onQuickGenerate,
  onPremiumQuickModeGenerate,
  onCustomize,
}: WordsStepProps) {
  const { t, tp } = useTranslation()
  const { isPremiumUi } = usePlan()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const glassInputRef = useRef<GlassInputHandle>(null)
  const wordCount = state.words.length
  const isFull = wordCount >= MAX_WORDS

  function handleLock(word: string) {
    if (state.words.some((w) => wordsEqual(w, word))) {
      setError(t('generate.wordExists'))
      return
    }
    if (isFull) {
      setError(t('generate.maxWords', { max: MAX_WORDS }))
      return
    }
    setError(null)
    dispatch({ type: 'ADD_WORD', word })
  }

  // Synchronously flush GlassInput's typed-but-unlocked value into the list.
  // dispatch(ADD_WORD) is async and may not have landed before the caller
  // reads state.words, so we prepend the flushed value explicitly.
  function collectWords(): string[] {
    const flushed = glassInputRef.current?.flush() ?? null
    return flushed
      ? [...state.words.filter((w) => !wordsEqual(w, flushed)), flushed]
      : [...state.words]
  }

  function handleMergeWords(words: string[]) {
    // Flush any half-typed input first so it isn't silently dropped when the
    // user reaches for a category mid-typing. Order: flushed first, then
    // suggestions — the reducer's dedup walks the list in iteration order.
    const flushed = glassInputRef.current?.flush() ?? null
    const incoming = flushed ? [flushed, ...words] : words
    dispatch({ type: 'ADD_WORDS', words: incoming })
  }

  function handleMergeVocabularyItems(items: SelectedCategoryVocabularyItem[]) {
    const flushed = glassInputRef.current?.flush() ?? null
    if (flushed) dispatch({ type: 'ADD_WORD', word: flushed })
    dispatch({ type: 'ADD_VOCABULARY_ITEMS', items })
  }

  function handleQuickGenerate() {
    const allWords = collectWords()
    dispatch({ type: 'CHOOSE_PATH', path: 'quick' })
    onQuickGenerate(allWords)
  }

  function handleModeGenerate(mode: PremiumQuickMode) {
    const allWords = collectWords()
    dispatch({ type: 'CHOOSE_PATH', path: 'quick' })
    onPremiumQuickModeGenerate?.(allWords, mode)
  }

  function handleCustomize() {
    glassInputRef.current?.flush()
    dispatch({ type: 'CHOOSE_PATH', path: 'custom' })
    onCustomize?.()
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center px-2 pt-6 sm:min-h-[60vh] sm:px-4 sm:pt-8">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold tracking-tight text-foreground mb-2"
      >
        {t('generate.words.addTitle')}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-sm text-muted-foreground mb-6"
      >
        {tp('generate.wordCountSlider', wordCount)}
      </motion.p>

      <div className={`w-full min-w-0 space-y-5 ${state.productLane === 'card_premium' ? 'max-w-xl' : 'max-w-md'}`}>
        {/* Categories section - collapsed until the user wants generated suggestions */}
        <CategoryPicker
          state={state}
          initialCategoryId={searchParams.get('category')}
          initialCategoryLevel={Number(searchParams.get('level')) || null}
          onMergeWords={handleMergeWords}
          onMergeVocabularyItems={handleMergeVocabularyItems}
          onTargetLanguageChange={(language) => dispatch({ type: 'PRESELECT_LANGUAGE', language })}
        />

        {/* Always-visible input */}
        {!isFull && (
          <GlassInput
            ref={glassInputRef}
            onLock={handleLock}
            autoFocus
            placeholder={t('generate.words.unifiedPlaceholder')}
          />
        )}

        {/* Locked words - generated category words land here and stay editable */}
        {wordCount > 0 && (
          <WordChips
            words={state.words}
            vocabularyItems={state.selectedVocabularyItems}
            onRemove={(i) => dispatch({ type: 'REMOVE_WORD', index: i })}
          />
        )}

        {/* Lock error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-400 text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Action buttons — appear after first word */}
        <AnimatePresence>
          {wordCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col items-center gap-3 pt-6"
            >
              {state.productLane === 'card_premium' && isPremiumUi ? (
                <PremiumQuickModePanel
                  onQuickGenerate={handleQuickGenerate}
                  onModeGenerate={handleModeGenerate}
                  onCustomize={handleCustomize}
                />
              ) : (
                <>
                  <PillButton
                    glow
                    onClick={handleQuickGenerate}
                    className="px-10 py-4 text-base font-semibold"
                  >
                    <Sparkles className="h-5 w-5" />
                    {t('generate.primaryGenerate')}
                  </PillButton>
                  {state.productLane === 'card_standard' && (
                    <PillButton
                      variant="secondary"
                      onClick={handleCustomize}
                      className="px-6 py-2.5 text-xs font-medium"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      {t('generate.customize')}
                    </PillButton>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
