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

type TestUser = {
  id: string
  email: string
  password: string
  token: string
}

type CleanupIds = {
  userIds: string[]
  deckIds: string[]
  wordIds: string[]
  profileIds: string[]
  voiceIds: string[]
  auditIds: string[]
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
  throw new Error('Missing Supabase env for Phase 1H.1 admin config RPC probe')
}

const requireGuards = process.argv.includes('--guards') || process.env.PHASE1H1_REQUIRE_GUARDS === 'true'

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

async function rpc<T>(fn: string, body: unknown, token: string) {
  return request(`/rest/v1/rpc/${fn}`, {
    method: 'POST',
    key: anonKey,
    bearer: token,
    body,
  }) as Promise<{ status: number; data: T }>
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

async function createUser(label: string, role: 'learner' | 'admin' = 'learner'): Promise<TestUser> {
  const suffix = crypto.randomBytes(6).toString('hex')
  const email = `phase1h1-${label}-${suffix}@example.invalid`
  const password = `Phase1H1-${suffix}-Password!12345`
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
      display_name: `Phase 1H.1 ${label}`,
      base_language: 'English',
      role,
      credits: 25,
    }],
  })
  assert.ok(ok(profile.status), `profile upsert failed ${profile.status}: ${JSON.stringify(profile.data)}`)

  if (role === 'admin') {
    const adminRole = await request('/rest/v1/admin_roles?on_conflict=user_id', {
      method: 'POST',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{ user_id: id }],
    })
    assert.ok(ok(adminRole.status), `admin role insert failed ${adminRole.status}: ${JSON.stringify(adminRole.data)}`)
  }

  return { id, email, password, token: await signIn(email, password) }
}

