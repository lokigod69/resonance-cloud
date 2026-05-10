import { useState, useRef } from 'react'
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
import { useTranslation } from '@/hooks/useTranslation'

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
  const [error, setError] = useState<string | null>(null)
  const glassInputRef = useRef<GlassInputHandle>(null)
  const wordCount = state.words.length
  const isFull = wordCount >= MAX_WORDS
  // Picker gated to initial entry (wordCount === 0). This prevents CategoryPicker's
  // SET_WORDS dispatch from wiping words the user already typed manually — once
  // any manual words exist, the picker is no longer reachable for this step.
  const [inputMode, setInputMode] = useState<'picker' | 'manual'>(
    wordCount === 0 ? 'picker' : 'manual'
  )

  function handleLock(word: string) {
    if (state.words.some((w) => w.toLowerCase() === word.toLowerCase())) {
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

  function collectWords(): string[] {
    const flushed = glassInputRef.current?.flush() ?? null
    // Collect the definitive word list synchronously — state.words may not
    // yet include the flushed word because dispatch(ADD_WORD) is async.
    return flushed
      ? [...state.words.filter(w => w.toLowerCase() !== flushed.toLowerCase()), flushed]
      : [...state.words]
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
        className="text-sm text-muted-foreground mb-8"
      >
        {tp('generate.wordCountSlider', wordCount)}
      </motion.p>

      <div className={`w-full min-w-0 space-y-5 ${state.productLane === 'card_premium' ? 'max-w-xl' : 'max-w-md'}`}>
        {inputMode === 'picker' && (
          <CategoryPicker
            state={state}
            dispatch={dispatch}
            onConfirm={() => {
              dispatch({ type: 'CHOOSE_PATH', path: 'custom' })
              onCustomize?.()
            }}
            onSwitchToManual={() => setInputMode('manual')}
            onQuickGenerate={onQuickGenerate}
            onPremiumQuickModeGenerate={onPremiumQuickModeGenerate}
          />
        )}

        {/* Back-to-picker control — placed above the input so users see it
            before typing. Only available before any manual words are locked. */}
        {inputMode === 'manual' && wordCount === 0 && (
          <div className="flex w-full justify-start">
            <button
              type="button"
              onClick={() => setInputMode('picker')}
              className="words-back-button"
            >
              {t('common.back')}
            </button>
          </div>
        )}

        {/* Word input */}
        {inputMode === 'manual' && !isFull && (
          <GlassInput ref={glassInputRef} onLock={handleLock} autoFocus />
        )}

        {/* Locked words */}
        {wordCount > 0 && (
          <WordChips
            words={state.words}
            onRemove={(i) => dispatch({ type: 'REMOVE_WORD', index: i })}
          />
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-400"
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
              {state.productLane === 'card_premium' ? (
                <PremiumQuickModePanel
                  onQuickGenerate={handleQuickGenerate}
                  onModeGenerate={handleModeGenerate}
                  onCustomize={() => {
                    glassInputRef.current?.flush()
                    dispatch({ type: 'CHOOSE_PATH', path: 'custom' })
                    onCustomize?.()
                  }}
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
                  <PillButton
                    variant="secondary"
                    onClick={() => {
                      glassInputRef.current?.flush()
                      dispatch({ type: 'CHOOSE_PATH', path: 'custom' })
                      onCustomize?.()
                    }}
                    className="px-6 py-2.5 text-xs font-medium"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {t('generate.customize')}
                  </PillButton>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
