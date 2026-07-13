/**
 * Deterministic contract checks for Wave Rider deck adapters.
 *
 * Run: npx tsx scripts/test-surf-adapters.ts
 */

import type { GameWordRow } from '../src/games/shared/useGameDeck.ts'
import { attachDeckStaticAudio, collectDeckStaticAudioRequests, wordsToSurfDeck } from '../src/games/surf/adapters/deckAdapter.ts'
import type { SurfDeck } from '../src/games/surf/engine/types.ts'
import type { StaticThematicPlaybackRow } from '../src/lib/staticThematicAudio.ts'

let passes = 0
let failures = 0

function assert(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passes += 1
    console.log(`  ok  ${name}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}`)
  if (detail !== undefined) console.error('       ', detail)
}

function row(overrides: Partial<GameWordRow> = {}): GameWordRow {
  return {
    id: 'row-1',
    word: 'perro',
    translation: 'dog',
    mnemonic: null,
    etymology: null,
    ipa: null,
    video_url: null,
    thumbnail_url: null,
    tts_audio_url: null,
    video_url_b: null,
    thumbnail_url_b: null,
    image_url: null,
    image_urls: null,
    suno_storage_url: null,
    suno_storage_url_b: null,
    suno_audio_url: null,
    metadata: null,
    deck_id: 'deck-1',
    decks: { target_language: 'Spanish', name: 'Animals' },
    ...overrides,
  }
}

function playbackRow(conceptId: string, publicUrl: string, voiceProfileKey = 'voice-a'): StaticThematicPlaybackRow {
  return {
    target_language_code: 'es',
    category_slug: 'animals',
    level_number: 1,
    concept_id: conceptId,
    spoken_text: conceptId,
    public_url: publicUrl,
    duration_ms: null,
    audio_version: 1,
    voice_profile_key: voiceProfileKey,
    qa_status: 'passed',
  }
}

console.log('\n[surf adapters]')

assert('rows without curriculum metadata produce no static-audio requests', collectDeckStaticAudioRequests([row()]).length === 0)

const requests = collectDeckStaticAudioRequests([
  row({ id: 'dog-row', metadata: { curriculum: { concept_id: 'animals.dog', level: 1 } } }),
  row({ id: 'cat-row', metadata: { curriculum: { source_concept_id: 'animals.cat', level: 1 } } }),
  row({ id: 'bread-row', metadata: { curriculum: { entry_id: 'food.bread', level: 2 } } }),
])
const animalsRequest = requests.find((request) => request.categorySlug === 'animals' && request.level === 1)
const foodRequest = requests.find((request) => request.categorySlug === 'food' && request.level === 2)
assert(
  'concept ids group by category slug and curriculum level',
  requests.length === 2
    && animalsRequest?.conceptIds.join(',') === 'animals.dog,animals.cat'
    && foodRequest?.conceptIds.join(',') === 'food.bread',
  requests,
)
assert(
  'group requests retain each concept-to-word-row mapping',
  animalsRequest?.rowIdByConceptId.get('animals.dog') === 'dog-row'
    && animalsRequest?.rowIdByConceptId.get('animals.cat') === 'cat-row'
    && foodRequest?.rowIdByConceptId.get('food.bread') === 'bread-row',
)

const deck: SurfDeck = {
  id: 'deck',
  label: 'Animals',
  source: 'deck',
  languageCode: 'es',
  cards: [
    { id: 'dog-row', term: 'perro', prompt: 'dog', audioUrl: null },
    { id: 'cat-row', term: 'gato', prompt: 'cat', audioUrl: 'existing-url' },
    { id: 'other-row', term: 'pan', prompt: 'bread', audioUrl: null },
  ],
}
const lookup = new Map<string, Map<string, StaticThematicPlaybackRow>>([
  ['animals.dog', new Map([
    ['voice-a', playbackRow('animals.dog', 'https://audio.example/dog-a.mp3', 'voice-a')],
    ['voice-b', playbackRow('animals.dog', 'https://audio.example/dog-b.mp3', 'voice-b')],
  ])],
  ['animals.cat', new Map([['voice-a', playbackRow('animals.cat', 'https://audio.example/cat.mp3')]])],
])
attachDeckStaticAudio(deck, lookup, new Map([
  ['animals.dog', 'dog-row'],
  ['animals.cat', 'missing-row'],
]))
assert(
  'deck static audio mutates only cards mapped to a matching playback row',
  deck.cards[0].audioUrl === 'https://audio.example/dog-a.mp3'
    && deck.cards[1].audioUrl === 'existing-url'
    && deck.cards[2].audioUrl === null,
  deck.cards,
)

const deckWithTts = wordsToSurfDeck([row({ tts_audio_url: 'https://audio.example/perro.mp3' })], {
  id: 'tts-deck',
  label: 'Animals',
  source: 'deck',
  language: 'Spanish',
})
assert('wordsToSurfDeck preserves an existing word TTS URL', deckWithTts.cards[0]?.audioUrl === 'https://audio.example/perro.mp3', deckWithTts.cards)

console.log(`\n${passes} passed, ${failures} failed`)
if (failures > 0) process.exit(1)
