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

const MS_PER_DAY = 86_400_000

/**
 * The UTC calendar-day key (YYYY-MM-DD) for a timestamp.
 *
 * The SRS "today" boundary is defined server-side by `compute_word_states` as
 * `date_trunc('day', now())`, which on Supabase (session TZ = UTC) is UTC midnight.
 * The streak and "studied today" MUST bucket on the same UTC day so the daily-new
 * cap, the done-for-today signal, and the streak all agree.
 */
export function utcDayKey(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export type StudyStreak = {
  /** Consecutive UTC days with qualifying study activity, ending today or yesterday. */
  streak: number
  /** Whether there is qualifying study activity on today's UTC day. */
  studiedToday: boolean
}

/**
 * Derive the consecutive-day study streak from recall-attempt timestamps.
 *
 * Days are bucketed on the UTC calendar day (see {@link utcDayKey}). The streak is the
 * count of consecutive UTC days present, anchored at today if studied today, otherwise at
 * yesterday (the streak is still "alive" until the end of today). If neither today nor
 * yesterday has activity, the streak is 0.
 *
 * Callers decide which attempts qualify; `study_mode='runner'` is excluded upstream to match
 * the SRS definition used by `compute_word_states`.
 */
export function computeStudyStreak(
  timestamps: Array<string | number | Date>,
  now: Date = new Date(),
): StudyStreak {
  const days = new Set<string>()
  for (const ts of timestamps) {
    const key = utcDayKey(ts)
    if (key) days.add(key)
  }

  const todayKey = utcDayKey(now)
  const studiedToday = days.has(todayKey)
  if (days.size === 0 || !todayKey) return { streak: 0, studiedToday: false }

  const todayMidnight = Date.parse(`${todayKey}T00:00:00.000Z`)
  const yesterdayKey = utcDayKey(new Date(todayMidnight - MS_PER_DAY))

  let cursor: number
  if (studiedToday) {
    cursor = todayMidnight
  } else if (days.has(yesterdayKey)) {
    cursor = todayMidnight - MS_PER_DAY
  } else {
    return { streak: 0, studiedToday: false }
  }

  let streak = 0
  while (days.has(utcDayKey(new Date(cursor)))) {
    streak += 1
    cursor -= MS_PER_DAY
  }

  return { streak, studiedToday }
}

/**
 * Whether the learner has cleared their daily set for the active language: no due reviews
 * and no remaining new words for today. Guarded by `hasAnyWords` so a brand-new or empty
 * account (where all counts are trivially zero) does NOT trigger a bogus celebration.
 */
export function isDoneForToday(input: {
  reviewDue: number
  newDue: number
  hasAnyWords: boolean
}): boolean {
  return input.hasAnyWords && input.reviewDue === 0 && input.newDue === 0
}
