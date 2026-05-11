/**
 * Static validation for the Guided Today MVP lesson and local progress helpers.
 *
 * Run: npx tsx scripts/test-guided-today-data.ts
 */

import {
  GUIDED_LESSONS,
  getCurrentGuidedLesson,
  normalizeGuidedAnswer,
} from '../src/data/guidedLessons.ts'
import {
  createEmptyTodayProgressState,
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
assert('core phrase matches MVP', lesson.corePhrase.targetText === 'Excuse me, do you speak English?')
assert('German meaning matches MVP', lesson.corePhrase.baseText === 'Entschuldigung, sprechen Sie Englisch?')
assert('lesson media has required caption', lesson.lessonMedia.caption.length > 0)
assert('empty media URL is allowed for intentional placeholder', lesson.lessonMedia.url === '')

console.log('\n[phrase production]')
const builtPhrase = lesson.build.chips
  .filter((chip) => ['Excuse me,', 'do you speak', 'English?'].includes(chip))
  .join(' ')

assert('build chips can form the exact phrase', builtPhrase === lesson.build.targetText, builtPhrase)
assert('type recall accepts English case-insensitively', lesson.typeRecall.acceptedAnswers.some((answer) => normalizeGuidedAnswer(answer) === 'english'))
assert('lesson items include five active recall entries', lesson.lessonItems.length === 5, lesson.lessonItems.length)
assert('lesson items include please', lesson.lessonItems.some((item) => item.targetText === 'please' && item.baseText === 'bitte'))
assert('lesson items include thank you', lesson.lessonItems.some((item) => item.targetText === 'thank you' && item.baseText === 'danke'))

console.log('\n[local progress]')
const userId = 'user-123'
const empty = createEmptyTodayProgressState()
const completed = markTodayLessonComplete(empty, lesson, {
  buildAttempts: 2,
  typeAttempts: 1,
  reviewCorrect: 5,
  reviewTotal: 5,
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
  'skip status is stored separately from completion',
  skipped.courses[lesson.courseId]?.lessons[lesson.id]?.status === 'skipped'
    && skipped.courses[lesson.courseId]?.completedLessonIds.length === 0
    && skipped.courses[lesson.courseId]?.skippedLessonIds.includes(lesson.id),
  skipped,
)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
