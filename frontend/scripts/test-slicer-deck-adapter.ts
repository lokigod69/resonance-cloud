import assert from 'node:assert/strict'
import { wordsToSlicerDeck, type WordRow } from '../src/games/slicer/adapters/deckAdapter'
import type { DeckMode } from '../src/games/slicer/engine/types'

type SampleDeckFixture = {
  id: string
  title: string
  mode: DeckMode
  target_language: string
  base_language: string
  words_per_round?: number
  words: Array<{ word: string; translation?: string }>
}

const sampleDecks: SampleDeckFixture[] = [
  {
    id: 'deck-01-foundation',
    title: 'Foundation Words',
    mode: 'audio_to_image',
    target_language: 'en',
    base_language: 'de',
    words_per_round: 5,
    words: [
      { word: "slide into someone's DMs", translation: 'jemandem privat schreiben' },
      { word: 'window', translation: 'Fenster' },
    ],
  },
  {
    id: 'deck-02-character',
    title: 'Character & Temperament',
    mode: 'audio_to_image',
    target_language: 'en',
    base_language: 'de',
    words_per_round: 5,
    words: [
      { word: 'serendipity', translation: 'Gluecksfund' },
      { word: 'luminous', translation: 'leuchtend' },
    ],
  },
  {
    id: 'deck-03-elements',
    title: 'Elemental Register',
    mode: 'audio_to_image',
    target_language: 'en',
    base_language: 'de',
    words_per_round: 5,
    words: [
      { word: 'ember', translation: 'Glut' },
      { word: 'tide', translation: 'Gezeiten' },
    ],
  },
  {
    id: 'deck-04-mode-b-test',
    title: 'Mode B Test',
    mode: 'audio_to_text',
    target_language: 'de',
    base_language: 'en',
    words_per_round: 5,
    words: [
      { word: 'Schwelle', translation: 'threshold' },
      { word: 'Glut', translation: 'ember' },
    ],
  },
]

function row(index: number, overrides: Partial<WordRow> = {}): WordRow {
  return {
    id: `word-${index}`,
    word: `word ${index}`,
    translation: `translation ${index}`,
    thumbnail_url: null,
    thumbnail_url_b: null,
    image_url: null,
    image_urls: null,
    tts_audio_url: null,
    ...overrides,
  }
}

function rowsFromFixture(deck: SampleDeckFixture): WordRow[] {
  return deck.words.map((word, index) => row(index, {
    id: `${deck.id}-word-${index}`,
    word: word.word,
    translation: word.translation ?? null,
    tts_audio_url: index === 0 ? `https://example.invalid/${deck.id}-${index}.mp3` : null,
  }))
}

const imageDeck = sampleDecks[0]
const imageRows = rowsFromFixture(imageDeck)
const audioToImage = wordsToSlicerDeck(imageRows, {
  mode: 'audio_to_image',
  targetLanguage: imageDeck.target_language,
  baseLanguage: imageDeck.base_language,
  wordsPerRound: imageDeck.words_per_round,
  deckId: imageDeck.id,
  deckTitle: imageDeck.title,
})

assert.equal(audioToImage.words[0].audioUrl, `https://example.invalid/${imageDeck.id}-0.mp3`)
assert.equal(audioToImage.words[1].audioUrl, undefined)

const textDeck = sampleDecks[3]
const audioToText = wordsToSlicerDeck(rowsFromFixture(textDeck), {
  mode: 'audio_to_text',
  targetLanguage: textDeck.target_language,
  baseLanguage: textDeck.base_language,
  wordsPerRound: textDeck.words_per_round,
  deckId: textDeck.id,
  deckTitle: textDeck.title,
})

assert.equal(audioToText.words[0].audioUrl, undefined)
assert.equal(audioToText.words[1].audioUrl, undefined)

const imagePrecedence = wordsToSlicerDeck([
  row(1, {
    image_urls: ['https://example.invalid/image-urls.jpg'],
    image_url: 'https://example.invalid/image-url.jpg',
    thumbnail_url: 'https://example.invalid/thumb-a.jpg',
    thumbnail_url_b: 'https://example.invalid/thumb-b.jpg',
  }),
  row(2, {
    image_url: 'https://example.invalid/image-url.jpg',
    thumbnail_url: 'https://example.invalid/thumb-a.jpg',
    thumbnail_url_b: 'https://example.invalid/thumb-b.jpg',
  }),
  row(3, {
    thumbnail_url: 'https://example.invalid/thumb-a.jpg',
    thumbnail_url_b: 'https://example.invalid/thumb-b.jpg',
  }),
  row(4, {
    thumbnail_url_b: 'https://example.invalid/thumb-b.jpg',
  }),
], {
  mode: 'audio_to_image',
  targetLanguage: 'de',
  baseLanguage: 'en',
  deckId: 'image-precedence',
  deckTitle: 'Image precedence',
})

assert.equal(imagePrecedence.words[0].imageUrl, 'https://example.invalid/image-urls.jpg')
assert.equal(imagePrecedence.words[1].imageUrl, 'https://example.invalid/image-url.jpg')
assert.equal(imagePrecedence.words[2].imageUrl, 'https://example.invalid/thumb-a.jpg')
assert.equal(imagePrecedence.words[3].imageUrl, 'https://example.invalid/thumb-b.jpg')
assert.equal(imagePrecedence.words_per_round, 5)

const customRoundSize = wordsToSlicerDeck([row(5)], {
  mode: 'audio_to_image',
  targetLanguage: 'de',
  baseLanguage: 'en',
  wordsPerRound: 7,
  deckId: 'round-size',
  deckTitle: 'Round size',
})

assert.equal(customRoundSize.words_per_round, 7)
assert.equal(customRoundSize.words[0].id, 'word-5')

for (const fixture of sampleDecks) {
  const deck = wordsToSlicerDeck(rowsFromFixture(fixture), {
    mode: fixture.mode,
    targetLanguage: fixture.target_language,
    baseLanguage: fixture.base_language,
    wordsPerRound: fixture.words_per_round,
    deckId: fixture.id,
    deckTitle: fixture.title,
  })
  assert.equal(deck.id, fixture.id)
  assert.equal(deck.words.length, fixture.words.length)
  assert.equal(deck.words[0].id, `${fixture.id}-word-0`)
}

process.stdout.write('Slicer deck adapter tests passed\n')
