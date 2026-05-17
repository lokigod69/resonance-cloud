import type { GuidedPathMetadata } from '@/data/guidedLessons'

const LESSON_NUMBER_PATTERN = /-(\d+)$/

export function formatGuidedPathLabel(path: GuidedPathMetadata | undefined) {
  if (!path) return 'English A1'
  const numberMatch = path.id.match(LESSON_NUMBER_PATTERN)
  if (numberMatch?.[1]) {
    return `${path.targetLanguage} A1 P${numberMatch[1]}`
  }
  return path.shortTitle
}

export function formatGuidedPathFullTitle(path: GuidedPathMetadata | undefined) {
  if (!path) return 'English A1 Practical'
  return `${path.targetLanguage} A1 Practical`
}
