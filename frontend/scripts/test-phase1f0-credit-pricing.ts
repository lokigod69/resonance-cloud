import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { computeCreditCost, deckRowToProductLane } from '../src/components/generate/useWizardState'

type RequestOptions = {
  method?: string
  key?: string
  bearer?: string
  body?: unknown
  extraHeaders?: Record<string, string>
}

type TestUser = {
  id: string
  email: string
  password: string
  token: string
}

type SubmitResult = {
  success?: boolean
  error?: string
  deck_id?: string
  job_id?: string
  deck_type?: 'video' | 'card'
  credit_cost_per_word?: number
  credits_charged?: number
  idempotent?: boolean
}

type JobRow = {
  id: string
  deck_id: string
  credits_charged: number
  credit_cost_per_word: number
  deck_type?: 'video' | 'card' | null
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
  throw new Error('Missing Supabase env for Phase 1F.0 credit pricing probe')
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

async function createUser(label: string, credits: number): Promise<TestUser> {
  const suffix = crypto.randomBytes(6).toString('hex')
  const email = `phase1f0-${label}-${suffix}@example.invalid`
  const password = `Phase1F0-${suffix}-Password!12345`
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
      display_name: `Phase 1F0 ${label}`,
      base_language: 'English',
      role: 'learner',
      credits,
    }],
  })
  assert.ok(ok(profile.status), `profile upsert failed ${profile.status}: ${JSON.stringify(profile.data)}`)

  return { id, email, password, token: await signIn(email, password) }
}

