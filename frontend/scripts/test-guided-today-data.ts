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
  GUIDED_TARGET_LANGUAGE_SPEAK_LOCALES,
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
import { checkGuidedSpeechAnswer } from '../src/lib/guidedSpeechCheck.ts'
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
const pathFourId = 'english-a1-practical-4'
const pathFiveId = 'english-a1-practical-5'
const pathSixId = 'english-a1-practical-6'
const pathSevenId = 'english-a1-practical-7'
const pathEightId = 'english-a1-practical-8'
const pathNineId = 'english-a1-practical-9'
const pathTenId = 'english-a1-practical-10'
const pathLessons = getGuidedPathLessons(pathOneId)
const pathTwoLessons = getGuidedPathLessons(pathTwoId)
const pathThreeLessons = getGuidedPathLessons(pathThreeId)
const pathFourLessons = getGuidedPathLessons(pathFourId)
const pathFiveLessons = getGuidedPathLessons(pathFiveId)
const pathSixLessons = getGuidedPathLessons(pathSixId)
const pathSevenLessons = getGuidedPathLessons(pathSevenId)
const pathEightLessons = getGuidedPathLessons(pathEightId)
const pathNineLessons = getGuidedPathLessons(pathNineId)
const pathTenLessons = getGuidedPathLessons(pathTenId)
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
const expectedBrightPathOnePhrases = [
  'Hi there, do you speak English?',
  'Sorry, could you say that again?',
  'Hi, could you help me? Where is the station?',
  "I'd like a coffee, please.",
  'How much is this?',
  'Hi, what time is the train?',
  'Hi, could you help me, please?',
  'I love it here.',
  'Tomorrow at seven? Great!',
  'Wonderful, thanks so much. Goodbye.',
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
const expectedPathFourTitles = [
  'A table, please',
  'The menu',
  "I'd like tea",
  'No sugar',
  'Is it fresh?',
  'Anything else?',
  'To go, please',
  'It was good',
  'Small talk at the counter',
  'The bill, please',
]
const expectedPathFiveTitles = [
  "Sorry, I'm late",
  'I forgot',
  "What's your name?",
  'Nice to meet you',
  'Where are you from?',
  'Do you live here?',
  'Are you free tonight?',
  "Let's meet at the café",
  'Maybe tomorrow',
  'See you tomorrow',
]
const expectedPathSixTitles = [
  "I don't feel well",
  'A pharmacy nearby?',
  'I need medicine',
  'It hurts here',
  'I have a headache',
  'I need water',
  'Is there a doctor?',
  'I have an allergy',
  'Can you call for help?',
  'I feel better now',
]
const expectedPathSevenTitles = [
  'I need a ticket',
  'Where is the bus?',
  'What time does it leave?',
  'Is this the right train?',
  'I need a taxi',
  'Can we go there?',
  'Please stop here',
  'I am going to the station',
  'How long does it take?',
  'I have arrived',
]
const expectedPathEightTitles = [
  'I have a reservation',
  'I need a room',
  'Where is my room?',
  'I need the key',
  'Is there Wi-Fi?',
  'Where is the bathroom?',
  'I need a towel',
  'I want to sleep',
  'What time is breakfast?',
  'I am checking out',
]
const expectedPathNineTitles = [
  'Nice to meet you',
  'Are you free today?',
  'Can we meet later?',
  'What time works for you?',
  "Let's meet here",
  'I am waiting outside',
  'I am running late',
  'Can we change the plan?',
  'See you tomorrow',
  'Have a good evening',
]
const expectedPathTenTitles = [
  'Today was good',
  'I liked this place',
  'Thank you for your help',
  'I learned a lot',
  'I am tired now',
  'I need to go',
  'See you next time',
  'Tomorrow works for me',
  'Have a good night',
  'Goodbye for now',
]

console.log('\n[path inventory]')
assert('A1 Practical 1 resolves 10 lessons', pathLessons.length === 10, pathLessons.length)
assert('A1 Practical 2 resolves 10 lessons', pathTwoLessons.length === 10, pathTwoLessons.length)
assert('A1 Practical 3 resolves 10 lessons', pathThreeLessons.length === 10, pathThreeLessons.length)
assert('A1 Practical 4 resolves 10 lessons', pathFourLessons.length === 10, pathFourLessons.length)
assert('A1 Practical 5 resolves 10 lessons', pathFiveLessons.length === 10, pathFiveLessons.length)
assert('A1 Practical 6 resolves 10 lessons', pathSixLessons.length === 10, pathSixLessons.length)
assert('A1 Practical 7 resolves 10 lessons', pathSevenLessons.length === 10, pathSevenLessons.length)
assert('A1 Practical 8 resolves 10 lessons', pathEightLessons.length === 10, pathEightLessons.length)
assert('A1 Practical 9 resolves 10 lessons', pathNineLessons.length === 10, pathNineLessons.length)
assert('A1 Practical 10 resolves 10 lessons', pathTenLessons.length === 10, pathTenLessons.length)
const spanishPathOneId = 'spanish-a1-practical-1'
const spanishPathTwoId = 'spanish-a1-practical-2'
const spanishPathThreeId = 'spanish-a1-practical-3'
const spanishPathFourId = 'spanish-a1-practical-4'
const spanishPathFiveId = 'spanish-a1-practical-5'
const spanishPathSixId = 'spanish-a1-practical-6'
const spanishPathSevenId = 'spanish-a1-practical-7'
const spanishPathEightId = 'spanish-a1-practical-8'
const spanishPathNineId = 'spanish-a1-practical-9'
const spanishPathTenId = 'spanish-a1-practical-10'
const italianPathOneId = 'italian-a1-practical-1'
const italianPathTwoId = 'italian-a1-practical-2'
const italianPathThreeId = 'italian-a1-practical-3'
const italianPathFourId = 'italian-a1-practical-4'
const italianPathFiveId = 'italian-a1-practical-5'
const italianPathSixId = 'italian-a1-practical-6'
const italianPathSevenId = 'italian-a1-practical-7'
const italianPathEightId = 'italian-a1-practical-8'
const italianPathNineId = 'italian-a1-practical-9'
const italianPathTenId = 'italian-a1-practical-10'
const frenchPathOneId = 'french-a1-practical-1'
const frenchPathTwoId = 'french-a1-practical-2'
const frenchPathThreeId = 'french-a1-practical-3'
const frenchPathFourId = 'french-a1-practical-4'
const frenchPathFiveId = 'french-a1-practical-5'
const frenchPathSixId = 'french-a1-practical-6'
const frenchPathSevenId = 'french-a1-practical-7'
const frenchPathEightId = 'french-a1-practical-8'
const frenchPathNineId = 'french-a1-practical-9'
const frenchPathTenId = 'french-a1-practical-10'
const portuguesePathOneId = 'portuguese-a1-practical-1'
const portuguesePathTwoId = 'portuguese-a1-practical-2'
const portuguesePathThreeId = 'portuguese-a1-practical-3'
const portuguesePathFourId = 'portuguese-a1-practical-4'
const portuguesePathFiveId = 'portuguese-a1-practical-5'
const portuguesePathSixId = 'portuguese-a1-practical-6'
const portuguesePathSevenId = 'portuguese-a1-practical-7'
const portuguesePathEightId = 'portuguese-a1-practical-8'
const portuguesePathNineId = 'portuguese-a1-practical-9'
const portuguesePathTenId = 'portuguese-a1-practical-10'
const portuguesePathFiveLessons = getGuidedPathLessons(portuguesePathFiveId)
const portuguesePathSixLessons = getGuidedPathLessons(portuguesePathSixId)
const portuguesePathSevenLessons = getGuidedPathLessons(portuguesePathSevenId)
const portuguesePathEightLessons = getGuidedPathLessons(portuguesePathEightId)
const portuguesePathNineLessons = getGuidedPathLessons(portuguesePathNineId)
const portuguesePathTenLessons = getGuidedPathLessons(portuguesePathTenId)
assert('static lessons belong only to active V0 paths', GUIDED_LESSONS.every((lesson) => [pathOneId, pathTwoId, pathThreeId, pathFourId, pathFiveId, pathSixId, pathSevenId, pathEightId, pathNineId, pathTenId, spanishPathOneId, spanishPathTwoId, spanishPathThreeId, spanishPathFourId, spanishPathFiveId, spanishPathSixId, spanishPathSevenId, spanishPathEightId, spanishPathNineId, spanishPathTenId, italianPathOneId, italianPathTwoId, italianPathThreeId, italianPathFourId, italianPathFiveId, italianPathSixId, italianPathSevenId, italianPathEightId, italianPathNineId, italianPathTenId, frenchPathOneId, frenchPathTwoId, frenchPathThreeId, frenchPathFourId, frenchPathFiveId, frenchPathSixId, frenchPathSevenId, frenchPathEightId, frenchPathNineId, frenchPathTenId, portuguesePathOneId, portuguesePathTwoId, portuguesePathThreeId, portuguesePathFourId, portuguesePathFiveId, portuguesePathSixId, portuguesePathSevenId, portuguesePathEightId, portuguesePathNineId, portuguesePathTenId].includes(lesson.pathId)), GUIDED_LESSONS.map((lesson) => lesson.pathId))
assert('lesson ids are unique', new Set(lessonIds).size === lessonIds.length, lessonIds)
assert('lesson numbers 1-10 exist with no gaps', JSON.stringify(lessonNumbers) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), lessonNumbers)
assert('A1 Practical 1 arc titles match product sequence', JSON.stringify(pathLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedTitles), pathLessons.map((lesson) => lesson.title))
assert('A1 Practical 2 arc titles match product sequence', JSON.stringify(pathTwoLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathTwoTitles), pathTwoLessons.map((lesson) => lesson.title))
assert('A1 Practical 3 arc titles match product sequence', JSON.stringify(pathThreeLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathThreeTitles), pathThreeLessons.map((lesson) => lesson.title))
assert('A1 Practical 4 arc titles match product sequence', JSON.stringify(pathFourLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathFourTitles), pathFourLessons.map((lesson) => lesson.title))
assert('A1 Practical 5 arc titles match product sequence', JSON.stringify(pathFiveLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathFiveTitles), pathFiveLessons.map((lesson) => lesson.title))
assert('A1 Practical 6 arc titles match product sequence', JSON.stringify(pathSixLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathSixTitles), pathSixLessons.map((lesson) => lesson.title))
assert('A1 Practical 7 arc titles match product sequence', JSON.stringify(pathSevenLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathSevenTitles), pathSevenLessons.map((lesson) => lesson.title))
assert('A1 Practical 8 arc titles match product sequence', JSON.stringify(pathEightLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathEightTitles), pathEightLessons.map((lesson) => lesson.title))
assert('A1 Practical 9 arc titles match product sequence', JSON.stringify(pathNineLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathNineTitles), pathNineLessons.map((lesson) => lesson.title))
assert('A1 Practical 10 arc titles match product sequence', JSON.stringify(pathTenLessons.map((lesson) => lesson.title)) === JSON.stringify(expectedPathTenTitles), pathTenLessons.map((lesson) => lesson.title))
assert('path selector source exposes all active paths', JSON.stringify(getGuidedTodayPathOptions().map((path) => path.id)) === JSON.stringify([pathOneId, pathTwoId, pathThreeId, pathFourId, pathFiveId, pathSixId, pathSevenId, pathEightId, pathNineId, pathTenId, spanishPathOneId, spanishPathTwoId, spanishPathThreeId, spanishPathFourId, spanishPathFiveId, spanishPathSixId, spanishPathSevenId, spanishPathEightId, spanishPathNineId, spanishPathTenId, italianPathOneId, italianPathTwoId, italianPathThreeId, italianPathFourId, italianPathFiveId, italianPathSixId, italianPathSevenId, italianPathEightId, italianPathNineId, italianPathTenId, frenchPathOneId, frenchPathTwoId, frenchPathThreeId, frenchPathFourId, frenchPathFiveId, frenchPathSixId, frenchPathSevenId, frenchPathEightId, frenchPathNineId, frenchPathTenId, portuguesePathOneId, portuguesePathTwoId, portuguesePathThreeId, portuguesePathFourId, portuguesePathFiveId, portuguesePathSixId, portuguesePathSevenId, portuguesePathEightId, portuguesePathNineId, portuguesePathTenId]), getGuidedTodayPathOptions())
const portuguesePathFiveBrightVariants = portuguesePathFiveLessons.map((lesson) => lesson.vibeVariants.bright)
const expectedPortuguesePathFiveTrophies = ['atraso', 'esqueci', 'nome', 'prazer', 'cidade', 'mora', 'noite', 'parque', 'talvez', 'tchau']
const priorPortugueseTrophies = new Set([
  'olá', 'desculpe', 'onde', 'café', 'quanto', 'trem', 'ajuda', 'aqui', 'amanhã', 'obrigado',
  'entendo', 'escrever', 'mapa', 'melhor', 'disponível', 'cartão', 'sacola', 'reserva', 'certo', 'momento',
  'direita', 'longe', 'aberto', 'ônibus', 'próxima', 'passagem', 'fecha', 'esquina', 'táxi', 'parada',
  'mesa', 'cardápio', 'chá', 'açúcar', 'fresco', 'mais', 'levar', 'gostoso', 'hoje', 'conta',
].map((word) => normalizeGuidedAnswer(word)))
const portuguesePathFiveTrophies = portuguesePathFiveBrightVariants
  .map((variant) => variant?.trophyWord.word ?? '')
  .map((word) => normalizeGuidedAnswer(word))
