/**
 * Static validation for the Guided Today MVP lesson and local progress helpers.
 *
 * Run: npx tsx scripts/test-guided-today-data.ts
 */

import {
  GUIDED_LESSONS,
  getCurrentGuidedLesson,
  getGuidedMatchPairs,
  getGuidedReviewChoices,
  getGuidedReviewItems,
  normalizeGuidedAnswer,
} from '../src/data/guidedLessons.ts'
import { createT } from '../src/lib/translations.ts'
import {
  createEmptyTodayProgressState,
  getTodayCompletionSummary,
  markTodayLessonComplete,
  markTodayLessonSkipped,
  todayProgressKey,
} from '../src/lib/todayProgress.ts'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
    return
  }

  failures += 1
  console.error(`  FAIL ${name}`)
  if (detail !== undefined) console.error('       ', detail)
}

const lesson = getCurrentGuidedLesson()

console.log('\n[lesson data]')
assert('exactly one static lesson', GUIDED_LESSONS.length === 1, GUIDED_LESSONS.length)
assert('course title matches MVP path', lesson.courseTitle === 'English A1 Practical')
assert('base language is German', lesson.baseLanguage === 'German')
assert('target language is English', lesson.targetLanguage === 'English')
assert('title is First contact', lesson.title === 'First contact')
assert('situation matches MVP', lesson.situation.en === 'You need to politely ask if someone speaks English.')
assert('German situation exists for primary UI', lesson.situation.de === 'Du willst freundlich fragen, ob jemand Englisch spricht.')
assert('core phrase matches MVP', lesson.corePhrase.targetText === 'Excuse me, do you speak English?')
assert('German meaning matches MVP', lesson.corePhrase.baseText === 'Entschuldigung, sprechen Sie Englisch?')
assert('lesson media has required caption', lesson.lessonMedia.caption.length > 0)
assert('lesson media caption is German-first', lesson.lessonMedia.caption === 'Eine erste höfliche Frage, bevor ein Gespräch beginnt.')
assert('lesson media uses provided local video asset', lesson.lessonMedia.type === 'video')
assert('lesson media points at public guided video path', lesson.lessonMedia.url === '/guided/english-a1-practical/lesson-001-first-contact.mp4')

console.log('\n[phrase production]')
const builtPhrase = lesson.build.chips
  .filter((chip) => ['Excuse me,', 'do you speak', 'English?'].includes(chip))
  .join(' ')

assert('build chips can form the exact phrase', builtPhrase === lesson.build.targetText, builtPhrase)
assert('type recall accepts English case-insensitively', lesson.typeRecall.acceptedAnswers.some((answer) => normalizeGuidedAnswer(answer) === 'english'))
const germanT = createT('de')
assert('type recall placeholder does not spoil the answer', normalizeGuidedAnswer(germanT('today.type.placeholder')) !== 'english')
assert('lesson items include five active recall entries', lesson.lessonItems.length === 5, lesson.lessonItems.length)
assert('lesson items include please', lesson.lessonItems.some((item) => item.targetText === 'please' && item.baseText === 'bitte'))
assert('lesson items include thank you', lesson.lessonItems.some((item) => item.targetText === 'thank you' && item.baseText === 'danke'))

console.log('\n[match pairs]')
const matchPairs = getGuidedMatchPairs(lesson)
assert('matching pairs exist for each core phrase chunk', matchPairs.length === 3, matchPairs)
assert('matching pairs have exact ids and text', JSON.stringify(matchPairs.map((pair) => ({
  id: pair.id,
  targetText: pair.targetText,
  baseText: pair.baseText,
}))) === JSON.stringify([
  { id: 'excuse-me', targetText: 'Excuse me', baseText: 'Entschuldigung' },
  { id: 'do-you-speak', targetText: 'do you speak', baseText: 'sprechen Sie' },
  { id: 'english', targetText: 'English', baseText: 'Englisch' },
]), matchPairs)

