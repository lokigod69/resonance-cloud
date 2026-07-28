// /plans — the tier overview + web-only checkout entry.
//
// Everything displayed here (prices, grants, current plan, usage) comes from
// GET /api/entitlements — the server is the single source of truth and this
// page never hardcodes a price. On the native shell the page stays purely
// informational (App Review 3.1.1): no checkout buttons, a notice instead.

import { useCallback, useEffect, useState } from 'react'
import { Check, Coins, Crown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { publicApiUrl } from '@/lib/publicOrigins'
import { isNativeApp } from '@/lib/platform'
import { totalCredits } from '@/lib/credits'

type PlanInterval = 'week' | 'month'
type PaidPlanId = 'standard' | 'premium'

type PlanGrant = {
  priceUsd: number
  credits: number
  speakSeconds: number
  lensScans: number
  liveMinutes: number
}

type EntitlementsResponse = {
  plan: 'free' | PaidPlanId
  interval: PlanInterval | null
  is_admin: boolean
  credits: number
  plan_credits: number
  allowances: {
    speak_seconds: { used: number; limit: number }
    lens_scans: { used: number; limit: number }
    live_minutes: { used: number; limit: number }
  }
  catalog: Record<PaidPlanId, Record<PlanInterval, PlanGrant>>
  free_trials?: { signup_credits: number; lens_scans: number }
  billing_available?: boolean
}

export default function PlansPage() {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const native = isNativeApp()

  const [data, setData] = useState<EntitlementsResponse | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [interval, setInterval] = useState<PlanInterval>('month')
  const [checkoutPlan, setCheckoutPlan] = useState<PaidPlanId | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setLoadError(true)
        return
      }
      const response = await fetch(publicApiUrl('/api/entitlements'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        setLoadError(true)
        return
      }
      const payload = await response.json() as EntitlementsResponse
      setData(payload)
      if (payload.interval === 'week') setInterval('week')
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubscribe(plan: PaidPlanId) {
    if (native) return
    setCheckoutPlan(plan)
    setCheckoutError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setCheckoutError(t('plans.checkoutError'))
        return
      }
      const response = await fetch(publicApiUrl('/api/create-checkout-session'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan, interval }),
      })
      const payload = await response.json().catch(() => null) as { url?: string; error?: string; code?: string } | null
      if (!response.ok || !payload?.url) {
        setCheckoutError(
          payload?.code === 'already_subscribed'
            ? t('plans.alreadySubscribed')
            : payload?.error || t('plans.checkoutError'),
        )
        return
      }
      window.location.href = payload.url
    } catch {
      setCheckoutError(t('plans.checkoutError'))
    } finally {
      setCheckoutPlan(null)
    }
  }

  const catalog = data?.catalog
  const currentPlan = data?.plan ?? 'free'
  const minutes = (seconds: number) => Math.round(seconds / 60)
  const price = (grant: PlanGrant) => `$${grant.priceUsd.toFixed(2)}`
  const suffix = interval === 'month' ? t('plans.perMonth') : t('plans.perWeek')

  function paidFeatures(grant: PlanGrant): string[] {
    const rows = [
      t('plans.feature.core'),
      t('plans.feature.credits', { count: grant.credits }),
      t('plans.feature.speak', { count: minutes(grant.speakSeconds) }),
      t('plans.feature.lens', { count: grant.lensScans }),
    ]
    if (grant.liveMinutes > 0) rows.push(t('plans.feature.live', { count: grant.liveMinutes }))
    return rows
  }

  const freeFeatures = [
    t('plans.feature.core'),
    t('plans.feature.creditsOnce', { count: data?.free_trials?.signup_credits ?? 10 }),
    t('plans.feature.speakTrial'),
    t('plans.feature.lensTrial', { count: data?.free_trials?.lens_scans ?? 3 }),
  ]

  // Subscribe CTAs only render when the server says checkout would succeed
  // (staged rollout) — and never on native (App Review 3.1.1). An active
  // subscriber changes plans via support for now, not a second checkout.
  const canSubscribe = !native && data?.billing_available === true
  const hasPaidPlan = currentPlan !== 'free'

  function card(opts: {
    id: 'free' | PaidPlanId
    title: string
    priceLabel: string
    features: string[]
    icon: React.ReactNode
    highlight?: boolean
    songs?: boolean
  }) {
    const isCurrent = currentPlan === opts.id && (opts.id === 'free' || data?.interval === interval || data?.interval === null)
    return (
      <div
        key={opts.id}
        className={`relative flex flex-col rounded-2xl border p-6 bg-[var(--surface-glass)] backdrop-blur-md ${
          opts.highlight ? 'border-[var(--accent)]' : 'border-[var(--border-soft,rgba(255,255,255,0.1))]'
        }`}
      >
        {isCurrent && (
          <span className="absolute -top-3 right-4 rounded-full bg-[var(--accent)] px-3 py-0.5 text-xs font-semibold text-white">
            {t('plans.current')}
          </span>
        )}
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          {opts.icon}
          <h2 className="text-lg font-semibold">{opts.title}</h2>
        </div>
        <div className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
          {opts.priceLabel}
          {opts.id !== 'free' && <span className="ml-1 text-sm font-normal text-[var(--text-secondary)]">{suffix}</span>}
        </div>
        <ul className="mt-5 flex-1 space-y-2.5">
          {opts.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-2)]" />
              <span>{feature}</span>
            </li>
          ))}
          {opts.songs && (
            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-2)]" />
              <span>{t('plans.feature.songs')}</span>
            </li>
          )}
        </ul>
        {opts.id !== 'free' && canSubscribe && (
          <Button
            className="mt-6 w-full"
            variant={opts.highlight ? 'default' : 'secondary'}
            disabled={isCurrent || hasPaidPlan || checkoutPlan !== null}
            onClick={() => handleSubscribe(opts.id as PaidPlanId)}
          >
            {checkoutPlan === opts.id ? t('plans.processing') : isCurrent ? t('plans.current') : t('plans.subscribe')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('plans.title')}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('plans.subtitle')}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-glass)] px-3 py-1 text-sm text-[var(--text-secondary)]">
          <Coins className="h-4 w-4 text-[var(--accent-2)]" />
          {totalCredits(profile)} {t('credits.available')}
        </p>
      </header>

      {native && (
        <p className="mt-6 rounded-xl border border-[var(--border-soft,rgba(255,255,255,0.1))] bg-[var(--surface-glass)] p-4 text-center text-sm text-[var(--text-secondary)]">
          {t('plans.nativeNotice')}
        </p>
      )}

      {loadError && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">{t('plans.loadError')}</p>
          <Button variant="secondary" className="mt-3" onClick={() => void load()}>
            {t('plans.retry')}
          </Button>
        </div>
      )}

      {catalog && (
        <>
          <div className="mt-6 flex justify-center">
            <div className="inline-flex rounded-full border border-[var(--border-soft,rgba(255,255,255,0.1))] bg-[var(--surface-glass)] p-1">
              {(['month', 'week'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInterval(value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    interval === value
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {value === 'month' ? t('plans.interval.month') : t('plans.interval.week')}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {card({
              id: 'free',
              title: t('plans.tier.free'),
              priceLabel: '$0',
              features: freeFeatures,
              icon: <Coins className="h-5 w-5 text-[var(--text-secondary)]" />,
            })}
            {card({
              id: 'standard',
              title: t('plans.tier.standard'),
              priceLabel: price(catalog.standard[interval]),
              features: paidFeatures(catalog.standard[interval]),
              icon: <Sparkles className="h-5 w-5 text-[var(--accent-2)]" />,
            })}
            {card({
              id: 'premium',
              title: t('plans.tier.premium'),
              priceLabel: price(catalog.premium[interval]),
              features: paidFeatures(catalog.premium[interval]),
              icon: <Crown className="h-5 w-5 text-[var(--accent)]" />,
              highlight: true,
              songs: true,
            })}
          </div>

          {!native && data && data.billing_available !== true && (
            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">{t('plans.comingSoon')}</p>
          )}
          {canSubscribe && hasPaidPlan && (
            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">{t('plans.alreadySubscribed')}</p>
          )}
          {checkoutError && (
            <p className="mt-4 text-center text-sm text-destructive">{checkoutError}</p>
          )}
        </>
      )}
    </div>
  )
}
