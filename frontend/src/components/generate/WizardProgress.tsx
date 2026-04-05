import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LANGUAGES, VIBES, GENRES, ART_STYLE_GROUPS } from './wizardData'
import type { WizardState, WizardAction } from './useWizardState'
import { FlagIcon } from '@/components/ui/FlagIcon'

interface WizardProgressProps {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

function getLanguageLabel(value: string): ReactNode {
  const lang = LANGUAGES.find((l) => l.value === value)
  if (!lang) return value
  return (
    <span className="inline-flex items-center gap-1">
      <FlagIcon code={lang.code} className="w-4 h-auto" />
      {lang.label}
    </span>
  )
}

function getVibeLabel(value: string) {
  const vibe = VIBES.find((v) => v.value === value)
  return vibe?.label ?? value
}

function getArtStyleLabel(value: string) {
  for (const group of ART_STYLE_GROUPS) {
    const style = group.styles.find((s) => s.value === value)
    if (style) return style.label
  }
  return value
}

function getGenreLabel(value: string) {
  const genre = GENRES.find((g) => g.value === value)
  return genre?.label ?? value
}

interface PillDef {
  key: string
  label: ReactNode
  step: 1 | 2 | 3 | 4 | 5 | 6
}

function buildPills(state: WizardState): PillDef[] {
  const pills: PillDef[] = []
  if (state.language) {
    pills.push({ key: 'lang', label: getLanguageLabel(state.language), step: 1 })
  }
  if (state.words.length > 0 && state.step > 2) {
    pills.push({ key: 'words', label: `${state.words.length} word${state.words.length !== 1 ? 's' : ''}`, step: 2 })
  }
  if (state.vibe && state.step > 3) {
    let label = getVibeLabel(state.vibe)
    if (state.vibe === 'specific_movie' && state.movieTitle) {
      label = state.movieTitle
    }
    pills.push({ key: 'vibe', label, step: 3 })
  }
  if (state.step > 4) {
    pills.push({
      key: 'art',
      label: state.artStyle ? getArtStyleLabel(state.artStyle) : 'Normal',
      step: 4,
    })
  }
  if (state.step > 5) {
    pills.push({
      key: 'genre',
      label: state.genre ? getGenreLabel(state.genre) : 'Auto',
      step: 5,
    })
  }
  return pills
}

export default function WizardProgress({ state, dispatch }: WizardProgressProps) {
  const pills = buildPills(state)

  if (pills.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
      <AnimatePresence mode="popLayout">
        {pills.map((pill) => (
          <motion.button
            key={pill.key}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            type="button"
            onClick={() => dispatch({ type: 'GO_TO_STEP', step: pill.step })}
            className="inline-flex items-center rounded-full px-3 py-1.5
              bg-white/[0.06] border border-[#4ade80]/20
              text-xs text-white/70 hover:bg-white/[0.1] hover:border-[#4ade80]/40
              transition-colors cursor-pointer"
          >
            {pill.label}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
