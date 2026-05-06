import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Music as MusicIcon, SkipBack, SkipForward, Play, Pause, Repeat, Repeat1, Shuffle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { trackHasAudio, useMusicPlayer, type MusicTrack } from '@/hooks/useMusicPlayer'
import { OrbVisualizer } from '@/components/music/OrbVisualizer'
import { OrbThumbnailRow } from '@/components/music/OrbThumbnailRow'
import { LyricsSheet } from '@/components/music/LyricsSheet'
import { GenerateSongModal } from '@/components/song-generation/GenerateSongModal'
import { VolumeControl } from '@/components/VolumeControl'
import { compactMusicCaptionSegment, resolveTrackMusicCaption } from '@/lib/musicDisplayMetadata'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { useTranslation } from '@/hooks/useTranslation'
import {
  PLAYER_ACTIVE_TOGGLE_CLASS,
  PLAYER_FOCUS_RING_CLASS,
  PLAYER_INACTIVE_TOGGLE_CLASS,
  PLAYER_ROUNDED_ICON_BUTTON_CLASS,
} from '@/lib/playerStyles'

const ACTIVE_MUSIC_JOB_STATUSES = ['pending', 'processing', 'submitted', 'polling', 'uploading'] as const
type SongGenerationStatus = typeof ACTIVE_MUSIC_JOB_STATUSES[number]
type AudioFilter = 'all' | 'with' | 'without'

type DeckOption = { id: string; name: string }
type LatestMusicJobRow = {
  word_id: string
  status: string | null
  music_caption: string | null
  concept_artifact: Record<string, unknown> | null
  completed_at: string | null
  created_at: string | null
}

type MusicCache = { tracks: MusicTrack[]; decks: DeckOption[]; userId: string }
let _pgMusicCache: MusicCache | null = null

function mapToTrack(row: Record<string, unknown>): MusicTrack {
  const meta = row.metadata as Record<string, unknown> | null
  const songGeneration =
    meta?.song_generation && typeof meta.song_generation === 'object'
      ? meta.song_generation as Record<string, unknown>
      : null
  const deckRow = row.decks as { id: string; name: string } | null
  const songGenre = songGeneration?.genre as string | undefined
  const track = {
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
    metadata: meta,
    song_generation: songGeneration,
    latest_music_job: null,
    genre: songGenre ?? null,
    duration: null,
    error: false,
  }
  return {
    ...track,
    genre: compactMusicCaptionSegment(resolveTrackMusicCaption(track)),
  }
}

async function fetchLatestCompleteMusicJobs(wordIds: string[]): Promise<Map<string, LatestMusicJobRow>> {
  if (wordIds.length === 0) return new Map()

  const { data } = await supabase
    .from('music_generation_jobs')
    .select('word_id, status, music_caption, concept_artifact, completed_at, created_at')
    .in('word_id', wordIds)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const latest = new Map<string, LatestMusicJobRow>()
  for (const row of (data ?? []) as LatestMusicJobRow[]) {
    if (!latest.has(row.word_id)) latest.set(row.word_id, row)
  }
  return latest
}

