import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { errorResponse, jsonResponse } from './_shared/http'
import {
  buildInvoiceCreditIdempotencyKey,
  buildRefundCreditIdempotencyKey,
  legacySubscriptionCredits,
  loadStripeCoreConfig,
  stripeObjectId,
  unixSecondsToIso,
} from './_shared/stripeBilling'
import {
  PLAN_GRANTS,
  isPaidPlanId,
  isPlanInterval,
  planFromPriceId,
  type PaidPlanId,
  type PlanInterval,
} from './_shared/planCatalog'
import { deterministicUuid, trackServerEvent } from './_shared/analytics'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

type RpcResult = {
  inserted?: boolean
  idempotent?: boolean
  updated?: boolean
}

type InvoiceWithParent = Stripe.Invoice & {
  parent?: {
    subscription_details?: {
      metadata?: Record<string, string>
      subscription?: string | Stripe.Subscription
    } | null
  } | null
}

type ChargeWithInvoice = Stripe.Charge & {
  invoice?: string | Stripe.Invoice | null
}

function serviceClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service credentials not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function metadataFromInvoice(invoice: InvoiceWithParent): Record<string, string> {
  return invoice.parent?.subscription_details?.metadata ?? {}
}

function userIdFromInvoice(invoice: InvoiceWithParent): string | null {
  return metadataFromInvoice(invoice).user_id ?? null
}

function subscriptionIdFromInvoice(invoice: InvoiceWithParent): string | null {
  return stripeObjectId(invoice.parent?.subscription_details?.subscription)
}

function priceIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const firstLine = invoice.lines.data[0]
  return stripeObjectId(firstLine?.pricing?.price_details?.price)
}

function periodFromInvoice(invoice: Stripe.Invoice): { start: string | null; end: string | null } {
  const period = invoice.lines.data[0]?.period
  return {
    start: unixSecondsToIso(period?.start ?? null),
    end: unixSecondsToIso(period?.end ?? null),
  }
}

type ResolvedTierInvoice = {
  plan: PaidPlanId
  interval: PlanInterval
  priceId: string | null
  period: { start: string | null; end: string | null }
}

// Plan resolution order: scan ALL invoice lines for a price matching one of the
// four tier prices (line [0] can be an old-price proration line on upgrades),
// then fall back to the plan/plan_interval metadata stamped at checkout. Null
// means this invoice belongs to the pre-tier single-price flow (legacy path).
function resolvePlanForInvoice(invoice: InvoiceWithParent): ResolvedTierInvoice | null {
  for (const line of invoice.lines.data) {
    const priceId = stripeObjectId(line?.pricing?.price_details?.price)
    const match = planFromPriceId(priceId)
    if (priceId && match) {
      return {
        plan: match.plan,
        interval: match.interval,
        priceId,
        period: {
          start: unixSecondsToIso(line.period?.start ?? null),
          end: unixSecondsToIso(line.period?.end ?? null),
        },
      }
    }
  }

  const metadata = metadataFromInvoice(invoice)
  if (isPaidPlanId(metadata.plan) && isPlanInterval(metadata.plan_interval)) {
    return {
      plan: metadata.plan,
      interval: metadata.plan_interval,
      priceId: priceIdFromInvoice(invoice),
      period: periodFromInvoice(invoice),
    }
  }

  return null
}

// Portfolio 'conversion': the FIRST successful subscription payment only, ever,
// per user — renewals and upgrades stay invisible by design. Prior paid periods
// are visible as credit_ledger grant rows carrying a different invoice id
// ('subscription_grant' = tier flow, 'stripe_subscription' = legacy flow).
// Called only after the grant RPC reported inserted (replays/stale skipped);
// any lookup doubt suppresses the emit rather than risking a double-count.
async function maybeEmitConversion(
  userId: string,
  invoice: InvoiceWithParent,
  resolved: ResolvedTierInvoice | null,
) {
  try {
    const admin = serviceClient()
    const { data, error } = await admin
      .from('credit_ledger')
      .select('id')
      .eq('user_id', userId)
      .in('event_type', ['subscription_grant', 'stripe_subscription'])
      .not('stripe_invoice_id', 'is', null)
      .neq('stripe_invoice_id', invoice.id ?? '')
      .limit(1)
    if (error || (data ?? []).length > 0) return

    const paidAtIso = unixSecondsToIso(
      invoice.status_transitions?.paid_at ?? invoice.created ?? null,
    )
    await trackServerEvent({
      event: 'conversion',
      distinctId: userId,
      platform: 'web',
      uuid: deterministicUuid(`conversion:${userId}`),
      ...(paidAtIso ? { ts: paidAtIso } : {}),
      ...(resolved ? { props: { plan: resolved.plan, interval: resolved.interval } } : {}),
    })
  } catch (err) {
    console.error('[analytics] conversion emit failed:', err instanceof Error ? err.message : err)
  }
}

