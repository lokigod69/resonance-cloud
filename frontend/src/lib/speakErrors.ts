export const PLAN_LIMIT_SPEAK_CODES = [
  'speak_trial_exhausted',
  'speak_allowance_exhausted',
  'live_allowance_exhausted',
  'premium_required',
] as const

export function isPlanLimitSpeakCode(code: unknown): boolean {
  return typeof code === 'string'
    && (PLAN_LIMIT_SPEAK_CODES as readonly string[]).includes(code)
}

export class SpeakPlanLimitError extends Error {}
