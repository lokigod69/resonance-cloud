/**
 * Contract tests for the Phase 2C Lens save payload mapping.
 *
 * Run: tsx scripts/test-lens-save-mapping.ts
 */

import { mapLensScanItemsForSave } from '../src/lib/lensSaveMapping'
import type { LensScanItem } from '../src/lib/lensTypes'

let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`)
    if (detail !== undefined) console.error('       ', detail)
  }
}

const baseItem: LensScanItem = {
  target_text: 'der Schlüssel',
  base_text: 'key',
  transliteration: 'der Schluessel',
  ipa: 'ˈʃlʏsl̩',
  pos: 'noun',
  article: 'der',
  example: 'Der Schlüssel ist hier.',
  example_gloss: 'The key is here.',
  confidence: 'high',
}

console.log('\n[rich field mapping]')
{
  const [mapped] = mapLensScanItemsForSave([baseItem], { targetLanguage: 'German' })
  assert('maps target_text to word', mapped.word === 'der Schlüssel', mapped)
  assert('maps base_text to translation', mapped.translation === 'key', mapped)
  assert('keeps ipa', mapped.ipa === 'ˈʃlʏsl̩', mapped)
  assert('keeps pos', mapped.pos === 'noun', mapped)
  assert('keeps article', mapped.article === 'der', mapped)
  assert('keeps example', mapped.example === 'Der Schlüssel ist hier.', mapped)
  assert('keeps example_gloss', mapped.example_gloss === 'The key is here.', mapped)
  assert('passes transliteration through', mapped.transliteration === 'der Schluessel', mapped)
}

console.log('\n[phrase heuristic]')
{
  const [phrase] = mapLensScanItemsForSave([{ ...baseItem, target_text: 'guten Morgen' }], { targetLanguage: 'German' })
  const [single] = mapLensScanItemsForSave([{ ...baseItem, target_text: 'Schlüssel' }], { targetLanguage: 'German' })
  const [ko] = mapLensScanItemsForSave([{ ...baseItem, target_text: '김밥' }], { targetLanguage: 'Korean' })
  const [ja] = mapLensScanItemsForSave([{ ...baseItem, target_text: '切符' }], { targetLanguage: 'Japanese' })
  assert('German multi-word phrase is true', phrase.is_phrase === true, phrase)
  assert('German single noun is false', single.is_phrase === false, single)
  assert('Korean single word is false', ko.is_phrase === false, ko)
  assert('Japanese single word is false', ja.is_phrase === false, ja)
}

console.log('\n[empty field dropping]')
{
  const [mapped] = mapLensScanItemsForSave([
    {
      target_text: '  vélo  ',
      base_text: '  bicycle  ',
      transliteration: '   ',
      ipa: '',
      pos: ' noun ',
      article: undefined,
      example: '   ',
      example_gloss: '\t',
      confidence: 'medium',
    },
  ], { targetLanguage: 'French' })

  assert('trims required fields', mapped.word === 'vélo' && mapped.translation === 'bicycle', mapped)
  assert('keeps trimmed optional value', mapped.pos === 'noun', mapped)
  assert('drops blank transliteration', !('transliteration' in mapped), mapped)
  assert('drops blank ipa', !('ipa' in mapped), mapped)
  assert('drops blank example fields', !('example' in mapped) && !('example_gloss' in mapped), mapped)
}

if (failures > 0) {
  console.error(`\nLens save mapping: ${failures} failed, ${passes} passed`)
  process.exit(1)
}

console.log(`\nLens save mapping: ${passes} passed`)
