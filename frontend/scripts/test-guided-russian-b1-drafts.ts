/** Offline engineering fixtures. Synthetic lessons below are deliberately not curriculum or native approval.
 * Run from frontend: node --import tsx scripts/test-guided-russian-b1-drafts.ts
 * Reads actual reviewed drafts and the controlling full specification; writes nothing and calls no services. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import {
  RUSSIAN_B1_BINDINGS, RUSSIAN_PRONOUN_TOKENS, RUSSIAN_SPEAKER_DENYLIST, reviewRussianB1Draft,
  russianB1DraftSchema, russianWords, validateRussianB1Draft, type RussianB1Draft,
} from './lib/guidedRussianB1Drafts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../content-drafts/b1-native-2026-10/russian')
const read = (relative: string): unknown => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'))
const spec = read('specification.json')
const actualP1 = russianB1DraftSchema.parse(read('p1.json'))
const actualP2 = russianB1DraftSchema.parse(read('p2.json'))
// The staged specification is LF; recover the exact archived CRLF authority for this historical hash.
const hash = (relative: string) => {
  const raw = fs.readFileSync(path.join(root, relative))
  return createHash('sha256').update(relative === 'specification.json' ? raw.toString('utf8').replace(/\r?\n/g, '\r\n') : raw).digest('hex')
}
const clone = <T>(value: T): T => structuredClone(value)
const base = { de: 'Synthetischer Strukturtest; kein Lerninhalt.', en: 'Synthetic structural test; not curriculum.' }
const translated = (targetText: string) => ({ targetText, baseText: { ...base } })
type Lesson = RussianB1Draft['lessons'][number]
type Blank = Exclude<Lesson['cloze'][number], string>
const blank = (lesson: Lesson, n = 0): Blank => lesson.cloze.filter((part): part is Blank => typeof part !== 'string')[n]

/** Metalinguistic fixture carriers intentionally do not claim to satisfy the episode's native beat. */
function synthetic(): RussianB1Draft {
  const draft = clone(actualP2)
  draft.title = { ...base }; draft.subtitle = { ...base }; draft.anchor = 'Synthetic engineering fixture, never publish.'
  draft.lessons = actualP2.lessons.map((source, i): Lesson => {
    const trophy = source.trophyWord.word
    const first = `Сегодня мы обсуждаем слово «${trophy}», потом спокойно читаем учебные примеры.`
    const opening = 'Вы сегодня читаете учебный пример и проверяете длину этой фразы?'
    const closing = 'Мы читаем новый пример и потом обсуждаем трудные слова.'
    return {
      slug: `synthetic-test-${i + 1}`, title: { ...base }, situation: { ...base },
      pedagogicalGoal: 'Nur mechanische Prüfung, keine veröffentlichbare Lektion.', register: 'formal',
      dialogue: [translated(opening), translated(first), translated('Теперь на странице есть другой пример. Пожалуйста, прочитайте его внимательно.'), translated(closing)],
      pattern: { label: 'Synthetisches Strukturmuster', rule: { ...base }, examples: [
        { ...translated(first), highlight: 'мы обсуждаем' },
        { ...translated('Мы спокойно читаем простые примеры и обсуждаем новые слова.'), highlight: 'читаем простые примеры' },
      ] },
      cloze: ['Мы ', { kind: 'form', answer: 'читаем', cue: 'читать — мы, настоящее время', choices: ['читаем', 'читают', 'читаете', 'читает'] },
        ' новый пример и потом ', { kind: 'form', answer: 'обсуждаем', cue: 'обсуждать — мы, настоящее время', choices: ['обсуждаем', 'обсуждают', 'обсуждаете', 'обсуждает'] }, ' трудные слова.'],
      chunks: ['Сегодня мы обсуждаем', `слово «${trophy}»,`, 'потом спокойно читаем', 'учебные примеры.'].map(translated),
      terms: ['сегодня', 'обсуждаем', trophy, 'читаем', 'учебные примеры', 'трудные слова'].map(translated),
      recall: { before: '', answer: 'Сегодня', after: first.slice('Сегодня'.length), fallbackChoices: ['Сегодня', 'Завтра', 'Вчера', 'Утром'] },
      speakRequired: ['сегодня', 'обсуждаем', 'слово'],
      sceneCaption: { de: `Strukturtest: „${opening}“`, en: `Structural test: “${opening}”` },
      trophyWord: { word: trophy, meaning: { ...base }, example: `В этом примере есть слово «${trophy}».`, whyThisWord: { ...base } },
      distractors: ['завтра громко поём', 'старые книги.'], placeholderCaption: { ...base },
      songMood: 'No audio: synthetic fixture.', visualNotes: 'No image: synthetic fixture.',
    }
  })
  return draft
}

