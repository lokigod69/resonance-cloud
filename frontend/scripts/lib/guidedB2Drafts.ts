/** Offline German B2 authoring gate. No runtime registry or paid-provider access. */
import { z } from 'zod'
import { GUIDED_LESSONS } from '../../src/data/guidedLessonsAuthoring'

const text = z.string().min(1).refine(value => value === value.trim() && value === value.normalize('NFC'), 'Expected trimmed NFC text')
const slug = text.refine(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Expected ASCII slug')
const sha256 = text.refine(value => /^[a-f0-9]{64}$/.test(value), 'Expected SHA-256')
const isoDate = text.refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value, 'Expected a valid ISO calendar date')
const base = z.object({ en: text }).strict()
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
  registerPlan: z.object({ mode: z.literal('constant'), registers: z.array(z.enum(['Sie', 'du'])).length(3) }).strict(),
  interlocutors: z.array(z.object({ id: text, role: base, voiceRole: z.literal('A') }).strict()).length(1),
  speakerGender: z.literal('neutral'), sceneCaption: base,
  dialogue: z.array(z.object({
    speaker: z.enum(['them', 'you']), targetText: text, base,
    interlocutorId: text.optional(), move: move.optional(), register: z.enum(['Sie', 'du']).optional(),
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

export const germanB2DraftSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal('draft'), targetLanguage: z.literal('German'),
  targetLanguageCode: z.literal('de-DE'), authoredBaseLanguage: z.literal('English'), level: z.literal('B2'),
  pathNumber: z.number().int().min(1).max(2), slug,
  pathTitle: base, pathFunction: base,
  specRef: z.object({ pathSpec: text, pathSpecSha256: sha256, ledger: text, ledgerSha256: sha256 }).strict(),
  authoring: z.object({ source: text, runId: text, date: isoDate }).strict(),
  lessons: z.array(lessonSchema).length(10),
}).strict()

export type GermanB2Draft = z.infer<typeof germanB2DraftSchema>
export type B2TrophyAllocation = { pathNumber: number; lessonNumber: number; lemma: string; familyKey: string; pos: string }
export type B2Evidence = {
  pathSpecSha256: string; ledgerSha256: string; trophies: B2TrophyAllocation[];
  earlierTrophies?: string[];
}
export function formatGuidedLessonId(languageSlug: string, level: 'b1' | 'b2', pathNumber: number, lessonNumber: number, lessonSlug: string): string {
  if (!/^[a-z]+$/.test(languageSlug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lessonSlug)
      || !Number.isInteger(pathNumber) || pathNumber < 1 || pathNumber > 10
      || !Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > 10) throw new Error('Invalid lesson ID inputs')
  return `${languageSlug}-${level}-practical-${pathNumber}-${String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')}-${lessonSlug}`
}
const fold = (value: string) => value.normalize('NFC').toLocaleLowerCase('de-DE')
const tokens = (value: string) => value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? []
const normalized = (value: string) => fold(value).replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  .replace(/[’']/g, "'").replace(/\s+/gu, ' ').trim().replace(/[.,!?;:…]+$/gu, '')
const distinct = (values: string[]) => new Set(values.map(normalized)).size === values.length
const stopWords = new Set('der die das den dem des ein eine einer einen einem eines ich du er sie es wir ihr man mich dich uns euch mir dir ihm ihnen sich und oder aber zu von mit im am an auf'.split(' '))
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
export function validateGermanB2Draft(value: unknown, evidence: B2Evidence): GermanB2Draft {
  const draft = germanB2DraftSchema.parse(value)
  const errors: string[] = []
  const check = (condition: boolean, reason: string) => { if (!condition) errors.push(reason) }
  check(draft.specRef.pathSpecSha256 === evidence.pathSpecSha256 && draft.specRef.ledgerSha256 === evidence.ledgerSha256, 'Spec/ledger fingerprint mismatch')
  const forbidden = new Set([...GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === 'German')
    .flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [variant.trophyWord.word] : [])),
    ...(evidence.earlierTrophies ?? [])].map(fold))
  const slugs = new Set<string>(), openers = new Set<string>(), firstReplies = new Set<string>()
  const allowedMoves = draft.pathNumber === 1
    ? ['compare', 'position', 'reason', 'concede', 'rebut', 'conclude']
    : ['explain', 'reason', 'clarify', 'compare', 'summarize', 'conclude']
  for (const [i, lesson] of draft.lessons.entries()) {
    const label = `German B2 P${draft.pathNumber} L${i + 1}`
    const expect = (ok: boolean, message: string) => check(ok, `${label}: ${message}`)
    expect(lesson.lessonNumber === i + 1, 'Lesson numbers must be local 1–10 in order')
    expect(!slugs.has(lesson.slug), 'Duplicate slug'); slugs.add(lesson.slug)
    expect(lesson.episodeShape === (draft.pathNumber === 1 ? 'challenge' : 'precision'), 'Shape differs from path spec')
    expect(new Set(lesson.registerPlan.registers).size === 1, 'Register changes within constant episode')
    const learnerTurns = [1, 3, 5].map(index => lesson.dialogue[index])
    const moves = learnerTurns.map(turn => turn.move)
    expect(new Set(moves).size === 3 && moves.every(m => m !== undefined && allowedMoves.includes(m)), 'Three distinct path-licensed moves required')
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
    expect(lesson.sceneCaption.en.includes(lesson.dialogue[0].targetText), 'Scene does not quote opening')
    for (const turn of lesson.dialogue.slice(1)) expect(!lesson.sceneCaption.en.includes(turn.targetText) && !Object.values(lesson.situation).some(t => t.includes(turn.targetText)), 'Scene reveals a later target turn')
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
        expect(part.acceptedAnswers.includes(part.answer) && distinct(part.acceptedAnswers), 'Invalid accepted answers')
        expect(part.kind === 'form' ? Boolean(part.cue) : part.cue === undefined, 'Only form blanks need cues')
        expect(tokens(part.answer).length >= 1 && tokens(part.answer).length <= (part.kind === 'frame' ? 4 : 3) && !/[’']/u.test(part.answer) && !stopWords.has(fold(part.answer)), 'Invalid blank answer')
        if (part.choices) expect(distinct(part.choices) && part.choices.filter(choice => part.acceptedAnswers.map(normalized).includes(normalized(choice))).length === 1, 'Choices need one accepted answer')
      }
    }
    expect(lesson.recall.before + lesson.recall.answer + lesson.recall.after === first, 'Recall reconstruction mismatch')
    expect(span(first, lesson.recall.before.length, lesson.recall.answer.length), 'Recall answer splits a lexical token')
    expect(lesson.recall.acceptedAnswers.includes(lesson.recall.answer) && distinct(lesson.recall.acceptedAnswers), 'Invalid recall answers')
    expect(tokens(lesson.recall.answer).length >= 1 && tokens(lesson.recall.answer).length <= 3 && !/[’'-]/u.test(lesson.recall.answer) && !stopWords.has(fold(lesson.recall.answer)), 'Invalid recall answer')
    expect(distinct(lesson.recall.fallbackChoices) && lesson.recall.fallbackChoices.filter(choice => lesson.recall.acceptedAnswers.map(normalized).includes(normalized(choice))).length === 1, 'Recall needs one accepted choice')
    expect(moves.includes(lesson.pattern.moveType), 'Pattern move absent from episode')
    expect(lesson.pattern.examples.some(example => learnerTurns.some(turn => turn.targetText === example.targetText)), 'Pattern must reuse a learner turn')
    for (const example of lesson.pattern.examples) expect(example.highlights.every(t => example.targetText.includes(t)), 'Pattern highlight absent')
    const spoken = [...lesson.dialogue.map(t => t.targetText), ...lesson.pattern.examples.map(e => e.targetText)]
    expect(distinct(lesson.terms.map(t => t.targetText)), 'Duplicate terms')
    expect(lesson.terms.filter(t => ['connector', 'frame'].includes(t.kind)).length >= 2 && lesson.terms.filter(t => ['noun', 'verb', 'adjective', 'adverb'].includes(t.kind)).length >= 3, 'Terms need discourse and lexical coverage')
    for (const term of lesson.terms) {
      expect(tokens(term.targetText).length >= 1 && spoken.some(t => wholePhrase(t, term.targetText)), 'Complete term absent from spoken material')
      if (term.acceptedAnswers) expect(term.acceptedAnswers.includes(term.targetText) && distinct(term.acceptedAnswers), 'Invalid term answers')
    }
    expect(JSON.stringify(lesson.speak.map(t => t.turnIndex).sort()) === '[1,3,5]', 'Speak must cover all learner turns')
    for (const target of lesson.speak) {
      expect(distinct(target.requiredTokens) && target.requiredTokens.every(t => tokens(t).length === 1 && whole(lesson.dialogue[target.turnIndex].targetText, t) && !stopWords.has(fold(t))), 'Invalid speech tokens')
      if (target.turnIndex === 1) expect(target.requiredTokens.filter(t => whole(focus, t)).length >= 2, 'Two speech tokens must belong to build focus')
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
    expect(lesson.review.reviewers.length === 0 && Object.values(lesson.review.flags).every(flag => flag === false), 'Draft must not claim completed review')
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return draft
}
