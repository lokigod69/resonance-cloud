import { useReducer, useCallback } from 'react'
import { MAX_WORDS } from './wizardData'

export type ProductLane = 'video' | 'card_standard' | 'card_premium'

export type CardImageModel = 'zturbo' | 'gpt_image_2'
export type CardLayer2MeaningStrategy =
  | 'clear_meaning'
  | 'exaggerated_meaning'
  | 'absurd_hook'
  | 'sound_mnemonic'

export type CardLayer2PresentationForm =
  | 'single_scene'
  | 'mini_story'
  | 'split_panel'
  | 'word_object_design'
  | 'infographic_card'

export type CardLayer2BackendTemplate =
  | 'structured_plan_v1'
  | 'direct_prompt_v1'
  | 'direct_prompt_v2'
  | 'direct_prompt_v3'
  | 'infographic_prompt_v1'

export type InfographicTemplate =
  | 'infographic_knowledge_guide_v1'
  | 'infographic_language_atlas_v1'
  | 'infographic_study_poster_v1'
  | 'infographic_visual_dictionary_v1'
  | 'infographic_museum_exhibit_v1'
  | 'infographic_knowledge_guide_v2'
  | 'infographic_language_atlas_v2'
  | 'infographic_study_poster_v2'
  | 'infographic_visual_dictionary_v2'
  | 'infographic_museum_exhibit_v2'
  | 'infographic_language_atlas_v3_reference'
  | 'infographic_study_knowledge_v3_reference'
  | 'infographic_museum_exhibit_v3_reference'
  | 'infographic_dense_editorial_v4'

export type CardLayer2ArtStyle =
  | 'realistic'
  | 'cinematic'
  | 'editorial'
  | 'illustration'
  | 'anime'
  | 'studio_ghibli_inspired'
  | 'disney_animation_inspired'
  | 'comic_book'
  | 'pixel_art'
  | 'vintage_film'
  | 'oil_painting'
  | 'surrealism'
  | 'fantasy_art'
  | 'pen_and_ink'
  | 'charcoal_sketch'
  | 'claymation'
  | 'ukiyo_e'
  | 'south_park_style'
  | 'rick_and_morty_style'
  | 'pixar_3d'

export type StandardCardImageStyle = 'Photorealistic' | 'Editorial' | 'Random'
export type CardImageStyle = StandardCardImageStyle | CardLayer2ArtStyle

export interface CardLayer2Customization {
  meaning_strategy: CardLayer2MeaningStrategy
  presentation_form: CardLayer2PresentationForm
}

export interface CardLayer2Payload extends CardLayer2Customization {
  visual_intensity: 'balanced'
  backend_template?: CardLayer2BackendTemplate
  infographic_template?: InfographicTemplate
  premium_quick_mode?: PremiumGenerationModeName
  premium_generation_mode?: PremiumGenerationModeMetadata
}

export type PremiumQuickMode = 'clear' | 'memorable' | 'weird' | 'word_design' | 'infographic'
export type PremiumGenerationModeName = PremiumQuickMode | 'quick_generate' | 'custom'

export interface PremiumGenerationModeMetadata {
  premium_quick_mode: PremiumGenerationModeName
  backend_template?: CardLayer2BackendTemplate
  meaning_strategy?: CardLayer2MeaningStrategy
  presentation_form?: CardLayer2PresentationForm
  art_style?: CardLayer2ArtStyle
  infographic_template?: InfographicTemplate
  prompt_version: 'premium_quick_modes_v1'
}

export interface Layer2EvalPayload {
  label: string | null
  script_index: number
  lab_run_id?: string
  original_word: string
  variant_slug: string
  quick_mode_preset?: PremiumQuickMode | 'custom'
  meaning_strategy?: CardLayer2MeaningStrategy
  presentation_form?: CardLayer2PresentationForm
  art_style?: CardLayer2ArtStyle
  backend_template?: CardLayer2BackendTemplate
  infographic_template?: InfographicTemplate
  infographic_template_label?: string
  source: 'admin_layer2_lab_v1'
}

export const DEFAULT_CARD_LAYER2: CardLayer2Customization = {
  meaning_strategy: 'clear_meaning',
  presentation_form: 'single_scene',
}

