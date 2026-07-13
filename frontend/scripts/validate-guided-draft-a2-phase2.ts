/**
 * Mechanical validator for the un-integrated A2 phase-2 draft paths
 * (French / Italian / Portuguese, P1–P10) — mirrors the §5 authoring-contract
 * invariants plus the batch conventions proven on Spanish A2 (single-word speak
 * tokens, chunk/distractor hygiene, cross-corpus trophy uniqueness) and the
 * per-language rules from the tmp\A2_{LANG}_P1_P10_SPEC.md specs (punctuation
 * conventions, elision-safe tokens, Brazilian-variety bans). Paths not yet
 * authored are skipped with a notice.
 *
 * Usage: npx tsx scripts/validate-guided-draft-a2-phase2.ts [french|italian|portuguese]
 */
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

const normalizeWs = (s: string) => s.replace(/\s+/g, ' ').trim()
const tokenize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

type LangConfig = {
  key: string
  targetLanguage: string
  modulePath: string
  exportPrefix: string
  pathIdPrefix: string
  speakLanguage: string
  objectPronouns: string[]
  /** true → require a space before ? and ! (French); false → forbid it (it/pt) */
  spaceBeforePunctuation: boolean
  /** substrings banned anywhere in target text (variety/tense guards) */
  bannedTargetPatterns: Array<{ re: RegExp; why: string }>
}

const CONFIGS: LangConfig[] = [
  {
    key: 'french',
    targetLanguage: 'French',
    modulePath: '../src/data/guided/frenchA2',
    exportPrefix: 'FRENCH_A2_PRACTICAL_',
    pathIdPrefix: 'french-a2-practical-',
    speakLanguage: 'fr-FR',
    objectPronouns: ['le', 'la', 'les', 'lui', 'leur', 'me', 'te', 'se', 'y', 'en'],
    spaceBeforePunctuation: true,
    bannedTargetPatterns: [
      { re: /\bje suis (arrivé|allé|venu|resté|parti)e?\b/i, why: 'être passé composé in learner line (speaker-gender agreement)' },
      { re: /\b(j'étais|c'était)\b/i, why: 'imparfait banned' },
      { re: /\btu\b|\bton\b|\bta\b(?= )/i, why: 'tu register banned (vous throughout)' },
    ],
  },
  {
    key: 'italian',
    targetLanguage: 'Italian',
    modulePath: '../src/data/guided/italianA2',
    exportPrefix: 'ITALIAN_A2_PRACTICAL_',
    pathIdPrefix: 'italian-a2-practical-',
    speakLanguage: 'it-IT',
    objectPronouns: ['lo', 'la', 'le', 'li', 'gli', 'mi', 'ti', 'si', 'ne', 'ci'],
    spaceBeforePunctuation: false,
    bannedTargetPatterns: [
      { re: /\bsono (arrivat|andat|venut|stat|rimast)[oa]\b/i, why: 'essere passato prossimo in learner line (speaker-gender agreement)' },
      { re: /\b(ero|stavo)\b/i, why: 'imperfetto banned' },
      { re: /\bscusa\b/i, why: 'tu register banned (Lei throughout)' },
    ],
  },
  {
    key: 'portuguese',
    targetLanguage: 'Portuguese',
    modulePath: '../src/data/guided/portugueseA2',
    exportPrefix: 'PORTUGUESE_A2_PRACTICAL_',
    pathIdPrefix: 'portuguese-a2-practical-',
    speakLanguage: 'pt-BR',
    objectPronouns: ['o', 'a', 'os', 'as', 'me', 'te', 'se', 'lhe', 'nos'],
    spaceBeforePunctuation: false,
    bannedTargetPatterns: [
      { re: /\b(autocarro|comboio|telemóvel|pequeno-almoço)\b/i, why: 'European Portuguese banned (Brazilian corpus)' },
      { re: /casa de banho/i, why: 'European Portuguese banned (Brazilian corpus)' },
      { re: /\btenho (pagado|pedido|comprado|comido|dormido|falado)\b/i, why: 'compound perfect banned in BR (iterative meaning)' },
      { re: /\bdesculpa\b/, why: 'tu-imperative apology banned (use desculpe)' },
      { re: /\bo senhor\b|\ba senhora\b/i, why: 'senhor/senhora register banned (você throughout)' },
    ],
  },
]

