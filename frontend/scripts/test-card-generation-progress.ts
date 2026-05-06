import assert from 'node:assert/strict'
import {
  getGeneratedDeckHref,
  shouldNavigateGeneratedDeck,
  summarizeCardGenerationProgress,
  shouldUseGlobalQueuePosition,
} from '../src/lib/cardGenerationProgress'

const summary = summarizeCardGenerationProgress([
  { status: 'complete' },
  { status: 'processing', current_stage: 'complete' },
  { status: 'failed' },
  { status: 'processing', current_stage: 'cancelled' },
  { status: 'processing' },
  { status: 'pending', current_stage: 'pending_image' },
  { status: 'pending', current_stage: 'enrichment' },
  { status: 'pending' },
  { status: 'pending', current_stage: 'pre_bootstrap' },
  { status: 'queued' },
  { status: 'unknown', current_stage: 'uploading' },
])

assert.deepEqual(summary, {
  complete: 2,
  processing: 4,
  queued: 3,
  failed: 2,
  total: 11,
})

assert.equal(
  shouldUseGlobalQueuePosition({ status: 'generating', deck_type: 'card' }),
  false,
  'card decks must not render global jobs-ahead queue position',
)

assert.equal(
  shouldUseGlobalQueuePosition({ status: 'generating', deck_type: 'video' }),
  true,
  'video decks keep the existing queue display',
)

assert.equal(
  shouldUseGlobalQueuePosition({ status: 'complete', deck_type: 'video' }),
  false,
  'completed decks do not poll queue position',
)

assert.equal(
  shouldNavigateGeneratedDeck({
    generated: true,
    queueDeckId: 'card-deck-123',
    isCardSubmission: true,
    jobStatus: null,
    hasChecked: false,
    shouldShowQueue: false,
  }),
  true,
  'card submissions navigate without waiting for queue polling',
)

assert.equal(
  shouldNavigateGeneratedDeck({
    generated: true,
    queueDeckId: 'video-deck-123',
    isCardSubmission: false,
    jobStatus: null,
    hasChecked: false,
    shouldShowQueue: false,
  }),
  false,
  'non-card submissions keep queue-based navigation before the queue check completes',
)

assert.equal(
  shouldNavigateGeneratedDeck({
    generated: true,
    queueDeckId: 'video-deck-123',
    isCardSubmission: false,
    jobStatus: 'processing',
    hasChecked: true,
    shouldShowQueue: false,
  }),
  true,
  'non-card submissions still navigate when queue status reaches processing',
)

assert.equal(
  getGeneratedDeckHref('card-deck-123'),
  '/deck/card-deck-123',
  'generated card deck link points at the returned deck id',
)

assert.equal(
  getGeneratedDeckHref(null),
  '/dashboard',
  'generated deck link keeps the dashboard fallback when no deck id exists',
)

console.log('card generation progress checks passed')
