/** Offline Korean gate; shared projection preserves true Korean source identity. */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const GATE = 'frontend/scripts/lib/guidedKoreanB1Drafts.ts'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item
})

async function runtimeAuthority(root) {
  const pending = [resolve(root, 'frontend/node_modules/esbuild/package.json')]
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
    ['NODE_OPTIONS', 'NODE_PATH', 'ESBUILD_BINARY_PATH', 'TSX_TSCONFIG_PATH'].map(name => [name, process.env[name] ?? null])),
    files: await Promise.all([...files].sort().map(async path => ({ path, sha256: sha(await readFile(path)) }))) }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== '--repo') throw new Error('required_repo')
  for (const name of ['NODE_OPTIONS', 'NODE_PATH', 'ESBUILD_BINARY_PATH', 'TSX_TSCONFIG_PATH'])
    if (process.env[name]) throw new Error('unreviewed_node_runtime_override')
  const root = resolve(args[1]), chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const inputs = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 2) throw new Error('one_or_two_korean_paths_required')
  const scopes = new Set()
  for (const { entry, source } of inputs) {
    if (entry.targetLanguage !== 'Korean' || ![1, 2].includes(entry.pathNumber) || scopes.has(entry.pathNumber)
        || source.targetLanguage !== 'Korean' || source.targetLanguageCode !== 'ko-KR' || source.pathNumber !== entry.pathNumber)
      throw new Error('exact_korean_scope_required')
    scopes.add(entry.pathNumber)
  }
  const { captureValidator, projectDraft } = await import(pathToFileURL(resolve(root, 'scripts/export_guided_native_b1.mjs')).href)
  const runtimeBefore = await runtimeAuthority(root), before = await captureValidator(root, GATE)
  const { validateKoreanB1Draft } = await import('data:text/javascript;base64,' + Buffer.from(before.bundle).toString('base64'))
  const rows = inputs.flatMap(({ entry, source, specification }) => projectDraft(validateKoreanB1Draft(source, specification), entry))
  const after = await captureValidator(root, GATE), runtimeAfter = await runtimeAuthority(root)
  if (canonical(before) !== canonical(after) || canonical(runtimeBefore) !== canonical(runtimeAfter))
    throw new Error('source_or_runtime_changed_during_export')
  process.stdout.write(JSON.stringify({ schemaVersion: 1, projectionVersion: 'korean-b1-four-turn-v1', rows,
    sourceAuthority: after.sources, runtimeAuthority: { ...runtimeAfter, validatorBundleSha256: after.bundleSha256 },
    validation: { validator: GATE, fullKoreanSpecification: true, passed: inputs.length } }))
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
