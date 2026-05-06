/**
 * Resolve user-facing and admin-debug learning metadata for a card word.
 *
 * The backend writes the same enrichment fields in two coexisting shapes:
 *   1. Top-level scalar columns on `words` (mnemonic, etymology, pos, article,
 *      example, example_gloss). Always written by feeder.py during enrichment.
 *   2. `words.metadata.visual_card_plan` (object). Always written by feeder.py
 *      alongside step 1. Contains usage_example as { target, l1 }.
 *   3. `words.metadata.gpt_image_2_card` (object). Premium-card only, written
 *      by card_worker.py after the GPT Image-2 render. Contains a richer
 *      blueprint including final_provider_prompt_sha256, renderer_profile,
 *      composition, treatment, creative_mode, text_embedding_mode, and the
 *      same usage_example.
 *
 * Older rows generated before the GPT-2 pipeline shipped only have shape 1.
 * Some legacy rows may even be missing visual_card_plan; the resolver must
 * tolerate every combination.
 */

export interface UsageExample {
  target?: string
  base?: string
}

export interface CardLearningMetadata {
  mnemonic?: string
  etymology?: string
  partOfSpeech?: string
  article?: string
  usageExample?: UsageExample
  imageScene?: string
  cardSceneDisplayed?: string
  /** Admin-only blob — never render to the end user. */
  adminDebug: AdminDebugMetadata
}

export interface AdminDebugMetadata {
  visualCardPlan: Record<string, unknown> | null
  gptImage2Card: Record<string, unknown> | null
  fields: {
    mnemonic: string | null
    bridgeMnemonic: string | null
    etymology: string | null
    partOfSpeech: string | null
    article: string | null
    example: string | null
    exampleGloss: string | null
    dominantEmotionalReading: string | null
    compositionHint: string | null
    treatmentHint: string | null
    composition: string | null
    treatment: string | null
    creativeMode: string | null
    textEmbeddingMode: string | null
    rendererProfile: string | null
    rendererProfileSource: string | null
    answerVisibility: string | null
    imageScene: string | null
    cardSceneDisplayed: string | null
    finalProviderPromptSha256: string | null
    promptVersion: string | null
    singleImageTeachable: boolean | null
    layer2CandidateTextMode: boolean | null
    registerNote: string | null
    rationaleSummary: string | null
    cardImageModel: string | null
    generationMode: string | null
  }
}

/**
 * Loose `word` shape we accept. We deliberately accept `unknown` for fields
 * we'll narrow via runtime checks — the live DB has multiple generations of
 * rows and some columns are sometimes null/empty/missing.
 */
export interface WordLike {
  mnemonic?: string | null
  bridge_mnemonic?: string | null
  etymology?: string | null
  pos?: string | null
  article?: string | null
  example?: string | null
  example_gloss?: string | null
  dominant_emotional_reading?: string | null
  composition_hint?: string | null
  treatment_hint?: string | null
  card_image_model?: string | null
  metadata?: unknown
  [key: string]: unknown
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const t = value.trim()
  return t.length > 0 ? t : undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickUsageExample(...candidates: unknown[]): UsageExample | undefined {
  for (const c of candidates) {
    const obj = asRecord(c)
    if (!obj) continue
    const target = clean(obj.target)
    // Backend writes the base-language side as `l1`; we surface it as `base`
    // for clarity. If neither side has any text, skip the candidate.
    const base = clean(obj.l1) ?? clean((obj as Record<string, unknown>).base)
    if (target || base) {
      const result: UsageExample = {}
      if (target) result.target = target
      if (base) result.base = base
      return result
    }
  }
  return undefined
}

function pickString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    const v = clean(c)
    if (v) return v
  }
  return undefined
}

function generationModeLabel(gptImage2Card: Record<string, unknown> | null): string | null {
  if (!gptImage2Card) return null
  const mode = pickString(gptImage2Card.premium_quick_mode)
    ?? pickString(asRecord(gptImage2Card.premium_generation_mode)?.premium_quick_mode)
  const backend = pickString(gptImage2Card.backend_template)
    ?? pickString(asRecord(gptImage2Card.premium_generation_mode)?.backend_template)
  const modeLabel: Record<string, string> = {
    quick_generate: 'Quick Generate',
    clear: 'Clear',
    memorable: 'Memorable',
    weird: 'Weird',
    word_design: 'Word Design',
    infographic: 'Infographic',
    custom: 'Custom',
  }
  const backendLabel: Record<string, string> = {
    structured_plan_v1: 'Compiler V1',
    direct_prompt_v1: 'LLM V1',
    direct_prompt_v2: 'LLM V2',
  }
  const left = mode ? (modeLabel[mode] ?? mode) : null
  const right = backend ? (backendLabel[backend] ?? backend) : null
  if (mode === 'quick_generate') return left
  return [left, right].filter(Boolean).join(' · ') || null
}

/**
 * Pure resolver. Supports old and new metadata shapes. Never throws on
 * malformed input — unknown / partial / mistyped fields are dropped silently.
 *
 * For the user-facing card detail panel, surface the top-level fields. For
 * admin/debug, the full visual_card_plan and gpt_image_2_card blobs are
 * preserved verbatim under `adminDebug`.
 */
