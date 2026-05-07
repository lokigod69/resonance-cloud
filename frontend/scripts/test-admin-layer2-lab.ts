/**
 * Static tests for the admin Layer 2 Lab payload builder.
 *
 * Run: npm run test:admin-layer2-lab
 */

import {
  cardLayer2MeaningLabel,
  cardLayer2PresentationLabel,
} from '../src/components/generate/useWizardState.ts'
import {
  ADMIN_LAYER2_LAB_PRESETS,
  buildLayer2LabPayload,
  buildLayer2LabRows,
  createLayer2LabDeckName,
  createLayer2LabResultSummary,
  estimateLayer2LabCreditCost,
  getLayer2LabPresetRows,
  infographicTemplateLabel,
  INFOGRAPHIC_TEMPLATE_OPTIONS,
  isLayer2LabAppendDeck,
  layer2BackendTemplateLabel,
  LAYER2_BACKEND_TEMPLATE_OPTIONS,
  layer2VariantSlugForRow,
  normalizeLayer2LabWords,
  resolveLayer2LabQuickModePreset,
  validateLayer2LabSubmit,
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

console.log('\n[friendly labels]')
{
  assert('direct_prompt_v1 renders as LLM V1', layer2BackendTemplateLabel('direct_prompt_v1') === 'LLM V1')
  assert('direct_prompt_v2 renders as LLM V2', layer2BackendTemplateLabel('direct_prompt_v2') === 'LLM V2')
  assert('direct_prompt_v3 renders as LLM V3 · Visual Craft', layer2BackendTemplateLabel('direct_prompt_v3') === 'LLM V3 · Visual Craft')
  assert('infographic_prompt_v1 renders as Infographic Prompt V1', layer2BackendTemplateLabel('infographic_prompt_v1') === 'Infographic Prompt V1')
  assert('structured_plan_v1 renders as Compiler V1', layer2BackendTemplateLabel('structured_plan_v1') === 'Compiler V1')
  assert('backend template options use friendly labels',
    LAYER2_BACKEND_TEMPLATE_OPTIONS.map((option) => option.label).join('|') === 'Compiler V1|LLM V1|LLM V2|LLM V3 · Visual Craft',
    LAYER2_BACKEND_TEMPLATE_OPTIONS,
  )
  assert('infographic template dropdown has thirteen ordered variants',
    INFOGRAPHIC_TEMPLATE_OPTIONS.map((option) => option.value).join('|') === [
      'infographic_knowledge_guide_v1',
      'infographic_language_atlas_v1',
      'infographic_study_poster_v1',
      'infographic_visual_dictionary_v1',
      'infographic_museum_exhibit_v1',
      'infographic_knowledge_guide_v2',
      'infographic_language_atlas_v2',
      'infographic_study_poster_v2',
      'infographic_visual_dictionary_v2',
      'infographic_museum_exhibit_v2',
      'infographic_language_atlas_v3_reference',
      'infographic_study_knowledge_v3_reference',
      'infographic_museum_exhibit_v3_reference',
    ].join('|'),
    INFOGRAPHIC_TEMPLATE_OPTIONS,
  )
  assert('infographic V3 label is friendly',
    infographicTemplateLabel('infographic_study_knowledge_v3_reference') === 'V3 · Study / Knowledge Reference',
  )
  assert('infographic V2 label is friendly',
    infographicTemplateLabel('infographic_museum_exhibit_v2') === 'V2 · Museum Exhibit',
  )
  assert('sound_mnemonic renders as Mnemonic Hook', cardLayer2MeaningLabel('sound_mnemonic') === 'Mnemonic Hook')
  assert('infographic_card renders as Infographic', cardLayer2PresentationLabel('infographic_card') === 'Infographic')
}

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
    backend_template: 'direct_prompt_v1',
    label: 'small story',
  })
  assert('selected scope creates one row', rows.length === 1, rows)
  assert('selected word carried through', rows[0]?.word === 'pride', rows)
  assert('meaning strategy carried through', rows[0]?.meaning_strategy === 'absurd_hook', rows)
  assert('presentation form carried through', rows[0]?.presentation_form === 'mini_story', rows)
  assert('art style carried through', rows[0]?.art_style === 'surrealism', rows)
  assert('backend template carried through', rows[0]?.backend_template === 'direct_prompt_v1', rows)
  assert('label carried through', rows[0]?.label === 'small story', rows)
}

