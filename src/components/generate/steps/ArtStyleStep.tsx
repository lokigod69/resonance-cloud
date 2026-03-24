import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import { ART_STYLE_GROUPS } from '../wizardData'
import type { WizardState, WizardAction } from '../useWizardState'

interface ArtStyleStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  onNext: () => void
}

const groupVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function ArtStyleStep({ state, dispatch, onNext }: ArtStyleStepProps) {
  function select(value: string | null) {
    dispatch({ type: 'SET_ART_STYLE', style: value })
    setTimeout(onNext, 400)
  }

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-12">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold tracking-tight text-white/90 mb-8"
      >
        Pick an art style
      </motion.h2>

      {/* "Normal" card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl mb-6"
      >
        <GlassCard
          selected={state.artStyle === null}
          onClick={() => select(null)}
          className="w-full text-center py-4"
        >
          <span className="text-sm font-medium text-white/80">Normal</span>
          <span className="block text-xs text-white/40 mt-1">Let the AI decide</span>
        </GlassCard>
      </motion.div>

      {/* Grouped style grid */}
      <div className="w-full max-w-3xl space-y-6">
        {ART_STYLE_GROUPS.map((group, gi) => (
          <div key={group.group}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: gi * 0.08 }}
              className="text-xs text-white/30 uppercase tracking-wider mb-3"
            >
              {group.group}
            </motion.p>
            <motion.div
              variants={groupVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5"
            >
              {group.styles.map((style) => (
                <motion.div key={style.value} variants={cardVariants}>
                  <GlassCard
                    selected={state.artStyle === style.value}
                    onClick={() => select(style.value)}
                    className="flex items-center justify-center py-3 px-2 text-center"
                  >
                    <span className="text-xs font-medium text-white/80">{style.label}</span>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Skip link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        type="button"
        onClick={() => select(null)}
        className="mt-8 text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        Skip — defaults to Normal
      </motion.button>
    </div>
  )
}
