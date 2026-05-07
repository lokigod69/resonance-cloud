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
  music_state: string | null
  retry_requested: boolean
  metadata: Record<string, unknown> | null
  song_generation: Record<string, unknown> | null
  latest_music_job?: Record<string, unknown> | null
  genre: string | null
  duration: number | null
  error: boolean
}

export type RepeatMode = 'off' | 'one'

export function trackHasAudio(track: Pick<MusicTrack, 'suno_storage_url' | 'suno_audio_url' | 'error'>): boolean {
  return !!(track.suno_storage_url ?? track.suno_audio_url) && !track.error
}

function getTrackAudioUrl(track: Pick<MusicTrack, 'suno_storage_url' | 'suno_audio_url'>): string | null {
  return track.suno_storage_url ?? track.suno_audio_url
}

function getPlaybackFailureKind(error: unknown): string {
  const name = error instanceof Error ? error.name : 'UnknownError'
  if (name === 'NotAllowedError') return 'not-allowed'
  if (name === 'NetworkError') return 'network'
  if (name === 'NotSupportedError') return 'codec-or-source-unsupported'
  if (name === 'AbortError') return 'aborted'
  return 'playback-failed'
}

function warnPlaybackFailure(trackId: string, error: unknown) {
  const name = error instanceof Error ? error.name : 'UnknownError'
  const message = error instanceof Error ? error.message : String(error)
  console.warn('[useMusicPlayer] audio playback failed', {
    trackId,
    kind: getPlaybackFailureKind(error),
    name,
    message,
  })
}

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
  const gesturePlayedTrackIdRef = useRef<string | null>(null)

  // Stable reference — only recomputed when tracks identity changes
  const queue = useMemo(
    () => tracks.filter(trackHasAudio),
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
  const currentTrackId = currentTrack?.id ?? null
  const currentTrackAudioUrl = currentTrack ? getTrackAudioUrl(currentTrack) : null

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
    if (!currentTrackId || !currentTrackAudioUrl) {
      audio.src = ''
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      return
    }
    if (gesturePlayedTrackIdRef.current === currentTrackId) {
      gesturePlayedTrackIdRef.current = null
      return
    }
    audio.src = currentTrackAudioUrl
    audio.load()
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((error) => {
        warnPlaybackFailure(currentTrackId, error)
        setIsPlaying(false)
      })
  }, [currentTrackId, currentTrackAudioUrl])

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

    const prev = currentQueueIdx
    let nextIdx: number
    if (prev === null) {
      nextIdx = 0
    } else if (shuffle && shuffleOrder.length === queue.length) {
      const pos = shuffleOrder.indexOf(prev)
      nextIdx = shuffleOrder[(pos + 1) % shuffleOrder.length]
    } else {
      nextIdx = prev + 1
      if (nextIdx >= queue.length) {
        audioRef.current?.pause()
        setIsPlaying(false)
        return
      }
    }

    setCurrentQueueIdx(nextIdx)
  }, [queue.length, repeatMode, shuffle, shuffleOrder, currentQueueIdx])

  const play = useCallback(
    (trackId: string) => {
      const idx = queue.findIndex((t) => t.id === trackId)
      if (idx === -1) return
      const track = queue[idx]
      const audioUrl = getTrackAudioUrl(track)
      const audio = audioRef.current
      if (audioUrl && audio) {
        gesturePlayedTrackIdRef.current = track.id
        audio.src = audioUrl
        audio.load()
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch((error) => {
            if (gesturePlayedTrackIdRef.current === track.id) {
              gesturePlayedTrackIdRef.current = null
            }
            warnPlaybackFailure(track.id, error)
            setIsPlaying(false)
          })
      }
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
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((error) => {
          warnPlaybackFailure(currentTrack.id, error)
        })
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
    setRepeatMode((r) => (r === 'off' ? 'one' : 'off'))
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
