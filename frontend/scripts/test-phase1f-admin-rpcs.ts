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
  jobIds: string[]
  inviteCodeIds: string[]
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
  throw new Error('Missing Supabase env for Phase 1F admin RPC probe')
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

async function createUser(label: string, credits: number, role: 'learner' | 'admin' = 'learner'): Promise<TestUser> {
  const suffix = crypto.randomBytes(6).toString('hex')
  const email = `phase1f-${label}-${suffix}@example.invalid`
  const password = `Phase1F-${suffix}-Password!12345`
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
      display_name: `Phase 1F ${label}`,
      base_language: 'English',
      role,
      credits,
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
  if (ids.inviteCodeIds.length > 0) {
    await request(`/rest/v1/invite_codes?id=in.(${ids.inviteCodeIds.join(',')})`, {
      method: 'DELETE',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=minimal' },
    }).catch(() => {})
  }
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

async function getCredits(userId: string): Promise<number> {
  const res = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=credits`, {
    key: serviceKey,
    bearer: serviceKey,
  })
  assert.ok(ok(res.status), `read credits failed ${res.status}: ${JSON.stringify(res.data)}`)
  return (res.data as Array<{ credits: number }>)[0].credits
}

async function getProfileRole(userId: string): Promise<string> {
  const res = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role`, {
    key: serviceKey,
    bearer: serviceKey,
  })
  assert.ok(ok(res.status), `read role failed ${res.status}: ${JSON.stringify(res.data)}`)
  return (res.data as Array<{ role: string }>)[0].role
}

async function countAdminRoles(): Promise<number> {
  const res = await request('/rest/v1/admin_roles?select=user_id', {
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'count=exact' },
  })
  assert.ok(ok(res.status), `read admin roles failed ${res.status}: ${JSON.stringify(res.data)}`)
  const range = res.status === 206 ? null : null
  void range
  return (res.data as Array<{ user_id: string }>).length
}

async function getSystemSettings(): Promise<{ auto_approve: boolean; queue_paused: boolean }> {
  const res = await request('/rest/v1/system_settings?id=eq.1&select=auto_approve,queue_paused', {
    key: serviceKey,
    bearer: serviceKey,
  })
  assert.ok(ok(res.status), `read system settings failed ${res.status}: ${JSON.stringify(res.data)}`)
  const row = (res.data as Array<{ auto_approve: boolean; queue_paused: boolean }>)[0]
  return row ?? { auto_approve: false, queue_paused: false }
}

async function restoreSystemSettings(settings: { auto_approve: boolean; queue_paused: boolean }) {
  await request('/rest/v1/system_settings?id=eq.1', {
    method: 'PATCH',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=minimal' },
    body: {
      auto_approve: settings.auto_approve,
      queue_paused: settings.queue_paused,
    },
  }).catch(() => {})
}

async function auditRows(action: string, targetId: string) {
  const res = await request(
    `/rest/v1/admin_audit_events?action=eq.${encodeURIComponent(action)}&target_id=eq.${encodeURIComponent(targetId)}&select=*`,
    { key: serviceKey, bearer: serviceKey },
  )
  assert.ok(ok(res.status), `read audit failed ${res.status}: ${JSON.stringify(res.data)}`)
  return res.data as Array<{ id: string; action: string; target_id: string; before: unknown; after: unknown; metadata: Record<string, unknown> }>
}

async function insertDeck(userId: string, deckType: 'video' | 'card' = 'video') {
  const res = await request('/rest/v1/decks', {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=representation' },
    body: [{
      user_id: userId,
      name: `Phase 1F ${deckType} deck`,
      target_language: 'Spanish',
      word_count: 0,
      status: 'draft',
      deck_type: deckType,
    }],
  })
  assert.ok(ok(res.status), `deck insert failed ${res.status}: ${JSON.stringify(res.data)}`)
  return (res.data as Array<{ id: string }>)[0]
}

async function insertJob(userId: string, deckId: string, status: string, creditsCharged: number) {
  const res = await request('/rest/v1/generation_jobs', {
    method: 'POST',
    key: serviceKey,
    bearer: serviceKey,
    extraHeaders: { Prefer: 'return=representation' },
    body: [{
      user_id: userId,
      deck_id: deckId,
      status,
      target_language: 'Spanish',
      words_total: 1,
      words_completed: 0,
      priority: 0,
      credits_charged: creditsCharged,
      credit_cost_per_word: creditsCharged,
      deck_type: 'video',
    }],
  })
  assert.ok(ok(res.status), `job insert failed ${res.status}: ${JSON.stringify(res.data)}`)
  return (res.data as Array<{ id: string }>)[0]
}

