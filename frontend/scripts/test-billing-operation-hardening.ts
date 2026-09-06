import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as checkoutReservationModule from '../api/_shared/checkoutReservations'

const checkoutReservations = (
  checkoutReservationModule as typeof checkoutReservationModule & { default?: typeof checkoutReservationModule }
).default ?? checkoutReservationModule
const {
  CHECKOUT_RESERVATION_MS,
  isBlockingStripeSubscriptionStatus,
  isReusableCheckoutSession,
} = checkoutReservations

assert.ok(CHECKOUT_RESERVATION_MS > 30 * 60 * 1000)
assert.equal(isBlockingStripeSubscriptionStatus('active'), true)
assert.equal(isBlockingStripeSubscriptionStatus('trialing'), true)
assert.equal(isBlockingStripeSubscriptionStatus('past_due'), true)
assert.equal(isBlockingStripeSubscriptionStatus('unpaid'), true)
assert.equal(isBlockingStripeSubscriptionStatus('paused'), true)
assert.equal(isBlockingStripeSubscriptionStatus('canceled'), false)
assert.equal(isBlockingStripeSubscriptionStatus('incomplete_expired'), false)

const nowSeconds = 2_000_000_000
assert.equal(isReusableCheckoutSession({
  status: 'open', url: 'https://checkout.stripe.test/c/session', expires_at: nowSeconds + 60,
}, nowSeconds), true)
assert.equal(isReusableCheckoutSession({
  status: 'complete', url: 'https://checkout.stripe.test/c/session', expires_at: nowSeconds + 60,
}, nowSeconds), false)
assert.equal(isReusableCheckoutSession({
  status: 'open', url: 'https://checkout.stripe.test/c/session', expires_at: nowSeconds,
}, nowSeconds), false)

const accountingMigration = readFileSync(resolve(
  'supabase/migrations/20260907103000_generation_credit_operation_refunds.sql',
), 'utf8')
assert.match(accountingMigration, /create table if not exists public\.generation_credit_operations/)
assert.match(accountingMigration, /active_credit_operation_id/)
assert.match(accountingMigration, /plan_credits_charged[\s\S]*permanent_credits_charged/)
assert.match(accountingMigration, /mark_word_failed_and_refund/)
assert.match(accountingMigration, /p_expected_operation_id/)
assert.match(accountingMigration, /operation_fence_required/)
assert.match(accountingMigration, /legacy_reconciliation_required/)
assert.match(accountingMigration, /admin_reject_generation_job[\s\S]*refund_status = 'charged'/)
assert.match(accountingMigration, /plan_period_key[\s\S]*v_current_period/)
assert.doesNotMatch(accountingMigration, /credits\s*=\s*credits\s*\+\s*greatest\(coalesce\(v_before\.credits_charged/)

const runner = readFileSync(resolve('../src/orchestration/retry.py'), 'utf8')
assert.match(runner, /mark_word_failed_and_refund/)
assert.equal(runner.includes('sb.rpc("refund_credit"'), false)

const checkoutMigration = readFileSync(resolve(
  'supabase/migrations/20260907104000_stripe_checkout_reservations_and_event_order.sql',
), 'utf8')
assert.match(checkoutMigration, /stripe_checkout_one_pending_per_user/)
assert.match(checkoutMigration, /from public\.profiles where id = p_user_id for update/)
assert.match(checkoutMigration, /last_event_created/)
assert.match(checkoutMigration, /p_event_created < v_subscription\.last_event_created/)
assert.match(checkoutMigration, /unknown_subscription/)
assert.match(checkoutMigration, /record_stripe_subscription_checkout_ordered/)
assert.match(checkoutMigration, /record_stripe_plan_grant_ordered/)
assert.match(checkoutMigration, /record_stripe_subscription_credit_ordered/)
assert.match(checkoutMigration, /record_stripe_plan_refund_ordered/)
assert.match(checkoutMigration, /financial_only_no_allowance/)

const checkoutRoute = readFileSync(resolve('api/create-checkout-session.ts'), 'utf8')
assert.match(checkoutRoute, /checkout-customer:\$\{customerRequestKey\}/)
assert.match(checkoutRoute, /checkout-session:\$\{reservation\.id\}/)
assert.match(checkoutRoute, /stripe\.subscriptions\.list/)
assert.match(checkoutRoute, /status: 'all'/)
assert.match(checkoutRoute, /checkout_reservation_id: reservation\.id/)
assert.match(checkoutRoute, /assertRequestActive\(\)[\s\S]{0,180}stripe\.checkout\.sessions\.create/)
assert.doesNotMatch(checkoutRoute, /Math\.floor\(Date\.now\(\) \/ 60_000\)/)

const webhook = readFileSync(resolve('api/webhooks.ts'), 'utf8')
assert.match(webhook, /checkout\.session\.expired/)
assert.match(webhook, /p_event_created: eventCreated/)
assert.match(webhook, /p_current_period_start: unixSecondsToIso\(currentPeriodStart\)/)
assert.match(webhook, /record_stripe_subscription_checkout_ordered/)
assert.match(webhook, /record_stripe_plan_grant_ordered/)
assert.match(webhook, /record_stripe_subscription_credit_ordered/)
assert.match(webhook, /record_stripe_plan_refund_ordered/)
assert.match(webhook, /Subscription status arrived before checkout record/)

for (const rollbackFile of [
  'supabase/tests/20260907101000_live_session_reservation_integration_rollback.sql',
  'supabase/tests/20260907103000_generation_credit_refund_integration_rollback.sql',
  'supabase/tests/20260907104000_stripe_checkout_integration_rollback.sql',
]) {
  const sql = readFileSync(resolve(rollbackFile), 'utf8')
  assert.match(sql, /begin;/i)
  assert.match(sql, /rollback;/i)
}

console.log('Billing operation hardening contracts passed')
