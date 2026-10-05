/** Artificial structural fixtures only; these are never curriculum or TTS inputs. */
import assert from 'node:assert/strict'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring'
import { validateNativeB1Draft } from './lib/guidedNativeB1Drafts'

function fixture(language: 'Indonesian' | 'Cebuano' = 'Indonesian') {
  const isId = language === 'Indonesian'
  const base = (text: string) => ({ de: text, en: text })
  const translated = (targetText: string) => ({ targetText, baseText: base('Synthetic fixture gloss') })
  const trophy = (i: number) => `testitem${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + i % 26)}`
  const spec = { status: 'architect-spec', targetLanguage: language, targetLanguageCode: isId ? 'id-ID' : 'ceb-PH',
    paths: Array.from({ length: 10 }, (_, p) => ({ pathNumber: p + 1,
      lessons: Array.from({ length: 10 }, (_, n) => ({ number: n + 1, trophy: trophy(p * 10 + n), beat: 'Artificial structural fixture' })) })) }
  const lessons = Array.from({ length: 10 }, (_, n) => {
    const word = trophy(n)
    const chunks = isId ? ['Kemarin aku', `membaca ${word}`, 'lalu membahas', 'cerita itu.']
      : ['Gahapon nagbasa ko', `og ${word}`, 'dayon nagsulat', 'og sugilanon.']
    const first = chunks.join(' ')
    const second = isId ? 'Aku sudah memilih cerita itu lalu membacanya lagi.' : 'Dayon nagsulat ko og sugilanon samtang naghulat didto.'
    const opening = isId ? 'Apa yang kamu baca kemarin?' : 'Unsa ang imong gibasa gahapon?'
    const followup = isId ? 'Apakah kamu memilih cerita yang panjang?' : 'Asa ka nagsulat samtang naghulat?'
    const blanks = isId ? ['sudah', 'lalu'] : ['nagsulat', 'samtang']
    const before = second.split(blanks[0])[0]
    const between = second.split(blanks[0])[1].split(blanks[1])[0]
    const after = second.split(blanks[1])[1]
    return { slug: `synthetic-${word}`, title: base('Artificial fixture'), situation: base('Synthetic context'),
      pedagogicalGoal: 'Nur ein Strukturtest.', register: 'informal',
      dialogue: [translated(opening), translated(first), translated(followup), translated(second)],
      pattern: { label: 'Synthetic', rule: base('Synthetic rule'), examples: [
        { ...translated(first), highlight: word }, { ...translated(second), highlight: blanks[0] }] },
      cloze: [before, { kind: 'choice', answer: blanks[0], choices: [blanks[0], 'aaa', 'bbb', 'ccc'] }, between,
        { kind: 'connector', answer: blanks[1], choices: [blanks[1], 'aaa', 'bbb', 'ccc'] }, after],
      chunks: chunks.map(translated), terms: [word, ...(isId ? ['membaca', 'lalu', 'membahas', 'cerita', 'kemarin'] : ['nagsulat', 'sugilanon', 'dayon', 'gahapon', 'didto'])].map(translated),
      recall: { before: first.split(word)[0], answer: word, after: first.split(word)[1], fallbackChoices: [word, 'aaa', 'bbb', 'ccc'] },
      speakRequired: isId ? ['kemarin', 'membaca', word] : ['gahapon', 'nagsulat', word],
      sceneCaption: { de: `Test: „${opening}“`, en: `Test: “${opening}”` },
      trophyWord: { word, meaning: base('Synthetic token'), example: first, whyThisWord: base('Test only') },
      distractors: ['synthetic wrong one', 'synthetic wrong two'], placeholderCaption: base('Test only'), songMood: 'Test', visualNotes: 'Test' }
  })
  return { spec, draft: { schemaVersion: 1, status: 'draft', level: 'B1', targetLanguage: language,
    targetLanguageCode: isId ? 'id-ID' : 'ceb-PH', baseLanguage: 'German', pathNumber: 1,
    title: base('Fixture'), subtitle: base('Fixture'), anchor: 'Fixture only', lessons } }
}
for (const language of ['Indonesian', 'Cebuano'] as const) {
  const value = fixture(language)
  assert.equal(validateNativeB1Draft(value.draft, value.spec).lessons.length, 10)
}
let checks = 0
function rejects(name: string, change: (value: ReturnType<typeof fixture>) => void, reason: RegExp, language: 'Indonesian' | 'Cebuano' = 'Indonesian') {
  const value = fixture(language)
  change(value)
  assert.throws(() => validateNativeB1Draft(value.draft, value.spec), reason, name)
  checks++
}
rejects('Wrong locale', x => { x.draft.targetLanguageCode = 'ceb-PH' }, /language\/code/)
rejects('Wrong spec', x => { x.spec.targetLanguage = 'Cebuano' }, /Specification target/)
rejects('Partial path', x => { x.draft.lessons.pop() }, /10/)
rejects('Missing allocation path', x => { x.spec.paths.pop() }, /10/)
rejects('Reordered paths', x => { x.spec.paths[1].pathNumber = 3 }, /ordered 1–10/)
rejects('Reordered lessons', x => { x.spec.paths[0].lessons[1].number = 4 }, /ordered 1–10/)
rejects('Repeated allocation', x => { x.spec.paths[1].lessons[0].trophy = x.spec.paths[0].lessons[0].trophy }, /Duplicate or frozen/)
rejects('Frozen trophy', x => {
  x.spec.paths[1].lessons[0].trophy = GUIDED_LESSONS.find(lesson => lesson.targetLanguage === 'Indonesian'
    && /^[a-z]+$/u.test(lesson.vibeVariants.bright?.trophyWord.word ?? ''))!.vibeVariants.bright!.trophyWord.word
}, /Duplicate or frozen/)
rejects('Wrong assigned trophy', x => { x.draft.lessons[0].trophyWord.word = 'wrongword' }, /exact allocation/)
rejects('Repeated slug', x => { x.draft.lessons[1].slug = x.draft.lessons[0].slug }, /Duplicate slug/)
rejects('Chunk reconstruction', x => { x.draft.lessons[0].chunks[0].targetText += ' salah' }, /Chunks must reconstruct/)
rejects('Duplicate chips', x => { x.draft.lessons[0].distractors[0] = x.draft.lessons[0].chunks[0].targetText }, /Build chips/)
rejects('Duplicate terms', x => { x.draft.lessons[0].terms[1] = x.draft.lessons[0].terms[0] }, /Terms must be distinct/)
rejects('Cloze reconstruction', x => { x.draft.lessons[0].cloze[0] = 'Wrong ' }, /Cloze must reconstruct/)
rejects('Wrong recall', x => { x.draft.lessons[0].recall.after += 'wrong' }, /Recall must reconstruct/)
rejects('Invalid token', x => { x.draft.lessons[0].speakRequired[0] = 'kemar' }, /Invalid speech token/)
rejects('No substring trophy', x => { x.draft.lessons[0].trophyWord.example = 'prefixtestitemaa suffixtestitemaa' }, /whole-word anchors/)
rejects('No hyphen fragment', x => { x.draft.lessons[0].trophyWord.example = 'testitemaa-lain' }, /whole-word anchors/)
rejects('No pronoun speech token', x => { x.draft.lessons[0].speakRequired[0] = 'aku' }, /Invalid speech token/)
rejects('Both captions checked', x => { x.draft.lessons[0].sceneCaption.en = 'No opening' }, /quote the opening/)
rejects('Caption spoiler', x => { x.draft.lessons[0].sceneCaption.en += x.draft.lessons[0].dialogue[2].targetText }, /quote later turn/)
rejects('Noncontiguous highlight', x => { x.draft.lessons[0].pattern.examples[0].highlight = 'not present' }, /contiguous/)
rejects('Non-NFC explanation', x => { x.draft.title.de = 'Cafe\u0301' }, /NFC/)
rejects('Hidden controls', x => { x.draft.title.de = 'Test\u200btext' }, /controls/)
rejects('Digits in spoken text', x => { x.draft.lessons[0].terms[0].targetText = 'dua 2' }, /digits/)
rejects('Banned learner register', x => { x.draft.lessons[0].dialogue[3].targetText += ' dong' }, /Banned Indonesian/)
rejects('Cebuano clitic token', x => { x.draft.lessons[0].speakRequired[0] = 'ko' }, /Invalid speech token/, 'Cebuano')
rejects('Tagalog token', x => { x.draft.lessons[0].dialogue[0].targetText += ' po' }, /Tagalog/, 'Cebuano')
rejects('Reconstructing cloze suffix', x => {
  const cloze = x.draft.lessons[0].cloze
  cloze[0] = 'Aku s'
  if (typeof cloze[1] !== 'string') { cloze[1].answer = 'udah'; cloze[1].choices[0] = 'udah' }
}, /whole words at its actual position/)
rejects('Reconstructing cloze prefix', x => {
  const cloze = x.draft.lessons[0].cloze
  if (typeof cloze[1] !== 'string') { cloze[1].answer = 'sud'; cloze[1].choices[0] = 'sud' }
  cloze[2] = 'ah memilih cerita itu '
}, /whole words at its actual position/)
rejects('Recall occurrence elsewhere cannot authorize a substring', x => {
  const lesson = x.draft.lessons[0]
  lesson.dialogue[1].targetText += ' testitemaaextra'
  lesson.chunks[3].targetText += ' testitemaaextra'
  lesson.recall.before = lesson.dialogue[1].targetText.slice(0, -'testitemaaextra'.length)
  lesson.recall.after = 'extra'
}, /Recall must span a whole word/)
for (const answer of ['siya', 'ang']) rejects(`Cebuano bare ${answer}`, x => {
  const lesson = x.draft.lessons[0]
  lesson.dialogue[3].targetText = `Dayon nagsulat ${answer} og sugilanon samtang naghulat didto.`
  lesson.cloze = ['Dayon nagsulat ', { kind: 'choice', answer, choices: [answer, 'aaa', 'bbb', 'ccc'] },
    ' og sugilanon ', { kind: 'connector', answer: 'samtang', choices: ['samtang', 'aaa', 'bbb', 'ccc'] }, ' naghulat didto.']
}, /bare pronoun or article/, 'Cebuano')
function connectorFixture(value: ReturnType<typeof fixture>, answer = 'kay') {
  const lesson = value.draft.lessons[0]
  lesson.dialogue[3].targetText = `Dayon nagsulat ko og sugilanon ${answer} naghulat didto.`
  lesson.cloze = ['Dayon ', { kind: 'choice', answer: 'nagsulat', choices: ['nagsulat', 'aaa', 'bbb', 'ccc'] },
    ' ko og sugilanon ', { kind: 'connector', answer, choices: [answer, 'aaa', 'bbb', 'ccc'] }, ' naghulat didto.']
}
const conjunction = fixture('Cebuano')
connectorFixture(conjunction)
assert.equal(validateNativeB1Draft(conjunction.draft, conjunction.spec).lessons.length, 10)
for (const kind of ['choice', 'form']) rejects(`Cebuano kay exception excludes ${kind}`, x => {
  connectorFixture(x)
  const blank = x.draft.lessons[0].cloze[3]
  if (typeof blank !== 'string') {
    blank.kind = kind
    if (kind === 'form') Object.assign(blank, { cue: 'Test' })
  }
}, /Invalid cloze answer/, 'Cebuano')
for (const answer of ['siya', 'ko']) rejects(`Connector label cannot allow ${answer}`, x => {
  connectorFixture(x, answer)
}, /Invalid cloze answer|bare pronoun or article/, 'Cebuano')
rejects('Conjunction exception does not allow speech kay', x => {
  x.draft.lessons[0].speakRequired[0] = 'kay'
}, /Invalid speech token/, 'Cebuano')
console.log(`Native B1 structural gate: 3 positive fixtures and ${checks} adversarial cases PASS; semantic review remains separate.`)