export const DEFAULT_CARD_LAYER2_ART_STYLE: CardLayer2ArtStyle = 'realistic'
export const DEFAULT_PREMIUM_QUICK_MODE: PremiumQuickMode = 'clear'

export const CARD_LAYER2_MEANING_OPTIONS: Array<{
  value: CardLayer2MeaningStrategy
  label: string
  helper: string
}> = [
  {
    value: 'clear_meaning',
    label: 'Clear Meaning',
    helper: 'Closest to Quick Generate: clean, obvious, meaning-first.',
  },
  {
    value: 'exaggerated_meaning',
    label: 'Exaggerated Meaning',
    helper: 'Pushes the same meaning through stronger action or emotion.',
  },
  {
    value: 'absurd_hook',
    label: 'Absurd Hook',
    helper: 'Adds an elegant strange memory hook while keeping the meaning readable.',
  },
  {
    value: 'sound_mnemonic',
    label: 'Mnemonic Hook',
    helper: 'Uses the best available memory bridge: sound, wordplay, roots, etymology, metaphor, or clear meaning.',
  },
]

export const CARD_LAYER2_PRESENTATION_OPTIONS: Array<{
  value: CardLayer2PresentationForm
  label: string
  helper: string
}> = [
  {
    value: 'single_scene',
    label: 'Single Scene',
    helper: 'One focused visual moment.',
  },
  {
    value: 'mini_story',
    label: 'Mini Story',
    helper: 'A compact two- or three-beat sequence in one image.',
  },
  {
    value: 'split_panel',
    label: 'Split Panel',
    helper: 'Two-part contrast, such as before/after or sound vs. meaning.',
  },
  {
    value: 'word_object_design',
    label: 'Word as Design',
    helper: 'Makes the word itself part of the image as material, form, or lettering.',
  },
  {
    value: 'infographic_card',
    label: 'Infographic',
    helper: 'A compact educational poster with a central visual anchor and short study callouts.',
  },
]

export const PREMIUM_QUICK_MODE_OPTIONS: Array<{
  value: PremiumQuickMode
  label: string
  helper: string
}> = [
  {
    value: 'clear',
    label: 'Clear',
    helper: 'Clean meaning-first scene.',
  },
  {
    value: 'memorable',
    label: 'Memorable',
    helper: 'Mnemonic-driven scene.',
  },
  {
    value: 'weird',
    label: 'Weird',
    helper: 'A strange but readable memory hook.',
  },
  {
    value: 'word_design',
    label: 'Word Design',
    helper: 'Turns the word into the visual object.',
  },
  {
    value: 'infographic',
    label: 'Infographic',
    helper: 'A beautiful study poster with compact word facts.',
  },
]

export const CARD_LAYER2_ART_STYLE_OPTIONS: Array<{
  value: CardLayer2ArtStyle
  label: string
}> = [
  { value: 'realistic', label: 'Realistic' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'anime', label: 'Anime' },
  { value: 'studio_ghibli_inspired', label: 'Studio Ghibli-inspired' },
  { value: 'disney_animation_inspired', label: 'Disney Animation-inspired' },
  { value: 'comic_book', label: 'Comic Book' },
  { value: 'pixel_art', label: 'Pixel Art' },
  { value: 'vintage_film', label: 'Vintage Film' },
  { value: 'oil_painting', label: 'Oil Painting' },
  { value: 'surrealism', label: 'Surrealism' },
  { value: 'fantasy_art', label: 'Fantasy Art' },
  { value: 'pen_and_ink', label: 'Pen and Ink' },
  { value: 'charcoal_sketch', label: 'Charcoal Sketch' },
  { value: 'claymation', label: 'Claymation' },
  { value: 'ukiyo_e', label: 'Ukiyo-e' },
  { value: 'south_park_style', label: 'South Park' },
  { value: 'rick_and_morty_style', label: 'Rick and Morty' },
  { value: 'pixar_3d', label: 'Pixar 3D' },
]

