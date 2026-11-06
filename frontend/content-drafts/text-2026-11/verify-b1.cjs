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
const koreanFile = path.join(frontend, 'scripts/lib/guidedKoreanB1Drafts.ts')
const pilot = fromFrontend(koreanFile).validateKoreanB1Draft
const spec = read(path.join(frontend, 'content-drafts/b1-native-2026-10/korean/specification.json'))
const evidence = read(path.join(__dirname, 'review/final-b1-gates.json')).paths
const candidates = read(path.join(__dirname, 'index.json')).paths.filter(row => row.level === 'B1')
assert.equal(evidence.length, candidates.length)
for (const row of candidates) {
  const bytes = fs.readFileSync(path.join(__dirname, row.file)), draft = JSON.parse(bytes)
  const receipt = evidence.find(item => item.path === row.file)
  assert.equal(receipt.sha256, crypto.createHash('sha256').update(bytes).digest('hex'), row.file)
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
