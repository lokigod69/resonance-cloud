import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Play, AlertCircle, Sparkles } from 'lucide-react'

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

export default function DeckView() {
  const { id } = useParams<{ id: string }>()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)

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
            <Skeleton key={i} className="aspect-square rounded-xl bg-white/10" />
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

  const displayName =
    deck.name ||
    `${deck.target_language} Deck — ${new Date(deck.created_at).toLocaleDateString()}`

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
          <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
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
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {words.map((word) => {
          const isComplete = word.status === 'complete'
          const isFailed = word.status === 'failed'
          const isPending = word.status === 'pending' || word.status === 'processing'

          return (
            <div key={word.id} className="relative group">
              {isComplete ? (
                <Link
                  to={`/deck/${deck.id}/word/${word.id}`}
                  className="block glass glass-hover rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:glow-purple"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square relative bg-white/5">
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
                </Link>
              ) : isFailed ? (
                <div className="glass rounded-xl overflow-hidden opacity-50">
                  <div className="aspect-square flex items-center justify-center bg-destructive/5">
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
                  <div className="aspect-square flex items-center justify-center">
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

      {/* Footer actions */}
      <div className="flex justify-center pt-4">
        <Button asChild variant="outline" className="border-white/10">
          <Link to="/generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Create Another Deck
          </Link>
        </Button>
      </div>
    </div>
  )
}
