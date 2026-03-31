import { useState, useEffect, useCallback } from 'react'
import { Music as MusicIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useMusicPlayer, type MusicTrack } from '@/hooks/useMusicPlayer'
import { PlaylistRow } from '@/components/music/PlaylistRow'
import { PlayerBar } from '@/components/music/PlayerBar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DeckOption = { id: string; name: string }

// Module-level cache — survives component unmount/remount within the same browser session
type MusicCache = { tracks: MusicTrack[]; decks: DeckOption[]; userId: string }
let _musicCache: MusicCache | null = null

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

export default function Music() {
  const { user } = useAuth()
  const [allTracks, setAllTracks] = useState<MusicTrack[]>([])
  const [errorTrackIds, setErrorTrackIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [deckFilter, setDeckFilter] = useState<string>('all')
  const [decks, setDecks] = useState<DeckOption[]>([])

  // Merge error state into tracks
  const tracks: MusicTrack[] = allTracks.map((t) =>
    errorTrackIds.has(t.id) ? { ...t, error: true } : t,
  )

  const filteredTracks =
    deckFilter === 'all' ? tracks : tracks.filter((t) => t.deck_id === deckFilter)

  const player = useMusicPlayer(filteredTracks)

  const handleMarkError = useCallback((trackId: string) => {
    setErrorTrackIds((prev) => new Set(prev).add(trackId))
    player.markError(trackId)
  }, [player])

  // Fetch data (with module-level cache to avoid reload on every navigation)
  useEffect(() => {
    if (!user) return

    // Serve from cache if it belongs to the same user
    if (_musicCache && _musicCache.userId === user.id) {
      setAllTracks(_musicCache.tracks)
      setDecks(_musicCache.decks)
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

        // Collect unique decks for filter
        const seen = new Map<string, string>()
        for (const t of mapped) {
          if (!seen.has(t.deck_id)) seen.set(t.deck_id, t.deckName)
        }
        const deckList = Array.from(seen.entries()).map(([id, name]) => ({ id, name }))

        _musicCache = { tracks: mapped, decks: deckList, userId: user.id }
        setAllTracks(mapped)
        setDecks(deckList)
        setLoading(false)
      })
  }, [user])

  // Reset player when filter changes (queue recomputes inside hook, but reset current idx)
  useEffect(() => {
    // Nothing needed — useMusicPlayer recomputes queue from filteredTracks on every render.
    // Changing deckFilter resets the filtered list but the current track may still be valid.
  }, [deckFilter])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in an input
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

  const songsWithAudio = filteredTracks.filter((t) => t.suno_audio_url).length
  const totalSongs = filteredTracks.length

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <MusicIcon className="h-6 w-6 text-[var(--accent,#06b6d4)]" />
          <h1 className="text-xl font-semibold text-white">Your Music</h1>
          {!loading && (
            <span className="text-sm text-gray-500">
              {songsWithAudio} of {totalSongs} songs
            </span>
          )}
        </div>

        {/* Deck filter */}
        {decks.length > 1 && (
          <Select value={deckFilter} onValueChange={setDeckFilter}>
            <SelectTrigger
              size="sm"
              className="w-[180px] bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 focus-visible:ring-0 focus-visible:border-white/30"
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

      {/* Playlist */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
            Loading songs…
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <MusicIcon className="h-10 w-10 text-gray-700" />
            <p className="text-gray-500 text-sm">No words generated yet.</p>
          </div>
        ) : (
          <div className="border-t border-white/5">
            {filteredTracks.map((track) => (
              <PlaylistRow
                key={track.id}
                track={track}
                isActive={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                onClick={() => player.play(track.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Persistent player bar */}
      <PlayerBar
        audioRef={player.audioRef}
        currentTrack={player.currentTrack}
        isPlaying={player.isPlaying}
        repeatMode={player.repeatMode}
        shuffle={player.shuffle}
        volume={player.volume}
        isMuted={player.isMuted}
        currentTime={player.currentTime}
        duration={player.duration}
        onTogglePlay={player.togglePlay}
        onNext={player.next}
        onPrev={player.prev}
        onSeek={player.seekTo}
        onSetVolume={player.setVolume}
        onToggleMute={player.toggleMute}
        onCycleRepeat={player.cycleRepeat}
        onToggleShuffle={player.toggleShuffle}
        onEnded={player.handleEnded}
        onTimeUpdate={player.handleTimeUpdate}
        onLoadedMetadata={player.handleLoadedMetadata}
        onError={() => player.currentTrack && handleMarkError(player.currentTrack.id)}
        onPlay={player.handlePlay}
        onPause={player.handlePause}
      />
    </div>
  )
}