async function cleanup(ids: CleanupIds) {
  if (ids.auditIds.length > 0) {
    await request(`/rest/v1/admin_audit_events?id=in.(${ids.auditIds.join(',')})`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
  if (ids.voiceIds.length > 0) {
    await request(`/rest/v1/voices?id=in.(${ids.voiceIds.join(',')})`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
  if (ids.profileIds.length > 0) {
    await request(`/rest/v1/language_profiles?id=in.(${ids.profileIds.join(',')})`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
  if (ids.wordIds.length > 0) {
    await request(`/rest/v1/words?id=in.(${ids.wordIds.join(',')})`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
  if (ids.deckIds.length > 0) {
    await request(`/rest/v1/decks?id=in.(${ids.deckIds.join(',')})`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
  for (const userId of ids.userIds) {
    await request(`/rest/v1/admin_roles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
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

async function auditRows(action: string, targetId: string) {
  const res = await request(
    `/rest/v1/admin_audit_events?action=eq.${encodeURIComponent(action)}&target_id=eq.${encodeURIComponent(targetId)}&select=*`,
    { key: serviceKey, bearer: serviceKey },
  )
  assert.ok(ok(res.status), `audit read failed ${res.status}: ${JSON.stringify(res.data)}`)
  return res.data as Array<{ id: string; action: string; target_id: string }>
}

async function createDeckAndWord(userId: string, ids: CleanupIds) {
  const deck = await request('/rest/v1/decks', {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=representation' },
    body: [{
      user_id: userId,
      name: 'Phase 1H.1 Deck',
      target_language: 'German',
      deck_type: 'card',
      status: 'complete',
      word_count: 1,
    }],
  })
  assert.ok(ok(deck.status), `deck create failed ${deck.status}: ${JSON.stringify(deck.data)}`)
  const deckId = (deck.data as Array<{ id: string }>)[0].id
  ids.deckIds.push(deckId)

  const word = await request('/rest/v1/words', {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=representation' },
    body: [{
      user_id: userId,
      deck_id: deckId,
      word: 'prüfen',
      original_input: 'prüfen',
      status: 'complete',
      current_stage: 'complete',
      needs_review: false,
    }],
  })
  assert.ok(ok(word.status), `word create failed ${word.status}: ${JSON.stringify(word.data)}`)
  const wordId = (word.data as Array<{ id: string }>)[0].id
  ids.wordIds.push(wordId)
  return { deckId, wordId }
}

async function quotaEnforcementEnabled() {
  const res = await request('/rest/v1/api_quota_settings?select=enforcement_enabled&limit=1', {
    key: serviceKey,
    bearer: serviceKey,
  })
  assert.ok(ok(res.status), `quota read failed ${res.status}: ${JSON.stringify(res.data)}`)
  return Boolean((res.data as Array<{ enforcement_enabled: boolean }>)[0]?.enforcement_enabled)
}

async function main() {
  const ids: CleanupIds = {
    userIds: [],
    deckIds: [],
    wordIds: [],
    profileIds: [],
    voiceIds: [],
    auditIds: [],
  }

  try {
    const learner = await createUser('learner')
    const admin = await createUser('admin', 'admin')
    ids.userIds.push(learner.id, admin.id)
    const { wordId } = await createDeckAndWord(admin.id, ids)

    const nonAdminReview = await rpc('admin_set_word_review_flag', {
      p_word_id: wordId,
      p_needs_review: true,
      p_reason: 'non-admin probe',
    }, learner.token)
    assert.ok(denied(nonAdminReview.status), 'non-admin must not set review flag')

    const review = await rpc<{ id: string; needs_review: boolean }>('admin_set_word_review_flag', {
      p_word_id: wordId,
      p_needs_review: true,
      p_reason: 'Phase 1H.1 test review flag',
    }, admin.token)
    assert.ok(ok(review.status), `admin_set_word_review_flag failed ${review.status}: ${JSON.stringify(review.data)}`)
    assert.equal(review.data.id, wordId)
    assert.equal(review.data.needs_review, true)
    ids.auditIds.push(...(await auditRows('admin_set_word_review_flag', wordId)).map(row => row.id))

    if (requireGuards) {
      const directReview = await request(`/rest/v1/words?id=eq.${encodeURIComponent(wordId)}`, {
        method: 'PATCH',
        key: anonKey,
        bearer: admin.token,
        extraHeaders: { Prefer: 'return=minimal' },
        body: { needs_review: false },
      })
      assert.ok(denied(directReview.status), 'direct admin/browser update to words.needs_review must be blocked')
    }

    const nonAdminProfile = await rpc('admin_upsert_language_profile', {
      p_profile_id: null,
      p_language: 'PhaseLang',
      p_name: 'Blocked',
      p_settings: {},
      p_notes: null,
      p_reason: 'non-admin probe',
    }, learner.token)
    assert.ok(denied(nonAdminProfile.status), 'non-admin must not upsert language profile')

    const language = `PhaseLang-${crypto.randomBytes(4).toString('hex')}`
    const createProfile = await rpc<{ id: string; language: string; name: string }>('admin_upsert_language_profile', {
      p_profile_id: null,
      p_language: language,
      p_name: 'Primary',
      p_settings: { concept: { model: 'test' } },
      p_notes: 'created by Phase 1H.1 probe',
      p_reason: 'Phase 1H.1 create profile',
    }, admin.token)
    assert.ok(ok(createProfile.status), `language profile create failed ${createProfile.status}: ${JSON.stringify(createProfile.data)}`)
    ids.profileIds.push(createProfile.data.id)
    ids.auditIds.push(...(await auditRows('admin_upsert_language_profile', createProfile.data.id)).map(row => row.id))

    const updateProfile = await rpc<{ id: string; name: string }>('admin_upsert_language_profile', {
      p_profile_id: createProfile.data.id,
      p_language: language,
      p_name: 'Primary Updated',
      p_settings: { concept: { model: 'updated' } },
      p_notes: 'updated by Phase 1H.1 probe',
      p_reason: 'Phase 1H.1 update profile',
    }, admin.token)
    assert.ok(ok(updateProfile.status), `language profile update failed ${updateProfile.status}: ${JSON.stringify(updateProfile.data)}`)
    assert.equal(updateProfile.data.name, 'Primary Updated')

    const createSecondProfile = await rpc<{ id: string }>('admin_upsert_language_profile', {
      p_profile_id: null,
      p_language: language,
      p_name: 'Secondary',
      p_settings: {},
      p_notes: null,
      p_reason: 'Phase 1H.1 create second profile',
    }, admin.token)
    assert.ok(ok(createSecondProfile.status), `second language profile create failed ${createSecondProfile.status}: ${JSON.stringify(createSecondProfile.data)}`)
    ids.profileIds.push(createSecondProfile.data.id)

    const activateFirst = await rpc<{ id: string; is_active: boolean }>('admin_set_language_profile_active', {
      p_profile_id: createProfile.data.id,
      p_is_active: true,
      p_reason: 'Phase 1H.1 activate profile',
    }, admin.token)
    assert.ok(ok(activateFirst.status), `profile activate failed ${activateFirst.status}: ${JSON.stringify(activateFirst.data)}`)
    assert.equal(activateFirst.data.is_active, true)

    const activateSecond = await rpc<{ id: string; is_active: boolean }>('admin_set_language_profile_active', {
      p_profile_id: createSecondProfile.data.id,
      p_is_active: true,
      p_reason: 'Phase 1H.1 activate second profile',
    }, admin.token)
    assert.ok(ok(activateSecond.status), `second profile activate failed ${activateSecond.status}: ${JSON.stringify(activateSecond.data)}`)

    const profileRows = await request(
      `/rest/v1/language_profiles?id=in.(${createProfile.data.id},${createSecondProfile.data.id})&select=id,is_active`,
      { key: serviceKey, bearer: serviceKey },
    )
    assert.ok(ok(profileRows.status), `profile read failed ${profileRows.status}: ${JSON.stringify(profileRows.data)}`)
    const activeById = new Map((profileRows.data as Array<{ id: string; is_active: boolean }>).map(row => [row.id, row.is_active]))
    assert.equal(activeById.get(createProfile.data.id), false, 'activating one profile must deactivate other profiles for the language')
    assert.equal(activeById.get(createSecondProfile.data.id), true)
    ids.auditIds.push(...(await auditRows('admin_set_language_profile_active', createSecondProfile.data.id)).map(row => row.id))

    if (requireGuards) {
      for (const method of ['POST', 'PATCH', 'DELETE'] as const) {
        const pathSuffix = method === 'POST' ? '' : `?id=eq.${encodeURIComponent(createSecondProfile.data.id)}`
        const directProfile = await request(`/rest/v1/language_profiles${pathSuffix}`, {
          method,
          key: anonKey,
          bearer: admin.token,
          extraHeaders: { Prefer: 'return=minimal' },
          body: method === 'POST'
            ? [{ language, name: 'Direct blocked', settings: {} }]
            : method === 'PATCH'
              ? { name: 'Direct blocked' }
              : undefined,
        })
        assert.ok(denied(directProfile.status), `direct admin/browser ${method} to language_profiles must be blocked`)
      }
    }

    const deleteProfile = await rpc<{ id: string; deleted: boolean }>('admin_delete_language_profile', {
      p_profile_id: createSecondProfile.data.id,
      p_reason: 'Phase 1H.1 delete profile',
    }, admin.token)
    assert.ok(ok(deleteProfile.status), `profile delete failed ${deleteProfile.status}: ${JSON.stringify(deleteProfile.data)}`)
    assert.equal(deleteProfile.data.deleted, true)
    ids.profileIds = ids.profileIds.filter(id => id !== createSecondProfile.data.id)
    ids.auditIds.push(...(await auditRows('admin_delete_language_profile', createSecondProfile.data.id)).map(row => row.id))

    const nonAdminVoice = await rpc('admin_upsert_voice', {
      p_voice_row_id: null,
      p_voice_id: 'blocked',
      p_name: 'Blocked',
      p_language: 'German',
      p_language_code: 'de',
      p_notes: null,
      p_reason: 'non-admin probe',
    }, learner.token)
    assert.ok(denied(nonAdminVoice.status), 'non-admin must not upsert voice')

    const createVoice = await rpc<{ id: string; name: string; voice_id: string }>('admin_upsert_voice', {
      p_voice_row_id: null,
      p_voice_id: `phase1h1-${crypto.randomBytes(4).toString('hex')}`,
      p_name: 'Phase 1H.1 Voice',
      p_language: 'German',
      p_language_code: 'de',
      p_notes: 'created by Phase 1H.1 probe',
      p_reason: 'Phase 1H.1 create voice',
    }, admin.token)
    assert.ok(ok(createVoice.status), `voice create failed ${createVoice.status}: ${JSON.stringify(createVoice.data)}`)
    ids.voiceIds.push(createVoice.data.id)
    ids.auditIds.push(...(await auditRows('admin_upsert_voice', createVoice.data.id)).map(row => row.id))

    const updateVoice = await rpc<{ id: string; name: string }>('admin_upsert_voice', {
      p_voice_row_id: createVoice.data.id,
      p_voice_id: createVoice.data.voice_id,
      p_name: 'Phase 1H.1 Voice Updated',
      p_language: 'German',
      p_language_code: 'de',
      p_notes: 'updated by Phase 1H.1 probe',
      p_reason: 'Phase 1H.1 update voice',
    }, admin.token)
    assert.ok(ok(updateVoice.status), `voice update failed ${updateVoice.status}: ${JSON.stringify(updateVoice.data)}`)
    assert.equal(updateVoice.data.name, 'Phase 1H.1 Voice Updated')

    if (requireGuards) {
      for (const method of ['POST', 'PATCH', 'DELETE'] as const) {
        const pathSuffix = method === 'POST' ? '' : `?id=eq.${encodeURIComponent(createVoice.data.id)}`
        const directVoice = await request(`/rest/v1/voices${pathSuffix}`, {
          method,
          key: anonKey,
          bearer: admin.token,
          extraHeaders: { Prefer: 'return=minimal' },
          body: method === 'POST'
            ? [{ voice_id: 'direct-blocked', name: 'Direct Blocked', language: 'German', language_code: 'de' }]
            : method === 'PATCH'
              ? { name: 'Direct Blocked' }
              : undefined,
        })
        assert.ok(denied(directVoice.status), `direct admin/browser ${method} to voices must be blocked`)
      }
    }

    const deleteVoice = await rpc<{ id: string; deleted: boolean }>('admin_delete_voice', {
      p_voice_row_id: createVoice.data.id,
      p_reason: 'Phase 1H.1 delete voice',
    }, admin.token)
    assert.ok(ok(deleteVoice.status), `voice delete failed ${deleteVoice.status}: ${JSON.stringify(deleteVoice.data)}`)
    assert.equal(deleteVoice.data.deleted, true)
    ids.voiceIds = ids.voiceIds.filter(id => id !== createVoice.data.id)
    ids.auditIds.push(...(await auditRows('admin_delete_voice', createVoice.data.id)).map(row => row.id))

    assert.equal(await quotaEnforcementEnabled(), false, 'quota enforcement must remain disabled')

    console.log(`Phase 1H.1 admin config ${requireGuards ? 'RPC + guard' : 'RPC'} tests passed`)
  } finally {
    await cleanup(ids)
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
