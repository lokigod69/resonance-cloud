/** Offline tests of real Polish sources and coupled mutations. No provider, ledger, app or source writes. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { POLISH_B1_BINDINGS, POLISH_GENDER_EVIDENCE, POLISH_BARE_PRONOUNS, isPolishBarePronoun,
  polishB1DraftSchema, polishChoiceKey, polishWords, reviewPolishB1Draft, validatePolishB1Draft,
  type PolishB1Draft, type PolishLesson, type PolishBlank } from './lib/guidedPolishB1Drafts'

const work = resolve(dirname(fileURLToPath(import.meta.url)), '../content-drafts/b1-native-2026-10/polish')
const read = (name: string): unknown => JSON.parse(readFileSync(resolve(work, name), 'utf8'))
const hash = (name: string) => createHash('sha256').update(readFileSync(resolve(work, name))).digest('hex')
const spec = read('specification.json')
const p1 = polishB1DraftSchema.parse(read('p1.json'))
const p2 = polishB1DraftSchema.parse(read('p2.json'))
const clone = <T>(value: T): T => structuredClone(value)
const blank = (lesson: PolishLesson, n = 0): PolishBlank => lesson.cloze.filter((part): part is PolishBlank => typeof part !== 'string')[n]
/** Change all coupled source fields, including chunk/cloze/recall text and reused patterns.
 * This is an engineering mutation helper, never an authoring or gender-alternative generator. */
