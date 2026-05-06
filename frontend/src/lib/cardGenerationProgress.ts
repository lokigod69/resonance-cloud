export type CardProgressWord = {
  status?: string | null
  current_stage?: string | null
}

export type CardGenerationProgressSummary = {
  complete: number
  processing: number
  queued: number
  failed: number
  total: number
}

export type QueueDeck = {
  status?: string | null
  deck_type?: string | null
} | null | undefined

export type GeneratedDeckNavigationState = {
  generated: boolean
  queueDeckId: string | null
  isCardSubmission: boolean
  jobStatus?: string | null
  hasChecked: boolean
  shouldShowQueue: boolean
}

const COMPLETE_STAGES = new Set(['complete'])
const FAILED_STAGES = new Set(['failed', 'cancelled'])
const ACTIVE_STAGES = new Set([
  'approved',
  'bootstrap',
  'bootstrapping',
  'enrichment',
  'enriching',
  'image_generation',
  'pending_image',
  'processing',
  'rendering',
  'uploading',
])
const QUEUED_STAGES = new Set([
  'pre_bootstrap',
  'pending',
  'queued',
])

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

function classifyCardWord(word: CardProgressWord): keyof Omit<CardGenerationProgressSummary, 'total'> {
  const status = normalize(word.status)
  const currentStage = normalize(word.current_stage)

  if (status === 'complete' || COMPLETE_STAGES.has(currentStage)) return 'complete'
  if (status === 'failed' || FAILED_STAGES.has(currentStage)) return 'failed'
  if (status === 'processing' || ACTIVE_STAGES.has(currentStage)) return 'processing'
  if (status === 'pending' || status === 'queued' || QUEUED_STAGES.has(currentStage)) return 'queued'

  return 'queued'
}

export function summarizeCardGenerationProgress(words: CardProgressWord[]): CardGenerationProgressSummary {
  const summary: CardGenerationProgressSummary = {
    complete: 0,
    processing: 0,
    queued: 0,
    failed: 0,
    total: words.length,
  }

  for (const word of words) {
    summary[classifyCardWord(word)] += 1
  }

  return summary
}

export function shouldUseGlobalQueuePosition(deck: QueueDeck) {
  return deck?.status === 'generating' && deck.deck_type !== 'card'
}

export function shouldNavigateGeneratedDeck({
  generated,
  queueDeckId,
  isCardSubmission,
  jobStatus,
  hasChecked,
  shouldShowQueue,
}: GeneratedDeckNavigationState) {
  if (!generated || !queueDeckId) return false
  if (isCardSubmission) return true

  return jobStatus === 'processing' || (hasChecked && !jobStatus && !shouldShowQueue)
}

export function getGeneratedDeckHref(queueDeckId: string | null) {
  return queueDeckId ? `/deck/${queueDeckId}` : '/dashboard'
}
