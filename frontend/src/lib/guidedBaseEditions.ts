import { collectGuidedBaseFields, guidedEditionFingerprint, type GuidedBaseField } from './guidedBaseFields'
import { getGuidedPlaceholderIssues } from './guidedTranslationQuality'

const files: Record<string, string> = { English: 'english', German: 'german', French: 'french', Spanish: 'spanish', Italian: 'italian', Portuguese: 'portuguese', Indonesian: 'indonesian', Polish: 'polish', Russian: 'russian', Korean: 'korean', Japanese: 'japanese', Cebuano: 'cebuano' }
export const GUIDED_BASE_LOCALES = { English: 'en', German: 'de', French: 'fr', Spanish: 'es', Italian: 'it', Portuguese: 'pt', Indonesian: 'id', Polish: 'pl', Russian: 'ru', Korean: 'ko', Japanese: 'ja', Bisaya: 'ceb' } as const
export type GuidedExplanationLanguage = keyof typeof GUIDED_BASE_LOCALES
export type GuidedExplanationLocale = typeof GUIDED_BASE_LOCALES[GuidedExplanationLanguage]
export type GuidedBaseEdition = { schemaVersion: number; corpusHash: string; locale: string; reviewStatus?: 'machine-authored' | 'human-reviewed'; translations?: Record<string, string>; texts?: string[] }
const sources = new Map<string, { fields: GuidedBaseField[]; hash: string }>()
const pending = new Map<string, Promise<void>>()
const loaded = new Set<string>()

export function resolveGuidedExplanationLocale(baseLanguage: string | null | undefined): GuidedExplanationLocale | undefined {
  const normalized = baseLanguage?.trim().toLowerCase()
  if (!normalized) return undefined
  const canonical = normalized === 'cebuano'
    ? 'Bisaya'
    : (Object.keys(GUIDED_BASE_LOCALES) as GuidedExplanationLanguage[])
      .find((language) => language.toLowerCase() === normalized)
  return canonical ? GUIDED_BASE_LOCALES[canonical] : undefined
}

export function validateGuidedBaseEdition(edition: GuidedBaseEdition, fields: GuidedBaseField[], hash: string, locale: string): void {
  if (![1, 2].includes(edition.schemaVersion) || edition.corpusHash !== hash || edition.locale !== locale) throw new Error('Guided explanation edition mismatch')
  if (edition.schemaVersion === 2 && !['machine-authored', 'human-reviewed'].includes(edition.reviewStatus ?? '')) throw new Error('Guided explanation review status mismatch')
  if (edition.reviewStatus && !['machine-authored', 'human-reviewed'].includes(edition.reviewStatus)) throw new Error('Guided explanation review status mismatch')
  const size = edition.schemaVersion === 2 ? (Array.isArray(edition.texts) ? edition.texts.length : -1) : (edition.translations && !Array.isArray(edition.translations) ? Object.keys(edition.translations).length : -1)
  if (size !== fields.length) throw new Error('Incomplete guided explanation edition')
  for (const [index,field] of fields.entries()) {
    const value = getGuidedEditionTranslation(edition, field.key, index)
    if (typeof value !== 'string' || !value.trim() || value.length > Math.max(2000, field.source.length * 6)) throw new Error('Invalid guided explanation')
    if (getGuidedPlaceholderIssues(field.source, value).length) throw new Error('Guided explanation placeholder mismatch')
  }
}

export function getGuidedEditionTranslation(edition: GuidedBaseEdition, fieldKey: string, index: number): string | undefined {
  return edition.schemaVersion === 2 ? edition.texts?.[index] : edition.translations?.[fieldKey]
}

/** Apply only a whole verified edition; no partial language mix and no generated answers. */
export async function loadGuidedBaseEdition(targetLanguage: string, baseLanguage: string | null | undefined, lessons: readonly { id: string }[], paths: readonly { id: string }[]): Promise<void> {
  const locale = resolveGuidedExplanationLocale(baseLanguage)
  if (!locale) return
  const file = files[targetLanguage]
  if (!file) throw new Error('Unsupported guided target')
  const key = `${file}.${locale}`
  if (loaded.has(key)) return
  if (!sources.has(file)) {
    const fields = collectGuidedBaseFields(lessons, paths)
    sources.set(file, { fields, hash: guidedEditionFingerprint(fields) })
  }
  const source = sources.get(file)!
  // Existing complete authored editions need no extra network request.
  if (source.fields.every(f => Boolean(f.value[locale]?.trim()))) { loaded.add(key); return }
  if (!pending.has(key)) {
    const request = (async () => {
      const loaders = import.meta.glob('../data/guided-base/*.json', { import: 'default' })
      const loader = loaders[`../data/guided-base/${key}.json`]
      if (!loader) throw new Error('Guided explanation edition unavailable')
      const edition = await loader() as GuidedBaseEdition
      validateGuidedBaseEdition(edition, source.fields, source.hash, locale)
      for (const [index,field] of source.fields.entries()) {
        // Authored values are the source of truth and never overwritten.
        if (!field.value[locale]?.trim()) field.value[locale] = getGuidedEditionTranslation(edition, field.key, index)!
      }
      loaded.add(key)
    })().finally(() => pending.delete(key))
    pending.set(key, request)
  }
  await pending.get(key)
}
