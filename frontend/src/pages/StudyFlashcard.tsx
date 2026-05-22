import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  RotateCcw,
  Sparkles,
  BookOpen,
  Volume2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useStudyUI } from '@/hooks/useStudyUI'
import { useTranslation } from '@/hooks/useTranslation'
import { usePronunciation } from '@/hooks/usePronunciation'

type FeedbackPulse = 'remembered' | 'reviewLater'

const FEEDBACK_ADVANCE_DELAY_MS = 280

export default function StudyFlashcard() {
  const navigate = useNavigate()
  const { t, tp } = useTranslation()
  const { playWord } = usePronunciation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const [feedbackPulse, setFeedbackPulse] = useState<FeedbackPulse | null>(null)

  const {
    words, current, currentIndex, loading, sessionComplete, sessionStats, reviewed,
    revealed, setRevealed, decks, deckFilter, setDeckFilter,
    handleRemembered, handleReviewLater, restart, skipPrev, skipNext,
  } = useStudyUI({ videoRef, studyMode: 'flashcard' })

  const isFeedbackActive = feedbackPulse !== null

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const playFeedbackAndAdvance = useCallback((pulse: FeedbackPulse, advance: () => void) => {
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    setFeedbackPulse(pulse)
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackPulse(null)
      feedbackTimerRef.current = null
      advance()
    }, FEEDBACK_ADVANCE_DELAY_MS)
  }, [])

  const handleFeedbackReviewLater = useCallback(() => {
    playFeedbackAndAdvance('reviewLater', handleReviewLater)
  }, [handleReviewLater, playFeedbackAndAdvance])

  const handleFeedbackRemembered = useCallback(() => {
    playFeedbackAndAdvance('remembered', handleRemembered)
  }, [handleRemembered, playFeedbackAndAdvance])

  // Flashcard-specific keyboard shortcuts (1/2 for review/remember)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete || isFeedbackActive) return
      if (e.key === '1') { e.preventDefault(); handleFeedbackReviewLater() }
      if (e.key === '2') { e.preventDefault(); handleFeedbackRemembered() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sessionComplete, isFeedbackActive, handleFeedbackReviewLater, handleFeedbackRemembered])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ParticleSpinner preset="heart" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('study.loadingCards')}</p>
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"
        >
          <Check className="h-10 w-10 text-green-400" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('study.sessionComplete')}</h2>
          <p className="text-muted-foreground">
            {tp('study.wordsReviewed', reviewed)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-green-400">{t('study.remembered', { count: sessionStats.remembered })}</span>
            {sessionStats.reviewLater > 0 && (
              <span className="text-orange-400 ml-2">{t('study.needReview', { count: sessionStats.reviewLater })}</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={restart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('study.startAgain')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            {t('study.backToDecks')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-start overflow-hidden px-4 pt-4 pb-10 sm:pt-6">
      <AnimatePresence>
        {feedbackPulse && (
          <motion.div
            key={feedbackPulse}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-x-[-20%] top-20 h-[460px] rounded-full blur-3xl"
              initial={{ opacity: 0, scale: 0.68, y: 70 }}
              animate={{ opacity: [0, 0.32, 0], scale: [0.68, 1.08, 1.18], y: [70, 18, 0] }}
              transition={{ duration: 0.64, ease: 'easeOut' }}
              style={{
                background:
                  feedbackPulse === 'remembered'
                    ? 'radial-gradient(circle, rgba(34, 197, 94, 0.34) 0%, rgba(34, 197, 94, 0.13) 32%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(239, 68, 68, 0.34) 0%, rgba(239, 68, 68, 0.13) 32%, transparent 70%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-xl">
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

        {/* Progress counter */}
        <p className="text-center text-sm text-muted-foreground mb-6">
          {currentIndex + 1} / {words.length}
        </p>

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
              {/* Flashcard */}
              <div className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm min-h-[280px] sm:min-h-[340px] flex flex-col items-center justify-center px-6 py-10 mb-6">
                <AnimatePresence>
                  {feedbackPulse && (
                    <motion.div
                      key={`${feedbackPulse}-${current.id}`}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.98, 1.018, 1.04] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      style={{
                        boxShadow:
                          feedbackPulse === 'remembered'
                            ? '0 0 0 1px rgba(34, 197, 94, 0.35), 0 0 42px rgba(34, 197, 94, 0.24)'
                            : '0 0 0 1px rgba(239, 68, 68, 0.35), 0 0 42px rgba(239, 68, 68, 0.24)',
                      }}
                    />
                  )}
                </AnimatePresence>
                <button
                  type="button"
                  aria-label={`Play pronunciation for ${current.word}`}
                  onClick={() => { void playWord(current) }}
                  className="group flex max-w-full flex-col items-center justify-center gap-3 rounded-xl px-4 py-3 text-foreground transition-colors hover:text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--card))]"
                >
                  <h2 className="text-3xl sm:text-4xl font-bold text-center long-copy">{current.word}</h2>
                  <Volume2
                    className="h-5 w-5 text-muted-foreground/70 transition-colors group-hover:text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </div>

              {/* Reveal area */}
              <div className="text-center mb-6">
                {revealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    {current.translation && (
                      <p className="text-xl text-muted-foreground long-copy">{current.translation}</p>
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
                  aria-label="Previous card"
                  onClick={skipPrev}
                  disabled={currentIndex === 0 || isFeedbackActive}
                  className="flex h-12 w-12 items-center justify-center self-center rounded-full border border-border bg-card/70 text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={handleFeedbackReviewLater}
                  disabled={isFeedbackActive}
                  aria-label="Review Later"
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/40 bg-red-500/15 text-red-400 transition-all hover:border-red-500/60 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <X className="h-7 w-7" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={handleFeedbackRemembered}
                  disabled={isFeedbackActive}
                  aria-label="Remembered"
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/15 text-green-400 transition-all hover:border-green-500/60 hover:bg-green-500/25 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Check className="h-7 w-7" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  aria-label="Skip card"
                  onClick={skipNext}
                  disabled={words.length <= 1 || isFeedbackActive}
                  className="flex h-12 w-12 items-center justify-center self-center rounded-full border border-border bg-card/70 text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