function applyLatestMusicJobs(tracks: MusicTrack[], jobs: Map<string, LatestMusicJobRow>): MusicTrack[] {
  return tracks.map((track) => {
    const latest_music_job = jobs.get(track.id) ?? null
    return {
      ...track,
      latest_music_job,
      genre: compactMusicCaptionSegment(resolveTrackMusicCaption(track, latest_music_job)),
    }
  })
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MusicPG() {
  const { t } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const [allTracks, setAllTracks] = useState<MusicTrack[]>([])
  const [errorTrackIds, setErrorTrackIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [deckFilter, setDeckFilter] = useState<string>('all')
  const [audioFilter, setAudioFilter] = useState<AudioFilter>('all')
  const [decks, setDecks] = useState<DeckOption[]>([])
  const [orbSize, setOrbSize] = useState(300)
  const [songModalTrack, setSongModalTrack] = useState<MusicTrack | null>(null)
  const [lyricsTrack, setLyricsTrack] = useState<MusicTrack | null>(null)
  const [songStatusMap, setSongStatusMap] = useState<Map<string, SongGenerationStatus>>(new Map())
  const songStatusMapRef = useRef(songStatusMap)
  const songPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // Merge error state into tracks
  const tracks: MusicTrack[] = allTracks.map((t) =>
    errorTrackIds.has(t.id) ? { ...t, error: true } : t,
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
  const displayCaptionSegment = compactMusicCaptionSegment(resolveTrackMusicCaption(currentTrack))

  useEffect(() => {
    songStatusMapRef.current = songStatusMap
  }, [songStatusMap])

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

  const fetchTracks = useCallback(async (bustCache = false) => {
    if (!user) return

    if (!bustCache && _pgMusicCache && _pgMusicCache.userId === user.id) {
      setAllTracks(_pgMusicCache.tracks)
      setDecks(_pgMusicCache.decks)
      setLoading(false)
      return
    }

    if (bustCache) _pgMusicCache = null
    setLoading(true)

    const { data } = await supabase
      .from('words')
      .select(`
        id, deck_id, word, translation,
        thumbnail_url, suno_storage_url, suno_audio_url, music_state, retry_requested, metadata, created_at,
        decks(id, name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
    if (!data) return
    const mapped = (data as Record<string, unknown>[]).map(mapToTrack)
    const latestJobs = await fetchLatestCompleteMusicJobs(mapped.map((track) => track.id))
    const tracksWithJobs = applyLatestMusicJobs(mapped, latestJobs)

    const seen = new Map<string, string>()
    for (const t of tracksWithJobs) {
      if (!seen.has(t.deck_id)) seen.set(t.deck_id, t.deckName)
    }
    const deckList = Array.from(seen.entries()).map(([id, name]) => ({ id, name }))

    _pgMusicCache = { tracks: tracksWithJobs, decks: deckList, userId: user.id }
    setAllTracks(tracksWithJobs)
    setDecks(deckList)
    setLoading(false)
  }, [user])

  // Fetch data
  useEffect(() => {
    void fetchTracks(true)
  }, [fetchTracks])

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

  useEffect(() => {
    const hasActive = songStatusMap.size > 0
    if (!hasActive) {
      if (songPollRef.current) {
        clearInterval(songPollRef.current)
        songPollRef.current = null
      }
      return
    }

    if (songPollRef.current) return

    songPollRef.current = setInterval(async () => {
      if (!user) return
      let newMap: Map<string, SongGenerationStatus>
      try {
        newMap = await fetchActiveSongJobs()
      } catch {
        return
      }

      const justCompleted = [...songStatusMap.keys()].filter((id) => !newMap.has(id))
      if (justCompleted.length > 0) {
        void fetchTracks(true)
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

  return (
    <div className="flex flex-col min-h-full pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--nav-bg)] pt-6 pb-2 px-6 flex justify-center backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 flex-wrap w-full max-w-2xl">
          <MusicIcon className="theme-icon-accent h-5 w-5 shrink-0" />
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t('music.yourMusic')}</h1>
          {decks.length > 1 && (
            <Select value={deckFilter} onValueChange={setDeckFilter}>
              <SelectTrigger
                size="sm"
                className="theme-input w-[160px] hover:bg-[var(--accent-soft)] focus-visible:ring-0 focus-visible:border-[var(--accent)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="theme-popover">
                <SelectItem value="all" className="focus:bg-[var(--accent-soft)] focus:text-[var(--text-primary)]">
                  {t('music.allSongs')}
                </SelectItem>
                {decks.map((d) => (
                  <SelectItem
                    key={d.id}
                    value={d.id}
                    className="focus:bg-[var(--accent-soft)] focus:text-[var(--text-primary)]"
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
              className="theme-input w-[150px] hover:bg-[var(--accent-soft)] focus-visible:ring-0 focus-visible:border-[var(--accent)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="theme-popover">
              <SelectItem value="all" className="focus:bg-[var(--accent-soft)] focus:text-[var(--text-primary)]">
                {t('music.filter.all')}
              </SelectItem>
              <SelectItem value="with" className="focus:bg-[var(--accent-soft)] focus:text-[var(--text-primary)]">
                {t('music.filter.withMusic')}
              </SelectItem>
              <SelectItem value="without" className="focus:bg-[var(--accent-soft)] focus:text-[var(--text-primary)]">
                {t('music.filter.withoutMusic')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Central area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0 py-4 px-6">
        {loading ? (
          <LoadingIndicator text={t('music.loadingSongs')} />
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <MusicIcon className="h-10 w-10 text-[var(--text-muted)] opacity-70" />
            <p className="theme-muted-text text-sm">{t('music.noSongs')}</p>
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
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)] leading-tight">
                      {currentTrack.word}
                    </h2>
                    {currentTrack.translation && (
                      <p className="text-[var(--text-secondary)] mt-1">{currentTrack.translation}</p>
                    )}
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {[displayCaptionSegment, formatTime(duration)].filter(Boolean).join(' · ')}
                    </p>
                  </>
                ) : (
                  <p className="theme-muted-text text-sm">Select a song to play</p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={player.prev}
                disabled={!currentTrack}
                className={`w-10 h-10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] ${PLAYER_ROUNDED_ICON_BUTTON_CLASS}`}
                aria-label="Previous"
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={player.togglePlay}
                disabled={!currentTrack}
                className={`w-12 h-12 flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] hover:brightness-110 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent-glow)] ${PLAYER_FOCUS_RING_CLASS}`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>

              <button
                onClick={player.next}
                disabled={!currentTrack}
                className={`w-10 h-10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] ${PLAYER_ROUNDED_ICON_BUTTON_CLASS}`}
                aria-label="Next"
              >
                <SkipForward size={18} />
              </button>

              <button
                onClick={player.cycleRepeat}
                className={`w-9 h-9 ${PLAYER_ROUNDED_ICON_BUTTON_CLASS} ${
                  repeatMode !== 'off'
                    ? PLAYER_ACTIVE_TOGGLE_CLASS
                    : PLAYER_INACTIVE_TOGGLE_CLASS
                }`}
                aria-label={`Repeat: ${repeatMode}`}
                title={repeatMode === 'off' ? 'Repeat' : 'Repeat one'}
              >
                <RepeatIcon size={15} />
              </button>

              <button
                onClick={player.toggleShuffle}
                className={`w-9 h-9 ${PLAYER_ROUNDED_ICON_BUTTON_CLASS} ${
                  shuffle
                    ? PLAYER_ACTIVE_TOGGLE_CLASS
                    : PLAYER_INACTIVE_TOGGLE_CLASS
                }`}
                aria-label="Shuffle"
                title="Shuffle"
              >
                <Shuffle size={15} />
              </button>

              <button
                onClick={() => currentTrack && setLyricsTrack(currentTrack)}
                disabled={!currentTrack || !trackHasAudio(currentTrack)}
                className={`w-9 h-9 ${PLAYER_ROUNDED_ICON_BUTTON_CLASS} ${PLAYER_INACTIVE_TOGGLE_CLASS}`}
                aria-label={t('music.lyrics')}
                title={t('music.lyrics')}
              >
                <FileText size={15} />
              </button>
            </div>

            {/* Progress / seek bar + volume — prominent, below controls */}
            <div className="w-full max-w-md flex items-center gap-3">
              <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums shrink-0 w-9 text-right">
                {formatTime(currentTime)}
              </span>

              <div
                ref={progressBarRef}
                className="flex-1 h-1.5 bg-[var(--field-bg)] rounded-full cursor-pointer group"
                onClick={handleSeekClick}
              >
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-none group-hover:brightness-110"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums shrink-0 w-9">
                {formatTime(duration)}
              </span>

              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={player.setVolume}
                onToggleMute={player.toggleMute}
                buttonClassName={`w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] ${PLAYER_ROUNDED_ICON_BUTTON_CLASS}`}
                iconSize={15}
                popDirection="up"
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
          onGenerateSong={setSongModalTrack}
          generationStatusMap={songStatusMap}
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
        variant="glassy"
      />
    </div>
  )
}
