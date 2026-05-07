import type {
  CardLayer2ArtStyle,
  CardLayer2BackendTemplate,
  CardLayer2MeaningStrategy,
  CardLayer2PresentationForm,
  ExistingDeck,
  GeneratePayload,
  InfographicTemplate,
  Layer2EvalPayload,
  PremiumQuickMode,
} from '@/components/generate/useWizardState'
import {
  PREMIUM_QUICK_MODE_OPTIONS,
  premiumQuickModeLabel,
  resolvePremiumQuickMode,
} from '@/components/generate/useWizardState'

export type Layer2LabWordScope = 'selected' | 'all'
export type Layer2LabDeckMode = 'create' | 'append'
export type Layer2LabQuickModePreset = PremiumQuickMode | 'custom'

export interface Layer2LabRun {
  id: string
  word: string
  quick_mode_preset?: Layer2LabQuickModePreset
  meaning_strategy: CardLayer2MeaningStrategy
  presentation_form: CardLayer2PresentationForm
  art_style: CardLayer2ArtStyle
  backend_template: CardLayer2BackendTemplate
  infographic_template?: InfographicTemplate
  label: string | null
}

export interface Layer2LabPreset {
  id: 'word_design_smoke' | 'style_obedience_smoke' | 'story_form_smoke'
  label: string
  rows: Array<Omit<Layer2LabRun, 'id'>>
}

export interface BuildLayer2LabRowsInput {
  words: string[]
  selectedWord: string | null
  wordScope: Layer2LabWordScope
  meaning_strategy: CardLayer2MeaningStrategy
  presentation_form: CardLayer2PresentationForm
  art_style: CardLayer2ArtStyle
  backend_template: CardLayer2BackendTemplate
  infographic_template?: InfographicTemplate
  quick_mode_preset?: Layer2LabQuickModePreset
  label: string
}

export interface BuildLayer2LabPayloadInput {
  row: Layer2LabRun
  scriptIndex?: number
  labRunId?: string
  userId: string
  targetLanguage: string
  baseLanguage?: string
  deckName: string
  existingDeck?: ExistingDeck
}

export interface Layer2LabFailedRow {
  scriptIndex: number
  word: string
  label: string | null
  reason: string
}

export interface Layer2LabResultSummary {
  deckId: string | null
  deckName: string
  totalRows: number
  submittedRows: number
  failedRows: Layer2LabFailedRow[]
}

const SOURCE: Layer2EvalPayload['source'] = 'admin_layer2_lab_v1'
export const DEFAULT_LAYER2_BACKEND_TEMPLATE: CardLayer2BackendTemplate = 'structured_plan_v1'
export const INFOGRAPHIC_BACKEND_TEMPLATE: CardLayer2BackendTemplate = 'infographic_prompt_v1'
export const DEFAULT_INFOGRAPHIC_TEMPLATE: InfographicTemplate = 'infographic_knowledge_guide_v1'
export const LAYER2_BACKEND_TEMPLATE_OPTIONS: Array<{
  value: CardLayer2BackendTemplate
  label: string
}> = [
  { value: 'structured_plan_v1', label: 'Compiler V1' },
  { value: 'direct_prompt_v1', label: 'LLM V1' },
  { value: 'direct_prompt_v2', label: 'LLM V2' },
  { value: 'direct_prompt_v3', label: 'LLM V3 · Visual Craft' },
]
export const INFOGRAPHIC_TEMPLATE_OPTIONS: Array<{
  value: InfographicTemplate
  label: string
  version: 'V1' | 'V2' | 'V3' | 'V4'
}> = [
  { value: 'infographic_knowledge_guide_v1', label: 'V1 · Knowledge Guide', version: 'V1' },
  { value: 'infographic_language_atlas_v1', label: 'V1 · Language Atlas', version: 'V1' },
  { value: 'infographic_study_poster_v1', label: 'V1 · Study Poster', version: 'V1' },
  { value: 'infographic_visual_dictionary_v1', label: 'V1 · Visual Dictionary', version: 'V1' },
  { value: 'infographic_museum_exhibit_v1', label: 'V1 · Museum Exhibit', version: 'V1' },
  { value: 'infographic_knowledge_guide_v2', label: 'V2 · Knowledge Guide', version: 'V2' },
  { value: 'infographic_language_atlas_v2', label: 'V2 · Language Atlas', version: 'V2' },
  { value: 'infographic_study_poster_v2', label: 'V2 · Study Poster', version: 'V2' },
  { value: 'infographic_visual_dictionary_v2', label: 'V2 · Visual Dictionary', version: 'V2' },
  { value: 'infographic_museum_exhibit_v2', label: 'V2 · Museum Exhibit', version: 'V2' },
  { value: 'infographic_language_atlas_v3_reference', label: 'V3 · Language Atlas Reference', version: 'V3' },
  { value: 'infographic_study_knowledge_v3_reference', label: 'V3 · Study / Knowledge Reference', version: 'V3' },
  { value: 'infographic_museum_exhibit_v3_reference', label: 'V3 · Museum Exhibit Reference', version: 'V3' },
  { value: 'infographic_dense_editorial_v4', label: 'V4 · Dense Editorial', version: 'V4' },
]

