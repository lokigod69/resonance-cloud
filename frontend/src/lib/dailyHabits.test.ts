import {
  DEFAULT_NEW_WORDS_PER_DAY,
  NEW_WORDS_PER_DAY_OPTIONS,
  normalizeNewWordsPerDay,
} from './dailyHabits'

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

assertEqual(NEW_WORDS_PER_DAY_OPTIONS, [4, 10, 20, 50], 'settings options are the approved values')
assertEqual(DEFAULT_NEW_WORDS_PER_DAY, 10, 'default is 10 new words per day')
assertEqual(normalizeNewWordsPerDay(null), 10, 'null profile value defaults to 10')
assertEqual(normalizeNewWordsPerDay(undefined), 10, 'missing profile value defaults to 10')
assertEqual(normalizeNewWordsPerDay(4), 4, 'minimum offered value is accepted')
assertEqual(normalizeNewWordsPerDay(17), 17, 'future in-range values are accepted')
assertEqual(normalizeNewWordsPerDay(50), 50, 'maximum offered value is accepted')
assertEqual(normalizeNewWordsPerDay(0), 10, 'values below migration check range default to 10')
assertEqual(normalizeNewWordsPerDay(101), 10, 'values above migration check range default to 10')
assertEqual(normalizeNewWordsPerDay(Number.NaN), 10, 'non-finite values default to 10')
