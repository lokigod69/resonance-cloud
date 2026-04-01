import { useState, useEffect, useCallback, useRef } from 'react'
import { Music as MusicIcon, SkipBack, SkipForward, Play, Pause, Repeat, Repeat1, Shuffle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useMusicPlayer, type MusicTrack } from '@/hooks/useMusicPlayer'
import { OrbVisualizer } from '@/components/music/OrbVisualizer'
import { OrbThumbnailRow } from '@/components/music/OrbThumbnailRow'
import { VolumeControl } from '@/components/VolumeControl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DeckOption = { id: string; name: string }

type MusicCache = { tracks: MusicTrack[]; decks: DeckOption[]; userId: string }
let _pgMusicCache: MusicCache | null = null

function mapToTrack(row: Record<string, unknown>): MusicTrack {
  const meta = row.metadata as Record<string, unknown> | null
  const deckRow = row.decks as { id: string; name: string } | null
  const rawCaption = meta?.music_caption as string | undefined
  return {
    id: row.id as string,
    deck_id: row.deck_id as string,
    deckName: deckRow?.name ?? 'Unknown deck',
    word: row.word as string,
    translation: (row.translation as string | null) ?? null,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    suno_audio_url: (row.suno_audio_url as string | null) ?? null,
    genre: rawCaption ? rawCaption.split(',')[0].trim() : null,
    duration: null,
    error: false,
  }
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MusicPG() {
  const { user } = useAuth()
  const [allTracks, setAllTracks] = useState<MusicTrack[]>([])
  const [errorTrackIds, setErrorTrackIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [deckFilter, setDeckFilter] = useState<string>('all')
  const [decks, setDecks] = useState<DeckOption[]>([])
  const [orbSize, setOrbSize] = useState(300)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // Merge error state into tracks
  const tracks: MusicTrack[] = allTracks.map((t) =>
    errorTrackIds.has(t.id) ? { ...t, error: true } : t,
  )

  const filteredTracks =
    deckFilter === 'all' ? tracks : tracks.filter((t) => t.deck_id === deckFilter)

  const player = useMusicPlayer(filteredTracks)

  const {
    currentTrack,
    isPlaying,
    repeatMode,
    shuffle,
    volume,
    isMuted,
    currentTime,
    duration,
  } = player

  const progress = duration > 0 ? currentTime / duration : 0
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  const handleMarkError = useCallback(
    (trackId: string) => {
      setErrorTrackIds((prev) => new Set(prev).add(trackId))
      player.markError(trackId)
    },
    [player],
  )

  // Responsive orb size
  useEffect(() => {
    const update = () => {
      setOrbSize(Math.min(300, window.innerWidth - 160))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Fetch data
  useEffect(() => {
    if (!user) return

    if (_pgMusicCache && _pgMusicCache.userId === user.id) {
      setAllTracks(_pgMusicCache.tracks)
      setDecks(_pgMusicCache.decks)
      setLoading(false)
      return
    }

    setLoading(true)

    supabase
      .from('words')
      .select(`
        id, deck_id, word, translation,
        thumbnail_url, suno_audio_url, metadata, created_at,
        decks(id, name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .order('created_at')
      .then(({ data }) => {
        if (!data) return
        const mapped = (data as Record<string, unknown>[]).map(mapToTrack)

        const seen = new Map<string, string>()
        for (const t of mapped) {
          if (!seen.has(t.deck_id)) seen.set(t.deck_id, t.deckName)
        }
        const deckList = Array.from(seen.entries()).map(([id, name]) => ({ id, name }))

        _pgMusicCache = { tracks: mapped, decks: deckList, userId: user.id }
        setAllTracks(mapped)
        setDecks(deckList)
        setLoading(false)
      })
  }, [user])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return

      if (e.code === 'Space') {
        e.preventDefault()
        player.togglePlay()
      } else if (e.key === 'n' || e.key === 'N') {
        player.next()
      } else if (e.key === 'p' || e.key === 'P') {
        player.prev()
      } else if (e.key === 'm' || e.key === 'M') {
        player.toggleMute()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [player])

  const handleSeekClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressBarRef.current
      if (!bar) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      player.seekTo(ratio)
    },
    [player],
  )

  const songsWithAudio = filteredTracks.filter((t) => t.suno_audio_url && !t.error).length
  const totalSongs = filteredTracks.length

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950 pt-6 pb-2 px-6 flex justify-center">
      <div className="flex items-center gap-3 flex-wrap w-full max-w-2xl">
        <MusicIcon className="h-5 w-5 text-[#5e6ad2] shrink-0" />
        <h1 className="text-lg font-semibold text-white">Your Music</h1>
        {!loading && (
          <span className="text-sm text-gray-500">
            {songsWithAudio} of {totalSongs} songs
          </span>
        )}
        {decks.length > 1 && (
          <Select value={deckFilter} onValueChange={setDeckFilter}>
            <SelectTrigger
              size="sm"
              className="w-[160px] bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 focus-visible:ring-0 focus-visible:border-white/30"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/10 text-gray-200">
              <SelectItem value="all" className="focus:bg-white/10 focus:text-white">
                All Songs
              </SelectItem>
              {decks.map((d) => (
                <SelectItem
                  key={d.id}
                  value={d.id}
                  className="focus:bg-white/10 focus:text-white"
                >
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      </div>

      {/* Central area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0 py-4 px-6">
        {loading ? (
          <div className="text-gray-500 text-sm">Loading songs…</div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <MusicIcon className="h-10 w-10 text-gray-700" />
            <p className="text-gray-500 text-sm">No words generated yet.</p>
          </div>
        ) : (
          <>
            {/* OrbVisualizer stays mounted — keying it on track ID would destroy
                the AudioContext on every track change, causing audio silence.
                Thumbnail crossfade is handled internally inside OrbVisualizer. */}
            <OrbVisualizer
              thumbnailUrl={currentTrack?.thumbnail_url ?? null}
              word={currentTrack?.word ?? ''}
              isPlaying={isPlaying}
              size={orbSize}
            />

            {/* Word info — animate this on track change (safe, no audio impact) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack?.id ?? 'empty'}
                className="text-center max-w-xs"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {currentTrack ? (
                  <>
                    <h2 className="text-2xl font-semibold text-white leading-tight">
                      {currentTrack.word}
                    </h2>
                    {currentTrack.translation && (
                      <p className="text-gray-400 mt-1">{currentTrack.translation}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {[currentTrack.genre, formatTime(duration)].filter(Boolean).join(' · ')}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-600 text-sm">Select a song to play</p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={player.prev}
                disabled={!currentTrack}
                className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous"
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={player.togglePlay}
                disabled={!currentTrack}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-gray-900 hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>

              <button
                onClick={player.next}
                disabled={!currentTrack}
                className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next"
              >
                <SkipForward size={18} />
              </button>

              <button
                onClick={player.cycleRepeat}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  repeatMode !== 'off'
                    ? 'text-[#5e6ad2]'
                    : 'text-gray-600 hover:text-white hover:bg-white/10'
                }`}
                aria-label={`Repeat: ${repeatMode}`}
                title={repeatMode === 'off' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
              >
                <RepeatIcon size={15} />
              </button>

              <button
                onClick={player.toggleShuffle}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  shuffle
                    ? 'text-[#5e6ad2]'
                    : 'text-gray-600 hover:text-white hover:bg-white/10'
                }`}
                aria-label="Shuffle"
                title="Shuffle"
              >
                <Shuffle size={15} />
              </button>
            </div>

            {/* Progress / seek bar + volume — prominent, below controls */}
            <div className="w-full max-w-md flex items-center gap-3">
              <span className="text-[11px] font-mono text-gray-500 tabular-nums shrink-0 w-9 text-right">
                {formatTime(currentTime)}
              </span>

              <div
                ref={progressBarRef}
                className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer group"
                onClick={handleSeekClick}
              >
                <div
                  className="h-full bg-[#5e6ad2] rounded-full transition-none group-hover:bg-[#7b87e8]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              <span className="text-[11px] font-mono text-gray-500 tabular-nums shrink-0 w-9">
                {formatTime(duration)}
              </span>

              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={player.setVolume}
                onToggleMute={player.toggleMute}
                buttonClassName="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                iconSize={15}
              />
            </div>
          </>
        )}
      </div>

      {/* Bottom: orb thumbnails pinned near bottom */}
      {!loading && filteredTracks.length > 0 && (
        <OrbThumbnailRow
          tracks={filteredTracks}
          currentTrackId={currentTrack?.id ?? null}
          onTrackSelect={player.play}
        />
      )}

      {/* Hidden audio element — owned by useMusicPlayer */}
      <audio
        ref={player.audioRef}
        onEnded={player.handleEnded}
        onTimeUpdate={player.handleTimeUpdate}
        onLoadedMetadata={player.handleLoadedMetadata}
        onError={() => currentTrack && handleMarkError(currentTrack.id)}
        onPlay={player.handlePlay}
        onPause={player.handlePause}
      />
    </div>
  )
}
