/**
 * Static test for the product-lane → submit_generation payload mapping.
 *
 * Exercises the pure `buildGeneratePayload` helper from useWizardState so the
 * lane redesign cannot silently regress the wire format the backend RPC and
 * card_worker expect.
 *
 * Run:  npm run test:lane-payload
 * Or:   tsx frontend/scripts/test-product-lane-payload.ts
 */

import {
  CARD_LAYER2_ART_STYLE_OPTIONS,
  CARD_LAYER2_MEANING_OPTIONS,
  CARD_LAYER2_PRESENTATION_OPTIONS,
  PREMIUM_QUICK_MODE_OPTIONS,
  buildGeneratePayload,
  computeCreditCost,
  deckRowToProductLane,
  isCardLane,
  laneToCardImageModel,
  laneToDeckType,
  premiumQuickModeLabel,
  resolvePremiumQuickMode,
  type ExistingDeck,
  type ProductLane,
  type WizardState,
} from '../src/components/generate/useWizardState.ts'

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

function makeState(partial: Partial<WizardState>): WizardState {
  return {
    step: 1,
    path: 'undecided',
    language: 'German',
    words: ['heimweh'],
    vibe: null,
    movieTitle: null,
    artStyle: null,
    genre: null,
    lyricMode: null,
    deckName: '',
    productLane: null,
    cardImageStyle: null,
    cardLayer2: null,
    premiumQuickMode: 'clear',
    ...partial,
  }
}

const USER = '00000000-0000-0000-0000-000000000001'

console.log('\n[lane-helpers]')
assert('laneToDeckType(video) = video', laneToDeckType('video') === 'video')
assert('laneToDeckType(card_standard) = card', laneToDeckType('card_standard') === 'card')
assert('laneToDeckType(card_premium) = card', laneToDeckType('card_premium') === 'card')
assert('laneToCardImageModel(video) = null', laneToCardImageModel('video') === null)
assert(
  'laneToCardImageModel(card_standard) = zturbo',
  laneToCardImageModel('card_standard') === 'zturbo',
)
assert(
  'laneToCardImageModel(card_premium) = gpt_image_2',
  laneToCardImageModel('card_premium') === 'gpt_image_2',
)
assert('isCardLane(video) = false', isCardLane('video') === false)
assert('isCardLane(card_standard) = true', isCardLane('card_standard') === true)
assert('isCardLane(card_premium) = true', isCardLane('card_premium') === true)

console.log('\n[deckRowToProductLane]')
assert('video deck → video', deckRowToProductLane('video') === 'video')
assert(
  'card deck + zturbo last → card_standard',
  deckRowToProductLane('card', 'zturbo') === 'card_standard',
)
assert(
  'card deck + gpt_image_2 last → card_premium',
  deckRowToProductLane('card', 'gpt_image_2') === 'card_premium',
)
assert(
  'card deck + null last → card_standard',
  deckRowToProductLane('card', null) === 'card_standard',
)

console.log('\n[computeCreditCost]')
assert('video × 5 = 50', computeCreditCost('video', 5) === 50)
assert('card_standard × 3 = 3', computeCreditCost('card_standard', 3) === 3)
assert('card_premium × 3 = 15', computeCreditCost('card_premium', 3) === 15)
assert('null lane → 0', computeCreditCost(null, 5) === 0)

function settingsOf(lane: ProductLane, opts: Partial<WizardState> = {}) {
  const state = makeState({ productLane: lane, ...opts })
  return buildGeneratePayload({ state, userId: USER })
}

console.log('\n[video lane payload]')
{
  const p = settingsOf('video')
  assert(
    'deck_type=video',
    p.deckPayload?.deck_type === 'video',
    p.deckPayload,
  )
  assert(
    'jobPayload has no card_image_model',
    !('card_image_model' in p.jobPayload.settings_override),
    p.jobPayload.settings_override,
  )
  assert(
    'jobPayload has no card_image_style',
    !('card_image_style' in p.jobPayload.settings_override),
    p.jobPayload.settings_override,
  )
}

