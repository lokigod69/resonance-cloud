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
 *   4. `words.metadata.gpt_image_2_card.infographic_learning` (object).
 *      Infographic-card only, written from the final infographic planner/writer
 *      content. This is the user-facing source of truth when present.
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
  isInfographic?: boolean
  translation?: string
  mnemonic?: string
  etymology?: string
  partOfSpeech?: string
  pronunciation?: string
  article?: string
  usageExample?: UsageExample
  collocations?: string[]
  usageNote?: string
  commonMistake?: string
  memoryCue?: string
  footerTakeaway?: string
  templateLabel?: string
  imageScene?: string
  cardSceneDisplayed?: string
  /** Admin-only blob — never render to the end user. */
  adminDebug: AdminDebugMetadata
}

export interface AdminDebugMetadata {
  visualCardPlan: Record<string, unknown> | null
  gptImage2Card: Record<string, unknown> | null
  infographicLearning: Record<string, unknown> | null
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
    const base = clean(obj.l1) ?? clean((obj as Record<string, unknown>).base) ?? clean(obj.gloss)
    if (target || base) {
      const result: UsageExample = {}
      if (target) result.target = target
      if (base) result.base = base
      return result
    }
  }
  return undefined
}

function firstExampleSentence(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value)) return null
  for (const item of value) {
    const obj = asRecord(item)
    if (obj) return obj
  }
  return null
}

function pickStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const result: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const text = clean(item)
    if (!text) continue
    const key = text.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(text)
  }
  return result.length > 0 ? result : undefined
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
    direct_prompt_v3: 'LLM V3 · Visual Craft',
  }
  const left = mode ? (modeLabel[mode] ?? mode) : null
  const right = backend ? (backendLabel[backend] ?? backend) : null
  if (mode === 'quick_generate') return left
  return [left, right].filter(Boolean).join(' · ') || null
}

function isInfographicCard(
  meta: Record<string, unknown> | null,
  gptImage2Card: Record<string, unknown> | null,
  infographicLearning: Record<string, unknown> | null,
): boolean {
  if (infographicLearning) return true
  const values = [
    gptImage2Card?.backend_template,
    gptImage2Card?.presentation_form,
    gptImage2Card?.premium_quick_mode,
    gptImage2Card?.infographic_template,
    asRecord(gptImage2Card?.premium_generation_mode)?.premium_quick_mode,
    asRecord(gptImage2Card?.layer2_resolved)?.presentation_form,
    asRecord(gptImage2Card?.layer2_resolved)?.infographic_template,
    asRecord(meta?.layer2_eval)?.presentation_form,
    asRecord(meta?.layer2_eval)?.infographic_template,
  ]
  return values.some((value) => {
    const text = clean(value)
    return text === 'infographic_prompt_v1'
      || text === 'infographic_card'
      || text === 'infographic'
      || Boolean(text?.startsWith('infographic_'))
  })
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
  const infographicLearning = asRecord(gptImage2Card?.infographic_learning)
  const isInfographic = isInfographicCard(meta, gptImage2Card, infographicLearning)
  const infographicExample = firstExampleSentence(infographicLearning?.example_sentences)
  const infographicMemoryCue = pickString(infographicLearning?.memory_cue)

  const mnemonic = infographicLearning
    ? infographicMemoryCue
    : pickString(
        word?.mnemonic,
        gptImage2Card?.displayed_mnemonic,
        gptImage2Card?.mnemonic,
        visualCardPlan?.mnemonic,
        word?.bridge_mnemonic,
      )

  const etymology = infographicLearning
    ? pickString(infographicLearning.etymology, word?.etymology, gptImage2Card?.etymology)
    : pickString(word?.etymology, gptImage2Card?.etymology, visualCardPlan?.etymology)

  const partOfSpeech = pickString(infographicLearning?.part_of_speech, word?.pos)
  const article = pickString(word?.article)
  const translation = pickString(infographicLearning?.translation, word?.translation)
  const collocations = pickStringArray(infographicLearning?.collocations)
  const usageNote = pickString(infographicLearning?.usage_note)
  const commonMistake = pickString(infographicLearning?.common_mistake)
  const footerTakeaway = pickString(infographicLearning?.footer_takeaway)
  const templateLabel = pickString(infographicLearning?.template_label)

  // Infographic cards with normalized learning metadata skip visual_card_plan:
  // that object is generated before image rendering and may describe a scene
  // that never appeared in the final infographic.
  const legacyExamplePair: UsageExample | undefined = (() => {
    const target = clean(word?.example)
    const base = clean(word?.example_gloss)
    if (!target && !base) return undefined
    const result: UsageExample = {}
    if (target) result.target = target
    if (base) result.base = base
    return result
  })()

  const usageExample = infographicLearning
    ? pickUsageExample(infographicExample, gptImage2Card?.usage_example, legacyExamplePair)
    : pickUsageExample(gptImage2Card?.usage_example, visualCardPlan?.usage_example, legacyExamplePair)

  const imageScene = infographicLearning
    ? undefined
    : pickString(gptImage2Card?.image_scene, visualCardPlan?.image_scene)

  const cardSceneDisplayed = infographicLearning
    ? undefined
    : pickString(gptImage2Card?.card_scene_displayed, visualCardPlan?.image_scene)

  const adminDebug: AdminDebugMetadata = {
    visualCardPlan: visualCardPlan,
    gptImage2Card: gptImage2Card,
    infographicLearning: infographicLearning,
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
  if (isInfographic) result.isInfographic = true
  if (translation) result.translation = translation
  if (mnemonic) result.mnemonic = mnemonic
  if (etymology) result.etymology = etymology
  if (partOfSpeech) result.partOfSpeech = partOfSpeech
  const pronunciation = pickString(infographicLearning?.pronunciation)
  if (pronunciation) result.pronunciation = pronunciation
  if (article) result.article = article
  if (usageExample) result.usageExample = usageExample
  if (collocations) result.collocations = collocations
  if (usageNote) result.usageNote = usageNote
  if (commonMistake) result.commonMistake = commonMistake
  if (infographicMemoryCue) result.memoryCue = infographicMemoryCue
  if (footerTakeaway) result.footerTakeaway = footerTakeaway
  if (templateLabel) result.templateLabel = templateLabel
  if (imageScene) result.imageScene = imageScene
  if (cardSceneDisplayed) result.cardSceneDisplayed = cardSceneDisplayed
  return result
}
