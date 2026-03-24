import { useReducer, useCallback } from 'react'
import { MAX_WORDS } from './wizardData'

export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6
  path: 'undecided' | 'quick' | 'custom'
  language: string | null
  words: string[]
  vibe: string | null
  movieTitle: string | null
  artStyle: string | null
  genre: string | null
}

export type WizardAction =
  | { type: 'SET_LANGUAGE'; language: string }
  | { type: 'ADD_WORD'; word: string }
  | { type: 'REMOVE_WORD'; index: number }
  | { type: 'SET_WORDS'; words: string[] }
  | { type: 'SET_VIBE'; vibe: string }
  | { type: 'SET_MOVIE_TITLE'; title: string }
  | { type: 'SET_ART_STYLE'; style: string | null }
  | { type: 'SET_GENRE'; genre: string | null }
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
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.language, step: 2 }

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
      return { ...state, vibe: action.vibe }

    case 'SET_MOVIE_TITLE':
      return { ...state, movieTitle: action.title }

    case 'SET_ART_STYLE':
      return { ...state, artStyle: action.style }

    case 'SET_GENRE':
      return { ...state, genre: action.genre }

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

export interface GeneratePayload {
  deckPayload: {
    user_id: string
    name: string
    target_language: string
    art_style: string | null
    movie_override: string | null
    word_count: number
    status: 'generating'
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
}

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  const buildPayload = useCallback(
    (userId: string, existingDeck?: ExistingDeck): GeneratePayload => {
      const language = existingDeck?.target_language ?? state.language!
      const movieOverride =
        state.vibe === 'movie' || state.vibe === 'specific_movie'
          ? state.movieTitle?.trim() || null
          : null
      const artStyle = state.artStyle || null
      const creativeDirection =
        state.vibe === 'specific_movie' ? 'movie' : state.vibe === 'auto' ? undefined : state.vibe || undefined
      const genre = state.genre === 'auto' ? undefined : state.genre || undefined

      return {
        deckPayload: existingDeck ? null : {
          user_id: userId,
          name: `${language} Deck \u2014 ${new Date().toLocaleDateString()}`,
          target_language: language,
          art_style: artStyle,
          movie_override: movieOverride,
          word_count: state.words.length,
          status: 'generating',
        },
        wordList: state.words,
        jobPayload: {
          user_id: userId,
          ...(existingDeck ? { deck_id: existingDeck.id } : {}),
          status: 'pending',
          target_language: language,
          art_style: artStyle ?? existingDeck?.art_style ?? null,
          movie_override: movieOverride ?? existingDeck?.movie_override ?? null,
          words_total: state.words.length,
          settings_override: {
            ...(creativeDirection ? { creative_direction: creativeDirection } : {}),
            ...(genre ? { genre } : {}),
          },
        },
      }
    },
    [state]
  )

  return { state, dispatch, buildPayload }
}
