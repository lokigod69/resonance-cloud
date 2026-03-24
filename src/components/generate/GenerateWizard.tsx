import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useWizardState } from './useWizardState'
import WizardProgress from './WizardProgress'
import StepContainer from './shared/StepContainer'
import LanguageStep from './steps/LanguageStep'
import WordsStep from './steps/WordsStep'
import VibeStep from './steps/VibeStep'
import ArtStyleStep from './steps/ArtStyleStep'
import MusicStep from './steps/MusicStep'
import ConfirmStep from './steps/ConfirmStep'

export default function GenerateWizard() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { state, dispatch, buildPayload } = useWizardState()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      navigate(`/deck/${deck.id}`)
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

  return (
    <div className="max-w-4xl mx-auto">
      <WizardProgress state={state} dispatch={dispatch} />
      <StepContainer stepKey={state.step} direction={direction}>
        {renderStep()}
      </StepContainer>
    </div>
  )
}
