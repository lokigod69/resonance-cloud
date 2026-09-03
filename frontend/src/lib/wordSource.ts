export type WordSource = 'library' | 'generated' | 'spoken'

type WordSourceDeck = {
  source_kind?: string | null
  deck_type?: string | null
}

type WordSourceWord = {
  metadata?: Record<string, unknown> | null
}

export function deriveWordSource(deck: WordSourceDeck, word: WordSourceWord): WordSource {
  if (deck.source_kind === 'curriculum') return 'library'

  // The word's own origin outranks the deck: a stream deck can hold words
  // appended by hand later, and those are not Library words.
  const origin = typeof word.metadata?.origin === 'string' ? word.metadata.origin : null
  if (origin === 'tutor_extraction') return 'spoken'
  if (origin === 'category' || origin === 'word_stream') return 'library'
  if (deck.source_kind === 'stream' && origin === null) return 'library'

  return 'generated'
}
