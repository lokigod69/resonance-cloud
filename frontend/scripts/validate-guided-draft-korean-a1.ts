/**
 * Mechanical validator for the un-integrated Korean A1 draft paths (P2–P10) —
 * A1 authoring-contract invariants plus the batch conventions (single-eojeol
 * speak tokens, chunk/distractor hygiene, corpus-unique trophies). Paths not
 * yet authored are skipped with a notice. P1 (live) gets intactness guards.
 */
import * as koreanA1 from '../src/data/guided/koreanA1'
import type { GuidedLessonDefinition } from '../src/data/guidedLessons'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring'

let failures = 0
let checks = 0
function assert(label: string, ok: boolean, detail?: unknown) {
  checks += 1
  if (!ok) {
    failures += 1
    console.log(`FAIL  ${label}${detail !== undefined ? ` :: ${JSON.stringify(detail)}` : ''}`)
  }
}
assert('authored guided corpus is non-empty', GUIDED_LESSONS.length > 0, GUIDED_LESSONS.length)

const normalizeWs = (s: string) => s.replace(/\s+/g, ' ').trim()
const tokenize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
const hasHangul = (s: string) => /[가-힣]/.test(s)

const PATH_EXPORT_NAMES: Record<number, string> = {
  2: 'KOREAN_A1_PRACTICAL_2_LESSONS',
  3: 'KOREAN_A1_PRACTICAL_3_LESSONS',
  4: 'KOREAN_A1_PRACTICAL_4_LESSONS',
  5: 'KOREAN_A1_PRACTICAL_5_LESSONS',
  6: 'KOREAN_A1_PRACTICAL_6_LESSONS',
  7: 'KOREAN_A1_PRACTICAL_7_LESSONS',
  8: 'KOREAN_A1_PRACTICAL_8_LESSONS',
  9: 'KOREAN_A1_PRACTICAL_9_LESSONS',
  10: 'KOREAN_A1_PRACTICAL_10_LESSONS',
}

// Existing Korean trophies (P1) — the draft paths themselves are excluded so this
// check stays meaningful after integration into GUIDED_LESSONS.
const draftPathIds = new Set(Object.keys(PATH_EXPORT_NAMES).map((n) => `korean-a1-practical-${n}`))
const existingKoreanTrophies = new Set(
  GUIDED_LESSONS.filter((l) => l.targetLanguage === 'Korean' && !draftPathIds.has(l.pathId)).flatMap((l) =>
    Object.values(l.vibeVariants).map((v) => v?.trophyWord.word).filter(Boolean) as string[],
  ),
)
const batchTrophies = new Map<string, string>()

