/** Offline English/Spanish B2 structural gate. No runtime registry or paid calls. */
import { z } from 'zod'
import { GUIDED_LESSONS } from '../../src/data/guidedLessonsAuthoring'

const text = z.string().min(1).refine(value => value === value.trim() && value === value.normalize('NFC'), 'Expected trimmed NFC text')
const slug = text.refine(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Expected ASCII slug')
const sha256 = text.refine(value => /^[a-f0-9]{64}$/.test(value), 'Expected SHA-256')
const isoDate = text.refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value, 'Expected a valid ISO calendar date')
const base = z.union([z.object({ de: text }).strict(), z.object({ de: text, en: text }).strict()])
const register = z.enum(['formal', 'neutral', 'informal', 'usted', 'tú'])
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

export const latinB2DraftSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal('draft'), targetLanguage: z.enum(['English', 'Spanish']),
  targetLanguageCode: z.enum(['en-US', 'es-ES']), authoredBaseLanguage: z.literal('German'), level: z.literal('B2'),
  pathNumber: z.number().int().min(1).max(2), slug,
  pathTitle: base, pathFunction: base,
  specRef: z.object({ pathSpec: text, pathSpecSha256: sha256, ledger: text, ledgerSha256: sha256 }).strict(),
  authoring: z.object({ source: text, runId: text, date: isoDate }).strict(),
  lessons: z.array(lessonSchema).length(10),
}).strict()

