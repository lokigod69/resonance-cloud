import { useState, useEffect, useCallback, useRef } from 'react'
import { Music as MusicIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { trackHasAudio, useMusicPlayer, type MusicTrack } from '@/hooks/useMusicPlayer'
import { PlaylistRow } from '@/components/music/PlaylistRow'
import { PlayerBar } from '@/components/music/PlayerBar'
import { LyricsSheet } from '@/components/music/LyricsSheet'
import { GenerateSongModal } from '@/components/song-generation/GenerateSongModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { useTranslation } from '@/hooks/useTranslation'

const ACTIVE_MUSIC_JOB_STATUSES = ['pending', 'processing', 'submitted', 'polling', 'uploading'] as const
type SongGenerationStatus = typeof ACTIVE_MUSIC_JOB_STATUSES[number]
type AudioFilter = 'all' | 'with' | 'without'

type DeckOption = { id: string; name: string }

// Module-level cache — survives component unmount/remount within the same browser session
type MusicCache = { tracks: MusicTrack[]; decks: DeckOption[]; userId: string }
let _musicCache: MusicCache | null = null

function mapToTrack(row: Record<string, unknown>): MusicTrack {
  const meta = row.metadata as Record<string, unknown> | null
  const songGeneration =
    meta?.song_generation && typeof meta.song_generation === 'object'
      ? meta.song_generation as Record<string, unknown>
      : null
  const deckRow = row.decks as { id: string; name: string } | null
  const rawCaption = meta?.music_caption as string | undefined
  const songGenre = songGeneration?.genre as string | undefined
  return {
    id: row.id as string,
    deck_id: row.deck_id as string,
    deckName: deckRow?.name ?? 'Unknown deck',
    word: row.word as string,
    translation: (row.translation as string | null) ?? null,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    suno_storage_url: (row.suno_storage_url as string | null) ?? null,
    suno_audio_url: (row.suno_audio_url as string | null) ?? null,
    music_state: (row.music_state as string | null) ?? null,
    retry_requested: Boolean(row.retry_requested),
    song_generation: songGeneration,
    genre: rawCaption ? rawCaption.split(',')[0].trim() : songGenre ?? null,
    duration: null,
    error: false,
  }
}

export default function Music() {
  const { t } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const [allTracks, setAllTracks] = useState<MusicTrack[]>([])
  const [errorTrackIds, setErrorTrackIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [deckFilter, setDeckFilter] = useState<string>('all')
  const [audioFilter, setAudioFilter] = useState<AudioFilter>('all')
  const [decks, setDecks] = useState<DeckOption[]>([])
  const [songModalTrack, setSongModalTrack] = useState<MusicTrack | null>(null)
  const [lyricsTrack, setLyricsTrack] = useState<MusicTrack | null>(null)

  // Song-only state: wordId -> current music_generation_jobs status
  const [songStatusMap, setSongStatusMap] = useState<Map<string, SongGenerationStatus>>(new Map())
  const songStatusMapRef = useRef(songStatusMap)
  const songPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Merge error state into tracks
  const tracks: MusicTrack[] = allTracks.map((track) =>
    errorTrackIds.has(track.id) ? { ...track, error: true } : track,
  )

  const filteredTracks = tracks.filter((track) => {
    const inDeck = deckFilter === 'all' || track.deck_id === deckFilter
    const hasAudio = trackHasAudio(track)
    const inAudioFilter =
      audioFilter === 'all' ||
      (audioFilter === 'with' && hasAudio) ||
      (audioFilter === 'without' && !hasAudio)
    return inDeck && inAudioFilter
  })

  const player = useMusicPlayer(filteredTracks)

  useEffect(() => {
    songStatusMapRef.current = songStatusMap
  }, [songStatusMap])

  const handleMarkError = useCallback((trackId: string) => {
    setErrorTrackIds((prev) => new Set(prev).add(trackId))
    player.markError(trackId)
  }, [player])

  // Fetch data (with module-level cache to avoid reload on every navigation)
  const fetchTracks = useCallback((bustCache = false) => {
    if (!user) return

    if (!bustCache && _musicCache && _musicCache.userId === user.id) {
      setAllTracks(_musicCache.tracks)
      setDecks(_musicCache.decks)
      setLoading(false)
      return
    }

    if (bustCache) _musicCache = null
    setLoading(true)

    supabase
      .from('words')
      .select(`
        id, deck_id, word, translation,
        thumbnail_url, suno_storage_url, suno_audio_url, music_state, retry_requested, metadata, created_at,
        decks(id, name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
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

  useEffect(() => {
    fetchTracks(true)
  }, [fetchTracks])

  // ── Suno retry ──────────────────────────────────────────────────────────────

  const fetchActiveSongJobs = useCallback(async () => {
    if (!user) return new Map<string, SongGenerationStatus>()
    const trackedWordIds = Array.from(new Set([
      ...allTracks.map((track) => track.id),
      ...songStatusMapRef.current.keys(),
    ]))
    if (trackedWordIds.length === 0) return new Map<string, SongGenerationStatus>()

    const { data, error } = await supabase
      .from('music_generation_jobs')
      .select('word_id, status')
      .eq('user_id', user.id)
      .in('word_id', trackedWordIds)
      .in('status', [...ACTIVE_MUSIC_JOB_STATUSES])
    if (error) throw error

    const map = new Map<string, SongGenerationStatus>()
    for (const row of data ?? []) {
      map.set(row.word_id, row.status as SongGenerationStatus)
    }
    return map
  }, [user, allTracks])

  // On mount: load active retry flags/stages so the UI shows queued state
  // if the user navigated away and came back while a retry was in progress.
  useEffect(() => {
    if (!user) return
    fetchActiveSongJobs()
      .then(setSongStatusMap)
      .catch(() => {})
  }, [user, fetchActiveSongJobs])

  const handleSongSubmitted = useCallback(async (wordId: string, status: SongGenerationStatus) => {
    setSongStatusMap((prev) => new Map(prev).set(wordId, status))
    await refreshProfile()
  }, [refreshProfile])

  // Poll active retry rows every 15s; refetch tracks when one completes.
  useEffect(() => {
    const hasActive = songStatusMap.size > 0
    if (!hasActive) {
      if (songPollRef.current) {
        clearInterval(songPollRef.current)
        songPollRef.current = null
      }
      return
    }

    if (songPollRef.current) return // already polling

    songPollRef.current = setInterval(async () => {
      if (!user) return
      let newMap: Map<string, SongGenerationStatus>
      try {
        newMap = await fetchActiveSongJobs()
      } catch {
        return
      }

      // Detect completions: ids that were active before but are no longer active
      const justCompleted = [...songStatusMap.keys()].filter((id) => !newMap.has(id))
      if (justCompleted.length > 0) {
        fetchTracks(true) // bust cache and refetch
        void refreshProfile()
      }

      setSongStatusMap(newMap)
    }, 10_000)

    return () => {
      if (songPollRef.current) {
        clearInterval(songPollRef.current)
        songPollRef.current = null
      }
    }
  }, [songStatusMap, user, fetchTracks, fetchActiveSongJobs, refreshProfile])

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

  return (
    <div className="flex flex-col min-h-full pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:pb-20">
      {/* Page header */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <MusicIcon className="h-6 w-6 text-[var(--accent,#06b6d4)]" />
          <h1 className="text-xl font-semibold text-secondary-foreground">{t('music.yourMusic')}</h1>

          {/* Deck filter */}
          {decks.length > 1 && (
            <Select value={deckFilter} onValueChange={setDeckFilter}>
              <SelectTrigger
                size="sm"
                className="w-[180px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('music.allSongs')}
                </SelectItem>
                {decks.map((d) => (
                  <SelectItem
                    key={d.id}
                    value={d.id}
                  >
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={audioFilter} onValueChange={(value) => setAudioFilter(value as AudioFilter)}>
            <SelectTrigger
              size="sm"
              className="w-[160px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('music.filter.all')}</SelectItem>
              <SelectItem value="with">{t('music.filter.withMusic')}</SelectItem>
              <SelectItem value="without">{t('music.filter.withoutMusic')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Playlist */}
      <div className="flex-1">
        <div className="max-w-5xl mx-auto w-full px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingIndicator text={t('music.loadingSongs')} />
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <MusicIcon className="h-10 w-10 text-gray-700" />
            <p className="text-gray-500 text-sm">{t('music.noSongs')}</p>
          </div>
        ) : (
          <div className="border-t border-border">
            {filteredTracks.map((track) => (
              <PlaylistRow
                key={track.id}
                track={track}
                isActive={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                onClick={() => player.play(track.id)}
                onGenerateSong={() => setSongModalTrack(track)}
                onShowLyrics={() => setLyricsTrack(track)}
                isGeneratingSong={songStatusMap.has(track.id)}
                generationStatus={songStatusMap.get(track.id)}
              />
            ))}
          </div>
        )}
        </div>
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
      <GenerateSongModal
        open={songModalTrack !== null}
        onOpenChange={(open) => !open && setSongModalTrack(null)}
        track={songModalTrack}
        credits={profile?.credits ?? 0}
        onSubmitted={handleSongSubmitted}
      />
      <LyricsSheet
        open={lyricsTrack !== null}
        onOpenChange={(open) => !open && setLyricsTrack(null)}
        track={lyricsTrack}
        variant="classic"
      />
    </div>
  )
}
