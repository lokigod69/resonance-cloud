/**
 * Static validation for Guided Today lesson data and local-only progress helpers.
 *
 * Run: npx tsx scripts/test-guided-today-data.ts
 */

import {
  ACTIVE_GUIDED_VIBE_IDS,
  FUTURE_GUIDED_VIBE_IDS,
  isActiveGuidedVibeId,
} from '../src/data/guidedVibes.ts'
import {
  getGuidedTodayPathOptions,
  GUIDED_LESSONS,
  getCurrentGuidedLesson,
  getFirstIncompleteGuidedLesson,
  getGuidedMatchPairs,
  getGuidedPathLessons,
  getGuidedReviewChoices,
  getGuidedReviewItems,
  getGuidedTypeFallbackChoices,
  getNextGuidedLesson,
  normalizeGuidedAnswer,
  resolveGuidedLessonVariant,
  type GuidedLessonDefinition,
  type GuidedLessonVibeVariant,
} from '../src/data/guidedLessons.ts'
import { TODAY_SESSION_STEPS } from '../src/components/today/sessionSteps.ts'
import { getSpeechWordOverlap } from '../src/components/today/speechRecognition.ts'
import {
  createEmptyTodayProgressState,
  getCompletedTodayLessonVibeIds,
  getTodayCompletionLines,
  getTodayCompletionSummary,
  getTodayLessonStatus,
  getTodayLessonVibeStatus,
  markTodayLessonComplete,
  markTodayLessonSkipped,
  readTodayProgressState,
  restartTodayLessonProgress,
  todayProgressKey,
  writeTodayProgressState,
} from '../src/lib/todayProgress.ts'

const ASCII_GERMAN_TRANSLITERATION_MARKERS = [
  'Koenn',
  'koenn',
  'waere',
  'waehrend',
  'spaeter',
  'laesst',
  'nuetzlich',
  'fuer',
  'ueber',
  'muessen',
  'Strasse',
  'Cafe',
  'Naehe',
  'naech',
  'schliess',
  'Tuer',
  'Oeffnung',
  'Oeffnungs',
  'frueh',
  'Bestaetigung',
  'Staedt',
  'gueltig',
  'naeh',
  'faehr',
  'waer',
  'haeng',
  'spaet',
  'verspaet',
  'aender',
  'erklaer',
  'gefaehr',
  'aergerlich',
  'maennlich',
  'naeher',
  'waehl',
  'Gebaeck',
  'Geraet',
  'moecht',
  'oeffn',
  'geoeffnet',
  'schoen',
  'hoer',
  'moeglich',
  'unmoeglich',
  'froehlich',
  'broetchen',
  'hoeflich',
  'koerperlich',
  'loesung',
  'Zahlungsloesung',
  'pruef',
  'geprueft',
  'frueher',
  'Uebertreibung',
  'uebersetz',
  'uebernacht',
  'muess',
  'duerf',
  'fuenf',
  'gluecklich',
  'buero',
  'spuer',
  'gruess',
  'Verfuegbar',
  'fuegt',
  'beruehrt',
  'Rueck',
  'klaert',
  'Tuete',
  'duerfen',
  'strass',
  'weiss',
  'heiss',
  'gross',
  'groesse',
  'dreissig',
  'spass',
  'Fuss',
  'Fussweg',
  'gruss',
  'Kartenlesegeraet',
  'Ladentuer',
  'Ausstiegstuer',
] as const

const MOJIBAKE_PATTERN = /Ã[\x80-\xBF]/
// Lost-byte diacritic corruption: a literal "?" placeholder that replaces a
// non-ASCII byte. The lost char can land mid-word ("T?r" was "Tür") OR
// word-initial ("?ber" was "über"). We flag any "?" that is immediately
// followed by a Latin letter — a legitimate sentence-ending "?" is followed
// by whitespace, end-of-string, or punctuation, never a bare letter.
const CORRUPT_DIACRITIC_PATTERN = /\?[A-Za-z]/

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

const pathOneId = 'english-a1-practical-1'
const pathTwoId = 'english-a1-practical-2'
const pathThreeId = 'english-a1-practical-3'
const pathLessons = getGuidedPathLessons(pathOneId)
const pathTwoLessons = getGuidedPathLessons(pathTwoId)
const pathThreeLessons = getGuidedPathLessons(pathThreeId)
const firstDefinition = pathLessons[0]
const lessonIds = pathLessons.map((lesson) => lesson.id)
const lessonNumbers = pathLessons.map((lesson) => lesson.lessonNumber)
const expectedTitles = [
  'First contact',
  'Polite follow-up',
  'Where is...?',
  "I'd like...",
  'How much?',
  'The train',
  'I need...',
  'I like...',
  'Tomorrow at seven',
  'Thank you, goodbye',
]
const expectedPathTwoTitles = [
  "I don't understand",
  'Write it down',
  'Show me',
  'Which one?',
  'Do you have...?',
  'By card',
  'A receipt, please',
  'I have a reservation',
  'Is this right?',
  'One moment',
]
const expectedPathThreeTitles = [
  'Right or left?',
  'How far is it?',
  'Is it open?',
  'Which bus?',
  'The next stop',
  'A ticket, please',
  'What time does it close?',
  'The corner',
  'By foot or by taxi?',
  'I missed my stop',
]

