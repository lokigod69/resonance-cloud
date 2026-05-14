import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getCurriculumEnrichmentBySlug,
  type CurriculumCategory,
  type CurriculumEnrichmentEntry,
  type CurriculumEnrichmentLevel,
  type CurriculumEntry,
  type CurriculumLevel,
  type CurriculumPerSourceEnrichment,
} from '@/data/curriculumCategories'
import { curriculumEntryImagePath, normalizeCurriculumTerm } from '@/lib/curriculumImagePath'
import { isoToWizardValue } from '@/lib/languages'

// Pre-rendered pilot entry assets currently in public/curriculum/categories.
// When more pilot assets land, expand this set. Terms not in the set get a
// null thumbnail_url at import time and fall through to the existing
// placeholder behavior on Canvas, DeckView, and the modal surfaces.
const KNOWN_CURRICULUM_ENTRY_IMAGES: ReadonlySet<string> = new Set([
  'en/familie_beziehungen/father',
  'en/familie_beziehungen/mother',
  'en/familie_beziehungen/brother',
  'en/familie_beziehungen/sister',
  'en/familie_beziehungen/son',
  'en/familie_beziehungen/daughter',
])

export interface ImportedCurriculumDeckRow {
  id: string
  curriculum_category_slug: string | null
  curriculum_level: number | null
}

export interface CurriculumImportEntryPayload {
  term: string
  translation: string
  pos?: string | null
  article?: string | null
  ipa?: string | null
  mnemonic?: string | null
  etymology?: string | null
  example?: string | null
  example_gloss?: string | null
  synonyms?: string
  tags?: string
  thumbnail_url?: string | null
  metadata?: Record<string, unknown>
}

function pickGloss(entry: CurriculumEntry, baseLanguageIso: string): string {
  return (
    entry.glosses[baseLanguageIso]
    ?? entry.glosses.en
    ?? entry.glosses.de
    ?? Object.values(entry.glosses)[0]
    ?? ''
  )
}

function pickPerSource(
  enrichment: CurriculumEnrichmentEntry | undefined,
  baseLanguageIso: string,
): CurriculumPerSourceEnrichment | undefined {
  if (!enrichment) return undefined
  return enrichment.per_source?.[baseLanguageIso] ?? enrichment.per_source?.de
}

function joinArray(values: string[] | undefined): string {
  if (!values || values.length === 0) return ''
  return values.map((value) => value.trim()).filter(Boolean).join(', ')
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function curriculumImagePathIfKnown(
  languageIso: string,
  categorySlug: string,
  term: string,
): string | null {
  const normalized = normalizeCurriculumTerm(term)
  const key = `${languageIso}/${categorySlug}/${normalized}`
  if (!KNOWN_CURRICULUM_ENTRY_IMAGES.has(key)) return null
  return curriculumEntryImagePath(languageIso, categorySlug, term)
}

function buildEntryMetadata(
  enrichment: CurriculumEnrichmentEntry | undefined,
  perSource: CurriculumPerSourceEnrichment | undefined,
  categorySlug: string,
  levelNumber: number,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    category_slug: categorySlug,
    level: levelNumber,
  }

  if (!enrichment) return metadata

  if (typeof enrichment.register === 'string' && enrichment.register.trim().length > 0) {
    metadata.register = enrichment.register
  }
  if (typeof enrichment.frequency_band === 'string' && enrichment.frequency_band.trim().length > 0) {
    metadata.frequency_band = enrichment.frequency_band
  }
  if (typeof enrichment.difficulty === 'number') {
    metadata.difficulty = enrichment.difficulty
  }
  if (typeof enrichment.topic === 'string' && enrichment.topic.trim().length > 0) {
    metadata.topic = enrichment.topic
  }
  if (Array.isArray(enrichment.collocations) && enrichment.collocations.length > 0) {
    metadata.collocations = enrichment.collocations
  }
  if (Array.isArray(enrichment.prerequisites) && enrichment.prerequisites.length > 0) {
    metadata.prerequisites = enrichment.prerequisites
  }

  // POS-specific overflow with no top-level words column.
  if (enrichment.pos === 'noun') {
    const noun: Record<string, unknown> = {}
    if (enrichment.plural !== undefined && enrichment.plural !== null) noun.plural = enrichment.plural
    if (enrichment.plural_genitive !== undefined && enrichment.plural_genitive !== null) {
      noun.plural_genitive = enrichment.plural_genitive
    }
    if (enrichment.gender !== undefined && enrichment.gender !== null) noun.gender = enrichment.gender
    if (typeof enrichment.countable === 'boolean') noun.countable = enrichment.countable
    if (Object.keys(noun).length > 0) metadata.noun = noun
  }
  if (enrichment.pos === 'verb') {
    const verb: Record<string, unknown> = {}
    if (enrichment.conjugation && Object.keys(enrichment.conjugation).length > 0) {
      verb.conjugation = enrichment.conjugation
    }
    if (typeof enrichment.is_irregular === 'boolean') verb.is_irregular = enrichment.is_irregular
    if (enrichment.case_pattern !== undefined && enrichment.case_pattern !== null) {
      verb.case_pattern = enrichment.case_pattern
    }
    if (Object.keys(verb).length > 0) metadata.verb = verb
  }
  if (enrichment.pos === 'adjective') {
    const adjective: Record<string, unknown> = {}
    if (enrichment.comparative !== undefined && enrichment.comparative !== null) {
      adjective.comparative = enrichment.comparative
    }
    if (enrichment.superlative !== undefined && enrichment.superlative !== null) {
      adjective.superlative = enrichment.superlative
    }
    if (enrichment.antonym !== undefined && enrichment.antonym !== null) {
      adjective.antonym = enrichment.antonym
    }
    if (Object.keys(adjective).length > 0) metadata.adjective = adjective
  }
  if (enrichment.pos === 'number') {
    const number: Record<string, unknown> = {}
    if (typeof enrichment.value === 'number') number.value = enrichment.value
    if (typeof enrichment.ordinal_form === 'string' && enrichment.ordinal_form.trim().length > 0) {
      number.ordinal_form = enrichment.ordinal_form
    }
    if (Object.keys(number).length > 0) metadata.number = number
  }

  if (perSource) {
    const per: Record<string, unknown> = {}
    const commonMistake = trimOrNull(perSource.common_mistake)
    if (commonMistake) per.common_mistake = commonMistake
    const falseFriends = (perSource.false_friends ?? []).filter((item) => {
      const sourceTerm = trimOrNull(item.source_term)
      const note = trimOrNull(item.note)
      return sourceTerm !== null || note !== null
    })
    if (falseFriends.length > 0) per.false_friends = falseFriends
    if (Object.keys(per).length > 0) metadata.per_source = per
  }

  return metadata
}

