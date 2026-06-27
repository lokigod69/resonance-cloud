import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { compactMusicCaptionSegment, resolveTrackMusicCaption } from '@/lib/musicDisplayMetadata'
import { getThumbnailUrl } from '@/lib/imageUrls'

export interface MusicTrack {
  id: string
  kind: 'word' | 'level'
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
  category_slug: string | null
  level_number: number | null
  target_language: string | null
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

function getTrackMediaTitle(track: MusicTrack): string {
  return track.word
}

function getTrackMediaArtist(track: MusicTrack): string {
  return compactMusicCaptionSegment(resolveTrackMusicCaption(track))
    ?? track.translation
    ?? 'Lingwave'
}

function getTrackMediaAlbum(track: MusicTrack): string {
  return track.deckName || 'Lingwave'
}

function getTrackMediaArtwork(track: MusicTrack): MediaImage[] {
  const src = getThumbnailUrl(track.thumbnail_url, { size: 512, format: 'webp' })
  if (!src) return []
  return [{ src, sizes: '512x512', type: 'image/webp' }]
}

function hasMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

function setMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
  if (!hasMediaSession()) return
  try {
    navigator.mediaSession.playbackState = state
  } catch {
    // Some Safari builds expose partial MediaSession support.
  }
}

function clearMediaSessionPosition() {
  if (!hasMediaSession() || typeof navigator.mediaSession.setPositionState !== 'function') return
  try {
    navigator.mediaSession.setPositionState({})
  } catch {
    // Invalid or partial platform state should not affect playback.
  }
}

function updateMediaSessionPositionForAudio(audio: HTMLAudioElement | null) {
  if (!hasMediaSession() || typeof navigator.mediaSession.setPositionState !== 'function') return
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return

  const duration = audio.duration
  const position = Math.max(0, Math.min(audio.currentTime, duration))
  const playbackRate = audio.playbackRate || 1
  try {
    navigator.mediaSession.setPositionState({ duration, position, playbackRate })
  } catch {
    // Safari can throw if position state becomes invalid during load/seek races.
  }
}

