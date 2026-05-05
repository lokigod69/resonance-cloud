import type {
  CardLayer2ArtStyle,
  CardLayer2MeaningStrategy,
  CardLayer2PresentationForm,
  ExistingDeck,
  GeneratePayload,
  Layer2EvalPayload,
} from '@/components/generate/useWizardState'

export type Layer2LabWordScope = 'selected' | 'all'
export type Layer2LabDeckMode = 'create' | 'append'

export interface Layer2LabRun {
  id: string
  word: string
  meaning_strategy: CardLayer2MeaningStrategy
  presentation_form: CardLayer2PresentationForm
  art_style: CardLayer2ArtStyle
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
  label: string
}

export interface BuildLayer2LabPayloadInput {
  row: Layer2LabRun
  scriptIndex?: number
  userId: string
  targetLanguage: string
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
    meaning_strategy: meaning,
    presentation_form: presentation,
    art_style: style,
    label: labelText,
  }
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

export function layer2VariantSlugForRow(rowItem: Layer2LabRun, scriptIndex = 1): string {
  const index = Math.max(1, Math.trunc(Number(scriptIndex) || 1))
  const suffix = `-l2-${String(index).padStart(3, '0')}`
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
  return candidates
    .filter(Boolean)
    .map((wordText, index) => ({
      id: stableId(
        wordText,
        input.meaning_strategy,
        input.presentation_form,
        input.art_style,
        label ?? 'unlabeled',
        String(index),
      ),
      word: wordText,
      meaning_strategy: input.meaning_strategy,
      presentation_form: input.presentation_form,
      art_style: input.art_style,
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

export function layer2EvalForRow(rowItem: Layer2LabRun, scriptIndex = 1): Layer2EvalPayload {
  return {
    label: rowItem.label,
    script_index: scriptIndex,
    original_word: rowItem.word,
    variant_slug: layer2VariantSlugForRow(rowItem, scriptIndex),
    meaning_strategy: rowItem.meaning_strategy,
    presentation_form: rowItem.presentation_form,
    art_style: rowItem.art_style,
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
  userId,
  targetLanguage,
  deckName,
  existingDeck,
}: BuildLayer2LabPayloadInput): GeneratePayload {
  const layer2 = {
    meaning_strategy: rowItem.meaning_strategy,
    presentation_form: rowItem.presentation_form,
    visual_intensity: 'balanced' as const,
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
        card_image_style: rowItem.art_style,
        card_layer2: layer2,
        layer2_eval: layer2EvalForRow(rowItem, scriptIndex),
      },
    },
  }
}
