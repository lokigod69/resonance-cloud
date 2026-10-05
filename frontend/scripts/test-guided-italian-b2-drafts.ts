/** Italian B2 offline gate probes: genuine V4 authority bytes, actual earlier-trophy ledger, exact staged P1/P2 sources. Run from frontend. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { italianB2DraftSchema, validateItalianB2Draft, ITALIAN_B2_AUTHORITY } from './lib/guidedItalianB2Drafts'
import type { ItalianB2Draft, ItalianB2Evidence } from './lib/guidedItalianB2Drafts'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring'

const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const fold = (s: string) => s.normalize('NFC').toLocaleLowerCase('it-IT')
const root = path.resolve('content-drafts')
// Exact authority bytes: a staged copy may carry LF or CRLF; only the variant matching the pinned fingerprint counts as evidence.
function authorityBytes(file: string, expected: string, label: string): string {
  const raw = fs.readFileSync(file, 'utf8')
  const found = [raw, raw.replace(/\r?\n/g, '\r\n'), raw.replace(/\r\n/g, '\n')].find(c => hash(c) === expected)
  assert.ok(found, `${label}: no line-ending variant of ${file} matches the pinned fingerprint ${expected}`)
  return found as string
}
const specificationSource = authorityBytes(path.join(root, 'b2-2026-10/italian/specification.json'), ITALIAN_B2_AUTHORITY.specificationSha256, 'V4 Italian specification')
const prerequisitesSource = authorityBytes(path.join(root, 'b2-2026-10/latin-prerequisites.json'), ITALIAN_B2_AUTHORITY.prerequisitesSha256, 'Latin prerequisites')
const specification = JSON.parse(specificationSource)
type Prerequisite = { targetLanguage: string; frozenLessonCount: number; activeCorpusSha256: string; b1AllocationSha256: string; forbiddenTrophies: string[] }
const prerequisites = JSON.parse(prerequisitesSource) as Prerequisite[]
const prerequisite = prerequisites.find(r => r.targetLanguage === 'Italian')
assert.ok(prerequisite, 'Italian prerequisite record present')
assert.equal(specification.code, 'it-IT'); assert.equal(specification.trophyLedger.rows.length, 20)
// Actual earlier material: frozen Italian A1/A2 corpus plus the hundred reserved B1 rows, both pinned by the prerequisite record.
type Frozen = { targetLanguage: string; level: string; vibeVariants: Record<string, { trophyWord: { word: string } } | undefined> }
const frozen = (GUIDED_LESSONS as unknown as Frozen[]).filter(r => r.targetLanguage === 'Italian' && ['A1', 'A2'].includes(r.level))
assert.equal(frozen.length, 200); assert.equal(frozen.length, prerequisite.frozenLessonCount)
assert.equal(hash(JSON.stringify(frozen)), prerequisite.activeCorpusSha256, 'frozen Italian A1/A2 corpus is immutable')
const plan = JSON.parse(authorityBytes(path.join(root, 'b1-2026-10/italian-plan.json'), prerequisite.b1AllocationSha256, 'Italian B1 allocation'))
const reserved: string[] = plan.paths.flatMap((p: { lessons: Array<{ trophy: string }> }) => p.lessons.map(l => l.trophy))
assert.equal(reserved.length, 100)
const frozenWords = frozen.flatMap(l => Object.values(l.vibeVariants).flatMap(v => v ? [v.trophyWord.word] : []))
const earlierTrophies = [...frozenWords, ...reserved]
assert.equal(earlierTrophies.length, 300, 'two hundred frozen plus one hundred reserved strings')
const distinctEarlier = new Set(earlierTrophies.map(fold))
assert.equal(distinctEarlier.size, 296, 'four existing repeats collapse 300 earlier strings to 296 distinct')
assert.deepEqual([...distinctEarlier].sort(), [...new Set(prerequisite.forbiddenTrophies.map(fold))].sort(), 'actual corpora equal the pinned forbidden set')

const evidence = (): ItalianB2Evidence => ({
  specificationSource, specification: structuredClone(specification), pathSpecSha256: hash(specificationSource), ledgerSha256: hash(specificationSource),
  prerequisitesSource, prerequisites: structuredClone(prerequisites), prerequisitesSha256: hash(prerequisitesSource),
  trophies: structuredClone(specification.trophyLedger.rows), earlierTrophies: [...earlierTrophies],
})
const sources = { 1: fs.readFileSync(path.join(root, 'b2-2026-10/italian/p1.json'), 'utf8'), 2: fs.readFileSync(path.join(root, 'b2-2026-10/italian/p2.json'), 'utf8') }
type Lesson = ItalianB2Draft['lessons'][number]
type Fixture = { draft: ItalianB2Draft; evidence: ItalianB2Evidence }
function fixture(n: 1 | 2): Fixture { return { draft: italianB2DraftSchema.parse(JSON.parse(sources[n])), evidence: evidence() } }
let positives = 0, negatives = 0
function passes(label: string, data: Fixture) { assert.equal(validateItalianB2Draft(data.draft, data.evidence).lessons.length, 10, label); positives++ }
function rejects(label: string, mutate: (data: Fixture) => void, reason: RegExp, n: 1 | 2 = 1) {
  const data = fixture(n); mutate(data)
  assert.throws(() => validateItalianB2Draft(data.draft, data.evidence), reason, label); negatives++
}
// Coupled edits: keep every reconstruction consistent so only the targeted rule can fire.
function appendToTurn(l: Lesson, n: 1 | 3 | 5, suffix: string) {
  l.dialogue[n].targetText += suffix
  if (n === 1) { l.build.frameSuffix += suffix; l.recall.after += suffix }
  else { const ex = n === 3 ? l.cloze : l.synthesis, last = ex.segments[ex.segments.length - 1]; if (last.kind === 'text') last.text += suffix; else ex.segments.push({ kind: 'text', text: suffix }) }
  for (const e of l.pattern.examples) if (e.targetText + suffix === l.dialogue[n].targetText) e.targetText += suffix
}
function replaceInTurn(l: Lesson, n: 3 | 5, from: string, to: string) {
  const old = l.dialogue[n].targetText, next = old.replace(from, to); assert.notEqual(old, next, `turn ${n} contains ${from}`)
  l.dialogue[n].targetText = next
  const ex = n === 3 ? l.cloze : l.synthesis
  for (const s of ex.segments) if (s.kind === 'text') s.text = s.text.replace(from, to)
  for (const b of ex.blanks) if (b.answer.includes(from)) { b.answer = b.answer.replace(from, to); b.acceptedAnswers = [...new Set(b.acceptedAnswers.map(a => a.replace(from, to)))]; if (b.choices) b.choices = b.choices.map(c => c.replace(from, to)) }
  for (const e of l.pattern.examples) if (e.targetText === old) { e.targetText = next; e.highlights = e.highlights.map(h => h.replace(from, to)) }
  for (const t of l.terms) if (t.targetText === from) t.targetText = to
  const sp = l.speak.find(s => s.turnIndex === n)!, words = next.match(/[\p{L}]{5,}/gu) ?? []
  sp.requiredTokens = sp.requiredTokens.map(t => next.includes(t) ? t : words.find(w => !sp.requiredTokens.includes(w)) ?? t)
}
const blanksOf = (l: Lesson) => [...l.cloze.blanks, ...l.synthesis.blanks]
const apostropheRecall = (x: Fixture) => {
  const l = x.draft.lessons[0], first = l.dialogue[1].targetText, m = first.match(/[\p{L}]+['\u2019][\p{L}]+/u)
  assert.ok(m && m.index !== undefined, 'P1 L1 first reply carries an elision token')
  const answer = m[0], twin = answer.includes("'") ? answer.replace(/'/gu, '\u2019') : answer.replace(/\u2019/gu, "'")
  l.recall = { before: first.slice(0, m.index), answer, acceptedAnswers: [answer, twin], after: first.slice(m.index! + answer.length), fallbackChoices: [answer, 'inesistente', 'altrove', 'comunque'] }
  return l
}

passes('Exact staged Italian P1 (ten Lei/tu lessons) passes without source edits', fixture(1))
passes('Exact staged Italian P2 (ten Lei lessons) passes without source edits', fixture(2))
const participle = fixture(2)
participle.draft.lessons[0].dialogue[2].targetText = 'La fattura è stata emessa in base al preventivo firmato: quale riga esatta spiega la differenza?'
passes('Non-speaker essere + participle in an interlocutor turn is not a learner gender claim', participle)
const articleThem = fixture(1)
articleThem.draft.lessons[4].dialogue[2].targetText = 'La montagna aggiunge sempre escursioni e spostamenti. Le spese finali sono davvero più basse?'
passes('Sentence-initial La/Le articles in a tu interlocutor turn are not formal address', articleThem)
const articleYou = fixture(1)
replaceInTurn(articleYou.draft.lessons[4], 3, 'Con auto a noleggio e funivia', "La funivia e l'auto a noleggio costano;")
passes('Sentence-initial La article in a tu learner turn is not formal address', articleYou)
const acknowledged = fixture(2)
acknowledged.draft.lessons[6].review.acknowledgedWarnings.push({ code: 'IT-B2-CONGIUNTIVO-IMPERFETTO', reason: 'pensavo che costasse: embedded imperfect subjunctive confirmed native by content review, never blanked.' })
passes('Known Italian warning code with a stated reason is accepted', acknowledged)
const variants = fixture(1)
variants.draft.lessons[0].recall.acceptedAnswers.reverse()
passes('Accepted variant order is irrelevant', variants)
const elision = fixture(1); apostropheRecall(elision)
passes('Whole elision token with explicit typographic twin is a valid recall answer', elision)

rejects('No French metadata masquerade', x => { x.draft.targetLanguage = 'French' as never }, /Italian/)
rejects('No English locale masquerade', x => { x.draft.targetLanguageCode = 'en-US' as never }, /it-IT/)
rejects('No French register enum', x => { x.draft.lessons[0].registerPlan.registers[0] = 'vous' as never }, /Lei|tu/)
rejects('No tu in a Lei lesson plan', x => { x.draft.lessons[0].registerPlan.registers.fill('tu'); for (const t of x.draft.lessons[0].dialogue) if (t.speaker === 'you') t.register = 'tu' }, /Register allocation/)
rejects('No tu license anywhere in P2', x => { x.draft.lessons[6].registerPlan.registers.fill('tu'); for (const t of x.draft.lessons[6].dialogue) if (t.speaker === 'you') t.register = 'tu' }, /Register allocation/, 2)
rejects('No learner turn register drift', x => { x.draft.lessons[0].dialogue[1].register = 'tu' }, /metadata/)
rejects('No informal address in a Lei learner turn', x => { appendToTurn(x.draft.lessons[0], 3, ' tu') }, /Informal address/)
rejects('No formal address in a tu learner turn', x => { appendToTurn(x.draft.lessons[4], 5, ' Lei') }, /Formal address/)
rejects('No speaker-gender construction', x => { appendToTurn(x.draft.lessons[0], 3, ' e sono convinto') }, /speaker-gender/)
rejects('No deferred mica', x => { appendToTurn(x.draft.lessons[0], 5, ' mica') }, /mica/)
rejects('No excluded later carrier', x => { appendToTurn(x.draft.lessons[0], 3, ' inoltre') }, /excluded until a later/)
rejects('No band 7-10 carrier in a band 1-3 learner turn', x => { appendToTurn(x.draft.lessons[0], 3, ' in definitiva') }, /before its staging band/)
rejects('No recognition-only carrier in a band 1-3 learner turn', x => { appendToTurn(x.draft.lessons[1], 5, ' vale la pena') }, /before its staging band/)
rejects('No band 4-6 P2 carrier in P2 L1', x => { appendToTurn(x.draft.lessons[0], 5, ' di conseguenza') }, /before its staging band/, 2)
rejects('No missing synthesis carrier', x => { replaceInTurn(x.draft.lessons[0], 5, 'Tutto sommato', 'Insomma') }, /Required carrier absent from synthesis turn: tutto sommato/)
rejects('No unsupported warning code', x => { x.draft.lessons[0].review.acknowledgedWarnings.push({ code: 'FAKE-PASS', reason: 'Claimed approval is not source evidence.' }) }, /Unsupported warning/)
rejects('No short warning reason', x => { x.draft.lessons[0].review.acknowledgedWarnings.push({ code: 'IT-B2-LOWERCASE-LE', reason: 'ok' }) }, /Unsupported warning/)
rejects('No false native review', x => { x.draft.lessons[0].review.nativeStatus = 'human-reviewed' as never }, /unreviewed/)
rejects('No completed source flags', x => { x.draft.lessons[0].review.flags.carriersStaged = true }, /claim completed review/)
rejects('No reviewer rows in pending sources', x => { x.draft.lessons[0].review.reviewers.push({ role: 'native-human', id: 'fake', date: '2026-10-06' }) }, /claim completed review/)
rejects('No source self-check field', x => { (x.draft as unknown as Record<string, unknown>).selfCheck = 'PASS' }, /unrecognized/i)
rejects('No omitted English base', x => { delete (x.draft.lessons[0].title as { de: string; en?: string }).en }, /en|Required/)
rejects('No partial path', x => { x.draft.lessons.pop() }, /10|ten/)
rejects('No missing sixth turn', x => { x.draft.lessons[0].dialogue.pop() }, /6|six/)
rejects('No inverted roles', x => { x.draft.lessons[0].dialogue[2].speaker = 'you' }, /Speakers must alternate/)
rejects('No duplicate moves', x => { x.draft.lessons[0].dialogue[3].move = x.draft.lessons[0].dialogue[1].move }, /distinct moves/)
rejects('No path-two position move', x => { x.draft.lessons[0].dialogue[1].move = 'position' }, /licensed first move/, 2)
rejects('No relay in P1/P2', x => { x.draft.lessons[0].dialogue[5].move = 'relay' }, /forbidden relay/)
rejects('No mismatched interlocutor id', x => { x.draft.lessons[0].dialogue[2].interlocutorId = 'missing' }, /metadata/)
rejects('No out-of-bound turn', x => { x.draft.lessons[0].dialogue[2].targetText = 'Perché mai?' }, /length \d+ outside/)
rejects('No digits in voiced text', x => { x.draft.lessons[0].dialogue[2].targetText += ' Sono 200 euro.' }, /illegal canonical digits/)
rejects('No hidden controls', x => { x.draft.pathTitle.de += '\u200b' }, /controls/)
rejects('No decomposed canonical accent', x => { x.draft.lessons[4].trophy.surface = 'poiché'.normalize('NFD') }, /NFC/, 2)
rejects('No false specification filename', x => { x.draft.specRef.pathSpec = 'B2_ITALIAN_P1_P2_AUTHORING_SPEC.json' }, /path\/fingerprint/)
rejects('No draft hash substitution', x => { x.draft.specRef.pathSpecSha256 = 'a'.repeat(64) }, /path\/fingerprint/)
rejects('No embedded ledger hash substitution', x => { x.evidence.ledgerSha256 = 'a'.repeat(64) }, /ledger fingerprint/)
rejects('No evidence hash substitution', x => { x.evidence.pathSpecSha256 = 'a'.repeat(64) }, /source fingerprint/)
rejects('No parsed specification drift', x => { (x.evidence.specification as { code: string }).code = 'fr-FR' }, /parsed\/source drift/)
rejects('No new bytes authorized by a self-recomputed hash', x => { x.evidence.specificationSource += ' '; x.evidence.pathSpecSha256 = hash(x.evidence.specificationSource) }, /source fingerprint/)
rejects('No reserialization claimed as original bytes', x => { x.evidence.specificationSource = JSON.stringify(x.evidence.specification) }, /source fingerprint/)
rejects('No missing source bytes', x => { x.evidence.specificationSource = undefined as never }, /exact UTF-8 source/)
rejects('No prerequisite source drift', x => { x.evidence.prerequisitesSource += ' ' }, /prerequisites: source fingerprint/)
rejects('No parsed prerequisite drift', x => { (x.evidence.prerequisites as Prerequisite[]).find(r => r.targetLanguage === 'Italian')!.forbiddenTrophies.pop() }, /parsed\/source drift/)
rejects('No dummy hundred reservations', x => { x.evidence.earlierTrophies = Array.from({ length: 300 }, (_, i) => `finto${i}`) }, /hundred reserved B1/)
rejects('No one-entry earlier omission', x => { x.evidence.earlierTrophies = earlierTrophies.filter(t => fold(t) !== fold(reserved[99])) }, /hundred reserved B1/)
rejects('No empty earlier evidence', x => { x.evidence.earlierTrophies = [] }, /hundred reserved B1/)
rejects('No omitted twentieth allocation', x => { x.evidence.trophies.pop() }, /twenty ordered/)
rejects('No changed ledger family', x => { x.evidence.trophies[10].familyKey = x.evidence.trophies[0].familyKey }, /embedded ledger/)
rejects('No reordered allocations', x => { [x.evidence.trophies[0], x.evidence.trophies[1]] = [x.evidence.trophies[1], x.evidence.trophies[0]] }, /allocation order/)
rejects('No reserved allocated lemma', x => { x.evidence.earlierTrophies.push('tuttavia') }, /collides/)
rejects('No reserved allocated inflected surface', x => { x.evidence.earlierTrophies.push('entrambe') }, /collides/)
rejects('No unrelated trophy lemma', x => { x.draft.lessons[0].trophy.lemma = 'salve' }, /Trophy allocation/)
rejects('No guessed inflection', x => { x.draft.lessons[4].trophy.surface = 'entrambi' }, /specification inflection/)
rejects('No dropped allocated accent', x => { x.draft.lessons[4].trophy.surface = 'poiche' }, /specification inflection/, 2)
rejects('No interlocutor trophy anchoring', x => { x.draft.lessons[0].trophy.turnIndex = 0 }, /declared learner turn/)
rejects('No absent trophy example', x => { x.draft.lessons[0].trophy.example.targetText = 'Questa frase è solo un esempio senza il termine assegnato.' }, /complete lemma\/surface/)
rejects('No build reconstruction drift', x => { x.draft.lessons[0].build.frameSuffix += ' ancora' }, /Build reconstruction/)
rejects('No duplicate chip', x => { x.draft.lessons[0].build.distractors[0] = x.draft.lessons[0].build.chunks[0] }, /chips must be distinct/)
rejects('No oversized chip', x => { x.draft.lessons[0].build.chunks[0] += ' altre quattro parole aggiunte' }, /Invalid chunk length/)
rejects('No chip split inside an elided article', x => {
  const b = x.draft.lessons[0].build, at = b.chunks.findIndex(c => /[\p{L}]['\u2019][\p{L}]/u.test(c))
  assert.ok(at >= 0, 'P1 L1 focus carries dall’altro'); const c = b.chunks[at], cut = c.search(/['\u2019]/u)
  b.chunks.splice(at, 1, c.slice(0, cut), c.slice(cut + 1)); if (b.chunks.length > 8) b.chunks.splice(b.chunks.length - 2, 2, b.chunks.slice(-2).join(' '))
}, /splits a lexical token/)
rejects('No recall split inside an elided article', x => { const l = apostropheRecall(x), cut = l.recall.answer.search(/['\u2019]/u); l.recall.before += l.recall.answer.slice(0, cut + 1); l.recall.answer = l.recall.answer.slice(cut + 1); l.recall.acceptedAnswers = [l.recall.answer]; l.recall.fallbackChoices[0] = l.recall.answer }, /Recall answer splits/)
rejects('No apostrophe-free accepted variant', x => { const l = apostropheRecall(x); l.recall.acceptedAnswers.push(l.recall.answer.replace(/['\u2019]/gu, '')) }, /apostrophe-free/)
rejects('No missing apostrophe twin', x => { const l = apostropheRecall(x); l.recall.acceptedAnswers = [l.recall.answer] }, /apostrophe twin/)
rejects('No missing accent-stripped variant', x => {
  const b = x.draft.lessons.flatMap(blanksOf).find(v => /[àèéìòù]/iu.test(v.answer)); assert.ok(b, 'an accented blank answer exists in P1'); b.acceptedAnswers = [b.answer]
}, /accent-stripped/)
rejects('No seventeenth authored answer', x => { x.draft.lessons[0].recall.acceptedAnswers.push(...Array.from({ length: 17 }, (_, i) => `variante${String.fromCharCode(97 + i)}`)) }, /more than sixteen/)
rejects('No two accepted choices', x => { const l = x.draft.lessons[0]; l.recall.acceptedAnswers.push(l.recall.fallbackChoices.find(c => c !== l.recall.answer)!) }, /exactly one accepted/)
rejects('No accent-equivalent duplicate choices', x => { const r = x.draft.lessons[0].recall; r.fallbackChoices = [r.answer, 'perché', 'perche', 'altrove'] }, /distinct with exactly one/)
rejects('No duplicate choice', x => {
  const b = [...x.draft.lessons.flatMap(blanksOf)].find(v => v.choices); assert.ok(b?.choices, 'a choice-bearing blank exists in P1'); b.choices[1] = b.choices[0]
}, /distinct with exactly one/)
rejects('No form cue omission', x => {
  const b = [...x.draft.lessons.flatMap(blanksOf), ...fixture(2).draft.lessons.flatMap(blanksOf)].find(v => v.kind === 'form'); assert.ok(b, 'a form blank exists'); delete b.cue
  const own = x.draft.lessons.flatMap(blanksOf).find(v => v.kind === 'form'); if (own) delete own.cue; else { x.draft.lessons[0].cloze.blanks[0].kind = 'form'; if (x.draft.lessons[0].cloze.moveBlankIndex === 0) x.draft.lessons[0].cloze.moveBlankIndex = 1 }
}, /Form cues/)
rejects('No cue on a non-form blank', x => { const b = x.draft.lessons[0].synthesis.blanks[0]; if (b.kind === 'form') b.kind = 'frame'; b.cue = { de: 'Hinweis', en: 'cue' } }, /Form cues/)
rejects('No reordered blank indices', x => { x.draft.lessons[0].cloze.segments.reverse() }, /once in order/)
rejects('No move blank pointing at a lexical blank', x => { const c = x.draft.lessons[0].cloze; c.blanks[c.moveBlankIndex].kind = 'lexical'; delete c.blanks[c.moveBlankIndex].cue }, /connector\/frame/)
rejects('No cloze reconstruction drift', x => { x.draft.lessons[0].cloze.segments.push({ kind: 'text', text: 'x' }) }, /cloze reconstruction/)
rejects('No synthesis reconstruction drift', x => { x.draft.lessons[0].synthesis.segments.push({ kind: 'text', text: 'x' }) }, /synthesis reconstruction/)
rejects('No cloze lexical fragment', x => {
  const c = x.draft.lessons[0].cloze, i = c.segments.findIndex((s, k) => s.kind === 'blank' && k > 0 && c.segments[k - 1].kind === 'text' && /^[\p{L}]{3}/u.test(c.blanks[s.index].answer))
  assert.ok(i > 0, 'a blank preceded by text exists'); const s = c.segments[i], p = c.segments[i - 1]
  if (s.kind === 'blank' && p.kind === 'text') { const b = c.blanks[s.index]; p.text += b.answer.slice(0, 2); b.answer = b.answer.slice(2); b.acceptedAnswers = [b.answer, b.answer.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')].filter((v, k, a) => a.indexOf(v) === k); if (b.choices) b.choices[0] = b.answer }
}, /blank splits a lexical token/)
rejects('No recall reconstruction drift', x => { x.draft.lessons[0].recall.before += 'x' }, /Recall reconstruction/)
rejects('No invented speech token', x => { x.draft.lessons[0].speak[0].requiredTokens[0] = 'inesistente' }, /speech tokens/)
rejects('No lexical fragment speech token', x => { x.draft.lessons[0].speak[0].requiredTokens[0] = 'altro' }, /speech tokens/)
rejects('No absent speech target', x => { x.draft.lessons[0].speak[2].turnIndex = 3 }, /Speak must cover/)
rejects('No missing build anchors', x => {
  const l = x.draft.lessons[0], focus = fold(l.build.chunks.join(' ')), outside = (l.dialogue[1].targetText.match(/[\p{L}]+/gu) ?? []).filter(t => !focus.includes(fold(t))).slice(0, 2)
  assert.equal(outside.length, 2, 'frame tokens outside the focus exist'); l.speak[0].requiredTokens = outside
}, /Two speech tokens/)
rejects('No term substring', x => { x.draft.lessons[0].terms[0].targetText = x.draft.lessons[0].terms[0].targetText.slice(0, -1) + 'xq' }, /Complete term absent/)
rejects('No unattested term', x => { x.draft.lessons[0].terms[3].targetText = 'inesistente' }, /Complete term absent/)
rejects('No repeated term', x => { x.draft.lessons[0].terms[3].targetText = x.draft.lessons[0].terms[2].targetText }, /Duplicate terms/)
rejects('No missing discourse coverage', x => { for (const t of x.draft.lessons[0].terms) if (['connector', 'frame'].includes(t.kind)) t.kind = 'phrase' }, /discourse and lexical/)
rejects('No pattern highlight invention', x => { x.draft.lessons[0].pattern.examples[0].highlights = ['espressione assente'] }, /highlight absent/)
rejects('No absent exact pattern example', x => { for (const e of x.draft.lessons[0].pattern.examples) e.targetText += ' Ancora.' }, /reuse exact learner/)
rejects('No copied future turn in situation', x => { x.draft.lessons[0].situation.de += x.draft.lessons[0].dialogue[3].targetText }, /reveals later target/)
rejects('No missing quoted opener', x => { x.draft.lessons[0].sceneCaption.en = 'Only an unrelated caption.' }, /quote opener/)
rejects('No duplicate first reply', x => { const a = x.draft.lessons[0], b = x.draft.lessons[1]; b.dialogue[1].targetText = a.dialogue[1].targetText; b.build = structuredClone(a.build); b.recall = structuredClone(a.recall) }, /Duplicate first reply/)
rejects('No missing P2 L2 frame carrier', x => { const b = x.draft.lessons[1].build; const m = b.framePrefix.match(/dato che/iu); assert.ok(m, 'P2 L2 frame carries dato che'); b.framePrefix = b.framePrefix.replace(/dato che/iu, 'visto che'); x.draft.lessons[1].dialogue[1].targetText = x.draft.lessons[1].dialogue[1].targetText.replace(/dato che/iu, 'visto che'); x.draft.lessons[1].recall.before = x.draft.lessons[1].recall.before.replace(/dato che/iu, 'visto che') }, /build frame: dato che/, 2)

rejects('No interlocutor informal address in a Lei episode', x => { x.draft.lessons[0].dialogue[2].targetText = "Tu sai se quell'ora vale duecento euro al mese? L'altro appartamento ha anche un giardino privato." }, /Informal address/)
rejects('No incidental conditional promoted to a term', x => { x.draft.lessons[4].terms.push({ targetText: 'aspetterei', lemma: 'aspettare', kind: 'verb', base: { de: 'ich würde warten', en: 'I would wait' } }) }, /conditional/, 2)
rejects('No incidental conditional promoted to a form blank', x => {
  const l = x.draft.lessons[4], t = l.dialogue[5].targetText, at = t.indexOf('aspetterei'), frame = l.synthesis.blanks[0], frameAt = t.indexOf(frame.answer)
  assert.ok(at > 0 && frameAt > at, 'P2 L5 closing carries aspetterei before in base alla')
  l.synthesis = { segments: [{ kind: 'text', text: t.slice(0, at) }, { kind: 'blank', index: 0 }, { kind: 'text', text: t.slice(at + 'aspetterei'.length, frameAt) }, { kind: 'blank', index: 1 }, { kind: 'text', text: t.slice(frameAt + frame.answer.length) }], blanks: [{ answer: 'aspetterei', acceptedAnswers: ['aspetterei'], kind: 'form', cue: { de: 'aspettare, ich, Konditional Präsens', en: 'aspettare, I, present conditional' } }, frame], moveBlankIndex: 1 }
}, /conditional/, 2)
for (const symbol of ['€', '%', '+', '=', '&']) rejects(`No non-spoken symbol ${symbol} in a voiced trophy example`, x => { x.draft.lessons[0].trophy.example.targetText += ` ${symbol}` }, /symbol policy/)

console.log(`PASS: Italian B2 offline structure; ${positives} positive controls and ${negatives} reason-asserted rejection probes.`)
console.log(`Staged Italian sources inspected: p1 sha256 ${hash(sources[1])}, p2 sha256 ${hash(sources[2])}; V4 specification ${ITALIAN_B2_AUTHORITY.specificationSha256}.`)
console.log('No native, semantic, runtime, TTS or publication approval.')