console.log('\n[standard card payload]')
{
  const p = settingsOf('card_standard')
  assert('deck_type=card', p.deckPayload?.deck_type === 'card', p.deckPayload)
  assert(
    'card_image_model=zturbo',
    p.jobPayload.settings_override.card_image_model === 'zturbo',
    p.jobPayload.settings_override,
  )
  assert(
    'art_style is null on deck',
    p.deckPayload?.art_style === null,
    p.deckPayload,
  )
  assert(
    'movie_override is null on deck',
    p.deckPayload?.movie_override === null,
    p.deckPayload,
  )
  assert(
    'no creative_direction on card lane',
    !('creative_direction' in p.jobPayload.settings_override),
  )
  assert(
    'no genre on card lane',
    !('genre' in p.jobPayload.settings_override),
  )
}

console.log('\n[premium card payload]')
{
  const p = buildGeneratePayload({
    state: makeState({ productLane: 'card_premium', cardImageStyle: 'realistic' }),
    userId: USER,
    premiumQuickModeOverride: 'clear',
  })
  assert('deck_type=card', p.deckPayload?.deck_type === 'card', p.deckPayload)
  assert(
    'card_image_model=gpt_image_2',
    p.jobPayload.settings_override.card_image_model === 'gpt_image_2',
    p.jobPayload.settings_override,
  )
  assert(
    'premium default quick mode sends Compiler V1 layer2',
    p.jobPayload.settings_override.card_layer2?.backend_template === 'structured_plan_v1'
      && p.jobPayload.settings_override.card_layer2?.meaning_strategy === 'clear_meaning'
      && p.jobPayload.settings_override.card_layer2?.presentation_form === 'single_scene',
    p.jobPayload.settings_override,
  )
  assert(
    'premium quick mode metadata is included',
    p.jobPayload.settings_override.premium_quick_mode === 'clear'
      && p.jobPayload.settings_override.premium_generation_mode?.premium_quick_mode === 'clear',
    p.jobPayload.settings_override,
  )
}

console.log('\n[premium quick mode resolver]')
{
  const expected = {
    clear: ['structured_plan_v1', 'clear_meaning', 'single_scene'],
    memorable: ['direct_prompt_v2', 'sound_mnemonic', 'single_scene'],
    weird: ['direct_prompt_v2', 'absurd_hook', 'single_scene'],
    word_design: ['direct_prompt_v2', 'clear_meaning', 'word_object_design'],
    infographic: ['direct_prompt_v3', 'clear_meaning', 'infographic_card'],
  } as const
  for (const [mode, [backend, meaning, presentation]] of Object.entries(expected)) {
    const resolved = resolvePremiumQuickMode(mode as keyof typeof expected, 'surrealism')
    assert(`${mode} backend`, resolved.backend_template === backend, resolved)
    assert(`${mode} meaning`, resolved.card_layer2.meaning_strategy === meaning, resolved)
    assert(`${mode} presentation`, resolved.card_layer2.presentation_form === presentation, resolved)
    assert(`${mode} style`, resolved.metadata.art_style === 'surrealism', resolved)
    assert(`${mode} metadata`, resolved.metadata.premium_quick_mode === mode, resolved)
  }
  assert(
    'non-infographic premium quick modes do not route to LLM V3 by default',
    Object.keys(expected).every((mode) =>
      mode === 'infographic'
      || resolvePremiumQuickMode(mode as keyof typeof expected, 'surrealism').backend_template !== 'direct_prompt_v3'
    ),
  )
  assert(
    'infographic premium quick mode routes to LLM V3',
    resolvePremiumQuickMode('infographic', 'surrealism').backend_template === 'direct_prompt_v3',
  )
  assert(
    'quick mode options expose friendly labels only',
    PREMIUM_QUICK_MODE_OPTIONS.map((option) => option.label).join('|') === 'Clear|Memorable|Weird|Word Design|Infographic',
    PREMIUM_QUICK_MODE_OPTIONS,
  )
  assert('word_design label is friendly', premiumQuickModeLabel('word_design') === 'Word Design')
  assert('quick_generate label is friendly', premiumQuickModeLabel('quick_generate') === 'Quick Generate')
}

