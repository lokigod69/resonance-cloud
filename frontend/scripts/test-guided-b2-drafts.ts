/** Synthetic structural fixtures are not authored lessons and never authorize TTS. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring'
import { formatGuidedLessonId, validateGermanB2Draft } from './lib/guidedB2Drafts'
import type { B2Evidence } from './lib/guidedB2Drafts'

const contract = JSON.parse(fs.readFileSync('content-drafts/b2-2026-10/german/authoring-contract.json', 'utf8'))
const markers = ['Heute', 'Morgen', 'Nun', 'Hier', 'Dort', 'Grundsätzlich', 'Tatsächlich', 'Praktisch', 'Vermutlich', 'Offensichtlich']
function fixture() {
  const draft = structuredClone(contract.exemplar)
  draft.specRef.pathSpecSha256 = 'a'.repeat(64)
  draft.specRef.ledgerSha256 = 'b'.repeat(64)
  const evidence: B2Evidence = { pathSpecSha256: 'a'.repeat(64), ledgerSha256: 'b'.repeat(64), trophies: [] }
  draft.lessons = markers.map((marker, i) => {
    const lesson = structuredClone(contract.exemplar.lessons[0])
    lesson.lessonNumber = i + 1
    lesson.slug = `synthetic-${marker.toLowerCase().replace('ä', 'a').replace('ö', 'o')}`
    const opening = lesson.dialogue[0].targetText
    lesson.dialogue[0].targetText = `${marker}: ${opening}`
    lesson.sceneCaption.en = lesson.sceneCaption.en.replace(opening, lesson.dialogue[0].targetText)
    const first = lesson.dialogue[1].targetText
    lesson.dialogue[1].targetText = `${marker} — ${first}`
    lesson.build.framePrefix = `${marker} — ${lesson.build.framePrefix}`
    lesson.recall.before = `${marker} — ${lesson.recall.before}`
    lesson.pattern.examples[0].targetText = lesson.dialogue[1].targetText
    const lemma = `Probewort${marker.toLowerCase()}`
    lesson.dialogue[5].targetText = lesson.dialogue[5].targetText.replace('Zeitgewinn', lemma)
    for (const part of lesson.synthesis.segments) if (part.kind === 'text') part.text = part.text.replace('Zeitgewinn', lemma)
    for (const term of lesson.terms) term.targetText = term.targetText.replace('Zeitgewinn', lemma)
    lesson.speak[2].requiredTokens = lesson.speak[2].requiredTokens.map((t: string) => t === 'Zeitgewinn' ? lemma : t)
    lesson.trophy = { ...lesson.trophy, lemma, familyKey: lemma, surface: lemma, pos: 'noun',
      example: { targetText: `Das ${lemma} gehört nur zu dieser künstlichen Testdatei.`, base: { en: 'Synthetic test vocabulary only.' } } }
    evidence.trophies.push({ pathNumber: 1, lessonNumber: i + 1, lemma, familyKey: lemma, pos: 'noun' })
    return lesson
  })
  return { draft, evidence }
}
const positive = fixture()
assert.equal(validateGermanB2Draft(positive.draft, positive.evidence).lessons.length, 10)
let mutations = 0
function rejects(label: string, mutate: (data: ReturnType<typeof fixture>) => void, reason?: RegExp) {
  const value = fixture()
  mutate(value)
  if (reason) assert.throws(() => validateGermanB2Draft(value.draft, value.evidence), reason, label)
  else assert.throws(() => validateGermanB2Draft(value.draft, value.evidence), label)
  mutations++
}
rejects('No partial paths', x => x.draft.lessons.pop())
rejects('No source hash substitutions', x => { x.evidence.pathSpecSha256 = 'c'.repeat(64) }, /fingerprint/)
rejects('No unknown root fields', x => { x.draft.selfCheck = 'not evidence' })
rejects('No unsupported target shortcuts', x => { x.draft.targetLanguage = 'Japanese' })
rejects('No speaker inversion', x => { x.draft.lessons[0].dialogue[2].speaker = 'you' }, /Speakers/)
rejects('No absent sixth turn', x => x.draft.lessons[0].dialogue.pop())
rejects('No unstated register shift', x => { x.draft.lessons[0].dialogue[3].register = 'du' }, /metadata/)
rejects('No repeated rhetorical move', x => { x.draft.lessons[0].dialogue[3].move = 'compare' }, /distinct/)
rejects('No truncated build', x => { x.draft.lessons[0].build.framePrefix = '' }, /reconstruction/)
rejects('No duplicate chips', x => { x.draft.lessons[0].build.distractors[0] = x.draft.lessons[0].build.chunks[0] }, /distinct/)
rejects('No duplicate blank reference', x => { x.draft.lessons[0].cloze.segments[2].index = 0 }, /once in order/)
rejects('No missing closing reply audio text', x => { x.draft.lessons[0].synthesis.segments[1].text += 'anders' }, /Cloze reconstruction/)
rejects('No form blank without cue', x => { delete x.draft.lessons[0].cloze.blanks[1].cue }, /cues/)
rejects('No two accepted choices', x => { x.draft.lessons[0].cloze.blanks[2].acceptedAnswers.push('deshalb') }, /one accepted/)
rejects('No speech target dropped', x => { x.draft.lessons[0].speak[2].turnIndex = 3 }, /Speak/)
rejects('No speech token absent from target', x => { x.draft.lessons[0].speak[0].requiredTokens[0] = 'Zebrastreifen' }, /speech tokens/)
rejects('No unattested term', x => { x.draft.lessons[0].terms[0].targetText = 'Zebrastreifen' }, /term absent/)
rejects('No unallocated trophy', x => { x.draft.lessons[0].trophy.lemma = 'Zeit' }, /allocation/)
rejects('No corpus trophy reuse', x => { x.evidence.earlierTrophies = [x.draft.lessons[0].trophy.lemma] }, /collides/)
rejects('No missing trophy surface', x => { x.draft.lessons[0].trophy.surface = 'Zebrastreifen' }, /surface absent/)
rejects('No fake review completion', x => { x.draft.lessons[0].review.flags.argumentCoherent = true }, /claim completed/)
rejects('No false native-human claim', x => { x.draft.lessons[0].review.nativeStatus = 'human-reviewed' })
rejects('No later dialogue in scene', x => { x.draft.lessons[0].sceneCaption.en += x.draft.lessons[0].dialogue[2].targetText }, /reveals/)
rejects('No build token fragments', x => {
  x.draft.lessons[0].build.framePrefix += 'ander'
  x.draft.lessons[0].build.chunks[0] = 'erseits'
}, /splits a lexical token/)
rejects('No cloze token fragments', x => {
  const exercise = x.draft.lessons[0].cloze
  exercise.blanks[0].answer = 'Zug'; exercise.blanks[0].acceptedAnswers = ['Zug']
  exercise.segments[1].text = `egeben${exercise.segments[1].text}`
}, /splits a lexical token/)
rejects('No recall token fragments', x => {
  const recall = x.draft.lessons[0].recall
  recall.answer = 'ander'; recall.acceptedAnswers = ['ander']; recall.fallbackChoices[0] = 'ander'; recall.after = `erseits${recall.after}`
}, /splits a lexical token/)
rejects('No punctuation-only cloze answer', x => {
  const exercise = x.draft.lessons[0].cloze
  exercise.blanks[0].answer = ','; exercise.blanks[0].acceptedAnswers = [',']
  exercise.segments[1].text = exercise.segments[1].text.slice(1)
  exercise.segments.unshift({ kind: 'text', text: 'Zugegeben' })
}, /Invalid blank answer/)
rejects('No punctuation-only recall answer', x => {
  const lesson = x.draft.lessons[0], first = lesson.dialogue[1].targetText, at = first.indexOf(',')
  lesson.recall = { before: first.slice(0, at), answer: ',', acceptedAnswers: [','], after: first.slice(at + 1), fallbackChoices: [',', ';', '!', ':'] }
}, /Invalid recall answer/)
rejects('No inner-word terms', x => { x.draft.lessons[0].terms[0].targetText = 'inerseit' }, /Complete term absent/)
for (const pair of [['andererseits', 'andererseits!'], ['Weite Wege', 'Weite\tWege'], ['Möglichkeit', 'Moeglichkeit'], ['Andererseits', 'andererseits'], ['Straße', 'Strasse']]) {
  rejects('No normalization-equivalent choices', x => { x.draft.lessons[0].recall.fallbackChoices = ['andererseits', pair[0], pair[1], 'obwohl'] }, /one accepted choice/)
}
rejects('No internal newlines in speech', x => { x.draft.lessons[0].dialogue[2].targetText = x.draft.lessons[0].dialogue[2].targetText.replace('Euro', 'Euro\n') }, /controls/)
rejects('No TTS annotation instructions', x => { x.draft.lessons[0].dialogue[2].targetText += ' [laughing]' }, /annotations/)
rejects('No informal provenance date', x => { x.draft.authoring.date = 'yesterday' }, /ISO calendar/)
rejects('No impossible provenance date', x => { x.draft.authoring.date = '2026-02-30' }, /ISO calendar/)

const germanB1 = GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === 'German' && lesson.level === 'B1')
assert.equal(germanB1.length, 100)
for (const lesson of germanB1) {
  const match = /^german-b1-practical-(\d+)-(\d{3})-(.+)$/.exec(lesson.id)
  assert.ok(match, lesson.id)
  assert.equal(formatGuidedLessonId('german', 'b1', Number(match[1]), lesson.lessonNumber, match[3]), lesson.id)
}
assert.equal(formatGuidedLessonId('german', 'b2', 2, 1, 'rechnung-weicht-ab'), 'german-b2-practical-2-011-rechnung-weicht-ab')
assert.throws(() => formatGuidedLessonId('german', 'b2', 0, 1, 'invalid'))
console.log(`PASS: German B2 structural gate; ${mutations} rejection cases; all 100 frozen German B1 IDs match the new formatter. Synthetic fixtures do not establish language quality.`)