export const LAYER2_QUICK_MODE_PRESET_OPTIONS: Array<{
  value: Layer2LabQuickModePreset
  label: string
}> = [
  { value: 'custom', label: 'Custom / Raw controls' },
  ...PREMIUM_QUICK_MODE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
]
export const LAYER2_LAB_CREDITS_PER_ROW = 5
const WORD_DESIGN_STYLES: CardLayer2ArtStyle[] = ['realistic', 'pixar_3d', 'rick_and_morty_style', 'pen_and_ink']
const STYLE_OBEDIENCE_STYLES: CardLayer2ArtStyle[] = [
  'rick_and_morty_style',
  'south_park_style',
  'pixar_3d',
  'pen_and_ink',
  'surrealism',
]
const STORY_FORM_TRIPLES: Array<{
  meaning_strategy: CardLayer2MeaningStrategy
  presentation_form: CardLayer2PresentationForm
  art_style: CardLayer2ArtStyle
}> = [
  { meaning_strategy: 'absurd_hook', presentation_form: 'mini_story', art_style: 'surrealism' },
  { meaning_strategy: 'sound_mnemonic', presentation_form: 'split_panel', art_style: 'illustration' },
  { meaning_strategy: 'exaggerated_meaning', presentation_form: 'single_scene', art_style: 'cinematic' },
]

export function layer2BackendTemplateLabel(value: CardLayer2BackendTemplate | string | null | undefined): string {
  if (value === INFOGRAPHIC_BACKEND_TEMPLATE) return 'Infographic Prompt V1'
  return LAYER2_BACKEND_TEMPLATE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? ''
}

export function infographicTemplateLabel(value: InfographicTemplate | string | null | undefined): string {
  return INFOGRAPHIC_TEMPLATE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? ''
}

export function layer2QuickModePresetLabel(value: Layer2LabQuickModePreset | string | null | undefined): string {
  return value === 'custom' ? 'Custom' : premiumQuickModeLabel(value)
}

export function resolveLayer2LabQuickModePreset(
  value: Layer2LabQuickModePreset,
): Pick<Layer2LabRun, 'meaning_strategy' | 'presentation_form'> | null {
  if (value === 'custom') return null
  const resolved = resolvePremiumQuickMode(value, null)
  return {
    meaning_strategy: resolved.card_layer2.meaning_strategy,
    presentation_form: resolved.card_layer2.presentation_form,
  }
}

