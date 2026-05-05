/**
 * Static tests for the admin Layer 2 Lab payload builder.
 *
 * Run: npm run test:admin-layer2-lab
 */

import {
  ADMIN_LAYER2_LAB_PRESETS,
  buildLayer2LabPayload,
  buildLayer2LabRows,
  createLayer2LabDeckName,
  createLayer2LabResultSummary,
  estimateLayer2LabCreditCost,
  getLayer2LabPresetRows,
  normalizeLayer2LabWords,
  type Layer2LabRun,
} from '../src/lib/adminLayer2Lab.ts'

let failures = 0
let passes = 0

function assert(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passes += 1
    console.log(`  ok  ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`)
    if (detail !== undefined) console.error('       ', detail)
  }
}

const USER = '00000000-0000-0000-0000-000000000001'

console.log('\n[word normalization]')
{
  const words = normalizeLayer2LabWords(' pride, remorse\nflowers, pride ')
  assert('splits comma/newline input and dedupes', words.join('|') === 'pride|remorse|flowers', words)
}

console.log('\n[script row builder]')
{
  const rows = buildLayer2LabRows({
    words: ['pride', 'remorse'],
    selectedWord: 'pride',
    wordScope: 'selected',
    meaning_strategy: 'absurd_hook',
    presentation_form: 'mini_story',
    art_style: 'surrealism',
    label: 'small story',
  })
  assert('selected scope creates one row', rows.length === 1, rows)
  assert('selected word carried through', rows[0]?.word === 'pride', rows)
  assert('meaning strategy carried through', rows[0]?.meaning_strategy === 'absurd_hook', rows)
  assert('presentation form carried through', rows[0]?.presentation_form === 'mini_story', rows)
  assert('art style carried through', rows[0]?.art_style === 'surrealism', rows)
  assert('label carried through', rows[0]?.label === 'small story', rows)
}

console.log('\n[all-word script rows]')
{
  const rows = buildLayer2LabRows({
    words: ['pride', 'remorse'],
    selectedWord: null,
    wordScope: 'all',
    meaning_strategy: 'clear_meaning',
    presentation_form: 'single_scene',
    art_style: 'realistic',
    label: '',
  })
  assert('all scope creates one row per word', rows.length === 2, rows)
  assert('empty label normalizes to null', rows.every((row) => row.label === null), rows)
}

console.log('\n[presets]')
{
  const wordDesign = getLayer2LabPresetRows('word_design_smoke')
  const style = getLayer2LabPresetRows('style_obedience_smoke')
  const story = getLayer2LabPresetRows('story_form_smoke')
  assert('three presets are registered', ADMIN_LAYER2_LAB_PRESETS.length === 3)
  assert('word design preset has four rows', wordDesign.length === 4, wordDesign)
  assert('word design includes prejudice Rick/Morty row',
    wordDesign.some((row) =>
      row.word === 'prejudice'
      && row.presentation_form === 'word_object_design'
      && row.art_style === 'rick_and_morty_style'
    ),
    wordDesign,
  )
  assert('style preset includes south park row',
    style.some((row) => row.word === 'pride' && row.art_style === 'south_park_style'),
    style,
  )
  assert('story preset includes sound mnemonic split panel',
    story.some((row) =>
      row.word === 'shipwreck'
      && row.meaning_strategy === 'sound_mnemonic'
      && row.presentation_form === 'split_panel'
    ),
    story,
  )
}