console.log('\n[premium customize layer2 payload]')
{
  const p = buildGeneratePayload({
    state: makeState({
      productLane: 'card_premium',
      path: 'custom',
      cardImageStyle: 'surrealism',
      cardLayer2: {
        meaning_strategy: 'absurd_hook',
        presentation_form: 'mini_story',
      },
    }),
    userId: USER,
  })
  assert(
    'card_image_style sends selected layer2 art style',
    p.jobPayload.settings_override.card_image_style === 'surrealism',
    p.jobPayload.settings_override,
  )
  assert(
    'card_layer2 meaning_strategy included',
    p.jobPayload.settings_override.card_layer2?.meaning_strategy === 'absurd_hook',
    p.jobPayload.settings_override,
  )
  assert(
    'card_layer2 presentation_form included',
    p.jobPayload.settings_override.card_layer2?.presentation_form === 'mini_story',
    p.jobPayload.settings_override,
  )
  assert(
    'visual_intensity defaults to balanced',
    p.jobPayload.settings_override.card_layer2?.visual_intensity === 'balanced',
    p.jobPayload.settings_override,
  )
}

console.log('\n[standard card payload does not use layer2]')
{
  const p = settingsOf('card_standard', {
    cardImageStyle: 'Editorial',
    cardLayer2: {
      meaning_strategy: 'absurd_hook',
      presentation_form: 'mini_story',
    },
  })
  assert(
    'standard card keeps current card_image_style path',
    p.jobPayload.settings_override.card_image_style === 'Editorial',
    p.jobPayload.settings_override,
  )
  assert(
    'standard card omits card_layer2',
    !('card_layer2' in p.jobPayload.settings_override),
    p.jobPayload.settings_override,
  )
}

console.log('\n[premium quick generate omits layer2 customizations]')
{
  const p = buildGeneratePayload({
    state: makeState({
      productLane: 'card_premium',
      path: 'custom',
      cardImageStyle: 'surrealism',
      premiumQuickMode: 'weird',
      cardLayer2: {
        meaning_strategy: 'sound_mnemonic',
        presentation_form: 'split_panel',
      },
    }),
    userId: USER,
    isQuickGenerate: true,
  })
  assert(
    'premium quick still sends GPT model',
    p.jobPayload.settings_override.card_image_model === 'gpt_image_2',
    p.jobPayload.settings_override,
  )
  assert(
    'premium quick keeps existing no-layer2 behavior',
    !('card_layer2' in p.jobPayload.settings_override),
    p.jobPayload.settings_override,
  )
  assert(
    'premium quick keeps existing no-art-style behavior',
    !('card_image_style' in p.jobPayload.settings_override),
    p.jobPayload.settings_override,
  )
  assert('premium quick records quick_generate mode', p.jobPayload.settings_override.premium_quick_mode === 'quick_generate')
}

console.log('\n[card lane omits card_image_style when null]')
{
  const p = settingsOf('card_standard', { cardImageStyle: null })
  assert(
    'no card_image_style key',
    !('card_image_style' in p.jobPayload.settings_override),
    p.jobPayload.settings_override,
  )
}

console.log('\n[layer2 exposed options]')
{
  const meanings = CARD_LAYER2_MEANING_OPTIONS.map((option) => option.value)
  const presentations = CARD_LAYER2_PRESENTATION_OPTIONS.map((option) => option.value)
  const styles = CARD_LAYER2_ART_STYLE_OPTIONS.map((option) => option.value)
  assert(
    'all exposed meaning strategies are valid',
    ['clear_meaning', 'exaggerated_meaning', 'absurd_hook', 'sound_mnemonic']
      .every((value) => meanings.includes(value as typeof meanings[number])),
    meanings,
  )
  assert(
    'all exposed presentation forms are valid',
    ['single_scene', 'mini_story', 'split_panel', 'word_object_design', 'infographic_card']
      .every((value) => presentations.includes(value as typeof presentations[number])),
    presentations,
  )
  assert('20 art styles exposed', styles.length === 20, styles)
  assert(
    'requested animation styles are exposed',
    ['south_park_style', 'rick_and_morty_style', 'pixar_3d']
      .every((value) => styles.includes(value as typeof styles[number])),
    styles,
  )
  assert(
    'removed ornamental styles are not exposed',
    !['art_deco', 'art_nouveau', 'chinese_ink_wash']
      .some((value) => styles.includes(value as typeof styles[number])),
    styles,
  )
  assert(
    'friendly labels are not raw enum values',
    CARD_LAYER2_MEANING_OPTIONS.every((option) => !option.label.includes('_'))
      && CARD_LAYER2_PRESENTATION_OPTIONS.every((option) => !option.label.includes('_'))
      && CARD_LAYER2_ART_STYLE_OPTIONS.every((option) => !option.label.includes('_')),
  )
}

