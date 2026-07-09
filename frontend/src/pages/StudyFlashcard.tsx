import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check,
  X,
  Sparkles,
  BookOpen,
  Volume2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { QueueIndicator } from '@/components/study/QueueIndicator'
import { SessionComplete } from '@/components/study/SessionComplete'
import { StudyCardFrame } from '@/components/study/StudyCardFrame'
import { SwipeGradeCard } from '@/components/study/SwipeGradeCard'
import { ImagelessCard } from '@/components/study/ImagelessCard'
import { isStudyQueue } from '@/hooks/useStudySession'
import { useStudyUI } from '@/hooks/useStudyUI'
import { useTranslation } from '@/hooks/useTranslation'
import { usePronunciation } from '@/hooks/usePronunciation'
import { useVideoVersion } from '@/hooks/useVideoVersion'
import { computeStudyProgress } from '@/lib/studyProgress'

type FeedbackPulse = 'remembered' | 'reviewLater'

// How long the decorative grading pulse stays mounted — it plays over the next
// card and never gates input. Advancing is immediate.
const FEEDBACK_PULSE_MS = 700
// Swallows ghost double-taps/clicks re-grading the *next* card. Must outlast
// the 220ms card-exit transition (the next card isn't visible before then),
// while staying imperceptible for deliberate grading.
const GRADE_REPEAT_GUARD_MS = 260