function replace(lesson: PolishLesson, old: string, next: string) {
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return value.replaceAll(old, next)
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child)]))
    return value
  }
  Object.assign(lesson, walk(lesson))
}
let passed = 0
function test(name: string, run: () => void) {
  try { run(); passed++ } catch (error) { throw new Error(name, { cause: error }) }
}
function rejects(name: string, mutate: (value: PolishB1Draft) => void, reason: RegExp, original = p2) {
  test(name, () => { const value = clone(original); mutate(value); assert.throws(() => reviewPolishB1Draft(value, spec), reason) })
}
/** Single-cause probe: every rejection line must carry the intended diagnostic, so no other rule masks the tested one. */
function rejectsOnly(name: string, mutate: (value: PolishB1Draft) => void, reason: RegExp, original = p2) {
  test(name, () => {
    const value = clone(original); mutate(value)
    assert.throws(() => reviewPolishB1Draft(value, spec), (error: unknown) => error instanceof Error
      && error.message.split('\n').length > 0 && error.message.split('\n').every(line => reason.test(line)))
  })
}
test('actual reviewed source byte identities', () => {
  assert.equal(hash('p1.json'), POLISH_B1_BINDINGS.reviewedP1Sha256)
  assert.equal(hash('p2.json'), POLISH_B1_BINDINGS.reviewedP2Sha256)
  // The reviewed specification used CRLF; Git stages LF. Restore that exact historical byte form.
  const historical = readFileSync(resolve(work, 'specification.json'), 'utf8').replace(/\r?\n/g, '\r\n')
  assert.equal(createHash('sha256').update(historical).digest('hex'), POLISH_B1_BINDINGS.specificationFileSha256)
})
for (const source of [p1, p2]) test(`actual P${source.pathNumber} genuine complete path`, () => {
  const before = JSON.stringify(source), result = reviewPolishB1Draft(source, spec)
  assert.deepEqual(result.coverage, { lessons: 10, frozenLessons: 200, frozenTrophies: 200, fullAllocatedTrophies: 100, genderAlternatives: source.pathNumber === 1 ? 8 : 0 })
  assert.equal(result.scope, 'canonical-structure-only'); assert.equal(JSON.stringify(source), before)
  assert.equal(validatePolishB1Draft(source, spec).targetLanguageCode, 'pl-PL')
  for (const code of ['PL-SEMANTICS', 'PL-EXERCISES', 'PL-STAGING-LIMIT', 'PL-INPUT-HOLD']) assert.ok(result.warnings.some(warning => warning.includes(code)))
})
test('native boundaries preserve hyphens and foreign adjacency', () => {
  assert.deepEqual(polishWords('„Łąka”, północno-zachodni zamek-я zamek’s.'), ['łąka', 'północno-zachodni', 'zamek-я', 'zamek’s'])
})
test('choice identity folds NFC/case/edge punctuation, never diacritics', () => {
  assert.equal(polishChoiceKey(' „TAŃSZA!” '), 'tańsza')
  assert.equal(polishChoiceKey('tańsza'), polishChoiceKey('TAŃSZA.'))
  assert.notEqual(polishChoiceKey('lód'), polishChoiceKey('lod'))
  assert.notEqual(polishChoiceKey('sąd'), polishChoiceKey('sad'))
})
test('all explicit native pronoun inflections classified', () => {
  for (const token of POLISH_BARE_PRONOUNS) assert.equal(isPolishBarePronoun(token), true, token)
  for (const token of ['zamek', 'kwiaty', 'nimfa', 'tamtejszy', 'sobota', 'mojito', 'przynajmniej', 'pociąg']) assert.equal(isPolishBarePronoun(token), false, token)
})
test('visible fixed-subject past forms remain legal, no blanket suffix ban', () => {
  assert.doesNotThrow(() => reviewPolishB1Draft(p1, spec))
  assert.equal(blank(p1.lessons[4]).answer, 'odjechał')
  assert.equal(blank(p1.lessons[7]).answer, 'zeszła')
  assert.equal(blank(p1.lessons[8]).answer, 'przygotowała')
  assert.equal(blank(p1.lessons[6], 1).answer, 'pachniało')
})
test('neutral third-person past can be required speech when its subject is visible', () => {
  const d = clone(p1); d.lessons[6].speakRequired[2] = 'przyszła'
  assert.doesNotThrow(() => reviewPolishB1Draft(d, spec))
})
test('neutral third-person past can be recalled with fixed noun subject', () => {
  const d = clone(p1), l = d.lessons[6]
  l.recall = { before: 'Paczka wreszcie ', answer: 'przyszła', after: ' wczoraj, kiedy spokojnie pracowałam w domu.', fallbackChoices: ['przyszła', 'wyrosła', 'zgasła', 'ucichła'] }
  assert.doesNotThrow(() => reviewPolishB1Draft(d, spec))
})
test('third-person adjective is not necessarily a speaker predicate', () => {
  const d = clone(p2); replace(d.lessons[0], 'głośna', 'gotowa')
  assert.doesNotThrow(() => reviewPolishB1Draft(d, spec))
})
test('third-person past does not create an unnecessary alternative', () => {
  assert.equal(p2.lessons[2].dialogue[1].acceptedTargetAlternatives, undefined)
  assert.match(p2.lessons[2].dialogue[1].targetText, /Film mi się podobał/)
})
test('recognition-only markers remain permitted in interlocutor text', () => {
  const d = clone(p2); replace(d.lessons[0], d.lessons[0].dialogue[0].targetText, 'No, wiesz, co prawda większy pokój jest wygodniejszy. Co myślisz?')
  assert.doesNotThrow(() => reviewPolishB1Draft(d, spec))
})
test('P2L6 productive przynajmniej is accepted at its fine-grained introduction', () => {
  assert.match(p2.lessons[5].dialogue[1].targetText, /przynajmniej/)
  assert.doesNotThrow(() => reviewPolishB1Draft(p2, spec))
})
test('genuine Fable comparative fix is preserved', () => {
  assert.deepEqual(blank(p2.lessons[3], 1).choices, ['bliżej', 'bliższa', 'bliższe', 'bliżsi'])
})

