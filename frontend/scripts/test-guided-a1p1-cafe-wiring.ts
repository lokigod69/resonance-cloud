import {
  getGuidedPathLessons,
  resolveGuidedLessonVariant,
} from '../src/data/guidedLessons'

const PATH_ID = 'english-a1-practical-1'
const VIDEO_PREFIX =
  'https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/object/public/videos/guided-today/a1p1/cafe/v1/'

type ExpectedLesson = {
  title: string
  phrase: string
  baseText: string
  video?: string
}

const expectedLessons: ExpectedLesson[] = [
  {
    title: 'First contact',
    phrase: 'Hi there, do you speak English?',
    baseText: 'Hallo, sprechen Sie Englisch?',
    video: `${VIDEO_PREFIX}s01_first_contact.mp4`,
  },
  {
    title: 'Polite follow-up',
    phrase: 'Sorry, could you say that again?',
    baseText: 'Entschuldigung, könnten Sie das noch einmal sagen?',
    video: `${VIDEO_PREFIX}s02_polite_followup.mp4`,
  },
  {
    title: 'Coffee order',
    phrase: "I'd like a coffee, please.",
    baseText: 'Ich hätte gern einen Kaffee, bitte.',
    video: `${VIDEO_PREFIX}s03_coffee_order.mp4`,
  },
  {
    title: 'Price question',
    phrase: 'How much is this?',
    baseText: 'Wie viel kostet das?',
    video: `${VIDEO_PREFIX}s04_price_question.mp4`,
  },
  {
    title: 'Café exit',
    phrase: 'Wonderful, thanks so much. Goodbye.',
    baseText: 'Wunderbar, vielen Dank. Auf Wiedersehen.',
    video: `${VIDEO_PREFIX}s05_cafe_exit.mp4`,
  },
  {
    title: 'Ask for help',
    phrase: 'Hi, could you help me, please?',
    baseText: 'Hallo, könnten Sie mir bitte helfen?',
  },
  {
    title: 'Train station',
    phrase: 'Where is the train station?',
    baseText: 'Wo ist der Bahnhof?',
  },
  {
    title: 'Train time',
    phrase: 'What time is the train, please?',
    baseText: 'Wann fährt der Zug bitte?',
  },
  {
    title: 'Small talk',
    phrase: 'I love it here.',
    baseText: 'Ich finde es hier wunderschön.',
  },
  {
    title: 'Tomorrow at seven',
    phrase: 'Tomorrow at seven? Great!',
    baseText: 'Morgen um sieben? Großartig!',
  },
]

let passed = 0
let failed = 0

function check(condition: boolean, message: string) {
  if (condition) {
    passed += 1
    return
  }

  failed += 1
  console.error(`FAIL: ${message}`)
}

const lessons = getGuidedPathLessons(PATH_ID)
check(lessons.length === expectedLessons.length, `expected ${expectedLessons.length} lessons, found ${lessons.length}`)

lessons.forEach((definition, index) => {
  const expected = expectedLessons[index]
  const lesson = resolveGuidedLessonVariant(definition, 'bright')

  check(definition.lessonNumber === index + 1, `lesson ${index + 1} has lessonNumber ${definition.lessonNumber}`)
  check(definition.lessonMetadata.sequence === index + 1, `lesson ${index + 1} has sequence ${definition.lessonMetadata.sequence}`)
  check(definition.title.de === expected.title, `lesson ${index + 1} title is ${definition.title.de}`)
  check(lesson.corePhrase.targetText === expected.phrase, `lesson ${index + 1} phrase is ${lesson.corePhrase.targetText}`)
  check(lesson.corePhrase.baseText.de === expected.baseText, `lesson ${index + 1} German base is ${lesson.corePhrase.baseText.de}`)
  check(lesson.build.targetText === expected.phrase, `lesson ${index + 1} build target is ${lesson.build.targetText}`)
  check(lesson.speak.targetPhrase === expected.phrase, `lesson ${index + 1} speak target is ${lesson.speak.targetPhrase}`)

  if (expected.video) {
    check(lesson.lessonMedia?.type === 'video', `lesson ${index + 1} media type is ${lesson.lessonMedia?.type}`)
    check(lesson.lessonMedia?.url === expected.video, `lesson ${index + 1} video URL is ${lesson.lessonMedia?.url}`)
  } else {
    check(!lesson.lessonMedia?.url?.startsWith(VIDEO_PREFIX), `lesson ${index + 1} should not use cafe v1 video URL`)
  }
})

console.log(`Guided A1P1 cafe wiring checks: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  process.exit(1)
}