let passed = 0
const test = (name: string, run: () => void) => {
  try { run(); passed++; console.log(`PASS ${name}`) }
  catch (error) { console.error(`FAIL ${name}`); throw error }
}
const rejected = (name: string, mutate: (draft: RussianB1Draft) => void, reason: RegExp, seed?: RussianB1Draft) => {
  test(name, () => { const draft = clone(seed ?? synthetic()); mutate(draft); assert.throws(() => reviewRussianB1Draft(draft, spec), reason) })
}
function replaceClosing(lesson: Lesson, closing: string, cloze: Lesson['cloze']) {
  lesson.dialogue[3].targetText = closing; lesson.cloze = cloze
}
const alterFirst = (lesson: Lesson, from: string, to: string) => {
  const old = lesson.dialogue[1].targetText
  lesson.dialogue[1].targetText = old.replace(from, to)
  lesson.chunks.forEach(chunk => { chunk.targetText = chunk.targetText.replace(from, to) })
  lesson.pattern.examples.forEach(example => {
    if (example.targetText === old) { example.targetText = example.targetText.replace(from, to); example.highlight = example.highlight.replace(from, to) }
  })
  lesson.recall.before = lesson.recall.before.replace(from, to)
  lesson.recall.after = lesson.recall.after.replace(from, to)
}

test('exact specification and reviewed source file hashes', () => {
  assert.equal(hash('specification.json'), RUSSIAN_B1_BINDINGS.specificationFileSha256)
  assert.equal(hash('p1.json'), RUSSIAN_B1_BINDINGS.reviewedP1Sha256)
  assert.equal(hash('p2.json'), RUSSIAN_B1_BINDINGS.reviewedP2Sha256)
})
test('actual reviewed twenty: genuine identity, full hundred and actual two hundred frozen', () => {
  for (const draft of [actualP1, actualP2]) {
    const report = reviewRussianB1Draft(draft, spec)
    assert.equal(report.draft.targetLanguage, 'Russian'); assert.equal(report.draft.targetLanguageCode, 'ru-RU')
    assert.deepEqual(report.coverage, { lessons: 10, fullAllocatedTrophies: 100, frozenLessons: 200, frozenTrophies: 200, genderAlternatives: draft.pathNumber === 1 ? 7 : 0 })
    assert.equal(report.scope, 'canonical-structure-only')
    for (const warning of ['RU-STAGING-SURFACE', 'RU-SEMANTICS', 'RU-EXERCISE', 'RU-INPUT-HOLD']) assert.equal(report.warnings.filter(item => item.includes(warning)).length, 10)
  }
})
test('synthetic ten carry the actual ordered trophies without semantic certification', () => {
  const result = reviewRussianB1Draft(synthetic(), spec)
  assert.equal(result.coverage.lessons, 10); assert.equal(result.scope, 'canonical-structure-only')
  assert.ok(result.warnings.some(warning => warning.includes('new complication')))
  assert.deepEqual(validateRussianB1Draft(synthetic(), spec), result.draft)
})
test('punctuation boundaries and Cyrillic compounds are whole words', () => {
  assert.deepEqual(russianWords('«Сначала», потом; по-русски,пришёл.'), ['сначала', 'потом', 'по-русски', 'пришёл'])
  assert.deepEqual(russianWords('несначала сначала-то'), ['несначала', 'сначала-то'])
})
test('valid third-person past and neuter agreement survive without suffix guessing', () => {
  const accepted = reviewRussianB1Draft(actualP1, spec)
  for (const n of [3, 4, 7, 8]) assert.equal(accepted.draft.lessons[n].genderAlternatives?.['3'], undefined)
  assert.deepEqual([blank(actualP1.lessons[3]).answer, blank(actualP1.lessons[4], 1).answer,
    blank(actualP1.lessons[7]).answer, blank(actualP1.lessons[8], 1).answer], ['понравилась', 'продолжилась', 'готовил', 'довёз'])
})
test('все is contextual and not blanket-replaced with всё', () => {
  const draft = synthetic(); draft.lessons[0].pattern.examples[1].targetText = 'Мы читаем простые примеры, и все слушают внимательно.'
  draft.lessons[0].pattern.examples[1].highlight = 'все слушают'
  assert.ok(reviewRussianB1Draft(draft, spec).warnings.some(item => item.includes('RU-YO-CONTEXT')))
})
test('closed-list third-person predicate gets subject warning rather than false speaker rejection', () => {
  const draft = synthetic(), lesson = draft.lessons[0]
  replaceClosing(lesson, 'Наш тренер готов, мы читаем примеры и обсуждаем трудные слова.', [
    'Наш тренер готов, мы ', blank(lesson), ' примеры и ', blank(lesson, 1), ' трудные слова.',
  ])
  assert.ok(reviewRussianB1Draft(draft, spec).warnings.some(item => item.includes('RU-GENDER-CONTEXT')))
})
test('е-fold can match a canonical ё speech token without changing source spelling', () => {
  const draft = clone(actualP1); draft.lessons[5].speakRequired[2] = 'жилье'
  assert.equal(reviewRussianB1Draft(draft, spec).coverage.genderAlternatives, 7)
})
test('legitimate hyphenated word is accepted as a single target word', () => {
  const draft = synthetic(); draft.lessons[0].terms[5].targetText = 'по-русски'
  assert.doesNotThrow(() => reviewRussianB1Draft(draft, spec))
})
test('inherited A2 future and interlocutor-only unstaged ли/раньше stay allowed', () => {
  assert.doesNotThrow(() => reviewRussianB1Draft(actualP1, spec))
  assert.doesNotThrow(() => reviewRussianB1Draft(actualP2, spec))
  assert.match(actualP1.lessons[9].dialogue[3].targetText, /будем/)
  assert.match(actualP2.lessons[2].dialogue[0].targetText, /ли/)
})