for (const [name, values, reason] of [
  ['identity', { targetLanguage: 'Spanish' }, /Polish/], ['locale', { targetLanguageCode: 'pl' }, /pl-PL/],
  ['status', { status: 'reviewed' }, /draft/], ['level', { level: 'B2' }, /B1/],
  ['base', { baseLanguage: 'English' }, /German/], ['scope', { pathNumber: 3 }, /pathNumber/],
  ['unknown root', { canonicalVoice: 'female' }, /canonicalVoice/],
] as const) rejects(`strict ${name}`, d => Object.assign(d, values), reason)
rejects('ten complete lessons required', d => { d.lessons.pop() }, /10/)
rejects('no extra lesson', d => { d.lessons.push(clone(d.lessons[0])) }, /10/)
rejects('four exact dialogue tuples', d => { d.lessons[0].dialogue.push(clone(d.lessons[0].dialogue[0])) }, /4/)
rejects('no unknown lesson field', d => { Object.assign(d.lessons[0], { semanticApproval: true }) }, /semanticApproval/)
rejects('no alternative on interlocutor tuple', d => { Object.assign(d.lessons[0].dialogue[0], { acceptedTargetAlternatives: ['Test'] }) }, /acceptedTargetAlternatives/)
rejects('no runtime speech acceptance shape', d => { Object.assign(d.lessons[0], { speakTarget: { acceptedPhrases: ['Test'] } }) }, /speakTarget/)
rejects('missing English root base', d => { delete d.title.en }, /PL-BILINGUAL/)
rejects('missing English term base', d => { delete d.lessons[0].terms[0].baseText.en }, /PL-BILINGUAL/)
rejects('missing English caption', d => { delete d.lessons[0].sceneCaption.en }, /PL-BILINGUAL/)
rejects('missing English dialogue', d => { delete d.lessons[0].dialogue[0].baseText.en }, /en/)
rejects('unexpected base locale', d => { Object.assign(d.lessons[0].title, { fr: 'Test' }) }, /fr/)
rejects('NFC on explanations', d => { d.title.de = 'Cafe\u0301' }, /PL-NFC-CONTROL/)
rejects('controls on explanations', d => { d.title.de += '\u200b' }, /PL-NFC-CONTROL/)
rejects('duplicate slug', d => { d.lessons[1].slug = d.lessons[0].slug }, /PL-SLUG/)
rejects('friend register fixed', d => { d.lessons[0].register = 'formal' }, /PL-REGISTER/)
rejects('followup cannot equal opener', d => { d.lessons[0].dialogue[2].targetText = d.lessons[0].dialogue[0].targetText }, /PL-FOLLOWUP/)

type Spec = { paths: Array<{ pathNumber: number; lessons: Array<{ number: number; trophy: string }>; staging: Array<{ productive: string }> }>; registerPolicy: string }
for (const [name, change, reason] of [
  ['last-path order', (s: Spec) => { s.paths[9].pathNumber = 9 }, /PL-SPEC-PATH-ORDER/],
  ['unused lesson order', (s: Spec) => { s.paths[9].lessons[9].number = 9 }, /PL-SPEC-LESSON-ORDER/],
  ['unused duplicate allocation', (s: Spec) => { s.paths[9].lessons[9].trophy = 'najpierw' }, /PL-ALLOCATION-COLLISION/],
  ['frozen collision', (s: Spec) => { s.paths[9].lessons[9].trophy = 'kawa' }, /PL-ALLOCATION-COLLISION/],
  ['gendered allocation', (s: Spec) => { s.paths[9].lessons[9].trophy = 'chciałabym' }, /PL-ALLOCATION-TOKEN/],
  ['staging authority', (s: Spec) => { s.paths[1].staging[1].productive += ' silently earlier' }, /PL-SPEC-BINDING/],
  ['register authority', (s: Spec) => { s.registerPolicy = 'anything' }, /PL-SPEC-BINDING/],
  ['full ten paths required', (s: Spec) => { s.paths.pop() }, /10/],
] as const) test(`spec ${name}`, () => { const s = clone(spec) as Spec; change(s); assert.throws(() => reviewPolishB1Draft(p2, s), reason) })
rejects('exact allocated trophy', d => { d.lessons[0].trophyWord.word = 'zdanie' }, /PL-TROPHY-ALLOCATION/)
for (const glued of ['nadzdaniem', 'zdaniem-kogoś', 'zdaniem’s', 'zdaniemя']) rejects(`whole trophy boundary ${glued}`, d => { d.lessons[0].trophyWord.example = glued }, /PL-TROPHY-ANCHOR/)
rejects('example cannot be same canonical line', d => { d.lessons[0].trophyWord.example = d.lessons[0].dialogue[1].targetText }, /PL-TROPHY-EXAMPLE/)