function assertNoPrivilegedBrowserMutations() {
  const queue = fs.readFileSync(path.resolve('src/pages/admin/Queue.tsx'), 'utf8')
  assert.ok(!queue.includes(".from('profiles')\n        .select('credits')"), 'Queue must not read credits for browser-side refund math')
  assert.ok(!queue.includes(".from('profiles').update"), 'Queue must not directly update profile credits')
  assert.ok(!queue.includes(".from('generation_jobs').update"), 'Queue must not directly update generation job status')
  assert.ok(!queue.includes(".from('system_settings').update"), 'Queue must not directly update system settings')

  const users = fs.readFileSync(path.resolve('src/pages/admin/Users.tsx'), 'utf8')
  assert.ok(!users.includes(".from('profiles')\n        .update"), 'Users must not directly update profile role/credits')
  assert.ok(!users.includes(".from('invite_codes').insert"), 'Users must not directly insert invite codes')
  assert.ok(!users.includes(".from('invite_codes')\n      .update"), 'Users must not directly update invite codes')

  const content = fs.readFileSync(path.resolve('src/pages/admin/Content.tsx'), 'utf8')
  assert.ok(!content.includes('supabase.storage.from'), 'Content must not remove storage directly')
  assert.ok(!content.includes(".from('words').delete"), 'Content must not directly delete words')
  assert.ok(!content.includes(".from('decks').delete"), 'Content must not directly delete decks')
  assert.ok(!content.includes(".from('generation_jobs').delete"), 'Content must not directly delete generation jobs')
}

