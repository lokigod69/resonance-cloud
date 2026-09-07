import assert from 'node:assert/strict'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring.ts'
import { collectGuidedBaseFields } from '../src/lib/guidedBaseFields.ts'
import {
  buildGuidedLearnedTermSet,
  getGuidedProtectedSpanIssues,
  getGuidedPlaceholderIssues,
  getGuidedTranslationQualityIssues,
  normalizeGuidedLearnedTerm,
  protectGuidedLearnedSpans,
  restoreGuidedLearnedSpans,
} from '../src/lib/guidedTranslationQuality.ts'

let checks = 0
const check = (condition: unknown, message: string) => {
  assert.ok(condition, message)
  checks++
}

const germanLessons = GUIDED_LESSONS.filter((lesson) => lesson.targetLanguage === 'German')
const germanTerms = buildGuidedLearnedTermSet(germanLessons)
for (const expected of [
  'Na, was machst du denn hier draußen? Ist alles okay?',
  'Perfekt',
  'verloren',
  'Ich habe meinen Schlüssel verloren.',
  'gerufen',
]) {
  check(germanTerms.has(normalizeGuidedLearnedTerm(expected)), `missing authored German term: ${expected}`)
}

const structuralTerms = buildGuidedLearnedTermSet([{
  targetText: 'target text only',
  build: { chips: ['build chip only'] },
  trophyWord: { word: 'trophy word only', example: 'trophy example only' },
  pattern: { label: 'pattern label only', examples: [{ highlight: 'highlight only' }] },
  speakTarget: { targetPhrase: 'target phrase only', displayAnswer: 'display answer only', targetAnswer: 'target answer only' },
  typeRecall: { before: 'before only', answer: 'answer only', after: 'after only', fallbackChoices: ['fallback only'] },
  cloze: { segments: [{ type: 'blank', answer: 'cloze answer only', cue: 'cloze cue only', choices: ['cloze choice only'] }] },
}])
for (const expected of [
  'target text only', 'build chip only', 'trophy word only', 'trophy example only',
  'pattern label only', 'highlight only', 'target phrase only', 'display answer only',
  'target answer only', 'before only', 'answer only', 'after only', 'fallback only',
  'cloze answer only', 'cloze cue only', 'cloze choice only',
]) check(structuralTerms.has(expected), `target-bearing structure was not indexed: ${expected}`)

const benchmarkKeys = [
  'lessons/german-b1-practical-1-001-ich-habe-meinen-schluessel-verloren/vibeVariants/bright/sceneCaption',
  'lessons/german-b1-practical-1-002-die-s-bahn-hat-ploetzlich-angehalten/vibeVariants/bright/sceneCaption',
  'lessons/german-b1-practical-1-003-ich-bin-zu-einem-konzert-gefahren/vibeVariants/bright/sceneCaption',
]
const germanFields = collectGuidedBaseFields(germanLessons, [])
const benchmarkFields = benchmarkKeys.map((key) => {
  const field = germanFields.find((candidate) => candidate.key === key)
  assert.ok(field, `missing benchmark field ${key}`)
  return field
})
const expectedQuotes = [
  '“Na, was machst du denn hier draußen?”',
  '“Ihr Termin war um neun Uhr. Was ist denn passiert?”',
  '“Wie war dein Wochenende? Erzähl mal!”',
]

benchmarkFields.forEach((field, index) => {
  const protectedText = protectGuidedLearnedSpans({
    sourceText: field.source,
    sourceLocale: field.sourceLocale,
    targetLanguage: 'German',
    learnedTerms: germanTerms,
  })
  check(protectedText.protectedSpans.length === 1, `benchmark quote ${index + 1} was not uniquely protected`)
  check(protectedText.protectedSpans[0].original === expectedQuotes[index], `benchmark quote ${index + 1} bytes changed`)
  check(protectedText.sourceText.includes('{LW_TERM_0}'), `benchmark quote ${index + 1} placeholder missing`)
  const translated = `Contexte français ${protectedText.protectedSpans[0].placeholder}`
  check(restoreGuidedLearnedSpans(translated, protectedText.protectedSpans) === `Contexte français ${expectedQuotes[index]}`, `benchmark quote ${index + 1} restore failed`)
})

const punctuationMatch = protectGuidedLearnedSpans({
  sourceText: 'Keep “  Na — was machst du denn hier draußen?  ” exactly.',
  sourceLocale: 'en',
  targetLanguage: 'German',
  learnedTerms: germanTerms,
})
check(punctuationMatch.protectedSpans.length === 1, 'normalized punctuation and spacing did not match authored phrase')

