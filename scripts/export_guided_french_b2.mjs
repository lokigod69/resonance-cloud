/** Offline French B2 gate. Executes captured bytes; stdout only. */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const GATE = 'frontend/scripts/lib/guidedFrenchB2Drafts.ts'
const CORPUS = 'frontend/src/data/guidedLessonsAuthoring.ts'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item
})
const fold = value => value.normalize('NFC').toLowerCase()

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

export function validationEvidence(input, lessons) {
  const { entry, source, specification: spec, prerequisites, b1Plan } = input
  const target = entry.targetLanguage, locale = 'fr-FR'
  // The archived Fable authority used CRLF. Staging changes line endings only.
  // Bind the actual staged bytes and independently recover the exact pinned original.
  const { specificationSource, prerequisitesSource } = input
  if (typeof specificationSource !== 'string' || typeof prerequisitesSource !== 'string'
      || sha(specificationSource) !== entry.specification.sha256
      || sha(prerequisitesSource) !== entry.prerequisites.sha256
      || canonical(JSON.parse(specificationSource)) !== canonical(spec)
      || canonical(JSON.parse(prerequisitesSource)) !== canonical(prerequisites))
    throw new Error('exact_french_authority_source_required')
  const originalSpecificationSource = specificationSource.replace(/\r?\n/g, '\r\n')
  const originalSpecificationSha256 = sha(originalSpecificationSource)
  if (originalSpecificationSha256 !== 'd01d7f24143ade1107c8dbe1f93dc49b91f94ed853df7b312d85da3b9833a51d')
    throw new Error('pinned_french_original_specification_required')
  const mandatory = ['registerContract', 'genderSafety', 'orthography', 'segmentation', 'acceptedInput',
    'carriersStaged', 'mechanicalValidationRules', 'semanticReviewRules', 'unresolvedDecisions']
  if (!['French'].includes(target) || spec.status !== 'fable-authoring-spec'
      || spec.targetLanguage !== target || spec.code !== locale || spec.level !== 'B2'
      || spec.authoredBaseLanguage !== 'German'
      || canonical(spec.baseLocales) !== canonical(['de', 'en'])
      || mandatory.some(key => spec[key] == null) || !Array.isArray(spec.paths) || spec.paths.length !== 2)
    throw new Error('full_french_specification_required')
  const allocations = spec.trophyLedger?.rows
  if (!Array.isArray(allocations) || allocations.length !== 20) throw new Error('full_trophy_allocation_required')
  for (const [p, path] of spec.paths.entries()) {
    if (path.pathNumber !== p + 1 || !Array.isArray(path.lessons) || path.lessons.length !== 10)
      throw new Error('ordered_full_french_specification_required')
    for (const [n, lesson] of path.lessons.entries()) {
      const expected = { pathNumber: p + 1, lessonNumber: n + 1, lemma: lesson.trophyLemma,
        familyKey: lesson.trophyFamilyKey, pos: lesson.pos }
      if (lesson.number !== n + 1 || canonical(allocations[p * 10 + n]) !== canonical(expected)
          || typeof lesson.trophySurface !== 'string' || !lesson.trophySurface || typeof lesson.slug !== 'string' || !lesson.slug)
        throw new Error('specification_ledger_mismatch')
    }
  }
  if (source.targetLanguage !== target || source.targetLanguageCode !== locale || source.pathNumber !== entry.pathNumber
      || source.specRef?.pathSpecSha256 !== originalSpecificationSha256
      || source.specRef?.ledgerSha256 !== originalSpecificationSha256)
    throw new Error('french_source_authority_mismatch')
  // Reference labels are explicit metadata; only bound file paths are ever opened.
  if (source.specRef.pathSpec !== (entry.specification.referenceName ?? entry.specification.file)
      || source.specRef.ledger !== (entry.specification.referenceName ?? entry.specification.file))
    throw new Error('french_source_reference_label_mismatch')
  // The earlier B1 plan's target and exact bytes bind the reserved words.
  // A present contradictory locale fails.
  if (b1Plan.targetLanguage !== target || (b1Plan.targetVariety != null && b1Plan.targetVariety !== locale)
      || !Array.isArray(b1Plan.paths) || b1Plan.paths.length !== 10)
    throw new Error('complete_reserved_b1_plan_required')
  const reserved = b1Plan.paths.flatMap((path, p) => {
    if (path.pathNumber !== p + 1 || !Array.isArray(path.lessons) || path.lessons.length !== 10)
      throw new Error('complete_reserved_b1_plan_required')
    return path.lessons.map((lesson, n) => {
      if (lesson.number !== n + 1 || typeof lesson.trophy !== 'string' || !lesson.trophy.trim())
        throw new Error('complete_reserved_b1_plan_required')
      return lesson.trophy
    })
  })
  if (new Set(reserved.map(fold)).size !== 100) throw new Error('duplicate_reserved_b1_trophy')
  const frozen = lessons.filter(lesson => lesson.targetLanguage === target)
  if (!frozen.length) throw new Error('frozen_corpus_required')
  const earlier = frozen.flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [variant.trophyWord.word] : []))
  const forbidden = [...new Set([...earlier, ...reserved].map(fold))].sort()
  const matches = Array.isArray(prerequisites) ? prerequisites.filter(row => row.targetLanguage === target) : []
  if (matches.length !== 1 || matches[0].frozenLessonCount !== frozen.length
      || matches[0].activeCorpusSha256 !== sha(JSON.stringify(frozen))
      || matches[0].b1AllocationSha256 !== entry.b1Reservation.sha256
      || canonical(matches[0].forbiddenTrophies) !== canonical(forbidden))
    throw new Error('frozen_prerequisite_ledger_stale_or_incomplete')
  for (const [n, lesson] of source.lessons.entries()) {
    const allocated = spec.paths[entry.pathNumber - 1].lessons[n]
    if (lesson.slug !== allocated.slug || lesson.trophy.surface !== allocated.trophySurface
        || lesson.registerPlan.registers.some(register => register !== allocated.register))
      throw new Error('draft_specification_identity_mismatch')
  }
  // The source's trophy ledger is embedded in the full specification. The
  // separate prerequisite ledger above binds the earlier frozen/reserved words.
  return { pathSpecSha256: originalSpecificationSha256, ledgerSha256: originalSpecificationSha256,
    specificationSource: originalSpecificationSource, specification: spec,
    prerequisitesSource, prerequisites, prerequisitesSha256: entry.prerequisites.sha256,
    trophies: allocations, earlierTrophies: forbidden }
}

