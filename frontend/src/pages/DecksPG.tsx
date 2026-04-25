import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion'
import type { MotionValue, PanInfo } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { FlagIcon } from '@/components/ui/FlagIcon'
import {
  Sparkles,
  Plus,
  AlertCircle,
  RefreshCw,
  LogIn,
  Layers,
  Grid3X3,
  Circle,
  Waves,
  ChevronLeft,
  ChevronRight,
  Music,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type Deck = {
  id: string
  name: string | null
  target_language: string
  word_count: number
  status: string
  created_at: string
  _key?: string
}

type WordStatus = {
  deck_id: string
  status: string
}

type ViewMode = 'stack' | 'grid' | 'orbs' | 'water'

const WATER_DECK_SPACING = 256
const WATER_RENDER_BUFFER = 8
const WATER_VISUAL_RANGE = 4
const WATER_PRELOAD_RANGE = 8
const WATER_MAX_DRAG_JUMP = 2
const WATER_DRAG_SPRING = { type: 'spring' as const, stiffness: 360, damping: 34 }

function clampWaterPosition(position: number, maxIndex: number, fallback = 0) {
  const safePosition = Number.isFinite(position) ? position : fallback
  return Math.max(0, Math.min(safePosition, maxIndex))
}

export default function DecksPG() {
  const { user, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [decks, setDecks] = useState<Deck[]>([])
  const { t, tp } = useTranslation()

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
        console.error('[Decks] Failed to load decks:', decksError)
        setDashboardError(t('deckview.failedToLoad'))
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
            console.error('[Decks] Failed to load word statuses:', wordsError)
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
      console.error('[Decks] Unexpected error:', err)
      setDashboardError(t('common.somethingWentWrong'))
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

  if (authError && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <div className="pg-glass rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <LogIn className="h-10 w-10 text-[var(--pg-text-dim)]" />
          <h2 className="text-lg font-semibold font-display">{t('error.sessionExpired')}</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{authError}</p>
          <Button asChild>
            <Link to="/login">{t('dashboard.loginAgain')}</Link>
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
          <h2 className="text-lg font-semibold font-display">{t('error.profileFailed')}</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{authError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
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
          <h2 className="text-lg font-semibold font-display">{t('error.somethingWrong')}</h2>
          <p className="text-sm text-[var(--pg-text-dim)]">{dashboardError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ParticleSpinner preset="rose" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('dashboard.loadingDecks')}</p>
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
          <h2 className="text-2xl font-bold font-display mb-2">{t('dashboard.createFirst')}</h2>
          <p className="text-[var(--pg-text-dim)] max-w-sm">
            {t('dashboard.createFirstBody')}
          </p>
        </div>
        <button
          onClick={() => navigate('/generate')}
          className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all shadow-[0_0_20px_rgba(13,226,195,0.2)]"
        >
          <Sparkles className="h-4 w-4 inline mr-2" />
          {t('dashboard.generate')}
        </button>
      </div>
    )
  }

  return (
    <div className={viewMode === 'water' ? 'water-decks-page px-6' : 'px-6 max-w-6xl mx-auto'}>
      <div className={viewMode === 'water' ? 'water-decks-header max-w-6xl mx-auto' : ''}>
        <div className="decks-glass-header">
          <div className="decks-glass-title min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight truncate">
              {t('decks.title')}
            </h1>
            <p className="text-[var(--pg-text-dim)] mt-1 text-sm">
              {tp('dashboard.deckCount', decks.length)}
            </p>
          </div>
          <div className="decks-glass-actions">
            <div className="decks-view-toggle flex gap-1 pg-glass rounded-lg p-1">
              {([
                { mode: 'stack' as ViewMode, icon: Layers, label: t('dashboard.viewStack') },
                { mode: 'water' as ViewMode, icon: Waves, label: 'Water view' },
                { mode: 'grid' as ViewMode, icon: Grid3X3, label: t('dashboard.viewGrid') },
                { mode: 'orbs' as ViewMode, icon: Circle, label: t('dashboard.viewOrbs') },
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
              className="decks-glass-add p-2.5 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/40 text-[var(--pg-accent-teal)] hover:bg-[var(--pg-accent-teal)]/30 transition-all"
              title={t('dashboard.newDeck')}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

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
        {viewMode === 'water' && (
          <motion.div
            key="water"
            className="water-decks-fullbleed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WaterDecksView
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

function getDeckMeta(deck: Deck, wordCounts: ViewProps['wordCounts'], locale?: string) {
  const counts = wordCounts[deck.id] || { completed: 0, total: deck.word_count }
  const progress = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
  const dateLocale = locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : 'en-US'
  const displayName =
    deck.name || `${deck.target_language} Deck — ${new Date(deck.created_at).toLocaleDateString(dateLocale)}`
  return { counts, progress, displayName }
}

/* ─── Stack View ─────────────────────────────────── */

function StackView({ decks, wordCounts, thumbnails, onSelect }: ViewProps) {
  const [cards, setCards] = useState(decks)
  const topDragX = useMotionValue(0)

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
        className="relative w-full max-w-[400px] h-[480px] sm:h-[550px]"
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
  const { tp, locale } = useTranslation()
  const { counts, displayName } = getDeckMeta(deck, wordCounts, locale)
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
      if (index === 2) return (parentDragX / 300) * -3
      return 0
    }
  )
  const stackX = useTransform(topDragX, (v) => {
    if (isTop) return v
    const magnitude = Math.min(Math.abs(v), 300)
    const direction = v === 0 ? 0 : -Math.sign(v)
    if (index === 1) return direction * Math.min(magnitude * 0.23, 70)
    if (index === 2) return direction * Math.min(magnitude * 0.08, 24)
    return 0
  })
  const stackY = useTransform(topDragX, (v) => {
    const reveal = Math.min(Math.abs(v) / 300, 1)
    if (index === 1) return index * 20 - reveal * 8
    if (index === 2) return index * 20 - reveal * 4
    return index * 20
  })
  const stackScale = useTransform(topDragX, (v) => {
    if (isTop) return 1
    const reveal = Math.min(Math.abs(v) / 300, 1)
    const base = 1 - index * 0.05
    if (index === 1) return base + reveal * 0.035
    if (index === 2) return base + reveal * 0.015
    return base
  })

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
        zIndex: 10 - index,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`absolute inset-0 bg-[#0d0d12] border border-white/5 rounded-2xl overflow-hidden cursor-pointer active:cursor-grabbing flex flex-col group shadow-[0_30px_60px_rgba(0,0,0,0.6)] ${!isTop ? 'pointer-events-none' : ''}`}
      style={{ x: isTop ? x : stackX, y: stackY, scale: stackScale, rotate, touchAction: 'none', transformOrigin: 'bottom center' }}
      onClick={() => {
        if (isTop && !isDragging) onClick()
      }}
    >
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

      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <p className="text-[var(--pg-accent-teal)] text-xs font-medium tracking-wide uppercase mb-2 font-display">
            <FlagIcon code={deck.target_language} className="w-4 h-auto" /> {deck.target_language}
          </p>
          <h2 className="text-2xl font-light text-white font-display">{displayName}</h2>
        </div>
        <p className="text-[var(--pg-text-dim)] text-sm">{tp('dashboard.wordCount', counts.total)}</p>
      </div>
    </motion.div>
  )
}

/* ─── Grid View ──────────────────────────────────── */

function GridView({ decks, wordCounts, thumbnails, onSelect }: ViewProps) {
  const { tp, locale } = useTranslation()
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck, i) => {
        const { counts, displayName } = getDeckMeta(deck, wordCounts, locale)
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
                <FlagIcon code={deck.target_language} className="w-4 h-auto" /> {deck.target_language} &middot; {tp('dashboard.wordCount', counts.total)}
              </p>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

/* --- Water View --------------------------------------------------------- */

function WaterDecksView({ decks, wordCounts, thumbnails, onSelect }: ViewProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselPosition = useMotionValue(activeIndex)
  const [displayPosition, setDisplayPosition] = useState(activeIndex)
  const [isDragging, setIsDragging] = useState(false)
  const suppressClickRef = useRef(false)
  const positionAnimationRef = useRef<{ stop: () => void } | null>(null)
  const dragStartRef = useRef<{
    x: number
    y: number
    time: number
    lastX: number
    lastTime: number
    pointerId: number
    didDrag: boolean
    position: number
    velocityX: number
  } | null>(null)

  const maxIndex = Math.max(decks.length - 1, 0)

  const clampIndex = useCallback((index: number) => {
    return Math.round(clampWaterPosition(index, maxIndex))
  }, [maxIndex])

  const clampPosition = useCallback((position: number, fallback = activeIndex) => {
    return clampWaterPosition(position, maxIndex, fallback)
  }, [activeIndex, maxIndex])

  useEffect(() => {
    const clampedPosition = clampWaterPosition(carouselPosition.get(), maxIndex, activeIndex)
    carouselPosition.set(clampedPosition)
    setDisplayPosition(clampedPosition)
    setActiveIndex((index) => clampIndex(index))
  }, [activeIndex, carouselPosition, clampIndex, maxIndex])

  useEffect(() => {
    const unsubscribe = carouselPosition.on('change', (position) => {
      setDisplayPosition(clampPosition(position))
    })

    return unsubscribe
  }, [carouselPosition, clampPosition])

  useEffect(() => {
    return () => positionAnimationRef.current?.stop()
  }, [])

  const centerForBuffer = clampIndex(Math.round(displayPosition))

  useEffect(() => {
    const start = Math.max(0, centerForBuffer - WATER_PRELOAD_RANGE)
    const end = Math.min(maxIndex, centerForBuffer + WATER_PRELOAD_RANGE)

    for (let i = start; i <= end; i++) {
      const deck = decks[i]
      const thumb = deck ? thumbnails[deck.id] : undefined

      if (thumb) {
        const img = new Image()
        img.src = thumb
      }
    }
  }, [centerForBuffer, decks, maxIndex, thumbnails])

  const resetDragState = useCallback((delay = 0) => {
    window.setTimeout(() => {
      setIsDragging(false)
      suppressClickRef.current = false
    }, delay)
  }, [])

  const animateToIndex = useCallback((index: number) => {
    const targetIndex = clampIndex(index)
    const currentPosition = clampPosition(carouselPosition.get(), activeIndex)

    positionAnimationRef.current?.stop()
    suppressClickRef.current = Math.abs(targetIndex - currentPosition) > 0.01

    if (Math.abs(targetIndex - currentPosition) <= 0.001) {
      carouselPosition.set(targetIndex)
      setActiveIndex(targetIndex)
      setDisplayPosition(targetIndex)
      resetDragState(40)
      return
    }

    positionAnimationRef.current = animate(carouselPosition, targetIndex, {
      ...WATER_DRAG_SPRING,
      onComplete: () => {
        carouselPosition.set(targetIndex)
        setActiveIndex(targetIndex)
        setDisplayPosition(targetIndex)
        resetDragState(90)
      },
    })
  }, [activeIndex, carouselPosition, clampIndex, clampPosition, resetDragState])

  const snapToNearest = useCallback((velocityX = 0) => {
    const currentPosition = clampPosition(carouselPosition.get(), activeIndex)
    const speed = Math.abs(velocityX)
    const direction = velocityX < 0 ? 1 : velocityX > 0 ? -1 : 0
    let targetIndex = Math.round(currentPosition)

    if (direction !== 0 && speed > 620) {
      const velocityJump = Math.min(WATER_MAX_DRAG_JUMP, speed > 1500 ? 2 : 1)
      const velocityTarget = Math.round(currentPosition + direction * velocityJump)
      targetIndex = direction > 0
        ? Math.max(targetIndex, velocityTarget)
        : Math.min(targetIndex, velocityTarget)
    }

    animateToIndex(targetIndex)
  }, [activeIndex, animateToIndex, carouselPosition, clampPosition])

  const goPrevious = useCallback(() => {
    animateToIndex(Math.round(clampPosition(carouselPosition.get(), activeIndex)) - 1)
  }, [activeIndex, animateToIndex, carouselPosition, clampPosition])

  const goNext = useCallback(() => {
    animateToIndex(Math.round(clampPosition(carouselPosition.get(), activeIndex)) + 1)
  }, [activeIndex, animateToIndex, carouselPosition, clampPosition])

  const handleScrubPosition = useCallback((position: number) => {
    const nextPosition = clampPosition(position, activeIndex)
    positionAnimationRef.current?.stop()
    suppressClickRef.current = true
    carouselPosition.set(nextPosition)
    setDisplayPosition(nextPosition)
  }, [activeIndex, carouselPosition, clampPosition])

  const handleRailPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    positionAnimationRef.current?.stop()
    const now = performance.now()
    const startPosition = clampPosition(carouselPosition.get(), activeIndex)
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: now,
      lastX: event.clientX,
      lastTime: now,
      pointerId: event.pointerId,
      didDrag: false,
      position: startPosition,
      velocityX: 0,
    }
    suppressClickRef.current = false
  }, [activeIndex, carouselPosition, clampPosition])

  const handleRailPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    if (!start) return

    const rawOffsetX = event.clientX - start.x
    const offsetY = event.clientY - start.y
    const isHorizontalDrag = Math.abs(rawOffsetX) > 8 && Math.abs(rawOffsetX) > Math.abs(offsetY) * 0.65

    if (isHorizontalDrag || start.didDrag) {
      const now = performance.now()
      const elapsed = Math.max(now - start.lastTime, 1)
      start.didDrag = true
      start.velocityX = ((event.clientX - start.lastX) / elapsed) * 1000
      start.lastX = event.clientX
      start.lastTime = now
      setIsDragging(true)
      suppressClickRef.current = true
      event.preventDefault()
      if (!event.currentTarget.hasPointerCapture(start.pointerId)) {
        event.currentTarget.setPointerCapture(start.pointerId)
      }

      const nextPosition = clampPosition(start.position - rawOffsetX / WATER_DECK_SPACING, start.position)
      carouselPosition.set(nextPosition)
      setDisplayPosition(nextPosition)
    }
  }, [carouselPosition, clampPosition])

  const handleRailPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    if (!start) return

    dragStartRef.current = null
    if (event.currentTarget.hasPointerCapture(start.pointerId)) {
      event.currentTarget.releasePointerCapture(start.pointerId)
    }

    if (!start.didDrag) {
      resetDragState()
      return
    }

    const elapsed = Math.max(performance.now() - start.time, 1)
    const averageVelocityX = ((event.clientX - start.x) / elapsed) * 1000
    const velocityX = Math.abs(start.velocityX) > 1 ? start.velocityX : averageVelocityX
    snapToNearest(velocityX)
  }, [resetDragState, snapToNearest])

  const handleRailPointerCancel = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    dragStartRef.current = null
    if (start && event.currentTarget.hasPointerCapture(start.pointerId)) {
      event.currentTarget.releasePointerCapture(start.pointerId)
    }
    snapToNearest()
  }, [snapToNearest])

  const visibleDecks = decks
    .map((deck, index) => ({ deck, index, offset: index - centerForBuffer }))
    .filter(({ offset }) => Math.abs(offset) <= WATER_RENDER_BUFFER)

  const roundedDisplayIndex = clampIndex(Math.round(displayPosition))
  const scrubberProgress = maxIndex > 0 ? (displayPosition / maxIndex) * 100 : 0

  return (
    <div className="water-decks-stage">
      <div className="water-decks-haze" aria-hidden="true" />
      <div className="water-decks-horizon" aria-hidden="true" />
      <div className="water-decks-caustics" aria-hidden="true" />
      <div className="water-decks-floor" aria-hidden="true" />

      <motion.div
        className={`water-decks-rail ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={handleRailPointerDown}
        onPointerMove={handleRailPointerMove}
        onPointerUp={handleRailPointerUp}
        onPointerCancel={handleRailPointerCancel}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="water-decks-halo-layer" aria-hidden="true">
          {visibleDecks.map(({ index }) => (
            <WaterDeckHalo key={`halo-${index}`} index={index} carouselPosition={carouselPosition} />
          ))}
        </div>
        {visibleDecks.map(({ deck, index, offset }) => (
          <WaterDeckCard
            key={deck.id}
            deck={deck}
            index={index}
            isActive={roundedDisplayIndex === index}
            isFar={Math.abs(offset) > WATER_VISUAL_RANGE}
            wordCounts={wordCounts}
            thumbnails={thumbnails}
            carouselPosition={carouselPosition}
            onClick={() => {
              if (isDragging || suppressClickRef.current) return
              const centeredIndex = clampIndex(Math.round(carouselPosition.get()))
              if (centeredIndex === index) {
                onSelect(deck.id)
              } else {
                animateToIndex(index)
              }
            }}
          />
        ))}
      </motion.div>

      <div className="water-decks-controls">
        <button
          type="button"
          className="water-decks-arrow water-decks-arrow-inline water-decks-arrow-left"
          onClick={goPrevious}
          disabled={displayPosition <= 0.001}
          aria-label="Previous deck"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          className="water-decks-scrubber-wrap"
          aria-label={`Deck ${roundedDisplayIndex + 1} of ${decks.length}`}
          style={{ '--water-scrubber-progress': `${scrubberProgress}%` } as CSSProperties}
        >
          <span>{roundedDisplayIndex + 1}</span>
          <input
            className="water-decks-scrubber"
            type="range"
            min={0}
            max={maxIndex}
            step={0.01}
            value={displayPosition}
            onInput={(event) => handleScrubPosition(Number(event.currentTarget.value))}
            onChange={(event) => handleScrubPosition(Number(event.currentTarget.value))}
            onPointerUp={() => snapToNearest()}
            onPointerCancel={() => snapToNearest()}
            onBlur={() => snapToNearest()}
            aria-label="Browse decks"
          />
          <span>{decks.length}</span>
        </div>

        <button
          type="button"
          className="water-decks-arrow water-decks-arrow-inline water-decks-arrow-right"
          onClick={goNext}
          disabled={displayPosition >= maxIndex - 0.001}
          aria-label="Next deck"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

interface WaterDeckCardProps {
  deck: Deck
  index: number
  isActive: boolean
  isFar: boolean
  wordCounts: ViewProps['wordCounts']
  thumbnails: ViewProps['thumbnails']
  carouselPosition: MotionValue<number>
  onClick: () => void
}

function WaterDeckCard({ deck, index, isActive, isFar, wordCounts, thumbnails, carouselPosition, onClick }: WaterDeckCardProps) {
  const { tp, locale } = useTranslation()
  const { counts, displayName } = getDeckMeta(deck, wordCounts, locale)
  const thumb = thumbnails[deck.id]
  const isGenerating = deck.status === 'generating'
  const virtualOffset = useTransform(carouselPosition, (position) => index - (Number.isFinite(position) ? position : 0))
  const virtualDistance = useTransform(virtualOffset, (value) => Math.min(Math.abs(value), WATER_VISUAL_RANGE))
  const cardX = useTransform(virtualOffset, (value) => value * WATER_DECK_SPACING)
  const cardY = useTransform(virtualDistance, [0, 1, 2, 3, 4], [0, 22, 42, 58, 68])
  const cardScale = useTransform(virtualDistance, [0, 1, 2, 3, 4], [1, 0.78, 0.62, 0.45, 0.35])
  const cardOpacity = useTransform(virtualDistance, [0, 1, 2, 3, 4], [1, 0.78, 0.34, 0.08, 0])
  const rotateY = useTransform(virtualOffset, (value) => value * -24)
  const rotateZ = useTransform(virtualOffset, (value) => value * -1.8)
  const zIndex = useTransform(virtualDistance, (value) => Math.round(80 - value * 10))

  return (
    <motion.button
      type="button"
      className={`water-deck-card ${isActive ? 'water-deck-card-active' : ''} ${isFar ? 'water-deck-card-far' : ''}`}
      onClick={onClick}
      style={{
        x: cardX,
        y: cardY,
        scale: cardScale,
        opacity: cardOpacity,
        rotateY,
        rotateZ,
        zIndex,
      }}
      aria-label={isActive ? `Open ${displayName}` : `Focus ${displayName}`}
    >
      <div className="water-deck-card-shell">
        <div className="water-deck-rim" aria-hidden="true" />
        <div className="water-deck-image">
          <WaterDeckArtwork
            deck={deck}
            displayName={displayName}
            isGenerating={isGenerating}
            thumbnail={thumb}
          />
          <div className="water-deck-image-shade" />
        </div>

        <div className="water-deck-copy">
          <p className="water-deck-language">
            <FlagIcon code={deck.target_language} className="w-4 h-auto" />
            <span>{deck.target_language}</span>
          </p>
          <h2>{displayName}</h2>
          <p className="water-deck-count">
            {tp('dashboard.wordCount', counts.total)}
            {deck.status !== 'complete' ? <span>{deck.status}</span> : null}
          </p>
        </div>
      </div>
    </motion.button>
  )
}

interface WaterDeckHaloProps {
  index: number
  carouselPosition: MotionValue<number>
}

function WaterDeckHalo({ index, carouselPosition }: WaterDeckHaloProps) {
  const virtualOffset = useTransform(carouselPosition, (position) => index - (Number.isFinite(position) ? position : 0))
  const virtualDistance = useTransform(virtualOffset, (value) => Math.min(Math.abs(value), WATER_VISUAL_RANGE))
  const x = useTransform(virtualOffset, (value) => value * WATER_DECK_SPACING)
  const opacity = useTransform(virtualDistance, [0, 1, 2, 3, 4], [0.52, 0.26, 0.1, 0.02, 0])
  const scale = useTransform(virtualDistance, [0, 1, 2, 3, 4], [1, 0.72, 0.48, 0.24, 0.18])

  return (
    <motion.div
      className="water-deck-halo"
      style={{ x, opacity, scale }}
    />
  )
}

interface WaterDeckArtworkProps {
  deck: Deck
  displayName: string
  isGenerating: boolean
  thumbnail?: string
  reflection?: boolean
}

function WaterDeckArtwork({ deck, displayName, isGenerating, thumbnail, reflection = false }: WaterDeckArtworkProps) {
  const Icon = isGenerating ? Sparkles : Music

  if (thumbnail) {
    return <img src={thumbnail} alt={reflection ? '' : displayName} />
  }

  return (
    <div className="water-deck-fallback">
      <div className="water-deck-fallback-caustics" aria-hidden="true" />
      <div className="water-deck-fallback-icon">
        <Icon className="h-9 w-9" />
      </div>
      <div className="water-deck-fallback-meta">
        <FlagIcon code={deck.target_language} className="w-6 h-auto" />
        <span>{deck.target_language}</span>
      </div>
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
        const maxRadius = typeof window !== 'undefined' ? Math.min(280, (window.innerWidth - 80) / 2) : 280
        const radius = 60 + Math.random() * (maxRadius - 60)
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
      className="orbs-decks-stage"
    >
      <div className="orbs-decks-atmosphere" aria-hidden="true" />
      {orbs.map((orb) => {
        const { displayName } = getDeckMeta(orb.deck, wordCounts)
        const thumb = thumbnails[orb.deck.id]

        return (
          <motion.div
            key={orb.deck.id}
            onClick={() => onSelect(orb.deck.id)}
            className="orbs-deck-orb absolute rounded-full overflow-hidden border border-white/10 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(13,226,195,0.4)] hover:border-[var(--pg-accent-teal)]/50 z-10 transition-colors"
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
                <FlagIcon code={orb.deck.target_language} className="w-8 h-auto" />
              </div>
            )}
          </motion.div>
        )
      })}
    </motion.div>
  )
}