const metaphor = protectGuidedLearnedSpans({
  sourceText: 'The prefix is put “back on” in the participle.',
  sourceLocale: 'en',
  targetLanguage: 'German',
  learnedTerms: germanTerms,
})
check(metaphor.protectedSpans.length === 0, 'source-language metaphor was incorrectly protected')

const unknownEnglish = protectGuidedLearnedSpans({
  sourceText: 'The teacher says “take your time” before the exercise.',
  sourceLocale: 'en',
  targetLanguage: 'German',
  learnedTerms: germanTerms,
})
check(unknownEnglish.protectedSpans.length === 0, 'unknown source-language quote was incorrectly protected')

const apostropheBoundary = protectGuidedLearnedSpans({
  sourceText: "You'd never hear 'tu és' as the default here.",
  sourceLocale: 'en',
  targetLanguage: 'Portuguese',
  learnedTerms: new Set([normalizeGuidedLearnedTerm('tu és')]),
})
check(apostropheBoundary.protectedSpans[0]?.original === "'tu és'", 'English apostrophe consumed a learned-language quote')

for (const fixture of [
  { targetLanguage: 'Russian', sourceText: 'The sign says Открыто сегодня.', expected: 'Открыто сегодня' },
  { targetLanguage: 'Korean', sourceText: 'The sign says 오늘 영업합니다.', expected: '오늘 영업합니다' },
  { targetLanguage: 'Japanese', sourceText: 'The sign says 今日は営業中です.', expected: '今日は営業中です' },
  { targetLanguage: 'Japanese', sourceText: 'Order メニュー and コーヒー.', expected: 'メニュー' },
]) {
  const result = protectGuidedLearnedSpans({ sourceText: fixture.sourceText, sourceLocale: 'en', targetLanguage: fixture.targetLanguage, learnedTerms: new Set() })
  const expectedCount = fixture.sourceText.includes('コーヒー') ? 2 : 1
  check(result.protectedSpans.length === expectedCount, `${fixture.targetLanguage} script span was not protected`)
  check(result.protectedSpans[0].original === fixture.expected, `${fixture.targetLanguage} script span bytes changed`)
  if (fixture.sourceText.includes('コーヒー')) check(result.protectedSpans[1].original === 'コーヒー', 'Japanese long-vowel word was split')
}

const twoSpans = protectGuidedLearnedSpans({
  sourceText: 'Compare “Perfekt” with “verloren”.',
  sourceLocale: 'en',
  targetLanguage: 'German',
  learnedTerms: germanTerms,
})
check(twoSpans.protectedSpans.length === 2, 'two authored terms were not protected')
check(getGuidedProtectedSpanIssues('{LW_TERM_1}, puis {LW_TERM_0}', twoSpans.protectedSpans, 'placeholder').length === 0, 'valid placeholder reordering was rejected')
check(getGuidedProtectedSpanIssues('{LW_TERM_0}', twoSpans.protectedSpans, 'placeholder').some((issue) => issue.includes('LW_TERM_1')), 'missing placeholder was not rejected')
check(getGuidedProtectedSpanIssues('Texte injecté {LW_TERM_9}', [], 'placeholder').includes('unexpected protected placeholder {LW_TERM_9}'), 'unexpected reserved placeholder without declared spans was not rejected')
check(getGuidedProtectedSpanIssues('Texte publié {LW_TERM_0}', [], 'restored').includes('unresolved protected placeholder {LW_TERM_0}'), 'unresolved restored placeholder was not rejected')
assert.throws(() => restoreGuidedLearnedSpans('{LW_TERM_0} {LW_TERM_0}', twoSpans.protectedSpans), /mismatch/, 'duplicate/missing placeholders must reject restoration')

const reorderedComparison = protectGuidedLearnedSpans({
  sourceText: 'Use “aller”, not “convenir” or “marcher”.',
  sourceLocale: 'en',
  targetLanguage: 'French',
  learnedTerms: buildGuidedLearnedTermSet([{ targetText: 'aller' }, { targetText: 'convenir' }, { targetText: 'marcher' }]),
})
const reorderedKorean = restoreGuidedLearnedSpans('{LW_TERM_1}가 아니라 {LW_TERM_2}도 아니고 {LW_TERM_0}를 사용하세요.', reorderedComparison.protectedSpans)
check(reorderedKorean === '“convenir”가 아니라 “marcher”도 아니고 “aller”를 사용하세요.', 'reordered learned terms did not restore their exact authored bytes')

