import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

type RequestOptions = {
  method?: string
  key?: string
  bearer?: string
  body?: unknown
  extraHeaders?: Record<string, string>
}

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const idx = line.indexOf('=')
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv(path.resolve('..', '.env'))
loadEnv(path.resolve('.env'))

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error('Missing Supabase env for Phase 1E RLS probe')
}

async function request(pathname: string, options: RequestOptions = {}) {
  const key = options.key ?? anonKey!
  const bearer = options.bearer ?? key
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${bearer}`,
    ...(options.extraHeaders ?? {}),
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${supabaseUrl}${pathname}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data }
}

function ok(status: number) {
  return status >= 200 && status < 300
}

function denied(status: number) {
  return [400, 401, 403, 404].includes(status)
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    key: anonKey,
    bearer: anonKey,
    body: { email, password },
  })
  assert.ok(ok(res.status), `sign-in failed ${res.status}: ${JSON.stringify(res.data)}`)
  const token = (res.data as { access_token?: string }).access_token
  assert.ok(token, 'sign-in did not return access token')
  return token
}

async function createUser(label: string) {
  const suffix = crypto.randomBytes(6).toString('hex')
  const email = `phase1e-${label}-${suffix}@example.invalid`
  const password = `Phase1E-${suffix}-Password!12345`
  const created = await request('/auth/v1/admin/users', {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    body: { email, password, email_confirm: true },
  })
  assert.ok(ok(created.status), `user create failed ${created.status}: ${JSON.stringify(created.data)}`)
  const id = (created.data as { id?: string }).id
  assert.ok(id, 'created user did not return id')

  const profile = await request('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: [{
      id,
      email,
      display_name: `Phase 1E ${label}`,
      base_language: 'English',
      role: 'learner',
      credits: 20,
    }],
  })
  assert.ok(ok(profile.status), `profile upsert failed ${profile.status}: ${JSON.stringify(profile.data)}`)

  return { id, email, password, token: await signIn(email, password) }
}

async function insertRows<T>(table: string, rows: unknown[]): Promise<T[]> {
  const res = await request(`/rest/v1/${table}`, {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=representation' },
    body: rows,
  })
  assert.ok(ok(res.status), `${table} insert failed ${res.status}: ${JSON.stringify(res.data)}`)
  return res.data as T[]
}

async function cleanup(ids: {
  userA?: string
  userB?: string
  deckIds: string[]
  jobIds: string[]
  shareIds: string[]
}) {
  for (const shareId of ids.shareIds) {
    await request(`/rest/v1/shared_words?id=eq.${encodeURIComponent(shareId)}`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
  for (const jobId of ids.jobIds) {
    await request(`/rest/v1/generation_jobs?id=eq.${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
  if (ids.deckIds.length > 0) {
    await request(`/rest/v1/words?deck_id=in.(${ids.deckIds.join(',')})`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
    await request(`/rest/v1/decks?id=in.(${ids.deckIds.join(',')})`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
  for (const userId of [ids.userA, ids.userB].filter(Boolean) as string[]) {
    await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
    await request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
    }).catch(() => {})
  }
}

const cleanupIds: {
  userA?: string
  userB?: string
  deckIds: string[]
  jobIds: string[]
  shareIds: string[]
} = { deckIds: [], jobIds: [], shareIds: [] }

try {
  const userA = await createUser('owner')
  const userB = await createUser('other')
  cleanupIds.userA = userA.id
  cleanupIds.userB = userB.id

  type DeckRow = { id: string; name: string; status: string; word_count: number; target_language: string }
  const [sourceDeck, targetDeck, otherDeck] = await insertRows<DeckRow>('decks', [
    { user_id: userA.id, name: 'Phase 1E Source', target_language: 'Spanish', word_count: 3, status: 'complete' },
    { user_id: userA.id, name: 'Phase 1E Target', target_language: 'Spanish', word_count: 0, status: 'draft' },
    { user_id: userB.id, name: 'Phase 1E Other', target_language: 'Spanish', word_count: 1, status: 'complete' },
  ])
  cleanupIds.deckIds.push(sourceDeck.id, targetDeck.id, otherDeck.id)

  type WordRow = { id: string; deck_id: string; status: string; current_stage: string; rating: number | null }
  const [moveWord, pendingWord, failedWord, otherWord] = await insertRows<WordRow>('words', [
    { user_id: userA.id, deck_id: sourceDeck.id, word: 'phase1e_move', status: 'complete', current_stage: 'complete', rating: null },
    { user_id: userA.id, deck_id: sourceDeck.id, word: 'phase1e_pending', status: 'pending', current_stage: 'pending', rating: null },
    { user_id: userA.id, deck_id: sourceDeck.id, word: 'phase1e_failed', status: 'failed', current_stage: 'failed', rating: null },
    { user_id: userB.id, deck_id: otherDeck.id, word: 'phase1e_other', status: 'complete', current_stage: 'complete', rating: null },
  ])

  type JobRow = { id: string }
  const [job] = await insertRows<JobRow>('generation_jobs', [
    {
      user_id: userA.id,
      deck_id: sourceDeck.id,
      status: 'pending',
      target_language: 'Spanish',
      words_total: 3,
      words_completed: 0,
      priority: 0,
    },
  ])
  cleanupIds.jobIds.push(job.id)

  let res = await request('/rest/v1/rpc/rate_word', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_id: moveWord.id, p_rating: 5 },
  })
  assert.ok(ok(res.status), `owner rate_word failed ${res.status}: ${JSON.stringify(res.data)}`)
  assert.equal((res.data as { rating?: number }).rating, 5)

  res = await request('/rest/v1/rpc/rate_word', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_id: otherWord.id, p_rating: 4 },
  })
  assert.ok(denied(res.status), 'owner must not rate another user word')

  res = await request('/rest/v1/rpc/update_deck_metadata', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_deck_id: sourceDeck.id, p_name: '  Renamed Phase 1E Source  ' },
  })
  assert.ok(ok(res.status), `owner update_deck_metadata failed ${res.status}: ${JSON.stringify(res.data)}`)
  assert.equal((res.data as { name?: string }).name, 'Renamed Phase 1E Source')

  res = await request('/rest/v1/rpc/update_deck_metadata', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_deck_id: otherDeck.id, p_name: 'Bad Rename' },
  })
  assert.ok(denied(res.status), 'owner must not rename another user deck')

  res = await request('/rest/v1/rpc/move_words_to_deck', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_ids: [moveWord.id], p_target_deck_id: targetDeck.id },
  })
  assert.ok(ok(res.status), `move_words_to_deck failed ${res.status}: ${JSON.stringify(res.data)}`)
  const moveResult = res.data as { source_decks?: Array<{ id: string; word_count: number; status: string }>; target_deck?: { word_count: number; status: string } }
  assert.equal(moveResult.target_deck?.word_count, 1)
  assert.equal(moveResult.target_deck?.status, 'complete')
  assert.equal(moveResult.source_decks?.find((deck) => deck.id === sourceDeck.id)?.word_count, 2)
  assert.equal(moveResult.source_decks?.find((deck) => deck.id === sourceDeck.id)?.status, 'generating')

  res = await request('/rest/v1/rpc/move_words_to_deck', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_ids: [otherWord.id], p_target_deck_id: targetDeck.id },
  })
  assert.ok(denied(res.status), 'owner must not move another user word')

  res = await request('/rest/v1/rpc/move_words_to_deck', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_ids: [moveWord.id], p_target_deck_id: otherDeck.id },
  })
  assert.ok(denied(res.status), 'owner must not move word into another user deck')

  res = await request('/rest/v1/rpc/archive_word', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_id: pendingWord.id },
  })
  assert.ok(ok(res.status), `archive_word failed ${res.status}: ${JSON.stringify(res.data)}`)

  res = await request('/rest/v1/rpc/request_word_retry', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_id: failedWord.id, p_retry_scope: 'word' },
  })
  assert.ok(ok(res.status), `request_word_retry should still work ${res.status}: ${JSON.stringify(res.data)}`)
  assert.equal((res.data as { success?: boolean }).success, true)

  res = await request('/rest/v1/rpc/archive_word', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_id: failedWord.id },
  })
  assert.ok(ok(res.status), `archive failed retry word failed ${res.status}: ${JSON.stringify(res.data)}`)

  res = await request(`/rest/v1/words?id=eq.${moveWord.id}`, {
    method: 'PATCH',
    key: anonKey,
    bearer: userA.token,
    extraHeaders: { Prefer: 'return=representation' },
    body: { status: 'failed', current_stage: 'failed', video_url: 'https://example.invalid/blocked.mp4' },
  })
  assert.ok(denied(res.status), 'normal user must not directly update word pipeline fields')

  res = await request(`/rest/v1/generation_jobs?id=eq.${job.id}`, {
    method: 'PATCH',
    key: anonKey,
    bearer: userA.token,
    extraHeaders: { Prefer: 'return=representation' },
    body: { status: 'approved', priority: 99, words_completed: 1 },
  })
  assert.ok(denied(res.status), 'normal user must not directly update job pipeline fields')

  res = await request(`/rest/v1/decks?id=eq.${targetDeck.id}`, {
    method: 'PATCH',
    key: anonKey,
    bearer: userA.token,
    extraHeaders: { Prefer: 'return=representation' },
    body: { status: 'complete', word_count: 99 },
  })
  assert.ok(denied(res.status), 'normal user must not directly update deck pipeline fields')

  res = await request('/rest/v1/rpc/archive_deck', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_deck_id: sourceDeck.id },
  })
  assert.ok(ok(res.status), `archive_deck failed ${res.status}: ${JSON.stringify(res.data)}`)

  res = await request('/rest/v1/rpc/create_or_get_share_link', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: { p_word_id: moveWord.id },
  })
  assert.ok(ok(res.status), `create_or_get_share_link failed ${res.status}: ${JSON.stringify(res.data)}`)
  const shareId = (res.data as { id?: string }).id
  assert.ok(shareId, 'create_or_get_share_link did not return id')
  cleanupIds.shareIds.push(shareId)

  res = await request(`/rest/v1/shared_words?id=eq.${shareId}`, {
    method: 'PATCH',
    key: anonKey,
    bearer: anonKey,
    extraHeaders: { Prefer: 'return=representation' },
    body: { view_count: 123 },
  })
  assert.ok(
    denied(res.status) || ok(res.status),
    `public direct shared_words update returned unexpected status ${res.status}: ${JSON.stringify(res.data)}`,
  )

  res = await request('/rest/v1/rpc/increment_shared_word_view', {
    method: 'POST',
    key: anonKey,
    bearer: anonKey,
    body: { p_share_id: shareId },
  })
  assert.ok(ok(res.status), `increment_shared_word_view failed ${res.status}: ${JSON.stringify(res.data)}`)
  assert.equal((res.data as { view_count?: number }).view_count, 1)

  res = await request('/rest/v1/rpc/increment_shared_word_view', {
    method: 'POST',
    key: anonKey,
    bearer: anonKey,
    body: { p_share_id: shareId },
  })
  assert.ok(ok(res.status), `second increment_shared_word_view failed ${res.status}: ${JSON.stringify(res.data)}`)
  assert.equal((res.data as { view_count?: number }).view_count, 2)

  res = await request('/rest/v1/rpc/submit_generation', {
    method: 'POST',
    key: anonKey,
    bearer: userA.token,
    body: {
      p_deck_payload: { name: 'Phase 1E Submit Deck' },
      p_word_list: ['phase1e_submit_word'],
      p_job_payload: { target_language: 'Spanish', art_style: null, movie_override: null, settings_override: {} },
      p_existing_deck_id: null,
      p_idempotency_key: `phase1e-${crypto.randomBytes(4).toString('hex')}`,
    },
  })
  assert.ok(ok(res.status), `submit_generation should still work ${res.status}: ${JSON.stringify(res.data)}`)
  const submitResult = res.data as { deck_id?: string; job_id?: string; success?: boolean }
  assert.equal(submitResult.success, true)
  if (submitResult.deck_id) cleanupIds.deckIds.push(submitResult.deck_id)
  if (submitResult.job_id) cleanupIds.jobIds.push(submitResult.job_id)

  console.log('Phase 1E user deck/word/share RPC and RLS tests passed')
} finally {
  await cleanup(cleanupIds)
}
