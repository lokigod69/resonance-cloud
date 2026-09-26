// Language-identity check for UI strings. check:i18n proves every key exists;
// this catches text in the wrong language, e.g. German that leaked into the
// English pack (caught live on 2026-09-07).
//   - en values: German letters (äöüß) or German function words
//   - non-German locales: German letters
//   - any locale: a multi-word value identical to English (likely untranslated)
// Known-good exceptions live in ALLOW below; keep that list short and specific.
import { loadLocaleMessages, translations, type Locale } from '../src/lib/translations.ts'

const locales: Locale[] = ['de', 'fr', 'es', 'it', 'pt', 'id', 'pl', 'ru', 'ko', 'ja', 'ceb']
const en = translations.en as Record<string, string>
const GERMAN_LETTERS = /[äöüßÄÖÜ]/
const GERMAN_WORDS = /(^|\s)(und|nicht|oder|mit|für|ist|sind|auch|noch|schon|wird|werden|kein|keine)(\s|$)/i
// Keys whose value may legitimately be the same in several languages or name a language.
const ALLOW = [
  /^langName\./,
  /\.(brand|appName|productName)$/,
]
const allowed = (key: string) => ALLOW.some(pattern => pattern.test(key))

const problems: string[] = []
for (const [key, value] of Object.entries(en)) {
  if (allowed(key) || typeof value !== 'string') continue
  if (GERMAN_LETTERS.test(value) || GERMAN_WORDS.test(value)) problems.push(`en ${key}: ${JSON.stringify(value)}`)
}

const identical: Record<string, string[]> = {}
for (const locale of locales) {
  const messages = locale === 'de' || locale === 'fr'
    ? translations[locale] as Record<string, string>
    : await loadLocaleMessages(locale) as Record<string, string>
  identical[locale] = []
  for (const [key, value] of Object.entries(messages)) {
    if (allowed(key) || typeof value !== 'string') continue
    if (locale !== 'de' && GERMAN_LETTERS.test(value)) problems.push(`${locale} ${key}: ${JSON.stringify(value)}`)
    const source = en[key]
    // Several words, mostly letters, and byte-identical to English.
    if (source && value === source && source.trim().split(/\s+/).length >= 3 && /[a-z]{3}/i.test(source)) {
      identical[locale].push(key)
    }
  }
}

for (const problem of problems) console.error(`[i18n-language] ${problem}`)
for (const [locale, keys] of Object.entries(identical)) {
  if (keys.length) console.log(`[i18n-language] ${locale}: ${keys.length} multi-word value(s) identical to English: ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? ', …' : ''}`)
}
const untranslated = Object.values(identical).reduce((sum, keys) => sum + keys.length, 0)
console.log(`i18n language check: ${problems.length} wrong-language value(s), ${untranslated} identical-to-English (report only)`)
process.exit(problems.length ? 1 : 0)
