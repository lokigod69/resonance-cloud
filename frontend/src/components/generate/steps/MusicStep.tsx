import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import { GENRES } from '../wizardData'
import type { WizardState, WizardAction } from '../useWizardState'

interface MusicStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  onNext: () => void
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function MusicStep({ state, dispatch, onNext }: MusicStepProps) {
  function select(value: string | null) {
    dispatch({ type: 'SET_GENRE', genre: value })
    setTimeout(onNext, 400)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold tracking-tight text-white/90 mb-8"
      >
        Set the mood
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-wrap justify-center gap-3 max-w-lg"
      >
        {GENRES.map((genre) => (
          <motion.div key={genre.value} variants={item}>
            <GlassCard
              selected={(state.genre ?? 'auto') === genre.value}
              onClick={() => select(genre.value === 'auto' ? null : genre.value)}
              className="px-5 py-3"
            >
              <span className="text-sm font-medium text-white/80">{genre.label}</span>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Skip link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        type="button"
        onClick={() => select(null)}
        className="mt-8 text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        Skip — defaults to Auto
      </motion.button>
    </div>
  )
}
