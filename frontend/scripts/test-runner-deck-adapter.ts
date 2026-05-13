import { adaptDeck } from '../src/games/runner/adapters/deckAdapter'
import { loadDeck } from '../src/games/runner/engine/deckLoader'

const rows = [
  {
    id: '0a94615c-e853-4bbb-b8e1-734da9433386',
    word: '가다',
    translation: 'to go',
    ipa: null,
    thumbnail_url: null,
    thumbnail_url_b: null,
    image_url: '',
    image_urls: [],
    tts_audio_url: '',
    decks: { target_language: 'ko' },
  },
  {
    id: 'card-2',
    word: '보다',
    translation: null,
    ipa: null,
    thumbnail_url: '/thumb-2.webp',
    thumbnail_url_b: null,
    image_url: null,
    image_urls: null,
    tts_audio_url: null,
    decks: { target_language: 'ko' },
  },
  {
    id: 'card-3',
    word: '먹다',
    translation: '',
    ipa: null,
    thumbnail_url: null,
    thumbnail_url_b: '/thumb-3.webp',
    image_url: null,
    image_urls: null,
    tts_audio_url: null,
    decks: { target_language: 'ko' },
  },
]

const deck = loadDeck(adaptDeck(rows, 'ko'))

const brokenCard = deck.cards.find((card) => card.id === '0a94615c-e853-4bbb-b8e1-734da9433386')
if (!brokenCard) {
  throw new Error('Expected the blank-image card to stay playable with a fallback image.')
}

if (brokenCard.imageUrl !== '/games/runner/cards/frame-default.png') {
  throw new Error(`Expected blank image_url to fall back, got ${brokenCard.imageUrl}`)
}

const blankTranslationCard = deck.cards.find((card) => card.id === 'card-3')
if (blankTranslationCard?.translation !== '먹다') {
  throw new Error(`Expected blank translation to fall back to word, got ${blankTranslationCard?.translation}`)
}