async function main() {
  const cleanupIds: CleanupIds = { userIds: [], deckIds: [], jobIds: [], inviteCodeIds: [], auditIds: [] }
  let originalSystemSettings: { auto_approve: boolean; queue_paused: boolean } | null = null

  try {
    const admin = await createUser('admin', 100, 'admin')
    const otherAdmin = await createUser('other-admin', 20, 'admin')
    const learner = await createUser('learner', 10)
    cleanupIds.userIds.push(admin.id, otherAdmin.id, learner.id)
    originalSystemSettings = await getSystemSettings()

    const adminFunctions = [
      ['admin_adjust_user_credits', { p_user_id: learner.id, p_delta: 1, p_reason: 'non-admin probe' }],
      ['admin_set_user_role', { p_user_id: learner.id, p_role: 'admin', p_reason: 'non-admin probe' }],
      ['admin_create_invite_code', { p_code: `NOPE-${crypto.randomBytes(3).toString('hex')}`, p_credits: 1, p_max_uses: 1, p_reason: 'non-admin probe' }],
      ['admin_toggle_invite_code', { p_code_id: crypto.randomUUID(), p_active: false, p_reason: 'non-admin probe' }],
      ['admin_update_system_setting', { p_key: 'queue_paused', p_value: true, p_reason: 'non-admin probe' }],
      ['admin_approve_generation_job', { p_job_id: crypto.randomUUID(), p_reason: 'non-admin probe' }],
      ['admin_reject_generation_job', { p_job_id: crypto.randomUUID(), p_refund: false, p_reason: 'non-admin probe' }],
      ['admin_archive_content', { p_kind: 'word', p_id: crypto.randomUUID(), p_reason: 'non-admin probe' }],
    ] as const
    for (const [fn, body] of adminFunctions) {
      const res = await rpc(fn, body, learner.token)
      assert.ok(denied(res.status), `non-admin must not call ${fn}, got ${res.status}: ${JSON.stringify(res.data)}`)
    }

    const adjust = await rpc<{ new_balance: number }>('admin_adjust_user_credits', {
      p_user_id: learner.id,
      p_delta: 7,
      p_reason: 'phase1f test add credits',
    }, admin.token)
    assert.ok(ok(adjust.status), `admin_adjust_user_credits failed ${adjust.status}: ${JSON.stringify(adjust.data)}`)
    assert.equal(adjust.data.new_balance, 17)
    assert.equal(await getCredits(learner.id), 17)
    assert.ok((await auditRows('admin_adjust_user_credits', learner.id)).length >= 1)

    const negative = await rpc('admin_adjust_user_credits', {
      p_user_id: learner.id,
      p_delta: -999,
      p_reason: 'phase1f negative probe',
    }, admin.token)
    assert.ok(denied(negative.status), `negative credit adjustment must fail, got ${negative.status}: ${JSON.stringify(negative.data)}`)
    assert.equal(await getCredits(learner.id), 17)

    const setAdmin = await rpc('admin_set_user_role', {
      p_user_id: learner.id,
      p_role: 'admin',
      p_reason: 'phase1f promote',
    }, admin.token)
    assert.ok(ok(setAdmin.status), `admin_set_user_role promote failed ${setAdmin.status}: ${JSON.stringify(setAdmin.data)}`)
    assert.equal(await getProfileRole(learner.id), 'admin')
    assert.ok((await auditRows('admin_set_user_role', learner.id)).length >= 1)

    const setLearner = await rpc('admin_set_user_role', {
      p_user_id: learner.id,
      p_role: 'learner',
      p_reason: 'phase1f demote',
    }, admin.token)
    assert.ok(ok(setLearner.status), `admin_set_user_role demote failed ${setLearner.status}: ${JSON.stringify(setLearner.data)}`)
    assert.equal(await getProfileRole(learner.id), 'learner')

    const beforeLastAdminProbe = await countAdminRoles()
    const removeOtherAdmin = await rpc('admin_set_user_role', {
      p_user_id: otherAdmin.id,
      p_role: 'learner',
      p_reason: 'leave one admin for last-admin probe',
    }, admin.token)
    assert.ok(ok(removeOtherAdmin.status), `pre last-admin demote failed ${removeOtherAdmin.status}: ${JSON.stringify(removeOtherAdmin.data)}`)
    assert.ok(beforeLastAdminProbe >= 2)
    if (await countAdminRoles() === 1) {
      const removeLastAdmin = await rpc('admin_set_user_role', {
        p_user_id: admin.id,
        p_role: 'learner',
        p_reason: 'must fail last admin',
      }, admin.token)
      assert.ok(denied(removeLastAdmin.status), `last admin removal must fail, got ${removeLastAdmin.status}: ${JSON.stringify(removeLastAdmin.data)}`)
      assert.equal(await getProfileRole(admin.id), 'admin')
    } else {
      const migrationSql = fs.readFileSync(
        path.resolve('supabase/migrations/20260503020000_phase1f_admin_command_rpcs.sql'),
        'utf8',
      )
      assert.ok(migrationSql.includes('Cannot remove the last admin'), 'admin_set_user_role migration must guard last-admin removal')
      assert.ok(migrationSql.includes('where user_id <> p_user_id'), 'last-admin guard must count other admins')
    }

    const codeValue = `PHASE1F-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const createCode = await rpc<{ id: string; code: string }>('admin_create_invite_code', {
      p_code: codeValue,
      p_credits: 12,
      p_max_uses: 2,
      p_reason: 'phase1f create code',
    }, admin.token)
    assert.ok(ok(createCode.status), `admin_create_invite_code failed ${createCode.status}: ${JSON.stringify(createCode.data)}`)
    cleanupIds.inviteCodeIds.push(createCode.data.id)
    assert.equal(createCode.data.code, codeValue)
    assert.ok((await auditRows('admin_create_invite_code', createCode.data.id)).length >= 1)

    const toggleCode = await rpc('admin_toggle_invite_code', {
      p_code_id: createCode.data.id,
      p_active: false,
      p_reason: 'phase1f toggle code',
    }, admin.token)
    assert.ok(ok(toggleCode.status), `admin_toggle_invite_code failed ${toggleCode.status}: ${JSON.stringify(toggleCode.data)}`)
    assert.ok((await auditRows('admin_toggle_invite_code', createCode.data.id)).length >= 1)

    const queueSetting = await rpc<{ key: string; value: boolean }>('admin_update_system_setting', {
      p_key: 'queue_paused',
      p_value: true,
      p_reason: 'phase1f pause queue',
    }, admin.token)
    assert.ok(ok(queueSetting.status), `admin_update_system_setting failed ${queueSetting.status}: ${JSON.stringify(queueSetting.data)}`)
    assert.equal(queueSetting.data.value, true)
    await rpc('admin_update_system_setting', {
      p_key: 'queue_paused',
      p_value: false,
      p_reason: 'phase1f unpause queue',
    }, admin.token)
    await rpc('admin_update_system_setting', {
      p_key: 'auto_approve',
      p_value: false,
      p_reason: 'phase1f deterministic pending fixture',
    }, admin.token)

    const deck = await insertDeck(learner.id)
    cleanupIds.deckIds.push(deck.id)
    const approveJob = await insertJob(learner.id, deck.id, 'pending', 10)
    cleanupIds.jobIds.push(approveJob.id)
    const approve = await rpc<{ status: string }>('admin_approve_generation_job', {
      p_job_id: approveJob.id,
      p_reason: 'phase1f approve',
    }, admin.token)
    assert.ok(ok(approve.status), `admin_approve_generation_job failed ${approve.status}: ${JSON.stringify(approve.data)}`)
    assert.equal(approve.data.status, 'approved')

    const rejectNoRefundJob = await insertJob(learner.id, deck.id, 'pending', 10)
    cleanupIds.jobIds.push(rejectNoRefundJob.id)
    const noRefundBefore = await getCredits(learner.id)
    const rejectNoRefund = await rpc<{ status: string; refund_amount: number }>('admin_reject_generation_job', {
      p_job_id: rejectNoRefundJob.id,
      p_refund: false,
      p_reason: 'phase1f reject no refund',
    }, admin.token)
    assert.ok(ok(rejectNoRefund.status), `reject no refund failed ${rejectNoRefund.status}: ${JSON.stringify(rejectNoRefund.data)}`)
    assert.equal(rejectNoRefund.data.status, 'rejected')
    assert.equal(rejectNoRefund.data.refund_amount, 0)
    assert.equal(await getCredits(learner.id), noRefundBefore)

    const rejectRefundJob = await insertJob(learner.id, deck.id, 'pending', 30)
    cleanupIds.jobIds.push(rejectRefundJob.id)
    const refundBefore = await getCredits(learner.id)
    const rejectRefund = await rpc<{ status: string; refund_amount: number; refunded: boolean }>('admin_reject_generation_job', {
      p_job_id: rejectRefundJob.id,
      p_refund: true,
      p_reason: 'phase1f reject refund',
    }, admin.token)
    assert.ok(ok(rejectRefund.status), `reject refund failed ${rejectRefund.status}: ${JSON.stringify(rejectRefund.data)}`)
    assert.equal(rejectRefund.data.status, 'rejected')
    assert.equal(rejectRefund.data.refund_amount, 30)
    assert.equal(rejectRefund.data.refunded, true)
    assert.equal(await getCredits(learner.id), refundBefore + 30)

    const repeatRefund = await rpc<{ status: string; refund_amount: number; refunded: boolean }>('admin_reject_generation_job', {
      p_job_id: rejectRefundJob.id,
      p_refund: true,
      p_reason: 'phase1f repeat refund',
    }, admin.token)
    assert.ok(ok(repeatRefund.status), `repeat reject refund failed ${repeatRefund.status}: ${JSON.stringify(repeatRefund.data)}`)
    assert.equal(repeatRefund.data.refund_amount, 0)
    assert.equal(repeatRefund.data.refunded, false)
    assert.equal(await getCredits(learner.id), refundBefore + 30)

    const contentDeck = await insertDeck(learner.id)
    cleanupIds.deckIds.push(contentDeck.id)
    const wordRes = await request('/rest/v1/words', {
      method: 'POST',
      key: serviceKey,
      bearer: serviceKey,
      extraHeaders: { Prefer: 'return=representation' },
      body: [{
        user_id: learner.id,
        deck_id: contentDeck.id,
        word: 'archive-me',
        original_input: 'archive-me',
        status: 'complete',
        current_stage: 'complete',
        video_url: `${supabaseUrl}/storage/v1/object/public/videos/${learner.id}/${contentDeck.id}/archive-me/video.mp4`,
        thumbnail_url: `${supabaseUrl}/storage/v1/object/public/videos/${learner.id}/${contentDeck.id}/archive-me/thumb.jpg`,
      }],
    })
    assert.ok(ok(wordRes.status), `word insert failed ${wordRes.status}: ${JSON.stringify(wordRes.data)}`)
    const wordId = (wordRes.data as Array<{ id: string }>)[0].id
    const archiveWord = await rpc<{ kind: string; id: string }>('admin_archive_content', {
      p_kind: 'word',
      p_id: wordId,
      p_reason: 'phase1f archive word',
    }, admin.token)
    assert.ok(ok(archiveWord.status), `archive word failed ${archiveWord.status}: ${JSON.stringify(archiveWord.data)}`)
    assert.equal(archiveWord.data.kind, 'word')

    const cleanupQueue = await request(`/rest/v1/storage_cleanup_queue?source_id=eq.${encodeURIComponent(wordId)}&select=id`, {
      key: serviceKey,
      bearer: serviceKey,
    })
    assert.ok(ok(cleanupQueue.status), `cleanup queue read failed ${cleanupQueue.status}: ${JSON.stringify(cleanupQueue.data)}`)
    assert.ok((cleanupQueue.data as unknown[]).length >= 1, 'admin_archive_content must enqueue storage cleanup')

    const quota = await request('/rest/v1/api_quota_settings?select=enforcement_enabled', {
      key: serviceKey,
      bearer: serviceKey,
    })
    assert.ok(ok(quota.status), `quota read failed ${quota.status}: ${JSON.stringify(quota.data)}`)
    assert.equal((quota.data as Array<{ enforcement_enabled: boolean }>)[0]?.enforcement_enabled, false)

    assertNoPrivilegedBrowserMutations()

    console.log('Phase 1F admin RPC tests passed')
  } finally {
    if (originalSystemSettings) {
      await restoreSystemSettings(originalSystemSettings)
    }
    await cleanup(cleanupIds)
  }
}

await main()
