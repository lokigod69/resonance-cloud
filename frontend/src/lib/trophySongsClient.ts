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

  const wrappedLines = [
    `I am <<delighted>> to see the sun.`,
    `The <<marvelous>> flowers bloom in the park.`,
    `I feel <<glad>> to walk this path.`,
    `I am <<eager>> to find a bench.`,
    `This <<splendid>> day makes me smile.`,
  ]
  const lyrics = unwrapClozeLines(wrappedLines)

  return {
    pathId,
    segment,
    vibe,
    audioPublicUrl: null,
    lyricsDisplay: lyrics.lines.join('\n'),
    clozePositions: lyrics.clozePositions,
    trophyWords,
    musicCaption: 'Bright V1 mock trophy song: a sunny five-line recap for lessons 1-5.',
  }
}

function unwrapClozeLines(wrappedLines: string[]): Pick<TrophySongRow, 'lyricsDisplay' | 'clozePositions'> & { lines: string[] } {
  const clozePattern = /<<([^<>]+)>>/
  const lines: string[] = []
  const clozePositions = wrappedLines.map((wrappedLine, lineIndex) => {
    const match = clozePattern.exec(wrappedLine)
    const word = match?.[1] ?? ''
    const wrapperStart = match?.index ?? -1
    const line = wrappedLine.replace(clozePattern, word)
    const startChar = wrapperStart

    lines.push(line)

    return {
      lineIndex,
      word,
      startChar,
      endChar: startChar + word.length,
    }
  })

  return {
    lines,
    lyricsDisplay: lines.join('\n'),
    clozePositions,
  }
}
