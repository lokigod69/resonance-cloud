import type { MusicTrack } from '@/hooks/useMusicPlayer'
import { Music } from 'lucide-react'
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
    <>
      <style>{`
        .music-orb-thumb {
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow:
            inset -4px -4px 10px rgba(0,0,0,0.6),
            inset 4px 4px 10px rgba(255,255,255,0.4),
            0 4px 10px rgba(0,0,0,0.5);
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
          border-radius: 50%;
        }
        .music-orb-thumb::after {
          content: '';
          position: absolute;
          top: 10%; left: 20%;
          width: 30%; height: 30%;
          background: radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
        }
        .music-orb-thumb:not(:disabled):hover,
        .music-orb-thumb.is-current {
          transform: translateY(-16px) scale(1.2);
          box-shadow:
            inset -4px -4px 10px rgba(0,0,0,0.7),
            inset 4px 4px 12px rgba(255,255,255,0.6),
            0 10px 20px rgba(0,0,0,0.8),
            0 0 14px rgba(94,106,210,0.8);
        }
        .music-orb-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-3 px-6 pt-10 pb-5 justify-center flex-wrap">
          {tracks.map((track) => {
            const hasAudio = !!(track.suno_storage_url ?? track.suno_audio_url) && !track.error
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
                    className="h-6 rounded-md px-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
                    title={t('music.generateSong')}
                  >
                    <Music className="inline h-3 w-3 mr-1" />
                    {isGenerating ? t('music.generatingSong') : t('music.generateSong')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
