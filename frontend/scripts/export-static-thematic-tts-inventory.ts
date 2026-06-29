import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import {
  STATIC_CATEGORY_TRANSLATION_LANGUAGES,
  getPublicCategoryGroups,
  getStaticCategoryVocabularyItems,
  type StaticCategoryTargetLanguageCode,
} from '../src/data/categories.ts'

export type StaticThematicTtsInventoryItem = {
  target_language_code: StaticCategoryTargetLanguageCode
  category_slug: string
  level_number: number
  order: number
  concept_id: string
  english_qa_label: string
  target_term: string
  spoken_text: string
  part_of_speech: string
  sense: string
  helper_translations: Record<string, string>
  image_hint: {
    language_iso: 'en'
    category_slug: string
    term: string
  }
}

const SUPPORTED_STATIC_TTS_TARGET_LANGUAGES = new Set<StaticCategoryTargetLanguageCode>(['en', 'ceb'])
const CEBUANO_ALIASES = new Set(['ceb', 'cebuano', 'bisaya', 'sebuano'])

function normalizeLanguageName(value: string): string {
  return value.trim().normalize('NFC').toLowerCase()
}

function normalizeTerm(value: string): string {
  return value.trim().normalize('NFC').toLowerCase()
}

function resolveStaticTtsTargetLanguageCode(targetLanguage: string): StaticCategoryTargetLanguageCode {
  const normalized = normalizeLanguageName(targetLanguage)
  const match = STATIC_CATEGORY_TRANSLATION_LANGUAGES.find((entry) => (
    entry.code === normalized
    || normalizeLanguageName(entry.value) === normalized
    || normalizeLanguageName(entry.label) === normalized
    || normalizeLanguageName(entry.name) === normalized
    || normalizeLanguageName(entry.nativeName) === normalized
    || (entry.code === 'ceb' && CEBUANO_ALIASES.has(normalized))
  ))

  if (!match) {
    throw new Error(`Unsupported target language for static thematic TTS export: ${targetLanguage}`)
  }
  if (!SUPPORTED_STATIC_TTS_TARGET_LANGUAGES.has(match.code)) {
    throw new Error('Only English and Cebuano/Bisaya static thematic TTS export is supported in this pilot.')
  }
  return match.code
}

export function buildStaticThematicTtsInventory({
  targetLanguage,
  category,
  level,
  allLevels = false,
}: {
  targetLanguage: string
  category: string
  level?: number
  allLevels?: boolean
}): StaticThematicTtsInventoryItem[] {
  const targetLanguageCode = resolveStaticTtsTargetLanguageCode(targetLanguage)
  if (category !== 'animals') {
    throw new Error('Only the Animals category is supported in this pilot.')
  }
  if (!allLevels && (!Number.isInteger(level) || Number(level) < 1)) {
    throw new Error('Pass --level <number> or --all-levels.')
  }

  const staticCategory = getPublicCategoryGroups()
    .flatMap((group) => group.categories)
    .find((item) => item.id === category)
  if (!staticCategory?.staticWordLevels?.length) {
    throw new Error(`Unsupported static category: ${category}`)
  }

  const sourceItems = getStaticCategoryVocabularyItems(
    staticCategory,
    allLevels ? undefined : level,
  )

  const items = sourceItems.map((item): StaticThematicTtsInventoryItem => {
    const englishQaLabel = item.translations.en.term.trim()
    const targetTranslation = item.translations[targetLanguageCode]
    if (!targetTranslation || targetTranslation.isFallback) {
      throw new Error(`Inventory item ${item.id} is missing ${targetLanguageCode} target_term.`)
    }
    const targetTerm = targetTranslation.term.trim()
    const spokenText = targetTerm
    if (targetLanguageCode !== 'en' && normalizeTerm(spokenText) === normalizeTerm(englishQaLabel)) {
      throw new Error(`Inventory item ${item.id} has English spoken_text for ${targetLanguageCode}: ${spokenText}`)
    }
    return {
      target_language_code: targetLanguageCode,
      category_slug: item.categoryId,
      level_number: item.level,
      order: item.order,
      concept_id: item.id,
      english_qa_label: englishQaLabel,
      target_term: targetTerm,
      spoken_text: spokenText,
      part_of_speech: item.part_of_speech,
      sense: item.sense,
      helper_translations: Object.fromEntries(
        Object.entries(item.translations)
          .filter(([code]) => code !== 'en')
          .map(([code, translation]) => [code, translation.term]),
      ),
      image_hint: {
        language_iso: 'en',
        category_slug: item.categoryId,
        term: englishQaLabel,
      },
    }
  })

  if (!allLevels && category === 'animals' && level === 1 && items.length !== 10) {
    throw new Error(`Animals Level 1 static TTS inventory expected 10 items; found ${items.length}.`)
  }
  validateInventory(items)
  return items
}

export function validateInventory(items: StaticThematicTtsInventoryItem[]): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (!item.concept_id?.trim()) throw new Error('Inventory item is missing concept_id.')
    if (!item.target_term?.trim()) throw new Error(`Inventory item ${item.concept_id} is missing target_term.`)
    if (!item.spoken_text?.trim()) throw new Error(`Inventory item ${item.concept_id} is missing spoken_text.`)
    if (
      item.target_language_code !== 'en'
      && item.english_qa_label
      && normalizeTerm(item.spoken_text) === normalizeTerm(item.english_qa_label)
    ) {
      throw new Error(`Inventory item ${item.concept_id} has English spoken_text for ${item.target_language_code}.`)
    }
    if (seen.has(item.concept_id)) throw new Error(`Duplicate concept_id in export: ${item.concept_id}`)
    seen.add(item.concept_id)
  }
}

export function writeStaticThematicTtsInventory(items: StaticThematicTtsInventoryItem[], outPath?: string): string {
  validateInventory(items)
  const payload = `${JSON.stringify(items, null, 2)}\n`
  if (!outPath) return payload
  const absolute = resolve(process.cwd(), outPath)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, payload, 'utf8')
  return payload
}

function main() {
  const { values } = parseArgs({
    options: {
      'target-language': { type: 'string', default: 'en' },
      category: { type: 'string', default: 'animals' },
      level: { type: 'string' },
      'all-levels': { type: 'boolean', default: false },
      out: { type: 'string' },
    },
  })

  const level = values.level ? Number(values.level) : undefined
  const items = buildStaticThematicTtsInventory({
    targetLanguage: values['target-language'] ?? 'en',
    category: values.category ?? 'animals',
    level,
    allLevels: Boolean(values['all-levels']),
  })
  const payload = writeStaticThematicTtsInventory(items, values.out)
  if (!values.out) process.stdout.write(payload)
  else process.stdout.write(`Wrote ${items.length} static TTS inventory items to ${values.out}\n`)
}

const argv1 = process.argv[1] ?? ''
if (argv1.endsWith('export-static-thematic-tts-inventory.ts') || argv1.endsWith('export-static-thematic-tts-inventory.js')) {
  main()
}
