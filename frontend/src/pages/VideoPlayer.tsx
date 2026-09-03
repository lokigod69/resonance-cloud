import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react'
import WordInfoPanel from '@/components/WordInfoPanel'
import { safeInternalPath } from '@/lib/safeInternalPath'

type Word = {
  id: string
  word: string
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  rating: number | null
  status: string
  video_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  suno_task_id: string | null
  metadata: Record<string, unknown> | null
}

export default function VideoPlayer() {
  const { id: deckId, wordId } = useParams<{ id: string; wordId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawReturnTo = searchParams.get('returnTo')
  const returnTo = rawReturnTo ? safeInternalPath(rawReturnTo, '') || null : null
  const returnMode = searchParams.get('returnMode')
  const returnLang = searchParams.get('returnLang')
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [videoKey, setVideoKey] = useState(0)
  const [videoMuted, setVideoMuted] = useState(true)

  useEffect(() => {
    if (!deckId) return
    async function load() {
      const { data } = await supabase
        .from('words')
        .select('id, word, word_slug, translation, mnemonic, etymology, pos, article, rating, metadata, status, video_url, video_url_b, thumbnail_url_b, suno_task_id')
        .eq('deck_id', deckId)
        .eq('status', 'complete')
        .order('created_at')
      if (data) setWords(data)
      setLoading(false)
    }
    load()
  }, [deckId])

  const currentIndex = words.findIndex((w) => w.id === wordId)
  const current = currentIndex >= 0 ? words[currentIndex] : null
  const prev = currentIndex > 0 ? words[currentIndex - 1] : null
  const next = currentIndex < words.length - 1 ? words[currentIndex + 1] : null
  // Dashboard quick preview uses the primary A video; A/B switching stays in Decks.
  const activeVideoUrl = current?.video_url ?? null
  const isDashboardWordModalReturn = returnMode === 'wordModal' && returnTo === '/dashboard'

  async function handleRate(wordId: string, rating: number) {
    const { error } = await supabase.rpc('rate_word', {
      p_word_id: wordId,
      p_rating: rating,
    })
    if (!error) {
      setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, rating } : w)))
    }
  }

  const buildWordVideoPath = useCallback(
    (wId: string) => {
      const params = new URLSearchParams()
      if (returnTo) params.set('returnTo', returnTo)
      if (returnMode) params.set('returnMode', returnMode)
      if (returnLang) params.set('returnLang', returnLang)
      const query = params.toString()
      return `/deck/${deckId}/word/${wId}${query ? `?${query}` : ''}`
    },
    [deckId, returnLang, returnMode, returnTo]
  )

  const getCloseTarget = useCallback(
    (currentWordId?: string | null) => {
      if (isDashboardWordModalReturn && currentWordId) {
        const params = new URLSearchParams()
        params.set('word', currentWordId)
        if (returnLang) params.set('lang', returnLang)
        return `/dashboard?${params.toString()}`
      }
      return returnTo || `/deck/${deckId}`
    },
    [deckId, isDashboardWordModalReturn, returnLang, returnTo]
  )

  const closeVideo = useCallback(() => {
    navigate(getCloseTarget(current?.id ?? wordId), { replace: true })
  }, [current?.id, getCloseTarget, navigate, wordId])

  const goTo = useCallback(
    (wId: string) => {
      navigate(buildWordVideoPath(wId), { replace: true })
      setVideoKey((k) => k + 1)
    },
    [buildWordVideoPath, navigate]
  )

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && prev) goTo(prev.id)
      if (e.key === 'ArrowRight' && next) goTo(next.id)
      if (e.key === 'Escape') closeVideo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, goTo, closeVideo])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Skeleton className="w-full max-w-3xl aspect-video rounded-xl bg-white/10" />
      </div>
    )
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-muted-foreground mb-4">Video not found</p>
        <Button asChild variant="ghost">
          <Link to={getCloseTarget(wordId)} replace>Back</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 gradient-bg flex flex-col pt-[var(--app-safe-top)] pb-[var(--app-safe-bottom)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={closeVideo}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </span>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Video area */}
      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-start px-4 pb-[calc(var(--app-safe-bottom)+1rem)] relative">
        {/* Prev button */}
        {prev && (
          <button
            onClick={() => goTo(prev.id)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
            title={prev.word}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Main content */}
        <div className="w-full max-w-3xl space-y-6 py-4">
          {/* Video */}
          <div className="relative rounded-xl overflow-hidden bg-black/50 shadow-2xl">
            {activeVideoUrl ? (
              <>
                <video
                  key={videoKey}
                  src={`${activeVideoUrl}?t=${videoKey}`}
                  controls
                  autoPlay
                  playsInline
                  muted={videoMuted}
                  className="w-full aspect-video"
                />
                {videoMuted && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setVideoMuted(false)}
                    className="absolute right-3 top-3 bg-black/70 text-white hover:bg-black/80"
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Unmute
                  </Button>
                )}
              </>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-white/5">
                <p className="text-muted-foreground">No video available</p>
              </div>
            )}
          </div>

          {/* Word info */}
          <WordInfoPanel
            word={current}
            onRate={handleRate}
          />

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVideoKey((k) => k + 1)}
              className="border-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Replay
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeVideo}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {returnTo ? 'Back' : 'Back to Deck'}
            </Button>
          </div>

          {/* Nav hints */}
          <div className="flex items-center justify-between text-xs text-muted-foreground/50 px-8">
            <span>{prev ? `← ${prev.word}` : ''}</span>
            <span>{next ? `${next.word} →` : ''}</span>
          </div>
        </div>

        {/* Next button */}
        {next && (
          <button
            onClick={() => goTo(next.id)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
            title={next.word}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  )
}