export default function StudyFlashcard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { playWord } = usePronunciation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const queueParam = searchParams.get('queue')
  const queue = isStudyQueue(queueParam) ? queueParam : null
  const feedbackTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const [feedbackPulse, setFeedbackPulse] = useState<{ kind: FeedbackPulse; seq: number } | null>(null)
  const pulseSeqRef = useRef(0)
  const lastGradeAtRef = useRef(0)
  // 1 = graded remembered (exits right), -1 = review later (exits left),
  // 0 = skip/other navigation (default upward exit)
  const [exitDir, setExitDir] = useState<0 | 1 | -1>(0)
  const reducedMotion = useReducedMotion()

  const {
    words, current, currentIndex, clearedCount, dailyNewQuotaReached, loading, sessionComplete, sessionStats, reviewed,
    revealed, setRevealed, decks, deckFilter, setDeckFilter,
    handleRemembered, handleReviewLater, restart, skipPrev, skipNext,
  } = useStudyUI({ videoRef, studyMode: 'flashcard', queue })

  const progress = computeStudyProgress(clearedCount, words.length)

  // Back-face image for the flip — resolved exactly as the study video/image pages do
  // (a/b version preference, raw thumbnail_url). Null for card_text (imageless) decks.
  const { activeThumbnailUrl } = useVideoVersion(current ?? { id: '', video_url: null, thumbnail_url: null })
  const [imgError, setImgError] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern; clears the broken-image flag when the current word changes
    setImgError(false)
    // Cards advanced by paths that bypass grade() (Space/Enter in useStudyUI)
    // must not inherit the previous grade's exit direction. The graded card's
    // exit already resolved its direction at the removal render, before this runs.
    setExitDir(0)
  }, [current?.id])
  const backImageUrl = activeThumbnailUrl && !imgError ? activeThumbnailUrl : null

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  // Grade and advance in the same tick — the pulse is decoration, never a gate.
  // Returns whether the grade was accepted so a swipe can spring back if not.
  const grade = useCallback((kind: FeedbackPulse): boolean => {
    const now = performance.now()
    if (now - lastGradeAtRef.current < GRADE_REPEAT_GUARD_MS) return false
    lastGradeAtRef.current = now
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    pulseSeqRef.current += 1
    setFeedbackPulse({ kind, seq: pulseSeqRef.current })
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackPulse(null)
      feedbackTimerRef.current = null
    }, FEEDBACK_PULSE_MS)
    setExitDir(kind === 'remembered' ? 1 : -1)
    if (kind === 'remembered') handleRemembered()
    else handleReviewLater()
    return true
  }, [handleRemembered, handleReviewLater])

  const handleFeedbackReviewLater = useCallback(() => { grade('reviewLater') }, [grade])
  const handleFeedbackRemembered = useCallback(() => { grade('remembered') }, [grade])
  const handleSkipPrev = useCallback(() => { setExitDir(0); skipPrev() }, [skipPrev])
  const handleSkipNext = useCallback(() => { setExitDir(0); skipNext() }, [skipNext])

  // Flashcard-specific keyboard shortcuts (1/2 for review/remember).
  // Same focus/repeat guards as the shared handler in useStudyUI: held keys
  // must not machine-gun grades, and typing in a focused control never grades.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete || e.repeat) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || target?.closest('[role="listbox"]')) return
      if (e.key === '1') { e.preventDefault(); handleFeedbackReviewLater() }
      if (e.key === '2') { e.preventDefault(); handleFeedbackRemembered() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sessionComplete, handleFeedbackReviewLater, handleFeedbackRemembered])

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
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-green-500/40 bg-green-500/15">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">{t('study.dailyNewDone.title')}</h2>
          <p className="text-muted-foreground text-sm max-w-sm">{t('study.dailyNewDone.body')}</p>
        </div>
        <Button onClick={() => navigate('/dashboard')}>{t('study.dailyNewDone.cta')}</Button>
      </div>
    )
  }

  if (words.length === 0) {
    const isFiltered = deckFilter !== 'all'
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <h2 className="text-xl font-bold mb-2">
            {isFiltered ? t('study.noCardsReady') : t('study.noWordsReady')}
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            {isFiltered ? t('study.addCardsHintFlashcard') : t('study.generateFirstFlashcard')}
          </p>
        </div>
        {!isFiltered && (
          <Button onClick={() => navigate('/generate')}>
            <Sparkles className="h-4 w-4 mr-2" />
            {t('study.generateDeck')}
          </Button>
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
        backLabel={t('study.backToDecks')}
      />
    )
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-start overflow-hidden px-4 pt-4 pb-10 sm:pt-6">
      <AnimatePresence>
        {feedbackPulse && (
          <motion.div
            key={`${feedbackPulse.kind}-${feedbackPulse.seq}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-x-[-20%] top-20 h-[460px] rounded-full blur-3xl"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.68, y: 70 }}
              animate={reducedMotion ? { opacity: [0, 0.32, 0] } : { opacity: [0, 0.32, 0], scale: [0.68, 1.08, 1.18], y: [70, 18, 0] }}
              transition={{ duration: 0.64, ease: 'easeOut' }}
              style={{
                background:
                  feedbackPulse.kind === 'remembered'
                    ? 'radial-gradient(circle, rgba(34, 197, 94, 0.34) 0%, rgba(34, 197, 94, 0.13) 32%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(239, 68, 68, 0.34) 0%, rgba(239, 68, 68, 0.13) 32%, transparent 70%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-xl">
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

        {/* Progress counter — distinct cards cleared against the frozen snapshot */}
        <p className="text-center text-sm text-muted-foreground mb-6">
          {progress.current} / {progress.total}
        </p>

        <AnimatePresence mode="wait" custom={exitDir}>
          {current && (
            <motion.div
              key={current.id}
              custom={exitDir}
              variants={{
                initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 },
                animate: reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 },
                // Graded cards leave along the grade's axis (remembered → right,
                // review later → left) — the same paths the swipe gesture uses,
                // so button grading quietly teaches the gesture.
                exit: (dir: 0 | 1 | -1) => {
                  if (reducedMotion) return { opacity: 0 }
                  if (dir !== 0) return { opacity: 0, x: dir * 84, transition: { duration: 0.22, ease: 'easeOut' } }
                  return { opacity: 0, y: -30, scale: 0.95 }
                },
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={reducedMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full"
            >
              {/* Flashcard — flips from the word alone to (image + word + translation) on reveal.
                  Wrapped in SwipeGradeCard: drag right = remembered, left = review later. */}
              <SwipeGradeCard onGrade={grade} className="mb-6" style={{ perspective: '1200px' }}>
                <motion.div
                  animate={{ rotateY: revealed ? 180 : 0 }}
                  transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="relative w-full min-h-[280px] sm:min-h-[340px]"
                >
                  {/* Front — target word alone */}
                  <StudyCardFrame
                    aria-hidden={revealed}
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    className="absolute inset-0 flex flex-col items-center justify-center px-6 py-10"
                  >
                    {current.deck_type === 'card_text' ? (
                      <ImagelessCard
                        word={current.word}
                        translation={current.translation ?? ''}
                        ipa={current.ipa ?? null}
                        revealed={false}
                        className="w-full max-w-2xl"
                      />
                    ) : (
                      <button
                        type="button"
                        aria-label={t('study.playPronunciationAria', { word: current.word })}
                        onClick={() => { void playWord(current) }}
                        className="group flex max-w-full flex-col items-center justify-center gap-3 rounded-xl px-4 py-3 text-foreground transition-colors hover:text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--card))]"
                      >
                        <h2 className="text-3xl sm:text-4xl font-bold text-center long-copy">{current.word}</h2>
                        <Volume2
                          className="h-5 w-5 text-muted-foreground/70 transition-colors group-hover:text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </StudyCardFrame>

                  {/* Back — image on top, word + translation underneath (image omitted when the deck has none) */}
                  <StudyCardFrame
                    aria-hidden={!revealed}
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 py-8"
                  >
                    {backImageUrl && (
                      <img
                        src={backImageUrl}
                        alt={current.word}
                        onError={() => setImgError(true)}
                        className="w-full max-w-[280px] aspect-video rounded-xl border border-border bg-black object-contain"
                      />
                    )}
                    <h2 className="text-2xl sm:text-3xl font-bold text-center long-copy">{current.word}</h2>
                    {current.translation && (
                      <p className="text-center text-lg text-muted-foreground long-copy">{current.translation}</p>
                    )}
                  </StudyCardFrame>
                </motion.div>
              </SwipeGradeCard>

              {/* Reveal area */}
              <div className="text-center mb-6">
                {revealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    {current.deck_type === 'card_text' && current.ipa && (
                      <p className="font-mono text-sm text-muted-foreground/70 long-copy">{current.ipa}</p>
                    )}
                    {current.mnemonic && (
                      <p className="text-sm italic text-foreground/80 mt-3 max-w-lg mx-auto leading-relaxed long-copy">
                        {current.mnemonic}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setRevealed(true)}
                    className="px-8 py-3 rounded-full tracking-widest uppercase text-sm"
                  >
                    {t('study.revealAnswer')}
                  </Button>
                )}
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex justify-center gap-3 w-full max-w-sm mx-auto"
              >
                <button
                  type="button"
                  aria-label={t('study.prevCardAria')}
                  onClick={handleSkipPrev}
                  disabled={currentIndex === 0}
                  className="flex h-12 w-12 items-center justify-center self-center rounded-full border border-border bg-card/70 text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95 active:bg-accent active:text-foreground disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={handleFeedbackReviewLater}
                  aria-label={t('study.reviewLater')}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/40 bg-red-500/15 text-red-400 transition-all hover:border-red-500/60 hover:bg-red-500/25 active:scale-90 active:border-red-500/80 active:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <X className="h-7 w-7" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={handleFeedbackRemembered}
                  aria-label={t('study.rememberedAction')}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/15 text-green-400 transition-all hover:border-green-500/60 hover:bg-green-500/25 active:scale-90 active:border-green-500/80 active:bg-green-500/30 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Check className="h-7 w-7" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  aria-label={t('study.skipCardAria')}
                  onClick={handleSkipNext}
                  disabled={words.length <= 1}
                  className="flex h-12 w-12 items-center justify-center self-center rounded-full border border-border bg-card/70 text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95 active:bg-accent active:text-foreground disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
