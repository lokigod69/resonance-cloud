/** Scratch-only Polish B1 P1/P2 gate. This is structural authoring code, not independent content approval.
 * No source rewriting, alternative generation, runtime integration, provider calls or writes.
 * Scratch imports must be deliberately relocated if staged in the app. */
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { b1DraftSchema } from './guidedB1Drafts'
import { GUIDED_LESSONS } from '../../src/data/guidedLessonsAuthoring'

type Base = { de: string; en?: string }
type Translated = { targetText: string; baseText: Base }
type Learner = Translated & { acceptedTargetAlternatives?: [string] }
export type PolishBlank = { kind: 'form' | 'connector' | 'choice'; answer: string; choices: string[]; cue?: string }
export type PolishLesson = {
  slug: string; title: Base; situation: { de: string; en: string }; pedagogicalGoal: string
  register: 'neutral' | 'formal' | 'informal'; dialogue: [Translated, Learner, Translated, Learner]
  pattern: { label: string; rule: Base; examples: Array<Translated & { highlight: string }> }
  chunks: Translated[]; terms: Translated[]; cloze: Array<string | PolishBlank>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[] }
  speakRequired: [string, string, string]; sceneCaption: Base
  trophyWord: { word: string; meaning: Base; example: string; whyThisWord: Base }
  distractors: [string, string]; placeholderCaption: Base; songMood: string; visualNotes: string
}
export type PolishB1Draft = {
  schemaVersion: 1; status: 'draft'; level: 'B1'; targetLanguage: 'Polish'; targetLanguageCode: 'pl-PL'
  baseLanguage: 'German'; pathNumber: number; title: Base; subtitle: Base; anchor: string; lessons: PolishLesson[]
}
const text = z.string().min(1).refine(value => value === value.trim(), 'Unexpected edge whitespace')
const base = z.object({ de: text, en: text }).strict()
const turn = z.object({ targetText: text, baseText: base }).strict()
const learner = turn.extend({ acceptedTargetAlternatives: z.tuple([text]).optional() }).strict()
// Bound compiler inference only. Runtime still uses the real shared strict schemas, with exactly
// the declared learner-tuple extension and true Polish identity. No Latin language is spoofed.
const shared = b1DraftSchema as unknown as z.AnyZodObject
const lessons = shared.shape.lessons as z.ZodArray<z.AnyZodObject>
const lessonSchema = lessons.element.extend({ dialogue: z.tuple([turn, learner, turn, learner]) }).strict()
export const polishB1DraftSchema = shared.extend({
  targetLanguage: z.literal('Polish'), targetLanguageCode: z.literal('pl-PL'),
  pathNumber: z.number().int().min(1).max(2), lessons: z.array(lessonSchema).length(10),
}).strict() as unknown as z.ZodType<PolishB1Draft>

