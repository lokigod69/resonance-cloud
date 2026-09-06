/**
 * Mechanical validator for the un-integrated Japanese A1 draft paths (P1–P10) —
 * A1 authoring-contract invariants (tmp\JAPANESE_A1_P1_P10_SPEC.md) plus the
 * Japanese hard rules: wakachigaki spacing, no romaji in target fields, the
 * conjugation whitelist (です/ます; fixed て-ください chunks; わかりました/
 * 助かりました as the only past formulas), and kana speak accepted-answers.
 * Paths not yet authored are skipped with a notice.
 */
import * as japaneseA1 from '../src/data/guided/japaneseA1'
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

const hasJapanese = (s: string) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s)
const hasHan = (s: string) => /\p{Script=Han}/u.test(s)
const hasLatin = (s: string) => /[A-Za-z]/.test(s)
const tokenize = (s: string) => s.split(/\s+/).filter(Boolean).map((t) => t.replace(/[、。？！]/gu, ''))

const ALLOWED_PAST_FORMULAS = ['わかりました', '分かりました', '助かりました']
const stripAllowedPast = (s: string) =>
  ALLOWED_PAST_FORMULAS.reduce((acc, formula) => acc.split(formula).join(''), s)

// Deliberately over-strict conjugation tripwires on learner lines — the
// arbiter whitelists genuine fixed-chunk uses case by case.
const BANNED_TARGET_PATTERNS: Array<[string, RegExp]> = [
  ['past ました outside the whitelist', /ました/u],
  ['negative past ませんでした', /ませんでした/u],
  ['past adjective かった', /かった/u],
  ['casual contraction じゃ/ちゃ', /[じち]ゃ/u],
  ['plain-form sentence-final だ', /だ[。？]/u],
  ['sentence-final よ', /よ[。？]/u],
]

const PATH_EXPORT_NAMES: Record<number, string> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [i + 1, `JAPANESE_A1_PRACTICAL_${i + 1}_LESSONS`]),
)

const draftPathIds = new Set(Object.keys(PATH_EXPORT_NAMES).map((n) => `japanese-a1-practical-${n}`))
const existingJapaneseTrophies = new Set(
  GUIDED_LESSONS.filter((l) => l.targetLanguage === 'Japanese' && !draftPathIds.has(l.pathId)).flatMap((l) =>
    Object.values(l.vibeVariants).map((v) => v?.trophyWord.word).filter(Boolean) as string[],
  ),
)
const batchTrophies = new Map<string, string>()