assert('Portuguese A1 Practical 5 trophy order is locked', JSON.stringify(portuguesePathFiveTrophies) === JSON.stringify(expectedPortuguesePathFiveTrophies), portuguesePathFiveTrophies)
assert('Portuguese A1 Practical 5 trophies avoid prior Portuguese trophies', portuguesePathFiveTrophies.every((word) => !priorPortugueseTrophies.has(word)), portuguesePathFiveTrophies)
assert('Portuguese A1 Practical 5 uses pt-BR in every speak target', portuguesePathFiveBrightVariants.every((variant) => variant?.speakTarget.language === 'pt-BR'), portuguesePathFiveBrightVariants.map((variant) => variant?.speakTarget.language))
const portuguesePathFiveTargetSurfaces = portuguesePathFiveBrightVariants.flatMap((variant) => [
  variant?.corePhrase.targetText,
  variant?.build.targetText,
  variant?.typeRecall.before,
  variant?.typeRecall.answer,
  variant?.typeRecall.after,
  variant?.speakTarget.targetPhrase,
  variant?.trophyWord.example,
  ...(variant?.chunks.map((chunk) => chunk.targetText) ?? []),
  ...(variant?.lessonItems.map((item) => item.targetText) ?? []),
].filter((text): text is string => typeof text === 'string'))
assert('Portuguese A1 Practical 5 has no Spanish inverted punctuation', portuguesePathFiveTargetSurfaces.every((text) => !/[¿¡]/.test(text)), portuguesePathFiveTargetSurfaces)
assert('Portuguese A1 Practical 5 has no default tu forms', portuguesePathFiveTargetSurfaces.every((text) => !/\btu\b/i.test(text) && !/\bestás\b/i.test(text) && !/\bfalas\b/i.test(text)), portuguesePathFiveTargetSurfaces)
assert('Portuguese A1 Practical 5 trophies live in productive target text', portuguesePathFiveBrightVariants.every((variant) => {
  if (!variant) return false
  const trophy = normalizeGuidedAnswer(variant.trophyWord.word)
  return [variant.corePhrase.targetText, variant.build.targetText, variant.typeRecall.answer, variant.speakTarget.targetPhrase, variant.trophyWord.example]
    .some((text) => normalizeGuidedAnswer(text).includes(trophy))
}), portuguesePathFiveTrophies)
const portugueseP5LessonFiveVoceItem = portuguesePathFiveBrightVariants[4]?.lessonItems.find((item) => item.id === 'voce-e')
const portugueseP5LessonTenAteItem = portuguesePathFiveBrightVariants[9]?.lessonItems.find((item) => item.id === 'ate-amanha')
assert('Portuguese A1 Practical 5 accepts partial diacritic variants for você é', ['voce é', 'você e'].every((answer) => portugueseP5LessonFiveVoceItem?.acceptedAnswers?.includes(answer)), portugueseP5LessonFiveVoceItem)
assert('Portuguese A1 Practical 5 accepts partial diacritic variants for até amanhã', ['ate amanhã', 'até amanha'].every((answer) => portugueseP5LessonTenAteItem?.acceptedAnswers?.includes(answer)), portugueseP5LessonTenAteItem)
const portuguesePathSixBrightVariants = portuguesePathSixLessons.map((lesson) => lesson.vibeVariants.bright)
const expectedPortuguesePathSixTrophies = ['mal', 'farmácia', 'remédio', 'dói', 'cabeça', 'água', 'médico', 'alergia', 'ligar', 'bem']
const priorPortugueseThroughP5Trophies = new Set([
  ...priorPortugueseTrophies,
  ...expectedPortuguesePathFiveTrophies,
])
const portuguesePathSixTrophies = portuguesePathSixBrightVariants
  .map((variant) => variant?.trophyWord.word ?? '')
  .map((word) => normalizeGuidedAnswer(word))
