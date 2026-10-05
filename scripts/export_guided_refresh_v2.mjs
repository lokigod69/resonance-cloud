/** All authored active variants, never runtime mood fallbacks. Offline; stdout only. */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export const VERSION = 'guided-refresh-all-authored-v2'
export const TARGETS = ['English', 'Spanish', 'Italian', 'French', 'Portuguese', 'German',
  'Cebuano', 'Indonesian', 'Polish', 'Korean', 'Russian', 'Japanese']
const VIBES = ['bright', 'wistful', 'sharp']
export const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item
})
export const sha = value => createHash('sha256').update(value).digest('hex')

export function projectLessons(lessons, paths) {
  const pathOrder = new Map(paths.map((path, index) => [path.id, index]))
  const selected = lessons.filter(lesson => lesson.status === 'active').sort((a, b) =>
    pathOrder.get(a.pathId) - pathOrder.get(b.pathId) || a.lessonNumber - b.lessonNumber || a.id.localeCompare(b.id))
  if (!selected.length || new Set(selected.map(x => x.id)).size !== selected.length)
    throw new Error('empty_or_duplicate_lessons')
  const rows = [], aliases = [], selectors = new Map()
  let variantCount = 0
  for (const lesson of selected) {
    if (!TARGETS.includes(lesson.targetLanguage) || !['A1', 'A2', 'B1', 'B2'].includes(lesson.level)
        || !pathOrder.has(lesson.pathId)) throw new Error('unknown_lesson_scope')
    const actual = Object.keys(lesson.vibeVariants)
    if (!actual.length || actual.some(vibe => !VIBES.includes(vibe))) throw new Error('unknown_actual_vibe')
    for (const vibe of VIBES.filter(v => actual.includes(v))) {
      const variant = lesson.vibeVariants[vibe]
      const context = { targetLanguage: lesson.targetLanguage, targetLanguageCode: variant.speakTarget.language,
        pathId: lesson.pathId, lessonId: lesson.id, lessonNumber: lesson.lessonNumber, level: lesson.level, vibe }
      const selector = `${lesson.pathId}|${vibe}`
      const pathNumber = Number(lesson.pathId.match(/-practical-(\d+)$/)?.[1])
      if (!pathNumber) throw new Error('unrecognized_path_id')
      const requiredGender = ['Russian', 'Polish'].includes(lesson.targetLanguage)
        ? (pathNumber % 2 ? 'female' : 'male') : null
      const entry = { targetLanguage: lesson.targetLanguage, sourceLocale: variant.speakTarget.language,
        pathId: lesson.pathId, level: lesson.level, vibe, requiredGender }
      if (selectors.has(selector) && canonical(selectors.get(selector)) !== canonical(entry))
        throw new Error('inconsistent_selector_locale')
      selectors.set(selector, entry)
      variantCount += 1
      const add = (field, kind, surface, key, text, extra = {}) => {
        if (typeof text !== 'string' || !text.trim() || !key || /[\r\n]/u.test(text))
          throw new Error('invalid_individual_spoken_text')
        rows.push({ ...context, sourceField: `vibeVariants.${vibe}.${field}`, sourceKind: kind,
          playbackSurface: surface, playbackSurfaceKey: key, ...extra, text })
      }
      const alias = (field, canonicalField, text, kind = 'accepted-input') => {
        if (typeof text !== 'string' || !text.trim()) throw new Error('invalid_input_alias')
        aliases.push({ ...context, sourceField: `vibeVariants.${vibe}.${field}`,
          canonicalField: `vibeVariants.${vibe}.${canonicalField}`, kind, synthesize: false, text })
      }
      add('corePhrase.targetText', 'utterances', 'corePhrase', '__self', variant.corePhrase.targetText)
      for (const [i, turn] of (variant.dialogue ?? []).entries()) {
        if (i === 1 && turn.targetText !== variant.corePhrase.targetText) throw new Error('dialogue_core_alias_changed')
        add(`dialogue[${i}].targetText`, 'utterances', i === 1 ? 'corePhrase' : 'dialogue',
          i === 1 ? '__self' : `turn-${i + 1}`, turn.targetText,
          { dialogueSpeaker: turn.speaker, dialoguePosition: i + 1 })
      }
      for (const [i, example] of (variant.pattern?.examples ?? []).entries())
        add(`pattern.examples[${i}].targetText`, 'utterances', 'pattern', `ex-${i + 1}`, example.targetText)
      for (const [i, chunk] of variant.chunks.entries())
        add(`chunks[${i}].targetText`, 'chunks', 'chunk', chunk.id, chunk.targetText)
      for (const [i, item] of variant.lessonItems.entries()) {
        add(`lessonItems[${i}].targetText`, 'vocabulary', 'chunk', item.id, item.targetText, { vocabularyItem: true })
        for (const [j, accepted] of item.acceptedAnswers.entries())
          alias(`lessonItems[${i}].acceptedAnswers[${j}]`, `lessonItems[${i}].targetText`, accepted)
      }
      add('trophyWord.word', 'vocabulary', 'trophyWord', '__self', variant.trophyWord.word, { trophyWord: true })
      if (variant.speakTarget.targetPhrase !== variant.corePhrase.targetText)
        throw new Error('unrepresented_speak_target_needs_review')
      alias('speakTarget.targetPhrase', 'corePhrase.targetText', variant.speakTarget.targetPhrase, 'playback-core-alias')
      for (const field of ['displayAnswer', 'targetAnswer'])
        if (variant.speakTarget[field] != null) alias(`speakTarget.${field}`, 'corePhrase.targetText', variant.speakTarget[field])
      for (const [i, accepted] of (variant.speakTarget.acceptedAnswers ?? []).entries())
        alias(`speakTarget.acceptedAnswers[${i}]`, 'corePhrase.targetText', accepted)
      for (const [i, accepted] of (variant.typeRecall?.acceptedAnswers ?? []).entries())
        alias(`typeRecall.acceptedAnswers[${i}]`, 'typeRecall.answer', accepted)
    }
  }
  const payload = { scope: 'all-active-authored-variants', targets: [...new Set(selected.map(x => x.targetLanguage))],
    lessonCount: selected.length, variantCount, pathCount: new Set(selected.map(x => x.pathId)).size,
    selectors: [...selectors.values()], rows, aliases }
  if (canonical([...payload.targets].sort()) !== canonical([...TARGETS].sort())) throw new Error('all_twelve_targets_required')
  return { schemaVersion: 2, projectionVersion: VERSION, ...payload, projectionSha256: sha(canonical(payload)) }
}