console.log('\n[path inventory]')
assert('A1 Practical 1 resolves 10 lessons', pathLessons.length === 10, pathLessons.length)
assert('A1 Practical 2 resolves 10 lessons', pathTwoLessons.length === 10, pathTwoLessons.length)
assert('A1 Practical 3 resolves 10 lessons', pathThreeLessons.length === 10, pathThreeLessons.length)
assert('static lessons belong only to active V0 paths', GUIDED_LESSONS.every((lesson) => [pathOneId, pathTwoId, pathThreeId].includes(lesson.pathId)), GUIDED_LESSONS.map((lesson) => lesson.pathId))
assert('lesson ids are unique', new Set(lessonIds).size === lessonIds.length, lessonIds)
assert('lesson numbers 1-10 exist with no gaps', JSON.stringify(lessonNumbers) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), lessonNumbers)
assert('A1 Practical 1 arc titles match product sequence', JSON.stringify(pathLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedTitles), pathLessons.map((lesson) => lesson.title))
assert('A1 Practical 2 arc titles match product sequence', JSON.stringify(pathTwoLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathTwoTitles), pathTwoLessons.map((lesson) => lesson.title))
assert('A1 Practical 3 arc titles match product sequence', JSON.stringify(pathThreeLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathThreeTitles), pathThreeLessons.map((lesson) => lesson.title))
assert('path selector source exposes all active paths', JSON.stringify(getGuidedTodayPathOptions().map((path) => path.id)) === JSON.stringify([pathOneId, pathTwoId, pathThreeId]), getGuidedTodayPathOptions())

console.log('\n[lesson definitions]')
for (const lesson of pathLessons) {
  assert(`${lesson.id} preserves existing A1 Practical 1 lesson id shape`, lesson.id.startsWith('english-a1-practical-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathOneId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedTitles[lesson.lessonNumber - 1], lesson.title)
  assert(`${lesson.id} has invariant situation`, hasText(lesson.situation.en) && hasText(lesson.situation.de), lesson.situation)
  assert(`${lesson.id} has invariant pedagogical goal`, hasText(lesson.pedagogicalGoal), lesson.pedagogicalGoal)
  assert(`${lesson.id} uses guided-today-v0 mode`, lesson.modeSet === 'guided-today-v0', lesson.modeSet)
  assert(`${lesson.id} has session steps`, JSON.stringify(lesson.steps) === JSON.stringify(TODAY_SESSION_STEPS), lesson.steps)
  assert(`${lesson.id} has estimated minutes`, lesson.estimatedMinutes === 5, lesson.estimatedMinutes)
  assert(`${lesson.id} fallback vibe is active`, isActiveGuidedVibeId(lesson.fallbackVibeId), lesson.fallbackVibeId)
  assert(`${lesson.id} is usable now`, lesson.status === 'active', lesson.status)
  assert(`${lesson.id} only defines active V0 variants`, Object.keys(lesson.vibeVariants).every((vibeId) => ACTIVE_GUIDED_VIBE_IDS.includes(vibeId as never)), lesson.vibeVariants)
  for (const futureVibeId of FUTURE_GUIDED_VIBE_IDS) {
    assert(`${lesson.id} has no required ${futureVibeId} runtime variant`, !(futureVibeId in lesson.vibeVariants), lesson.vibeVariants)
  }
  for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
    const variant = lesson.vibeVariants[vibeId]
    assert(`${lesson.id} has ${vibeId} variant`, variant !== undefined, lesson.vibeVariants)
    if (variant) validateVariant(lesson, vibeId, variant)
  }
}

for (const lesson of pathTwoLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-2-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathTwoId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathTwoTitles[lesson.lessonNumber - 1], lesson.title)
  assert(`${lesson.id} has invariant situation`, hasText(lesson.situation.en) && hasText(lesson.situation.de), lesson.situation)
  assert(`${lesson.id} has invariant pedagogical goal`, hasText(lesson.pedagogicalGoal), lesson.pedagogicalGoal)
  assert(`${lesson.id} uses guided-today-v0 mode`, lesson.modeSet === 'guided-today-v0', lesson.modeSet)
  assert(`${lesson.id} uses existing Foundation session steps`, JSON.stringify(lesson.steps) === JSON.stringify(TODAY_SESSION_STEPS), lesson.steps)
  assert(`${lesson.id} has estimated minutes`, lesson.estimatedMinutes === 5, lesson.estimatedMinutes)
  assert(`${lesson.id} fallback vibe is active`, isActiveGuidedVibeId(lesson.fallbackVibeId), lesson.fallbackVibeId)
  assert(`${lesson.id} is usable now`, lesson.status === 'active', lesson.status)
  assert(`${lesson.id} has Bright, Wistful, Sharp variants`, ACTIVE_GUIDED_VIBE_IDS.every((vibeId) => lesson.vibeVariants[vibeId] !== undefined), lesson.vibeVariants)
  assert(`${lesson.id} only defines active V0 variants`, Object.keys(lesson.vibeVariants).every((vibeId) => ACTIVE_GUIDED_VIBE_IDS.includes(vibeId as never)), lesson.vibeVariants)
  for (const futureVibeId of FUTURE_GUIDED_VIBE_IDS) {
    assert(`${lesson.id} has no required ${futureVibeId} runtime variant`, !(futureVibeId in lesson.vibeVariants), lesson.vibeVariants)
  }
  for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
    const variant = lesson.vibeVariants[vibeId]
    assert(`${lesson.id} has ${vibeId} variant`, variant !== undefined, lesson.vibeVariants)
    if (variant) validateVariant(lesson, vibeId, variant)
  }
}

