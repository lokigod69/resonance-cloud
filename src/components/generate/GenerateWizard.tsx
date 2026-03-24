import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useWizardState } from './useWizardState'
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
  const { state, dispatch, buildPayload } = useWizardState()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const prevStep = useRef(state.step)

  // Track direction for slide animation
  const direction: 1 | -1 = state.step >= prevStep.current ? 1 : -1
  prevStep.current = state.step

  async function handleGenerate() {
    if (!user || !profile) return
    if (state.words.length === 0 || !state.language) return

    setSubmitting(true)
    setError(null)

    try {
      // Fresh credit check
      const { data: freshProfile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()

      if (profileError || !freshProfile) throw new Error('Could not verify credit balance')

      const freshCredits = freshProfile.credits ?? 0
      const wordCount = state.words.length

      if (freshCredits < wordCount) {
        throw new Error(`Not enough credits. You have ${freshCredits} but need ${wordCount}.`)
      }

      const { deckPayload, wordList, jobPayload } = buildPayload(user.id)

      // 1. Create deck
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert(deckPayload)
        .select('id')
        .single()

      if (deckError || !deck) throw new Error(deckError?.message || 'Failed to create deck')

      // 2. Create words
      const wordRows = wordList.map((w) => ({
        deck_id: deck.id,
        user_id: user.id,
        word: w,
        status: 'pending',
      }))
      const { error: wordsError } = await supabase.from('words').insert(wordRows)
      if (wordsError) throw new Error(wordsError.message)

      // 3. Create generation job
      const { error: jobError } = await supabase
        .from('generation_jobs')
        .insert({ ...jobPayload, deck_id: deck.id })
      if (jobError) throw new Error(jobError.message)

      // 4. Deduct credits
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: freshCredits - wordCount })
        .eq('id', user.id)
      if (creditError) throw new Error(creditError.message)

      await refreshProfile()
      setGenerated(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  function handleNext() {
    dispatch({ type: 'NEXT_STEP' })
  }

  function renderStep() {
    switch (state.step) {
      case 1:
        return <LanguageStep state={state} dispatch={dispatch} />
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
              Your deck is being created!
            </h2>
            <p className="text-sm text-white/50 max-w-sm">
              You'll find it on your dashboard when it's ready.
              This page is safe to leave — generation continues in the background.
            </p>
          </div>

          <Link to="/dashboard">
            <PillButton glow>
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
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
