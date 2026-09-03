// src/lib/analytics.ts
//
// Client-side Analytics OS singleton — the portfolio-standard 8-event
// vocabulary (see src/vendor/analyticsos, a generated snapshot; never
// hand-edit it).
//
// Emission rules (Analytics OS handoff, 2026-08-02):
// - Master switch: VITE_AOS_ANALYTICS_ENABLED === 'true' AND key present.
//   Unset (the default everywhere today) → a no-op with the same surface.
// - Fire-and-forget: track() never throws and never rejects.
// - Stores NOTHING on the device: no cookies, no localStorage. Pre-login
//   identity is an in-memory anon id, new per page load — by design.
// - Logged-in distinctId = the Supabase user id (identify()/reset() are wired
//   in useAuth). Pre-login visits and the account are deliberately unlinked.
// - Per-user opt-out (profiles.analytics_opt_out) suppresses all emits at
//   source via setOptOut(), synced wherever the profile is loaded.
// - No PII in props.

import {
  createCapture,
  deterministicUuid,
  PostHogSink,
  type Capture,
  type EventName,
} from '../vendor/analyticsos'
import { isNativeApp } from './platform'
import { supabase } from './supabase'

export { deterministicUuid }

const AOS_PROJECT_ID = 'lingwave'
const AOS_INGEST_HOST = 'https://eu.i.posthog.com'

/**
 * The path the page load actually entered on, captured before any redirect.
 * CO-3 (Legal OS): path only — pathname by construction never carries the
 * query string or fragment; attribution rides solely the vendored ref/utm
 * allowlist (which reads the full href separately).
 */
export const ANALYTICS_ENTRY_PATH =
  typeof window !== 'undefined' ? window.location.pathname : '/'

const posthogKey = import.meta.env.VITE_AOS_POSTHOG_KEY as string | undefined
const analyticsEnabled =
  import.meta.env.VITE_AOS_ANALYTICS_ENABLED === 'true' && Boolean(posthogKey)

let optedOut = false

const capture: Capture | null = analyticsEnabled
  ? createCapture({
      projectId: AOS_PROJECT_ID,
      platform: isNativeApp() ? 'ios' : 'web',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      sink: new PostHogSink({
        ingestHost: AOS_INGEST_HOST,
        projectApiKey: posthogKey ?? '',
      }),
    })
  : null

export const analytics = {
  enabled: analyticsEnabled,

  /** Fire-and-forget emit; validation or network failures are swallowed. */
  track(event: EventName, props?: Record<string, unknown>, opts?: { uuid?: string }): void {
    if (!capture || optedOut) return
    capture.track(event, props, opts).catch(() => {})
  },

  /** Logged-in: subsequent events carry the Supabase user id. */
  identify(userId: string): void {
    capture?.grantConsent(userId)
  },

  /** Logged-out: back to a fresh in-memory anonymous id. */
  reset(): void {
    capture?.revokeConsent()
  },

  setOptOut(value: boolean): void {
    optedOut = value
  },
}

export function classifyEntryPath(path: string): 'landing' | 'share' | 'app' {
  if (path.startsWith('/share/') || path.startsWith('/v/')) return 'share'
  if (path === '/' || path === '/login' || path === '/reset-password') return 'landing'
  return 'app'
}

// ── learning actions (core_action + the once-ever activation gate) ──────────

type ClientCoreActionKind = 'guided_step' | 'study_rep' | 'song_generated' | 'game_round' | 'stream_keep'

// Per page load: once the activation RPC has answered (either way), stop
// calling it. In-memory only — analytics keeps nothing on the device.
let activationResolved = false

/**
 * One client-side learning_action: emits core_action with props.kind, then —
 * for logged-in users — asks the activation gate (profiles.activated_at via
 * RPC) and emits activation exactly once per user, ever.
 */
export function trackLearningAction(kind: ClientCoreActionKind, props?: Record<string, unknown>): void {
  analytics.track('core_action', { kind, skin: 'glassy', ...props })

  if (!analyticsEnabled || optedOut || activationResolved) return
  void (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.rpc('record_learning_action_activation')
      if (error) return // pre-migration or transient — retry on the next action
      activationResolved = true
      if ((data as { first?: boolean } | null)?.first) {
        analytics.track('activation', undefined, {
          uuid: deterministicUuid(`activation:${user.id}`),
        })
      }
    } catch {
      // analytics must never break a user interaction
    }
  })()
}
