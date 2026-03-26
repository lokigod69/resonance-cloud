import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
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
  _key?: string // React key for stack cycling — id stays as original
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
  const [cards, setCards] = useState(decks)
  const topDragX = useMotionValue(0)

  // Sync cards with decks when decks change (e.g. after generation)
  useEffect(() => {
    setCards(decks)
  }, [decks])

  const handleSwipe = useCallback(() => {
    topDragX.set(0)
    setCards((prev) => {
      const next = [...prev]
      const topCard = next.shift()
      if (topCard) next.push({ ...topCard, _key: topCard.id + '-' + Date.now() })
      return next
    })
  }, [topDragX])

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[400px] h-[550px]"
      >
        <AnimatePresence>
          {cards.map((deck, i) => {
            if (i > 3) return null
            const isTop = i === 0
            return (
              <StackCard
                key={deck._key || deck.id}
                deck={deck}
                index={i}
                isTop={isTop}
                topDragX={topDragX}
                onSwipe={handleSwipe}
                onClick={() => onSelect(deck.id)}
                wordCounts={wordCounts}
                thumbnails={thumbnails}
              />
            )
          })}
        </AnimatePresence>
      </motion.div>
      {/* Dots indicator */}
      <div className="flex gap-2 mt-6">
        {cards.slice(0, decks.length).map((deck, i) => (
          <div
            key={deck._key || deck.id}
            className={`h-2 rounded-full transition-all ${
              i === 0 ? 'bg-[var(--pg-accent-teal)] w-6' : 'bg-white/20 w-2'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Stack Card ─────────────────────────────────── */

interface StackCardProps {
  deck: Deck
  index: number
  isTop: boolean
  topDragX: ReturnType<typeof useMotionValue<number>>
  onSwipe: () => void
  onClick: () => void
  wordCounts: ViewProps['wordCounts']
  thumbnails: ViewProps['thumbnails']
}

function StackCard({ deck, index, isTop, topDragX, onSwipe, onClick, wordCounts, thumbnails }: StackCardProps) {
  const x = useMotionValue(0)
  const { counts, progress, flag, displayName } = getDeckMeta(deck, wordCounts)
  const thumb = thumbnails[deck.id]

  useEffect(() => {
    if (isTop) {
      const unsub = x.on('change', (v) => topDragX.set(v))
      return unsub
    }
  }, [isTop, x, topDragX])

  const rotate = useTransform(
    [x, topDragX],
    (latest: number[]) => {
      const [localX, parentDragX] = latest
      if (isTop) return (localX / 300) * 15
      if (index === 1) return (parentDragX / 300) * -8
      return 0
    }
  )

  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    setTimeout(() => setIsDragging(false), 50)
    if (Math.abs(info.offset.x) > 100) {
      onSwipe()
    }
  }

  return (
    <motion.div
      layout
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: index * 20,
        scale: 1 - index * 0.05,
        zIndex: 10 - index,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`absolute inset-0 bg-[#0d0d12] border border-white/5 rounded-2xl overflow-hidden cursor-pointer active:cursor-grabbing flex flex-col group shadow-[0_30px_60px_rgba(0,0,0,0.6)] ${!isTop ? 'pointer-events-none' : ''}`}
      style={{ x, rotate, touchAction: 'none', transformOrigin: 'bottom center' }}
      onClick={() => {
        if (isTop && !isDragging) onClick()
      }}
    >
      {/* Thumbnail - OPAQUE, full coverage */}
      <div className="h-[55%] w-full relative overflow-hidden bg-black/80">
        {thumb ? (
          <motion.img
            src={thumb}
            alt={displayName}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(13,226,195,0.1) 0%, #0d0d12 100%)' }}>
            <Sparkles className="h-10 w-10 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0d0d12]" />
        {!isTop && <div className="absolute inset-0 bg-black/60 z-50 transition-all duration-300 pointer-events-none" />}
      </div>

      {/* Content - SOLID background */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <p className="text-[var(--pg-accent-teal)] text-xs font-medium tracking-wide uppercase mb-2 font-display">
            {flag} {deck.target_language}
          </p>
          <h2 className="text-2xl font-light text-white font-display">{displayName}</h2>
        </div>
        <div className="flex justify-between items-end">
          <p className="text-[var(--pg-text-dim)] text-sm">{counts.total} Words</p>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--pg-accent-teal)]" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
        </div>
      </div>
    </motion.div>
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
  const orbs = useMemo(() => {
    const placed: { x: number; y: number; r: number }[] = []
    return decks.map((deck, i) => {
      let x = 0, y = 0, size = 0, isValid = false
      let attempts = 0
      while (!isValid && attempts < 150) {
        const radius = 60 + Math.random() * 220
        const angle = (i / decks.length) * Math.PI * 2 + Math.random() * 0.8
        x = Math.cos(angle) * radius
        y = Math.sin(angle) * radius
        size = 60 + Math.random() * 40
        const r = size / 2
        isValid = true
        for (const p of placed) {
          const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2))
          if (dist < p.r + r + 15) {
            isValid = false
            break
          }
        }
        attempts++
      }
      placed.push({ x, y, r: size / 2 })
      return { deck, x, y, size, index: i }
    })
  }, [decks])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full h-[600px] relative flex items-center justify-center"
    >
      {orbs.map((orb) => {
        const { flag, displayName } = getDeckMeta(orb.deck, wordCounts)
        const thumb = thumbnails[orb.deck.id]

        return (
          <motion.div
            key={orb.deck.id}
            onClick={() => onSelect(orb.deck.id)}
            className="absolute rounded-full overflow-hidden border border-white/10 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(13,226,195,0.4)] hover:border-[var(--pg-accent-teal)]/50 z-10 transition-colors"
            style={{ width: orb.size, height: orb.size }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: [orb.x - 10, orb.x + 10, orb.x - 10],
              y: [orb.y - 10, orb.y + 10, orb.y - 10],
              opacity: 1,
            }}
            transition={{
              x: { repeat: Infinity, duration: 4 + Math.random() * 4, ease: 'easeInOut' },
              y: { repeat: Infinity, duration: 5 + Math.random() * 4, ease: 'easeInOut' },
              opacity: { duration: 0.8, delay: orb.index * 0.05 },
            }}
            whileHover={{ scale: 1.1, zIndex: 50 }}
          >
            {thumb ? (
              <img src={thumb} alt={displayName} className="w-full h-full object-cover" style={{ mixBlendMode: 'screen', opacity: 0.8 }} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--pg-accent-teal)]/15 to-[var(--pg-accent-rose)]/10 flex items-center justify-center">
                <span className="text-2xl">{flag || '🎵'}</span>
              </div>
            )}
          </motion.div>
        )
      })}
      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, #0a0a0c 70%)' }} />
    </motion.div>
  )
}
