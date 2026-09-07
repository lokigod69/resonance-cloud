import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUIDED_LESSONS, getGuidedTodayPathOptions } from '../src/data/guidedLessonsAuthoring.ts'
import { ACTIVE_GUIDED_VIBE_IDS } from '../src/data/guidedVibes.ts'
import { collectGuidedBaseFields, guidedEditionFingerprint } from '../src/lib/guidedBaseFields.ts'
import { LANGUAGES } from '../src/lib/languages.ts'
import {
  getGuidedEditionTranslation,
  validateGuidedBaseEdition,
  type GuidedBaseEdition,
} from '../src/lib/guidedBaseEditions.ts'
import { buildGuidedPhraseCatalogRows } from './generate-guided-phrase-catalog-migration.ts'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))
const overlayDirectory = resolve(frontendRoot, 'src/data/guided-base')
const destination = resolve(frontendRoot, 'supabase/migrations/20260907131000_guided_phrase_catalog_locales.sql')

export const GUIDED_PHRASE_BASE_LOCALES = [
  'en', 'de', 'fr', 'es', 'it', 'pt', 'id', 'pl', 'ru', 'ko', 'ja', 'ceb',
] as const

type OverlayFile = GuidedBaseEdition & {
  reviewStatus?: string
}

export type GuidedPhraseLocalePatch = {
  pathId: string
  lessonId: string
  vibe: string
  baseLanguage: string
  translation: string
  expectedContentHash: string
}