assert('Portuguese A1 Practical 6 trophy order is locked', JSON.stringify(portuguesePathSixTrophies) === JSON.stringify(expectedPortuguesePathSixTrophies), portuguesePathSixTrophies)
assert('Portuguese A1 Practical 6 trophies avoid prior Portuguese trophies', portuguesePathSixTrophies.every((word) => !priorPortugueseThroughP5Trophies.has(word)), portuguesePathSixTrophies)
assert('Portuguese A1 Practical 6 uses pt-BR in every speak target', portuguesePathSixBrightVariants.every((variant) => variant?.speakTarget.language === 'pt-BR'), portuguesePathSixBrightVariants.map((variant) => variant?.speakTarget.language))
const portuguesePathSixTargetSurfaces = portuguesePathSixBrightVariants.flatMap((variant) => [
  variant?.corePhrase.targetText,
  variant?.build.targetText,
  variant?.typeRecall.before,
  variant?.typeRecall.answer,
  variant?.typeRecall.after,
  variant?.speakTarget.targetPhrase,
  variant?.trophyWord.example,
  ...(variant?.chunks.map((chunk) => chunk.targetText) ?? []),
  ...(variant?.lessonItems.map((item) => item.targetText) ?? []),
].filter((text): text is string => typeof text === 'string'))
assert('Portuguese A1 Practical 6 has no Spanish inverted punctuation', portuguesePathSixTargetSurfaces.every((text) => !/[¿¡]/.test(text)), portuguesePathSixTargetSurfaces)
assert('Portuguese A1 Practical 6 has no default tu forms', portuguesePathSixTargetSurfaces.every((text) => !/\btu\b/i.test(text) && !/\bestás\b/i.test(text) && !/\bfalas\b/i.test(text)), portuguesePathSixTargetSurfaces)
assert('Portuguese A1 Practical 6 trophies live in productive target text', portuguesePathSixBrightVariants.every((variant) => {
  if (!variant) return false
  const trophy = normalizeGuidedAnswer(variant.trophyWord.word)
  return [variant.corePhrase.targetText, variant.build.targetText, variant.typeRecall.answer, variant.speakTarget.targetPhrase, variant.trophyWord.example]
    .some((text) => normalizeGuidedAnswer(text).includes(trophy))
}), portuguesePathSixTrophies)
const portugueseP6HealthOverreachMarkers = ['dose', 'dosagem', 'tome dois', 'diagnóstico', 'tratamento', 'emergência', 'pronto-socorro']
assert('Portuguese A1 Practical 6 avoids dosage, diagnosis, treatment, and emergency copy', portuguesePathSixTargetSurfaces.every((text) => !portugueseP6HealthOverreachMarkers.some((marker) => normalizeGuidedAnswer(text).includes(normalizeGuidedAnswer(marker)))), portuguesePathSixTargetSurfaces)
const portugueseP6LessonTenObrigadoItem = portuguesePathSixBrightVariants[9]?.lessonItems.find((item) => item.id === 'obrigado')
assert('Portuguese A1 Practical 6 accepts obrigado and obrigada speaker-gender variants', ['obrigado', 'obrigada'].every((answer) => portugueseP6LessonTenObrigadoItem?.acceptedAnswers?.includes(answer)), portugueseP6LessonTenObrigadoItem)
const portuguesePathSevenBrightVariants = portuguesePathSevenLessons.map((lesson) => lesson.vibeVariants.bright)
const expectedPortuguesePathSevenTrophies = ['bilhete', 'plataforma', 'sai', 'este', 'preciso', 'vamos', 'parar', 'estação', 'tempo', 'cheguei']
const priorPortugueseThroughP6Trophies = new Set([
  ...priorPortugueseThroughP5Trophies,
  ...expectedPortuguesePathSixTrophies,
])
const portuguesePathSevenTrophies = portuguesePathSevenBrightVariants
  .map((variant) => variant?.trophyWord.word ?? '')
  .map((word) => normalizeGuidedAnswer(word))