for (const [pathNumber, exportName] of Object.entries(PATH_EXPORT_NAMES)) {
  const lessons = (koreanA1 as Record<string, unknown>)[exportName] as GuidedLessonDefinition[] | undefined
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
    assert(`${id} pathId`, lesson.pathId === `korean-a1-practical-${pathNumber}`)

    const concat = normalizeWs(v.chunks.map((c) => c.targetText).join(' '))
    assert(`${id} chunks concat == corePhrase`, concat === normalizeWs(v.corePhrase.targetText), { concat, core: v.corePhrase.targetText })
    assert(`${id} chunk count 2..4`, v.chunks.length >= 2 && v.chunks.length <= 4, v.chunks.length)
    assert(`${id} target fields are Hangul`, [v.corePhrase.targetText, ...v.chunks.map((c) => c.targetText), ...v.lessonItems.map((x) => x.targetText)].every(hasHangul))

    assert(`${id} build target == corePhrase`, v.build.targetText === v.corePhrase.targetText)
    const chipSet = new Set(v.build.chips)
    assert(`${id} every chunk is a chip`, v.chunks.every((c) => chipSet.has(c.targetText)))
    assert(`${id} chips = chunks + 2 distractors, <=6`, v.build.chips.length === v.chunks.length + 2 && v.build.chips.length <= 6, v.build.chips.length)
    assert(`${id} chips unique`, chipSet.size === v.build.chips.length)

    const tr = v.typeRecall
    assert(`${id} recall before+answer+after == corePhrase`, `${tr.before}${tr.answer}${tr.after}` === v.corePhrase.targetText, `${tr.before}|${tr.answer}|${tr.after}`)
    assert(`${id} recall acceptedAnswers include answer`, tr.acceptedAnswers.includes(tr.answer))
    assert(`${id} recall fallback has 4 choices incl answer`, tr.fallbackChoices.length === 4 && tr.fallbackChoices.includes(tr.answer), tr.fallbackChoices)
    assert(`${id} recall answer is Hangul content`, hasHangul(tr.answer), tr.answer)

    const st = v.speakTarget
    const targetTokens = new Set(tokenize(st.targetPhrase))
    assert(`${id} speak language ko-KR`, st.language === 'ko-KR')
    assert(`${id} speak threshold 0.65`, st.passingThreshold === 0.65, st.passingThreshold)
    assert(`${id} 3 single-eojeol required tokens`, st.requiredTokens?.length === 3 && st.requiredTokens.every((t) => !t.trim().includes(' ')), st.requiredTokens)
    assert(`${id} required tokens appear in phrase`, (st.requiredTokens ?? []).every((t) => targetTokens.has(tokenize(t)[0] ?? '')), st.requiredTokens)
    assert(`${id} speak phrase == corePhrase`, st.targetPhrase === v.corePhrase.targetText)

    assert(`${id} 4..6 lessonItems`, v.lessonItems.length >= 4 && v.lessonItems.length <= 6, v.lessonItems.length)
    assert(`${id} item ids unique`, new Set(v.lessonItems.map((x) => x.id)).size === v.lessonItems.length)
    assert(`${id} chunk ids unique`, new Set(v.chunks.map((x) => x.id)).size === v.chunks.length)
    assert(`${id} items acceptedAnswers include target`, v.lessonItems.every((x) => x.acceptedAnswers.includes(x.targetText)))

    const w = v.trophyWord.word
    assert(`${id} trophy is Hangul`, hasHangul(w), w)
    assert(`${id} trophy not in existing Korean corpus`, !existingKoreanTrophies.has(w), w)
    assert(`${id} trophy unique within draft batch`, !batchTrophies.has(w), { word: w, also: batchTrophies.get(w) })
    batchTrophies.set(w, id)
    // Dictionary-form verb/adjective trophies (…다) show conjugated forms in examples — exempt from literal containment.
    assert(`${id} trophy example contains word`, w.endsWith('다') || v.trophyWord.example.includes(w), { w, ex: v.trophyWord.example })

    const deFields = [v.corePhrase.baseText.de, v.meaning.de, v.sceneCaption.de, lesson.situation.de, v.trophyWord.meaning.de, v.trophyWord.whyThisWord.de]
    assert(`${id} .de fields present`, deFields.every((s) => typeof s === 'string' && s.length > 0))
    assert(`${id} no digraph umlauts in de`, deFields.every((s) => !/\b(ae|oe|ue)[a-z]/.test(s ?? '')))

    assert(`${id} contentStatus draft`, v.contentStatus === 'draft')
  })
}

// P1 must remain stable (live content)
assert('P1 intact: 10 lessons', koreanA1.KOREAN_A1_PRACTICAL_1_LESSONS.length === 10)
assert('P1 intact: first id', koreanA1.KOREAN_A1_PRACTICAL_1_LESSONS[0].id === 'korean-a1-practical-1-lesson-1-annyeong-first-contact')
assert('P1 intact: first corePhrase', koreanA1.KOREAN_A1_PRACTICAL_1_LESSONS[0].vibeVariants.bright?.corePhrase.targetText === '안녕하세요. 혹시 영어를 할 수 있어요?')

console.log(`\n${checks - failures} passed, ${failures} failed (of ${checks})`)
if (failures > 0) process.exit(1)
