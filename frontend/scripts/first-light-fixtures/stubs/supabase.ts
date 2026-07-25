/* eslint-disable */
// Scenario-driven Supabase stub.
//
// Reproduces exactly the query-builder chains the Home surface uses:
//   .rpc('compute_word_states', …)                              (useWordStates)
//   .from('speak_conversations').select().eq().eq().gte().gte().limit()
//   .from('words').select().in()                                (homeWordDetails)
//   .from('recall_attempts').insert()                           (grade writes)
// Every builder is a thenable resolved from window.__scenario at await time.

import { record, scenario, type WordRow } from './scenario'

type Res = { data: any; error: any }

/** A thenable that never settles — the "RPC never resolves" skeleton fixture. */
const NEVER: any = {
  then() {
    return NEVER
  },
  catch() {
    return NEVER
  },
  finally() {
    return NEVER
  },
}

function settle(value: Res, ms = 0): Promise<Res> {
  return ms > 0 ? new Promise((r) => setTimeout(() => r(value), ms)) : Promise.resolve(value)
}

function rowsForLanguage(language: string): WordRow[] {
  const s = scenario()
  if (s.wordsByLanguage && language in s.wordsByLanguage) return s.wordsByLanguage[language]
  return s.words ?? []
}

const CHAIN_METHODS = [
  'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'like', 'ilike',
  'limit', 'order', 'range', 'match', 'not', 'or', 'filter', 'contains', 'overlaps',
]

type BuilderState = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  payload?: unknown
  calls: Array<{ method: string; args: unknown[] }>
}

function resolveBuilder(state: BuilderState): Promise<Res> {
  const s = scenario()

  if (state.op === 'insert') {
    record(`insert:${state.table}`, state.payload)
    if (state.table === 'recall_attempts') {
      const w = window as any
      if (!w.__inserts) w.__inserts = []
      w.__inserts.push(state.payload)
      const mode = s.insertFails
      const failCount = typeof mode === 'number' ? mode : mode ? Infinity : 0
      if (w.__inserts.length <= failCount) {
        return settle({ data: null, error: { message: 'insert failed (fixture)' } }, 30)
      }
    }
    return settle({ data: null, error: null }, 30)
  }

  if (state.table === 'speak_conversations') {
    return settle({ data: s.speakRows ?? [], error: null }, 10)
  }

  if (state.table === 'words') {
    const inCall = state.calls.find((c) => c.method === 'in')
    const ids = (inCall?.args?.[1] as string[]) ?? []
    const data = ids.map((id) => ({ id, thumbnail_url: null, tts_audio_url: null, metadata: null }))
    return settle({ data, error: null }, 10)
  }

  return settle({ data: [], error: null }, 10)
}

function makeBuilder(table: string, op: BuilderState['op'], payload?: unknown): any {
  const state: BuilderState = { table, op, payload, calls: [] }
  const builder: any = {}
  for (const method of CHAIN_METHODS) {
    builder[method] = (...args: unknown[]) => {
      state.calls.push({ method, args })
      return builder
    }
  }
  builder.single = () => builder
  builder.maybeSingle = () => builder
  builder.then = (onOk: any, onErr: any) => resolveBuilder(state).then(onOk, onErr)
  builder.catch = (onErr: any) => resolveBuilder(state).catch(onErr)
  builder.finally = (cb: any) => resolveBuilder(state).finally(cb)
  return builder
}

export const supabase: any = {
  from(table: string) {
    return {
      select: (...args: unknown[]) => {
        const b = makeBuilder(table, 'select')
        return b.select(...args)
      },
      insert: (payload: unknown) => makeBuilder(table, 'insert', payload),
      update: (payload: unknown) => makeBuilder(table, 'update', payload),
      delete: () => makeBuilder(table, 'delete'),
    }
  },
  rpc(name: string, params: any) {
    const s = scenario()
    record(`rpc:${name}`, params)
    if (name !== 'compute_word_states') return settle({ data: null, error: null })
    const mode = s.rpc ?? 'ok'
    if (mode === 'never') return NEVER
    if (mode === 'error') {
      return settle({ data: null, error: { message: 'compute_word_states unavailable (fixture)' } }, s.rpcDelayMs ?? 10)
    }
    return settle({ data: rowsForLanguage(params?.p_target_language ?? ''), error: null }, s.rpcDelayMs ?? 10)
  },
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
  removeChannel: () => {},
}
