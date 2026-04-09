import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { useWizardState } from './useWizardState'
import type { ExistingDeck } from './useWizardState'
import { submitGeneration } from './submitGeneration'
import WizardProgress from './WizardProgress'
import StepContainer from './shared/StepContainer'
import PillButton from './shared/PillButton'
import LanguageStep from './steps/LanguageStep'
import WordsStep from './steps/WordsStep'
import VibeStep from './steps/VibeStep'
import ArtStyleStep from './steps/ArtStyleStep'
import MusicStep from './steps/MusicStep'
import ConfirmStep from './steps/ConfirmStep'

export default function GenerateWizard() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { activeLanguage } = useLanguage()
  const { state, dispatch, buildPayload } = useWizardState()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const prevStep = useRef(state.step)

  // "Add Cards" mode: existing deck passed via ?deckId=xxx
  const [searchParams] = useSearchParams()
  const deckIdParam = searchParams.get('deckId')
  const [existingDeck, setExistingDeck] = useState<ExistingDeck | null>(null)

  useEffect(() => {
    if (!deckIdParam) return
    supabase
      .from('decks')
      .select('id, name, target_language, art_style, movie_override, word_count')
      .eq('id', deckIdParam)
      .single()
      .then(({ data }) => {
        if (data) {
          setExistingDeck(data)
          // Pre-select language and skip to words step
          dispatch({ type: 'SET_LANGUAGE', language: data.target_language })
        }
      })
  }, [deckIdParam, dispatch])

  // Pre-seed from LanguageContext (fires when context resolves async). Only seeds if
  // the wizard's own language state is still empty — never overwrites a manual choice.
  useEffect(() => {
    if (deckIdParam) return
    if (state.language) return
    if (activeLanguage) {
      dispatch({ type: 'PRESELECT_LANGUAGE', language: activeLanguage })
    }
  }, [deckIdParam, state.language, activeLanguage, dispatch])

  // Track direction for slide animation
  const direction: 1 | -1 = state.step >= prevStep.current ? 1 : -1
  prevStep.current = state.step

  async function handleGenerate() {
    if (!user || !profile) return
    if (state.words.length === 0) return
    if (!existingDeck && !state.language) return

    const credits = profile.credits ?? 0
    if (credits < state.words.length) {
      const msg = `Not enough credits. You have ${credits} but need ${state.words.length}. Redeem an invite code to get more.`
      setError(msg)
      toast(msg, 'error')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload = buildPayload(user.id, existingDeck ?? undefined)
      await submitGeneration(user.id, payload, existingDeck ?? undefined)
      await refreshProfile()
      setGenerated(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      toast(msg, 'error')
      setSubmitting(false)
    }
  }

  function handleNext() {
    dispatch({ type: 'NEXT_STEP' })
  }

  function renderStep() {
    switch (state.step) {
      case 1:
        return <LanguageStep state={state} dispatch={dispatch} existingDeck={existingDeck} />
      case 2:
        return (
          <WordsStep
            state={state}
            dispatch={dispatch}
            onQuickGenerate={handleGenerate}
          />
        )
      case 3:
        return <VibeStep state={state} dispatch={dispatch} onNext={handleNext} />
      case 4:
        return <ArtStyleStep state={state} dispatch={dispatch} onNext={handleNext} />
      case 5:
        return <MusicStep state={state} dispatch={dispatch} onNext={handleNext} />
      case 6:
        return (
          <ConfirmStep
            state={state}
            dispatch={dispatch}
            onGenerate={handleGenerate}
            submitting={submitting}
            error={error}
            existingDeck={!!existingDeck}
          />
        )
    }
  }

  if (generated) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center text-center gap-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
          >
            <CheckCircle className="h-16 w-16 text-green-400" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white/90">
              {existingDeck ? 'Cards added!' : 'Your deck is being created!'}
            </h2>
            <p className="text-sm text-white/50 max-w-sm">
              {existingDeck
                ? `New cards are being generated for "${existingDeck.name || existingDeck.target_language + ' Deck'}". Check back soon!`
                : "You'll find it on your dashboard when it's ready. This page is safe to leave — generation continues in the background."}
            </p>
          </div>

          <Link to={existingDeck ? `/deck/${existingDeck.id}` : '/dashboard'}>
            <PillButton glow>
              <ArrowLeft className="h-4 w-4" />
              {existingDeck ? 'Back to Deck' : 'Back to Decks'}
            </PillButton>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <WizardProgress state={state} dispatch={dispatch} />
      <StepContainer stepKey={state.step} direction={direction}>
        {renderStep()}
      </StepContainer>
    </div>
  )
}