for (const lesson of pathThreeLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-3-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathThreeId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathThreeTitles[lesson.lessonNumber - 1], lesson.title)
  assert(`${lesson.id} has invariant situation`, hasText(lesson.situation.en) && hasText(lesson.situation.de), lesson.situation)
  assert(`${lesson.id} has invariant pedagogical goal`, hasText(lesson.pedagogicalGoal), lesson.pedagogicalGoal)
  assert(`${lesson.id} uses guided-today-v0 mode`, lesson.modeSet === 'guided-today-v0', lesson.modeSet)
  assert(`${lesson.id} uses existing Foundation session steps`, JSON.stringify(lesson.steps) === JSON.stringify(TODAY_SESSION_STEPS), lesson.steps)
  assert(`${lesson.id} has estimated minutes`, lesson.estimatedMinutes === 5, lesson.estimatedMinutes)
  assert(`${lesson.id} fallback vibe is active`, isActiveGuidedVibeId(lesson.fallbackVibeId), lesson.fallbackVibeId)
  assert(`${lesson.id} is usable now`, lesson.status === 'active', lesson.status)
  assert(`${lesson.id} has Bright, Wistful, Sharp variants`, ACTIVE_GUIDED_VIBE_IDS.every((vibeId) => lesson.vibeVariants[vibeId] !== undefined), lesson.vibeVariants)
  assert(`${lesson.id} only defines active V0 variants`, Object.keys(lesson.vibeVariants).every((vibeId) => ACTIVE_GUIDED_VIBE_IDS.includes(vibeId as never)), lesson.vibeVariants)
  for (const futureVibeId of FUTURE_GUIDED_VIBE_IDS) {
    assert(`${lesson.id} has no required ${futureVibeId} runtime variant`, !(futureVibeId in lesson.vibeVariants), lesson.vibeVariants)
  }
  for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
    const variant = lesson.vibeVariants[vibeId]
    assert(`${lesson.id} has ${vibeId} variant`, variant !== undefined, lesson.vibeVariants)
    if (variant) validateVariant(lesson, vibeId, variant)
  }
}

console.log('\n[type recall polish]')
const existingLowValueTypeRecallTargets = new Set(['english', 'this', 'here', 'please', 'it'])
const a1P3LowValueTypeRecallTargets = new Set(['english', 'this', 'here', 'please', 'it', 'left', 'right', 'bus', 'stop', 'ticket'])
for (const lessonDefinition of [...pathLessons, ...pathTwoLessons, ...pathThreeLessons]) {
  for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
    const lesson = resolveGuidedLessonVariant(lessonDefinition, vibeId)
    const normalizedAnswer = normalizeGuidedAnswer(lesson.typeRecall.answer)
    const lowValueTypeRecallTargets = lesson.pathId === pathThreeId
      ? a1P3LowValueTypeRecallTargets
      : existingLowValueTypeRecallTargets
    assert(`${lesson.id}/${vibeId} type recall avoids low-value final-word target`, !lowValueTypeRecallTargets.has(normalizedAnswer), lesson.typeRecall)
    assert(`${lesson.id}/${vibeId} type recall answer appears in the visible phrase`, phraseContainsAnswer(lesson), lesson.typeRecall)
    assert(`${lesson.id}/${vibeId} speak cue is learner-facing German`, looksLikeGermanCue(lesson.speak.baseCue), lesson.speak.baseCue)
  }
}
if (firstDefinition) {
  const lessonOneBright = resolveGuidedLessonVariant(firstDefinition, 'bright')
  assert('lesson 1 Bright recalls speak, not English', normalizeGuidedAnswer(lessonOneBright.typeRecall.answer) === 'speak', lessonOneBright.typeRecall)
}

