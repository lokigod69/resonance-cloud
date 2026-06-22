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

  const origin = typeof word.metadata?.origin === 'string' ? word.metadata.origin : null
  if (origin === 'tutor_extraction') return 'spoken'
  if (origin === 'category') return 'library'

  return 'generated'
}
