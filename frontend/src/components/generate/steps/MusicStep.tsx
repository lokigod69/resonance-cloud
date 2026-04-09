import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import PillButton from '../shared/PillButton'
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

const PRESET_VALUES = GENRES.filter((g) => g.value !== 'custom' && g.value !== 'auto').map((g) => g.value) as string[]

function isCustomGenre(genre: string | null): boolean {
  return genre !== null && genre !== 'auto' && !PRESET_VALUES.includes(genre)
}

export default function MusicStep({ state, dispatch, onNext }: MusicStepProps) {
  const [customText, setCustomText] = useState(isCustomGenre(state.genre) ? (state.genre as string) : '')
  const [showCustomInput, setShowCustomInput] = useState(isCustomGenre(state.genre))

  function selectPreset(value: string | null) {
    setShowCustomInput(false)
    dispatch({ type: 'SET_GENRE', genre: value })
    setTimeout(onNext, 400)
  }

  function openCustom() {
    setShowCustomInput(true)
  }

  function confirmCustom() {
    const trimmed = customText.trim().toLowerCase()
    if (!trimmed) return
    if (trimmed === 'auto' || trimmed === 'custom') return
    dispatch({ type: 'SET_GENRE', genre: trimmed })
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
        {GENRES.map((genre) => {
          const isCustomChip = genre.value === 'custom'
          const selected = isCustomChip
            ? showCustomInput || isCustomGenre(state.genre)
            : (state.genre ?? 'auto') === genre.value
          return (
            <motion.div key={genre.value} variants={item}>
              <GlassCard
                selected={selected}
                onClick={() => {
                  if (isCustomChip) {
                    openCustom()
                  } else {
                    selectPreset(genre.value === 'auto' ? null : genre.value)
                  }
                }}
                className="px-5 py-3"
              >
                <span className="text-sm font-medium text-white/80">{genre.label}</span>
                {isCustomChip && isCustomGenre(state.genre) && !showCustomInput && (
                  <span className="block text-xs text-[#4ade80]/80 mt-1">{state.genre}</span>
                )}
              </GlassCard>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Custom genre free-text input */}
      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mt-6 w-full max-w-md space-y-3 overflow-hidden"
          >
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customText.trim()) confirmCustom()
              }}
              placeholder="e.g. melodic techno, bossa nova..."
              maxLength={40}
              aria-label="Custom genre"
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/30
                bg-white/[0.04] backdrop-blur-md border border-white/[0.06]
                outline-none transition-all duration-200
                focus:border-white/20 focus:bg-white/[0.06]"
            />
            {isCustomGenre(state.genre) && state.genre !== customText.trim().toLowerCase() && (
              <div className="text-xs text-[#4ade80]/80 text-center">Current: {state.genre}</div>
            )}
            <div className="flex justify-center">
              <PillButton glow onClick={confirmCustom} disabled={!customText.trim()}>
                <span className="sr-only">Confirm genre</span>
                <span aria-hidden="true">✓</span>
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
        onClick={() => selectPreset(null)}
        className="mt-8 text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        Skip — defaults to Auto
      </motion.button>
    </div>
  )
}
