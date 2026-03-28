import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Check,
  Clock,
  RotateCcw,
  Sparkles,
  BookOpen,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { useVideoVersion } from '@/hooks/useVideoVersion'

type StudyWord = {
  id: string
  word: string
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  video_url: string | null
  thumbnail_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  deck_id: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Study() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [words, setWords] = useState<StudyWord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)

  const loadWords = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('words')
      .select('id, word, translation, mnemonic, etymology, video_url, thumbnail_url, video_url_b, thumbnail_url_b, deck_id')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      setWords(shuffle(data))
    } else {
      setWords([])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const current = words[currentIndex] ?? null
  const { activeVideoUrl, activeThumbnailUrl } = useVideoVersion(current ?? { id: '', video_url: null, thumbnail_url: null })

  const advance = useCallback(() => {
    setReviewed((r) => r + 1)
    setRevealed(false)
    if (currentIndex + 1 >= words.length) {
      setSessionComplete(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }, [currentIndex, words.length])

  const replay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }, [])

  const restart = useCallback(() => {
    setWords((prev) => shuffle(prev))
    setCurrentIndex(0)
    setRevealed(false)
    setSessionComplete(false)
    setReviewed(0)
  }, [])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }, [])

  const skipPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setRevealed(false)
    }
  }, [currentIndex])

  const skipNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1)
      setRevealed(false)
    }
  }, [currentIndex, words.length])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        else advance()
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); skipPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); skipNext() }
      if (e.key === 'r' || e.key === 'R') replay()
      if (e.key === 'm' || e.key === 'M') toggleMute()
      if (e.key === 'p' || e.key === 'P') togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, advance, replay, sessionComplete, toggleMute, togglePlay, skipPrev, skipNext])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingIndicator text="Loading study cards" />
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <h2 className="text-xl font-bold mb-2">No words ready to study yet</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Generate a deck first — once your videos are ready, they'll appear here for review.
          </p>
        </div>
        <Button onClick={() => navigate('/generate')}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate a Deck
        </Button>
      </div>
    )
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"
        >
          <Check className="h-10 w-10 text-green-400" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Session Complete</h2>
          <p className="text-muted-foreground">
            You reviewed <span className="text-foreground font-semibold">{reviewed}</span> word{reviewed !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={restart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start Again
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
      {/* Card + skip arrows */}
      <div className="relative w-full max-w-2xl flex items-center">
        {/* Left skip arrow — always visible */}
        <button
          onClick={skipPrev}
          disabled={currentIndex === 0}
          className="absolute -left-14 z-20 w-10 h-10 rounded-full border border-border bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right skip arrow — always visible */}
        <button
          onClick={skipNext}
          disabled={currentIndex >= words.length - 1}
          className="absolute -right-14 z-20 w-10 h-10 rounded-full border border-border bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full"
            >
              {/* Video */}
              <div className="rounded-xl border border-border overflow-hidden mb-6 relative group/video">
                {activeVideoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      key={current.id}
                      src={activeVideoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full aspect-video object-contain bg-black cursor-pointer"
                      onClick={togglePlay}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    {/* Video controls overlay */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity">
                      <button
                        onClick={togglePlay}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={toggleMute}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </>
                ) : activeThumbnailUrl ? (
                  <img
                    src={activeThumbnailUrl}
                    alt={current.word}
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-muted flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Word */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold mb-3">{current.word}</h2>

                {/* Reveal area */}
                {revealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    {current.translation && (
                      <p className="text-xl text-muted-foreground mt-1">{current.translation}</p>
                    )}
                    {current.mnemonic && (
                      <p className="text-sm italic text-muted-foreground/70 mt-3 max-w-lg mx-auto leading-relaxed">
                        {current.mnemonic}
                      </p>
                    )}
                    {current.etymology && (
                      <p className="text-xs text-muted-foreground/50 mt-2 max-w-lg mx-auto leading-relaxed">
                        {current.etymology}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setRevealed(true)}
                    className="px-8 py-3 rounded-full tracking-widest uppercase text-sm"
                  >
                    Reveal Answer
                  </Button>
                )}
              </div>

              {/* Actions — only visible after reveal */}
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex justify-center gap-3"
                >
                  <Button
                    onClick={advance}
                    variant="outline"
                    className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Remembered
                  </Button>
                  <Button variant="outline" onClick={advance}>
                    <Clock className="h-4 w-4 mr-2" />
                    Review Later
                  </Button>
                  <Button variant="outline" onClick={replay}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Replay
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard hints */}
      <div className="mt-8 text-center text-xs text-muted-foreground/50">
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">Space</kbd> reveal/advance
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">&larr;</kbd><kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">&rarr;</kbd> skip
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">R</kbd> replay
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">P</kbd> play/pause
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">M</kbd> mute
      </div>
    </div>
  )
}