export type LatinB2Draft = z.infer<typeof latinB2DraftSchema>
export type B2TrophyAllocation = { pathNumber: number; lessonNumber: number; lemma: string; familyKey: string; pos: string }
export type LatinB2Evidence = {
  pathSpecSha256: string; ledgerSha256: string; trophies: B2TrophyAllocation[];
  earlierTrophies: string[];
}
export function formatGuidedLessonId(languageSlug: string, level: 'b1' | 'b2', pathNumber: number, lessonNumber: number, lessonSlug: string): string {
  if (!/^[a-z]+$/.test(languageSlug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lessonSlug)
      || !Number.isInteger(pathNumber) || pathNumber < 1 || pathNumber > 10
      || !Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > 10) throw new Error('Invalid lesson ID inputs')
  return `${languageSlug}-${level}-practical-${pathNumber}-${String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')}-${lessonSlug}`
}
const fold = (value: string) => value.normalize('NFC').toLowerCase()
const tokens = (value: string) => value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? []
const normalized = (value: string) => fold(value).replace(/[’ʼ']/g, "'").replace(/\s+/gu, ' ').trim().replace(/[.,!?;:…]+$/gu, '')
const distinct = (values: string[]) => new Set(values.map(normalized)).size === values.length
// Explicit alternate spellings may normalize alike; chips still must be distinguishable.
const distinctAnswers = (values: string[]) => new Set(values).size === values.length
const pairedSpanishPunctuation = (value: string) => {
  const stack: string[] = []
  for (const char of value) {
    if (char === '¿' || char === '¡') stack.push(char)
    else if (char === '?' || char === '!') {
      if (stack.pop() !== (char === '?' ? '¿' : '¡')) return false
    }
  }
  return stack.length === 0
}
const stopLists = {
  English: 'a an the i you he she it we they me him her us them my your his our their of in at to for by and or not',
  Spanish: 'el la los las un una unos unas yo tú usted ustedes él ella nosotros vosotros ellos ellas me te se nos os mi tu su de del al a en y o no que',
}
const whole = (haystack: string, needle: string) => tokens(haystack).map(fold).includes(fold(needle))
const boundary = (value: string, offset: number) => ![...value.matchAll(/[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*/gu)]
  .some(match => match.index < offset && offset < match.index + match[0].length)
const span = (value: string, start: number, length: number) => boundary(value, start) && boundary(value, start + length)
const wholePhrase = (value: string, phrase: string) => {
  const haystack = fold(value), needle = fold(phrase)
  let offset = haystack.indexOf(needle)
  while (offset >= 0) {
    if (span(haystack, offset, needle.length)) return true
    offset = haystack.indexOf(needle, offset + 1)
  }
  return false
}

/** Structural validation does not certify idiom, staging, gender neutrality or unique linguistic answers. */
export function validateLatinB2Draft(value: unknown, evidence: LatinB2Evidence): LatinB2Draft {
  const draft = latinB2DraftSchema.parse(value)
  const stopWords = new Set(stopLists[draft.targetLanguage].split(' '))
  const expectedRegisters = draft.targetLanguage === 'English' ? ['formal', 'neutral', 'informal'] : ['usted', 'tú']
  const apostropheVariants = (answer: string, accepted: string[]) => draft.targetLanguage !== 'English'
    || !answer.includes('’') || accepted.includes(answer.replace(/’/g, "'"))
  const errors: string[] = []
  const check = (condition: boolean, reason: string) => { if (!condition) errors.push(reason) }
  check(draft.specRef.pathSpecSha256 === evidence.pathSpecSha256 && draft.specRef.ledgerSha256 === evidence.ledgerSha256, 'Spec/ledger fingerprint mismatch')
  check(draft.targetLanguageCode === (draft.targetLanguage === 'English' ? 'en-US' : 'es-ES'), 'Target language/code mismatch')
  const walk = (item: unknown, path: string) => {
    if (typeof item === 'string') check(item === item.normalize('NFC') && !/[\p{Cc}\p{Cf}]/u.test(item), `${path}: text must be NFC without controls`)
    else if (Array.isArray(item)) item.forEach((child, i) => walk(child, `${path}/${i}`))
    else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      if ('de' in record) {
        const expected = draft.targetLanguage === 'Spanish' || path.endsWith('/situation') ? ['de', 'en'] : ['de']
        check(JSON.stringify(Object.keys(record).sort()) === JSON.stringify(expected), `${path}: wrong explanation locales`)
      }
      Object.entries(record).forEach(([key, child]) => walk(child, `${path}/${key}`))
    }
  }
  walk(draft, '')
  check(Array.isArray(evidence.earlierTrophies) && evidence.earlierTrophies.length >= 100, 'Reserved B1 trophy evidence required')
  const forbidden = new Set([...GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === draft.targetLanguage)
    .flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [variant.trophyWord.word] : [])),
    ...(Array.isArray(evidence.earlierTrophies) ? evidence.earlierTrophies : [])].map(fold))
  const allocated = new Set<string>()
  check(evidence.trophies.length === 20, 'Exactly twenty P1/P2 allocations required')
  for (const [index, row] of evidence.trophies.entries()) {
    check(row.pathNumber === Math.floor(index / 10) + 1 && row.lessonNumber === index % 10 + 1, 'Allocation rows must be ordered P1/P2 L1–10')
    check(tokens(row.lemma).length === 1 && tokens(row.familyKey).length === 1, 'Allocation lemma/family must be single tokens')
    const identities = new Set([fold(row.lemma), fold(row.familyKey)])
    check([...identities].every(identity => !forbidden.has(identity) && !allocated.has(identity)), 'Allocation collides with reserved content or another family')
    identities.forEach(identity => allocated.add(identity))
  }
  const slugs = new Set<string>(), openers = new Set<string>(), firstReplies = new Set<string>()
  const allowedMoves = draft.pathNumber === 1
    ? ['compare', 'position', 'reason', 'concede', 'rebut', 'conclude']
    : ['explain', 'reason', 'clarify', 'compare', 'summarize', 'conclude']
  for (const [i, lesson] of draft.lessons.entries()) {
    const label = `${draft.targetLanguage} B2 P${draft.pathNumber} L${i + 1}`
    const expect = (ok: boolean, message: string) => check(ok, `${label}: ${message}`)
    expect(lesson.lessonNumber === i + 1, 'Lesson numbers must be local 1–10 in order')
    expect(!slugs.has(lesson.slug), 'Duplicate slug'); slugs.add(lesson.slug)
    expect(lesson.episodeShape === (draft.pathNumber === 1 ? 'challenge' : 'precision'), 'Shape differs from path spec')
    expect(new Set(lesson.registerPlan.registers).size === 1 && lesson.registerPlan.registers.every(value => expectedRegisters.includes(value)), 'Invalid or changing register within constant episode')
    const learnerTurns = [1, 3, 5].map(index => lesson.dialogue[index])
    const moves = learnerTurns.map(turn => turn.move)
    expect(new Set(moves).size === 3 && moves.every(m => m !== undefined) && allowedMoves.includes(moves[0] ?? ''), 'Three distinct moves and path-licensed first move required')
    expect(!moves.includes('relay'), 'Relay is not staged in P1/P2')
    expect(['concede', 'rebut', 'clarify', 'explain', 'compare', 'counteroffer'].includes(moves[1] ?? ''), 'Invalid answering move')
    expect(['conclude', 'propose', 'summarize', 'counteroffer', 'relay', 'request'].includes(moves[2] ?? ''), 'Invalid closing move')
    for (const [n, turn] of lesson.dialogue.entries()) {
      const isLearner = n % 2 === 1
      expect(turn.speaker === (isLearner ? 'you' : 'them'), 'Speakers must alternate')
      expect(isLearner ? turn.interlocutorId === undefined && Boolean(turn.move) && turn.register === lesson.registerPlan.registers[(n - 1) / 2]
        : turn.interlocutorId === lesson.interlocutors[0].id && turn.move === undefined && turn.register === undefined, 'Turn role/register metadata mismatch')
      const bounds = n === 1 ? [14, 26] : n === 3 ? [12, 24] : n === 5 ? [10, 22] : [6, 20]
      expect(tokens(turn.targetText).length >= bounds[0] && tokens(turn.targetText).length <= bounds[1], `Turn ${n + 1} length outside ${bounds.join('–')}`)
    }
    const first = lesson.dialogue[1].targetText
    expect(!openers.has(lesson.dialogue[0].targetText), 'Duplicate opening'); openers.add(lesson.dialogue[0].targetText)
    expect(!firstReplies.has(first), 'Duplicate first reply'); firstReplies.add(first)
    for (const caption of Object.values(lesson.sceneCaption)) expect(caption.includes(lesson.dialogue[0].targetText), 'Scene does not quote opening in every base')
    for (const turn of lesson.dialogue.slice(1)) expect(!Object.values(lesson.sceneCaption).some(t => t.includes(turn.targetText)) && !Object.values(lesson.situation).some(t => t.includes(turn.targetText)), 'Scene reveals a later target turn')
    const focus = lesson.build.chunks.join(' ')
    expect(lesson.build.framePrefix + focus + lesson.build.frameSuffix === first, 'Build reconstruction mismatch')
    expect(span(first, lesson.build.framePrefix.length, focus.length), 'Build focus splits a lexical token')
    let chunkOffset = lesson.build.framePrefix.length
    for (const chunk of lesson.build.chunks) {
      expect(span(first, chunkOffset, chunk.length), 'Build chunk splits a lexical token')
      chunkOffset += chunk.length + 1
    }
    expect(tokens(focus).length >= 7 && tokens(focus).length <= 12, 'Build focus must have 7–12 tokens')
    expect(lesson.build.chunks.every(t => tokens(t).length >= 1 && tokens(t).length <= 4), 'Chunk length outside 1–4 tokens')
    expect(distinct([...lesson.build.chunks, ...lesson.build.distractors]), 'Build chips must be distinct')
    if (draft.targetLanguage === 'Spanish') expect(lesson.build.distractors.every(distractor =>
      lesson.build.chunks.every(chunk => !normalized(chunk).includes(normalized(distractor)))), 'Spanish distractor is a substring of a canonical chunk')
    for (const [exercise, target, min, max] of [[lesson.cloze, lesson.dialogue[3].targetText, 2, 4], [lesson.synthesis, lesson.dialogue[5].targetText, 1, 2]] as const) {
      const indices = exercise.segments.flatMap(part => part.kind === 'blank' ? [part.index] : [])
      expect(JSON.stringify(indices) === JSON.stringify(exercise.blanks.map((_, n) => n)), 'Blank references must occur once in order')
      expect(exercise.blanks.length >= min && exercise.blanks.length <= max, 'Wrong blank count')
      expect(exercise.moveBlankIndex < exercise.blanks.length && ['connector', 'frame'].includes(exercise.blanks[exercise.moveBlankIndex]?.kind), 'Move blank must be a connector/frame')
      expect(exercise.blanks.filter(part => part.choices).length <= 1, 'At most one choice blank allowed')
      expect(exercise.segments.map(part => part.kind === 'text' ? part.text : exercise.blanks[part.index]?.answer ?? '').join('') === target, 'Cloze reconstruction mismatch')
      let offset = 0
      for (const segment of exercise.segments) {
        const value = segment.kind === 'text' ? segment.text : exercise.blanks[segment.index]?.answer ?? ''
        if (segment.kind === 'blank') expect(span(target, offset, value.length), 'Cloze blank splits a lexical token')
        offset += value.length
      }
      for (const part of exercise.blanks) {
        expect(part.acceptedAnswers.includes(part.answer) && distinctAnswers(part.acceptedAnswers), 'Invalid accepted answers')
        expect(apostropheVariants(part.answer, part.acceptedAnswers), 'English answer needs explicit straight-apostrophe variant')
        expect(part.kind === 'form' ? Boolean(part.cue) : part.cue === undefined, 'Only form blanks need cues')
        expect(tokens(part.answer).length >= 1 && tokens(part.answer).length <= (part.kind === 'frame' ? 4 : 3) && !stopWords.has(fold(part.answer)), 'Invalid blank answer')
        if (part.choices) expect(distinct(part.choices) && part.choices.filter(choice => part.acceptedAnswers.map(normalized).includes(normalized(choice))).length === 1, 'Choices need one accepted answer')
      }
    }
    expect(lesson.recall.before + lesson.recall.answer + lesson.recall.after === first, 'Recall reconstruction mismatch')
    expect(span(first, lesson.recall.before.length, lesson.recall.answer.length), 'Recall answer splits a lexical token')
    expect(lesson.recall.acceptedAnswers.includes(lesson.recall.answer) && distinctAnswers(lesson.recall.acceptedAnswers), 'Invalid recall answers')
    expect(apostropheVariants(lesson.recall.answer, lesson.recall.acceptedAnswers), 'English answer needs explicit straight-apostrophe variant')
    expect(tokens(lesson.recall.answer).length >= 1 && tokens(lesson.recall.answer).length <= 3 && !stopWords.has(fold(lesson.recall.answer)), 'Invalid recall answer')
    expect(distinct(lesson.recall.fallbackChoices) && lesson.recall.fallbackChoices.filter(choice => lesson.recall.acceptedAnswers.map(normalized).includes(normalized(choice))).length === 1, 'Recall needs one accepted choice')
    expect(moves.includes(lesson.pattern.moveType), 'Pattern move absent from episode')
    expect(lesson.pattern.examples.some(example => learnerTurns.some(turn => turn.targetText === example.targetText)), 'Pattern must reuse a learner turn')
    for (const example of lesson.pattern.examples) expect(example.highlights.every(t => example.targetText.includes(t)), 'Pattern highlight absent')
    const spoken = [...lesson.dialogue.map(t => t.targetText), ...lesson.pattern.examples.map(e => e.targetText)]
    expect(distinct(lesson.terms.map(t => t.targetText)), 'Duplicate terms')
    expect(lesson.terms.filter(t => ['connector', 'frame'].includes(t.kind)).length >= 2 && lesson.terms.filter(t => ['noun', 'verb', 'adjective', 'adverb'].includes(t.kind)).length >= 3, 'Terms need discourse and lexical coverage')
    for (const term of lesson.terms) {
      expect(tokens(term.targetText).length >= 1 && spoken.some(t => wholePhrase(t, term.targetText)), 'Complete term absent from spoken material')
      if (term.acceptedAnswers) expect(term.acceptedAnswers.includes(term.targetText) && distinctAnswers(term.acceptedAnswers), 'Invalid term answers')
      if (term.acceptedAnswers) expect(apostropheVariants(term.targetText, term.acceptedAnswers), 'English answer needs explicit straight-apostrophe variant')
    }
    expect(JSON.stringify(lesson.speak.map(t => t.turnIndex).sort()) === '[1,3,5]', 'Speak must cover all learner turns')
    for (const target of lesson.speak) {
      expect(distinct(target.requiredTokens) && target.requiredTokens.every(t => tokens(t).length === 1 && whole(lesson.dialogue[target.turnIndex].targetText, t) && !stopWords.has(fold(t))), 'Invalid speech tokens')
      if (target.turnIndex === 1) expect(target.requiredTokens.filter(t => whole(focus, t)).length >= 2, 'Two speech tokens must belong to build focus')
      if (draft.targetLanguage === 'Spanish' && whole(lesson.dialogue[target.turnIndex].targetText, lesson.trophy.surface)) {
        expect(target.requiredTokens.some(token => fold(token) === fold(lesson.trophy.surface)), 'Spanish speech target must include its trophy surface')
      }
    }
    const trophy = lesson.trophy
    const allocation = evidence.trophies.find(t => t.pathNumber === draft.pathNumber && t.lessonNumber === i + 1)
    expect(Boolean(allocation) && allocation?.lemma === trophy.lemma && allocation.familyKey === trophy.familyKey && allocation.pos === trophy.pos, 'Trophy allocation mismatch')
    expect(tokens(trophy.lemma).length === 1 && tokens(trophy.surface).length === 1 && !stopWords.has(fold(trophy.lemma)), 'Trophy must be a lexical single token')
    expect(![trophy.lemma, trophy.familyKey, trophy.surface].some(t => forbidden.has(fold(t))), 'Trophy collides with existing/earlier content')
    ;[trophy.lemma, trophy.familyKey, trophy.surface].forEach(t => forbidden.add(fold(t)))
    expect(whole(lesson.dialogue[trophy.turnIndex].targetText, trophy.surface), 'Trophy surface absent from declared turn')
    expect(whole(trophy.example.targetText, trophy.lemma) || whole(trophy.example.targetText, trophy.surface), 'Trophy example lacks lemma/surface')
    for (const t of [...spoken, ...lesson.build.chunks, ...lesson.terms.map(t => t.targetText), trophy.lemma, trophy.example.targetText]) expect(!/[0-9]|https?:|\p{Extended_Pictographic}|\p{Cc}|\p{Cf}|[[\]<>]| {2}/u.test(t), 'Voiced text contains digits, URL, emoji, controls, annotations or double spaces')
    const sentences = [...spoken, trophy.example.targetText]
    if (draft.targetLanguage === 'English') expect(sentences.every(t => !t.includes('—')), 'English canonical speech must not contain em dashes')
    else expect(sentences.every(pairedSpanishPunctuation), 'Spanish sentence punctuation must be paired')
    expect(lesson.review.reviewers.length === 0 && Object.values(lesson.review.flags).every(flag => flag === false), 'Draft must not claim completed review')
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return draft
}