// Portfolio 'churn_marker': explicit goodbyes only — here, the subscription
// cancellation taking effect (customer.subscription.deleted).
async function emitSubscriptionChurn(subscription: Stripe.Subscription) {
  try {
    let userId: string | null = subscription.metadata?.user_id ?? null
    if (!userId) {
      const admin = serviceClient()
      const { data } = await admin
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
      userId = (data as { user_id?: string } | null)?.user_id ?? null
    }
    if (!userId) return

    await trackServerEvent({
      event: 'churn_marker',
      distinctId: userId,
      platform: 'web',
      uuid: deterministicUuid(`churn:subscription:${subscription.id}`),
      props: { reason: 'subscription_cancelled' },
    })
  } catch (err) {
    console.error('[analytics] churn emit failed:', err instanceof Error ? err.message : err)
  }
}

async function recordCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.user_id
  const customerId = stripeObjectId(session.customer)
  const subscriptionId = stripeObjectId(session.subscription)
  if (!userId || !customerId || !subscriptionId) return { skipped: true }

  const admin = serviceClient()
  const { data, error } = await admin.rpc('record_stripe_subscription_checkout', {
    p_user_id: userId,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_status: 'checkout_completed',
    p_price_id: null,
    p_current_period_end: null,
    p_metadata: {
      checkout_session_id: session.id,
      subscription_credits: session.metadata?.subscription_credits ?? null,
    },
  })

  if (error) throw error
  return data as RpcResult
}

async function recordPaidInvoice(invoice: InvoiceWithParent) {
  if (!invoice.id) return { skipped: true }
  if (invoice.status !== 'paid') return { skipped: true }
  if (!invoice.billing_reason?.startsWith('subscription')) return { skipped: true }

  const userId = userIdFromInvoice(invoice)
  const customerId = stripeObjectId(invoice.customer)
  const subscriptionId = subscriptionIdFromInvoice(invoice)
  if (!userId || !customerId || !subscriptionId) return { skipped: true }

  const admin = serviceClient()
  const invoiceMetadata = {
    billing_reason: invoice.billing_reason,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    hosted_invoice_url: invoice.hosted_invoice_url,
  }

  const resolved = resolvePlanForInvoice(invoice)
  if (resolved) {
    const grant = PLAN_GRANTS[resolved.plan][resolved.interval]
    const { data, error } = await admin.rpc('record_stripe_plan_grant', {
      p_user_id: userId,
      p_plan: resolved.plan,
      p_plan_interval: resolved.interval,
      p_credits: grant.credits,
      p_stripe_invoice_id: invoice.id,
      p_stripe_customer_id: customerId,
      p_stripe_subscription_id: subscriptionId,
      p_price_id: resolved.priceId,
      p_current_period_start: resolved.period.start,
      p_current_period_end: resolved.period.end,
      p_idempotency_key: buildInvoiceCreditIdempotencyKey(invoice.id),
      p_metadata: invoiceMetadata,
    })

    if (error) throw error
    const rpcResult = data as RpcResult
    if (rpcResult?.inserted) await maybeEmitConversion(userId, invoice, resolved)
    return rpcResult
  }

  const amount = legacySubscriptionCredits({ metadata: metadataFromInvoice(invoice) })
  if (amount === null) {
    console.warn('[stripe] invoice matched no tier price and carried no legacy credits — skipped', invoice.id)
    return { skipped: true }
  }

  const { data, error } = await admin.rpc('record_stripe_subscription_credit', {
    p_user_id: userId,
    p_amount: amount,
    p_stripe_invoice_id: invoice.id,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_price_id: priceIdFromInvoice(invoice),
    p_idempotency_key: buildInvoiceCreditIdempotencyKey(invoice.id),
    p_metadata: invoiceMetadata,
  })

  if (error) throw error
  const rpcResult = data as RpcResult
  if (rpcResult?.inserted) await maybeEmitConversion(userId, invoice, null)
  return rpcResult
}