async function cleanup(ids: { userIds: string[]; deckIds: string[]; jobIds: string[] }) {
  if (ids.jobIds.length > 0) {
    await request(`/rest/v1/generation_jobs?id=in.(${ids.jobIds.join(',')})`, {
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
  for (const userId of ids.userIds) {
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

async function setCredits(userId: string, credits: number) {
  const res = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=minimal' },
    body: { credits },
  })
  assert.ok(ok(res.status), `set credits failed ${res.status}: ${JSON.stringify(res.data)}`)
}

async function getCredits(userId: string): Promise<number> {
  const res = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=credits`, {
    key: serviceKey,
    bearer: serviceKey,
  })
  assert.ok(ok(res.status), `read credits failed ${res.status}: ${JSON.stringify(res.data)}`)
  const row = (res.data as Array<{ credits?: number }>)[0]
  assert.equal(typeof row?.credits, 'number', 'profile credits missing')
  return row.credits
}

async function submitGeneration(
  user: TestUser,
  deckType: 'video' | 'card',
  words: string[],
  options: { existingDeckId?: string; overrideDeckType?: 'video' | 'card'; idempotencyKey?: string } = {}
): Promise<SubmitResult> {
  const effectiveDeckType = options.overrideDeckType ?? deckType
  const res = await request('/rest/v1/rpc/submit_generation', {
    method: 'POST',
    key: anonKey,
    bearer: user.token,
    body: {
      p_deck_payload: options.existingDeckId
        ? { name: 'Browser Override Attempt', deck_type: effectiveDeckType }
        : { name: `Phase 1F0 ${deckType} Deck`, deck_type: effectiveDeckType },
      p_word_list: words,
      p_job_payload: {
        target_language: 'Spanish',
        art_style: null,
        movie_override: null,
        settings_override: {},
      },
      p_existing_deck_id: options.existingDeckId ?? null,
      p_idempotency_key: options.idempotencyKey ?? `phase1f0-${crypto.randomBytes(6).toString('hex')}`,
    },
  })
  assert.ok(ok(res.status), `submit_generation failed ${res.status}: ${JSON.stringify(res.data)}`)
  return res.data as SubmitResult
}

async function insertDeck(userId: string, deckType: 'video' | 'card') {
  const res = await request('/rest/v1/decks', {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=representation' },
    body: [{
      user_id: userId,
      name: `Phase 1F0 existing ${deckType}`,
      target_language: 'Spanish',
      word_count: 0,
      status: 'draft',
      deck_type: deckType,
    }],
  })
  assert.ok(ok(res.status), `deck insert failed ${res.status}: ${JSON.stringify(res.data)}`)
  return (res.data as Array<{ id: string }>)[0]
}

async function insertJob(userId: string, deckId: string) {
  const res = await request('/rest/v1/generation_jobs', {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=representation' },
    body: [{
      user_id: userId,
      deck_id: deckId,
      status: 'pending',
      target_language: 'Spanish',
      words_total: 1,
      words_completed: 0,
      priority: 0,
    }],
  })
  assert.ok(ok(res.status), `job insert failed ${res.status}: ${JSON.stringify(res.data)}`)
  return (res.data as Array<{ id: string }>)[0]
}

async function getJob(jobId: string): Promise<JobRow> {
  const res = await request(
    `/rest/v1/generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,deck_id,credits_charged,credit_cost_per_word,deck_type`,
    { key: serviceKey, bearer: serviceKey },
  )
  assert.ok(ok(res.status), `job read failed ${res.status}: ${JSON.stringify(res.data)}`)
  const row = (res.data as JobRow[])[0]
  assert.ok(row, 'generation job missing')
  return row
}

async function assertSubmitCost(
  user: TestUser,
  deckType: 'video' | 'card',
  words: string[],
  expectedCostPerWord: number,
  expectedTotal: number,
  cleanupIds: { deckIds: string[]; jobIds: string[] },
) {
  const before = await getCredits(user.id)
  const result = await submitGeneration(user, deckType, words)
  assert.equal(result.success, true)
  assert.equal(result.deck_type, deckType)
  assert.equal(result.credit_cost_per_word, expectedCostPerWord)
  assert.equal(result.credits_charged, expectedTotal)
  assert.ok(result.deck_id, 'submit did not return deck_id')
  assert.ok(result.job_id, 'submit did not return job_id')
  cleanupIds.deckIds.push(result.deck_id)
  cleanupIds.jobIds.push(result.job_id)

  const after = await getCredits(user.id)
  assert.equal(before - after, expectedTotal, `${deckType} submit debited exact cost`)

  const job = await getJob(result.job_id)
  assert.equal(job.credits_charged, expectedTotal)
  assert.equal(job.credit_cost_per_word, expectedCostPerWord)
  if (job.deck_type !== undefined) assert.equal(job.deck_type, deckType)
}

async function main() {
  assert.equal(computeCreditCost('video', 2), 20)
  assert.equal(computeCreditCost('card_standard', 2), 2)
  assert.equal(computeCreditCost('card_premium', 2), 10)
  assert.equal(computeCreditCost(deckRowToProductLane('card', 'zturbo'), 2), 2)

  const cleanupIds: { userIds: string[]; deckIds: string[]; jobIds: string[] } = {
    userIds: [],
    deckIds: [],
    jobIds: [],
  }

  try {
    const user = await createUser('pricing', 100)
    cleanupIds.userIds.push(user.id)

    await setCredits(user.id, 9)
    const insufficient = await submitGeneration(user, 'video', ['insufficient'])
    assert.equal(insufficient.success, false)
    assert.match(insufficient.error ?? '', /need 10/i)
    assert.equal(await getCredits(user.id), 9, 'insufficient video submit must not debit')

    await setCredits(user.id, 100)
    await assertSubmitCost(user, 'video', ['uno'], 10, 10, cleanupIds)
    await assertSubmitCost(user, 'card', ['dos'], 1, 1, cleanupIds)
    await assertSubmitCost(user, 'video', ['tres', 'cuatro'], 10, 20, cleanupIds)
    await assertSubmitCost(user, 'card', ['cinco', 'seis'], 1, 2, cleanupIds)

    const existingVideo = await insertDeck(user.id, 'video')
    cleanupIds.deckIds.push(existingVideo.id)
    await setCredits(user.id, 20)
    const videoAppendBefore = await getCredits(user.id)
    const videoAppend = await submitGeneration(user, 'video', ['siete'], {
      existingDeckId: existingVideo.id,
      overrideDeckType: 'card',
    })
    assert.equal(videoAppend.success, true)
    assert.equal(videoAppend.deck_id, existingVideo.id)
    assert.equal(videoAppend.deck_type, 'video')
    assert.equal(videoAppend.credit_cost_per_word, 10)
    assert.equal(videoAppend.credits_charged, 10)
    assert.ok(videoAppend.job_id)
    cleanupIds.jobIds.push(videoAppend.job_id)
    assert.equal(videoAppendBefore - await getCredits(user.id), 10)

    const existingCard = await insertDeck(user.id, 'card')
    cleanupIds.deckIds.push(existingCard.id)
    await setCredits(user.id, 20)
    const cardAppendBefore = await getCredits(user.id)
    const cardAppend = await submitGeneration(user, 'card', ['ocho'], {
      existingDeckId: existingCard.id,
      overrideDeckType: 'video',
    })
    assert.equal(cardAppend.success, true)
    assert.equal(cardAppend.deck_id, existingCard.id)
    assert.equal(cardAppend.deck_type, 'card')
    assert.equal(cardAppend.credit_cost_per_word, 1)
    assert.equal(cardAppend.credits_charged, 1)
    assert.ok(cardAppend.job_id)
    cleanupIds.jobIds.push(cardAppend.job_id)
    assert.equal(cardAppendBefore - await getCredits(user.id), 1)

    await setCredits(user.id, 50)
    const key = `phase1f0-idem-${crypto.randomBytes(6).toString('hex')}`
    const idemFirstBefore = await getCredits(user.id)
    const idemFirst = await submitGeneration(user, 'video', ['nueve'], { idempotencyKey: key })
    assert.equal(idemFirst.success, true)
    assert.equal(idemFirst.idempotent, false)
    assert.ok(idemFirst.deck_id)
    assert.ok(idemFirst.job_id)
    cleanupIds.deckIds.push(idemFirst.deck_id)
    cleanupIds.jobIds.push(idemFirst.job_id)
    const idemAfterFirst = await getCredits(user.id)
    const idemSecond = await submitGeneration(user, 'video', ['nueve'], { idempotencyKey: key })
    assert.equal(idemSecond.success, true)
    assert.equal(idemSecond.idempotent, true)
    assert.equal(idemSecond.deck_id, idemFirst.deck_id)
    assert.equal(idemSecond.job_id, idemFirst.job_id)
    assert.equal(idemSecond.credits_charged, 10)
    assert.equal(await getCredits(user.id), idemAfterFirst, 'idempotent repeat must not debit twice')
    assert.equal(idemFirstBefore - idemAfterFirst, 10)

    await setCredits(user.id, 25)
    const beforeInvalid = await getCredits(user.id)
    const invalid = await request('/rest/v1/rpc/submit_generation', {
      method: 'POST',
      key: anonKey,
      bearer: user.token,
      body: {
        p_deck_payload: { name: 'Invalid', deck_type: 'card' },
        p_word_list: [''],
        p_job_payload: { target_language: 'Spanish', settings_override: {} },
        p_existing_deck_id: null,
        p_idempotency_key: `phase1f0-invalid-${crypto.randomBytes(6).toString('hex')}`,
      },
    })
    assert.ok(denied(invalid.status), `blank word validation should fail, got ${invalid.status}: ${JSON.stringify(invalid.data)}`)
    assert.equal(await getCredits(user.id), beforeInvalid, 'failed validation must not debit credits')

    await setCredits(user.id, 5)
    const retryDeck = await insertDeck(user.id, 'video')
    cleanupIds.deckIds.push(retryDeck.id)
    const retryWordRes = await request('/rest/v1/words', {
      method: 'POST',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=representation' },
      body: [{
        user_id: user.id,
        deck_id: retryDeck.id,
        word: 'retry-me',
        original_input: 'retry-me',
        status: 'failed',
        current_stage: 'failed',
        retry_requested: false,
      }],
    })
    assert.ok(ok(retryWordRes.status), `retry word insert failed ${retryWordRes.status}: ${JSON.stringify(retryWordRes.data)}`)
    const retryWordId = (retryWordRes.data as Array<{ id: string }>)[0].id
    const retryBefore = await getCredits(user.id)
    const retry = await request('/rest/v1/rpc/request_word_retry', {
      method: 'POST',
      key: anonKey,
      bearer: user.token,
      body: { p_word_id: retryWordId, p_retry_scope: 'word' },
    })
    assert.ok(ok(retry.status), `request_word_retry failed ${retry.status}: ${JSON.stringify(retry.data)}`)
    assert.equal((retry.data as { success?: boolean }).success, true)
    assert.equal(retryBefore - await getCredits(user.id), 1, 'request_word_retry must charge exactly 1 credit')

    const directCredit = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      key: anonKey,
      bearer: user.token,
      extraHeaders: { Prefer: 'return=representation' },
      body: { credits: 999 },
    })
    assert.ok(denied(directCredit.status), 'normal user must not directly update profile credits')

    const directDeck = await request(`/rest/v1/decks?id=eq.${retryDeck.id}`, {
      method: 'PATCH',
      key: anonKey,
      bearer: user.token,
      extraHeaders: { Prefer: 'return=representation' },
      body: { status: 'complete', word_count: 99 },
    })
    assert.ok(denied(directDeck.status), 'normal user must not directly update deck pipeline fields')

    const directJob = await insertJob(user.id, retryDeck.id)
    cleanupIds.jobIds.push(directJob.id)
    const directJobUpdate = await request(`/rest/v1/generation_jobs?id=eq.${directJob.id}`, {
      method: 'PATCH',
      key: anonKey,
      bearer: user.token,
      extraHeaders: { Prefer: 'return=representation' },
      body: { status: 'processing', priority: 99, words_completed: 1 },
    })
    assert.ok(denied(directJobUpdate.status), 'normal user must not directly update generation job pipeline fields')

    const quota = await request('/rest/v1/api_quota_settings?select=enforcement_enabled', {
      key: serviceKey,
      bearer: serviceKey,
    })
    assert.ok(ok(quota.status), `quota read failed ${quota.status}: ${JSON.stringify(quota.data)}`)
    assert.equal((quota.data as Array<{ enforcement_enabled: boolean }>)[0]?.enforcement_enabled, false)

    // The standalone Settings page (and its stale pricing copy) was removed in
    // the 2026-07 cleanup pass; profile settings live in ProfileModal now.

    console.log('Phase 1F.0 credit pricing tests passed')
  } finally {
    await cleanup(cleanupIds)
  }
}

await main()
