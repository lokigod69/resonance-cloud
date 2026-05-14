import {
  getGuidedPathLessons,
  resolveGuidedLessonVariant,
} from '@/data/guidedLessons'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'

export type TrophySongRow = {
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibe: ActiveGuidedVibeId
  audioPublicUrl: string | null
  lyricsDisplay: string
  clozePositions: Array<{ lineIndex: number; word: string; startChar: number; endChar: number }>
  trophyWords: string[]
  musicCaption: string
}

export class TrophySongNotAvailableError extends Error {
  constructor(pathId: string, segment: GuidedSegmentReviewNumber, vibe: ActiveGuidedVibeId) {
    super(`Trophy song not available for ${pathId}/${segment}/${vibe}.`)
    this.name = 'TrophySongNotAvailableError'
  }
}

// Mock implementation. Real backend client replaces this file later.
export async function fetchTrophySongCanonical(
  pathId: string,
  segment: GuidedSegmentReviewNumber,
  vibe: ActiveGuidedVibeId,
): Promise<TrophySongRow> {
  if (pathId !== 'english-a1-practical-1' || segment !== 1 || vibe !== 'bright') {
    throw new TrophySongNotAvailableError(pathId, segment, vibe)
  }

  const trophyWords = getGuidedPathLessons(pathId)
    .filter((lesson) => lesson.lessonNumber >= 1 && lesson.lessonNumber <= 5)
    .map((lesson) => resolveGuidedLessonVariant(lesson, vibe).trophyWord.word)

  const lines = [
    `Bright is delighted when hello opens the door.`,
    `A marvelous echo helps the cafe words return.`,
    `I feel glad when the station sign is clear.`,
    `With eager steps, the coffee line feels near.`,
    `One splendid price tag makes the thank-you shine.`,
  ]

  return {
    pathId,
    segment,
    vibe,
    audioPublicUrl: null,
    lyricsDisplay: lines.join('\n'),
    clozePositions: lines.map((line, lineIndex) => {
      const word = trophyWords[lineIndex] ?? ''
      const startChar = line.indexOf(word)
      return {
        lineIndex,
        word,
        startChar,
        endChar: startChar + word.length,
      }
    }),
    trophyWords,
    musicCaption: 'Bright V1 mock trophy song: a sunny five-line recap for lessons 1-5.',
  }
}
