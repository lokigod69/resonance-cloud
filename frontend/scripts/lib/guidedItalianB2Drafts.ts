/**
 * Offline Italian B2 P1/P2 source gate bound to the V4 specification. No source is relabelled, no Latin or French
 * validator is called, no runtime registry is imported. Structural success is not native, pedagogical, permutation,
 * runtime or TTS approval; idiom, ambiguity, scene paraphrase and grammar beyond the bounded checks stay with content review.
 */
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import type { B2TrophyAllocation } from './guidedLatinB2Drafts'

export const ITALIAN_B2_AUTHORITY = {
  specification: 'B2_ITALIAN_P1_P2_AUTHORING_SPEC_V4.json',
  specificationSha256: 'b4d73db175e66d7bcbe970c98760a9d1f49f4bbb0e6ccfbe414eb555eb26d25b',
  prerequisites: 'B2_LATIN_PREREQUISITES.json',
  prerequisitesSha256: '72f074b845ee0b2165cae99ab1739d9315a00e5b273f132d2f45c5bb3396af32',
} as const

// Explicit strict shape: no extends chains, so TypeScript inference stays bounded.
const text = z.string().min(1).refine(v => v === v.trim() && v === v.normalize('NFC'), 'Expected trimmed NFC text')
const slug = text.refine(v => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), 'Expected ASCII slug')
const sha256 = text.refine(v => /^[a-f0-9]{64}$/.test(v), 'Expected SHA-256')
const isoDate = text.refine(v => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Expected a valid ISO calendar date')
const base = z.object({ de: text, en: text }).strict()
const register = z.enum(['Lei', 'tu'])
const move = z.enum(['compare', 'position', 'reason', 'concede', 'rebut', 'conclude', 'explain', 'clarify', 'summarize', 'hypothesize', 'propose', 'request', 'counteroffer', 'invite', 'relay'])
const blank = z.object({ answer: text, acceptedAnswers: z.array(text).min(1), kind: z.enum(['connector', 'frame', 'form', 'lexical']), cue: base.optional(), choices: z.array(text).length(4).optional() }).strict()
const segment = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string() }).strict(),
  z.object({ kind: z.literal('blank'), index: z.number().int().min(0) }).strict(),
])
const cloze = z.object({ segments: z.array(segment).min(1), blanks: z.array(blank).min(1).max(4), moveBlankIndex: z.number().int().min(0) }).strict()
const flags = z.object({
  argumentCoherent: z.boolean(), challengeGenuine: z.boolean(), steerGenuine: z.boolean(), b2NotInflatedB1: z.boolean(),
  registerNative: z.boolean(), genderClaimVerified: z.boolean(), distractorsNotAlsoCorrect: z.boolean(), patternTruthful: z.boolean(),
  baseTextsAccurate: z.boolean(), ttsReadable: z.boolean(), carriersStaged: z.boolean(), noFiller: z.boolean(),
}).strict()
const lessonSchema = z.object({
  lessonNumber: z.number().int().min(1).max(10), slug, title: base, situation: base,
  episodeShape: z.enum(['challenge', 'precision']),
  registerPlan: z.object({ mode: z.literal('constant'), registers: z.array(register).length(3) }).strict(),
  interlocutors: z.array(z.object({ id: text, role: base, voiceRole: z.literal('A') }).strict()).length(1),
  speakerGender: z.literal('neutral'), sceneCaption: base,
  dialogue: z.array(z.object({ speaker: z.enum(['them', 'you']), targetText: text, base, interlocutorId: text.optional(), move: move.optional(), register: register.optional() }).strict()).length(6),
  build: z.object({ framePrefix: z.string(), chunks: z.array(text).min(5).max(8), distractors: z.array(text).length(2), frameSuffix: z.string() }).strict(),
  cloze, synthesis: cloze,
  recall: z.object({ before: z.string(), answer: text, acceptedAnswers: z.array(text).min(1), after: z.string(), fallbackChoices: z.array(text).length(4) }).strict(),
  pattern: z.object({ moveType: move, label: base, rule: base, examples: z.array(z.object({ targetText: text, base, highlights: z.array(text).min(1) }).strict()).min(2).max(3) }).strict(),
  terms: z.array(z.object({ targetText: text, lemma: text.optional(), kind: z.enum(['connector', 'frame', 'noun', 'verb', 'adjective', 'adverb', 'phrase']), base, acceptedAnswers: z.array(text).min(1).optional() }).strict()).min(8).max(10),
  speak: z.array(z.object({ turnIndex: z.union([z.literal(1), z.literal(3), z.literal(5)]), requiredTokens: z.array(text).min(2).max(4), profile: z.enum(['b2-long', 'b2-short']) }).strict()).length(3),
  trophy: z.object({ lemma: text, familyKey: text, surface: text, turnIndex: z.number().int().min(0).max(5), pos: z.enum(['noun', 'verb', 'adjective', 'adverb', 'connector']), example: z.object({ targetText: text, base }).strict(), base }).strict(),
  review: z.object({ flags, verdict: z.literal('pending'), failingCriteria: z.array(z.number().int()),
    reviewers: z.array(z.object({ role: z.enum(['validator', 'codex', 'fable', 'native-model', 'native-human']), id: text, date: text }).strict()),
    nativeStatus: z.literal('unreviewed'), acknowledgedWarnings: z.array(z.object({ code: text, reason: text }).strict()) }).strict(),
}).strict()

