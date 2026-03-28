import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react'
import WordInfoPanel from '@/components/WordInfoPanel'
import VersionBadge from '@/components/VersionBadge'
import { useVideoVersion } from '@/hooks/useVideoVersion'

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
  video_url_b: string | null
  thumbnail_url_b: string | null
  metadata: Record<string, unknown> | null
}

export default function VideoPlayer() {
  const { id: deckId, wordId } = useParams<{ id: string; wordId: string }>()
  const navigate = useNavigate()

  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [videoKey, setVideoKey] = useState(0)

  useEffect(() => {
    if (!deckId) return
    async function load() {
      const { data } = await supabase
        .from('words')
        .select('id, word, translation, mnemonic, etymology, pos, article, rating, metadata, status, video_url, video_url_b, thumbnail_url_b')
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
  const { activeVideoUrl, version, toggleVersion, hasAltVersion } = useVideoVersion(current ?? { id: '', video_url: null, thumbnail_url: null })

  async function handleRate(wordId: string, rating: number) {
    await supabase
      .from('words')
      .update({ rating, rated_at: new Date().toISOString() })
      .eq('id', wordId)
    setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, rating } : w)))
  }

  const goTo = useCallback(
    (wId: string) => {
      navigate(`/deck/${deckId}/word/${wId}`, { replace: true })
      setVideoKey((k) => k + 1)
    },
    [deckId, navigate]
  )

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && prev) goTo(prev.id)
      if (e.key === 'ArrowRight' && next) goTo(next.id)
      if (e.key === 'Escape') navigate(`/deck/${deckId}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, goTo, navigate, deckId])

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
          <Link to={`/deck/${deckId}`}>Back to Deck</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 gradient-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/deck/${deckId}`)}
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
      <div className="flex-1 flex items-center justify-center px-4 pb-4 relative">
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
        <div className="w-full max-w-3xl space-y-6">
          {/* Video */}
          <div className="relative rounded-xl overflow-hidden bg-black/50 shadow-2xl">
            {activeVideoUrl ? (
              <video
                key={`${videoKey}-${version}`}
                src={`${activeVideoUrl}?t=${videoKey}`}
                controls
                autoPlay
                className="w-full aspect-video"
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-white/5">
                <p className="text-muted-foreground">No video available</p>
              </div>
            )}
            <VersionBadge
              version={version}
              hasAlt={hasAltVersion}
              onToggle={() => { toggleVersion(); setVideoKey(k => k + 1) }}
              className="absolute top-4 right-4"
            />
          </div>

          {/* Word info */}
          <WordInfoPanel word={current} onRate={handleRate} />

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
              onClick={() => navigate(`/deck/${deckId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deck
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
