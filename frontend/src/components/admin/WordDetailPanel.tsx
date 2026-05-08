import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Video, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import StarRating from '@/components/ui/StarRating'
import {
  cardLayer2ArtStyleLabel,
  cardLayer2MeaningLabel,
  cardLayer2PresentationLabel,
  type CardLayer2ArtStyle,
  type CardLayer2MeaningStrategy,
  type CardLayer2PresentationForm,
} from '@/components/generate/useWizardState'
import { infographicTemplateLabel, layer2BackendTemplateLabel } from '@/lib/adminLayer2Lab'
import { resolveCardLearningMetadata } from '@/lib/wordDisplayMetadata'
import { classifyCardGenerationFailure } from '@/lib/cardFailureClassification'

type WordRecord = {
  id: string
  deck_id: string
  user_id: string
  word: string
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  bridge_mnemonic?: string | null
  dominant_emotional_reading?: string | null
  composition_hint?: string | null
  treatment_hint?: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  example?: string | null
  example_gloss?: string | null
  card_image_model?: string | null
  generation_job_id?: string | null
  status: string
  current_stage?: string | null
  failed_stage?: string | null
  video_url: string | null
  thumbnail_url: string | null
  image_url?: string | null
  card_image_url?: string | null
  generation_job?: {
    status?: string | null
    error_message?: string | null
  } | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  error_message: string | null
  retry_requested?: boolean | null
  retry_requested_at?: string | null
  retry_count: number
  metadata: Record<string, unknown> | null
  rating: number | null
  rated_at: string | null
  needs_review: boolean
  created_at: string
}

const COST_PER_CARD: Record<string, number> = {
  zturbo: 0.004,
  flux_pro: 0.025,
  wan_fast: 0.024,
  wan_pro: 0.060,
  seedream_lite: 0.0275,
  gpt_image_2: 0.050,
}

