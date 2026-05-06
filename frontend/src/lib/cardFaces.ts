export type Card = {
  word?: string | null
  source_word?: string | null
  translation?: string | null
  [key: string]: unknown
}

export type Deck = {
  target_language?: string | null
  base_language?: string | null
  [key: string]: unknown
}

export type CardFaces = {
  target: string
  base: string
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getCardFaces(card: Card, deck: Deck): CardFaces {
  void deck

  const target = clean(card.word) ?? clean(card.source_word) ?? clean(card.translation) ?? ''
  const base = clean(card.translation) ?? target

  return { target, base }
}
