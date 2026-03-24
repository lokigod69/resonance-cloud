import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useWizardState } from './useWizardState'
import type { ExistingDeck } from './useWizardState'
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

  // Track direction for slide animation
  const direction: 1 | -1 = state.step >= prevStep.current ? 1 : -1
  prevStep.current = state.step

  async function handleGenerate() {
    if (!user || !profile) return
    if (state.words.length === 0) return
    if (!existingDeck && !state.language) return

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

      const { deckPayload, wordList, jobPayload } = buildPayload(user.id, existingDeck ?? undefined)

      let targetDeckId: string

      if (existingDeck) {
        // ── Add to existing deck ──
        targetDeckId = existingDeck.id

        // 1. Insert new words into existing deck
        const wordRows = wordList.map((w) => ({
          deck_id: targetDeckId,
          user_id: user.id,
          word: w,
          status: 'pending',
        }))
        const { error: wordsError } = await supabase.from('words').insert(wordRows)
        if (wordsError) throw new Error(wordsError.message)

        // 2. Create generation job for existing deck
        const { error: jobError } = await supabase
          .from('generation_jobs')
          .insert({ ...jobPayload, deck_id: targetDeckId })
        if (jobError) throw new Error(jobError.message)

        // 3. Update deck: set status back to generating, increment word_count
        const { error: deckUpdateError } = await supabase
          .from('decks')
          .update({
            status: 'generating',
            word_count: existingDeck.word_count + wordCount,
          })
          .eq('id', targetDeckId)
        if (deckUpdateError) throw new Error(deckUpdateError.message)
      } else {
        // ── Create new deck (original flow) ──

        // 1. Create deck
        const { data: deck, error: deckError } = await supabase
          .from('decks')
          .insert(deckPayload!)
          .select('id')
          .single()

        if (deckError || !deck) throw new Error(deckError?.message || 'Failed to create deck')
        targetDeckId = deck.id

        // 2. Create words
        const wordRows = wordList.map((w) => ({
          deck_id: targetDeckId,
          user_id: user.id,
          word: w,
          status: 'pending',
        }))
        const { error: wordsError } = await supabase.from('words').insert(wordRows)
        if (wordsError) throw new Error(wordsError.message)

        // 3. Create generation job
        const { error: jobError } = await supabase
          .from('generation_jobs')
          .insert({ ...jobPayload, deck_id: targetDeckId })
        if (jobError) throw new Error(jobError.message)
      }

      // Deduct credits (same for both flows)
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
              {existingDeck ? 'Back to Deck' : 'Back to Dashboard'}
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
