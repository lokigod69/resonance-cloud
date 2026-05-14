import { LANGUAGES } from '@/lib/languages'
import familieBeziehungenJson from './curriculum/en/familie_beziehungen.json'
import zahlenZeitJson from './curriculum/en/zahlen_zeit.json'
import substantiveJson from './curriculum/en/substantive.json'
import adjektiveJson from './curriculum/en/adjektive.json'
import verbenJson from './curriculum/en/verben.json'
import familieBeziehungenEnrichmentJson from './curriculum/enrichment/en/familie_beziehungen.json'
import zahlenZeitEnrichmentJson from './curriculum/enrichment/en/zahlen_zeit.json'
import substantiveEnrichmentJson from './curriculum/enrichment/en/substantive.json'
import adjektiveEnrichmentJson from './curriculum/enrichment/en/adjektive.json'
import verbenEnrichmentJson from './curriculum/enrichment/en/verben.json'

export interface CurriculumEntry {
  term: string
  pos: string
  glosses: Record<string, string>
  value?: number
  ipa?: string
  mnemonic?: string
  etymology?: string
  usage_examples?: string[]
  examples?: string[]
  image_url?: string
  imageUrl?: string
}

export interface CurriculumLevel {
  level: number
  theme_slug: string
  theme_display: Record<string, string>
  entry_count: number
  description?: Record<string, string> | string
  entries: CurriculumEntry[]
}

export interface CurriculumCategoryJson {
  schema_version: string
  target_language: string
  category_slug: string
  category_display: Record<string, string>
  icon: string
  column: string
  cap_total_entries: number
  max_levels: number
  description_short?: Record<string, string> | string
  description?: Record<string, string> | string
  levels: CurriculumLevel[]
}

export interface CurriculumPerSourceEnrichment {
  mnemonic?: string
  example_gloss?: string
  false_friends?: Array<{
    source_term?: string
    note?: string
  }>
  common_mistake?: string
}

export interface CurriculumEnrichmentEntry {
  term: string
  pos: string
  ipa?: string
  etymology?: string
  register?: string
  frequency_band?: string
  difficulty?: number
  topic?: string
  synonyms?: string[]
  collocations?: string[]
  tags?: string[]
  example?: string
  prerequisites?: string[]
  plural?: string | null
  plural_genitive?: string | null
  gender?: string | null
  article?: string | null
  countable?: boolean
  conjugation?: Record<string, string | null>
  is_irregular?: boolean
  case_pattern?: string | null
  comparative?: string | null
  superlative?: string | null
  antonym?: string | null
  value?: number
  ordinal_form?: string
  per_source: Record<string, CurriculumPerSourceEnrichment | undefined>
}

export interface CurriculumEnrichmentLevel {
  level: number
  theme_slug: string
  entries: CurriculumEnrichmentEntry[]
}

export interface CurriculumEnrichmentJson {
  schema_version: string
  target_language: string
  category_slug: string
  source_languages_filled: string[]
  generator_model: string
  generated_at: string
  generator_version: string
  levels: CurriculumEnrichmentLevel[]
}

export interface CurriculumCategory {
  slug: string
  title: string
  icon: string
  description: string
  levelCount: number
  totalEntries: number
  data: CurriculumCategoryJson
  levels: CurriculumLevel[]
}

const VENDORED_CURRICULUM = [
  familieBeziehungenJson,
  zahlenZeitJson,
  substantiveJson,
  adjektiveJson,
  verbenJson,
] as CurriculumCategoryJson[]

const VENDORED_ENRICHMENT = [
  familieBeziehungenEnrichmentJson,
  zahlenZeitEnrichmentJson,
  substantiveEnrichmentJson,
  adjektiveEnrichmentJson,
  verbenEnrichmentJson,
] as CurriculumEnrichmentJson[]

// JSON files are vendored copies from D:\CODING\ResonanceTEST\curriculum\content\en\.
// Keep this list flat; Generate's CATEGORY_GROUPS taxonomy is intentionally separate.
const CURRICULUM_CATEGORIES: CurriculumCategory[] = VENDORED_CURRICULUM.map((data) => {
  const totalEntries = data.levels.reduce((sum, level) => sum + level.entries.length, 0)
  const title = data.category_display.de ?? data.category_display.en ?? data.category_slug
  const description = localizedText(data.description_short ?? data.description, 'de') ?? title

  return {
    slug: data.category_slug,
    title,
    icon: data.icon,
    description,
    levelCount: data.levels.length,
    totalEntries,
    data,
    levels: data.levels,
  }
})

export function listCurriculumCategories(): CurriculumCategory[] {
  return CURRICULUM_CATEGORIES
}

export function getCurriculumCategoryBySlug(slug: string | undefined): CurriculumCategory | null {
  if (!slug) return null
  return CURRICULUM_CATEGORIES.find((category) => category.slug === slug) ?? null
}

export function getCurriculumLevel(
  categorySlug: string | undefined,
  levelNumber: string | undefined,
): CurriculumLevel | null {
  const category = getCurriculumCategoryBySlug(categorySlug)
  if (!category || !levelNumber) return null

  if (!/^[1-9]\d*$/.test(levelNumber)) return null
  const parsed = Number(levelNumber)

  return category.levels.find((level) => level.level === parsed) ?? null
}

export function getCurriculumEnrichmentBySlug(slug: string | undefined): CurriculumEnrichmentJson | null {
  if (!slug) return null
  return VENDORED_ENRICHMENT.find((category) => category.category_slug === slug) ?? null
}

export function getCurriculumGloss(entry: CurriculumEntry, baseLanguageIso: string): string {
  return (
    entry.glosses[baseLanguageIso] ??
    entry.glosses.en ??
    entry.glosses.de ??
    Object.values(entry.glosses)[0] ??
    ''
  )
}

export function profileBaseLanguageToIso(baseLanguage: string | null | undefined): string {
  if (!baseLanguage) return 'de'
  const normalized = baseLanguage.toLowerCase()
  const directIso = LANGUAGES.find((language) => language.code.toLowerCase() === normalized)
  if (directIso) return directIso.code

  return LANGUAGES.find((language) => language.value === baseLanguage)?.code ?? 'de'
}

export function getLevelTitle(level: CurriculumLevel): string {
  return level.theme_display.de ?? level.theme_display.en ?? `Level ${level.level}`
}

export function getLevelDescription(level: CurriculumLevel): string | null {
  return localizedText(level.description, 'de')
}

function localizedText(value: Record<string, string> | string | undefined, preferredIso: string): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  return value[preferredIso] ?? value.en ?? Object.values(value)[0] ?? null
}
