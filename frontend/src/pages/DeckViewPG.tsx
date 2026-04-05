import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useDrag } from '@use-gesture/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
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
} from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import VersionBadge from '@/components/VersionBadge'
import { useAuth } from '@/hooks/useAuth'
import { useVideoVersion } from '@/hooks/useVideoVersion'
import { useVideoVolume } from '@/hooks/useVideoVolume'
import { VideoControls } from '@/components/VideoControls'
import { VolumeControl } from '@/components/VolumeControl'
import { useToast } from '@/components/Toast'
import { VerbCycler } from '@/components/ui/VerbCycler'

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
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  rating: number | null
  status: string
  video_url: string | null
  thumbnail_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  suno_audio_url: string | null
  suno_audio_url_b: string | null
  suno_task_id: string | null
  metadata: Record<string, unknown> | null
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

  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [retrying, setRetrying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleRetry = async (word: Word) => {
    if (!user || !profile || profile.credits < 1) {
      toast('No credits remaining', 'error')
      return
    }
    setRetrying(word.id)
    try {
      await supabase.from('words').update({
        status: 'pending',
        error_message: null,
      }).eq('id', word.id)

      await supabase.from('generation_jobs').insert({
        user_id: user.id,
        deck_id: id,
        status: 'approved',
        priority: 0,
        target_language: deck?.target_language || 'Unknown',
        art_style: deck?.art_style || null,
        words_total: 1,
        words_completed: 0,
        words_failed: 0,
      })

      await supabase.from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id)

      await supabase.from('decks')
        .update({ status: 'generating' })
        .eq('id', id)

      await refreshProfile()
      const { data } = await supabase.from('words').select('*').eq('deck_id', id).order('created_at')
      if (data) setWords(data)
      toast('Retrying generation...', 'success')
    } catch {
      toast('Retry failed', 'error')
    } finally {
      setRetrying(null)
    }
  }

  const handleDeleteWord = async (word: Word) => {
    if (!confirm(`Remove "${word.word}" from this deck?`)) return
    setDeleting(word.id)
    try {
      // Clean up storage files if they exist
      if (user && (word.video_url || word.thumbnail_url)) {
        const prefix = `${user.id}/${id}/${word.word}`
        await supabase.storage.from('videos').remove([
          `${prefix}/video.mp4`, `${prefix}/thumb.jpg`,
          `${prefix}/video_b.mp4`, `${prefix}/thumb_b.jpg`,
        ]).catch(() => {})
      }
      await supabase.from('words').delete().eq('id', word.id)
      const remaining = words.filter(w => w.id !== word.id)
      setWords(remaining)
      // Update deck word count and status
      const allComplete = remaining.length > 0 && remaining.every(w => w.status === 'complete')
      const someComplete = remaining.some(w => w.status === 'complete')
      const newStatus = allComplete ? 'complete' : someComplete ? 'partial' : 'draft'
      await supabase.from('decks').update({ word_count: remaining.length, status: newStatus }).eq('id', id)
      toast('Word removed', 'success')
    } catch {
      toast('Failed to remove word', 'error')
    } finally {
      setDeleting(null)
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
  }, [deck?.status, fetchData])

  // Keep activeIndex in bounds when words update
  useEffect(() => {
    if (activeIndex >= words.length && words.length > 0) {
      setActiveIndex(words.length - 1)
    }
  }, [words.length, activeIndex])

  const [infoCollapsed, setInfoCollapsed] = useState(false)
  const [videoActiveIndex, setVideoActiveIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const activeWord = words[activeIndex] ?? { id: '', video_url: null, thumbnail_url: null }
  const { activeVideoUrl, activeThumbnailUrl, version, toggleVersion, hasAltVersion } = useVideoVersion(activeWord)
  const { volume, isMuted, setVolume, toggleMute } = useVideoVolume(videoRef, false)

  // Pause video when navigating to a different card
  useLayoutEffect(() => {
    return () => {
      videoRef.current?.pause()
    }
  }, [activeIndex])

  // Pause video on page leave
  useEffect(() => {
    return () => {
      videoRef.current?.pause()
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

  const [dragOffset, setDragOffset] = useState(0)

  const bind = useDrag(
    (state) => {
      const { movement: [mx], active } = state
      console.log('[DRAG] handler fired', { first: state.first, active: state.active, movement: state.movement })
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
        <p className="text-sm text-muted-foreground opacity-60">Loading deck...</p>
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

  async function handleRate(wordId: string, rating: number) {
    await supabase
      .from('words')
      .update({ rating, rated_at: new Date().toISOString() })
      .eq('id', wordId)
    setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, rating } : w)))
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
            {isGenerating && (
              <span className="text-[var(--pg-accent-gold)] flex items-center gap-1 text-xs">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Generating...
              </span>
            )}
          </div>
        </div>
      </div>

    {/* Generation progress showcase */}
    {isGenerating && (
      <div className="flex flex-col items-center gap-6 mb-8">
        <ParticleSpinner preset="starburst" size={200} />
        <VerbCycler intervalMs={5000} />
        <div className="w-full max-w-md h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--pg-accent-teal)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )}

      {/* Carousel */}
      <div className="-mx-6 sm:mx-0">
      {words.length > 0 ? (
        <div className="flex flex-col items-center">
          {/* Outer wrapper: group/carousel lives here so VolumeControl can respond to hover */}
          <div className="group/carousel relative w-full max-w-4xl">
            {videoActiveIndex === activeIndex && (
              <div className="absolute top-3 left-3 z-30 opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity">
                <VolumeControl
                  volume={volume}
                  isMuted={isMuted}
                  onVolumeChange={setVolume}
                  onToggleMute={toggleMute}
                  popDirection="right"
                  iconSize={16}
                  buttonClassName="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                />
              </div>
            )}
          <div
            {...bind()}
            onPointerDownCapture={(e) => console.log('[BIND-TARGET] pointerdown', e.target, e.currentTarget)}
            className="relative w-full h-[80vh] max-h-[770px] flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ perspective: '1200px', touchAction: 'pan-y' }}
          >
            {/* Prev button */}
            {activeIndex > 0 && (
              <button
                onClick={() => setActiveIndex((i) => i - 1)}
                className="hidden md:flex absolute left-0 z-20 p-3 rounded-full pg-glass hover:bg-white/10 transition-all opacity-0 group-hover/carousel:opacity-100"
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
                    // w-[calc(100vw-32px)] = 16px margin each side; carousel is full-bleed via -mx-6 wrapper above
                    className="absolute w-[calc(100vw-32px)] max-w-[800px] h-[80vh] max-h-[750px] flex items-center justify-center"
                    style={{ pointerEvents: offset === 0 ? 'auto' : 'none' }}
                    onPointerDown={(e) => console.log('[CARD]', offset, 'pointerdown', e.target)}
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
                      className={`w-full bg-[#0d0d12] border border-white/5 rounded-2xl overflow-hidden relative flex flex-col ${
                        !isComplete ? 'opacity-50' : ''
                      }`}
                      style={{ pointerEvents: offset === 0 ? 'auto' : 'none' }}
                    >
                      {/* Media area — 16:9 aspect ratio */}
                      <div className="w-full relative bg-black overflow-hidden group/video" style={{ aspectRatio: '16/9' }}>
                        {/* Video element — stays mounted once activated to preserve frame on pause */}
                        {isComplete && videoActiveIndex === i && (offset === 0 ? activeVideoUrl : word.video_url) && (
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
                              }
                            }}
                          />
                        )}

                        {/* Thumbnail — shown when video not active, or as poster behind video */}
                        {isComplete && (offset === 0 ? activeThumbnailUrl : word.thumbnail_url) && videoActiveIndex !== i && (
                          <img
                            src={(offset === 0 ? activeThumbnailUrl : word.thumbnail_url)!}
                            alt={word.word}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}

                        {/* Placeholder for incomplete words */}
                        {!isComplete && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                            <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
                          </div>
                        )}

                        {/* Play overlay on thumbnail — click/tap to start video */}
                        {isComplete && offset === 0 && videoActiveIndex !== i && word.video_url && (
                          <div
                            className="absolute inset-0 z-[2] bg-black/30 opacity-100 md:opacity-0 md:hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            onPointerDown={(e) => console.log('[PLAY-OVERLAY] pointerdown', e.target)}
                            onClick={(e) => {
                              e.stopPropagation()
                              setVideoActiveIndex(i)
                              setIsPlaying(true)
                            }}
                          >
                            <div className="h-14 w-14 rounded-full bg-[var(--pg-accent-teal)]/30 backdrop-blur-sm flex items-center justify-center border border-[var(--pg-accent-teal)]/50 shadow-[0_0_20px_rgba(13,226,195,0.3)]">
                              <Play className="h-7 w-7 text-[var(--pg-accent-teal)] fill-[var(--pg-accent-teal)]" />
                            </div>
                          </div>
                        )}

                        {/* Version badge */}
                        {isComplete && offset === 0 && (
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

                        {/* Video controls — play/pause + volume + fullscreen */}
                        {isComplete && videoActiveIndex === i && offset === 0 && (
                          <VideoControls
                            isPlaying={isPlaying}
                            onTogglePlay={() => setIsPlaying(!isPlaying)}
                            volume={volume}
                            isMuted={isMuted}
                            onVolumeChange={setVolume}
                            onToggleMute={toggleMute}
                            fullscreenRef={videoRef}
                            buttonClassName="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                            className="z-10"
                            renderVolumeExternal={true}
                          />
                        )}
                      </div>

                      {/* Word info — always visible */}
                      <div className="px-6 pt-4 pb-2 flex flex-col items-center text-center bg-[#0d0d12]">
                        {isComplete ? (
                          <>
                            <h2 className="text-2xl font-bold text-white">{word.word}</h2>
                            {word.translation && (
                              <p className="text-base text-gray-400 mt-1">{word.translation}</p>
                            )}
                            {word.mnemonic && (
                              <p className="text-sm text-gray-500/70 italic mt-1 max-w-2xl">{word.mnemonic}</p>
                            )}
                            <div className="flex justify-center mt-2">
                              <StarRating rating={word.rating ?? null} onChange={(r) => handleRate(word.id, r)} />
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-bold text-white">{word.word}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {word.status === 'failed' ? 'Failed to generate' : 'Processing...'}
                            </p>
                            {word.status === 'failed' && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleRetry(word)}
                                  disabled={retrying === word.id}
                                  className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <RotateCcw className="h-3 w-3 inline mr-1" />
                                  {retrying === word.id ? 'Retrying...' : 'Retry'}
                                </button>
                                <button
                                  onClick={() => handleDeleteWord(word)}
                                  disabled={deleting === word.id}
                                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Trash2 className="h-3 w-3 inline mr-1" />
                                  Remove
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Expandable metadata */}
                      {(() => {
                        const meta = word.metadata as { creative_direction?: string; art_style?: string; music_caption?: string } | null
                        const hasExpandable = isComplete && (word.etymology || word.pos || meta?.creative_direction || meta?.art_style || meta?.music_caption)
                        if (!hasExpandable) return null
                        return (
                          <>
                            <div
                              className="flex justify-center py-1.5 bg-[#0d0d12] cursor-pointer hover:bg-white/5 transition-colors"
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
                                  className="overflow-hidden bg-[#0d0d12]"
                                >
                                  <div className="px-6 pb-4 pt-2 space-y-2.5 text-sm max-w-2xl mx-auto">
                                    {word.etymology && (
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-500 shrink-0">Etymology</span>
                                        <span className="text-gray-300 text-right">{word.etymology}</span>
                                      </div>
                                    )}
                                    {word.pos && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Part of Speech</span>
                                        <span className="text-gray-300">
                                          {word.pos}{word.article ? ` \u00b7 ${word.article}` : ''}
                                        </span>
                                      </div>
                                    )}
                                    {meta?.creative_direction && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Creative Direction</span>
                                        <span className="text-teal-400 capitalize">{meta.creative_direction}</span>
                                      </div>
                                    )}
                                    {meta?.art_style && (
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-500 shrink-0">Art Style</span>
                                        <span className="text-gray-300 text-right truncate max-w-[280px]" title={meta.art_style}>
                                          {meta.art_style}
                                        </span>
                                      </div>
                                    )}
                                    {meta?.music_caption && (
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-500 shrink-0">Music</span>
                                        <span className="text-gray-300 text-right">{meta.music_caption.split(',')[0]}</span>
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
                className="hidden md:flex absolute right-0 z-20 p-3 rounded-full pg-glass hover:bg-white/10 transition-all opacity-0 group-hover/carousel:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
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
      </div> {/* end -mx-6 bleed wrapper — escapes parent px-6 on mobile, restored at sm: */}

      {/* Footer actions */}
      <div className="flex gap-3 justify-center pt-8">
        <button
          onClick={() => navigate(`/study?deck=${deck.id}`)}
          className="px-5 py-2.5 rounded-xl border border-[var(--pg-accent-teal)]/30 text-[var(--pg-accent-teal)] text-sm font-display font-medium hover:bg-[var(--pg-accent-teal)]/10 transition-all"
        >
          <BookOpen className="h-4 w-4 inline mr-1.5" />
          Study
        </button>
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