export const italianB2DraftSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal('draft'), targetLanguage: z.literal('Italian'), targetLanguageCode: z.literal('it-IT'),
  authoredBaseLanguage: z.literal('German'), level: z.literal('B2'), pathNumber: z.number().int().min(1).max(2), slug,
  pathTitle: base, pathFunction: base,
  specRef: z.object({ pathSpec: text, pathSpecSha256: sha256, ledger: text, ledgerSha256: sha256 }).strict(),
  authoring: z.object({ source: text, runId: text, date: isoDate }).strict(),
  lessons: z.array(lessonSchema).length(10),
}).strict()

export type ItalianB2Draft = z.infer<typeof italianB2DraftSchema>
export type ItalianB2Evidence = {
  /** Exact original UTF-8 text including original whitespace; never JSON.stringify(parsed). */
  specificationSource: string
  specification: unknown
  pathSpecSha256: string
  ledgerSha256: string
  prerequisitesSource: string
  prerequisites: unknown
  prerequisitesSha256: string
  trophies: B2TrophyAllocation[]
  /** Must cover the complete pinned frozen A1/A2 plus hundred reserved B1 set (296 distinct strings). Extras stay forbidden. */
  earlierTrophies: string[]
}
type SpecLesson = { number: number; slug: string; register: 'Lei' | 'tu'; trophyLemma: string; trophyFamilyKey: string; trophySurface: string; pos: string }
type Specification = {
  status: string; targetLanguage: string; code: string; level: string; baseLocales: string[]; authoredBaseLanguage: string
  registerContract: { default: string }
  paths: Array<{ pathNumber: number; moveWhitelist: string[]; lessons: SpecLesson[] }>
  trophyLedger: { rows: B2TrophyAllocation[] }
}
type Prerequisite = { targetLanguage: string; frozenLessonCount: number; activeCorpusSha256: string; b1AllocationSha256: string; forbiddenTrophies: string[] }

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const fold = (v: string) => v.normalize('NFC').toLocaleLowerCase('it-IT')
const apos = (v: string) => v.replace(/\u2019/gu, "'")
const strip = (v: string) => v.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
const tokenPattern = /[\p{L}\p{M}\p{N}]+(?:[\u2019'-][\p{L}\p{M}\p{N}]+)*/gu
const tokens = (v: string) => v.match(tokenPattern) ?? []
const normalized = (v: string) => apos(fold(v)).trim().replace(/\s+/gu, ' ').replace(/[.,!?;:…]+$/gu, '').trim()
// Comparison identity only: never adds an accepted answer or rewrites canonical text.
const choiceIdentity = (v: string) => strip(normalized(v))
const distinct = (values: string[]) => new Set(values.map(normalized)).size === values.length
const whole = (t: string, token: string) => tokens(t).map(v => apos(fold(v))).includes(apos(fold(token)))
const boundary = (t: string, at: number) => ![...t.matchAll(tokenPattern)].some(m => m.index < at && at < m.index + m[0].length)
const span = (t: string, at: number, length: number) => boundary(t, at) && boundary(t, at + length)
const wholePhrase = (t: string, phrase: string) => {
  const source = apos(fold(t)), query = apos(fold(phrase))
  let at = source.indexOf(query)
  while (at >= 0) { if (span(source, at, query.length)) return true; at = source.indexOf(query, at + 1) }
  return false
}
const answerMoves = ['concede', 'rebut', 'clarify', 'explain', 'compare', 'counteroffer']
const closingMoves = ['conclude', 'propose', 'summarize', 'counteroffer', 'request']
const isolatedChip = /^(?:non|si|ci|mi|ti|vi|ne)$/u
// Bounded incidental-conditional tripwire for exercise surfaces (chips, blank answers, recall answer, terms): first/third-person present-conditional
// endings only; the single licensed conditional carrier is the allocated P1 L3 'potremmo invece'. Not Italian morphology: a noun such as 'ebrei' would need redesign.
const conditionalEnding = /(?:rei|rebbe|remmo|rebbero)$/u
const promotedConditional = (surface: string) => normalized(surface) !== 'potremmo invece' && tokens(fold(surface)).some(t => conditionalEnding.test(t))
// Address tripwires for both participants. Informal: tu/ti/te/tuo forms as whole tokens. Formal: Lei/Suo/Sua/Suoi/Sue anywhere, plus capital Le/La only
// mid-sentence; sentence-initial Le/La may be a plain article and stays a reviewer decision. Lowercase object clitics are never address here.
const informalAddress = /(?<![\p{L}'\u2019])(?:[Tt]u|[Tt]i|[Tt]e|[Tt]uo|[Tt]ua|[Tt]uoi|[Tt]ue)(?![\p{L}])/u
const formalAddress = (t: string) => /(?<![\p{L}'\u2019])(?:Lei|Suo|Sua|Suoi|Sue)(?![\p{L}])/u.test(t)
  || [...t.matchAll(/(?<![\p{L}'\u2019])(?:Le|La)(?![\p{L}])/gu)].some(m => { const before = t.slice(0, m.index).trimEnd(); return before.length > 0 && !/[.!?:;«»"(]$/u.test(before) })
// Required carriers per lesson: [build focus, cloze turn, synthesis turn], exactly as the V4 spec allocates them.
const carrierTable: string[][][] = [
  [['da un lato', "dall'altro"], ['è vero che', 'ma'], ['tutto sommato']],
  [['mentre'], ['conviene'], ['quindi']],
  [['tanto', 'quanto'], ['potremmo invece'], ['propongo di']],
  [['più sensata'], ['vale la pena solo se'], ['mi serve un preventivo con']],
  [['entrambe'], ['piuttosto che'], ['propongo']],
  [['a differenza dei'], ['rispetto al'], ['nel complesso']],
  [["rispetto all'app"], ['hai ragione', 'però'], ['alla fine']],
  [['tanto', 'quanto'], ['mentre'], ['in definitiva']],
  [['più', 'che'], ['in ogni caso'], ['a parità di']],
  [['più utile'], ['sul lungo periodo'], ['raccomando']],
  [['poiché'], ['nello specifico'], ['in breve']],
  [['prima', 'poi', 'infine'], ['vanno portati'], ['in breve']],
  [['poiché'], ['per essere precisi'], ['propongo di']],
  [['si accumulano'], ['di conseguenza'], ['riassumo']],
  [['poiché'], ['non comporta', 'di conseguenza'], ['in base alla']],
  [['prima', 'poi', 'infine'], ['il che significa che'], ['propongo di']],
  [['la mancata verifica'], ['in parte sì', 'ma', "l'aumento dei costi"], ['pertanto']],
  [['si valutano', 'in base ai'], ['a seconda del'], ['riassumendo']],
  [['a lungo termine'], ['rispetto'], ['pertanto']],
  [['a monte', 'a valle'], ['dato che'], ['pertanto', 'riassumendo']],
]
// Conservative staging: contiguous carriers of a later band may not appear in learner turns of earlier lessons.
// Discontinuous carriers (più … che), si passivante and nominalisation are not parsed here.
const phraseRe = (src: string) => new RegExp(`(?:^|[^\\p{L}])(?:${src})(?=$|[^\\p{L}])`, 'u')
const stagingTable: Record<1 | 2, Array<{ from: number; carriers: RegExp[] }>> = {
  1: [
    { from: 4, carriers: ['piuttosto che', 'a differenza d(?:i|el|ello|ella|elle|ei|egli)', 'nel complesso', 'mi serve un preventivo', 'vale la pena', 'rispetto a(?:l|llo|lla|lle|ll|i|gli)?'].map(phraseRe) },
    { from: 7, carriers: ['in definitiva', 'in ogni caso', 'a parità di', 'sul lungo periodo', 'raccomando', 'alla fine'].map(phraseRe) },
  ],
  2: [
    { from: 4, carriers: ['di conseguenza', 'il che significa che', 'in base a(?:l|llo|lla|lle|ll|i|gli)?', 'entro il termine', 'non comporta', 'riassumo'].map(phraseRe) },
    { from: 7, carriers: ['in parte sì', 'a seconda d(?:i|el|ello|ella|elle|ei|egli)', 'a lungo termine', 'a monte', 'a valle', 'pertanto', 'riassumendo'].map(phraseRe) },
  ],
}
const excludedLater = phraseRe('mica|inoltre|innanzitutto|altrimenti|cioè|benché|sebbene|anche se|in conclusione|si tratta di|a meno che')
// Narrow examples the specification names explicitly, not a morphology parser.
const speakerGender = /(?:^|[^\p{L}])(?:sono|mi sono)\s+(?:andat[oa]|trovat[oa]|convint[oa]|sicur[oa]|content[oa]|stanc[oa])(?=$|[^\p{L}])/iu
const knownWarnings = new Set(['IT-B2-PASSATO-REMOTO', 'IT-B2-CONGIUNTIVO-IMPERFETTO', 'IT-B2-LOWERCASE-LE', 'IT-B2-B1-AGREEMENT'])

/** No proof of idiomaticity, semantics, scene paraphrase spoilers, exhaustive morphology or chip permutation uniqueness. */
export function validateItalianB2Draft(value: unknown, evidence: ItalianB2Evidence): ItalianB2Draft {
  const draft = italianB2DraftSchema.parse(value)
  const errors: string[] = []
  const check = (ok: boolean, reason: string) => { if (!ok) errors.push(reason) }
  const verifySource = (source: unknown, parsed: unknown, claimed: unknown, expected: string, label: string): unknown => {
    if (typeof source !== 'string' || typeof claimed !== 'string') throw new Error(`${label}: exact UTF-8 source and fingerprint required`)
    if (sha(source) !== expected || claimed !== expected) throw new Error(`${label}: source fingerprint mismatch`)
    let recovered: unknown
    try { recovered = JSON.parse(source) } catch { throw new Error(`${label}: invalid source JSON`) }
    if (!isDeepStrictEqual(parsed, recovered)) throw new Error(`${label}: parsed/source drift`)
    return recovered
  }
  const spec = verifySource(evidence?.specificationSource, evidence?.specification, evidence?.pathSpecSha256, ITALIAN_B2_AUTHORITY.specificationSha256, 'Italian specification') as Specification
  const prerequisiteRecords = verifySource(evidence?.prerequisitesSource, evidence?.prerequisites, evidence?.prerequisitesSha256, ITALIAN_B2_AUTHORITY.prerequisitesSha256, 'Italian prerequisites') as Prerequisite[]
  const prerequisite = prerequisiteRecords.find(r => r.targetLanguage === 'Italian')
  if (!prerequisite) throw new Error('Italian prerequisite record missing')
  check(spec.status === 'fable-authoring-spec' && spec.targetLanguage === 'Italian' && spec.code === 'it-IT' && spec.level === 'B2'
    && spec.authoredBaseLanguage === 'German' && spec.baseLocales.join(',') === 'de,en' && spec.registerContract?.default === 'Lei', 'Specification identity mismatch')
  check(evidence.ledgerSha256 === ITALIAN_B2_AUTHORITY.specificationSha256, 'Embedded ledger fingerprint mismatch')
  check(draft.specRef.pathSpec === ITALIAN_B2_AUTHORITY.specification && draft.specRef.ledger === ITALIAN_B2_AUTHORITY.specification
    && draft.specRef.pathSpecSha256 === evidence.pathSpecSha256 && draft.specRef.ledgerSha256 === evidence.ledgerSha256, 'Draft specification path/fingerprint mismatch')
  const validEarlier = Array.isArray(evidence.earlierTrophies) && evidence.earlierTrophies.every(t => typeof t === 'string' && t.trim() === t && t.length > 0)
  check(validEarlier, 'Complete earlier trophy evidence required')
  const earlier = new Set((validEarlier ? evidence.earlierTrophies : []).map(fold))
  check(prerequisite.forbiddenTrophies.every(t => earlier.has(fold(t))), 'Missing frozen Italian or hundred reserved B1 trophy evidence')
  const forbidden = new Set([...prerequisite.forbiddenTrophies.map(fold), ...earlier])
  check(Array.isArray(evidence.trophies) && evidence.trophies.length === 20, 'Exactly twenty ordered trophy allocations required')
  const allocations = Array.isArray(evidence.trophies) ? evidence.trophies : []
  check(isDeepStrictEqual(allocations, spec.trophyLedger.rows), 'Trophy allocation differs from complete embedded ledger')
  const seen = new Set<string>()
  for (const [i, row] of allocations.entries()) {
    if (!row || typeof row !== 'object' || typeof row.lemma !== 'string' || typeof row.familyKey !== 'string') { check(false, 'Invalid trophy allocation record'); continue }
    check(row.pathNumber === Math.floor(i / 10) + 1 && row.lessonNumber === i % 10 + 1, 'Trophy allocation order mismatch')
    check(tokens(row.lemma).length === 1 && tokens(row.familyKey).length === 1, 'Allocation lemma/family must be single tokens')
    const surface = spec.paths[Math.floor(i / 10)]?.lessons[i % 10]?.trophySurface
    check(typeof surface === 'string', 'Specification inflection evidence missing')
    for (const identity of new Set([fold(row.lemma), fold(row.familyKey), fold(surface ?? '')])) {
      check(!forbidden.has(identity) && !seen.has(identity), 'Allocation collides with frozen/reserved content or another family')
      seen.add(identity)
    }
  }
  const walk = (item: unknown, at: string) => {
    if (typeof item === 'string') check(item === item.normalize('NFC') && !/[\p{Cc}\p{Cf}]/u.test(item), `${at}: NFC text without controls required`)
    else if (Array.isArray(item)) item.forEach((v, i) => walk(v, `${at}/${i}`))
    else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      if ('de' in record) check(Object.keys(record).sort().join(',') === 'de,en', `${at}: both de/en explanation locales required`)
      Object.entries(record).forEach(([k, child]) => walk(child, `${at}/${k}`))
    }
  }
  walk(draft, 'draft')
  const canonical = (t: string, label: string) => {
    check(!/[\p{N}\p{Cc}\p{Cf}\p{Extended_Pictographic}\u00a0\u202f]|https?:|[[\]<>_]| {2}|\s[;:!?,.]/u.test(t), `${label}: illegal canonical digits, controls, spacing, annotations or symbols`)
    check(!/[^\p{L}\p{M}\s.,;:!?…'\u2019«»"()\u2013\u2014-]/u.test(t), `${label}: character outside the Italian voiced-text symbol policy`)
    check(!whole(t, 'mica'), `${label}: deferred mica in canonical text`)
    check(tokens(t).length > 0, `${label}: canonical lexical content required`)
  }
  // Evidence-only variants: the authored list must already contain them; nothing is generated into sources.
  const answers = (answer: string, accepted: string[], label: string) => {
    check(accepted.includes(answer) && new Set(accepted).size === accepted.length, `${label}: invalid accepted answers`)
    check(accepted.length <= 16, `${label}: more than sixteen authored answers`)
    check(accepted.every(a => tokens(a).length > 0), `${label}: accepted answer has no lexical content`)
    if (/[àèéìòù]/iu.test(answer)) check(accepted.includes(strip(answer)), `${label}: missing explicit accent-stripped variant`)
    if (/['\u2019]/u.test(answer)) {
      check(accepted.includes(answer.includes("'") ? answer.replace(/'/gu, '\u2019') : apos(answer)), `${label}: missing explicit apostrophe twin`)
      check(!accepted.some(a => a === answer.replace(/['\u2019]/gu, '') || a === answer.replace(/['\u2019]/gu, ' ')), `${label}: apostrophe-free variant is never accepted`)
    }
  }
  const choices = (items: string[], accepted: string[], label: string) => {
    check(new Set(items.map(choiceIdentity)).size === 4 && items.filter(c => accepted.some(a => choiceIdentity(a) === choiceIdentity(c))).length === 1, `${label}: choices must be distinct with exactly one accepted answer`)
    items.forEach(c => canonical(c, `${label} choice`))
  }
  const specPath = spec.paths.find(p => p.pathNumber === draft.pathNumber)
  if (!specPath) throw new Error('Specification path missing')
  const slugs = new Set<string>(), firstReplies = new Set<string>(), surfaces = new Set<string>()
  const lateCarriers = (lessonIndex: number) => stagingTable[draft.pathNumber as 1 | 2].filter(b => lessonIndex + 1 < b.from).flatMap(b => b.carriers)
  for (const [i, lesson] of draft.lessons.entries()) {
    const label = `Italian B2 P${draft.pathNumber} L${i + 1}`
    const expect = (ok: boolean, message: string) => check(ok, `${label}: ${message}`)
    const specLesson = specPath.lessons[i]
    if (!specLesson) { expect(false, 'Specification lesson missing'); continue }
    expect(lesson.lessonNumber === i + 1 && specLesson.number === i + 1, 'Lesson order differs from specification')
    expect(lesson.slug === specLesson.slug && !slugs.has(lesson.slug), 'Lesson slug differs from specification or repeats'); slugs.add(lesson.slug)
    expect(lesson.episodeShape === (draft.pathNumber === 1 ? 'challenge' : 'precision'), 'Episode shape mismatch')
    expect(lesson.registerPlan.registers.every(r => r === specLesson.register), 'Register allocation differs from specification')
    const learnerTurns = [1, 3, 5].map(n => lesson.dialogue[n])
    const moves = learnerTurns.map(t => t.move)
    expect(moves.every(Boolean) && new Set(moves).size === 3 && specPath.moveWhitelist.includes(moves[0] ?? ''), 'Three distinct moves and licensed first move required')
    expect(answerMoves.includes(moves[1] ?? ''), 'Invalid answering move')
    expect(closingMoves.includes(moves[2] ?? '') && !moves.includes('relay'), 'Invalid closing move or forbidden relay')
    for (const [n, turn] of lesson.dialogue.entries()) {
      const isYou = n % 2 === 1
      expect(turn.speaker === (isYou ? 'you' : 'them'), 'Speakers must alternate')
      expect(isYou ? turn.interlocutorId === undefined && Boolean(turn.move) && turn.register === specLesson.register
        : turn.interlocutorId === lesson.interlocutors[0].id && turn.move === undefined && turn.register === undefined, 'Turn role/register metadata mismatch')
      const bounds = n === 1 ? [14, 26] : n === 3 ? [12, 24] : n === 5 ? [10, 22] : [6, 20]
      const size = tokens(turn.targetText).length
      expect(size >= bounds[0] && size <= bounds[1], `Turn ${n} length ${size} outside ${bounds.join('–')}`)
      canonical(turn.targetText, `${label} turn ${n}`)
      const t = turn.targetText, lower = fold(t)
      if (specLesson.register === 'Lei') expect(!informalAddress.test(t), `Informal address token in Lei episode (turn ${n})`)
      else expect(!formalAddress(t), `Formal address token in tu episode (turn ${n})`)
      if (!isYou) continue
      expect(!speakerGender.test(lower), 'Explicit speaker-gender construction forbidden')
      expect(!excludedLater.test(lower), 'Carrier excluded until a later Italian path in learner turn')
      for (const c of lateCarriers(i)) expect(!c.test(lower), `Carrier used in a learner turn before its staging band: ${c.source}`)
    }
    const first = lesson.dialogue[1].targetText
    expect(!firstReplies.has(first), 'Duplicate first reply'); firstReplies.add(first)
    for (const caption of Object.values(lesson.sceneCaption)) expect(caption.includes(lesson.dialogue[0].targetText), 'Scene must quote opener in both bases')
    for (const later of lesson.dialogue.slice(1)) expect(![...Object.values(lesson.sceneCaption), ...Object.values(lesson.situation)].some(s => s.includes(later.targetText)), 'Scene reveals later target turn')
    const focus = lesson.build.chunks.join(' ')
    expect(lesson.build.framePrefix + focus + lesson.build.frameSuffix === first, 'Build reconstruction mismatch')
    expect(tokens(focus).length >= 7 && tokens(focus).length <= 12, 'Build focus length outside 7–12')
    expect(distinct([...lesson.build.chunks, ...lesson.build.distractors]), 'Build chips must be distinct')
    let offset = lesson.build.framePrefix.length
    for (const chunk of lesson.build.chunks) {
      expect(span(first, offset, chunk.length), 'Build chunk splits a lexical token or elided article')
      expect(tokens(chunk).length >= 1 && tokens(chunk).length <= 4 && !isolatedChip.test(fold(chunk)), 'Invalid chunk length or isolated clitic/negation')
      offset += chunk.length + 1
    }
    for (const chip of [...lesson.build.chunks, ...lesson.build.distractors]) { canonical(chip, `${label} build chip`); expect(!promotedConditional(chip), `Incidental conditional promoted to a build chip: ${chip}`) }
    for (const [exercise, target, min, max, name] of [[lesson.cloze, lesson.dialogue[3].targetText, 2, 4, 'cloze'], [lesson.synthesis, lesson.dialogue[5].targetText, 1, 2, 'synthesis']] as const) {
      const indices = exercise.segments.flatMap(s => s.kind === 'blank' ? [s.index] : [])
      expect(indices.join(',') === exercise.blanks.map((_, j) => j).join(','), `${name} blank references must occur once in order`)
      expect(exercise.blanks.length >= min && exercise.blanks.length <= max, `${name} blank count outside ${min}–${max}`)
      expect(['connector', 'frame'].includes(exercise.blanks[exercise.moveBlankIndex]?.kind ?? ''), `${name} move blank must be connector/frame`)
      expect(exercise.blanks.filter(b => b.choices).length <= 1, `${name}: at most one choice blank allowed`)
      expect(exercise.segments.map(s => s.kind === 'text' ? s.text : exercise.blanks[s.index]?.answer ?? '').join('') === target, `${name} reconstruction mismatch`)
      let at = 0
      for (const s of exercise.segments) {
        const piece = s.kind === 'text' ? s.text : exercise.blanks[s.index]?.answer ?? ''
        if (s.kind === 'blank') expect(span(target, at, piece.length), `${name} blank splits a lexical token`)
        at += piece.length
      }
      for (const b of exercise.blanks) {
        answers(b.answer, b.acceptedAnswers, `${label} ${name} blank`)
        const count = tokens(b.answer).length
        expect(count >= 1 && count <= (b.kind === 'frame' ? 4 : 3) && !isolatedChip.test(fold(b.answer)) && !/[.,!?;:…]$/u.test(b.answer), `${name}: invalid blank answer`)
        expect(b.kind === 'form' ? Boolean(b.cue) : b.cue === undefined, 'Form cues required exactly for form blanks')
        canonical(b.answer, `${label} ${name} answer`)
        expect(!promotedConditional(b.answer), `${name}: incidental conditional promoted to a blank answer`)
        if (b.choices) choices(b.choices, b.acceptedAnswers, `${label} ${name}`)
      }
    }
    const recall = lesson.recall
    expect(recall.before + recall.answer + recall.after === first, 'Recall reconstruction mismatch')
    expect(span(first, recall.before.length, recall.answer.length), 'Recall answer splits a lexical token or elided article')
    expect(tokens(recall.answer).length >= 1 && tokens(recall.answer).length <= 3 && !isolatedChip.test(fold(recall.answer)), 'Invalid recall answer')
    canonical(recall.answer, `${label} recall answer`)
    expect(!promotedConditional(recall.answer), 'Incidental conditional promoted to a recall answer')
    answers(recall.answer, recall.acceptedAnswers, `${label} recall`)
    choices(recall.fallbackChoices, recall.acceptedAnswers, `${label} recall`)
    expect(moves.includes(lesson.pattern.moveType), 'Pattern move absent from episode')
    expect(lesson.pattern.examples.some(e => learnerTurns.some(t => t.targetText === e.targetText)), 'Pattern must reuse exact learner turn')
    for (const e of lesson.pattern.examples) {
      expect(e.highlights.every(h => e.targetText.includes(h)), 'Pattern highlight absent')
      canonical(e.targetText, `${label} pattern example`); e.highlights.forEach(h => canonical(h, `${label} pattern highlight`))
    }
    const spoken = [...lesson.dialogue.map(t => t.targetText), ...lesson.pattern.examples.map(e => e.targetText)]
    expect(distinct(lesson.terms.map(t => t.targetText)), 'Duplicate terms')
    expect(lesson.terms.filter(t => ['connector', 'frame'].includes(t.kind)).length >= 2 && lesson.terms.filter(t => ['noun', 'verb', 'adjective', 'adverb'].includes(t.kind)).length >= 3, 'Terms need discourse and lexical coverage')
    for (const term of lesson.terms) {
      expect(spoken.some(s => wholePhrase(s, term.targetText)), `Complete term absent from spoken material: ${term.targetText}`)
      canonical(term.targetText, `${label} term`); if (term.lemma) canonical(term.lemma, `${label} term lemma`)
      expect(!promotedConditional(term.targetText), `Incidental conditional promoted to a term: ${term.targetText}`)
      if (term.acceptedAnswers) answers(term.targetText, term.acceptedAnswers, `${label} term`)
    }
    expect(lesson.speak.map(s => s.turnIndex).join(',') === '1,3,5', 'Speak must cover ordered learner turns')
    for (const speech of lesson.speak) {
      expect(distinct(speech.requiredTokens) && speech.requiredTokens.every(t => tokens(t).length === 1 && whole(lesson.dialogue[speech.turnIndex].targetText, t)), 'Invalid complete speech tokens')
      if (speech.turnIndex === 1) expect(speech.requiredTokens.filter(t => whole(focus, t)).length >= 2, 'Two speech tokens must be in build focus')
      speech.requiredTokens.forEach(t => canonical(t, `${label} speech token`))
    }
    const trophy = lesson.trophy, row = allocations[(draft.pathNumber - 1) * 10 + i]
    expect(trophy.lemma === specLesson.trophyLemma && trophy.familyKey === specLesson.trophyFamilyKey && trophy.pos === specLesson.pos
      && row?.lemma === trophy.lemma && row?.familyKey === trophy.familyKey && row?.pos === trophy.pos, 'Trophy allocation mismatch')
    expect(trophy.surface === specLesson.trophySurface, 'Trophy surface differs from reviewed specification inflection')
    expect([trophy.lemma, trophy.familyKey, trophy.surface].every(t => tokens(t).length === 1), 'Trophy must be single tokens')
    expect([1, 3, 5].includes(trophy.turnIndex) && whole(lesson.dialogue[trophy.turnIndex].targetText, trophy.surface), 'Trophy surface absent from declared learner turn')
    expect(![trophy.lemma, trophy.familyKey, trophy.surface].some(t => forbidden.has(fold(t))) && !surfaces.has(fold(trophy.surface)), 'Trophy collides with frozen/reserved content or another surface')
    surfaces.add(fold(trophy.surface))
    expect(whole(trophy.example.targetText, trophy.lemma) || whole(trophy.example.targetText, trophy.surface), 'Trophy example lacks complete lemma/surface')
    for (const t of [trophy.lemma, trophy.familyKey, trophy.surface, trophy.example.targetText]) canonical(t, `${label} trophy`)
    const carriers = carrierTable[(draft.pathNumber - 1) * 10 + i]
    carriers.forEach((set, n) => set.forEach(c => expect(wholePhrase(n === 0 ? focus : lesson.dialogue[n * 2 + 1].targetText, c), `Required carrier absent from ${['build focus', 'cloze turn', 'synthesis turn'][n]}: ${c}`)))
    if (draft.pathNumber === 2 && i === 1) expect(wholePhrase(lesson.build.framePrefix, 'dato che'), 'Required carrier absent from build frame: dato che')
    expect(Object.values(lesson.review.flags).every(f => !f) && lesson.review.reviewers.length === 0 && lesson.review.failingCriteria.length === 0, 'Draft must not claim completed review')
    expect(new Set(lesson.review.acknowledgedWarnings.map(w => w.code)).size === lesson.review.acknowledgedWarnings.length, 'Repeated warning acknowledgement')
    expect(lesson.review.acknowledgedWarnings.every(w => knownWarnings.has(w.code) && w.reason.trim().length >= 12), 'Unsupported warning acknowledgement')
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return draft
}
