// Run with tsx from frontend. Only the offline archive and local authoring sources are read.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire, Module } = require('node:module')
const { createHash } = require('node:crypto')
const front = path.resolve(__dirname, '../..')
const read = file => JSON.parse(fs.readFileSync(file))
const here = (...parts) => path.join(__dirname, ...parts)
const source = path.join(front, 'scripts/lib/guidedKoreanB2Drafts.ts')
const load = createRequire(source)
const native = new Module(source, module)
native.paths = Module._nodeModulePaths(path.dirname(source))
const helpers = 'target, baseText, checkBlanks, checkRegister, choiceSet, accepted, norm, token, boundary, STOP, EMPTY, TURN_BOUNDS, PERMITTED_REMAINDERS'
const code = fs.readFileSync(source, 'utf8') + '\nexport { ' + helpers + ' };'
native._compile(load('esbuild').transformSync(code, {loader:'ts', format:'cjs'}).code, source)
const g = native.exports
const { z } = load('zod')
const pilot = g.koreanB2DraftSchema
const nativeLesson = pilot.shape.lessons.element
const role = nativeLesson.shape.interlocutors.element.extend({voiceRole:z.enum(['A', 'B'])})
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const spine = read(here('planning/b2-objectives.json')).paths
const ledger = read(here('planning/korean-b2-p5-p10-trophies.json')).rows
assert.equal(ledger.length, 60)
const pilotBook = require('../../src/data/guidedLessonsAuthoring.ts').GUIDED_LESSONS
const active = pilotBook.filter(l => l.targetLanguage === 'Korean' && ['A1','A2'].includes(l.level))
assert.equal(active.length, 200)
const occupied = new Set(active.flatMap(l => Object.values(l.vibeVariants).map(v => v.trophyWord.word)))
for (const [level, paths, october] of [['b1', 10, 'b1-native-2026-10'], ['b2', 4, 'b2-2026-10']]) {
  for (let p = 1; p <= paths; p++) {
    const dir = p <= 2 ? here('..', october) : here(level)
    const lessons = read(path.join(dir, 'korean', 'p' + p + '.json')).lessons
    assert.equal(lessons.length, 10)
    for (const l of lessons) {
      const keys = l.trophy ? [l.trophy.lemma, l.trophy.surface, l.trophy.familyKey] : [l.trophyWord.word]
      keys.forEach(k => occupied.add(k))
    }
  }
}

