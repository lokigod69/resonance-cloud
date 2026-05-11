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
  getGuidedTypeFallbackChoices,
  normalizeGuidedAnswer,
} from '../src/data/guidedLessons.ts'
import { TODAY_SESSION_STEPS } from '../src/components/today/sessionSteps.ts'
import { getSpeechWordOverlap } from '../src/components/today/speechRecognition.ts'
import { createT } from '../src/lib/translations.ts'
import {
  createEmptyTodayProgressState,
  getTodayCompletionLines,
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
const typeFallbackChoices = getGuidedTypeFallbackChoices(lesson)
assert('type fallback choices include English and distractors', JSON.stringify(typeFallbackChoices.map((choice) => choice.targetText)) === JSON.stringify([
  'English',
  'German',
  'please',
  'thank you',
]), typeFallbackChoices)
assert('type fallback marks only English as correct', typeFallbackChoices.filter((choice) => choice.isCorrect).length === 1 && typeFallbackChoices[0]?.isCorrect === true, typeFallbackChoices)
assert('lesson items include five active recall entries', lesson.lessonItems.length === 5, lesson.lessonItems.length)
assert('lesson items include please', lesson.lessonItems.some((item) => item.targetText === 'please' && item.baseText === 'bitte'))
assert('lesson items include thank you', lesson.lessonItems.some((item) => item.targetText === 'thank you' && item.baseText === 'danke'))

console.log('\n[session flow]')
assert('final step order is Scene, Match, Build, Type, Speak, Complete', JSON.stringify(TODAY_SESSION_STEPS) === JSON.stringify([
  'scene',
  'matchPairs',
  'build',
  'type',
  'speak',
  'complete',
]), TODAY_SESSION_STEPS)

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

console.log('\n[speech overlap]')
assert('speech word-overlap helper passes close transcript', getSpeechWordOverlap('excuse me do you speak english', lesson.corePhrase.targetText) >= 0.8)
assert('speech word-overlap helper fails wrong transcript', getSpeechWordOverlap('thank you please', lesson.corePhrase.targetText) < 0.8)

console.log('\n[local progress]')
const userId = 'user-123'
const empty = createEmptyTodayProgressState()
const completed = markTodayLessonComplete(empty, lesson, {
  buildAttempts: 2,
  typeAttempts: 1,
  typeUsedFallback: false,
  speakAttempts: 1,
  speakTranscriptMatch: 1,
  speakPassed: true,
  knownMarkedCount: 0,
  reviewCorrect: 5,
  reviewTotal: 5,
})
const partiallyKnownCompleted = markTodayLessonComplete(createEmptyTodayProgressState(), lesson, {
  buildAttempts: 1,
  typeAttempts: 1,
  typeUsedFallback: true,
  speakAttempts: 1,
  speakTranscriptMatch: 0.67,
  speakPassed: false,
  knownMarkedCount: 4,
  reviewCorrect: 1,
  reviewTotal: 1,
})
const allKnownCompleted = markTodayLessonComplete(createEmptyTodayProgressState(), lesson, {
  buildAttempts: 1,
  typeAttempts: 1,
  typeUsedFallback: false,
  speakAttempts: 0,
  speakTranscriptMatch: 0,
  speakPassed: false,
  knownMarkedCount: 5,
  reviewCorrect: 0,
  reviewTotal: 0,
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
  'known marked count is stored without raw answers',
  partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result?.knownMarkedCount === 4
    && JSON.stringify(partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result).includes('typedAnswer') === false,
  partiallyKnownCompleted,
)
assert(
  'type fallback and speak result are stored without raw transcripts',
  partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result?.typeUsedFallback === true
    && partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result?.speakAttempts === 1
    && partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result?.speakPassed === false
    && partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result?.speakTranscriptMatch === 0.67
    && JSON.stringify(partiallyKnownCompleted.courses[lesson.courseId]?.lessons[lesson.id]?.result).includes('speechTranscript') === false,
  partiallyKnownCompleted,
)
assert(
  'completion lines include type and speak summaries',
  JSON.stringify(getTodayCompletionLines(completed.courses[lesson.courseId]!.lessons[lesson.id]!.result!).map((line) => line.key)) === JSON.stringify([
    'today.completion.typePassed',
    'today.completion.speakPassed',
  ]),
)
assert(
  'completion lines include help and known summaries',
  JSON.stringify(getTodayCompletionLines(partiallyKnownCompleted.courses[lesson.courseId]!.lessons[lesson.id]!.result!).map((line) => line.key)) === JSON.stringify([
    'today.completion.typeWithHelp',
    'today.completion.speakContinued',
    'today.completion.knownMarked',
  ]),
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
