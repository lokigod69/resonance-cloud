import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import PillButton from '../shared/PillButton'
import { VIBES } from '../wizardData'
import type { WizardState, WizardAction } from '../useWizardState'

interface VibeStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  onNext: () => void
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function VibeStep({ state, dispatch, onNext }: VibeStepProps) {
  const [movieInput, setMovieInput] = useState(state.movieTitle ?? '')
  const showMovieInput = state.vibe === 'specific_movie'

  function selectVibe(value: string) {
    dispatch({ type: 'SET_VIBE', vibe: value })
    // Auto-advance for non-movie vibes
    if (value !== 'specific_movie') {
      if (value === 'movie') {
        dispatch({ type: 'SET_MOVIE_TITLE', title: '' })
      }
      setTimeout(onNext, 400)
    }
  }

  function confirmMovie() {
    dispatch({ type: 'SET_MOVIE_TITLE', title: movieInput })
    onNext()
  }

  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 pt-8">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold tracking-tight text-white/90 mb-8"
      >
        Choose a vibe
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-lg w-full"
      >
        {VIBES.map((vibe) => (
          <motion.div key={vibe.value} variants={item}>
            <GlassCard
              selected={state.vibe === vibe.value}
              onClick={() => selectVibe(vibe.value)}
              className="flex flex-col gap-1.5 py-5"
            >
              <span className="text-sm font-medium text-white/90">{vibe.label}</span>
              <span className="text-xs text-white/40">{vibe.description}</span>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Movie title input for "Specific Movie" */}
      <AnimatePresence>
        {showMovieInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mt-6 w-full max-w-md space-y-3 overflow-hidden"
          >
            <input
              type="text"
              value={movieInput}
              onChange={(e) => setMovieInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && movieInput.trim()) confirmMovie()
              }}
              placeholder="e.g., Lord of the Rings, Harry Potter..."
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/30
                bg-white/[0.04] backdrop-blur-md border border-white/[0.06]
                outline-none transition-all duration-200
                focus:border-white/20 focus:bg-white/[0.06]"
            />
            <div className="flex justify-center">
              <PillButton glow onClick={confirmMovie} disabled={!movieInput.trim()}>
                Continue
              </PillButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        type="button"
        onClick={() => {
          dispatch({ type: 'SET_VIBE', vibe: 'auto' })
          onNext()
        }}
        className="mt-8 text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        Skip — defaults to Auto
      </motion.button>
    </div>
  )
}