const filter = process.argv[2]?.toLowerCase()

for (const cfg of CONFIGS) {
  if (filter && cfg.key !== filter) continue

  let mod: Record<string, unknown>
  try {
    mod = (await import(cfg.modulePath)) as Record<string, unknown>
  } catch (error) {
    assert(`${cfg.key} module imports cleanly`, false, String(error).split('\n')[0])
    continue
  }

  // existing trophies for this language (A1 corpus; draft paths excluded so the
  // check stays meaningful after integration into GUIDED_LESSONS)
  const draftPathIds = new Set(Array.from({ length: 10 }, (_, i) => `${cfg.pathIdPrefix}${i + 1}`))
  const existingTrophies = new Set(
    GUIDED_LESSONS.filter((l) => l.targetLanguage === cfg.targetLanguage && !draftPathIds.has(l.pathId)).flatMap((l) =>
      Object.values(l.vibeVariants).map((v) => v?.trophyWord.word.toLowerCase()).filter(Boolean) as string[],
    ),
  )
  const batchTrophies = new Map<string, string>()
  const allLessonIds = new Set<string>()

  for (let pathNumber = 1; pathNumber <= 10; pathNumber++) {
    const exportName = `${cfg.exportPrefix}${pathNumber}_LESSONS`
    const lessons = mod[exportName] as GuidedLessonDefinition[] | undefined
    const label = `${cfg.key} P${pathNumber}`
    if (!lessons) {
      console.log(`SKIP  ${label} not authored yet (${exportName} missing)`)
      continue
    }
    assert(`${label} has 10 lessons`, lessons.length === 10, lessons.length)

    // template-collapse tripwires: captions and distractors must vary across a path
    const captions = lessons.map((l) => l.vibeVariants.bright?.sceneCaption.de ?? '')
    assert(`${label} sceneCaptions vary across path`, new Set(captions).size >= 8, captions.slice(0, 3))
    const distractorSets = lessons.map((l) => (l.vibeVariants.bright?.build.chips ?? []).slice(-2).join('|'))
    assert(`${label} distractors vary across path`, new Set(distractorSets).size >= 6, distractorSets.slice(0, 3))
    const glosses = lessons.flatMap((l) => l.vibeVariants.bright?.lessonItems.map((x) => x.baseText.de) ?? [])
    assert(`${label} term glosses are real (not one repeated placeholder)`, new Set(glosses).size > lessons.length, glosses.slice(0, 3))

    lessons.forEach((lesson, i) => {
      const v = lesson.vibeVariants.bright
      const id = `${label}#${i + 1} ${lesson.id}`
      if (!v) { assert(`${id} has bright variant`, false); return }

      // ids and numbering
      assert(`${id} lessonNumber`, lesson.lessonNumber === i + 1, lesson.lessonNumber)
      assert(`${id} level A2`, lesson.level === 'A2')
      assert(`${id} pathId`, lesson.pathId === `${cfg.pathIdPrefix}${pathNumber}`)
      assert(`${id} slug ASCII kebab`, /^[a-z0-9]+(-[a-z0-9]+)*$/.test(lesson.id.split('-').slice(5).join('-') || ''), lesson.id)
      assert(`${id} lesson id unique in module`, !allLessonIds.has(lesson.id))
      allLessonIds.add(lesson.id)

      // A2 sizing: corePhrase 6–14 words (tokenized; 16 hard cap for punctuation-heavy phrases)
      const coreTokens = tokenize(v.corePhrase.targetText)
      assert(`${id} corePhrase 6..16 tokens (A2 sizing)`, coreTokens.length >= 6 && coreTokens.length <= 16, { n: coreTokens.length, core: v.corePhrase.targetText })

      // chunks concat === corePhrase
      const concat = normalizeWs(v.chunks.map((c) => c.targetText).join(' '))
      assert(`${id} chunks concat == corePhrase`, concat === normalizeWs(v.corePhrase.targetText), { concat, core: v.corePhrase.targetText })
      assert(`${id} chunk count 3..6`, v.chunks.length >= 3 && v.chunks.length <= 6, v.chunks.length)
      const bareFunctionWords = new Set(['le', 'la', 'les', 'un', 'une', 'de', 'du', 'des', 'à', 'au', 'aux', 'en', 'il', 'lo', 'gli', 'i', 'di', 'del', 'della', 'al', 'alla', 'in', 'o', 'a', 'os', 'as', 'um', 'uma', 'no', 'na', 'ao', 'em', 'do', 'da'])
      assert(`${id} no bare article or preposition chunk`, v.chunks.every((c) => !bareFunctionWords.has(c.targetText.toLowerCase().replace(/[.,!?»«]/g, '').trim())), v.chunks.map((c) => c.targetText))

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
      assert(`${id} recall accepts accentless`, tr.acceptedAnswers.includes(stripAccents(tr.answer.toLowerCase())))
      assert(`${id} recall fallback has 4 choices incl answer`, tr.fallbackChoices.length === 4 && tr.fallbackChoices.includes(tr.answer), tr.fallbackChoices)
      const pronouns = new Set(cfg.objectPronouns)
      assert(`${id} recall never blanks an object pronoun`, !pronouns.has(tr.answer.toLowerCase()))
      assert(`${id} recall answer no elision boundary`, !tr.answer.includes("'"), tr.answer)

      // speak target
      const st = v.speakTarget
      const targetTokens = new Set(tokenize(st.targetPhrase))
      assert(`${id} speak language ${cfg.speakLanguage}`, st.language === cfg.speakLanguage, st.language)
      assert(`${id} 3 single-word required tokens`, st.requiredTokens?.length === 3 && st.requiredTokens.every((t) => !t.includes(' ') && !t.includes("'") && !t.includes('-')), st.requiredTokens)
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
      assert(`${id} trophy single word, no clitic/elision`, !/[\s'-]/.test(w), w)
      assert(`${id} trophy not a proper noun (authored lowercase)`, v.trophyWord.word === v.trophyWord.word.toLowerCase(), v.trophyWord.word)
      assert(`${id} trophy not in existing ${cfg.targetLanguage} corpus`, !existingTrophies.has(w), w)
      assert(`${id} trophy unique within draft batch`, !batchTrophies.has(w), { word: w, also: batchTrophies.get(w) })
      batchTrophies.set(w, id)
      assert(`${id} trophy example contains word stem`, v.trophyWord.example.toLowerCase().includes(w.slice(0, Math.max(3, w.length - 2))), { w, ex: v.trophyWord.example })
      assert(`${id} trophy appears in corePhrase`, tokenize(v.corePhrase.targetText).some((t) => t === w || t.startsWith(w.slice(0, Math.max(3, w.length - 2)))), { w, core: v.corePhrase.targetText })

      // punctuation convention
      const texts = [v.corePhrase.targetText, ...v.chunks.map((c) => c.targetText)]
      if (cfg.spaceBeforePunctuation) {
        assert(`${id} space before ?/! (French convention)`, texts.every((s) => !/[^ ][?!]/.test(s)), texts.filter((s) => /[^ ][?!]/.test(s)))
      } else {
        assert(`${id} no space before ?/!`, texts.every((s) => !/ [?!]/.test(s)), texts.filter((s) => / [?!]/.test(s)))
      }

      // per-language target-text bans (variety, register, tense)
      for (const ban of cfg.bannedTargetPatterns) {
        assert(`${id} ban: ${ban.why}`, !ban.re.test(v.corePhrase.targetText), v.corePhrase.targetText)
      }

      // locale hygiene quick screens
      const deFields = [v.corePhrase.baseText.de, v.meaning.de, v.sceneCaption.de, lesson.situation.de, v.trophyWord.meaning.de, v.trophyWord.whyThisWord.de]
      assert(`${id} .de fields present`, deFields.every((s) => typeof s === 'string' && s.length > 0))
      assert(`${id} no digraph umlauts in de`, deFields.every((s) => !/\b(ae|oe|ue)[a-z]/.test(s ?? '')))
      assert(`${id} no slash alternatives`, [v.corePhrase.targetText, v.corePhrase.baseText.de, v.corePhrase.baseText.en].every((s) => !s.includes('/')))
      assert(`${id} scene caption quotes interlocutor line`, /[„“”«»]/.test(v.sceneCaption.de) && /[“”«»"]/.test(v.sceneCaption.en), v.sceneCaption)

      // status draft
      assert(`${id} contentStatus draft`, v.contentStatus === 'draft')
    })
  }
}

console.log(`\n${checks - failures} passed, ${failures} failed (of ${checks})`)
if (failures > 0) process.exit(1)