console.log('\n[premium lab payload]')
{
  const row: Layer2LabRun = {
    id: 'row-1',
    word: 'viral',
    meaning_strategy: 'absurd_hook',
    presentation_form: 'mini_story',
    art_style: 'surrealism',
    label: 'viral story',
  }
  const p = buildLayer2LabPayload({
    row,
    userId: USER,
    targetLanguage: 'English',
    deckName: createLayer2LabDeckName('Layer2 Lab', '2026-05-05T10:00:00.000Z'),
  })
  assert('creates a card deck payload', p.deckPayload?.deck_type === 'card', p.deckPayload)
  assert('one word per lab job', p.wordList.length === 1 && p.wordList[0] === 'viral', p.wordList)
  assert('uses GPT Image-2 card model', p.jobPayload.settings_override.card_image_model === 'gpt_image_2', p.jobPayload.settings_override)
  assert('sends card_image_style', p.jobPayload.settings_override.card_image_style === 'surrealism', p.jobPayload.settings_override)
  assert('sends layer2 meaning strategy', p.jobPayload.settings_override.card_layer2?.meaning_strategy === 'absurd_hook', p.jobPayload.settings_override)
  assert('sends layer2 presentation form', p.jobPayload.settings_override.card_layer2?.presentation_form === 'mini_story', p.jobPayload.settings_override)
  assert('visual_intensity is always balanced', p.jobPayload.settings_override.card_layer2?.visual_intensity === 'balanced', p.jobPayload.settings_override)
  assert('no Standard Card model used', p.jobPayload.settings_override.card_image_model !== 'zturbo', p.jobPayload.settings_override)
  assert('no video settings used', !('creative_direction' in p.jobPayload.settings_override) && !('genre' in p.jobPayload.settings_override), p.jobPayload.settings_override)
  assert('layer2_eval metadata is attached to settings_override',
    p.jobPayload.settings_override.layer2_eval?.source === 'admin_layer2_lab_v1'
      && p.jobPayload.settings_override.layer2_eval?.label === 'viral story',
    p.jobPayload.settings_override,
  )
  assert('first row records one-based script index',
    p.jobPayload.settings_override.layer2_eval?.script_index === 1,
    p.jobPayload.settings_override,
  )
}

console.log('\n[one-deck append plan]')
{
  const deckName = createLayer2LabDeckName('Layer2 Lab', '2026-05-05T10:00:00.000Z')
  const firstRow: Layer2LabRun = {
    id: 'row-1',
    word: 'prejudice',
    meaning_strategy: 'clear_meaning',
    presentation_form: 'single_scene',
    art_style: 'rick_and_morty_style',
    label: 'style row',
  }
  const secondRow: Layer2LabRun = {
    id: 'row-2',
    word: 'remorse',
    meaning_strategy: 'exaggerated_meaning',
    presentation_form: 'word_object_design',
    art_style: 'pixar_3d',
    label: 'word design row',
  }
  const first = buildLayer2LabPayload({
    row: firstRow,
    scriptIndex: 1,
    userId: USER,
    targetLanguage: 'English',
    deckName,
  })
  const second = buildLayer2LabPayload({
    row: secondRow,
    scriptIndex: 2,
    userId: USER,
    targetLanguage: 'English',
    deckName,
    existingDeck: {
      id: 'deck-123',
      name: deckName,
      target_language: 'English',
      art_style: null,
      movie_override: null,
      word_count: 0,
      deck_type: 'card',
      last_card_image_model: 'gpt_image_2',
    },
  })
  assert('first submit creates the deck', first.deckPayload?.name === deckName && !first.jobPayload.deck_id, first)
  assert('later submit appends to the same deck id',
    second.deckPayload === null && second.jobPayload.deck_id === 'deck-123',
    second,
  )
  assert('each row has its own art style',
    first.jobPayload.settings_override.card_image_style === 'rick_and_morty_style'
      && second.jobPayload.settings_override.card_image_style === 'pixar_3d',
    [first.jobPayload.settings_override, second.jobPayload.settings_override],
  )
  assert('each row has its own layer2 settings',
    first.jobPayload.settings_override.card_layer2?.presentation_form === 'single_scene'
      && second.jobPayload.settings_override.card_layer2?.presentation_form === 'word_object_design'
      && second.jobPayload.settings_override.card_layer2?.meaning_strategy === 'exaggerated_meaning',
    [first.jobPayload.settings_override, second.jobPayload.settings_override],
  )
  assert('later row records its script index',
    second.jobPayload.settings_override.layer2_eval?.script_index === 2,
    second.jobPayload.settings_override,
  )
}

console.log('\n[cost and failure summary]')
{
  assert('estimated cost is five credits per script row', estimateLayer2LabCreditCost(3) === 15)
  const summary = createLayer2LabResultSummary({
    deckId: 'deck-123',
    deckName: 'Layer2 Lab',
    totalRows: 3,
    submittedRows: 2,
    failedRows: [
      { scriptIndex: 3, word: 'viral', label: 'story row', reason: 'network timeout' },
    ],
  })
  assert('partial failure summary keeps created deck link',
    summary.deckId === 'deck-123' && summary.submittedRows === 2 && summary.failedRows.length === 1,
    summary,
  )
  assert('partial failure summary exposes failed row reason',
    summary.failedRows[0]?.label === 'story row' && summary.failedRows[0]?.reason === 'network timeout',
    summary,
  )
}

if (failures > 0) {
  console.error(`\n${failures} failed, ${passes} passed`)
  process.exit(1)
}

console.log(`\n${passes} passed, 0 failed`)
