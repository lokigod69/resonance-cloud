import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Wand2 } from 'lucide-react'
import { GlassInput, WordChips } from '../shared/GlassInput'
import PillButton from '../shared/PillButton'
import { MAX_WORDS } from '../wizardData'
import type { WizardState, WizardAction } from '../useWizardState'

interface WordsStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  onQuickGenerate: () => void
}

export default function WordsStep({ state, dispatch, onQuickGenerate }: WordsStepProps) {
  const [error, setError] = useState<string | null>(null)
  const wordCount = state.words.length
  const isFull = wordCount >= MAX_WORDS

  function handleLock(word: string) {
    if (state.words.some((w) => w.toLowerCase() === word.toLowerCase())) {
      setError('Duplicate word')
      return
    }
    if (isFull) {
      setError(`Maximum ${MAX_WORDS} words per deck`)
      return
    }
    setError(null)
    dispatch({ type: 'ADD_WORD', word })
  }

  function handleQuickGenerate() {
    dispatch({ type: 'CHOOSE_PATH', path: 'quick' })
    onQuickGenerate()
  }

  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 pt-8">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold tracking-tight text-white/90 mb-2"
      >
        Add your words
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-sm text-white/40 mb-8"
      >
        {wordCount} of {MAX_WORDS}
      </motion.p>

      <div className="w-full max-w-md space-y-5">
        {/* Word input */}
        {!isFull && <GlassInput onLock={handleLock} autoFocus placeholder="Type a word and press Enter" />}

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
              <PillButton glow onClick={handleQuickGenerate}>
                <Sparkles className="h-4 w-4" />
                Quick Generate
              </PillButton>
              <PillButton
                variant="secondary"
                onClick={() => dispatch({ type: 'CHOOSE_PATH', path: 'custom' })}
              >
                <Wand2 className="h-4 w-4" />
                Customize
              </PillButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