export function cardLayer2MeaningLabel(value: CardLayer2MeaningStrategy): string {
  return CARD_LAYER2_MEANING_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function cardLayer2PresentationLabel(value: CardLayer2PresentationForm): string {
  return CARD_LAYER2_PRESENTATION_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function premiumQuickModeLabel(value: PremiumGenerationModeName | string | null | undefined): string {
  if (value === 'quick_generate') return 'Quick Generate'
  if (value === 'custom') return 'Custom'
  return PREMIUM_QUICK_MODE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? ''
}

export function cardLayer2ArtStyleLabel(value: CardImageStyle | null): string {
  if (value === 'Photorealistic') return 'Realistic'
  return CARD_LAYER2_ART_STYLE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? ''
}

export function isCardLayer2ArtStyle(value: CardImageStyle | null): value is CardLayer2ArtStyle {
  return CARD_LAYER2_ART_STYLE_OPTIONS.some((option) => option.value === value)
}

export function isStandardCardImageStyle(value: CardImageStyle | null): value is StandardCardImageStyle {
  return value === 'Photorealistic' || value === 'Editorial' || value === 'Random'
}

export function resolvePremiumQuickMode(
  mode: PremiumQuickMode,
  artStyle: CardLayer2ArtStyle | null | undefined,
): {
  backend_template: CardLayer2BackendTemplate
  card_layer2: CardLayer2Payload
  metadata: PremiumGenerationModeMetadata
} {
  const selectedStyle = artStyle ?? DEFAULT_CARD_LAYER2_ART_STYLE
  const preset: Record<PremiumQuickMode, {
    backend_template: CardLayer2BackendTemplate
    meaning_strategy: CardLayer2MeaningStrategy
    presentation_form: CardLayer2PresentationForm
  }> = {
    clear: {
      backend_template: 'structured_plan_v1',
      meaning_strategy: 'clear_meaning',
      presentation_form: 'single_scene',
    },
    memorable: {
      backend_template: 'direct_prompt_v2',
      meaning_strategy: 'sound_mnemonic',
      presentation_form: 'single_scene',
    },
    weird: {
      backend_template: 'direct_prompt_v2',
      meaning_strategy: 'absurd_hook',
      presentation_form: 'single_scene',
    },
    word_design: {
      backend_template: 'direct_prompt_v2',
      meaning_strategy: 'clear_meaning',
      presentation_form: 'word_object_design',
    },
    infographic: {
      backend_template: 'direct_prompt_v3',
      meaning_strategy: 'clear_meaning',
      presentation_form: 'infographic_card',
    },
  }
  const resolved = preset[mode]
  const metadata: PremiumGenerationModeMetadata = {
    premium_quick_mode: mode,
    backend_template: resolved.backend_template,
    meaning_strategy: resolved.meaning_strategy,
    presentation_form: resolved.presentation_form,
    art_style: selectedStyle,
    prompt_version: 'premium_quick_modes_v1',
  }
  return {
    backend_template: resolved.backend_template,
    card_layer2: {
      meaning_strategy: resolved.meaning_strategy,
      presentation_form: resolved.presentation_form,
      visual_intensity: 'balanced',
      backend_template: resolved.backend_template,
      premium_quick_mode: mode,
      premium_generation_mode: metadata,
    },
    metadata,
  }
}

export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6
  path: 'undecided' | 'quick' | 'custom'
  language: string | null
  words: string[]
  vibe: string | null
  movieTitle: string | null
  artStyle: string | null
  genre: string | null
  lyricMode: string | null
  deckName: string
  productLane: ProductLane | null
  cardImageStyle: CardImageStyle | null
  cardLayer2: CardLayer2Customization | null
  premiumQuickMode: PremiumQuickMode
}

export type WizardAction =
  | { type: 'SET_LANGUAGE'; language: string }
  | { type: 'PRESELECT_LANGUAGE'; language: string }
  | { type: 'ADD_WORD'; word: string }
  | { type: 'REMOVE_WORD'; index: number }
  | { type: 'SET_WORDS'; words: string[] }
  | { type: 'SET_VIBE'; vibe: string }
  | { type: 'SET_MOVIE_TITLE'; title: string }
  | { type: 'SET_ART_STYLE'; style: string | null }
  | { type: 'SET_GENRE'; genre: string | null }
  | { type: 'SET_LYRIC_MODE'; mode: string | null }
  | { type: 'SET_DECK_NAME'; name: string }
  | { type: 'SET_PRODUCT_LANE'; lane: ProductLane | null }
  | { type: 'SET_CARD_IMAGE_STYLE'; style: CardImageStyle | null }
  | { type: 'SET_CARD_LAYER2'; value: Partial<CardLayer2Customization> | null }
  | { type: 'SET_PREMIUM_QUICK_MODE'; mode: PremiumQuickMode }
  | { type: 'GO_TO_STEP'; step: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'CHOOSE_PATH'; path: 'quick' | 'custom' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }

const initialState: WizardState = {
  step: 1,
  path: 'undecided',
  language: null,
  words: [],
  vibe: null,
  movieTitle: null,
  artStyle: null,
  genre: null,
  lyricMode: null,
  deckName: '',
  productLane: null,
  cardImageStyle: null,
  cardLayer2: null,
  premiumQuickMode: DEFAULT_PREMIUM_QUICK_MODE,
}

// ── Lane helpers (pure, exported for tests and callers) ─────────────────────

export function isCardLane(
  lane: ProductLane | null | undefined,
): lane is 'card_standard' | 'card_premium' {
  return lane === 'card_standard' || lane === 'card_premium'
}

export function laneToDeckType(lane: ProductLane | null | undefined): 'video' | 'card' | null {
  if (lane === 'video') return 'video'
  if (isCardLane(lane)) return 'card'
  return null
}

export function laneToCardImageModel(
  lane: ProductLane | null | undefined,
): CardImageModel | null {
  if (lane === 'card_standard') return 'zturbo'
  if (lane === 'card_premium') return 'gpt_image_2'
  return null
}

// Translate a deck row (and optional last-used card_image_model) into a lane.
// Used when entering "Add Cards" mode to preselect the right lane.
export function deckRowToProductLane(
  deckType: 'video' | 'card' | null | undefined,
  lastCardImageModel?: string | null,
): ProductLane | null {
  if (deckType === 'video') return 'video'
  if (deckType === 'card') {
    return lastCardImageModel === 'gpt_image_2' ? 'card_premium' : 'card_standard'
  }
  return null
}

const CREDIT_COST_PER_LANE: Record<ProductLane, number> = {
  video: 10,
  card_standard: 1,
  card_premium: 5,
}

export const VIDEO_CREDIT_COST_PER_WORD = CREDIT_COST_PER_LANE.video
export const CARD_STANDARD_CREDIT_COST_PER_WORD = CREDIT_COST_PER_LANE.card_standard
export const CARD_PREMIUM_CREDIT_COST_PER_WORD = CREDIT_COST_PER_LANE.card_premium

export function laneCreditCostPerUnit(lane: ProductLane): number {
  return CREDIT_COST_PER_LANE[lane]
}

export function computeCreditCost(lane: ProductLane | null, wordCount: number): number {
  if (!lane) return 0
  return wordCount * CREDIT_COST_PER_LANE[lane]
}

// ── Reducer ─────────────────────────────────────────────────────────────────

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.language, step: 2 }

    case 'PRESELECT_LANGUAGE':
      return { ...state, language: action.language }

    case 'ADD_WORD': {
      const trimmed = action.word.trim()
      if (!trimmed) return state
      if (state.words.length >= MAX_WORDS) return state
      if (state.words.some((w) => w.toLowerCase() === trimmed.toLowerCase())) return state
      return { ...state, words: [...state.words, trimmed] }
    }

    case 'REMOVE_WORD':
      return { ...state, words: state.words.filter((_, i) => i !== action.index) }

    case 'SET_WORDS':
      return { ...state, words: action.words.slice(0, MAX_WORDS) }

    case 'SET_VIBE':
      return {
        ...state,
        vibe: action.vibe,
        movieTitle: action.vibe === 'specific_movie' ? state.movieTitle : null,
      }

    case 'SET_MOVIE_TITLE':
      return { ...state, movieTitle: action.title }

    case 'SET_ART_STYLE':
      return { ...state, artStyle: action.style }

    case 'SET_GENRE':
      return { ...state, genre: action.genre }

    case 'SET_LYRIC_MODE':
      return { ...state, lyricMode: action.mode }

    case 'SET_DECK_NAME':
      return { ...state, deckName: action.name }

    case 'SET_PRODUCT_LANE':
      return {
        ...state,
        productLane: action.lane,
        cardImageStyle:
          action.lane === 'card_premium'
            ? (isCardLayer2ArtStyle(state.cardImageStyle)
                ? state.cardImageStyle
                : DEFAULT_CARD_LAYER2_ART_STYLE)
            : action.lane === 'card_standard'
              ? (isStandardCardImageStyle(state.cardImageStyle) ? state.cardImageStyle : null)
              : null,
        cardLayer2: action.lane === 'card_premium'
          ? (state.cardLayer2 ?? DEFAULT_CARD_LAYER2)
          : null,
        premiumQuickMode: action.lane === 'card_premium'
          ? state.premiumQuickMode
          : DEFAULT_PREMIUM_QUICK_MODE,
      }

    case 'SET_CARD_IMAGE_STYLE':
      return { ...state, cardImageStyle: action.style }

    case 'SET_CARD_LAYER2':
      return {
        ...state,
        cardLayer2: action.value
          ? { ...(state.cardLayer2 ?? DEFAULT_CARD_LAYER2), ...action.value }
          : null,
      }

    case 'SET_PREMIUM_QUICK_MODE':
      return { ...state, premiumQuickMode: action.mode }

    case 'GO_TO_STEP':
      return { ...state, step: action.step }

    case 'CHOOSE_PATH':
      if (action.path === 'quick') {
        return { ...state, path: 'quick', vibe: null, artStyle: null, genre: null }
      }
      return { ...state, path: 'custom', step: 3 }

    case 'NEXT_STEP': {
      const next = Math.min(state.step + 1, 6) as WizardState['step']
      return { ...state, step: next }
    }

    case 'PREV_STEP': {
      const prev = Math.max(state.step - 1, 1) as WizardState['step']
      return { ...state, step: prev }
    }

    default:
      return state
  }
}

