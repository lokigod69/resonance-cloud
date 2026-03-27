import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import PillButton from '../shared/PillButton'
import { LANGUAGES, VIBES, GENRES, ART_STYLE_GROUPS } from '../wizardData'
import type { WizardState, WizardAction } from '../useWizardState'

interface ConfirmStepProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  onGenerate: () => void
  submitting: boolean
  error: string | null
  existingDeck?: boolean
}

function getLanguageLabel(value: string | null) {
  const lang = LANGUAGES.find((l) => l.value === value)
  return lang ? `${lang.flag} ${lang.label}` : '—'
}

function getVibeLabel(value: string | null) {
  if (!value) return 'Auto'
  const vibe = VIBES.find((v) => v.value === value)
  return vibe?.label ?? 'Auto'
}

function getArtStyleLabel(value: string | null) {
  if (!value) return 'Normal'
  for (const group of ART_STYLE_GROUPS) {
    const style = group.styles.find((s) => s.value === value)
    if (style) return style.label
  }
  return value
}

function getGenreLabel(value: string | null) {
  if (!value) return 'Auto'
  const genre = GENRES.find((g) => g.value === value)
  return genre?.label ?? 'Auto'
}

const rows = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const row = {
  hidden: { opacity: 0, x: -15 },
  show: { opacity: 1, x: 0 },
}

export default function ConfirmStep({ state, dispatch, onGenerate, submitting, error, existingDeck }: ConfirmStepProps) {
  const summaryItems = [
    { label: 'Language', value: getLanguageLabel(state.language), step: 1 as const },
    { label: 'Words', value: `${state.words.length} word${state.words.length !== 1 ? 's' : ''}`, step: 2 as const },
    { label: 'Vibe', value: getVibeLabel(state.vibe), step: 3 as const },
    { label: 'Art Style', value: getArtStyleLabel(state.artStyle), step: 4 as const },
    { label: 'Music', value: getGenreLabel(state.genre), step: 5 as const },
  ]

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

      {/* Summary */}
      <motion.div
        variants={rows}
        initial="hidden"
        animate="show"
        className="glass rounded-2xl border border-white/10 p-6 w-full max-w-md divide-y divide-white/[0.06]"
      >
        {summaryItems.map((item) => (
          <motion.div key={item.label} variants={row} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-xs text-white/40">{item.label}</span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'GO_TO_STEP', step: item.step })}
              className="inline-flex items-center rounded-full px-3 py-1
                bg-white/[0.06] border border-white/10
                text-sm text-white/80 hover:bg-white/[0.1] hover:border-white/20
                transition-colors cursor-pointer"
            >
              {item.value}
            </button>
          </motion.div>
        ))}

        {/* Movie title if set */}
        {state.movieTitle && (
          <motion.div variants={row} className="flex items-center justify-between">
            <span className="text-xs text-white/40">Movie</span>
            <span className="text-sm text-white/80 rounded-full px-3 py-1 bg-white/[0.06] border border-white/10">
              {state.movieTitle}
            </span>
          </motion.div>
        )}
      </motion.div>

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
              Generate {state.words.length} Video{state.words.length !== 1 ? 's' : ''}
            </>
          )}
        </PillButton>
      </motion.div>
    </div>
  )
}
