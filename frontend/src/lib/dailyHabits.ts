export const NEW_WORDS_PER_DAY_OPTIONS = [4, 10, 20, 50] as const
export const DEFAULT_NEW_WORDS_PER_DAY = 10
export const MIN_NEW_WORDS_PER_DAY = 1
export const MAX_NEW_WORDS_PER_DAY = 100

export type NewWordsPerDayOption = (typeof NEW_WORDS_PER_DAY_OPTIONS)[number]

export function normalizeNewWordsPerDay(value: number | null | undefined): number {
  if (typeof value !== 'number') return DEFAULT_NEW_WORDS_PER_DAY
  if (!Number.isFinite(value)) return DEFAULT_NEW_WORDS_PER_DAY
  const wholeValue = Math.trunc(value)

  if (wholeValue < MIN_NEW_WORDS_PER_DAY || wholeValue > MAX_NEW_WORDS_PER_DAY) {
    return DEFAULT_NEW_WORDS_PER_DAY
  }

  return wholeValue
}
