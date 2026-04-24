import { supabase } from '@/lib/supabase'

export type JsonObject = Record<string, unknown>

export interface PipelineEvent {
  id: string
  created_at: string
  event_source: string
  stage: string
  sub_step: string | null
  word_id: string | null
  deck_id: string | null
  user_id: string | null
  job_id: string | null
  attempt: number | null
  model_provider: string | null
  model_name: string | null
  status: string
  latency_ms: number | null
  cost_usd: number | null
  tokens_in: number | null
  tokens_out: number | null
  request_id: string | null
  metadata: JsonObject
  response_ref: string | null
  system_prompt: string | null
  user_prompt: string | null
  response_body: string | null
  error_type: string | null
  error_message: string | null
}

export interface WordRow {
  id: string
  language: string | null
  deck_id: string | null
  user_id: string | null
  created_at: string
  metadata: JsonObject | null
}

export interface AggregateCount {
  stage: string
  sub_step: string | null
  status: string
  count: number
}

export interface ProviderCost {
  model_provider: string
  cost_usd: number
}

export interface FailureCount {
  stage: string
  count: number
}

const EVENT_COLUMNS = `
  id,
  created_at,
  event_source,
  stage,
  sub_step,
  word_id,
  deck_id,
  user_id,
  job_id,
  attempt,
  model_provider,
  model_name,
  status,
  latency_ms,
  cost_usd,
  tokens_in,
  tokens_out,
  request_id,
  metadata,
  response_ref,
  system_prompt,
  user_prompt,
  response_body,
  error_type,
  error_message
`

let aggregateReadCapWarned = false

function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeEvent(row: Record<string, unknown>): PipelineEvent {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    event_source: row.event_source as string,
    stage: row.stage as string,
    sub_step: (row.sub_step as string | null) ?? null,
    word_id: (row.word_id as string | null) ?? null,
    deck_id: (row.deck_id as string | null) ?? null,
    user_id: (row.user_id as string | null) ?? null,
    job_id: (row.job_id as string | null) ?? null,
    attempt: asNumber(row.attempt),
    model_provider: (row.model_provider as string | null) ?? null,
    model_name: (row.model_name as string | null) ?? null,
    status: row.status as string,
    latency_ms: asNumber(row.latency_ms),
    cost_usd: asNumber(row.cost_usd),
    tokens_in: asNumber(row.tokens_in),
    tokens_out: asNumber(row.tokens_out),
    request_id: (row.request_id as string | null) ?? null,
    metadata: (row.metadata as JsonObject | null) ?? {},
    response_ref: (row.response_ref as string | null) ?? null,
    system_prompt: (row.system_prompt as string | null) ?? null,
    user_prompt: (row.user_prompt as string | null) ?? null,
    response_body: (row.response_body as string | null) ?? null,
    error_type: (row.error_type as string | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
  }
}

async function fetchAllEvents(): Promise<PipelineEvent[]> {
  const rows: PipelineEvent[] = []
  const pageSize = 1000
  const maxRows = 5000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('pipeline_events')
      .select(EVENT_COLUMNS)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error

    const page = ((data ?? []) as Record<string, unknown>[]).map(normalizeEvent)
    rows.push(...page)
    if (rows.length >= maxRows) {
      if (!aggregateReadCapWarned) {
        aggregateReadCapWarned = true
        console.warn(`pipeline_events aggregate reads capped at ${maxRows} rows`)
      }
      return rows.slice(0, maxRows)
    }
    if (page.length < pageSize) return rows
    from += pageSize
  }
}

export async function fetchPipelineEventsForWord(wordId: string): Promise<PipelineEvent[]> {
  const { data, error } = await supabase
    .from('pipeline_events')
    .select(EVENT_COLUMNS)
    .eq('word_id', wordId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeEvent)
}

export async function fetchWordWithMetadata(wordId: string): Promise<WordRow | null> {
  const { data, error } = await supabase
    .from('words')
    .select('id, deck_id, user_id, created_at, metadata, decks(target_language)')
    .eq('id', wordId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const deck = data.decks as { target_language?: string | null } | null

  return {
    id: data.id,
    language: deck?.target_language ?? null,
    deck_id: data.deck_id ?? null,
    user_id: data.user_id ?? null,
    created_at: data.created_at,
    metadata: data.metadata ?? null,
  }
}

export async function fetchStageSubStepStatusCounts(): Promise<AggregateCount[]> {
  const events = await fetchAllEvents()
  const counts = new Map<string, AggregateCount>()

  for (const event of events) {
    const key = JSON.stringify([event.stage, event.sub_step, event.status])
    const current = counts.get(key)
    if (current) {
      current.count += 1
    } else {
      counts.set(key, {
        stage: event.stage,
        sub_step: event.sub_step,
        status: event.status,
        count: 1,
      })
    }
  }

  return Array.from(counts.values()).sort((a, b) =>
    a.stage.localeCompare(b.stage)
    || (a.sub_step ?? '').localeCompare(b.sub_step ?? '')
    || a.status.localeCompare(b.status)
  )
}

export async function fetchCostByProvider(): Promise<ProviderCost[]> {
  const events = await fetchAllEvents()
  const costs = new Map<string, number>()

  for (const event of events) {
    if (event.cost_usd === null) continue
    const provider = event.model_provider ?? 'unknown'
    costs.set(provider, (costs.get(provider) ?? 0) + event.cost_usd)
  }

  return Array.from(costs.entries())
    .map(([model_provider, cost_usd]) => ({ model_provider, cost_usd }))
    .sort((a, b) => b.cost_usd - a.cost_usd)
}

export async function fetchFailureCountsByStage(): Promise<FailureCount[]> {
  const events = await fetchAllEvents()
  const counts = new Map<string, number>()

  for (const event of events) {
    if (event.status !== 'failed') continue
    counts.set(event.stage, (counts.get(event.stage) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => a.stage.localeCompare(b.stage))
}

export async function fetchRecentEvents(limit: number): Promise<PipelineEvent[]> {
  const { data, error } = await supabase
    .from('pipeline_events')
    .select(EVENT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeEvent)
}
