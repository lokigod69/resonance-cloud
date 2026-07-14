/**
 * Mechanical validator for the un-integrated A2 draft paths (phase 2:
 * French / Italian / Portuguese; phase 3: German / English, P1–P10) — mirrors
 * the §5 authoring-contract invariants plus the batch conventions proven on
 * Spanish A2 (single-word speak tokens, chunk/distractor hygiene, cross-corpus
 * trophy uniqueness) and the per-language rules from the
 * tmp\A2_{LANG}_P1_P10_SPEC.md specs (punctuation conventions, elision-safe
 * tokens, variety/register/tense bans). Paths not yet authored are skipped
 * with a notice.
 *
 * Base-locale note: fr/it/pt author both .de and .en base fields; German A2 is
 * base-English only (matching German A1), English A2 is base-German only, and
 * Korean A2 carries both (matching Korean A1, baseLanguage German) — the
 * per-config baseLocales drives which fields are required.
 *
 * Usage: npx tsx scripts/validate-guided-draft-a2-phase2.ts [french|italian|portuguese|german|english|korean]
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
  /** true → require a space before ? and ! (French); false → forbid it (it/pt/de/en) */
  spaceBeforePunctuation: boolean
  /** substrings banned anywhere in target text (variety/tense guards) */
  bannedTargetPatterns: Array<{ re: RegExp; why: string }>
  /** which base locales must carry content (fr/it/pt: both; german: en; english: de) */
  baseLocales: Array<'de' | 'en'>
  /** German nouns keep their capital — exempt from the lowercase-trophy rule */
  allowCapitalizedTrophies?: boolean
  /** which typed fallback the recall acceptedAnswers must include: accent-stripped (fr/it/pt), umlaut-digraph (de), or plain lowercase (en/ko — identity for Hangul) */
  recallVariant: 'accentless' | 'digraph' | 'plain'
  /** minimum whitespace-token count for the corePhrase — Korean eojeol agglutinate particles, so Hangul phrases carry fewer tokens (default 6) */
  minCoreTokens?: number
}

