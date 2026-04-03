import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import { LANGUAGES } from '../wizardData'
import type { WizardState, WizardAction, ExistingDeck } from '../useWizardState'

interface LanguageStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  existingDeck?: ExistingDeck | null
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function LanguageStep({ state, dispatch, existingDeck }: LanguageStepProps) {
  // When adding to existing deck, show locked language and auto-advance
  if (existingDeck) {
    const lang = LANGUAGES.find((l) => l.value === existingDeck.target_language)
    const deckName = existingDeck.name || `${existingDeck.target_language} Deck`

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <p className="text-sm text-white/50">Adding cards to</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white/90">
            {deckName}
          </h2>
          {lang && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-3xl">{lang.flag}</span>
              <span className="text-lg font-medium text-white/80">{lang.label}</span>
            </div>
          )}
          <p className="text-xs text-white/30 mt-2">Language is locked to match the deck.</p>
          <button
            onClick={() => dispatch({ type: 'GO_TO_STEP', step: 2 })}
            className="mt-6 px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Continue
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold tracking-tight text-white/90 mb-8"
      >
        What language are you learning?
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg w-full"
      >
        {LANGUAGES.map((lang) => (
          <motion.div key={lang.value} variants={item}>
            <GlassCard
              selected={state.language === lang.value}
              onClick={() => dispatch({ type: 'SET_LANGUAGE', language: lang.value })}
              className="flex flex-col items-center gap-2 py-6"
              hoverStyle={{ borderColor: lang.color, boxShadow: `0 0 20px ${lang.color}20` }}
            >
              <span className="text-3xl">{lang.flag}</span>
              <span className="text-sm font-medium text-white/80">{lang.label}</span>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
