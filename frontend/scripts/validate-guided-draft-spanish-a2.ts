/**
 * Mechanical validator for Spanish A2 P2–P4 (uncommitted batch) — mirrors the §5
 * contract invariants that the integrated suites would enforce, plus batch-local rules.
 */
import {
  SPANISH_A2_PRACTICAL_2_LESSONS,
  SPANISH_A2_PRACTICAL_3_LESSONS,
  SPANISH_A2_PRACTICAL_4_LESSONS,
} from '../src/data/guided/spanishA2'
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

const normalizeWs = (s: string) => s.replace(/\s+/g, ' ').trim()
const tokenize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)

const batches = [
  ['P2', SPANISH_A2_PRACTICAL_2_LESSONS],
  ['P3', SPANISH_A2_PRACTICAL_3_LESSONS],
  ['P4', SPANISH_A2_PRACTICAL_4_LESSONS],
] as const

// Existing Spanish trophies (A1 + A2 P1) from the integrated corpus
const existingSpanishTrophies = new Set(
  GUIDED_LESSONS.filter((l) => l.targetLanguage === 'Spanish').flatMap((l) =>
    Object.values(l.vibeVariants).map((v) => v?.trophyWord.word.toLowerCase()).filter(Boolean) as string[],
  ),
)
const batchTrophies = new Map<string, string>()

for (const [label, lessons] of batches) {
  assert(`${label} has 10 lessons`, lessons.length === 10, lessons.length)
  lessons.forEach((lesson, i) => {
    const v = lesson.vibeVariants.bright
    const id = `${label}#${i + 1} ${lesson.id}`
    if (!v) { assert(`${id} has bright variant`, false); return }

    // ids and numbering
    assert(`${id} lessonNumber`, lesson.lessonNumber === i + 1, lesson.lessonNumber)
    assert(`${id} level A2`, lesson.level === 'A2')
    assert(`${id} pathId`, lesson.pathId === `spanish-a2-practical-${label.slice(1)}`)

    // chunks concat === corePhrase
    const concat = normalizeWs(v.chunks.map((c) => c.targetText).join(' '))
    assert(`${id} chunks concat == corePhrase`, concat === normalizeWs(v.corePhrase.targetText), { concat, core: v.corePhrase.targetText })
    assert(`${id} chunk count 3..6`, v.chunks.length >= 3 && v.chunks.length <= 6, v.chunks.length)

    // build
    assert(`${id} build target == corePhrase`, v.build.targetText === v.corePhrase.targetText)
    const chipSet = new Set(v.build.chips)
    assert(`${id} every chunk is a chip`, v.chunks.every((c) => chipSet.has(c.targetText)))
    assert(`${id} chips = chunks + 2 distractors, <=7`, v.build.chips.length === v.chunks.length + 2 && v.build.chips.length <= 7, v.build.chips.length)
    assert(`${id} chips unique`, chipSet.size === v.build.chips.length)

    // typeRecall
    const tr = v.typeRecall
    assert(`${id} recall before+answer+after == corePhrase`, `${tr.before}${tr.answer}${tr.after}` === v.corePhrase.targetText, `${tr.before}|${tr.answer}|${tr.after}`)
    assert(`${id} recall acceptedAnswers include answer`, tr.acceptedAnswers.includes(tr.answer))
    assert(`${id} recall accepts lowercase`, tr.acceptedAnswers.includes(tr.answer.toLowerCase()))
    assert(`${id} recall fallback has 4 choices incl answer`, tr.fallbackChoices.length === 4 && tr.fallbackChoices.includes(tr.answer), tr.fallbackChoices)
    const pronouns = new Set(['lo', 'la', 'le', 'me', 'se', 'los', 'las', 'les'])
    assert(`${id} recall never blanks an object pronoun`, !pronouns.has(tr.answer.toLowerCase()))

    // speak target
    const st = v.speakTarget
    const targetTokens = new Set(tokenize(st.targetPhrase))
    assert(`${id} speak language es-ES`, st.language === 'es-ES')
    assert(`${id} 3 single-word required tokens`, st.requiredTokens?.length === 3 && st.requiredTokens.every((t) => !t.includes(' ')), st.requiredTokens)
    assert(`${id} required tokens appear in phrase`, (st.requiredTokens ?? []).every((t) => targetTokens.has(t.toLowerCase())), st.requiredTokens)
    assert(`${id} optional tokens single words in phrase`, (st.optionalTokens ?? []).every((t) => !t.includes(' ') && targetTokens.has(t)), st.optionalTokens)
    assert(`${id} required/optional disjoint`, (st.requiredTokens ?? []).every((t) => !(st.optionalTokens ?? []).includes(t)))
    assert(`${id} speak phrase == corePhrase`, st.targetPhrase === v.corePhrase.targetText)

    // lessonItems
    assert(`${id} 5..7 lessonItems`, v.lessonItems.length >= 5 && v.lessonItems.length <= 7, v.lessonItems.length)
    assert(`${id} item ids unique`, new Set(v.lessonItems.map((x) => x.id)).size === v.lessonItems.length)
    assert(`${id} chunk ids unique`, new Set(v.chunks.map((x) => x.id)).size === v.chunks.length)
    assert(`${id} items acceptedAnswers include target`, v.lessonItems.every((x) => x.acceptedAnswers.includes(x.targetText)))

    // trophy
    const w = v.trophyWord.word.toLowerCase()
    assert(`${id} trophy not in existing Spanish corpus`, !existingSpanishTrophies.has(w), w)
    assert(`${id} trophy unique within batch`, !batchTrophies.has(w), { word: w, also: batchTrophies.get(w) })
    batchTrophies.set(w, id)
    assert(`${id} trophy example contains word stem`, v.trophyWord.example.toLowerCase().includes(w.slice(0, Math.max(3, w.length - 2))), { w, ex: v.trophyWord.example })

    // locale hygiene quick screens
    const deFields = [v.corePhrase.baseText.de, v.meaning.de, v.sceneCaption.de, lesson.situation.de, v.trophyWord.meaning.de, v.trophyWord.whyThisWord.de]
    assert(`${id} .de fields present`, deFields.every((s) => typeof s === 'string' && s.length > 0))
    assert(`${id} no digraph umlauts in de`, deFields.every((s) => !/\b(ae|oe|ue)[a-z]/.test(s ?? '')))
    assert(`${id} no slash alternatives`, [v.corePhrase.targetText, v.corePhrase.baseText.de, v.corePhrase.baseText.en].every((s) => !s.includes('/')))

    // status draft
    assert(`${id} contentStatus draft`, v.contentStatus === 'draft')
  })
}

// P1 must be byte-identical in behavior: check its ids and first corePhrase survived
import { SPANISH_A2_PRACTICAL_1_LESSONS } from '../src/data/guided/spanishA2'
assert('P1 intact: 10 lessons', SPANISH_A2_PRACTICAL_1_LESSONS.length === 10)
assert('P1 intact: first id', SPANISH_A2_PRACTICAL_1_LESSONS[0].id === 'spanish-a2-practical-1-001-lo-de-siempre')
assert('P1 intact: first corePhrase', SPANISH_A2_PRACTICAL_1_LESSONS[0].vibeVariants.bright?.corePhrase.targetText === 'Sí, lo de siempre: un café con leche, por favor.')

console.log(`\n${checks - failures} passed, ${failures} failed (of ${checks})`)
if (failures > 0) process.exit(1)