console.log('\n[Quick Generate drops video customisations]')
{
  const state = makeState({
    productLane: 'video',
    vibe: 'cinematic',
    artStyle: 'oil_painting',
    genre: 'jazz',
    lyricMode: 'reliable',
  })
  const p = buildGeneratePayload({ state, userId: USER, isQuickGenerate: true })
  assert(
    'no creative_direction on quick',
    !('creative_direction' in p.jobPayload.settings_override),
  )
  assert(
    'no genre on quick',
    !('genre' in p.jobPayload.settings_override),
  )
  assert(
    'no lyric_mode on quick',
    !('lyric_mode' in p.jobPayload.settings_override),
  )
  assert('art_style nulled on quick', p.deckPayload?.art_style === null)
}

console.log('\n[append-cards: existing video deck → video lane locked]')
{
  const existing: ExistingDeck = {
    id: 'd1',
    name: 'My Video Deck',
    target_language: 'German',
    art_style: null,
    movie_override: null,
    word_count: 0,
    deck_type: 'video',
  }
  // No productLane set: builder should fall back to the deck row → 'video'.
  const state = makeState({ productLane: null })
  const p = buildGeneratePayload({ state, userId: USER, existingDeck: existing })
  assert(
    'existing video deck → no card_image_model',
    !('card_image_model' in p.jobPayload.settings_override),
  )
  assert(
    'deckPayload null on append',
    p.deckPayload === null,
  )
  assert(
    'jobPayload deck_id set',
    p.jobPayload.deck_id === 'd1',
  )
}

console.log('\n[append-cards: existing card deck preselect from last card_image_model]')
{
  const existing: ExistingDeck = {
    id: 'd2',
    name: 'My Card Deck',
    target_language: 'German',
    art_style: null,
    movie_override: null,
    word_count: 0,
    deck_type: 'card',
    last_card_image_model: 'gpt_image_2',
  }
  // No productLane set: builder should derive premium from the last card_image_model.
  const state = makeState({ productLane: null })
  const p = buildGeneratePayload({ state, userId: USER, existingDeck: existing })
  assert(
    'existing card deck (premium history) → card_image_model=gpt_image_2',
    p.jobPayload.settings_override.card_image_model === 'gpt_image_2',
    p.jobPayload.settings_override,
  )
}

console.log('\n[append-cards: existing card deck without history defaults to standard]')
{
  const existing: ExistingDeck = {
    id: 'd3',
    name: 'My Card Deck',
    target_language: 'German',
    art_style: null,
    movie_override: null,
    word_count: 0,
    deck_type: 'card',
    last_card_image_model: null,
  }
  const state = makeState({ productLane: null })
  const p = buildGeneratePayload({ state, userId: USER, existingDeck: existing })
  assert(
    'no history → card_image_model=zturbo',
    p.jobPayload.settings_override.card_image_model === 'zturbo',
  )
}

console.log('\n[append-cards: user picks Premium on a previously Standard deck]')
{
  const existing: ExistingDeck = {
    id: 'd4',
    name: 'My Card Deck',
    target_language: 'German',
    art_style: null,
    movie_override: null,
    word_count: 0,
    deck_type: 'card',
    last_card_image_model: 'zturbo',
  }
  // User explicitly switched the lane to Premium.
  const state = makeState({ productLane: 'card_premium' })
  const p = buildGeneratePayload({ state, userId: USER, existingDeck: existing })
  assert(
    'user override → card_image_model=gpt_image_2',
    p.jobPayload.settings_override.card_image_model === 'gpt_image_2',
  )
}

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
