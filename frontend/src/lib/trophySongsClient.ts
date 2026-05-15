import {
  GUIDED_TROPHY_SONGS,
  type GuidedTrophySongAudioCandidate,
  type GuidedTrophySongAudioStatus,
  type GuidedTrophySongCandidateId,
} from '@/data/guidedTrophySongs'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'

export type TrophySongRow = {
  id: string
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibe: ActiveGuidedVibeId
  audioPublicUrl: string | null
  audioStatus: GuidedTrophySongAudioStatus
  audioCandidates: Partial<Record<GuidedTrophySongCandidateId, GuidedTrophySongAudioCandidate>>
  activeCandidateDefault: GuidedTrophySongCandidateId
  rawLyricsWithWrappers: string
  wrappedLyrics: string
  providerLyrics: string
  displayLyrics: string
  lyricsDisplay: string
  clozePositions: Array<{ lineIndex: number; word: string; startChar: number; endChar: number }>
  trophyWords: string[]
  styleFamily: string
  songStyleLabel: string
  musicCaption: string
  lyricsTranslationDe: string
  studyLines: Array<{ lineIndex: number; line: string; hiddenWord: string }>
}

export class TrophySongNotAvailableError extends Error {
  constructor(pathId: string, segment: GuidedSegmentReviewNumber, vibe: ActiveGuidedVibeId) {
    super(`Trophy song not available for ${pathId}/${segment}/${vibe}.`)
    this.name = 'TrophySongNotAvailableError'
  }
}

export async function fetchTrophySongCanonical(
  pathId: string,
  segment: GuidedSegmentReviewNumber,
  vibe: ActiveGuidedVibeId,
): Promise<TrophySongRow> {
  const row = GUIDED_TROPHY_SONGS.find((candidate) => (
    candidate.pathId === pathId
    && candidate.segment === segment
    && candidate.vibe === vibe
  ))

  if (!row) {
    throw new TrophySongNotAvailableError(pathId, segment, vibe)
  }

  return {
    ...row,
    wrappedLyrics: row.rawLyricsWithWrappers,
    lyricsDisplay: row.displayLyrics,
  }
}
