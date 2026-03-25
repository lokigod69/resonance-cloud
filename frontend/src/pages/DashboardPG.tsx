import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useDrag } from '@use-gesture/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Coins,
  Sparkles,
  Plus,
  AlertCircle,
  RefreshCw,
  LogIn,
  Layers,
  Grid3X3,
  Circle,
} from 'lucide-react'

type Deck = {
  id: string
  name: string | null
  target_language: string
  word_count: number
  status: string
  created_at: string
}

type WordStatus = {
  deck_id: string
  status: string
}

type ViewMode = 'stack' | 'grid' | 'orbs'

const LANGUAGE_FLAGS: Record<string, string> = {
  German: '🇩🇪',
  French: '🇫🇷',
  Italian: '🇮🇹',
  English: '🇬🇧',
  Bisaya: '🇵🇭',
}

export default function DashboardPG() {
  const { profile, user, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [decks, setDecks] = useState<Deck[]>([])
  const [wordCounts, setWordCounts] = useState<Record<string, { completed: number; total: number }>>({})
  const [deckThumbnails, setDeckThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('stack')

  const loadDecks = useCallback(async (userId: string) => {
    try {
      setDashboardError(null)
      setLoading(true)
      const { data: decksData, error: decksError } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (decksError) {
        console.error('[Dashboard] Failed to load decks:', decksError)
        setDashboardError('Failed to load your decks. Please try refreshing.')
        return
      }

      if (decksData) {
        setDecks(decksData)

        const deckIds = decksData.map((d) => d.id)
        if (deckIds.length > 0) {
          const { data: words, error: wordsError } = await supabase
            .from('words')
            .select('deck_id, status')
            .in('deck_id', deckIds)

          if (wordsError) {
            console.error('[Dashboard] Failed to load word statuses:', wordsError)
          }

          if (words) {
            const counts: Record<string, { completed: number; total: number }> = {}
            for (const w of words as WordStatus[]) {
              if (!counts[w.deck_id]) counts[w.deck_id] = { completed: 0, total: 0 }
              counts[w.deck_id].total++
              if (w.status === 'complete') counts[w.deck_id].completed++
            }
            setWordCounts(counts)
          }

          // Fetch first complete word thumbnail per deck
          const { data: thumbWords } = await supabase
            .from('words')
            .select('deck_id, thumbnail_url')
            .in('deck_id', deckIds)
            .eq('status', 'complete')
            .not('thumbnail_url', 'is', null)
            .order('created_at', { ascending: true })

          if (thumbWords) {
            const thumbs: Record<string, string> = {}
            for (const w of thumbWords as { deck_id: string; thumbnail_url: string }[]) {
              if (!thumbs[w.deck_id]) {
                thumbs[w.deck_id] = w.thumbnail_url
              }
            }
            setDeckThumbnails(thumbs)
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard] Unexpected error:', err)
      setDashboardError('Something went wrong. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadDecks(user.id)
  }, [user?.id, location.key, loadDecks])

  // Auth-level error states (same logic as original Dashboard)
  if (authError && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="pg-glass rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <LogIn className="h-10 w-10 text-[var(--pg-text-dim)]" />
          <h2 className="text-lg font-semibold font-display">Session expired</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{authError}</p>
          <Button asChild>
            <Link to="/login">Log in again</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (authError && user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="pg-glass rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertCircle className="h-10 w-10 text-[var(--pg-accent-gold)]" />
          <h2 className="text-lg font-semibold font-display">Profile failed to load</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{authError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="pg-glass rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertCircle className="h-10 w-10 text-[var(--pg-accent-rose)]" />
          <h2 className="text-lg font-semibold font-display">Something went wrong</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{dashboardError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--pg-accent-teal)] border-t-transparent animate-spin" />
          <p className="text-[var(--pg-text-dim)] text-sm font-display">Loading decks...</p>
        </div>
      </div>
    )
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6">
        <div className="w-20 h-20 rounded-full bg-[var(--pg-accent-teal)]/10 flex items-center justify-center border border-[var(--pg-accent-teal)]/30">
          <Sparkles className="h-10 w-10 text-[var(--pg-accent-teal)]" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold font-display mb-2">Create your first deck</h2>
          <p className="text-[var(--pg-text-dim)] max-w-sm">
            Choose a language, add some words, and watch AI create unique music videos for each one.
          </p>
        </div>
        <button
          onClick={() => navigate('/generate')}
          className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all shadow-[0_0_20px_rgba(13,226,195,0.2)]"
        >
          <Sparkles className="h-4 w-4 inline mr-2" />
          Generate
        </button>
      </div>
    )
  }

  return (
    <div className="px-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            Welcome back, {profile?.display_name || 'Learner'}
          </h1>
          <p className="text-[var(--pg-text-dim)] mt-1 text-sm">
            {decks.length} deck{decks.length !== 1 ? 's' : ''} &middot;{' '}
            <span className="inline-flex items-center gap-1">
              <Coins className="h-3 w-3" /> {profile?.credits ?? 0} credits
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex gap-1 pg-glass rounded-lg p-1">
            {([
              { mode: 'stack' as ViewMode, icon: Layers, label: 'Stack' },
              { mode: 'grid' as ViewMode, icon: Grid3X3, label: 'Grid' },
              { mode: 'orbs' as ViewMode, icon: Circle, label: 'Orbs' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-2 rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-white/10 text-white'
                    : 'text-[var(--pg-text-dim)] hover:text-white'
                }`}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/generate')}
            className="p-2.5 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/40 text-[var(--pg-accent-teal)] hover:bg-[var(--pg-accent-teal)]/30 transition-all"
            title="New Deck"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* View modes */}
      <AnimatePresence mode="wait">
        {viewMode === 'stack' && (
          <motion.div key="stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StackView
              decks={decks}
              wordCounts={wordCounts}
              thumbnails={deckThumbnails}
              onSelect={(id) => navigate(`/deck/${id}`)}
            />
          </motion.div>
        )}
        {viewMode === 'grid' && (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GridView
              decks={decks}
              wordCounts={wordCounts}
              thumbnails={deckThumbnails}
              onSelect={(id) => navigate(`/deck/${id}`)}
            />
          </motion.div>
        )}
        {viewMode === 'orbs' && (
          <motion.div key="orbs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OrbsView
              decks={decks}
              wordCounts={wordCounts}
              thumbnails={deckThumbnails}
              onSelect={(id) => navigate(`/deck/${id}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Shared props ───────────────────────────────── */

interface ViewProps {
  decks: Deck[]
  wordCounts: Record<string, { completed: number; total: number }>
  thumbnails: Record<string, string>
  onSelect: (id: string) => void
}

function getDeckMeta(deck: Deck, wordCounts: ViewProps['wordCounts']) {
  const counts = wordCounts[deck.id] || { completed: 0, total: deck.word_count }
  const progress = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
  const flag = LANGUAGE_FLAGS[deck.target_language] || ''
  const displayName =
    deck.name || `${deck.target_language} Deck — ${new Date(deck.created_at).toLocaleDateString()}`
  return { counts, progress, flag, displayName }
}

/* ─── Stack View ─────────────────────────────────── */

function StackView({ decks, wordCounts, thumbnails, onSelect }: ViewProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const bind = useDrag(
    ({ swipe: [swipeX], active }) => {
      if (active) return
      if (swipeX === -1 && activeIndex < decks.length - 1) {
        setActiveIndex((i) => i + 1)
      } else if (swipeX === 1 && activeIndex > 0) {
        setActiveIndex((i) => i - 1)
      }
    },
    { axis: 'x', swipe: { distance: 30, velocity: 0.1 } }
  )

  return (
    <div className="flex flex-col items-center">
      <div {...bind()} className="relative w-full max-w-md h-[360px] touch-pan-y" style={{ perspective: '1200px' }}>
        <AnimatePresence>
          {decks.map((deck, i) => {
            const offset = i - activeIndex
            if (Math.abs(offset) > 2) return null
            const { counts, progress, flag, displayName } = getDeckMeta(deck, wordCounts)
            const thumb = thumbnails[deck.id]

            return (
              <motion.div
                key={deck.id}
                className="absolute inset-0 cursor-pointer"
                style={{ transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{
                  z: -Math.abs(offset) * 60,
                  y: offset * 20,
                  scale: 1 - Math.abs(offset) * 0.08,
                  opacity: 1 - Math.abs(offset) * 0.3,
                  rotateX: offset * -2,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={() => {
                  if (offset === 0) onSelect(deck.id)
                  else setActiveIndex(i)
                }}
              >
                <div className="w-full h-full pg-glass rounded-2xl overflow-hidden relative">
                  {/* Thumbnail background */}
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--pg-accent-teal)]/10 to-transparent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-end p-6">
                    <p className="text-xs text-[var(--pg-text-dim)] mb-1 font-display">
                      {flag} {deck.target_language}
                    </p>
                    <h3 className="text-xl font-bold font-display mb-2">{displayName}</h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-[var(--pg-text-dim)]">{counts.total} words</span>
                      {deck.status !== 'complete' && (
                        <span className="text-[var(--pg-accent-gold)] text-xs">
                          {deck.status === 'generating' ? `Generating ${counts.completed}/${counts.total}` : deck.status}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--pg-accent-teal)] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      {/* Dots indicator */}
      <div className="flex gap-2 mt-6">
        {decks.map((deck, i) => (
          <button
            key={deck.id}
            onClick={() => setActiveIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === activeIndex ? 'bg-[var(--pg-accent-teal)] w-6' : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Grid View ──────────────────────────────────── */

function GridView({ decks, wordCounts, thumbnails, onSelect }: ViewProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck, i) => {
        const { counts, progress, flag, displayName } = getDeckMeta(deck, wordCounts)
        const thumb = thumbnails[deck.id]

        return (
          <motion.button
            key={deck.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(deck.id)}
            className="text-left pg-glass rounded-2xl overflow-hidden hover:shadow-[0_0_25px_rgba(13,226,195,0.15)] hover:border-[var(--pg-accent-teal)]/30 transition-all group"
          >
            {/* Thumbnail */}
            <div className="aspect-[16/9] relative bg-white/5 overflow-hidden">
              {thumb ? (
                <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--pg-accent-teal)]/5 to-transparent flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-white/10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold font-display text-sm mb-1 group-hover:text-[var(--pg-accent-teal)] transition-colors">
                {displayName}
              </h3>
              <p className="text-xs text-[var(--pg-text-dim)]">
                {flag} {deck.target_language} &middot; {counts.total} words
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--pg-accent-teal)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ─── Orbs View ──────────────────────────────────── */

function OrbsView({ decks, wordCounts, thumbnails, onSelect }: ViewProps) {
  return (
    <div className="flex flex-wrap gap-6 justify-center py-8">
      {decks.map((deck, i) => {
        const { counts, progress, flag, displayName } = getDeckMeta(deck, wordCounts)
        const thumb = thumbnails[deck.id]
        const size = 140 + Math.min(counts.total, 20) * 4

        return (
          <motion.button
            key={deck.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
            onClick={() => onSelect(deck.id)}
            className="relative group flex flex-col items-center gap-2"
          >
            <div
              className="rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[var(--pg-accent-teal)]/50 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] group-hover:shadow-[0_0_30px_rgba(13,226,195,0.2)]"
              style={{ width: size, height: size }}
            >
              {thumb ? (
                <img src={thumb} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--pg-accent-teal)]/15 to-[var(--pg-accent-rose)]/10 flex items-center justify-center">
                  <span className="text-3xl">{flag || '🎵'}</span>
                </div>
              )}
              {/* Progress ring overlay */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="var(--pg-accent-teal)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 3.02} 302`}
                  className="transition-all"
                />
              </svg>
            </div>
            <span className="text-xs font-display font-medium text-[var(--pg-text-dim)] group-hover:text-white transition-colors max-w-[120px] truncate">
              {displayName}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
