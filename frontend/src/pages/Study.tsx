import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { QueueIndicator } from '@/components/study/QueueIndicator'
import { SessionComplete } from '@/components/study/SessionComplete'
import { isStudyQueue } from '@/hooks/useStudySession'
import { useStudyUI } from '@/hooks/useStudyUI'
import { useTranslation } from '@/hooks/useTranslation'

export default function Study() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const queueParam = searchParams.get('queue')
  const queue = isStudyQueue(queueParam) ? queueParam : null

  const {
    words, current, currentIndex, dailyNewQuotaReached, loading, sessionComplete, sessionStats, reviewed,
    revealed, setRevealed, decks, deckFilter, setDeckFilter, deckScopeLocked,
    activeVideoUrl, activeThumbnailUrl, isMuted, togglePlay, onPlay, onPause,
    handleRemembered, handleReviewLater, restart, skipPrev, skipNext,
  } = useStudyUI({ videoRef, studyMode: 'video', queue })

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
            {isFiltered
              ? t('study.addCardsHint')
              : t('study.generateFirst')}
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
        backLabel={t('study.backHome')}
      />
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-start px-0 pt-4 pb-10 sm:px-4 sm:pt-6">
      {/* Card + content */}
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
              {/* Video with arrows anchored to it */}
              <div className="relative rounded-none sm:rounded-xl border border-border overflow-hidden mb-6 group/video">
                {/* Left skip arrow — centered on video */}
                <button
                  onClick={skipPrev}
                  disabled={currentIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all opacity-60 sm:opacity-0 sm:group-hover/video:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right skip arrow — centered on video */}
                <button
                  onClick={skipNext}
                  disabled={currentIndex >= words.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all opacity-60 sm:opacity-0 sm:group-hover/video:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
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
                    alt={revealed ? current.word : ''}
                    className="w-full aspect-video object-contain"
                  />
                ) : (
                  <div className="w-full aspect-video bg-muted flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Word */}
              <div className="text-center mb-6 px-4">
                <h2 className="text-3xl font-bold mb-3 long-copy">{current.word}</h2>

                {/* Reveal area */}
                {revealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    {current.translation && (
                      <p className="text-xl text-muted-foreground mt-1 long-copy">{current.translation}</p>
                    )}
                    {current.mnemonic && (
                      <p className="text-sm italic text-muted-foreground/70 mt-3 max-w-lg mx-auto leading-relaxed long-copy">
                        {current.mnemonic}
                      </p>
                    )}
                    {current.etymology && (
                      <p className="text-xs text-muted-foreground/50 mt-2 max-w-lg mx-auto leading-relaxed long-copy">
                        {current.etymology}
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
                    <span className="hidden sm:inline text-sm font-medium">{t('study.reviewLater')}</span>
                  </button>

                  {/* Remembered — green ✓ */}
                  <button
                    onClick={handleRemembered}
                    aria-label="Remembered"
                    className="w-16 h-16 rounded-full sm:w-auto sm:h-auto sm:flex-1 sm:rounded-2xl sm:py-4 bg-green-500/15 border-2 border-green-500/40 text-green-400 flex items-center justify-center gap-2 hover:bg-green-500/25 hover:border-green-500/60 transition-all"
                  >
                    <Check className="h-7 w-7 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline text-sm font-medium">{t('study.rememberedAction')}</span>
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