// Shape and identity: no relabeling to Latin, no new acceptance or metadata fields.
rejected('reject Latin identity', draft => { Object.assign(draft, { targetLanguage: 'English', targetLanguageCode: 'en-US' }) }, /Russian|ru-RU/)
rejected('reject correct name with wrong locale', draft => { Object.assign(draft, { targetLanguageCode: 'ru' }) }, /ru-RU/)
rejected('reject wrong base language', draft => { Object.assign(draft, { baseLanguage: 'English' }) }, /German/)
rejected('reject false reviewed status', draft => { Object.assign(draft, { status: 'reviewed' }) }, /draft/)
rejected('reject unsupported future path', draft => { draft.pathNumber = 3 }, /pathNumber/)
rejected('reject missing lesson', draft => { draft.lessons.pop() }, /10/)
rejected('reject extra lesson', draft => { draft.lessons.push(clone(draft.lessons[0])) }, /10/)
rejected('reject fifth turn', draft => { draft.lessons[0].dialogue.push(translated('Проверка.')) }, /4/)
rejected('reject unknown runtime variants', draft => { Object.assign(draft.lessons[0], { acceptedPhraseVariants: ['Проверка.'] }) }, /acceptedPhraseVariants/)
rejected('reject spoofed semantic note field', draft => { Object.assign(draft.lessons[0], { semanticNotes: 'PASS' }) }, /semanticNotes/)
rejected('reject unknown top-level field', draft => { Object.assign(draft, { reviewed: true }) }, /reviewed/)
rejected('reject duplicate slug', draft => { draft.lessons[1].slug = draft.lessons[0].slug }, /Duplicate lesson slug/)
rejected('reject informal metadata', draft => { draft.lessons[0].register = 'informal' }, /formal вы/)
rejected('reject neutral metadata', draft => { draft.lessons[0].register = 'neutral' }, /formal вы/)
rejected('reject missing English base', draft => { delete draft.lessons[0].chunks[0].baseText.en }, /German and English bases/)
rejected('reject missing English scene', draft => { delete draft.lessons[0].sceneCaption.en }, /German and English bases/)
rejected('reject unexpected locale key', draft => { Object.assign(draft.lessons[0].terms[0].baseText, { fr: 'test' }) }, /fr/)
rejected('reject German du in spoken formal base', draft => { draft.lessons[0].dialogue[0].baseText.de = 'Wie geht es dir?' }, /preserve formal/)
rejected('reject invisible control', draft => { draft.lessons[0].situation.de += '\u200b' }, /NFC text without controls/)
rejected('reject non-NFC source', draft => { draft.lessons[0].title.de = 'Cafe\u0301' }, /NFC text without controls/)