const toDigraph = (s: string) => s
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
  .replace(/ß/g, 'ss')

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
    baseLocales: ['de', 'en'],
    recallVariant: 'accentless',
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
    baseLocales: ['de', 'en'],
    recallVariant: 'accentless',
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
    baseLocales: ['de', 'en'],
    recallVariant: 'accentless',
  },
  {
    key: 'german',
    targetLanguage: 'German',
    modulePath: '../src/data/guided/germanA2',
    exportPrefix: 'GERMAN_A2_PRACTICAL_',
    pathIdPrefix: 'german-a2-practical-',
    speakLanguage: 'de-DE',
    objectPronouns: ['ihn', 'sie', 'es', 'mir', 'mich', 'dir', 'dich', 'ihm', 'ihr', 'ihnen', 'uns'],
    spaceBeforePunctuation: false,
    bannedTargetPatterns: [
      { re: /\bich werde\b/i, why: 'werden-future banned (present + time expression)' },
      { re: /\b(ging|kam|sah|nahm|stand|fuhr|aß|blieb|wusste|dachte|brachte)\b/i, why: 'Präteritum banned except war/hatte' },
      { re: /\b(ae|oe|ue)[a-zäöü]/i, why: 'umlaut digraph in German target text' },
      { re: /\b(hi|sorry)\b/i, why: 'English leak in German target text' },
    ],
    baseLocales: ['en'],
    allowCapitalizedTrophies: true,
    recallVariant: 'digraph',
  },
  {
    key: 'english',
    targetLanguage: 'English',
    modulePath: '../src/data/guided/englishA2',
    exportPrefix: 'ENGLISH_A2_PRACTICAL_',
    pathIdPrefix: 'english-a2-practical-',
    speakLanguage: 'en-US',
    objectPronouns: ['it', 'them', 'him', 'her', 'me', 'us'],
    spaceBeforePunctuation: false,
    bannedTargetPatterns: [
      { re: /\b(colour|favourite|centre|theatre|apologise|organise|queue|takeaway|petrol|fortnight|cinema\b.*queue)\b/i, why: 'British variety banned (American corpus, en-US)' },
      { re: /\bwill\b/i, why: 'will-future banned (going to; contracted I\'ll allowed as fixed chunk)' },
      { re: /\bhave you ever\b/i, why: 'experiential present perfect banned (B1)' },
    ],
    baseLocales: ['de'],
    recallVariant: 'plain',
  },
  {
    key: 'korean',
    targetLanguage: 'Korean',
    modulePath: '../src/data/guided/koreanA2',
    exportPrefix: 'KOREAN_A2_PRACTICAL_',
    pathIdPrefix: 'korean-a2-practical-',
    speakLanguage: 'ko-KR',
    objectPronouns: ['이거', '그거', '저거', '이것', '그것', '저것', '저', '뭐', '네', '아니요'],
    spaceBeforePunctuation: false,
    bannedTargetPatterns: [
      { re: /(?<!알겠)습니다/, why: '습니다-paradigm banned beyond fixed chunks (해요체 throughout)' },
      { re: /(?<!죄송|감사|알겠)합니다/, why: '합니다-form banned beyond 죄송/감사/알겠 fixed chunks' },
      { re: /십시오/, why: '-십시오 imperative banned (해요체 requests with 주세요)' },
      { re: /(?<!알)겠/, why: '-겠- banned (future = -(으)ㄹ 거예요; 알겠- fixed chunk allowed)' },
      { re: /\b(hi|sorry|okay|ok)\b/i, why: 'English leak in Korean target text' },
    ],
    baseLocales: ['de', 'en'],
    recallVariant: 'plain',
    minCoreTokens: 5,
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
    const primaryLocale = cfg.baseLocales[0]
    const captions = lessons.map((l) => l.vibeVariants.bright?.sceneCaption[primaryLocale] ?? '')
    assert(`${label} sceneCaptions vary across path`, new Set(captions).size >= 8, captions.slice(0, 3))
    const distractorSets = lessons.map((l) => (l.vibeVariants.bright?.build.chips ?? []).slice(-2).join('|'))
    assert(`${label} distractors vary across path`, new Set(distractorSets).size >= 6, distractorSets.slice(0, 3))
    const glosses = lessons.flatMap((l) => l.vibeVariants.bright?.lessonItems.map((x) => x.baseText[primaryLocale]) ?? [])
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

      // A2 sizing: corePhrase 6–14 words (tokenized; 16 hard cap for punctuation-heavy phrases; Korean eojeol pack particles, so its floor is lower)
      const minCoreTokens = cfg.minCoreTokens ?? 6
      const coreTokens = tokenize(v.corePhrase.targetText)
      assert(`${id} corePhrase ${minCoreTokens}..16 tokens (A2 sizing)`, coreTokens.length >= minCoreTokens && coreTokens.length <= 16, { n: coreTokens.length, core: v.corePhrase.targetText })

      // chunks concat === corePhrase
      const concat = normalizeWs(v.chunks.map((c) => c.targetText).join(' '))
      assert(`${id} chunks concat == corePhrase`, concat === normalizeWs(v.corePhrase.targetText), { concat, core: v.corePhrase.targetText })
      assert(`${id} chunk count 3..6`, v.chunks.length >= 3 && v.chunks.length <= 6, v.chunks.length)
      const bareFunctionWords = new Set(['le', 'la', 'les', 'un', 'une', 'de', 'du', 'des', 'à', 'au', 'aux', 'en', 'il', 'lo', 'gli', 'i', 'di', 'del', 'della', 'al', 'alla', 'in', 'o', 'a', 'os', 'as', 'um', 'uma', 'no', 'na', 'ao', 'em', 'do', 'da', 'der', 'die', 'das', 'ein', 'eine', 'einen', 'einem', 'einer', 'dem', 'den', 'zu', 'zum', 'zur', 'im', 'am', 'ins', 'the', 'an', 'to', 'at', 'of', 'for'])
      assert(`${id} no bare article or preposition chunk`, v.chunks.every((c) => !bareFunctionWords.has(c.targetText.toLowerCase().replace(/[.,!?»«]/g, '').trim())), v.chunks.map((c) => c.targetText))
      assert(`${id} chunk texts have no leading/trailing whitespace`, v.chunks.every((c) => c.targetText === c.targetText.trim()), v.chunks.map((c) => c.targetText).filter((t) => t !== t.trim()))

      // build
      assert(`${id} build target == corePhrase`, v.build.targetText === v.corePhrase.targetText)
      const chipSet = new Set(v.build.chips)
      assert(`${id} every chunk is a chip`, v.chunks.every((c) => chipSet.has(c.targetText)))
      assert(`${id} chips = chunks + 2 distractors, <=7`, v.build.chips.length === v.chunks.length + 2 && v.build.chips.length <= 7, v.build.chips.length)
      assert(`${id} chips unique`, chipSet.size === v.build.chips.length)
      assert(`${id} chips have no leading/trailing whitespace`, v.build.chips.every((c) => c === c.trim()), v.build.chips.filter((c) => c !== c.trim()))

      // typeRecall
      const tr = v.typeRecall
      assert(`${id} recall before+answer+after == corePhrase`, `${tr.before}${tr.answer}${tr.after}` === v.corePhrase.targetText, `${tr.before}|${tr.answer}|${tr.after}`)
      assert(`${id} recall acceptedAnswers include answer`, tr.acceptedAnswers.includes(tr.answer))
      assert(`${id} recall accepts lowercase`, tr.acceptedAnswers.includes(tr.answer.toLowerCase()))
      const recallFallback = cfg.recallVariant === 'accentless' ? stripAccents(tr.answer.toLowerCase())
        : cfg.recallVariant === 'digraph' ? toDigraph(tr.answer).toLowerCase()
        : tr.answer.toLowerCase()
      assert(`${id} recall accepts ${cfg.recallVariant} typed fallback`, tr.acceptedAnswers.includes(recallFallback))
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
      if (!cfg.allowCapitalizedTrophies) {
        assert(`${id} trophy not a proper noun (authored lowercase)`, v.trophyWord.word === v.trophyWord.word.toLowerCase(), v.trophyWord.word)
      }
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

      // locale hygiene quick screens (per-config base locales; situation is
      // bilingual by type for every language, so its .de is always screened)
      for (const locale of cfg.baseLocales) {
        const fields = [v.corePhrase.baseText[locale], v.meaning[locale], v.sceneCaption[locale], lesson.situation[locale], v.trophyWord.meaning[locale], v.trophyWord.whyThisWord[locale]]
        assert(`${id} .${locale} fields present`, fields.every((s) => typeof s === 'string' && s.length > 0))
      }
      const deScreened = cfg.baseLocales.includes('de')
        ? [v.corePhrase.baseText.de, v.meaning.de, v.sceneCaption.de, lesson.situation.de, v.trophyWord.meaning.de, v.trophyWord.whyThisWord.de]
        : [lesson.situation.de]
      assert(`${id} no digraph umlauts in de`, deScreened.every((s) => !/\b(ae|oe|ue)[a-z]/.test(s ?? '')))
      assert(`${id} situation.de present`, typeof lesson.situation.de === 'string' && lesson.situation.de.length > 0)
      assert(`${id} no slash alternatives`, [v.corePhrase.targetText, v.corePhrase.baseText.de, v.corePhrase.baseText.en].every((s) => !(s ?? '').includes('/')))
      assert(`${id} scene caption quotes interlocutor line`, cfg.baseLocales.every((locale) => /[„“”«»"]/.test(v.sceneCaption[locale] ?? '')), v.sceneCaption)

      // status draft
      assert(`${id} contentStatus draft`, v.contentStatus === 'draft')
    })
  }
}

console.log(`\n${checks - failures} passed, ${failures} failed (of ${checks})`)
if (failures > 0) process.exit(1)