rejects('first length below eight', d => { d.lessons[0].dialogue[1].targetText = 'Moim zdaniem.' }, /PL-FIRST-LENGTH/)
rejects('first length above sixteen', d => { d.lessons[0].dialogue[1].targetText = 'Słowo '.repeat(17).trim() + '.' }, /PL-FIRST-LENGTH/)
rejects('closing length below six', d => { d.lessons[0].dialogue[3].targetText = 'Bardzo dobrze.' }, /PL-SECOND-LENGTH/)
rejects('closing length above twelve', d => { d.lessons[0].dialogue[3].targetText = 'Słowo '.repeat(13).trim() + '.' }, /PL-SECOND-LENGTH/)
rejects('first has three sentences', d => { replace(d.lessons[0], 'Moim zdaniem małe pokoje są dobre, bo łatwo się skupić.', 'Moim zdaniem. Małe pokoje są dobre. Bo łatwo się skupić.') }, /PL-FIRST-SENTENCES/)
rejects('exact build join', d => { d.lessons[0].chunks[0].targetText += ' dobrze' }, /PL-BUILD-JOIN/)
rejects('chunk edge spaces', d => { d.lessons[0].chunks[0].targetText += ' ' }, /edge whitespace/)
rejects('chunk above four words', d => { d.lessons[0].chunks[0].targetText = 'Moim zdaniem małe pokoje są' }, /PL-CHUNK-LENGTH/)
rejects('too few chunks', d => { d.lessons[0].chunks.pop() }, /4/)
rejects('chip case/punctuation identity', d => { d.lessons[0].distractors[0] = d.lessons[0].chunks[0].targetText.toUpperCase() + '!' }, /PL-BUILD-DISTINCT/)
rejects('distinct terms', d => { d.lessons[0].terms[1] = clone(d.lessons[0].terms[0]) }, /PL-TERM-DISTINCT/)
rejects('unattested term', d => { d.lessons[0].terms[0].targetText = 'wyspa' }, /PL-TERM-ANCHOR/)
rejects('term cannot be substring', d => { d.lessons[0].terms[0].targetText = 'zdanie' }, /PL-TERM-ANCHOR/)
rejects('six terms minimum', d => { d.lessons[0].terms = d.lessons[0].terms.slice(0, 5) }, /6/)
rejects('cloze exact reconstruction', d => { d.lessons[0].cloze[1] = ' inaczej ' }, /PL-CLOZE-JOIN/)
rejects('cloze two blanks minimum', d => { const l = d.lessons[0]; l.cloze[0] = blank(l).answer }, /PL-CLOZE-COUNT/)
rejects('cloze missing answer among choices', d => { blank(d.lessons[0]).choices[0] = 'Kiedy' }, /PL-CHOICES/)
rejects('cloze duplicate normalized answer', d => { blank(d.lessons[0]).choices[1] = 'CHOCIAŻ!' }, /PL-CHOICES/)
rejects('recall duplicate normalized answer', d => { d.lessons[0].recall.fallbackChoices[1] = 'ZDANIEM.' }, /PL-CHOICES/)
rejects('connector synonym collision', d => { blank(d.lessons[0]).choices[1] = 'mimo że' }, /PL-SYNONYM-CHOICES/)
rejects('recall synonym collision', d => { d.lessons[2].recall.fallbackChoices[1] = 'choć' }, /PL-SYNONYM-CHOICES/)
rejects('reconstructing suffix blank at wrong boundary', d => {
  const l = d.lessons[0], b = blank(l); l.cloze.unshift('Cho'); b.answer = 'ciaż'; b.choices[0] = 'ciaż'
}, /PL-CLOZE-BOUNDARY/)
rejects('reconstructing prefix blank at wrong boundary', d => {
  const l = d.lessons[0], b = blank(l); b.answer = 'Chocia'; b.choices[0] = 'Chocia'; l.cloze[1] = 'ż' + l.cloze[1]
}, /PL-CLOZE-BOUNDARY/)
rejects('recall substring despite exact reconstruction', d => {
  const l = d.lessons[0]; l.recall.before = 'Moim z'; l.recall.answer = 'daniem'; l.recall.fallbackChoices[0] = 'daniem'
}, /PL-RECALL-BOUNDARY/)
rejects('recall wrong reconstruction', d => { d.lessons[0].recall.after += ' dobrze' }, /PL-RECALL-JOIN/)
rejects('recall no exact answer', d => { d.lessons[0].recall.fallbackChoices[0] = 'zamek' }, /PL-CHOICES/)
for (const pronoun of ['mnie', 'nią', 'nim', 'jego', 'niej', 'sobą', 'tamtych', 'mojego', 'twojemu', 'swoich', 'naszymi', 'którego', 'czyjemu', 'każdemu', 'nikogo', 'czymkolwiek', 'jakiegoś', 'czyichś', 'niektórym', 'żadnych', 'iloma']) {
  rejects(`coupled bare-pronoun cloze ${pronoun}`, d => { replace(d.lessons[0], 'głośna', pronoun) }, /PL-BARE-PRONOUN/)
}
rejects('form cue required', d => { delete blank(d.lessons[3]).cue }, /PL-CUE/)
rejects('connector cue forbidden', d => { blank(d.lessons[0]).cue = 'dokonany' }, /PL-CUE/)
rejects('single cue string not bilingual object', d => { Object.assign(blank(d.lessons[3]), { cue: { de: 'Vergleich', en: 'Comparative' } }) }, /string/)
rejects('exact comparative cue', d => { blank(d.lessons[3]).cue = 'dokonany' }, /PL-CUE-LABEL/)
rejects('exact aspect cue', d => { blank(d.lessons[0]).cue = 'stopień wyższy' }, /PL-CUE-LABEL/, p1)
rejects('new form needs contextual audit', d => { replace(d.lessons[3], 'mniejszy', 'większy') }, /PL-FORM-AUDIT/)
rejects('visible noun cannot be removed', d => { replace(d.lessons[3], 'pokój', 'lokal') }, /PL-FORM-SUBJECT/)
rejects('subject in another blank does not count as visible', d => {
  const l = d.lessons[0]; l.cloze[0] = 'Tam '; l.cloze.splice(1, 0, { kind: 'choice', answer: 'recepcjonista', choices: ['recepcjonista', 'technik', 'gość', 'kolega'] }, ' ')
}, /PL-FORM-SUBJECT/, p1)
rejects('connector outside own path menu', d => { const b = blank(d.lessons[3]); b.kind = 'connector'; delete b.cue }, /PL-CONNECTOR-MENU/)
// PL-GATE-02: audited form answers are bound by the answer, not by caller-supplied kind.
rejectsOnly('relabel-only form to choice loses cue and subject duty', d => { const b = blank(d.lessons[0]); b.kind = 'choice'; delete b.cue }, /PL-FORM-RELABEL/, p1)
rejects('relabel form to connector is still an audited form', d => { const b = blank(d.lessons[0]); b.kind = 'connector'; delete b.cue }, /PL-FORM-RELABEL/, p1)
rejectsOnly('audited form cannot hide as a choice distractor', d => {
  const l = d.lessons[0]; replace(l, 'otworzył', 'otwierał'); const b = blank(l)
  b.kind = 'choice'; delete b.cue; b.choices = ['otwierał', 'otworzył', 'otworzyła', 'otworzyło']
}, /PL-FORM-RELABEL/, p1)
test('reviewer reproduction: relabel plus subject moved into another blank', () => {
  const d = clone(p1); d.lessons[0].cloze = ['Tam ',
    { kind: 'choice', answer: 'recepcjonista', choices: ['recepcjonista', 'gość', 'turysta', 'uczeń'] }, ' ',
    { kind: 'choice', answer: 'otworzył', choices: ['otworzył', 'otwierał', 'otworzyła', 'otworzyło'] }, ' kuchnię i podał mi ',
    { kind: 'choice', answer: 'klucz', choices: ['klucz', 'talerz', 'notes', 'bilet'] }, ' do pokoju.']
  assert.throws(() => reviewPolishB1Draft(d, spec), (error: unknown) => error instanceof Error && /PL-FORM-RELABEL/.test(error.message) && /PL-FORM-SUBJECT/.test(error.message))
})
rejectsOnly('reviewer control: form kept, subject moved into another blank fails solely on visibility', d => {
  d.lessons[0].cloze = ['Tam ',
    { kind: 'choice', answer: 'recepcjonista', choices: ['recepcjonista', 'gość', 'turysta', 'uczeń'] }, ' ',
    { kind: 'form', answer: 'otworzył', cue: 'dokonany', choices: ['otworzył', 'otwierał', 'otworzyła', 'otworzyło'] }, ' kuchnię i podał mi ',
    { kind: 'choice', answer: 'klucz', choices: ['klucz', 'talerz', 'notes', 'bilet'] }, ' do pokoju.']
}, /PL-FORM-SUBJECT/, p1)
test('positive controls: unaudited choice blanks and null-subject adverbial comparatives stay legal', () => {
  assert.equal(blank(p1.lessons[0], 1).kind, 'choice'); assert.equal(blank(p1.lessons[0], 1).answer, 'klucz')
  assert.equal(blank(p2.lessons[3], 1).answer, 'bliżej'); assert.equal(blank(p2.lessons[5], 1).answer, 'luźniej')
  assert.doesNotThrow(() => reviewPolishB1Draft(p1, spec)); assert.doesNotThrow(() => reviewPolishB1Draft(p2, spec))
})

