/**
 * Offline French B2 P1/P2 source gate. No content is relabelled; the Latin validator is not called.
 * Structural success is not native, pedagogical, permutation, runtime or TTS approval.
 */
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import type { B2TrophyAllocation } from './guidedLatinB2Drafts'

export const FRENCH_B2_AUTHORITY = {
  specification: 'B2_FRENCH_P1_P2_AUTHORING_SPEC.json',
  specificationSha256: 'd01d7f24143ade1107c8dbe1f93dc49b91f94ed853df7b312d85da3b9833a51d',
  prerequisites: 'B2_LATIN_PREREQUISITES.json',
  prerequisitesSha256: '72f074b845ee0b2165cae99ab1739d9315a00e5b273f132d2f45c5bb3396af32',
} as const

// Keep the strict shape explicit: repeated Zod extends exhaust TypeScript inference memory.
const text = z.string().min(1).refine(value => value === value.trim() && value === value.normalize('NFC'), 'Expected trimmed NFC text')
const slug = text.refine(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Expected ASCII slug')
const sha256 = text.refine(value => /^[a-f0-9]{64}$/.test(value), 'Expected SHA-256')
const isoDate = text.refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value, 'Expected a valid ISO calendar date')
const base = z.union([z.object({ de: text }).strict(), z.object({ de: text, en: text }).strict()])
const register = z.enum(['vous', 'tu'])
const move = z.enum(['compare', 'position', 'reason', 'concede', 'rebut', 'conclude', 'explain', 'clarify', 'summarize', 'hypothesize', 'propose', 'request', 'counteroffer', 'invite', 'relay'])
const blank = z.object({
  answer: text, acceptedAnswers: z.array(text).min(1), kind: z.enum(['connector', 'frame', 'form', 'lexical']),
  cue: base.optional(), choices: z.array(text).length(4).optional(),
}).strict()
const segment = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string() }).strict(),
  z.object({ kind: z.literal('blank'), index: z.number().int().min(0) }).strict(),
])
const cloze = z.object({ segments: z.array(segment).min(1), blanks: z.array(blank).min(1).max(4), moveBlankIndex: z.number().int().min(0) }).strict()
const flags = z.object({
  argumentCoherent: z.boolean(), challengeGenuine: z.boolean(), steerGenuine: z.boolean(),
  b2NotInflatedB1: z.boolean(), registerNative: z.boolean(), genderClaimVerified: z.boolean(),
  distractorsNotAlsoCorrect: z.boolean(), patternTruthful: z.boolean(), baseTextsAccurate: z.boolean(),
  ttsReadable: z.boolean(), carriersStaged: z.boolean(), noFiller: z.boolean(),
}).strict()
const lessonSchema = z.object({
  lessonNumber: z.number().int().min(1).max(10), slug,
  title: base, situation: z.object({ de: text, en: text }).strict(),
  episodeShape: z.enum(['challenge', 'precision']),
  registerPlan: z.object({ mode: z.literal('constant'), registers: z.array(register).length(3) }).strict(),
  interlocutors: z.array(z.object({ id: text, role: base, voiceRole: z.literal('A') }).strict()).length(1),
  speakerGender: z.literal('neutral'), sceneCaption: base,
  dialogue: z.array(z.object({
    speaker: z.enum(['them', 'you']), targetText: text, base,
    interlocutorId: text.optional(), move: move.optional(), register: register.optional(),
  }).strict()).length(6),
  build: z.object({ framePrefix: z.string(), chunks: z.array(text).min(5).max(8), distractors: z.array(text).length(2), frameSuffix: z.string() }).strict(),
  cloze, synthesis: cloze,
  recall: z.object({ before: z.string(), answer: text, acceptedAnswers: z.array(text).min(1), after: z.string(), fallbackChoices: z.array(text).length(4) }).strict(),
  pattern: z.object({ moveType: move, label: base, rule: base,
    examples: z.array(z.object({ targetText: text, base, highlights: z.array(text).min(1) }).strict()).min(2).max(3),
  }).strict(),
  terms: z.array(z.object({ targetText: text, lemma: text.optional(), kind: z.enum(['connector', 'frame', 'noun', 'verb', 'adjective', 'adverb', 'phrase']), base, acceptedAnswers: z.array(text).min(1).optional() }).strict()).min(8).max(10),
  speak: z.array(z.object({ turnIndex: z.union([z.literal(1), z.literal(3), z.literal(5)]), requiredTokens: z.array(text).min(2).max(4), profile: z.enum(['b2-long', 'b2-short']) }).strict()).length(3),
  trophy: z.object({ lemma: text, familyKey: text, surface: text, turnIndex: z.number().int().min(0).max(5), pos: z.enum(['noun', 'verb', 'adjective', 'adverb', 'connector']), example: z.object({ targetText: text, base }).strict(), base }).strict(),
  review: z.object({ flags, verdict: z.literal('pending'), failingCriteria: z.array(z.number().int()),
    reviewers: z.array(z.object({ role: z.enum(['validator', 'codex', 'fable', 'native-model', 'native-human']), id: text, date: text }).strict()),
    nativeStatus: z.literal('unreviewed'),
    acknowledgedWarnings: z.array(z.object({ code: text, reason: text }).strict()),
  }).strict(),
}).strict()