assert('Portuguese A1 Practical 7 trophy order is locked', JSON.stringify(portuguesePathSevenTrophies) === JSON.stringify(expectedPortuguesePathSevenTrophies), portuguesePathSevenTrophies)
assert('Portuguese A1 Practical 7 trophies avoid prior Portuguese trophies', portuguesePathSevenTrophies.every((word) => !priorPortugueseThroughP6Trophies.has(word)), portuguesePathSevenTrophies)
assert('Portuguese A1 Practical 7 uses pt-BR in every speak target', portuguesePathSevenBrightVariants.every((variant) => variant?.speakTarget.language === 'pt-BR'), portuguesePathSevenBrightVariants.map((variant) => variant?.speakTarget.language))
const portuguesePathSevenTargetSurfaces = portuguesePathSevenBrightVariants.flatMap((variant) => [
  variant?.corePhrase.targetText,
  variant?.build.targetText,
  variant?.typeRecall.before,
  variant?.typeRecall.answer,
  variant?.typeRecall.after,
  variant?.speakTarget.targetPhrase,
  variant?.trophyWord.example,
  ...(variant?.chunks.map((chunk) => chunk.targetText) ?? []),
  ...(variant?.lessonItems.map((item) => item.targetText) ?? []),
].filter((text): text is string => typeof text === 'string'))
assert('Portuguese A1 Practical 7 has no Spanish inverted punctuation', portuguesePathSevenTargetSurfaces.every((text) => !/[¿¡]/.test(text)), portuguesePathSevenTargetSurfaces)
assert('Portuguese A1 Practical 7 has no default tu forms', portuguesePathSevenTargetSurfaces.every((text) => !/\btu\b/i.test(text) && !/\bestás\b/i.test(text) && !/\bfalas\b/i.test(text)), portuguesePathSevenTargetSurfaces)
assert('Portuguese A1 Practical 7 avoids European Portuguese transit leakage', portuguesePathSevenTargetSurfaces.every((text) => !/\bcomboio\b/i.test(text) && !/\bautocarro\b/i.test(text)), portuguesePathSevenTargetSurfaces)
assert('Portuguese A1 Practical 7 trophies live in productive target text', portuguesePathSevenBrightVariants.every((variant) => {
  if (!variant) return false
  const trophy = normalizeGuidedAnswer(variant.trophyWord.word)
  return [variant.corePhrase.targetText, variant.build.targetText, variant.typeRecall.answer, variant.speakTarget.targetPhrase, variant.trophyWord.example]
    .some((text) => normalizeGuidedAnswer(text).includes(trophy))
}), portuguesePathSevenTrophies)
const portugueseP7LessonTwoDoOnibusItem = portuguesePathSevenBrightVariants[1]?.lessonItems.find((item) => item.id === 'do-onibus')
const portugueseP7LessonFourEsteEItem = portuguesePathSevenBrightVariants[3]?.lessonItems.find((item) => item.id === 'este-e')
const portugueseP7LessonEightEstacaoItem = portuguesePathSevenBrightVariants[7]?.lessonItems.find((item) => item.id === 'estacao')
assert('Portuguese A1 Practical 7 accepts diacritic omissions for ônibus contraction', ['do onibus'].every((answer) => portugueseP7LessonTwoDoOnibusItem?.acceptedAnswers?.includes(answer)), portugueseP7LessonTwoDoOnibusItem)
assert('Portuguese A1 Practical 7 accepts partial diacritic variant for este é', ['este e'].every((answer) => portugueseP7LessonFourEsteEItem?.acceptedAnswers?.includes(answer)), portugueseP7LessonFourEsteEItem)
assert('Portuguese A1 Practical 7 accepts nasal diacritic omission for estação', ['estacao'].every((answer) => portugueseP7LessonEightEstacaoItem?.acceptedAnswers?.includes(answer)), portugueseP7LessonEightEstacaoItem)
const portuguesePathEightBrightVariants = portuguesePathEightLessons.map((lesson) => lesson.vibeVariants.bright)
const expectedPortuguesePathEightTrophies = ['hotel', 'quarto', 'andar', 'chave', 'wi-fi', 'banheiro', 'toalha', 'dormir', 'manhã', 'check-out']
const priorPortugueseThroughP7Trophies = new Set([
  ...priorPortugueseThroughP6Trophies,
  ...expectedPortuguesePathSevenTrophies,
])
const portuguesePathEightTrophies = portuguesePathEightBrightVariants
  .map((variant) => variant?.trophyWord.word ?? '')
  .map((word) => normalizeGuidedAnswer(word))
assert('Portuguese A1 Practical 8 trophy order is locked', JSON.stringify(portuguesePathEightTrophies) === JSON.stringify(expectedPortuguesePathEightTrophies), portuguesePathEightTrophies)
assert('Portuguese A1 Practical 8 trophies avoid prior Portuguese trophies', portuguesePathEightTrophies.every((word) => !priorPortugueseThroughP7Trophies.has(word)), portuguesePathEightTrophies)
assert('Portuguese A1 Practical 8 uses pt-BR in every speak target', portuguesePathEightBrightVariants.every((variant) => variant?.speakTarget.language === 'pt-BR'), portuguesePathEightBrightVariants.map((variant) => variant?.speakTarget.language))
const portuguesePathEightTargetSurfaces = portuguesePathEightBrightVariants.flatMap((variant) => [
  variant?.corePhrase.targetText,
  variant?.build.targetText,
  variant?.typeRecall.before,
  variant?.typeRecall.answer,
  variant?.typeRecall.after,
  variant?.speakTarget.targetPhrase,
  variant?.trophyWord.example,
  ...(variant?.chunks.map((chunk) => chunk.targetText) ?? []),
  ...(variant?.lessonItems.map((item) => item.targetText) ?? []),
].filter((text): text is string => typeof text === 'string'))
assert('Portuguese A1 Practical 8 has no Spanish inverted punctuation', portuguesePathEightTargetSurfaces.every((text) => !/[¿¡]/.test(text)), portuguesePathEightTargetSurfaces)
assert('Portuguese A1 Practical 8 has no default tu forms', portuguesePathEightTargetSurfaces.every((text) => !/\btu\b/i.test(text) && !/\bestás\b/i.test(text) && !/\bfalas\b/i.test(text)), portuguesePathEightTargetSurfaces)
assert('Portuguese A1 Practical 8 avoids European Portuguese hotel leakage', portuguesePathEightTargetSurfaces.every((text) => !/\bpequeno-almoço\b/i.test(text) && !/\bcasa de banho\b/i.test(text)), portuguesePathEightTargetSurfaces)
assert('Portuguese A1 Practical 8 trophies live in productive target text', portuguesePathEightBrightVariants.every((variant) => {
  if (!variant) return false
  const trophy = normalizeGuidedAnswer(variant.trophyWord.word)
  return [variant.corePhrase.targetText, variant.build.targetText, variant.typeRecall.answer, variant.speakTarget.targetPhrase, variant.trophyWord.example]
    .some((text) => normalizeGuidedAnswer(text).includes(trophy))
}), portuguesePathEightTrophies)
const portugueseP8LessonFiveWifiItem = portuguesePathEightBrightVariants[4]?.lessonItems.find((item) => item.id === 'wifi')
const portugueseP8LessonNineManhaItem = portuguesePathEightBrightVariants[8]?.lessonItems.find((item) => item.id === 'manha')
const portugueseP8LessonTenCheckoutItem = portuguesePathEightBrightVariants[9]?.lessonItems.find((item) => item.id === 'check-out')
assert('Portuguese A1 Practical 8 accepts Wi-Fi spelling variants', ['wi-fi', 'wifi'].every((answer) => portugueseP8LessonFiveWifiItem?.acceptedAnswers?.includes(answer)), portugueseP8LessonFiveWifiItem)
assert('Portuguese A1 Practical 8 accepts nasal diacritic omission for manhã', ['manha'].every((answer) => portugueseP8LessonNineManhaItem?.acceptedAnswers?.includes(answer)), portugueseP8LessonNineManhaItem)
assert('Portuguese A1 Practical 8 accepts checkout spelling variant', ['checkout'].every((answer) => portugueseP8LessonTenCheckoutItem?.acceptedAnswers?.includes(answer)), portugueseP8LessonTenCheckoutItem)
const portuguesePathNineBrightVariants = portuguesePathNineLessons.map((lesson) => lesson.vibeVariants.bright)
const expectedPortuguesePathNineTrophies = ['oi', 'livre', 'depois', 'horário', 'mesmo', 'fora', 'chegar', 'mudar', 'gente', 'boa']
const priorPortugueseThroughP8Trophies = new Set([
  ...priorPortugueseThroughP7Trophies,
  ...expectedPortuguesePathEightTrophies,
])
const portuguesePathNineTrophies = portuguesePathNineBrightVariants
  .map((variant) => variant?.trophyWord.word ?? '')
  .map((word) => normalizeGuidedAnswer(word))
