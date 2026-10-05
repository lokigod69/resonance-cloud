/** Offline Indonesian/Cebuano structural gate. Semantic approval and TTS are separate. */
import { z } from 'zod'
import { GUIDED_LESSONS } from '../../src/data/guidedLessonsAuthoring'
import { b1DraftSchema } from './guidedB1Drafts'

export const nativeB1DraftSchema = b1DraftSchema.extend({
  targetLanguage: z.enum(['Indonesian', 'Cebuano']),
  targetLanguageCode: z.enum(['id-ID', 'ceb-PH']),
}).strict()
export type NativeB1Draft = z.infer<typeof nativeB1DraftSchema>
const specSchema = z.object({
  status: z.literal('architect-spec'), targetLanguage: z.enum(['Indonesian', 'Cebuano']),
  targetLanguageCode: z.enum(['id-ID', 'ceb-PH']),
  paths: z.array(z.object({ pathNumber: z.number().int(), lessons: z.array(z.object({
    number: z.number().int(), trophy: z.string().regex(/^[a-z]+$/), beat: z.string().min(1),
  }).passthrough()).length(10) }).passthrough()).length(10),
}).passthrough()
const fold = (value: string) => value.normalize('NFC').toLowerCase()
// Preserve internal hyphens and apostrophes: a fragment of bag-o is not a word.
const tokens = (value: string) => fold(value).split(/\s+/).map(token => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
const has = (value: string, token: string) => tokens(value).includes(fold(token))
const addresses = new Set(['pak', 'bu', 'mbak', 'mas', 'bapak', 'ibu'])
const idPronouns = new Set(['saya', 'anda', 'kamu', 'aku', 'dia', 'kita', 'kami', 'mereka', 'itu', 'ini', 'yang'])
const cebClitics = new Set(['na', 'ko', 'ka', 'ra', 'ba', 'lang', 'pa', 'man', 'koy', 'kay', 'tay'])
const cebBarePronounsArticles = new Set(['ako', 'ikaw', 'siya', 'kita', 'kami', 'kamo', 'sila', 'ta', 'mi', 'mo',
  'nako', 'nimo', 'niya', 'nato', 'namo', 'ninyo', 'nila', 'akong', 'imong', 'iyang', 'atong', 'among', 'inyong', 'ilang', 'ang', 'si'])
const idBanned = new Set(['gue', 'lu', 'nggak', 'gak', 'banget', 'dong', 'sih', 'kok', 'awak', 'sila', 'tandas'])
const cebBanned = new Set(['po', 'opo', 'pakisuyo', 'kayo', 'hindi', 'kasi', 'magkano', 'kumain'])
const wordEdge = (value: string) => /^[\p{L}\p{N}\p{M}’'-]$/u.test(value)
const wholeSpan = (text: string, start: number, length: number) => !wordEdge(text.slice(start - 1, start))
  && !wordEdge(text.slice(start + length, start + length + 1))

export function validateNativeB1Draft(value: unknown, specification: unknown): NativeB1Draft {
  const draft = nativeB1DraftSchema.parse(value)
  const spec = specSchema.parse(specification)
  const errors: string[] = []
  const expect = (condition: boolean, label: string) => { if (!condition) errors.push(label) }
  const isId = draft.targetLanguage === 'Indonesian'
  expect(draft.targetLanguageCode === (isId ? 'id-ID' : 'ceb-PH'), 'Target language/code mismatch')
  expect(spec.targetLanguage === draft.targetLanguage && spec.targetLanguageCode === draft.targetLanguageCode, 'Specification target mismatch')
  const occupied = new Set(GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === draft.targetLanguage)
    .flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [fold(variant.trophyWord.word)] : [])))
  spec.paths.forEach((path, p) => {
    expect(path.pathNumber === p + 1, 'Specification paths must be ordered 1–10')
    path.lessons.forEach((lesson, n) => {
      expect(lesson.number === n + 1, 'Specification lessons must be ordered 1–10')
      expect(!occupied.has(fold(lesson.trophy)), `Duplicate or frozen trophy allocation: ${lesson.trophy}`)
      occupied.add(fold(lesson.trophy))
    })
  })
  const walk = (item: unknown, label: string) => {
    if (typeof item === 'string') expect(item === item.normalize('NFC') && !/[\p{Cc}\p{Cf}]/u.test(item), `${label}: text must be NFC without controls`)
    else if (Array.isArray(item)) item.forEach((child, i) => walk(child, `${label}/${i}`))
    else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      if ('de' in record) expect(typeof record.en === 'string' && Boolean(record.en), `${label}: English base missing`)
      Object.entries(record).forEach(([key, child]) => walk(child, `${label}/${key}`))
    }
  }
  walk(draft, draft.targetLanguage)
  const slugs = new Set<string>()
  draft.lessons.forEach((lesson, index) => {
    const label = `${draft.targetLanguage} P${draft.pathNumber} L${index + 1}`
    const check = (condition: boolean, message: string) => expect(condition, `${label}: ${message}`)
    const first = lesson.dialogue[1].targetText
    const second = lesson.dialogue[3].targetText
    const firstWords = first.split(' ')
    const secondWords = second.split(' ')
    check(!slugs.has(lesson.slug), 'Duplicate slug'); slugs.add(lesson.slug)
    check(firstWords.length >= 8 && firstWords.length <= 16, 'First reply requires 8–16 words')
    check(secondWords.length >= 6 && secondWords.length <= 12, 'Second reply requires 6–12 words')
    const spoken = [...lesson.dialogue.map(turn => turn.targetText), ...lesson.chunks.map(chunk => chunk.targetText),
      ...lesson.terms.map(term => term.targetText), ...lesson.pattern.examples.map(example => example.targetText), lesson.trophyWord.example]
    for (const text of spoken) check(!/\d|\s{2}|[[\]<>]/u.test(text), 'Spoken text contains digits, doubled spacing or tags')
    check(lesson.chunks.map(chunk => chunk.targetText).join(' ') === first, 'Chunks must reconstruct first reply')
    check(new Set([...lesson.chunks.map(chunk => fold(chunk.targetText)), ...lesson.distractors.map(fold)]).size === lesson.chunks.length + 2, 'Build chips must be distinct')
    check(new Set(lesson.terms.map(term => fold(term.targetText))).size === lesson.terms.length, 'Terms must be distinct')
    const blanks = lesson.cloze.filter(part => typeof part !== 'string')
    check(blanks.length >= 2 && blanks.length <= 3, 'Cloze needs 2–3 blanks')
    check(lesson.cloze.map(part => typeof part === 'string' ? part : part.answer).join('') === second, 'Cloze must reconstruct second reply')
    const unsafe = (word: string) => isId ? addresses.has(fold(word)) || idPronouns.has(fold(word)) : cebClitics.has(fold(word))
    let offset = 0
    for (const part of lesson.cloze) {
      const value = typeof part === 'string' ? part : part.answer
      if (typeof part !== 'string') check(wholeSpan(second, offset, value.length), 'Cloze blank must span whole words at its actual position')
      offset += value.length
    }
    for (const blank of blanks) {
      check(blank.choices.includes(blank.answer) && new Set(blank.choices.map(fold)).size === 4, 'Cloze choices need one canonical answer')
      // kay is also the staged conjunction “because”; its role still needs content review.
      const allowedConnector = !isId && blank.kind === 'connector' && fold(blank.answer) === 'kay'
      check(blank.answer.split(' ').length <= 3 && !/[’'-]/u.test(blank.answer) && (!unsafe(blank.answer) || allowedConnector), 'Invalid cloze answer')
      if (!isId) check(!cebBarePronounsArticles.has(fold(blank.answer)), 'Cebuano cloze must not blank a bare pronoun or article')
      check(blank.kind === 'form' ? Boolean(blank.cue) : !blank.cue, 'Only form blanks need a cue')
    }
    check(lesson.recall.before + lesson.recall.answer + lesson.recall.after === first, 'Recall must reconstruct first reply')
    check(wholeSpan(first, lesson.recall.before.length, lesson.recall.answer.length), 'Recall must span a whole word at its actual position')
    check(lesson.recall.fallbackChoices.includes(lesson.recall.answer) && new Set(lesson.recall.fallbackChoices.map(fold)).size === 4, 'Recall choices need one canonical answer')
    check(/^[a-z]{3,}$/u.test(lesson.recall.answer) && has(first, lesson.recall.answer) && !unsafe(lesson.recall.answer), 'Invalid recall token')
    check(new Set(lesson.speakRequired.map(fold)).size === 3, 'Speech tokens must be distinct')
    for (const token of lesson.speakRequired) check(/^[a-z]+$/u.test(token) && has(first, token) && !unsafe(token), `Invalid speech token: ${token}`)
    for (const example of lesson.pattern.examples) check(example.targetText.includes(example.highlight), 'Pattern highlight must be contiguous')
    check(lesson.pattern.examples.some(example => example.targetText === first || example.targetText === second), 'Pattern must reuse a learner turn')
    for (const locale of ['de', 'en'] as const) {
      const caption = lesson.sceneCaption[locale] ?? ''
      const opening = lesson.dialogue[0].targetText
      check([`„${opening}“`, `“${opening}”`, `"${opening}"`].some(quote => caption.includes(quote)), 'Caption must quote the opening in both bases')
      check(!caption.includes(lesson.dialogue[2].targetText), 'Caption must not quote later turn')
    }
    const trophy = lesson.trophyWord.word
    check(trophy === spec.paths[draft.pathNumber - 1].lessons[index].trophy, 'Trophy differs from exact allocation')
    check(/^[a-z]+$/u.test(trophy) && !unsafe(trophy) && has(first, trophy) && has(lesson.trophyWord.example, trophy), 'Trophy needs exact whole-word anchors')
    if (isId) check(lesson.pattern.examples.some(example => has(example.targetText, trophy)), 'Indonesian trophy must occur in a pattern example')
    if (isId) {
      const service = [3, 4, 5, 6, 9].includes(draft.pathNumber)
      for (const line of [first, second]) {
        check(!tokens(line).some(token => idBanned.has(token)), 'Banned Indonesian learner register')
        check(!tokens(line).some(token => service ? token === 'aku' || token === 'kamu' : token === 'anda'), 'Indonesian path register mismatch')
        for (const sentence of line.split(/[.!?]/u)) check(!(tokens(sentence).some(token => ['walaupun', 'meskipun'].includes(token))
          && tokens(sentence).some(token => ['tetapi', 'tapi', 'namun'].includes(token))), 'Doubled concessive connector')
      }
    } else for (const line of spoken) check(!tokens(line).some(token => cebBanned.has(token)), 'Tagalog token in Cebuano')
  })
  if (errors.length) throw new Error(errors.join('\n'))
  return draft
}
