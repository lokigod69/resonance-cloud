import { useRef, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Sparkles, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
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

// Glassy clone of the video presentation (StudyPG.tsx) for Image mode: picture as
// the primary prompt, word hidden until reveal. Recall direction: image → word.
export default function StudyImagePG() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const queueParam = searchParams.get('queue')
  const queue = isStudyQueue(queueParam) ? queueParam : null

  const {
    words, current, currentIndex, dailyNewQuotaReached, loading, sessionComplete, sessionStats, reviewed,
    revealed, setRevealed, decks, deckFilter, setDeckFilter, deckScopeLocked,
    activeThumbnailUrl,
    handleRemembered, handleReviewLater, restart, selectIndex, skipPrev, skipNext,
  } = useStudyUI({ videoRef, studyMode: 'image', queue })

  const [imgError, setImgError] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern; clears the broken-image flag when the current word changes
    setImgError(false)
  }, [current?.id])

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

  return (
    <div className="px-0 sm:px-4 md:px-6 max-w-5xl mx-auto flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-start pt-4 pb-10 sm:pt-6">
      <div className="w-full max-w-4xl">
        {queue && (
          <QueueIndicator queue={queue} count={words.length} language={current?.target_language ?? searchParams.get('lang') ?? ''} />
        )}

        {/* Deck filter — hidden when the entry point already fixed the pool */}
        {decks.length > 1 && !deckScopeLocked && (
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
            {/* Image with arrows anchored to it */}
            <div className="relative pg-glass rounded-none sm:rounded-2xl overflow-hidden mb-6 group/image">
              {/* Left skip arrow — centered on image */}
              <button
                onClick={skipPrev}
                disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-40 sm:opacity-0 sm:group-hover/image:opacity-100 disabled:!opacity-0 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Right skip arrow — centered on image */}
              <button
                onClick={skipNext}
                disabled={currentIndex >= words.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-40 sm:opacity-0 sm:group-hover/image:opacity-100 disabled:!opacity-0 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {showImage ? (
                <img
                  src={activeThumbnailUrl ?? undefined}
                  alt={revealed ? current.word : ''}
                  onError={() => setImgError(true)}
                  className="w-full aspect-video object-contain bg-black"
                />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-card to-transparent flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Word — hidden until reveal (recall is image → word) */}
            <div className="text-center mb-6 px-4 min-h-[3.5rem]">
              {revealed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <h2 className="text-3xl font-bold font-display long-copy">{current.word}</h2>
                  {current.translation && (
                    <p className="text-xl text-gray-300 mt-1 long-copy">{current.translation}</p>
                  )}
                  {current.mnemonic && (
                    <p className="text-sm italic text-gray-500 mt-3 max-w-lg mx-auto leading-relaxed long-copy">
                      {current.mnemonic}
                    </p>
                  )}
                </motion.div>
              ) : (
                <button
                  onClick={() => setRevealed(true)}
                  className="px-8 py-3 rounded-full border border-border bg-card backdrop-blur text-foreground tracking-widest uppercase text-sm font-display hover:bg-accent transition-all"
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
                className="flex justify-center gap-3 w-full max-w-md mx-auto"
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
        onSelect={selectIndex}
      />

    </div>
  )
}
