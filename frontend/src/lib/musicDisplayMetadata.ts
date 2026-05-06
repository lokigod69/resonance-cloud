import type { MusicTrack } from '@/hooks/useMusicPlayer'

type JsonRecord = Record<string, unknown>

export type MusicDisplayJob = {
  status?: string | null
  music_caption?: string | null
  concept_artifact?: JsonRecord | null
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function resolveTrackMusicCaption(
  track: (MusicTrack & { metadata?: JsonRecord | null }) | null | undefined,
  latestMusicJob?: MusicDisplayJob | null,
): string | null {
  const completedJob =
    latestMusicJob?.status === 'complete' || latestMusicJob?.status === undefined
      ? latestMusicJob
      : null
  const jobMusicCaption = completedJob ? cleanText(latestMusicJob?.music_caption) : null
  const jobConceptCaption = completedJob
    ? cleanText(latestMusicJob?.concept_artifact?.music_caption)
    : null
  const fallbackGenre = cleanText(track?.genre)
  const songGenerationCaption = track ? cleanText(track.song_generation?.music_caption) : null
  const metadataCaption = track ? cleanText(track.metadata?.music_caption) : null

  return (
    jobMusicCaption ||
    jobConceptCaption ||
    songGenerationCaption ||
    metadataCaption ||
    (track && fallbackGenre && track.genre?.toLowerCase() !== 'auto' ? fallbackGenre : null) ||
    null
  )
}

export function compactMusicCaptionSegment(caption: string | null | undefined): string | null {
  const normalized = cleanText(caption)
  if (!normalized || normalized.toLowerCase() === 'auto') return null

  const segment = normalized.split(',')[0].trim()
  if (!segment || segment.toLowerCase() === 'auto') return null
  return segment
}
