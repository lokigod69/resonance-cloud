import type { MusicTrack } from '@/hooks/useMusicPlayer'

interface OrbThumbnailRowProps {
  tracks: MusicTrack[]
  currentTrackId: string | null
  onTrackSelect: (trackId: string) => void
}

export function OrbThumbnailRow({ tracks, currentTrackId, onTrackSelect }: OrbThumbnailRowProps) {
  if (tracks.length === 0) return null

  return (
    <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-3 px-6 py-2 justify-center flex-wrap">
        {tracks.map((track) => {
          const hasAudio = !!track.suno_audio_url && !track.error
          const isCurrent = track.id === currentTrackId

          return (
            <button
              key={track.id}
              onClick={() => hasAudio && onTrackSelect(track.id)}
              disabled={!hasAudio}
              title={track.word}
              className="flex-shrink-0 rounded-full overflow-hidden transition-all duration-200 focus:outline-none"
              style={{
                width: 44,
                height: 44,
                opacity: !hasAudio ? 0.25 : isCurrent ? 1 : 0.55,
                transform: isCurrent ? 'scale(1.25)' : 'scale(1)',
                boxShadow: isCurrent
                  ? '0 0 0 2px #5e6ad2, 0 0 0 4px rgba(0,0,0,0.8), 0 0 16px rgba(94,106,210,0.5)'
                  : 'none',
                cursor: hasAudio ? 'pointer' : 'not-allowed',
              }}
            >
              {track.thumbnail_url ? (
                <img
                  src={track.thumbnail_url}
                  alt={track.word}
                  className="w-full h-full object-cover rounded-full"
                  draggable={false}
                />
              ) : (
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-xs font-semibold text-white/70"
                  style={{ background: 'rgba(94,106,210,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {track.word.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
