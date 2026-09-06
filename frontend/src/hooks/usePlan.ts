import { useEffect, useState } from 'react'
import { publicApiUrl } from '@/lib/publicOrigins'
import { supabase } from '@/lib/supabase'
import { assertClientActive, withClientDeadline } from '@/lib/clientDeadline'

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

// Module cache, scoped to one signed-in user. A failed fetch is never cached
// (the next mount retries), and useAuth invalidates on sign-out / user switch
// so an admin's plan can never leak into the next learner's session on the
// same tab (audit 2026-09-03 F-09).
let cachedUserId: string | null = null
let resolvedPlan: PlanState | null = null
let planPromise: Promise<PlanState> | null = null

function isPlan(value: unknown): value is Plan {
  return value === 'free' || value === 'standard' || value === 'premium'
}

export function invalidatePlan(): void {
  cachedUserId = null
  resolvedPlan = null
  planPromise = null
}

async function fetchPlan(): Promise<{ state: PlanState; userId: string | null }> {
  try {
    return await withClientDeadline(async (signal) => {
      const { data, error } = await supabase.auth.getSession()
      assertClientActive(signal)
      const token = data.session?.access_token
      const userId = data.session?.user?.id ?? null
      if (error || !token) return { state: FAILED_PLAN, userId }

      const response = await fetch(publicApiUrl('/api/entitlements'), {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      if (!response.ok) return { state: FAILED_PLAN, userId }

      const payload = await response.json() as { plan?: unknown; is_admin?: unknown }
      if (!isPlan(payload.plan) || typeof payload.is_admin !== 'boolean') return { state: FAILED_PLAN, userId }

      return {
        state: {
          plan: payload.plan,
          isAdmin: payload.is_admin,
          isPremiumUi: payload.plan === 'premium' || payload.is_admin,
          loaded: true,
        },
        userId,
      }
    }, 15_000)
  } catch {
    return { state: FAILED_PLAN, userId: null }
  }
}

function getPlan(): Promise<PlanState> {
  if (!planPromise) {
    const request = fetchPlan().then(({ state, userId }) => {
      if (state === FAILED_PLAN) {
        // Do not pin a failure; let the next mount try again.
        if (planPromise === request) planPromise = null
        return state
      }
      resolvedPlan = state
      cachedUserId = userId
      return state
    })
    planPromise = request
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

/** The user id the cached plan belongs to (null when nothing is cached). */
export function cachedPlanUserId(): string | null {
  return cachedUserId
}
