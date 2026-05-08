import { translations, type Locale } from '../src/lib/translations.ts'

const sourceLocale: Locale = 'en'
const requiredLocales: Locale[] = ['de']
const warnOnlyLocales: Locale[] = ['fr']

const sourceKeys = Object.keys(translations[sourceLocale]).sort()
let hasFailures = false

function missingKeys(locale: Locale) {
  const localeKeys = new Set(Object.keys(translations[locale]))
  return sourceKeys.filter((key) => !localeKeys.has(key))
}

function extraKeys(locale: Locale) {
  const sourceKeySet = new Set(sourceKeys)
  return Object.keys(translations[locale])
    .filter((key) => !sourceKeySet.has(key))
    .sort()
}

console.log(`[i18n] Source locale ${sourceLocale}: ${sourceKeys.length} keys`)

for (const locale of requiredLocales) {
  const missing = missingKeys(locale)
  const extra = extraKeys(locale)

  if (missing.length > 0) {
    hasFailures = true
    console.error(`[i18n] ${locale} is missing ${missing.length} key(s):`)
    for (const key of missing) console.error(`  - ${key}`)
  } else {
    console.log(`[i18n] ${locale}: ${sourceKeys.length}/${sourceKeys.length} keys covered`)
  }

  if (extra.length > 0) {
    console.warn(`[i18n] ${locale} has ${extra.length} extra key(s) not present in ${sourceLocale}:`)
    for (const key of extra) console.warn(`  - ${key}`)
  }
}

for (const locale of warnOnlyLocales) {
  const missing = missingKeys(locale)
  const extra = extraKeys(locale)
  const covered = sourceKeys.length - missing.length

  if (missing.length > 0) {
    console.warn(
      `[i18n] ${locale}: ${covered}/${sourceKeys.length} keys covered. Missing keys are warn-only for now because French gaps are known and out of scope for the German Phase 0 PR:`
    )
    for (const key of missing) console.warn(`  - ${key}`)
  } else {
    console.log(`[i18n] ${locale}: ${sourceKeys.length}/${sourceKeys.length} keys covered`)
  }

  if (extra.length > 0) {
    console.warn(`[i18n] ${locale} has ${extra.length} extra key(s) not present in ${sourceLocale}:`)
    for (const key of extra) console.warn(`  - ${key}`)
  }
}

if (hasFailures) {
  process.exit(1)
}