const MEDIA_SESSION_ACTIONS = [
  'play',
  'pause',
  'stop',
  'nexttrack',
  'previoustrack',
  'seekbackward',
  'seekforward',
  'seekto',
] as const

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
  const lastPositionSyncRef = useRef(0)

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

  const updateMediaSessionPosition = useCallback((audio = audioRef.current) => {
    updateMediaSessionPositionForAudio(audio)
  }, [])

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
      setMediaSessionPlaybackState('none')
      clearMediaSessionPosition()
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
      .then(() => {
        setIsPlaying(true)
        setMediaSessionPlaybackState('playing')
        updateMediaSessionPosition(audio)
      })
      .catch((error) => {
        warnPlaybackFailure(currentTrackId, error)
        setIsPlaying(false)
        setMediaSessionPlaybackState('paused')
      })
  }, [currentTrackId, currentTrackAudioUrl, updateMediaSessionPosition])

  useEffect(() => {
    if (!hasMediaSession()) return

    if (!currentTrack || !getTrackAudioUrl(currentTrack) || currentTrack.error) {
      navigator.mediaSession.metadata = null
      setMediaSessionPlaybackState('none')
      clearMediaSessionPosition()
      return
    }

    if (typeof MediaMetadata === 'undefined') return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: getTrackMediaTitle(currentTrack),
      artist: getTrackMediaArtist(currentTrack),
      album: getTrackMediaAlbum(currentTrack),
      artwork: getTrackMediaArtwork(currentTrack),
    })
    updateMediaSessionPosition()
  }, [
    currentTrack,
    currentTrack?.id,
    currentTrack?.word,
    currentTrack?.translation,
    currentTrack?.deckName,
    currentTrack?.thumbnail_url,
    currentTrack?.genre,
    currentTrack?.metadata,
    currentTrack?.song_generation,
    currentTrack?.latest_music_job,
    currentTrack?.error,
    currentTrackAudioUrl,
    updateMediaSessionPosition,
  ])

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
        audio
          .play()
          .then(() => {
            setMediaSessionPlaybackState('playing')
            updateMediaSessionPosition(audio)
          })
          .catch((error) => {
            if (currentTrackId) warnPlaybackFailure(currentTrackId, error)
            setMediaSessionPlaybackState('paused')
          })
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
        setMediaSessionPlaybackState('paused')
        return
      }
    }

    setCurrentQueueIdx(nextIdx)
  }, [queue.length, repeatMode, shuffle, shuffleOrder, currentQueueIdx, currentTrackId, updateMediaSessionPosition])

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
          .then(() => {
            setIsPlaying(true)
            setMediaSessionPlaybackState('playing')
            updateMediaSessionPosition(audio)
          })
          .catch((error) => {
            if (gesturePlayedTrackIdRef.current === track.id) {
              gesturePlayedTrackIdRef.current = null
            }
            warnPlaybackFailure(track.id, error)
            setIsPlaying(false)
            setMediaSessionPlaybackState('paused')
          })
      }
      setCurrentQueueIdx(idx)
    },
    [queue, updateMediaSessionPosition],
  )

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      setMediaSessionPlaybackState('paused')
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true)
          setMediaSessionPlaybackState('playing')
          updateMediaSessionPosition(audio)
        })
        .catch((error) => {
          warnPlaybackFailure(currentTrack.id, error)
          setIsPlaying(false)
          setMediaSessionPlaybackState('paused')
        })
    }
  }, [isPlaying, currentTrack, updateMediaSessionPosition])

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
      updateMediaSessionPosition(audio)
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
  }, [queue.length, shuffle, shuffleOrder, updateMediaSessionPosition])

  const seekTo = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !isFinite(audio.duration) || audio.duration === 0) return
    audio.currentTime = ratio * audio.duration
    updateMediaSessionPosition(audio)
  }, [updateMediaSessionPosition])

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
      void _trackId
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
    if (audio) {
      setCurrentTime(audio.currentTime)
      const now = performance.now()
      if (now - lastPositionSyncRef.current >= 1000) {
        lastPositionSyncRef.current = now
        updateMediaSessionPosition(audio)
      }
    }
  }, [updateMediaSessionPosition])

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      setDuration(audio.duration)
      updateMediaSessionPosition(audio)
    }
  }, [updateMediaSessionPosition])

  const handleError = useCallback(() => {
    if (currentTrack) markError(currentTrack.id)
  }, [currentTrack, markError])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    setMediaSessionPlaybackState('playing')
    updateMediaSessionPosition()
  }, [updateMediaSessionPosition])
  const handlePause = useCallback(() => {
    setIsPlaying(false)
    setMediaSessionPlaybackState('paused')
    updateMediaSessionPosition()
  }, [updateMediaSessionPosition])

  const mediaSessionHandlersRef = useRef({
    play,
    togglePlay,
    next,
    prev,
    seekTo,
    queue,
    currentTrack,
    isPlaying,
  })

  mediaSessionHandlersRef.current = {
    play,
    togglePlay,
    next,
    prev,
    seekTo,
    queue,
    currentTrack,
    isPlaying,
  }

  useEffect(() => {
    if (!hasMediaSession()) return

    const registerActionHandler = (
      action: typeof MEDIA_SESSION_ACTIONS[number],
      handler: MediaSessionActionHandler,
    ) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Unsupported actions vary by platform and Safari version.
      }
    }

    registerActionHandler('play', () => {
      const { currentTrack, queue, play } = mediaSessionHandlersRef.current
      const audio = audioRef.current
      if (audio && currentTrack) {
        audio
          .play()
          .then(() => {
            setMediaSessionPlaybackState('playing')
            updateMediaSessionPositionForAudio(audio)
          })
          .catch((error) => {
            console.warn('[mediasession] play rejected', error)
            setMediaSessionPlaybackState('paused')
          })
        return
      }
      const firstTrack = queue[0]
      if (firstTrack) play(firstTrack.id)
    })

    registerActionHandler('pause', () => {
      audioRef.current?.pause()
      setMediaSessionPlaybackState('paused')
    })

    registerActionHandler('stop', () => {
      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      audio.currentTime = 0
      setCurrentTime(0)
      updateMediaSessionPositionForAudio(audio)
      setMediaSessionPlaybackState('paused')
    })

    registerActionHandler('nexttrack', () => {
      mediaSessionHandlersRef.current.next()
    })

    registerActionHandler('previoustrack', () => {
      mediaSessionHandlersRef.current.prev()
    })

    registerActionHandler('seekbackward', (details) => {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset ?? 10))
      setCurrentTime(audio.currentTime)
      updateMediaSessionPositionForAudio(audio)
    })

    registerActionHandler('seekforward', (details) => {
      const audio = audioRef.current
      if (!audio) return
      const nextTime = audio.currentTime + (details.seekOffset ?? 10)
      audio.currentTime = Number.isFinite(audio.duration)
        ? Math.min(nextTime, audio.duration)
        : nextTime
      setCurrentTime(audio.currentTime)
      updateMediaSessionPositionForAudio(audio)
    })

    registerActionHandler('seekto', (details) => {
      const audio = audioRef.current
      if (!audio || typeof details.seekTime !== 'number' || !Number.isFinite(details.seekTime)) return
      const seekTime = Number.isFinite(audio.duration)
        ? Math.max(0, Math.min(details.seekTime, audio.duration))
        : Math.max(0, details.seekTime)
      if (details.fastSeek === true && typeof audio.fastSeek === 'function') {
        audio.fastSeek(seekTime)
      } else {
        audio.currentTime = seekTime
      }
      setCurrentTime(seekTime)
      updateMediaSessionPositionForAudio(audio)
    })

    return () => {
      for (const action of MEDIA_SESSION_ACTIONS) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          // Ignore unsupported cleanup paths.
        }
      }
      navigator.mediaSession.metadata = null
      setMediaSessionPlaybackState('none')
      clearMediaSessionPosition()
    }
  }, [])

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