async function recordRefunds(stripe: Stripe, charge: ChargeWithInvoice) {
  const invoiceId = stripeObjectId(charge.invoice)
  const refunds = charge.refunds?.data ?? []
  if (!invoiceId || !charge.amount || refunds.length === 0) return { skipped: true }

  const invoice = await stripe.invoices.retrieve(invoiceId) as InvoiceWithParent
  const userId = userIdFromInvoice(invoice)
  const customerId = stripeObjectId(charge.customer) ?? stripeObjectId(invoice.customer)
  const subscriptionId = subscriptionIdFromInvoice(invoice)
  if (!userId || !customerId || !subscriptionId) return { skipped: true }

  const resolved = resolvePlanForInvoice(invoice)
  const subscriptionCredits = resolved
    ? PLAN_GRANTS[resolved.plan][resolved.interval].credits
    : legacySubscriptionCredits({ metadata: metadataFromInvoice(invoice) })
  if (subscriptionCredits === null) {
    console.warn('[stripe] refund matched no tier price and carried no legacy credits — skipped', charge.id)
    return { skipped: true }
  }

  const admin = serviceClient()
  const results: RpcResult[] = []

  for (const refund of refunds) {
    if (!refund.id || refund.status !== 'succeeded' || refund.amount <= 0) continue

    const creditAmount = Math.max(1, Math.ceil((subscriptionCredits * refund.amount) / charge.amount))
    const refundArgs = {
      p_user_id: userId,
      p_amount: creditAmount,
      p_stripe_charge_id: charge.id,
      p_stripe_refund_id: refund.id,
      p_stripe_invoice_id: invoiceId,
      p_stripe_subscription_id: subscriptionId,
      p_stripe_customer_id: customerId,
      p_idempotency_key: buildRefundCreditIdempotencyKey(charge.id, refund.id),
      p_metadata: {
        refund_amount: refund.amount,
        charge_amount: charge.amount,
        currency: charge.currency,
      },
    }

    // Tier refunds claw back the plan grant first (record_stripe_plan_refund);
    // only pre-tier single-price subscriptions use the legacy credits-only RPC.
    const { data, error } = resolved
      ? await admin.rpc('record_stripe_plan_refund', refundArgs)
      : await admin.rpc('record_stripe_refund_credit', refundArgs)

    if (error) throw error
    results.push(data as RpcResult)
  }

  return { refunds: results }
}

async function recordSubscriptionStatus(subscription: Stripe.Subscription) {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null
  const admin = serviceClient()
  const { data, error } = await admin.rpc('record_stripe_subscription_status', {
    p_stripe_subscription_id: subscription.id,
    p_status: subscription.status,
    p_current_period_end: unixSecondsToIso(currentPeriodEnd),
    p_metadata: {
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at,
    },
  })

  if (error) throw error
  return data as RpcResult
}

export async function POST(req: Request): Promise<Response> {
  const config = loadStripeCoreConfig()
  const stripe = new Stripe(config.secretKey)
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return errorResponse(req, 400, 'Missing Stripe signature')
  }

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret)
  } catch (error) {
    console.error('[stripe] webhook signature verification failed', error)
    return errorResponse(req, 400, 'Invalid Stripe signature')
  }

  try {
    let result: unknown = { ignored: true }

    switch (event.type) {
      case 'checkout.session.completed':
        result = await recordCheckoutSession(event.data.object as Stripe.Checkout.Session)
        break
      case 'invoice.payment_succeeded':
        result = await recordPaidInvoice(event.data.object as InvoiceWithParent)
        break
      case 'charge.refunded':
        result = await recordRefunds(stripe, event.data.object as ChargeWithInvoice)
        break
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        result = await recordSubscriptionStatus(subscription)
        await emitSubscriptionChurn(subscription)
        break
      }
      case 'customer.subscription.updated':
        result = await recordSubscriptionStatus(event.data.object as Stripe.Subscription)
        break
      default:
        result = { ignored: true, type: event.type }
        break
    }

    return jsonResponse(req, { received: true, result })
  } catch (error) {
    console.error('[stripe] webhook handling failed', { type: event.type, error })
    return errorResponse(req, 500, 'Webhook handler failed')
  }
}