console.log('\n[script row builder v2 backend]')
{
  const rows = buildLayer2LabRows({
    words: ['fragrance'],
    selectedWord: 'fragrance',
    wordScope: 'selected',
    meaning_strategy: 'clear_meaning',
    presentation_form: 'single_scene',
    art_style: 'cinematic',
    backend_template: 'direct_prompt_v2',
    label: 'llm v2 smoke',
  })
  assert('direct_prompt_v2 row is accepted', rows[0]?.backend_template === 'direct_prompt_v2', rows)
}

console.log('\n[script row builder v3 backend]')
{
  const rows = buildLayer2LabRows({
    words: ['obfuscate'],
    selectedWord: 'obfuscate',
    wordScope: 'selected',
    meaning_strategy: 'absurd_hook',
    presentation_form: 'single_scene',
    art_style: 'realistic',
    backend_template: 'direct_prompt_v3',
    label: 'llm v3 visual craft smoke',
  })
  assert('direct_prompt_v3 row is accepted', rows[0]?.backend_template === 'direct_prompt_v3', rows)
}

console.log('\n[quick mode preset resolver]')
{
  const expected = {
    clear: ['clear_meaning', 'single_scene'],
    memorable: ['sound_mnemonic', 'single_scene'],
    weird: ['absurd_hook', 'single_scene'],
    word_design: ['clear_meaning', 'word_object_design'],
    infographic: ['clear_meaning', 'infographic_card'],
  } as const
  for (const [preset, [meaning, presentation]] of Object.entries(expected)) {
    const resolved = resolveLayer2LabQuickModePreset(preset as keyof typeof expected)
    assert(`${preset} preset meaning`, resolved?.meaning_strategy === meaning, resolved)
    assert(`${preset} preset presentation`, resolved?.presentation_form === presentation, resolved)
  }
  assert('custom preset does not override raw controls', resolveLayer2LabQuickModePreset('custom') === null)
}

