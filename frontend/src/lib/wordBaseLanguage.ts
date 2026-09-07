import { canonicalizeBaseLanguageValue, type BaseLanguageValue } from './languages'

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function resolveCandidate(value: unknown): BaseLanguageValue | null {
  return typeof value === 'string' ? canonicalizeBaseLanguageValue(value) : null
}

/**
 * Read persisted per-card provenance. Unknown legacy cards deliberately return
 * null: the learner's current profile language is not evidence about the
 * language used when an older card was generated.
 */
export function resolveWordBaseLanguage(metadata: unknown): BaseLanguageValue | null {
  const root = asRecord(metadata)
  if (!root) return null

  const curriculum = asRecord(root.curriculum)
  const visualCardPlan = asRecord(root.visual_card_plan)
  const gptImage2Card = asRecord(root.gpt_image_2_card)
  const infographicLearning = asRecord(gptImage2Card?.infographic_learning)

  return (
    resolveCandidate(root.base_language)
    ?? resolveCandidate(root.helper_language)
    ?? resolveCandidate(curriculum?.base_language)
    ?? resolveCandidate(curriculum?.helper_language)
    ?? resolveCandidate(infographicLearning?.base_language)
    ?? resolveCandidate(gptImage2Card?.base_language_intended)
    ?? resolveCandidate(gptImage2Card?.base_language)
    ?? resolveCandidate(visualCardPlan?.base_language)
  )
}

/** One deck-wide label is honest only when every known card provenance agrees. */
export function resolveSharedWordBaseLanguage(
  values: ReadonlyArray<string | null | undefined>,
): BaseLanguageValue | null {
  const known = new Set(
    values.flatMap((value) => {
      const canonical = canonicalizeBaseLanguageValue(value)
      return canonical ? [canonical] : []
    }),
  )
  return known.size === 1 ? [...known][0] : null
}
