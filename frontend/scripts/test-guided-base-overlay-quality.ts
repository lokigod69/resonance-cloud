import fs from 'node:fs'
import path from 'node:path'
import { GUIDED_LESSONS, getGuidedTodayPathOptions } from '../src/data/guidedLessonsAuthoring.ts'
import { collectGuidedBaseFields, guidedEditionFingerprint } from '../src/lib/guidedBaseFields.ts'
import { getGuidedEditionTranslation, validateGuidedBaseEdition, type GuidedBaseEdition } from '../src/lib/guidedBaseEditions.ts'
import {
  buildGuidedLearnedTermSet,
  getGuidedTranslationQualityIssues,
  protectGuidedLearnedSpans,
} from '../src/lib/guidedTranslationQuality.ts'

const overlayRoot = path.resolve(import.meta.dirname, '../src/data/guided-base')
const targetFiles: Record<string, string> = {
  English: 'english', German: 'german', French: 'french', Spanish: 'spanish',
  Italian: 'italian', Portuguese: 'portuguese', Indonesian: 'indonesian',
  Polish: 'polish', Russian: 'russian', Korean: 'korean', Japanese: 'japanese', Cebuano: 'cebuano',
}
const targetLocales: Record<string, string> = {
  English: 'en', German: 'de', French: 'fr', Spanish: 'es', Italian: 'it',
  Portuguese: 'pt', Indonesian: 'id', Polish: 'pl', Russian: 'ru', Korean: 'ko',
  Japanese: 'ja', Cebuano: 'ceb',
}
const manifestPath = path.join(overlayRoot, 'manifest.json')
if (!fs.existsSync(manifestPath)) throw new Error('Guided base overlays are not published: missing guided-base/manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, { corpusHash: string; locales: string[] }>
const failures: string[] = []
const expectedFiles = Object.values(targetFiles).sort()
const expectedLocales = Object.values(targetLocales).sort()
if (JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(expectedFiles)) {
  failures.push('manifest must contain exactly the 12 guided target files')
}
const sentenceLike = /(?:corePhrase\/baseText|\/meaning|\/situation|\/sceneCaption|\/dialogue\/\d+\/baseText|\/pattern\/(?:rule|examples\/\d+\/baseText))$/
let checkedFiles = 0
let checkedFields = 0

for (const [targetLanguage, file] of Object.entries(targetFiles)) {
  const lessons = GUIDED_LESSONS.filter((lesson) => lesson.targetLanguage === targetLanguage)
  const paths = getGuidedTodayPathOptions().filter((entry) => entry.targetLanguage === targetLanguage)
  const fields = collectGuidedBaseFields(lessons, paths)
  const learnedTerms = buildGuidedLearnedTermSet([...lessons, ...paths])
  const protections = fields.map((field) => protectGuidedLearnedSpans({
    sourceText: field.source,
    sourceLocale: field.sourceLocale,
    targetLanguage,
    learnedTerms,
  }).protectedSpans)
  const hash = guidedEditionFingerprint(fields)
  const published = manifest[file]
  if (!published || published.corpusHash !== hash) failures.push(`${file}: stale or missing manifest identity`)
  const publishedLocales = [...new Set(published?.locales ?? [])].sort()
  if (
    published?.locales.length !== expectedLocales.length
    || JSON.stringify(publishedLocales) !== JSON.stringify(expectedLocales)
  ) failures.push(`${file}: manifest must publish exactly all 12 explanation locales`)
  for (const locale of published?.locales ?? []) {
    const editionPath = path.join(overlayRoot, `${file}.${locale}.json`)
    const edition = JSON.parse(fs.readFileSync(editionPath, 'utf8')) as GuidedBaseEdition
    validateGuidedBaseEdition(edition, fields, hash, locale)
    if (file === 'japanese' && locale === 'it') {
      const key = 'lessons/japanese-a1-practical-1-lesson-5-korewa-nan-desuka/vibeVariants/bright/corePhrase/baseText'
      const index = fields.findIndex((field) => field.key === key)
      if (getGuidedEditionTranslation(edition, key, index) !== "Cos'è questo?") {
        failures.push('japanese.it: A1 Practical 1 lesson 5 bright core meaning must not invent an extra sentence')
      }
    }
    checkedFiles++
    checkedFields += fields.length
    fields.forEach((field, index) => {
      const translated = getGuidedEditionTranslation(edition, field.key, index) ?? ''
      // Authored locale cells are immutable corpus input, not provider output.
      if (field.value[locale]?.trim()) return
      const issues = getGuidedTranslationQualityIssues({
        sourceText: field.source,
        translatedText: translated,
        sourceLocale: field.sourceLocale,
        destinationLocale: locale,
        targetText: field.targetText,
        targetLocale: targetLocales[targetLanguage],
        sentenceLike: sentenceLike.test(field.key),
        protectedSpans: protections[index],
        protectedSpanState: 'restored',
      })
      for (const issue of issues) {
        failures.push(`${file}.${locale}: ${issue} at ${field.key}`)
      }
    })
  }
}

if (failures.length) {
  throw new Error(`Guided base overlay quality gate found ${failures.length} high-confidence issue(s):\n${failures.slice(0, 40).join('\n')}`)
}
console.log(`Guided base overlay quality gate passed ${checkedFields} fields across ${checkedFiles} published editions.`)
