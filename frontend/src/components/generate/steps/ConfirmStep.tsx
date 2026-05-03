import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import PillButton from '../shared/PillButton'
import { computeCreditCost, type WizardState, type WizardAction } from '../useWizardState'

interface ConfirmStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  onGenerate: () => void
  submitting: boolean
  error: string | null
  existingDeck?: boolean
}

export default function ConfirmStep({ state, dispatch, onGenerate, submitting, error, existingDeck }: ConfirmStepProps) {
  const creditCost = computeCreditCost(state.deckType, state.words.length, state.cardImageModel)
  const deckTypeLabel =
    state.deckType === 'card'
      ? state.cardImageModel === 'gpt_image_2' ? 'GPT Image-2 Card' : 'Standard Card'
      : 'Video'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold tracking-tight text-white/90 mb-8"
      >
        Ready to create
      </motion.h2>

      {/* Deck name input */}
      {!existingDeck && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mb-6"
        >
          <input
            type="text"
            value={state.deckName}
            onChange={(e) => dispatch({ type: 'SET_DECK_NAME', name: e.target.value })}
            placeholder="Name your deck..."
            maxLength={50}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-sm placeholder-white/30 outline-none focus:border-white/30 transition-colors"
          />
        </motion.div>
      )}

      {/* Credits */}
      <p className="text-sm text-white/50 mb-4">
        {creditCost} credit{creditCost !== 1 ? 's' : ''} will be used
      </p>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 glass rounded-xl p-3 border border-red-400/30 bg-red-400/10 w-full max-w-sm"
        >
          <p className="text-xs text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Generate button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <PillButton glow onClick={onGenerate} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate {state.words.length} {deckTypeLabel}{state.words.length !== 1 ? 's' : ''}
            </>
          )}
        </PillButton>
      </motion.div>
    </div>
  )
}
