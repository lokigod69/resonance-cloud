/** Offline source authority for the refresh adapter. Never reads a saved lesson dump. */
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const PROJECTION_VERSION = 'guided-refresh-spoken-coordinates-v1'
const sha = value => createHash('sha256').update(value).digest('hex')
const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item
})

export function projectLessons(lessons, paths, { language, levels }) {
  const pathOrder = new Map(paths.map((path, index) => [path.id, index]))
  const selected = lessons.filter(lesson => lesson.targetLanguage === language
    && levels.includes(lesson.level) && lesson.status === 'active')
    .sort((a, b) => pathOrder.get(a.pathId) - pathOrder.get(b.pathId)
      || a.lessonNumber - b.lessonNumber || a.id.localeCompare(b.id))
  if (!selected.length || new Set(selected.map(x => x.id)).size !== selected.length)
    throw new Error('empty_or_duplicate_source_lessons')
  const rows = [], speakTargetAliases = []
  for (const lesson of selected) {
    const variant = lesson.vibeVariants.bright
    if (!variant || !pathOrder.has(lesson.pathId)) throw new Error('missing_bright_variant_or_path')
    const code = variant.speakTarget.language
    const add = (field, kind, surface, key, text, extra = {}) => {
      if (typeof text !== 'string' || !text.trim() || !key) throw new Error('invalid_spoken_surface')
      rows.push({ targetLanguage: language, targetLanguageCode: code, pathId: lesson.pathId,
        lessonId: lesson.id, lessonNumber: lesson.lessonNumber, level: lesson.level, vibe: 'bright',
        sourceField: `vibeVariants.bright.${field}`, sourceKind: kind,
        playbackSurface: surface, playbackSurfaceKey: key, ...extra, text })
    }
    add('corePhrase.targetText', 'utterances', 'corePhrase', '__self', variant.corePhrase.targetText)
    for (const [i, turn] of (variant.dialogue ?? []).entries()) {
      if (i === 1 && turn.targetText !== variant.corePhrase.targetText)
        throw new Error('dialogue_turn_two_must_alias_core')
      add(`dialogue[${i}].targetText`, 'utterances', i === 1 ? 'corePhrase' : 'dialogue',
        i === 1 ? '__self' : `turn-${i + 1}`, turn.targetText,
        { dialogueSpeaker: turn.speaker, dialoguePosition: i + 1 })
    }
    for (const [i, example] of (variant.pattern?.examples ?? []).entries())
      add(`pattern.examples[${i}].targetText`, 'utterances', 'pattern', `ex-${i + 1}`, example.targetText)
    for (const [i, chunk] of variant.chunks.entries())
      add(`chunks[${i}].targetText`, 'chunks', 'chunk', chunk.id, chunk.targetText)
    // This field is intentionally omitted by the legacy inventory extractor.
    // Runtime matching requests the original lesson-item ID on the chunk surface.
    for (const [i, item] of variant.lessonItems.entries())
      add(`lessonItems[${i}].targetText`, 'vocabulary', 'chunk', item.id, item.targetText, { vocabularyItem: true })
    add('trophyWord.word', 'vocabulary', 'trophyWord', '__self', variant.trophyWord.word, { trophyWord: true })
    if (variant.speakTarget.targetPhrase !== variant.corePhrase.targetText)
      throw new Error('unrepresented_speak_target_requires_projection_review')
    speakTargetAliases.push({ lessonId: lesson.id, pathId: lesson.pathId,
      sourceField: 'vibeVariants.bright.speakTarget.targetPhrase', playbackSurface: 'corePhrase',
      playbackSurfaceKey: '__self', text: variant.speakTarget.targetPhrase })
  }
  return { schemaVersion: 1, projectionVersion: PROJECTION_VERSION,
    scope: { targetLanguage: language, levels: [...levels], vibe: 'bright', status: 'active' },
    lessonCount: selected.length, pathCount: new Set(selected.map(x => x.pathId)).size,
    rows, speakTargetAliases, sourceProjectionSha256: sha(canonical(rows)),
    speakTargetAliasesSha256: sha(canonical(speakTargetAliases)) }
}

async function main() {
  const args = process.argv.slice(2)
  const value = flag => args[args.indexOf(flag) + 1]
  if (!args.includes('--repo') || !args.includes('--language') || !args.includes('--levels'))
    throw new Error('required_repo_language_levels')
  const source = resolve(value('--repo'), 'frontend/src/data/guidedLessonsAuthoring.ts')
  const imported = await import(pathToFileURL(source).href)
  const payload = projectLessons(imported.GUIDED_LESSONS, imported.getGuidedTodayPathOptions(),
    { language: value('--language'), levels: value('--levels').split(',') })
  process.stdout.write(JSON.stringify(payload))
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