console.log('\n[A1 Practical 2 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathTwoLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 2 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathTwoLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 2 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
}
const pathOneLessonTwoPhrases = ACTIVE_GUIDED_VIBE_IDS.map((vibeId) => normalizeGuidedAnswer(resolveGuidedLessonVariant(pathLessons[1]!, vibeId).corePhrase.targetText))
const pathTwoLessonOnePhrases = ACTIVE_GUIDED_VIBE_IDS.map((vibeId) => normalizeGuidedAnswer(resolveGuidedLessonVariant(pathTwoLessons[0]!, vibeId).corePhrase.targetText))
assert('A1 Practical 2 lesson 1 stays distinct from A1 Practical 1 polite follow-up', pathTwoLessonOnePhrases.every((phrase) => !pathOneLessonTwoPhrases.includes(phrase)), { pathOneLessonTwoPhrases, pathTwoLessonOnePhrases })

console.log('\n[A1 Practical 3 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathThreeLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 3 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathThreeLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 3 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
}

console.log('\n[German diacritic detector unit checks]')

const expectedScannedGermanFieldKinds = [
  'chunks[*].baseText',
  'corePhrase.baseText',
  'lessonItems[*].baseText',
  'meaning',
  'nextLessonTeaser.situation',
  'placeholderMedia.caption',
  'sceneCaption',
  'situation.de',
  'speakTarget.baseCue',
  'trophyWord.example',
  'trophyWord.meaning',
  'trophyWord.whyThisWord',
]
const actualScannedGermanFieldKinds = getScannedGermanFieldKinds()
assert(
  'German guard scans every required learner-facing field kind',
  JSON.stringify(actualScannedGermanFieldKinds) === JSON.stringify(expectedScannedGermanFieldKinds),
  { expected: expectedScannedGermanFieldKinds, actual: actualScannedGermanFieldKinds },
)

const positiveAsciiCases: Array<[string, string]> = [
  ['Welcher Bus faehrt zum Museum?', 'faehr'],
  ['Du pruefst, ob es offen ist.', 'pruef'],
  ['...kurze Rueckfrage...', 'Rueck'],
  ['...zu Fuss gehen', 'Fuss'],
  ['Eine Tuete bitte.', 'Tuete'],
  ['Die naechste Haltestelle', 'naech'],
]
for (const [sample, expectedMarker] of positiveAsciiCases) {
  const markers = detectAsciiGermanTransliterationMarkers(sample)
  assert(
    `ASCII detector flags ${JSON.stringify(sample)} (marker: ${expectedMarker})`,
    markers.some((marker) => marker.toLowerCase() === expectedMarker.toLowerCase()),
    markers,
  )
}

const mojibakeSample = 'schÃ¶n / nett'
assert(
  `mojibake detector flags ${JSON.stringify(mojibakeSample)}`,
  detectMojibake(mojibakeSample) && !detectCorruptDiacritic(mojibakeSample),
  { mojibake: detectMojibake(mojibakeSample), corruptDiacritic: detectCorruptDiacritic(mojibakeSample) },
)

const corruptSample = 'etwas Einfaches ?ber einen Ort'
assert(
  `corrupt-diacritic detector flags ${JSON.stringify(corruptSample)}`,
  detectCorruptDiacritic(corruptSample) && !detectMojibake(corruptSample),
  { corruptDiacritic: detectCorruptDiacritic(corruptSample), mojibake: detectMojibake(corruptSample) },
)

const negativeCleanSamples = [
  'Wann schließt es heute?',
  'Die nächste Haltestelle',
  'Ist hier jetzt geöffnet?',
  'Café Adler',
  'Wasser',
  'Klasse',
  'dass',
  'geschlossen',
  'queue',
  'vague',
  'Boeing',
]
for (const sample of negativeCleanSamples) {
  const asciiMarkers = detectAsciiGermanTransliterationMarkers(sample)
  const corrupt = detectCorruptDiacritic(sample)
  const mojibake = detectMojibake(sample)
  assert(
    `no detector flags clean sample ${JSON.stringify(sample)}`,
    asciiMarkers.length === 0 && !corrupt && !mojibake,
    { asciiMarkers, corrupt, mojibake },
  )
}

console.log('\n[German learner-facing diacritics]')
const asciiGermanFlags = collectAsciiGermanTransliterationFlags()
assert('German learner-facing Guided Today fields avoid common ASCII transliterations', asciiGermanFlags.length === 0, asciiGermanFlags)

const corruptDiacriticFlags = collectCorruptDiacriticFlags()
assert('German learner-facing Guided Today fields avoid lost-byte (?) diacritic corruption', corruptDiacriticFlags.length === 0, corruptDiacriticFlags)

const mojibakeFlags = collectMojibakeFlags()
assert('German learner-facing Guided Today fields avoid UTF-8 mojibake (Ã¶ etc.)', mojibakeFlags.length === 0, mojibakeFlags)