// ── Payload types and pure builder ──────────────────────────────────────────

export interface GeneratePayload {
  deckPayload: {
    user_id: string
    name: string
    target_language: string
    art_style: string | null
    movie_override: string | null
    word_count: number
    status: 'generating'
    deck_type: 'video' | 'card'
  } | null
  wordList: string[]
  jobPayload: {
    user_id: string
    deck_id?: string
    status: 'pending'
    target_language: string
    art_style: string | null
    movie_override: string | null
    words_total: number
    settings_override: Record<
      string,
      string | CardLayer2Payload | Layer2EvalPayload | PremiumGenerationModeMetadata | undefined
    >
  }
}

export interface ExistingDeck {
  id: string
  name: string | null
  target_language: string
  art_style: string | null
  movie_override: string | null
  word_count: number
  deck_type?: 'video' | 'card'
  /** Last-used `card_image_model` for this deck, derived from the most recent
   *  generation_jobs.settings_override. Optional — used to preselect the lane
   *  when appending to an existing card deck. */
  last_card_image_model?: 'zturbo' | 'gpt_image_2' | null
}

interface BuildPayloadOpts {
  state: WizardState
  userId: string
  existingDeck?: ExistingDeck
  /** When true, drop video-only customisations (vibe / art / niveau / genre)
   *  so a Quick-Generate submit doesn't carry stale picks the user skipped. */
  isQuickGenerate?: boolean
  premiumQuickModeOverride?: PremiumQuickMode
  /** Override the word list used for `wordList` and `*_total`. Useful when
   *  the caller has a synchronously-flushed list that hasn't yet landed in
   *  state.words. */
  wordsOverride?: string[]
}

