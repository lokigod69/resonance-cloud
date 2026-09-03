/* eslint-disable */
// Analytics is a no-op in the harness. The real module imports the Supabase
// client by RELATIVE path ('./supabase'), which the '@/lib/supabase' alias
// does not intercept — so it must be stubbed as a whole.

import { record } from './scenario'

export const analytics = {
  track: (event: string, props?: unknown) => record(`analytics:${event}`, props),
  identify: () => {},
  reset: () => {},
  setOptOut: () => {},
}

export function trackLearningAction(kind: string, props?: Record<string, unknown>): void {
  record(`learning_action:${kind}`, props ?? null)
}