assert('Portuguese A1 Practical 9 trophy order is locked', JSON.stringify(portuguesePathNineTrophies) === JSON.stringify(expectedPortuguesePathNineTrophies), portuguesePathNineTrophies)
assert('Portuguese A1 Practical 9 trophies avoid prior Portuguese trophies', portuguesePathNineTrophies.every((word) => !priorPortugueseThroughP8Trophies.has(word)), portuguesePathNineTrophies)
assert('Portuguese A1 Practical 9 uses pt-BR in every speak target', portuguesePathNineBrightVariants.every((variant) => variant?.speakTarget.language === 'pt-BR'), portuguesePathNineBrightVariants.map((variant) => variant?.speakTarget.language))
const portuguesePathNineTargetSurfaces = portuguesePathNineBrightVariants.flatMap((variant) => [
  variant?.corePhrase.targetText,
  variant?.build.targetText,
  variant?.typeRecall.before,
  variant?.typeRecall.answer,
  variant?.typeRecall.after,
  variant?.speakTarget.targetPhrase,
  variant?.trophyWord.example,
  ...(variant?.chunks.map((chunk) => chunk.targetText) ?? []),
  ...(variant?.lessonItems.map((item) => item.targetText) ?? []),
].filter((text): text is string => typeof text === 'string'))
assert('Portuguese A1 Practical 9 has no Spanish inverted punctuation', portuguesePathNineTargetSurfaces.every((text) => !/[¿¡]/.test(text)), portuguesePathNineTargetSurfaces)
assert('Portuguese A1 Practical 9 has no default tu forms', portuguesePathNineTargetSurfaces.every((text) => !/\btu\b/i.test(text) && !/\bestás\b/i.test(text) && !/\bfalas\b/i.test(text)), portuguesePathNineTargetSurfaces)
assert('Portuguese A1 Practical 9 avoids Spanish social-planning leakage', portuguesePathNineTargetSurfaces.every((text) => !/\bhola\b/i.test(text) && !/\bluego\b/i.test(text) && !/\bcambiar\b/i.test(text) && !/\bhasta\b/i.test(text)), portuguesePathNineTargetSurfaces)
assert('Portuguese A1 Practical 9 trophies live in productive target text', portuguesePathNineBrightVariants.every((variant) => {
  if (!variant) return false
  const trophy = normalizeGuidedAnswer(variant.trophyWord.word)
  return [variant.corePhrase.targetText, variant.build.targetText, variant.typeRecall.answer, variant.speakTarget.targetPhrase, variant.trophyWord.example]
    .some((text) => normalizeGuidedAnswer(text).includes(trophy))
}), portuguesePathNineTrophies)
const portugueseP9LessonTwoVoceEstaItem = portuguesePathNineBrightVariants[1]?.lessonItems.find((item) => item.id === 'voce-esta')
const portugueseP9LessonFourHorarioItem = portuguesePathNineBrightVariants[3]?.lessonItems.find((item) => item.id === 'horario')
const portugueseP9LessonNineSeVeItem = portuguesePathNineBrightVariants[8]?.lessonItems.find((item) => item.id === 'se-ve')
const portugueseP9LessonTenAteAmanhaItem = portuguesePathNineBrightVariants[9]?.lessonItems.find((item) => item.id === 'ate-amanha')
assert('Portuguese A1 Practical 9 accepts diacritic omissions for você está', ['voce esta', 'voce está', 'você esta'].every((answer) => portugueseP9LessonTwoVoceEstaItem?.acceptedAnswers?.includes(answer)), portugueseP9LessonTwoVoceEstaItem)
assert('Portuguese A1 Practical 9 accepts diacritic omission for horário', ['horario'].every((answer) => portugueseP9LessonFourHorarioItem?.acceptedAnswers?.includes(answer)), portugueseP9LessonFourHorarioItem)
assert('Portuguese A1 Practical 9 accepts diacritic omission for se vê', ['se ve'].every((answer) => portugueseP9LessonNineSeVeItem?.acceptedAnswers?.includes(answer)), portugueseP9LessonNineSeVeItem)
assert('Portuguese A1 Practical 9 accepts partial diacritic variants for até amanhã', ['ate amanha', 'até amanha', 'ate amanhã'].every((answer) => portugueseP9LessonTenAteAmanhaItem?.acceptedAnswers?.includes(answer)), portugueseP9LessonTenAteAmanhaItem)
const portuguesePathTenBrightVariants = portuguesePathTenLessons.map((lesson) => lesson.vibeVariants.bright)
const expectedPortuguesePathTenTrophies = ['dia', 'lugar', 'pela', 'aprendi', 'cansado', 'ir', 'vez', 'funciona', 'durma', 'logo']
const priorPortugueseThroughP9Trophies = new Set([
  ...priorPortugueseThroughP8Trophies,
  ...expectedPortuguesePathNineTrophies,
])
const portuguesePathTenTrophies = portuguesePathTenBrightVariants
  .map((variant) => variant?.trophyWord.word ?? '')
  .map((word) => normalizeGuidedAnswer(word))