console.log('\n[vibe resolution]')
if (firstDefinition) {
  assert('current lesson defaults to lesson 1 Bright', getCurrentGuidedLesson().id === firstDefinition.id && getCurrentGuidedLesson().vibeId === 'bright')
  assert('invalid selected vibe falls back to Bright', resolveGuidedLessonVariant(firstDefinition, 'not-a-vibe').vibeId === 'bright')
  assert('future selected vibe falls back to Bright', resolveGuidedLessonVariant(firstDefinition, 'tender').vibeId === 'bright')
  for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
    assert(`${vibeId} resolves for lesson 1`, resolveGuidedLessonVariant(firstDefinition, vibeId).vibeId === vibeId)
  }
}

console.log('\n[path helpers]')
const firstLesson = pathLessons[0]
const secondLesson = pathLessons[1]
if (firstLesson && secondLesson) {
  const resolvedFirst = resolveGuidedLessonVariant(firstLesson, 'bright')
  const completedFirst = markTodayLessonComplete(createEmptyTodayProgressState(), resolvedFirst, minimalResult())
  assert('first incomplete helper starts at lesson 1 with no progress', getFirstIncompleteGuidedLesson(pathOneId, createEmptyTodayProgressState())?.id === firstLesson.id)
  assert('first incomplete helper advances after lesson-level completion', getFirstIncompleteGuidedLesson(pathOneId, completedFirst)?.id === secondLesson.id)
  assert('next lesson helper advances by lesson id', getNextGuidedLesson(pathOneId, firstLesson.id)?.id === secondLesson.id)
}

console.log('\n[lesson mechanics]')
const brightLesson = getCurrentGuidedLesson('bright')
const matchPairs = getGuidedMatchPairs(brightLesson)
assert('matching pairs exist for each core phrase chunk', matchPairs.length === brightLesson.phraseChunks.length, matchPairs)
assert('type fallback choices include one correct answer', getGuidedTypeFallbackChoices(brightLesson).filter((choice) => choice.isCorrect).length >= 1, getGuidedTypeFallbackChoices(brightLesson))
for (const item of brightLesson.lessonItems) {
  const choices = getGuidedReviewChoices(brightLesson, item)
  assert(`review choices can be generated for ${item.id}`, choices.length === 3 && choices.some((choice) => choice.id === item.id && choice.isCorrect), choices)
}
const filteredReviewItems = getGuidedReviewItems(brightLesson, new Set(brightLesson.lessonItems.slice(0, 2).map((item) => item.id)))
assert('known-item filtering excludes marked lesson items', filteredReviewItems.length === Math.max(0, brightLesson.lessonItems.length - 2), filteredReviewItems)
assert('speech word-overlap helper passes close transcript', getSpeechWordOverlap(stripPunctuation(brightLesson.speak.targetPhrase), brightLesson.speak.targetPhrase) >= 0.8)
assert('speech word-overlap helper fails wrong transcript', getSpeechWordOverlap('thank you please', brightLesson.speak.targetPhrase) < 0.8)

