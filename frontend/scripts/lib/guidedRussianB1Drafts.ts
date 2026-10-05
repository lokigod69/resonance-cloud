/** Offline Russian B1 P1/P2 canonical-source gate. No input variants or runtime assets are generated.
 * The full 100-item allocation and frozen A1/A2 corpus are checked even for a single path.
 * Surface tripwires are deliberately bounded; warnings are part of the result, not native certification.
 */
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { b1DraftSchema } from './guidedB1Drafts'
import * as russianA1 from '../../src/data/guided/russianA1'
import * as russianA2 from '../../src/data/guided/russianA2'
import type { GuidedLessonDefinition } from '../../src/data/guidedLessons'

type Base = { de: string; en?: string }
type Translated = { targetText: string; baseText: Base }
type Blank = { kind: 'form' | 'connector' | 'choice'; answer: string; cue?: string; choices: string[] }
type RussianLesson = {
  slug: string; title: Base; situation: { de: string; en: string }; pedagogicalGoal: string
  register: 'neutral' | 'formal' | 'informal'; dialogue: [Translated, Translated, Translated, Translated]
  pattern: { label: string; rule: Base; examples: Array<Translated & { highlight: string }> }
  cloze: Array<string | Blank>; chunks: Translated[]; terms: Translated[]
  recall: { before: string; answer: string; after: string; fallbackChoices: string[] }
  speakRequired: [string, string, string]; sceneCaption: Base
  trophyWord: { word: string; meaning: Base; example: string; whyThisWord: Base }
  distractors: [string, string]; placeholderCaption: Base; songMood: string; visualNotes: string
  genderAlternatives?: Partial<Record<'1' | '3', string>>
}
export type RussianB1Draft = {
  schemaVersion: 1; status: 'draft'; level: 'B1'; targetLanguage: 'Russian'; targetLanguageCode: 'ru-RU'
  baseLanguage: 'German'; pathNumber: number; title: Base; subtitle: Base; anchor: string; lessons: RussianLesson[]
}
const text = z.string().min(1).refine(value => value === value.trim(), 'Unexpected edge whitespace')
// Erase only the compiler's recursive shape inference, not runtime validation. These are the actual shared
// strict schemas, extended with the one declared field and true identity; no Latin validator is invoked.
const sharedRoot = b1DraftSchema as unknown as z.AnyZodObject
const sharedLessons = sharedRoot.shape.lessons as z.ZodArray<z.AnyZodObject>
const lessonSchema = sharedLessons.element.extend({
  genderAlternatives: z.object({ '1': text.optional(), '3': text.optional() }).strict().optional(),
}).strict()
export const russianB1DraftSchema = sharedRoot.extend({
  targetLanguage: z.literal('Russian'), targetLanguageCode: z.literal('ru-RU'),
  pathNumber: z.number().int().min(1).max(2), lessons: z.array(lessonSchema).length(10),
}).strict() as unknown as z.ZodType<RussianB1Draft>

const specificationSchema = z.object({
  status: z.literal('architect-spec'), targetLanguage: z.literal('Russian'), targetLanguageCode: z.literal('ru-RU'),
  baseLanguage: z.literal('German'), baseLocales: z.tuple([z.literal('de'), z.literal('en')]),
  registerPolicy: text, genderSafety: text, orthography: text,
  paths: z.array(z.object({
    pathNumber: z.number().int(), title: text, anchor: text, register: text, episodeShape: z.enum(['A', 'B', 'C']),
    staging: z.array(z.object({ lessons: text, productive: text, recognitionOnly: text }).strict()).length(3),
    clozeSchema: text, recycles: text,
    lessons: z.array(z.object({ number: z.number().int(), trophy: text, beat: text }).strict()).length(10),
  }).strict()).length(10),
}).passthrough()

