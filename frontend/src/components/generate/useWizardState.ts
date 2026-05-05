import { useReducer, useCallback } from 'react'
import { MAX_WORDS } from './wizardData'

export type ProductLane = 'video' | 'card_standard' | 'card_premium'

export type CardImageModel = 'zturbo' | 'gpt_image_2'

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
  cardImageStyle: 'Photorealistic' | 'Editorial' | 'Random' | null
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
  | { type: 'SET_CARD_IMAGE_STYLE'; style: 'Photorealistic' | 'Editorial' | 'Random' | null }
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
        cardImageStyle: isCardLane(action.lane) ? state.cardImageStyle : null,
      }

    case 'SET_CARD_IMAGE_STYLE':
      return { ...state, cardImageStyle: action.style }

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
    settings_override: Record<string, string | undefined>
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
        ...(isCard && state.cardImageStyle
          ? { card_image_style: state.cardImageStyle }
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
