import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { CATEGORY_GROUPS } from '../src/data/categories.ts'
import { translations } from '../src/lib/translations.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

// 1. Every CATEGORY_GROUPS entry exposes a translation key for its group + categories.
for (const group of CATEGORY_GROUPS) {
  assert.ok(group.groupKey, `group ${group.label} missing groupKey`)
  assert.ok(group.groupKey.startsWith('category.group.'), `group ${group.label} groupKey must be category.group.*`)
  for (const cat of group.categories) {
    assert.ok(cat.labelKey, `category ${cat.name} missing labelKey`)
    assert.ok(cat.labelKey.startsWith('category.'), `category ${cat.name} labelKey must be category.*`)
  }
}

// 2. en/de/fr have translations for every category group + category key,
//    plus the new generate.words.* / common.back / generate.primaryGenerate keys.
const requiredKeys: string[] = [
  'common.back',
  'generate.primaryGenerate',
  'generate.quickGenerate',
  'generate.customize',
  'generate.words.manualPlaceholder',
  'generate.words.addWordAriaLabel',
  'generate.words.removeWordAriaLabel',
  'generate.words.changeCategory',
  'generate.words.regenerateAll',
  'generate.words.findingWords',
  'generate.words.wordPlaceholder',
  'generate.words.translationPlaceholder',
  'generate.words.addAtLeastOne',
  'generate.words.pickTargetLanguageFirst',
  'generate.words.noSuggestionsReturned',
  'generate.words.fetchSuggestionsFailed',
  'generate.words.maxCount',
  'generate.words.sessionExpired',
]

for (const group of CATEGORY_GROUPS) {
  requiredKeys.push(group.groupKey)
  for (const cat of group.categories) requiredKeys.push(cat.labelKey)
}

for (const locale of ['en', 'de', 'fr'] as const) {
  for (const key of requiredKeys) {
    const value = translations[locale]?.[key]
    assert.ok(typeof value === 'string' && value.length > 0, `Missing ${locale} translation for ${key}`)
  }
}

// 3. German translations match the agreed-upon labels for the active scenario.
const expectedDe: Record<string, string> = {
  'common.back': '← Zurück',
  'generate.primaryGenerate': 'Generieren',
  'generate.customize': 'Anpassen',
  'generate.words.manualPlaceholder': 'Wort eingeben und Enter drücken',
  'generate.words.regenerateAll': 'Alle neu generieren',
  'generate.words.findingWords': 'Wörter werden gesucht…',
  'generate.words.changeCategory': 'Kategorie ändern',
  'generate.words.wordPlaceholder': 'Wort',
  'generate.words.translationPlaceholder': 'Übersetzung',
  'category.group.essentials': 'Grundlagen',
  'category.greetings': 'Begrüßungen & Vorstellungen',
  'category.randomMix': 'Zufällige Mischung',
}
for (const [key, expected] of Object.entries(expectedDe)) {
  assert.equal(translations.de[key], expected, `de translation for ${key}`)
}

// 4. CategoryPicker passes the original category .name (English) to fetchSuggestions.
//    Verify the source still references cat.name in the API call body.
const pickerSource = readFileSync(
  resolve(repoRoot, 'src/components/generate/steps/CategoryPicker.tsx'),
  'utf8',
)
assert.ok(
  pickerSource.includes('fetchSuggestions(cat.name)'),
  'CategoryPicker must invoke fetchSuggestions with the stable English cat.name (API contract).',
)
assert.ok(
  pickerSource.includes('// category is the API contract value'),
  'CategoryPicker must keep the comment documenting the API contract for category.',
)

// 5. WordsStep, CategoryPicker, GlassInput no longer ship the listed hardcoded English copy.
const wordsStepSource = readFileSync(
  resolve(repoRoot, 'src/components/generate/steps/WordsStep.tsx'),
  'utf8',
)
const glassInputSource = readFileSync(
  resolve(repoRoot, 'src/components/generate/shared/GlassInput.tsx'),
  'utf8',
)

const forbidden: Array<[string, string]> = [
  [wordsStepSource, '"Quick Generate"'],
  [wordsStepSource, "'Quick Generate'"],
  [wordsStepSource, '>Quick Generate<'],
  [wordsStepSource, '>Customize<'],
  [wordsStepSource, '>Back<'],
  [wordsStepSource, '"Type a word and press Enter"'],
  [wordsStepSource, "'Type a word and press Enter'"],
  [pickerSource, '>Change category<'],
  [pickerSource, '>Regenerate All<'],
  [pickerSource, '>Finding words…<'],
  [pickerSource, '"Pick a target language first"'],
  [pickerSource, "'Add at least one word'"],
  [pickerSource, '>Max 20<'],
  [pickerSource, 'placeholder="word"'],
  [pickerSource, 'placeholder="translation"'],
  [glassInputSource, "'Type a word and press Enter'"],
  [glassInputSource, '"Type a word and press Enter"'],
]
for (const [source, snippet] of forbidden) {
  assert.ok(
    !source.includes(snippet),
    `Hardcoded English copy still present: ${snippet}`,
  )
}

// 6. DeckView / DeckViewPG: pending status only rendered once on a card.
const deckViewSource = readFileSync(resolve(repoRoot, 'src/pages/DeckView.tsx'), 'utf8')
const deckViewPgSource = readFileSync(resolve(repoRoot, 'src/pages/DeckViewPG.tsx'), 'utf8')
const queuedRefDV = (deckViewSource.match(/t\('deckview\.queued'\)/g) ?? []).length
const queuedRefPG = (deckViewPgSource.match(/t\('deckview\.queued'\)/g) ?? []).length
// Each view should reference deckview.queued exactly once for the placeholder.
assert.equal(queuedRefDV, 1, `DeckView should reference deckview.queued once, found ${queuedRefDV}`)
assert.equal(queuedRefPG, 1, `DeckViewPG should reference deckview.queued once, found ${queuedRefPG}`)

// 7. Card decks must NOT show the global queue indicator
//    (regression check for the prior queue UX fix).
const cardProgressLib = readFileSync(resolve(repoRoot, 'src/lib/cardGenerationProgress.ts'), 'utf8')
assert.ok(
  cardProgressLib.includes("deck.deck_type !== 'card'"),
  'shouldUseGlobalQueuePosition must still exclude card decks',
)

console.log('test-generate-i18n-ui-cleanup: OK')