function checkLesson(l, objective, row) {
  const turns = l.dialogue, texts = turns.map(t => t.targetText), first = texts[1]
  const partners = l.interlocutors
  const p = objective.pathNumber
  assert.equal(turns.length, 6)
  assert.equal(new Set(texts).size, 6)
  assert(partners.length >= 1 && partners.length <= (p === 6 || p === 7 ? 2 : 1))
  assert.deepEqual(partners.map(r => r.voiceRole), ['A','B'].slice(0, partners.length))
  assert(partners.every(r => r.register === 'haeyo'), 'capstone uses the reviewed 해요체 option')
  assert.equal(new Set(partners.map(r => r.id)).size, partners.length)
  assert(partners.every(r => r.id && turns.some(t => t.interlocutorId === r.id)))
  if (p === 6) {
    assert.equal(partners.length, 2, 'relay needs both interlocutors')
    assert.deepEqual([0,2,4].map(i => turns[i].interlocutorId), [partners[0].id, partners[0].id, partners[1].id], 'relay must change listener')
    assert.notDeepEqual(partners[0].role, partners[1].role)
  }
  for (const base of [l.title, l.situation, l.sceneCaption, ...partners.map(r => r.role)]) g.baseText(base)
  for (const [i, t] of turns.entries()) {
    assert.equal(t.speaker, i % 2 ? 'you' : 'them')
    const partner = partners.find(r => r.id === t.interlocutorId)
    if (i % 2 === 0) assert(partner, 'unknown interlocutor')
    else assert(objective.moveWhitelist.includes(t.move), 'unlicensed rhetorical move ' + t.move)
    g.target(t.targetText)
    g.checkRegister(t.targetText, false, 'REGISTER')
    g.baseText(t.base)
    const words = t.targetText.split(' ').length, [lo, hi] = g.TURN_BOUNDS[i]
    assert(words >= lo && words <= hi, 'turn length ' + words + ' at ' + i)
  }
  const learners = turns.filter(t => t.speaker === 'you')
  assert.equal(new Set(learners.map(t => t.move)).size, 3, 'independent learner moves')
  assert(l.sceneCaption.de.includes('„' + texts[0] + '“') && l.sceneCaption.en.includes('“' + texts[0] + '”'))
  for (const caption of [...Object.values(l.situation), ...Object.values(l.sceneCaption)]) assert(texts.slice(1).every(t => !caption.includes(t)))

  const b = l.build, focus = b.chunks.join(' '), chips = [...b.chunks, ...b.distractors]
  assert.equal(b.framePrefix + focus + b.frameSuffix, first, 'build reconstruction')
  assert(b.chunks.length >= 5 && b.chunks.length <= 8 && b.distractors.length === 2)
  assert(g.token(focus).length >= 5 && g.token(focus).length <= 9)
  assert.equal(new Set(chips.map(g.norm)).size, chips.length, 'duplicate chip')
  for (const chip of chips) {
    g.target(chip)
    assert(g.token(chip).length <= 3 && g.token(chip).some(x => !g.EMPTY.has(x)))
  }
  let offset = b.framePrefix.length
  for (const chunk of b.chunks) {
    assert(g.boundary(first, offset) && g.boundary(first, offset + chunk.length), 'split Korean word')
    offset += chunk.length + 1
  }
  assert(b.distractors.every(d => !g.whole(first, d)))
  g.checkBlanks(l.cloze, texts[3], 2, 4)
  g.checkBlanks(l.synthesis, texts[5], 1, 2)
  const trophy = l.trophy, r = l.recall
  for (const k of ['lemma','familyKey','pos']) assert.equal(trophy[k], row[k], 'trophy allocation')
  assert.equal(trophy.turnIndex, 1)
  assert.deepEqual(trophy.example, {targetText:first, base:turns[1].base})
  assert(g.token(first).includes(trophy.surface) && trophy.surface.startsWith(trophy.lemma))
  const ending = trophy.surface.slice(trophy.lemma.length)
  if (ending) assert(trophy.remainder?.includes(ending) && trophy.remainder.every(x => g.PERMITTED_REMAINDERS.has(x)))
  assert.equal(r.before + r.answer + r.after, first)
  assert.equal(r.answer, trophy.surface)
  g.baseText(trophy.base); g.baseText(trophy.whyThisWord)
  g.accepted(r.answer, r.acceptedAnswers)
  g.choiceSet(r.answer, r.fallbackChoices, r.acceptedAnswers, 'RECALL_CHOICES')
  assert(r.fallbackChoices.every(x => g.token(x).length === 1))

  const pat = l.pattern, [model, transfer] = pat.examples
  g.baseText(pat.label); g.baseText(pat.rule)
  assert.equal(model.targetText, first, 'early model must leave the challenge and final steer for later')
  assert.equal(pat.moveType, turns[1].move)
  assert.deepEqual(model.base, turns[1].base)
  assert(transfer && !texts.includes(transfer.targetText), 'distinct transfer example')
  for (const ex of pat.examples) {
    g.target(ex.targetText); g.baseText(ex.base)
    assert(ex.highlights.length && ex.highlights.every(s => s && ex.targetText.includes(s)))
  }
  for (const early of [...Object.values(pat.label), ...Object.values(pat.rule), ...Object.values(l.title), transfer.targetText]) {
    assert(texts.slice(2).every(late => !early.includes(late)), 'early instruction quotes a later turn')
  }
  const spoken = [...texts, ...pat.examples.map(x => x.targetText)]
  const terms = l.terms
  assert(terms.length >= 8 && terms.length <= 10 && new Set(terms.map(t => g.norm(t.targetText))).size === terms.length)
  assert(terms.filter(t => ['frame','connector'].includes(t.kind)).length >= 2)
  assert(terms.filter(t => ['noun','verb','adverb','adjective'].includes(t.kind)).length >= 3)
  for (const t of terms) {
    g.target(t.targetText); g.baseText(t.base)
    assert(spoken.some(s => g.whole(s, t.targetText)), 'unattested term ' + t.targetText)
  }
  assert.deepEqual(l.speak.map(s => s.turnIndex), [1,3,5])
  for (const s of l.speak) {
    const tokens = s.requiredTokens
    assert(tokens.length >= 2 && tokens.length <= 4 && new Set(tokens).size === tokens.length)
    assert(tokens.every(w => !g.STOP.has(w) && g.token(texts[s.turnIndex]).includes(w)))
    if (s.turnIndex === 1) assert(tokens.filter(w => g.token(focus).includes(w)).length >= 2)
  }
  for (const tag of l.carrierTags || []) {
    const learnerUses = learners.some(t => t.targetText.includes(tag.surface))
    assert(tag.surface && (tag.status === 'productive' ? learnerUses : !learnerUses && turns.some(t => t.speaker === 'them' && t.targetText.includes(tag.surface))), 'carrier role ' + tag.surface)
  }
}