rejects('speech absent token', d => { d.lessons[0].speakRequired[0] = 'wyspa' }, /PL-SPEECH-TOKEN/)
rejects('speech lower-case only', d => { d.lessons[0].speakRequired[0] = 'Zdaniem' }, /PL-SPEECH-TOKEN/)
rejects('speech substring', d => { d.lessons[0].speakRequired[0] = 'zdanie' }, /PL-SPEECH-TOKEN/)
rejects('speech duplicate', d => { d.lessons[0].speakRequired[1] = d.lessons[0].speakRequired[0] }, /PL-SPEECH-DISTINCT/)
rejects('speech bare pronoun', d => { d.lessons[0].speakRequired[0] = 'moim' }, /PL-SPEECH-TOKEN/)
rejects('speech isolated się', d => { d.lessons[0].speakRequired[0] = 'się' }, /PL-SPEECH-TOKEN/)
rejects('speech preserves diacritics', d => { d.lessons[0].speakRequired[2] = 'skupic' }, /PL-SPEECH-TOKEN/)
rejects('final nasal pair cannot be jointly required despite complete anchors', d => {
  replace(d.lessons[0], 'łatwo się skupić', 'kawę kawe czytać')
  d.lessons[0].speakRequired = ['kawę', 'kawe', 'pokoje']
}, /PL-SPEECH-NASAL/)
rejects('clitic-attached person cannot be speech', d => { replace(d.lessons[0], 'pokoje', 'gdybym'); d.lessons[0].speakRequired[1] = 'gdybym' }, /PL-SPEECH-TOKEN/)
rejects('pattern contiguous highlight', d => { d.lessons[0].pattern.examples[0].highlight = 'nie ma tego' }, /PL-HIGHLIGHT/)
rejects('pattern must reuse canonical turn', d => { d.lessons[0].pattern.examples.forEach(e => { e.targetText += ' Dobrze.' }) }, /PL-PATTERN-REUSE/)
rejects('Polish quote enclosure required', d => { d.lessons[0].sceneCaption.en = d.lessons[0].dialogue[0].targetText }, /PL-CAPTION-QUOTE/)
rejects('both captions checked', d => { d.lessons[0].sceneCaption.en = 'Nothing here.' }, /PL-CAPTION-QUOTE/)
rejects('later turn not quoted in caption', d => { d.lessons[0].sceneCaption.en += d.lessons[0].dialogue[2].targetText }, /PL-CAPTION-SPOILER/)

