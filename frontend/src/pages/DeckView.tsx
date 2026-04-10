import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, AlertCircle, Pencil, Plus, BookOpen, Check, X, ChevronLeft, ChevronRight, RotateCcw, Trash2, CheckCircle2, Loader2, AlertTriangle, Play, Share2 } from 'lucide-react'
import WordInfoPanel from '@/components/WordInfoPanel'
import VersionBadge from '@/components/VersionBadge'
import { useAuth } from '@/hooks/useAuth'
import { useVideoVersion, getStoredVersion } from '@/hooks/useVideoVersion'
import { useVideoVolume } from '@/hooks/useVideoVolume'
import { useVideoPlayback } from '@/hooks/useVideoPlayback'
import { VideoControls } from '@/components/VideoControls'
import { VolumeControl } from '@/components/VolumeControl'
import { useToast } from '@/components/Toast'
import { VerbCycler } from '@/components/ui/VerbCycler'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import { getOrCreateShareLink } from '@/lib/shareWord'

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
  suno_storage_url: string | null
  suno_storage_url_b: string | null
  suno_audio_url: string | null
  suno_audio_url_b: string | null
  suno_task_id: string | null
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
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { t, locale } = useTranslation()
  const [retrying, setRetrying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleRetry = async (word: Word) => {
    if (!user || !profile || profile.credits < 1) {
      toast(t('deckview.noCredits'), 'error')
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
      toast(t('deckview.retryingGeneration'), 'success')
    } catch {
      toast(t('deckview.retryFailed'), 'error')
    } finally {
      setRetrying(null)
    }
  }

  const handleDeleteWord = async (word: Word) => {
    if (!confirm(t('deckview.confirmRemove', { word: word.word }))) return
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
      toast(t('deckview.wordRemoved'), 'success')
    } catch {
      toast(t('deckview.removeFailed'), 'error')
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ParticleSpinner preset="spiral" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('deckview.loadingDeck')}</p>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold">{t('deckview.notFound')}</h2>
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
  const completeWords = words.filter((w) => w.status === 'complete')
  const cardMaxWidth = completeWords.length === 1 ? 'max-w-[480px]' : 'max-w-[280px]'
  const viewerWord = completeWords[viewerIndex]

  const displayName =
    deck.name ||
    `${deck.target_language} Deck — ${new Date(deck.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : 'en-US')}`

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
      <div className="text-center">
        <div className="flex items-center gap-2 mb-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <div className="space-y-2">
          {isRenaming ? (
            <div className="flex items-center justify-center gap-2">
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
                className="text-2xl font-bold tracking-tight bg-transparent border-b-2 border-primary outline-none text-foreground max-w-md text-center"
              />
              <Button variant="ghost" size="icon" onClick={handleRename} className="shrink-0">
                <Check className="h-4 w-4 text-green-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={cancelRenaming} className="shrink-0">
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 group/name">
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <button
                onClick={startRenaming}
                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                title={t('deckview.renameDeck')}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">{deck.target_language}</span>
            {isGenerating ? (
              <span title={t('deckview.statusGenerating', { completed: completedCount, total: totalCount })}>
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </span>
            ) : deck.status === 'complete' ? (
              <span title={t('deckview.statusReady')}>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </span>
            ) : (
              <span title={t('deckview.statusPartial', { completed: completedCount, total: totalCount })}>
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              </span>
            )}
          </div>
          {isGenerating && (
            <Progress value={progress} className="h-2 max-w-md mx-auto" />
          )}
          {isGenerating && (
            <VerbCycler className="mt-1" />
          )}
        </div>
      </div>

      {/* Word Grid */}
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-center gap-4 [touch-action:pan-y]">
        {words.map((word) => {
          const isComplete = word.status === 'complete'
          const isFailed = word.status === 'failed'
          const isPending = word.status === 'pending' || word.status === 'processing'

          return (
            <div key={word.id} className={`relative group w-full ${cardMaxWidth}`}>
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
                  className="block glass glass-hover rounded-xl overflow-hidden transition-[background-color,box-shadow,border-color,transform] duration-200 [@media(hover:hover)]:hover:scale-[1.03] hover:glow-purple cursor-pointer active:scale-[0.98]"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video relative bg-white/5">
                    {word.thumbnail_url ? (
                      <img
                        src={word.thumbnail_url}
                        alt={word.word}
                        loading="lazy"
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
                    {/* Version indicator on card */}
                    {word.video_url_b && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 border border-white/20 text-white text-[10px] font-medium backdrop-blur-sm z-10">
                        {getStoredVersion(word.id).toUpperCase()}
                      </span>
                    )}
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
                <div className="glass rounded-xl overflow-hidden opacity-70">
                  <div className="aspect-video flex items-center justify-center bg-destructive/5">
                    <AlertCircle className="h-8 w-8 text-destructive-foreground/50" />
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="font-semibold text-sm truncate">{word.word}</p>
                    <p className="text-xs text-destructive-foreground">{t('deckview.couldNotGenerate')}</p>
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleRetry(word)}
                        disabled={retrying === word.id}
                      >
                        <RotateCcw className="h-3 w-3" />
                        {retrying === word.id ? t('deckview.retrying') : t('common.retry')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive-foreground/50 hover:text-destructive-foreground"
                        onClick={() => handleDeleteWord(word)}
                        disabled={deleting === word.id}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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
                      {isPending ? t('deckview.queued') : t('deckview.processing')}
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
      <div className="flex gap-3 justify-center pt-4">
        <Button
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => navigate(`/study?deck=${deck.id}`)}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          {t('deckview.study')}
        </Button>
        <Button
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => navigate(`/generate?deckId=${deck.id}`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('deckview.addCards')}
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
  const { activeVideoUrl, version, toggleVersion, hasAltVersion } = useVideoVersion(word ?? { id: '', video_url: null, thumbnail_url: null })
  const { t } = useTranslation()
  const { volume, isMuted, setVolume, toggleMute } = useVideoVolume(videoRef, false)
  const { isPlaying, setIsPlaying, togglePlay, onPlay, onPause } = useVideoPlayback(videoRef)
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  const [sharing, setSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  async function handleShare() {
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

  // Preserve playing/paused state when navigating to a new word
  useEffect(() => {
    setIsPlaying(isPlayingRef.current)
  }, [currentIndex, setIsPlaying])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
      if (e.key === ' ') { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, currentIndex, hasPrev, hasNext, togglePlay])

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
      <div className="flex-1 flex items-center justify-center px-4 pb-4 overflow-y-auto h-0">
        {/* Main content */}
        <div className="w-full max-w-3xl space-y-6">
          {/* Video container with arrows */}
          <div className="relative group/video">
            {/* Volume control — outside overflow-hidden so slider isn't clipped */}
            {activeVideoUrl && (
              <div className="absolute top-3 left-3 z-30 opacity-0 group-hover/video:opacity-100 transition-opacity">
                <VolumeControl
                  volume={volume}
                  isMuted={isMuted}
                  onVolumeChange={setVolume}
                  onToggleMute={toggleMute}
                  popDirection="right"
                  iconSize={20}
                  buttonClassName="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                />
              </div>
            )}
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
            {activeVideoUrl ? (
              <>
                <video
                  ref={videoRef}
                  key={`${videoKey}-${version}`}
                  src={`${activeVideoUrl}?t=${videoKey}`}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  onClick={togglePlay}
                  onPlay={onPlay}
                  onPause={onPause}
                  onEnded={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0
                      videoRef.current.pause()
                    }
                    setIsPlaying(false)
                  }}
                  className="w-full aspect-video cursor-pointer"
                />
              </>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-white/5">
                <p className="text-muted-foreground">{t('deckview.noVideo')}</p>
              </div>
            )}

            {/* Version badge */}
            <VersionBadge
              version={version}
              hasAlt={hasAltVersion}
              onToggle={() => { toggleVersion(); onReplay() }}
              className="absolute top-4 right-4"
            />

            {/* Video controls overlay */}
            {activeVideoUrl && (
              <VideoControls
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
                fullscreenRef={videoRef}
                iconSize={20}
                buttonClassName="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                className="z-20"
                renderVolumeExternal={true}
              />
            )}
            </div>
          </div>

          {/* Word info */}
          <WordInfoPanel
            word={word}
            onRate={onRate}
          />

          {/* Replay + Share */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onReplay}
              className="border-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('deckview.replay')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              className="border-white/10"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {sharing ? 'Sharing...' : shareSuccess ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
