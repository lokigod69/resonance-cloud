import { computeStudyProgress } from './studyProgress'

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

// Linear 5-card session: 1/5 … 5/5
assertEqual(computeStudyProgress(0, 5), { current: 1, total: 5 }, 'first card reads 1/5')
assertEqual(computeStudyProgress(1, 5), { current: 2, total: 5 }, 'second card reads 2/5')
assertEqual(computeStudyProgress(4, 5), { current: 5, total: 5 }, 'last card reads 5/5')

// Retry pocket: a card resurfaced after all distinct cards are cleared must NOT overshoot.
assertEqual(computeStudyProgress(5, 5), { current: 5, total: 5 }, 'requeued card stays 5/5, never 6/5')
assertEqual(computeStudyProgress(2, 3), { current: 3, total: 3 }, 'cleared-2 of 3 reads 3/3')

// Defensive clamps.
assertEqual(computeStudyProgress(7, 5), { current: 5, total: 5 }, 'current never exceeds total')
assertEqual(computeStudyProgress(0, 0), { current: 0, total: 0 }, 'empty session is 0/0')
assertEqual(computeStudyProgress(-3, 4), { current: 1, total: 4 }, 'negative cleared count floors to 1/4')

console.log('studyProgress: all assertions passed')
