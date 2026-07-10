import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, X, Sparkles, BookOpen } from 'lucide-react'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { QueueIndicator } from '@/components/study/QueueIndicator'
import { SessionComplete } from '@/components/study/SessionComplete'
import OrbDock from '@/components/OrbDock'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStudyUI } from '@/hooks/useStudyUI'
import { isStudyQueue } from '@/hooks/useStudySession'
import { useTranslation } from '@/hooks/useTranslation'
import { playPronunciation } from '@/hooks/usePronunciation'
import { evaluateTypedAnswer, type TypedVerdict } from '@/lib/typedAnswer'

type CardResult = { verdict: TypedVerdict; revealed: boolean }

const ADVANCE_DELAY_MS: Record<'correct' | 'close', number> = {
  correct: 1000,
  close: 1900,
}

// Typed-recall mode: the prompt (picture when the word has one, otherwise the
// translation) stays fixed and the learner must TYPE the word from memory —
// production instead of recognition. Matching is forgiving (case, articles,
// small typos — see lib/typedAnswer.ts); a typo still counts as remembered but
// shows the proper spelling. Grading lands in the same recall_attempts stream
// as every other mode, tagged study_mode='typed'.
export default function StudyType() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const advanceTimerRef = useRef<number | null>(null)
  const reduceMotion = useReducedMotion()
  const queueParam = searchParams.get('queue')
  const queue = isStudyQueue(queueParam) ? queueParam : null

  const {
    words, current, currentIndex, dailyNewQuotaReached, loading, sessionComplete, sessionStats, reviewed,
    decks, deckFilter, setDeckFilter,
    activeThumbnailUrl,
    handleRemembered, handleReviewLater, restart, selectIndex,
  } = useStudyUI({ videoRef, studyMode: 'typed', queue })

  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<CardResult | null>(null)
  const [imgError, setImgError] = useState(false)

  // Reset per card; also drop any pending auto-advance from the previous card.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern; clears the typed state when the current word changes
    setAnswer('')
    setResult(null)
    setImgError(false)
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [current?.id])

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
  }, [])

  const submitAnswer = useCallback(() => {
    if (!current || result) return
    const verdict = evaluateTypedAnswer(answer, current.word)
    if (verdict === 'wrong') {
      setResult({ verdict, revealed: false })
      return
    }
    setResult({ verdict, revealed: true })
    void playPronunciation({
      text: current.word,
      audioUrl: current.tts_audio_url,
      lang: current.target_language,
    })
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null
      handleRemembered()
    }, ADVANCE_DELAY_MS[verdict])
  }, [answer, current, handleRemembered, result])

  const giveUp = useCallback(() => {
    if (!current || result?.revealed) return
    setResult({ verdict: 'wrong', revealed: true })
    void playPronunciation({
      text: current.word,
      audioUrl: current.tts_audio_url,
      lang: current.target_language,
    })
  }, [current, result])

  const continueAfterWrong = useCallback(() => {
    handleReviewLater()
  }, [handleReviewLater])

  const onInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (!result) {
      if (answer.trim()) submitAnswer()
      return
    }
    // Enter during feedback: wrong-and-revealed continues; a pending success
    // auto-advance is left alone so grading can't fire twice.
    if (result.verdict === 'wrong') {
      if (result.revealed) continueAfterWrong()
      else giveUp()
    }
  }, [answer, continueAfterWrong, giveUp, result, submitAnswer])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LingwaveLoader size={80} className="py-0" />
        <p className="text-sm text-muted-foreground opacity-60">{t('study.loadingCards')}</p>
      </div>
    )
  }

  if (dailyNewQuotaReached) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--pg-accent-green)]/40 bg-[var(--pg-accent-green)]/20">
          <Check className="h-8 w-8 text-[var(--pg-accent-green)]" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display mb-2">{t('study.dailyNewDone.title')}</h2>
          <p className="text-[var(--pg-text-dim)] text-sm max-w-sm">{t('study.dailyNewDone.body')}</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all"
        >
          {t('study.dailyNewDone.cta')}
        </button>
      </div>
    )
  }

  if (words.length === 0) {
    const isFiltered = deckFilter !== 'all'
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-bold font-display mb-2">
            {isFiltered ? t('study.noCardsReady') : t('study.noWordsReady')}
          </h2>
          <p className="text-[var(--pg-text-dim)] text-sm max-w-sm">
            {isFiltered ? t('study.addCardsHint') : t('study.generateFirst')}
          </p>
        </div>
        {!isFiltered && (
          <button
            onClick={() => navigate('/generate')}
            className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all"
          >
            <Sparkles className="h-4 w-4 inline mr-2" />
            {t('study.generateDeck')}
          </button>
        )}
      </div>
    )
  }

  if (sessionComplete) {
    return (
      <SessionComplete
        reviewed={reviewed}
        sessionStats={sessionStats}
        onRestart={restart}
        onBack={() => navigate('/dashboard')}
        backLabel={t('nav.decks')}
      />
    )
  }

  const showImage = !!activeThumbnailUrl && !imgError
  const isSuccess = result !== null && result.verdict !== 'wrong'
  const wrongRevealed = result?.verdict === 'wrong' && result.revealed
  const wrongHidden = result?.verdict === 'wrong' && !result.revealed

  return (
    <div className="px-0 sm:px-4 md:px-6 max-w-5xl mx-auto flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-start pt-4 pb-10 sm:pt-6">
      <div className="w-full max-w-4xl">
        {queue && (
          <QueueIndicator queue={queue} count={words.length} language={current?.target_language ?? searchParams.get('lang') ?? ''} />
        )}

        {/* Deck filter */}
        {decks.length > 1 && (
          <div className="flex justify-center mb-4">
            <Select value={deckFilter} onValueChange={setDeckFilter}>
              <SelectTrigger
                size="sm"
                className="w-[200px] bg-card border-border text-foreground hover:bg-accent focus-visible:ring-0 focus-visible:border-accent"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10 text-gray-200">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white">
                  {t('study.allDecks')}
                </SelectItem>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="focus:bg-white/10 focus:text-white">
                    {d.name ?? t('study.untitled')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full"
            >
              {/* Prompt: picture when available, otherwise the translation */}
              <div className="relative pg-glass rounded-none sm:rounded-2xl overflow-hidden mb-6">
                {showImage ? (
                  <img
                    src={activeThumbnailUrl ?? undefined}
                    alt=""
                    onError={() => setImgError(true)}
                    className="w-full aspect-video object-contain bg-black"
                  />
                ) : (
                  <div className="flex min-h-[12rem] w-full items-center justify-center px-6 py-14 sm:min-h-[16rem]">
                    <p className="text-center text-3xl font-bold font-display long-copy sm:text-4xl">
                      {current.translation ?? current.mnemonic ?? '…'}
                    </p>
                  </div>
                )}
              </div>

              {/* Answer input */}
              <div className="mx-auto w-full max-w-md px-4">
                <motion.div
                  animate={wrongHidden && !reduceMotion ? { x: [0, -10, 10, -7, 7, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={answer}
                    onChange={(event) => {
                      setAnswer(event.target.value)
                      // A wrong (not yet revealed) verdict clears as soon as the learner edits.
                      if (wrongHidden) setResult(null)
                    }}
                    onKeyDown={onInputKeyDown}
                    readOnly={isSuccess || wrongRevealed}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint={result ? 'next' : 'done'}
                    placeholder={t('study.typed.placeholder')}
                    aria-label={t('study.typed.placeholder')}
                    aria-invalid={result?.verdict === 'wrong' || undefined}
                    className={`w-full rounded-2xl border-2 bg-card px-5 py-4 text-center font-display text-xl text-foreground outline-none backdrop-blur transition-colors placeholder:text-muted-foreground/60 ${
                      isSuccess
                        ? 'border-[var(--pg-accent-green)]/70 shadow-[0_0_28px_color-mix(in_srgb,var(--pg-accent-green)_35%,transparent)]'
                        : result?.verdict === 'wrong'
                          ? 'border-red-500/60'
                          : 'border-border focus:border-[var(--accent)]'
                    }`}
                  />
                </motion.div>

                {/* Feedback zone — fixed height so the layout never jumps */}
                <div className="mt-4 min-h-[7.5rem]" aria-live="polite">
                  <AnimatePresence mode="wait">
                    {result === null ? (
                      <motion.div
                        key="actions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <button
                          onClick={submitAnswer}
                          disabled={!answer.trim()}
                          className="w-full rounded-2xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3.5 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {t('study.typed.check')}
                        </button>
                        <button
                          onClick={giveUp}
                          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          {t('study.typed.showAnswer')}
                        </button>
                      </motion.div>
                    ) : isSuccess ? (
                      <motion.div
                        key="success"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                        className="flex flex-col items-center gap-2 text-center"
                      >
                        <div className="relative flex h-14 w-14 items-center justify-center">
                          {!reduceMotion && (
                            <motion.span
                              className="absolute inset-0 rounded-full border-2 border-[var(--pg-accent-green)]"
                              initial={{ scale: 1, opacity: 0.6 }}
                              animate={{ scale: 2, opacity: 0 }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--pg-accent-green)]/60 bg-[var(--pg-accent-green)]/20">
                            <Check className="h-7 w-7 text-[var(--pg-accent-green)]" />
                          </span>
                        </div>
                        <p className="font-display text-lg font-semibold text-[var(--pg-accent-green)]">
                          {result.verdict === 'correct' ? t('study.typed.correct') : t('study.typed.almost')}
                        </p>
                        <p className="text-2xl font-bold font-display long-copy">{current.word}</p>
                        {current.translation && showImage && (
                          <p className="text-sm text-gray-400 long-copy">{current.translation}</p>
                        )}
                      </motion.div>
                    ) : wrongRevealed ? (
                      <motion.div
                        key="solution"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-2 text-center"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {t('study.typed.solutionLabel')}
                        </p>
                        <p className="text-2xl font-bold font-display long-copy">{current.word}</p>
                        {current.translation && showImage && (
                          <p className="text-sm text-gray-400 long-copy">{current.translation}</p>
                        )}
                        <button
                          onClick={continueAfterWrong}
                          className="mt-2 w-full rounded-2xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3.5 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25"
                        >
                          {t('study.typed.continue')}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="wrong"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-3 text-center"
                      >
                        <p className="inline-flex items-center gap-2 font-display text-sm font-semibold text-red-400">
                          <X className="h-4 w-4" aria-hidden="true" />
                          {t('study.typed.wrong')}
                        </p>
                        <button
                          onClick={giveUp}
                          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          {t('study.typed.showAnswer')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Orb thumbnail dock — word navigation */}
      <OrbDock
        words={words}
        currentIndex={currentIndex}
        onSelect={selectIndex}
      />
    </div>
  )
}