for (const n of Object.keys(POLISH_GENDER_EVIDENCE).map(Number)) {
  rejects(`P1L${n} complete alternative mandatory`, d => { delete d.lessons[n - 1].dialogue[1].acceptedTargetAlternatives }, /PL-GENDER-ALTERNATIVE/, p1)
  rejects(`P1L${n} opposite line must stay complete`, d => { d.lessons[n - 1].dialogue[1].acceptedTargetAlternatives = ['zwiedzałem'] }, /PL-GENDER-ALTERNATIVE/, p1)
}
rejects('no suffix-generated irregular alternative', d => { d.lessons[1].dialogue[1].acceptedTargetAlternatives![0] = d.lessons[1].dialogue[1].acceptedTargetAlternatives![0].replace('poszedłem', 'poszłem') }, /PL-GENDER-ALTERNATIVE/, p1)
rejects('no unrelated alternate fact change', d => { d.lessons[0].dialogue[1].acceptedTargetAlternatives![0] = d.lessons[0].dialogue[1].acceptedTargetAlternatives![0].replace('zamek', 'muzeum') }, /PL-GENDER-ALTERNATIVE/, p1)
rejects('fixed noun agreement cannot switch with learner', d => { d.lessons[6].dialogue[1].acceptedTargetAlternatives![0] = d.lessons[6].dialogue[1].acceptedTargetAlternatives![0].replace('przyszła', 'przyszedł') }, /PL-GENDER-ALTERNATIVE/, p1)
rejects('canonical feminine binding checked despite coupled exercises', d => { replace(d.lessons[0], 'zwiedzałam', 'zwiedzałem') }, /PL-GENDER-CANONICAL/, p1)
rejects('missing visible opposite-gender pattern', d => { d.lessons[0].pattern.examples[1] = clone(d.lessons[0].pattern.examples[0]) }, /PL-GENDER-PATTERN/, p1)
rejects('missing gendered term opposite gloss', d => { d.lessons[0].terms.find(t => t.targetText === 'zwiedzałam')!.baseText.en = 'I toured' }, /PL-TERM-GENDER-GLOSS/, p1)
rejects('neutral learner turn must omit alternative', d => { d.lessons[0].dialogue[1].acceptedTargetAlternatives = ['Moim zdaniem.'] }, /PL-GENDER-UNBOUND/)
rejects('second turn lacks whole-line audit', d => { d.lessons[0].dialogue[3].acceptedTargetAlternatives = ['Inaczej.'] }, /PL-GENDER-UNBOUND/)
rejects('exactly one alternative', d => { Object.assign(d.lessons[0].dialogue[1], { acceptedTargetAlternatives: [] }) }, /1/, p1)
rejects('alternative is a string, not token list', d => { Object.assign(d.lessons[0].dialogue[1], { acceptedTargetAlternatives: [['zwiedzałem']] }) }, /string/, p1)
rejects('new first-person predicate needs semantic line audit', d => { replace(d.lessons[0], 'łatwo się skupić', 'jestem bardzo zadowolona') }, /PL-GENDER-UNBOUND/)
rejects('new first-person past needs semantic line audit', d => { replace(d.lessons[0], 'umożliwia', 'zrobiłam') }, /PL-GENDER-UNBOUND/)
rejects('speaker form cannot be recalled', d => {
  const l = d.lessons[0]; l.recall = { before: 'Najpierw ', answer: 'zwiedzałam', after: ' zamek, a potem zostawiłam plecak w małym hostelu.', fallbackChoices: ['zwiedzałam', 'chodziłam', 'biegłam', 'pisałam'] }
}, /PL-GENDER-TARGET/, p1)
rejects('speaker form cannot be speech', d => { d.lessons[0].speakRequired[1] = 'zwiedzałam' }, /PL-SPEECH-TOKEN/, p1)
rejects('speaker form cannot be cloze', d => { replace(d.lessons[0], 'głośna', 'zrobiłam') }, /PL-GENDER-TARGET/)

