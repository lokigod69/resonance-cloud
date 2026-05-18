import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createT, translations, type Locale } from '../src/lib/translations.ts'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    out(`  ok  ${name}\n`)
    return
  }

  failures += 1
  err(`  FAIL ${name}\n`)
  if (detail !== undefined) err(`        ${formatDetail(detail)}\n`)
}

const guidedTodayLocales: Locale[] = ['en', 'de', 'fr']
const todayKeysByLocale = new Map(
  guidedTodayLocales.map((locale) => [
    locale,
    Object.keys(translations[locale]).filter((key) => key.startsWith('today.')).sort(),
  ]),
)
const sourceTodayKeys = todayKeysByLocale.get('en') ?? []

out('\n[guided today i18n key coverage]\n')
for (const locale of guidedTodayLocales) {
  const keys = todayKeysByLocale.get(locale) ?? []
  const missing = sourceTodayKeys.filter((key) => !keys.includes(key))
  const extra = keys.filter((key) => !sourceTodayKeys.includes(key))

  assert(`${locale} has every Today source key`, missing.length === 0, missing)
  assert(`${locale} has no extra Today keys`, extra.length === 0, extra)
}

out('\n[guided today interpolation parity]\n')
for (const key of sourceTodayKeys) {
  const expectedSlots = interpolationSlots(translations.en[key])
  for (const locale of ['de', 'fr'] as const) {
    const observedSlots = interpolationSlots(translations[locale][key])
    assert(
      `${locale}.${key} preserves interpolation slots`,
      arrayEquals(observedSlots, expectedSlots),
      { expectedSlots, observedSlots, value: translations[locale][key] },
    )
  }
}

out('\n[guided today representative translations]\n')
const tEn = createT('en')
const tDe = createT('de')
const tFr = createT('fr')

assert('English Today start button is English', tEn('today.startLesson') === 'Start lesson', tEn('today.startLesson'))
assert('English target-language selector is English', tEn('today.language.compactLabel') === 'Language', tEn('today.language.compactLabel'))
assert('English speak prompt is English', tEn('today.speak.prompt') === 'Say the sentence in English.', tEn('today.speak.prompt'))
assert('English path completion body is English', tEn('today.path.completeBody').startsWith('All ten lessons'), tEn('today.path.completeBody'))
assert('English checkpoint prompt is English', tEn('today.checkpoint.typePrompt') === 'Write the English phrase for the German cue.', tEn('today.checkpoint.typePrompt'))

assert('German Today start button remains German', tDe('today.startLesson') === 'Lektion starten', tDe('today.startLesson'))
assert('German target-language selector remains German', tDe('today.language.compactLabel') === 'Sprache', tDe('today.language.compactLabel'))
assert('German speak prompt remains German', tDe('today.speak.prompt') === 'Sprich den Satz auf Englisch.', tDe('today.speak.prompt'))

assert('French Today start button is French', tFr('today.startLesson') === 'Commencer la leçon', tFr('today.startLesson'))
assert('French target-language selector is French', tFr('today.language.compactLabel') === 'Langue', tFr('today.language.compactLabel'))
assert('French speak prompt is French', tFr('today.speak.prompt') === 'Dis la phrase en anglais.', tFr('today.speak.prompt'))
assert('French trophy unavailable title is French', tFr('today.trophy.unavailableTitle') === 'Chansons trophées bientôt disponibles', tFr('today.trophy.unavailableTitle'))

out('\n[guided today hardcoded string cleanup]\n')
const matchPairsSource = readSource('../src/components/today/MatchPairsStep.tsx')
const trophySongPlayerSource = readSource('../src/components/today/trophy/TrophySongPlayer.tsx')
const trophySongPanelSource = readSource('../src/components/today/trophy/TrophySongPanel.tsx')
const todayHeroSource = readSource('../src/components/today/TodayHero.tsx')
const pathLabelsSource = readSource('../src/lib/guidedPathLabels.ts')
const packageSource = readSource('../package.json')

assert('match-pairs target column label uses translation registry', !matchPairsSource.includes('>English<') && matchPairsSource.includes('today.matchPairs.targetColumn'))
assert('match-pairs base column label uses translation registry', !matchPairsSource.includes('>Deutsch<') && matchPairsSource.includes('today.matchPairs.baseColumn'))
assert('match-pairs listen aria/title uses translation registry', !matchPairsSource.includes('Listen:') && matchPairsSource.includes('today.listenToItem'))
assert('trophy song candidate selector aria-label uses translation registry', !trophySongPlayerSource.includes('Song candidate') && trophySongPlayerSource.includes('today.trophy.player.candidateSelector'))
assert('trophy lyric column titles use translation registry', !trophySongPanelSource.includes('English lyrics') && !trophySongPanelSource.includes('German translation') && trophySongPanelSource.includes('today.trophy.lyrics.targetTitle'))
assert('today hero path title uses localized path labels', !todayHeroSource.includes('lesson.pathMetadata.title') && todayHeroSource.includes('formatGuidedPathFullTitle'))
assert('today hero language direction uses localized language names', !todayHeroSource.includes('lesson.pathMetadata.baseLanguage}{') && todayHeroSource.includes('today.language.'))
assert('guided path labels localize target-language names', pathLabelsSource.includes('today.language.') && pathLabelsSource.includes('createT'))
assert('guided today i18n test is part of test:guided-today chain', packageSource.includes('scripts/test-guided-today-i18n.ts'))

out(`\n${passes} passed, ${failures} failed\n`)
if (failures > 0) process.exit(1)

function interpolationSlots(value: string | undefined) {
  const matches = value?.match(/\{\w+\}/g) ?? []
  return [...new Set(matches)].sort()
}

function arrayEquals(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
}

function out(value: string) {
  process.stdout.write(value)
}

function err(value: string) {
  process.stderr.write(value)
}

function formatDetail(detail: unknown) {
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}