export function projectDraft(draft, entry) {
  const pathId = `${draft.targetLanguage.toLowerCase()}-b2-practical-${draft.pathNumber}`, rows = []
  draft.lessons.forEach((lesson, index) => {
    const tierNumber = (draft.pathNumber - 1) * 10 + index + 1
    const add = (pointer, sourceKind, playbackSurface, playbackSurfaceKey, text) => rows.push({
      pathId, lessonId: `${pathId}-${String(tierNumber).padStart(3, '0')}-${lesson.slug}`,
      lessonNumber: index + 1, tierGlobalLessonNumber: tierNumber, targetLanguage: draft.targetLanguage,
      targetLanguageCode: draft.targetLanguageCode, level: 'B2', vibe: 'bright',
      sourceFile: entry.file, sourceSha256: entry.sha256, sourcePointer: `/lessons/${index}/${pointer}`,
      sourceKind, playbackSurface, playbackSurfaceKey, text,
    })
    lesson.dialogue.forEach((turn, i) => add(`dialogue/${i}/targetText`, 'utterances', i === 1 ? 'corePhrase' : 'dialogue', i === 1 ? '__self' : `turn-${i + 1}`, turn.targetText))
    lesson.build.chunks.forEach((chunk, i) => add(`build/chunks/${i}`, 'chunks', 'chunk', `build-chunk-${i + 1}`, chunk))
    lesson.terms.forEach((term, i) => add(`terms/${i}/targetText`, 'vocabulary', 'chunk', `term-${i + 1}`, term.targetText))
    add('trophy/lemma', 'vocabulary', 'trophyWord', '__self', lesson.trophy.lemma)
    add('trophy/example/targetText', 'utterances', 'trophyExample', '__self', lesson.trophy.example.targetText)
    lesson.pattern.examples.forEach((example, i) => add(`pattern/examples/${i}/targetText`, 'utterances', 'pattern', `ex-${i + 1}`, example.targetText))
  })
  return rows
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== '--repo') throw new Error('required_repo')
  for (const name of ['NODE_OPTIONS', 'NODE_PATH', 'ESBUILD_BINARY_PATH', 'TSX_TSCONFIG_PATH'])
    if (process.env[name]) throw new Error('unreviewed_node_runtime_override')
  const root = resolve(args[1]), chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const inputs = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('french_sources_required')
  const { captureValidator } = await import(pathToFileURL(resolve(root, 'scripts/export_guided_native_b1.mjs')).href)
  const runtimeBefore = await runtimeAuthority(root)
  const before = await captureValidator(root, GATE), corpusBefore = await captureValidator(root, CORPUS)
  const capturedImport = capture => import('data:text/javascript;base64,' + Buffer.from(capture.bundle).toString('base64'))
  const { validateFrenchB2Draft } = await capturedImport(before)
  const { GUIDED_LESSONS } = await capturedImport(corpusBefore)
  const rows = inputs.flatMap(input => {
    const draft = validateFrenchB2Draft(input.source, validationEvidence(input, GUIDED_LESSONS))
    return projectDraft(draft, input.entry)
  })
  const after = await captureValidator(root, GATE), corpusAfter = await captureValidator(root, CORPUS)
  const runtimeAfter = await runtimeAuthority(root)
  if (canonical(before) !== canonical(after) || canonical(corpusBefore) !== canonical(corpusAfter)
      || canonical(runtimeBefore) !== canonical(runtimeAfter)) throw new Error('source_or_runtime_changed_during_export')
  const sources = new Map()
  for (const item of [...after.sources, ...corpusAfter.sources]) {
    if (sources.has(item.path) && canonical(sources.get(item.path)) !== canonical(item)) throw new Error('captured_source_graphs_differ')
    sources.set(item.path, item)
  }
  process.stdout.write(JSON.stringify({ schemaVersion: 1, projectionVersion: 'french-b2-six-turn-v1', rows,
    sourceAuthority: [...sources.values()].sort((a, b) => a.path < b.path ? -1 : 1),
    runtimeAuthority: { ...runtimeAfter, validatorBundleSha256: after.bundleSha256, corpusBundleSha256: corpusAfter.bundleSha256 },
    validation: { validator: GATE, fullSpecification: true, frozenAndReservedLedger: true, passed: inputs.length } }))
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