const specMutations: Array<[string, (s: { paths: Array<{ pathNumber: number; lessons: Array<{ number: number; trophy: string }>; staging: Array<{ productive: string }> }>; registerPolicy: string; targetLanguageCode: string }) => void, RegExp]> = [
  ['path order', s => { [s.paths[8], s.paths[9]] = [s.paths[9], s.paths[8]] }, /paths must be ordered/],
  ['lesson order on unused P10', s => { [s.paths[9].lessons[8], s.paths[9].lessons[9]] = [s.paths[9].lessons[9], s.paths[9].lessons[8]] }, /lessons must be ordered/],
  ['allocation duplicate on unused P10', s => { s.paths[9].lessons[9].trophy = s.paths[0].lessons[0].trophy }, /Duplicate or frozen trophy allocation/],
  ['frozen collision on unused P10', s => { s.paths[9].lessons[9].trophy = 'кофе' }, /Duplicate or frozen trophy allocation: кофе/],
  ['staging metadata change', s => { s.paths[0].staging[0].productive = 'silently broadened' }, /metadata\/staging\/allocation binding changed/],
  ['register policy change', s => { s.registerPolicy = 'ты permitted' }, /metadata\/staging\/allocation binding changed/],
  ['wrong spec locale', s => { s.targetLanguageCode = 'en-US' }, /ru-RU/],
  ['missing full path', s => { s.paths.pop() }, /10/],
]
for (const [name, mutate, reason] of specMutations) test(`reject specification ${name}`, () => {
  const changed = clone(spec) as Parameters<typeof mutate>[0]; mutate(changed)
  assert.throws(() => reviewRussianB1Draft(synthetic(), changed), reason)
})
rejected('reject wrong lesson allocation', draft => { draft.lessons[0].trophyWord.word = 'сначала' }, /exact allocation/)
rejected('reject trophy only inside longer word', draft => { draft.lessons[0].trophyWord.example = 'Это некажется.' }, /whole canonical trophy/)
rejected('reject trophy inside hyphenated compound', draft => { draft.lessons[0].trophyWord.example = 'Кажется-то.' }, /whole canonical trophy/)

