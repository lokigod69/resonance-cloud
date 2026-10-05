/** Mutation tests for the Japanese B1 P1/P2 gate (frontend/scripts). Run with the repo's node:test + tsx runner.
 * EVERYTHING BELOW IS A SYNTHETIC FIXTURE: never curriculum, never provider/TTS input. Trophies are all-kana labels
 * (トロ + two katakana digits) so the 100 allocations are unique and cannot collide with real words. The shared sentence
 * template is grammatically neutral filler; these tests prove structural rejection paths, not native semantics. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring'
import { validateJapaneseB1Draft, reviewJapaneseB1Draft, classifyEnding, PARTICLE_TAILS, COPULA_TAILS, SURU_TAILS, type JapaneseB1Draft, type JapaneseReadingSheet } from './lib/guidedJapaneseB1Drafts'

const K = 'アイウエオカキクケコ'
const trophyOf = (p: number, l: number) => `トロ${K[p - 1]}${K[l - 1]}`
const SURU_FIXTURE = [trophyOf(1, 2), trophyOf(2, 2)]
type Lesson = JapaneseB1Draft['lessons'][number]
type SheetLesson = JapaneseReadingSheet['paths'][number]['lessons'][number]
type Surface = { tail: string; kind: SheetLesson['trophySurfaces']['firstReply']['tailKind'] }
// Lesson 2 = suru tail, 3 = copula tail, 4 = bare lexical trophy (急に-style), others = particle tail.
const surfaceFor = (l: number): Surface => l === 2 ? { tail: 'しました', kind: 'suru' } : l === 3 ? { tail: 'ですが', kind: 'copula' } : l === 4 ? { tail: '', kind: 'none' } : { tail: 'が', kind: 'particle' }
const base = (de: string, en = de) => ({ de, en })
const turn = (targetText: string, de: string) => ({ targetText, baseText: base(de) })
function lesson(p: number, l: number, surface = surfaceFor(l)): { draft: Lesson; sheet: SheetLesson } {
  const T = trophyOf(p, l), unit = T + surface.tail
  const opening = '山田さん、 昨日の 会議は どうでしたか。'
  const first = `昨日 ${unit} 友達と 駅前で 二時間 待ちました。`
  const firstKana = `きのう ${unit} ともだちと えきまえで にじかん まちました。`
  const followUp = 'それは 大変ですね。 何時に 帰りましたか。'
  const second = '結局、 夜 十時に 家に 帰りました。'
  const example = `${T}は 駅の 近くに あります。`
  const chunks: Array<[string, string]> = [['昨日', 'きのう'], [unit, unit], ['友達と', 'ともだちと'], ['駅前で', 'えきまえで'], ['二時間', 'にじかん'], ['待ちました。', 'まちました。']]
  const terms: Array<[string, string]> = [['遅れる', 'おくれる'], ['友達', 'ともだち'], ['駅', 'えき'], ['二時間', 'にじかん'], ['待つ', 'まつ'], ['結局', 'けっきょく']]
  const draft: Lesson = {
    slug: `ja-fixture-p${p}-l${l}`, title: base('Fixture'), situation: base('Ein Kollege fragt nach gestern.', 'A colleague asks about yesterday.'),
    pedagogicalGoal: 'Synthetische Prüfdaten.', register: 'neutral',
    dialogue: [turn(opening, 'Wie war die Besprechung gestern?'), turn(first, 'Ich habe gewartet.'), turn(followUp, 'Wann warst du zurück?'), turn(second, 'Um zehn.')],
    // Example 2 carries an embedded plain form (買った) before a noun: must pass.
    pattern: { label: 'Fixture', rule: base('Fixture'), examples: [{ ...turn(first, 'Ich habe gewartet.'), highlight: '待ちました' }, { ...turn('昨日 買った 本を 読みました。', 'Ich las das Buch.'), highlight: '買った' }] },
    cloze: ['結局、 夜 ', { kind: 'choice', answer: '十時に', choices: ['十時に', '九時に', '八時に', '七時に'] }, ' 家に ', { kind: 'form', answer: '帰りました', cue: 'Verbform', choices: ['帰りました', '帰ります', '帰って', '帰りたい'] }, '。'],
    chunks: chunks.map(([targetText]) => turn(targetText, 'x')), terms: terms.map(([targetText]) => turn(targetText, 'x')),
    recall: { before: `昨日 ${unit} `, answer: '友達と', after: ' 駅前で 二時間 待ちました。', fallbackChoices: ['友達と', '先生と', '家族と', '同僚と'] },
    speakRequired: [unit, '友達と', '待ちました'],
    sceneCaption: base(`Im Büro fragt eine Kollegin: „${opening}“`, `At the office a colleague asks: "${opening}"`),
    trophyWord: { word: T, meaning: base('Fixture'), example, whyThisWord: base('Fixture') },
    distractors: ['電車で', '今日'], placeholderCaption: base('Fixture'), songMood: 'calm', visualNotes: 'fixture',
  }
  const rows: Array<[string, string, string]> = [
    ['/dialogue/0/targetText', opening, 'やまださん、 きのうの かいぎは どうでしたか。'],
    ['/dialogue/1/targetText', first, firstKana],
    ['/dialogue/2/targetText', followUp, 'それは たいへんですね。 なんじに かえりましたか。'],
    ['/dialogue/3/targetText', second, 'けっきょく、 よる じゅうじに いえに かえりました。'],
    ['/pattern/examples/0/targetText', first, firstKana],
    ['/pattern/examples/1/targetText', '昨日 買った 本を 読みました。', 'きのう かった ほんを よみました。'],
    ['/trophyWord/word', T, T], ['/trophyWord/example', example, `${T}は えきの ちかくに あります。`],
    ...chunks.map(([c, k], n): [string, string, string] => [`/chunks/${n}/targetText`, c, k]),
    ...terms.map(([c, k], n): [string, string, string] => [`/terms/${n}/targetText`, c, k]),
    ['/recall/answer', '友達と', 'ともだちと'], ['/cloze/1/answer', '十時に', 'じゅうじに'], ['/cloze/3/answer', '帰りました', 'かえりました'],
    ['/distractors/0', '電車で', 'でんしゃで'], ['/distractors/1', '今日', 'きょう'],
  ]
  const sheet: SheetLesson = {
    slug: draft.slug, readings: rows.map(([jsonPointer, canonical, kana]) => ({ jsonPointer, canonical, kana })),
    speakTokens: [{ canonical: unit, kana: unit }, { canonical: '友達と', kana: 'ともだちと' }, { canonical: '待ちました', kana: 'まちました' }],
    trophySurfaces: { firstReply: { canonical: T, surfaceUnit: unit, tail: surface.tail, tailKind: surface.kind }, example: { canonical: T, surfaceUnit: `${T}は`, tail: 'は', tailKind: 'particle' } },
  }
  return { draft, sheet }
}
type Spec = { paths: Array<{ pathNumber: number; lessons: Array<{ number: number; trophy: string; beat: string }> }>; segmentation: { trophyAnchoring: string } } & Record<string, unknown>
const makeSpec = (): Spec => ({
  status: 'architect-spec', targetLanguage: 'Japanese', targetLanguageCode: 'ja-JP', baseLocales: ['de', 'en'], baseLanguage: 'German',
  registerPolicy: 'fixture', genderSafety: 'fixture', orthography: 'fixture', mechanicalValidationRules: ['fixture'],
  segmentation: { trophyAnchoring: `Closed tails ${[...PARTICLE_TAILS, ...COPULA_TAILS].join(' ')}; (d) only for lessons whose trophySurface.tailKind is suru (suruNoun trophies: ${SURU_FIXTURE.join(', ')}): ${SURU_TAILS.join(' ')}.` },
  paths: Array.from({ length: 10 }, (_, p) => ({ pathNumber: p + 1, lessons: Array.from({ length: 10 }, (_, l) => ({ number: l + 1, trophy: trophyOf(p + 1, l + 1), beat: 'fixture' })) })),
})
const fixture = (overrides: Partial<Record<number, Surface>> = {}) => {
  const paths = [1, 2].map(p => Array.from({ length: 10 }, (_, l) => lesson(p, l + 1, overrides[l + 1])))
  const drafts: JapaneseB1Draft[] = paths.map((items, i) => ({ schemaVersion: 1, status: 'draft', level: 'B1', targetLanguage: 'Japanese', targetLanguageCode: 'ja-JP', baseLanguage: 'German', pathNumber: i + 1, title: base('Fixture'), subtitle: base('Fixture'), anchor: 'Fixture', lessons: items.map(x => x.draft) }))
  const sheet: JapaneseReadingSheet = { schemaVersion: 1, targetLanguage: 'Japanese', paths: paths.map((items, i) => ({ pathNumber: i + 1, lessons: items.map(x => x.sheet) })) }
  return { spec: makeSpec(), drafts, sheet }
}
type Fx = ReturnType<typeof fixture>
const run = (f: Fx, p = 1) => validateJapaneseB1Draft(f.drafts[p - 1], f.spec, f.sheet)
const rejects = (name: string, reason: RegExp, mutate: (f: Fx, l: Lesson, s: SheetLesson) => void, overrides?: Partial<Record<number, Surface>>) => test(name, () => {
  const f = fixture(overrides); mutate(f, f.drafts[0].lessons[0], f.sheet.paths[0].lessons[0])
  assert.throws(() => run(f), { message: reason })
})

test('positive synthetic drafts pass for both path identities with only staging warnings', () => {
  const f = fixture()
  assert.equal(new Set(f.spec.paths.flatMap(p => p.lessons.map(x => x.trophy))).size, 100)
  for (const p of [1, 2]) {
    const { draft, warnings } = reviewJapaneseB1Draft(f.drafts[p - 1], f.spec, f.sheet)
    assert.equal(draft.pathNumber, p)
    assert.equal(warnings.length, 10)
    assert.ok(warnings.every(w => /manual review/u.test(w)))
  }
})
test('unknown polite ending is surfaced as a warning, not rejected', () => {
  const f = fixture(); const l = f.drafts[0].lessons[0], s = f.sheet.paths[0].lessons[0]
  l.pattern.examples[1].targetText = '昨日 買った 本を 読みましたよね。'
  for (const r of s.readings) if (r.jsonPointer === '/pattern/examples/1/targetText') { r.canonical = l.pattern.examples[1].targetText; r.kana = 'きのう かった ほんを よみましたよね。' }
  const { warnings } = reviewJapaneseB1Draft(f.drafts[0], f.spec, f.sheet)
  assert.ok(warnings.some(w => /Unrecognized polite ending.*読みましたよね/u.test(w)))
})
rejects('sentence-final plain form is a hard reject', /Sentence-final plain form/u, (_, l) => { l.dialogue[3].targetText = '結局、 夜 十時に 家に 帰った。' })
rejects('casual trailing-off final is rejected', /Casual trailing-off final/u, (_, l) => { l.dialogue[3].targetText = '結局、 夜 十時に 家に 帰ったけど。' })
rejects('gendered sentence-final particle', /Gendered sentence-final/u, (_, l) => { l.dialogue[3].targetText = '結局、 夜 十時に 家に 帰りましたわ。' })
rejects('gendered pronoun as a whole unit, also in choices', /Gendered pronoun unit/u, (_, l) => { l.distractors = ['僕は', '今日'] })
rejects('Latin letters in a target field', /Only native script/u, (_, l) => { l.terms[0].targetText = 'Aおくれる' })
rejects('Arabic digits in a target field', /Only native script/u, (_, l) => { l.terms[3].targetText = '2時間' })
rejects('doubled space breaks unit segmentation', /Only native script/u, (_, l) => { l.trophyWord.example = `${l.trophyWord.word}は  駅の 近くに あります。` })
rejects('opening below native character bound', /turn 0 character bound/u, (_, l) => { l.dialogue[0].targetText = '昨日は どうでしたか。' })
rejects('follow-up above native unit bound', /turn 2 unit bound/u, (_, l) => { l.dialogue[2].targetText = 'それは 大変ですね。 では 昨日 夜 何時に 家に 本当に 帰りましたか。' })
rejects('narrow staging tripwire: ので in a P1 lesson-1 learner line', /staged later than lesson 1/u, (_, l) => { l.dialogue[3].targetText = '結局、 雨なので 家に 帰りました。' })
rejects('chunks must reconstruct first reply', /Chunks must reconstruct/u, (_, l) => { l.chunks[2].targetText = '友達' })
rejects('cloze must reconstruct second reply', /Cloze must reconstruct/u, (_, l) => { l.cloze[0] = '結局 夜 ' })
rejects('punctuation boundary trick: answer swallowing 。 is not a whole unit', /whole units at its position/u, (_, l) => {
  l.cloze = ['結局、 夜 ', { kind: 'choice', answer: '十時に', choices: ['十時に', '九時に', '八時に', '七時に'] }, ' 家に ', { kind: 'form', answer: '帰りました。', cue: 'Verbform', choices: ['帰りました。', '帰ります', '帰って', '帰りたい'] }]
})
rejects('cue only on form blanks', /Only form blanks carry a cue/u, (_, l) => { const blank = l.cloze[1]; if (typeof blank !== 'string') blank.cue = 'x' })
rejects('cloze choices must be distinct', /Cloze choices require one canonical answer/u, (_, l) => { const blank = l.cloze[1]; if (typeof blank !== 'string') blank.choices = ['十時に', '十時に', '八時に', '七時に'] })
rejects('recall must span a whole unit', /Recall must span/u, (_, l) => { const t = l.dialogue[1].targetText; l.recall = { before: '昨', answer: '日', after: t.slice(2), fallbackChoices: ['日', '月', '火', '水'] } })
rejects('kana spelling is not the canonical speech unit', /whole lexical units of the first reply/u, (_, l) => { l.speakRequired[1] = 'ともだちと' })
rejects('speak token pairs must follow speakRequired order', /differs from speakRequired order/u, (_, __, s) => { s.speakTokens = [s.speakTokens[1], s.speakTokens[0], s.speakTokens[2]] })
rejects('speak token kana must be the corresponding reading unit', /corresponding unit of the first-reply reading/u, (_, __, s) => { s.speakTokens[1].kana = 'えきで' })
rejects('orphan kana token', /no orphan kana tokens/u, (_, __, s) => { s.speakTokens.push({ canonical: '駅前で', kana: 'えきまえで' }) })
rejects('reading canonical drifted from source', /Reading canonical differs/u, (_, __, s) => { s.readings[2].canonical = 'それは 大変ですね。 何時に 帰りますか。' })
rejects('source edited without updating the reading', /Reading canonical differs/u, (_, l) => { l.terms[1].targetText = '友人' })
rejects('unknown or out-of-bounds pointer', /Unknown or out-of-bounds reading pointer/u, (_, __, s) => { s.readings.push({ jsonPointer: '/chunks/9/targetText', canonical: '駅', kana: 'えき' }) })
rejects('duplicate pointer', /Duplicate reading pointer/u, (_, __, s) => { s.readings.push({ ...s.readings[0] }) })
rejects('missing required reading', /Missing reading for/u, (_, __, s) => { s.readings = s.readings.filter(r => r.jsonPointer !== '/recall/answer') })
rejects('kana with merged units', /skeleton differs/u, (_, __, s) => { s.readings[3].kana = 'けっきょく、 よる じゅうじに いえにかえりました。' })
rejects('kana with dropped punctuation', /skeleton differs/u, (_, __, s) => { s.readings[3].kana = 'けっきょく よる じゅうじに いえに かえりました。' })
rejects('kanji inside the kana reading', /kana-only/u, (_, __, s) => { s.readings[3].kana = '結局、 よる じゅうじに いえに かえりました。' })
rejects('substring surface anchor is not a whole unit', /not a whole unit/u, (_, __, s) => { s.trophySurfaces.firstReply.surfaceUnit = trophyOf(1, 1) })
rejects('same-script non-prefix trophy cannot anchor', /trophy plus recorded exact tail/u, (f, l, s) => {
  const t = 'ロアア'; f.spec.paths[0].lessons[0].trophy = t; l.trophyWord.word = t; s.trophySurfaces.firstReply.canonical = t; s.trophySurfaces.example.canonical = t
  for (const r of s.readings) if (r.jsonPointer === '/trophyWord/word') { r.canonical = t; r.kana = t }
})
rejects('tail outside the closed allowlist', /outside the closed allowlist/u, () => {}, { 1: { tail: 'なんて', kind: 'particle' } })
rejects('tailKind must match the allowlist kind', /tailKind does not match/u, (_, __, s) => { s.trophySurfaces.firstReply.tailKind = 'copula' })
rejects('suru tail only for listed suruNoun trophies', /suru tail requires a listed suruNoun/u, () => {}, { 1: { tail: 'しました', kind: 'suru' } })
rejects('trophy must equal the allocation', /differs from allocation/u, (_, l) => { l.trophyWord.word = trophyOf(1, 2) })
rejects('specification allocations must not repeat', /Duplicate or frozen trophy/u, f => { f.spec.paths[4].lessons[0].trophy = trophyOf(1, 1) })
rejects('specification paths must be ordered', /ordered 1–10/u, f => { f.spec.paths.reverse() })
rejects('missing English base', /English base missing/u, (_, l) => { delete l.dialogue[1].baseText.en })
rejects('reading sheet requires both paths', /ordered paths 1 and 2/u, f => { f.sheet.paths.pop() })
rejects('reading sheet rejects duplicate path', /ordered paths 1 and 2/u, f => { f.sheet.paths[1].pathNumber = 1 })
rejects('reading sheet rejects unknown path', /ordered paths 1 and 2/u, f => { f.sheet.paths[1].pathNumber = 3 })
rejects('reading sheet rejects unknown fields', /Unrecognized key/u, f => { Object.assign(f.sheet, { sourceOverride: 'unreviewed' }) })
rejects('caption cannot contain extra Japanese', /no other Japanese/u, (_, l) => { l.sceneCaption.de += ' 駅' })
rejects('same opener cannot be quoted twice', /exactly once/u, (_, l) => { l.sceneCaption.de += l.dialogue[0].targetText })
const setExample = (l: Lesson, s: SheetLesson, targetText: string, kana: string, highlight: string) => {
  l.pattern.examples[1] = { ...turn(targetText, 'x'), highlight }
  for (const r of s.readings) if (r.jsonPointer === '/pattern/examples/1/targetText') { r.canonical = targetText; r.kana = kana }
}
const STALE = /canonical differs|skeleton differs|kana-only units|highlight/u
/** Reading-synchronized rejection: the expected reason must fire and no stale sidecar/highlight reason may accompany it. */
const rejectsSynced = (name: string, reason: RegExp, mutate: (f: Fx, l: Lesson, s: SheetLesson) => void) => test(name, () => {
  const f = fixture(); mutate(f, f.drafts[0].lessons[0], f.sheet.paths[0].lessons[0])
  assert.throws(() => run(f), (error: unknown) => { assert.ok(error instanceof Error); assert.match(error.message, reason); assert.doesNotMatch(error.message, STALE); return true })
})
const acceptsSynced = (name: string, targetText: string, kana: string, highlight: string) => test(name, () => {
  const f = fixture(); setExample(f.drafts[0].lessons[0], f.sheet.paths[0].lessons[0], targetText, kana, highlight)
  const { warnings } = reviewJapaneseB1Draft(f.drafts[0], f.spec, f.sheet)
  assert.ok(warnings.every(w => /manual review/u.test(w)))
})
rejectsSynced('detached particle は as a whole unit', /attach to its host: は \(/u, (_, l, s) => setExample(l, s, '昨日 買った 本 は 読みました。', 'きのう かった ほん は よみました。', '買った'))
rejectsSynced('detached stacked particle には', /attach to its host: には \(/u, (_, l, s) => setExample(l, s, '昨日 買った 本を 駅 には 置きました。', 'きのう かった ほんを えき には おきました。', '買った'))
rejectsSynced('detached copula です', /attach to its host: です \(/u, (_, l, s) => setExample(l, s, '昨日 買った 本は 新しい です。', 'きのう かった ほんは あたらしい です。', '買った'))
rejectsSynced('detached question copula でしたか', /attach to its host: でしたか \(/u, (_, l, s) => setExample(l, s, '昨日 買った 本は いくら でしたか。', 'きのう かった ほんは いくら でしたか。', '買った'))
rejectsSynced('detached copula as a build distractor', /attach to its host: でした \(/u, (_, l, s) => {
  l.distractors = ['でした', '今日']
  for (const r of s.readings) if (r.jsonPointer === '/distractors/0') { r.canonical = 'でした'; r.kana = 'でした' }
})
rejectsSynced('reading-only detached particle', /Detached particle or copula unit in reading kana at \/pattern\/examples\/1\/targetText: は/u, (_, l, s) => setExample(l, s, '昨日 買った 本を 読みました。', 'きのう かった は よみました。', '買った'))
acceptsSynced('demonstrative この is an independent unit, not a detached particle', 'この 本は 昨日 買いました。', 'この ほんは きのう かいました。', '買いました')
acceptsSynced('sentence-initial でも and polite past adjective pass', '昨日 買った 本を 読みました。 でも、 難しかったです。', 'きのう かった ほんを よみました。 でも、 むずかしかったです。', '買った')
acceptsSynced('polite request いいですか passes', 'この 本を 借りても いいですか。', 'この ほんを かりても いいですか。', '借りても')
acceptsSynced('plain i-adjective inside a noun-modifying clause passes', '広い 道を 歩きました。', 'ひろい みちを あるきました。', '広い')
rejectsSynced('sentence-final plain i-adjective 広い。', /Sentence-final plain form: 広い/u, (_, l, s) => setExample(l, s, 'この 道は 広くて、 明るくて 広い。', 'この みちは ひろくて、 あかるくて ひろい。', '広くて'))
rejectsSynced('plain adjective question 広いか。', /Sentence-final plain question: 広いか/u, (_, l, s) => setExample(l, s, 'この 道は 広いか。', 'この みちは ひろいか。', '広いか'))
rejectsSynced('plain verb question 買うか。', /Sentence-final plain question: 買うか/u, (_, l, s) => setExample(l, s, '明日 本を 買うか。', 'あした ほんを かうか。', '買うか'))
rejectsSynced('plain noun question 安全か。', /Sentence-final plain question: 安全か/u, (_, l, s) => setExample(l, s, 'この 道は 安全か。', 'この みちは あんぜんか。', '安全か'))
test('unknown noun final (未来) warns instead of rejecting: no blind endsWith い', () => {
  const f = fixture(); setExample(f.drafts[0].lessons[0], f.sheet.paths[0].lessons[0], '昨日 買った 本の 話は 未来。', 'きのう かった ほんの はなしは みらい。', '買った')
  const { warnings } = reviewJapaneseB1Draft(f.drafts[0], f.spec, f.sheet)
  assert.ok(warnings.some(w => /Unrecognized polite ending for manual review: 未来/u.test(w)))
})
test('classifyEnding boundaries', () => {
  for (const last of ['いいですか', '帰りたいです', 'ありがとうございます', '広いですね', '高くないです']) assert.equal(classifyEnding(last).kind, 'ok', last)
  for (const last of ['広い', '面白い', '買うか', '広いか', '安全か', '行くか', '読みたい', '降るらしい']) assert.equal(classifyEnding(last).kind, 'error', last)
  for (const last of ['未来', '問題', '読みましたよね']) assert.equal(classifyEnding(last).kind, 'warning', last)
})
test('actual frozen trophy cannot be reallocated', () => {
  const frozen = GUIDED_LESSONS.find(l => l.targetLanguage === 'Japanese')
  assert.ok(frozen)
  const trophy = Object.values(frozen.vibeVariants).find(Boolean)?.trophyWord.word
  assert.ok(trophy)
  const f = fixture()
  f.spec.paths[9].lessons[9].trophy = trophy
  assert.throws(() => run(f), /Duplicate or frozen trophy/u)
})
