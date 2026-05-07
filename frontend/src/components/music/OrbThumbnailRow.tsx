import { trackHasAudio, type MusicTrack } from '@/hooks/useMusicPlayer'
import { Loader2, Music } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface OrbThumbnailRowProps {
  tracks: MusicTrack[]
  currentTrackId: string | null
  onTrackSelect: (trackId: string) => void
  onGenerateSong?: (track: MusicTrack) => void
  generationStatusMap?: Map<string, string>
}

export function OrbThumbnailRow({
  tracks,
  currentTrackId,
  onTrackSelect,
  onGenerateSong,
  generationStatusMap = new Map(),
}: OrbThumbnailRowProps) {
  const { t } = useTranslation()
  if (tracks.length === 0) return null

  return (
    <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-3 px-6 pt-10 pb-5 justify-center flex-wrap">
        {tracks.map((track) => {
          const hasAudio = trackHasAudio(track)
          const isCurrent = track.id === currentTrackId
          const isGenerating = generationStatusMap.has(track.id)

          return (
            <div key={track.id} className="flex flex-col items-center gap-1">
              <button
                onClick={() => hasAudio && onTrackSelect(track.id)}
                disabled={!hasAudio}
                title={track.word}
                className={`music-orb-thumb flex-shrink-0 focus:outline-none${isCurrent ? ' is-current' : ''}`}
                style={{
                  width: 44,
                  height: 44,
                  opacity: !hasAudio ? 0.25 : isCurrent ? 1 : 0.6,
                  cursor: hasAudio ? 'pointer' : 'default',
                }}
              >
                {track.thumbnail_url ? (
                  <img
                    src={track.thumbnail_url}
                    alt={track.word}
                    draggable={false}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs font-semibold text-white/70"
                    style={{ background: 'rgba(94,106,210,0.3)' }}
                  >
                    {track.word.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              {!hasAudio && (
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onGenerateSong?.(track)}
                  className="h-6 w-6 inline-flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50 disabled:cursor-wait"
                  title={isGenerating ? t('music.generatingSong') : t('music.generateSong')}
                  aria-label={isGenerating ? t('music.generatingSong') : t('music.generateSong')}
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Music className="h-3.5 w-3.5" aria-hidden />
                  )}
                  <span className="sr-only">
                    {isGenerating ? t('music.generatingSong') : t('music.generateSong')}
                  </span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