assert('Portuguese A1 Practical 10 resolves 10 lessons', portuguesePathTenLessons.length === 10, portuguesePathTenLessons.length)
assert('Portuguese A1 Practical 10 trophy order is locked', JSON.stringify(portuguesePathTenTrophies) === JSON.stringify(expectedPortuguesePathTenTrophies), portuguesePathTenTrophies)
assert('Portuguese A1 Practical 10 trophies avoid prior Portuguese trophies', portuguesePathTenTrophies.every((word) => !priorPortugueseThroughP9Trophies.has(word)), portuguesePathTenTrophies)
assert('Portuguese A1 Practical 10 uses pt-BR in every speak target', portuguesePathTenBrightVariants.every((variant) => variant?.speakTarget.language === 'pt-BR'), portuguesePathTenBrightVariants.map((variant) => variant?.speakTarget.language))
const portuguesePathTenTargetSurfaces = portuguesePathTenBrightVariants.flatMap((variant) => [
  variant?.corePhrase.targetText,
  variant?.build.targetText,
  variant?.typeRecall.before,
  variant?.typeRecall.answer,
  variant?.typeRecall.after,
  variant?.speakTarget.targetPhrase,
  variant?.trophyWord.example,
  ...(variant?.chunks.map((chunk) => chunk.targetText) ?? []),
  ...(variant?.lessonItems.map((item) => item.targetText) ?? []),
].filter((text): text is string => typeof text === 'string'))
assert('Portuguese A1 Practical 10 has no Spanish inverted punctuation', portuguesePathTenTargetSurfaces.every((text) => !/[¿¡]/.test(text)), portuguesePathTenTargetSurfaces)
assert('Portuguese A1 Practical 10 has no default tu forms', portuguesePathTenTargetSurfaces.every((text) => !/\btu\b/i.test(text) && !/\bestás\b/i.test(text) && !/\bfalas\b/i.test(text)), portuguesePathTenTargetSurfaces)
assert('Portuguese A1 Practical 10 avoids Spanish/Italian/French goodbye leakage', portuguesePathTenTargetSurfaces.every((text) => !/\bhola\b/i.test(text) && !/\bgracias\b/i.test(text) && !/\badios\b/i.test(text) && !/\badiós\b/i.test(text) && !/\bciao\b/i.test(text) && !/\bbonjour\b/i.test(text) && !/\bmerci\b/i.test(text)), portuguesePathTenTargetSurfaces)
assert('Portuguese A1 Practical 10 trophies live in productive target text', portuguesePathTenBrightVariants.every((variant) => {
  if (!variant) return false
  const trophy = normalizeGuidedAnswer(variant.trophyWord.word)
  return [variant.corePhrase.targetText, variant.build.targetText, variant.typeRecall.answer, variant.speakTarget.targetPhrase, variant.trophyWord.example]
    .some((text) => normalizeGuidedAnswer(text).includes(trophy))
}), portuguesePathTenTrophies)
const portugueseP10LessonThreeObrigadoItem = portuguesePathTenBrightVariants[2]?.lessonItems.find((item) => item.id === 'obrigado-pela')
const portugueseP10LessonFiveCansadoItem = portuguesePathTenBrightVariants[4]?.lessonItems.find((item) => item.id === 'cansado')
const portugueseP10LessonSevenAteProximaVezItem = portuguesePathTenBrightVariants[6]?.lessonItems.find((item) => item.id === 'ate-a-proxima-vez')
const portugueseP10LessonEightAmanhaFuncionaItem = portuguesePathTenBrightVariants[7]?.lessonItems.find((item) => item.id === 'amanha-funciona')
const portugueseP10LessonTenAteLogoItem = portuguesePathTenBrightVariants[9]?.lessonItems.find((item) => item.id === 'ate-logo')
const portugueseP10LessonThreeSpeak = portuguesePathTenBrightVariants[2]?.speakTarget
const portugueseP10LessonFiveSpeak = portuguesePathTenBrightVariants[4]?.speakTarget
assert('Portuguese A1 Practical 10 accepts obrigado/obrigada speaker-gender variants', ['obrigado pela ajuda', 'obrigada pela ajuda'].every((answer) => portugueseP10LessonThreeObrigadoItem?.acceptedAnswers?.includes(answer)), portugueseP10LessonThreeObrigadoItem)
assert('Portuguese A1 Practical 10 accepts cansado/cansada speaker-gender variants', ['cansado', 'cansada'].every((answer) => portugueseP10LessonFiveCansadoItem?.acceptedAnswers?.includes(answer)), portugueseP10LessonFiveCansadoItem)
assert('Portuguese A1 Practical 10 speech accepts feminine obrigada variant', portugueseP10LessonThreeSpeak ? checkGuidedSpeechAnswer({
  transcript: 'Obrigada pela ajuda.',
  targetAnswer: portugueseP10LessonThreeSpeak.targetPhrase,
  acceptedAnswers: portugueseP10LessonThreeSpeak.acceptedAnswers,
  requiredTokens: portugueseP10LessonThreeSpeak.requiredTokens,
  optionalTokens: portugueseP10LessonThreeSpeak.optionalTokens,
}).status === 'correct' : false, portugueseP10LessonThreeSpeak)
assert('Portuguese A1 Practical 10 speech accepts feminine cansada variant', portugueseP10LessonFiveSpeak ? checkGuidedSpeechAnswer({
  transcript: 'Estou cansada agora.',
  targetAnswer: portugueseP10LessonFiveSpeak.targetPhrase,
  acceptedAnswers: portugueseP10LessonFiveSpeak.acceptedAnswers,
  requiredTokens: portugueseP10LessonFiveSpeak.requiredTokens,
  optionalTokens: portugueseP10LessonFiveSpeak.optionalTokens,
}).status === 'correct' : false, portugueseP10LessonFiveSpeak)
assert('Portuguese A1 Practical 10 accepts diacritic variants for até a próxima vez', ['ate a proxima vez', 'até a proxima vez', 'ate a próxima vez'].every((answer) => portugueseP10LessonSevenAteProximaVezItem?.acceptedAnswers?.includes(answer)), portugueseP10LessonSevenAteProximaVezItem)
assert('Portuguese A1 Practical 10 accepts nasal diacritic omission for amanhã funciona', ['amanha funciona'].every((answer) => portugueseP10LessonEightAmanhaFuncionaItem?.acceptedAnswers?.includes(answer)), portugueseP10LessonEightAmanhaFuncionaItem)
assert('Portuguese A1 Practical 10 accepts diacritic omission for até logo', ['ate logo'].every((answer) => portugueseP10LessonTenAteLogoItem?.acceptedAnswers?.includes(answer)), portugueseP10LessonTenAteLogoItem)
assert('A1 Practical 1 Bright phrase baseline matches PR4 product corrections', JSON.stringify(pathLessons.map((lesson) => lesson.vibeVariants.bright?.corePhrase.targetText ?? '')) === JSON.stringify(expectedBrightPathOnePhrases), pathLessons.map((lesson) => lesson.vibeVariants.bright?.corePhrase.targetText ?? ''))

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

for (const lesson of pathFourLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-4-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathFourId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathFourTitles[lesson.lessonNumber - 1], lesson.title)
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

for (const lesson of pathFiveLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-5-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathFiveId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathFiveTitles[lesson.lessonNumber - 1], lesson.title)
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

for (const lesson of pathSixLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-6-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathSixId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathSixTitles[lesson.lessonNumber - 1], lesson.title)
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

for (const lesson of pathSevenLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-7-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathSevenId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathSevenTitles[lesson.lessonNumber - 1], lesson.title)
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

for (const lesson of pathEightLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-8-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathEightId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathEightTitles[lesson.lessonNumber - 1], lesson.title)
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

for (const lesson of pathNineLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-9-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathNineId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathNineTitles[lesson.lessonNumber - 1], lesson.title)
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

