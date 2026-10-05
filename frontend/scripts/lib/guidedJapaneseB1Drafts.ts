/** Offline P1/P2 structural gate for Japanese B1 drafts plus a separately authored reading sheet (frontend/scripts/lib).
 * Checks surfaces and structure only; native semantics, kana correctness and staging beyond narrow tripwires require full content review. */
import { z } from 'zod'
import { GUIDED_LESSONS } from '../../src/data/guidedLessonsAuthoring'
import { b1DraftSchema } from './guidedB1Drafts'

export const japaneseB1DraftSchema = b1DraftSchema.extend({
  targetLanguage: z.literal('Japanese'), targetLanguageCode: z.literal('ja-JP'),
  pathNumber: z.number().int().min(1).max(2),
}).strict()
export type JapaneseB1Draft = z.infer<typeof japaneseB1DraftSchema>
const JP = String.raw`[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々ヶヵ]`
const KANA = String.raw`[\p{Script=Hiragana}\p{Script=Katakana}ーヶヵ]`
const PUNCT = '。、！？'
const unitRe = new RegExp(`^${JP}+[${PUNCT}]{0,2}$`, 'u')
const kanaUnitRe = new RegExp(`^${KANA}+[${PUNCT}]{0,2}$`, 'u')
const lexicalRe = new RegExp(`^${JP}+$`, 'u')
const kanaLexicalRe = new RegExp(`^${KANA}+$`, 'u')
const trailingRe = new RegExp(`[${PUNCT}]+$`, 'u')
const japaneseRe = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u
const specificationSchema = z.object({
  status: z.literal('architect-spec'), targetLanguage: z.literal('Japanese'), targetLanguageCode: z.literal('ja-JP'),
  baseLocales: z.tuple([z.literal('de'), z.literal('en')]), baseLanguage: z.literal('German'),
  registerPolicy: z.string().min(1), genderSafety: z.string().min(1), orthography: z.string().min(1),
  segmentation: z.object({ trophyAnchoring: z.string().min(1) }).passthrough(),
  mechanicalValidationRules: z.array(z.string().min(1)).min(1),
  paths: z.array(z.object({ pathNumber: z.number().int(), lessons: z.array(z.object({
    number: z.number().int(), trophy: z.string().regex(lexicalRe), beat: z.string().min(1),
  }).passthrough()).length(10) }).passthrough()).length(10),
}).passthrough()
const surfaceSchema = z.object({ canonical: z.string().min(1), surfaceUnit: z.string().min(1), tail: z.string(), tailKind: z.enum(['none', 'particle', 'copula', 'suru']) }).strict()
const readingSheetSchema = z.object({
  schemaVersion: z.literal(1), targetLanguage: z.literal('Japanese'),
  paths: z.array(z.object({ pathNumber: z.number().int().min(1).max(10), lessons: z.array(z.object({
    slug: z.string().min(1),
    readings: z.array(z.object({ jsonPointer: z.string().min(1), canonical: z.string().min(1), kana: z.string().min(1) }).strict()),
    speakTokens: z.array(z.object({ canonical: z.string().min(1), kana: z.string().min(1) }).strict()),
    trophySurfaces: z.object({ firstReply: surfaceSchema, example: surfaceSchema }).strict(),
    reviewNotes: z.object({ recycledForms: z.string().min(1), exerciseBasis: z.string().min(1) }).strict().optional(),
  }).strict()).length(10) }).strict()).min(1),
}).strict()
export type JapaneseReadingSheet = z.infer<typeof readingSheetSchema>
/** Closed tail allowlist copied from the architect spec; the spec text is cross-checked for every entry. */
export const PARTICLE_TAILS = ['を', 'が', 'は', 'に', 'で', 'の', 'と', 'も', 'へ', 'から', 'まで', 'より', 'か', 'ね', 'よ', 'には', 'では', 'とは', 'からは', 'までは', 'にも', 'でも', 'とも', 'のは', 'のが', 'のも']
export const COPULA_TAILS = ['です', 'でした', 'ですか', 'ですね', 'ですよ', 'ですが', 'でしたか', 'なんです', 'なんですが']
export const SURU_TAILS = ['する', 'します', 'しました', 'しません', 'して', 'した', 'しています', 'していました', 'しましたか', 'してしまって', 'してしまいました']
export const POLITE_FINALS = ['ましたね', 'でしたね', 'ですよね', 'です', 'ですか', 'ですね', 'ですよ', 'ですが', 'でした', 'でしたか', 'でしょう', 'でしょうか', 'ます', 'ますか', 'ますね', 'ますよ', 'ますが', 'ました', 'ましたか', 'ません', 'ませんか', 'ましょう', 'ましょうか', 'ください', 'くださいませんか', 'いただけますか', 'いただけませんか', 'もらえますか', 'もらえませんか', 'たいです', 'たいんです', 'たいんですが', 'んです', 'んですか', 'んですが', 'んですね', 'かもしれません', 'かもしれませんね']
const INTERJECTIONS = new Set(['はい', 'いいえ', 'ええ', 'すみません', 'ありがとうございます', 'おはようございます', 'こんにちは', 'こんばんは', 'お願いします', 'お疲れさまでした'])
const BANNED_UNITS = new Set([...PARTICLE_TAILS, 'です', 'でした', 'はい', 'ええ', 'あの', 'えっと', 'うん', '私', '私は', '私が', '私も', 'これ', 'それ', 'あれ', 'この', 'その'])
/** Whole units that can never stand alone under the wakachigaki rule (particle/copula must attach to a host). でも/では are exempt as sentence-initial conjunctions. Exact whole-unit match only, never substring; demonstratives (この) are independent units and stay out. */
const DETACHED_UNITS = new Set([...PARTICLE_TAILS.filter(tail => tail !== 'でも' && tail !== 'では'), ...COPULA_TAILS])
/** Bounded reviewed plain adjectival finals (dictionary form). Compounds ending in a listed form are adjectival, so endsWith on this list is safe; deliberately no generic endsWith('い') (未来, 問題 are nouns). Finals outside the list stay warnings. */
const PLAIN_I_ADJECTIVE_FINALS = ['いい', '良い', '広い', '狭い', '高い', '安い', '大きい', '小さい', '新しい', '古い', '悪い', '楽しい', '難しい', '易しい', '近い', '遠い', '寒い', '暑い', '熱い', '暖かい', '涼しい', '冷たい', '忙しい', '早い', '速い', '遅い', '長い', '短い', '多い', '少ない', 'おいしい', '美味しい', '明るい', '暗い', '強い', '弱い', '嬉しい', '悲しい', '怖い', '痛い', '眠い', '重い', '軽い', '若い', '面白い', 'つまらない', '優しい', '厳しい', '汚い', '欲しい', 'ほしい', '危ない', 'すごい', 'かわいい', 'らしい', 'みたい']
const GENDERED_UNIT = /^(?:僕|俺|あたし|うち)(?:は|が|も|の|を|に|で|と|には)?$/u
const GENDERED_FINALS = ['わ', 'ぞ', 'ぜ', 'かしら', 'な']
const PLAIN_FINAL = /(?:[うくぐすつぬぶむる]|だ|た|ない|なかった)$/u
/** Narrow reviewed tripwires only: unit-final suffixes in learner lines before their staged lesson. Everything else is a surfaced warning. */
const TRIPWIRES: Record<number, Array<{ re: RegExp; from: number; skip?: string[] }>> = {
  1: [{ re: /たら$/u, from: 4, skip: ['もしかしたら'] }, { re: /ので$/u, from: 7 }, { re: /てから$/u, from: 7 }, { re: /てしまいました$/u, from: 11 }],
  2: [{ re: /かもしれません$/u, from: 7 }, { re: /なら$/u, from: 11, skip: ['さようなら'] }, { re: /のに$/u, from: 11 }],
}
const fold = (value: string) => value.normalize('NFC').toLocaleLowerCase()
const strip = (unit: string) => unit.replace(trailingRe, '')
const units = (text: string) => text.split(' ')
const lexUnits = (text: string) => units(text).map(strip)
const chars = (text: string) => [...text.replace(new RegExp(`[ ${PUNCT}]`, 'gu'), '')].length
const sentences = (text: string) => text.split(/[。！？]/u).map(part => part.trim()).filter(Boolean)
const isTarget = (text: string) => units(text).every(unit => unitRe.test(unit))
const isKana = (text: string) => units(text).every(unit => kanaUnitRe.test(unit))
const skeleton = (text: string) => units(text).map(unit => unit.slice(strip(unit).length)).join('|')
const spans = (text: string) => [...text.matchAll(/[^ ]+/gu)].map(match => ({ start: match.index ?? 0, end: (match.index ?? 0) + strip(match[0]).length }))
const wholeSpan = (text: string, start: number, length: number) => spans(text).some(span => span.start === start) && spans(text).some(span => span.end === start + length)
type Verdict = { kind: 'ok' | 'warning' | 'error'; message: string }
/** Main-clause ending only (last unit of each sentence). A suffix match never proves native semantics; unknown endings are warnings. */
export const classifyEnding = (last: string): Verdict => {
  if (POLITE_FINALS.some(p => last.endsWith(p)) || INTERJECTIONS.has(last)) return { kind: 'ok', message: '' }
  if (GENDERED_FINALS.some(p => last.endsWith(p))) return { kind: 'error', message: `Gendered sentence-final particle: ${last}` }
  if (/のに$|し$/u.test(last)) return { kind: 'error', message: `Casual trailing-off final: ${last}` }
  if (last.endsWith('けど')) return /(?:です|ます)けど$/u.test(last) ? { kind: 'warning', message: `Friend-only final for review: ${last}` } : { kind: 'error', message: `Casual trailing-off final: ${last}` }
  if (last.endsWith('か')) return { kind: 'error', message: `Sentence-final plain question: ${last}` }
  if (PLAIN_FINAL.test(last) || PLAIN_I_ADJECTIVE_FINALS.some(adj => last.endsWith(adj))) return { kind: 'error', message: `Sentence-final plain form: ${last}` }
  return { kind: 'warning', message: `Unrecognized polite ending for manual review: ${last}` }
}

