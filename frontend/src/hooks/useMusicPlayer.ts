import { useRef, useState, useCallback, useEffect, useMemo } from 'react'

export interface MusicTrack {
  id: string
  deck_id: string
  deckName: string
  word: string
  translation: string | null
  thumbnail_url: string | null
  suno_storage_url: string | null
  suno_audio_url: string | null
  genre: string | null
  duration: number | null
  error: boolean
}

export type RepeatMode = 'off' | 'all' | 'one'

function buildShuffleOrder(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function useMusicPlayer(tracks: MusicTrack[]) {
  const audioRef = useRef<HTMLAudioElement>(null)

  // Stable reference — only recomputed when tracks identity changes
  const queue = useMemo(
    () => tracks.filter((t) => !!(t.suno_storage_url ?? t.suno_audio_url) && !t.error),
    [tracks],
  )

  const [currentQueueIdx, setCurrentQueueIdx] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [shuffle, setShuffle] = useState(false)
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([])
  const [volume, setVolumeState] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const currentTrack = currentQueueIdx !== null ? queue[currentQueueIdx] ?? null : null

  // Rebuild shuffle order when queue or shuffle changes
  useEffect(() => {
    if (shuffle) {
      setShuffleOrder(buildShuffleOrder(queue.length))
    }
  }, [shuffle, queue.length])

  // When current track changes, load + play
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const audioUrl = currentTrack?.suno_storage_url ?? currentTrack?.suno_audio_url
    if (!audioUrl) {
      audio.src = ''
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      return
    }
    audio.src = audioUrl
    audio.load()
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
  }, [currentTrack?.id])

  // Sync volume/mute to audio element
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = isMuted
  }, [volume, isMuted])

  const advanceNext = useCallback(() => {
    if (queue.length === 0) return

    if (repeatMode === 'one') {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
      return
    }

    // Compute next index outside the updater so we can call setIsPlaying
    // as a separate side-effect (state updaters must be pure — no side effects)
    const prev = currentQueueIdx
    let nextIdx: number
    if (prev === null) {
      nextIdx = 0
    } else if (shuffle && shuffleOrder.length === queue.length) {
      const pos = shuffleOrder.indexOf(prev)
      nextIdx = shuffleOrder[(pos + 1) % shuffleOrder.length]
    } else {
      nextIdx = prev + 1
    }

    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        setCurrentQueueIdx(0)
      } else {
        setIsPlaying(false) // called outside updater ✓
      }
      return
    }
    setCurrentQueueIdx(nextIdx)
  }, [queue.length, repeatMode, shuffle, shuffleOrder, currentQueueIdx])

  const play = useCallback(
    (trackId: string) => {
      const idx = queue.findIndex((t) => t.id === trackId)
      if (idx === -1) return
      setCurrentQueueIdx(idx)
    },
    [queue],
  )

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [isPlaying, currentTrack])

  const next = useCallback(() => {
    if (queue.length === 0) return
    setCurrentQueueIdx((prev) => {
      if (prev === null) return 0
      let nextIdx: number
      if (shuffle && shuffleOrder.length === queue.length) {
        const pos = shuffleOrder.indexOf(prev)
        nextIdx = shuffleOrder[(pos + 1) % shuffleOrder.length]
      } else {
        nextIdx = (prev + 1) % queue.length
      }
      return nextIdx
    })
  }, [queue.length, shuffle, shuffleOrder])

  const prev = useCallback(() => {
    const audio = audioRef.current
    // If more than 3s in, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    if (queue.length === 0) return
    setCurrentQueueIdx((prev) => {
      if (prev === null) return 0
      let prevIdx: number
      if (shuffle && shuffleOrder.length === queue.length) {
        const pos = shuffleOrder.indexOf(prev)
        prevIdx = shuffleOrder[(pos - 1 + shuffleOrder.length) % shuffleOrder.length]
      } else {
        prevIdx = (prev - 1 + queue.length) % queue.length
      }
      return prevIdx
    })
  }, [queue.length, shuffle, shuffleOrder])

  const seekTo = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !isFinite(audio.duration) || audio.duration === 0) return
    audio.currentTime = ratio * audio.duration
  }, [])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    if (v > 0 && isMuted) setIsMuted(false)
  }, [isMuted])

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m)
  }, [])

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s)
  }, [])

  const cycleRepeat = useCallback(() => {
    setRepeatMode((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
  }, [])

  const markError = useCallback(
    (_trackId: string) => {
      // Caller (Music.tsx) handles updating the track list
      // Just advance to next
      advanceNext()
    },
    [advanceNext],
  )

  // Audio element event handlers (wired up in PlayerBar via the ref)
  const handleEnded = useCallback(() => {
    advanceNext()
  }, [advanceNext])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (audio) setCurrentTime(audio.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio) setDuration(audio.duration)
  }, [])

  const handleError = useCallback(() => {
    if (currentTrack) markError(currentTrack.id)
  }, [currentTrack, markError])

  const handlePlay = useCallback(() => setIsPlaying(true), [])
  const handlePause = useCallback(() => setIsPlaying(false), [])

  return {
    audioRef,
    queue,
    currentQueueIdx,
    currentTrack,
    isPlaying,
    repeatMode,
    shuffle,
    volume,
    isMuted,
    currentTime,
    duration,
    play,
    togglePlay,
    next,
    prev,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    markError,
    // audio event handlers to wire onto <audio>
    handleEnded,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleError,
    handlePlay,
    handlePause,
  }
}
