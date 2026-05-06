import { strict as assert } from 'node:assert'
import { getCardFaces, type Card, type Deck } from '../src/lib/cardFaces'

function card(overrides: Partial<Card> = {}): Card {
  return {
    word: 'assiduous',
    translation: 'fleißig',
    ...overrides,
  }
}

function deck(overrides: Partial<Deck> = {}): Deck {
  return {
    target_language: 'English',
    base_language: 'German',
    ...overrides,
  }
}

assert.deepEqual(getCardFaces(card(), deck()), {
  target: 'assiduous',
  base: 'fleißig',
})

assert.deepEqual(getCardFaces(card({ translation: null }), deck()), {
  target: 'assiduous',
  base: 'assiduous',
})

assert.deepEqual(getCardFaces(card({ word: 'assiduously', translation: 'diligently' }), deck({
  target_language: 'English',
  base_language: 'English',
})), {
  target: 'assiduously',
  base: 'diligently',
})