const protectedParticle = protectGuidedLearnedSpans({ sourceText: '「を」 marks the object.', sourceLocale: 'en', targetLanguage: 'Japanese', learnedTerms: buildGuidedLearnedTermSet([{ targetText: 'を' }]) })
check(getGuidedProtectedSpanIssues('「を」は目的語を示す。', protectedParticle.protectedSpans, 'restored').length === 0, 'legitimate repeated Japanese particle was rejected after restoration')

check(getGuidedPlaceholderIssues('Hello {name} at {time}, {name}.', '{time} : bonjour {name}, {name}.').length === 0, 'reordered generic placeholder multiset was rejected')
check(getGuidedPlaceholderIssues('Hello {name}.', 'Bonjour.').includes('missing placeholder {name}'), 'missing generic placeholder was not rejected')
check(getGuidedPlaceholderIssues('Hello {name}.', 'Bonjour {name} {name}.').includes('duplicate placeholder {name}'), 'duplicate generic placeholder was not rejected')
check(getGuidedPlaceholderIssues('Hello {name}.', 'Bonjour {name} {time}.').includes('unexpected placeholder {time}'), 'unexpected generic placeholder was not rejected')

for (const [text, destinationLocale] of [['internet (intānetto)', 'es'], ['check-out (chekkuauto)', 'id']] as const) {
  check(getGuidedTranslationQualityIssues({ sourceText: text, translatedText: text, sourceLocale: 'en', destinationLocale }).length === 0, `intentional shared loanword ${text} was rejected`)
}
check(getGuidedTranslationQualityIssues({ sourceText: 'Check out the beautiful city tomorrow.', translatedText: 'Check out the beautiful city tomorrow.', sourceLocale: 'en', destinationLocale: 'es' }).includes('copied source text'), 'ordinary copied English sentence was mistaken for a shared loanword')
checks++

const protectedRussian = protectGuidedLearnedSpans({
  sourceText: 'The speaker asks “Где вокзал?” before leaving.',
  sourceLocale: 'en',
  targetLanguage: 'Russian',
  learnedTerms: new Set(),
})
const restoredRussian = restoreGuidedLearnedSpans('La personne demande {LW_TERM_0} avant de partir.', protectedRussian.protectedSpans)
check(getGuidedTranslationQualityIssues({
  sourceText: 'The speaker asks “Где вокзал?” before leaving.',
  translatedText: restoredRussian,
  sourceLocale: 'en', destinationLocale: 'fr', targetLocale: 'ru',
  protectedSpans: protectedRussian.protectedSpans, protectedSpanState: 'restored',
}).length === 0, 'valid restored target quote caused a false foreign-script failure')
check(getGuidedTranslationQualityIssues({
  sourceText: 'The speaker asks “Где вокзал?” before leaving.',
  translatedText: 'La personne demande {LW_TERM_0} avant de partir.',
  sourceLocale: 'en', destinationLocale: 'fr', targetLocale: 'ru',
  protectedSpans: protectedRussian.protectedSpans, protectedSpanState: 'placeholder',
}).length === 0, 'valid provider placeholder caused a false quality failure')
check(getGuidedTranslationQualityIssues({
  sourceText: 'The speaker asks “Где вокзал?” before leaving.',
  translatedText: 'La personne demande « Où est la gare ? » avant de partir.',
  sourceLocale: 'en', destinationLocale: 'fr', targetLocale: 'ru',
  protectedSpans: protectedRussian.protectedSpans, protectedSpanState: 'restored',
}).some((issue) => issue.startsWith('missing protected restored')), 'altered learned-language quote was not rejected')
check(getGuidedTranslationQualityIssues({
  sourceText: 'This is a sufficiently long source sentence.',
  translatedText: 'This is a sufficiently long source sentence.',
  sourceLocale: 'en', destinationLocale: 'fr', targetLocale: 'de',
}).includes('copied source text'), 'copied source was not rejected')
check(getGuidedTranslationQualityIssues({
  sourceText: 'Translate this distinct explanatory meaning.',
  translatedText: 'Das ist der vollständige deutsche Zielsatz.',
  targetText: 'Das ist der vollständige deutsche Zielsatz.',
  sourceLocale: 'en', destinationLocale: 'fr', targetLocale: 'de',
}).includes('copied learning-language text'), 'copied learning-language text was not rejected')
check(getGuidedTranslationQualityIssues({
  sourceText: 'Translate this explanation.',
  translatedText: 'Это полностью русское предложение вместо французского.',
  sourceLocale: 'en', destinationLocale: 'fr', targetLocale: 'de',
}).includes('foreign-script sentence'), 'foreign-script sentence was not rejected')

console.log(`Guided translation quality tests passed (${checks} checks).`)
