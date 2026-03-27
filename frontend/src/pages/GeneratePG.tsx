import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Sparkles, Zap, Check, ArrowLeft, Film } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useWizardState } from '@/components/generate/useWizardState'
import type { ExistingDeck } from '@/components/generate/useWizardState'
import {
  LANGUAGES,
  VIBES,
  ART_STYLE_GROUPS,
  GENRES,
  MAX_WORDS,
} from '@/components/generate/wizardData'

/* ─── Constants ─────────────────────────────────── */

const PG_EASE = [0.16, 1, 0.3, 1] as const
const PG_TRANSITION = { duration: 0.5, ease: PG_EASE }
const STEP_LABELS = ['Language', 'Words', 'Vibe', 'Art Style', 'Music', 'Review']

/* ─── Main Component ────────────────────────────── */

export default function GeneratePG() {
  const { user, profile, refreshProfile } = useAuth()
  const { state, dispatch, buildPayload } = useWizardState()

  const [pgStep, setPgStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const wordInputRef = useRef<HTMLInputElement>(null)

  // "Add Cards" mode: existing deck via ?deckId=xxx
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
          dispatch({ type: 'SET_LANGUAGE', language: data.target_language })
          setPgStep(1)
        }
      })
  }, [deckIdParam, dispatch])

  /* ─── Submit (mirrors GenerateWizard.handleGenerate) ─── */

  async function handleGenerate() {
    if (!user || !profile) return
    if (state.words.length === 0) return
    if (!existingDeck && !state.language) return

    setSubmitting(true)
    setError(null)

    try {
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
        targetDeckId = existingDeck.id

        const wordRows = wordList.map((w) => ({
          deck_id: targetDeckId,
          user_id: user.id,
          word: w,
          status: 'pending',
        }))
        const { error: wordsError } = await supabase.from('words').insert(wordRows)
        if (wordsError) throw new Error(wordsError.message)

        const { error: jobError } = await supabase
          .from('generation_jobs')
          .insert({ ...jobPayload, deck_id: targetDeckId })
        if (jobError) throw new Error(jobError.message)

        const { error: deckUpdateError } = await supabase
          .from('decks')
          .update({ status: 'generating', word_count: existingDeck.word_count + wordCount })
          .eq('id', targetDeckId)
        if (deckUpdateError) throw new Error(deckUpdateError.message)
      } else {
        const { data: deck, error: deckError } = await supabase
          .from('decks')
          .insert(deckPayload!)
          .select('id')
          .single()

        if (deckError || !deck) throw new Error(deckError?.message || 'Failed to create deck')
        targetDeckId = deck.id

        const wordRows = wordList.map((w) => ({
          deck_id: targetDeckId,
          user_id: user.id,
          word: w,
          status: 'pending',
        }))
        const { error: wordsError } = await supabase.from('words').insert(wordRows)
        if (wordsError) throw new Error(wordsError.message)

        const { error: jobError } = await supabase
          .from('generation_jobs')
          .insert({ ...jobPayload, deck_id: targetDeckId })
        if (jobError) throw new Error(jobError.message)
      }

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

  /* ─── Quick Generate path ─── */

  function handleQuickGenerate() {
    // Clear custom selections (vibe/art/genre → null) then submit immediately.
    // buildPayload handles nulls correctly: null vibe → auto, null art → AI decides, null genre → auto.
    dispatch({ type: 'CHOOSE_PATH', path: 'quick' })
    handleGenerate()
  }

  /* ─── Generated state ─── */

  if (generated) {
    return (
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center text-center gap-8"
        >
          {/* Spinning gradient orb */}
          <div className="relative">
            <motion.div
              className="w-24 h-24 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, var(--pg-accent-teal), var(--pg-accent-violet), var(--pg-accent-rose), var(--pg-accent-teal))',
              }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            />
            <div
              className="absolute inset-0 rounded-full blur-xl"
              style={{
                background: 'conic-gradient(from 0deg, var(--pg-accent-teal), var(--pg-accent-violet), var(--pg-accent-rose), var(--pg-accent-teal))',
                opacity: 0.4,
              }}
            />
          </div>

          <div className="space-y-2">
            <motion.h2
              className="text-3xl font-bold font-display"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              Forging Memories
            </motion.h2>
            <p className="text-sm text-[var(--pg-text-dim)] max-w-sm">
              {existingDeck
                ? `New cards are being generated for "${existingDeck.name || existingDeck.target_language + ' Deck'}". Check back soon!`
                : "Your deck is being created. Generation continues in the background — this page is safe to leave."}
            </p>
          </div>

          <Link
            to={existingDeck ? `/deck/${existingDeck.id}` : '/dashboard'}
            className="px-6 py-3 rounded-full pg-glass text-sm font-display font-medium text-[var(--pg-accent-teal)] hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            {existingDeck ? 'Back to Deck' : 'Back to Dashboard'}
          </Link>
        </motion.div>
      </div>
    )
  }

  /* ─── Main render ─── */

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Breadcrumb pills */}
      <BreadcrumbPills
        pgStep={pgStep}
        setPgStep={setPgStep}
        existingDeck={!!existingDeck}
      />

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pgStep}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={PG_TRANSITION}
        >
          {pgStep === 0 && (
            <StepLanguage
              onSelect={(lang) => {
                dispatch({ type: 'SET_LANGUAGE', language: lang })
                setPgStep(1)
              }}
            />
          )}
          {pgStep === 1 && (
            <StepWords
              words={state.words}
              dispatch={dispatch}
              inputRef={wordInputRef}
              onQuickGenerate={handleQuickGenerate}
              onCustomize={() => {
                dispatch({ type: 'CHOOSE_PATH', path: 'custom' })
                setPgStep(2)
              }}
              submitting={submitting}
            />
          )}
          {pgStep === 2 && (
            <StepVibe
              selected={state.vibe}
              movieTitle={state.movieTitle}
              dispatch={dispatch}
              onContinue={() => setPgStep(3)}
            />
          )}
          {pgStep === 3 && (
            <StepArtStyle
              selected={state.artStyle}
              dispatch={dispatch}
              onContinue={() => setPgStep(4)}
            />
          )}
          {pgStep === 4 && (
            <StepMusic
              selected={state.genre}
              dispatch={dispatch}
              onContinue={() => setPgStep(5)}
            />
          )}
          {pgStep === 5 && (
            <StepReview
              state={state}
              dispatch={dispatch}
              credits={profile?.credits ?? 0}
              onSubmit={handleGenerate}
              submitting={submitting}
              error={error}
              onJumpTo={setPgStep}
              existingDeck={existingDeck}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ─── Breadcrumb Pills ──────────────────────────── */

function BreadcrumbPills({
  pgStep,
  setPgStep,
  existingDeck,
}: {
  pgStep: number
  setPgStep: (s: number) => void
  existingDeck: boolean
}) {
  const startIndex = existingDeck ? 1 : 0

  return (
    <div className="flex flex-wrap gap-2 mb-8 justify-center">
      {STEP_LABELS.map((label, i) => {
        if (i < startIndex) return null
        const completed = i < pgStep
        const current = i === pgStep

        return (
          <button
            key={label}
            onClick={() => completed && setPgStep(i)}
            disabled={!completed}
            className={`
              px-3 py-1.5 rounded-full text-xs font-display font-medium transition-all
              ${completed
                ? 'pg-glass border-[var(--pg-accent-teal)] text-[var(--pg-accent-teal)] cursor-pointer hover:bg-white/5'
                : current
                  ? 'pg-glass text-white border-white/20'
                  : 'text-white/20 border border-white/5 cursor-default'
              }
            `}
            style={completed ? { borderColor: 'var(--pg-accent-teal)' } : undefined}
          >
            {completed && <Check className="h-3 w-3 inline mr-1" />}
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Step 0: Language ──────────────────────────── */

function StepLanguage({ onSelect }: { onSelect: (lang: string) => void }) {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">Choose your language</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-10">Select the language you want to learn</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {LANGUAGES.map((lang, i) => (
          <motion.button
            key={lang.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, ...PG_TRANSITION }}
            onClick={() => onSelect(lang.value)}
            className="pg-glass rounded-2xl p-6 text-left hover:border-[var(--pg-accent-teal)]/30 hover:shadow-[0_0_20px_rgba(13,226,195,0.15)] hover:-translate-y-1 transition-all group"
          >
            <span className="text-4xl block mb-3">{lang.flag}</span>
            <p className="font-display font-semibold text-white group-hover:text-[var(--pg-accent-teal)] transition-colors">
              {lang.value}
            </p>
            <p className="text-xs text-[var(--pg-text-dim)]">{lang.label}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/* ─── Step 1: Words ─────────────────────────────── */

function StepWords({
  words,
  dispatch,
  inputRef,
  onQuickGenerate,
  onCustomize,
  submitting,
}: {
  words: string[]
  dispatch: React.Dispatch<import('@/components/generate/useWizardState').WizardAction>
  inputRef: React.RefObject<HTMLInputElement | null>
  onQuickGenerate: () => void
  onCustomize: () => void
  submitting: boolean
}) {
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  function addWord() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (words.length >= MAX_WORDS) {
      setInputError(`Maximum ${MAX_WORDS} words`)
      return
    }
    if (words.some((w) => w.toLowerCase() === trimmed.toLowerCase())) {
      setInputError('Word already added')
      return
    }
    dispatch({ type: 'ADD_WORD', word: trimmed })
    setInputValue('')
    setInputError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="text-center max-w-lg mx-auto">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">Add your words</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-8">
        {words.length} of {MAX_WORDS} words
      </p>

      {/* Input */}
      <div className="flex gap-2 mb-6">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setInputError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') addWord() }}
          placeholder="Type a word..."
          maxLength={60}
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 font-display text-sm outline-none focus:border-[var(--pg-accent-teal)]/50 transition-colors"
        />
        <button
          onClick={addWord}
          disabled={!inputValue.trim() || words.length >= MAX_WORDS}
          className="p-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/40 text-[var(--pg-accent-teal)] hover:bg-[var(--pg-accent-teal)]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {inputError && (
        <p className="text-xs text-[var(--pg-accent-rose)] mb-4">{inputError}</p>
      )}

      {/* Word pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-8 min-h-[40px]">
        <AnimatePresence>
          {words.map((word, i) => (
            <motion.span
              key={word}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-display font-medium border"
              style={{
                backgroundColor: 'rgba(13, 226, 195, 0.1)',
                borderColor: 'rgba(13, 226, 195, 0.3)',
                color: 'var(--pg-accent-teal)',
              }}
            >
              {word}
              <button
                onClick={() => dispatch({ type: 'REMOVE_WORD', index: i })}
                className="hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <AnimatePresence>
        {words.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={onQuickGenerate}
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all shadow-[0_0_20px_rgba(13,226,195,0.15)] disabled:opacity-50"
            >
              <Zap className="h-4 w-4 inline mr-2" />
              {submitting ? 'Generating...' : 'Quick Generate'}
            </button>
            <button
              onClick={onCustomize}
              disabled={submitting}
              className="px-6 py-3 rounded-xl border border-white/10 text-[var(--pg-text-dim)] font-display font-medium hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Customize
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Step 2: Vibe ──────────────────────────────── */

function StepVibe({
  selected,
  movieTitle,
  dispatch,
  onContinue,
}: {
  selected: string | null
  movieTitle: string | null
  dispatch: React.Dispatch<import('@/components/generate/useWizardState').WizardAction>
  onContinue: () => void
}) {
  const effectiveVibe = selected || 'auto'
  const needsMovie = effectiveVibe === 'movie' || effectiveVibe === 'specific_movie'

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">Set the creative direction</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-10">Choose how AI interprets your words visually</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
        {VIBES.map((vibe, i) => {
          const isSelected = effectiveVibe === vibe.value
          return (
            <motion.button
              key={vibe.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, ...PG_TRANSITION }}
              onClick={() => dispatch({ type: 'SET_VIBE', vibe: vibe.value })}
              className={`pg-glass rounded-2xl p-5 text-left transition-all ${
                isSelected
                  ? 'shadow-[0_0_25px_rgba(139,92,246,0.2)]'
                  : 'hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]'
              }`}
              style={{
                borderColor: isSelected ? 'var(--pg-accent-violet)' : undefined,
              }}
            >
              <p className={`font-display font-semibold mb-1 ${isSelected ? 'text-[var(--pg-accent-violet)]' : 'text-white'}`}>
                {vibe.label}
              </p>
              <p className="text-xs text-[var(--pg-text-dim)]">{vibe.description}</p>
            </motion.button>
          )
        })}
      </div>

      {/* Movie title input */}
      <AnimatePresence>
        {needsMovie && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-md mx-auto mb-8"
          >
            <div className="flex items-center gap-2 mb-2">
              <Film className="h-4 w-4 text-[var(--pg-accent-violet)]" />
              <label className="text-sm font-display text-[var(--pg-text-dim)]">
                {effectiveVibe === 'specific_movie' ? 'Which film?' : 'Film name (optional)'}
              </label>
            </div>
            <input
              type="text"
              value={movieTitle || ''}
              onChange={(e) => dispatch({ type: 'SET_MOVIE_TITLE', title: e.target.value })}
              placeholder="e.g. Blade Runner, Amélie..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 font-display text-sm outline-none focus:border-[var(--pg-accent-violet)]/50 transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onContinue}
        className="px-8 py-3 rounded-xl bg-[var(--pg-accent-violet)]/20 border border-[var(--pg-accent-violet)]/40 text-[var(--pg-accent-violet)] font-display font-semibold hover:bg-[var(--pg-accent-violet)]/30 transition-all"
      >
        Continue
      </button>
    </div>
  )
}

/* ─── Step 3: Art Style ─────────────────────────── */

function StepArtStyle({
  selected,
  dispatch,
  onContinue,
}: {
  selected: string | null
  dispatch: React.Dispatch<import('@/components/generate/useWizardState').WizardAction>
  onContinue: () => void
}) {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">Choose an art style</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-8">Pick the visual treatment for your cards</p>

      <div className="max-w-3xl mx-auto max-h-[55vh] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        {/* Normal / AI decides */}
        <button
          onClick={() => dispatch({ type: 'SET_ART_STYLE', style: null })}
          className={`w-full pg-glass rounded-2xl p-4 mb-6 text-left transition-all ${
            selected === null
              ? 'shadow-[0_0_20px_rgba(244,63,94,0.15)]'
              : 'hover:shadow-[0_0_15px_rgba(244,63,94,0.1)]'
          }`}
          style={{ borderColor: selected === null ? 'var(--pg-accent-rose)' : undefined }}
        >
          <p className={`font-display font-semibold ${selected === null ? 'text-[var(--pg-accent-rose)]' : 'text-white'}`}>
            Normal
          </p>
          <p className="text-xs text-[var(--pg-text-dim)]">AI decides the best visual style per word</p>
        </button>

        {/* Grouped styles */}
        {ART_STYLE_GROUPS.map((group) => (
          <div key={group.group} className="mb-6 text-left">
            <p className="text-xs font-display text-[var(--pg-text-dim)] uppercase tracking-widest mb-3">
              {group.group}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {group.styles.map((style) => {
                const isSelected = selected === style.value
                return (
                  <button
                    key={style.value}
                    onClick={() => dispatch({ type: 'SET_ART_STYLE', style: style.value })}
                    className={`rounded-xl px-3 py-2.5 text-sm font-display text-left transition-all border ${
                      isSelected
                        ? 'text-[var(--pg-accent-rose)] shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'text-white/80 hover:text-white hover:border-[var(--pg-accent-rose)]/30'
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.03)',
                      borderColor: isSelected ? 'var(--pg-accent-rose)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {style.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={onContinue}
          className="px-8 py-3 rounded-xl bg-[var(--pg-accent-rose)]/20 border border-[var(--pg-accent-rose)]/40 text-[var(--pg-accent-rose)] font-display font-semibold hover:bg-[var(--pg-accent-rose)]/30 transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

/* ─── Step 4: Music ─────────────────────────────── */

function StepMusic({
  selected,
  dispatch,
  onContinue,
}: {
  selected: string | null
  dispatch: React.Dispatch<import('@/components/generate/useWizardState').WizardAction>
  onContinue: () => void
}) {
  const effectiveGenre = selected || 'auto'

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">Pick a genre</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-10">Choose the music style for your videos</p>

      <div className="flex flex-wrap gap-3 justify-center max-w-lg mx-auto mb-10">
        {GENRES.map((genre, i) => {
          const isSelected = effectiveGenre === genre.value
          return (
            <motion.button
              key={genre.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
              onClick={() => dispatch({ type: 'SET_GENRE', genre: genre.value })}
              className={`px-5 py-2.5 rounded-full text-sm font-display font-medium transition-all border ${
                isSelected
                  ? 'text-[var(--pg-accent-green)] shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                  : 'text-white/70 hover:text-white hover:border-[var(--pg-accent-green)]/30'
              }`}
              style={{
                backgroundColor: isSelected ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255,255,255,0.03)',
                borderColor: isSelected ? 'var(--pg-accent-green)' : 'rgba(255,255,255,0.08)',
              }}
            >
              {genre.label}
            </motion.button>
          )
        })}
      </div>

      <button
        onClick={onContinue}
        className="px-8 py-3 rounded-xl bg-[var(--pg-accent-green)]/20 border border-[var(--pg-accent-green)]/40 text-[var(--pg-accent-green)] font-display font-semibold hover:bg-[var(--pg-accent-green)]/30 transition-all"
      >
        Continue
      </button>
    </div>
  )
}

/* ─── Step 5: Review ────────────────────────────── */

function StepReview({
  state,
  dispatch,
  credits,
  onSubmit,
  submitting,
  error,
  onJumpTo,
  existingDeck,
}: {
  state: import('@/components/generate/useWizardState').WizardState
  dispatch: React.Dispatch<import('@/components/generate/useWizardState').WizardAction>
  credits: number
  onSubmit: () => void
  submitting: boolean
  error: string | null
  onJumpTo: (step: number) => void
  existingDeck: ExistingDeck | null
}) {
  const vibeLabel = VIBES.find((v) => v.value === (state.vibe || 'auto'))?.label || 'Auto'
  const artLabel = state.artStyle
    ? ART_STYLE_GROUPS.flatMap((g) => g.styles).find((s) => s.value === state.artStyle)?.label || state.artStyle
    : 'Normal (AI decides)'
  const genreLabel = GENRES.find((g) => g.value === (state.genre || 'auto'))?.label || 'Auto'
  const langObj = LANGUAGES.find((l) => l.value === state.language)

  const sections = [
    {
      label: 'Language',
      value: langObj ? `${langObj.flag} ${langObj.value}` : (existingDeck?.target_language || '—'),
      textColor: 'text-teal-400',
      borderColor: 'border-teal-500/30',
      step: 0,
    },
    {
      label: 'Objects',
      value: `${state.words.length} Memory Objects`,
      textColor: 'text-white',
      borderColor: 'border-white/20',
      step: 1,
    },
    {
      label: 'Vibe',
      value: vibeLabel + (state.movieTitle ? ` — ${state.movieTitle}` : ''),
      textColor: 'text-violet-400',
      borderColor: 'border-violet-500/30',
      step: 2,
    },
    {
      label: 'Art',
      value: artLabel,
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      step: 3,
    },
    {
      label: 'Music',
      value: genreLabel,
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      step: 4,
    },
  ]

  return (
    <div className="w-full max-w-lg mx-auto mt-8">
      <h2 className="text-5xl font-bold font-display tracking-tight mb-10 text-center text-white drop-shadow-md italic">
        Synthesis Ready
      </h2>

      {/* Deck name input */}
      {!existingDeck && (
        <div className="mb-8">
          <input
            type="text"
            value={state.deckName}
            onChange={(e) => dispatch({ type: 'SET_DECK_NAME', name: e.target.value })}
            placeholder="Name your deck..."
            maxLength={50}
            className="w-full max-w-md mx-auto block p-4 rounded-xl bg-transparent border border-white/10 outline-none focus:border-teal-500/50 transition-colors text-center text-lg font-light text-white placeholder:text-gray-600"
            style={{ fontFamily: 'var(--font-display, inherit)' }}
          />
        </div>
      )}

      <div className="space-y-4">
        {sections.map((s) => (
          <button
            key={s.label}
            onClick={() => onJumpTo(s.step)}
            className={`w-full flex justify-between items-center pg-glass px-6 py-4 rounded-xl border-l-[3px] ${s.borderColor} hover:bg-white/5 transition-colors`}
          >
            <span className="text-gray-400 text-sm uppercase tracking-wider">{s.label}</span>
            <span className={`font-medium ${s.textColor}`}>{s.value}</span>
          </button>
        ))}
      </div>

      {/* Credits */}
      <p className="text-center text-gray-500 text-sm mt-6">
        {state.words.length} credit{state.words.length !== 1 ? 's' : ''} will be used &middot; You have {credits}
      </p>
      {credits < state.words.length && (
        <p className="text-center text-xs text-rose-400 mt-1">Not enough credits</p>
      )}

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-rose-400 mt-4">{error}</p>
      )}

      {/* Submit */}
      <div className="mt-8 text-center pb-20">
        <button
          onClick={onSubmit}
          disabled={submitting || credits < state.words.length}
          className="px-10 py-4 rounded-full bg-white text-black font-display font-medium text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              Initializing...
            </span>
          ) : (
            'Initialize Synthesis'
          )}
        </button>
      </div>
    </div>
  )
}
