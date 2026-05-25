import assert from 'node:assert/strict'
import stripeBilling from '../api/_shared/stripeBilling.ts'
import { isBillingSandboxEnabled, isBillingTester } from '../src/lib/billingFlags'

const {
  buildInvoiceCreditIdempotencyKey,
  buildRefundCreditIdempotencyKey,
  getSubscriptionCredits,
  loadStripeBillingConfig,
} = stripeBilling

const originalEnv = { ...process.env }

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

  assert.equal(
    isBillingTester(
      { user_metadata: { is_test_user: true } },
      { role: 'learner' },
    ),
    true,
  )
  assert.equal(
    isBillingTester(
      { user_metadata: {} },
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

  console.log('Stripe billing shell tests passed')
} finally {
  process.env = originalEnv
}