export const RUSSIAN_B1_BINDINGS = Object.freeze({
  specificationFile: 'B1_NATIVE_RUSSIAN_SPEC.json',
  specificationFileSha256: 'ff031e74d764c15e23ef54d6fe9094a23a3ad0a19c13aaf2980fdffb9146ea6f',
  // SHA256(JSON.stringify(JSON.parse(file))). Binds all actual metadata, beats and staging, not a claimed hash field.
  specificationJsonSha256: 'd96c6c0cae03f0dcf49bff48ca2ae230675ff94950eb4123393d660b472821f2',
  frozenSortedTrophiesSha256: '1e8140c9f209a5f7074a2629a9eb7bc9537f224831ec77c641ed33168ff6c371',
  reviewedP1Sha256: '42aea398f3a11b3bde78e03a6791aa436be6ea04130b463ba9610edc2f64a96e',
  reviewedP2Sha256: '6c5d9525ac1ad086e8b95dadb7019fed3801c85428c390c630d9a6a47d6cc7e2',
})
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const fold = (value: string) => value.normalize('NFC').toLocaleLowerCase('ru')
const efold = (value: string) => fold(value).replaceAll('ё', 'е')
/** Hyphenated compounds are one word; initially/terminally attached punctuation is not part of a word.
 * No ASCII \b and no matching a trophy/speech token inside a Cyrillic or hyphenated word. */