export function guidedPhraseOverlayKey(lessonId: string, vibe: string) {
  return `lessons/${lessonId}/vibeVariants/${vibe}/corePhrase/baseText`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseOverlay(path: string, fields: ReturnType<typeof collectGuidedBaseFields>, hash: string, locale: string): OverlayFile {
  const value = JSON.parse(readFileSync(path, 'utf8')) as unknown
  if (!isRecord(value)
    || ![1, 2].includes(Number(value.schemaVersion))
    || typeof value.corpusHash !== 'string'
    || typeof value.locale !== 'string'
    || !['machine-authored', 'human-reviewed'].includes(String(value.reviewStatus ?? ''))
  ) {
    throw new Error(`Invalid Guided base overlay: ${path}`)
  }
  const overlay = value as OverlayFile
  validateGuidedBaseEdition(overlay, fields, hash, locale)
  return overlay
}

function languageForLocale(locale: string): string {
  const language = LANGUAGES.find((entry) => entry.code === locale)?.value
  if (!language) throw new Error(`No canonical language registry entry for overlay locale ${locale}`)
  return language
}

export function buildGuidedPhraseLocalePatches(directory = overlayDirectory): GuidedPhraseLocalePatch[] {
  const unexpectedFiles = listUnexpectedOverlayFiles(directory)
  if (unexpectedFiles.length) {
    throw new Error(`Unexpected Guided base overlay files: ${unexpectedFiles.join(', ')}`)
  }
  const manifestPath = resolve(directory, 'manifest.json')
  const manifestValue = JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown
  if (!isRecord(manifestValue)) throw new Error('Guided base overlay manifest must be an object')

  const catalogRows = buildGuidedPhraseCatalogRows()
  const catalogByCoordinate = new Map(catalogRows.map((row) => [
    `${row.lessonId}\u0000${row.vibe}`,
    row,
  ]))
  const paths = getGuidedTodayPathOptions()
  const targetLanguages = Array.from(new Set(GUIDED_LESSONS.map((lesson) => lesson.targetLanguage))).sort()
  const expectedTargetStems = targetLanguages.map((language) => language.toLowerCase()).sort()
  const manifestTargetStems = Object.keys(manifestValue).sort()
  if (JSON.stringify(manifestTargetStems) !== JSON.stringify(expectedTargetStems)) {
    throw new Error('Guided base overlay manifest target coverage does not match the authored corpus')
  }
  const patches: GuidedPhraseLocalePatch[] = []

  for (const targetLanguage of targetLanguages) {
    const targetStem = targetLanguage.toLowerCase()
    const lessons = GUIDED_LESSONS.filter((lesson) => lesson.targetLanguage === targetLanguage)
    const lessonIds = new Set(lessons.map((lesson) => lesson.id))
    const targetPaths = paths.filter((path) => path.targetLanguage === targetLanguage)
    const fields = collectGuidedBaseFields(lessons, targetPaths)
    const expectedCorpusHash = guidedEditionFingerprint(fields)
    const expectedKeys = new Set(fields.map((field) => field.key))
    const fieldIndexes = new Map(fields.map((field, index) => [field.key, index]))
    const manifestEntry = manifestValue[targetStem]
    if (!isRecord(manifestEntry)
      || manifestEntry.corpusHash !== expectedCorpusHash
      || !Array.isArray(manifestEntry.locales)
    ) {
      throw new Error(`Stale or invalid overlay manifest entry for ${targetStem}`)
    }
    const publishedLocales = Array.from(new Set(manifestEntry.locales)).sort()
    const expectedLocales = [...GUIDED_PHRASE_BASE_LOCALES].sort()
    if (JSON.stringify(publishedLocales) !== JSON.stringify(expectedLocales)) {
      throw new Error(`Overlay manifest locale coverage is incomplete for ${targetStem}`)
    }

    for (const locale of GUIDED_PHRASE_BASE_LOCALES) {
      if (!manifestEntry.locales.includes(locale)) {
        throw new Error(`Overlay manifest does not publish ${targetStem}.${locale}`)
      }
      const fileName = `${targetStem}.${locale}.json`
      const overlay = parseOverlay(resolve(directory, fileName), fields, expectedCorpusHash, locale)
      if (overlay.locale !== locale || overlay.corpusHash !== expectedCorpusHash) {
        throw new Error(`Overlay identity mismatch in ${fileName}`)
      }

      const baseLanguage = languageForLocale(locale)
      for (const lessonId of lessonIds) {
        for (const vibe of ACTIVE_GUIDED_VIBE_IDS) {
          const coordinate = catalogByCoordinate.get(`${lessonId}\u0000${vibe}`)
          if (!coordinate) continue
          const key = guidedPhraseOverlayKey(lessonId, vibe)
          if (!expectedKeys.has(key)) throw new Error(`Active core meaning key is not registered in ${targetStem}: ${key}`)
          const fieldIndex = fieldIndexes.get(key) ?? -1
          const translation = getGuidedEditionTranslation(overlay, key, fieldIndex)?.trim()
          if (!translation || translation.length > 1000) {
            throw new Error(`Missing or oversized active core meaning ${key} in ${fileName}`)
          }
          patches.push({
            pathId: coordinate.pathId,
            lessonId,
            vibe,
            baseLanguage,
            translation,
            expectedContentHash: coordinate.contentHash,
          })
        }
      }
    }
  }

  const unique = new Set(patches.map((patch) => [
    patch.pathId, patch.lessonId, patch.vibe, patch.baseLanguage,
  ].join('\u0000')))
  const expectedCount = catalogRows.length * GUIDED_PHRASE_BASE_LOCALES.length
  if (patches.length !== expectedCount || unique.size !== expectedCount) {
    throw new Error(`Expected ${expectedCount} unique guided phrase locale patches, found ${patches.length}/${unique.size}`)
  }
  return patches.sort((a, b) =>
    a.pathId.localeCompare(b.pathId)
    || a.lessonId.localeCompare(b.lessonId)
    || a.vibe.localeCompare(b.vibe)
    || a.baseLanguage.localeCompare(b.baseLanguage),
  )
}

function sqlLiteral(value: string) {
  const escapedQuote = value.replaceAll("'", "''")
  if (!/[\\\r\n\t]/u.test(value)) return `'${escapedQuote}'`
  return `E'${escapedQuote
    .replaceAll('\\', '\\\\')
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')
    .replaceAll('\t', '\\t')}'`
}

export function renderGuidedPhraseLocaleMigration(patches: GuidedPhraseLocalePatch[]) {
  const values = patches.map((patch) => `  (${[
    patch.pathId,
    patch.lessonId,
    patch.vibe,
    patch.baseLanguage,
    patch.translation,
    patch.expectedContentHash,
  ].map(sqlLiteral).join(', ')})`).join(',\n')

  return `-- Offline-published Guided Today base-language meanings. Generated from
-- src/data/guided-base by scripts/generate-guided-phrase-locale-migration.ts.
-- The per-row authored content hash makes a stale overlay fail atomically.
begin;

create temporary table guided_phrase_locale_patch (
  path_id text not null,
  lesson_id text not null,
  vibe text not null,
  base_language text not null,
  translation text not null,
  expected_content_hash text not null,
  primary key (path_id, lesson_id, vibe, base_language)
) on commit drop;

insert into guided_phrase_locale_patch (
  path_id, lesson_id, vibe, base_language, translation, expected_content_hash
) values
${values};

do $$
declare
  v_bad text;
begin
  select format('%s/%s/%s (%s)', p.path_id, p.lesson_id, p.vibe, p.base_language)
    into v_bad
    from guided_phrase_locale_patch p
    left join public.guided_phrase_catalog c
      on c.path_id = p.path_id and c.lesson_id = p.lesson_id and c.vibe = p.vibe
   where c.path_id is null or c.content_hash is distinct from p.expected_content_hash
   order by p.path_id, p.lesson_id, p.vibe, p.base_language
   limit 1;
  if v_bad is not null then
    raise exception 'Guided phrase locale overlay is stale or unregistered at %', v_bad
      using errcode = '22023';
  end if;
end;
$$;

with locale_maps as (
  select path_id, lesson_id, vibe,
         jsonb_object_agg(base_language, translation order by base_language) as translations
    from guided_phrase_locale_patch
   group by path_id, lesson_id, vibe
)
update public.guided_phrase_catalog c
   set translations = c.translations || p.translations,
       updated_at = case
         when c.translations is distinct from c.translations || p.translations then now()
         else c.updated_at
       end
  from locale_maps p
 where c.path_id = p.path_id and c.lesson_id = p.lesson_id and c.vibe = p.vibe
   and not exists (
     select 1 from guided_phrase_locale_patch guard
      where guard.path_id = p.path_id and guard.lesson_id = p.lesson_id and guard.vibe = p.vibe
        and guard.expected_content_hash is distinct from c.content_hash
   );

do $$
begin
  if exists (
    select 1
      from guided_phrase_locale_patch p
      join public.guided_phrase_catalog c
        on c.path_id = p.path_id and c.lesson_id = p.lesson_id and c.vibe = p.vibe
     where c.translations ->> p.base_language is distinct from p.translation
  ) then
    raise exception 'Guided phrase locale overlay did not apply completely';
  end if;
end;
$$;

commit;
`
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const patches = buildGuidedPhraseLocalePatches()
  const generated = renderGuidedPhraseLocaleMigration(patches)
  if (process.argv.includes('--check')) {
    if (readFileSync(destination, 'utf8') !== generated) {
      throw new Error('Guided phrase locale migration is stale; regenerate it.')
    }
  } else {
    writeFileSync(destination, generated)
    console.log(`Wrote ${patches.length} guided phrase locale rows to ${destination}`)
  }
}

// Keep an accidental non-JSON file from silently shadowing a future target.
export function listUnexpectedOverlayFiles(directory = overlayDirectory) {
  return readdirSync(directory).filter((name) =>
    name !== 'manifest.json' && !/^[a-z]+\.(?:en|de|fr|es|it|pt|id|pl|ru|ko|ja|ceb)\.json$/.test(name),
  )
}
