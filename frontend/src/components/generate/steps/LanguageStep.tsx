import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import { LANGUAGES } from '../wizardData'
import type { WizardState, WizardAction } from '../useWizardState'

interface LanguageStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function LanguageStep({ state, dispatch }: LanguageStepProps) {
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