export const ADMIN_LAYER2_LAB_PRESETS: Layer2LabPreset[] = [
  {
    id: 'word_design_smoke',
    label: 'Word Design Smoke',
    rows: [
      row('pride', 'clear_meaning', 'word_object_design', 'realistic', 'word design smoke'),
      row('remorse', 'clear_meaning', 'word_object_design', 'pixar_3d', 'word design smoke'),
      row('flowers', 'clear_meaning', 'word_object_design', 'realistic', 'word design smoke'),
      row('prejudice', 'clear_meaning', 'word_object_design', 'rick_and_morty_style', 'word design smoke'),
    ],
  },
  {
    id: 'style_obedience_smoke',
    label: 'Style Obedience Smoke',
    rows: [
      row('prejudice', 'clear_meaning', 'single_scene', 'rick_and_morty_style', 'style obedience smoke'),
      row('pride', 'clear_meaning', 'single_scene', 'south_park_style', 'style obedience smoke'),
      row('remorse', 'clear_meaning', 'single_scene', 'pixar_3d', 'style obedience smoke'),
      row('viral', 'clear_meaning', 'single_scene', 'pen_and_ink', 'style obedience smoke'),
    ],
  },
  {
    id: 'story_form_smoke',
    label: 'Story Form Smoke',
    rows: [
      row('viral', 'absurd_hook', 'mini_story', 'surrealism', 'story form smoke'),
      row('shipwreck', 'sound_mnemonic', 'split_panel', 'illustration', 'story form smoke'),
      row('fragrance', 'exaggerated_meaning', 'single_scene', 'cinematic', 'story form smoke'),
    ],
  },
]

function row(
  wordText: string,
  meaning: CardLayer2MeaningStrategy,
  presentation: CardLayer2PresentationForm,
  style: CardLayer2ArtStyle,
  labelText: string,
): Omit<Layer2LabRun, 'id'> {
  return {
    word: wordText,
    quick_mode_preset: 'custom',
    meaning_strategy: meaning,
    presentation_form: presentation,
    art_style: style,
    backend_template: DEFAULT_LAYER2_BACKEND_TEMPLATE,
    infographic_template: DEFAULT_INFOGRAPHIC_TEMPLATE,
    label: labelText,
  }
}

function isInfographicRow(rowItem: Pick<Layer2LabRun, 'quick_mode_preset' | 'presentation_form' | 'backend_template'>): boolean {
  return rowItem.quick_mode_preset === 'infographic' || rowItem.backend_template === INFOGRAPHIC_BACKEND_TEMPLATE
}

function clean(value: string | null | undefined): string {
  return String(value ?? '').trim()
}

