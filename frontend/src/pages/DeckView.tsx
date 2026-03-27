import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Play, Pause, AlertCircle, Sparkles, Pencil, Plus, Check, X, ChevronLeft, ChevronRight, RotateCcw, Maximize } from 'lucide-react'
import WordInfoPanel from '@/components/WordInfoPanel'

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
  etymology: string | null
  pos: string | null
  article: string | null
  rating: number | null
  status: string
  video_url: string | null
  thumbnail_url: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export default function DeckView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameTo, setRenameTo] = useState('')
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [videoKey, setVideoKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/10" />
        <Skeleton className="h-4 w-48 bg-white/10" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl bg-white/10" />
          ))}
        </div>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold">Deck not found</h2>
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
  const completeWords = words.filter((w) => w.status === 'complete')
  const viewerWord = completeWords[viewerIndex]

  const displayName =
    deck.name ||
    `${deck.target_language} Deck — ${new Date(deck.created_at).toLocaleDateString()}`

  async function handleRate(wordId: string, rating: number) {
    await supabase
      .from('words')
      .update({ rating, rated_at: new Date().toISOString() })
      .eq('id', wordId)
    setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, rating } : w)))
  }

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
      setDeck((prev) => prev ? { ...prev, name: trimmed } : prev)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button asChild variant="ghost" size="icon" className="mt-1">
          <Link to="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 space-y-2">
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
                className="text-2xl font-bold tracking-tight bg-transparent border-b-2 border-primary outline-none text-foreground w-full"
              />
              <Button variant="ghost" size="icon" onClick={handleRename} className="shrink-0">
                <Check className="h-4 w-4 text-green-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={cancelRenaming} className="shrink-0">
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/name">
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <button
                onClick={startRenaming}
                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                title="Rename deck"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">{deck.target_language}</span>
            {isGenerating ? (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                Generating — {completedCount} of {totalCount}
              </Badge>
            ) : deck.status === 'complete' ? (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                Ready
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                Partial ({completedCount}/{totalCount})
              </Badge>
            )}
          </div>
          {isGenerating && (
            <Progress value={progress} className="h-2 max-w-md" />
          )}
        </div>
      </div>

      {/* Word Grid */}
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 justify-items-center">
        {words.map((word) => {
          const isComplete = word.status === 'complete'
          const isFailed = word.status === 'failed'
          const isPending = word.status === 'pending' || word.status === 'processing'

          return (
            <div key={word.id} className="relative group w-full max-w-[280px]">
              {isComplete ? (
                <div
                  onClick={() => {
                    const idx = completeWords.findIndex(w => w.id === word.id)
                    if (idx >= 0) {
                      setViewerIndex(idx)
                      setVideoKey(k => k + 1)
                      setViewerOpen(true)
                    }
                  }}
                  className="block glass glass-hover rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:glow-purple cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video relative bg-white/5">
                    {word.thumbnail_url ? (
                      <img
                        src={word.thumbnail_url}
                        alt={word.word}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Play className="h-8 w-8 text-primary/50" />
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3 space-y-0.5">
                    <p className="font-semibold text-sm truncate">{word.word}</p>
                    {word.translation && (
                      <p className="text-xs text-muted-foreground truncate">{word.translation}</p>
                    )}
                  </div>
                </div>
              ) : isFailed ? (
                <div className="glass rounded-xl overflow-hidden opacity-50">
                  <div className="aspect-video flex items-center justify-center bg-destructive/5">
                    <AlertCircle className="h-8 w-8 text-destructive-foreground/50" />
                  </div>
                  <div className="p-3 space-y-0.5">
                    <p className="font-semibold text-sm truncate">{word.word}</p>
                    <p className="text-xs text-destructive-foreground">Could not generate</p>
                  </div>
                </div>
              ) : (
                /* Pending / Processing */
                <div className="glass rounded-xl overflow-hidden">
                  <div className="aspect-video flex items-center justify-center">
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                      <Skeleton className="h-3 w-16 bg-white/10" />
                    </div>
                  </div>
                  <div className="p-3 space-y-0.5">
                    <p className="font-semibold text-sm truncate">{word.word}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPending ? 'Queued' : 'Processing...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>

      {/* Footer actions */}
      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => navigate(`/generate?deckId=${deck.id}`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Cards
        </Button>
      </div>

      {/* Video Viewer Modal */}
      {viewerOpen && viewerWord && (
        <VideoViewerModal
          words={completeWords}
          currentIndex={viewerIndex}
          videoKey={videoKey}
          videoRef={videoRef}
          onClose={() => setViewerOpen(false)}
          onNavigate={(idx) => {
            setViewerIndex(idx)
            setVideoKey(k => k + 1)
          }}
          onReplay={() => setVideoKey(k => k + 1)}
          onRate={handleRate}
        />
      )}
    </div>
  )
}

function VideoViewerModal({
  words,
  currentIndex,
  videoKey,
  videoRef,
  onClose,
  onNavigate,
  onReplay,
  onRate,
}: {
  words: Word[]
  currentIndex: number
  videoKey: number
  videoRef: React.RefObject<HTMLVideoElement | null>
  onClose: () => void
  onNavigate: (idx: number) => void
  onReplay: () => void
  onRate: (wordId: string, rating: number) => void
}) {
  const word = words[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < words.length - 1
  const [isPlaying, setIsPlaying] = useState(true)

  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) {
      vid.play()
      setIsPlaying(true)
    } else {
      vid.pause()
      setIsPlaying(false)
    }
  }, [videoRef])

  // Reset playing state when navigating to a new word
  useEffect(() => {
    setIsPlaying(true)
  }, [currentIndex])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
      if (e.key === ' ') { e.preventDefault(); togglePlayPause() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, currentIndex, hasPrev, hasNext, togglePlayPause])

  if (!word) return null

  return (
    <div className="fixed inset-0 z-50 gradient-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </span>
        <div className="w-10" />
      </div>

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4">
        {/* Main content */}
        <div className="w-full max-w-3xl space-y-6">
          {/* Video container with arrows */}
          <div className="relative rounded-xl overflow-hidden bg-black/50 shadow-2xl">
            {/* Prev arrow — centered on video */}
            {hasPrev && (
              <button
                onClick={() => onNavigate(currentIndex - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next arrow — centered on video */}
            {hasNext && (
              <button
                onClick={() => onNavigate(currentIndex + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
            {word.video_url ? (
              <video
                ref={videoRef}
                key={videoKey}
                src={`${word.video_url}?t=${videoKey}`}
                autoPlay
                playsInline
                loop
                onClick={togglePlayPause}
                className="w-full aspect-video cursor-pointer"
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-white/5">
                <p className="text-muted-foreground">No video available</p>
              </div>
            )}

            {/* Play/Pause overlay button */}
            {word.video_url && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlayPause() }}
                  className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white z-20 hover:bg-black/80 transition-colors"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (document.fullscreenElement) {
                      document.exitFullscreen()
                    } else {
                      videoRef.current?.requestFullscreen()
                    }
                  }}
                  className="absolute bottom-4 left-20 w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white z-20 hover:bg-black/80 transition-colors"
                >
                  <Maximize className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Word info */}
          <WordInfoPanel word={word} onRate={onRate} />

          {/* Replay */}
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onReplay}
              className="border-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Replay
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