export const frenchB2DraftSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal('draft'), targetLanguage: z.literal('French'),
  targetLanguageCode: z.literal('fr-FR'), authoredBaseLanguage: z.literal('German'), level: z.literal('B2'),
  pathNumber: z.number().int().min(1).max(2), slug,
  pathTitle: base, pathFunction: base,
  specRef: z.object({ pathSpec: text, pathSpecSha256: sha256, ledger: text, ledgerSha256: sha256 }).strict(),
  authoring: z.object({ source: text, runId: text, date: isoDate }).strict(),
  lessons: z.array(lessonSchema).length(10),
}).strict()

export type FrenchB2Draft = z.infer<typeof frenchB2DraftSchema>
export type FrenchB2Evidence = {
  /** Exact original UTF-8 text, including original whitespace; never JSON.stringify(parsed). */
  specificationSource: string
  specification: unknown
  pathSpecSha256: string
  ledgerSha256: string
  prerequisitesSource: string
  prerequisites: unknown
  prerequisitesSha256: string
  trophies: B2TrophyAllocation[]
  /** Must contain the complete pinned frozen A1/A2 plus hundred reserved B1 set. Extras remain forbidden. */
  earlierTrophies: string[]
}

type Specification = {
  status: string; targetLanguage: string; code: string; level: string
  baseLocales: string[]; authoredBaseLanguage: string
  paths: Array<{ pathNumber: number; title: string; function: string; moveWhitelist: string[]
    lessons: Array<{ number: number; slug: string; register: 'vous' | 'tu'; trophyLemma: string
      trophyFamilyKey: string; trophySurface: string; pos: string }> }>
  trophyLedger: { rows: B2TrophyAllocation[] }
}
type Prerequisite = { targetLanguage: string; frozenLessonCount: number; activeCorpusSha256: string
  b1AllocationSha256: string; forbiddenTrophies: string[] }

const sha = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')
const fold = (value: string) => value.normalize('NFC').toLocaleLowerCase('fr')
const tokenPattern = /[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*/gu
const tokens = (value: string) => value.match(tokenPattern) ?? []
const normalized = (value: string) => fold(value).trim().replace(/\s+/gu, ' ').replace(/[.,!?;:…]+$/gu, '').trim()
// Comparison only: this never adds an accepted answer or rewrites canonical text.
const choiceIdentity = (value: string) => normalized(value).normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/’/gu, "'").replace(/œ/gu, 'oe').replace(/ (?=[?!:;])/gu, '')
const distinct = (values: string[]) => new Set(values.map(normalized)).size === values.length
const whole = (text: string, token: string) => tokens(text).map(fold).includes(fold(token))
const boundary = (text: string, at: number) => ![...text.matchAll(tokenPattern)]
  .some(match => match.index < at && at < match.index + match[0].length)