for (const lesson of pathTenLessons) {
  assert(`${lesson.id} has invariant id`, lesson.id.startsWith('english-a1-practical-10-'), lesson)
  assert(`${lesson.id} has invariant path id`, lesson.pathId === pathTenId, lesson)
  assert(`${lesson.id} has invariant lesson number`, lesson.lessonNumber >= 1 && lesson.lessonNumber <= 10, lesson)
  assert(`${lesson.id} has invariant title`, lesson.title === expectedPathTenTitles[lesson.lessonNumber - 1], lesson.title)
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
for (const lessonDefinition of [...pathLessons, ...pathTwoLessons, ...pathThreeLessons, ...pathFourLessons, ...pathFiveLessons, ...pathSixLessons, ...pathSevenLessons, ...pathEightLessons, ...pathNineLessons, ...pathTenLessons]) {
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
  for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
    const lesson = resolveGuidedLessonVariant(firstDefinition, vibeId)
    assert(
      `lesson 1 ${vibeId} displays the core speak expectation`,
      lesson.speak.displayAnswer === 'Do you speak English?',
      lesson.speak,
    )
    assert(
      `lesson 1 ${vibeId} still accepts greeting variants`,
      ['Do you speak English?', 'Hi, do you speak English?', 'Hello, do you speak English?', 'Hi there, do you speak English?']
        .every((answer) => [
          lesson.speak.targetPhrase,
          ...(lesson.speak.acceptedAnswers ?? []),
        ].some((acceptedAnswer) => normalizeGuidedAnswer(acceptedAnswer) === normalizeGuidedAnswer(answer))),
      lesson.speak,
    )
  }
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

console.log('\n[A1 Practical 4 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathFourLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 4 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathFourLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 4 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
  assert(`A1 Practical 4 ${vibeId} uses no opener family more than three times`, Math.max(...countValues(openerFamilies).values()) <= 3, openerFamilies)
}
const wistfulSorryCount = pathFourLessons
  .filter((lessonDefinition) => normalizeGuidedAnswer(lessonDefinition.vibeVariants.wistful?.corePhrase.targetText ?? '').startsWith('sorry'))
  .length
assert('A1 Practical 4 Wistful uses Sorry in no more than two lessons', wistfulSorryCount <= 2, wistfulSorryCount)
const brightIdLoveCount = pathFourLessons
  .filter((lessonDefinition) => normalizeGuidedAnswer(lessonDefinition.vibeVariants.bright?.corePhrase.targetText ?? '').startsWith("i'd love"))
  .length
assert("A1 Practical 4 Bright uses I'd love in no more than three lessons", brightIdLoveCount <= 3, brightIdLoveCount)
const sharpPleaseCount = pathFourLessons
  .filter((lessonDefinition) => normalizeGuidedAnswer(lessonDefinition.vibeVariants.sharp?.corePhrase.targetText ?? '').startsWith('please'))
  .length
assert('A1 Practical 4 Sharp uses Please in no more than four lessons', sharpPleaseCount <= 4, sharpPleaseCount)

console.log('\n[A1 Practical 5 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathFiveLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 5 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathFiveLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 5 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
  assert(`A1 Practical 5 ${vibeId} uses no opener family more than three times`, Math.max(...countValues(openerFamilies).values()) <= 3, openerFamilies)
}
const pathFiveWistfulSorryCount = pathFiveLessons
  .filter((lessonDefinition) => normalizeGuidedAnswer(lessonDefinition.vibeVariants.wistful?.corePhrase.targetText ?? '').startsWith('sorry'))
  .length
assert('A1 Practical 5 Wistful uses Sorry in no more than two lessons', pathFiveWistfulSorryCount <= 2, pathFiveWistfulSorryCount)
const pathFiveBrightIdLoveCount = pathFiveLessons
  .filter((lessonDefinition) => normalizeGuidedAnswer(lessonDefinition.vibeVariants.bright?.corePhrase.targetText ?? '').startsWith("i'd love"))
  .length
assert("A1 Practical 5 Bright uses I'd love in no more than three lessons", pathFiveBrightIdLoveCount <= 3, pathFiveBrightIdLoveCount)
const pathFiveSharpPleaseCount = pathFiveLessons
  .filter((lessonDefinition) => normalizeGuidedAnswer(lessonDefinition.vibeVariants.sharp?.corePhrase.targetText ?? '').startsWith('please'))
  .length
assert('A1 Practical 5 Sharp uses Please in no more than four lessons', pathFiveSharpPleaseCount <= 4, pathFiveSharpPleaseCount)

console.log('\n[A1 Practical 6 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathSixLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 6 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathSixLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 6 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
  assert(`A1 Practical 6 ${vibeId} uses no opener family more than three times`, Math.max(...countValues(openerFamilies).values()) <= 3, openerFamilies)
}
const pathSixMedicalClaimMarkers = [
  'diagnose',
  'dosage',
  'dose',
  'take two',
  'cure',
  'treatment',
  'you should take',
  'emergency room',
]
assert(
  'A1 Practical 6 avoids diagnosis, dosage, treatment, and emergency overreach copy',
  !containsAny(JSON.stringify(pathSixLessons).toLowerCase(), pathSixMedicalClaimMarkers),
  pathSixMedicalClaimMarkers.filter((marker) => JSON.stringify(pathSixLessons).toLowerCase().includes(marker)),
)

console.log('\n[A1 Practical 7 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathSevenLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 7 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathSevenLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 7 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
  assert(`A1 Practical 7 ${vibeId} uses no opener family more than three times`, Math.max(...countValues(openerFamilies).values()) <= 3, openerFamilies)
}
const pathSevenComplexTravelMarkers = [
  'itinerary',
  'connection',
  'platform change',
  'reservation number',
  'layover',
  'transfer desk',
  'departure board',
]
assert(
  'A1 Practical 7 avoids itinerary-planning complexity copy',
  !containsAny(JSON.stringify(pathSevenLessons).toLowerCase(), pathSevenComplexTravelMarkers),
  pathSevenComplexTravelMarkers.filter((marker) => JSON.stringify(pathSevenLessons).toLowerCase().includes(marker)),
)

console.log('\n[A1 Practical 8 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathEightLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 8 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathEightLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 8 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
  assert(`A1 Practical 8 ${vibeId} uses no opener family more than three times`, Math.max(...countValues(openerFamilies).values()) <= 3, openerFamilies)
}
const pathEightHotelComplexityMarkers = [
  'billing dispute',
  'refund',
  'chargeback',
  'complaint',
  'manager',
  'compensation',
  'invoice problem',
  'room upgrade',
]
assert(
  'A1 Practical 8 avoids advanced complaint, billing, and dispute copy',
  !containsAny(JSON.stringify(pathEightLessons).toLowerCase(), pathEightHotelComplexityMarkers),
  pathEightHotelComplexityMarkers.filter((marker) => JSON.stringify(pathEightLessons).toLowerCase().includes(marker)),
)

console.log('\n[A1 Practical 9 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathNineLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 9 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathNineLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 9 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
  assert(`A1 Practical 9 ${vibeId} uses no opener family more than three times`, Math.max(...countValues(openerFamilies).values()) <= 3, openerFamilies)
}
const pathNineDatingOrComplexityMarkers = [
  'dating',
  'romantic',
  'boyfriend',
  'girlfriend',
  'flirt',
  'love',
  'crush',
  'kiss',
  'calendar invite',
  'reschedule the appointment',
]
assert(
  'A1 Practical 9 avoids dating framing and complex scheduling copy',
  !containsAny(JSON.stringify(pathNineLessons).toLowerCase(), pathNineDatingOrComplexityMarkers),
  pathNineDatingOrComplexityMarkers.filter((marker) => JSON.stringify(pathNineLessons).toLowerCase().includes(marker)),
)

console.log('\n[A1 Practical 10 content polish]')
for (const vibeId of ACTIVE_GUIDED_VIBE_IDS) {
  const trophyWords = pathTenLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.trophyWord.word)
    .filter((word): word is string => typeof word === 'string')
    .map((word) => normalizeGuidedAnswer(word))
  assert(`A1 Practical 10 ${vibeId} trophy words are distinct`, new Set(trophyWords).size === 10, trophyWords)

  const openerFamilies = pathTenLessons
    .map((lessonDefinition) => lessonDefinition.vibeVariants[vibeId]?.corePhrase.targetText ?? '')
    .map(getOpenerFamily)
  assert(`A1 Practical 10 ${vibeId} uses at least three opener families`, new Set(openerFamilies).size >= 3, openerFamilies)
  assert(`A1 Practical 10 ${vibeId} uses no opener family more than three times`, Math.max(...countValues(openerFamilies).values()) <= 3, openerFamilies)
}
const pathTenComplexWrapUpMarkers = [
  'deep reflection',
  'emotional journey',
  'forever',
  'farewell forever',
  'heartbroken',
  'destiny',
  'soul',
  'advanced',
  'because of everything',
]
assert(
  'A1 Practical 10 avoids long, dramatic, or advanced wrap-up copy',
  !containsAny(JSON.stringify(pathTenLessons).toLowerCase(), pathTenComplexWrapUpMarkers),
  pathTenComplexWrapUpMarkers.filter((marker) => JSON.stringify(pathTenLessons).toLowerCase().includes(marker)),
)

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
    const pathFourFirstDefinition = pathFourLessons[0]
    if (pathFourFirstDefinition) {
      const pathFourBrightLesson = resolveGuidedLessonVariant(pathFourFirstDefinition, 'bright')
      const completedPathFourFirst = markTodayLessonComplete(completedPathThreeFirst, pathFourBrightLesson, minimalResult())
      assert('path progress does not mix A1 Practical 4 with earlier paths', completedPathFourFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathFourFirst.courses[pathTwoId]?.completedLessonIds.length === 1 && completedPathFourFirst.courses[pathThreeId]?.completedLessonIds.length === 1 && completedPathFourFirst.courses[pathFourId]?.completedLessonIds.length === 1, completedPathFourFirst)
      const pathFiveFirstDefinition = pathFiveLessons[0]
      if (pathFiveFirstDefinition) {
        const pathFiveBrightLesson = resolveGuidedLessonVariant(pathFiveFirstDefinition, 'bright')
        const completedPathFiveFirst = markTodayLessonComplete(completedPathFourFirst, pathFiveBrightLesson, minimalResult())
        assert('path progress does not mix A1 Practical 5 with earlier paths', completedPathFiveFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathFiveFirst.courses[pathTwoId]?.completedLessonIds.length === 1 && completedPathFiveFirst.courses[pathThreeId]?.completedLessonIds.length === 1 && completedPathFiveFirst.courses[pathFourId]?.completedLessonIds.length === 1 && completedPathFiveFirst.courses[pathFiveId]?.completedLessonIds.length === 1, completedPathFiveFirst)
        const pathSixFirstDefinition = pathSixLessons[0]
        if (pathSixFirstDefinition) {
          const pathSixBrightLesson = resolveGuidedLessonVariant(pathSixFirstDefinition, 'bright')
          const completedPathSixFirst = markTodayLessonComplete(completedPathFiveFirst, pathSixBrightLesson, minimalResult())
          assert('path progress does not mix A1 Practical 6 with earlier paths', completedPathSixFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathSixFirst.courses[pathTwoId]?.completedLessonIds.length === 1 && completedPathSixFirst.courses[pathThreeId]?.completedLessonIds.length === 1 && completedPathSixFirst.courses[pathFourId]?.completedLessonIds.length === 1 && completedPathSixFirst.courses[pathFiveId]?.completedLessonIds.length === 1 && completedPathSixFirst.courses[pathSixId]?.completedLessonIds.length === 1, completedPathSixFirst)
          const pathSevenFirstDefinition = pathSevenLessons[0]
          if (pathSevenFirstDefinition) {
            const pathSevenBrightLesson = resolveGuidedLessonVariant(pathSevenFirstDefinition, 'bright')
            const completedPathSevenFirst = markTodayLessonComplete(completedPathSixFirst, pathSevenBrightLesson, minimalResult())
            assert('path progress does not mix A1 Practical 7 with earlier paths', completedPathSevenFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathSevenFirst.courses[pathTwoId]?.completedLessonIds.length === 1 && completedPathSevenFirst.courses[pathThreeId]?.completedLessonIds.length === 1 && completedPathSevenFirst.courses[pathFourId]?.completedLessonIds.length === 1 && completedPathSevenFirst.courses[pathFiveId]?.completedLessonIds.length === 1 && completedPathSevenFirst.courses[pathSixId]?.completedLessonIds.length === 1 && completedPathSevenFirst.courses[pathSevenId]?.completedLessonIds.length === 1, completedPathSevenFirst)
            const pathEightFirstDefinition = pathEightLessons[0]
            if (pathEightFirstDefinition) {
              const pathEightBrightLesson = resolveGuidedLessonVariant(pathEightFirstDefinition, 'bright')
              const completedPathEightFirst = markTodayLessonComplete(completedPathSevenFirst, pathEightBrightLesson, minimalResult())
              assert('path progress does not mix A1 Practical 8 with earlier paths', completedPathEightFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathEightFirst.courses[pathTwoId]?.completedLessonIds.length === 1 && completedPathEightFirst.courses[pathThreeId]?.completedLessonIds.length === 1 && completedPathEightFirst.courses[pathFourId]?.completedLessonIds.length === 1 && completedPathEightFirst.courses[pathFiveId]?.completedLessonIds.length === 1 && completedPathEightFirst.courses[pathSixId]?.completedLessonIds.length === 1 && completedPathEightFirst.courses[pathSevenId]?.completedLessonIds.length === 1 && completedPathEightFirst.courses[pathEightId]?.completedLessonIds.length === 1, completedPathEightFirst)
              const pathNineFirstDefinition = pathNineLessons[0]
              if (pathNineFirstDefinition) {
                const pathNineBrightLesson = resolveGuidedLessonVariant(pathNineFirstDefinition, 'bright')
                const completedPathNineFirst = markTodayLessonComplete(completedPathEightFirst, pathNineBrightLesson, minimalResult())
                assert('path progress does not mix A1 Practical 9 with earlier paths', completedPathNineFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathNineFirst.courses[pathTwoId]?.completedLessonIds.length === 1 && completedPathNineFirst.courses[pathThreeId]?.completedLessonIds.length === 1 && completedPathNineFirst.courses[pathFourId]?.completedLessonIds.length === 1 && completedPathNineFirst.courses[pathFiveId]?.completedLessonIds.length === 1 && completedPathNineFirst.courses[pathSixId]?.completedLessonIds.length === 1 && completedPathNineFirst.courses[pathSevenId]?.completedLessonIds.length === 1 && completedPathNineFirst.courses[pathEightId]?.completedLessonIds.length === 1 && completedPathNineFirst.courses[pathNineId]?.completedLessonIds.length === 1, completedPathNineFirst)
                const pathTenFirstDefinition = pathTenLessons[0]
                if (pathTenFirstDefinition) {
                  const pathTenBrightLesson = resolveGuidedLessonVariant(pathTenFirstDefinition, 'bright')
                  const completedPathTenFirst = markTodayLessonComplete(completedPathNineFirst, pathTenBrightLesson, minimalResult())
                  assert('path progress does not mix A1 Practical 10 with earlier paths', completedPathTenFirst.courses[pathOneId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathTwoId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathThreeId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathFourId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathFiveId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathSixId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathSevenId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathEightId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathNineId]?.completedLessonIds.length === 1 && completedPathTenFirst.courses[pathTenId]?.completedLessonIds.length === 1, completedPathTenFirst)
                }
              }
            }
          }
        }
      }
    }
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
  const expectedLocales = GUIDED_TARGET_LANGUAGE_SPEAK_LOCALES[lesson.targetLanguage]
  assert(`${lesson.id}/${vibeId} speak language matches path targetLanguage (${lesson.targetLanguage})`, expectedLocales.includes(variant.speakTarget.language), { observed: variant.speakTarget.language, expected: expectedLocales })
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