for (let turn = 0; turn < 4; turn++) {
  rejected(`reject too short dialogue ${turn}`, draft => { draft.lessons[0].dialogue[turn].targetText = 'Это коротко.' }, new RegExp(`Dialogue ${turn} requires`))
  rejected(`reject too long dialogue ${turn}`, draft => { draft.lessons[0].dialogue[turn].targetText = 'Очень '.repeat(17).trim() + '.' }, new RegExp(`Dialogue ${turn} requires`))
}
rejected('reject chunk mismatch', draft => { draft.lessons[0].chunks[0].targetText = 'Мы обсуждаем' }, /Chunks must reconstruct/)
rejected('reject duplicate build chip', draft => { draft.lessons[0].distractors[0] = draft.lessons[0].chunks[0].targetText }, /Build chips must be distinct/)
rejected('reject duplicate terms under ё fold', draft => { draft.lessons[0].terms[0].targetText = 'всё'; draft.lessons[0].terms[1].targetText = 'все' }, /Terms must have distinct/)
rejected('reject only three chunks', draft => { draft.lessons[0].chunks.pop() }, /4/)
rejected('reject only five terms', draft => { draft.lessons[0].terms.pop() }, /6/)
rejected('reject only one cloze blank', draft => { draft.lessons[0].cloze[3] = blank(draft.lessons[0], 1).answer }, /2–3 cloze blanks/)
rejected('reject closing reconstruction mismatch', draft => { draft.lessons[0].cloze[0] = 'Вы ' }, /Cloze must reconstruct/)
rejected('reject missing form cue', draft => { delete blank(draft.lessons[0]).cue }, /cue required iff/)
rejected('reject connector cue', draft => { blank(draft.lessons[0]).kind = 'connector' }, /cue required iff/)
rejected('reject no canonical cloze choice', draft => { blank(draft.lessons[0]).choices[0] = 'читал' }, /exactly one canonical answer/)
rejected('reject repeated cloze canonical answer', draft => { blank(draft.lessons[0]).choices[1] = 'читаем' }, /exactly one canonical answer/)
rejected('reject fold-ambiguous cloze choices', draft => { blank(draft.lessons[0]).choices[1] = 'всё'; blank(draft.lessons[0]).choices[2] = 'все' }, /ё\/е ambiguity/)
rejected('reject partial cloze word despite exact reconstruction', draft => {
  const l = draft.lessons[0]; l.cloze[0] = 'Мы чи'; blank(l).answer = 'таем'; blank(l).choices = ['таем', 'тают', 'таете', 'тает']
}, /answer must occupy complete words/)
rejected('reject cloze answer with edge punctuation', draft => {
  const l = draft.lessons[0], b = blank(l, 1); b.answer = 'обсуждаем трудные слова.'; b.choices[0] = b.answer; l.cloze[4] = ''
}, /answer must occupy complete words/)
rejected('reject bare pronoun cloze', draft => {
  const l = draft.lessons[0]; l.cloze[0] = ''; blank(l).answer = 'Мы'; blank(l).choices = ['Мы', 'Вы', 'Они', 'Она']; l.cloze[2] = ' читаем новый пример и потом '
}, /substantive answer/)
for (const token of RUSSIAN_SPEAKER_DENYLIST) {
  rejected(`reject exact closed gender token in cloze choice: ${token}`, draft => { blank(draft.lessons[0]).choices[1] = token }, /speaker-agreeing choice is forbidden/)
}
rejected('reject lesson-reviewed speaker form in cloze choice', draft => { blank(draft.lessons[3]).choices[1] = 'приехал' }, /speaker-agreeing choice is forbidden/, actualP1)
rejected('reject reviewed irregular gender form with е spelling in choice', draft => { blank(draft.lessons[5]).choices[1] = 'нашел' }, /speaker-agreeing choice is forbidden/, actualP1)
rejected('reject speaker token hidden in multiword cloze choice', draft => { blank(draft.lessons[0]).choices[1] = 'совсем готов' }, /speaker-agreeing choice is forbidden/)
rejected('reject recall reconstruction mismatch', draft => { draft.lessons[0].recall.after += ' пример' }, /Recall must reconstruct/)
rejected('reject partial recall word despite exact reconstruction', draft => {
  draft.lessons[0].recall = { before: 'Сегодня мы об', answer: 'суждаем', after: ' слово «кажется», потом спокойно читаем учебные примеры.', fallbackChoices: ['суждаем', 'читаем', 'пишем', 'поём'] }
}, /Recall answer must occupy a complete word/)
rejected('reject unlisted canonical recall', draft => { draft.lessons[0].recall.fallbackChoices[0] = 'Вечером' }, /Recall: four distinct/)
rejected('reject duplicate recall under ё fold', draft => { draft.lessons[0].recall.fallbackChoices[1] = 'всё'; draft.lessons[0].recall.fallbackChoices[2] = 'все' }, /Recall: four distinct/)
rejected('reject short recall', draft => { draft.lessons[0].recall.answer = 'мы' }, /at least four letters/)
rejected('reject pronoun speech token', draft => { draft.lessons[0].speakRequired[0] = 'этот' }, /Invalid speech token/)
rejected('reject absent speech token', draft => { draft.lessons[0].speakRequired[0] = 'завтра' }, /Invalid speech token/)
rejected('reject short speech token', draft => { draft.lessons[0].speakRequired[0] = 'мы' }, /Invalid speech token/)
rejected('reject duplicate speech token', draft => { draft.lessons[0].speakRequired[1] = 'Сегодня' }, /Three distinct speech tokens/)
rejected('reject speech substring', draft => { draft.lessons[0].speakRequired[0] = 'обсужда' }, /Invalid speech token/)
rejected('reject speech token inside a compound', draft => { alterFirst(draft.lessons[0], 'обсуждаем', 'не-обсуждаем') }, /Invalid speech token/)
rejected('reject canonical speaker agreement as required speech', draft => { draft.lessons[3].speakRequired[0] = 'приехала' }, /Invalid speech token/, actualP1)
rejected('reject speaker agreement as recall answer', draft => {
  const l = draft.lessons[3]; l.recall = { before: 'Сначала я ', answer: 'приехала', after: ' в центр, затем посетила музей и поднялась на башню.', fallbackChoices: ['приехала', 'читали', 'поём', 'едем'] }
}, /gender-neutral content word/, actualP1)