export default function WordDetailPanel({
  word,
  open,
  onClose,
}: {
  word: WordRecord | null
  open: boolean
  onClose: () => void
}) {
  const [rawJsonOpen, setRawJsonOpen] = useState(false)
  const [cardPlanOpen, setCardPlanOpen] = useState(true)
  const [gptCardOpen, setGptCardOpen] = useState(true)

  if (!word) return null

  const meta = word.metadata
  const cardImageModel = normalizeCardImageModel(word.card_image_model) ?? getMetadataCardImageModel(meta)
  const cardCost = cardImageModel ? formatCardCost(cardImageModel) : null
  const learning = resolveCardLearningMetadata(word)
  const debug = learning.adminDebug
  const visualPlan = asRecord(debug.visualCardPlan)
  const gptImage2Card = asRecord(debug.gptImage2Card)
  const infographicLearning = asRecord(debug.infographicLearning)
  const layer2Eval = asRecord(meta?.layer2_eval)
  const layer2UserChoices = asRecord(gptImage2Card?.layer2_user_choices)
  const layer2Resolved = asRecord(gptImage2Card?.layer2_resolved)
  const layer2SnapNotes = Array.isArray(gptImage2Card?.layer2_snap_notes)
    ? (gptImage2Card.layer2_snap_notes as unknown[]).map(String).join(', ')
    : null
  const imageBridge = cleanText(gptImage2Card?.image_bridge as string | null | undefined)
  const cardImageStyle = cleanText(layer2Eval?.art_style as string | null | undefined)
  const layer2Summary = formatLayer2EvalSummary(layer2Eval)
  const outputState = formatOutputPresence(word)
  const failureClassification = classifyCardGenerationFailure(word)
  const queueState = failureClassification.label
  const providerIdentity = cleanText(gptImage2Card?.provider_task_id as string | null | undefined)
    ?? cleanText(gptImage2Card?.kie_task_id as string | null | undefined)
  const gptEnrichmentRows = [
    { label: 'Mnemonic (visual scene)', value: cleanText(word.mnemonic) },
    { label: 'Bridge mnemonic', value: cleanText(word.bridge_mnemonic) },
    { label: 'Emotional reading', value: cleanText(word.dominant_emotional_reading) },
    { label: 'Composition (hint)', value: cleanText(word.composition_hint) },
    { label: 'Treatment (hint)', value: cleanText(word.treatment_hint) },
    { label: 'Example (target)', value: cleanText(word.example) },
    { label: 'Example (gloss)', value: cleanText(word.example_gloss) },
  ].filter((row): row is { label: string; value: string } => row.value !== null)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {word.word}
            {word.translation && (
              <span className="text-muted-foreground font-normal text-base">
                — {word.translation}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Video Player — Version A */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Version A</p>
          <div className="relative rounded-lg overflow-hidden bg-zinc-900 aspect-video w-full flex items-center justify-center">
            {word.video_url ? (
              <video
                src={word.video_url}
                controls
                className="absolute inset-0 w-full h-full object-contain"
                preload="metadata"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Video className="h-10 w-10" />
                <span className="text-sm">No video available</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Player — Version B */}
        {word.video_url_b && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Version B</p>
            <div className="relative rounded-lg overflow-hidden bg-zinc-900 aspect-video w-full flex items-center justify-center">
              <video
                src={word.video_url_b}
                controls
                className="absolute inset-0 w-full h-full object-contain"
                preload="metadata"
              />
            </div>
          </div>
        )}

        {/* Word Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Word" value={word.word} />
          <InfoRow label="Translation" value={word.translation} />
          <InfoRow label="POS" value={word.pos} />
          <InfoRow label="Article" value={word.article} />
          <div className="col-span-2">
            <InfoRow label="Mnemonic" value={word.mnemonic} />
          </div>
          <div className="col-span-2">
            <InfoRow label="Etymology" value={word.etymology} />
          </div>
          <InfoRow label="Status" value={word.status} />
          <InfoRow label="Retry Count" value={String(word.retry_count)} />
          <InfoRow label="Generation Job ID" value={word.generation_job_id} />
          <InfoRow label="Current Stage" value={word.current_stage} />
          <InfoRow label="Failed Stage" value={word.failed_stage} />
          <InfoRow label="Retry Requested" value={formatBoolean(word.retry_requested)} />
          <InfoRow label="Retry Requested At" value={word.retry_requested_at} />
          <InfoRow label="Queue / Worker State" value={queueState} />
          <InfoRow label="Failure Classification" value={failureClassification.kind} />
          <InfoRow label="Provider Reach" value={failureClassification.providerReached === false ? 'Provider was not reached' : failureClassification.providerReached === true ? 'Provider was reached' : 'Unknown'} />
          <InfoRow label="Image Output Presence" value={outputState} />
          <InfoRow label="Generation Job Status" value={word.generation_job?.status} />
          <InfoRow label="Generation Job Error" value={word.generation_job?.error_message} />
          <div>
            <span className="text-muted-foreground">Rating: </span>
            {word.rating ? (
              <span className="inline-flex items-center gap-2">
                <StarRating rating={word.rating} readOnly size={16} />
                {word.rated_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(word.rated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Not yet rated</span>
            )}
          </div>
          {word.error_message && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Error: </span>
              <span className="text-red-400">{word.error_message}</span>
            </div>
          )}
        </div>

        {gptEnrichmentRows.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">GPT Enrichment</h3>
            <MetaSection title="Production Brief Fields">
              {gptEnrichmentRows.map(row => (
                <MetaRow key={row.label} label={row.label} value={row.value} />
              ))}
            </MetaSection>
          </div>
        )}

        {infographicLearning && (
          <MetaSection title="Infographic Learning Metadata">
            <MetaRow label="Template / Style" value={cleanText(infographicLearning.template_label as string | null | undefined)} />
            <MetaRow label="Template" value={cleanText(infographicLearning.template as string | null | undefined)} />
            <MetaRow label="Headword" value={cleanText(infographicLearning.headword as string | null | undefined)} />
            <MetaRow label="Translation" value={cleanText(infographicLearning.translation as string | null | undefined)} />
            <MetaRow label="Base Language" value={cleanText(infographicLearning.base_language as string | null | undefined)} />
            <MetaRow label="Target Language" value={cleanText(infographicLearning.target_language as string | null | undefined)} />
            <MetaRow label="Part of Speech" value={cleanText(infographicLearning.part_of_speech as string | null | undefined)} />
            <MetaRow label="Pronunciation" value={cleanText(infographicLearning.pronunciation as string | null | undefined)} />
            <MetaRow label="Example Sentences" value={formatUnknownJsonValue(infographicLearning.example_sentences)} />
            <MetaRow label="Collocations" value={formatUnknownJsonValue(infographicLearning.collocations)} />
            <MetaRow label="Etymology" value={cleanText(infographicLearning.etymology as string | null | undefined)} />
            <MetaRow label="Usage Note" value={cleanText(infographicLearning.usage_note as string | null | undefined)} />
            <MetaRow label="Common Mistake" value={cleanText(infographicLearning.common_mistake as string | null | undefined)} />
            <MetaRow label="Memory Cue" value={cleanText(infographicLearning.memory_cue as string | null | undefined)} />
            <MetaRow label="Footer Takeaway" value={cleanText(infographicLearning.footer_takeaway as string | null | undefined)} />
          </MetaSection>
        )}

        {/* Legacy pre-image visual plan (enrichment-time, written before final infographic prompt/image) */}
        {debug.visualCardPlan && (
          <div className="space-y-3">
            <button
              onClick={() => setCardPlanOpen(!cardPlanOpen)}
              className="flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors"
            >
              {cardPlanOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Legacy Pre-image Visual Plan
            </button>
            {cardPlanOpen && (
              <MetaSection title="metadata.visual_card_plan (legacy pre-image)">
                <MetaRow label="Image Scene" value={cleanText(visualPlan?.image_scene as string | null | undefined)} />
                <MetaRow label="Card Scene Displayed" value={cleanText(visualPlan?.card_scene_displayed as string | null | undefined)} />
                <MetaRow label="Composition" value={cleanText(visualPlan?.composition as string | null | undefined)} />
                <MetaRow label="Treatment" value={cleanText(visualPlan?.treatment as string | null | undefined)} />
                <MetaRow label="Creative Mode" value={cleanText(visualPlan?.creative_mode as string | null | undefined)} />
                <MetaRow label="Text Embedding Mode" value={cleanText(visualPlan?.text_embedding_mode as string | null | undefined)} />
                <MetaRow label="Renderer Profile" value={cleanText(visualPlan?.renderer_profile as string | null | undefined)} />
                <MetaRow label="Renderer Profile Source" value={cleanText(visualPlan?.renderer_profile_source as string | null | undefined)} />
                <MetaRow label="Answer Visibility" value={cleanText(visualPlan?.answer_visibility as string | null | undefined)} />
                <MetaRow label="Layer 2 Planning Version" value={cleanText(visualPlan?.layer2_planning_version as string | null | undefined)} />
                <MetaRow label="Mini Story Beats" value={formatUnknownJsonValue(visualPlan?.mini_story_beats)} />
                <MetaRow label="Split Panel Brief" value={formatUnknownJsonValue(visualPlan?.split_panel_brief)} />
                <MetaRow label="Word Design Brief" value={formatUnknownJsonValue(visualPlan?.word_design_brief)} />
                <MetaRow label="Word Design Mode" value={cleanText(visualPlan?.word_design_mode as string | null | undefined)} />
                <MetaRow label="Mnemonic Hook" value={formatUnknownJsonValue(visualPlan?.mnemonic_hook)} />
                <MetaRow label="Hook Type" value={cleanText(visualPlan?.hook_type as string | null | undefined)} />
                <MetaRow label="Hook Quality" value={cleanText(visualPlan?.hook_quality as string | null | undefined)} />
                <MetaRow label="Dominant Emotional Reading" value={cleanText(visualPlan?.dominant_emotional_reading as string | null | undefined)} />
                <MetaRow label="Single Image Teachable" value={typeof visualPlan?.single_image_teachable === 'boolean' ? String(visualPlan.single_image_teachable) : null} />
                <MetaRow label="Register Note" value={cleanText(visualPlan?.register_note as string | null | undefined)} />
                <MetaRow label="Rationale Summary" value={cleanText(visualPlan?.rationale_summary as string | null | undefined)} />
              </MetaSection>
            )}
          </div>
        )}

        {/* GPT Image-2 Card metadata (Premium-card only, written post-render) */}
        {debug.gptImage2Card && (
          <div className="space-y-3">
            <button
              onClick={() => setGptCardOpen(!gptCardOpen)}
              className="flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors"
            >
              {gptCardOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              GPT Image-2 Card
            </button>
            {gptCardOpen && (
              <MetaSection title="metadata.gpt_image_2_card">
                <MetaRow label="Prompt Version" value={debug.fields.promptVersion} />
                <MetaRow label="Final Provider Prompt SHA-256" value={debug.fields.finalProviderPromptSha256} />
                <MetaRow label="Layer 2 Candidate (text mode)" value={debug.fields.layer2CandidateTextMode === null ? null : String(debug.fields.layer2CandidateTextMode)} />
                <MetaRow label="Card Image Model" value={debug.fields.cardImageModel} />
                <MetaRow label="Card Image Style" value={cardImageStyle} />
                <MetaRow label="Generation Mode" value={debug.fields.generationMode} />
                <MetaRow label="Backend Template" value={formatBackendTemplate(gptImage2Card?.backend_template)} />
                <MetaRow label="Infographic Template" value={formatInfographicTemplate(gptImage2Card?.infographic_template)} />
                <MetaRow label="Provider Model" value={cleanText(gptImage2Card?.provider_model as string | null | undefined)} />
                <MetaRow label="Provider Reached" value={formatBoolean(gptImage2Card?.provider_reached)} />
                <MetaRow label="Failure Origin" value={cleanText(gptImage2Card?.failure_origin as string | null | undefined)} />
                <MetaRow label="Provider Task ID" value={providerIdentity ?? (failureClassification.providerReached === false ? 'Provider was not reached.' : null)} />
                <MetaRow label="Provider Error Summary" value={cleanText(gptImage2Card?.provider_error_summary as string | null | undefined)} />
                <MetaRow label="V4 Prompt Writer Model" value={cleanText(gptImage2Card?.prompt_writer_model as string | null | undefined)} />
                <MetaRow label="Dense Editorial" value={formatBoolean(gptImage2Card?.dense_editorial)} />
                <MetaRow label="Vocabulary First" value={formatBoolean(gptImage2Card?.vocabulary_first)} />
                <MetaRow label="Visible Module Count" value={gptImage2Card?.visible_module_count as number | null | undefined} />
                <MetaRow label="Dense Editorial Category" value={cleanText(gptImage2Card?.dense_editorial_word_category as string | null | undefined)} />
                <MetaRow label="Validator Passed" value={formatBoolean(gptImage2Card?.validator_passed)} />
                <MetaRow label="Validator Retry Count" value={gptImage2Card?.validator_retry_count as number | null | undefined} />
                <MetaRow label="Validator Errors" value={formatUnknownJsonValue(gptImage2Card?.validator_errors)} />
                <MetaRow label="Validator Hard Errors" value={formatUnknownJsonValue(gptImage2Card?.validator_hard_errors)} />
                <MetaRow label="Validator Warnings" value={formatUnknownJsonValue(gptImage2Card?.validator_warnings)} />
                <MetaRow label="Prompt Rule Ratio Estimate" value={formatNumber(gptImage2Card?.prompt_rule_ratio_estimate)} />
                <MetaRow label="Prompt Length Warning" value={cleanText(gptImage2Card?.prompt_length_warning as string | null | undefined)} />
                <MetaRow label="Reference Attached" value={formatBoolean(gptImage2Card?.reference_attached)} />
                <MetaRow label="Reference Fallback Used" value={formatBoolean(gptImage2Card?.reference_fallback_used)} />
                <MetaRow label="Template Reference URL" value={cleanText(gptImage2Card?.template_reference_url as string | null | undefined)} />
                <MetaRow label="Template Reference Path" value={cleanText(gptImage2Card?.template_reference_asset_path as string | null | undefined)} />
                <MetaRow label="Planner Model" value={cleanText(gptImage2Card?.planner_model as string | null | undefined)} />
                <MetaRow label="Planner Panel Count" value={gptImage2Card?.planner_panel_count as number | null | undefined} />
                <MetaRow label="Planner Pass Count" value={gptImage2Card?.planner_pass_count as number | null | undefined} />
                <MetaRow label="Planner Hero Treatment" value={cleanText(gptImage2Card?.planner_hero_treatment as string | null | undefined)} />
                <MetaRow label="Final Prompt Chars" value={gptImage2Card?.final_prompt_chars as number | null | undefined} />
                <MetaRow label="Final Prompt SHA-256" value={cleanText(gptImage2Card?.final_prompt_sha256 as string | null | undefined)} />
                <MetaRow label="Final Prompt Preview" value={cleanText(gptImage2Card?.final_prompt_preview as string | null | undefined)} />
                <MetaRow label="Base Language Intended" value={cleanText(gptImage2Card?.base_language_intended as string | null | undefined)} />
                <MetaRow label="Target Language" value={cleanText(gptImage2Card?.target_language as string | null | undefined)} />
                <MetaRow label="Planner JSON Preview" value={cleanText(gptImage2Card?.planner_json_preview as string | null | undefined)} />
                <MetaRow label="Layer 2 User Choices" value={formatJsonValue(layer2UserChoices)} />
                <MetaRow label="Layer 2 Resolved" value={formatJsonValue(layer2Resolved)} />
                <MetaRow label="Layer 2 Snap Notes" value={layer2SnapNotes} />
                <MetaRow label="Direct Prompt Writer Model" value={cleanText(gptImage2Card?.direct_prompt_writer_model as string | null | undefined)} />
                <MetaRow label="Direct Prompt Chars" value={gptImage2Card?.direct_prompt_chars as number | null | undefined} />
                <MetaRow label="Direct Prompt SHA-256" value={cleanText(gptImage2Card?.direct_prompt_prompt_sha256 as string | null | undefined)} />
                <MetaRow label="Direct Prompt Preview" value={cleanText(gptImage2Card?.direct_prompt_preview as string | null | undefined)} />
                <MetaRow label="Layer 2 Planning Version" value={cleanText(gptImage2Card?.layer2_planning_version as string | null | undefined)} />
                <MetaRow label="Mini Story Beats" value={formatUnknownJsonValue(gptImage2Card?.mini_story_beats)} />
                <MetaRow label="Split Panel Brief" value={formatUnknownJsonValue(gptImage2Card?.split_panel_brief)} />
                <MetaRow label="Word Design Brief" value={formatUnknownJsonValue(gptImage2Card?.word_design_brief)} />
                <MetaRow label="Word Design Mode" value={cleanText(gptImage2Card?.word_design_mode as string | null | undefined)} />
                <MetaRow label="Mnemonic Hook" value={formatUnknownJsonValue(gptImage2Card?.mnemonic_hook)} />
                <MetaRow label="Hook Type" value={cleanText(gptImage2Card?.hook_type as string | null | undefined)} />
                <MetaRow label="Hook Quality" value={cleanText(gptImage2Card?.hook_quality as string | null | undefined)} />
                <MetaRow label="Image Bridge" value={imageBridge} />
              </MetaSection>
            )}
          </div>
        )}

        {layer2Eval && (
          <MetaSection title="Layer 2 Evaluation">
            <MetaRow label="Summary" value={layer2Summary} />
            <MetaRow label="Label" value={cleanText(layer2Eval.label as string | null | undefined)} />
            <MetaRow label="Meaning Strategy" value={formatMeaningStrategy(layer2Eval.meaning_strategy)} />
            <MetaRow label="Presentation Form" value={formatPresentationForm(layer2Eval.presentation_form)} />
            <MetaRow label="Art Style" value={formatArtStyle(layer2Eval.art_style)} />
            <MetaRow label="Backend Template" value={formatBackendTemplate(layer2Eval.backend_template)} />
            <MetaRow label="Infographic Template" value={formatInfographicTemplate(layer2Eval.infographic_template)} />
            <MetaRow label="Source" value={cleanText(layer2Eval.source as string | null | undefined)} />
          </MetaSection>
        )}

        {/* Resolved usage example (the same source the user-facing card uses) */}
        {learning.usageExample && (
          <MetaSection title="Resolved usage example (user-facing source of truth)">
            <MetaRow label="Target" value={learning.usageExample.target ?? null} />
            <MetaRow label="Base" value={learning.usageExample.base ?? null} />
          </MetaSection>
        )}

        {/* Metadata */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Generation Metadata</h3>
          {!meta ? (
            <p className="text-sm text-muted-foreground italic">
              Generation metadata not available for this word (generated before metadata tracking was added)
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <MetaSection title="Pipeline Summary">
                <MetaRow label="Total Duration" value={formatDuration(meta.pipeline_duration_seconds as number | undefined)} />
                <MetaRow label="Stages Completed" value={Array.isArray(meta.stages_completed) ? (meta.stages_completed as string[]).join(', ') : null} />
                <MetaRow label="Profile Used" value={meta.profile_used as string | undefined} />
              </MetaSection>

              <MetaSection title="Creative Direction">
                <MetaRow label="Direction" value={meta.creative_direction as string | undefined} />
                <MetaRow label="Rationale" value={meta.creative_direction_rationale as string | undefined} />
                <MetaRow label="Art Style" value={meta.art_style as string | undefined} />
                <MetaRow label="Movie Reference" value={meta.movie_reference as string | undefined} />
                <MetaRow label="Music Caption" value={meta.music_caption as string | undefined} />
              </MetaSection>

              <MetaSection title="Image Generation">
                <MetaRow label="Image Count" value={(meta.images as Record<string, unknown>)?.count as number | undefined} />
                <MetaRow label="Refusals" value={(meta.images as Record<string, unknown>)?.refusals as number | undefined} />
                <MetaRow label="Duration" value={formatDuration((meta.images as Record<string, unknown>)?.duration_seconds as number | undefined)} />
                <MetaRow label="Model" value={(meta.images as Record<string, unknown>)?.model as string | undefined} />
                <MetaRow label="Cost" value={cardCost} />
              </MetaSection>

              <MetaSection title="Concept">
                <MetaRow label="Duration" value={formatDuration((meta.concept as Record<string, unknown>)?.duration_seconds as number | undefined)} />
                <MetaRow label="Caption Source" value={(meta.concept as Record<string, unknown>)?.caption_source as string | undefined} />
              </MetaSection>

              <MetaSection title="Song Generation">
                <MetaRow label="Duration" value={formatDuration((meta.song as Record<string, unknown>)?.duration_seconds as number | undefined)} />
                <MetaRow label="Takes" value={(meta.song as Record<string, unknown>)?.takes as number | undefined} />
              </MetaSection>

              <MetaSection title="Video Generation">
                <MetaRow label="Mode" value={(meta.video as Record<string, unknown>)?.mode as string | undefined} />
                <MetaRow label="Duration" value={formatDuration((meta.video as Record<string, unknown>)?.duration_seconds as number | undefined)} />
              </MetaSection>

              <MetaSection title="Assembly">
                <MetaRow label="Duration" value={formatDuration((meta.assembly as Record<string, unknown>)?.duration_seconds as number | undefined)} />
                <MetaRow label="Final Video Duration" value={formatDuration((meta.assembly as Record<string, unknown>)?.final_video_duration_seconds as number | undefined)} />
                <MetaRow label="LUFS" value={(meta.assembly as Record<string, unknown>)?.lufs as number | undefined} />
              </MetaSection>

              <MetaSection title="Bookend">
                <MetaRow label="TTS Language" value={(meta.bookend as Record<string, unknown>)?.tts_language as string | undefined} />
                <MetaRow label="Voice ID" value={(meta.bookend as Record<string, unknown>)?.voice_id as string | undefined} />
                <MetaRow label="Duration" value={formatDuration((meta.bookend as Record<string, unknown>)?.duration_seconds as number | undefined)} />
              </MetaSection>

              {meta.lora ? (
              <MetaSection title="LoRA">
                <MetaRow label="Path" value={(meta.lora as Record<string, unknown>)?.path as string | undefined} />
                <MetaRow label="Strength" value={(meta.lora as Record<string, unknown>)?.strength as number | undefined} />
                <MetaRow label="Trigger Phrase" value={(meta.lora as Record<string, unknown>)?.trigger_phrase as string | undefined} />
              </MetaSection>
              ) : null}

              {/* Raw JSON Viewer */}
              <div className="border-t border-border pt-3">
                <button
                  onClick={() => setRawJsonOpen(!rawJsonOpen)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {rawJsonOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  View Raw Metadata
                </button>
                {rawJsonOpen && (
                  <pre className="mt-2 p-3 bg-zinc-900 rounded-lg text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
                    {JSON.stringify(meta, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        <Link
          to={`/admin/observability/word/${word.id}`}
          className="inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View observability
        </Link>
      </DialogContent>
    </Dialog>
  )
}

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim()
  return text ? text : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function normalizeCardImageModel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const model = value.trim()
  if (!model) return null
  if (model in COST_PER_CARD) return model

  const aliases: Record<string, string> = {
    'gpt-image-2': 'gpt_image_2',
    'gpt-image-2-text-to-image': 'gpt_image_2',
    'gpt-image-2-image-to-image': 'gpt_image_2',
    'z-image-turbo': 'zturbo',
    'zturbo': 'zturbo',
  }
  return aliases[model] ?? null
}

function getMetadataCardImageModel(meta: Record<string, unknown> | null): string | null {
  if (!meta) return null

  const images = asRecord(meta.images)
  const card = asRecord(meta.card)
  const settings = asRecord(meta.settings)
  const settingsImages = asRecord(settings?.images)
  const settingsOverride = asRecord(meta.settings_override)
  const settingsOverrideImages = asRecord(settingsOverride?.images)

  return (
    normalizeCardImageModel(meta.card_image_model) ??
    normalizeCardImageModel(images?.card_image_model) ??
    normalizeCardImageModel(images?.model) ??
    normalizeCardImageModel(card?.card_image_model) ??
    normalizeCardImageModel(card?.model) ??
    normalizeCardImageModel(settingsImages?.card_image_model) ??
    normalizeCardImageModel(settingsOverride?.card_image_model) ??
    normalizeCardImageModel(settingsOverrideImages?.card_image_model)
  )
}

function formatCardCost(model: string): string | null {
  const cost = COST_PER_CARD[model]
  if (cost === undefined) return null
  const precision = Number.isInteger(cost * 1000) ? 3 : 4
  return `$${cost.toFixed(precision)} (${model})`
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span>{value || '—'}</span>
    </div>
  )
}

function MetaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-accent/20 rounded-lg p-3 space-y-1">
      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1.5">{title}</p>
      {children}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function formatJsonValue(value: Record<string, unknown> | null): string | null {
  if (!value) return null
  return JSON.stringify(value)
}

function formatUnknownJsonValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return cleanText(value)
  return JSON.stringify(value)
}

function formatBoolean(value: unknown): string | null {
  if (typeof value !== 'boolean') return null
  return value ? 'true' : 'false'
}

function formatNumber(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null
}

function formatOutputPresence(word: WordRecord): string {
  const present = [
    word.thumbnail_url ? 'thumbnail_url' : null,
    word.image_url ? 'image_url' : null,
    word.card_image_url ? 'card_image_url' : null,
    word.video_url ? 'video_url' : null,
  ].filter(Boolean)
  return present.length > 0 ? present.join(', ') : 'none'
}

function formatLayer2EvalSummary(layer2Eval: Record<string, unknown> | null): string | null {
  if (!layer2Eval) return null
  const parts = [
    formatBackendTemplate(layer2Eval.backend_template),
    formatMeaningStrategy(layer2Eval.meaning_strategy),
    formatPresentationForm(layer2Eval.presentation_form),
    formatArtStyle(layer2Eval.art_style),
    formatInfographicTemplate(layer2Eval.infographic_template),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

function formatBackendTemplate(value: unknown): string | null {
  const text = cleanText(value as string | null | undefined)
  if (!text) return null
  if (text === 'structured_plan_v1' || text === 'direct_prompt_v1' || text === 'direct_prompt_v2' || text === 'direct_prompt_v3' || text === 'infographic_prompt_v1') {
    return layer2BackendTemplateLabel(text)
  }
  return text
}

function formatInfographicTemplate(value: unknown): string | null {
  const text = cleanText(value as string | null | undefined)
  if (!text) return null
  const label = infographicTemplateLabel(text)
  return label || text
}

function formatMeaningStrategy(value: unknown): string | null {
  const text = cleanText(value as string | null | undefined)
  if (!text) return null
  if (['clear_meaning', 'exaggerated_meaning', 'absurd_hook', 'sound_mnemonic'].includes(text)) {
    return cardLayer2MeaningLabel(text as CardLayer2MeaningStrategy)
  }
  return text
}

function formatPresentationForm(value: unknown): string | null {
  const text = cleanText(value as string | null | undefined)
  if (!text) return null
  if (['single_scene', 'mini_story', 'split_panel', 'word_object_design', 'infographic_card'].includes(text)) {
    return cardLayer2PresentationLabel(text as CardLayer2PresentationForm)
  }
  return text
}

function formatArtStyle(value: unknown): string | null {
  const text = cleanText(value as string | null | undefined)
  if (!text) return null
  return cardLayer2ArtStyleLabel(text as CardLayer2ArtStyle)
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined) return null
  if (seconds < 60) return `${Math.round(seconds)}s`
  const min = Math.floor(seconds / 60)
  const sec = Math.round(seconds % 60)
  return `${min}m ${sec}s`
}
