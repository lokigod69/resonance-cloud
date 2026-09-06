// Single server-side source of truth for the subscription tiers.
//
// Prices and grants locked by the owner 2026-07-28 (memory/DECISIONS.md):
// Standard $7.99/mo · $2.99/wk, Premium $14.99/mo · $4.99/wk; weekly grants are a
// quarter of monthly; subscription grants reset at renewal (no rollover); songs
// are premium-only (enforced in the music RPCs, not here); credit purchases and
// checkout stay web-only. The frontend never hardcodes these numbers — it reads
// them from /api/entitlements.

export type PaidPlanId = 'standard' | 'premium'
export type PlanId = 'free' | PaidPlanId
export type PlanInterval = 'week' | 'month'

export interface PlanGrant {
  priceUsd: number
  credits: number
  speakSeconds: number
  lensScans: number
  liveMinutes: number
}

export const PLAN_GRANTS: Record<PaidPlanId, Record<PlanInterval, PlanGrant>> = {
  standard: {
    month: { priceUsd: 7.99, credits: 100, speakSeconds: 3600, lensScans: 100, liveMinutes: 0 },
    week: { priceUsd: 2.99, credits: 25, speakSeconds: 900, lensScans: 25, liveMinutes: 0 },
  },
  premium: {
    month: { priceUsd: 14.99, credits: 300, speakSeconds: 14400, lensScans: 300, liveMinutes: 60 },
    // Live weekly is 20 (not the ¼-monthly 15): sessions debit in 10-minute
    // blocks, and 15 would strand 5 unusable minutes every week.
    week: { priceUsd: 4.99, credits: 75, speakSeconds: 3600, lensScans: 75, liveMinutes: 20 },
  },
}

// Free tier: lifetime trials, not recurring allowances. The signup credits are
// granted by handle_new_user in the database (migration 20260727090000); the
// constant here exists so the UI can describe the free tier without hardcoding.
export const FREE_SIGNUP_CREDITS = 10
export const FREE_TRIAL_SPEAK_SECONDS = 60
export const FREE_TRIAL_LENS_SCANS = 3

// Product allowance is reserved in 10-minute wall-clock blocks. The client
// closes its socket at the reservation deadline; xAI documents a separate
// 120-minute connection limit, so secret expiry is not a trusted cost ceiling.
export const LIVE_SESSION_MINUTES = 10

const PRICE_ENV_NAMES: Record<PaidPlanId, Record<PlanInterval, string>> = {
  standard: {
    month: 'STRIPE_PRICE_STANDARD_MONTHLY',
    week: 'STRIPE_PRICE_STANDARD_WEEKLY',
  },
  premium: {
    month: 'STRIPE_PRICE_PREMIUM_MONTHLY',
    week: 'STRIPE_PRICE_PREMIUM_WEEKLY',
  },
}

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return value === 'standard' || value === 'premium'
}

export function isPlanInterval(value: unknown): value is PlanInterval {
  return value === 'week' || value === 'month'
}

export function stripePriceEnvName(plan: PaidPlanId, interval: PlanInterval): string {
  return PRICE_ENV_NAMES[plan][interval]
}

export function loadStripePriceId(plan: PaidPlanId, interval: PlanInterval): string {
  const envName = stripePriceEnvName(plan, interval)
  const value = process.env[envName]
  if (!value) {
    throw new Error(`${envName} is required`)
  }
  if (!value.startsWith('price_')) {
    throw new Error(`${envName} must be a recurring Stripe Price API ID starting with price_`)
  }
  return value
}

export function planFromPriceId(priceId: string | null | undefined): { plan: PaidPlanId; interval: PlanInterval } | null {
  if (!priceId) return null
  for (const plan of ['standard', 'premium'] as const) {
    for (const interval of ['month', 'week'] as const) {
      if (process.env[PRICE_ENV_NAMES[plan][interval]] === priceId) {
        return { plan, interval }
      }
    }
  }
  return null
}
