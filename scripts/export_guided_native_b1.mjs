/** Offline native gate and exact speech projection. Input JSON on stdin; stdout only. */
import { createHash } from 'node:crypto'
import { readFile, readdir, realpath, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item
})
const VALIDATOR = 'frontend/scripts/lib/guidedNativeB1Drafts.ts'

export async function captureValidator(root, entry = VALIDATOR) {
  const frontend = resolve(root, 'frontend')
  const require = createRequire(pathToFileURL(resolve(frontend, 'package.json')))
  const { metafile, outputFiles } = await require('esbuild').build({ absWorkingDir: frontend,
    entryPoints: [resolve(root, entry)], bundle: true, write: false,
    metafile: true, platform: 'node', format: 'esm', conditions: ['node', 'node-addons'],
    logLevel: 'silent', tsconfig: 'tsconfig.app.json' })
  const inputs = [...Object.keys(metafile.inputs).map(path => resolve(frontend, path)),
    ...['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json'].map(path => resolve(frontend, path))]
  // Bind all ancestor resolver metadata, including installed dependency exports.
  for (const input of [...inputs]) {
    for (let directory = dirname(input); directory.startsWith(frontend + sep) || directory === frontend; directory = dirname(directory)) {
      const metadata = resolve(directory, 'package.json')
      try { if ((await stat(metadata)).isFile()) inputs.push(metadata) }
      catch (error) { if (error.code !== 'ENOENT') throw error }
      if (directory === frontend) break
    }
  }
  const sources = await Promise.all([...new Set(inputs)].sort().map(async path => {
    if (await realpath(path) !== path) throw new Error('source_symlink_needs_review')
    const name = relative(root, path).split(sep).join('/')
    if (name.startsWith('../')) throw new Error('dependency_outside_checkout')
    return { path: name, sha256: sha(await readFile(path)), tracked: !name.startsWith('frontend/node_modules/') }
  }))
  if (outputFiles.length !== 1 || Object.values(metafile.outputs).some(output => output.imports.some(item => item.external && !item.path.startsWith('node:'))))
    throw new Error('validator_bundle_external_dependency')
  return { sources, bundle: outputFiles[0].text, bundleSha256: sha(outputFiles[0].contents) }
}

async function runtimeAuthority(root) {
  const pending = ['tsx', 'esbuild'].map(name => resolve(root, `frontend/node_modules/${name}/package.json`))
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
  return { nodeVersion: process.version, environment: Object.fromEntries(
    ['NODE_OPTIONS', 'NODE_PATH', 'ESBUILD_BINARY_PATH', 'TSX_TSCONFIG_PATH', 'TSX_DISABLE_CACHE'].map(name => [name, process.env[name] ?? null])),
    files: await Promise.all([...files].sort().map(async path => ({ path, sha256: sha(await readFile(path)) }))) }
}

export function projectDraft(draft, entry) {
  const pathId = `${draft.targetLanguage.toLowerCase()}-b1-practical-${draft.pathNumber}`
  const rows = []
  draft.lessons.forEach((lesson, index) => {
    const tierNumber = (draft.pathNumber - 1) * 10 + index + 1
    const prefix = lesson.slug.split('-')[0]
    const add = (pointer, sourceKind, playbackSurface, playbackSurfaceKey, text) => rows.push({
      pathId, lessonId: `${pathId}-${String(tierNumber).padStart(3, '0')}-${lesson.slug}`,
      lessonNumber: index + 1, tierGlobalLessonNumber: tierNumber, targetLanguage: draft.targetLanguage,
      targetLanguageCode: draft.targetLanguageCode, level: 'B1', vibe: 'bright',
      sourceFile: entry.file, sourceSha256: entry.sha256, sourcePointer: `/lessons/${index}/${pointer}`,
      sourceKind, playbackSurface, playbackSurfaceKey, text,
    })
    lesson.dialogue.forEach((turn, i) => add(`dialogue/${i}/targetText`, 'utterances', i === 1 ? 'corePhrase' : 'dialogue', i === 1 ? '__self' : `turn-${i + 1}`, turn.targetText))
    lesson.chunks.forEach((chunk, i) => add(`chunks/${i}/targetText`, 'chunks', 'chunk', `${prefix}-${i + 1}`, chunk.targetText))
    lesson.terms.forEach((term, i) => add(`terms/${i}/targetText`, 'vocabulary', 'chunk', `${prefix}-item-${i + 1}`, term.targetText))
    add('trophyWord/word', 'vocabulary', 'trophyWord', '__self', lesson.trophyWord.word)
    add('trophyWord/example', 'utterances', 'trophyExample', '__self', lesson.trophyWord.example)
    lesson.pattern.examples.forEach((example, i) => add(`pattern/examples/${i}/targetText`, 'utterances', 'pattern', `ex-${i + 1}`, example.targetText))
  })
  return rows
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== '--repo') throw new Error('required_repo')
  // Prevent unbound arbitrary Node loaders and alternate resolver configuration.
  for (const name of ['NODE_OPTIONS', 'NODE_PATH', 'ESBUILD_BINARY_PATH', 'TSX_TSCONFIG_PATH'])
    if (process.env[name]) throw new Error('unreviewed_node_runtime_override')
  const root = resolve(args[1]), chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const inputs = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('native_sources_required')
  const before = await captureValidator(root), runtimeBefore = await runtimeAuthority(root)
  // Execute exactly the captured graph; a second Node resolution cannot escape it.
  const { validateNativeB1Draft } = await import('data:text/javascript;base64,' + Buffer.from(before.bundle).toString('base64'))
  const rows = inputs.flatMap(({ entry, source, specification }) => {
    const draft = validateNativeB1Draft(source, specification)
    if (entry.targetLanguage !== draft.targetLanguage || entry.pathNumber !== draft.pathNumber)
      throw new Error('native_entry_source_mismatch')
    return projectDraft(draft, entry)
  })
  const after = await captureValidator(root), runtimeAfter = await runtimeAuthority(root)
  if (canonical(before) !== canonical(after) || canonical(runtimeBefore) !== canonical(runtimeAfter))
    throw new Error('source_or_runtime_changed_during_export')
  process.stdout.write(JSON.stringify({ schemaVersion: 1, projectionVersion: 'native-b1-four-turn-v1',
    rows, sourceAuthority: after.sources, runtimeAuthority: { ...runtimeAfter, validatorBundleSha256: after.bundleSha256 }, validation: {
      validator: VALIDATOR, fullNativeSpecification: true, passed: inputs.length } }))
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
