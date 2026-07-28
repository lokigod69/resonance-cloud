type StripeCoreConfig = {
  secretKey: string
  webhookSecret: string
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

export function loadStripeCoreConfig(): StripeCoreConfig {
  return {
    secretKey: requiredEnv('STRIPE_SECRET_KEY'),
    webhookSecret: requiredEnv('STRIPE_WEBHOOK_SECRET'),
  }
}

export function buildInvoiceCreditIdempotencyKey(invoiceId: string): string {
  return `stripe:invoice:${invoiceId}`
}

export function buildRefundCreditIdempotencyKey(chargeId: string, refundId: string): string {
  return `stripe:refund:${chargeId}:${refundId}`
}

/**
 * Credit amount for subscriptions created by the pre-tier single-price flow
 * (STRIPE_PRICE_ID + SUBSCRIPTION_CREDITS). Returns null when neither the
 * Stripe metadata nor the legacy env var supplies a positive integer — the
 * caller then skips the legacy grant instead of crashing the webhook.
 */
export function legacySubscriptionCredits(source: MetadataCarrier): number | null {
  const metadataCredits = source.metadata?.subscription_credits
  if (metadataCredits !== undefined && metadataCredits !== null) {
    const parsedMetadataCredits = Number(metadataCredits)
    if (Number.isInteger(parsedMetadataCredits) && parsedMetadataCredits > 0) {
      return parsedMetadataCredits
    }
  }

  const envCredits = Number(process.env.SUBSCRIPTION_CREDITS)
  if (Number.isInteger(envCredits) && envCredits > 0) {
    return envCredits
  }

  return null
}

export function stripeObjectId(value: string | IdCarrier | null | undefined): string | null {
  if (typeof value === 'string') return value
  return value?.id ?? null
}

export function unixSecondsToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}
