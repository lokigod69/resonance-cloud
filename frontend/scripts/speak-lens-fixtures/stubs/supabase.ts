import { scenario } from './scenario'

const conversations = [{
  id: 'fixture-conversation', language: 'de', voice_name: 'Eve', character_id: null, level: 'beginner',
  message_count: 4, title: null, started_at: new Date(Date.now() - 3_600_000).toISOString(), ended_at: new Date().toISOString(),
  corrections: null, mode: null, provider: 'grok', grok_voice: 'eve', grok_category: 'travel',
}]
const messages = [
  { id: 'm1', conversation_id: 'fixture-conversation', role: 'assistant', content: 'Hallo! Wohin möchtest du reisen?', created_at: new Date().toISOString() },
  { id: 'm2', conversation_id: 'fixture-conversation', role: 'user', content: 'Ich möchte in die Berge reisen.', created_at: new Date().toISOString() },
  { id: 'm3', conversation_id: 'fixture-conversation', role: 'assistant', content: 'Was gefällt dir dort besonders?', created_at: new Date().toISOString() },
  { id: 'm4', conversation_id: 'fixture-conversation', role: 'user', content: 'Die Aussicht und die Ruhe.', created_at: new Date().toISOString() },
]

function query(table: string) {
  let operation = 'select'
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    abortSignal: (signal: AbortSignal) => signal.aborted
      ? Promise.reject(signal.reason)
      : chain,
    update: () => { operation = 'update'; return chain },
    delete: () => { operation = 'delete'; return chain },
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      const data = operation === 'select'
        ? table === 'speak_conversations' ? conversations
          : table === 'speak_messages' ? messages
            : table === 'decks' ? [{ target_language: 'German' }, { target_language: 'French' }]
              : []
        : null
      return Promise.resolve({ data, error: null }).then(resolve, reject)
    },
  }
  return chain
}

export const supabase = {
  auth: { getSession: async () => ({ data: { session: { access_token: 'fixture-token' } }, error: null }) },
  from: query,
  rpc: async (name: string, args?: Record<string, unknown>) => {
    if (name !== 'get_user_words_for_language') return { data: [], error: null }

    const language = String(args?.p_target_language ?? '')
    const currentScenario = scenario()
    const fixtureWindow = window as unknown as { __lensHintRequests: string[]; __lensHintResponses: string[] }
    fixtureWindow.__lensHintRequests.push(language)
    const delayMs = currentScenario.lensHintDelayMs?.[language] ?? 0
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    fixtureWindow.__lensHintResponses.push(language)
    return { data: currentScenario.lensExistingWords?.[language] ?? [], error: null }
  },
}

export type AuthProfile = { id: string; base_language: string; role?: string }
