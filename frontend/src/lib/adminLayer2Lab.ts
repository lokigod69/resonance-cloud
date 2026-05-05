import type {
  CardLayer2ArtStyle,
  CardLayer2MeaningStrategy,
  CardLayer2PresentationForm,
  ExistingDeck,
  GeneratePayload,
  Layer2EvalPayload,
} from '@/components/generate/useWizardState'

export type Layer2LabWordScope = 'selected' | 'all'

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
  userId: string
  targetLanguage: string
  deckName: string
  existingDeck?: ExistingDeck
}

const SOURCE: Layer2EvalPayload['source'] = 'admin_layer2_lab_v1'

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

export function getLayer2LabPresetRows(id: Layer2LabPreset['id']): Layer2LabRun[] {
  const preset = ADMIN_LAYER2_LAB_PRESETS.find((item) => item.id === id)
  if (!preset) return []
  return preset.rows.map((item, index) => ({
    id: stableId(preset.id, item.word, item.meaning_strategy, item.presentation_form, item.art_style, String(index)),
    ...item,
  }))
}

export function createLayer2LabDeckName(prefix: string, isoDate = new Date().toISOString()): string {
  const cleanPrefix = clean(prefix) || 'Layer2 Lab'
  return `${cleanPrefix} - ${isoDate.slice(0, 10)} ${isoDate.slice(11, 16)}`
}

export function layer2EvalForRow(rowItem: Layer2LabRun): Layer2EvalPayload {
  return {
    label: rowItem.label,
    meaning_strategy: rowItem.meaning_strategy,
    presentation_form: rowItem.presentation_form,
    art_style: rowItem.art_style,
    source: SOURCE,
  }
}

export function buildLayer2LabPayload({
  row: rowItem,
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
        layer2_eval: layer2EvalForRow(rowItem),
      },
    },
  }
}
