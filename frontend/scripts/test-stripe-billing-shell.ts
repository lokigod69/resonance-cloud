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
  legacySubscriptionCredits,
  loadStripeCoreConfig,
} = stripeBilling
const {
  loadStripePriceId,
  planFromPriceId,
  isPaidPlanId,
  isPlanInterval,
  PLAN_GRANTS,
} = await import('../api/_shared/planCatalog.ts')
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
  })

  const config = loadStripeCoreConfig()
  assert.equal(config.secretKey, 'sk_test_unit')
  assert.equal(config.webhookSecret, 'whsec_unit')

  resetEnv({ STRIPE_SECRET_KEY: 'sk_test_unit', STRIPE_WEBHOOK_SECRET: '' })
  assert.throws(() => loadStripeCoreConfig(), /STRIPE_WEBHOOK_SECRET is required/)

  // Four tier prices resolve by env and map back to plan+interval.
  resetEnv({
    STRIPE_PRICE_STANDARD_MONTHLY: 'price_std_m',
    STRIPE_PRICE_STANDARD_WEEKLY: 'price_std_w',
    STRIPE_PRICE_PREMIUM_MONTHLY: 'price_prem_m',
    STRIPE_PRICE_PREMIUM_WEEKLY: 'price_prem_w',
  })
  assert.equal(loadStripePriceId('standard', 'month'), 'price_std_m')
  assert.equal(loadStripePriceId('premium', 'week'), 'price_prem_w')
  assert.deepEqual(planFromPriceId('price_std_w'), { plan: 'standard', interval: 'week' })
  assert.deepEqual(planFromPriceId('price_prem_m'), { plan: 'premium', interval: 'month' })
  assert.equal(planFromPriceId('price_unknown'), null)
  assert.equal(planFromPriceId(null), null)

  resetEnv({ STRIPE_PRICE_STANDARD_MONTHLY: 'prod_wrong' })
  assert.throws(
    () => loadStripePriceId('standard', 'month'),
    /must be a recurring Stripe Price API ID/,
  )
  resetEnv({})
  assert.throws(() => loadStripePriceId('premium', 'month'), /STRIPE_PRICE_PREMIUM_MONTHLY is required/)

  assert.equal(isPaidPlanId('standard'), true)
  assert.equal(isPaidPlanId('free'), false)
  assert.equal(isPlanInterval('week'), true)
  assert.equal(isPlanInterval('year'), false)

  // Locked 2026-07-28 prices/grants stay locked (weekly grants = quarter monthly).
  assert.equal(PLAN_GRANTS.standard.month.priceUsd, 7.99)
  assert.equal(PLAN_GRANTS.standard.week.priceUsd, 2.99)
  assert.equal(PLAN_GRANTS.premium.month.priceUsd, 14.99)
  assert.equal(PLAN_GRANTS.premium.week.priceUsd, 4.99)
  assert.equal(PLAN_GRANTS.standard.month.credits, 100)
  assert.equal(PLAN_GRANTS.premium.month.credits, 300)
  assert.equal(PLAN_GRANTS.standard.week.credits, PLAN_GRANTS.standard.month.credits / 4)
  assert.equal(PLAN_GRANTS.premium.week.speakSeconds, PLAN_GRANTS.premium.month.speakSeconds / 4)
  assert.equal(PLAN_GRANTS.standard.month.liveMinutes, 0)
  assert.equal(PLAN_GRANTS.premium.month.liveMinutes, 60)

  resetEnv({ SUBSCRIPTION_CREDITS: '1000' })

  assert.equal(
    buildInvoiceCreditIdempotencyKey('in_unit_123'),
    'stripe:invoice:in_unit_123',
  )
  assert.equal(
    buildRefundCreditIdempotencyKey('ch_unit_123', 're_unit_456'),
    'stripe:refund:ch_unit_123:re_unit_456',
  )

  assert.equal(legacySubscriptionCredits({ metadata: { subscription_credits: '2500' } }), 2500)
  assert.equal(legacySubscriptionCredits({ metadata: {} }), 1000)
  assert.equal(legacySubscriptionCredits({ metadata: { subscription_credits: '-1' } }), 1000)
  resetEnv({ SUBSCRIPTION_CREDITS: '' })
  assert.equal(legacySubscriptionCredits({ metadata: {} }), null)

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

  // The production switch opens checkout to everyone signed in.
  resetEnv({ STRIPE_BILLING_ENABLED: 'true', STRIPE_BILLING_SANDBOX_ENABLED: 'false' })
  assert.equal(
    await isBillingAllowedForCheckout(
      {
        id: '11111111-1111-4111-8111-111111111111',
        appMetadata: {},
        userMetadata: {},
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