console.log('\n[local progress]')
const userId = 'user-123'
const completed = markTodayLessonComplete(createEmptyTodayProgressState(), brightLesson, {
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
const skipped = markTodayLessonSkipped(createEmptyTodayProgressState(), brightLesson)
const restarted = restartTodayLessonProgress(completed, brightLesson)
assert('progress key is user-scoped', todayProgressKey(userId) === 'resonance_today_progress_v1_user-123')
assert('empty progress starts at schema version 2', createEmptyTodayProgressState().schemaVersion === 2, createEmptyTodayProgressState())
assert('complete status is stored at lesson level', getTodayLessonStatus(completed, brightLesson) === 'completed', completed)
assert('skip status is stored at lesson level', getTodayLessonStatus(skipped, brightLesson) === 'skipped', skipped)
assert('restart clears only the lesson progress entry', getTodayLessonStatus(restarted, brightLesson) === 'new', restarted)
assert('completing a lesson records the active vibe completion', getTodayLessonVibeStatus(completed, brightLesson, 'bright') === 'completed', completed)
assert('completing one vibe keeps the lesson complete overall', getTodayLessonStatus(completed, resolveGuidedLessonVariant(firstDefinition!, 'wistful')) === 'completed', completed)
assert('uncompleted selected vibe stays startable even when lesson is complete overall', getTodayLessonVibeStatus(completed, resolveGuidedLessonVariant(firstDefinition!, 'wistful'), 'wistful') === 'new', completed)
assert('completed vibe ids include only completed active vibes', JSON.stringify(getCompletedTodayLessonVibeIds(completed, brightLesson)) === JSON.stringify(['bright']), getCompletedTodayLessonVibeIds(completed, brightLesson))
const completedBrightAndSharp = markTodayLessonComplete(completed, resolveGuidedLessonVariant(firstDefinition!, 'sharp'), minimalResult())
assert('additional vibe completion keeps one overall lesson completion', completedBrightAndSharp.courses[pathOneId]?.completedLessonIds.filter((id) => id === brightLesson.id).length === 1, completedBrightAndSharp)
assert('additional vibe completion appends badge-ready active vibe ids', JSON.stringify(getCompletedTodayLessonVibeIds(completedBrightAndSharp, brightLesson)) === JSON.stringify(['bright', 'sharp']), getCompletedTodayLessonVibeIds(completedBrightAndSharp, brightLesson))
const storedResultJson = JSON.stringify(completed.courses[brightLesson.courseId]?.lessons[brightLesson.id]?.result)
assert('no raw typed recall answers are stored', !containsAny(storedResultJson, ['typedAnswer', 'typeAnswer', 'typedRecallAnswer', 'rawAnswer']), completed)
assert('no raw speech transcripts are stored', !containsAny(storedResultJson, ['speechTranscript', 'transcriptText', 'rawTranscript', stripPunctuation(brightLesson.speak.targetPhrase)]), completed)
assert('completion lines include type and speak summaries', getTodayCompletionLines(completed.courses[brightLesson.courseId]!.lessons[brightLesson.id]!.result!).length >= 2)
assert('completion summary supports no known items', getTodayCompletionSummary(completed.courses[brightLesson.courseId]!.lessons[brightLesson.id]!.result!).key === 'today.completion.summary')
const pathTwoBrightLesson = resolveGuidedLessonVariant(pathTwoLessons[0]!, 'bright')
const completedPathTwoFirst = markTodayLessonComplete(completed, pathTwoBrightLesson, minimalResult())
  assert('path progress does not mix A1 Practical 1 and A1 Practical 2 counts', completedPathTwoFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathTwoFirst.courses[pathTwoId]?.completedLessonIds.length === 1, completedPathTwoFirst)
  assert('vibe completion badges are path and lesson scoped', getCompletedTodayLessonVibeIds(completedPathTwoFirst, pathTwoBrightLesson).join(',') === 'bright' && getCompletedTodayLessonVibeIds(completedPathTwoFirst, brightLesson).join(',') === 'bright', completedPathTwoFirst)
  const pathThreeFirstDefinition = pathThreeLessons[0]
  if (pathThreeFirstDefinition) {
    const pathThreeBrightLesson = resolveGuidedLessonVariant(pathThreeFirstDefinition, 'bright')
    const completedPathThreeFirst = markTodayLessonComplete(completedPathTwoFirst, pathThreeBrightLesson, minimalResult())
    assert('path progress does not mix A1 Practical 3 with earlier paths', completedPathThreeFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathThreeFirst.courses[pathTwoId]?.completedLessonIds.length === 1 && completedPathThreeFirst.courses[pathThreeId]?.completedLessonIds.length === 1, completedPathThreeFirst)
  }

console.log('\n[local progress migration]')
const originalWindow = globalThis.window
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createMemoryStorage() },
  configurable: true,
})

try {
  const legacyState = {
    schemaVersion: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    courses: JSON.parse(JSON.stringify(completed.courses)),
  }
  delete legacyState.courses[pathOneId]?.lessons[brightLesson.id]?.vibeCompletions
  window.localStorage.setItem(todayProgressKey(userId), JSON.stringify(legacyState))
  const migrated = readTodayProgressState(userId)
  assert('legacy schema v1 localStorage is migrated to schema version 2', migrated.schemaVersion === 2, migrated)
  assert('legacy schema v1 completed lesson remains complete overall', getTodayLessonStatus(migrated, brightLesson) === 'completed', migrated)
  assert('legacy schema v1 does not invent per-vibe badges', getCompletedTodayLessonVibeIds(migrated, brightLesson).length === 0, migrated)
  window.localStorage.setItem(todayProgressKey(userId), JSON.stringify({
    schemaVersion: 2,
    updatedAt: '2026-01-02T00:00:00.000Z',
    courses: {
      'english-a1-practical': completed.courses[pathOneId],
    },
  }))
  const migratedPathId = readTodayProgressState(userId)
  assert('legacy single-path progress is migrated to A1 Practical 1 path id', migratedPathId.courses[pathOneId]?.completedLessonIds.includes(brightLesson.id) === true, migratedPathId)
  assert('legacy single-path progress key is removed after migration', !('english-a1-practical' in migratedPathId.courses), migratedPathId)
  writeTodayProgressState(userId, completedBrightAndSharp)
  const stored = JSON.parse(window.localStorage.getItem(todayProgressKey(userId)) ?? '{}') as { schemaVersion?: number }
  assert('written localStorage progress uses schema version 2', stored.schemaVersion === 2, stored)
} finally {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
  })
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)

