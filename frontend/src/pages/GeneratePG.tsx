import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowLeft, Film } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { submitGeneration } from '@/components/generate/submitGeneration'
import { useWizardState } from '@/components/generate/useWizardState'
import type { ExistingDeck } from '@/components/generate/useWizardState'
import WordsStep from '@/components/generate/steps/WordsStep'
import {
  LANGUAGES,
  VIBES,
  ART_STYLE_GROUPS,
  GENRES,
  NIVEAU_OPTIONS,
} from '@/components/generate/wizardData'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useQueuePosition } from '@/hooks/useQueuePosition'
import { useTranslation } from '@/hooks/useTranslation'
import { GenerationWheelLoader } from '@/components/ui/GenerationWheelLoader'

/* ─── Constants ─────────────────────────────────── */

const PG_EASE = [0.16, 1, 0.3, 1] as const
const PG_TRANSITION = { duration: 0.5, ease: PG_EASE }

/* ─── Main Component ────────────────────────────── */

export default function GeneratePG() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { state, dispatch, buildPayload } = useWizardState()
  const navigate = useNavigate()

  const [pgStep, setPgStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [generatedDeckId, setGeneratedDeckId] = useState<string | null>(null)
  const hasNavigatedToDeckRef = useRef(false)

  // "Add Cards" mode: existing deck via ?deckId=xxx
  const { t } = useTranslation()

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

  // Pre-seed from LanguageContext (dashboard language tab). Only seeds if
  // the wizard's own language state is still empty — never overwrites a manual choice.
  const { activeLanguage } = useLanguage()
  useEffect(() => {
    if (deckIdParam) return
    if (state.language) return
    if (!activeLanguage) return

    dispatch({ type: 'SET_LANGUAGE', language: activeLanguage })
    const timeoutId = window.setTimeout(() => {
      setPgStep(1)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [deckIdParam, state.language, activeLanguage, dispatch])

  const queueDeckId = generatedDeckId ?? existingDeck?.id ?? null
  const { jobStatus, jobsAhead, queuePaused, hasChecked, shouldShowQueue } = useQueuePosition(queueDeckId ?? undefined, {
    enabled: generated && !!queueDeckId,
  })

  useEffect(() => {
    if (!generated || !queueDeckId || hasNavigatedToDeckRef.current) return
    if (jobStatus === 'processing' || (hasChecked && !jobStatus && !shouldShowQueue)) {
      hasNavigatedToDeckRef.current = true
      navigate(`/deck/${queueDeckId}`)
    }
  }, [generated, hasChecked, jobStatus, navigate, queueDeckId, shouldShowQueue])

  /* ─── Submit (mirrors GenerateWizard.handleGenerate) ─── */

  async function handleGenerate(wordsOverride?: string[]) {
    if (!user) return
    const isQuickGenerate = wordsOverride !== undefined
    const effectiveWords = wordsOverride ?? state.words
    if (effectiveWords.length === 0) return
    if (!existingDeck && !state.language) return

    setSubmitting(true)
    setError(null)

    try {
      const { deckPayload, jobPayload } = buildPayload(user.id, existingDeck ?? undefined)
      // Use explicit word list instead of buildPayload's closure-captured state.words.
      // Also patch word counts that buildPayload derived from the (possibly stale) state.
      const wordList = effectiveWords
      if (deckPayload) deckPayload.word_count = wordList.length
      jobPayload.words_total = wordList.length
      if (isQuickGenerate) {
        if (deckPayload) {
          deckPayload.art_style = null
          deckPayload.movie_override = null
        }
        jobPayload.art_style = existingDeck?.art_style ?? null
        jobPayload.movie_override = existingDeck?.movie_override ?? null
        jobPayload.settings_override = {}
      }

      const targetDeckId = await submitGeneration(
        user.id,
        { deckPayload, wordList, jobPayload },
        existingDeck ?? undefined,
        { cachedCredits: profile?.credits }
      )

      await refreshProfile()
      setGeneratedDeckId(targetDeckId)
      setGenerated(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('common.somethingWentWrong')
      setError(msg)
      toast(msg, 'error')
      setSubmitting(false)
    }
  }

  /* ─── Quick Generate path ─── */

  function handleQuickGenerate(words: string[]) {
    // Clear custom selections (vibe/art/genre → null) then submit with the
    // explicit word list provided by WordsStep (avoids stale-closure race).
    dispatch({ type: 'CHOOSE_PATH', path: 'quick' })
    handleGenerate(words)
  }

  /* ─── Generated state ─── */

  if (generated) {
    return (
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex w-full max-w-xl flex-col items-center text-center gap-8"
        >
          <GenerationWheelLoader
            label={t('generate.forgingMemories')}
            sublabel={existingDeck
              ? `New cards are being generated for "${existingDeck.name || existingDeck.target_language + ' Deck'}". Check back soon!`
              : `${t('generate.deckBeingCreated')} ${t('generate.backgroundNotice')}`}
          />
          {hasChecked && queuePaused && (
            <p className="text-xs text-[var(--pg-text-dim)] opacity-80">
              {t('queue.paused')}
            </p>
          )}
          {hasChecked && !queuePaused && typeof jobsAhead === 'number' && jobsAhead > 0 && (
            <p className="text-xs text-[var(--pg-text-dim)] opacity-80">
              {jobsAhead} {t('queue.jobsAhead')}
            </p>
          )}

          <Link
            to={existingDeck ? `/deck/${existingDeck.id}` : '/dashboard'}
            className="px-6 py-3 rounded-full pg-glass text-sm font-display font-medium text-[var(--pg-accent-teal)] hover:bg-accent/10 transition-all"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            {existingDeck ? t('generate.backToDeck') : t('common.backToDecks')}
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
            <WordsStep
              state={state}
              dispatch={dispatch}
              onQuickGenerate={(words) => handleQuickGenerate(words)}
              onCustomize={() => setPgStep(2)}
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
            <StepNiveau
              selected={state.lyricMode}
              dispatch={dispatch}
              onContinue={() => setPgStep(5)}
            />
          )}
          {pgStep === 5 && (
            <StepMusic
              selected={state.genre}
              dispatch={dispatch}
              onContinue={() => setPgStep(6)}
            />
          )}
          {pgStep === 6 && (
            <StepReview
              state={state}
              dispatch={dispatch}
              credits={profile?.credits}
              onSubmit={() => handleGenerate()}
              submitting={submitting}
              error={error}
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
  const { t } = useTranslation()
  const STEP_LABELS = [
    t('generate.stepLanguage'), t('generate.stepWords'), t('generate.stepVibe'),
    t('generate.stepArtStyle'), t('generate.stepNiveau'),
    t('generate.stepMusic'), t('generate.stepReview'),
  ]
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
                ? 'pg-glass border-[var(--pg-accent-teal)] text-[var(--pg-accent-teal)] cursor-pointer hover:bg-accent/10'
                : current
                  ? 'pg-glass text-foreground border-border'
                  : 'text-muted-foreground border border-border/40 cursor-default'
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
  const { t } = useTranslation()
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">{t('generate.chooseLanguage')}</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-10">{t('generate.chooseLanguageSub')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {LANGUAGES.map((lang, i) => (
          <motion.button
            key={lang.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, borderColor: lang.color, boxShadow: `0 0 20px ${lang.color}20` }}
            transition={{ delay: i * 0.08, ...PG_TRANSITION }}
            onClick={() => onSelect(lang.value)}
            className="pg-glass rounded-2xl p-6 text-left transition-all"
          >
            <FlagIcon code={lang.code} className="w-12 h-auto block mb-3" />
            <p className="font-display font-semibold text-foreground transition-colors">
              {lang.label}
            </p>
          </motion.button>
        ))}
      </div>
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
  const { t } = useTranslation()
  const effectiveVibe = selected || 'auto'
  const needsMovie = effectiveVibe === 'movie' || effectiveVibe === 'specific_movie'

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">{t('generate.setDirection')}</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-10">{t('generate.setDirectionSub')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8 px-4">
        {VIBES.map((vibe, i) => {
          const isSelected = effectiveVibe === vibe.value
          return (
            <motion.button
              key={vibe.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.03 }}
              transition={{ delay: i * 0.06, ...PG_TRANSITION }}
              onClick={() => dispatch({ type: 'SET_VIBE', vibe: vibe.value })}
              className={`pg-glass rounded-2xl p-5 text-left transition-all hover:brightness-110 ${
                isSelected
                  ? 'shadow-[0_0_25px_rgba(139,92,246,0.2)]'
                  : 'hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]'
              }`}
              style={{
                borderColor: isSelected ? 'var(--pg-accent-violet)' : undefined,
              }}
            >
              <p className={`font-display font-semibold mb-1 ${isSelected ? 'text-[var(--pg-accent-violet)]' : 'text-foreground'}`}>
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
                {effectiveVibe === 'specific_movie' ? t('generate.whichFilm') : t('generate.filmPlaceholder')}
              </label>
            </div>
            <input
              type="text"
              value={movieTitle || ''}
              onChange={(e) => dispatch({ type: 'SET_MOVIE_TITLE', title: e.target.value })}
              placeholder={t('generate.filmExample')}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground font-display text-base outline-none focus:border-[var(--pg-accent-violet)]/50 transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onContinue}
        className="px-8 py-3 rounded-xl bg-[var(--pg-accent-violet)]/20 border border-[var(--pg-accent-violet)]/40 text-[var(--pg-accent-violet)] font-display font-semibold hover:bg-[var(--pg-accent-violet)]/30 transition-all"
      >
        {t('generate.continue')}
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
  const { t } = useTranslation()
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">{t('generate.chooseArtStyle')}</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-8">{t('generate.chooseArtStyleSub')}</p>

      <div className="max-w-3xl mx-auto max-h-[55vh] overflow-y-auto px-4" style={{ scrollbarWidth: 'none' }}>
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
          <p className={`font-display font-semibold ${selected === null ? 'text-[var(--pg-accent-rose)]' : 'text-foreground'}`}>
            {t('generate.normalStyle')}
          </p>
          <p className="text-xs text-[var(--pg-text-dim)]">{t('generate.normalStyleDesc')}</p>
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
                        : 'text-foreground/80 hover:text-foreground hover:border-[var(--pg-accent-rose)]/30'
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'rgba(244, 63, 94, 0.1)' : 'color-mix(in srgb, var(--surface-2) 64%, transparent)',
                      borderColor: isSelected ? 'var(--pg-accent-rose)' : 'var(--border-subtle)',
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
          {t('generate.continue')}
        </button>
      </div>
    </div>
  )
}

/* ─── Step 4: Niveau ────────────────────────────── */

function StepNiveau({
  selected,
  dispatch,
  onContinue,
}: {
  selected: string | null
  dispatch: React.Dispatch<import('@/components/generate/useWizardState').WizardAction>
  onContinue: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">{t('generate.chooseNiveau')}</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-10">{t('generate.chooseNiveauSub')}</p>

      <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto mb-10 px-4">
        {NIVEAU_OPTIONS.map((opt, i) => {
          const isSelected = selected === opt.value
          return (
            <motion.button
              key={opt.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              onClick={() => dispatch({ type: 'SET_LYRIC_MODE', mode: opt.value })}
              className={`pg-glass rounded-2xl px-5 py-3 text-left transition-all ${
                isSelected ? 'shadow-[0_0_20px_rgba(13,226,195,0.2)]' : 'hover:shadow-[0_0_15px_rgba(13,226,195,0.1)]'
              }`}
              style={{ borderColor: isSelected ? 'var(--pg-accent-teal)' : undefined, minWidth: 160 }}
            >
              <p className={`font-display font-semibold ${isSelected ? 'text-[var(--pg-accent-teal)]' : 'text-foreground'}`}>
                {t(`generate.niveau.${opt.key}`)}
              </p>
              <p className="text-xs text-[var(--pg-text-dim)]">{t(`generate.niveau.${opt.key}Desc`)}</p>
            </motion.button>
          )
        })}
      </div>

      <button
        onClick={onContinue}
        className="px-8 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/40 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all"
      >
        {t('generate.continue')}
      </button>
    </div>
  )
}

/* ─── Step 5: Music ─────────────────────────────── */

function StepMusic({
  selected,
  dispatch,
  onContinue,
}: {
  selected: string | null
  dispatch: React.Dispatch<import('@/components/generate/useWizardState').WizardAction>
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const PRESET_GENRE_VALUES = GENRES
    .filter((g) => g.value !== 'custom' && g.value !== 'auto')
    .map((g) => g.value) as string[]
  const isCustomGenre = (genre: string | null): boolean =>
    genre !== null && genre !== 'auto' && !PRESET_GENRE_VALUES.includes(genre)

  const [customText, setCustomText] = useState(isCustomGenre(selected) ? (selected as string) : '')
  const [showCustomInput, setShowCustomInput] = useState(isCustomGenre(selected))

  const effectiveGenre = selected || 'auto'

  function confirmCustom() {
    const trimmed = customText.trim().toLowerCase()
    if (!trimmed || trimmed === 'auto' || trimmed === 'custom') return
    dispatch({ type: 'SET_GENRE', genre: trimmed })
    setShowCustomInput(false)
  }

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold font-display tracking-tight mb-2">{t('generate.pickGenre')}</h2>
      <p className="text-[var(--pg-text-dim)] text-sm mb-10">{t('generate.pickGenreSub')}</p>

      <div className="flex flex-wrap gap-3 justify-center max-w-lg mx-auto mb-10 px-4">
        {GENRES.map((genre, i) => {
          const isCustomChip = genre.value === 'custom'
          const isSelected = isCustomChip
            ? showCustomInput || isCustomGenre(selected)
            : effectiveGenre === genre.value
          return (
            <motion.button
              key={genre.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
              onClick={() => {
                if (isCustomChip) {
                  setShowCustomInput(true)
                } else {
                  setShowCustomInput(false)
                  dispatch({ type: 'SET_GENRE', genre: genre.value })
                }
              }}
              className={`px-5 py-2.5 rounded-full text-sm font-display font-medium transition-all border ${
                isSelected
                  ? 'text-[var(--pg-accent-green)] shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                  : 'text-foreground/70 hover:text-foreground hover:border-[var(--pg-accent-green)]/30'
              }`}
              style={{
                backgroundColor: isSelected ? 'rgba(52, 211, 153, 0.12)' : 'color-mix(in srgb, var(--surface-2) 64%, transparent)',
                borderColor: isSelected ? 'var(--pg-accent-green)' : 'var(--border-subtle)',
              }}
            >
              {genre.label}
              {isCustomChip && isCustomGenre(selected) && !showCustomInput && (
                <span className="block text-xs text-[var(--pg-accent-green)]/80 mt-0.5">{selected}</span>
              )}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mx-auto mb-10 w-full max-w-md space-y-3 overflow-hidden px-4"
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
              className="w-full rounded-xl px-4 py-3 text-sm text-foreground/90 placeholder:text-muted-foreground
                bg-card backdrop-blur-md border border-border
                outline-none transition-all duration-200
                focus:border-[var(--pg-accent-green)]/60 focus:bg-card"
            />
            {isCustomGenre(selected) && selected !== customText.trim().toLowerCase() && (
              <div className="text-xs text-[var(--pg-accent-green)]/80 text-center">Current: {selected}</div>
            )}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={confirmCustom}
                disabled={!customText.trim()}
                className="px-6 py-2.5 rounded-full text-sm font-display font-semibold border text-[var(--pg-accent-green)] border-[var(--pg-accent-green)]/50 bg-[var(--pg-accent-green)]/10 hover:bg-[var(--pg-accent-green)]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span className="sr-only">Confirm genre</span>
                <span aria-hidden="true">✓</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          // Auto-commit pending custom genre text if user skipped the green button
          if (showCustomInput || selected === 'custom') {
            const trimmed = customText.trim().toLowerCase()
            if (!trimmed || trimmed === 'auto' || trimmed === 'custom') return
            dispatch({ type: 'SET_GENRE', genre: trimmed })
            setShowCustomInput(false)
          }
          onContinue()
        }}
        className="px-8 py-3 rounded-xl bg-[var(--pg-accent-green)]/20 border border-[var(--pg-accent-green)]/40 text-[var(--pg-accent-green)] font-display font-semibold hover:bg-[var(--pg-accent-green)]/30 transition-all"
      >
        {t('generate.continue')}
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
  existingDeck,
}: {
  state: import('@/components/generate/useWizardState').WizardState
  dispatch: React.Dispatch<import('@/components/generate/useWizardState').WizardAction>
  credits: number | undefined
  onSubmit: () => void
  submitting: boolean
  error: string | null
  existingDeck: ExistingDeck | null
}) {
  const { t, tp } = useTranslation()
  return (
    <div className="w-full max-w-lg mx-auto mt-8">
      <h2 className="text-3xl sm:text-5xl font-bold font-display tracking-tight mb-10 text-center text-foreground drop-shadow-md italic">
        {t('generate.synthesisReady')}
      </h2>

      {/* Selection summary */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {state.language && (
          <span className="px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: 'rgba(13, 226, 195, 0.12)', border: '1px solid rgba(13, 226, 195, 0.3)', color: '#0de2c3' }}>
            🌐 {state.language}
          </span>
        )}
        <span className="px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: 'color-mix(in srgb, var(--surface-2) 64%, transparent)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          📝 {tp('dashboard.wordCount', state.words.length)}
        </span>
        {state.vibe && state.vibe !== 'auto' && (
          <span className="px-4 py-2 rounded-full text-sm font-medium capitalize"
            style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e' }}>
            🎭 {state.vibe === 'specific_movie' ? 'Movie' : state.vibe}{state.movieTitle ? `: ${state.movieTitle}` : ''}
          </span>
        )}
        {state.artStyle && (
          <span className="px-4 py-2 rounded-full text-sm font-medium capitalize"
            style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#8b5cf6' }}>
            🎨 {state.artStyle}
          </span>
        )}
        {state.genre && state.genre !== 'auto' && (
          <span className="px-4 py-2 rounded-full text-sm font-medium capitalize"
            style={{ background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24' }}>
            🎵 {state.genre}
          </span>
        )}
      </div>

      {/* Deck name input */}
      {!existingDeck && (
        <div className="mb-8">
          <input
            type="text"
            value={state.deckName}
            onChange={(e) => dispatch({ type: 'SET_DECK_NAME', name: e.target.value })}
            placeholder={t('generate.deckNamePlaceholder')}
            maxLength={50}
            className="w-full max-w-md mx-auto block p-4 rounded-xl bg-transparent border border-border outline-none focus:border-teal-500/50 transition-colors text-center text-lg font-light text-foreground placeholder:text-muted-foreground"
            style={{ fontFamily: 'var(--font-display, inherit)' }}
          />
        </div>
      )}

      {/* Credits */}
      <p className="text-center text-gray-500 text-sm mt-6">
        {tp('generate.creditsUsed', state.words.length)}
      </p>
      {typeof credits === 'number' && credits < state.words.length && (
        <p className="text-center text-xs text-rose-400 mt-1">{t('generate.notEnoughCredits')}</p>
      )}

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-rose-400 mt-4">{error}</p>
      )}

      {/* Submit */}
      <div className="mt-8 text-center pb-20">
        <button
          onClick={onSubmit}
          disabled={submitting || (typeof credits === 'number' && credits < state.words.length)}
          className="px-10 py-4 rounded-full bg-foreground text-background font-display font-medium text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {submitting ? (
            t('generate.initializing')
          ) : (
            t('generate.initializeSynthesis')
          )}
        </button>
      </div>
    </div>
  )
}
