export type CardFailureKind =
  | 'validator_failed'
  | 'prompt_writer_failed'
  | 'planner_failed'
  | 'provider_rejected'
  | 'provider_timeout'
  | 'provider_failed'
  | 'upload_failed'
  | 'recovery_terminalized'
  | 'retry_already_requested'
  | 'waiting_same_deck_lock'
  | 'queued'
  | 'provider_running'
  | 'complete_with_output'
  | 'complete_missing_output'
  | 'unknown_failed'

export type CardFailureInput = {
  status?: string | null
  current_stage?: string | null
  failed_stage?: string | null
  error_message?: string | null
  retry_requested?: boolean | null
  retry_requested_at?: string | null
  thumbnail_url?: string | null
  image_url?: string | null
  card_image_url?: string | null
  video_url?: string | null
  metadata?: Record<string, unknown> | null
  generation_job?: {
    status?: string | null
    error_message?: string | null
  } | null
}

export type CardFailureClassification = {
  kind: CardFailureKind
  label: string
  providerReached: boolean | null
  detail: string | null
}

export function classifyCardGenerationFailure(row: CardFailureInput): CardFailureClassification {
  const cardMeta = asRecord(asRecord(row.metadata)?.gpt_image_2_card)
  const status = lower(row.status)
  const currentStage = lower(row.current_stage)
  const failedStage = lower(row.failed_stage)
  const error = lower([row.error_message, row.generation_job?.error_message, cardMeta?.provider_error_summary].filter(Boolean).join(' '))
  const hasOutput = Boolean(row.thumbnail_url || row.image_url || row.card_image_url || row.video_url)
  const providerReached = providerReachedFrom(cardMeta)

  if (row.retry_requested) return result('retry_already_requested', providerReached, 'Retry already requested / queued', row.retry_requested_at ?? null)
  if (status === 'complete') {
    return hasOutput
      ? result('complete_with_output', providerReached, 'Complete with output', outputPresence(row))
      : result('complete_missing_output', providerReached, 'Complete but output missing', null)
  }
  if (String(cardMeta?.validator_passed) === 'false' || error.includes('validator failed')) {
    return result('validator_failed', false, 'Validator failed before provider', formatList(cardMeta?.validator_errors) ?? row.error_message ?? null)
  }
  if (cardMeta?.failure_origin === 'prompt_writer' || error.includes('prompt writer')) {
    return result('prompt_writer_failed', false, 'Prompt writer failed before provider', row.error_message ?? null)
  }
  if (cardMeta?.failure_origin === 'planner' || error.includes('planner')) {
    return result('planner_failed', false, 'Planner failed before provider', row.error_message ?? null)
  }
  if (currentStage.includes('same_deck') || failedStage.includes('same_deck') || error.includes('same-deck')) {
    return result('waiting_same_deck_lock', providerReached, 'Waiting behind same-deck job', null)
  }
  if (status === 'approved' || status === 'pending' || status === 'queued') {
    return result('queued', providerReached, 'Queued', null)
  }
  if (status === 'processing' || currentStage === 'pending_image' || currentStage.includes('provider') || currentStage.includes('image')) {
    return result('provider_running', providerReached ?? true, 'Provider running', row.current_stage ?? null)
  }
  if (error.includes('timeout') || error.includes('timed out')) {
    return result('provider_timeout', providerReached ?? true, 'Provider timed out', row.error_message ?? null)
  }
  if (error.includes('reject') || error.includes('policy') || error.includes('moderation')) {
    return result('provider_rejected', providerReached ?? true, 'Provider rejected request', row.error_message ?? null)
  }
  if (failedStage.includes('upload') || error.includes('upload') || error.includes('storage')) {
    return result('upload_failed', providerReached ?? true, 'Upload failed after provider', row.error_message ?? null)
  }
  if (error.includes('terminal') || error.includes('recovery')) {
    return result('recovery_terminalized', providerReached, 'Recovery terminalized row', row.error_message ?? null)
  }
  if (status === 'failed') {
    if (providerReached === true || cardMeta?.provider_model) {
      return result('provider_failed', true, 'Provider failed', row.error_message ?? null)
    }
    return result('unknown_failed', providerReached, 'Unknown failure', row.error_message ?? null)
  }
  return result('queued', providerReached, 'Queued', null)
}

export function getCardRetryAction(row: CardFailureInput): { submitRetry: boolean; message: string } {
  const classification = classifyCardGenerationFailure(row)
  if (classification.kind === 'retry_already_requested') {
    return { submitRetry: false, message: 'Retry already requested / queued' }
  }
  if (classification.kind === 'provider_running') {
    return { submitRetry: false, message: 'Currently processing; retry not submitted.' }
  }
  if (classification.kind === 'complete_with_output') {
    return { submitRetry: false, message: 'Output already exists; retry not submitted.' }
  }
  if (classification.kind === 'validator_failed') {
    return { submitRetry: true, message: `Validator failed before provider: ${classification.detail ?? 'see validator errors'}` }
  }
  return { submitRetry: true, message: classification.label }
}

function result(kind: CardFailureKind, providerReached: boolean | null, label: string, detail: string | null): CardFailureClassification {
  return { kind, providerReached, label, detail }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function lower(value: unknown): string {
  return String(value ?? '').toLowerCase()
}

function providerReachedFrom(cardMeta: Record<string, unknown> | null): boolean | null {
  if (!cardMeta) return null
  if (typeof cardMeta.provider_reached === 'boolean') return cardMeta.provider_reached
  if (cardMeta.provider_model || cardMeta.provider_task_id || cardMeta.kie_task_id) return true
  return null
}

function outputPresence(row: CardFailureInput): string {
  return [
    row.thumbnail_url ? 'thumbnail_url' : null,
    row.image_url ? 'image_url' : null,
    row.card_image_url ? 'card_image_url' : null,
    row.video_url ? 'video_url' : null,
  ].filter(Boolean).join(', ')
}

function formatList(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null
  return value.map(String).join('; ')
}