console.log('\n[script row builder infographic form]')
{
  const rows = buildLayer2LabRows({
    words: ['ephemeral'],
    selectedWord: 'ephemeral',
    wordScope: 'selected',
    meaning_strategy: 'absurd_hook',
    presentation_form: 'infographic_card',
    art_style: 'editorial',
    backend_template: 'infographic_prompt_v1',
    infographic_template: 'infographic_visual_dictionary_v1',
    quick_mode_preset: 'infographic',
    label: 'infographic smoke',
  })
  assert('infographic_card row is accepted', rows[0]?.presentation_form === 'infographic_card', rows)
  assert('quick mode preset carried through', rows[0]?.quick_mode_preset === 'infographic', rows)
  assert('infographic template carried through', rows[0]?.infographic_template === 'infographic_visual_dictionary_v1', rows)
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
    backend_template: 'structured_plan_v1',
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
  assert('word design preset falls back to four sample rows', wordDesign.length === 4, wordDesign)
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
  const customWordDesign = getLayer2LabPresetRows('word_design_smoke', ['alpha', 'beta', 'gamma', 'delta', 'epsilon'])
  assert('word design preset uses current word chips when provided',
    customWordDesign.map((row) => row.word).join('|') === 'alpha|beta|gamma|delta|epsilon',
    customWordDesign,
  )
  assert('word design style rotation is deterministic',
    customWordDesign.map((row) => row.art_style).join('|') === 'realistic|pixar_3d|rick_and_morty_style|pen_and_ink|realistic',
    customWordDesign,
  )
  const customStyle = getLayer2LabPresetRows('style_obedience_smoke', ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'])
  assert('style obedience preset rotates styles over current words',
    customStyle.map((row) => row.art_style).join('|') === 'rick_and_morty_style|south_park_style|pixar_3d|pen_and_ink|surrealism|rick_and_morty_style',
    customStyle,
  )
  const customStory = getLayer2LabPresetRows('story_form_smoke', ['alpha', 'beta', 'gamma', 'delta'])
  assert('story preset rotates meaning/presentation/style triples over current words',
    customStory.map((row) => `${row.meaning_strategy}/${row.presentation_form}/${row.art_style}`).join('|')
      === 'absurd_hook/mini_story/surrealism|sound_mnemonic/split_panel/illustration|exaggerated_meaning/single_scene/cinematic|absurd_hook/mini_story/surrealism',
    customStory,
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
    backend_template: 'direct_prompt_v1',
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
  assert('backend_template is included in card_layer2',
    p.jobPayload.settings_override.card_layer2?.backend_template === 'direct_prompt_v1',
    p.jobPayload.settings_override,
  )
  assert('layer2_eval records backend_template',
    p.jobPayload.settings_override.layer2_eval?.backend_template === 'direct_prompt_v1',
    p.jobPayload.settings_override,
  )
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
  assert('layer2_eval preserves original visible word',
    p.jobPayload.settings_override.layer2_eval?.original_word === 'viral',
    p.jobPayload.settings_override,
  )
  assert('layer2_eval includes planned variant slug',
    p.jobPayload.settings_override.layer2_eval?.variant_slug === 'viral-l2-001',
    p.jobPayload.settings_override,
  )
}

console.log('\n[premium lab v2 payload]')
{
  const row: Layer2LabRun = {
    id: 'row-v2',
    word: 'fragrance',
    meaning_strategy: 'clear_meaning',
    presentation_form: 'single_scene',
    art_style: 'cinematic',
    backend_template: 'direct_prompt_v2',
    label: 'llm v2 smoke',
  }
  const p = buildLayer2LabPayload({
    row,
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab',
  })
  assert('sends direct_prompt_v2 in card_layer2',
    p.jobPayload.settings_override.card_layer2?.backend_template === 'direct_prompt_v2',
    p.jobPayload.settings_override,
  )
  assert('records direct_prompt_v2 in layer2_eval',
    p.jobPayload.settings_override.layer2_eval?.backend_template === 'direct_prompt_v2',
    p.jobPayload.settings_override,
  )
}

console.log('\n[premium lab v3 payload]')
{
  const row: Layer2LabRun = {
    id: 'row-v3',
    word: 'obfuscate',
    meaning_strategy: 'absurd_hook',
    presentation_form: 'single_scene',
    art_style: 'realistic',
    backend_template: 'direct_prompt_v3',
    quick_mode_preset: 'memorable',
    label: 'llm v3 visual craft smoke',
  }
  const p = buildLayer2LabPayload({
    row,
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab',
  })
  assert('sends direct_prompt_v3 in card_layer2',
    p.jobPayload.settings_override.card_layer2?.backend_template === 'direct_prompt_v3',
    p.jobPayload.settings_override,
  )
  assert('records direct_prompt_v3 in layer2_eval',
    p.jobPayload.settings_override.layer2_eval?.backend_template === 'direct_prompt_v3',
    p.jobPayload.settings_override,
  )
  assert('records quick mode preset in layer2_eval',
    p.jobPayload.settings_override.layer2_eval?.quick_mode_preset === 'memorable',
    p.jobPayload.settings_override,
  )
}

console.log('\n[premium lab infographic payload]')
{
  const row: Layer2LabRun = {
    id: 'row-infographic',
    word: 'ephemeral',
    meaning_strategy: 'absurd_hook',
    presentation_form: 'infographic_card',
    art_style: 'editorial',
    backend_template: 'infographic_prompt_v1',
    infographic_template: 'infographic_language_atlas_v2',
    label: 'infographic smoke',
  }
  const p = buildLayer2LabPayload({
    row,
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab',
  })
  assert('sends infographic_card in card_layer2',
    p.jobPayload.settings_override.card_layer2?.presentation_form === 'infographic_card',
    p.jobPayload.settings_override,
  )
  assert('infographic payload routes to dedicated backend template',
    p.jobPayload.settings_override.card_layer2?.backend_template === 'infographic_prompt_v1',
    p.jobPayload.settings_override,
  )
  assert('infographic payload includes selected template enum',
    p.jobPayload.settings_override.card_layer2?.infographic_template === 'infographic_language_atlas_v2',
    p.jobPayload.settings_override,
  )
  assert('records infographic_card in layer2_eval',
    p.jobPayload.settings_override.layer2_eval?.presentation_form === 'infographic_card',
    p.jobPayload.settings_override,
  )
  assert('records infographic template in layer2_eval',
    p.jobPayload.settings_override.layer2_eval?.infographic_template === 'infographic_language_atlas_v2',
    p.jobPayload.settings_override,
  )
  assert('infographic payload does not require raw controls',
    p.jobPayload.settings_override.layer2_eval?.meaning_strategy === undefined
      && p.jobPayload.settings_override.layer2_eval?.art_style === undefined
      && p.jobPayload.settings_override.layer2_eval?.backend_template === 'infographic_prompt_v1',
    p.jobPayload.settings_override,
  )
}

console.log('\n[premium lab V3 infographic payload]')
{
  for (const template of [
    'infographic_language_atlas_v3_reference',
    'infographic_study_knowledge_v3_reference',
    'infographic_museum_exhibit_v3_reference',
  ] as const) {
    const row: Layer2LabRun = {
      id: `row-${template}`,
      word: 'threshold',
      meaning_strategy: 'clear_meaning',
      presentation_form: 'infographic_card',
      art_style: 'editorial',
      backend_template: 'infographic_prompt_v1',
      infographic_template: template,
      quick_mode_preset: 'infographic',
      label: template,
    }
    const p = buildLayer2LabPayload({
      row,
      userId: USER,
      targetLanguage: 'English',
      baseLanguage: 'German',
      deckName: 'Layer2 Lab V3 Reference',
    })
    assert(`V3 ${template} routes through infographic backend`,
      p.jobPayload.settings_override.card_layer2?.backend_template === 'infographic_prompt_v1',
      p.jobPayload.settings_override,
    )
    assert(`V3 ${template} preserves card_layer2 template`,
      p.jobPayload.settings_override.card_layer2?.infographic_template === template,
      p.jobPayload.settings_override,
    )
    assert(`V3 ${template} records layer2_eval template`,
      p.jobPayload.settings_override.layer2_eval?.infographic_template === template,
      p.jobPayload.settings_override,
    )
  }
}

console.log('\n[repeated-word infographic template matrix]')
{
  const rows: Layer2LabRun[] = INFOGRAPHIC_TEMPLATE_OPTIONS.map((option) => ({
    id: `threshold-${option.value}`,
    word: 'threshold',
    quick_mode_preset: 'infographic',
    meaning_strategy: 'absurd_hook',
    presentation_form: 'infographic_card',
    art_style: 'editorial',
    backend_template: 'infographic_prompt_v1',
    infographic_template: option.value,
    label: option.label,
  }))
  const payloads = rows.map((row, index) => buildLayer2LabPayload({
    row,
    scriptIndex: index + 1,
    labRunId: 'safe1',
    userId: USER,
    targetLanguage: 'English',
    baseLanguage: 'German',
    deckName: 'Layer2 Lab Threshold Infographics',
  }))
  const slugs = payloads.map((payload) => payload.jobPayload.settings_override.layer2_eval?.variant_slug)
  const templates = payloads.map((payload) => payload.jobPayload.settings_override.layer2_eval?.infographic_template)

  assert('all thirteen threshold infographic rows are represented',
    payloads.length === 13 && payloads.length === INFOGRAPHIC_TEMPLATE_OPTIONS.length,
    payloads,
  )
  assert('all thirteen threshold infographic rows preserve visible word',
    payloads.every((payload) => payload.wordList[0] === 'threshold'),
    payloads.map((payload) => payload.wordList),
  )
  assert('all thirteen threshold infographic rows preserve original_word metadata',
    payloads.every((payload) => payload.jobPayload.settings_override.layer2_eval?.original_word === 'threshold'),
    payloads.map((payload) => payload.jobPayload.settings_override.layer2_eval),
  )
  assert('all thirteen threshold infographic rows route to infographic_prompt_v1',
    payloads.every((payload) =>
      payload.jobPayload.settings_override.card_layer2?.backend_template === 'infographic_prompt_v1'
      && payload.jobPayload.settings_override.layer2_eval?.backend_template === 'infographic_prompt_v1'
    ),
    payloads.map((payload) => payload.jobPayload.settings_override),
  )
  assert('all thirteen threshold infographic rows preserve per-row template enums',
    templates.join('|') === INFOGRAPHIC_TEMPLATE_OPTIONS.map((option) => option.value).join('|'),
    templates,
  )
  assert('all thirteen threshold infographic rows preserve per-row template labels',
    payloads.every((payload, index) =>
      payload.jobPayload.settings_override.layer2_eval?.infographic_template_label === INFOGRAPHIC_TEMPLATE_OPTIONS[index]?.label
    ),
    payloads.map((payload) => payload.jobPayload.settings_override.layer2_eval),
  )
  assert('all thirteen threshold infographic rows get unique tokenized slugs',
    new Set(slugs).size === 13
      && slugs[0] === 'threshold-l2-safe1-001'
      && slugs[12] === 'threshold-l2-safe1-013',
    slugs,
  )
  assert('infographic rows do not require raw meaning or art controls in layer2_eval',
    payloads.every((payload) =>
      payload.jobPayload.settings_override.layer2_eval?.meaning_strategy === undefined
      && payload.jobPayload.settings_override.layer2_eval?.art_style === undefined
      && payload.jobPayload.settings_override.layer2_eval?.presentation_form === 'infographic_card'
    ),
    payloads.map((payload) => payload.jobPayload.settings_override.layer2_eval),
  )
  assert('infographic row cost estimate is thirteen rows times five credits',
    estimateLayer2LabCreditCost(payloads.length) === 65,
  )
}

console.log('\n[per-row infographic template isolation]')
{
  const knowledgeGuide: Layer2LabRun = {
    id: 'threshold-v1-knowledge',
    word: 'threshold',
    quick_mode_preset: 'infographic',
    meaning_strategy: 'clear_meaning',
    presentation_form: 'infographic_card',
    art_style: 'editorial',
    backend_template: 'infographic_prompt_v1',
    infographic_template: 'infographic_knowledge_guide_v1',
    label: 'v1 knowledge',
  }
  const museumExhibit: Layer2LabRun = {
    ...knowledgeGuide,
    id: 'threshold-v2-museum',
    infographic_template: 'infographic_museum_exhibit_v2',
    label: 'v2 museum',
  }
  const first = buildLayer2LabPayload({
    row: knowledgeGuide,
    scriptIndex: 1,
    labRunId: 'iso1',
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab',
  })
  const second = buildLayer2LabPayload({
    row: museumExhibit,
    scriptIndex: 2,
    labRunId: 'iso1',
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab',
    existingDeck: {
      id: 'deck-iso',
      name: 'Layer2 Lab',
      target_language: 'English',
      art_style: null,
      movie_override: null,
      word_count: 1,
      deck_type: 'card',
      last_card_image_model: 'gpt_image_2',
    },
  })
  assert('row A keeps V1 Knowledge Guide template',
    first.jobPayload.settings_override.card_layer2?.infographic_template === 'infographic_knowledge_guide_v1'
      && first.jobPayload.settings_override.layer2_eval?.infographic_template === 'infographic_knowledge_guide_v1',
    first.jobPayload.settings_override,
  )
  assert('row B keeps V2 Museum Exhibit template',
    second.jobPayload.settings_override.card_layer2?.infographic_template === 'infographic_museum_exhibit_v2'
      && second.jobPayload.settings_override.layer2_eval?.infographic_template === 'infographic_museum_exhibit_v2',
    second.jobPayload.settings_override,
  )
  assert('per-row infographic slugs differ inside one deck',
    first.jobPayload.settings_override.layer2_eval?.variant_slug === 'threshold-l2-iso1-001'
      && second.jobPayload.settings_override.layer2_eval?.variant_slug === 'threshold-l2-iso1-002',
    [first.jobPayload.settings_override.layer2_eval, second.jobPayload.settings_override.layer2_eval],
  )
}

console.log('\n[repeated-word variants]')
{
  const firstRow: Layer2LabRun = {
    id: 'row-1',
    word: 'freedom',
    meaning_strategy: 'clear_meaning',
    presentation_form: 'single_scene',
    art_style: 'realistic',
    backend_template: 'structured_plan_v1',
    label: 'realistic scene',
  }
  const secondRow: Layer2LabRun = {
    ...firstRow,
    id: 'row-2',
    meaning_strategy: 'absurd_hook',
    presentation_form: 'mini_story',
    art_style: 'anime',
    label: 'anime story',
  }
  assert('same visible word gets unique planned variant slugs',
    layer2VariantSlugForRow(firstRow, 1) === 'freedom-l2-001'
      && layer2VariantSlugForRow(secondRow, 2) === 'freedom-l2-002',
  )
  const first = buildLayer2LabPayload({
    row: firstRow,
    scriptIndex: 1,
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab',
  })
  const second = buildLayer2LabPayload({
    row: secondRow,
    scriptIndex: 2,
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab',
  })
  assert('payload keeps learner-facing word unchanged for repeated variants',
    first.wordList[0] === 'freedom' && second.wordList[0] === 'freedom',
    [first.wordList, second.wordList],
  )
  assert('repeated variants carry unique metadata slugs',
    first.jobPayload.settings_override.layer2_eval?.variant_slug === 'freedom-l2-001'
      && second.jobPayload.settings_override.layer2_eval?.variant_slug === 'freedom-l2-002',
    [first.jobPayload.settings_override, second.jobPayload.settings_override],
  )
  assert('structured plan is the default backend template for rows',
    first.jobPayload.settings_override.card_layer2?.backend_template === 'structured_plan_v1',
    first.jobPayload.settings_override,
  )
}

console.log('\n[repeated-word append run tokens]')
{
  const existingDeck = {
    id: 'deck-garage',
    name: 'Layer2 Lab Garage',
    target_language: 'English',
    art_style: null,
    movie_override: null,
    word_count: 2,
    deck_type: 'card' as const,
    last_card_image_model: 'gpt_image_2' as const,
  }
  const garageRows: Layer2LabRun[] = [
    {
      id: 'garage-1',
      word: 'garage',
      meaning_strategy: 'clear_meaning',
      presentation_form: 'single_scene',
      art_style: 'realistic',
      backend_template: 'structured_plan_v1',
      label: 'first garage',
    },
    {
      id: 'garage-2',
      word: 'garage',
      meaning_strategy: 'absurd_hook',
      presentation_form: 'mini_story',
      art_style: 'cinematic',
      backend_template: 'direct_prompt_v2',
      label: 'second garage',
    },
  ]
  const firstRun = garageRows.map((row, index) => buildLayer2LabPayload({
    row,
    scriptIndex: index + 1,
    labRunId: 'r7k3',
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab Garage',
    existingDeck,
  }))
  const appendRun = garageRows.map((row, index) => buildLayer2LabPayload({
    row,
    scriptIndex: index + 1,
    labRunId: 'z9q2',
    userId: USER,
    targetLanguage: 'English',
    deckName: 'Layer2 Lab Garage',
    existingDeck,
  }))
  const slugs = [...firstRun, ...appendRun]
    .map((payload) => payload.jobPayload.settings_override.layer2_eval?.variant_slug)
  assert('first lab run with garage rows produces unique tokenized slugs',
    firstRun[0]?.jobPayload.settings_override.layer2_eval?.variant_slug === 'garage-l2-r7k3-001'
      && firstRun[1]?.jobPayload.settings_override.layer2_eval?.variant_slug === 'garage-l2-r7k3-002',
    slugs,
  )
  assert('append lab run with reset script indexes does not collide',
    appendRun[0]?.jobPayload.settings_override.layer2_eval?.variant_slug === 'garage-l2-z9q2-001'
      && appendRun[1]?.jobPayload.settings_override.layer2_eval?.variant_slug === 'garage-l2-z9q2-002'
      && new Set(slugs).size === slugs.length,
    slugs,
  )
  assert('layer2_eval records the lab run id for appended rows',
    appendRun.every((payload) => payload.jobPayload.settings_override.layer2_eval?.lab_run_id === 'z9q2'),
    appendRun.map((payload) => payload.jobPayload.settings_override.layer2_eval),
  )
  assert('payload preserves original learner-facing garage word',
    [...firstRun, ...appendRun].every((payload) =>
      payload.wordList[0] === 'garage'
      && payload.jobPayload.settings_override.layer2_eval?.original_word === 'garage'
    ),
    [...firstRun, ...appendRun].map((payload) => ({
      wordList: payload.wordList,
      layer2_eval: payload.jobPayload.settings_override.layer2_eval,
    })),
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
    backend_template: 'structured_plan_v1',
    label: 'style row',
  }
  const secondRow: Layer2LabRun = {
    id: 'row-2',
    word: 'remorse',
    meaning_strategy: 'exaggerated_meaning',
    presentation_form: 'word_object_design',
    art_style: 'pixar_3d',
    backend_template: 'direct_prompt_v1',
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
  assert('different rows can use different backend templates',
    first.jobPayload.settings_override.card_layer2?.backend_template === 'structured_plan_v1'
      && second.jobPayload.settings_override.card_layer2?.backend_template === 'direct_prompt_v1',
    [first.jobPayload.settings_override, second.jobPayload.settings_override],
  )
  assert('later row records its script index',
    second.jobPayload.settings_override.layer2_eval?.script_index === 2,
    second.jobPayload.settings_override,
  )
  const third = buildLayer2LabPayload({
    row: firstRow,
    scriptIndex: 3,
    userId: USER,
    targetLanguage: 'English',
    deckName,
    existingDeck: {
      id: 'deck-123',
      name: deckName,
      target_language: 'Spanish',
      art_style: null,
      movie_override: null,
      word_count: 9,
      deck_type: 'card',
      last_card_image_model: 'gpt_image_2',
    },
  })
  assert('append mode uses existing deck language and deck id for every row',
    third.deckPayload === null
      && third.jobPayload.deck_id === 'deck-123'
      && third.jobPayload.target_language === 'Spanish',
    third,
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

console.log('\n[append validation]')
{
  const cardDeck = {
    id: 'deck-card',
    name: 'Card Deck',
    target_language: 'English',
    art_style: null,
    movie_override: null,
    word_count: 3,
    deck_type: 'card' as const,
    last_card_image_model: 'gpt_image_2' as const,
  }
  const videoDeck = {
    ...cardDeck,
    id: 'deck-video',
    deck_type: 'video' as const,
  }
  assert('card decks are accepted for append', isLayer2LabAppendDeck(cardDeck), cardDeck)
  assert('video decks are rejected for append', !isLayer2LabAppendDeck(videoDeck), videoDeck)
  assert('append mode requires selected deck',
    validateLayer2LabSubmit({ mode: 'append', rowCount: 1, existingDeck: null }) === 'Select a card deck before appending lab rows.',
  )
  assert('append mode accepts selected card deck',
    validateLayer2LabSubmit({ mode: 'append', rowCount: 1, existingDeck: cardDeck }) === null,
  )
  assert('create-new mode does not require selected deck',
    validateLayer2LabSubmit({ mode: 'create', rowCount: 1, existingDeck: null }) === null,
  )
}

if (failures > 0) {
  console.error(`\n${failures} failed, ${passes} passed`)
  process.exit(1)
}

console.log(`\n${passes} passed, 0 failed`)