export function buildCurriculumImportPayload(
  category: CurriculumCategory,
  level: CurriculumLevel,
  baseLanguageIso: string,
): CurriculumImportEntryPayload[] {
  const enrichment = getCurriculumEnrichmentBySlug(category.slug)
  const enrichmentLevel: CurriculumEnrichmentLevel | undefined = enrichment?.levels.find(
    (item) => item.level === level.level,
  )
  const enrichmentByTerm = new Map<string, CurriculumEnrichmentEntry>()
  for (const item of enrichmentLevel?.entries ?? []) {
    enrichmentByTerm.set(item.term, item)
  }

  const languageIso = category.data.target_language

  return level.entries.map((entry) => {
    const enrichmentEntry = enrichmentByTerm.get(entry.term)
    const perSource = pickPerSource(enrichmentEntry, baseLanguageIso)
    const translation = pickGloss(entry, baseLanguageIso)

    return {
      term: entry.term,
      translation,
      pos: enrichmentEntry?.pos ?? entry.pos ?? null,
      article: trimOrNull(enrichmentEntry?.article ?? null),
      ipa: trimOrNull(enrichmentEntry?.ipa ?? entry.ipa ?? null),
      mnemonic: trimOrNull(perSource?.mnemonic ?? entry.mnemonic ?? null),
      etymology: trimOrNull(enrichmentEntry?.etymology ?? entry.etymology ?? null),
      example: trimOrNull(enrichmentEntry?.example ?? null),
      example_gloss: trimOrNull(perSource?.example_gloss ?? null),
      synonyms: joinArray(enrichmentEntry?.synonyms),
      tags: joinArray(enrichmentEntry?.tags),
      thumbnail_url: curriculumImagePathIfKnown(languageIso, category.slug, entry.term),
      metadata: buildEntryMetadata(enrichmentEntry, perSource, category.slug, level.level),
    }
  })
}

export async function getImportedCurriculumDeck(
  supabase: SupabaseClient,
  userId: string,
  categorySlug: string,
  levelNumber: number,
): Promise<ImportedCurriculumDeckRow | null> {
  const { data, error } = await supabase
    .from('decks')
    .select('id, curriculum_category_slug, curriculum_level')
    .eq('user_id', userId)
    .eq('source_kind', 'curriculum')
    .eq('curriculum_category_slug', categorySlug)
    .eq('curriculum_level', levelNumber)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as ImportedCurriculumDeckRow | null) ?? null
}

export async function listImportedCurriculumDecks(
  supabase: SupabaseClient,
  userId: string,
): Promise<ImportedCurriculumDeckRow[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('id, curriculum_category_slug, curriculum_level')
    .eq('user_id', userId)
    .eq('source_kind', 'curriculum')

  if (error) throw error
  return (data ?? []) as ImportedCurriculumDeckRow[]
}

export async function importCurriculumLevel(
  supabase: SupabaseClient,
  category: CurriculumCategory,
  level: CurriculumLevel,
  baseLanguageIso: string,
  levelName: string,
): Promise<string> {
  const entries = buildCurriculumImportPayload(category, level, baseLanguageIso)
  const { data, error } = await supabase.rpc('submit_curriculum_import', {
    p_category_slug: category.slug,
    p_level_number: level.level,
    p_level_name: levelName,
    p_entries: entries,
    p_target_language: isoToWizardValue(category.data.target_language),
  })
  if (error) throw error
  if (typeof data !== 'string') {
    throw new Error('submit_curriculum_import did not return a deck id')
  }
  return data
}
