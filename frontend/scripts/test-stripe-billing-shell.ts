import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import stripeBilling from '../api/_shared/stripeBilling.ts'
import type { AdminRoleLookupClient } from '../api/create-checkout-session.ts'
import { isBillingSandboxEnabled, isBillingTester } from '../src/lib/billingFlags'

const {
  buildInvoiceCreditIdempotencyKey,
  buildRefundCreditIdempotencyKey,
  getSubscriptionCredits,
  loadStripeBillingConfig,
} = stripeBilling
const { getAllowedOrigin } = await import('../api/_shared/cors.ts')
const {
  isBillingAllowedForCheckout,
  resolveCheckoutAppOrigin,
} = await import('../api/create-checkout-session.ts')

const originalEnv = { ...process.env }
const migrationName = '20260611120000_lock_videos_bucket_upload_policy.sql'

function requestFromOrigin(origin: string): Request {
  return new Request('https://resonanz.pro/api/test', {
    headers: { Origin: origin },
  })
}

function fakeAdminRolesClient(isAdmin: boolean): AdminRoleLookupClient {
  return {
    from(table) {
      assert.equal(table, 'admin_roles')
      return {
        select(columns) {
          assert.equal(columns, 'user_id')
          return {
            eq(column, userId) {
              assert.equal(column, 'user_id')
              return {
                async maybeSingle<T>() {
                  return {
                    data: isAdmin ? ({ user_id: userId } as T) : null,
                    error: null,
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

function resetEnv(overrides: NodeJS.ProcessEnv = {}) {
  process.env = { ...originalEnv, ...overrides }
}

try {
  resetEnv({
    STRIPE_SECRET_KEY: 'sk_test_unit',
    STRIPE_WEBHOOK_SECRET: 'whsec_unit',
    STRIPE_PRICE_ID: 'price_monthly_unit',
    SUBSCRIPTION_CREDITS: '1250',
  })

  const config = loadStripeBillingConfig()
  assert.equal(config.secretKey, 'sk_test_unit')
  assert.equal(config.webhookSecret, 'whsec_unit')
  assert.equal(config.priceId, 'price_monthly_unit')
  assert.equal(config.subscriptionCredits, 1250)

  resetEnv({
    STRIPE_SECRET_KEY: 'sk_test_unit',
    STRIPE_WEBHOOK_SECRET: 'whsec_unit',
    STRIPE_PRICE_ID: 'price_monthly_unit',
    SUBSCRIPTION_CREDITS: 'not-a-number',
  })
  assert.throws(
    () => loadStripeBillingConfig(),
    /SUBSCRIPTION_CREDITS must be a positive integer/,
  )

  resetEnv({
    STRIPE_SECRET_KEY: 'sk_test_unit',
    STRIPE_WEBHOOK_SECRET: 'whsec_unit',
    STRIPE_PRICE_ID: 'prod_unit_wrong',
    SUBSCRIPTION_CREDITS: '1000',
  })
  assert.throws(
    () => loadStripeBillingConfig(),
    /STRIPE_PRICE_ID must be a recurring Stripe Price API ID/,
  )

  resetEnv({
    STRIPE_SECRET_KEY: 'sk_test_unit',
    STRIPE_WEBHOOK_SECRET: 'whsec_unit',
    STRIPE_PRICE_ID: 'price_monthly_unit',
    SUBSCRIPTION_CREDITS: '1000',
  })

  assert.equal(
    buildInvoiceCreditIdempotencyKey('in_unit_123'),
    'stripe:invoice:in_unit_123',
  )
  assert.equal(
    buildRefundCreditIdempotencyKey('ch_unit_123', 're_unit_456'),
    'stripe:refund:ch_unit_123:re_unit_456',
  )

  assert.equal(getSubscriptionCredits({ metadata: { subscription_credits: '2500' } }), 2500)
  assert.equal(getSubscriptionCredits({ metadata: {} }), 1000)
  assert.equal(getSubscriptionCredits({ metadata: { subscription_credits: '-1' } }), 1000)

  assert.equal(getAllowedOrigin(requestFromOrigin('https://resonanz.pro')), 'https://resonanz.pro')
  assert.equal(getAllowedOrigin(requestFromOrigin('https://www.resonanz.pro')), 'https://www.resonanz.pro')
  assert.equal(getAllowedOrigin(requestFromOrigin('https://lingwave.ai')), 'https://lingwave.ai')
  assert.equal(getAllowedOrigin(requestFromOrigin('https://www.lingwave.ai')), 'https://www.lingwave.ai')
  assert.equal(getAllowedOrigin(requestFromOrigin('https://evil.example')), null)

  resetEnv({ APP_URL: 'https://resonanz.pro', VITE_APP_URL: '' })
  assert.equal(
    resolveCheckoutAppOrigin(requestFromOrigin('https://lingwave.ai')),
    'https://lingwave.ai',
  )
  assert.equal(
    resolveCheckoutAppOrigin(requestFromOrigin('https://evil.example')),
    'https://resonanz.pro',
  )

  resetEnv({ APP_URL: 'https://evil.example', VITE_APP_URL: '' })
  assert.equal(resolveCheckoutAppOrigin(requestFromOrigin('https://evil.example')), null)

  resetEnv({ STRIPE_BILLING_SANDBOX_ENABLED: 'false' })
  assert.equal(
    await isBillingAllowedForCheckout(
      {
        id: '11111111-1111-4111-8111-111111111111',
        appMetadata: {},
        userMetadata: { is_test_user: true, stripe_tester: true },
      },
      fakeAdminRolesClient(false),
    ),
    false,
  )
  assert.equal(
    await isBillingAllowedForCheckout(
      {
        id: '11111111-1111-4111-8111-111111111111',
        appMetadata: { is_test_user: true },
        userMetadata: {},
      },
      fakeAdminRolesClient(false),
    ),
    true,
  )
  assert.equal(
    await isBillingAllowedForCheckout(
      {
        id: '11111111-1111-4111-8111-111111111111',
        appMetadata: {},
        userMetadata: {},
      },
      fakeAdminRolesClient(true),
    ),
    true,
  )

  resetEnv({ STRIPE_BILLING_SANDBOX_ENABLED: 'true' })
  assert.equal(
    await isBillingAllowedForCheckout(
      {
        id: '11111111-1111-4111-8111-111111111111',
        appMetadata: {},
        userMetadata: { is_test_user: true },
      },
      fakeAdminRolesClient(false),
    ),
    true,
  )

  assert.equal(
    isBillingTester(
      { app_metadata: { is_test_user: true }, user_metadata: {} },
      { role: 'learner' },
    ),
    true,
  )
  assert.equal(
    isBillingTester(
      { app_metadata: {}, user_metadata: { is_test_user: true } },
      { role: 'learner' },
    ),
    false,
  )
  assert.equal(
    isBillingTester(
      { app_metadata: {}, user_metadata: {} },
      { role: 'admin' },
    ),
    true,
  )
  assert.equal(
    isBillingTester(
      { user_metadata: { is_test_user: false } },
      { role: 'learner' },
    ),
    false,
  )
  assert.equal(isBillingSandboxEnabled('true'), true)
  assert.equal(isBillingSandboxEnabled('false'), false)
  assert.equal(isBillingSandboxEnabled(undefined), false)

  const migrationPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'supabase',
    'migrations',
    migrationName,
  )
  const migrationSql = readFileSync(migrationPath, 'utf8')
  assert.match(
    migrationSql,
    /drop policy if exists "Users upload own videos" on storage\.objects;/i,
  )
  assert.doesNotMatch(
    migrationSql,
    /create policy "Users upload own videos"[\s\S]*for insert/i,
  )
  assert.doesNotMatch(
    migrationSql,
    /drop policy if exists "Public read videos" on storage\.objects;/i,
  )
  assert.doesNotMatch(
    migrationSql,
    /drop policy if exists "Admin delete videos" on storage\.objects;/i,
  )
  assert.match(migrationSql, /service role bypasses RLS/i)

  console.log('Stripe billing shell tests passed')
} finally {
  process.env = originalEnv
}
