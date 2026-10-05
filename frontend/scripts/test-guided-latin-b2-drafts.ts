/** Synthetic structural fixtures are not authored lessons and never authorize TTS. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { validateLatinB2Draft } from './lib/guidedLatinB2Drafts'
import type { LatinB2Evidence } from './lib/guidedLatinB2Drafts'

const contract = JSON.parse(fs.readFileSync('content-drafts/b2-2026-10/german/authoring-contract.json', 'utf8'))
const markers = ['Heute', 'Morgen', 'Nun', 'Hier', 'Dort', 'Grundsätzlich', 'Tatsächlich', 'Praktisch', 'Vermutlich', 'Offensichtlich']
function fixture(language: 'English' | 'Spanish' = 'English') {
  const draft = structuredClone(contract.exemplar)
  draft.specRef.pathSpecSha256 = 'a'.repeat(64)
  draft.specRef.ledgerSha256 = 'b'.repeat(64)
  const evidence: LatinB2Evidence = { pathSpecSha256: 'a'.repeat(64), ledgerSha256: 'b'.repeat(64), trophies: [], earlierTrophies: Array.from({ length: 100 }, (_, i) => `reserved${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + i % 26)}`) }
  draft.lessons = markers.map((marker, i) => {
    const lesson = structuredClone(contract.exemplar.lessons[0])
    lesson.lessonNumber = i + 1
    lesson.slug = `synthetic-${marker.toLowerCase().replace('ä', 'a').replace('ö', 'o')}`
    const opening = lesson.dialogue[0].targetText
    lesson.dialogue[0].targetText = `${marker}: ${opening}`
    lesson.sceneCaption.en = lesson.sceneCaption.en.replace(opening, lesson.dialogue[0].targetText)
    const first = lesson.dialogue[1].targetText
    lesson.dialogue[1].targetText = `${marker}, ${first}`
    lesson.build.framePrefix = `${marker}, ${lesson.build.framePrefix}`
    lesson.recall.before = `${marker}, ${lesson.recall.before}`
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
  // Translate schema metadata only: target strings remain deliberately artificial structural material.
  // These fixtures are not English/Spanish curricula and are never TTS inputs.
  const bases = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(bases)
    if (!value || typeof value !== 'object') return value
    const record = value as Record<string, unknown>
    if (Object.keys(record).join(',') === 'en') return language === 'English' ? { de: record.en } : { de: record.en, en: record.en }
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, bases(item)]))
  }
  const converted = bases(draft) as typeof draft
  converted.targetLanguage = language
  converted.targetLanguageCode = language === 'English' ? 'en-US' : 'es-ES'
  converted.authoredBaseLanguage = 'German'
  for (const lesson of converted.lessons) {
    lesson.registerPlan.registers = Array(3).fill(language === 'English' ? 'formal' : 'usted')
    for (const turn of lesson.dialogue) if (turn.speaker === 'you') turn.register = lesson.registerPlan.registers[0]
    if (language === 'Spanish') {
      const oldOpening = lesson.dialogue[0].targetText
      for (const turn of lesson.dialogue) if (turn.targetText.includes('?')) turn.targetText = '¿' + turn.targetText
      lesson.sceneCaption.de = lesson.sceneCaption.de.replace(oldOpening, lesson.dialogue[0].targetText)
      lesson.sceneCaption.en = lesson.sceneCaption.en.replace(oldOpening, lesson.dialogue[0].targetText)
    }
  }
  for (let i = 0; i < 10; i++) evidence.trophies.push({ pathNumber: 2, lessonNumber: i + 1, lemma: `later${markers[i].toLowerCase()}`, familyKey: `later${markers[i].toLowerCase()}`, pos: 'noun' })
  return { draft: converted, evidence }
}
const positive = fixture()
assert.equal(validateLatinB2Draft(positive.draft, positive.evidence).lessons.length, 10)
assert.equal(validateLatinB2Draft(fixture('Spanish').draft, fixture('Spanish').evidence).lessons.length, 10)
let mutations = 0
function rejects(label: string, mutate: (data: ReturnType<typeof fixture>) => void, reason?: RegExp) {
  const value = fixture()
  mutate(value)
  if (reason) assert.throws(() => validateLatinB2Draft(value.draft, value.evidence), reason, label)
  else assert.throws(() => validateLatinB2Draft(value.draft, value.evidence), label)
  mutations++
}
rejects('No partial paths', x => x.draft.lessons.pop())
rejects('No source hash substitutions', x => { x.evidence.pathSpecSha256 = 'c'.repeat(64) }, /fingerprint/)
rejects('No unknown root fields', x => { x.draft.selfCheck = 'not evidence' })
rejects('No unsupported target shortcuts', x => { x.draft.targetLanguage = 'Japanese' })
rejects('No speaker inversion', x => { x.draft.lessons[0].dialogue[2].speaker = 'you' }, /Speakers/)
rejects('No absent sixth turn', x => x.draft.lessons[0].dialogue.pop())
rejects('No unstated register shift', x => { x.draft.lessons[0].dialogue[3].register = 'informal' }, /metadata/)
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
rejects('No corpus trophy reuse', x => { x.evidence.earlierTrophies.push(x.draft.lessons[0].trophy.lemma) }, /collides/)
rejects('No missing trophy surface', x => { x.draft.lessons[0].trophy.surface = 'Zebrastreifen' }, /surface absent/)
rejects('No fake review completion', x => { x.draft.lessons[0].review.flags.argumentCoherent = true }, /claim completed/)
rejects('No false native-human claim', x => { x.draft.lessons[0].review.nativeStatus = 'human-reviewed' })
rejects('No later dialogue in scene', x => { x.draft.lessons[0].sceneCaption.de += x.draft.lessons[0].dialogue[2].targetText }, /reveals/)
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
for (const pair of [['Different', 'different!'], ['We will', 'we  will'], ['it’s', "it's"]]) {
  rejects('No normalization-equivalent choices', x => { x.draft.lessons[0].recall.fallbackChoices = ['andererseits', pair[0], pair[1], 'obwohl'] }, /one accepted choice/)
}
rejects('No internal newlines in speech', x => { x.draft.lessons[0].dialogue[2].targetText = x.draft.lessons[0].dialogue[2].targetText.replace('Euro', 'Euro\n') }, /controls/)
rejects('No TTS annotation instructions', x => { x.draft.lessons[0].dialogue[2].targetText += ' [laughing]' }, /annotations/)
rejects('No informal provenance date', x => { x.draft.authoring.date = 'yesterday' }, /ISO calendar/)
rejects('No impossible provenance date', x => { x.draft.authoring.date = '2026-02-30' }, /ISO calendar/)

rejects('No mismatched target locale', x => { x.draft.targetLanguageCode = 'es-ES' }, /language\/code/)
rejects('No English explanation leakage', x => { x.draft.lessons[0].title.en = 'Extra base' }, /explanation locales/)
rejects('No missing reserved B1 evidence', x => { x.evidence.earlierTrophies = [] }, /Reserved B1/)
rejects('No omitted later allocation', x => { x.evidence.trophies.pop() }, /twenty/)
rejects('No reordered allocation', x => { x.evidence.trophies[11].lessonNumber = 1 }, /ordered/)
rejects('No cross-path family collision', x => { x.evidence.trophies[10].familyKey = x.evidence.trophies[0].lemma }, /another family/)
rejects('No German register in Latin target', x => { x.draft.lessons[0].registerPlan.registers.fill('Sie') })
rejects('No early relay', x => { x.draft.lessons[0].dialogue[5].move = 'relay' }, /Relay/)
rejects('No hidden controls in explanation', x => { x.draft.lessons[0].title.de += '\u200b' }, /controls/)
const spanish = fixture('Spanish')
delete spanish.draft.lessons[0].title.en
assert.throws(() => validateLatinB2Draft(spanish.draft, spanish.evidence), /explanation locales/)
rejects('No English canonical em dash', x => { x.draft.lessons[0].dialogue[2].targetText += ' —' }, /em dashes/)
for (const mutation of ['trophy', 'substring', 'opening', 'closing'] as const) {
  const value = fixture('Spanish'), lesson = value.draft.lessons[0]
  if (mutation === 'trophy') lesson.speak[2].requiredTokens = lesson.speak[2].requiredTokens.filter((token: string) => token !== lesson.trophy.surface)
  if (mutation === 'substring') lesson.build.distractors[0] = lesson.build.chunks.find((chunk: string) => chunk.includes(' ')).split(' ')[0]
  if (mutation === 'opening') lesson.dialogue[2].targetText = lesson.dialogue[2].targetText.replace('¿', '')
  if (mutation === 'closing') lesson.dialogue[2].targetText = lesson.dialogue[2].targetText.replace('?', '')
  assert.throws(() => validateLatinB2Draft(value.draft, value.evidence), /trophy surface|substring|punctuation/, mutation)
  mutations++
}
const apostrophe = fixture(), apostropheLesson = apostrophe.draft.lessons[0]
const oldAnswer = apostropheLesson.cloze.blanks[0].answer
apostropheLesson.dialogue[3].targetText = apostropheLesson.dialogue[3].targetText.replace(oldAnswer, 'We’re')
apostropheLesson.cloze.blanks[0].answer = 'We’re'
apostropheLesson.cloze.blanks[0].acceptedAnswers = ['We’re']
for (const term of apostropheLesson.terms) if (term.targetText.toLowerCase() === oldAnswer.toLowerCase()) term.targetText = 'We’re'
for (const target of apostropheLesson.speak) if (target.turnIndex === 3) {
  target.requiredTokens = target.requiredTokens.map((token: string) => token.toLowerCase() === oldAnswer.toLowerCase() ? 'We’re' : token)
}
assert.throws(() => validateLatinB2Draft(apostrophe.draft, apostrophe.evidence), /straight-apostrophe/)
apostropheLesson.cloze.blanks[0].acceptedAnswers.push("We're")
assert.equal(validateLatinB2Draft(apostrophe.draft, apostrophe.evidence).lessons.length, 10)
console.log(`PASS: English/Spanish B2 structural gate; two synthetic targets and explicit apostrophe variants; ${mutations + 2} rejection cases. No semantic or runtime approval.`)
