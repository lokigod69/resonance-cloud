/**
 * Mechanical validator for the un-integrated Russian A1 draft paths (P1–P10) —
 * A1 authoring-contract invariants (tmp\RUSSIAN_A1_P1_P10_SPEC.md) plus the
 * Russian hard rule: ZERO gendered learner forms (no past tense -л/-ла, no
 * short-adjective agreement) and вы-register (no ты-forms). Paths not yet
 * authored are skipped with a notice.
 */
import * as russianA1 from '../src/data/guided/russianA1'
import type { GuidedLessonDefinition } from '../src/data/guidedLessons'
import { GUIDED_LESSONS } from '../src/data/guidedLessons'

let failures = 0
let checks = 0
function assert(label: string, ok: boolean, detail?: unknown) {
  checks += 1
  if (!ok) {
    failures += 1
    console.log(`FAIL  ${label}${detail !== undefined ? ` :: ${JSON.stringify(detail)}` : ''}`)
  }
}

const tokenize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean)
const hasCyrillic = (s: string) => /[а-яёА-ЯЁ]/.test(s)
const hasLatin = (s: string) => /[A-Za-z]/.test(s)

// Gendered/register tripwires for LEARNER lines. Deliberately over-strict
// (Polish precedent): the arbiter whitelists real false positives case by case.
const BANNED_LEARNER_TOKENS = new Set([
  // gendered past / short adjectives / self-descriptions
  'был', 'была', 'рад', 'рада', 'готов', 'готова', 'устал', 'устала',
  'забыл', 'забыла', 'опоздал', 'опоздала', 'приехал', 'приехала',
  'пришёл', 'пришел', 'пришла', 'узнал', 'узнала', 'вышел', 'вышла',
  'потерял', 'потеряла', 'сам', 'сама', 'студент', 'студентка',
  // ты-register
  'ты', 'тебе', 'тебя', 'твой', 'твоя', 'твоё', 'твое', 'твои',
  // slang / fillers
  'блин', 'щас', 'норм', 'чё', 'че', 'давай',
])
const BANNED_LEARNER_PATTERNS: Array<[string, RegExp]> = [
  ['reflexive past -лся/-лась', /л(?:ся|ась)\b/u],
  ['я + past-tense agreement', /\bя\s+[а-яё]+л(?:а|и)?\b/iu],
]

const PATH_EXPORT_NAMES: Record<number, string> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [i + 1, `RUSSIAN_A1_PRACTICAL_${i + 1}_LESSONS`]),
)

const draftPathIds = new Set(Object.keys(PATH_EXPORT_NAMES).map((n) => `russian-a1-practical-${n}`))
const existingRussianTrophies = new Set(
  GUIDED_LESSONS.filter((l) => l.targetLanguage === 'Russian' && !draftPathIds.has(l.pathId)).flatMap((l) =>
    Object.values(l.vibeVariants).map((v) => v?.trophyWord.word).filter(Boolean) as string[],
  ),
)
const batchTrophies = new Map<string, string>()

