import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  createT,
  getLocaleLoadStatus,
  LANGUAGE_TO_LOCALE,
  loadLocaleMessages,
  retryLocaleMessages,
  selectPluralTranslationKey,
  translations,
  type Locale,
} from '../src/lib/translations.ts'

const locales: Locale[] = ['en', 'de', 'fr', 'es', 'it', 'pt', 'id', 'pl', 'ru', 'ko', 'ja', 'ceb']
assert.equal(new Set(Object.values(LANGUAGE_TO_LOCALE)).size, locales.length, 'all 12 UI locales are reachable from profiles')
assert.equal(LANGUAGE_TO_LOCALE.Bisaya, 'ceb')
assert.equal(LANGUAGE_TO_LOCALE.Cebuano, 'ceb')

assert.equal(getLocaleLoadStatus('es'), 'idle', 'a lazy locale starts unloaded')
const firstSpanishLoad = loadLocaleMessages('es')
assert.equal(getLocaleLoadStatus('es'), 'loading', 'locale store exposes in-flight state')
await firstSpanishLoad
assert.equal(getLocaleLoadStatus('es'), 'ready', 'locale store exposes ready state')
assert.equal(await retryLocaleMessages('es'), await loadLocaleMessages('es'), 'retry reuses an already complete pack')

for (const locale of locales) {
  const messages = await loadLocaleMessages(locale)
  const t = createT(locale, messages)
  assert.notEqual(t('nav.dashboard'), 'nav.dashboard', `${locale} resolves a loaded UI string`)
  assert.equal(t('today.language.Bisaya'), t('today.language.Cebuano'), `${locale} resolves the Bisaya target alias`)
  assert.match(messages['today.type.targetKeyboardHint'] ?? '', /\{language\}/, `${locale} keeps the target keyboard language placeholder`)
  assert.match(messages['today.type.openScriptLab'] ?? '', /\{script\}/, `${locale} keeps the Script Lab script placeholder`)
  assert.ok(t('today.type.targetKeyboardHint', { language: '日本語' }).includes('日本語'), `${locale} interpolates the target language`)
  assert.ok(t('today.type.openScriptLab', { script: 'かな' }).includes('かな'), `${locale} interpolates the script name`)
}

const destinationAnchors: Partial<Record<Locale, Record<string, string>>> = {
  es: { 'nav.dashboard': 'Inicio', 'lens.action.save': 'Guardar', 'common.cancel': 'Cancelar' },
  it: { 'lens.action.save': 'Salva', 'common.cancel': 'Annulla', 'common.retry': 'Riprova' },
  pt: { 'nav.dashboard': 'Início', 'lens.action.save': 'Salvar', 'common.cancel': 'Cancelar' },
  id: { 'nav.dashboard': 'Beranda', 'lens.action.save': 'Simpan', 'common.cancel': 'Batal' },
  pl: { 'nav.dashboard': 'Strona główna', 'lens.action.save': 'Zapisz', 'common.cancel': 'Anuluj' },
  ru: { 'nav.dashboard': 'Главная', 'lens.action.save': 'Сохранить', 'common.cancel': 'Отмена' },
  ko: { 'nav.dashboard': '홈', 'lens.action.save': '저장', 'common.cancel': '취소' },
  ja: { 'nav.dashboard': 'ホーム', 'lens.action.save': '保存', 'common.cancel': 'キャンセル' },
  ceb: {
    'nav.dashboard': 'Balay',
    'common.cancel': 'Kanselahon',
    'common.retry': 'Sulayi pag-usab',
    'today.step.build': 'Han-aya ang mga pulong',
    'today.build.title': 'Han-aya ang mga pulong',
    'today.build.prompt': 'Han-aya ang mga pulong aron mahimong kompleto nga pahayag.',
    'today.build.answerLabel': 'Imong pahayag',
    'today.path.backToPath': 'Balik sa kurso',
    'today.checkpoint.backToToday': 'Balik sa kurso',
  },
}

for (const [locale, anchors] of Object.entries(destinationAnchors) as Array<[Locale, Record<string, string>]>) {
  const messages = await loadLocaleMessages(locale)
  for (const [key, expected] of Object.entries(anchors)) {
    assert.equal(messages[key], expected, `${locale} destination-language anchor ${key}`)
  }
  const identical = Object.keys(translations.en).filter((key) => messages[key] === translations.en[key]).length
  assert.ok(identical / Object.keys(translations.en).length < 0.35, `${locale} is not an English fallback pack`)
}

const scriptChecks: Array<[Locale, RegExp]> = [
  ['ru', /\p{Script=Cyrillic}/u],
  ['ko', /\p{Script=Hangul}/u],
  ['ja', /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u],
]
for (const [locale, pattern] of scriptChecks) {
  const messages = await loadLocaleMessages(locale)
  const sourceKeysWithWords = Object.keys(translations.en).filter((key) => /[A-Za-z]{4}/.test(translations.en[key]))
  const targetScriptCount = sourceKeysWithWords.filter((key) => pattern.test(messages[key])).length
  assert.ok(targetScriptCount / sourceKeysWithWords.length > 0.95, `${locale} uses its destination script across the pack`)
}

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
assert.match(appSource, /function LocaleReadyBoundary/, 'app owns a locale readiness boundary')
assert.match(appSource, /localeLoadFailed/, 'locale chunk failure has an explicit state')
assert.match(appSource, /retryLocale\(\)/, 'locale chunk failure exposes a retry action')
assert.match(appSource, /const documentLocaleReady = location\.pathname === '\/' \|\| localeReady/, 'document language separates landing and app locale readiness')
assert.match(appSource, /if \(!documentLocaleReady\) return/, 'app document language waits for the requested locale')

const counts = [0, 1, 2, 5, 11, 21]
const expectedCategories: Partial<Record<Locale, string[]>> = {
  en: ['other', 'one', 'other', 'other', 'other', 'other'],
  fr: ['one', 'one', 'other', 'other', 'other', 'other'],
  pl: ['many', 'one', 'few', 'many', 'many', 'many'],
  ru: ['many', 'one', 'few', 'many', 'many', 'one'],
  ja: ['other', 'other', 'other', 'other', 'other', 'other'],
}

for (const [locale, categories] of Object.entries(expectedCategories) as Array<[Locale, string[]]>) {
  const messages = await loadLocaleMessages(locale)
  const t = createT(locale, messages)
  counts.forEach((count, index) => {
    const key = selectPluralTranslationKey(locale, 'dashboard.wordCount', count, messages)
    assert.equal(key, `dashboard.wordCount.${categories[index]}`, `${locale} count ${count} chooses the correct plural category`)
    assert.ok(t(key, { count }).includes(String(count)), `${locale} count ${count} interpolates the selected message`)
  })
}

console.log(`test-ui-locales: OK (${locales.length} locales; plural checks ${counts.join('/')})`)