// RU-B1-GATE-01: coupled, reason-asserted pronoun-target probes on all three surfaces (synthetic carriers, not content).
const pronounCloze = (lesson: Lesson, token: string) => replaceClosing(lesson, `Мы читаем ${token} пример и потом обсуждаем трудные слова.`, [
  'Мы читаем ', { kind: 'choice', answer: token, choices: [token, 'письмо', 'утром', 'вечером'] }, ' пример и потом ', blank(lesson, 1), ' трудные слова.',
])
const pronounFirst = (lesson: Lesson, token: string) => { alterFirst(lesson, 'спокойно', token); lesson.speakRequired = ['сегодня', 'обсуждаем', token] }
const pronounRecall = (lesson: Lesson, token: string) => {
  alterFirst(lesson, 'спокойно', token)
  lesson.recall = { before: 'Сегодня мы обсуждаем слово «кажется», потом ', answer: token, after: ' читаем учебные примеры.', fallbackChoices: [token, 'читали', 'поём', 'едем'] }
}
test('pronoun inventory is exact-token and excludes ordinary nouns and the то connector', () => {
  const set = new Set(RUSSIAN_PRONOUN_TOKENS)
  for (const token of ['ей', 'него', 'нему', 'нём', 'них', 'ими', 'ею', 'собою', 'своего', 'этому', 'кому', 'чем']) assert.ok(set.has(token), token)
  for (const token of ['то', 'музей', 'село', 'сила', 'нега', 'вами-то']) assert.ok(!set.has(token), token)
})
rejected('reject reproduction A: bare pronoun ей as cloze answer', draft => replaceClosing(draft.lessons[0], 'Я читаю ей письмо и потом спокойно обсуждаю трудные слова.', [
  'Я читаю ', { kind: 'choice', answer: 'ей', choices: ['ей', 'ему', 'им', 'нам'] }, ' письмо и потом спокойно ',
  { kind: 'form', answer: 'обсуждаю', cue: 'обсуждать — я, настоящее время', choices: ['обсуждаю', 'обсуждаем', 'обсуждают', 'обсуждать'] }, ' трудные слова.',
]), /Cloze 1: substantive answer required; a bare pronoun or да\/нет is forbidden/)
for (const token of ['него', 'ему', 'ими', 'себе', 'своего', 'этому', 'кому', 'нет']) {
  rejected(`reject bare declined pronoun cloze answer ${token}`, draft => pronounCloze(draft.lessons[0], token), /a bare pronoun or да\/нет is forbidden/)
}
for (const token of ['него', 'ними', 'своего', 'этому']) {
  rejected(`reject pronoun recall answer ${token}`, draft => pronounRecall(draft.lessons[0], token), /Recall answer must be a gender-neutral content word, not a bare pronoun/)
  rejected(`reject pronoun speech target ${token}`, draft => pronounFirst(draft.lessons[0], token), new RegExp(`Invalid speech token: ${token}; pronouns are never speech targets`))
}
test('reproduction B fails for both recall and speech pronoun reasons at once', () => {
  const draft = synthetic(), l = draft.lessons[0], previous = l.dialogue[1].targetText
  l.dialogue[1].targetText = 'Мне кажется, что рядом с ними тихо, но возле него шумно.'
  l.chunks = ['Мне кажется, что', 'рядом с ними тихо,', 'но возле него', 'шумно.'].map(translated)
  for (const ex of l.pattern.examples) if (ex.targetText === previous) { ex.targetText = l.dialogue[1].targetText; ex.highlight = 'Мне кажется' }
  l.recall = { before: 'Мне кажется, что рядом с ними тихо, но возле ', answer: 'него', after: ' шумно.', fallbackChoices: ['него', 'дома', 'утром', 'вечером'] }
  l.speakRequired = ['кажется', 'рядом', 'него']
  assert.throws(() => reviewRussianB1Draft(draft, spec), (error: Error) => /not a bare pronoun/.test(error.message) && /Invalid speech token: него; pronouns are never speech targets/.test(error.message))
})
test('in-sentence pronouns and real nouns are not banned: only exercise targets are checked', () => {
  const draft = synthetic(), l = draft.lessons[0]
  replaceClosing(l, 'Я читаю ей письмо и потом спокойно обсуждаю трудные слова.', [
    'Я читаю ей ', { kind: 'choice', answer: 'письмо', choices: ['письмо', 'книгу', 'журнал', 'записку'] }, ' и потом спокойно ',
    { kind: 'form', answer: 'обсуждаю', cue: 'обсуждать — я, настоящее время', choices: ['обсуждаю', 'обсуждаем', 'обсуждают', 'обсуждать'] }, ' трудные слова.',
  ])
  alterFirst(l, 'спокойно', 'музей'); l.speakRequired = ['сегодня', 'обсуждаем', 'музей']
  assert.doesNotThrow(() => reviewRussianB1Draft(draft, spec))
})
test('third-person speaker gender in a closing stays accepted; pronoun check does not touch it', () => {
  const draft = synthetic(), l = draft.lessons[0]
  replaceClosing(l, 'Она сказала, что мы читаем пример и потом обсуждаем трудные слова.', [
    'Она сказала, что мы ', blank(l), ' пример и потом ', blank(l, 1), ' трудные слова.',
  ])
  assert.doesNotThrow(() => reviewRussianB1Draft(draft, spec))
})
test('multiword cloze answer containing a pronoun remains a substantive answer', () => {
  const draft = synthetic(), l = draft.lessons[0]
  replaceClosing(l, 'Мы читаем у него дома пример и потом обсуждаем трудные слова.', [
    'Мы читаем ', { kind: 'choice', answer: 'у него дома', choices: ['у него дома', 'на работе', 'в парке', 'в классе'] }, ' пример и потом ', blank(l, 1), ' трудные слова.',
  ])
  assert.doesNotThrow(() => reviewRussianB1Draft(draft, spec))
})
rejected('reject disconnected pattern highlight', draft => { draft.lessons[0].pattern.examples[1].highlight = 'такого здесь нет' }, /contiguous substring/)
rejected('reject no reused example', draft => { draft.lessons[0].pattern.examples[0].targetText = 'Мы обсуждаем другой пример.' }, /Exactly one pattern example/)
rejected('reject twice-reused example', draft => { draft.lessons[0].pattern.examples[1] = clone(draft.lessons[0].pattern.examples[0]) }, /Exactly one pattern example/)
rejected('reject no quote enclosure', draft => { draft.lessons[0].sceneCaption.en = draft.lessons[0].dialogue[0].targetText + ' some unrelated “quote”' }, /inside paired quotes/)
rejected('reject partial opener quote', draft => { draft.lessons[0].sceneCaption.en = '“Вы сегодня читаете?”' }, /complete opening/)
rejected('reject full follow-up leaked in English caption', draft => { draft.lessons[0].sceneCaption.en += draft.lessons[0].dialogue[2].targetText }, /complete complication/)
rejected('reject four follow-up words with intervening punctuation', draft => { draft.lessons[0].sceneCaption.de += ' ТЕПЕРЬ, на: странице есть.' }, /four complication words/)