console.log('\n[review choices]')
const pleaseItem = lesson.lessonItems.find((item) => item.id === 'please')
assert('please item is present for review choice validation', pleaseItem !== undefined)
if (pleaseItem) {
  const choices = getGuidedReviewChoices(lesson, pleaseItem)
  assert('review choices include the correct answer', choices.some((choice) => choice.isCorrect && choice.targetText === 'please'), choices)
  assert('review choices include 3 total chips', choices.length === 3, choices)
  assert('review choices are unique', new Set(choices.map((choice) => choice.id)).size === choices.length, choices)
  assert('review choices include distractors from lesson items', choices.some((choice) => !choice.isCorrect), choices)
}
for (const item of lesson.lessonItems) {
  const choices = getGuidedReviewChoices(lesson, item)
  assert(`review choices can be generated for ${item.id}`, choices.length === 3 && choices.some((choice) => choice.id === item.id && choice.isCorrect), choices)
}

const filteredReviewItems = getGuidedReviewItems(lesson, new Set(['please', 'thank-you']))
assert('known-item filtering excludes marked items', !filteredReviewItems.some((item) => item.id === 'please' || item.id === 'thank-you'), filteredReviewItems)
assert('known-item filtering keeps remaining items', filteredReviewItems.length === 3, filteredReviewItems)
const knownCoreIds = new Set(['excuse-me', 'do-you-speak', 'english'])
assert('known-item filtering only affects Review items', getGuidedReviewItems(lesson, knownCoreIds).length === 2)
assert('core phrase chunks remain required when marked known', getGuidedMatchPairs(lesson).length === 3 && lesson.build.targetText === 'Excuse me, do you speak English?')

const allKnownReviewItems = getGuidedReviewItems(lesson, new Set(lesson.lessonItems.map((item) => item.id)))
assert('all known review items can be excluded', allKnownReviewItems.length === 0, allKnownReviewItems)

console.log('\n[local progress]')
const userId = 'user-123'
const empty = createEmptyTodayProgressState()
const completed = markTodayLessonComplete(empty, lesson, {
  buildAttempts: 2,
  typeAttempts: 1,
  reviewCorrect: 5,
  reviewTotal: 5,
  knownItemCount: 0,
})
const partiallyKnownCompleted = markTodayLessonComplete(createEmptyTodayProgressState(), lesson, {
  buildAttempts: 1,
  typeAttempts: 1,
  reviewCorrect: 1,
  reviewTotal: 1,
  knownItemCount: 4,
})
const allKnownCompleted = markTodayLessonComplete(createEmptyTodayProgressState(), lesson, {
  buildAttempts: 1,
  typeAttempts: 1,
  reviewCorrect: 0,
  reviewTotal: 0,
  knownItemCount: 5,
})
const skipped = markTodayLessonSkipped(createEmptyTodayProgressState(), lesson)

assert('progress key is user-scoped', todayProgressKey(userId) === 'resonance_today_progress_v1_user-123')
assert(
  'complete status is stored without raw answers',
  completed.courses[lesson.courseId]?.lessons[lesson.id]?.status === 'completed'
    && completed.courses[lesson.courseId]?.lessons[lesson.id]?.result?.buildAttempts === 2,
  completed,
)
assert(
  'known item count is stored without raw answers',
  partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result?.knownItemCount === 4
    && JSON.stringify(partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result).includes('typedAnswer') === false,
  partiallyKnownCompleted,
)
assert(
  'completion summary supports no known items',
  getTodayCompletionSummary(completed.courses[lesson.courseId]!.lessons[lesson.id]!.result!).key === 'today.completion.summary',
)
assert(
  'completion summary supports some known items',
  getTodayCompletionSummary(partiallyKnownCompleted.courses[lesson.courseId]!.lessons[lesson.id]!.result!).key === 'today.completion.summaryWithKnown',
)
assert(
  'completion summary supports all known items',
  getTodayCompletionSummary(allKnownCompleted.courses[lesson.courseId]!.lessons[lesson.id]!.result!).key === 'today.completion.summaryAllKnown',
)
assert(
  'skip status is stored separately from completion',
  skipped.courses[lesson.courseId]?.lessons[lesson.id]?.status === 'skipped'
    && skipped.courses[lesson.courseId]?.completedLessonIds.length === 0
    && skipped.courses[lesson.courseId]?.skippedLessonIds.includes(lesson.id),
  skipped,
)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
