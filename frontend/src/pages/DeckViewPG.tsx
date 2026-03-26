import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useDrag } from '@use-gesture/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Play,
  Pause,
  AlertCircle,
  Sparkles,
  Pencil,
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type Deck = {
  id: string
  name: string | null
  target_language: string
  word_count: number
  status: string
  art_style: string | null
  created_at: string
}

type Word = {
  id: string
  word: string
  translation: string | null
  mnemonic: string | null
  status: string
  video_url: string | null
  thumbnail_url: string | null
  created_at: string
}

export default function DeckViewPG() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameTo, setRenameTo] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const fetchData = useCallback(async () => {
    if (!id) return

    try {
      const [deckRes, wordsRes] = await Promise.all([
        supabase.from('decks').select('*').eq('id', id).single(),
        supabase.from('words').select('*').eq('deck_id', id).order('created_at'),
      ])

      if (deckRes.data) setDeck(deckRes.data)
      if (wordsRes.data) setWords(wordsRes.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll every 30s while generating
  useEffect(() => {
    if (!deck || deck.status !== 'generating') return
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [deck?.status, fetchData])

  // Keep activeIndex in bounds when words update
  useEffect(() => {
    if (activeIndex >= words.length && words.length > 0) {
      setActiveIndex(words.length - 1)
    }
  }, [words.length, activeIndex])

  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Auto-play next card when swiping while video was playing
  const playingIndexRef = useRef(playingIndex)
  playingIndexRef.current = playingIndex
  useEffect(() => {
    if (playingIndexRef.current !== null) {
      setPlayingIndex(activeIndex)
    }
  }, [activeIndex])

  const [dragOffset, setDragOffset] = useState(0)

  const bind = useDrag(
    ({ movement: [mx], active }) => {
      if (active) {
        setDragOffset(mx)
      } else {
        if (mx < -120 && activeIndex < words.length - 1) {
          setActiveIndex((i) => i + 1)
        } else if (mx > 120 && activeIndex > 0) {
          setActiveIndex((i) => i - 1)
        }
        setDragOffset(0)
      }
    },
    { axis: 'x', filterTaps: true }
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--pg-accent-teal)] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <AlertCircle className="h-12 w-12 text-white/20 mb-4" />
        <h2 className="text-xl font-semibold font-display">Deck not found</h2>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const completedCount = words.filter((w) => w.status === 'complete').length
  const totalCount = words.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const isGenerating = deck.status === 'generating'
  const displayName =
    deck.name || `${deck.target_language} Deck — ${new Date(deck.created_at).toLocaleDateString()}`

  async function handleRename() {
    if (!deck) return
    const trimmed = renameTo.trim()
    if (!trimmed || trimmed === displayName) {
      setIsRenaming(false)
      return
    }
    const { error } = await supabase
      .from('decks')
      .update({ name: trimmed })
      .eq('id', deck.id)
    if (!error) {
      setDeck((prev) => (prev ? { ...prev, name: trimmed } : prev))
      setIsRenaming(false)
    }
  }

  function startRenaming() {
    setRenameTo(displayName)
    setIsRenaming(true)
  }

  function cancelRenaming() {
    setIsRenaming(false)
    setRenameTo('')
  }

  return (
    <div className="px-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-1 p-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--pg-text-dim)] hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') cancelRenaming()
                }}
                autoFocus
                maxLength={100}
                className="text-2xl font-bold font-display tracking-tight bg-transparent border-b-2 border-[var(--pg-accent-teal)] outline-none text-white w-full"
              />
              <button onClick={handleRename} className="p-1 text-[var(--pg-accent-green)] hover:opacity-80">
                <Check className="h-5 w-5" />
              </button>
              <button onClick={cancelRenaming} className="p-1 text-[var(--pg-text-dim)] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/name">
              <h1 className="text-2xl font-bold font-display tracking-tight">{displayName}</h1>
              <button
                onClick={startRenaming}
                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-[var(--pg-text-dim)] hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className="text-[var(--pg-text-dim)]">{deck.target_language}</span>
            <span className="text-[var(--pg-text-dim)]">&middot;</span>
            <span className="text-[var(--pg-text-dim)]">{completedCount}/{totalCount} ready</span>
            {isGenerating && (
              <span className="text-[var(--pg-accent-gold)] flex items-center gap-1 text-xs">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Generating...
              </span>
            )}
          </div>
          {isGenerating && (
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden max-w-md">
              <div
                className="h-full rounded-full bg-[var(--pg-accent-teal)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Carousel */}
      {words.length > 0 ? (
        <div className="flex flex-col items-center">
          <div
            {...bind()}
            className="relative w-full max-w-4xl h-[70vh] max-h-[620px] flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ perspective: '1200px', touchAction: 'none' }}
          >
            {/* Prev button */}
            {activeIndex > 0 && (
              <button
                onClick={() => setActiveIndex((i) => i - 1)}
                className="absolute left-0 z-20 p-3 rounded-full pg-glass hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <AnimatePresence mode="popLayout">
              {words.map((word, i) => {
                const offset = i - activeIndex
                if (Math.abs(offset) > 2) return null
                const isComplete = word.status === 'complete'

                return (
                  <motion.div
                    key={word.id}
                    className="absolute w-[92vw] max-w-[800px] h-[70vh] max-h-[600px]"
                    initial={false}
                    animate={{
                      x: offset * 200 + dragOffset,
                      scale: offset === 0 ? 1 : 0.85,
                      opacity: offset === 0 ? 1 : 0.4,
                      zIndex: 10 - Math.abs(offset),
                      rotateY: offset * -5,
                    }}
                    transition={dragOffset !== 0 ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <div
                      className={`w-full h-full bg-[#0d0d12] border border-white/5 rounded-2xl overflow-hidden relative ${
                        !isComplete ? 'opacity-50' : ''
                      }`}
                      style={{ pointerEvents: offset === 0 ? 'auto' : 'none' }}
                    >
                      {/* Media area — video or thumbnail */}
                      <div className="h-[60%] relative bg-black overflow-hidden">
                        {isComplete && playingIndex === i ? (
                          <>
                            <video
                              ref={videoRef}
                              src={word.video_url!}
                              autoPlay
                              playsInline
                              loop
                              className="w-full h-full object-contain"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setPlayingIndex(null)
                              }}
                              className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white z-10 hover:bg-black/80 transition-colors"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          </>
                        ) : isComplete && word.thumbnail_url ? (
                          <>
                            <img
                              src={word.thumbnail_url}
                              alt={word.word}
                              className="w-full h-full object-cover"
                            />
                            {offset === 0 && word.video_url && (
                              <div
                                className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPlayingIndex(i)
                                }}
                              >
                                <div className="h-14 w-14 rounded-full bg-[var(--pg-accent-teal)]/30 backdrop-blur-sm flex items-center justify-center border border-[var(--pg-accent-teal)]/50 shadow-[0_0_20px_rgba(13,226,195,0.3)]">
                                  <Play className="h-7 w-7 text-[var(--pg-accent-teal)] fill-[var(--pg-accent-teal)]" />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                            {isComplete ? (
                              <Play className="h-10 w-10 text-white/20" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4 flex flex-col justify-center h-[40%] bg-[#0d0d12]">
                        <p className="font-bold font-display text-lg">{word.word}</p>
                        {isComplete && word.translation ? (
                          <p className="text-sm text-[var(--pg-text-dim)] mt-1">{word.translation}</p>
                        ) : !isComplete ? (
                          <p className="text-xs text-[var(--pg-text-dim)] mt-1">
                            {word.status === 'failed' ? 'Failed' : 'Processing...'}
                          </p>
                        ) : null}
                        {isComplete && word.mnemonic && (
                          <p className="text-xs mt-2 italic line-clamp-2" style={{ color: 'var(--pg-text-dim)', opacity: 0.7 }}>
                            {word.mnemonic}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Next button */}
            {activeIndex < words.length - 1 && (
              <button
                onClick={() => setActiveIndex((i) => i + 1)}
                className="absolute right-0 z-20 p-3 rounded-full pg-glass hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Dots */}
          <div className="flex gap-1.5 mt-6 flex-wrap justify-center max-w-md">
            {words.map((word, i) => (
              <button
                key={word.id}
                onClick={() => setActiveIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex
                    ? 'w-6 bg-[var(--pg-accent-teal)]'
                    : word.status === 'complete'
                    ? 'w-1.5 bg-white/30'
                    : 'w-1.5 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="h-10 w-10 text-white/10 mb-4" />
          <p className="text-[var(--pg-text-dim)]">No words in this deck yet.</p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex justify-center pt-8">
        <button
          onClick={() => navigate(`/generate?deckId=${deck.id}`)}
          className="px-5 py-2.5 rounded-xl border border-[var(--pg-accent-teal)]/30 text-[var(--pg-accent-teal)] text-sm font-display font-medium hover:bg-[var(--pg-accent-teal)]/10 transition-all"
        >
          <Plus className="h-4 w-4 inline mr-1.5" />
          Add Cards
        </button>
      </div>
    </div>
  )
}
