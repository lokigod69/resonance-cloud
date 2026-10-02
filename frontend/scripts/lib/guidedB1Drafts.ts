/** Offline authoring contract. Drafts are deliberately absent from the app registry. */
import { z } from 'zod'
import { GUIDED_LESSONS } from '../../src/data/guidedLessonsAuthoring'

const text = z.string().min(1).refine(value => value === value.trim(), 'Unexpected edge whitespace')
const base = z.object({ de: text, en: text.optional() }).strict()
const bilingual = z.object({ de: text, en: text }).strict()
const translated = z.object({ targetText: text, baseText: base }).strict()
const blank = z.object({
  kind: z.enum(['form', 'connector', 'choice']), answer: text,
  cue: text.optional(), choices: z.array(text).length(4),
}).strict()
export const b1DraftSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal('draft'), level: z.literal('B1'),
  targetLanguage: z.enum(['English', 'Spanish', 'French']),
  targetLanguageCode: z.enum(['en-US', 'es-ES', 'fr-FR']),
  baseLanguage: z.literal('German'), pathNumber: z.literal(1),
  title: base, subtitle: base, anchor: text,
  lessons: z.array(z.object({
    slug: text.refine(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Expected an ASCII slug'),
    title: base, situation: bilingual, pedagogicalGoal: text,
    register: z.enum(['neutral', 'formal', 'informal']),
    dialogue: z.tuple([translated, translated, translated, translated]),
    pattern: z.object({ label: text, rule: base, examples: z.array(translated.extend({ highlight: text }).strict()).min(2).max(3) }).strict(),
    cloze: z.array(z.union([z.string(), blank])).min(3),
    chunks: z.array(translated).min(4).max(7),
    terms: z.array(translated).min(6).max(8),
    recall: z.object({ before: z.string(), answer: text, after: z.string(), fallbackChoices: z.array(text).length(4) }).strict(),
    speakRequired: z.tuple([text, text, text]), sceneCaption: base,
    trophyWord: z.object({ word: text, meaning: base, example: text, whyThisWord: base }).strict(),
    distractors: z.tuple([text, text]), placeholderCaption: base,
    songMood: text, visualNotes: text,
  }).strict()).length(10),
}).strict()
export type B1Draft = z.infer<typeof b1DraftSchema>
const fold = (value: string) => value.normalize('NFC').toLocaleLowerCase()
const words = (value: string): string[] => fold(value).match(/[\p{L}\p{N}]+/gu) ?? []