for (const marker of ['jednak', 'natomiast', 'przynajmniej', 'warto', 'owszem', 'ostatecznie', 'choć', 'według mnie', 'mimo że']) {
  rejects(`coupled premature P2 production ${marker}`, d => { replace(d.lessons[0], 'łatwo', marker) }, /PL-STAGING/)
}
rejects('P2L5 is too early for przynajmniej', d => { replace(d.lessons[4], 'Jednak', 'Przynajmniej') }, /PL-STAGING/)
rejects('comparative before P2L4', d => { replace(d.lessons[0], 'dobre', 'lepsze') }, /PL-STAGING/)
for (const marker of ['w sumie', 'okazało się', 'wreszcie', 'podczas']) {
  rejects(`early P1 late marker ${marker}`, d => { replace(d.lessons[0], 'Tam', marker) }, /PL-STAGING/, p1)
}
for (const marker of ['pan', 'pani', 'panu', 'państwo', 'ponieważ', 'wiesz', 'no']) {
  rejects(`learner register ${marker}`, d => { replace(d.lessons[0], 'łatwo', marker) }, /PL-REGISTER/)
}
for (const marker of ['pan', 'pani', 'panią', 'panu', 'państwo']) rejectsOnly(`learner formal address ${marker}`, d => { replace(d.lessons[0], 'łatwo', marker) }, /PL-REGISTER-ADDRESS/)
// PL-GATE-01: friend register holds in interlocutor turns; captions are coupled so only the address rule fires.
rejectsOnly('reviewer reproduction: formal opener coupled with both captions', d => {
  replace(d.lessons[0], d.lessons[0].dialogue[0].targetText, 'Czy pani woli małe pokoje czy jedną wspólną salę?')
}, /PL-REGISTER-ADDRESS/)
rejectsOnly('reviewer reproduction: formal follow-up', d => { d.lessons[0].dialogue[2].targetText = 'Czy pan chce pracować w małym pokoju?' }, /PL-REGISTER-ADDRESS/)
rejectsOnly('P1 formal follow-up with inflected pani', d => { d.lessons[0].dialogue[2].targetText = 'Czy ta pani z recepcji była miła?' }, /PL-REGISTER-ADDRESS/, p1)
rejectsOnly('P1 formal opener with państwo coupled with captions', d => {
  replace(d.lessons[0], d.lessons[0].dialogue[0].targetText, 'Jak państwo spędzili wycieczkę do Krakowa?')
}, /PL-REGISTER-ADDRESS/, p1)
test('ordinary nouns sharing the pan- stem are not formal address', () => {
  const d = clone(p2); d.lessons[0].dialogue[2].targetText = 'A może panel słoneczny i panorama miasta pomogą tej pannie?'
  assert.doesNotThrow(() => reviewPolishB1Draft(d, spec))
})
test('interlocutor recognition markers stay legal while address is enforced', () => {
  const d = clone(p2); replace(d.lessons[0], d.lessons[0].dialogue[0].targetText, 'No, wiesz, wolisz małe pokoje czy jedną wspólną salę?')
  assert.doesNotThrow(() => reviewPolishB1Draft(d, spec))
})
for (const bad of ['sło2wo', 'слово', 'falsé', 'słowo🙂', 'słowo/slowo', 'dwa  słowa', 'dwa\u00a0słowa', 'dwa\tsłowa', '[słowo]', '<słowo>']) {
  rejects(`target script ${JSON.stringify(bad)}`, d => { d.lessons[0].distractors[0] = bad }, /PL-TARGET-SCRIPT|PL-NFC-CONTROL/)
}
console.log(JSON.stringify({ passed, actualLessons: 20, frozenTrophies: 200, fullAllocations: 100,
  genderAlternatives: 8, pronounForms: new Set(POLISH_BARE_PRONOUNS).size, scope: 'canonical-structure-only', providerCalls: 0, writes: 0 }, null, 2))
