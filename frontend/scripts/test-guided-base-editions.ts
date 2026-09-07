import assert from 'node:assert/strict'
import { GUIDED_LESSONS, getGuidedTodayPathOptions } from '../src/data/guidedLessonsAuthoring.ts'
import {
  GUIDED_BASE_LOCALES,
  getGuidedEditionTranslation,
  resolveGuidedExplanationLocale,
  validateGuidedBaseEdition,
} from '../src/lib/guidedBaseEditions.ts'
import { collectGuidedBaseFields, guidedEditionFingerprint } from '../src/lib/guidedBaseFields.ts'
import * as runtime from '../src/data/guidedLessons.ts'

assert.equal(Object.keys(GUIDED_BASE_LOCALES).length, 12)
assert.equal(new Set(Object.values(GUIDED_BASE_LOCALES)).size, 12)
assert.equal(GUIDED_BASE_LOCALES.Bisaya, 'ceb')
assert.equal(resolveGuidedExplanationLocale('Cebuano'), 'ceb')
assert.equal(resolveGuidedExplanationLocale(' cEbUaNo '), 'ceb')
assert.equal(resolveGuidedExplanationLocale('Bisaya'), 'ceb')
assert.equal(runtime.guidedBaseLanguageToContentLocale('Cebuano'), 'ceb')

const fields = [
  { key: 'lessons/one/title', value: { en: 'Hello {name}' }, source: 'Hello {name}', sourceLocale: 'en' as const },
  { key: 'lessons/one/meaning', value: { de: 'Bedeutung' }, source: 'Bedeutung', sourceLocale: 'de' as const },
]
const hash = guidedEditionFingerprint(fields)
const valid = {
  schemaVersion: 1,
  corpusHash: hash,
  locale: 'fr',
  translations: {
    'lessons/one/title': 'Bonjour {name}',
    'lessons/one/meaning': 'Signification',
  },
}

assert.doesNotThrow(() => validateGuidedBaseEdition(valid, fields, hash, 'fr'))
assert.throws(() => validateGuidedBaseEdition({ ...valid, corpusHash: 'stale' }, fields, hash, 'fr'), /mismatch/)
assert.throws(() => validateGuidedBaseEdition({ ...valid, locale: 'es' }, fields, hash, 'fr'), /mismatch/)
assert.throws(() => validateGuidedBaseEdition({ ...valid, translations: { 'lessons/one/title': 'Bonjour {name}' } }, fields, hash, 'fr'), /Incomplete/)
assert.throws(() => validateGuidedBaseEdition({ ...valid, translations: { ...valid.translations, 'lessons/one/title': 'Bonjour' } }, fields, hash, 'fr'), /placeholder/)
assert.throws(() => validateGuidedBaseEdition({ ...valid, translations: { 'lessons/one/title': 'Bonjour {name}', rogue: 'Intrus' } }, fields, hash, 'fr'), /Invalid/)

const compact = {
  schemaVersion: 2,
  corpusHash: hash,
  locale: 'fr',
  reviewStatus: 'machine-authored' as const,
  texts: ['Bonjour {name}', 'Signification'],
}
assert.doesNotThrow(() => validateGuidedBaseEdition(compact, fields, hash, 'fr'))
assert.equal(getGuidedEditionTranslation(compact, fields[1].key, 1), 'Signification')
assert.throws(() => validateGuidedBaseEdition({ ...compact, texts: compact.texts.slice(0, 1) }, fields, hash, 'fr'), /Incomplete/)
assert.throws(() => validateGuidedBaseEdition({ ...compact, texts: ['Bonjour', 'Signification'] }, fields, hash, 'fr'), /placeholder/)
assert.throws(() => validateGuidedBaseEdition({ ...compact, reviewStatus: undefined }, fields, hash, 'fr'), /review status/)
assert.throws(() => validateGuidedBaseEdition({ ...compact, reviewStatus: 'unreviewed' as never }, fields, hash, 'fr'), /review status/)
assert.throws(() => validateGuidedBaseEdition({ ...compact, texts: ['Bonjour {name} {name}', 'Signification'] }, fields, hash, 'fr'), /placeholder/)
assert.throws(() => validateGuidedBaseEdition({ ...compact, texts: ['Bonjour {name} {time}', 'Signification'] }, fields, hash, 'fr'), /placeholder/)
assert.notEqual(guidedEditionFingerprint([...fields].reverse()), hash, 'Field order must be part of the compact-edition fingerprint')
assert.notEqual(guidedEditionFingerprint([{ ...fields[0], source: 'Changed {name}', value: { en: 'Changed {name}' } }, fields[1]]), hash, 'Source changes must invalidate compact editions')

const allFields = collectGuidedBaseFields(GUIDED_LESSONS, getGuidedTodayPathOptions())
assert.ok(allFields.length > 50_000)
assert.equal(new Set(allFields.map((field) => field.key)).size, allFields.length, 'Guided base field keys must remain globally unique')
assert.ok(allFields.every((field) => field.source.trim() && ['en', 'de'].includes(field.sourceLocale)))

await runtime.loadAllGuidedLessons()
for (const targetLanguage of Array.from(new Set(GUIDED_LESSONS.map((lesson) => lesson.targetLanguage)))) {
  const authoredFields = collectGuidedBaseFields(
    GUIDED_LESSONS.filter((lesson) => lesson.targetLanguage === targetLanguage),
    getGuidedTodayPathOptions().filter((path) => path.targetLanguage === targetLanguage),
  )
  const runtimeFields = collectGuidedBaseFields(
    runtime.GUIDED_LESSONS.filter((lesson) => lesson.targetLanguage === targetLanguage),
    runtime.getGuidedTodayPathOptions().filter((path) => path.targetLanguage === targetLanguage),
  )
  assert.equal(
    guidedEditionFingerprint(runtimeFields),
    guidedEditionFingerprint(authoredFields),
    `Runtime split changed the ${targetLanguage} overlay corpus identity`,
  )
  assert.equal(runtimeFields.length, authoredFields.length, `Runtime split omitted ${targetLanguage} base fields`)
}

console.log(`Guided base edition contract passed for ${allFields.length} authored fields.`)