function stableId(...parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugifyVariantPart(value: string, maxLength = 50): string {
  const slug = clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return (slug || 'word').slice(0, maxLength).replace(/-+$/g, '') || 'word'
}

function normalizeLabRunId(value: string | null | undefined): string | null {
  const slug = slugifyVariantPart(value ?? '', 12)
  return slug === 'word' ? null : slug
}

export function createLayer2LabRunId(seed?: string): string {
  const randomValue = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36)}`
  const raw = seed ?? randomValue.replace(/-/g, '')
  return normalizeLabRunId(raw) ?? 'run'
}

export function layer2VariantSlugForRow(
  rowItem: Layer2LabRun,
  scriptIndex = 1,
  labRunId?: string | null,
): string {
  const index = Math.max(1, Math.trunc(Number(scriptIndex) || 1))
  const runId = normalizeLabRunId(labRunId)
  const suffix = runId
    ? `-l2-${runId}-${String(index).padStart(3, '0')}`
    : `-l2-${String(index).padStart(3, '0')}`
  const base = slugifyVariantPart(rowItem.word, 50 - suffix.length)
  return `${base}${suffix}`
}

export function normalizeLayer2LabWords(input: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  for (const raw of input.split(/[\n,]+/)) {
    const wordText = clean(raw).replace(/\s+/g, ' ')
    const key = wordText.toLowerCase()
    if (!wordText || seen.has(key)) continue
    seen.add(key)
    words.push(wordText)
  }
  return words
}

export function buildLayer2LabRows(input: BuildLayer2LabRowsInput): Layer2LabRun[] {
  const candidates = input.wordScope === 'selected'
    ? [clean(input.selectedWord)]
    : input.words.map(clean)
  const label = clean(input.label) || null
  const isInfographic = input.quick_mode_preset === 'infographic'
  const presentationForm = isInfographic ? 'infographic_card' : input.presentation_form
  const backendTemplate = isInfographic ? INFOGRAPHIC_BACKEND_TEMPLATE : input.backend_template
  const infographicTemplate = input.infographic_template ?? DEFAULT_INFOGRAPHIC_TEMPLATE
  return candidates
    .filter(Boolean)
    .map((wordText, index) => ({
      id: stableId(
        wordText,
        input.meaning_strategy,
        presentationForm,
        input.art_style,
        backendTemplate,
        isInfographic ? infographicTemplate : '',
        label ?? 'unlabeled',
        String(index),
      ),
      word: wordText,
      quick_mode_preset: input.quick_mode_preset ?? 'custom',
      meaning_strategy: input.meaning_strategy,
      presentation_form: presentationForm,
      art_style: input.art_style,
      backend_template: backendTemplate,
      infographic_template: isInfographic ? infographicTemplate : input.infographic_template,
      label,
    }))
}

export function getLayer2LabPresetRows(id: Layer2LabPreset['id'], currentWords: string[] = []): Layer2LabRun[] {
  const preset = ADMIN_LAYER2_LAB_PRESETS.find((item) => item.id === id)
  if (!preset) return []
  const normalizedWords = normalizeLayer2LabWords(currentWords.join('\n'))
  const rows = normalizedWords.length > 0
    ? buildPresetRowsFromWords(id, normalizedWords)
    : preset.rows
  return rows.map((item, index) => ({
    id: stableId(preset.id, item.word, item.meaning_strategy, item.presentation_form, item.art_style, String(index)),
    ...item,
  }))
}

function buildPresetRowsFromWords(
  id: Layer2LabPreset['id'],
  currentWords: string[],
): Array<Omit<Layer2LabRun, 'id'>> {
  return currentWords.map((wordText, index) => {
    if (id === 'word_design_smoke') {
      return row(
        wordText,
        'clear_meaning',
        'word_object_design',
        WORD_DESIGN_STYLES[index % WORD_DESIGN_STYLES.length],
        'word design smoke',
      )
    }
    if (id === 'style_obedience_smoke') {
      return row(
        wordText,
        'clear_meaning',
        'single_scene',
        STYLE_OBEDIENCE_STYLES[index % STYLE_OBEDIENCE_STYLES.length],
        'style obedience smoke',
      )
    }
    const triple = STORY_FORM_TRIPLES[index % STORY_FORM_TRIPLES.length]
    return row(wordText, triple.meaning_strategy, triple.presentation_form, triple.art_style, 'story form smoke')
  })
}

export function createLayer2LabDeckName(prefix: string, isoDate = new Date().toISOString()): string {
  const cleanPrefix = clean(prefix) || 'Layer2 Lab'
  return `${cleanPrefix} - ${isoDate.slice(0, 10)} ${isoDate.slice(11, 16)}`
}

export function estimateLayer2LabCreditCost(rowCount: number): number {
  return Math.max(0, rowCount) * LAYER2_LAB_CREDITS_PER_ROW
}

export function layer2EvalForRow(
  rowItem: Layer2LabRun,
  scriptIndex = 1,
  labRunId?: string | null,
): Layer2EvalPayload {
  const runId = normalizeLabRunId(labRunId)
  const isInfographic = isInfographicRow(rowItem)
  return {
    label: rowItem.label,
    script_index: scriptIndex,
    ...(runId ? { lab_run_id: runId } : {}),
    original_word: rowItem.word,
    variant_slug: layer2VariantSlugForRow(rowItem, scriptIndex, runId),
    quick_mode_preset: rowItem.quick_mode_preset ?? 'custom',
    ...(isInfographic ? {} : { meaning_strategy: rowItem.meaning_strategy }),
    presentation_form: rowItem.presentation_form,
    ...(isInfographic ? {} : { art_style: rowItem.art_style }),
    backend_template: isInfographic ? INFOGRAPHIC_BACKEND_TEMPLATE : rowItem.backend_template ?? DEFAULT_LAYER2_BACKEND_TEMPLATE,
    ...(isInfographic
      ? {
          infographic_template: rowItem.infographic_template ?? DEFAULT_INFOGRAPHIC_TEMPLATE,
          infographic_template_label: infographicTemplateLabel(rowItem.infographic_template ?? DEFAULT_INFOGRAPHIC_TEMPLATE),
        }
      : {}),
    source: SOURCE,
  }
}

export function createLayer2LabResultSummary(summary: Layer2LabResultSummary): Layer2LabResultSummary {
  return {
    ...summary,
    failedRows: summary.failedRows.map((failure) => ({
      ...failure,
      reason: clean(failure.reason) || 'Unknown error',
    })),
  }
}

export function isLayer2LabAppendDeck(deck: ExistingDeck | null | undefined): deck is ExistingDeck {
  return Boolean(deck && deck.deck_type === 'card')
}

export function validateLayer2LabSubmit({
  mode,
  rowCount,
  existingDeck,
}: {
  mode: Layer2LabDeckMode
  rowCount: number
  existingDeck: ExistingDeck | null | undefined
}): string | null {
  if (rowCount <= 0) return 'Add at least one script row before creating an evaluation deck.'
  if (mode === 'append' && !existingDeck) return 'Select a card deck before appending lab rows.'
  if (mode === 'append' && !isLayer2LabAppendDeck(existingDeck)) return 'Layer 2 Lab can only append to card decks.'
  return null
}

export function buildLayer2LabPayload({
  row: rowItem,
  scriptIndex = 1,
  labRunId,
  userId,
  targetLanguage,
  baseLanguage,
  deckName,
  existingDeck,
}: BuildLayer2LabPayloadInput): GeneratePayload {
  const isInfographic = isInfographicRow(rowItem)
  const backendTemplate = isInfographic ? INFOGRAPHIC_BACKEND_TEMPLATE : rowItem.backend_template ?? DEFAULT_LAYER2_BACKEND_TEMPLATE
  const layer2 = {
    meaning_strategy: rowItem.meaning_strategy,
    presentation_form: isInfographic ? 'infographic_card' as const : rowItem.presentation_form,
    visual_intensity: 'balanced' as const,
    backend_template: backendTemplate,
    ...(isInfographic ? { infographic_template: rowItem.infographic_template ?? DEFAULT_INFOGRAPHIC_TEMPLATE } : {}),
    ...(rowItem.quick_mode_preset && rowItem.quick_mode_preset !== 'custom'
      ? { premium_quick_mode: rowItem.quick_mode_preset }
      : {}),
  }

  return {
    deckPayload: existingDeck
      ? null
      : {
          user_id: userId,
          name: deckName,
          target_language: targetLanguage,
          art_style: null,
          movie_override: null,
          word_count: 1,
          status: 'generating',
          deck_type: 'card',
        },
    wordList: [rowItem.word],
    jobPayload: {
      user_id: userId,
      ...(existingDeck ? { deck_id: existingDeck.id } : {}),
      status: 'pending',
      target_language: existingDeck?.target_language ?? targetLanguage,
      art_style: null,
      movie_override: null,
      words_total: 1,
      settings_override: {
        card_image_model: 'gpt_image_2',
        card_image_style: isInfographic ? 'editorial' : rowItem.art_style,
        card_layer2: layer2,
        layer2_eval: layer2EvalForRow(rowItem, scriptIndex, labRunId),
        ...(rowItem.quick_mode_preset && rowItem.quick_mode_preset !== 'custom'
          ? { premium_quick_mode: rowItem.quick_mode_preset }
          : {}),
        ...(baseLanguage ? { base_language: baseLanguage } : {}),
      },
    },
  }
}