export function buildGeneratePayload({
  state,
  userId,
  existingDeck,
  isQuickGenerate = false,
  premiumQuickModeOverride,
  wordsOverride,
}: BuildPayloadOpts): GeneratePayload {
  const lane: ProductLane =
    state.productLane
    ?? deckRowToProductLane(existingDeck?.deck_type, existingDeck?.last_card_image_model)
    ?? 'video'

  const isCard = isCardLane(lane)
  const deckType = laneToDeckType(lane) ?? 'video'
  const language = existingDeck?.target_language ?? state.language ?? ''
  const words = wordsOverride ?? state.words

  // For card lanes, video-only fields are always null. For video lanes, only
  // include them when the user actually customised (i.e. not Quick Generate).
  const movieOverride =
    !isCard && !isQuickGenerate && (state.vibe === 'movie' || state.vibe === 'specific_movie')
      ? state.movieTitle?.trim() || null
      : null

  const artStyleValue = isCard || isQuickGenerate ? null : state.artStyle || null

  const creativeDirection =
    isCard || isQuickGenerate
      ? undefined
      : state.vibe === 'specific_movie'
        ? 'movie'
        : state.vibe === 'auto'
          ? undefined
          : state.vibe || undefined

  const genre =
    isCard || isQuickGenerate
      ? undefined
      : state.genre === 'auto'
        ? undefined
        : state.genre || undefined

  const lyricMode = isCard || isQuickGenerate ? undefined : state.lyricMode || undefined

  const cardImageModel = laneToCardImageModel(lane)
  const premiumArtStyle = isCardLayer2ArtStyle(state.cardImageStyle)
    ? state.cardImageStyle
    : DEFAULT_CARD_LAYER2_ART_STYLE
  const selectedPremiumQuickMode = premiumQuickModeOverride ?? state.premiumQuickMode ?? DEFAULT_PREMIUM_QUICK_MODE
  const premiumQuick = lane === 'card_premium' && !isQuickGenerate
    ? resolvePremiumQuickMode(selectedPremiumQuickMode, premiumArtStyle)
    : null
  const isPremiumCustomize = (
    lane === 'card_premium'
    && state.path === 'custom'
    && !isQuickGenerate
    && state.cardImageStyle
  )
  const customPremiumMetadata: PremiumGenerationModeMetadata | null = isPremiumCustomize
    ? {
        premium_quick_mode: 'custom',
        backend_template: 'structured_plan_v1',
        meaning_strategy: (state.cardLayer2 ?? DEFAULT_CARD_LAYER2).meaning_strategy,
        presentation_form: (state.cardLayer2 ?? DEFAULT_CARD_LAYER2).presentation_form,
        art_style: premiumArtStyle,
        prompt_version: 'premium_quick_modes_v1',
      }
    : null
  const quickGeneratePremiumMetadata: PremiumGenerationModeMetadata | null =
    lane === 'card_premium' && isQuickGenerate
      ? {
          premium_quick_mode: 'quick_generate',
          prompt_version: 'premium_quick_modes_v1',
        }
      : null
  const cardLayer2 = isPremiumCustomize
    ? {
        ...(state.cardLayer2 ?? DEFAULT_CARD_LAYER2),
        visual_intensity: 'balanced' as const,
        premium_quick_mode: 'custom' as const,
        premium_generation_mode: customPremiumMetadata ?? undefined,
      }
    : premiumQuick?.card_layer2
  const cardImageStyleForSettings =
    lane === 'card_premium' && !isQuickGenerate
      ? premiumArtStyle
      : isCard && !isQuickGenerate && state.cardImageStyle
        ? state.cardImageStyle
        : undefined
  const premiumGenerationMode = quickGeneratePremiumMetadata ?? customPremiumMetadata ?? premiumQuick?.metadata

  return {
    deckPayload: existingDeck
      ? null
      : {
          user_id: userId,
          name:
            state.deckName.trim()
            || `${language} Deck — ${new Date().toLocaleDateString()}`,
          target_language: language,
          art_style: artStyleValue,
          movie_override: movieOverride,
          word_count: words.length,
          status: 'generating',
          deck_type: deckType,
        },
    wordList: words,
    jobPayload: {
      user_id: userId,
      ...(existingDeck ? { deck_id: existingDeck.id } : {}),
      status: 'pending',
      target_language: language,
      art_style: artStyleValue ?? existingDeck?.art_style ?? null,
      movie_override: movieOverride ?? existingDeck?.movie_override ?? null,
      words_total: words.length,
      settings_override: {
        ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
        ...(genre ? { genre } : {}),
        ...(lyricMode ? { lyric_mode: lyricMode } : {}),
        ...(cardImageModel ? { card_image_model: cardImageModel } : {}),
        ...(cardImageStyleForSettings
          ? { card_image_style: cardImageStyleForSettings }
          : {}),
        ...(cardLayer2 ? { card_layer2: cardLayer2 } : {}),
        ...(lane === 'card_premium' && premiumGenerationMode
          ? {
              premium_quick_mode: premiumGenerationMode.premium_quick_mode,
              premium_generation_mode: premiumGenerationMode,
            }
          : {}),
      },
    },
  }
}

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  const buildPayload = useCallback(
    (userId: string, existingDeck?: ExistingDeck): GeneratePayload =>
      buildGeneratePayload({ state, userId, existingDeck }),
    [state],
  )

  return { state, dispatch, buildPayload }
}