export function validateB1Draft(value: unknown): B1Draft {
  const draft = b1DraftSchema.parse(value)
  const errors: string[] = []
  const expect = (condition: boolean, label: string) => { if (!condition) errors.push(label) }
  const forbidden = new Set(GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === draft.targetLanguage)
    .flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [fold(variant.trophyWord.word)] : [])))
  const slugs = new Set<string>()
  const codes = { English: 'en-US', Spanish: 'es-ES', French: 'fr-FR' }
  expect(draft.targetLanguageCode === codes[draft.targetLanguage], 'Target language/code mismatch')
  const checkBases = (record: unknown, path: string) => {
    if (!record || typeof record !== 'object') return
    if (Array.isArray(record)) { record.forEach((item, index) => checkBases(item, `${path}/${index}`)); return }
    const obj = record as Record<string, unknown>
    if ('de' in obj) {
      expect(typeof obj.de === 'string' && Boolean(obj.de), `${path}: German explanation missing`)
      if (draft.targetLanguage !== 'English' || path.endsWith('/situation')) {
        expect(typeof obj.en === 'string' && Boolean(obj.en), `${path}: English explanation missing`)
      } else expect(!('en' in obj), `${path}: English target uses its existing German explanation convention`)
    }
    Object.entries(obj).forEach(([key, child]) => checkBases(child, `${path}/${key}`))
  }
  checkBases(draft, draft.targetLanguage)
  for (const [index, lesson] of draft.lessons.entries()) {
    const label = `${draft.targetLanguage} P1 L${index + 1} ${lesson.slug}`
    const check = (condition: boolean, message: string) => expect(condition, `${label}: ${message}`)
    check(!slugs.has(lesson.slug), 'Duplicate slug'); slugs.add(lesson.slug)
    const youOne = lesson.dialogue[1].targetText
    const youTwo = lesson.dialogue[3].targetText
    check(youOne.split(/\s+/).length >= 8 && youOne.split(/\s+/).length <= 16, 'First learner turn must have 8–16 words')
    check(youTwo.split(/\s+/).length >= 6 && youTwo.split(/\s+/).length <= 12, 'Follow-up must have 6–12 words')
    check(lesson.chunks.map(chunk => chunk.targetText).join(' ') === youOne, 'Chunks must reconstruct first turn exactly')
    check(new Set([...lesson.chunks.map(chunk => chunk.targetText), ...lesson.distractors]).size === lesson.chunks.length + 2, 'Build chips must be distinct')
    check(new Set(lesson.terms.map(term => fold(term.targetText))).size === lesson.terms.length, 'Vocabulary items must be distinct')
    const blanks = lesson.cloze.filter(part => typeof part !== 'string')
    check(blanks.length >= 2 && blanks.length <= 3, 'Follow-up requires 2–3 blanks')
    check(lesson.cloze.map(part => typeof part === 'string' ? part : part.answer).join('') === youTwo, 'Cloze must reconstruct follow-up exactly')
    for (const part of blanks) {
      check(part.choices.includes(part.answer) && new Set(part.choices.map(fold)).size === 4, 'Cloze choices need exactly one canonical answer')
      check(part.answer.split(/\s+/).length <= 3, 'Blank answer exceeds 3 words')
      check(!/[’']/u.test(part.answer), 'Cloze must not blank contractions or elisions')
      check(part.kind !== 'form' || Boolean(part.cue), 'Form blank requires a cue')
      check(part.kind === 'form' || !part.cue, 'Only form blanks have cues')
    }
    check(lesson.recall.before + lesson.recall.answer + lesson.recall.after === youOne, 'Checkpoint recall must reconstruct first turn')
    check(lesson.recall.fallbackChoices.includes(lesson.recall.answer) && new Set(lesson.recall.fallbackChoices.map(fold)).size === 4, 'Recall choices need one canonical answer')
    check(!/[’'-]/u.test(lesson.recall.answer), 'Recall must not blank contractions/hyphenated forms')
    check(new Set(lesson.speakRequired.map(fold)).size === 3, 'Three distinct speech tokens required')
    for (const token of lesson.speakRequired) check(/^[\p{L}\p{N}]+$/u.test(token) && words(youOne).includes(fold(token)), `Invalid required speech token: ${token}`)
    for (const example of lesson.pattern.examples) check(example.targetText.includes(example.highlight), 'Pattern highlight must be contiguous')
    check(lesson.pattern.examples.some(example => example.targetText === youOne || example.targetText === youTwo), 'A pattern example must reuse an episode turn')
    check(lesson.sceneCaption.de.includes(lesson.dialogue[0].targetText), 'Scene caption must quote opening turn')
    check(!lesson.sceneCaption.de.includes(lesson.dialogue[2].targetText), 'Scene must not reveal later turn')
    const trophy = fold(lesson.trophyWord.word)
    check(!forbidden.has(trophy), `Trophy already used: ${trophy}`); forbidden.add(trophy)
    check(words(youOne).includes(trophy), 'Trophy must be a single word in the first learner turn')
    check(words(lesson.trophyWord.example).includes(trophy), 'Trophy example must contain trophy')
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return draft
}

/** Include vocabulary-item audio: B1 matching plays these using chunk/item IDs. */
export function draftTtsLessons(draft: B1Draft) {
  const slug = draft.targetLanguage.toLowerCase()
  const pathId = `${slug}-b1-practical-1`
  return draft.lessons.map((lesson, index) => {
    const prefix = lesson.slug.split('-')[0]
    return {
      id: `${pathId}-${String(index + 1).padStart(3, '0')}-${lesson.slug}`,
      pathId, lessonNumber: index + 1,
      vibeVariants: { bright: {
        corePhrase: { targetText: lesson.dialogue[1].targetText },
        chunks: [
          ...lesson.chunks.map((chunk, n) => ({ id: `${prefix}-${n + 1}`, targetText: chunk.targetText })),
          ...lesson.terms.map((term, n) => ({ id: `${prefix}-item-${n + 1}`, targetText: term.targetText })),
        ],
        trophyWord: { word: lesson.trophyWord.word },
        dialogue: lesson.dialogue.map(turn => ({ targetText: turn.targetText })),
        pattern: { examples: lesson.pattern.examples.map(example => ({ targetText: example.targetText })) },
      } },
    }
  })
}