function validateVariant(
  lesson: GuidedLessonDefinition,
  vibeId: string,
  variant: GuidedLessonVibeVariant,
) {
  assert(`${lesson.id}/${vibeId} content status is draft or final`, variant.contentStatus === 'draft' || variant.contentStatus === 'final', variant.contentStatus)
  assert(`${lesson.id}/${vibeId} target text exists`, hasText(variant.corePhrase.targetText), variant.corePhrase)
  assert(`${lesson.id}/${vibeId} base text exists`, hasText(variant.corePhrase.baseText), variant.corePhrase)
  assert(`${lesson.id}/${vibeId} meaning exists`, hasText(variant.meaning), variant.meaning)
  assert(`${lesson.id}/${vibeId} chunks are non-empty`, variant.chunks.length > 0 && variant.chunks.every((chunk) => hasText(chunk.id) && hasText(chunk.targetText) && hasText(chunk.baseText)), variant.chunks)
  assert(`${lesson.id}/${vibeId} lesson items are non-empty`, variant.lessonItems.length > 0 && variant.lessonItems.every((item) => hasText(item.id) && hasText(item.targetText) && hasText(item.baseText) && item.acceptedAnswers.length > 0), variant.lessonItems)
  assert(`${lesson.id}/${vibeId} build target exists`, hasText(variant.build.targetText), variant.build)
  assert(`${lesson.id}/${vibeId} build chips support target phrase`, chipsSupportTarget(variant.build.chips, variant.build.targetText), variant.build)
  assert(`${lesson.id}/${vibeId} type recall answer exists`, hasText(variant.typeRecall.answer), variant.typeRecall)
  assert(`${lesson.id}/${vibeId} acceptedAnswers includes answer`, variant.typeRecall.acceptedAnswers.some((answer) => normalizeGuidedAnswer(answer) === normalizeGuidedAnswer(variant.typeRecall.answer)), variant.typeRecall)
  assert(`${lesson.id}/${vibeId} type recall has fallback choices`, variant.typeRecall.fallbackChoices.length >= 3 && variant.typeRecall.fallbackChoices.some((choice) => normalizeGuidedAnswer(choice) === normalizeGuidedAnswer(variant.typeRecall.answer)), variant.typeRecall)
  assert(`${lesson.id}/${vibeId} speak target has cue`, hasText(variant.speakTarget.baseCue), variant.speakTarget)
  assert(`${lesson.id}/${vibeId} speak target phrase is compatible with core phrase`, areCompatiblePhrases(variant.speakTarget.targetPhrase, variant.corePhrase.targetText), variant.speakTarget)
  assert(`${lesson.id}/${vibeId} speak language is supported`, variant.speakTarget.language === 'en-US' || variant.speakTarget.language === 'en-GB', variant.speakTarget)
  assert(`${lesson.id}/${vibeId} speak threshold is usable`, variant.speakTarget.passingThreshold > 0 && variant.speakTarget.passingThreshold <= 1, variant.speakTarget)
  assert(`${lesson.id}/${vibeId} scene caption exists`, hasText(variant.sceneCaption), variant.sceneCaption)
  assert(`${lesson.id}/${vibeId} trophy word is complete`, hasText(variant.trophyWord.word) && hasText(variant.trophyWord.meaning) && hasText(variant.trophyWord.example) && hasText(variant.trophyWord.whyThisWord), variant.trophyWord)
  assert(`${lesson.id}/${vibeId} placeholder media exists`, variant.placeholderMedia !== undefined && hasText(variant.placeholderMedia.caption), variant.placeholderMedia)
  assert(`${lesson.id}/${vibeId} song seed exists`, variant.songSeed !== undefined && hasText(variant.songSeed.genre) && hasText(variant.songSeed.mood), variant.songSeed)
  assert(`${lesson.id}/${vibeId} visual notes exist`, hasText(variant.visualNotes), variant.visualNotes)
}

function minimalResult() {
  return {
    buildAttempts: 1,
    typeAttempts: 1,
    typeUsedFallback: false,
    speakAttempts: 0,
    speakTranscriptMatch: 0,
    speakPassed: false,
    knownMarkedCount: 0,
  }
}

function chipsSupportTarget(chips: string[], targetText: string) {
  const chipText = stripPunctuation(chips.join(' '))
  const targetWords = stripPunctuation(targetText).split(' ').filter(Boolean)
  return targetWords.every((word) => chipText.includes(word))
}

function areCompatiblePhrases(a: string, b: string) {
  return stripPunctuation(a) === stripPunctuation(b)
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function stripPunctuation(value: string) {
  return normalizeGuidedAnswer(value).replace(/[^a-z0-9]+/g, ' ').trim()
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => needle.length > 0 && value.includes(needle))
}

type GermanFieldEntry = { path: string; value: string }

