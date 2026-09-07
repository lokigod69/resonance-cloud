import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { API_BASE_LANGUAGES, resolveApiBaseLanguage } from '../api/_shared/baseLanguages.ts'
import { buildGeneratePayload, type WizardState } from '../src/components/generate/useWizardState.ts'
import {
  BASE_LANGUAGES,
  BASE_LANGUAGE_VALUES,
  BETA_TARGET_LANGUAGES,
  canUseLegacyGermanCurriculum,
  canonicalizeBaseLanguageValue,
  getBaseLanguageCode,
  getIntlLocale,
} from '../src/lib/languages.ts'
import { resolveSharedWordBaseLanguage, resolveWordBaseLanguage } from '../src/lib/wordBaseLanguage.ts'

let passes = 0
let failures = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`, detail ?? '')
  }
}

function makeState(): WizardState {
  return {
    step: 1,
    path: 'quick',
    language: 'Spanish',
    words: ['hola'],
    selectedVocabularyItems: [],
    vibe: null,
    movieTitle: null,
    artStyle: null,
    genre: null,
    lyricMode: null,
    deckName: '',
    productLane: 'card_standard',
    cardImageStyle: null,
    cardLayer2: null,
    premiumQuickMode: 'clear',
    premiumInfographicStyle: 'auto',
  }
}

console.log('\n[base language registry]')
assert('exactly 12 base languages are exposed', BASE_LANGUAGES.length === 12, BASE_LANGUAGES.map((item) => item.value))
assert(
  'base flags match the canonical registry',
  BASE_LANGUAGE_VALUES.every((value) => BASE_LANGUAGES.some((item) => item.value === value))
    && BASE_LANGUAGES.every((item) => BASE_LANGUAGE_VALUES.includes(item.value as never)),
)
assert(
  'API registry stays byte-for-byte aligned with UI values',
  JSON.stringify(API_BASE_LANGUAGES.map((item) => item.value)) === JSON.stringify(BASE_LANGUAGE_VALUES),
)
assert(
  'API codes stay aligned with the UI registry',
  API_BASE_LANGUAGES.every((item) => getBaseLanguageCode(item.value) === item.code),
)
assert('Cebuano remains a canonical Bisaya alias', canonicalizeBaseLanguageValue('Cebuano') === 'Bisaya')
assert('API accepts Bisaya code and alias', resolveApiBaseLanguage('ceb')?.value === 'Bisaya' && resolveApiBaseLanguage('Cebuano')?.code === 'ceb')
assert('unknown base languages remain unknown', canonicalizeBaseLanguageValue('Tagalog') === null && resolveApiBaseLanguage('Tagalog') === null)
assert('Japanese code and date locale resolve', getBaseLanguageCode('Japanese') === 'ja' && getIntlLocale('ja') === 'ja-JP')
assert(
  'beta target rollout remains exactly eight languages',
  JSON.stringify(BETA_TARGET_LANGUAGES) === JSON.stringify([
    'English', 'German', 'Spanish', 'French', 'Italian', 'Portuguese', 'Bisaya', 'Indonesian',
  ]),
)

console.log('\n[generation and study provenance]')
const payload = buildGeneratePayload({
  state: makeState(),
  userId: '00000000-0000-0000-0000-000000000001',
  baseLanguage: 'French',
})
assert('generation payload pins the submit-time base language', payload.jobPayload.settings_override.base_language === 'French')
assert('word metadata wins over the current profile', resolveWordBaseLanguage({ base_language: 'Polish' }) === 'Polish')
assert('static helper-language metadata is valid provenance', resolveWordBaseLanguage({ curriculum: { helper_language_code: 'de', helper_language: 'German' } }) === 'German')
assert('nested premium metadata is supported', resolveWordBaseLanguage({ visual_card_plan: { base_language: 'ko' } }) === 'Korean')
assert('unknown legacy cards stay unlabeled', resolveWordBaseLanguage({ source: 'old_import' }) === null)
assert('one known deck base remains labelable beside unknown legacy rows', resolveSharedWordBaseLanguage(['French', null]) === 'French')
assert('mixed-base decks suppress a single deck-wide base label', resolveSharedWordBaseLanguage(['French', 'Spanish', null]) === null)

const scriptDir = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(scriptDir, '..')
for (const file of ['src/pages/GeneratePG.tsx', 'src/pages/GenerateGO.tsx']) {
  const source = readFileSync(resolve(frontendRoot, file), 'utf8')
  assert(`${file} appends per-item base provenance`, source.includes("base_language: baseLanguageValue"))
}

console.log('\n[legacy and formatting contracts]')
assert('legacy curriculum is available only to German-base learners', canUseLegacyGermanCurriculum('de') && !canUseLegacyGermanCurriculum('Spanish'))
assert('Bisaya has a stable Philippine Intl locale', getIntlLocale('Cebuano') === 'ceb-PH')
assert('Portuguese uses the product Brazilian locale', getIntlLocale('Portuguese') === 'pt-BR')

if (failures > 0) {
  console.error(`\n${failures} failed, ${passes} passed`)
  process.exit(1)
}

console.log(`\n${passes} passed`)
