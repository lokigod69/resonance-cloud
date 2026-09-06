import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as envelopeModule from '../api/_shared/liveTokenEnvelope'
import * as deadlineModule from '../api/_shared/requestDeadline'
import {
  activeReservationId,
  createGrokMintRequestId,
  parseGrokTokenLease,
  remainingReservationMs,
} from '../src/lib/grokLiveReservation'

const envelope = (envelopeModule as typeof envelopeModule & { default?: typeof envelopeModule }).default ?? envelopeModule
const { openLiveClientSecret, sealLiveClientSecret } = envelope
const deadline = (deadlineModule as typeof deadlineModule & { default?: typeof deadlineModule }).default ?? deadlineModule

const secret = 'xai-realtime-client-secret-test-value'
const apiKey = 'server-only-xai-key'
const envelopeA = sealLiveClientSecret(secret, apiKey)
const envelopeB = sealLiveClientSecret(secret, apiKey)
assert.notEqual(envelopeA, envelopeB, 'AES-GCM envelopes must use fresh nonces')
assert.equal(openLiveClientSecret(envelopeA, apiKey), secret)
assert.throws(() => openLiveClientSecret(envelopeA, 'rotated-key'))
assert.equal(envelopeA.includes(secret), false, 'stored envelope must not expose the client secret')

const now = Date.now()
const lease = parseGrokTokenLease({
  value: secret,
  expires_at: Math.floor((now + 8 * 60_000) / 1000),
  reservation_id: '22222222-2222-4222-8222-222222222222',
  reservation_expires_at: new Date(now + 10 * 60_000).toISOString(),
})
assert.ok(lease)
assert.ok(lease.reservationExpiresAtMs <= lease.expiresAtMs, 'provider authentication expiry must cap reconnect time')
assert.equal(activeReservationId(lease.reservationId, lease.reservationExpiresAtMs, now), lease.reservationId)
assert.equal(activeReservationId(lease.reservationId, lease.reservationExpiresAtMs, lease.reservationExpiresAtMs), null)
assert.equal(remainingReservationMs(lease.reservationExpiresAtMs, lease.reservationExpiresAtMs + 1), 0)
assert.match(createGrokMintRequestId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
assert.equal(parseGrokTokenLease({ value: secret }), null)

let cleanupCompleted = false
const deadlineResponse = await deadline.withRequestDeadline(
  new Request('https://lingwave.ai/api/grok-token', { method: 'POST' }),
  async () => {
    try {
      await deadline.fetchWithRequestDeadline(
        'https://api.x.ai/v1/realtime/client_secrets',
        {},
        1_000,
        ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
        })) as typeof fetch,
      )
    } catch {
      await deadline.withCleanupDeadline(async () => {
        cleanupCompleted = true
      }, 60)
    }
    return new Response('{}')
  },
  { timeoutMs: 20, cleanupMs: 80 },
)
assert.equal(deadlineResponse.status, 504)
assert.equal(cleanupCompleted, true, 'reservation settlement must run in the bounded cleanup scope after cancellation')

const migration = readFileSync(resolve('supabase/migrations/20260907101000_live_session_reservations.sql'), 'utf8')
assert.match(migration, /from public\.profiles where id = p_user_id for update/)
assert.match(migration, /live_sessions_one_active_reservation_per_user/)
assert.match(migration, /client_secret_ciphertext/)
assert.match(migration, /revoke select on public\.live_sessions from authenticated/)
assert.match(migration, /reuse_secret/)
assert.match(migration, /service_role required/)
assert.match(migration, /server_confirmed_no_credential/)
assert.match(migration, /refund_abandoned_live_session_reservation/)
assert.match(migration, /cleanup_abandoned_live_session_reservations/)
assert.doesNotMatch(migration, /client_secret_ciphertext is null[\s\S]{0,160}mint_attempt_count = 0/)

const rollbackSql = readFileSync(resolve('supabase/tests/20260907101000_live_session_reservation_integration_rollback.sql'), 'utf8')
assert.match(rollbackSql, /Lost-response retry minted another reservation\/debit/)
assert.match(rollbackSql, /Duplicate completion was accepted/)
assert.match(rollbackSql, /Expired no-credential reservation was not cleaned/)
assert.match(rollbackSql, /Foreign completion was accepted/)
assert.match(rollbackSql, /has_column_privilege\('authenticated'.*client_secret_ciphertext/s)
assert.match(rollbackSql, /rollback;/)

const route = readFileSync(resolve('api/grok-token.ts'), 'utf8')
assert.match(route, /openLiveClientSecret/)
assert.match(route, /sealLiveClientSecret/)
assert.match(route, /expires_after: \{ seconds: tokenTtlSeconds \}/)
assert.match(route, /withRequestDeadline\(req, handlePost, \{ timeoutMs: 15_000, cleanupMs: 3_000 \}\)/)
assert.match(route, /withCleanupDeadline/)
assert.equal(route.includes('consumeFeatureAllowance'), false, 'allowance debit belongs in the reservation RPC transaction')
assert.equal(route.includes('refundFeatureUsage'), false, 'refund eligibility belongs in the reservation RPC transaction')

const hook = readFileSync(resolve('src/hooks/useGrokRealtime.ts'), 'utf8')
assert.match(hook, /reservation_id: reservationId/)
assert.match(hook, /remainingReservationMs\(liveReservationExpiresAtRef\.current\)/)
assert.equal(hook.includes('}, 10 * 60 * 1000)'), false, 'reconnect must not restart the browser session timer')

console.log('Grok Live reservation: encrypted recovery, authenticated reuse and remaining-time client contracts passed')
