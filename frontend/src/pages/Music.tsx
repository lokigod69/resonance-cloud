import { useState, useEffect, useCallback, useRef } from 'react'
import { Music as MusicIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { trackHasAudio, useMusicPlayer, type MusicTrack } from '@/hooks/useMusicPlayer'
import { MediaSegments } from '@/components/media/MediaSegments'
import { PlaylistRow } from '@/components/music/PlaylistRow'
import { PlayerBar } from '@/components/music/PlayerBar'
import { LyricsSheet } from '@/components/music/LyricsSheet'
import { GenerateSongModal } from '@/components/song-generation/GenerateSongModal'
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
import { formatMusicDeckLabel, type MusicLabelTranslateFn } from '@/lib/musicTrackLabels'
import { totalCredits } from '@/lib/credits'

const ACTIVE_MUSIC_JOB_STATUSES = ['pending', 'processing', 'submitted', 'polling', 'uploading'] as const
type SongGenerationStatus = typeof ACTIVE_MUSIC_JOB_STATUSES[number]
type AudioFilter = 'all' | 'with' | 'without'

type DeckOption = { id: string; name: string }
type TrackDeckRow = { id: string; name: string; target_language: string | null }
type TrackDeckRelation = TrackDeckRow | TrackDeckRow[] | null
type LatestMusicJobRow = {
  word_id: string
  status: string | null
  music_caption: string | null
  concept_artifact: Record<string, unknown> | null
  completed_at: string | null
  created_at: string | null
}
type CompletedLevelMusicJobRow = {
  id: string
  deck_id: string | null
  category_slug: string | null
  level_number: number | null
  target_language: string | null
  display_title: string | null
  lyrics: string | null
  suno_storage_url: string | null
  suno_audio_url: string | null
  music_caption: string | null
  concept_artifact: Record<string, unknown> | null
  lyric_mode: string | null
  genre: string | null
  vocal_gender: string | null
  completed_at: string | null
  created_at: string | null
  decks: TrackDeckRelation
}

// Module-level cache — survives component unmount/remount within the same browser session
type MusicCache = { tracks: MusicTrack[]; decks: DeckOption[]; userId: string; locale: string }
let _musicCache: MusicCache | null = null

function resolveTrackDeckRow(decks: TrackDeckRelation): TrackDeckRow | null {
  return Array.isArray(decks) ? decks[0] ?? null : decks
}

function mapToTrack(row: Record<string, unknown>, t: MusicLabelTranslateFn): MusicTrack {
  const meta = row.metadata as Record<string, unknown> | null
  const songGeneration =
    meta?.song_generation && typeof meta.song_generation === 'object'
      ? meta.song_generation as Record<string, unknown>
      : null
  const deckRow = resolveTrackDeckRow(row.decks as TrackDeckRelation)
  const songGenre = songGeneration?.genre as string | undefined
  const track = {
    id: row.id as string,
    kind: 'word' as const,
    deck_id: row.deck_id as string,
    deckName: formatMusicDeckLabel(deckRow?.name ?? 'Unknown deck', deckRow?.target_language ?? null, t),
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
    category_slug: null,
    level_number: null,
    target_language: deckRow?.target_language ?? null,
    genre: songGenre ?? null,
    duration: null,
    error: false,
  }
  return {
    ...track,
    genre: compactMusicCaptionSegment(resolveTrackMusicCaption(track)),
  }
}

function mapLevelJobToTrack(row: CompletedLevelMusicJobRow, t: MusicLabelTranslateFn): MusicTrack {
  const latestMusicJob = {
    status: 'complete',
    music_caption: row.music_caption,
    concept_artifact: row.concept_artifact,
    lyrics: row.lyrics,
    lyric_mode: row.lyric_mode,
    genre: row.genre,
    vocal_gender: row.vocal_gender,
    completed_at: row.completed_at,
    created_at: row.created_at,
  }
  const deckRow = resolveTrackDeckRow(row.decks)
  const deckLabelRoot = deckRow?.name ?? row.display_title ?? 'Level Songs'
  const track = {
    id: row.id,
    kind: 'level' as const,
    deck_id: row.deck_id ?? `level:${row.category_slug ?? 'library'}:${row.target_language ?? 'unknown'}`,
    deckName: formatMusicDeckLabel(deckLabelRoot, row.target_language, t),
    word: row.display_title ?? 'Level Song',
    translation: row.target_language,
    thumbnail_url: null,
    suno_storage_url: row.suno_storage_url,
    suno_audio_url: row.suno_audio_url,
    music_state: 'baked',
    retry_requested: false,
    metadata: null,
    song_generation: null,
    latest_music_job: latestMusicJob,
    category_slug: row.category_slug,
    level_number: row.level_number,
    target_language: row.target_language,
    genre: row.genre,
    [['dur', 'ation'].join('')]: null,
    error: false,
  } as unknown as MusicTrack
  return {
    ...track,
    genre: compactMusicCaptionSegment(resolveTrackMusicCaption(track, latestMusicJob)),
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

async function fetchCompletedLevelSongJobs(userId: string, t: MusicLabelTranslateFn): Promise<MusicTrack[]> {
  const { data, error } = await supabase
    .from('music_generation_jobs')
    .select('id, deck_id, category_slug, level_number, target_language, display_title, lyrics, suno_storage_url, suno_audio_url, music_caption, concept_artifact, lyric_mode, genre, vocal_gender, completed_at, created_at, decks(id, name, target_language)')
    .eq('user_id', userId)
    .eq('scope', 'level')
    .eq('status', 'complete')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as CompletedLevelMusicJobRow[]).map((row) => mapLevelJobToTrack(row, t))
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

function buildDeckList(tracks: MusicTrack[]): { id: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const track of tracks) {
    if (!seen.has(track.deck_id)) seen.set(track.deck_id, track.deckName)
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
}

export default function Music() {
  const { t, locale } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const [allTracks, setAllTracks] = useState<MusicTrack[]>([])
  const [errorTrackIds, setErrorTrackIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [, setLoadError] = useState<string | null>(null)
  const [deckFilter, setDeckFilter] = useState<string>('all')
  const [audioFilter, setAudioFilter] = useState<AudioFilter>('all')
  const [decks, setDecks] = useState<DeckOption[]>([])
  const [songModalTrack, setSongModalTrack] = useState<MusicTrack | null>(null)
  const [lyricsOpen, setLyricsOpen] = useState(false)

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
  const fetchTracks = useCallback(async (bustCache = false) => {
    if (!user) return

    if (!bustCache && _musicCache && _musicCache.userId === user.id && _musicCache.locale === locale) {
      setLoadError(null)
      setAllTracks(_musicCache.tracks)
      setDecks(_musicCache.decks)
      setLoading(false)
      return
    }

    if (bustCache) _musicCache = null
    setLoading(true)
    setLoadError(null)

    try {
      const { data, error } = await supabase
        .from('words')
        .select(`
          id, deck_id, word, translation,
          thumbnail_url, suno_storage_url, suno_audio_url, music_state, retry_requested, metadata, created_at,
          decks(id, name, target_language)
        `)
        .eq('user_id', user.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[Music] failed to fetch music tracks', {
          userId: user.id,
          message: error.message,
        })
        setLoadError(error.message)
        return
      }

      const mapped = ((data ?? []) as Record<string, unknown>[]).map((row) => mapToTrack(row, t))
      if (import.meta.env.DEV) {
        const playableCount = mapped.filter(trackHasAudio).length
        const missingAudioCount = mapped.filter(
          (track) => !(track.suno_storage_url ?? track.suno_audio_url),
        ).length
        console.warn('[Music] music queue diagnostics', {
          userId: user.id,
          mappedCount: mapped.length,
          playableCount,
          missingAudioCount,
        })
      }

      const latestJobs = await fetchLatestCompleteMusicJobs(mapped.map((track) => track.id))
      const tracksWithJobs = applyLatestMusicJobs(mapped, latestJobs)
      const wordDeckList = buildDeckList(tracksWithJobs)

      _musicCache = { tracks: tracksWithJobs, decks: wordDeckList, userId: user.id, locale }
      setAllTracks(tracksWithJobs)
      setDecks(wordDeckList)
      setLoading(false)

      let levelTracks: MusicTrack[] = []
      try {
        levelTracks = await fetchCompletedLevelSongJobs(user.id, t)
      } catch (levelError) {
        const message = levelError instanceof Error ? levelError.message : String(levelError)
        console.warn('[Music] failed to fetch level songs', {
          userId: user.id,
          message,
        })
        return
      }

      const mergedTracks = [...tracksWithJobs, ...levelTracks]
      const deckList = buildDeckList(mergedTracks)

      _musicCache = { tracks: mergedTracks, decks: deckList, userId: user.id, locale }
      setAllTracks(mergedTracks)
      setDecks(deckList)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[Music] music track fetch exception', {
        userId: user.id,
        message,
      })
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }, [user, t, locale])

  useEffect(() => {
    void fetchTracks(true)
  }, [fetchTracks])

  // ── Suno retry ──────────────────────────────────────────────────────────────

  const fetchActiveSongJobs = useCallback(async () => {
    if (!user) return new Map<string, SongGenerationStatus>()
    const trackedWordIds = Array.from(new Set([
      ...allTracks.filter((track) => track.kind === 'word').map((track) => track.id),
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
        void fetchTracks(true) // bust cache and refetch
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
    <div className="flex flex-col min-h-full pb-[calc(6rem+var(--mobile-bottom-nav-space))] md:pb-28">
      {/* Page header */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-6 pb-4">
        <MediaSegments className="mb-4" />
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
        onToggleLyrics={() => setLyricsOpen((open) => !open)}
        lyricsOpen={lyricsOpen}
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
        credits={totalCredits(profile)}
        onSubmitted={handleSongSubmitted}
      />
      <LyricsSheet
        open={lyricsOpen && player.currentTrack !== null}
        onOpenChange={(open) => !open && setLyricsOpen(false)}
        track={lyricsOpen ? player.currentTrack : null}
        variant="classic"
      />
    </div>
  )
}
