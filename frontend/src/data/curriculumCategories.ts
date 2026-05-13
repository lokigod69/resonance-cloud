import { LANGUAGES } from '@/lib/languages'
import familieBeziehungenJson from './curriculum/en/familie_beziehungen.json'
import zahlenZeitJson from './curriculum/en/zahlen_zeit.json'
import substantiveJson from './curriculum/en/substantive.json'
import adjektiveJson from './curriculum/en/adjektive.json'
import verbenJson from './curriculum/en/verben.json'

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
  if (!baseLanguage) return 'en'
  const normalized = baseLanguage.toLowerCase()
  const directIso = LANGUAGES.find((language) => language.code.toLowerCase() === normalized)
  if (directIso) return directIso.code

  return LANGUAGES.find((language) => language.value === baseLanguage)?.code ?? 'en'
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
