import { useState, useEffect, useCallback, useRef } from 'react'
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
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/components/Toast'

const ACTIVE_RETRY_STAGES = ['post_video_queued', 'assembly', 'bookend', 'suno_bake', 'uploading'] as const
type RetryStatus = 'pending' | 'processing'

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
    suno_storage_url: (row.suno_storage_url as string | null) ?? null,
    suno_audio_url: (row.suno_audio_url as string | null) ?? null,
    genre: rawCaption ? rawCaption.split(',')[0].trim() : null,
    duration: null,
    error: false,
  }
}

export default function Music() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user, refreshProfile } = useAuth()
  const [allTracks, setAllTracks] = useState<MusicTrack[]>([])
  const [errorTrackIds, setErrorTrackIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [deckFilter, setDeckFilter] = useState<string>('all')
  const [decks, setDecks] = useState<DeckOption[]>([])

  // Retry state: wordId → current job status
  const [retryStatusMap, setRetryStatusMap] = useState<Map<string, RetryStatus>>(new Map())
  const retryStatusMapRef = useRef(retryStatusMap)
  const retryPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Merge error state into tracks
  const tracks: MusicTrack[] = allTracks.map((track) =>
    errorTrackIds.has(track.id) ? { ...track, error: true } : track,
  )

  const filteredTracks =
    deckFilter === 'all' ? tracks : tracks.filter((track) => track.deck_id === deckFilter)

  const player = useMusicPlayer(filteredTracks)

  useEffect(() => {
    retryStatusMapRef.current = retryStatusMap
  }, [retryStatusMap])

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
        thumbnail_url, suno_storage_url, suno_audio_url, metadata, created_at,
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
    fetchTracks()
  }, [fetchTracks])

  // ── Suno retry ──────────────────────────────────────────────────────────────

  const fetchActiveSunoRetries = useCallback(async () => {
    if (!user) return new Map<string, RetryStatus>()
    const trackedWordIds = Array.from(new Set([
      ...allTracks.map((track) => track.id),
      ...retryStatusMapRef.current.keys(),
    ]))
    if (trackedWordIds.length === 0) return new Map<string, RetryStatus>()

    const activeStageFilter = `current_stage.in.(${ACTIVE_RETRY_STAGES.join(',')})`
    const { data, error } = await supabase
      .from('words')
      .select('id, current_stage, retry_requested')
      .eq('user_id', user.id)
      .in('id', trackedWordIds)
      .or(`retry_requested.eq.true,${activeStageFilter}`)
    if (error) throw error

    const map = new Map<string, RetryStatus>()
    for (const row of data ?? []) {
      map.set(row.id, row.retry_requested ? 'pending' : 'processing')
    }
    return map
  }, [user, allTracks])

  // On mount: load active retry flags/stages so the UI shows queued state
  // if the user navigated away and came back while a retry was in progress.
  useEffect(() => {
    if (!user) return
    fetchActiveSunoRetries()
      .then(setRetryStatusMap)
      .catch(() => {})
  }, [user, fetchActiveSunoRetries])

  // Flag one track for the orchestrator Source 2 retry path; double-click safe.
  const handleSunoRetry = useCallback(async (wordId: string) => {
    if (!user) return

    // Optimistically mark as pending so the button becomes a spinner immediately
    setRetryStatusMap((prev) => new Map(prev).set(wordId, 'pending'))

    const rollbackOptimistic = () => {
      setRetryStatusMap((prev) => {
        const next = new Map(prev)
        next.delete(wordId)
        return next
      })
    }

    try {
      const { data, error } = await supabase.rpc('request_word_retry', {
        p_word_id: wordId,
        p_retry_scope: 'music',
      })
      if (error) throw error

      const result = data as { success?: boolean; already_requested?: boolean; error?: string } | null
      if (!result?.success) {
        throw new Error(result?.error || 'Word is not in a retryable music state')
      }
      if (!result.already_requested) {
        await refreshProfile()
      }
    } catch (error) {
      rollbackOptimistic()
      console.warn('[music] Suno retry failed', error)
      toast(t('music.retryFailed'), 'error')
    }
  }, [user, refreshProfile, t, toast])

  // Poll active retry rows every 15s; refetch tracks when one completes.
  useEffect(() => {
    const hasActive = retryStatusMap.size > 0
    if (!hasActive) {
      if (retryPollRef.current) {
        clearInterval(retryPollRef.current)
        retryPollRef.current = null
      }
      return
    }

    if (retryPollRef.current) return // already polling

    retryPollRef.current = setInterval(async () => {
      if (!user) return
      let newMap: Map<string, RetryStatus>
      try {
        newMap = await fetchActiveSunoRetries()
      } catch {
        return
      }

      // Detect completions: ids that were active before but are no longer active
      const justCompleted = [...retryStatusMap.keys()].filter((id) => !newMap.has(id))
      if (justCompleted.length > 0) {
        fetchTracks(true) // bust cache and refetch
      }

      setRetryStatusMap(newMap)
    }, 15_000)

    return () => {
      if (retryPollRef.current) {
        clearInterval(retryPollRef.current)
        retryPollRef.current = null
      }
    }
  }, [retryStatusMap, user, fetchTracks, fetchActiveSunoRetries])

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
                onRetry={() => handleSunoRetry(track.id)}
                isRetrying={retryStatusMap.has(track.id)}
                retryStatus={retryStatusMap.get(track.id)}
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
    </div>
  )
}
