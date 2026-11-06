// Run with the frontend's tsx so the actual TypeScript draft validators are loaded.
// Does not modify the release gate, files, account, or database.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire, Module } = require('node:module')
const frontend = path.resolve(__dirname, '../..')
const fromFrontend = createRequire(path.join(frontend, 'package.json'))
const read = file => JSON.parse(fs.readFileSync(file))
const { validateB1Draft } = fromFrontend('./scripts/lib/guidedB1Drafts.ts')
const { validateNativeB1Draft } = fromFrontend('./scripts/lib/guidedNativeB1Drafts.ts')
const { checkGuidedSpeechAnswer } = fromFrontend('./src/lib/guidedSpeechCheck.ts')
const koreanFile = path.join(frontend, 'scripts/lib/guidedKoreanB1Drafts.ts')
const pilot = fromFrontend(koreanFile).validateKoreanB1Draft
const spec = read(path.join(frontend, 'content-drafts/b1-native-2026-10/korean/specification.json'))
const cebuanoDir = path.join(frontend, 'content-drafts/b1-native-2026-10/cebuano')
const cebuanoSpec = read(path.join(cebuanoDir, 'specification.json'))
const evidence = read(path.join(__dirname, 'review/final-b1-gates.json')).paths
const candidates = read(path.join(__dirname, 'index.json')).paths.filter(row => row.level === 'B1')
assert.equal(evidence.length, candidates.length)
const queue = read(path.join(__dirname, 'planning/remaining-by-language.json')).queue
for (const [language, firstNewPath] of [['Cebuano', 3], ['French', 6], ['Italian', 4], ['Portuguese', 6]]) {
  const name = language.toLowerCase()
  const october = path.resolve(__dirname, '../b1-2026-10')
  const plan = language === 'Cebuano' ? cebuanoSpec.paths : read(path.join(october, name + '-plan.json')).paths
  const allPaths = plan.map(p => p.pathNumber)
  const newlyWritten = candidates.filter(r => r.language === language && r.path >= firstNewPath)
  assert.deepEqual(newlyWritten.map(r => r.path), allPaths.filter(n => n >= firstNewPath), language)
  const entry = queue.find(r => r.language === language && r.level === 'B1')
  assert.deepEqual(entry.writtenPaths, allPaths, language)
  assert.deepEqual(entry.pathsToWrite, [], language)
  const trophies = new Set(), slugs = new Set()
  for (const outline of plan) {
    const n = outline.pathNumber
    const current = candidates.find(r => r.language === language && r.path === n)
    const source = current ? path.join(__dirname, current.file)
      : language === 'Cebuano' ? path.join(cebuanoDir, 'p' + n + '.json')
      : n === 1 ? path.join(october, name + '.json') : path.join(october, 'paths', name + '-p' + n + '.json')
    const {lessons} = read(source)
    assert.deepEqual(lessons.map(l => l.trophyWord.word), outline.lessons.map(l => l.trophy), source)
    for (const lesson of lessons) {
      trophies.add(lesson.trophyWord.word.normalize('NFC').toLowerCase())
      slugs.add(lesson.slug)
    }
  }
  assert.equal(trophies.size, 100, language + ' distinct B1 trophies')
  assert.equal(slugs.size, 100, language + ' distinct B1 episodes')
  if (language === 'Cebuano') {
    for (const n of [1, 2]) {
      validateNativeB1Draft(read(path.join(cebuanoDir, 'p' + n + '.json')), cebuanoSpec)
      const b2 = read(path.join(__dirname, 'b2/cebuano/p' + n + '.json'))
      for (const lesson of b2.lessons) {
        for (const word of [lesson.trophy.lemma, lesson.trophy.surface]) assert(!trophies.has(word.toLowerCase()), word)
      }
    }
  }
}
for (const row of candidates) {
  const bytes = fs.readFileSync(path.join(__dirname, row.file)), draft = JSON.parse(bytes)
  const receipt = evidence.find(item => item.path === row.file)
  assert.equal(receipt.sha256, crypto.createHash('sha256').update(bytes).digest('hex'), row.file)
  if ((row.language === 'Italian' && row.path >= 4) || row.language === 'Cebuano') {
    for (const lesson of draft.lessons) {
      const target = lesson.dialogue[1].targetText
      // One extra word bypasses the verbatim shortcut and exercises the ordered anchors.
      const result = checkGuidedSpeechAnswer({
        transcript: target + ' extra', targetAnswer: target, requiredTokens: lesson.speakRequired
      })
      assert.equal(result.reason, 'core_tokens', lesson.slug + ' speaking anchors')
    }
  }
  if (row.language === 'Cebuano') {
    assert.equal(row.state, 'offline text reviewed', row.file)
    validateNativeB1Draft(draft, cebuanoSpec)
    continue
  }
  if (row.language !== 'Korean') { validateB1Draft(draft); continue }
  assert.throws(() => pilot(draft, spec), /2/)
  const gateSource = fs.readFileSync(koreanFile, 'utf8'), pilotBound = 'pathNumber: z.number().int().min(1).max(2)'
  assert.equal(gateSource.split(pilotBound).length, 2, 'Pilot gate changed: inspect before reusing')
  const offline = new Module(koreanFile, module)
  offline.filename = koreanFile
  offline.paths = Module._nodeModulePaths(path.dirname(koreanFile))
  const code = gateSource.replace(pilotBound, 'pathNumber: z.literal('+row.path+')')
  offline._compile(fromFrontend('esbuild').transformSync(code, { loader:'ts', format:'cjs' }).code, koreanFile)
  offline.exports.validateKoreanB1Draft(draft, spec)
  draft.lessons.forEach((l,i) => assert.equal(l.trophyWord.word, spec.paths[row.path-1].lessons[i].trophy))
}
console.log('All '+candidates.length+' new B1 paths passed actual draft rules on the bytes named by their final receipts; release scope unchanged.')
