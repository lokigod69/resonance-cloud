/**
 * Contract tests for the Phase 2C Lens save payload mapping.
 *
 * Run: tsx scripts/test-lens-save-mapping.ts
 */

import {
  combineLensSaveReceipts,
  mapLensScanItemsForSave,
  parseLensSaveResult,
  reconcileLensSaveResult,
} from '../src/lib/lensSaveMapping'
import { classifyLensCameraFailure, lensCameraErrorTranslationKey } from '../src/lib/lensCamera'
import { lensItemFromAlternate } from '../src/lib/lensSelection'
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

const input = (clientId: string, item: LensScanItem = baseItem) => ({ clientId, item })

console.log('\n[rich field mapping]')
{
  const [mapped] = mapLensScanItemsForSave([input('recap-1')], { targetLanguage: 'German' })
  assert('keeps the recap client id', mapped.client_id === 'recap-1', mapped)
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
  const [phrase] = mapLensScanItemsForSave([input('phrase', { ...baseItem, target_text: 'guten Morgen' })], { targetLanguage: 'German' })
  const [single] = mapLensScanItemsForSave([input('single', { ...baseItem, target_text: 'Schlüssel' })], { targetLanguage: 'German' })
  const [articleNoun] = mapLensScanItemsForSave([input('article')], { targetLanguage: 'German' })
  const [ko] = mapLensScanItemsForSave([input('ko', { ...baseItem, target_text: '김밥' })], { targetLanguage: 'Korean' })
  const [ja] = mapLensScanItemsForSave([input('ja', { ...baseItem, target_text: '切符' })], { targetLanguage: 'Japanese' })
  assert('German multi-word phrase is true', phrase.is_phrase === true, phrase)
  assert('German single noun is false', single.is_phrase === false, single)
  assert('article plus noun is not misclassified as a phrase', articleNoun.is_phrase === false, articleNoun)
  assert('Korean single word is false', ko.is_phrase === false, ko)
  assert('Japanese single word is false', ja.is_phrase === false, ja)
}

console.log('\n[empty field dropping]')
{
  const [mapped] = mapLensScanItemsForSave([input('trimmed', {
      target_text: '  vélo  ',
      base_text: '  bicycle  ',
      transliteration: '   ',
      ipa: '',
      pos: ' noun ',
      article: undefined,
      example: '   ',
      example_gloss: '\t',
      confidence: 'medium',
    })], { targetLanguage: 'French' })

  assert('trims required fields', mapped.word === 'vélo' && mapped.translation === 'bicycle', mapped)
  assert('keeps trimmed optional value', mapped.pos === 'noun', mapped)
  assert('drops blank transliteration', !('transliteration' in mapped), mapped)
  assert('drops blank ipa', !('ipa' in mapped), mapped)
  assert('drops blank example fields', !('example' in mapped) && !('example_gloss' in mapped), mapped)

  let rejectedDuplicateIds = false
  try {
    mapLensScanItemsForSave([input('same'), input(' same ')], { targetLanguage: 'German' })
  } catch {
    rejectedDuplicateIds = true
  }
  assert('rejects duplicate normalized client ids', rejectedDuplicateIds)
}

