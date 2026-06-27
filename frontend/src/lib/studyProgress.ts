export type StudyProgress = { current: number; total: number }

/**
 * Coherent "X / N" progress for a study session driven by a FROZEN snapshot of N
 * distinct cards (see `useStudySession` and the 2026-06-27 investigation report).
 *
 * `clearedCount` is the number of distinct cards the learner has already advanced past
 * (graded). While a card is on screen they are working on the `clearedCount + 1`-th
 * card. The result is clamped to `total` so a card resurfaced by the retry pocket can
 * never push the counter past the denominator — the old "6 / 5" overshoot, which came
 * from the queue shrinking under a climbing index, is impossible here.
 */
export function computeStudyProgress(clearedCount: number, total: number): StudyProgress {
  if (total <= 0) return { current: 0, total: 0 }
  const current = Math.min(Math.max(clearedCount, 0) + 1, total)
  return { current, total }
}