function countValues(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
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
  const germanSignals = Array.from(new Set([
    'sie',
    'ich',
    'du',
    'wir',
    'uns',
    'mir',
    'dir',
    'mich',
    'dich',
    'sich',
    'ihn',
    'ihm',
    'der',
    'die',
    'das',
    'dem',
    'den',
    'ein',
    'eine',
    'einer',
    'einen',
    'im',
    'am',
    'vom',
    'zum',
    'zur',
    'beim',
    'ans',
    'ins',
    'mein',
    'meine',
    'dein',
    'deine',
    'sein',
    'seine',
    'unser',
    'unsere',
    'ist',
    'sind',
    'war',
    'waren',
    'hat',
    'haben',
    'hatte',
    'kann',
    'soll',
    'muss',
    'möchte',
    'würde',
    'wäre',
    'hätte',
    'geht',
    'geh',
    'gehe',
    'machen',
    'lass',
    'lasst',
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
    'heute',
    'entschuldigung',
    'ja',
    'nein',
    'oder',
    'weil',
    'dass',
    'wenn',
    'aber',
    'doch',
    'schon',
    'noch',
    'etwas',
    'alles',
    'sehr',
    'gerne',
    'vielleicht',
    'jetzt',
    'mit',
    'ohne',
    'für',
    'von',
    'zu',
    'nach',
    'bei',
    'auf',
    'in',
    'tisch',
    'tee',
    'zucker',
    'frisch',
    'rechnung',
  ]))
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
  const hasGermanDiacritic = /[äöüßÄÖÜ]/.test(value)
  const hasGermanSignal = germanSignals.some((signal) => {
    const escapedSignal = signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^\\p{L}])${escapedSignal}(?=$|[^\\p{L}])`, 'iu').test(value)
  })
  return (hasGermanDiacritic || hasGermanSignal)
    && !englishLeakage.some((signal) => normalized.includes(signal))
}

function getOpenerFamily(value: string) {
  return normalizeGuidedAnswer(value)
    .replace(/[,.:;!?].*$/, '')
    .split(' ')
    .slice(0, 4)
    .join(' ')
}
