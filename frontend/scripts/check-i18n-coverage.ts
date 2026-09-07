import {
  loadLocaleMessages,
  translations,
  type Locale,
  type TranslationMessages,
} from '../src/lib/translations.ts'

const sourceLocale = 'en' as const
const requiredLocales: Locale[] = ['de', 'fr', 'es', 'it', 'pt', 'id', 'pl', 'ru', 'ko', 'ja', 'ceb']
const sourceMessages = translations[sourceLocale]
const sourceKeys = Object.keys(sourceMessages).sort()
const sourceKeySet = new Set(sourceKeys)
let hasFailures = false

function interpolationSlots(value: string) {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort()
}

function reportLocale(locale: Locale, messages: TranslationMessages) {
  const localeKeys = new Set(Object.keys(messages))
  const missing = sourceKeys.filter((key) => !localeKeys.has(key))
  const extra = Object.keys(messages).filter((key) => {
    if (sourceKeySet.has(key)) return false
    const pluralBase = key.replace(/\.(zero|two|few|many)$/, '')
    return pluralBase === key || !sourceKeySet.has(`${pluralBase}.other`)
  }).sort()
  const empty = sourceKeys.filter((key) => typeof messages[key] !== 'string' || !messages[key].trim())
  const placeholderMismatches = sourceKeys.filter((key) => (
    JSON.stringify(interpolationSlots(sourceMessages[key]))
      !== JSON.stringify(interpolationSlots(messages[key] ?? ''))
  ))

  if (missing.length || extra.length || empty.length || placeholderMismatches.length) hasFailures = true

  if (missing.length) {
    console.error(`[i18n] ${locale} is missing ${missing.length} key(s):`)
    for (const key of missing) console.error(`  - ${key}`)
  }
  if (extra.length) {
    console.error(`[i18n] ${locale} has ${extra.length} extra key(s):`)
    for (const key of extra) console.error(`  - ${key}`)
  }
  if (empty.length) {
    console.error(`[i18n] ${locale} has ${empty.length} blank value(s):`)
    for (const key of empty) console.error(`  - ${key}`)
  }
  if (placeholderMismatches.length) {
    console.error(`[i18n] ${locale} has ${placeholderMismatches.length} interpolation mismatch(es):`)
    for (const key of placeholderMismatches) {
      console.error(`  - ${key}: expected ${interpolationSlots(sourceMessages[key])}, received ${interpolationSlots(messages[key] ?? '')}`)
    }
  }

  if (!missing.length && !extra.length && !empty.length && !placeholderMismatches.length) {
    console.log(`[i18n] ${locale}: ${sourceKeys.length}/${sourceKeys.length} keys, non-empty values, and placeholders covered`)
  }
}

console.log(`[i18n] Source locale ${sourceLocale}: ${sourceKeys.length} keys`)
for (const locale of requiredLocales) {
  try {
    reportLocale(locale, await loadLocaleMessages(locale))
  } catch (error) {
    hasFailures = true
    console.error(`[i18n] ${locale} failed to load: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (hasFailures) process.exit(1)