export function resolveCardLearningMetadata(word: WordLike | null | undefined): CardLearningMetadata {
  const meta = asRecord(word?.metadata)
  const visualCardPlan = asRecord(meta?.visual_card_plan)
  const gptImage2Card = asRecord(meta?.gpt_image_2_card)

  // Mnemonic priority: top-level (post-render rewrite for Premium) > GPT card
  // displayed_mnemonic > visual_card_plan.mnemonic > visual_card_plan.bridge.
  const mnemonic = pickString(
    word?.mnemonic,
    gptImage2Card?.displayed_mnemonic,
    gptImage2Card?.mnemonic,
    visualCardPlan?.mnemonic,
    word?.bridge_mnemonic,
  )

  const etymology = pickString(
    word?.etymology,
    gptImage2Card?.etymology,
    visualCardPlan?.etymology,
  )

  const partOfSpeech = pickString(word?.pos)
  const article = pickString(word?.article)

  // Usage example priority: GPT card > visual_card_plan > legacy top-level
  // strings (example + example_gloss). The legacy strings are a single-line
  // pair that predates the {target,l1} object shape.
  const legacyExamplePair: UsageExample | undefined = (() => {
    const target = clean(word?.example)
    const base = clean(word?.example_gloss)
    if (!target && !base) return undefined
    const result: UsageExample = {}
    if (target) result.target = target
    if (base) result.base = base
    return result
  })()

  const usageExample = pickUsageExample(
    gptImage2Card?.usage_example,
    visualCardPlan?.usage_example,
    legacyExamplePair,
  )

  const imageScene = pickString(
    gptImage2Card?.image_scene,
    visualCardPlan?.image_scene,
  )

  const cardSceneDisplayed = pickString(
    gptImage2Card?.card_scene_displayed,
    visualCardPlan?.image_scene,
  )

  const adminDebug: AdminDebugMetadata = {
    visualCardPlan: visualCardPlan,
    gptImage2Card: gptImage2Card,
    fields: {
      mnemonic: pickString(word?.mnemonic, gptImage2Card?.mnemonic, visualCardPlan?.mnemonic) ?? null,
      bridgeMnemonic: pickString(word?.bridge_mnemonic) ?? null,
      etymology: pickString(word?.etymology, gptImage2Card?.etymology, visualCardPlan?.etymology) ?? null,
      partOfSpeech: partOfSpeech ?? null,
      article: article ?? null,
      example: pickString(word?.example) ?? null,
      exampleGloss: pickString(word?.example_gloss) ?? null,
      dominantEmotionalReading: pickString(
        word?.dominant_emotional_reading,
        gptImage2Card?.dominant_emotional_reading,
        visualCardPlan?.dominant_emotional_reading,
      ) ?? null,
      compositionHint: pickString(word?.composition_hint) ?? null,
      treatmentHint: pickString(word?.treatment_hint) ?? null,
      composition: pickString(gptImage2Card?.composition, visualCardPlan?.composition) ?? null,
      treatment: pickString(gptImage2Card?.treatment, visualCardPlan?.treatment) ?? null,
      creativeMode: pickString(gptImage2Card?.creative_mode, visualCardPlan?.creative_mode) ?? null,
      textEmbeddingMode: pickString(
        gptImage2Card?.text_embedding_mode,
        visualCardPlan?.text_embedding_mode,
      ) ?? null,
      rendererProfile: pickString(
        gptImage2Card?.renderer_profile,
        visualCardPlan?.renderer_profile,
      ) ?? null,
      rendererProfileSource: pickString(
        gptImage2Card?.renderer_profile_source,
        visualCardPlan?.renderer_profile_source,
      ) ?? null,
      answerVisibility: pickString(
        gptImage2Card?.answer_visibility,
        visualCardPlan?.answer_visibility,
      ) ?? null,
      imageScene: imageScene ?? null,
      cardSceneDisplayed: cardSceneDisplayed ?? null,
      finalProviderPromptSha256: pickString(gptImage2Card?.final_provider_prompt_sha256) ?? null,
      promptVersion: pickString(gptImage2Card?.prompt_version) ?? null,
      singleImageTeachable: typeof gptImage2Card?.single_image_teachable === 'boolean'
        ? (gptImage2Card.single_image_teachable as boolean)
        : typeof visualCardPlan?.single_image_teachable === 'boolean'
          ? (visualCardPlan.single_image_teachable as boolean)
          : null,
      layer2CandidateTextMode: typeof gptImage2Card?.layer2_candidate_text_mode === 'boolean'
        ? (gptImage2Card.layer2_candidate_text_mode as boolean)
        : null,
      registerNote: pickString(gptImage2Card?.register_note, visualCardPlan?.register_note) ?? null,
      rationaleSummary: pickString(gptImage2Card?.rationale_summary, visualCardPlan?.rationale_summary) ?? null,
      cardImageModel: pickString(word?.card_image_model) ?? null,
      generationMode: generationModeLabel(gptImage2Card) ?? generationModeLabel(visualCardPlan),
    },
  }

  const result: CardLearningMetadata = { adminDebug }
  if (mnemonic) result.mnemonic = mnemonic
  if (etymology) result.etymology = etymology
  if (partOfSpeech) result.partOfSpeech = partOfSpeech
  if (article) result.article = article
  if (usageExample) result.usageExample = usageExample
  if (imageScene) result.imageScene = imageScene
  if (cardSceneDisplayed) result.cardSceneDisplayed = cardSceneDisplayed
  return result
}