for (const [pathNumber, exportName] of Object.entries(PATH_EXPORT_NAMES)) {
  const lessons = (russianA1 as Record<string, unknown>)[exportName] as GuidedLessonDefinition[] | undefined
  const label = `P${pathNumber}`
  if (!lessons) {
    console.log(`SKIP  ${label} not authored yet (${exportName} missing)`)
    continue
  }
  assert(`${label} has 10 lessons`, lessons.length === 10, lessons.length)
  lessons.forEach((lesson, i) => {
    const v = lesson.vibeVariants.bright
    const id = `${label}#${i + 1} ${lesson.id}`
    if (!v) { assert(`${id} has bright variant`, false); return }

    assert(`${id} lessonNumber`, lesson.lessonNumber === i + 1, lesson.lessonNumber)
    assert(`${id} level A1`, lesson.level === 'A1')
    assert(`${id} pathId`, lesson.pathId === `russian-a1-practical-${pathNumber}`)

    const concat = v.chunks.map((c) => c.targetText).join(' ')
    assert(`${id} chunks concat == corePhrase`, concat === v.corePhrase.targetText, { concat, core: v.corePhrase.targetText })
    assert(`${id} no chunk edge whitespace`, v.chunks.every((c) => c.targetText === c.targetText.trim()))
    assert(`${id} chunk count 2..4`, v.chunks.length >= 2 && v.chunks.length <= 4, v.chunks.length)

    const targetFields = [v.corePhrase.targetText, ...v.chunks.map((c) => c.targetText), ...v.lessonItems.map((x) => x.targetText), v.typeRecall.answer, v.trophyWord.word]
    assert(`${id} target fields are Cyrillic`, targetFields.every(hasCyrillic))
    assert(`${id} no Latin in target fields`, targetFields.every((s) => !hasLatin(s)), targetFields.filter(hasLatin))

    const learnerText = [v.corePhrase.targetText, v.trophyWord.example].join(' ')
    const learnerTokens = new Set(tokenize(learnerText))
    const bannedHits = [...learnerTokens].filter((t) => BANNED_LEARNER_TOKENS.has(t))
    assert(`${id} no gendered/ты/slang tokens`, bannedHits.length === 0, bannedHits)
    for (const [name, pattern] of BANNED_LEARNER_PATTERNS) {
      assert(`${id} no ${name}`, !pattern.test(learnerText.toLowerCase()), learnerText)
    }

    assert(`${id} build target == corePhrase`, v.build.targetText === v.corePhrase.targetText)
    const chipSet = new Set(v.build.chips)
    assert(`${id} every chunk is a chip`, v.chunks.every((c) => chipSet.has(c.targetText)))
    assert(`${id} chips = chunks + 2 distractors, <=6`, v.build.chips.length === v.chunks.length + 2 && v.build.chips.length <= 6, v.build.chips.length)
    assert(`${id} chips unique`, chipSet.size === v.build.chips.length)

    const tr = v.typeRecall
    assert(`${id} recall before+answer+after == corePhrase`, `${tr.before}${tr.answer}${tr.after}` === v.corePhrase.targetText, `${tr.before}|${tr.answer}|${tr.after}`)
    assert(`${id} recall acceptedAnswers include answer`, tr.acceptedAnswers.includes(tr.answer))
    if (/[ёЁ]/.test(tr.answer)) {
      assert(`${id} recall accepts е-fold of ё`, tr.acceptedAnswers.includes(tr.answer.replace(/ё/g, 'е').replace(/Ё/g, 'Е')), tr.acceptedAnswers)
    }
    assert(`${id} recall fallback has 4 choices incl answer`, tr.fallbackChoices.length === 4 && tr.fallbackChoices.includes(tr.answer), tr.fallbackChoices)

    const st = v.speakTarget
    const targetTokens = new Set(tokenize(st.targetPhrase))
    assert(`${id} speak language ru-RU`, st.language === 'ru-RU')
    assert(`${id} 3 single-word hyphen-free required tokens`, st.requiredTokens?.length === 3 && st.requiredTokens.every((t) => !t.trim().includes(' ') && !t.includes('-')), st.requiredTokens)
    assert(`${id} required tokens appear in phrase`, (st.requiredTokens ?? []).every((t) => targetTokens.has(tokenize(t)[0] ?? '')), st.requiredTokens)
    assert(`${id} speak phrase == corePhrase`, st.targetPhrase === v.corePhrase.targetText)

    assert(`${id} 4..6 lessonItems`, v.lessonItems.length >= 4 && v.lessonItems.length <= 6, v.lessonItems.length)
    assert(`${id} item ids unique`, new Set(v.lessonItems.map((x) => x.id)).size === v.lessonItems.length)
    assert(`${id} chunk ids unique`, new Set(v.chunks.map((x) => x.id)).size === v.chunks.length)
    assert(`${id} items acceptedAnswers include target`, v.lessonItems.every((x) => x.acceptedAnswers.includes(x.targetText)))

    const w = v.trophyWord.word
    assert(`${id} trophy is single Cyrillic word`, hasCyrillic(w) && !w.includes(' '), w)
    assert(`${id} trophy not in existing Russian corpus`, !existingRussianTrophies.has(w), w)
    assert(`${id} trophy unique within draft batch`, !batchTrophies.has(w), { word: w, also: batchTrophies.get(w) })
    batchTrophies.set(w, id)
    // Infinitive trophies (…ть/…ться incl. reflexives) show conjugated forms in
    // examples — exempt from literal containment. Noun/adjective trophies decline:
    // accept the stem (citation form minus its final vowel/soft sign) as containment.
    const wLower = w.toLowerCase()
    const exLower = v.trophyWord.example.toLowerCase()
    // Adjectives shed their two-char ending (-ый/-ий/-ой); other words their final vowel.
    const stem = /(?:ый|ий|ой)$/u.test(wLower) ? wLower.slice(0, -2) : wLower.replace(/[аяоеёьйы]$/u, '')
    const trophyContained = /(?:ть|ться|ти|тись|чь)$/.test(w)
      || exLower.includes(wLower)
      || (stem.length >= 3 && stem !== wLower && exLower.includes(stem))
    assert(`${id} trophy example contains word`, trophyContained, { w, ex: v.trophyWord.example })

    const deFields = [v.corePhrase.baseText.de, v.meaning.de, v.sceneCaption.de, lesson.situation.de, v.trophyWord.meaning.de, v.trophyWord.whyThisWord.de]
    const enFields = [v.corePhrase.baseText.en, v.meaning.en, v.sceneCaption.en, lesson.situation.en, v.trophyWord.meaning.en, v.trophyWord.whyThisWord.en]
    assert(`${id} .de fields present`, deFields.every((s) => typeof s === 'string' && s.length > 0))
    assert(`${id} .en fields present`, enFields.every((s) => typeof s === 'string' && s.length > 0))
    assert(`${id} no digraph umlauts in de`, deFields.every((s) => !/\b(ae|oe|ue)[a-z]/.test(s ?? '')))

    assert(`${id} contentStatus draft`, v.contentStatus === 'draft')
  })
}

console.log(`\n${checks - failures} passed, ${failures} failed (of ${checks})`)
if (failures > 0) process.exit(1)