for (const [pathNumber, exportName] of Object.entries(PATH_EXPORT_NAMES)) {
  const lessons = (japaneseA1 as Record<string, unknown>)[exportName] as GuidedLessonDefinition[] | undefined
  const label = `P${pathNumber}`
  if (!lessons) {
    console.log(`SKIP  ${label} not authored yet (${exportName} missing)`)
    continue
  }
  assert(`${label} has 10 lessons`, lessons.length === 10, lessons.length)

  let neCount = 0
  let mashouCount = 0
  let teimasuCount = 0

  lessons.forEach((lesson, i) => {
    const v = lesson.vibeVariants.bright
    const id = `${label}#${i + 1} ${lesson.id}`
    if (!v) { assert(`${id} has bright variant`, false); return }

    assert(`${id} lessonNumber`, lesson.lessonNumber === i + 1, lesson.lessonNumber)
    assert(`${id} level A1`, lesson.level === 'A1')
    assert(`${id} pathId`, lesson.pathId === `japanese-a1-practical-${pathNumber}`)

    const core = v.corePhrase.targetText
    const concat = v.chunks.map((c) => c.targetText).join(' ')
    assert(`${id} chunks concat == corePhrase`, concat === core, { concat, core })
    assert(`${id} no chunk edge whitespace`, v.chunks.every((c) => c.targetText === c.targetText.trim()))
    assert(`${id} chunk count 2..4`, v.chunks.length >= 2 && v.chunks.length <= 4, v.chunks.length)

    // Wakachigaki hygiene
    assert(`${id} corePhrase has word spacing`, core.includes(' '), core)
    assert(`${id} no space before punctuation`, !/\s[、。？！]/u.test(core), core)
    assert(`${id} no double spaces`, !/\s{2}/.test(core), core)
    const floatingParticles = tokenize(core).filter((t) => ['は', 'を', 'が', 'に', 'で', 'と', 'も', 'か'].includes(t))
    assert(`${id} no floating particles`, floatingParticles.length === 0, floatingParticles)

    const targetFields = [core, ...v.chunks.map((c) => c.targetText), ...v.lessonItems.map((x) => x.targetText), v.typeRecall.answer, v.trophyWord.word, v.trophyWord.example]
    assert(`${id} target fields are Japanese`, targetFields.every(hasJapanese))
    assert(`${id} no romaji/Latin in target fields`, targetFields.every((s) => !hasLatin(s)), targetFields.filter(hasLatin))

    const learnerText = stripAllowedPast([core, v.trophyWord.example].join(' '))
    for (const [name, pattern] of BANNED_TARGET_PATTERNS) {
      assert(`${id} no ${name}`, !pattern.test(learnerText), learnerText)
    }
    neCount += (core.match(/ね[。？]/gu) ?? []).length
    mashouCount += (core.match(/ましょう/gu) ?? []).length
    teimasuCount += (core.match(/て\s*います/gu) ?? []).length

    assert(`${id} build target == corePhrase`, v.build.targetText === core)
    const chipSet = new Set(v.build.chips)
    assert(`${id} every chunk is a chip`, v.chunks.every((c) => chipSet.has(c.targetText)))
    assert(`${id} chips = chunks + 2 distractors, <=6`, v.build.chips.length === v.chunks.length + 2 && v.build.chips.length <= 6, v.build.chips.length)
    assert(`${id} chips unique`, chipSet.size === v.build.chips.length)

    const tr = v.typeRecall
    assert(`${id} recall before+answer+after == corePhrase`, `${tr.before}${tr.answer}${tr.after}` === core, `${tr.before}|${tr.answer}|${tr.after}`)
    assert(`${id} recall acceptedAnswers include answer`, tr.acceptedAnswers.includes(tr.answer))
    if (hasHan(tr.answer)) {
      assert(`${id} recall accepts a kana variant of kanji answer`, tr.acceptedAnswers.some((a) => a !== tr.answer && !hasHan(a)), tr.acceptedAnswers)
    }
    assert(`${id} recall answer not a lone particle`, !['は', 'を', 'が', 'に', 'で', 'と', 'も', 'か'].includes(tr.answer.trim()), tr.answer)
    assert(`${id} recall fallback has 4 choices incl answer`, tr.fallbackChoices.length === 4 && tr.fallbackChoices.includes(tr.answer), tr.fallbackChoices)

    const st = v.speakTarget
    const coreTokens = new Set(tokenize(core))
    assert(`${id} speak language ja-JP`, st.language === 'ja-JP')
    assert(`${id} 3 space-free required tokens`, st.requiredTokens?.length === 3 && st.requiredTokens.every((t) => !t.trim().includes(' ')), st.requiredTokens)
    assert(`${id} required tokens are spaced units of the phrase`, (st.requiredTokens ?? []).every((t) => coreTokens.has(t.replace(/[、。？！]/gu, ''))), st.requiredTokens)
    assert(`${id} speak phrase == corePhrase`, st.targetPhrase === core)
    if (hasHan(core)) {
      assert(`${id} speak accepts an all-kana variant`, (st.acceptedAnswers ?? []).some((a) => !hasHan(a) && hasJapanese(a)), st.acceptedAnswers)
    }

    assert(`${id} 4..6 lessonItems`, v.lessonItems.length >= 4 && v.lessonItems.length <= 6, v.lessonItems.length)
    assert(`${id} item ids unique`, new Set(v.lessonItems.map((x) => x.id)).size === v.lessonItems.length)
    assert(`${id} chunk ids unique`, new Set(v.chunks.map((x) => x.id)).size === v.chunks.length)
    assert(`${id} items acceptedAnswers include target`, v.lessonItems.every((x) => x.acceptedAnswers.includes(x.targetText)))

    const w = v.trophyWord.word
    assert(`${id} trophy is single Japanese word`, hasJapanese(w) && !w.includes(' '), w)
    assert(`${id} trophy has no trailing particle`, w === 'こんにちは' || !/[はをが]$/u.test(w), w)
    assert(`${id} trophy not in existing Japanese corpus`, !existingJapaneseTrophies.has(w), w)
    assert(`${id} trophy unique within draft batch`, !batchTrophies.has(w), { word: w, also: batchTrophies.get(w) })
    batchTrophies.set(w, id)
    // Dictionary-form verb trophies (書く, 待つ) surface conjugated in examples —
    // accept the stem (word minus its final u-row kana) as containment.
    const trophyContained = v.trophyWord.example.includes(w)
      || (w.length >= 2 && /[うくぐすつぬぶむる]$/u.test(w) && v.trophyWord.example.includes(w.slice(0, -1)))
    assert(`${id} trophy example contains word`, trophyContained, { w, ex: v.trophyWord.example })

    const deFields = [v.corePhrase.baseText.de, v.meaning.de, v.sceneCaption.de, lesson.situation.de, v.trophyWord.meaning.de, v.trophyWord.whyThisWord.de]
    const enFields = [v.corePhrase.baseText.en, v.meaning.en, v.sceneCaption.en, lesson.situation.en, v.trophyWord.meaning.en, v.trophyWord.whyThisWord.en]
    assert(`${id} .de fields present`, deFields.every((s) => typeof s === 'string' && s.length > 0))
    assert(`${id} .en fields present`, enFields.every((s) => typeof s === 'string' && s.length > 0))
    assert(`${id} no digraph umlauts in de`, deFields.every((s) => !/\b(ae|oe|ue)[a-z]/.test(s ?? '')))

    assert(`${id} contentStatus draft`, v.contentStatus === 'draft')
  })

  assert(`${label} ne-particle budget <=1`, neCount <= 1, neCount)
  assert(`${label} mashou budget <=2`, mashouCount <= 2, mashouCount)
  assert(`${label} teimasu budget <=1`, teimasuCount <= 1, teimasuCount)
}

console.log(`\n${checks - failures} passed, ${failures} failed (of ${checks})`)
if (failures > 0) process.exit(1)