for (const [name, surface] of [
  ['Latin letter', 'примeр'], ['digit', 'два 2'], ['transliteration', 'spasibo'], ['emoji', 'пример 🙂'],
  ['tab', 'два\tслова'], ['newline', 'два\nслова'], ['nbsp', 'два\u00a0слова'], ['double spaces', 'два  слова'],
  ['standalone punctuation', '—'], ['edge space', ' пример'], ['disallowed slash', 'да/нет'],
] as const) rejected(`reject target ${name}`, draft => { draft.lessons[0].terms[0].targetText = surface }, /Cyrillic target|NFC text|Unexpected edge whitespace/)
for (const location of ['distractor', 'recall choice', 'cloze choice', 'highlight', 'example', 'speech'] as const) {
  rejected(`reject Latin target in ${location}`, draft => {
    const l = draft.lessons[0]
    if (location === 'distractor') l.distractors[0] = 'Latin'
    else if (location === 'recall choice') l.recall.fallbackChoices[1] = 'Latin'
    else if (location === 'cloze choice') blank(l).choices[1] = 'Latin'
    else if (location === 'highlight') l.pattern.examples[0].highlight = 'Latin'
    else if (location === 'example') l.pattern.examples[1].targetText = 'Latin'
    else l.speakRequired[0] = 'Latin'
  }, /Cyrillic target/)
}
for (const token of ['ты', 'тебя', 'тебе', 'тобой', 'твоих', 'чё', 'ваще', 'короче', 'осуществить', 'являться']) {
  rejected(`reject register exact token ${token}`, draft => { draft.lessons[0].terms[0].targetText = token }, /forbidden informal/)
}
for (const token of ['еще', 'идет', 'счет', 'ее', 'партнер', 'насчет']) {
  rejected(`reject curated missing ё: ${token}`, draft => { draft.lessons[0].terms[0].targetText = token }, /curated ё spelling/)
}
for (const token of ['бы', 'который', 'которыми', 'ли', 'чтобы', 'сделано', 'закрыто', 'оформлено', 'проверяется', 'раньше', 'перестал', 'однако', 'хотя']) {
  rejected(`reject premature productive ${token}`, draft => { alterFirst(draft.lessons[0], 'спокойно', token) }, /Premature productive surface/)
}
rejected('reject premature background clause', draft => { draft.lessons[0].dialogue[3].targetText = 'Когда мы гуляли по центру, потом любовались старыми домами.' }, /P1 L7 background clause/, actualP1)
rejected('reject premature если … то', draft => { alterFirst(draft.lessons[0], 'потом спокойно', 'если то') }, /P7 L4 если/)
test('whole-word staging tripwires do not reject word-internal substrings', () => {
  const draft = synthetic(); alterFirst(draft.lessons[0], 'спокойно', 'выборочно')
  assert.doesNotThrow(() => reviewRussianB1Draft(draft, spec))
})