async function dependencyAuthority(root) {
  const frontend = resolve(root, 'frontend')
  const require = createRequire(pathToFileURL(resolve(frontend, 'package.json')))
  // esbuild only resolves the dependency graph: no emitted bundle, no execution or network.
  const { metafile } = await require('esbuild').build({ absWorkingDir: frontend,
    entryPoints: ['src/data/guidedLessonsAuthoring.ts'], bundle: true, write: false,
    metafile: true, platform: 'node', format: 'esm', logLevel: 'silent', tsconfig: 'tsconfig.app.json' })
  const inputs = [...Object.keys(metafile.inputs).map(path => resolve(frontend, path)),
    ...['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json'].map(path => resolve(frontend, path))]
  return await Promise.all([...new Set(inputs)].sort().map(async path => {
    const name = relative(root, path).split(sep).join('/')
    if (name.startsWith('../')) throw new Error('unexpected_dependency_location')
    return { path: name, sha256: sha(await readFile(path)), tracked: !name.startsWith('frontend/node_modules/') }
  }))
}

async function runtimeAuthority(root) {
  const pending = [resolve(root, 'frontend/node_modules/tsx/package.json'),
    resolve(root, 'frontend/node_modules/esbuild/package.json')]
  const files = new Set([process.execPath]), seen = new Set()
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile()) files.add(path)
      else throw new Error('runtime_symlink_needs_review')
    }
  }
  while (pending.length) {
    const path = pending.pop()
    if (seen.has(path)) continue
    seen.add(path)
    const spec = JSON.parse(await readFile(path, 'utf8'))
    await walk(dirname(path))
    const require = createRequire(pathToFileURL(path))
    for (const name of Object.keys({ ...spec.dependencies, ...spec.optionalDependencies })) {
      try { pending.push(require.resolve(`${name}/package.json`)) }
      catch (error) { if (!(name in (spec.optionalDependencies ?? {}))) throw error }
    }
  }
  if (process.env.ESBUILD_BINARY_PATH) files.add(resolve(process.env.ESBUILD_BINARY_PATH))
  return { nodeVersion: process.version,
    environment: Object.fromEntries(['NODE_OPTIONS', 'ESBUILD_BINARY_PATH', 'TSX_TSCONFIG_PATH', 'TSX_DISABLE_CACHE']
      .map(name => [name, process.env[name] ?? null])),
    files: await Promise.all([...files].sort().map(async path => ({ path, sha256: sha(await readFile(path)) }))) }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== '--repo') throw new Error('required_repo')
  const root = resolve(args[1])
  const runtimeBefore = await runtimeAuthority(root)
  const before = await dependencyAuthority(root)
  const imported = await import(pathToFileURL(resolve(root, 'frontend/src/data/guidedLessonsAuthoring.ts')).href)
  const snapshot = projectLessons(imported.GUIDED_LESSONS, imported.getGuidedTodayPathOptions())
  const after = await dependencyAuthority(root)
  const runtimeAfter = await runtimeAuthority(root)
  if (canonical(before) !== canonical(after) || canonical(runtimeBefore) !== canonical(runtimeAfter))
    throw new Error('source_changed_during_export')
  process.stdout.write(JSON.stringify({ ...snapshot, sourceAuthority: after, runtimeAuthority: runtimeAfter }))
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