const span = (text: string, at: number, length: number) => boundary(text, at) && boundary(text, at + length)
const wholePhrase = (text: string, phrase: string) => {
  const source = fold(text), query = fold(phrase)
  let at = source.indexOf(query)
  while (at >= 0) {
    if (span(source, at, query.length)) return true
    at = source.indexOf(query, at + 1)
  }
  return false
}
const explicitVariants = (answer: string) => {
  let result = [answer]
  for (const change of [
    (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC'),
    (s: string) => s.replace(/’/gu, "'"),
    (s: string) => s.replace(/œ/gu, 'oe').replace(/Œ/gu, 'OE'),
    (s: string) => s.replace(/ (?=[?!:;])/gu, ''),
  ]) result = [...new Set([...result, ...result.map(change)])]
  return result
}
const stopWords = new Set('je tu il elle on nous vous ils elles me te se le la les lui leur y en un une des du de à au aux et ou ne pas ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos leurs qui que quoi dont est sont suis es ai as a ont être avoir'.split(' '))
const neverIsolated = /^(?:[ldjmncts]’|qu’|ne|pas|me|te|se|le|la|les|lui|leur|nous|vous|y|en)$/iu
const namedLongFrame = 'c’est pour cette raison que'
const warningNotes: Record<string, string> = {
  'FR-B2-GROUP-VOUS': 'group vous needs human inspection',
  'FR-B2-ON-VOUS': 'learner on in a vous episode needs a stated generic or nous referent',
}

/** No proof of idiomaticity, semantics, scene paraphrase spoilers, exhaustive morphology or chip permutation uniqueness. */
export function validateFrenchB2Draft(value: unknown, evidence: FrenchB2Evidence): FrenchB2Draft {
  const draft = frenchB2DraftSchema.parse(value)
  const errors: string[] = []
  const check = (ok: boolean, reason: string) => { if (!ok) errors.push(reason) }
  // These fixed authorities prevent an arbitrary same-shape specification or dummy reservation list from becoming authority.
  const verifySource = (source: unknown, parsed: unknown, claimedHash: unknown, expectedHash: string, label: string): unknown => {
    if (typeof source !== 'string' || typeof claimedHash !== 'string') throw new Error(`${label}: exact UTF-8 source and fingerprint required`)
    if (sha(source) !== expectedHash || claimedHash !== expectedHash) throw new Error(`${label}: source fingerprint mismatch`)
    let recovered: unknown
    try { recovered = JSON.parse(source) } catch { throw new Error(`${label}: invalid source JSON`) }
    if (!isDeepStrictEqual(parsed, recovered)) throw new Error(`${label}: parsed/source drift`)
    return recovered
  }
  const spec = verifySource(evidence?.specificationSource, evidence?.specification, evidence?.pathSpecSha256,
    FRENCH_B2_AUTHORITY.specificationSha256, 'French specification') as Specification
  const prerequisiteRecords = verifySource(evidence?.prerequisitesSource, evidence?.prerequisites, evidence?.prerequisitesSha256,
    FRENCH_B2_AUTHORITY.prerequisitesSha256, 'French prerequisites') as Prerequisite[]
  const prerequisite = prerequisiteRecords.find(row => row.targetLanguage === 'French')
  if (!prerequisite) throw new Error('French prerequisite record missing')
  check(spec.status === 'fable-authoring-spec' && spec.targetLanguage === 'French' && spec.code === 'fr-FR'
    && spec.level === 'B2' && spec.authoredBaseLanguage === 'German' && spec.baseLocales.join(',') === 'de,en', 'Specification identity mismatch')
  check(evidence.ledgerSha256 === FRENCH_B2_AUTHORITY.specificationSha256, 'Embedded ledger fingerprint mismatch')
  check(draft.specRef.pathSpec === FRENCH_B2_AUTHORITY.specification && draft.specRef.ledger === FRENCH_B2_AUTHORITY.specification
    && draft.specRef.pathSpecSha256 === evidence.pathSpecSha256 && draft.specRef.ledgerSha256 === evidence.ledgerSha256, 'Draft specification path/fingerprint mismatch')
  const validEarlier = Array.isArray(evidence.earlierTrophies) && evidence.earlierTrophies.every(t => typeof t === 'string' && t.trim() === t && t.length > 0)
  check(validEarlier, 'Complete earlier trophy evidence required')
  const earlier = new Set((validEarlier ? evidence.earlierTrophies : []).map(fold))
  check(prerequisite.forbiddenTrophies.every(t => earlier.has(fold(t))), 'Missing frozen French or hundred reserved B1 trophy evidence')
  const forbidden = new Set([...prerequisite.forbiddenTrophies.map(fold), ...earlier])
  check(Array.isArray(evidence.trophies) && evidence.trophies.length === 20, 'Exactly twenty ordered trophy allocations required')
  const allocations = Array.isArray(evidence.trophies) ? evidence.trophies : []
  check(isDeepStrictEqual(allocations, spec.trophyLedger.rows), 'Trophy allocation differs from complete embedded ledger')
  const seenAllocation = new Set<string>()
  for (const [i, row] of allocations.entries()) {
    if (!row || typeof row !== 'object') { check(false, 'Invalid trophy allocation record'); continue }
    check(row.pathNumber === Math.floor(i / 10) + 1 && row.lessonNumber === i % 10 + 1, 'Trophy allocation order mismatch')
    if (typeof row.lemma !== 'string' || typeof row.familyKey !== 'string') { check(false, 'Invalid trophy allocation lexical identity'); continue }
    check(tokens(row.lemma).length === 1 && tokens(row.familyKey).length === 1, 'Allocation lemma/family must be single tokens')
    const specifiedSurface = spec.paths[Math.floor(i / 10)]?.lessons[i % 10]?.trophySurface
    check(typeof specifiedSurface === 'string', 'Specification inflection evidence missing')
    for (const identity of new Set([fold(row.lemma), fold(row.familyKey), fold(specifiedSurface ?? '')])) {
      check(!forbidden.has(identity) && !seenAllocation.has(identity), 'Allocation collides with frozen/reserved content or another family')
      seenAllocation.add(identity)
    }
  }
  const walk = (item: unknown, path: string) => {
    if (typeof item === 'string') check(item === item.normalize('NFC') && !/[\p{Cc}\p{Cf}]/u.test(item), `${path}: NFC text without controls required`)
    else if (Array.isArray(item)) item.forEach((v, i) => walk(v, `${path}/${i}`))
    else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      if ('de' in record) check(Object.keys(record).sort().join(',') === 'de,en', `${path}: both de/en explanation locales required`)
      Object.entries(record).forEach(([key, child]) => walk(child, `${path}/${key}`))
    }
  }
  walk(draft, 'draft')
  const canonical = (text: string, label: string) => {
    check(!/[\p{N}\p{Cc}\p{Cf}\p{Extended_Pictographic}\u00a0\u202f]|https?:|[[\]<>/\\_]| {2}|—/u.test(text), `${label}: illegal canonical digits, controls, spacing, annotations or symbols`)
    check(!/['ʼ‘]/u.test(text), `${label}: canonical elision must use U+2019`)
    check(!/(?:^|[^ ])[?!:;]| {2}[?!:;]| [,.]/u.test(text), `${label}: French punctuation requires exactly one ASCII space`)
    check(!/(?:^|[^\p{L}])(?:coeur|soeur)s?(?=$|[^\p{L}])/iu.test(text), `${label}: canonical œ required`)
    check(tokens(text).length > 0, `${label}: canonical lexical content required`)
  }
  const answers = (answer: string, accepted: string[], label: string) => {
    check(accepted.includes(answer) && new Set(accepted).size === accepted.length, `${label}: invalid accepted answers`)
    check(accepted.length <= 16, `${label}: more than sixteen authored answers`)
    check(accepted.every(a => explicitVariants(a).every(variant => accepted.includes(variant))), `${label}: missing explicit French spelling variant`)
    check(accepted.every(a => tokens(a).length > 0), `${label}: accepted answer has no lexical content`)
  }
  const choices = (items: string[], accepted: string[], label: string) => {
    check(new Set(items.map(choiceIdentity)).size === 4 && items.filter(c => accepted.some(a => choiceIdentity(a) === choiceIdentity(c))).length === 1,
      `${label}: choices must be distinct with exactly one accepted answer`)
    items.forEach(c => canonical(c, `${label} choice`))
  }
  const path = spec.paths.find(p => p.pathNumber === draft.pathNumber)
  if (!path) throw new Error('Specification path missing')
  const slugs = new Set<string>(), openings = new Set<string>(), firstReplies = new Set<string>(), surfaces = new Set<string>()
  for (const [i, lesson] of draft.lessons.entries()) {
    const label = `French B2 P${draft.pathNumber} L${i + 1}`
    const expect = (ok: boolean, message: string) => check(ok, `${label}: ${message}`)
    const specLesson = path.lessons[i]
    expect(lesson.lessonNumber === i + 1 && specLesson?.number === i + 1, 'Lesson order differs from specification')
    expect(lesson.slug === specLesson?.slug && !slugs.has(lesson.slug), 'Lesson slug differs from specification or repeats'); slugs.add(lesson.slug)
    expect(lesson.episodeShape === (draft.pathNumber === 1 ? 'challenge' : 'precision'), 'Episode shape mismatch')
    expect(lesson.registerPlan.registers.every(r => r === specLesson.register), 'Register allocation differs from specification')
    const learnerTurns = [1, 3, 5].map(n => lesson.dialogue[n])
    const moves = learnerTurns.map(t => t.move)
    expect(new Set(moves).size === 3 && path.moveWhitelist.includes(moves[0] ?? ''), 'Three distinct moves and licensed first move required')
    expect(['concede','rebut','clarify','explain','compare','counteroffer'].includes(moves[1] ?? ''), 'Invalid answering move')
    expect(['conclude','propose','summarize','counteroffer','request'].includes(moves[2] ?? '') && !moves.includes('relay'), 'Invalid closing move or early relay')
    const warningCodes = new Set<string>()
    for (const [n, turn] of lesson.dialogue.entries()) {
      const isYou = n % 2 === 1
      expect(turn.speaker === (isYou ? 'you' : 'them'), 'Speakers must alternate')
      expect(isYou ? turn.interlocutorId === undefined && Boolean(turn.move) && turn.register === specLesson.register
        : turn.interlocutorId === lesson.interlocutors[0].id && turn.move === undefined && turn.register === undefined, 'Turn role/register metadata mismatch')
      const bounds = n === 1 ? [14, 26] : n === 3 ? [12, 24] : n === 5 ? [10, 22] : [6, 20]
      expect(tokens(turn.targetText).length >= bounds[0] && tokens(turn.targetText).length <= bounds[1], `Turn ${n} length outside ${bounds.join('–')}`)
      const lower = fold(turn.targetText)
      if (specLesson.register === 'vous') expect(!/(?:^|[^\p{L}’])(?:tu|te|toi|ton|ta|tes)(?:$|[^\p{L}’])|(?:^|[^\p{L}])t’/u.test(lower), 'Informal address token in vous episode')
      else if (tokens(lower).some(t => ['vous','votre','vos'].includes(t))) warningCodes.add('FR-B2-GROUP-VOUS')
      // Learner on may be generic or stand for nous; this only raises the question for content review.
      if (isYou && specLesson.register === 'vous' && tokens(lower).some(t => t === 'on' || t.endsWith('’on'))) warningCodes.add('FR-B2-ON-VOUS')
      // These are narrow examples explicitly banned by the specification, not a suffix-based grammar parser.
      if (isYou) expect(!/(?:^|[^\p{L}])je (?:me )?suis (?:(?:vraiment|très|plutôt|déjà|encore|toujours|bien) )*(?:sûre?|contente?|convaincue?|partie?|allée?|arrivée?|restée?|trompée?|seule?)(?=$|[^\p{L}])/u.test(lower), 'Explicit speaker-gender construction forbidden')
      canonical(turn.targetText, `${label} turn ${n}`)
    }
    expect(!openings.has(lesson.dialogue[0].targetText), 'Duplicate opener'); openings.add(lesson.dialogue[0].targetText)
    const first = lesson.dialogue[1].targetText
    expect(!firstReplies.has(first), 'Duplicate first reply'); firstReplies.add(first)
    for (const caption of Object.values(lesson.sceneCaption)) expect(caption.includes(lesson.dialogue[0].targetText), 'Scene must quote opener in both bases')
    for (const later of lesson.dialogue.slice(1)) expect(![...Object.values(lesson.sceneCaption), ...Object.values(lesson.situation)].some(s => s.includes(later.targetText)), 'Scene reveals later target turn')
    const focus = lesson.build.chunks.join(' ')
    expect(lesson.build.framePrefix + focus + lesson.build.frameSuffix === first, 'Build reconstruction mismatch')
    expect(span(first, lesson.build.framePrefix.length, focus.length), 'Build focus splits a lexical token')
    expect(!lesson.build.framePrefix || lesson.build.framePrefix.endsWith(' '), 'Build prefix must carry its boundary space')
    expect(!lesson.build.frameSuffix || lesson.build.frameSuffix.startsWith(' '), 'Build suffix must carry its boundary space')
    let chunkOffset = lesson.build.framePrefix.length
    for (const chunk of lesson.build.chunks) {
      expect(span(first, chunkOffset, chunk.length), 'Build chunk splits a lexical token')
      expect(tokens(chunk).length >= 1 && tokens(chunk).length <= 4 && !neverIsolated.test(normalized(chunk)), 'Invalid chunk length or isolated elision/clitic/negation')
      chunkOffset += chunk.length + 1
    }
    expect(tokens(focus).length >= 7 && tokens(focus).length <= 12, 'Build focus length outside 7–12')
    expect(distinct([...lesson.build.chunks, ...lesson.build.distractors]), 'Build chips must be distinct')
    for (const chip of [...lesson.build.chunks, ...lesson.build.distractors]) canonical(chip, `${label} build chip`)
    // Narrow structural handling of ordinary negated finite groups; adverb placement and
    // arbitrary French syntax still require the independent content read.
    const chipSpans: Array<{ start: number; end: number }> = []
    let start = lesson.build.framePrefix.length
    for (const chip of lesson.build.chunks) { chipSpans.push({ start, end: start + chip.length }); start += chip.length + 1 }
    const negative = /(?:\bje|\btu|\bil|\belle|\bon|\bnous|\bvous|\bils|\belles|\bqui) ne (?:(?:me|te|se|le|la|les|lui|leur|nous|vous|y|en) )*[\p{L}]+(?:’[\p{L}]+)? (?:pas|plus|jamais)/giu
    for (const match of first.matchAll(negative)) {
      const end = match.index + match[0].length
      if (end <= lesson.build.framePrefix.length || match.index >= lesson.build.framePrefix.length + focus.length) continue
      const negatorStart = match.index + match[0].lastIndexOf(' ') + 1
      const bundledEnd = tokens(match[0]).length <= 4 ? end : negatorStart - 1
      expect(chipSpans.some(chip => chip.start <= match.index && chip.end >= bundledEnd), 'Negated clitic group must stay in one permitted chip')
      if (tokens(match[0]).length > 4) expect(chipSpans.some(chip => chip.start <= negatorStart && chip.end > end), 'Long negation must attach pas/plus/jamais to following material')
    }
    for (const [exercise, target, min, max] of [[lesson.cloze, lesson.dialogue[3].targetText, 2, 4], [lesson.synthesis, lesson.dialogue[5].targetText, 1, 2]] as const) {
      const indices = exercise.segments.flatMap(s => s.kind === 'blank' ? [s.index] : [])
      expect(indices.join(',') === exercise.blanks.map((_, j) => j).join(','), 'Blank references must occur once in order')
      expect(exercise.blanks.length >= min && exercise.blanks.length <= max, 'Wrong blank count')
      expect(['connector','frame'].includes(exercise.blanks[exercise.moveBlankIndex]?.kind), 'Move blank must be connector/frame')
      expect(exercise.blanks.filter(b => b.choices).length <= 1, 'At most one choice blank allowed')
      expect(exercise.segments.map(s => s.kind === 'text' ? s.text : exercise.blanks[s.index]?.answer ?? '').join('') === target, 'Cloze reconstruction mismatch')
      let offset = 0
      for (const s of exercise.segments) {
        const text = s.kind === 'text' ? s.text : exercise.blanks[s.index]?.answer ?? ''
        if (s.kind === 'blank') expect(span(target, offset, text.length), 'Cloze blank splits a lexical token')
        offset += text.length
      }
      for (const blank of exercise.blanks) {
        answers(blank.answer, blank.acceptedAnswers, `${label} blank`)
        const count = tokens(blank.answer).length
        // The complete, explicitly staged French carrier is five tokens; the generic Latin ceiling is four.
        const maxTokens = blank.kind === 'frame' ? (fold(blank.answer) === namedLongFrame ? 5 : 4) : 3
        const allowedAuxiliaryForm = blank.kind === 'form' && ['est','sont','suis','es','ai','as','a','ont','être','avoir'].includes(fold(blank.answer))
        expect(count >= 1 && count <= maxTokens && !neverIsolated.test(blank.answer) && (!stopWords.has(fold(blank.answer)) || allowedAuxiliaryForm) && !/[.,!?;:…]$/u.test(blank.answer), 'Invalid blank answer')
        expect(blank.kind === 'form' ? Boolean(blank.cue) : blank.cue === undefined, 'Form cues required exactly for form blanks')
        canonical(blank.answer, `${label} blank answer`)
        if (blank.choices) choices(blank.choices, blank.acceptedAnswers, `${label} cloze`)
      }
    }
    const recall = lesson.recall
    expect(recall.before + recall.answer + recall.after === first, 'Recall reconstruction mismatch')
    expect(span(first, recall.before.length, recall.answer.length), 'Recall answer splits a lexical token')
    expect(tokens(recall.answer).length >= 1 && tokens(recall.answer).length <= 3 && !neverIsolated.test(recall.answer) && !stopWords.has(fold(recall.answer)), 'Invalid recall answer')
    canonical(recall.answer, `${label} recall answer`)
    answers(recall.answer, recall.acceptedAnswers, `${label} recall`)
    choices(recall.fallbackChoices, recall.acceptedAnswers, `${label} recall`)
    expect(moves.includes(lesson.pattern.moveType), 'Pattern move absent from episode')
    expect(lesson.pattern.examples.some(e => learnerTurns.some(t => t.targetText === e.targetText)), 'Pattern must reuse exact learner turn')
    for (const example of lesson.pattern.examples) {
      expect(example.highlights.every(h => example.targetText.includes(h)), 'Pattern highlight absent')
      canonical(example.targetText, `${label} pattern example`)
      example.highlights.forEach(h => canonical(h, `${label} pattern highlight`))
    }
    const spoken = [...lesson.dialogue.map(t => t.targetText), ...lesson.pattern.examples.map(e => e.targetText)]
    expect(distinct(lesson.terms.map(t => t.targetText)), 'Duplicate terms')
    expect(lesson.terms.filter(t => ['connector','frame'].includes(t.kind)).length >= 2 && lesson.terms.filter(t => ['noun','verb','adjective','adverb'].includes(t.kind)).length >= 3, 'Terms need discourse and lexical coverage')
    for (const term of lesson.terms) {
      expect(spoken.some(text => wholePhrase(text, term.targetText)), `Complete term absent from spoken material: ${term.targetText}`)
      canonical(term.targetText, `${label} term`)
      if (term.lemma) canonical(term.lemma, `${label} term lemma`)
      if (term.acceptedAnswers) answers(term.targetText, term.acceptedAnswers, `${label} term`)
    }
    expect(lesson.speak.map(s => s.turnIndex).join(',') === '1,3,5', 'Speak must cover ordered learner turns')
    for (const speech of lesson.speak) {
      expect(speech.profile === (speech.turnIndex === 5 ? 'b2-short' : 'b2-long'), 'Speak profile mismatch')
      expect(distinct(speech.requiredTokens) && speech.requiredTokens.every(t => tokens(t).length === 1 && whole(lesson.dialogue[speech.turnIndex].targetText, t) && !stopWords.has(fold(t))), 'Invalid complete speech tokens')
      if (speech.turnIndex === 1) expect(speech.requiredTokens.filter(t => whole(focus, t)).length >= 2, 'Two speech tokens must be in build focus')
      if (whole(lesson.dialogue[speech.turnIndex].targetText, lesson.trophy.surface)) expect(speech.requiredTokens.some(t => fold(t) === fold(lesson.trophy.surface)), 'Speech target must include its trophy surface')
      speech.requiredTokens.forEach(t => canonical(t, `${label} speech token`))
    }
    const trophy = lesson.trophy
    expect(trophy.lemma === specLesson.trophyLemma && trophy.familyKey === specLesson.trophyFamilyKey && trophy.pos === specLesson.pos, 'Trophy allocation mismatch')
    expect(trophy.surface === specLesson.trophySurface, 'Trophy surface differs from reviewed specification inflection')
    expect([trophy.lemma,trophy.familyKey,trophy.surface].every(t => tokens(t).length === 1 && !stopWords.has(fold(t))), 'Trophy must be lexical single tokens')
    expect([1,3,5].includes(trophy.turnIndex) && whole(lesson.dialogue[trophy.turnIndex].targetText, trophy.surface), 'Trophy surface absent from declared learner turn')
    expect(![trophy.lemma,trophy.familyKey,trophy.surface].some(t => forbidden.has(fold(t))) && !surfaces.has(fold(trophy.surface)), 'Trophy collides with frozen/reserved content or another surface')
    surfaces.add(fold(trophy.surface))
    expect(whole(trophy.example.targetText, trophy.lemma) || whole(trophy.example.targetText, trophy.surface), 'Trophy example lacks complete lemma/surface')
    for (const text of [trophy.lemma,trophy.familyKey,trophy.surface,trophy.example.targetText]) canonical(text, `${label} trophy`)
    expect(Object.values(lesson.review.flags).every(flag => !flag) && lesson.review.reviewers.length === 0 && lesson.review.failingCriteria.length === 0, 'Draft must not claim completed review')
    expect(new Set(lesson.review.acknowledgedWarnings.map(w => w.code)).size === lesson.review.acknowledgedWarnings.length, 'Repeated warning acknowledgement')
    for (const code of warningCodes) expect(lesson.review.acknowledgedWarnings.some(w => w.code === code && w.reason.trim().length >= 12
      && (code !== 'FR-B2-ON-VOUS' || /(?:^|[^\p{L}])(?:générique|generique|generic|nous)(?=$|[^\p{L}])/iu.test(w.reason))), `Unacknowledged ${code}: ${warningNotes[code] ?? 'needs human inspection'}`)
    expect(lesson.review.acknowledgedWarnings.every(w => warningCodes.has(w.code)), 'Unsupported warning acknowledgement')
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return draft
}
