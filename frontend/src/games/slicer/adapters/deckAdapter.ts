import type { GameWordRow } from '../../shared/useGameDeck'
import type { DeckDefinition, DeckMode } from '../engine/types'

export type WordRow = Pick<
  GameWordRow,
  | 'id'
  | 'word'
  | 'translation'
  | 'thumbnail_url'
  | 'thumbnail_url_b'
  | 'image_url'
  | 'image_urls'
  | 'tts_audio_url'
>

type WordsToSlicerDeckOptions = {
  mode: DeckMode
  targetLanguage: string
  baseLanguage: string
  wordsPerRound?: number
  deckId: string
  deckTitle: string
  shuffle?: boolean
}

export function pickImageUrl(word: WordRow): string | undefined {
  const firstImage = Array.isArray(word.image_urls)
    ? word.image_urls.find((url): url is string => Boolean(url))
    : undefined

  return firstImage
    ?? word.image_url
    ?? word.thumbnail_url
    ?? word.thumbnail_url_b
    ?? undefined
}

export function wordsToSlicerDeck(words: WordRow[], opts: WordsToSlicerDeckOptions): DeckDefinition {
  const deckWords = opts.shuffle ? shuffleWords(words) : words

  return {
    id: opts.deckId,
    title: opts.deckTitle,
    mode: opts.mode,
    target_language: opts.targetLanguage,
    base_language: opts.baseLanguage,
    words_per_round: opts.wordsPerRound ?? 5,
    words: deckWords.map((word) => ({
      id: word.id,
      word: word.word,
      translation: word.translation ?? undefined,
      imageUrl: pickImageUrl(word),
      audioUrl: opts.mode === 'audio_to_image' ? word.tts_audio_url ?? undefined : undefined,
    })),
  }
}

function shuffleWords<T>(words: T[]): T[] {
  const shuffled = [...words]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }
  return shuffled
}
