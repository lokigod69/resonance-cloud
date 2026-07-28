import { useEffect, useState } from 'react'
import { publicApiUrl } from '@/lib/publicOrigins'
import { supabase } from '@/lib/supabase'

type Plan = 'free' | 'standard' | 'premium'

export interface PlanState {
  plan: Plan
  isAdmin: boolean
  isPremiumUi: boolean
  loaded: boolean
}

const LOADING_PLAN: PlanState = {
  plan: 'free',
  isAdmin: false,
  isPremiumUi: false,
  loaded: false,
}

const FAILED_PLAN: PlanState = {
  ...LOADING_PLAN,
  loaded: true,
}

let resolvedPlan: PlanState | null = null
let planPromise: Promise<PlanState> | null = null

function isPlan(value: unknown): value is Plan {
  return value === 'free' || value === 'standard' || value === 'premium'
}

async function fetchPlan(): Promise<PlanState> {
  try {
    const { data, error } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (error || !token) return FAILED_PLAN

    const response = await fetch(publicApiUrl('/api/entitlements'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return FAILED_PLAN

    const payload = await response.json() as { plan?: unknown; is_admin?: unknown }
    if (!isPlan(payload.plan) || typeof payload.is_admin !== 'boolean') return FAILED_PLAN

    return {
      plan: payload.plan,
      isAdmin: payload.is_admin,
      isPremiumUi: payload.plan === 'premium' || payload.is_admin,
      loaded: true,
    }
  } catch {
    return FAILED_PLAN
  }
}

function getPlan(): Promise<PlanState> {
  if (!planPromise) {
    planPromise = fetchPlan().then((value) => {
      resolvedPlan = value
      return value
    })
  }
  return planPromise
}

export function prefetchPlan(): void {
  void getPlan()
}

export function usePlan(): PlanState {
  const [plan, setPlan] = useState<PlanState>(() => resolvedPlan ?? LOADING_PLAN)

  useEffect(() => {
    let mounted = true
    void getPlan().then((value) => {
      if (mounted) setPlan(value)
    })
    return () => {
      mounted = false
    }
  }, [])

  return plan
}
