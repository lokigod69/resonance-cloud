import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  canonicalizeLanguageValue,
  getLanguageCode,
  getLanguageQueryValues,
  languagesMatch,
} from '../src/lib/languages'

assert.equal(canonicalizeLanguageValue('de'), 'German', 'ISO language codes should collapse to wizard values')
assert.equal(canonicalizeLanguageValue(' German '), 'German', 'language values should trim before grouping')
assert.equal(canonicalizeLanguageValue('english'), 'English', 'language values should match case-insensitively')
assert.equal(canonicalizeLanguageValue('xx-custom '), 'xx-custom', 'unknown language values should keep their trimmed value')

assert.equal(getLanguageCode('German'), 'de', 'canonical values should resolve to ISO codes for enrichment APIs')
assert.equal(getLanguageCode(' de '), 'de', 'ISO values should remain usable for enrichment APIs')
assert.deepEqual(
  getLanguageQueryValues('German'),
  ['German', 'de'],
  'language queries should include canonical and ISO variants for existing rows',
)
assert.equal(languagesMatch('de', 'German'), true, 'deck filters should match existing ISO rows with canonical tabs')
assert.equal(languagesMatch('English', 'de'), false, 'deck filters should not merge unrelated languages')

const deckListClassic = readFileSync(resolve(process.cwd(), 'src/pages/Decks.tsx'), 'utf8')
const generateClassic = readFileSync(resolve(process.cwd(), 'src/pages/GeneratePG.tsx'), 'utf8')
const generateGlassy = readFileSync(resolve(process.cwd(), 'src/pages/GenerateGO.tsx'), 'utf8')
const extractWordsModal = readFileSync(resolve(process.cwd(), 'src/components/speak/ExtractWordsModal.tsx'), 'utf8')

assert.match(
  deckListClassic,
  /canonicalizeLanguageValue/,
  'Classic deck language tabs should group decks by canonical language values',
)

for (const [label, source] of [
  ['Classic generate', generateClassic],
  ['Glassy generate', generateGlassy],
] as const) {
  assert.match(
    source,
    /targetLanguage:\s*targetLanguageValue/,
    `${label} should store canonical language values in card_text decks`,
  )
  assert.doesNotMatch(
    source,
    /targetLanguage:\s*targetLanguageCode/,
    `${label} should not store ISO codes as decks.target_language`,
  )
}

assert.match(
  extractWordsModal,
  /targetLanguage:\s*targetLanguageValue/,
  'Speak extraction imports should store canonical language values in card_text decks',
)

console.log('deck language normalization contract checks passed')