const specificationSchema = z.object({
  status: z.literal('architect-spec'), targetLanguage: z.literal('Polish'), targetLanguageCode: z.literal('pl-PL'),
  baseLanguage: z.literal('German'), baseLocales: z.tuple([z.literal('de'), z.literal('en')]),
  registerPolicy: text, genderSafety: text, orthography: text,
  paths: z.array(z.object({
    pathNumber: z.number().int(), title: text, anchor: text, register: text, episodeShape: z.enum(['A', 'B', 'C']),
    staging: z.array(z.object({ lessons: text, productive: text, recognitionOnly: text }).strict()).length(3),
    clozeSchema: text, recycles: text,
    lessons: z.array(z.object({ number: z.number().int(), trophy: text, beat: text }).strict()).length(10),
  }).strict()).length(10),
}).passthrough()
export const POLISH_B1_BINDINGS = Object.freeze({
  specificationFile: 'B1_NATIVE_POLISH_AUTHORING_SPEC.json',
  specificationFileSha256: '18994a3d5a635e8612b2999575281030371a20aa355fb7df4a24a2f34fb387ce',
  specificationJsonSha256: '25165980e049896ce47175846ede9059988af4f5a0685cd06e3d96b419abf4f4',
  frozenSortedTrophiesSha256: 'f389901da803f5e0e017bb860d7827e9c84001417812012656d54f9f218b4925',
  reviewedP1Sha256: '5eb85502de1b68bdd53d8b32d2204c088849dbb4492886d7c9bed776a7db49db',
  reviewedP2Sha256: 'efbb0bf74e7f501b1346d875aabd2b8e52c1bb6b159c6537a4881bc66d49386d',
})
/** External authoring-side plan; no voice metadata is added to lesson/spec shapes. */
export const POLISH_B1_VOICE_PLAN = Object.freeze({ 1: 'female', 2: 'male' } as const)
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const fold = (value: string) => value.normalize('NFC').toLocaleLowerCase('pl')
export const polishChoiceKey = (value: string) => fold(value).trim().replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, '')
// All Unicode letters participate in a boundary, so a Polish fragment inside foreign script or
// a hyphen/apostrophe-attached word is not a standalone token. Script validity is checked separately.
const wordPattern = /[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*/gu
export const polishWords = (value: string): string[] => [...value.matchAll(wordPattern)].map(match => fold(match[0]))
const wholeSpan = (value: string, start: number, length: number) => {
  const units = [...value.matchAll(wordPattern)]
  return units.some(unit => unit.index === start) && units.some(unit => unit.index + unit[0].length === start + length)
}
const contains = (value: string, phrase: string) => {
  const source = fold(value), part = fold(phrase)
  let offset = source.indexOf(part)
  while (offset >= 0) {
    if (wholeSpan(source, offset, part.length)) return true
    offset = source.indexOf(part, offset + 1)
  }
  return false
}
const tokenRe = /^[a-ząćęłńóśźż]+$/u
const surfaceRe = /^[a-ząćęłńóśźż .,!?;:„”()—’'-]+$/iu
const firstSecondPerson = (word: string) => /(?:łam|łem|łaś|łeś|łabym|łbym|łabyś|łbyś)$/u.test(word)
// Full inflections matter: mnie/nią/nim and possessives/demonstratives are not content answers.
// These are lexical exclusions for a bare blank/recall, not a ban on pronouns in complete sentences.
export const POLISH_BARE_PRONOUNS = Object.freeze((
  'ja mnie mi mną ty ciebie cię ci tobą on jego go niego jemu mu niemu nim ona jej niej ją nią ono je nie ' +
  'my nas nam nami wy was wam wami oni one ich nich im nimi się siebie sobie sobą ' +
  'ten tego temu tym ta tej tę tą to te tych tymi tamten tamtego tamtemu tamtym tamta tamtej tamtę tamtą tamto tamte tamtych tamtymi ' +
  'mój moja moje moi mojego mojej mojemu moim moją moich moimi twój twoja twoje twoi twojego twojej twojemu twoim twoją twoich twoimi ' +
  'swój swoja swoje swoi swojego swojej swojemu swoim swoją swoich swoimi nasz nasza nasze nasi naszego naszej naszemu naszym naszą naszych naszymi ' +
  'wasz wasza wasze wasi waszego waszej waszemu waszym waszą waszych waszymi ' +
  'kto kogo komu kim co czego czemu czym który która które którzy którego której któremu którym którą których którymi ' +
  'jaki jaka jakie jacy jakiego jakiej jakiemu jakim jaką jakich jakimi czyj czyja czyje czyi czyjego czyjej czyjemu czyim czyją czyich czyimi ' +
  'taki taka takie tacy takiego takiej takiemu takim taką takich takimi sam sama samo sami same samego samej samemu samym samą samych samymi ' +
  'każdy każda każde każdego każdej każdemu każdym każdą każdych każdymi wszyscy wszystkie wszystko wszystkiego wszystkiej wszystkiemu wszystkim wszystką wszystkich wszystkimi ' +
  'ktoś kogoś komuś kimś coś czegoś czemuś czymś nikt nikogo nikomu nikim nic niczego niczemu niczym ktokolwiek kogokolwiek komukolwiek kimkolwiek cokolwiek czegokolwiek czemukolwiek czymkolwiek ' +
  'jakiś jakaś jakieś jacyś jakiegoś jakiejś jakiemuś jakimś jakąś jakichś jakimiś któryś któraś któreś którzyś któregoś którejś któremuś którymś którąś którychś którymiś ' +
  'czyjś czyjaś czyjeś czyiś czyjegoś czyjejś czyjemuś czyimś czyjąś czyichś czyimiś niektóry niektóra niektóre niektórzy niektórego niektórej niektóremu niektórym niektórą niektórych niektórymi ' +
  'żaden żadna żadne żadnego żadnej żadnemu żadnym żadną żadnych żadnymi wszelki wszelka wszelkie wszelcy wszelkiego wszelkiej wszelkiemu wszelkim wszelką wszelkich wszelkimi ' +
  'ile ilu iloma tyle tylu tyloma tyleż tyluż tylekroć'
).split(' '))
const pronouns = new Set(POLISH_BARE_PRONOUNS)
export const isPolishBarePronoun = (value: string) => pronouns.has(polishChoiceKey(value))
const synonyms = [ ['chociaż', 'choć', 'mimo że'], ['żeby', 'aby'], ['jeśli', 'jeżeli'],
  ['wreszcie', 'nareszcie', 'w końcu'], ['potem', 'później', 'następnie'], ['kiedyś', 'dawniej'], ['natomiast', 'zaś'] ]

/** Explicit complete lines from the reviewed content. They are compared, never generated.
 * The token pairs record the actual semantic speaker referent. Paczka przyszła, to była
 * niespodzianka and the sąsiad/współlokator verbs are deliberately NOT changed. */
export const POLISH_GENDER_EVIDENCE: Readonly<Record<number, { canonical: string; alternative: string; pairs: ReadonlyArray<readonly [string, string]> }>> = {
  1: { canonical: 'Najpierw zwiedzałam zamek, a potem zostawiłam plecak w małym hostelu.', alternative: 'Najpierw zwiedzałem zamek, a potem zostawiłem plecak w małym hostelu.', pairs: [['zwiedzałam', 'zwiedzałem'], ['zostawiłam', 'zostawiłem']] },
  2: { canonical: 'Potem poszłam nad Wisłę, bo po muzeum potrzebowałam świeżego powietrza.', alternative: 'Potem poszedłem nad Wisłę, bo po muzeum potrzebowałem świeżego powietrza.', pairs: [['poszłam', 'poszedłem'], ['potrzebowałam', 'potrzebowałem']] },
  3: { canonical: 'Czekałam na tramwaj, kiedy nagle zaczął padać bardzo silny deszcz.', alternative: 'Czekałem na tramwaj, kiedy nagle zaczął padać bardzo silny deszcz.', pairs: [['czekałam', 'czekałem']] },
  5: { canonical: 'Zanim wyszłam z domu, znalazłam klucze. Potem pobiegłam na dworzec.', alternative: 'Zanim wyszedłem z domu, znalazłem klucze. Potem pobiegłem na dworzec.', pairs: [['wyszłam', 'wyszedłem'], ['znalazłam', 'znalazłem'], ['pobiegłam', 'pobiegłem']] },
  6: { canonical: 'Gotowałam zupę, a tymczasem mój współlokator piekł chleb na kolację.', alternative: 'Gotowałem zupę, a tymczasem mój współlokator piekł chleb na kolację.', pairs: [['gotowałam', 'gotowałem']] },
  7: { canonical: 'Paczka wreszcie przyszła wczoraj, kiedy spokojnie pracowałam w domu.', alternative: 'Paczka wreszcie przyszła wczoraj, kiedy spokojnie pracowałem w domu.', pairs: [['pracowałam', 'pracowałem']] },
  8: { canonical: 'Akurat wracałam ze sklepu, kiedy nowy sąsiad wnosił ciężkie pudło.', alternative: 'Akurat wracałem ze sklepu, kiedy nowy sąsiad wnosił ciężkie pudło.', pairs: [['wracałam', 'wracałem']] },
  9: { canonical: 'To była niespodzianka: wróciłam do domu, a tam czekał urodzinowy tort.', alternative: 'To była niespodzianka: wróciłem do domu, a tam czekał urodzinowy tort.', pairs: [['wróciłam', 'wróciłem']] },
}
// Each actual inflected form's subject was inspected. Require that noun in literal cloze text,
// not another blank answer. Adverbial comparatives do not inflect for a noun's gender.
const formSubjects: Record<string, Record<string, string | null>> = {
  '1/1': { otworzył: 'recepcjonista' }, '1/2': { pokazał: 'kolega' },
  '1/3': { chronił: 'parasol', zmoczył: 'deszcz' }, '1/4': { naprawił: 'technik' },
  '1/5': { odjechał: 'pociąg' }, '1/6': { zjadł: 'gość' }, '1/7': { pachniało: 'opakowanie' },
  '1/8': { zeszła: 'rozmowa' }, '1/9': { przygotowała: 'siostra' },
  '2/4': { mniejszy: 'pokój', bliżej: null }, '2/5': { tańsza: 'zupa' }, '2/6': { luźniej: null },
  '2/7': { droższy: 'kurs' }, '2/9': { lepsze: 'dni', rzadsze: 'dojazdy' },
  '2/10': { późniejszy: 'pociąg', dogodniejszy: 'pociąg' },
}
const predicateAdjectives = new Set('zadowolona zadowolony zmęczona zmęczony gotowa gotowy pewna pewien sama sam przekonana przekonany szczęśliwa szczęśliwy spóźniona spóźniony chora chory zajęta zajęty'.split(' '))
const speakerPredicates = (value: string): string[] => {
  const tokens = polishWords(value), found: string[] = []
  tokens.forEach((word, i) => {
    if (['jestem', 'byłam', 'byłem', 'zostałam', 'zostałem'].includes(word)
      || (word === 'czuję' && tokens[i + 1] === 'się')) {
      for (const next of tokens.slice(i + 1, i + 5)) if (predicateAdjectives.has(next)) found.push(next)
    }
  })
  return found
}
// Bounded formal-address inventory for friend paths (spec: friend paths contain no pan/pani). Whole-word
// matching only, so ordinary nouns such as panel, panorama, panna or spanie are never flagged.
const formalAddress = new Set('pan pani pana panu panem panie panią panowie panów panom panami panach państwo państwa państwu państwem'.split(' '))
const connectorMenus: Record<number, string[]> = { 1: ['najpierw', 'potem', 'zanim', 'podczas', 'wreszcie'], 2: ['chociaż', 'jednak', 'natomiast', 'przynajmniej'] }
const comparisonTokens = new Set('krótszy krótsza krótsze krótsi dłuższy dłuższa dłuższe dłużsi mniejszy mniejsza mniejsze mniejsi większy większa większe więksi lepszy lepsza lepsze lepsi gorszy gorsza gorsze gorsi tańszy tańsza tańsze tańsi droższy droższa droższe drożsi późniejszy późniejsza późniejsze późniejsi dogodniejszy dogodniejsza dogodniejsze dogodniejsi bliżej dalej luźniej częściej rzadziej lepiej gorzej'.split(' '))
type Check = (condition: boolean, message: string) => void
export type PolishB1Review = { draft: PolishB1Draft; scope: 'canonical-structure-only'; warnings: string[];
  coverage: { lessons: number; frozenLessons: number; frozenTrophies: number; fullAllocatedTrophies: number; genderAlternatives: number } }

export function reviewPolishB1Draft(value: unknown, specification: unknown): PolishB1Review {
  const draft = polishB1DraftSchema.parse(value), spec = specificationSchema.parse(specification)
  const errors: string[] = [], warnings: string[] = []
  const expect: Check = (condition, message) => { if (!condition) errors.push(message) }
  const imported = GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === 'Polish' && ['A1', 'A2'].includes(lesson.level))
  const frozen = imported.flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [fold(variant.trophyWord.word)] : []))
  expect(imported.length === 200 && new Set(imported.map(lesson => lesson.id)).size === 200, 'PL-FROZEN: exactly 200 actual distinct A1/A2 lessons required')
  expect(frozen.length === 200 && new Set(frozen).size === 200 && digest([...frozen].sort()) === POLISH_B1_BINDINGS.frozenSortedTrophiesSha256, 'PL-FROZEN: full trophy corpus changed')
  const occupied = new Set(frozen), allocated = new Set<string>()
  spec.paths.forEach((path, p) => {
    expect(path.pathNumber === p + 1, 'PL-SPEC-PATH-ORDER: full paths must be ordered 1–10')
    path.lessons.forEach((lesson, i) => {
      expect(lesson.number === i + 1, 'PL-SPEC-LESSON-ORDER: all ten lessons must be ordered')
      expect(tokenRe.test(lesson.trophy) && !firstSecondPerson(lesson.trophy), 'PL-ALLOCATION-TOKEN: lowercase neutral Polish trophy required')
      expect(!occupied.has(fold(lesson.trophy)), `PL-ALLOCATION-COLLISION: ${lesson.trophy}`)
      occupied.add(fold(lesson.trophy)); allocated.add(fold(lesson.trophy))
    })
  })
  expect(allocated.size === 100, 'PL-ALLOCATION-COUNT: full 100 trophies required')
  expect(digest(specification) === POLISH_B1_BINDINGS.specificationJsonSha256, 'PL-SPEC-BINDING: full controlling metadata/staging/allocations changed')
  const walk = (item: unknown, location: string) => {
    if (typeof item === 'string') expect(item === item.normalize('NFC') && !/[\p{Cc}\p{Cf}\ufffd]/u.test(item), `${location}: PL-NFC-CONTROL`)
    else if (Array.isArray(item)) item.forEach((child, i) => walk(child, `${location}/${i}`))
    else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      if ('de' in record || 'en' in record) expect(Object.keys(record).sort().join(',') === 'de,en'
        && typeof record.de === 'string' && Boolean(record.de.trim()) && typeof record.en === 'string' && Boolean(record.en.trim()), `${location}: PL-BILINGUAL`)
      Object.entries(record).forEach(([key, child]) => walk(child, `${location}/${key}`))
    }
  }
  walk(draft, 'draft')
  const slugs = new Set<string>(); let alternativeCount = 0
  draft.lessons.forEach((lesson, index) => {
    const n = index + 1, label = `Polish P${draft.pathNumber} L${n}`, key = `${draft.pathNumber}/${n}`
    const check: Check = (condition, message) => expect(condition, `${label}: ${message}`)
    const [opening, first, followup, second] = lesson.dialogue.map(turn => turn.targetText)
    const evidence = draft.pathNumber === 1 ? POLISH_GENDER_EVIDENCE[n] : undefined
    const speakerTokens = new Set([...(evidence?.pairs.flat() ?? []), ...speakerPredicates(first), ...speakerPredicates(second)])
    const unsafe = (token: string) => firstSecondPerson(fold(token)) || speakerTokens.has(fold(token))
    check(!slugs.has(lesson.slug), 'PL-SLUG: duplicate'); slugs.add(lesson.slug)
    check(lesson.register === 'informal', 'PL-REGISTER: P1/P2 friend paths require informal metadata')
    check(opening !== followup, 'PL-FOLLOWUP: must differ from opener')
    check(polishWords(first).length >= 8 && polishWords(first).length <= 16, 'PL-FIRST-LENGTH: 8–16 words')
    check(polishWords(second).length >= 6 && polishWords(second).length <= 12, 'PL-SECOND-LENGTH: 6–12 words')
    const sentenceCount = (line: string) => (line.match(/[.!?]+(?= |$)/gu) ?? []).length
    check(sentenceCount(first) >= 1 && sentenceCount(first) <= 2, 'PL-FIRST-SENTENCES: one or two sentences')
    check(lesson.chunks.map(chunk => chunk.targetText).join(' ') === first, 'PL-BUILD-JOIN: exact canonical reconstruction')
    check(lesson.chunks.every(chunk => polishWords(chunk.targetText).length >= 1 && polishWords(chunk.targetText).length <= 4), 'PL-CHUNK-LENGTH: one to four words')
    const chips = [...lesson.chunks.map(chunk => chunk.targetText), ...lesson.distractors]
    check(new Set(chips.map(polishChoiceKey)).size === chips.length, 'PL-BUILD-DISTINCT: punctuation/case cannot distinguish chips')
    check(new Set(lesson.terms.map(term => polishChoiceKey(term.targetText))).size === lesson.terms.length, 'PL-TERM-DISTINCT')
    for (const term of lesson.terms) {
      check(contains(first, term.targetText) || contains(second, term.targetText), `PL-TERM-ANCHOR: ${term.targetText}`)
      for (const word of polishWords(term.targetText).filter(firstSecondPerson)) {
        const pair = evidence?.pairs.find(parts => parts.includes(word))
        const other = pair?.find(part => part !== word)
        check(Boolean(other) && contains(term.baseText.de, other ?? '') && contains(term.baseText.en ?? '', other ?? ''), 'PL-TERM-GENDER-GLOSS: explicit opposite form in both bases')
      }
    }
    const choices = (options: string[], answer: string) => {
      check(options.filter(option => option === answer).length === 1 && new Set(options.map(polishChoiceKey)).size === 4, 'PL-CHOICES: four distinct identities and one exact canonical answer')
      for (const group of synonyms) if (group.includes(polishChoiceKey(answer))) check(options.filter(option => group.includes(polishChoiceKey(option))).length === 1, 'PL-SYNONYM-CHOICES: known interchangeable connectors')
    }
    const blanks = lesson.cloze.filter((part): part is PolishBlank => typeof part !== 'string')
    check(blanks.length >= 2 && blanks.length <= 3, 'PL-CLOZE-COUNT: two or three blanks')
    check(lesson.cloze.map(part => typeof part === 'string' ? part : part.answer).join('') === second, 'PL-CLOZE-JOIN: exact canonical reconstruction')
    const literal = lesson.cloze.map(part => typeof part === 'string' ? part : ' ').join('')
    let offset = 0
    for (const part of lesson.cloze) {
      if (typeof part === 'string') { offset += part.length; continue }
      choices(part.choices, part.answer)
      check(wholeSpan(second, offset, part.answer.length), 'PL-CLOZE-BOUNDARY: complete words at the actual blank position')
      check(polishWords(part.answer).length >= 1 && polishWords(part.answer).length <= 3 && !/[’'-]/u.test(part.answer), 'PL-CLOZE-LENGTH: one to three unattached words')
      check(!isPolishBarePronoun(part.answer), 'PL-BARE-PRONOUN: cloze answer')
      check(!polishWords(part.answer).some(unsafe), 'PL-GENDER-TARGET: cloze answer is speaker-gendered')
      check(part.kind === 'form' ? Boolean(part.cue) : part.cue === undefined, 'PL-CUE: cue iff form, as a single string')
      if (part.kind === 'connector') check(connectorMenus[draft.pathNumber].includes(fold(part.answer)), 'PL-CONNECTOR-MENU: outside this path')
      const subjects = formSubjects[key] ?? {}, answer = fold(part.answer), audited = Object.hasOwn(subjects, answer)
      // The audited inventory binds the answer, not the caller-supplied kind: a reviewed inflected form
      // cannot be relabelled choice/connector to shed its cue and visible-subject duties, nor hidden as a distractor.
      check(!audited || part.kind === 'form', 'PL-FORM-RELABEL: audited inflected form answer must stay a cued form blank')
      check(part.kind === 'form' || !part.choices.some(option => Object.hasOwn(subjects, fold(option))), 'PL-FORM-RELABEL: audited inflected form offered inside a choice/connector blank')
      if (audited && typeof subjects[answer] === 'string') check(contains(literal, subjects[answer]), 'PL-FORM-SUBJECT: agreeing noun must be visible outside all blanks')
      if (part.kind === 'form') {
        check(draft.pathNumber === 1 ? ['dokonany', 'niedokonany'].includes(part.cue ?? '') : part.cue === 'stopień wyższy', 'PL-CUE-LABEL: exact path form label required')
        check(audited, 'PL-FORM-AUDIT: new form needs a contextual agreement audit')
        if (draft.pathNumber === 2) check(n >= 4, 'PL-STAGING: comparatives productive from P2L4')
      }
      offset += part.answer.length
    }
    check(lesson.recall.before + lesson.recall.answer + lesson.recall.after === first, 'PL-RECALL-JOIN: exact canonical reconstruction')
    check(wholeSpan(first, lesson.recall.before.length, lesson.recall.answer.length), 'PL-RECALL-BOUNDARY: actual complete word')
    choices(lesson.recall.fallbackChoices, lesson.recall.answer)
    check(tokenRe.test(fold(lesson.recall.answer)) && fold(lesson.recall.answer).length >= 4 && !isPolishBarePronoun(lesson.recall.answer), 'PL-RECALL-TOKEN: at least four letters, not a bare pronoun')
    check(!unsafe(lesson.recall.answer), 'PL-GENDER-TARGET: recall answer is speaker-gendered')
    check(new Set(lesson.speakRequired.map(fold)).size === 3, 'PL-SPEECH-DISTINCT')
    const speechShort = draft.pathNumber === 2 ? ['bo', 'że'] : ['bo']
    for (const token of lesson.speakRequired) check(tokenRe.test(token) && (token.length >= 4 || speechShort.includes(token))
      && contains(first, token) && token !== 'się' && !isPolishBarePronoun(token) && !unsafe(token)
      && !['gdybym', 'żebym', 'gdybyś', 'żebyś'].includes(token), `PL-SPEECH-TOKEN: ${token}`)
    const nasal = (word: string) => word.replace(/ę$/u, 'e').replace(/ą$/u, 'a')
    check(new Set(lesson.speakRequired.map(nasal)).size === 3, 'PL-SPEECH-NASAL: final nasal minimal pair')
    check(lesson.pattern.examples.some(example => example.targetText === first || example.targetText === second), 'PL-PATTERN-REUSE')
    for (const example of lesson.pattern.examples) check(example.targetText.includes(example.highlight), 'PL-HIGHLIGHT: contiguous substring')
    const trophy = lesson.trophyWord.word
    check(trophy === spec.paths[draft.pathNumber - 1].lessons[index].trophy, 'PL-TROPHY-ALLOCATION: exact immutable surface')
    check(tokenRe.test(trophy) && !unsafe(trophy) && !isPolishBarePronoun(trophy), 'PL-TROPHY-TOKEN: lowercase neutral Polish word')
    check(contains(first, trophy) && contains(lesson.trophyWord.example, trophy), 'PL-TROPHY-ANCHOR: whole exact surface in first reply and example')
    check(lesson.trophyWord.example !== first, 'PL-TROPHY-EXAMPLE: different example required')
    for (const locale of ['de', 'en'] as const) {
      const caption = lesson.sceneCaption[locale] ?? ''
      check(caption.includes(`„${opening}”`), 'PL-CAPTION-QUOTE: exact Polish opener inside Polish quotes in both bases')
      check(!caption.includes(followup), 'PL-CAPTION-SPOILER: later turn quoted')
    }
    for (const i of [1, 3] as const) {
      const line = lesson.dialogue[i], authorized = i === 1 ? evidence : undefined
      if (authorized) {
        check(POLISH_B1_VOICE_PLAN[draft.pathNumber as 1 | 2] === 'female' && line.targetText === authorized.canonical, 'PL-GENDER-CANONICAL: complete reviewed feminine line changed')
        check(line.acceptedTargetAlternatives?.[0] === authorized.alternative, 'PL-GENDER-ALTERNATIVE: exact complete reviewed opposite-gender line required')
        check(lesson.pattern.examples.some(example => example.targetText === authorized.alternative), 'PL-GENDER-PATTERN: show complete opposite-gender example')
      } else {
        check(line.acceptedTargetAlternatives === undefined, 'PL-GENDER-UNBOUND: no alternative without a whole-line audit')
        check(!polishWords(line.targetText).some(firstSecondPerson) && speakerPredicates(line.targetText).length === 0, 'PL-GENDER-UNBOUND: new speaker agreement needs whole-line audit')
      }
      for (const alternate of line.acceptedTargetAlternatives ?? []) {
        alternativeCount++
        check(sentenceCount(alternate) === sentenceCount(line.targetText), 'PL-GENDER-SENTENCES: same complete sentence count')
        check(contains(alternate, trophy) && lesson.speakRequired.every(token => contains(alternate, token)), 'PL-GENDER-ANCHORS: preserve trophy and all three speech tokens')
        if (i === 1) check(contains(alternate, lesson.recall.answer), 'PL-GENDER-RECALL: preserve recall answer')
      }
    }
    const production = [first, second, lesson.trophyWord.example, ...lesson.pattern.examples.map(example => example.targetText),
      ...lesson.dialogue.flatMap(turn => 'acceptedTargetAlternatives' in turn ? turn.acceptedTargetAlternatives ?? [] : [])]
    for (const line of production) {
      const words = polishWords(line)
      check(!words.some(word => ['ponieważ', 'wiesz', 'no'].includes(word)), 'PL-REGISTER: recognition-only learner marker in a productive surface')
      check(!words.some(word => formalAddress.has(word)), 'PL-REGISTER-ADDRESS: pan/pani formal address in a friend-path productive surface')
      const phrases = draft.pathNumber === 1
        ? [...(n < 4 ? ['podczas', 'zanim', 'tymczasem'] : []), ...(n < 7 ? ['wreszcie', 'akurat', 'okazało się', 'w sumie', 'niespodzianka', 'historia'] : []), 'podczas gdy', 'wracając']
        : [...(n < 4 ? ['jednak', 'natomiast', 'z jednej strony', 'z drugiej strony'] : []), ...(n < 6 ? ['przynajmniej'] : []), ...(n < 7 ? ['warto', 'szczerze mówiąc', 'owszem', 'ostatecznie'] : []), 'według mnie', 'mimo że', 'choć', 'za to', 'mimo wszystko', 'co prawda']
      check(!phrases.some(phrase => contains(line, phrase)), 'PL-STAGING: premature or recognition-only productive surface')
      if (draft.pathNumber === 2 && n < 4) check(!words.some(word => comparisonTokens.has(word)), 'PL-STAGING: comparative production before P2L4')
    }
    for (const turn of lesson.dialogue) {
      check(!contains(turn.targetText, 'ponieważ'), 'PL-REGISTER: ponieważ recognition only in formal P5/P6, not P1/P2')
      // Friend register holds in all four turns; no/wiesz stay legal here as interlocutor recognition markers.
      check(!polishWords(turn.targetText).some(word => formalAddress.has(word)), 'PL-REGISTER-ADDRESS: pan/pani formal address in a friend-path dialogue turn')
    }
    const surfaces = [...lesson.dialogue.map(turn => turn.targetText), ...lesson.chunks.map(chunk => chunk.targetText),
      ...lesson.terms.map(term => term.targetText), ...production, ...lesson.pattern.examples.map(example => example.highlight),
      trophy, lesson.recall.answer, ...lesson.recall.fallbackChoices, ...lesson.distractors, ...lesson.speakRequired,
      ...blanks.flatMap(part => [part.answer, ...part.choices])]
    for (const surface of surfaces) check(surfaceRe.test(surface) && surface === surface.trim() && !/\s{2}/u.test(surface)
      && polishWords(surface).length > 0, 'PL-TARGET-SCRIPT: Polish letters, canonical spaces, spelled-out numbers and permitted punctuation')
    warnings.push(`${label}: PL-SEMANTICS: native review must verify aspect, lexical case, idiomatic de/en bases, scene truth, actual referents and full gender agreement; third-person suffixes are not speaker-gender evidence.`,
      `${label}: PL-EXERCISES: reconstruction and known synonym checks do not prove unique chip order or unique contextual answers; read all choices with only the visible scene and cue.`,
      `${label}: PL-STAGING-LIMIT: exact lexical tripwires and bound actual form subjects only; productive-versus-recognition function and unlisted comparative/predicate forms still need semantic review.`,
      `${label}: PL-INPUT-HOLD: canonical structure only; whole-line alternatives are authored data awaiting runtime support. Exact Polish diacritics remain meaningful; no automatic suffix substitution or accent folding is implemented.`)
  })
  if (errors.length) throw new Error(errors.join('\n'))
  return { draft, scope: 'canonical-structure-only', warnings, coverage: { lessons: draft.lessons.length,
    frozenLessons: imported.length, frozenTrophies: frozen.length, fullAllocatedTrophies: allocated.size, genderAlternatives: alternativeCount } }
}
/** Call reviewPolishB1Draft when collecting publication evidence so its warnings remain visible. */
export const validatePolishB1Draft = (value: unknown, specification: unknown): PolishB1Draft => reviewPolishB1Draft(value, specification).draft