console.log('\n[exact save receipts]')
{
  const exact = parseLensSaveResult({
    deck_id: 'deck-de',
    inserted: 1,
    skipped: 1,
    outcomes: [
      { client_id: 'recap-a', word_id: 'word-a', status: 'inserted' },
      { client_id: 'recap-b', word_id: 'word-b', status: 'skipped' },
    ],
  }, ['recap-a', 'recap-b'])
  assert('parses inserted row identity', exact.outcomes?.[0]?.clientId === 'recap-a' && exact.outcomes[0].wordId === 'word-a' && exact.outcomes[0].status === 'inserted', exact)
  assert('parses skipped existing row identity', exact.outcomes?.[1]?.clientId === 'recap-b' && exact.outcomes[1].wordId === 'word-b' && exact.outcomes[1].status === 'skipped', exact)

  const legacy = parseLensSaveResult({ deck_id: 'deck-de', inserted: 2, skipped: 0 }, ['a', 'b'])
  assert('accepts legacy count-only receipt without inventing outcomes', legacy.outcomes === null, legacy)

  let rejectedReordered = false
  try {
    parseLensSaveResult({
      deck_id: 'deck-de',
      inserted: 1,
      skipped: 1,
      outcomes: [
        { client_id: 'recap-b', word_id: 'word-b', status: 'skipped' },
        { client_id: 'recap-a', word_id: 'word-a', status: 'inserted' },
      ],
    }, ['recap-a', 'recap-b'])
  } catch {
    rejectedReordered = true
  }
  assert('rejects outcomes that cannot map position-for-position', rejectedReordered)

  let rejectedCounts = false
  try {
    parseLensSaveResult({
      deck_id: 'deck-de',
      inserted: 2,
      skipped: 0,
      outcomes: [
        { client_id: 'recap-a', word_id: 'word-a', status: 'inserted' },
        { client_id: 'recap-b', word_id: 'word-b', status: 'skipped' },
      ],
    }, ['recap-a', 'recap-b'])
  } catch {
    rejectedCounts = true
  }
  assert('rejects count/outcome disagreement', rejectedCounts)

  const tracked = [
    { id: 'recap-a', saved: false },
    { id: 'recap-b', saved: false },
    { id: 'unsubmitted', saved: false },
  ]
  const reconciled = reconcileLensSaveResult(tracked, ['recap-a', 'recap-b'], exact)
  assert('marks only the exact inserted recap row saved', reconciled[0].saved === true && reconciled[0].wordId === 'word-a', reconciled)
  assert('marks only the exact skipped recap row known', reconciled[1].alreadyPresent === true && reconciled[1].wordId === 'word-b', reconciled)
  assert('leaves unsubmitted recap rows retryable', !reconciled[2].saved && !reconciled[2].alreadyPresent, reconciled)

  const legacyMixed = reconcileLensSaveResult(tracked, ['recap-a', 'recap-b'], {
    deckId: 'deck-de',
    inserted: 1,
    skipped: 1,
    outcomes: null,
  })
  assert('legacy mixed counts never guess per-row outcomes', legacyMixed.every((item) => !item.saved && !item.alreadyPresent), legacyMixed)
}

console.log('\n[multi-language receipt]')
{
  const receipt = combineLensSaveReceipts([
    { language: 'German', result: { deckId: 'deck-de', inserted: 1, skipped: 1, outcomes: [] } },
    { language: 'French', result: { deckId: 'deck-fr', inserted: 2, skipped: 0, outcomes: [] } },
  ])
  assert('combines saved and known counts across languages', receipt?.inserted === 3 && receipt.skipped === 1, receipt)
  assert('keeps both language deck links', receipt?.decks.length === 2 && receipt.decks[0].language === 'German' && receipt.decks[1].language === 'French', receipt)
}

console.log('\n[alternate selection]')
{
  const alternate = lensItemFromAlternate({ target_text: ' die Taste ', base_text: ' keyboard key ' })
  assert('trims alternate target/base', alternate.target_text === 'die Taste' && alternate.base_text === 'keyboard key', alternate)
  assert('does not inherit primary grammatical metadata', !alternate.ipa && !alternate.article && !alternate.pos, alternate)
  assert('does not inherit primary examples', !alternate.example && !alternate.example_gloss, alternate)
  assert('uses cautious confidence without nested alternates', alternate.confidence === 'medium' && !alternate.alternates, alternate)
}

console.log('\n[camera failures]')
{
  assert('permission denial stays distinct', classifyLensCameraFailure({ name: 'NotAllowedError' }) === 'permission')
  assert('missing camera is localized separately', lensCameraErrorTranslationKey(classifyLensCameraFailure({ name: 'NotFoundError' })) === 'lens.camera.notFound')
  assert('busy camera is localized separately', lensCameraErrorTranslationKey(classifyLensCameraFailure({ name: 'NotReadableError' })) === 'lens.camera.notReadable')
}

if (failures > 0) {
  console.error(`\nLens save mapping: ${failures} failed, ${passes} passed`)
  process.exit(1)
}

console.log(`\nLens save mapping: ${passes} passed`)
