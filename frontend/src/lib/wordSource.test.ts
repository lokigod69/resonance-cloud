import { deriveWordSource } from './wordSource'

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

assertEqual(
  deriveWordSource(
    { source_kind: 'curriculum', deck_type: 'card' },
    { metadata: { origin: 'tutor_extraction' } },
  ),
  'library',
  'curriculum decks are always library',
)

assertEqual(
  deriveWordSource(
    { source_kind: 'user', deck_type: 'card_text' },
    { metadata: { origin: 'tutor_extraction' } },
  ),
  'spoken',
  'tutor extraction words are spoken',
)

assertEqual(
  deriveWordSource(
    { source_kind: 'user', deck_type: 'card_text' },
    { metadata: { origin: 'category' } },
  ),
  'library',
  'category words are library',
)

assertEqual(
  deriveWordSource(
    { source_kind: 'user', deck_type: 'card_text' },
    { metadata: { origin: 'manual' } },
  ),
  'generated',
  'manual words fold into generated',
)

assertEqual(
  deriveWordSource(
    { source_kind: 'user', deck_type: 'video' },
    { metadata: null },
  ),
  'generated',
  'missing origin falls back to generated',
)