export function reviewJapaneseB1Draft(value: unknown, specification: unknown, readingSheet: unknown): { draft: JapaneseB1Draft; warnings: string[] } {
  const draft = japaneseB1DraftSchema.parse(value), spec = specificationSchema.parse(specification), sheet = readingSheetSchema.parse(readingSheet)
  const errors: string[] = [], warnings: string[] = []
  const expect = (condition: boolean, message: string) => { if (!condition) errors.push(message) }
  for (const tail of [...PARTICLE_TAILS, ...COPULA_TAILS, ...SURU_TAILS]) expect(spec.segmentation.trophyAnchoring.includes(tail), `Specification allowlist does not list tail: ${tail}`)
  const suruMatch = /suruNoun trophies: ([^)]+)\)/u.exec(spec.segmentation.trophyAnchoring)
  expect(Boolean(suruMatch), 'Specification must list suruNoun trophies')
  const suruNouns = new Set((suruMatch?.[1] ?? '').split(',').map(item => item.trim()).filter(Boolean))
  const occupied = new Set(GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === 'Japanese')
    .flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [fold(variant.trophyWord.word)] : [])))
  spec.paths.forEach((path, p) => {
    expect(path.pathNumber === p + 1, 'Specification paths must be ordered 1–10')
    path.lessons.forEach((lesson, l) => {
      expect(lesson.number === l + 1, 'Specification lessons must be ordered 1–10')
      expect(!occupied.has(fold(lesson.trophy)), `Duplicate or frozen trophy: ${lesson.trophy}`); occupied.add(fold(lesson.trophy))
    })
  })
  const walk = (item: unknown) => {
    if (typeof item === 'string') expect(item === item.normalize('NFC') && !/[\p{Cc}\p{Cf}]/u.test(item), 'Text must be NFC without controls')
    else if (Array.isArray(item)) item.forEach(walk)
    else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      if ('de' in record) expect(typeof record.en === 'string' && Boolean(record.en), 'English base missing')
      Object.values(record).forEach(walk)
    }
  }
  walk(draft); walk(sheet)
  expect(sheet.paths.length === 2 && sheet.paths.every((path, index) => path.pathNumber === index + 1), 'Reading sheet requires ordered paths 1 and 2')
  const sheetPath = sheet.paths.find(path => path.pathNumber === draft.pathNumber)
  expect(Boolean(sheetPath), `Reading sheet must contain path ${draft.pathNumber}`)
  const slugs = new Set<string>()
  draft.lessons.forEach((lesson, index) => {
    const number = index + 1
    const check = (condition: boolean, message: string) => expect(condition, `Japanese P${draft.pathNumber} L${number}: ${message}`)
    const warn = (message: string) => warnings.push(`Japanese P${draft.pathNumber} L${number}: ${message}`)
    const [opening, first, followUp, second] = lesson.dialogue.map(turn => turn.targetText)
    const example = lesson.trophyWord.example, trophy = lesson.trophyWord.word
    check(!slugs.has(lesson.slug), 'Duplicate slug'); slugs.add(lesson.slug)
    const sentenceTexts = [...lesson.dialogue.map(turn => turn.targetText), ...lesson.pattern.examples.map(item => item.targetText), example]
    const spoken = [...sentenceTexts, ...lesson.chunks.map(item => item.targetText), ...lesson.terms.map(item => item.targetText), trophy]
    const choices = [...lesson.distractors, ...lesson.recall.fallbackChoices, ...lesson.cloze.flatMap(part => typeof part === 'string' ? [] : part.choices)]
    for (const text of [...spoken, ...choices]) {
      check(isTarget(text), `Only native script with whole spaced units and attached punctuation: ${text}`)
      check(!lexUnits(text).some(unit => GENDERED_UNIT.test(unit)), `Gendered pronoun unit in: ${text}`)
      for (const unit of lexUnits(text)) check(!DETACHED_UNITS.has(unit), `Detached particle or copula unit must attach to its host: ${unit} (in: ${text})`)
    }
    for (const text of sentenceTexts) for (const sentence of sentences(text)) {
      const verdict = classifyEnding(lexUnits(sentence).at(-1) ?? '')
      if (verdict.kind === 'error') check(false, verdict.message)
      else if (verdict.kind === 'warning') warn(verdict.message)
    }
    const bounds = [[opening, 15, 32, [4, 9]], [first, 20, 38, null], [followUp, 12, 28, [3, 8]], [second, 12, 32, null]] as const
    bounds.forEach(([text, low, high, unitRange], n) => {
      const size = chars(text), count = sentences(text).length, unitCount = units(text).length
      check(size >= low && size <= high, `Dialogue turn ${n} character bound ${low}–${high} (got ${size})`)
      if (unitRange) check(unitCount >= unitRange[0] && unitCount <= unitRange[1], `Dialogue turn ${n} unit bound ${unitRange[0]}–${unitRange[1]} (got ${unitCount})`)
      check(count >= 1 && count <= 2, `Dialogue turn ${n} must have 1–2 sentences`)
    })
    for (const wire of TRIPWIRES[draft.pathNumber] ?? []) for (const text of [first, second]) for (const unit of lexUnits(text))
      if (wire.re.test(unit) && !wire.skip?.includes(unit) && number < wire.from) check(false, `Form staged later than lesson ${number}: ${unit}`)
    warn('Staging beyond the narrow tripwires needs manual review')
    check(lesson.chunks.map(chunk => chunk.targetText).join(' ') === first, 'Chunks must reconstruct first reply')
    check(new Set([...lesson.chunks.map(chunk => fold(chunk.targetText)), ...lesson.distractors.map(fold)]).size === lesson.chunks.length + 2, 'Build chips must be distinct')
    check(new Set(lesson.terms.map(term => fold(term.targetText))).size === lesson.terms.length, 'Terms must be distinct')
    const blanks = lesson.cloze.filter(part => typeof part !== 'string')
    check(blanks.length >= 2 && blanks.length <= 3, 'Cloze requires 2–3 blanks')
    check(lesson.cloze.map(part => typeof part === 'string' ? part : part.answer).join('') === second, 'Cloze must reconstruct second reply')
    let offset = 0
    for (const part of lesson.cloze) {
      const text = typeof part === 'string' ? part : part.answer
      if (typeof part !== 'string') {
        check(wholeSpan(second, offset, text.length), `Cloze blank must span whole units at its position: ${text}`)
        check(units(text).every(unit => lexicalRe.test(unit)) && units(text).length <= 3 && !BANNED_UNITS.has(text), `Cloze blank requires a lexical unit or phrase of at most 3 units: ${text}`)
        check(part.choices.includes(part.answer) && new Set(part.choices.map(fold)).size === 4, `Cloze choices require one canonical answer: ${text}`)
        check(part.kind === 'form' ? Boolean(part.cue) : !part.cue, `Only form blanks carry a cue: ${text}`)
      }
      offset += text.length
    }
    check(lesson.recall.before + lesson.recall.answer + lesson.recall.after === first, 'Recall must reconstruct first reply')
    check(wholeSpan(first, lesson.recall.before.length, lesson.recall.answer.length), 'Recall must span a whole unit at its position')
    check(lexicalRe.test(lesson.recall.answer) && !BANNED_UNITS.has(lesson.recall.answer), 'Recall requires a content unit')
    check(lesson.recall.fallbackChoices.includes(lesson.recall.answer) && new Set(lesson.recall.fallbackChoices.map(fold)).size === 4, 'Recall choices require one canonical answer')
    check(new Set(lesson.speakRequired).size === 3, 'Three distinct speech tokens required')
    for (const token of lesson.speakRequired) check(lexicalRe.test(token) && [...token].length >= 2 && lexUnits(first).includes(token) && !BANNED_UNITS.has(token), `Speech tokens must be whole lexical units of the first reply: ${token}`)
    for (const item of lesson.pattern.examples) check(item.targetText.includes(item.highlight), 'Contiguous pattern highlight required')
    check(lesson.pattern.examples.some(item => item.targetText === first || item.targetText === second), 'Pattern must reuse a learner turn')
    check(trophy === spec.paths[draft.pathNumber - 1].lessons[index].trophy, 'Trophy differs from allocation')
    check(!BANNED_UNITS.has(trophy) && !GENDERED_UNIT.test(trophy), 'Trophy must be a content word')
    for (const locale of ['de', 'en'] as const) {
      const caption = lesson.sceneCaption[locale] ?? '', situation = lesson.situation[locale]
      const quotes = locale === 'de' ? [`„${opening}“`, `"${opening}"`] : [`“${opening}”`, `"${opening}"`]
      check(quotes.some(quote => caption.includes(quote)), `Caption ${locale} must quote the opening`)
      check(caption.split(opening).length === 2, `Caption ${locale} must quote the opening exactly once`)
      check(!japaneseRe.test(caption.replace(opening, '')), `Caption ${locale} must contain no other Japanese`)
      check(![first, followUp, second, example].some(text => situation.includes(text)), `Situation ${locale} must not reveal later turns`)
    }
    const sheetLesson = sheetPath?.lessons[index]
    if (!sheetLesson) return
    check(sheetLesson.slug === lesson.slug, 'Reading sheet slug differs from draft order')
    const required = new Map<string, string>()
    lesson.dialogue.forEach((turn, n) => required.set(`/dialogue/${n}/targetText`, turn.targetText))
    lesson.pattern.examples.forEach((item, n) => required.set(`/pattern/examples/${n}/targetText`, item.targetText))
    required.set('/trophyWord/word', trophy); required.set('/trophyWord/example', example)
    lesson.chunks.forEach((item, n) => required.set(`/chunks/${n}/targetText`, item.targetText))
    lesson.terms.forEach((item, n) => required.set(`/terms/${n}/targetText`, item.targetText))
    lesson.distractors.forEach((item, n) => required.set(`/distractors/${n}`, item))
    required.set('/recall/answer', lesson.recall.answer)
    lesson.cloze.forEach((part, n) => { if (typeof part !== 'string') required.set(`/cloze/${n}/answer`, part.answer) })
    const seen = new Set<string>()
    for (const reading of sheetLesson.readings) {
      check(!seen.has(reading.jsonPointer), `Duplicate reading pointer: ${reading.jsonPointer}`); seen.add(reading.jsonPointer)
      const source = required.get(reading.jsonPointer)
      if (source === undefined) { check(false, `Unknown or out-of-bounds reading pointer: ${reading.jsonPointer}`); continue }
      check(reading.canonical === source, `Reading canonical differs from source at ${reading.jsonPointer}`)
      check(isKana(reading.kana), `Reading kana must be kana-only units at ${reading.jsonPointer}`)
      for (const unit of lexUnits(reading.kana)) check(!DETACHED_UNITS.has(unit), `Detached particle or copula unit in reading kana at ${reading.jsonPointer}: ${unit}`)
      check(units(reading.kana).length === units(source).length && skeleton(reading.kana) === skeleton(source), `Reading kana spacing/punctuation skeleton differs at ${reading.jsonPointer}`)
    }
    for (const pointer of required.keys()) check(seen.has(pointer), `Missing reading for ${pointer}`)
    const firstKana = sheetLesson.readings.find(reading => reading.jsonPointer === '/dialogue/1/targetText')?.kana ?? ''
    check(sheetLesson.speakTokens.length === 3, 'Speak token pairs must be exactly three (no orphan kana tokens)')
    sheetLesson.speakTokens.forEach((pair, n) => {
      check(pair.canonical === lesson.speakRequired[n], `Speak token pair ${n} differs from speakRequired order`)
      const kanaUnit = lexUnits(firstKana)[lexUnits(first).indexOf(pair.canonical)]
      check(kanaLexicalRe.test(pair.kana) && pair.kana === kanaUnit, `Speak token kana must be the corresponding unit of the first-reply reading: ${pair.canonical}`)
    })
    const surfaces = [[sheetLesson.trophySurfaces.firstReply, first, 'firstReply'], [sheetLesson.trophySurfaces.example, example, 'example']] as const
    for (const [surface, text, name] of surfaces) {
      check(surface.canonical === trophy, `${name} surface canonical differs from trophy`)
      check(lexUnits(text).includes(surface.surfaceUnit), `${name} surface unit is not a whole unit of its text`)
      check(surface.surfaceUnit.startsWith(trophy) && surface.surfaceUnit.slice(trophy.length) === surface.tail, `${name} surface must be trophy plus recorded exact tail`)
      const kind = surface.tail === '' ? 'none' : PARTICLE_TAILS.includes(surface.tail) ? 'particle' : COPULA_TAILS.includes(surface.tail) ? 'copula' : SURU_TAILS.includes(surface.tail) ? 'suru' : null
      check(kind !== null, `${name} tail is outside the closed allowlist: ${surface.tail}`)
      check(kind === null || kind === surface.tailKind, `${name} tailKind does not match the allowlist kind`)
      check(surface.tailKind !== 'suru' || suruNouns.has(trophy), `${name} suru tail requires a listed suruNoun trophy`)
    }
  })
  if (errors.length) throw new Error(errors.join('\n'))
  return { draft, warnings }
}

export function validateJapaneseB1Draft(value: unknown, specification: unknown, readingSheet: unknown): JapaneseB1Draft {
  return reviewJapaneseB1Draft(value, specification, readingSheet).draft
}