const wordPattern = /[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/gu
export const russianWords = (value: string): string[] => [...value.matchAll(wordPattern)].map(match => fold(match[0]))
const spans = (value: string) => [...value.matchAll(wordPattern)].map(match => ({
  start: match.index, end: match.index + match[0].length,
}))
const wholeSpan = (value: string, start: number, length: number) => {
  const units = spans(value)
  return units.some(unit => unit.start === start) && units.some(unit => unit.end === start + length)
}
const targetRe = /^[А-Яа-яЁё .,!?;:«»()—-]+$/u
const tokenRe = /^[А-Яа-яЁё]+$/u
const contentTokenRe = /^[А-Яа-яЁё]{4,}$/u
export const RUSSIAN_SPEAKER_DENYLIST = Object.freeze('хотел хотела рад рада должен должна привык привыкла готов готова смог смогла забыл забыла решил решила сам сама'.split(' '))
const deny = new Set(RUSSIAN_SPEAKER_DENYLIST.map(efold))
/** Closed exact-token pronoun inventory: personal (incl. н-forms after prepositions), reflexive, possessive incl. свой,
 * demonstrative этот/тот, interrogative кто/что, plus да/нет. Membership is whole-token under ё/е fold; no suffix inference,
 * so nouns such as музей, село, сила, нега are never affected. Deliberately absent: то (если … то connector), какой-forms,
 * весь/все, никто/ничто, другой. Extend only by explicit native review. */
export const RUSSIAN_PRONOUN_TOKENS = Object.freeze([
  'я', 'меня', 'мне', 'мной', 'мною', 'ты', 'тебя', 'тебе', 'тобой', 'тобою',
  'он', 'оно', 'его', 'него', 'ему', 'нему', 'им', 'ним', 'нём', 'она', 'её', 'неё', 'ей', 'ней', 'ею', 'нею',
  'мы', 'нас', 'нам', 'нами', 'вы', 'вас', 'вам', 'вами', 'они', 'их', 'них', 'ими', 'ними',
  'себя', 'себе', 'собой', 'собою',
  'мой', 'моя', 'моё', 'мои', 'моего', 'моей', 'моему', 'мою', 'моим', 'моими', 'моих', 'моём',
  'твой', 'твоя', 'твоё', 'твои', 'твоего', 'твоей', 'твоему', 'твою', 'твоим', 'твоими', 'твоих', 'твоём',
  'свой', 'своя', 'своё', 'свои', 'своего', 'своей', 'своему', 'свою', 'своим', 'своими', 'своих', 'своём',
  'наш', 'наша', 'наше', 'наши', 'нашего', 'нашей', 'нашему', 'нашу', 'нашим', 'нашими', 'наших', 'нашем',
  'ваш', 'ваша', 'ваше', 'ваши', 'вашего', 'вашей', 'вашему', 'вашу', 'вашим', 'вашими', 'ваших', 'вашем',
  'это', 'этот', 'эта', 'эти', 'этого', 'этой', 'этому', 'эту', 'этим', 'этими', 'этих', 'этом',
  'тот', 'та', 'те', 'того', 'той', 'тому', 'ту', 'тем', 'теми', 'тех', 'том',
  'кто', 'кого', 'кому', 'кем', 'ком', 'что', 'чего', 'чему', 'чем', 'чём', 'да', 'нет',
])
const pronouns = new Set(RUSSIAN_PRONOUN_TOKENS.map(efold))
const informal = new Set('ты тебя тебе тобой тобою твой твоя твоё твои твоего твоей твоему твою твоим твоими твоих твоём чё ваще короче осуществить являться'.split(' ').map(fold))
const missingYo = new Set('еще идет счет ее партнер насчет'.split(' '))

/** Manually authored full-string evidence, reread against the reviewed P1 file above and confirmed by
 * the independent content reader. Nothing here generates a suffix or replaces tokens to author text.
 * First-person agreement outside these bound rows remains a semantic review obligation. */
const genderEvidence: Record<number, { canonical: string; alternative: string; pairs: ReadonlyArray<readonly [string, string]> }> = {
  4: {
    canonical: 'Сначала я приехала в центр, затем посетила музей и поднялась на башню.',
    alternative: 'Сначала я приехал в центр, затем посетил музей и поднялся на башню.',
    pairs: [['приехала', 'приехал'], ['посетила', 'посетил'], ['поднялась', 'поднялся']],
  },
  5: { canonical: 'Я шла по набережной, и вдруг начался дождь без всякого предупреждения.',
    alternative: 'Я шёл по набережной, и вдруг начался дождь без всякого предупреждения.', pairs: [['шла', 'шёл']] },
  6: { canonical: 'Мы несколько месяцев смотрели квартиры, и я наконец нашла жильё рядом с работой.',
    alternative: 'Мы несколько месяцев смотрели квартиры, и я наконец нашёл жильё рядом с работой.', pairs: [['нашла', 'нашёл']] },
  7: { canonical: 'Однажды, когда я спешила на встречу, я села в поезд до другого города.',
    alternative: 'Однажды, когда я спешил на встречу, я сел в поезд до другого города.', pairs: [['спешила', 'спешил'], ['села', 'сел']] },
  8: { canonical: 'Я встала рано и пошла за кофе, но кафе ещё не работало.',
    alternative: 'Я встал рано и пошёл за кофе, но кафе ещё не работало.', pairs: [['встала', 'встал'], ['пошла', 'пошёл']] },
  9: { canonical: 'Концерт закончился поздно, и, когда я вышла на улицу, метро уже не работало.',
    alternative: 'Концерт закончился поздно, и, когда я вышел на улицу, метро уже не работало.', pairs: [['вышла', 'вышел']] },
  10: { canonical: 'Я случайно встретила преподавателя в библиотеке, когда искала книгу по истории.',
    alternative: 'Я случайно встретил преподавателя в библиотеке, когда искал книгу по истории.', pairs: [['встретила', 'встретил'], ['искала', 'искал']] },
}

type Check = (condition: boolean, message: string) => void
type StagingRule = { label: string; tokens: ReadonlySet<string>; path: number; lesson: number }
// Exact lexical tripwires from path.staging. The allocation order licenses recycling after introduction.
// The P1 time adverb рано is already licensed; do not treat every -ся verb as the later process family.
const stagingRules: StagingRule[] = [
  { label: 'P2 L4 concession', tokens: new Set(['хотя', 'зато']), path: 2, lesson: 4 },
  { label: 'P2 L7 discourse pivots', tokens: new Set(['однако', 'впрочем', 'пожалуй', 'наоборот']), path: 2, lesson: 7 },
  { label: 'P3 conditional бы', tokens: new Set(['бы']), path: 3, lesson: 1 },
  { label: 'P4 relative forms', tokens: new Set('который которая которое которые которую которого которой которым котором которых которыми которому'.split(' ')), path: 4, lesson: 1 },
  { label: 'P5 L4 embedded ли', tokens: new Set(['ли']), path: 5, lesson: 4 },
  { label: 'P6 results', tokens: new Set(['сделано', 'закрыто', 'открыто', 'оформлено']), path: 6, lesson: 1 },
  { label: 'P6 L4 process', tokens: new Set(['ремонтируется', 'проверяется', 'оформляется']), path: 6, lesson: 4 },
  { label: 'P7 purpose', tokens: new Set(['чтобы']), path: 7, lesson: 1 },
  { label: 'P8 habits', tokens: new Set(['раньше', 'перестать', 'перестала', 'перестал']), path: 8, lesson: 1 },
]

export type RussianB1Review = {
  draft: RussianB1Draft
  warnings: string[]
  coverage: { lessons: number; fullAllocatedTrophies: number; frozenLessons: number; frozenTrophies: number; genderAlternatives: number }
  scope: 'canonical-structure-only'
}

export function reviewRussianB1Draft(value: unknown, specification: unknown): RussianB1Review {
  const draft = russianB1DraftSchema.parse(value)
  const spec = specificationSchema.parse(specification)
  const errors: string[] = [], warnings: string[] = []
  const expect: Check = (condition, message) => { if (!condition) errors.push(message) }
  const imported = [...Object.values(russianA1), ...Object.values(russianA2)]
    .filter((item): item is GuidedLessonDefinition[] => Array.isArray(item)).flat()
  expect(imported.length === 200 && new Set(imported.map(lesson => lesson.id)).size === 200,
    'Frozen Russian A1/A2 must contain exactly 200 distinct lessons')
  expect(imported.every(lesson => lesson.targetLanguage === 'Russian' && ['A1', 'A2'].includes(lesson.level)),
    'Frozen corpus must be genuine Russian A1/A2')
  const frozen = imported.flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [fold(variant.trophyWord.word)] : []))
  expect(frozen.length === 200 && new Set(frozen).size === 200, 'Frozen Russian corpus requires 200 distinct trophy rows')
  expect(digest([...frozen].sort()) === RUSSIAN_B1_BINDINGS.frozenSortedTrophiesSha256, 'Frozen Russian trophy binding changed')
  const occupied = new Set(frozen), allocated = new Set<string>()
  spec.paths.forEach((path, p) => {
    expect(path.pathNumber === p + 1, 'Specification paths must be ordered 1–10')
    path.lessons.forEach((lesson, l) => {
      const trophy = fold(lesson.trophy)
      expect(lesson.number === l + 1, 'Specification lessons must be ordered 1–10')
      expect(tokenRe.test(lesson.trophy) && lesson.trophy === lesson.trophy.normalize('NFC'), 'Allocated trophy must be one NFC Cyrillic word')
      expect(!occupied.has(trophy), `Duplicate or frozen trophy allocation: ${lesson.trophy}`)
      occupied.add(trophy); allocated.add(trophy)
    })
  })
  expect(allocated.size === 100, 'Full specification must allocate 100 distinct trophies')
  expect(digest(specification) === RUSSIAN_B1_BINDINGS.specificationJsonSha256,
    'Specification metadata/staging/allocation binding changed; review and rebind explicitly')

  const walk = (item: unknown, location: string) => {
    if (typeof item === 'string') expect(item === item.normalize('NFC') && !/[\p{Cc}\p{Cf}\ufffd]/u.test(item), `${location}: NFC text without controls required`)
    else if (Array.isArray(item)) item.forEach((child, i) => walk(child, `${location}/${i}`))
    else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      if ('de' in record || 'en' in record) expect(Object.keys(record).sort().join(',') === 'de,en'
        && typeof record.de === 'string' && Boolean(record.de.trim()) && typeof record.en === 'string' && Boolean(record.en.trim()), `${location}: German and English bases required`)
      Object.entries(record).forEach(([key, child]) => walk(child, `${location}/${key}`))
    }
  }
  walk(draft, 'draft')
  const slugs = new Set<string>()
  let alternativeCount = 0
  draft.lessons.forEach((lesson, index) => {
    const number = index + 1, label = `Russian P${draft.pathNumber} L${number}`
    const check: Check = (condition, message) => expect(condition, `${label}: ${message}`)
    const warn = (message: string) => warnings.push(`${label}: ${message}`)
    const [opening, first, followUp, closing] = lesson.dialogue.map(turn => turn.targetText)
    const evidence = draft.pathNumber === 1 ? genderEvidence[number] : undefined
    const speakerTokens = new Set((evidence?.pairs.flat() ?? []).map(efold))
    const prohibited = (token: string) => deny.has(efold(token)) || speakerTokens.has(efold(token))
    check(!slugs.has(lesson.slug), 'Duplicate lesson slug'); slugs.add(lesson.slug)
    check(lesson.register === 'formal', 'All Russian episodes require formal вы register')
    for (const turn of lesson.dialogue) check(!/(?<!\p{L})(?:du|dich|dir|dein(?:e|en|em|er|es)?)(?!\p{L})/iu.test(turn.baseText.de), 'Spoken German base must preserve formal address')
    const ranges = [[8, 16], [8, 16], [6, 14], [6, 12]]
    lesson.dialogue.forEach((turn, i) => {
      const count = russianWords(turn.targetText).length
      check(count >= ranges[i][0] && count <= ranges[i][1], `Dialogue ${i} requires ${ranges[i][0]}–${ranges[i][1]} Cyrillic words (got ${count})`)
    })
    check(lesson.chunks.map(chunk => chunk.targetText).join(' ') === first, 'Chunks must reconstruct first learner turn exactly')
    const chips = [...lesson.chunks.map(chunk => chunk.targetText), ...lesson.distractors]
    check(new Set(chips.map(efold)).size === chips.length, 'Build chips must be distinct, including ё/е fold')
    check(new Set(lesson.terms.map(term => efold(term.targetText))).size === lesson.terms.length, 'Terms must have distinct surfaces')
    const blanks = lesson.cloze.filter(part => typeof part !== 'string')
    check(blanks.length >= 2 && blanks.length <= 3, 'Closing requires 2–3 cloze blanks')
    check(lesson.cloze.map(part => typeof part === 'string' ? part : part.answer).join('') === closing, 'Cloze must reconstruct closing exactly')
    const choices = (options: string[], answer: string, label: string) => {
      check(options.length === 4 && options.filter(option => option === answer).length === 1
        && new Set(options.map(efold)).size === 4, `${label}: four distinct choices and exactly one canonical answer (including ё/е ambiguity)`)
    }
    let offset = 0
    lesson.cloze.forEach((part, i) => {
      if (typeof part === 'string') { offset += part.length; return }
      choices(part.choices, part.answer, `Cloze ${i}`)
      check(wholeSpan(closing, offset, part.answer.length), `Cloze ${i}: answer must occupy complete words`)
      const answerWords = russianWords(part.answer)
      check(answerWords.length >= 1 && answerWords.length <= 3
        && !(answerWords.length === 1 && answerWords[0].length === 1), `Cloze ${i}: substantive answer of 1–3 words required`)
      check(!(answerWords.length === 1 && pronouns.has(efold(answerWords[0]))), `Cloze ${i}: substantive answer required; a bare pronoun or да/нет is forbidden`)
      check(part.kind === 'form' ? typeof part.cue === 'string' && Boolean(part.cue.trim()) : part.cue === undefined,
        `Cloze ${i}: cue required iff kind is form`)
      check(part.choices.every(choice => russianWords(choice).every(token => !prohibited(token))), `Cloze ${i}: speaker-agreeing choice is forbidden`)
      offset += part.answer.length
    })
    check(lesson.recall.before + lesson.recall.answer + lesson.recall.after === first, 'Recall must reconstruct first learner turn exactly')
    check(wholeSpan(first, lesson.recall.before.length, lesson.recall.answer.length), 'Recall answer must occupy a complete word')
    choices(lesson.recall.fallbackChoices, lesson.recall.answer, 'Recall')
    check(contentTokenRe.test(lesson.recall.answer) && !prohibited(lesson.recall.answer), 'Recall answer must be a gender-neutral content word of at least four letters')
    check(!pronouns.has(efold(lesson.recall.answer)), 'Recall answer must be a gender-neutral content word, not a bare pronoun')
    check(new Set(lesson.speakRequired.map(efold)).size === 3, 'Three distinct speech tokens required under ё/е fold')
    for (const token of lesson.speakRequired) {
      check(contentTokenRe.test(token) && russianWords(first).map(efold).includes(efold(token))
        && !prohibited(token), `Invalid speech token: ${token}; requires a neutral whole content word of at least four letters`)
      check(!pronouns.has(efold(token)), `Invalid speech token: ${token}; pronouns are never speech targets`)
    }
    check(lesson.pattern.examples.filter(example => example.targetText === first || example.targetText === closing).length === 1,
      'Exactly one pattern example must reuse a learner turn')
    lesson.pattern.examples.forEach(example => check(example.targetText.includes(example.highlight), 'Pattern highlight must be a contiguous substring'))
    const trophy = fold(lesson.trophyWord.word)
    check(trophy === fold(spec.paths[draft.pathNumber - 1].lessons[index].trophy), 'Trophy must match its exact allocation')
    check(tokenRe.test(lesson.trophyWord.word) && !prohibited(trophy), 'Trophy must be one gender-neutral Cyrillic token')
    check(russianWords(first).includes(trophy), 'Trophy must be a whole canonical word in the first reply')
    check(russianWords(lesson.trophyWord.example).includes(trophy), 'Trophy example must contain the whole canonical trophy')
    for (const locale of ['de', 'en'] as const) {
      const caption = lesson.sceneCaption[locale] ?? ''
      check([['„', '“'], ['“', '”'], ['«', '»'], ['"', '"']].some(([left, right]) => caption.includes(left + opening + right)), `${locale} caption must quote the complete opening inside paired quotes`)
      check(!caption.includes(followUp), `${locale} caption must not reveal the complete complication`)
      const late = russianWords(followUp), captionWords = russianWords(caption).join(' ')
      for (let i = 0; i <= late.length - 4; i++) check(!(` ${captionWords} `).includes(` ${late.slice(i, i + 4).join(' ')} `), `${locale} caption leaks four complication words`)
    }

    const alternatives = lesson.genderAlternatives ?? {}
    if (evidence) {
      check(first === evidence.canonical, 'Reviewed speaker-agreement canonical binding changed; a fresh whole-line audit is required')
      check(alternatives['1'] === evidence.alternative && alternatives['3'] === undefined,
        'Reviewed complete opposite-gender alternative required on turn 1 only')
      for (const [canonical, alternative] of evidence.pairs) check(russianWords(first).includes(canonical)
        && russianWords(alternatives['1'] ?? '').includes(alternative), 'Reviewed speaker pair missing from complete lines')
    } else check(lesson.genderAlternatives === undefined, 'No gender alternative is authorized without a reviewed whole-line binding')
    for (const [turn, alternative] of Object.entries(alternatives)) {
      if (alternative === undefined) continue
      alternativeCount++
      const turnNumber = Number(turn), count = russianWords(alternative).length
      check(count >= ranges[turnNumber][0] && count <= ranges[turnNumber][1], 'Gender alternative must be a complete learner turn within the word range')
      check(alternative !== lesson.dialogue[turnNumber].targetText, 'Gender alternative must differ from canonical')
      if (turn === '1') {
        check(russianWords(alternative).includes(trophy), 'Gender alternative must preserve the exact trophy')
        check(lesson.speakRequired.every(token => russianWords(alternative).map(efold).includes(efold(token))), 'Gender alternative must preserve neutral speech tokens')
      }
    }

    const targetSurfaces: Array<[string, string]> = [
      ...lesson.dialogue.map((entry, i): [string, string] => [`dialogue/${i}`, entry.targetText]),
      ...lesson.chunks.map((entry, i): [string, string] => [`chunks/${i}`, entry.targetText]),
      ...lesson.terms.map((entry, i): [string, string] => [`terms/${i}`, entry.targetText]),
      ...lesson.pattern.examples.flatMap((entry, i): Array<[string, string]> => [[`examples/${i}`, entry.targetText], [`highlights/${i}`, entry.highlight]]),
      ['trophy', lesson.trophyWord.word], ['trophy example', lesson.trophyWord.example], ['recall answer', lesson.recall.answer],
      ...lesson.recall.fallbackChoices.map((entry, i): [string, string] => [`recall choices/${i}`, entry]),
      ...lesson.distractors.map((entry, i): [string, string] => [`distractors/${i}`, entry]),
      ...lesson.speakRequired.map((entry, i): [string, string] => [`speech/${i}`, entry]),
      ...blanks.flatMap((blank, i): Array<[string, string]> => [[`cloze answer/${i}`, blank.answer], ...blank.choices.map((choice, j): [string, string] => [`cloze choices/${i}/${j}`, choice])]),
      ...Object.entries(alternatives).flatMap(([key, entry]): Array<[string, string]> => entry === undefined ? [] : [[`genderAlternative/${key}`, entry]]),
    ]
    for (const [location, surface] of targetSurfaces) {
      check(targetRe.test(surface) && surface === surface.trim() && !surface.includes('  ') && russianWords(surface).length > 0,
        `${location}: Cyrillic target with standard spaces, written-out numbers and permitted punctuation required`)
      const units = russianWords(surface)
      check(!units.some(word => informal.has(word)), `${location}: forbidden informal/slang/bureaucratic exact token`)
      check(!units.some(word => missingYo.has(word)), `${location}: curated ё spelling required`)
      if (units.includes('все')) warn(`RU-YO-CONTEXT ${location}: все is not automatically всё; inspect its contextual meaning`)
    }
    for (const learner of [first, closing, ...Object.values(alternatives).filter((entry): entry is string => typeof entry === 'string')]) {
      const units = russianWords(learner)
      if (draft.pathNumber === 1 && number < 7) check(!units.some(word => ['когда', 'пока'].includes(word)), 'Premature productive surface: P1 L7 background clause')
      for (const rule of stagingRules) if (draft.pathNumber < rule.path || (draft.pathNumber === rule.path && number < rule.lesson)) {
        check(!units.some(word => rule.tokens.has(word)), `Premature productive surface: ${rule.label}`)
      }
      // если ... то is distinct from ordinary A2 если recognition, and from P3 если бы.
      check(!(units.includes('если') && units.includes('то')), 'Premature productive surface: P7 L4 если … то')
      if (units.some(word => deny.has(efold(word)))) warn('RU-GENDER-CONTEXT: closed-list surface in learner line requires semantic subject review; third-person reference is not automatically speaker agreement')
    }
    warn('RU-STAGING-SURFACE: exact tripwires only; aspect, lexicalized modifiers, relative case, purpose subjects and productive-versus-recognition use need native review')
    warn('RU-SEMANTICS: independently review new complication, captions/situations, staff authority, register beyond exact tokens, numeral case, speaker referents and idiomatic bases; -л/ла alone proves nothing')
    warn('RU-EXERCISE: reconstruction does not prove unique grammatical chip order or unique cloze/recall meaning; visible cues must suffice without hidden base glosses')
    warn('RU-INPUT-HOLD: canonical structure only; authored gender alternatives and explicit ё/е answer acceptance require runtime integration and a current reviewed acceptance artifact')
  })
  if (errors.length) throw new Error(errors.join('\n'))
  return { draft, warnings, scope: 'canonical-structure-only', coverage: {
    lessons: draft.lessons.length, fullAllocatedTrophies: allocated.size,
    frozenLessons: imported.length, frozenTrophies: frozen.length, genderAlternatives: alternativeCount,
  } }
}

/** Prefer reviewRussianB1Draft: callers must carry its warnings into publication review. */
export function validateRussianB1Draft(value: unknown, specification: unknown): RussianB1Draft {
  return reviewRussianB1Draft(value, specification).draft
}
