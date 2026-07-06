// api/_shared/usageEvents.ts
//
// Service-role writer for the per-call usage/cost event log (pipeline_events).
//
// The four blind frontend /api/* provider calls (voice-chat, extract-vocabulary,
// suggest-words, translate-and-ipa, guided-transcribe) call writeUsageEvent() to
// append exactly one row per call with real provider spend.
//
// Reuses the existing service-role admin pattern (SUPABASE_SERVICE_ROLE_KEY) — the
// same approach as delete-account.ts / extract-vocabulary.ts. No new key is
// introduced and the service-role key never reaches the client (these run only in
// Vercel functions). Writes are append-only via the service role, which bypasses
// the table's admin-read-only RLS exactly like the Python writer does.
//
// Observability must never break the user request: client init and insert
// failures are swallowed (logged via console.error, never console.log) and the
// function resolves normally.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type UsageStatus = 'success' | 'failed' | 'partial'

export interface UsageEventInput {
  userId: string | null
  /** Clean grouping key, e.g. 'speak_turn' | 'extract_vocab' | 'suggest_words' | 'translate_ipa' | 'guided_transcribe'. */
  feature: string
  /** Coarse grouping for the existing NOT NULL `stage` column. */
  stage: string
  subStep?: string | null
  status: UsageStatus
  modelProvider?: string | null
  modelName?: string | null
  costUsd?: number | null
  realCostUsd?: number | null
  tokensIn?: number | null
  tokensOut?: number | null
  chars?: number | null
  audioSeconds?: number | null
  images?: number | null
  latencyMs?: number | null
  errorType?: string | null
  requestId?: string | null
  metadata?: Record<string, unknown>
}

function getServiceEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  }
}

function createUsageAdminClient(): SupabaseClient | null {
  const { url, serviceKey } = getServiceEnv()
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * Append one usage/cost row to pipeline_events. Never throws and never returns a
 * rejected promise — failures are logged and discarded so the caller's response
 * is unaffected. Callers should `await` this before returning so the insert
 * completes before the serverless function freezes.
 */
export async function writeUsageEvent(input: UsageEventInput): Promise<void> {
  try {
    const admin = createUsageAdminClient()
    if (!admin) {
      console.error('[usage-events] service-role env missing — event dropped:', input.feature)
      return
    }

    const row = {
      event_source: 'frontend',
      stage: input.stage,
      sub_step: input.subStep ?? null,
      feature: input.feature,
      user_id: input.userId,
      tier: null as string | null,
      status: input.status,
      model_provider: input.modelProvider ?? null,
      model_name: input.modelName ?? null,
      latency_ms: input.latencyMs ?? null,
      cost_usd: input.costUsd ?? null,
      real_cost_usd: input.realCostUsd ?? null,
      tokens_in: input.tokensIn ?? null,
      tokens_out: input.tokensOut ?? null,
      chars: input.chars ?? null,
      audio_seconds: input.audioSeconds ?? null,
      images: input.images ?? null,
      error_type: input.errorType ?? null,
      request_id: input.requestId ?? null,
      metadata: input.metadata ?? {},
    }

    const { error } = await admin.from('pipeline_events').insert(row)
    if (error) {
      console.error('[usage-events] insert failed:', error.message)
    }
  } catch (err) {
    console.error('[usage-events] write failed:', err instanceof Error ? err.message : err)
  }
}