const openings = new Set(), slugs = new Set(), seenPrompts = new Set()
const capstones = new Map()
// Two explicit paths allow authors to run the same checks before archive selection.
const [preview, companion] = process.argv.slice(2)
assert.equal(Boolean(preview), Boolean(companion), 'supply both the lesson and assessment file')
const range = preview ? spine.filter(o => o.pathNumber === read(preview).pathNumber) : spine.slice(4,10)
assert(range.length && range.every(o => o.pathNumber >= 5 && o.pathNumber <= 10))
for (const objective of range) {
  const p = objective.pathNumber, file = preview || here('b2/korean/p' + p + '.json'), draft = read(file)
  assert.equal(draft.pathNumber, p); assert.equal(draft.slug, objective.slug)
  assert.equal(draft.targetLanguage, 'Korean'); assert.equal(draft.level, 'B2'); assert.equal(draft.status, 'draft')
  assert.equal(draft.targetLanguageCode, 'ko-KR'); assert.equal(draft.authoredBaseLanguage, 'German')
  assert.equal(draft.lessons.length, 10)
  capstones.set(p, draft.lessons)
  assert.equal(pilot.safeParse(draft).success, false, 'new paths remain outside the recorder pilot')
  const schema = nativeLesson.extend({episodeShape:z.enum(objective.shapes), interlocutors:z.array(role)})
  const assessment = read(companion || here('assessment/korean-b2/p' + p + '.json'))
  assert.equal(assessment.pathNumber, p); assert.equal(assessment.lessons.length, 10)
  for (const [i, l] of draft.lessons.entries()) {
    try {
      schema.parse(l); assert.equal(l.lessonNumber, i + 1)
      const row = ledger[(p - 5) * 10 + i]
      assert.equal(row.pathNumber, p); assert.equal(row.lessonNumber, i + 1)
      checkLesson(l, objective, row)
      const keys = new Set([l.trophy.lemma, l.trophy.familyKey, l.trophy.surface])
      for (const k of keys) { assert(!occupied.has(k), 'vocabulary collision ' + k); occupied.add(k) }
      assert(!openings.has(l.dialogue[1].targetText)); openings.add(l.dialogue[1].targetText)
      assert(!slugs.has(l.slug)); slugs.add(l.slug)
      const probe = assessment.lessons[i]
      assert.equal(probe.lessonNumber, i + 1); assert([1,3,5].includes(probe.witnessTurnIndex))
      assert.equal(probe.witnessKo, l.dialogue[probe.witnessTurnIndex].targetText)
      g.baseText(probe.prompt); g.baseText(probe.criteria)
      assert(!seenPrompts.has(probe.prompt.en)); seenPrompts.add(probe.prompt.en)
      for (const v of [...Object.values(probe.prompt), ...Object.values(probe.criteria)]) assert(!v.includes(probe.witnessKo))
      if (i === 0) {
        const bad = structuredClone(l)
        bad.dialogue[1].move = 'unlicensed'
        assert.throws(() => checkLesson(bad, objective, row), /unlicensed rhetorical move/)
        if (p === 6) {
          const swapped = structuredClone(l)
          swapped.dialogue[4].interlocutorId = swapped.dialogue[0].interlocutorId
          assert.throws(() => checkLesson(swapped, objective, row))
        }
        const broken = structuredClone(l.cloze)
        broken.segments.push({kind:'text', text:'다'})
        assert.throws(() => g.checkBlanks(broken, l.dialogue[3].targetText, 2, 4), /BLANK_RECONSTRUCTION/)
        assert.throws(() => checkLesson(l, objective, {...row, lemma:'다른말'}), /trophy allocation/)
      }
    } catch (error) { throw new Error('Korean B2 P' + p + ' L' + (i+1) + ': ' + error.message, {cause:error}) }
  }
  console.log('Korean B2 P' + p + ': 10 lessons, 10 transfer tasks · ' + hash(file))
}
// The two floor-management phrases are heard in P7 before the learner uses them in P9.
for (const [lesson, turn, phrase] of [[8,4,'말씀 중에 죄송한데요'], [9,2,'끝까지 들어 주시겠어요?']]) {
  if (capstones.has(7)) {
    const modeled = capstones.get(7)[lesson-1].dialogue[turn]
    assert.equal(modeled.speaker, 'them'); assert(modeled.targetText.includes(phrase))
  }
  if (capstones.has(9)) assert(capstones.get(9).slice(0,3).some(l => l.dialogue.some(t => t.speaker === 'you' && t.targetText.includes(phrase))))
}
console.log((10 * range.length) + ' lessons / ' + (60 * range.length) + ' turns checked against the path objectives and 340 earlier lessons.')