for (let index = 3; index < 10; index++) {
  rejected(`reject missing full male alternate P1 L${index + 1}`, draft => { delete draft.lessons[index].genderAlternatives }, /Reviewed complete opposite-gender alternative/, actualP1)
}
rejected('reject partial alternate', draft => { draft.lessons[3].genderAlternatives = { '1': 'приехал посетил поднялся' } }, /Reviewed complete opposite-gender alternative/, actualP1)
rejected('reject alternate with wrong facts', draft => { draft.lessons[3].genderAlternatives = { '1': actualP1.lessons[3].genderAlternatives!['1']!.replace('музей', 'театр') } }, /Reviewed complete opposite-gender alternative/, actualP1)
rejected('reject same canonical alternate', draft => { draft.lessons[3].genderAlternatives = { '1': draft.lessons[3].dialogue[1].targetText } }, /alternative required|differ from canonical/, actualP1)
rejected('reject ё-fold in canonical alternate', draft => { draft.lessons[4].genderAlternatives = { '1': actualP1.lessons[4].genderAlternatives!['1']!.replace('шёл', 'шел') } }, /Reviewed complete opposite-gender alternative/, actualP1)
rejected('reject alternate changing neutral speech token', draft => { draft.lessons[3].genderAlternatives = { '1': actualP1.lessons[3].genderAlternatives!['1']!.replace('центр', 'парк') } }, /preserve neutral speech tokens/, actualP1)
rejected('reject alternate deleting trophy', draft => { draft.lessons[3].genderAlternatives = { '1': actualP1.lessons[3].genderAlternatives!['1']!.replace('затем', 'потом') } }, /preserve the exact trophy/, actualP1)
rejected('reject alternate on an unaudited closing', draft => { draft.lessons[3].genderAlternatives!['3'] = draft.lessons[3].dialogue[3].targetText }, /turn 1 only/, actualP1)
rejected('reject canonical speaker-binding drift with coupled exercises', draft => { alterFirst(draft.lessons[3], 'музей', 'театр'); draft.lessons[3].recall.answer = 'театр'; draft.lessons[3].recall.fallbackChoices[0] = 'театр' }, /canonical binding changed/, actualP1)
rejected('reject unnecessary gender alternative', draft => { draft.lessons[0].genderAlternatives = { '1': draft.lessons[0].dialogue[1].targetText } }, /No gender alternative is authorized/)
rejected('reject empty gender object', draft => { draft.lessons[0].genderAlternatives = {} }, /No gender alternative is authorized/)
rejected('reject wrong gender key', draft => { Object.assign(draft.lessons[3], { genderAlternatives: { '0': 'Проверка.' } }) }, /0/, actualP1)
rejected('reject array of alternatives', draft => { Object.assign(draft.lessons[3], { genderAlternatives: ['Проверка.'] }) }, /object/, actualP1)
rejected('reject alternative object instead of whole string', draft => { Object.assign(draft.lessons[3], { genderAlternatives: { '1': { text: 'Проверка.' } } }) }, /string/, actualP1)

console.log(JSON.stringify({ passed, actualLessons: 20, allocatedTrophies: 100, frozenTrophies: 200,
  genderAlternatives: 7, scope: 'canonical-structure-only', providerCalls: 0, writes: 0 }, null, 2))
