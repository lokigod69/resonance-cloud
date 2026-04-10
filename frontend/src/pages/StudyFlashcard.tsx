import { useRef, useEffect } from 'react'
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
import { Check, X, RotateCcw, Sparkles, BookOpen } from 'lucide-react'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useStudyUI } from '@/hooks/useStudyUI'
import { useTranslation } from '@/hooks/useTranslation'

const STORAGE_KEY = 'resonance-study-mode'

export default function StudyFlashcard() {
  const navigate = useNavigate()
  const { t, tp } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    words, current, currentIndex, loading, sessionComplete, sessionStats, reviewed,
    revealed, setRevealed, decks, deckFilter, setDeckFilter,
    handleRemembered, handleReviewLater, restart,
  } = useStudyUI({ videoRef, studyMode: 'flashcard' })

  // Persist last-used mode
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, 'flashcard')
  }, [])

  // Flashcard-specific keyboard shortcuts (1/2 for review/remember)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete || !revealed) return
      if (e.key === '1') { e.preventDefault(); handleReviewLater() }
      if (e.key === '2') { e.preventDefault(); handleRemembered() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sessionComplete, revealed, handleReviewLater, handleRemembered])

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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-xl">
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
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm min-h-[280px] sm:min-h-[340px] flex flex-col items-center justify-center px-6 py-10 mb-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-center">{current.word}</h2>
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
                      <p className="text-xl text-muted-foreground">{current.translation}</p>
                    )}
                    {current.mnemonic && (
                      <p className="text-sm italic text-muted-foreground/70 mt-3 max-w-lg mx-auto leading-relaxed">
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

              {/* Actions — only visible after reveal */}
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex gap-3 w-full max-w-md mx-auto"
                >
                  <button
                    onClick={handleReviewLater}
                    aria-label="Review Later"
                    className="w-16 h-16 rounded-full sm:w-auto sm:h-auto sm:flex-1 sm:rounded-2xl sm:py-4 bg-red-500/15 border-2 border-red-500/40 text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/25 hover:border-red-500/60 transition-all"
                  >
                    <X className="h-7 w-7 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline text-sm font-medium">{t('study.reviewLater')}</span>
                  </button>

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