function collectGermanFieldEntries(): GermanFieldEntry[] {
  const entries: GermanFieldEntry[] = []
  for (const lessonDefinition of GUIDED_LESSONS) {
    const lessonPrefix = lessonDefinition.id
    entries.push({ path: `${lessonPrefix}:situation.de`, value: lessonDefinition.situation.de })
    const teaserSituation = lessonDefinition.nextLessonTeaser?.situation
    if (typeof teaserSituation === 'string' && teaserSituation.length > 0) {
      entries.push({ path: `${lessonPrefix}:nextLessonTeaser.situation`, value: teaserSituation })
    }

    for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
      const variant = lessonDefinition.vibeVariants[vibeId]
      if (!variant) continue
      const variantPrefix = `${lessonPrefix}/${vibeId}`

      entries.push({ path: `${variantPrefix}:meaning`, value: variant.meaning })
      entries.push({ path: `${variantPrefix}:corePhrase.baseText`, value: variant.corePhrase.baseText })
      variant.chunks.forEach((phraseChunk, idx) => {
        entries.push({ path: `${variantPrefix}:chunks[${idx}].baseText`, value: phraseChunk.baseText })
      })
      variant.lessonItems.forEach((item, idx) => {
        entries.push({ path: `${variantPrefix}:lessonItems[${idx}].baseText`, value: item.baseText })
      })
      entries.push({ path: `${variantPrefix}:sceneCaption`, value: variant.sceneCaption })
      const placeholderCaption = variant.placeholderMedia?.caption
      if (typeof placeholderCaption === 'string' && placeholderCaption.length > 0) {
        entries.push({ path: `${variantPrefix}:placeholderMedia.caption`, value: placeholderCaption })
      }
      entries.push({ path: `${variantPrefix}:speakTarget.baseCue`, value: variant.speakTarget.baseCue })
      entries.push({ path: `${variantPrefix}:trophyWord.meaning`, value: variant.trophyWord.meaning })
      entries.push({ path: `${variantPrefix}:trophyWord.example`, value: variant.trophyWord.example })
      entries.push({ path: `${variantPrefix}:trophyWord.whyThisWord`, value: variant.trophyWord.whyThisWord })
    }
  }
  return entries
}

function getScannedGermanFieldKinds(): string[] {
  const kinds = new Set<string>()
  for (const { path } of collectGermanFieldEntries()) {
    const afterLesson = path.split(':').slice(1).join(':')
    kinds.add(afterLesson.replace(/\[\d+\]/g, '[*]'))
  }
  return Array.from(kinds).sort()
}

function detectAsciiGermanTransliterationMarkers(value: string): string[] {
  const lower = value.toLowerCase()
  return ASCII_GERMAN_TRANSLITERATION_MARKERS.filter((marker) =>
    lower.includes(marker.toLowerCase()),
  )
}

function detectCorruptDiacritic(value: string): boolean {
  return CORRUPT_DIACRITIC_PATTERN.test(value)
}

function detectMojibake(value: string): boolean {
  return MOJIBAKE_PATTERN.test(value)
}

function collectAsciiGermanTransliterationFlags(): string[] {
  const flags: string[] = []
  for (const { path, value } of collectGermanFieldEntries()) {
    for (const marker of detectAsciiGermanTransliterationMarkers(value)) {
      flags.push(`${path}:${marker}`)
    }
  }
  return flags
}

function collectCorruptDiacriticFlags(): string[] {
  const flags: string[] = []
  for (const { path, value } of collectGermanFieldEntries()) {
    if (detectCorruptDiacritic(value)) flags.push(`${path}:corrupt-diacritic`)
  }
  return flags
}

function collectMojibakeFlags(): string[] {
  const flags: string[] = []
  for (const { path, value } of collectGermanFieldEntries()) {
    if (detectMojibake(value)) flags.push(`${path}:mojibake`)
  }
  return flags
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

function phraseContainsAnswer(lesson: ReturnType<typeof resolveGuidedLessonVariant>) {
  const phrase = normalizeGuidedAnswer(`${lesson.typeRecall.before} ${lesson.typeRecall.answer} ${lesson.typeRecall.after}`)
  const target = normalizeGuidedAnswer(lesson.corePhrase.targetText)
  return target.includes(normalizeGuidedAnswer(lesson.typeRecall.answer)) && phrase.includes(normalizeGuidedAnswer(lesson.typeRecall.answer))
}

function looksLikeGermanCue(value: string) {
  const normalized = value.toLowerCase()
  const germanSignals = [
    'sie',
    'ich',
    'du',
    'mir',
    'mich',
    'bitte',
    'danke',
    'wie',
    'wo',
    'wann',
    'welcher',
    'morgen',
    'tschüss',
    'auf wiedersehen',
    'könnte',
    'könnten',
    'sprechen',
    'brauche',
    'hilfe',
  ]
  const englishLeakage = [
    'clear question',
    'speak fortify',
    'quick question',
    'good place',
    'how much',
    'what time',
    'where is',
    'thank you',
    'goodbye',
  ]
  return germanSignals.some((signal) => normalized.includes(signal))
    && !englishLeakage.some((signal) => normalized.includes(signal))
}

function getOpenerFamily(value: string) {
  return normalizeGuidedAnswer(value)
    .replace(/[,.:;!?].*$/, '')
    .split(' ')
    .slice(0, 4)
    .join(' ')
}
