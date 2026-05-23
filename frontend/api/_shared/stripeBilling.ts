type StripeBillingConfig = {
  secretKey: string
  webhookSecret: string
  priceId: string
  subscriptionCredits: number
}

type MetadataCarrier = {
  metadata?: Record<string, string | number | null | undefined> | null
}

type IdCarrier = {
  id?: string | null
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function parsePositiveInteger(name: string, raw: string | undefined): number {
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function requiredStripePriceId(): string {
  const value = requiredEnv('STRIPE_PRICE_ID')
  if (!value.startsWith('price_')) {
    throw new Error('STRIPE_PRICE_ID must be a recurring Stripe Price API ID starting with price_, not a prod_ product ID')
  }
  return value
}

export function loadStripeBillingConfig(): StripeBillingConfig {
  return {
    secretKey: requiredEnv('STRIPE_SECRET_KEY'),
    webhookSecret: requiredEnv('STRIPE_WEBHOOK_SECRET'),
    priceId: requiredStripePriceId(),
    subscriptionCredits: parsePositiveInteger(
      'SUBSCRIPTION_CREDITS',
      process.env.SUBSCRIPTION_CREDITS,
    ),
  }
}

export function buildInvoiceCreditIdempotencyKey(invoiceId: string): string {
  return `stripe:invoice:${invoiceId}`
}

export function buildRefundCreditIdempotencyKey(chargeId: string, refundId: string): string {
  return `stripe:refund:${chargeId}:${refundId}`
}

export function getSubscriptionCredits(source: MetadataCarrier): number {
  const metadataCredits = source.metadata?.subscription_credits
  if (metadataCredits !== undefined && metadataCredits !== null) {
    const parsedMetadataCredits = Number(metadataCredits)
    if (Number.isInteger(parsedMetadataCredits) && parsedMetadataCredits > 0) {
      return parsedMetadataCredits
    }
  }

  return parsePositiveInteger('SUBSCRIPTION_CREDITS', process.env.SUBSCRIPTION_CREDITS)
}

export function stripeObjectId(value: string | IdCarrier | null | undefined): string | null {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

export function unixSecondsToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}
