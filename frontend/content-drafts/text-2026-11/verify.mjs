// Verify only the saved offline text packet. No credentials, runtime writes, or audio.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const index = JSON.parse(readFileSync(resolve(here, 'index.json'), 'utf8'))
const keys = new Set()
const trophies = new Set()
const totals = { new: 0, revision: 0 }
const join = parts => parts.map(p => typeof p === 'string' ? p : p.answer).join('')
const render = ({ segments, blanks }) => segments.map(s => s.kind === 'text' ? s.text : blanks[s.index].answer).join('')

for (const row of index.paths) {
  const key = [row.language, row.level, row.path].join('/')
  assert(!keys.has(key), key); keys.add(key)
  assert(Object.hasOwn(totals, row.kind), key)
  assert.equal(Boolean(row.octoberSha256), row.kind === 'revision', key)
  const file = resolve(here, row.file)
  assert(file.startsWith(here + sep), key)
  const raw = readFileSync(file)
  assert.equal(createHash('sha256').update(raw).digest('hex'), row.sha256, key)
  if (row.evidence) assert(readFileSync(resolve(here, row.evidence)).length > 0, key)
  if (row.language === 'Korean' && row.level === 'B2' && row.path >= 5) {
    const taskBytes = readFileSync(resolve(here, row.assessment))
    assert.equal(createHash('sha256').update(taskBytes).digest('hex'), row.assessmentSha256, key)
    const review = JSON.parse(readFileSync(resolve(here, row.evidence)))
    assert.equal(review.lessonSha256, row.sha256, key)
    assert.equal(review.assessmentSha256, row.assessmentSha256, key)
    assert.equal(review.pathNumber, row.path, key)
    assert.equal(review.independent.lessonSha256, row.reviewedSourceSha256, key)
    if (row.state === 'offline text reviewed') {
      assert.equal(review.independentVerdict, 'PASS', key)
      assert.equal(review.fableDisposition, 'resolved', key)
    }
  }
  const d = JSON.parse(raw)
  assert.deepEqual([d.status,d.targetLanguage,d.level,d.pathNumber,d.lessons.length], ['draft',row.language,row.level,row.path,10], key)
  if (row.level === 'B1' && ['French','Portuguese'].includes(row.language) && row.path >= 6) {
    const plan = JSON.parse(readFileSync(resolve(here, '../b1-2026-10', row.language.toLowerCase() + '-plan.json')))
    const outline = plan.paths.find(p => p.pathNumber === row.path)
    assert.deepEqual(d.lessons.map(l => l.trophyWord.word), outline.lessons.map(l => l.trophy), key)
    for (const lesson of d.lessons) {
      assert.equal(lesson.pattern.examples[0].targetText, lesson.dialogue[1].targetText, lesson.slug)
      assert(!lesson.dialogue.some(t => t.targetText === lesson.pattern.examples[1].targetText), lesson.slug)
      const blanks = lesson.cloze.filter(part => typeof part !== 'string')
      const visibleCues = blanks.map(b => b.cue?.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(' ') ?? '')
      for (const {answer} of blanks) {
        const words = answer.toLowerCase().match(/[\p{L}\p{N}]+/gu).join(' ')
        assert(!visibleCues.some(cue => (' ' + cue + ' ').includes(' ' + words + ' ')), lesson.slug + ': visible cue reveals an answer')
      }
    }
    const review = JSON.parse(readFileSync(resolve(here, row.evidence)))
    assert.equal(review.language, row.language, key)
    assert.equal(review.pathNumber, row.path, key)
    assert.equal(review.lessonSha256, row.sha256, key)
    if (row.state === 'offline text reviewed') {
      for (const gate of [review.editorial, review.independent]) {
        assert.equal(gate.verdict, 'PASS', key)
        assert.equal(gate.sourceSha256, row.reviewedSourceSha256, key)
        assert.deepEqual(gate.lessonsRead.map(l => l.n), d.lessons.map((_, i) => i + 1), key)
      }
    }
  }
  assert.equal(new Set(d.lessons.map(l => l.slug)).size,10,key)
  for (const l of d.lessons) {
    const id = key + '/' + l.slug
    const turns = l.dialogue.map(t => t.targetText)
    assert.equal(turns.length, row.level === 'B1' ? 4 : 6, id)
    assert(turns.every(t => typeof t === 'string' && t.trim() === t && t.length), id)
    assert(l.terms.length>=6 && l.pattern.examples.length>=2, id)
    if (row.level === 'B1') {
      assert.equal(l.chunks.map(c => c.targetText).join(' '), turns[1], id)
      // In these sources a full sentence ending on a movable chip previously
      // let learners swap intact sentences and lose an otherwise correct answer.
      assert(!l.chunks.slice(0,-1).some(c => /[.!?]$/u.test(c.targetText)), id+': movable complete sentence')
      assert.equal(join(l.cloze), turns[3], id)
      assert.equal(l.recall.before+l.recall.answer+l.recall.after, turns[1], id)
    } else {
      assert.equal(render(l.cloze), turns[3], id)
      assert.equal(render(l.synthesis), turns[5], id)
      // Japanese written chunks may use a different spacing convention.
      const build = l.build.framePrefix + l.build.chunks.join(' ') + l.build.frameSuffix
      assert.equal(build.replace(/\s/gu,''), turns[1].replace(/\s/gu,''), id)
    }
    const token = (l.trophyWord?.word ?? l.trophy?.lemma).normalize('NFC').toLowerCase()
    const trophyKey = row.language+'/'+row.level+'/'+token
    assert(!trophies.has(trophyKey), id+': duplicate trophy '+token);trophies.add(trophyKey)
  }
  totals[row.kind]+=10
}
const scopes=JSON.parse(readFileSync(resolve(here,'planning/b2-authority-map.json'),'utf8'))
for(const doc of Object.values(scopes.documents)){
  const raw=readFileSync(resolve(here,doc.artifact))
  assert.equal(createHash('sha256').update(raw).digest('hex'),doc.artifactSha256,doc.artifact)
}
for(const row of index.paths){
  if(row.furtherExerciseReview){
    const report=JSON.parse(readFileSync(resolve(here,row.furtherExerciseReview),'utf8'))
    assert.equal(report.resultSha256,row.reviewedSourceSha256,row.file)
  }
  if(row.level==='B2'){
    const mapped=scopes.paths.find(p=>p.path===row.file)
    assert(mapped&&scopes.documents[mapped.authoritySha256]&&scopes.documents[mapped.trophyLedgerAuthoritySha256],row.file)
  }
}
console.log(keys.size+' distinct ten-lesson paths; '+totals.new+' newly written, '+totals.revision+' revised. File hashes and episode reconstruction passed.')
