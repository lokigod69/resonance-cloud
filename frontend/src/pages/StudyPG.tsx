import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, RotateCcw, Sparkles, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useVideoVersion } from '@/hooks/useVideoVersion'
import { useVideoVolume } from '@/hooks/useVideoVolume'
import { useVideoPlayback } from '@/hooks/useVideoPlayback'
import { useStudySession } from '@/hooks/useStudySession'
import OrbDock from '@/components/OrbDock'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'

type DeckOption = { id: string; name: string | null }

export default function StudyPG() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const deckParam = searchParams.get('deck')
  const { user } = useAuth()
  const { t, tp } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [deckFilter, setDeckFilter] = useState<string>(deckParam ?? 'all')
  const [decks, setDecks] = useState<DeckOption[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('decks')
      .select('id, name')
      .eq('user_id', user.id)
      .then(({ data }) => { if (data) setDecks(data) })
  }, [user])

  const { words, loading, sessionStats, recordAttempt, scheduleRetry, consumeRetry, restart: restartSession } = useStudySession(deckFilter === 'all' ? null : deckFilter)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const visitedIdsRef = useRef<Set<string>>(new Set())
  const wasPlayingRef = useRef(true)

  // Reset session state when deck filter changes
  useEffect(() => {
    setCurrentIndex(0)
    setRevealed(false)
    setSessionComplete(false)
    setReviewed(0)
    visitedIdsRef.current = new Set()
  }, [deckFilter])
  const { isMuted, toggleMute } = useVideoVolume(videoRef, false)
  const { togglePlay, replay, onPlay, onPause } = useVideoPlayback(videoRef)

  const current = words[currentIndex] ?? null
  const { activeVideoUrl, activeThumbnailUrl } = useVideoVersion(current ?? { id: '', video_url: null, thumbnail_url: null })

  const advanceToNext = useCallback(() => {
    wasPlayingRef.current = !(videoRef.current?.paused ?? false)
    setReviewed((r) => r + 1)
    setRevealed(false)
    if (current) visitedIdsRef.current.add(current.id)

    // Check retry pocket
    const retryId = consumeRetry()
    if (retryId) {
      const idx = words.findIndex((w) => w.id === retryId)
      if (idx !== -1) {
        setCurrentIndex(idx)
        return
      }
    }

    // Linear advance, skipping visited
    let next = currentIndex + 1
    while (next < words.length && visitedIdsRef.current.has(words[next].id)) next++
    if (next >= words.length) {
      // Before ending session, drain any pending retries even if gap not fully met
      const forcedRetryId = consumeRetry(true)
      if (forcedRetryId) {
        const idx = words.findIndex((w) => w.id === forcedRetryId)
        if (idx !== -1) {
          setCurrentIndex(idx)
          return
        }
      }
      setSessionComplete(true)
    } else {
      setCurrentIndex(next)
    }
  }, [current, currentIndex, words, consumeRetry])

  useEffect(() => {
    if (!wasPlayingRef.current && videoRef.current) {
      videoRef.current.pause()
    }
  }, [current?.id])

  const handleRemembered = useCallback(() => {
    if (!current) return
    recordAttempt(current.id, true)
    advanceToNext()
  }, [current, recordAttempt, advanceToNext])

  const handleReviewLater = useCallback(() => {
    if (!current) return
    recordAttempt(current.id, false)
    scheduleRetry(current.id)
    advanceToNext()
  }, [current, recordAttempt, scheduleRetry, advanceToNext])

  const restart = useCallback(() => {
    restartSession()
    setCurrentIndex(0)
    setRevealed(false)
    setSessionComplete(false)
    setReviewed(0)
    visitedIdsRef.current = new Set()
  }, [restartSession])

  const skipPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setRevealed(false)
    }
  }, [currentIndex])

  const skipNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1)
      setRevealed(false)
    }
  }, [currentIndex, words.length])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        else handleRemembered()
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); skipPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); skipNext() }
      if (e.key === 'r' || e.key === 'R') replay()
      if (e.key === 'm' || e.key === 'M') toggleMute()
      if (e.key === 'p' || e.key === 'P') togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, handleRemembered, replay, sessionComplete, toggleMute, togglePlay, skipPrev, skipNext])

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
        <BookOpen className="h-12 w-12 text-white/15" />
        <div>
          <h2 className="text-xl font-bold font-display mb-2">
            {isFiltered ? t('study.noCardsReady') : t('study.noWordsReady')}
          </h2>
          <p className="text-[var(--pg-text-dim)] text-sm max-w-sm">
            {isFiltered
              ? t('study.addCardsHint')
              : t('study.generateFirst')}
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-[var(--pg-accent-green)]/20 border border-[var(--pg-accent-green)]/40 flex items-center justify-center"
        >
          <Check className="h-10 w-10 text-[var(--pg-accent-green)]" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold font-display mb-2">{t('study.sessionComplete')}</h2>
          <p className="text-[var(--pg-text-dim)]">
            {tp('study.wordsReviewed', reviewed)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--pg-text-dim)' }}>
            <span style={{ color: 'var(--pg-accent-green)' }}>{t('study.remembered', { count: sessionStats.remembered })}</span>
            {sessionStats.reviewLater > 0 && (
              <span className="ml-2" style={{ color: '#fb923c' }}>{t('study.needReview', { count: sessionStats.reviewLater })}</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={restart}
            className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all"
          >
            <RotateCcw className="h-4 w-4 inline mr-2" />
            {t('study.startAgain')}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl border border-white/10 text-[var(--pg-text-dim)] font-display font-medium hover:bg-white/5 transition-all"
          >
            {t('nav.decks')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-0 sm:px-4 md:px-6 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-96px)]">
      {/* Card + content */}
      <div className="w-full max-w-4xl">
        {/* Deck filter */}
        {decks.length > 1 && (
          <div className="flex justify-end mb-4">
            <Select value={deckFilter} onValueChange={setDeckFilter}>
              <SelectTrigger
                size="sm"
                className="w-[200px] bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 focus-visible:ring-0 focus-visible:border-white/30"
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
            {/* Video with arrows anchored to it */}
            <div className="relative pg-glass rounded-none sm:rounded-2xl overflow-hidden mb-6 group/video">
              {/* Left skip arrow — centered on video */}
              <button
                onClick={skipPrev}
                disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-40 sm:opacity-0 sm:group-hover/video:opacity-100 disabled:!opacity-0 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Right skip arrow — centered on video */}
              <button
                onClick={skipNext}
                disabled={currentIndex >= words.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-40 sm:opacity-0 sm:group-hover/video:opacity-100 disabled:!opacity-0 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {activeVideoUrl ? (
                <video
                  ref={videoRef}
                  key={current.id}
                  src={activeVideoUrl}
                  autoPlay
                  muted={isMuted}
                  loop
                  playsInline
                  className="w-full aspect-video object-contain bg-black cursor-pointer"
                  onClick={togglePlay}
                  onPlay={onPlay}
                  onPause={onPause}
                />
              ) : activeThumbnailUrl ? (
                <img
                  src={activeThumbnailUrl}
                  alt={current.word}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-white/10" />
                </div>
              )}
            </div>

            {/* Word */}
            <div className="text-center mb-6 px-4">
              <h2 className="text-3xl font-bold font-display mb-3">{current.word}</h2>

              {/* Reveal area */}
              {revealed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  {current.translation && (
                    <p className="text-xl text-gray-300 mt-1">{current.translation}</p>
                  )}
                  {current.mnemonic && (
                    <p className="text-sm italic text-gray-500 mt-3 max-w-lg mx-auto leading-relaxed">
                      {current.mnemonic}
                    </p>
                  )}
                  {current.etymology && (
                    <p className="text-xs text-gray-600 mt-2 max-w-lg mx-auto leading-relaxed">
                      {current.etymology}
                    </p>
                  )}
                </motion.div>
              ) : (
                <button
                  onClick={() => setRevealed(true)}
                  className="px-8 py-3 rounded-full border border-white/20 bg-white/5 backdrop-blur text-white tracking-widest uppercase text-sm font-display hover:bg-white/10 transition-all"
                >
                  {t('study.revealAnswer')}
                </button>
              )}
            </div>

            {/* Actions — only visible after reveal */}
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-3 w-full max-w-md mx-auto"
              >
                {/* Review Later — red ✕ */}
                <button
                  onClick={handleReviewLater}
                  aria-label="Review Later"
                  className="w-16 h-16 rounded-full sm:w-auto sm:h-auto sm:flex-1 sm:rounded-2xl sm:py-4 bg-red-500/15 border-2 border-red-500/40 text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/25 hover:border-red-500/60 transition-all"
                >
                  <X className="h-7 w-7 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline text-sm font-display font-medium">{t('study.reviewLater')}</span>
                </button>

                {/* Remembered — green ✓ */}
                <button
                  onClick={handleRemembered}
                  aria-label="Remembered"
                  className="w-16 h-16 rounded-full sm:w-auto sm:h-auto sm:flex-1 sm:rounded-2xl sm:py-4 bg-[var(--pg-accent-green)]/15 border-2 border-[var(--pg-accent-green)]/40 text-[var(--pg-accent-green)] flex items-center justify-center gap-2 hover:bg-[var(--pg-accent-green)]/25 hover:border-[var(--pg-accent-green)]/60 transition-all"
                >
                  <Check className="h-7 w-7 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline text-sm font-display font-medium">{t('study.rememberedAction')}</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Orb thumbnail dock — word navigation */}
      <OrbDock
        words={words}
        currentIndex={currentIndex}
        onSelect={(i) => {
          setCurrentIndex(i)
          setRevealed(false)
        }}
      />

    </div>
  )
}
