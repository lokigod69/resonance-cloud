import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import CardGenerationProgress from '@/components/CardGenerationProgress'
import QueuePositionDisplay from '@/components/QueuePositionDisplay'
import { supabase } from '@/lib/supabase'
import { useDrag } from '@use-gesture/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { GenerationWheelLoader } from '@/components/ui/GenerationWheelLoader'
import {
  ArrowLeft,
  Play,
  AlertCircle,
  Sparkles,
  Pencil,
  Plus,
  BookOpen,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  Share2,
  PencilLine,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { useMoveWords } from '@/hooks/useMoveWords'
import DeckPickerSheet from '@/components/deck/DeckPickerSheet'
import StarRating from '@/components/ui/StarRating'
import VersionBadge from '@/components/VersionBadge'
import { useAuth } from '@/hooks/useAuth'
import { useVideoVersion } from '@/hooks/useVideoVersion'
import { useVideoVolume } from '@/hooks/useVideoVolume'
import { VideoControls } from '@/components/VideoControls'
import { VolumeControl } from '@/components/VolumeControl'
import { useToast } from '@/components/Toast'
import { useQueuePosition } from '@/hooks/useQueuePosition'
import { VerbCycler } from '@/components/ui/VerbCycler'
import { useTranslation } from '@/hooks/useTranslation'
import { usePronunciation } from '@/hooks/usePronunciation'
import { getOrCreateShareLink } from '@/lib/shareWord'
import { shouldUseGlobalQueuePosition, summarizeCardGenerationProgress } from '@/lib/cardGenerationProgress'
import { resolveCardLearningMetadata } from '@/lib/wordDisplayMetadata'
import { getDeckLanguageLabel } from '@/lib/i18nDisplay'

type Deck = {
  id: string
  name: string | null
  target_language: string
  word_count: number
  status: string
  art_style: string | null
  created_at: string
  deck_type?: 'video' | 'card'
}

type Word = {
  id: string
  word: string
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  example?: string | null
  example_gloss?: string | null
  bridge_mnemonic?: string | null
  dominant_emotional_reading?: string | null
  composition_hint?: string | null
  treatment_hint?: string | null
  card_image_model?: string | null
  rating: number | null
  status: string
  video_url: string | null
  thumbnail_url: string | null
  tts_audio_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  suno_storage_url: string | null
  suno_storage_url_b: string | null
  suno_audio_url: string | null
  suno_audio_url_b: string | null
  suno_task_id: string | null
  metadata: Record<string, unknown> | null
  current_stage?: string | null
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

  const { user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { t, locale } = useTranslation()
  const { playWord } = usePronunciation()
  const globalQueueEnabled = shouldUseGlobalQueuePosition(deck)
  const { jobsAhead, queuePaused, hasChecked, shouldShowQueue } = useQueuePosition(id, {
    enabled: !!id && globalQueueEnabled,
  })
  const [retrying, setRetrying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [deletingDeck, setDeletingDeck] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  // ── Edit mode state ──
  const [editMode, setEditMode] = useState(false)
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [showDeckPicker, setShowDeckPicker] = useState(false)
  const { moveWords, moving } = useMoveWords(id!)

  const handleRetry = async (word: Word) => {
    if (!user) return
    setRetrying(word.id)
    try {
      const { data, error } = await supabase.rpc('request_word_retry', {
        p_word_id: word.id,
        p_retry_scope: 'word',
      })
      if (error) throw error

      const result = data as { success?: boolean; already_requested?: boolean; error?: string } | null
      if (!result?.success) {
        if (result?.error?.toLowerCase().includes('credit')) {
          toast(t('deckview.noCredits'), 'error')
          return
        }
        throw new Error(result?.error || 'Retry request failed')
      }
      if (result.already_requested) {
        toast(t('deckview.retryAlreadyRequested'), 'info')
        return
      }

      await refreshProfile()
      const { data: refreshedWords, error: refreshError } = await supabase
        .from('words')
        .select('*')
        .eq('deck_id', id)
        .order('created_at')
      if (refreshError) throw refreshError
      if (refreshedWords) setWords(refreshedWords)
      toast(t('deckview.retryingGeneration'), 'success')
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('credit')) {
        toast(t('deckview.noCredits'), 'error')
        return
      }
      toast(t('deckview.retryFailed'), 'error')
    } finally {
      setRetrying(null)
    }
  }

  const handleDeleteWord = async (word: Word) => {
    if (!confirm(t('deckview.confirmRemove', { word: word.word }))) return
    setDeleting(word.id)
    try {
      const { data, error } = await supabase.rpc('archive_word', {
        p_word_id: word.id,
      })
      if (error) throw error

      const result = data as { deck?: Pick<Deck, 'word_count' | 'status'> } | null
      const remaining = words.filter(w => w.id !== word.id)
      setWords(remaining)
      if (result?.deck) {
        setDeck((prev) => prev ? { ...prev, ...result.deck } : prev)
      }
      toast(t('deckview.wordRemoved'), 'success')
    } catch {
      toast(t('deckview.removeFailed'), 'error')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteDeck = async () => {
    if (!deck || !confirm(t('deckview.confirmDeleteDeck'))) return
    setDeletingDeck(true)
    try {
      // Safety guard: verify deck is actually empty
      const { count, error: countError } = await supabase
        .from('words')
        .select('id', { count: 'exact', head: true })
        .eq('deck_id', deck.id)
      if (countError) {
        toast(t('deckview.deleteError'), 'error')
        return
      }
      if (count && count > 0) {
        toast(t('deckview.deckNotEmpty'), 'error')
        return
      }
      const { error } = await supabase.rpc('archive_deck', {
        p_deck_id: deck.id,
      })
      if (error) {
        toast(t('deckview.deleteError'), 'error')
        return
      }
      toast(t('deckview.deckDeleted'), 'success')
      navigate('/dashboard')
    } catch {
      toast(t('deckview.deleteError'), 'error')
    } finally {
      setDeletingDeck(false)
    }
  }

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
  }, [deck, fetchData])

  // Keep activeIndex in bounds when words update
  useEffect(() => {
    if (activeIndex >= words.length && words.length > 0) {
      setActiveIndex(words.length - 1)
    }
  }, [words.length, activeIndex])

  // Pause video and reset playback state when entering edit mode
  useEffect(() => {
    if (editMode) {
      videoRef.current?.pause()
      setIsPlaying(false)
      setVideoActiveIndex(null)
    }
  }, [editMode])

  const [infoCollapsed, setInfoCollapsed] = useState(false)
  const [videoActiveIndex, setVideoActiveIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const activeWord = words[activeIndex] ?? { id: '', video_url: null, thumbnail_url: null }
  const { activeVideoUrl, activeThumbnailUrl, version, toggleVersion, hasAltVersion } = useVideoVersion(activeWord)
  const { volume, isMuted, setVolume, toggleMute } = useVideoVolume(videoRef, false)

  // Pause video when navigating to a different card
  useLayoutEffect(() => {
    const video = videoRef.current
    return () => {
      video?.pause()
    }
  }, [activeIndex])

  // Pause video on page leave
  useEffect(() => {
    const video = videoRef.current
    return () => {
      video?.pause()
    }
  }, [])

  // Auto-play next card when swiping while video was active
  const videoActiveRef = useRef(videoActiveIndex)
  videoActiveRef.current = videoActiveIndex
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  useEffect(() => {
    if (videoActiveRef.current !== null) {
      setVideoActiveIndex(activeIndex)
      setIsPlaying(isPlayingRef.current)
    }
  }, [activeIndex])

  // Play/pause video when isPlaying, videoActiveIndex, or version changes
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (isPlaying) {
      vid.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Video play failed:', err.message)
        }
      })
    } else {
      vid.pause()
    }
  }, [isPlaying, videoActiveIndex, version])

  // Resume playback after iOS fullscreen exit (webkitendfullscreen fires on the video element)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleFullscreenExit = () => {
      setTimeout(() => {
        if (video && !video.paused) return
        video.play().catch(() => {})
        setIsPlaying(true)
      }, 300)
    }

    video.addEventListener('webkitendfullscreen', handleFullscreenExit)
    return () => {
      video.removeEventListener('webkitendfullscreen', handleFullscreenExit)
    }
  }, [activeIndex, videoRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resume playback after standard fullscreen exit (Chrome, Firefox, etc.)
  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) {
        const video = videoRef.current
        if (video) {
          setTimeout(() => {
            video.play().catch(() => {})
            setIsPlaying(true)
          }, 300)
        }
      }
    }

    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ParticleSpinner preset="spiral" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('deckview.loadingDeck')}</p>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold font-display">{t('deckview.notFound')}</h2>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/dashboard">{t('common.backToDecks')}</Link>
        </Button>
      </div>
    )
  }

  const completedCount = words.filter((w) => w.status === 'complete').length
  const totalCount = words.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const isGenerating = deck.status === 'generating'
  const isCardDeck = deck.deck_type === 'card'
  const cardGenerationProgress = summarizeCardGenerationProgress(words)
  const deckLanguageLabel = getDeckLanguageLabel(deck.target_language, t)
  const displayName =
    deck.name || `${t('generateGo.languageDeckName', { language: deckLanguageLabel })} — ${new Date(deck.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : 'en-US')}`

  async function handleRename() {
    if (!deck) return
    const trimmed = renameTo.trim()
    if (!trimmed || trimmed === displayName) {
      setIsRenaming(false)
      return
    }
    const { data, error } = await supabase.rpc('update_deck_metadata', {
      p_deck_id: deck.id,
      p_name: trimmed,
    })
    if (!error) {
      const result = data as Partial<Deck> | null
      setDeck((prev) => (prev ? { ...prev, name: result?.name ?? trimmed } : prev))
      setIsRenaming(false)
    }
  }

  async function handleRate(wordId: string, rating: number) {
    const { error } = await supabase.rpc('rate_word', {
      p_word_id: wordId,
      p_rating: rating,
    })
    if (!error) {
      setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, rating } : w)))
    }
  }

  async function handleShare(word: Word) {
    setSharing(true)
    setShareSuccess(false)
    const url = await getOrCreateShareLink(word.id)
    if (!url) {
      setSharing(false)
      return
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${word.word}${word.translation ? ` — ${word.translation}` : ''}`,
          text: word.mnemonic || `Learn "${word.word}" with Resonance`,
          url,
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[share] Native share failed:', err)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch {
        const input = document.createElement('input')
        input.value = url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      }
    }
    setSharing(false)
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
    <div className="px-6 pt-2 pb-[calc(var(--deck-footer-space)+1rem)] sm:pt-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate('/decks')}
          className="mt-1 p-2 rounded-lg hover:bg-accent transition-colors text-[var(--pg-text-dim)] hover:text-foreground"
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
                className="text-2xl font-bold font-display tracking-tight bg-transparent border-b-2 border-[var(--pg-accent-teal)] outline-none text-foreground w-full"
              />
              <button onClick={handleRename} className="p-1 text-[var(--pg-accent-green)] hover:opacity-80">
                <Check className="h-5 w-5" />
              </button>
              <button onClick={cancelRenaming} className="p-1 text-[var(--pg-text-dim)] hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/name">
              <h1 className="text-2xl font-bold font-display tracking-tight">{displayName}</h1>
              <button
                onClick={startRenaming}
                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-[var(--pg-text-dim)] hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className="text-[var(--pg-text-dim)]">{deckLanguageLabel}</span>
            {isGenerating && (
              <span className="text-[var(--pg-accent-gold)] flex items-center gap-1 text-xs">
                <Sparkles className="h-3 w-3 animate-pulse" />
                {t('deckview.generating')}
              </span>
            )}
          </div>
        </div>
      </div>

    {globalQueueEnabled && (!hasChecked || shouldShowQueue) && (
      <div className="mb-8">
        <QueuePositionDisplay
          jobsAhead={jobsAhead}
          queuePaused={queuePaused}
          hasChecked={hasChecked}
          variant="glassy"
        />
      </div>
    )}
    {isGenerating && isCardDeck && (
      <div className="mb-8">
        <CardGenerationProgress summary={cardGenerationProgress} variant="glassy" />
      </div>
    )}

    {/* Generation progress showcase */}
    {isGenerating && (
      <div className="flex flex-col items-center gap-6 mb-8">
        <GenerationWheelLoader size={120} className="gap-0" />
        {!isCardDeck && hasChecked && !shouldShowQueue && (
          <VerbCycler intervalMs={5000} />
        )}
        <div className="w-full max-w-md h-1 bg-card/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--pg-accent-teal)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )}

      {/* Carousel / Edit Grid */}
      <div className="-mx-6 sm:mx-0">
      {editMode ? (
        /* ── Edit mode: flat thumbnail grid ── */
        <div className="px-4 sm:px-0">
          {/* Quick-select bar */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <button
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => {
                const selectable = words.filter(w => w.status !== 'pending' && w.status !== 'processing')
                setSelectedWords(new Set(selectable.map(w => w.id)))
              }}
            >
              {t('deckview.selectAll')}
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => {
                const failed = words.filter(w => w.status === 'failed')
                setSelectedWords(new Set(failed.map(w => w.id)))
              }}
            >
              {t('deckview.selectFailed')}
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setSelectedWords(new Set())}
            >
              {t('deckview.clearSelection')}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {words.filter(w => w.status !== 'pending' && w.status !== 'processing').map(word => {
              const isSelected = selectedWords.has(word.id)
              const isFailed = word.status === 'failed'

              return (
                <div
                  key={word.id}
                  onClick={() => {
                    setSelectedWords(prev => {
                      const next = new Set(prev)
                      if (next.has(word.id)) next.delete(word.id)
                      else next.add(word.id)
                      return next
                    })
                  }}
                  className={`relative rounded-xl overflow-hidden cursor-pointer border transition-all
                    bg-[#0d0d12]/70 ${
                    isSelected
                      ? 'ring-2 ring-[var(--pg-accent-teal)] border-[var(--pg-accent-teal)]/30'
                      : 'border-border hover:border-accent'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
                    isSelected
                      ? 'bg-[var(--pg-accent-teal)] border-[var(--pg-accent-teal)] text-black'
                      : 'bg-black/40 border-white/40 backdrop-blur-sm'
                  }`}>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>

                  {/* Thumbnail */}
                  <div className="aspect-[4/3] relative">
                    {word.thumbnail_url ? (
                      <img
                        src={word.thumbnail_url}
                        alt={word.word}
                        className={`w-full h-full ${isCardDeck ? 'object-contain bg-black/40' : 'object-cover'}`}
                      />
                    ) : isFailed ? (
                      <div className="w-full h-full flex items-center justify-center bg-red-950/20">
                        <AlertTriangle className="h-6 w-6 text-red-400" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        {!isCardDeck && <Play className="h-6 w-6 text-white/20" />}
                      </div>
                    )}
                  </div>

                  {/* Word info */}
                  <div className="p-2.5">
                    <p className="text-sm font-medium font-display truncate">{word.word}</p>
                    {word.translation && (
                      <p className="text-xs text-[var(--pg-text-dim)] truncate">{word.translation}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── Normal mode: carousel ── */
      <>
      {words.length > 0 ? (
        <div className="flex flex-col items-center">
          {/* Outer wrapper: group/carousel lives here so VolumeControl can respond to hover */}
          <div className="group/carousel relative w-full max-w-4xl">
          <div
            {...bind()}
            className="relative w-full min-h-[min(720px,calc(100dvh-16rem))] flex items-start justify-center pt-4 sm:pt-6 cursor-grab active:cursor-grabbing"
            style={{ perspective: '1200px', touchAction: 'pan-y' }}
          >
            {/* Prev button */}
            {activeIndex > 0 && (
              <button
                onClick={() => setActiveIndex((i) => i - 1)}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full pg-glass hover:bg-accent transition-all opacity-0 group-hover/carousel:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <AnimatePresence mode="popLayout">
              {words.map((word, i) => {
                const offset = i - activeIndex
                if (Math.abs(offset) > 2) return null
                const isComplete = word.status === 'complete'
                const isPending = word.status === 'pending' || word.status === 'processing'

                return (
                  <motion.div
                    key={word.id}
                    // w-[calc(100vw-32px)] = 16px margin each side; carousel is full-bleed via -mx-6 wrapper above
                    className="absolute top-4 sm:top-6 w-[calc(100vw-32px)] max-w-[800px] flex items-start justify-center"
                    style={{ pointerEvents: offset === 0 ? 'auto' : 'none' }}
                    initial={false}
                    animate={{
                      x: offset * (typeof window !== 'undefined' && window.innerWidth < 640 ? 100 : 200) + (offset === 0 ? dragOffset : 0),
                      scale: offset === 0 ? 1 : 0.85,
                      opacity: offset === 0 ? 1 : 0.4,
                      zIndex: 10 - Math.abs(offset),
                      rotateY: offset * -5,
                    }}
                    transition={dragOffset !== 0 ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <div
                      className={`w-full max-h-[calc(100dvh-15rem)] bg-[#0d0d12]/70 border border-white/5 rounded-2xl overflow-hidden relative flex flex-col sm:max-h-[calc(100dvh-18rem)] ${
                        !isComplete ? 'opacity-50' : ''
                      }`}
                      style={{ pointerEvents: offset === 0 ? 'auto' : 'none' }}
                    >
                      {/* Media area — 16:9 aspect ratio */}
                      <div className="w-full relative bg-black/50 overflow-hidden group/video" style={{ aspectRatio: '16/9' }}>
                        {/* Video element — stays mounted once activated to preserve frame on pause */}
                        {isComplete && !isCardDeck && videoActiveIndex === i && (offset === 0 ? activeVideoUrl : word.video_url) && (
                          <video
                            ref={videoRef}
                            key={`${word.id}-${version}`}
                            src={(offset === 0 ? activeVideoUrl : word.video_url)!}
                            muted={isMuted}
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover z-[1] pointer-events-none"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => {
                              if (videoRef.current) {
                                videoRef.current.currentTime = 0
                                videoRef.current.pause()
                              }
                              setIsPlaying(false)
                            }}
                          />
                        )}

                        {/* Thumbnail — shown when video not active, or as poster behind video */}
                        {isComplete && (offset === 0 ? activeThumbnailUrl : word.thumbnail_url) && videoActiveIndex !== i && (
                          <img
                            src={(offset === 0 ? activeThumbnailUrl : word.thumbnail_url)!}
                            alt={word.word}
                            draggable={false}
                            className={`absolute inset-0 w-full h-full ${isCardDeck ? 'object-contain bg-black/40 pointer-events-none select-none' : 'object-cover'}`}
                          />
                        )}

                        {/* Placeholder for incomplete words */}
                        {!isComplete && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                            <span className="text-xs text-white/35">
                              {word.status === 'failed'
                                ? isCardDeck ? t('deckview.cardFailure') : t('deckview.failed')
                                : isPending
                                  ? t('deckview.queued')
                                  : isCardDeck ? t('deckview.cardCreation') : t('deckview.processing')}
                            </span>
                          </div>
                        )}

                        {/* Play overlay on thumbnail — click/tap to start video */}
                        {isComplete && !isCardDeck && offset === 0 && videoActiveIndex !== i && word.video_url && (
                          <div
                            className="absolute inset-0 z-[2] bg-black/30 opacity-100 md:opacity-0 md:hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              setVideoActiveIndex(i)
                              setIsPlaying(true)
                            }}
                          >
                            <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-[var(--pg-accent-teal)]/30 backdrop-blur-sm flex items-center justify-center border border-[var(--pg-accent-teal)]/50 shadow-[0_0_20px_rgba(13,226,195,0.3)]">
                              <Play className="h-5 w-5 md:h-7 md:w-7 text-[var(--pg-accent-teal)] fill-[var(--pg-accent-teal)]" />
                            </div>
                          </div>
                        )}

                        {/* Version badge */}
                        {isComplete && !isCardDeck && offset === 0 && (
                          <VersionBadge
                            version={version}
                            hasAlt={hasAltVersion}
                            onToggle={() => {
                              toggleVersion()
                              if (videoActiveIndex === i) {
                                setIsPlaying(true)
                              }
                            }}
                            className="absolute top-3 right-3"
                          />
                        )}

                        {/* VolumeControl — moves with the card */}
                        {!isCardDeck && offset === 0 && (
                          <div className="absolute top-3 left-3 z-10 opacity-100 md:opacity-0 md:group-hover/video:opacity-100 transition-opacity">
                            <VolumeControl
                              volume={volume}
                              isMuted={isMuted}
                              onVolumeChange={setVolume}
                              onToggleMute={toggleMute}
                              popDirection="right"
                              iconSize={16}
                              buttonClassName="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                            />
                          </div>
                        )}

                        {/* Video controls — play/pause + volume + fullscreen */}
                        {isComplete && !isCardDeck && videoActiveIndex === i && offset === 0 && (
                          <VideoControls
                            isPlaying={isPlaying}
                            onTogglePlay={() => setIsPlaying(!isPlaying)}
                            volume={volume}
                            isMuted={isMuted}
                            onVolumeChange={setVolume}
                            onToggleMute={toggleMute}
                            fullscreenRef={videoRef}
                            buttonClassName="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                            className="z-10"
                            renderVolumeExternal={true}
                          />
                        )}
                      </div>

                      {/* Word info — always visible */}
                      <div className="px-6 pt-4 pb-2 flex flex-col items-center text-center bg-[#0d0d12]/70">
                        {isComplete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => { void playWord(word) }}
                              className="bg-transparent border-0 p-0 text-2xl font-bold text-white long-copy cursor-pointer hover:opacity-85 transition-opacity"
                            >
                              {word.word}
                            </button>
                            {word.translation && (
                              <p className="text-base text-gray-400 mt-1 long-copy">{word.translation}</p>
                            )}
                            {(() => {
                              const learning = resolveCardLearningMetadata(word)
                              return learning.mnemonic ? (
                                <p className="text-sm text-gray-500/70 italic mt-1 max-w-2xl long-copy">{learning.mnemonic}</p>
                              ) : null
                            })()}
                            <div className="flex justify-center mt-2">
                              <StarRating rating={word.rating ?? null} onChange={(r) => handleRate(word.id, r)} />
                            </div>
                            <button
                              onClick={() => handleShare(word)}
                              disabled={sharing}
                              className="flex items-center gap-2 px-4 py-2 mt-3 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
                            >
                              <Share2 className="w-4 h-4" />
                              {sharing ? 'Sharing...' : shareSuccess ? 'Link copied!' : 'Share'}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-bold text-white long-copy">{word.word}</p>
                            {word.status === 'failed' && (
                              <p className="text-xs text-gray-500 mt-1">
                                {isCardDeck ? t('deckview.cardFailure') : t('deckview.failed')}
                              </p>
                            )}
                            {word.status === 'failed' && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleRetry(word)}
                                  disabled={retrying === word.id}
                                  className="px-3 py-1.5 text-xs font-medium bg-white/10 border border-white/25 text-white hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <RotateCcw className="h-3 w-3 inline mr-1" />
                                  {retrying === word.id ? t('deckview.retrying') : isCardDeck ? 'Bild erneut erstellen' : t('common.retry')}
                                </button>
                                <button
                                  onClick={() => handleDeleteWord(word)}
                                  disabled={deleting === word.id}
                                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Trash2 className="h-3 w-3 inline mr-1" />
                                  {t('deckview.remove')}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Expandable metadata */}
                      {(() => {
                        const learning = resolveCardLearningMetadata(word)
                        const videoMeta = word.metadata as { creative_direction?: string; art_style?: string; music_caption?: string } | null
                        const hasExpandable = isComplete && (
                          learning.etymology
                          || learning.partOfSpeech
                          || learning.usageExample
                          || videoMeta?.creative_direction
                          || videoMeta?.art_style
                          || videoMeta?.music_caption
                        )
                        if (!hasExpandable) return null
                        return (
                          <>
                            <div
                              className="flex justify-center py-1.5 bg-[#0d0d12]/70 cursor-pointer hover:bg-white/5 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                setInfoCollapsed(!infoCollapsed)
                              }}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="w-10 h-0.5 rounded-full bg-white/20" />
                                {infoCollapsed ? (
                                  <ChevronDown className="h-3 w-3 text-white/30" />
                                ) : (
                                  <ChevronUp className="h-3 w-3 text-white/30" />
                                )}
                              </div>
                            </div>
                            <AnimatePresence initial={false}>
                              {!infoCollapsed && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                                  className="overflow-hidden bg-[#0d0d12]/70"
                                >
                                  <div className="px-6 pb-4 pt-2 space-y-4 text-sm max-w-2xl mx-auto text-left">
                                    {learning.usageExample && (
                                      <div className="space-y-1">
                                        <p className="text-gray-500">{t('deckview.example')}</p>
                                        {learning.usageExample.target && (
                                          <p className="text-gray-300 long-copy">{learning.usageExample.target}</p>
                                        )}
                                        {learning.usageExample.base && (
                                          <p className="text-gray-400 italic long-copy">{learning.usageExample.base}</p>
                                        )}
                                      </div>
                                    )}
                                    {learning.etymology && (
                                      <div className="space-y-1">
                                        <p className="text-gray-500">{t('deckview.etymology')}</p>
                                        <p className="text-gray-300 long-copy">{learning.etymology}</p>
                                      </div>
                                    )}
                                    {learning.partOfSpeech && (
                                      <div className="space-y-1">
                                        <p className="text-gray-500">{t('deckview.partOfSpeech')}</p>
                                        <p className="text-gray-300">
                                          {learning.partOfSpeech}{learning.article ? ` \u00b7 ${learning.article}` : ''}
                                        </p>
                                      </div>
                                    )}
                                    {videoMeta?.creative_direction && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">{t('deckview.creativeDirection')}</span>
                                        <span className="text-teal-400 capitalize">{videoMeta.creative_direction}</span>
                                      </div>
                                    )}
                                    {videoMeta?.art_style && (
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-500 shrink-0">{t('deckview.artStyle')}</span>
                                        <span className="text-gray-300 text-right truncate max-w-[280px]" title={videoMeta.art_style}>
                                          {videoMeta.art_style}
                                        </span>
                                      </div>
                                    )}
                                    {videoMeta?.music_caption && (
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-500 shrink-0">{t('deckview.music')}</span>
                                        <span className="text-gray-300 text-right long-copy">{videoMeta.music_caption.split(',')[0]}</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        )
                      })()}

                      {/* Dark overlay on non-active cards */}
                      {offset !== 0 && (
                        <div className="absolute inset-0 bg-black/60 z-20 pointer-events-none rounded-2xl" />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Next button */}
            {activeIndex < words.length - 1 && (
              <button
                onClick={() => setActiveIndex((i) => i + 1)}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full pg-glass hover:bg-accent transition-all opacity-0 group-hover/carousel:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
          </div>

          {/* Dots */}
          <div className="flex gap-1.5 mt-6 flex-wrap justify-center max-w-md pb-2">
            {words.map((word, i) => (
              <button
                key={word.id}
                onClick={() => setActiveIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex
                    ? 'w-6 bg-[var(--pg-accent-teal)]'
                    : word.status === 'complete'
                    ? 'w-1.5 bg-foreground/30'
                    : 'w-1.5 bg-foreground/10'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="text-[var(--pg-text-dim)]">{t('deckview.noWords')}</p>
        </div>
      )}
      </>
      )}
      </div> {/* end -mx-6 bleed wrapper */}

      {/* Footer actions — layout adapts to button count:
          editMode=true  → 1 button (Done)              → centered at natural width
          editMode=false → 3 buttons (Study/Add/Edit|Delete) → 3-col grid */}
      <div className={editMode
        ? 'flex justify-center pt-8'
        : 'fixed inset-x-6 bottom-[calc(var(--app-safe-bottom)+1rem)] z-30 grid max-w-xl grid-cols-3 gap-2 mx-auto sm:bottom-[calc(var(--app-safe-bottom)+2rem)] sm:gap-3'
      }>
        {!editMode && (
          <>
            <button
              onClick={() => navigate(isCardDeck ? `/study/flashcard?deck=${deck.id}` : `/study?deck=${deck.id}`)}
              className="rounded-xl border border-[var(--pg-accent-teal)]/30 bg-black/35 px-2 py-2.5 text-xs font-display font-medium text-[var(--pg-accent-teal)] backdrop-blur-md transition-all hover:bg-[var(--pg-accent-teal)]/10 sm:px-5 sm:text-sm"
            >
              <BookOpen className="h-4 w-4 inline mr-1.5" />
              {t('deckview.study')}
            </button>
            <button
              onClick={() => navigate(`/generate?deckId=${deck.id}`)}
              className="rounded-xl border border-[var(--pg-accent-teal)]/30 bg-black/35 px-2 py-2.5 text-xs font-display font-medium text-[var(--pg-accent-teal)] backdrop-blur-md transition-all hover:bg-[var(--pg-accent-teal)]/10 sm:px-5 sm:text-sm"
            >
              <Plus className="h-4 w-4 inline mr-1.5" />
              {t('deckview.addCards')}
            </button>
          </>
        )}
        {words.length === 0 ? (
          <button
            onClick={handleDeleteDeck}
            disabled={deletingDeck}
            className="rounded-xl border border-red-500/40 bg-black/35 px-2 py-2.5 text-xs font-display font-medium text-red-400 backdrop-blur-md transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:text-sm"
          >
            {deletingDeck ? (
              <Loader2 className="h-4 w-4 inline mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 inline mr-1.5" />
            )}
            {t('deckview.deleteDeck')}
          </button>
        ) : (
          <button
            onClick={() => {
              if (editMode) {
                setEditMode(false)
                setSelectedWords(new Set())
              } else {
                setEditMode(true)
                setSelectedWords(new Set())
              }
            }}
            className="rounded-xl border border-[var(--pg-accent-teal)]/30 bg-black/35 px-2 py-2.5 text-xs font-display font-medium text-[var(--pg-accent-teal)] backdrop-blur-md transition-all hover:bg-[var(--pg-accent-teal)]/10 sm:px-5 sm:text-sm"
          >
            {editMode ? (
              <><X className="h-4 w-4 inline mr-1.5" />{t('deckview.done')}</>
            ) : (
              <><PencilLine className="h-4 w-4 inline mr-1.5" />{t('deckview.editDeck')}</>
            )}
          </button>
        )}
      </div>

      {/* Edit mode action bar */}
      {editMode && selectedWords.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center justify-between px-6 py-3 max-w-5xl mx-auto">
            <span className="text-sm text-white/70 font-display">
              {t('deckview.nSelected', { count: selectedWords.size })}
            </span>
            <button
              disabled={moving}
              onClick={() => setShowDeckPicker(true)}
              className="px-5 py-2 rounded-xl bg-[var(--pg-accent-teal)] text-black text-sm font-display font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {moving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('deckview.moveToDeck')}
            </button>
          </div>
        </div>
      )}

      {/* Deck Picker */}
      {deck && (
        <DeckPickerSheet
          open={showDeckPicker}
          onClose={() => setShowDeckPicker(false)}
          onSelectDeck={async (targetDeckId) => {
            setShowDeckPicker(false)
            const wordIds = Array.from(selectedWords)
            const result = await moveWords(wordIds, targetDeckId)
            if (result.success) {
              setWords(prev => prev.filter(w => !selectedWords.has(w.id)))
              setSelectedWords(new Set())
              setEditMode(false)
              setDeck(prev => prev ? { ...prev, word_count: Math.max(0, prev.word_count - wordIds.length) } : prev)
              // Reset activeIndex to stay in bounds
              if (activeIndex >= words.length - wordIds.length) {
                setActiveIndex(Math.max(0, words.length - wordIds.length - 1))
              }
              toast(t('deckview.wordsMoved', { count: wordIds.length }), 'success')
            } else {
              toast(result.error || t('deckview.moveFailed'), 'error')
            }
          }}
          sourceDeckId={id!}
          targetLanguage={deck.target_language}
          selectedCount={selectedWords.size}
        />
      )}
    </div>
  )
}
