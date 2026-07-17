/**
 * Russian A2 — the Regular tier (10 paths × 10 lessons), per
 * docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md (§4 integration, §5 authoring
 * contract), the spec in tmp\A2_RUSSIAN_P1_P10_SPEC.md, and the per-path
 * voice-gender plan in tmp\A2_RUSSIAN_VOICE_GENDER_PLAN.md.
 *
 * Authoring contract highlights enforced in this module:
 * - Base locales are GERMAN + ENGLISH (matching Russian A1, baseLanguage
 *   'German'): every GuidedBaseContentText field carries both .de and .en.
 * - Two-turn shape: sceneCaption carries the interlocutor's Russian line quoted
 *   inside both base-locale captions; the learner's corePhrase is the response.
 * - Register: вы in ALL 10 paths (matching A1) — ты-forms are out of scope.
 * - VOICE-GENDER PLAN (inverted Polish §5.3 — the plan dictates the future TTS
 *   roster): narrator gender alternates per path, odd paths FEMALE, even paths
 *   MALE (P3/P9 female past -ла, P10 male Я приехал). Every speaker-agreeing
 *   form (past -л/-ла, short adjectives рад/рада, должен/должна…) matches the
 *   path's gender in canonical text; `genderForms` on a lesson generates the
 *   swapped-gender variants as accepted input so the other-gender learner is
 *   never punished. Conditionals with бы are banned outright. The future tense
 *   (буду + inf, perfective non-past) is gender-free and unrestricted.
 * - ё is written where it belongs in target text; every typed answer also
 *   accepts the е-spelling (and the diacritic-stripped fold the shared A2
 *   validator requires).
 * - Numbers are words, never digits; case agreement after numerals (два яблока,
 *   пять минут) is a line-by-line review checkpoint.
 * - Trophies unique across the entire Russian guided corpus (A1 + A2).
 * - TTS-FROZEN (2026-07-17): the bright ElevenLabs batch ran for all 10 paths
 *   (profiles russian_a2_bright_p{n}_multiv2_v1). The per-path narrator gender
 *   from tmp\A2_RUSSIAN_VOICE_GENDER_PLAN.md is now realised in the roster —
 *   odd paths female (Nina/Maria), even paths male (Mark/Alan). ids and
 *   TTS-bearing text (corePhrase/chunks/trophyWord) must NOT change without a
 *   regeneration plan; the per-path voice gender is locked to the canon.
 */
import type {
  GuidedBaseContentText,
  GuidedLessonDefinition,
  GuidedLessonStep,
  GuidedLessonTrophyWord,
  GuidedLessonVibeVariant,
  GuidedPathMetadata,
  LessonItem,
  PhraseChunk,
} from '../guidedLessons'
import { DEFAULT_GUIDED_VIBE_ID } from '../guidedVibes'

const RUSSIAN_A2_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

type RussianA2VariantInput = {
  corePhrase: GuidedLessonVibeVariant['corePhrase']
  meaning: GuidedBaseContentText
  chunks: PhraseChunk[]
  lessonItems: LessonItem[]
  buildChips: string[]
  typeRecall: GuidedLessonVibeVariant['typeRecall']
  speakTarget: Omit<GuidedLessonVibeVariant['speakTarget'], 'language' | 'passingThreshold' | 'maxRecordingSeconds'>
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

export type RussianA2LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightRussianA2Variant(input: RussianA2VariantInput): GuidedLessonVibeVariant {
  return {
    contentStatus: 'draft',
    corePhrase: input.corePhrase,
    meaning: input.meaning,
    chunks: input.chunks,
    lessonItems: input.lessonItems,
    build: {
      targetText: input.corePhrase.targetText,
      chips: input.buildChips,
    },
    typeRecall: input.typeRecall,
    speakTarget: {
      ...input.speakTarget,
      language: 'ru-RU',
      // matches Russian A1's STT tolerance
      passingThreshold: 0.65,
      maxRecordingSeconds: 12,
    },
    sceneCaption: input.sceneCaption,
    trophyWord: input.trophyWord,
    placeholderMedia: {
      type: 'video',
      caption: input.placeholderCaption,
    },
    songSeed: {
      genre: 'bright Russian acoustic',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

export function makeRussianA2PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: RussianA2LessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('russian-a2-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `russian-a2-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
    const nextInput = inputs[index + 1]

    return {
      id,
      pathId: metadata.id,
      courseTitle: metadata.title,
      level: metadata.level,
      lessonNumber,
      baseLanguage: metadata.baseLanguage,
      targetLanguage: metadata.targetLanguage,
      pathMetadata: metadata,
      lessonMetadata: {
        id,
        sequence: lessonNumber,
        title: lessonInput.title,
      },
      title: lessonInput.title,
      situation: lessonInput.situation,
      pedagogicalGoal: lessonInput.pedagogicalGoal,
      modeSet: 'guided-today-v0',
      steps: RUSSIAN_A2_GUIDED_TODAY_STEPS,
      estimatedMinutes: 5,
      fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
      status: 'active',
      nextLessonTeaser: {
        title: nextInput?.title ?? { de: 'Pfad abgeschlossen', en: 'Path complete' },
        situation: {
          de: nextInput?.situation.de ?? completionSituation.de,
          en: nextInput?.situation.en ?? completionSituation.en,
        },
      },
      vibeVariants: {
        bright: lessonInput.variant,
      },
    }
  })
}

export type RussianA2CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  targetText: string
  baseText: GuidedBaseContentText
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  /** alsoAccept = extra accepted typed spellings (e.g. the swapped-gender form when the term itself is a gendered verb). */
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText; alsoAccept?: string[] }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[] }
  /** Exactly three salient single words from the corePhrase, punctuation-free, never a gendered form. */
  speakRequired: [string, string, string]
  /** Declared when the corePhrase carries a speaker-gendered form: `voiced` is the
   * canonical (path-gender) surface form, `other` the swapped-gender form. The
   * scaffold accepts the swapped full phrase for the speak step mechanically. */
  genderForms?: { voiced: string; other: string }
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

const foldYo = (text: string) => text.replace(/ё/g, 'е').replace(/Ё/g, 'Е')
const stripMarks = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Accepted answers: exact, lowercase, е-for-ё fold, diacritic-stripped fold (validator contract), plus declared extras. */
function russianA2Answers(text: string, alsoAccept: string[] = []): string[] {
  const lower = text.toLowerCase()
  return [...new Set([text, lower, foldYo(lower), stripMarks(lower), ...alsoAccept.flatMap((a) => [a, a.toLowerCase(), foldYo(a.toLowerCase())])])]
}

function russianA2SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
  const requiredTokens = required.map((token) => token.toLowerCase())
  const optionalTokens = [...new Set(
    targetText
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !requiredTokens.includes(word)),
  )]
  return { requiredTokens, optionalTokens }
}

export function makeRussianA2CompactLesson(input: RussianA2CompactLesson): RussianA2LessonInput {
  const prefix = input.slug.split('-')[0]
  const speakAccepted = [input.targetText, foldYo(input.targetText)]
  if (input.genderForms && input.targetText.includes(input.genderForms.voiced)) {
    const swapped = input.targetText.replace(input.genderForms.voiced, input.genderForms.other)
    speakAccepted.push(swapped, foldYo(swapped))
  }
  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: makeBrightRussianA2Variant({
      corePhrase: { targetText: input.targetText, baseText: input.baseText },
      meaning: input.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map((term, index) => ({
        id: `${prefix}-item-${index + 1}`,
        targetText: term.targetText,
        baseText: term.baseText,
        acceptedAnswers: russianA2Answers(term.targetText, term.alsoAccept),
      })),
      buildChips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      typeRecall: {
        before: input.recall.before,
        answer: input.recall.answer,
        after: input.recall.after,
        acceptedAnswers: russianA2Answers(input.recall.answer),
        fallbackChoices: input.recall.fallbackChoices,
      },
      speakTarget: {
        baseCue: input.baseText,
        targetPhrase: input.targetText,
        acceptedAnswers: [...new Set(speakAccepted)],
        ...russianA2SpeakTokens(input.targetText, input.speakRequired),
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderCaption: input.placeholderCaption,
      songMood: input.songMood,
      visualNotes: input.visualNotes,
    }),
  }
}

export const GUIDED_TODAY_PATH_RUSSIAN_A2_ONE_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-1',
  title: 'Russian A2 Practical 1',
  shortTitle: 'A2 Practical 1',
  subtitle: { de: 'Vertraute Thekengespräche, Mengen und kurze Rückfragen', en: 'Familiar counter exchanges, quantities, and quick follow-up questions' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical1Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'kak-obychno-amerikano', title: { de: 'Wie immer', en: 'The usual' },
    situation: { de: 'Die Barista in deinem Stammcafé erkennt dich und fragt nach deiner üblichen Bestellung. Du bestätigst sie freundlich.', en: 'The barista at your regular cafe recognizes you and asks about your usual order. Confirm it warmly.' },
    pedagogicalGoal: 'Eine vertraute Thekenfrage mit как обычно und einer vollständigen Bestellung beantworten.',
    targetText: 'Да, как обычно, американо, пожалуйста.', baseText: { de: 'Ja, wie immer einen Americano, bitte.', en: 'Yes, an Americano as usual, please.' },
    chunks: [{ targetText: 'Да, как обычно,', baseText: { de: 'Ja, wie immer,', en: 'Yes, as usual,' } }, { targetText: 'американо,', baseText: { de: 'einen Americano,', en: 'an Americano,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'как обычно', baseText: { de: 'wie gewöhnlich, wie immer', en: 'as usual' } }, { targetText: 'американо', baseText: { de: 'Americano', en: 'Americano' } }, { targetText: 'обычно', baseText: { de: 'gewöhnlich', en: 'usually' } }, { targetText: 'пожалуйста', baseText: { de: 'bitte', en: 'please' } }, { targetText: 'кофе', baseText: { de: 'Kaffee', en: 'coffee' } }],
    recall: { before: 'Да, как обычно, ', answer: 'американо', after: ', пожалуйста.', fallbackChoices: ['американо', 'латте', 'капучино', 'какао'] }, speakRequired: ['обычно', 'американо', 'пожалуйста'],
    sceneCaption: { de: 'Die Barista greift schon nach einer Tasse und fragt: „Вам как обычно?“', en: 'The barista already reaches for a cup and asks: “Вам как обычно?”' },
    trophyWord: { word: 'американо', meaning: { de: 'Americano', en: 'Americano' }, example: 'Американо без сахара, пожалуйста.', whyThisWord: { de: 'Американо macht aus der vertrauten Rückfrage sofort deine konkrete Stamm-Bestellung.', en: 'Американо turns the familiar prompt into your specific regular order immediately.' } },
    distractors: ['Сегодня без кофе,', 'два чая.'], placeholderCaption: { de: 'Auf dem Tresen steht die vertraute Americano-Tasse neben der startbereiten Kaffeemaschine.', en: 'The familiar Americano cup sits on the counter beside the ready coffee machine.' }, songMood: 'a bright familiar coffee ritual returning with an easy nod', visualNotes: 'Warm neighborhood cafe, familiar barista, Americano cup ready, relaxed recognition across the counter.',
  }),
  makeRussianA2CompactLesson({
    slug: 's-soboy-skolko-s-menya', title: { de: 'Zum Mitnehmen und der Preis', en: 'To go and the total' },
    situation: { de: 'Die Barista fragt, ob du hier trinkst oder den Becher mitnimmst. Du wählst Mitnehmen und fragst nach dem Betrag.', en: 'The barista asks whether you will drink here or take the cup away. Choose to go and ask for the amount.' },
    pedagogicalGoal: 'Die feste Mitnahmephrase с собой mit der natürlichen Preisfrage Сколько с меня? verbinden.',
    targetText: 'Кофе с собой, пожалуйста. Сколько с меня?', baseText: { de: 'Den Kaffee zum Mitnehmen, bitte. Wie viel macht das?', en: 'The coffee to go, please. How much do I owe?' },
    chunks: [{ targetText: 'Кофе с собой,', baseText: { de: 'Den Kaffee zum Mitnehmen,', en: 'The coffee to go,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }, { targetText: 'Сколько с меня?', baseText: { de: 'Wie viel macht das?', en: 'How much do I owe?' } }],
    terms: [{ targetText: 'с собой', baseText: { de: 'zum Mitnehmen; wörtlich: mit sich', en: 'to go; literally: with oneself' } }, { targetText: 'сколько с меня', baseText: { de: 'wie viel macht das für mich', en: 'how much do I owe' } }, { targetText: 'напиток', baseText: { de: 'Getränk', en: 'drink' } }, { targetText: 'стоимость', baseText: { de: 'Kosten, Preis', en: 'cost, price' } }, { targetText: 'стакан', baseText: { de: 'Becher, Glas', en: 'cup, glass' } }],
    recall: { before: 'Кофе с ', answer: 'собой', after: ', пожалуйста. Сколько с меня?', fallbackChoices: ['собой', 'молоком', 'лимоном', 'сахаром'] }, speakRequired: ['Кофе', 'собой', 'Сколько'],
    sceneCaption: { de: 'Die Barista hält einen Becher mit Deckel hoch und fragt: „Здесь или с собой?“', en: 'The barista holds up a lidded cup and asks: “Здесь или с собой?”' },
    trophyWord: { word: 'собой', meaning: { de: 'mit sich; in с собой: zum Mitnehmen', en: 'with oneself; in с собой: to go' }, example: 'Возьмите кофе с собой.', whyThisWord: { de: 'Собой kennzeichnet genau die Mitnahmeoption, bevor du nach dem Gesamtbetrag fragst.', en: 'Собой marks the takeaway option precisely before you ask for the total.' } },
    distractors: ['Здесь за столиком.', 'Платить отдельно?'], placeholderCaption: { de: 'Ein verschlossener Kaffeebecher steht neben dem Kassendisplay mit dem noch offenen Betrag.', en: 'A sealed coffee cup stands beside the register display with the amount still open.' }, songMood: 'a brisk takeaway choice followed by a clear checkout question', visualNotes: 'Cafe checkout, lidded cup, customer ready to leave, register waiting to show the total.',
  }),
  makeRussianA2CompactLesson({
    slug: 'turisticheskaya-sim-karta', title: { de: 'SIM-Karte für Touristen', en: 'A tourist SIM card' },
    situation: { de: 'In einem Telefonladen bietet ein Mitarbeiter Hilfe an. Du fragst gezielt nach einer Touristen-SIM mit Internet.', en: 'A staff member in a phone shop offers help. Ask specifically for a tourist SIM with internet.' },
    pedagogicalGoal: 'Mit У вас есть…? nach einem konkreten technischen Produkt und seiner Ausstattung fragen.',
    targetText: 'У вас есть туристическая сим-карта с интернетом?', baseText: { de: 'Haben Sie eine Touristen-SIM-Karte mit Internet?', en: 'Do you have a tourist SIM card with internet?' },
    chunks: [{ targetText: 'У вас есть', baseText: { de: 'Haben Sie', en: 'Do you have' } }, { targetText: 'туристическая сим-карта', baseText: { de: 'eine Touristen-SIM-Karte', en: 'a tourist SIM card' } }, { targetText: 'с интернетом?', baseText: { de: 'mit Internet?', en: 'with internet?' } }],
    terms: [{ targetText: 'сим-карта', baseText: { de: 'SIM-Karte', en: 'SIM card' } }, { targetText: 'туристический', baseText: { de: 'für Touristen', en: 'for tourists' } }, { targetText: 'интернет', baseText: { de: 'Internet', en: 'internet' } }, { targetText: 'связь', baseText: { de: 'Verbindung, Mobilfunk', en: 'connection, mobile service' } }, { targetText: 'тариф', baseText: { de: 'Tarif', en: 'plan, tariff' } }],
    recall: { before: 'У вас есть ', answer: 'туристическая', after: ' сим-карта с интернетом?', fallbackChoices: ['туристическая', 'банковская', 'городская', 'домашняя'] }, speakRequired: ['есть', 'туристическая', 'интернетом'],
    sceneCaption: { de: 'Der Mitarbeiter zeigt auf die Zubehörwand und fragt: „Что вы ищете?“', en: 'The staff member gestures toward the accessories wall and asks: “Что вы ищете?”' },
    trophyWord: { word: 'турист', meaning: { de: 'Tourist', en: 'tourist' }, example: 'Турист спрашивает о сим-карте.', whyThisWord: { de: 'Der Wortstamm турист macht klar, dass du keinen langfristigen Vertrag, sondern ein passendes Reiseprodukt suchst.', en: 'The турист stem makes clear that you need a suitable travel product rather than a long-term contract.' } },
    distractors: ['обычный телефон', 'зарядка для машины'], placeholderCaption: { de: 'Mehrere Touristen-SIM-Pakete liegen neben einer kleinen Karte mit Datenvolumen.', en: 'Several tourist SIM packs sit beside a small card showing data allowances.' }, songMood: 'a practical phone-shop exchange opening a reliable city connection', visualNotes: 'Bright phone shop, tourist SIM packs, data icons, staff pointing to the correct shelf.',
  }),
  makeRussianA2CompactLesson({
    slug: 'skolko-minut-do-banka', title: { de: 'Wie viele Minuten?', en: 'How many minutes?' },
    situation: { de: 'Die Hotelmitarbeiterin sagt nur, die Bank sei ganz in der Nähe. Du fragst nach einer brauchbaren Gehzeit.', en: 'The hotel clerk only says the bank is very close. Ask for a useful walking estimate.' },
    pedagogicalGoal: 'Eine vage Entfernungsangabe mit сколько минут пешком und dem Genitiv nach до präzisieren.',
    targetText: 'А сколько минут пешком до банка?', baseText: { de: 'Und wie viele Minuten sind es zu Fuß bis zur Bank?', en: 'And how many minutes is it on foot to the bank?' },
    chunks: [{ targetText: 'А сколько минут', baseText: { de: 'Und wie viele Minuten', en: 'And how many minutes' } }, { targetText: 'пешком', baseText: { de: 'zu Fuß', en: 'on foot' } }, { targetText: 'до банка?', baseText: { de: 'bis zur Bank?', en: 'to the bank?' } }],
    terms: [{ targetText: 'сколько минут', baseText: { de: 'wie viele Minuten', en: 'how many minutes' } }, { targetText: 'пешком', baseText: { de: 'zu Fuß', en: 'on foot' } }, { targetText: 'банк', baseText: { de: 'Bank', en: 'bank' } }, { targetText: 'до банка', baseText: { de: 'bis zur Bank; Genitiv nach до', en: 'to the bank; genitive after до' } }, { targetText: 'расстояние', baseText: { de: 'Entfernung', en: 'distance' } }],
    recall: { before: 'А сколько минут пешком до ', answer: 'банка', after: '?', fallbackChoices: ['банка', 'парка', 'моста', 'рынка'] }, speakRequired: ['сколько', 'минут', 'банка'],
    sceneCaption: { de: 'Die Mitarbeiterin zeigt aus der Lobbytür und sagt: „Это совсем рядом.“', en: 'The clerk points through the lobby door and says: “Это совсем рядом.”' },
    trophyWord: { word: 'банк', meaning: { de: 'Bank', en: 'bank' }, example: 'Банк находится в конце улицы.', whyThisWord: { de: 'Банк gibt der Gehzeitfrage ein konkretes Ziel und übt zugleich die Form банка nach до.', en: 'Банк gives the walking-time question a concrete destination and also practices банка after до.' } },
    distractors: ['На автобусе', 'после обеда?'], placeholderCaption: { de: 'Von der Hoteltür führt ein Gehweg zu einem sichtbaren Bankschild zwei Häuser weiter.', en: 'A sidewalk leads from the hotel door to a visible bank sign two buildings away.' }, songMood: 'a vague nearby direction becoming a measurable city walk', visualNotes: 'Hotel entrance, bank sign down the block, clerk pointing while the traveler checks the walking distance.',
  }),
  makeRussianA2CompactLesson({
    slug: 'vkusno-prinesite-schyot', title: { de: 'Alles gut und die Rechnung', en: 'All good and the bill' },
    situation: { de: 'Nach dem Essen fragt die Bedienung, ob alles in Ordnung ist. Du bestätigst es und bittest um die Rechnung.', en: 'After the meal, the server asks whether everything is all right. Confirm it and ask for the bill.' },
    pedagogicalGoal: 'Eine positive Rückmeldung mit einem höflichen perfektiven вы-Imperativ für die Rechnung verbinden.',
    targetText: 'Да, всё очень вкусно. Принесите счёт, пожалуйста.', baseText: { de: 'Ja, alles ist sehr lecker. Bringen Sie bitte die Rechnung.', en: 'Yes, everything is very tasty. Please bring the bill.' },
    chunks: [{ targetText: 'Да, всё очень вкусно.', baseText: { de: 'Ja, alles ist sehr lecker.', en: 'Yes, everything is very tasty.' } }, { targetText: 'Принесите счёт,', baseText: { de: 'Bringen Sie die Rechnung,', en: 'Bring the bill,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'вкусно', baseText: { de: 'lecker', en: 'tasty' } }, { targetText: 'принести', baseText: { de: 'bringen', en: 'to bring' } }, { targetText: 'счёт', baseText: { de: 'Rechnung', en: 'bill' } }, { targetText: 'ресторан', baseText: { de: 'Restaurant', en: 'restaurant' } }, { targetText: 'ужин', baseText: { de: 'Abendessen', en: 'dinner' } }],
    recall: { before: 'Да, всё очень ', answer: 'вкусно', after: '. Принесите счёт, пожалуйста.', fallbackChoices: ['вкусно', 'уютно', 'чисто', 'быстро'] }, speakRequired: ['вкусно', 'Принесите', 'счёт'],
    sceneCaption: { de: 'Die Bedienung räumt den letzten Teller ab und fragt: „Всё хорошо?“', en: 'The server clears the last plate and asks: “Всё хорошо?”' },
    trophyWord: { word: 'принести', meaning: { de: 'bringen', en: 'to bring' }, example: 'Можете принести счёт?', whyThisWord: { de: 'Принести liefert das Handlungsverb für deine nächste höfliche Bitte nach dem positiven Urteil.', en: 'Принести supplies the action verb for your next polite request after the positive verdict.' } },
    distractors: ['Меню уже закрыто.', 'Добавьте ещё суп.'], placeholderCaption: { de: 'Abgeräumte Teller liegen neben einer geschlossenen Rechnungsmappe am Tischrand.', en: 'Cleared plates sit beside a closed bill folder at the edge of the table.' }, songMood: 'a satisfying meal closing with a confident polite request', visualNotes: 'Cozy restaurant table after dinner, cleared plates, server listening, bill folder nearby.',
  }),
  makeRussianA2CompactLesson({
    slug: 'bron-familiya-martin', title: { de: 'Reservierung unter Martin', en: 'A booking under Martin' },
    situation: { de: 'An der Hotelrezeption wirst du nach der Reservierung und dem Namen gefragt. Du nennst beides klar.', en: 'At hotel reception, you are asked about the booking and the name. State both clearly.' },
    pedagogicalGoal: 'Eine vorhandene бронь nennen und die eigene фамилия als Identifikationsangabe ergänzen.',
    targetText: 'У меня бронь. Моя фамилия — Мартин.', baseText: { de: 'Ich habe eine Reservierung. Mein Nachname ist Martin.', en: 'I have a booking. My surname is Martin.' },
    chunks: [{ targetText: 'У меня бронь.', baseText: { de: 'Ich habe eine Reservierung.', en: 'I have a booking.' } }, { targetText: 'Моя фамилия —', baseText: { de: 'Mein Nachname ist', en: 'My surname is' } }, { targetText: 'Мартин.', baseText: { de: 'Martin.', en: 'Martin.' } }],
    terms: [{ targetText: 'бронь', baseText: { de: 'Reservierung', en: 'booking' } }, { targetText: 'фамилия', baseText: { de: 'Nachname', en: 'surname' } }, { targetText: 'под фамилией', baseText: { de: 'unter dem Nachnamen; Instrumental', en: 'under the surname; instrumental' } }, { targetText: 'рецепшен', baseText: { de: 'Rezeption', en: 'reception desk' } }, { targetText: 'паспорт', baseText: { de: 'Reisepass', en: 'passport' } }],
    recall: { before: 'У меня бронь. Моя ', answer: 'фамилия', after: ' — Мартин.', fallbackChoices: ['фамилия', 'компания', 'группа', 'комната'] }, speakRequired: ['бронь', 'фамилия', 'Мартин'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Buchungsliste und fragt: „На какую фамилию бронь?“', en: 'The receptionist opens the booking list and asks: “На какую фамилию бронь?”' },
    trophyWord: { word: 'фамилия', meaning: { de: 'Nachname', en: 'surname' }, example: 'Ваша фамилия есть в списке.', whyThisWord: { de: 'Фамилия ist die entscheidende Angabe, mit der die Rezeption deine бронь in der Liste findet.', en: 'Фамилия is the key detail reception uses to find your бронь in the list.' } },
    distractors: ['Мне нужен столик.', 'Ваш паспорт готов.'], placeholderCaption: { de: 'Auf dem Rezeptionsbildschirm ist eine Buchungszeile geöffnet, daneben liegt eine leere Schlüsselkarte.', en: 'A booking row is open on the reception screen beside a blank key card.' }, songMood: 'a calm hotel check-in resolved by one clear surname', visualNotes: 'Hotel front desk, booking list, key card waiting, traveler giving the surname clearly.',
  }),
  makeRussianA2CompactLesson({
    slug: 'eto-vsyo-skolko-vsego', title: { de: 'Das ist alles', en: 'That is all' },
    situation: { de: 'In der Apotheke fragt die Mitarbeiterin, ob du noch etwas brauchst. Du schließt den Einkauf ab und fragst nach dem Gesamtpreis.', en: 'At the pharmacy, the staff member asks whether you need anything else. Close the purchase and ask for the total.' },
    pedagogicalGoal: 'Eine Zusatzfrage verneinen und mit Сколько всего? natürlich zum Gesamtbetrag übergehen.',
    targetText: 'Нет, это всё. Сколько всего?', baseText: { de: 'Nein, das ist alles. Wie viel ist es insgesamt?', en: 'No, that is all. How much is it altogether?' },
    chunks: [{ targetText: 'Нет,', baseText: { de: 'Nein,', en: 'No,' } }, { targetText: 'это всё.', baseText: { de: 'das ist alles.', en: 'that is all.' } }, { targetText: 'Сколько всего?', baseText: { de: 'Wie viel ist es insgesamt?', en: 'How much is it altogether?' } }],
    terms: [{ targetText: 'всего', baseText: { de: 'insgesamt', en: 'altogether, in total' } }, { targetText: 'итого', baseText: { de: 'Gesamtsumme', en: 'total' } }, { targetText: 'сумма', baseText: { de: 'Summe, Betrag', en: 'sum, amount' } }, { targetText: 'аптека', baseText: { de: 'Apotheke', en: 'pharmacy' } }, { targetText: 'покупка', baseText: { de: 'Einkauf', en: 'purchase' } }],
    recall: { before: 'Нет, это всё. Сколько ', answer: 'всего', after: '?', fallbackChoices: ['всего', 'сразу', 'примерно', 'отдельно'] }, speakRequired: ['всё', 'Сколько', 'всего'],
    sceneCaption: { de: 'Die Apothekerin stellt die letzte Schachtel an die Kasse und fragt: „Что-нибудь ещё?“', en: 'The pharmacist places the last box by the register and asks: “Что-нибудь ещё?”' },
    trophyWord: { word: 'всего', meaning: { de: 'insgesamt', en: 'altogether, in total' }, example: 'Сколько всего?', whyThisWord: { de: 'Всего verwandelt die allgemeine Preisfrage in eine eindeutige Frage nach der Gesamtsumme.', en: 'Всего turns a general price question into an unambiguous request for the total.' } },
    distractors: ['Ещё одну упаковку.', 'Оплата только картой.'], placeholderCaption: { de: 'Eine kleine Arzneischachtel liegt vor dem Kassendisplay, das noch keine Gesamtsumme zeigt.', en: 'A small medicine box rests before a register display that has not shown the total yet.' }, songMood: 'a tidy pharmacy purchase ending with one exact total', visualNotes: 'Neighborhood pharmacy counter, one medicine box, card terminal, customer closing the order politely.',
  }),
  makeRussianA2CompactLesson({
    slug: 'pryamo-do-kontsa-ulitsy', title: { de: 'Bis zum Ende der Straße', en: 'To the end of the street' },
    situation: { de: 'Ein Tourist fragt dich nach der Metro. Du gibst eine kurze klare Wegbeschreibung bis zum Ende der Straße.', en: 'A tourist asks you for the metro. Give a short clear direction to the end of the street.' },
    pedagogicalGoal: 'Mit dem höflichen вы-Imperativ Идите und до + Genitiv eine verständliche Richtung geben.',
    targetText: 'Идите прямо до конца улицы.', baseText: { de: 'Gehen Sie geradeaus bis zum Ende der Straße.', en: 'Go straight to the end of the street.' },
    chunks: [{ targetText: 'Идите прямо', baseText: { de: 'Gehen Sie geradeaus', en: 'Go straight' } }, { targetText: 'до конца', baseText: { de: 'bis zum Ende', en: 'to the end' } }, { targetText: 'улицы.', baseText: { de: 'der Straße.', en: 'of the street.' } }],
    terms: [{ targetText: 'идти прямо', baseText: { de: 'geradeaus gehen', en: 'to go straight' } }, { targetText: 'конец улицы', baseText: { de: 'Straßenende', en: 'end of the street' } }, { targetText: 'улица', baseText: { de: 'Straße', en: 'street' } }, { targetText: 'перекрёсток', baseText: { de: 'Kreuzung', en: 'intersection' } }, { targetText: 'метро', baseText: { de: 'Metro', en: 'metro' } }],
    recall: { before: 'Идите прямо до конца ', answer: 'улицы', after: '.', fallbackChoices: ['улицы', 'парка', 'рынка', 'моста'] }, speakRequired: ['Идите', 'конца', 'улицы'],
    sceneCaption: { de: 'Ein Tourist hält einen Stadtplan hoch und fragt: „Как пройти к метро?“', en: 'A tourist holds up a city map and asks: “Как пройти к метро?”' },
    trophyWord: { word: 'улица', meaning: { de: 'Straße', en: 'street' }, example: 'Эта улица ведёт к метро.', whyThisWord: { de: 'Улица bildet den sichtbaren Orientierungskorridor, an dessen Ende der Tourist die Metro findet.', en: 'Улица names the visible route whose end leads the tourist to the metro.' } },
    distractors: ['Поверните во дворе', 'рядом с аптекой.'], placeholderCaption: { de: 'Eine lange Straße führt sichtbar zu einem Metrozeichen am fernen Ende.', en: 'A long street leads visibly toward a metro sign at the far end.' }, songMood: 'a friendly direction given with growing neighborhood confidence', visualNotes: 'City corner, visitor with map, straight sightline to a distant metro entrance, local giving one clear gesture.',
  }),
  makeRussianA2CompactLesson({
    slug: 'tri-yabloka-dva-limona', title: { de: 'Äpfel und Zitronen', en: 'Apples and lemons' },
    situation: { de: 'Auf dem Markt fragt der Händler nach der Menge. Du bestellst drei Äpfel und ergänzt zwei Zitronen.', en: 'At the market, the vendor asks how much you want. Order three apples and add two lemons.' },
    pedagogicalGoal: 'Kleine Mengen mit den korrekten Genitivformen nach три und два in einer Bestellung verbinden.',
    targetText: 'Дайте, пожалуйста, три яблока и два лимона.', baseText: { de: 'Geben Sie mir bitte drei Äpfel und zwei Zitronen.', en: 'Please give me three apples and two lemons.' },
    chunks: [{ targetText: 'Дайте, пожалуйста,', baseText: { de: 'Geben Sie mir bitte', en: 'Please give me' } }, { targetText: 'три яблока', baseText: { de: 'drei Äpfel', en: 'three apples' } }, { targetText: 'и два лимона.', baseText: { de: 'und zwei Zitronen.', en: 'and two lemons.' } }],
    terms: [{ targetText: 'дать', baseText: { de: 'geben', en: 'to give' } }, { targetText: 'яблоко', baseText: { de: 'Apfel', en: 'apple' } }, { targetText: 'лимон', baseText: { de: 'Zitrone', en: 'lemon' } }, { targetText: 'три яблока', baseText: { de: 'drei Äpfel; Genitiv Singular nach три', en: 'three apples; genitive singular after три' } }, { targetText: 'два лимона', baseText: { de: 'zwei Zitronen; Genitiv Singular nach два', en: 'two lemons; genitive singular after два' } }],
    recall: { before: 'Дайте, пожалуйста, три яблока и два ', answer: 'лимона', after: '.', fallbackChoices: ['лимона', 'банана', 'огурца', 'апельсина'] }, speakRequired: ['Дайте', 'яблока', 'лимона'],
    sceneCaption: { de: 'Der Händler öffnet eine Papiertüte und fragt: „Сколько вам яблок?“', en: 'The vendor opens a paper bag and asks: “Сколько вам яблок?”' },
    trophyWord: { word: 'лимон', meaning: { de: 'Zitrone', en: 'lemon' }, example: 'Добавьте один лимон, пожалуйста.', whyThisWord: { de: 'Лимон ist der zweite konkrete Marktartikel und verankert die Mengenform два лимона.', en: 'Лимон is the second concrete market item and anchors the quantity form два лимона.' } },
    distractors: ['килограмм картофеля', 'без бумажного пакета.'], placeholderCaption: { de: 'Drei Äpfel und zwei Zitronen liegen neben einer geöffneten Papiertüte auf der Waage.', en: 'Three apples and two lemons sit beside an open paper bag on the scale.' }, songMood: 'a colorful market order counted into a waiting paper bag', visualNotes: 'Outdoor produce stall, apples and lemons grouped in visible quantities, vendor holding a paper bag open.',
  }),
  makeRussianA2CompactLesson({
    slug: 'znayu-rayon', title: { de: 'Das Viertel wird vertraut', en: 'Knowing the neighborhood' },
    situation: { de: 'Im Treppenhaus fragt ein Nachbar, wie es dir geht und ob du dich schon zurechtfindest. Du antwortest zuversichtlich.', en: 'In the stairwell, a neighbor asks how you are doing and whether you know your way around yet. Answer confidently.' },
    pedagogicalGoal: 'Mit уже und неплохо ausdrücken, dass ein neuer Alltag schrittweise vertraut wird.',
    targetText: 'Хорошо! Я уже неплохо знаю район.', baseText: { de: 'Gut! Ich kenne das Viertel inzwischen schon ganz gut.', en: 'Good! I already know the neighborhood fairly well.' },
    chunks: [{ targetText: 'Хорошо!', baseText: { de: 'Gut!', en: 'Good!' } }, { targetText: 'Я уже неплохо знаю', baseText: { de: 'Ich kenne inzwischen schon ganz gut', en: 'I already know fairly well' } }, { targetText: 'район.', baseText: { de: 'das Viertel.', en: 'the neighborhood.' } }],
    terms: [{ targetText: 'знать', baseText: { de: 'kennen, wissen', en: 'to know' } }, { targetText: 'район', baseText: { de: 'Viertel, Bezirk', en: 'neighborhood, district' } }, { targetText: 'неплохо', baseText: { de: 'ganz gut, nicht schlecht', en: 'fairly well, not badly' } }, { targetText: 'сосед', baseText: { de: 'Nachbar', en: 'neighbor' } }, { targetText: 'привыкнуть', baseText: { de: 'sich gewöhnen', en: 'to get used to' } }],
    recall: { before: 'Хорошо! Я уже неплохо знаю ', answer: 'район', after: '.', fallbackChoices: ['район', 'город', 'парк', 'рынок'] }, speakRequired: ['неплохо', 'знаю', 'район'],
    sceneCaption: { de: 'Der Nachbar hält die Treppenhaustür auf und fragt: „Как дела? Хорошо знаете наш район?“', en: 'The neighbor holds the stairwell door and asks: “Как дела? Хорошо знаете наш район?”' },
    trophyWord: { word: 'район', meaning: { de: 'Viertel, Bezirk', en: 'neighborhood, district' }, example: 'Этот район я уже хорошо знаю.', whyThisWord: { de: 'Район fasst die Cafés, Wege und Läden zusammen, die nach mehreren Besuchen vertraut werden.', en: 'Район gathers the cafes, routes, and shops that become familiar after repeated visits.' } },
    distractors: ['только свой подъезд', 'редко смотрю карту.'], placeholderCaption: { de: 'Durch das Treppenhausfenster sind der vertraute Markt und das Café an der Ecke zu sehen.', en: 'The familiar market and corner cafe are visible through the stairwell window.' }, songMood: 'a warm stairwell hello carrying a new sense of local belonging', visualNotes: 'Bright apartment stairwell, friendly neighbor, familiar neighborhood landmarks visible through the window.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_ONE_METADATA,
  russianA2Practical1Inputs,
  { de: 'Du hast Russisch A2 Praxis 1 abgeschlossen und kannst vertraute Thekengespräche mit Mengen und Rückfragen weiterführen.', en: 'You have completed Russian A2 Practical 1 and can continue familiar counter exchanges with quantities and follow-up questions.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_TWO_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-2',
  title: 'Russian A2 Practical 2',
  shortTitle: 'A2 Practical 2',
  subtitle: { de: 'Vergleiche, Begründungen und sichere Entscheidungen', en: 'Comparisons, reasons, and confident decisions' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical2Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'eti-yabloki-deshevle', title: { de: 'Die günstigeren Äpfel', en: 'The cheaper apples' },
    situation: { de: 'Der Markthändler zeigt auf zwei Apfelsorten und fragt, welche du möchtest. Du entscheidest dich und begründest die Wahl mit dem Preis.', en: 'The market vendor points to two kinds of apples and asks which you want. Decide and explain the choice by price.' },
    pedagogicalGoal: 'Mit Я возьму eine Entscheidung treffen und sie einmal mit потому что plus Komparativ begründen.',
    targetText: 'Я возьму эти яблоки, потому что они дешевле.', baseText: { de: 'Ich nehme diese Äpfel, weil sie günstiger sind.', en: 'I will take these apples because they are cheaper.' },
    chunks: [{ targetText: 'Я возьму', baseText: { de: 'Ich nehme', en: 'I will take' } }, { targetText: 'эти яблоки,', baseText: { de: 'diese Äpfel,', en: 'these apples,' } }, { targetText: 'потому что они дешевле.', baseText: { de: 'weil sie günstiger sind.', en: 'because they are cheaper.' } }],
    terms: [{ targetText: 'взять', baseText: { de: 'nehmen', en: 'to take' } }, { targetText: 'яблоко', baseText: { de: 'Apfel', en: 'apple' } }, { targetText: 'дешевле', baseText: { de: 'günstiger', en: 'cheaper' } }, { targetText: 'цена', baseText: { de: 'Preis', en: 'price' } }, { targetText: 'килограмм', baseText: { de: 'Kilogramm', en: 'kilogram' } }],
    recall: { before: 'Я возьму эти яблоки, потому что они ', answer: 'дешевле', after: '.', fallbackChoices: ['дешевле', 'свежее', 'крупнее', 'слаще'] }, speakRequired: ['возьму', 'яблоки', 'дешевле'],
    sceneCaption: { de: 'Der Händler hält zwei Apfelsorten nebeneinander und fragt: „Какие яблоки вам положить?“', en: 'The vendor holds two kinds of apples side by side and asks: “Какие яблоки вам положить?”' },
    trophyWord: { word: 'дешевле', meaning: { de: 'günstiger', en: 'cheaper' }, example: 'На рынке эти яблоки дешевле.', whyThisWord: { de: 'Дешевле liefert den klaren Preisgrund für deine Entscheidung zwischen den beiden Sorten.', en: 'Дешевле gives the clear price reason for your decision between the two varieties.' } },
    distractors: ['за этими яблоками', 'свежие груши рядом.'], placeholderCaption: { de: 'Zwei Apfelkisten mit unterschiedlichen Preisschildern stehen auf derselben Marktwaage.', en: 'Two apple crates with different price signs sit beside the same market scale.' }, songMood: 'a quick market comparison ending in a sensible choice', visualNotes: 'Produce stall, two apple varieties, clearly different prices, customer pointing to the cheaper crate.',
  }),
  makeRussianA2CompactLesson({
    slug: 'zharko-holodnyy-limonad', title: { de: 'Etwas Kaltes heute', en: 'Something cold today' },
    situation: { de: 'Die Barista fragt nach deinem üblichen heißen Kaffee. Wegen der Hitze entscheidest du dich heute für eine kalte Limonade.', en: 'The barista asks about your usual hot coffee. Because of the heat, choose a cold lemonade today.' },
    pedagogicalGoal: 'Mit поэтому einen sichtbaren Grund aufnehmen und mit Я возьму eine neue Getränkewahl treffen.',
    targetText: 'Сегодня жарко, поэтому я возьму холодный лимонад.', baseText: { de: 'Heute ist es heiß, deshalb nehme ich eine kalte Limonade.', en: 'It is hot today, so I will take a cold lemonade.' },
    chunks: [{ targetText: 'Сегодня жарко,', baseText: { de: 'Heute ist es heiß,', en: 'It is hot today,' } }, { targetText: 'поэтому', baseText: { de: 'deshalb', en: 'so' } }, { targetText: 'я возьму холодный лимонад.', baseText: { de: 'nehme ich eine kalte Limonade.', en: 'I will take a cold lemonade.' } }],
    terms: [{ targetText: 'жарко', baseText: { de: 'es ist heiß', en: 'it is hot' } }, { targetText: 'холодный лимонад', baseText: { de: 'kalte Limonade', en: 'cold lemonade' } }, { targetText: 'лимонад', baseText: { de: 'Limonade', en: 'lemonade' } }, { targetText: 'напиток', baseText: { de: 'Getränk', en: 'drink' } }, { targetText: 'взять', baseText: { de: 'nehmen', en: 'to take' } }],
    recall: { before: 'Сегодня жарко, поэтому я возьму ', answer: 'холодный', after: ' лимонад.', fallbackChoices: ['холодный', 'горячий', 'зелёный', 'чёрный'] }, speakRequired: ['жарко', 'возьму', 'лимонад'],
    sceneCaption: { de: 'Die Barista blickt zur Espressomaschine und fragt: „Вам сегодня горячий кофе?“', en: 'The barista glances toward the espresso machine and asks: “Вам сегодня горячий кофе?”' },
    trophyWord: { word: 'лимонад', meaning: { de: 'Limonade', en: 'lemonade' }, example: 'Холодный лимонад уже на столе.', whyThisWord: { de: 'Лимонад benennt die konkrete kalte Alternative, die an diesem heißen Tag besser passt.', en: 'Лимонад names the specific cold alternative that suits this hot day better.' } },
    distractors: ['рядом с окном', 'кофе без крышки.'], placeholderCaption: { de: 'Ein Glas kalte Limonade mit Kondenswasser steht neben einer unbenutzten heißen Kaffeetasse.', en: 'A cold glass of lemonade with condensation stands beside an unused hot coffee cup.' }, songMood: 'summer heat turning a familiar order into a cool bright choice', visualNotes: 'Sunny cafe counter, cold lemonade, condensation, espresso cup set aside, warm light outside.',
  }),
  makeRussianA2CompactLesson({
    slug: 'cvet-nravitsya', title: { de: 'Das blaue gefällt mir', en: 'I like the blue one' },
    situation: { de: 'Eine Verkäuferin zeigt dir zwei T-Shirts in verschiedenen Farben. Du sagst, welches dir besser gefällt, und nimmst es.', en: 'A shop assistant shows you two T-shirts in different colors. Say which one you prefer and choose it.' },
    pedagogicalGoal: 'Eine Präferenz mit Мне больше нравится ausdrücken und anschließend genderfrei mit Я возьму entscheiden.',
    targetText: 'Мне больше нравится синяя. Я возьму её, пожалуйста.', baseText: { de: 'Das blaue gefällt mir besser. Ich nehme es, bitte.', en: 'I like the blue one better. I will take it, please.' },
    chunks: [{ targetText: 'Мне больше нравится синяя.', baseText: { de: 'Das blaue gefällt mir besser.', en: 'I like the blue one better.' } }, { targetText: 'Я возьму её,', baseText: { de: 'Ich nehme es,', en: 'I will take it,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'нравиться', baseText: { de: 'gefallen', en: 'to appeal, to like' } }, { targetText: 'синий', baseText: { de: 'blau', en: 'blue' } }, { targetText: 'футболка', baseText: { de: 'T-Shirt', en: 'T-shirt' } }, { targetText: 'цвет', baseText: { de: 'Farbe', en: 'color' } }, { targetText: 'выбор', baseText: { de: 'Auswahl', en: 'choice' } }],
    recall: { before: 'Мне больше ', answer: 'нравится', after: ' синяя. Я возьму её, пожалуйста.', fallbackChoices: ['нравится', 'подходит', 'мешает', 'помогает'] }, speakRequired: ['больше', 'нравится', 'возьму'],
    sceneCaption: { de: 'Die Verkäuferin hält ein blaues und ein rotes T-Shirt hoch und fragt: „Какая футболка вам больше нравится?“', en: 'The shop assistant holds up a blue and a red T-shirt and asks: “Какая футболка вам больше нравится?”' },
    trophyWord: { word: 'нравится', meaning: { de: 'gefällt', en: 'appeals, is liked' }, example: 'Мне нравится этот цвет.', whyThisWord: { de: 'Нравится formuliert deine echte Farbpräferenz, bevor du die Kaufentscheidung triffst.', en: 'Нравится expresses your genuine color preference before you make the purchase decision.' } },
    distractors: ['красного размера', 'на дальней полке.'], placeholderCaption: { de: 'Ein blaues und ein rotes T-Shirt hängen nebeneinander vor einem Spiegel.', en: 'A blue and a red T-shirt hang side by side in front of a mirror.' }, songMood: 'a playful color comparison settling into one confident choice', visualNotes: 'Clothing shop, blue and red shirts, mirror, customer indicating the blue option while staff waits.',
  }),
  makeRussianA2CompactLesson({
    slug: 'sup-legche', title: { de: 'Die leichtere Wahl', en: 'The lighter choice' },
    situation: { de: 'Der Kellner bietet Suppe oder Pelmeni an. Du möchtest etwas Leichteres und entscheidest dich für die Suppe.', en: 'The waiter offers soup or pelmeni. You want something lighter and choose the soup.' },
    pedagogicalGoal: 'Zwei Gerichte mit легче vergleichen und die Entscheidung mit поэтому und Я возьму abschließen.',
    targetText: 'Суп легче, поэтому я возьму суп.', baseText: { de: 'Die Suppe ist leichter, deshalb nehme ich die Suppe.', en: 'The soup is lighter, so I will take the soup.' },
    chunks: [{ targetText: 'Суп легче,', baseText: { de: 'Die Suppe ist leichter,', en: 'The soup is lighter,' } }, { targetText: 'поэтому', baseText: { de: 'deshalb', en: 'so' } }, { targetText: 'я возьму суп.', baseText: { de: 'nehme ich die Suppe.', en: 'I will take the soup.' } }],
    terms: [{ targetText: 'суп', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'легче', baseText: { de: 'leichter', en: 'lighter' } }, { targetText: 'взять', baseText: { de: 'nehmen', en: 'to take' } }, { targetText: 'пельмени', baseText: { de: 'Pelmeni, gefüllte Teigtaschen', en: 'pelmeni, filled dumplings' } }, { targetText: 'порция', baseText: { de: 'Portion', en: 'portion' } }],
    recall: { before: 'Суп ', answer: 'легче', after: ', поэтому я возьму суп.', fallbackChoices: ['легче', 'сытнее', 'острее', 'гуще'] }, speakRequired: ['Суп', 'легче', 'возьму'],
    sceneCaption: { de: 'Der Kellner zeigt auf zwei Bilder in der Karte und fragt: „Вам суп или пельмени?“', en: 'The waiter points to two menu pictures and asks: “Вам суп или пельмени?”' },
    trophyWord: { word: 'суп', meaning: { de: 'Suppe', en: 'soup' }, example: 'Этот суп сегодня особенно лёгкий.', whyThisWord: { de: 'Суп ist das konkrete leichtere Gericht, das du nach dem Vergleich auswählst.', en: 'Суп is the specific lighter dish you choose after making the comparison.' } },
    distractors: ['за большой тарелкой', 'пельмени на двоих.'], placeholderCaption: { de: 'Eine leichte Suppe und ein Teller Pelmeni stehen als zwei deutlich verschiedene Optionen bereit.', en: 'A light soup and a plate of pelmeni wait as two visibly different options.' }, songMood: 'a menu comparison resolving into a light uncomplicated lunch', visualNotes: 'Restaurant table, soup and pelmeni shown side by side, customer choosing the lighter bowl.',
  }),
  makeRussianA2CompactLesson({
    slug: 'etot-hleb-svezhee', title: { de: 'Das frischere Brot', en: 'The fresher bread' },
    situation: { de: 'Die Bäckerin zeigt auf zwei Brotlaibe und fragt, welchen du möchtest. Du vergleichst die Frische und wählst den neueren Laib.', en: 'The baker points to two loaves and asks which one you want. Compare their freshness and choose the newer loaf.' },
    pedagogicalGoal: 'Mit свежее einen Qualitätsvergleich ausdrücken und daraus mit поэтому eine Kaufentscheidung ableiten.',
    targetText: 'Этот хлеб свежее, поэтому я возьму его.', baseText: { de: 'Dieses Brot ist frischer, deshalb nehme ich es.', en: 'This bread is fresher, so I will take it.' },
    chunks: [{ targetText: 'Этот хлеб свежее,', baseText: { de: 'Dieses Brot ist frischer,', en: 'This bread is fresher,' } }, { targetText: 'поэтому', baseText: { de: 'deshalb', en: 'so' } }, { targetText: 'я возьму его.', baseText: { de: 'nehme ich es.', en: 'I will take it.' } }],
    terms: [{ targetText: 'хлеб', baseText: { de: 'Brot', en: 'bread' } }, { targetText: 'свежее', baseText: { de: 'frischer', en: 'fresher' } }, { targetText: 'булка', baseText: { de: 'Laib, Brötchen', en: 'loaf, roll' } }, { targetText: 'выпечка', baseText: { de: 'Backwaren', en: 'baked goods' } }, { targetText: 'корочка', baseText: { de: 'Kruste', en: 'crust' } }],
    recall: { before: 'Этот хлеб ', answer: 'свежее', after: ', поэтому я возьму его.', fallbackChoices: ['свежее', 'мягче', 'темнее', 'дешевле'] }, speakRequired: ['хлеб', 'свежее', 'возьму'],
    sceneCaption: { de: 'Die Bäckerin legt zwei Laibe auf das Brett und fragt: „Какой хлеб вам дать?“', en: 'The baker places two loaves on the board and asks: “Какой хлеб вам дать?”' },
    trophyWord: { word: 'хлеб', meaning: { de: 'Brot', en: 'bread' }, example: 'Этот хлеб сегодня особенно свежий.', whyThisWord: { de: 'Хлеб ist der konkrete Gegenstand, dessen Frische deine Entscheidung bestimmt.', en: 'Хлеб is the concrete item whose freshness determines your choice.' } },
    distractors: ['рядом с пирожками', 'старую упаковку.'], placeholderCaption: { de: 'Zwei Brotlaibe liegen auf einem Holzbrett, einer noch mit deutlich knuspriger Kruste.', en: 'Two loaves sit on a wooden board, one with a visibly crisp fresh crust.' }, songMood: 'a warm bakery comparison guided by the scent of fresh bread', visualNotes: 'Neighborhood bakery, two loaves, fresh crust catching warm light, baker awaiting the choice.',
  }),
  makeRussianA2CompactLesson({
    slug: 'metro-bystree', title: { de: 'Mit der Metro geht es schneller', en: 'The metro is faster' },
    situation: { de: 'Ein Mitarbeiter nennt Bus und Metro als Möglichkeiten. Weil der Bus langsam ist, entscheidest du dich für die Metro.', en: 'A staff member offers the bus and metro as options. Since the bus is slow, choose the metro.' },
    pedagogicalGoal: 'Verkehrsmittel mit быстрее vergleichen und eine genderfreie Zukunftsentscheidung mit поеду formulieren.',
    targetText: 'Метро быстрее, поэтому я поеду на метро.', baseText: { de: 'Die Metro ist schneller, deshalb fahre ich mit der Metro.', en: 'The metro is faster, so I will take the metro.' },
    chunks: [{ targetText: 'Метро быстрее,', baseText: { de: 'Die Metro ist schneller,', en: 'The metro is faster,' } }, { targetText: 'поэтому', baseText: { de: 'deshalb', en: 'so' } }, { targetText: 'я поеду на метро.', baseText: { de: 'fahre ich mit der Metro.', en: 'I will take the metro.' } }],
    terms: [{ targetText: 'метро', baseText: { de: 'Metro', en: 'metro' } }, { targetText: 'быстрее', baseText: { de: 'schneller', en: 'faster' } }, { targetText: 'поехать', baseText: { de: 'losfahren, fahren', en: 'to go by transport' } }, { targetText: 'автобус', baseText: { de: 'Bus', en: 'bus' } }, { targetText: 'пробка', baseText: { de: 'Verkehrsstau', en: 'traffic jam' } }],
    recall: { before: 'Метро ', answer: 'быстрее', after: ', поэтому я поеду на метро.', fallbackChoices: ['быстрее', 'дешевле', 'медленнее', 'ближе'] }, speakRequired: ['Метро', 'быстрее', 'поеду'],
    sceneCaption: { de: 'Der Mitarbeiter blickt auf die volle Straße und sagt: „Автобус сейчас идёт медленно. Что выберете?“', en: 'The staff member looks at the crowded road and says: “Автобус сейчас идёт медленно. Что выберете?”' },
    trophyWord: { word: 'быстрее', meaning: { de: 'schneller', en: 'faster' }, example: 'На метро сегодня быстрее.', whyThisWord: { de: 'Быстрее liefert den entscheidenden Zeitvergleich zwischen Bus und Metro.', en: 'Быстрее supplies the decisive time comparison between bus and metro.' } },
    distractors: ['в автобусной кассе', 'пешком через парк.'], placeholderCaption: { de: 'Ein Bus steht im dichten Verkehr, während der Metroeingang direkt daneben frei zugänglich ist.', en: 'A bus sits in heavy traffic while the metro entrance beside it remains clear.' }, songMood: 'city traffic giving way to a quick decisive metro ride', visualNotes: 'Busy street, bus in traffic, bright metro entrance, traveler choosing the faster route.',
  }),
  makeRussianA2CompactLesson({
    slug: 'komnata-tishe', title: { de: 'Das ruhigere Zimmer', en: 'The quieter room' },
    situation: { de: 'An der Rezeption kannst du zwischen zwei Zimmern wählen. Du erklärst, dass das ruhigere Zimmer deinen Schlaf verbessert.', en: 'At reception, you can choose between two rooms. Explain that the quieter room helps you sleep better.' },
    pedagogicalGoal: 'Mit тише Räume vergleichen und die persönliche Folge im Präsens ausdrücken.',
    targetText: 'Эта комната тише. Здесь я лучше сплю.', baseText: { de: 'Dieses Zimmer ist ruhiger. Hier schlafe ich besser.', en: 'This room is quieter. I sleep better here.' },
    chunks: [{ targetText: 'Эта комната', baseText: { de: 'Dieses Zimmer', en: 'This room' } }, { targetText: 'тише.', baseText: { de: 'ist ruhiger.', en: 'is quieter.' } }, { targetText: 'Здесь я лучше сплю.', baseText: { de: 'Hier schlafe ich besser.', en: 'I sleep better here.' } }],
    terms: [{ targetText: 'тише', baseText: { de: 'ruhiger', en: 'quieter' } }, { targetText: 'комната', baseText: { de: 'Zimmer', en: 'room' } }, { targetText: 'спать', baseText: { de: 'schlafen', en: 'to sleep' } }, { targetText: 'окно', baseText: { de: 'Fenster', en: 'window' } }, { targetText: 'двор', baseText: { de: 'Innenhof', en: 'courtyard' } }],
    recall: { before: 'Эта комната ', answer: 'тише', after: '. Здесь я лучше сплю.', fallbackChoices: ['тише', 'светлее', 'теплее', 'больше'] }, speakRequired: ['комната', 'тише', 'сплю'],
    sceneCaption: { de: 'Die Rezeptionistin zeigt auf zwei Zimmertüren und fragt: „Какой номер вам больше нравится?“', en: 'The receptionist points to two room doors and asks: “Какой номер вам больше нравится?”' },
    trophyWord: { word: 'тише', meaning: { de: 'ruhiger', en: 'quieter' }, example: 'В этой комнате тише.', whyThisWord: { de: 'Тише benennt genau die Eigenschaft, die deine Zimmerwahl und deinen besseren Schlaf verbindet.', en: 'Тише names the exact quality connecting your room choice with better sleep.' } },
    distractors: ['около шумного лифта', 'с видом на улицу.'], placeholderCaption: { de: 'Zwei Hoteltüren liegen an verschiedenen Fluren, einer ruhig zum Innenhof, einer nahe am Aufzug.', en: 'Two hotel doors open onto different corridors, one quiet by the courtyard and one near the lift.' }, songMood: 'a quiet room choice settling into a restful night', visualNotes: 'Hotel corridor, courtyard-facing room, distant elevator area, customer indicating the calmer door.',
  }),
  makeRussianA2CompactLesson({
    slug: 'tufli-udobnee', title: { de: 'Die bequemeren Schuhe', en: 'The more comfortable shoes' },
    situation: { de: 'Auf dem Markt probierst du zwei Paar Schuhe an. Die Verkäuferin fragt, welche du nimmst, und du entscheidest dich für das bequemere Paar.', en: 'At the market, you try on two pairs of shoes. The vendor asks which you will take, and you choose the more comfortable pair.' },
    pedagogicalGoal: 'Mit удобнее eine Passform vergleichen und die Wahl mit Я возьму ausdrücken.',
    targetText: 'Эти туфли удобнее. Я возьму их.', baseText: { de: 'Diese Schuhe sind bequemer. Ich nehme sie.', en: 'These shoes are more comfortable. I will take them.' },
    chunks: [{ targetText: 'Эти туфли', baseText: { de: 'Diese Schuhe', en: 'These shoes' } }, { targetText: 'удобнее.', baseText: { de: 'sind bequemer.', en: 'are more comfortable.' } }, { targetText: 'Я возьму их.', baseText: { de: 'Ich nehme sie.', en: 'I will take them.' } }],
    terms: [{ targetText: 'туфли', baseText: { de: 'Schuhe, Halbschuhe', en: 'shoes' } }, { targetText: 'удобнее', baseText: { de: 'bequemer', en: 'more comfortable' } }, { targetText: 'пара', baseText: { de: 'Paar', en: 'pair' } }, { targetText: 'размер', baseText: { de: 'Größe', en: 'size' } }, { targetText: 'примерить', baseText: { de: 'anprobieren', en: 'to try on' } }],
    recall: { before: 'Эти туфли ', answer: 'удобнее', after: '. Я возьму их.', fallbackChoices: ['удобнее', 'легче', 'дешевле', 'новее'] }, speakRequired: ['туфли', 'удобнее', 'возьму'],
    sceneCaption: { de: 'Die Verkäuferin stellt beide Schuhkartons nebeneinander und fragt: „Какие туфли вы возьмёте?“', en: 'The vendor places both shoe boxes side by side and asks: “Какие туфли вы возьмёте?”' },
    trophyWord: { word: 'туфли', meaning: { de: 'Schuhe, Halbschuhe', en: 'shoes' }, example: 'Эти туфли подходят по размеру.', whyThisWord: { de: 'Туфли sind der konkrete Gegenstand, dessen Tragekomfort du vor dem Kauf vergleichst.', en: 'Туфли are the concrete item whose comfort you compare before buying.' } },
    distractors: ['между двумя рядами', 'коробку без крышки.'], placeholderCaption: { de: 'Zwei Paar Schuhe stehen vor einem kleinen Marktspiegel, eines sichtbar weicher gepolstert.', en: 'Two pairs of shoes sit before a small market mirror, one visibly more cushioned.' }, songMood: 'a careful fitting ending in comfortable certainty', visualNotes: 'Indoor market shoe stall, two pairs, mirror, customer testing the more comfortable pair.',
  }),
  makeRussianA2CompactLesson({
    slug: 'butylka-deshevle', title: { de: 'Die kleinere Flasche', en: 'The smaller bottle' },
    situation: { de: 'Am Kiosk zeigt der Verkäufer auf eine große und eine kleine Wasserflasche. Du vergleichst den Preis und nimmst die kleine.', en: 'At a kiosk, the seller points to a large and a small bottle of water. Compare the price and choose the small one.' },
    pedagogicalGoal: 'Größe und Preis in zwei kurzen Sätzen vergleichen und eine klare Kaufentscheidung treffen.',
    targetText: 'Маленькая бутылка дешевле. Я возьму её.', baseText: { de: 'Die kleine Flasche ist günstiger. Ich nehme sie.', en: 'The small bottle is cheaper. I will take it.' },
    chunks: [{ targetText: 'Маленькая бутылка', baseText: { de: 'Die kleine Flasche', en: 'The small bottle' } }, { targetText: 'дешевле.', baseText: { de: 'ist günstiger.', en: 'is cheaper.' } }, { targetText: 'Я возьму её.', baseText: { de: 'Ich nehme sie.', en: 'I will take it.' } }],
    terms: [{ targetText: 'бутылка', baseText: { de: 'Flasche', en: 'bottle' } }, { targetText: 'маленький', baseText: { de: 'klein', en: 'small' } }, { targetText: 'дешевле', baseText: { de: 'günstiger', en: 'cheaper' } }, { targetText: 'объём', baseText: { de: 'Volumen, Füllmenge', en: 'volume, capacity' } }, { targetText: 'киоск', baseText: { de: 'Kiosk', en: 'kiosk' } }],
    recall: { before: 'Маленькая ', answer: 'бутылка', after: ' дешевле. Я возьму её.', fallbackChoices: ['бутылка', 'упаковка', 'банка', 'чашка'] }, speakRequired: ['бутылка', 'дешевле', 'возьму'],
    sceneCaption: { de: 'Der Verkäufer hält zwei Wasserflaschen hoch und fragt: „Вам большую или маленькую?“', en: 'The seller holds up two water bottles and asks: “Вам большую или маленькую?”' },
    trophyWord: { word: 'бутылка', meaning: { de: 'Flasche', en: 'bottle' }, example: 'Маленькая бутылка стоит у кассы.', whyThisWord: { de: 'Бутылка ist das konkrete Produkt, dessen kleinere Größe zugleich den günstigeren Preis erklärt.', en: 'Бутылка is the specific product whose smaller size also explains the lower price.' } },
    distractors: ['из большого холодильника', 'стакан без воды.'], placeholderCaption: { de: 'Eine kleine und eine große Wasserflasche stehen mit unterschiedlichen Preisen im Kioskfenster.', en: 'A small and a large water bottle stand with different prices in the kiosk window.' }, songMood: 'a small practical choice made by comparing size and price', visualNotes: 'Street kiosk refrigerator, two bottle sizes, price tags clear, customer selecting the smaller bottle.',
  }),
  makeRussianA2CompactLesson({
    slug: 'kafe-blizko-i-tiho', title: { de: 'Mein Lieblingsort', en: 'My favorite spot' },
    situation: { de: 'Ein Nachbar fragt nach deinem Lieblingsort im Viertel. Du nennst das Café und begründest die Wahl mit Nähe und Ruhe.', en: 'A neighbor asks about your favorite place in the neighborhood. Name the cafe and explain the choice with proximity and quiet.' },
    pedagogicalGoal: 'Eine persönliche Vorliebe mit потому что sowie zwei einfachen Präsensgründen erklären.',
    targetText: 'Я люблю это кафе, потому что оно близко и там тихо.', baseText: { de: 'Ich mag dieses Café, weil es nah ist und es dort ruhig ist.', en: 'I love this cafe because it is close and quiet there.' },
    chunks: [{ targetText: 'Я люблю это кафе,', baseText: { de: 'Ich mag dieses Café,', en: 'I love this cafe,' } }, { targetText: 'потому что оно близко', baseText: { de: 'weil es nah ist', en: 'because it is close' } }, { targetText: 'и там тихо.', baseText: { de: 'und es dort ruhig ist.', en: 'and it is quiet there.' } }],
    terms: [{ targetText: 'любить', baseText: { de: 'lieben, gernhaben', en: 'to love, to like' } }, { targetText: 'кафе', baseText: { de: 'Café', en: 'cafe' } }, { targetText: 'близко', baseText: { de: 'nah', en: 'close' } }, { targetText: 'тихо', baseText: { de: 'ruhig, leise', en: 'quiet' } }, { targetText: 'любимое место', baseText: { de: 'Lieblingsort', en: 'favorite place' } }],
    recall: { before: 'Я люблю это кафе, потому что оно близко и там ', answer: 'тихо', after: '.', fallbackChoices: ['тихо', 'шумно', 'жарко', 'холодно'] }, speakRequired: ['люблю', 'кафе', 'тихо'],
    sceneCaption: { de: 'Der Nachbar zeigt auf die Läden an der Ecke und fragt: „Какое место вам здесь нравится больше всего?“', en: 'The neighbor gestures toward the shops on the corner and asks: “Какое место вам здесь нравится больше всего?”' },
    trophyWord: { word: 'тихо', meaning: { de: 'ruhig, leise', en: 'quiet' }, example: 'Утром в этом кафе тихо.', whyThisWord: { de: 'Тихо liefert neben der Nähe den persönlichen Grund, warum dieses Café dein Lieblingsort ist.', en: 'Тихо gives the personal reason, alongside proximity, that makes this cafe your favorite spot.' } },
    distractors: ['после дальней станции', 'у большого рынка.'], placeholderCaption: { de: 'Ein ruhiges Eckcafé liegt nur wenige Schritte vom Hauseingang entfernt.', en: 'A quiet corner cafe sits only a few steps from the apartment entrance.' }, songMood: 'a gentle neighborhood favorite explained with easy personal reasons', visualNotes: 'Quiet corner cafe near an apartment building, soft light, few patrons, neighbor pointing from the sidewalk.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_TWO_METADATA,
  russianA2Practical2Inputs,
  { de: 'Du hast Russisch A2 Praxis 2 abgeschlossen und kannst Möglichkeiten vergleichen, begründen und sicher auswählen.', en: 'You have completed Russian A2 Practical 2 and can compare, explain, and confidently choose between options.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_THREE_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-3',
  title: 'Russian A2 Practical 3',
  shortTitle: 'A2 Practical 3',
  subtitle: { de: 'Erste vergangene Handlungen mit klaren Zeitangaben', en: 'First past actions with clear time markers' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical3Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'oplata-na-glavnoy-kasse', title: { de: 'Schon bezahlt', en: 'Already paid' },
    situation: { de: 'Am Abholschalter wirst du nach der Zahlungsart gefragt. Du erklärst, dass du bereits an der Hauptkasse bezahlt hast.', en: 'At the pickup counter, you are asked about the payment method. Explain that you already paid at the main register.' },
    pedagogicalGoal: 'Mit уже und der femininen Vergangenheitsform заплатила eine abgeschlossene Zahlung melden.',
    targetText: 'Я уже заплатила на главной кассе. Всё готово.', baseText: { de: 'Ich habe schon an der Hauptkasse bezahlt. Alles ist fertig.', en: 'I already paid at the main register. Everything is ready.' },
    chunks: [{ targetText: 'Я уже заплатила', baseText: { de: 'Ich habe schon bezahlt', en: 'I already paid' } }, { targetText: 'на главной кассе.', baseText: { de: 'an der Hauptkasse.', en: 'at the main register.' } }, { targetText: 'Всё готово.', baseText: { de: 'Alles ist fertig.', en: 'Everything is ready.' } }],
    terms: [{ targetText: 'заплатила', baseText: { de: 'ich habe bezahlt (Frau; Mann: заплатил)', en: 'I paid (female; male: заплатил)' }, alsoAccept: ['заплатил'] }, { targetText: 'главная касса', baseText: { de: 'Hauptkasse', en: 'main register' } }, { targetText: 'на кассе', baseText: { de: 'an der Kasse; Präpositiv', en: 'at the register; prepositional' } }, { targetText: 'готово', baseText: { de: 'fertig', en: 'ready' } }, { targetText: 'оплата', baseText: { de: 'Zahlung', en: 'payment' } }],
    recall: { before: 'Я уже заплатила на главной ', answer: 'кассе', after: '. Всё готово.', fallbackChoices: ['кассе', 'стойке', 'почте', 'станции'] }, speakRequired: ['главной', 'кассе', 'готово'], genderForms: { voiced: 'заплатила', other: 'заплатил' },
    sceneCaption: { de: 'Die Mitarbeiterin am Abholschalter zeigt auf das Terminal und fragt: „Вы будете платить картой или наличными?“', en: 'The pickup clerk points to the terminal and asks: “Вы будете платить картой или наличными?”' },
    trophyWord: { word: 'касса', meaning: { de: 'Kasse', en: 'register, checkout' }, example: 'Главная касса находится у входа.', whyThisWord: { de: 'Касса verankert deine erste Vergangenheitsmeldung an dem Ort, an dem die Zahlung schon erledigt wurde.', en: 'Касса anchors your first past-tense report to the place where payment was already completed.' } },
    distractors: ['у нового терминала', 'оплата после выдачи.'], placeholderCaption: { de: 'Auf dem Display der Hauptkasse steht „bezahlt“, während der Abholschalter nur noch die Ware bereithält.', en: 'The main-register display shows paid while the pickup counter only holds the waiting item.' }, songMood: 'a completed payment calmly clearing the final pickup step', visualNotes: 'Pickup counter, paid receipt from main register, terminal untouched, customer indicating payment is complete.',
  }),
  makeRussianA2CompactLesson({
    slug: 'vchera-vecherom', title: { de: 'Gestern Abend angekommen', en: 'Arrived yesterday evening' },
    situation: { de: 'Der Rezeptionist fragt, wann du angekommen bist. Du nennst gestern Abend und sagst, dass du dich jetzt im Zimmer ausruhst.', en: 'The receptionist asks when you arrived. Name yesterday evening and say that you are resting in the room now.' },
    pedagogicalGoal: 'Mit приехала und вчера вечером eine vergangene Ankunft zeitlich klar verorten.',
    targetText: 'Я приехала вчера вечером. Сейчас отдыхаю в номере.', baseText: { de: 'Ich bin gestern Abend angekommen. Jetzt ruhe ich mich im Zimmer aus.', en: 'I arrived yesterday evening. Now I am resting in the room.' },
    chunks: [{ targetText: 'Я приехала', baseText: { de: 'Ich bin angekommen', en: 'I arrived' } }, { targetText: 'вчера вечером.', baseText: { de: 'gestern Abend.', en: 'yesterday evening.' } }, { targetText: 'Сейчас отдыхаю в номере.', baseText: { de: 'Jetzt ruhe ich mich im Zimmer aus.', en: 'Now I am resting in the room.' } }],
    terms: [{ targetText: 'приехала', baseText: { de: 'ich bin angekommen (Frau; Mann: приехал)', en: 'I arrived (female; male: приехал)' }, alsoAccept: ['приехал'] }, { targetText: 'вчера вечером', baseText: { de: 'gestern Abend', en: 'yesterday evening' } }, { targetText: 'отдыхать', baseText: { de: 'sich ausruhen', en: 'to rest' } }, { targetText: 'вечером', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: 'в номере', baseText: { de: 'im Hotelzimmer; Präpositiv', en: 'in the hotel room; prepositional' } }],
    recall: { before: 'Я приехала вчера ', answer: 'вечером', after: '. Сейчас отдыхаю в номере.', fallbackChoices: ['вечером', 'утром', 'днём', 'ночью'] }, speakRequired: ['вчера', 'вечером', 'Сейчас'], genderForms: { voiced: 'приехала', other: 'приехал' },
    sceneCaption: { de: 'Der Rezeptionist prüft das Ankunftsdatum und fragt: „Когда вы приехали?“', en: 'The receptionist checks the arrival date and asks: “Когда вы приехали?”' },
    trophyWord: { word: 'вчера', meaning: { de: 'gestern', en: 'yesterday' }, example: 'Вчера вечером гостиница была тихой.', whyThisWord: { de: 'Вчера setzt die Ankunft eindeutig in die Vergangenheit und trennt sie vom jetzigen Ausruhen.', en: 'Вчера places the arrival clearly in the past and separates it from resting now.' } },
    distractors: ['завтра после завтрака', 'у стойки регистрации.'], placeholderCaption: { de: 'Auf dem Hotelkalender ist der gestrige Abend markiert, daneben liegt die aktive Zimmerkarte.', en: 'Yesterday evening is marked on the hotel calendar beside the active room key.' }, songMood: 'an evening arrival settling into the quiet of a hotel room', visualNotes: 'Reception desk, calendar marked yesterday evening, room key active, traveler now relaxed after arrival.',
  }),
  makeRussianA2CompactLesson({
    slug: 'zakaz-pelmeney', title: { de: 'Pelmeni schon bestellt', en: 'Pelmeni already ordered' },
    situation: { de: 'Ein Kellner öffnet seinen Block und möchte deine Bestellung aufnehmen. Du erklärst, dass du Pelmeni bereits bestellt hast und wartest.', en: 'A waiter opens his pad and wants to take your order. Explain that you already ordered pelmeni and are waiting.' },
    pedagogicalGoal: 'Mit уже заказала eine abgeschlossene Bestellung von der gegenwärtigen Wartephase unterscheiden.',
    targetText: 'Я уже заказала пельмени. Сейчас жду за столиком.', baseText: { de: 'Ich habe die Pelmeni schon bestellt. Jetzt warte ich am Tisch.', en: 'I already ordered the pelmeni. Now I am waiting at the table.' },
    chunks: [{ targetText: 'Я уже заказала пельмени.', baseText: { de: 'Ich habe die Pelmeni schon bestellt.', en: 'I already ordered the pelmeni.' } }, { targetText: 'Сейчас жду', baseText: { de: 'Jetzt warte ich', en: 'Now I am waiting' } }, { targetText: 'за столиком.', baseText: { de: 'am Tisch.', en: 'at the table.' } }],
    terms: [{ targetText: 'заказала', baseText: { de: 'ich habe bestellt (Frau; Mann: заказал)', en: 'I ordered (female; male: заказал)' }, alsoAccept: ['заказал'] }, { targetText: 'пельмени', baseText: { de: 'Pelmeni, gefüllte Teigtaschen', en: 'pelmeni, filled dumplings' } }, { targetText: 'ждать', baseText: { de: 'warten', en: 'to wait' } }, { targetText: 'за столиком', baseText: { de: 'am Tisch; Instrumental nach за', en: 'at the table; instrumental after за' } }, { targetText: 'заказ готов', baseText: { de: 'die Bestellung ist fertig', en: 'the order is ready' } }],
    recall: { before: 'Я уже заказала ', answer: 'пельмени', after: '. Сейчас жду за столиком.', fallbackChoices: ['пельмени', 'вареники', 'блины', 'котлеты'] }, speakRequired: ['пельмени', 'Сейчас', 'столиком'], genderForms: { voiced: 'заказала', other: 'заказал' },
    sceneCaption: { de: 'Der Kellner öffnet seinen Bestellblock und fragt: „Можно принять ваш заказ?“', en: 'The waiter opens his order pad and asks: “Можно принять ваш заказ?”' },
    trophyWord: { word: 'пельмени', meaning: { de: 'Pelmeni, gefüllte Teigtaschen', en: 'pelmeni, filled dumplings' }, example: 'Пельмени уже несут к столику.', whyThisWord: { de: 'Пельмени benennen das konkrete Gericht, dessen Bestellung bereits abgeschlossen ist.', en: 'Пельмени names the exact dish whose order has already been placed.' } },
    distractors: ['меню у окна', 'суп после салата.'], placeholderCaption: { de: 'Ein Bestellbon für Pelmeni liegt neben einem gedeckten, noch leeren Platz.', en: 'An order slip for pelmeni rests beside a set place still waiting for the dish.' }, songMood: 'a patient restaurant pause after the order is already underway', visualNotes: 'Restaurant table, pelmeni written on order slip, waiter checking, customer waiting calmly.',
  }),
  makeRussianA2CompactLesson({
    slug: 'segodnya-frukty', title: { de: 'Heute Morgen gekauft', en: 'Bought this morning' },
    situation: { de: 'Ein Händler bietet dir Obst an. Du erklärst, dass du heute Morgen bereits frisches Obst gekauft hast.', en: 'A vendor offers you fruit. Explain that you already bought fresh fruit this morning.' },
    pedagogicalGoal: 'Mit сегодня утром und купила einen Kauf am selben Tag präzise zeitlich einordnen.',
    targetText: 'Сегодня утром я купила свежие фрукты.', baseText: { de: 'Heute Morgen habe ich frisches Obst gekauft.', en: 'This morning I bought fresh fruit.' },
    chunks: [{ targetText: 'Сегодня утром', baseText: { de: 'Heute Morgen', en: 'This morning' } }, { targetText: 'я купила', baseText: { de: 'habe ich gekauft', en: 'I bought' } }, { targetText: 'свежие фрукты.', baseText: { de: 'frisches Obst.', en: 'fresh fruit.' } }],
    terms: [{ targetText: 'купила', baseText: { de: 'ich habe gekauft (Frau; Mann: купил)', en: 'I bought (female; male: купил)' }, alsoAccept: ['купил'] }, { targetText: 'сегодня утром', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: 'фрукты', baseText: { de: 'Obst, Früchte', en: 'fruit' } }, { targetText: 'свежий', baseText: { de: 'frisch', en: 'fresh' } }, { targetText: 'покупка', baseText: { de: 'Einkauf', en: 'purchase' } }],
    recall: { before: 'Сегодня утром я купила свежие ', answer: 'фрукты', after: '.', fallbackChoices: ['фрукты', 'овощи', 'ягоды', 'орехи'] }, speakRequired: ['Сегодня', 'свежие', 'фрукты'], genderForms: { voiced: 'купила', other: 'купил' },
    sceneCaption: { de: 'Der Händler zeigt auf eine volle Obstkiste und fragt: „Вам ещё нужны фрукты?“', en: 'The vendor points to a full fruit crate and asks: “Вам ещё нужны фрукты?”' },
    trophyWord: { word: 'фрукты', meaning: { de: 'Obst, Früchte', en: 'fruit' }, example: 'Свежие фрукты лежат в сумке.', whyThisWord: { de: 'Фрукты sind der konkrete Einkauf, der купила mit der nahen Zeitangabe сегодня утром verbindet.', en: 'Фрукты are the concrete purchase connecting купила with the recent time marker сегодня утром.' } },
    distractors: ['овощи на завтра', 'у дальней палатки.'], placeholderCaption: { de: 'Eine Tasche mit frischem Obst vom Morgen steht neben einer noch vollen Marktkiste.', en: 'A bag of fresh fruit bought this morning sits beside a still-full market crate.' }, songMood: 'a bright morning purchase recalled at a colorful produce stall', visualNotes: 'Produce stall, fresh fruit in reusable bag, morning light, vendor offering another crate.',
  }),
  makeRussianA2CompactLesson({
    slug: 'utro-na-rynke', title: { de: 'Am Morgen auf dem Markt', en: 'At the market this morning' },
    situation: { de: 'Eine Bekannte im Café fragt, wo du heute Morgen warst. Du nennst den Markt und sagst, dass du jetzt nach Hause gehst.', en: 'An acquaintance at a cafe asks where you were this morning. Name the market and say that you are heading home now.' },
    pedagogicalGoal: 'Mit была einen vergangenen Aufenthaltsort im Präpositiv nennen und ihn einem jetzigen Weg gegenüberstellen.',
    targetText: 'Утром я была на рынке. Сейчас иду домой.', baseText: { de: 'Am Morgen war ich auf dem Markt. Jetzt gehe ich nach Hause.', en: 'This morning I was at the market. Now I am going home.' },
    chunks: [{ targetText: 'Утром я была', baseText: { de: 'Am Morgen war ich', en: 'This morning I was' } }, { targetText: 'на рынке.', baseText: { de: 'auf dem Markt.', en: 'at the market.' } }, { targetText: 'Сейчас иду домой.', baseText: { de: 'Jetzt gehe ich nach Hause.', en: 'Now I am going home.' } }],
    terms: [{ targetText: 'была', baseText: { de: 'ich war (Frau; Mann: был)', en: 'I was (female; male: был)' }, alsoAccept: ['был'] }, { targetText: 'на рынке', baseText: { de: 'auf dem Markt; Präpositiv', en: 'at the market; prepositional' } }, { targetText: 'утром', baseText: { de: 'am Morgen', en: 'in the morning' } }, { targetText: 'идти домой', baseText: { de: 'nach Hause gehen', en: 'to go home' } }, { targetText: 'рынок', baseText: { de: 'Markt', en: 'market' } }],
    recall: { before: 'Утром я была на ', answer: 'рынке', after: '. Сейчас иду домой.', fallbackChoices: ['рынке', 'почте', 'площади', 'ярмарке'] }, speakRequired: ['Утром', 'рынке', 'Сейчас'], genderForms: { voiced: 'была', other: 'был' },
    sceneCaption: { de: 'Die Bekannte sieht deine Einkaufstasche und fragt: „Где вы были сегодня утром?“', en: 'The acquaintance notices your shopping bag and asks: “Где вы были сегодня утром?”' },
    trophyWord: { word: 'рынок', meaning: { de: 'Markt', en: 'market' }, example: 'Рынок утром особенно оживлённый.', whyThisWord: { de: 'Рынок verankert была an einem klaren vergangenen Aufenthaltsort, den die Einkaufstasche erklärt.', en: 'Рынок anchors была to a clear past location that explains the shopping bag.' } },
    distractors: ['после долгой прогулки', 'в кафе у дома.'], placeholderCaption: { de: 'Eine volle Einkaufstasche steht am Café-Stuhl, während draußen der Weg nach Hause beginnt.', en: 'A full shopping bag rests by the cafe chair while the route home begins outside.' }, songMood: 'a market morning turning into an unhurried walk home', visualNotes: 'Cafe doorway, reusable market bag, acquaintance noticing it, homeward street visible outside.',
  }),
  makeRussianA2CompactLesson({
    slug: 'plohoy-son-vchera', title: { de: 'Heute ist alles besser', en: 'Everything is better today' },
    situation: { de: 'Beim Frühstück fragt das Hotelpersonal nach deiner Nacht. Du sagst, dass du schlecht geschlafen hast, heute aber alles gut ist.', en: 'At breakfast, hotel staff asks about your night. Say that you slept badly but everything is fine today.' },
    pedagogicalGoal: 'Die feminine Vergangenheitsform спала mit einem klaren Gegenwartskontrast durch сегодня verbinden.',
    targetText: 'Вчера я плохо спала. Сегодня всё хорошо.', baseText: { de: 'Gestern habe ich schlecht geschlafen. Heute ist alles gut.', en: 'I slept badly yesterday. Everything is fine today.' },
    chunks: [{ targetText: 'Вчера', baseText: { de: 'Gestern', en: 'Yesterday' } }, { targetText: 'я плохо спала.', baseText: { de: 'habe ich schlecht geschlafen.', en: 'I slept badly.' } }, { targetText: 'Сегодня всё хорошо.', baseText: { de: 'Heute ist alles gut.', en: 'Everything is fine today.' } }],
    terms: [{ targetText: 'спала', baseText: { de: 'ich habe geschlafen (Frau; Mann: спал)', en: 'I slept (female; male: спал)' }, alsoAccept: ['спал'] }, { targetText: 'вчера', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'плохо', baseText: { de: 'schlecht', en: 'badly' } }, { targetText: 'сегодня', baseText: { de: 'heute', en: 'today' } }, { targetText: 'сон', baseText: { de: 'Schlaf', en: 'sleep' } }],
    recall: { before: 'Вчера я плохо спала. Сегодня всё ', answer: 'хорошо', after: '.', fallbackChoices: ['хорошо', 'спокойно', 'тихо', 'тепло'] }, speakRequired: ['Вчера', 'Сегодня', 'хорошо'], genderForms: { voiced: 'спала', other: 'спал' },
    sceneCaption: { de: 'Die Mitarbeiterin stellt Tee auf den Frühstückstisch und fragt: „Как вы спали этой ночью?“', en: 'The staff member sets tea on the breakfast table and asks: “Как вы спали этой ночью?”' },
    trophyWord: { word: 'сегодня', meaning: { de: 'heute', en: 'today' }, example: 'Сегодня в гостинице тихо.', whyThisWord: { de: 'Сегодня trennt deinen guten jetzigen Zustand deutlich von der schlechten Nacht gestern.', en: 'Сегодня clearly separates your good present state from the bad night yesterday.' } },
    distractors: ['утром нужен будильник', 'номер около лифта.'], placeholderCaption: { de: 'Eine Tasse Tee im Morgenlicht steht neben einem zerknitterten Kissen vom Vorabend.', en: 'A cup of tea in morning light sits beside a rumpled pillow from the night before.' }, songMood: 'a difficult night softening into a calm clear morning', visualNotes: 'Hotel breakfast room, tea, morning light, tired night recalled while the traveler now looks relieved.',
  }),
  makeRussianA2CompactLesson({
    slug: 'borsch-uzhe-znakom', title: { de: 'Borschtsch schon probiert', en: 'Borscht already tried' },
    situation: { de: 'Die Bedienung fragt, ob Borschtsch neu für dich ist. Du sagst, dass du ihn schon probiert hast und sehr lecker findest.', en: 'The server asks whether borscht is new to you. Say that you have already tried it and find it very tasty.' },
    pedagogicalGoal: 'Mit уже попробовала eine erste Essenserfahrung nennen und anschließend im Präsens bewerten.',
    targetText: 'Я уже попробовала борщ. Очень вкусно, спасибо!', baseText: { de: 'Ich habe Borschtsch schon probiert. Sehr lecker, danke!', en: 'I already tried borscht. Very tasty, thank you!' },
    chunks: [{ targetText: 'Я уже попробовала борщ.', baseText: { de: 'Ich habe Borschtsch schon probiert.', en: 'I already tried borscht.' } }, { targetText: 'Очень вкусно,', baseText: { de: 'Sehr lecker,', en: 'Very tasty,' } }, { targetText: 'спасибо!', baseText: { de: 'danke!', en: 'thank you!' } }],
    terms: [{ targetText: 'попробовала', baseText: { de: 'ich habe probiert (Frau; Mann: попробовал)', en: 'I tried (female; male: попробовал)' }, alsoAccept: ['попробовал'] }, { targetText: 'борщ', baseText: { de: 'Borschtsch', en: 'borscht' } }, { targetText: 'попробовать', baseText: { de: 'probieren', en: 'to try' } }, { targetText: 'очень вкусно', baseText: { de: 'sehr lecker', en: 'very tasty' } }, { targetText: 'местная кухня', baseText: { de: 'lokale Küche', en: 'local cuisine' } }],
    recall: { before: 'Я уже попробовала ', answer: 'борщ', after: '. Очень вкусно, спасибо!', fallbackChoices: ['борщ', 'суп', 'салат', 'пирог'] }, speakRequired: ['борщ', 'Очень', 'вкусно'], genderForms: { voiced: 'попробовала', other: 'попробовал' },
    sceneCaption: { de: 'Die Bedienung deutet auf die rote Suppe und fragt: „Вы уже пробовали борщ?“', en: 'The server gestures toward the red soup and asks: “Вы уже пробовали борщ?”' },
    trophyWord: { word: 'борщ', meaning: { de: 'Borschtsch', en: 'borscht' }, example: 'Борщ подают со сметаной.', whyThisWord: { de: 'Борщ ist das konkrete lokale Gericht, an dem du deine erste probierte Erfahrung erzählst.', en: 'Борщ is the specific local dish used to tell about your first completed tasting experience.' } },
    distractors: ['чай после ужина', 'ложка на салфетке.'], placeholderCaption: { de: 'Eine halb probierte Schale Borschtsch steht vor einer erwartungsvoll wartenden Bedienung.', en: 'A half-tasted bowl of borscht sits before a server waiting for the verdict.' }, songMood: 'a first local taste blooming into an enthusiastic verdict', visualNotes: 'Russian restaurant, bright bowl of borscht, spoon set down after tasting, server watching the positive reaction.',
  }),
  makeRussianA2CompactLesson({
    slug: 'kremly-i-ekskursiya', title: { de: 'Den Kreml noch nicht gesehen', en: 'Not seen the Kremlin yet' },
    situation: { de: 'In der Touristeninformation wirst du gefragt, ob du den Kreml schon gesehen hast. Du verneinst und suchst nun eine gute Führung.', en: 'At tourist information, you are asked whether you have seen the Kremlin yet. Say no and look for a good tour now.' },
    pedagogicalGoal: 'Mit ещё не видела eine ausstehende Erfahrung ausdrücken und einen nächsten Schritt im Präsens ergänzen.',
    targetText: 'Кремль я ещё не видела. Теперь ищу хорошую экскурсию.', baseText: { de: 'Den Kreml habe ich noch nicht gesehen. Jetzt suche ich eine gute Führung.', en: 'I have not seen the Kremlin yet. Now I am looking for a good tour.' },
    chunks: [{ targetText: 'Кремль я ещё не видела.', baseText: { de: 'Den Kreml habe ich noch nicht gesehen.', en: 'I have not seen the Kremlin yet.' } }, { targetText: 'Теперь', baseText: { de: 'Jetzt', en: 'Now' } }, { targetText: 'ищу хорошую экскурсию.', baseText: { de: 'suche ich eine gute Führung.', en: 'I am looking for a good tour.' } }],
    terms: [{ targetText: 'видела', baseText: { de: 'ich habe gesehen (Frau; Mann: видел)', en: 'I saw (female; male: видел)' }, alsoAccept: ['видел'] }, { targetText: 'Кремль', baseText: { de: 'Kreml', en: 'Kremlin' } }, { targetText: 'ещё не', baseText: { de: 'noch nicht', en: 'not yet' } }, { targetText: 'экскурсия', baseText: { de: 'Führung, Ausflug', en: 'tour, excursion' } }, { targetText: 'искать', baseText: { de: 'suchen', en: 'to look for' } }],
    recall: { before: 'Кремль я ещё не видела. Теперь ищу хорошую ', answer: 'экскурсию', after: '.', fallbackChoices: ['экскурсию', 'карту', 'группу', 'дорогу'] }, speakRequired: ['Кремль', 'ищу', 'экскурсию'], genderForms: { voiced: 'видела', other: 'видел' },
    sceneCaption: { de: 'Die Mitarbeiterin legt einen Stadtplan auf den Schalter und fragt: „Вы уже видели Кремль?“', en: 'The staff member lays a city map on the counter and asks: “Вы уже видели Кремль?”' },
    trophyWord: { word: 'экскурсия', meaning: { de: 'Führung, Ausflug', en: 'tour, excursion' }, example: 'Экскурсия начинается у главного входа.', whyThisWord: { de: 'Экскурсия benennt den konkreten nächsten Schritt nach der noch ausstehenden Besichtigung.', en: 'Экскурсия names the concrete next step after the visit that has not happened yet.' } },
    distractors: ['вчерашний билет', 'музей после обеда.'], placeholderCaption: { de: 'Ein ungefalteter Kreml-Plan liegt neben mehreren Karten für geführte Rundgänge.', en: 'An unfolded Kremlin map lies beside several guided-tour cards.' }, songMood: 'an unseen landmark opening into the promise of a guided visit', visualNotes: 'Tourist information desk, Kremlin map, tour brochures, traveler choosing what to explore next.',
  }),
  makeRussianA2CompactLesson({
    slug: 'muzey-vchera', title: { de: 'Gestern im Museum', en: 'At the museum yesterday' },
    situation: { de: 'Die Mitarbeiterin der Touristeninformation fragt, wohin du gestern gegangen bist. Du nennst das städtische Museum.', en: 'The tourist-information clerk asks where you went yesterday. Name the city museum.' },
    pedagogicalGoal: 'Mit ходила eine vergangene Aktivität und mit в + Akkusativ ihr Ziel ausdrücken.',
    targetText: 'Вчера я ходила в городской музей.', baseText: { de: 'Gestern bin ich in das städtische Museum gegangen.', en: 'Yesterday I went to the city museum.' },
    chunks: [{ targetText: 'Вчера', baseText: { de: 'Gestern', en: 'Yesterday' } }, { targetText: 'я ходила', baseText: { de: 'bin ich gegangen', en: 'I went' } }, { targetText: 'в городской музей.', baseText: { de: 'in das städtische Museum.', en: 'to the city museum.' } }],
    terms: [{ targetText: 'ходила', baseText: { de: 'ich bin gegangen (Frau; Mann: ходил)', en: 'I went (female; male: ходил)' }, alsoAccept: ['ходил'] }, { targetText: 'музей', baseText: { de: 'Museum', en: 'museum' } }, { targetText: 'городской музей', baseText: { de: 'städtisches Museum', en: 'city museum' } }, { targetText: 'в музей', baseText: { de: 'ins Museum; Richtungsakkusativ', en: 'to the museum; directional accusative' } }, { targetText: 'выставка', baseText: { de: 'Ausstellung', en: 'exhibition' } }],
    recall: { before: 'Вчера я ходила в ', answer: 'городской', after: ' музей.', fallbackChoices: ['городской', 'исторический', 'художественный', 'небольшой'] }, speakRequired: ['Вчера', 'городской', 'музей'], genderForms: { voiced: 'ходила', other: 'ходил' },
    sceneCaption: { de: 'Die Mitarbeiterin betrachtet deinen Wochenplan und fragt: „Куда вы ходили вчера?“', en: 'The staff member looks at your weekly plan and asks: “Куда вы ходили вчера?”' },
    trophyWord: { word: 'музей', meaning: { de: 'Museum', en: 'museum' }, example: 'Городской музей открыт до вечера.', whyThisWord: { de: 'Музей ist das klare Ziel, das die vergangene Bewegung mit ходила konkret macht.', en: 'Музей is the clear destination that makes the past movement with ходила concrete.' } },
    distractors: ['на новой выставке', 'рядом с площадью.'], placeholderCaption: { de: 'Eine Museumskarte von gestern liegt auf einem kleinen Wochenplan.', en: 'Yesterday’s museum ticket rests on a small weekly planner.' }, songMood: 'a simple city memory preserved in a museum ticket', visualNotes: 'Tourist information desk, museum ticket dated yesterday, weekly planner, clerk asking about the visit.',
  }),
  makeRussianA2CompactLesson({
    slug: 'mnogo-za-nedelyu', title: { de: 'Eine volle Woche', en: 'A full week' },
    situation: { de: 'Eine Nachbarin fragt, wie deine Woche gelaufen ist. Du fasst sie kurz zusammen und sagst, dass du viel geschafft hast.', en: 'A neighbor asks how your week has gone. Sum it up briefly and say that you did a lot.' },
    pedagogicalGoal: 'Mit на этой неделе und сделала eine kurze Bilanz über mehrere abgeschlossene Aktivitäten ziehen.',
    targetText: 'На этой неделе я сделала очень много.', baseText: { de: 'Diese Woche habe ich sehr viel gemacht.', en: 'I did a great deal this week.' },
    chunks: [{ targetText: 'На этой неделе', baseText: { de: 'In dieser Woche', en: 'This week' } }, { targetText: 'я сделала', baseText: { de: 'habe ich gemacht', en: 'I did' } }, { targetText: 'очень много.', baseText: { de: 'sehr viel.', en: 'a great deal.' } }],
    terms: [{ targetText: 'сделала', baseText: { de: 'ich habe gemacht (Frau; Mann: сделал)', en: 'I did (female; male: сделал)' }, alsoAccept: ['сделал'] }, { targetText: 'на этой неделе', baseText: { de: 'in dieser Woche; Präpositiv', en: 'this week; prepositional' } }, { targetText: 'много', baseText: { de: 'viel', en: 'a lot' } }, { targetText: 'неделя', baseText: { de: 'Woche', en: 'week' } }, { targetText: 'итог', baseText: { de: 'Bilanz, Ergebnis', en: 'result, summary' } }],
    recall: { before: 'На этой неделе я сделала очень ', answer: 'много', after: '.', fallbackChoices: ['много', 'мало', 'достаточно', 'немного'] }, speakRequired: ['неделе', 'очень', 'много'], genderForms: { voiced: 'сделала', other: 'сделал' },
    sceneCaption: { de: 'Die Nachbarin sieht deine Markt- und Museumstaschen und fragt: „Как прошла ваша неделя?“', en: 'The neighbor notices your market and museum bags and asks: “Как прошла ваша неделя?”' },
    trophyWord: { word: 'неделя', meaning: { de: 'Woche', en: 'week' }, example: 'Эта неделя была очень интересной.', whyThisWord: { de: 'Неделя bündelt alle kleinen Einkäufe, Wege und Besuche zu einer kurzen persönlichen Bilanz.', en: 'Неделя gathers the small purchases, routes, and visits into one short personal recap.' } },
    distractors: ['завтра новый маршрут', 'вечером дома.'], placeholderCaption: { de: 'Museumsticket, Markttasche und Hotelkarte liegen als kleine Erinnerungen derselben Woche zusammen.', en: 'A museum ticket, market bag, and hotel key sit together as small memories from the same week.' }, songMood: 'a busy week gathering into one proud quiet reflection', visualNotes: 'Apartment entryway, museum ticket, market bag, hotel card, neighbor smiling at the week’s accumulated memories.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_THREE_METADATA,
  russianA2Practical3Inputs,
  { de: 'Du hast Russisch A2 Praxis 3 abgeschlossen und kannst erste vergangene Handlungen mit klaren Zeitangaben ausdrücken.', en: 'You have completed Russian A2 Practical 3 and can express first past actions with clear time markers.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_FOUR_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-4',
  title: 'Russian A2 Practical 4',
  shortTitle: 'A2 Practical 4',
  subtitle: { de: 'Pläne vorschlagen, ändern und höflich absagen', en: 'Making, changing, and politely declining plans' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical4Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'davaite-posle-obeda', title: { de: 'Kaffee am Nachmittag', en: 'Coffee in the afternoon' },
    situation: { de: 'Ein neuer Freund schlägt für diese Woche einen Kaffee vor. Du nimmst gern an und schlägst morgen Nachmittag vor.', en: 'A new friend suggests coffee this week. Accept warmly and propose tomorrow afternoon.' },
    pedagogicalGoal: 'Eine Einladung mit с удовольствием annehmen und mit давайте plus Zeitangabe einen Gegenvorschlag machen.',
    targetText: 'С удовольствием! Давайте завтра после обеда?', baseText: { de: 'Sehr gern! Wie wäre es morgen nach dem Mittagessen?', en: 'With pleasure! How about tomorrow after lunch?' },
    chunks: [{ targetText: 'С удовольствием!', baseText: { de: 'Sehr gern!', en: 'With pleasure!' } }, { targetText: 'Давайте завтра', baseText: { de: 'Wie wäre es morgen', en: 'How about tomorrow' } }, { targetText: 'после обеда?', baseText: { de: 'nach dem Mittagessen?', en: 'after lunch?' } }],
    terms: [{ targetText: 'с удовольствием', baseText: { de: 'sehr gern, mit Vergnügen', en: 'with pleasure, gladly' } }, { targetText: 'давайте', baseText: { de: 'lassen Sie uns; wie wäre es', en: 'let us; how about' } }, { targetText: 'завтра', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'после обеда', baseText: { de: 'nach dem Mittagessen; Genitiv nach после', en: 'after lunch; genitive after после' } }, { targetText: 'предложение', baseText: { de: 'Vorschlag', en: 'suggestion' } }],
    recall: { before: 'С ', answer: 'удовольствием', after: '! Давайте завтра после обеда?', fallbackChoices: ['удовольствием', 'вопросом', 'билетом', 'зонтом'] }, speakRequired: ['удовольствием', 'Давайте', 'обеда'],
    sceneCaption: { de: 'Der Freund zeigt auf ein Café und fragt: „Хотите выпить кофе на этой неделе?“', en: 'The friend points to a cafe and asks: “Хотите выпить кофе на этой неделе?”' },
    trophyWord: { word: 'удовольствие', meaning: { de: 'Vergnügen, Freude', en: 'pleasure, enjoyment' }, example: 'Эта прогулка — настоящее удовольствие.', whyThisWord: { de: 'Удовольствие macht aus einer bloßen Zusage eine warmherzige Annahme der Einladung.', en: 'Удовольствие turns a bare yes into a warm acceptance of the invitation.' } },
    distractors: ['Сегодня утром,', 'около работы.'], placeholderCaption: { de: 'Zwei Kaffeetassen stehen auf einem kleinen Tisch neben einem Kalender für den morgigen Nachmittag.', en: 'Two coffee cups sit on a small table beside a calendar marked for tomorrow afternoon.' }, songMood: 'a warm invitation opening into an easy afternoon plan', visualNotes: 'Neighborhood cafe window, two friends standing outside, tomorrow afternoon highlighted on a pocket calendar.',
  }),
  makeRussianA2CompactLesson({
    slug: 'zavtra-poidu-v-muzei', title: { de: 'Morgen ins Museum', en: 'The museum tomorrow' },
    situation: { de: 'Der Freund fragt nach deinen Plänen für morgen. Du erzählst von deinem Museumsbesuch.', en: 'Your friend asks about your plans for tomorrow. Tell them about your museum visit.' },
    pedagogicalGoal: 'Mit dem perfektiven Futur пойду einen konkreten Plan für morgen ausdrücken.',
    targetText: 'Завтра я пойду в городской музей.', baseText: { de: 'Morgen gehe ich ins städtische Museum.', en: 'Tomorrow I will go to the city museum.' },
    chunks: [{ targetText: 'Завтра', baseText: { de: 'Morgen', en: 'Tomorrow' } }, { targetText: 'я пойду', baseText: { de: 'gehe ich', en: 'I will go' } }, { targetText: 'в городской музей.', baseText: { de: 'ins städtische Museum.', en: 'to the city museum.' } }],
    terms: [{ targetText: 'пойду', baseText: { de: 'ich werde zu Fuß gehen', en: 'I will go on foot' } }, { targetText: 'завтра', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'городской музей', baseText: { de: 'städtisches Museum', en: 'city museum' } }, { targetText: 'в музей', baseText: { de: 'ins Museum; Richtungsakkusativ', en: 'to the museum; directional accusative' } }, { targetText: 'планы', baseText: { de: 'Pläne', en: 'plans' } }],
    recall: { before: 'Завтра я пойду в городской ', answer: 'музей', after: '.', fallbackChoices: ['музей', 'театр', 'магазин', 'парк'] }, speakRequired: ['Завтра', 'пойду', 'музей'],
    sceneCaption: { de: 'Der Freund klappt seinen Kalender auf und fragt: „Какие у вас планы на завтра?“', en: 'The friend opens a calendar and asks: “Какие у вас планы на завтра?”' },
    trophyWord: { word: 'пойду', meaning: { de: 'ich werde gehen', en: 'I will go' }, example: 'После завтрака я пойду в музей.', whyThisWord: { de: 'Пойду setzt deinen Museumsbesuch klar in die Zukunft und macht ihn zu einem festen Vorhaben.', en: 'Пойду places the museum visit clearly in the future and makes it a firm plan.' } },
    distractors: ['сегодня рядом', 'около музея.'], placeholderCaption: { de: 'Ein Stadtmuseum steht auf einer morgigen Kalenderkarte neben einem eingezeichneten Fußweg.', en: 'A city museum appears on tomorrow’s calendar card beside a marked walking route.' }, songMood: 'a clear tomorrow plan pointing toward a day of discovery', visualNotes: 'City museum facade, simple calendar page for tomorrow, walking route marked from the neighborhood.',
  }),
  makeRussianA2CompactLesson({
    slug: 'kino-v-pyatnitsu', title: { de: 'Kino am Freitag', en: 'Cinema on Friday' },
    situation: { de: 'Ihr sprecht über das Ende der Woche. Du schlägst für Freitag einen gemeinsamen Kinobesuch vor.', en: 'You are talking about the end of the week. Suggest going to the cinema together on Friday.' },
    pedagogicalGoal: 'Mit давайте und dem perfektiven пойдём einen gemeinsamen Plan vorschlagen.',
    targetText: 'Давайте пойдём в кино в пятницу?', baseText: { de: 'Wollen wir am Freitag ins Kino gehen?', en: 'Shall we go to the cinema on Friday?' },
    chunks: [{ targetText: 'Давайте пойдём', baseText: { de: 'Wollen wir gehen', en: 'Shall we go' } }, { targetText: 'в кино', baseText: { de: 'ins Kino', en: 'to the cinema' } }, { targetText: 'в пятницу?', baseText: { de: 'am Freitag?', en: 'on Friday?' } }],
    terms: [{ targetText: 'пойдём', baseText: { de: 'wir werden gehen', en: 'we will go' } }, { targetText: 'кино', baseText: { de: 'Kino', en: 'cinema' } }, { targetText: 'в пятницу', baseText: { de: 'am Freitag; Akkusativ', en: 'on Friday; accusative' } }, { targetText: 'сеанс', baseText: { de: 'Vorstellung', en: 'showing' } }, { targetText: 'афиша', baseText: { de: 'Kinoprogramm, Plakat', en: 'listings, poster' } }],
    recall: { before: 'Давайте пойдём в кино в ', answer: 'пятницу', after: '?', fallbackChoices: ['пятницу', 'субботу', 'среду', 'четверг'] }, speakRequired: ['Давайте', 'пойдём', 'кино'],
    sceneCaption: { de: 'Der Freund zeigt dir das Kinoprogramm und fragt: „Что будем делать в пятницу?“', en: 'The friend shows you the cinema listings and asks: “Что будем делать в пятницу?”' },
    trophyWord: { word: 'кино', meaning: { de: 'Kino, Film', en: 'cinema, film' }, example: 'В пятницу мы пойдём в кино.', whyThisWord: { de: 'Кино gibt dem neuen Freitagsvorschlag ein konkretes gemeinsames Ziel.', en: 'Кино gives the new Friday proposal a concrete shared destination.' } },
    distractors: ['после концерта', 'дома у окна.'], placeholderCaption: { de: 'Ein Kinoprogramm mit einer markierten Freitagsvorstellung liegt zwischen zwei Eintrittskarten.', en: 'Cinema listings with a Friday showing circled sit between two tickets.' }, songMood: 'a playful Friday proposal lit by a cinema marquee', visualNotes: 'Evening cinema marquee, Friday listing circled, two friends comparing showtimes on a flyer.',
  }),
  makeRussianA2CompactLesson({
    slug: 'vosem-u-metro', title: { de: 'Um acht an der Metro', en: 'Eight by the metro' },
    situation: { de: 'Der Kinoplan steht, aber Zeit und Treffpunkt fehlen noch. Du schlägst acht Uhr an der Metro vor.', en: 'The cinema plan is set, but the time and meeting place are still open. Suggest eight by the metro.' },
    pedagogicalGoal: 'Mit давайте eine genaue Uhrzeit und einen leicht erkennbaren Treffpunkt vereinbaren.',
    targetText: 'Давайте встретимся в восемь у метро.', baseText: { de: 'Treffen wir uns um acht an der Metro.', en: 'Let’s meet at eight by the metro.' },
    chunks: [{ targetText: 'Давайте встретимся', baseText: { de: 'Treffen wir uns', en: 'Let’s meet' } }, { targetText: 'в восемь', baseText: { de: 'um acht', en: 'at eight' } }, { targetText: 'у метро.', baseText: { de: 'an der Metro.', en: 'by the metro.' } }],
    terms: [{ targetText: 'встретимся', baseText: { de: 'wir treffen uns', en: 'we will meet' } }, { targetText: 'в восемь', baseText: { de: 'um acht', en: 'at eight' } }, { targetText: 'у метро', baseText: { de: 'an der Metro', en: 'by the metro' } }, { targetText: 'точное время', baseText: { de: 'genaue Uhrzeit', en: 'exact time' } }, { targetText: 'место встречи', baseText: { de: 'Treffpunkt', en: 'meeting point' } }],
    recall: { before: 'Давайте встретимся в ', answer: 'восемь', after: ' у метро.', fallbackChoices: ['восемь', 'семь', 'девять', 'десять'] }, speakRequired: ['встретимся', 'восемь', 'метро'],
    sceneCaption: { de: 'Der Freund hält die Kinokarten bereit und fragt: „Во сколько и где встретимся?“', en: 'The friend holds the cinema tickets and asks: “Во сколько и где встретимся?”' },
    trophyWord: { word: 'восемь', meaning: { de: 'acht', en: 'eight' }, example: 'Давайте встретимся в восемь.', whyThisWord: { de: 'Восемь verwandelt den allgemeinen Kinoplan in eine konkrete Verabredung.', en: 'Восемь turns the general cinema plan into a precise arrangement.' } },
    distractors: ['после девяти', 'внутри кинотеатра.'], placeholderCaption: { de: 'Eine Bahnhofsuhr zeigt acht, während zwei Kinokarten am Metroeingang warten.', en: 'A station clock shows eight while two cinema tickets wait by the metro entrance.' }, songMood: 'a city meeting point clicking neatly into place', visualNotes: 'Metro entrance at dusk, station clock at eight, cinema tickets visible in one friend’s hand.',
  }),
  makeRussianA2CompactLesson({
    slug: 'perenesti-na-subbotu', title: { de: 'Auf Samstag verschieben', en: 'Move it to Saturday' },
    situation: { de: 'Ein Termin am Freitag kommt dazwischen. Du bittest darum, euren geplanten Spaziergang auf Samstag zu verschieben.', en: 'A Friday commitment gets in the way. Ask to move your planned walk to Saturday.' },
    pedagogicalGoal: 'Mit Можно перенести…? höflich um eine Terminänderung und mit на plus Akkusativ um einen neuen Tag bitten.',
    targetText: 'Можно перенести прогулку на субботу?', baseText: { de: 'Können wir den Spaziergang auf Samstag verschieben?', en: 'Can we move the walk to Saturday?' },
    chunks: [{ targetText: 'Можно перенести', baseText: { de: 'Können wir verschieben', en: 'Can we move' } }, { targetText: 'прогулку', baseText: { de: 'den Spaziergang', en: 'the walk' } }, { targetText: 'на субботу?', baseText: { de: 'auf Samstag?', en: 'to Saturday?' } }],
    terms: [{ targetText: 'перенести', baseText: { de: 'verschieben', en: 'to move, reschedule' } }, { targetText: 'прогулка', baseText: { de: 'Spaziergang', en: 'walk' } }, { targetText: 'на субботу', baseText: { de: 'auf Samstag; Akkusativ', en: 'to Saturday; accusative' } }, { targetText: 'изменить', baseText: { de: 'ändern', en: 'to change' } }, { targetText: 'другой день', baseText: { de: 'anderer Tag', en: 'another day' } }],
    recall: { before: 'Можно перенести прогулку на ', answer: 'субботу', after: '?', fallbackChoices: ['субботу', 'пятницу', 'среду', 'неделю'] }, speakRequired: ['Можно', 'перенести', 'прогулку'],
    sceneCaption: { de: 'Der Freund schaut auf den Freitag im Kalender und fragt: „Завтра вам удобно?“', en: 'The friend looks at Friday on the calendar and asks: “Завтра вам удобно?”' },
    trophyWord: { word: 'перенести', meaning: { de: 'verschieben, verlegen', en: 'to reschedule, move' }, example: 'Можно перенести встречу на субботу?', whyThisWord: { de: 'Перенести löst den Terminkonflikt, ohne die gemeinsame Aktivität ganz abzusagen.', en: 'Перенести solves the scheduling conflict without cancelling the shared activity altogether.' } },
    distractors: ['отменить навсегда', 'после длинной недели.'], placeholderCaption: { de: 'Ein Kalenderpfeil führt von Freitag zu Samstag neben einem kleinen Parksymbol.', en: 'A calendar arrow moves from Friday to Saturday beside a small park icon.' }, songMood: 'a small calendar conflict bending into a workable new day', visualNotes: 'Open weekly planner, Friday crossed lightly, Saturday circled, walking shoes beside it.',
  }),
  makeRussianA2CompactLesson({
    slug: 'otkaz-u-menya-rabota', title: { de: 'Heute geht es nicht', en: 'I cannot make it today' },
    situation: { de: 'Der Freund erwartet dich am Abend, aber du musst arbeiten. Du sagst höflich und mit einem klaren Grund ab.', en: 'Your friend expects you this evening, but you have to work. Decline politely and give a clear reason.' },
    pedagogicalGoal: 'Mit Извините, я не могу… höflich absagen und mit у меня einen einfachen Grund nennen.',
    targetText: 'Извините, я не могу прийти — у меня работа.', baseText: { de: 'Entschuldigen Sie, ich kann nicht kommen — ich muss arbeiten.', en: 'I’m sorry, I cannot come — I have work.' },
    chunks: [{ targetText: 'Извините, я не могу прийти —', baseText: { de: 'Entschuldigen Sie, ich kann nicht kommen —', en: 'I’m sorry, I cannot come —' } }, { targetText: 'у меня', baseText: { de: 'ich habe', en: 'I have' } }, { targetText: 'работа.', baseText: { de: 'Arbeit.', en: 'work.' } }],
    terms: [{ targetText: 'извините', baseText: { de: 'entschuldigen Sie', en: 'excuse me, I am sorry' } }, { targetText: 'не могу прийти', baseText: { de: 'ich kann nicht kommen', en: 'I cannot come' } }, { targetText: 'работа', baseText: { de: 'Arbeit', en: 'work' } }, { targetText: 'причина', baseText: { de: 'Grund', en: 'reason' } }, { targetText: 'отказаться', baseText: { de: 'absagen, ablehnen', en: 'to decline' } }],
    recall: { before: 'Извините, я не могу прийти — у меня ', answer: 'работа', after: '.', fallbackChoices: ['работа', 'учёба', 'смена', 'тренировка'] }, speakRequired: ['Извините', 'могу', 'работа'],
    sceneCaption: { de: 'Der Freund wartet auf deine Bestätigung und fragt: „Вы придёте сегодня вечером?“', en: 'The friend waits for your confirmation and asks: “Вы придёте сегодня вечером?”' },
    trophyWord: { word: 'работа', meaning: { de: 'Arbeit', en: 'work' }, example: 'Сегодня вечером у меня работа.', whyThisWord: { de: 'Работа liefert einen kurzen, verständlichen Grund für deine höfliche Absage.', en: 'Работа gives a short, understandable reason for the polite refusal.' } },
    distractors: ['после восьми', 'встречаемся у метро.'], placeholderCaption: { de: 'Ein Arbeitsausweis liegt neben einer ungelesenen Abendeinladung auf dem Handy.', en: 'A work badge rests beside an unanswered evening invitation on a phone.' }, songMood: 'a respectful refusal carried by a clear honest reason', visualNotes: 'Evening desk, work badge and schedule, phone showing a friend’s invitation, apologetic but calm mood.',
  }),
  makeRussianA2CompactLesson({
    slug: 'poidyomte-ya-zaplachu', title: { de: 'Ich übernehme das Abendessen', en: 'Dinner is on me' },
    situation: { de: 'Ihr habt für den Abend noch nichts geplant. Du schlägst ein gemeinsames Essen vor und bietest an zu zahlen.', en: 'You have no plan for the evening yet. Suggest dinner together and offer to pay.' },
    pedagogicalGoal: 'Mit Пойдёмте eine gemeinsame Aktivität vorschlagen und mit заплачу eine genderfreie Zukunftszusage geben.',
    targetText: 'Пойдёмте сегодня ужинать? Я заплачу за ужин.', baseText: { de: 'Gehen wir heute essen? Ich bezahle das Abendessen.', en: 'Shall we go out for dinner today? I will pay for dinner.' },
    chunks: [{ targetText: 'Пойдёмте сегодня ужинать?', baseText: { de: 'Gehen wir heute essen?', en: 'Shall we go out for dinner today?' } }, { targetText: 'Я заплачу', baseText: { de: 'Ich bezahle', en: 'I will pay' } }, { targetText: 'за ужин.', baseText: { de: 'für das Abendessen.', en: 'for dinner.' } }],
    terms: [{ targetText: 'пойдёмте', baseText: { de: 'gehen wir', en: 'let us go' } }, { targetText: 'ужинать', baseText: { de: 'zu Abend essen', en: 'to have dinner' } }, { targetText: 'заплачу', baseText: { de: 'ich werde bezahlen', en: 'I will pay' } }, { targetText: 'за ужин', baseText: { de: 'für das Abendessen; Akkusativ nach за', en: 'for dinner; accusative after за' } }, { targetText: 'приглашение', baseText: { de: 'Einladung', en: 'invitation' } }],
    recall: { before: 'Пойдёмте сегодня ужинать? Я ', answer: 'заплачу', after: ' за ужин.', fallbackChoices: ['заплачу', 'позвоню', 'закажу', 'подожду'] }, speakRequired: ['Пойдёмте', 'ужинать', 'заплачу'],
    sceneCaption: { de: 'Der Freund blickt auf die Restaurants gegenüber und fragt: „Что будем делать вечером?“', en: 'The friend looks at the restaurants across the street and asks: “Что будем делать вечером?”' },
    trophyWord: { word: 'заплачу', meaning: { de: 'ich werde bezahlen', en: 'I will pay' }, example: 'За ужин я заплачу картой.', whyThisWord: { de: 'Заплачу macht dein Angebot konkret und lässt die Einladung großzügig, aber unkompliziert klingen.', en: 'Заплачу makes the offer concrete and keeps the invitation generous but uncomplicated.' } },
    distractors: ['готовить дома.', 'после обеда?'], placeholderCaption: { de: 'Zwei gedeckte Plätze im Restaurant stehen neben einer geschlossenen Speisekarte und einer bereitliegenden Karte.', en: 'Two restaurant place settings sit beside a closed menu and a payment card ready for later.' }, songMood: 'a generous dinner invitation glowing across the evening street', visualNotes: 'Warm restaurant windows, two friends choosing where to eat, one casually holding a payment card.',
  }),
  makeRussianA2CompactLesson({
    slug: 'nemnogo-opozdayu', title: { de: 'Ein wenig verspätet', en: 'Running a little late' },
    situation: { de: 'Der Freund ist schon unterwegs zum Treffpunkt. Du meldest rechtzeitig, dass du dich etwas verspäten wirst.', en: 'Your friend is already on the way to the meeting point. Let them know in time that you will be a little late.' },
    pedagogicalGoal: 'Mit опоздаю eine bevorstehende Verspätung genderfrei ankündigen und sie mit немного abmildern.',
    targetText: 'Извините, я немного опоздаю на встречу.', baseText: { de: 'Entschuldigen Sie, ich komme etwas zu spät zu unserem Treffen.', en: 'I’m sorry, I will be a little late for our meeting.' },
    chunks: [{ targetText: 'Извините,', baseText: { de: 'Entschuldigen Sie,', en: 'I’m sorry,' } }, { targetText: 'я немного опоздаю', baseText: { de: 'ich komme etwas zu spät', en: 'I will be a little late' } }, { targetText: 'на встречу.', baseText: { de: 'zu unserem Treffen.', en: 'for our meeting.' } }],
    terms: [{ targetText: 'опоздаю', baseText: { de: 'ich werde mich verspäten', en: 'I will be late' } }, { targetText: 'немного', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'извините', baseText: { de: 'entschuldigen Sie', en: 'I am sorry' } }, { targetText: 'на встречу', baseText: { de: 'zum Treffen; Richtungsakkusativ', en: 'to the meeting; directional accusative' } }, { targetText: 'задержка', baseText: { de: 'Verzögerung', en: 'delay' } }],
    recall: { before: 'Извините, я ', answer: 'немного', after: ' опоздаю на встречу.', fallbackChoices: ['немного', 'сильно', 'точно', 'случайно'] }, speakRequired: ['Извините', 'немного', 'опоздаю'],
    sceneCaption: { de: 'Der Freund schickt vom Metroeingang die Frage: „Вы скоро будете?“', en: 'The friend messages from the metro entrance: “Вы скоро будете?”' },
    trophyWord: { word: 'опоздаю', meaning: { de: 'ich werde zu spät kommen', en: 'I will be late' }, example: 'Я опоздаю всего на пять минут.', whyThisWord: { de: 'Опоздаю warnt den Freund rechtzeitig und verhindert, dass eine kleine Verzögerung wie ein Ausbleiben wirkt.', en: 'Опоздаю warns the friend in time so a small delay does not look like a no-show.' } },
    distractors: ['уже на месте', 'жду у входа.'], placeholderCaption: { de: 'Eine Nachricht mit einer kleinen Verspätung erscheint über einer Metro-Uhr kurz vor dem Treffen.', en: 'A short delay message appears above a metro clock just before the meeting.' }, songMood: 'a quick apologetic message racing ahead of the late arrival', visualNotes: 'Metro entrance clock, phone message about a short delay, friend waiting calmly beneath the station sign.',
  }),
  makeRussianA2CompactLesson({
    slug: 'subbota-dva-dogovorilis', title: { de: 'Samstag um zwei steht', en: 'Saturday at two is set' },
    situation: { de: 'Nach mehreren Änderungen wiederholt der Freund den neuen Termin. Du bestätigst Tag und Uhrzeit endgültig.', en: 'After several changes, your friend repeats the new arrangement. Confirm the day and time once and for all.' },
    pedagogicalGoal: 'Einen geänderten Termin mit значит zusammenfassen und mit dem genderfreien festen Ausdruck Договорились bestätigen.',
    targetText: 'Значит, в субботу в два часа? Договорились!', baseText: { de: 'Also am Samstag um zwei? Abgemacht!', en: 'So, Saturday at two? Agreed!' },
    chunks: [{ targetText: 'Значит, в субботу', baseText: { de: 'Also am Samstag', en: 'So, on Saturday' } }, { targetText: 'в два часа?', baseText: { de: 'um zwei Uhr?', en: 'at two o’clock?' } }, { targetText: 'Договорились!', baseText: { de: 'Abgemacht!', en: 'Agreed!' } }],
    terms: [{ targetText: 'значит', baseText: { de: 'also, das heißt', en: 'so, that means' } }, { targetText: 'в субботу', baseText: { de: 'am Samstag', en: 'on Saturday' } }, { targetText: 'в два часа', baseText: { de: 'um zwei Uhr', en: 'at two o’clock' } }, { targetText: 'договорились', baseText: { de: 'abgemacht; genderfreie Pluralform', en: 'agreed; gender-neutral plural form' } }, { targetText: 'подтвердить', baseText: { de: 'bestätigen', en: 'to confirm' } }],
    recall: { before: 'Значит, в ', answer: 'субботу', after: ' в два часа? Договорились!', fallbackChoices: ['субботу', 'пятницу', 'среду', 'четверг'] }, speakRequired: ['Значит', 'часа', 'Договорились'],
    sceneCaption: { de: 'Der Freund prüft den geänderten Kalendereintrag und fragt: „Тогда встречаемся в субботу в два?“', en: 'The friend checks the revised calendar entry and asks: “Тогда встречаемся в субботу в два?”' },
    trophyWord: { word: 'договорились', meaning: { de: 'abgemacht, einverstanden', en: 'agreed, it is settled' }, example: 'Тогда в два часа, договорились?', whyThisWord: { de: 'Договорились schließt die ganze Terminänderung mit einer eindeutigen gemeinsamen Bestätigung ab.', en: 'Договорились closes the entire rescheduling exchange with an unambiguous shared confirmation.' } },
    distractors: ['сегодня после работы', 'встреча отменяется.'], placeholderCaption: { de: 'Der korrigierte Kalendereintrag Samstag, zwei Uhr, ist jetzt mit einem Häkchen bestätigt.', en: 'The corrected Saturday-at-two calendar entry now carries a confirming check mark.' }, songMood: 'a shifting plan finally landing with a satisfying click', visualNotes: 'Weekly calendar with earlier notes crossed out, Saturday at two cleanly circled and checked.',
  }),
  makeRussianA2CompactLesson({
    slug: 'vykhodnye-poidu-v-park', title: { de: 'Am Wochenende in den Park', en: 'The park this weekend' },
    situation: { de: 'Zum Abschluss fragt der Freund nach deinem Wochenende. Du erzählst von deinem Plan für einen langen Spaziergang im Park.', en: 'To wrap up, your friend asks about your weekend. Tell them about your plan for a long walk in the park.' },
    pedagogicalGoal: 'Mit в выходные und пойду einen genderfreien Wochenendplan mit einem Bewegungsziel ausdrücken.',
    targetText: 'В выходные я пойду гулять в большой парк.', baseText: { de: 'Am Wochenende gehe ich in einem großen Park spazieren.', en: 'This weekend I will go for a walk in a large park.' },
    chunks: [{ targetText: 'В выходные', baseText: { de: 'Am Wochenende', en: 'This weekend' } }, { targetText: 'я пойду гулять', baseText: { de: 'gehe ich spazieren', en: 'I will go for a walk' } }, { targetText: 'в большой парк.', baseText: { de: 'in einen großen Park.', en: 'to a large park.' } }],
    terms: [{ targetText: 'выходные', baseText: { de: 'Wochenende', en: 'weekend' } }, { targetText: 'пойду гулять', baseText: { de: 'ich werde spazieren gehen', en: 'I will go for a walk' } }, { targetText: 'в парк', baseText: { de: 'in den Park; Richtungsakkusativ', en: 'to the park; directional accusative' } }, { targetText: 'большой парк', baseText: { de: 'großer Park', en: 'large park' } }, { targetText: 'свободный день', baseText: { de: 'freier Tag', en: 'day off' } }],
    recall: { before: 'В выходные я пойду гулять в большой ', answer: 'парк', after: '.', fallbackChoices: ['парк', 'лес', 'сад', 'двор'] }, speakRequired: ['выходные', 'гулять', 'парк'],
    sceneCaption: { de: 'Der Freund steckt den Kalender ein und fragt: „Какие у вас планы на выходные?“', en: 'The friend puts away the calendar and asks: “Какие у вас планы на выходные?”' },
    trophyWord: { word: 'выходные', meaning: { de: 'Wochenende', en: 'weekend' }, example: 'На выходные обещают хорошую погоду.', whyThisWord: { de: 'Выходные bündeln den letzten Zukunftsplan des Pfads in einem vertrauten Zeitrahmen.', en: 'Выходные gathers the path’s final future plan into a familiar time frame.' } },
    distractors: ['в рабочее утро', 'смотреть новый фильм.'], placeholderCaption: { de: 'Ein breiter Parkweg liegt unter Wochenendsonne, daneben stehen bequeme Spaziergangsschuhe.', en: 'A broad park path sits in weekend sunlight beside comfortable walking shoes.' }, songMood: 'an open weekend stretching into a bright park walk', visualNotes: 'Large green park, long walking path, weekend sunlight, relaxed walker heading through the gate.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_FOUR_METADATA,
  russianA2Practical4Inputs,
  { de: 'Du hast Russisch A2 Praxis 4 abgeschlossen und kannst Pläne vorschlagen, verschieben, absagen und bestätigen.', en: 'You have completed Russian A2 Practical 4 and can propose, reschedule, decline, and confirm plans.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_FIVE_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-5',
  title: 'Russian A2 Practical 5',
  shortTitle: 'A2 Practical 5',
  subtitle: { de: 'Fehler höflich korrigieren und passende Alternativen erbitten', en: 'Politely correcting mistakes and asking for suitable alternatives' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical5Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'zakazala-chai-ne-kofe', title: { de: 'Tee, nicht Kaffee', en: 'Tea, not coffee' },
    situation: { de: 'Im Café wird dir Kaffee hingestellt, obwohl du Tee bestellt hast. Du korrigierst die Bestellung ruhig und bittest um Tee.', en: 'At the cafe, you are served coffee even though you ordered tea. Correct the order calmly and ask for tea.' },
    pedagogicalGoal: 'Mit der femininen Vergangenheitsform заказала und не X, а Y eine falsche Bestellung höflich berichtigen.',
    targetText: 'Я заказала чай, а не кофе. Принесите чай, пожалуйста.', baseText: { de: 'Ich habe Tee bestellt, nicht Kaffee. Bringen Sie bitte Tee.', en: 'I ordered tea, not coffee. Please bring tea.' },
    chunks: [{ targetText: 'Я заказала чай,', baseText: { de: 'Ich habe Tee bestellt,', en: 'I ordered tea,' } }, { targetText: 'а не кофе.', baseText: { de: 'nicht Kaffee.', en: 'not coffee.' } }, { targetText: 'Принесите чай, пожалуйста.', baseText: { de: 'Bringen Sie bitte Tee.', en: 'Please bring tea.' } }],
    terms: [{ targetText: 'заказала', baseText: { de: 'ich habe bestellt (Frau; Mann: заказал)', en: 'I ordered (female; male: заказал)' }, alsoAccept: ['заказал'] }, { targetText: 'чай', baseText: { de: 'Tee', en: 'tea' } }, { targetText: 'кофе', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'принесите', baseText: { de: 'bringen Sie', en: 'please bring' } }, { targetText: 'ошибка', baseText: { de: 'Fehler', en: 'mistake' } }],
    recall: { before: 'Я заказала ', answer: 'чай', after: ', а не кофе. Принесите чай, пожалуйста.', fallbackChoices: ['чай', 'сок', 'лимонад', 'компот'] }, speakRequired: ['чай', 'кофе', 'Принесите'], genderForms: { voiced: 'заказала', other: 'заказал' },
    sceneCaption: { de: 'Der Kellner stellt eine Kaffeetasse hin und sagt: „Ваш кофе готов.“', en: 'The waiter sets down a coffee cup and says: “Ваш кофе готов.”' },
    trophyWord: { word: 'кофе', meaning: { de: 'Kaffee', en: 'coffee' }, example: 'На столе кофе, а не чай.', whyThisWord: { de: 'Кофе benennt genau den falschen Artikel, den du mit а не von deiner echten Bestellung abgrenzt.', en: 'Кофе names the exact wrong item that а не contrasts with what you actually ordered.' } },
    distractors: ['кофе без сахара.', 'Оплатите у кассы.'], placeholderCaption: { de: 'Eine falsche Kaffeetasse steht neben einem Bestellbon, auf dem Tee markiert ist.', en: 'An incorrect coffee cup sits beside an order slip with tea marked on it.' }, songMood: 'a calm cafe correction restoring the order without friction', visualNotes: 'Cafe counter, coffee served by mistake, tea written clearly on the order slip, customer responding politely.',
  }),
  makeRussianA2CompactLesson({
    slug: 'futbolka-mala-obmenyat', title: { de: 'Das T-Shirt umtauschen', en: 'Exchange the T-shirt' },
    situation: { de: 'Im Kleidungsgeschäft sitzt das T-Shirt zu eng. Du erklärst das Problem und fragst nach einem Umtausch.', en: 'At the clothing shop, the T-shirt is too small. Explain the problem and ask to exchange it.' },
    pedagogicalGoal: 'Eine unpassende Größe benennen und mit Можно обменять? höflich nach einer anderen Variante fragen.',
    targetText: 'Эта футболка мала. Можно обменять на другую?', baseText: { de: 'Dieses T-Shirt ist zu klein. Kann ich es gegen ein anderes umtauschen?', en: 'This T-shirt is too small. Can I exchange it for another one?' },
    chunks: [{ targetText: 'Эта футболка мала.', baseText: { de: 'Dieses T-Shirt ist zu klein.', en: 'This T-shirt is too small.' } }, { targetText: 'Можно обменять', baseText: { de: 'Kann ich es umtauschen', en: 'Can I exchange it' } }, { targetText: 'на другую?', baseText: { de: 'gegen ein anderes?', en: 'for another one?' } }],
    terms: [{ targetText: 'футболка', baseText: { de: 'T-Shirt', en: 'T-shirt' } }, { targetText: 'мала', baseText: { de: 'zu klein; stimmt mit футболка überein', en: 'too small; agrees with футболка' } }, { targetText: 'обменять', baseText: { de: 'umtauschen', en: 'to exchange' } }, { targetText: 'на другую', baseText: { de: 'gegen eine andere; Akkusativ feminin', en: 'for another one; feminine accusative' } }, { targetText: 'размер', baseText: { de: 'Größe', en: 'size' } }],
    recall: { before: 'Эта футболка мала. Можно ', answer: 'обменять', after: ' на другую?', fallbackChoices: ['обменять', 'примерить', 'оплатить', 'посмотреть'] }, speakRequired: ['футболка', 'обменять', 'другую'],
    sceneCaption: { de: 'Die Verkäuferin betrachtet die Passform und fragt: „Футболка вам подходит?“', en: 'The shop assistant looks at the fit and asks: “Футболка вам подходит?”' },
    trophyWord: { word: 'обменять', meaning: { de: 'umtauschen', en: 'to exchange' }, example: 'Можно обменять футболку сегодня?', whyThisWord: { de: 'Обменять führt direkt von der falschen Größe zu einer praktischen, höflichen Lösung.', en: 'Обменять moves directly from the wrong size to a practical, polite solution.' } },
    distractors: ['оставить этот размер', 'касса у входа.'], placeholderCaption: { de: 'Ein zu kleines T-Shirt liegt gefaltet neben demselben Modell in einer größeren Größe.', en: 'A too-small T-shirt lies folded beside the same style in a larger size.' }, songMood: 'a fitting-room problem turning into an easy exchange', visualNotes: 'Clothing counter, snug shirt returned neatly, larger matching shirt ready on a hanger.',
  }),
  makeRussianA2CompactLesson({
    slug: 'gaz-voda-bez-gaza', title: { de: 'Wasser ohne Kohlensäure', en: 'Still water instead' },
    situation: { de: 'Im Restaurant wird Sprudelwasser gebracht. Du erinnerst freundlich daran, dass du stilles Wasser möchtest.', en: 'At the restaurant, sparkling water is brought to the table. Politely clarify that you want still water.' },
    pedagogicalGoal: 'Mit не X, а Y zwei feminine Akkusativformen kontrastieren und die gewünschte Alternative präzisieren.',
    targetText: 'Не газированную, а обычную воду без газа, пожалуйста.', baseText: { de: 'Nicht das Wasser mit Kohlensäure, sondern stilles Wasser, bitte.', en: 'Not sparkling water, but still water, please.' },
    chunks: [{ targetText: 'Не газированную,', baseText: { de: 'Nicht das Wasser mit Kohlensäure,', en: 'Not sparkling water,' } }, { targetText: 'а обычную воду', baseText: { de: 'sondern normales Wasser', en: 'but regular water' } }, { targetText: 'без газа, пожалуйста.', baseText: { de: 'ohne Kohlensäure, bitte.', en: 'without gas, please.' } }],
    terms: [{ targetText: 'газированная вода', baseText: { de: 'Wasser mit Kohlensäure', en: 'sparkling water' } }, { targetText: 'обычная вода', baseText: { de: 'normales, stilles Wasser', en: 'regular, still water' } }, { targetText: 'без газа', baseText: { de: 'ohne Kohlensäure; Genitiv nach без', en: 'without gas; genitive after без' } }, { targetText: 'бутылка', baseText: { de: 'Flasche', en: 'bottle' } }, { targetText: 'заменить', baseText: { de: 'ersetzen', en: 'to replace' } }],
    recall: { before: 'Не газированную, а ', answer: 'обычную', after: ' воду без газа, пожалуйста.', fallbackChoices: ['обычную', 'тёплую', 'холодную', 'сладкую'] }, speakRequired: ['газированную', 'обычную', 'воду'],
    sceneCaption: { de: 'Der Kellner öffnet eine Sprudelflasche und sagt: „Вот ваша газированная вода.“', en: 'The waiter opens a sparkling-water bottle and says: “Вот ваша газированная вода.”' },
    trophyWord: { word: 'газ', meaning: { de: 'Gas, Kohlensäure', en: 'gas, carbonation' }, example: 'В этой воде нет газа.', whyThisWord: { de: 'Газ ist das entscheidende Merkmal, mit dem du die falsche Flasche von der gewünschten unterscheidest.', en: 'Газ is the decisive feature that distinguishes the wrong bottle from the one you want.' } },
    distractors: ['с лимоном,', 'два пустых стакана.'], placeholderCaption: { de: 'Eine geöffnete Sprudelflasche steht neben einer ungeöffneten Flasche stillen Wassers.', en: 'An opened sparkling-water bottle stands beside an unopened bottle of still water.' }, songMood: 'a crisp restaurant correction swapping bubbles for stillness', visualNotes: 'Restaurant table, visible bubbles in one bottle, still water in another, server ready to replace it.',
  }),
  makeRussianA2CompactLesson({
    slug: 'yabloki-eti-a-te', title: { de: 'Die dortigen Äpfel', en: 'Those apples instead' },
    situation: { de: 'Der Markthändler greift nach der nahen Apfelkiste. Du zeigst höflich auf die andere Kiste.', en: 'The market vendor reaches for the nearer crate of apples. Politely point to the other crate.' },
    pedagogicalGoal: 'Mit не эти, а те eine sichtbare Auswahl knapp und höflich korrigieren.',
    targetText: 'Не эти яблоки, а те, пожалуйста.', baseText: { de: 'Nicht diese Äpfel, sondern die dort, bitte.', en: 'Not these apples, but those, please.' },
    chunks: [{ targetText: 'Не эти яблоки,', baseText: { de: 'Nicht diese Äpfel,', en: 'Not these apples,' } }, { targetText: 'а те,', baseText: { de: 'sondern die dort,', en: 'but those,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'эти яблоки', baseText: { de: 'diese Äpfel', en: 'these apples' } }, { targetText: 'те', baseText: { de: 'jene, die dort', en: 'those' } }, { targetText: 'яблоко', baseText: { de: 'Apfel', en: 'apple' } }, { targetText: 'выбрать', baseText: { de: 'auswählen', en: 'to choose' } }, { targetText: 'другая коробка', baseText: { de: 'andere Kiste', en: 'other box' } }],
    recall: { before: 'Не эти ', answer: 'яблоки', after: ', а те, пожалуйста.', fallbackChoices: ['яблоки', 'груши', 'сливы', 'бананы'] }, speakRequired: ['эти', 'яблоки', 'пожалуйста'],
    sceneCaption: { de: 'Der Händler legt die Hand auf die vordere Kiste und fragt: „Вам эти яблоки?“', en: 'The vendor rests a hand on the front crate and asks: “Вам эти яблоки?”' },
    trophyWord: { word: 'яблоко', meaning: { de: 'Apfel', en: 'apple' }, example: 'Это яблоко из дальней коробки.', whyThisWord: { de: 'Яблоко hält die Korrektur an einem sichtbaren Gegenstand fest, während эти und те die Auswahl lenken.', en: 'Яблоко anchors the correction to a visible item while эти and те redirect the choice.' } },
    distractors: ['из этой корзины', 'два килограмма груш.'], placeholderCaption: { de: 'Zwei deutlich getrennte Apfelkisten stehen auf dem Markt, und eine Hand zeigt zur hinteren.', en: 'Two clearly separated apple crates sit at the market, with one hand pointing to the farther one.' }, songMood: 'a quick market gesture redirecting the vendor to the right crate', visualNotes: 'Produce stall, two apple crates with different varieties, customer pointing beyond the nearer box.',
  }),
  makeRussianA2CompactLesson({
    slug: 'shumno-drugaya-komnata', title: { de: 'Ein ruhigeres Zimmer', en: 'Another room' },
    situation: { de: 'Im Hotelzimmer dringt lauter Aufzugslärm herein. Du erklärst das Problem an der Rezeption und fragst nach einem anderen Zimmer.', en: 'Loud elevator noise reaches your hotel room. Explain the problem at reception and ask for another room.' },
    pedagogicalGoal: 'Ein Zimmerproblem mit шумно benennen und mit Есть другая? höflich nach einer Alternative fragen.',
    targetText: 'В комнате очень шумно. Есть другая комната?', baseText: { de: 'Im Zimmer ist es sehr laut. Gibt es ein anderes Zimmer?', en: 'It is very noisy in the room. Is there another room?' },
    chunks: [{ targetText: 'В комнате очень шумно.', baseText: { de: 'Im Zimmer ist es sehr laut.', en: 'It is very noisy in the room.' } }, { targetText: 'Есть', baseText: { de: 'Gibt es', en: 'Is there' } }, { targetText: 'другая комната?', baseText: { de: 'ein anderes Zimmer?', en: 'another room?' } }],
    terms: [{ targetText: 'в комнате', baseText: { de: 'im Zimmer; Präpositiv', en: 'in the room; prepositional' } }, { targetText: 'шумно', baseText: { de: 'laut', en: 'noisy' } }, { targetText: 'другая комната', baseText: { de: 'anderes Zimmer', en: 'another room' } }, { targetText: 'лифт', baseText: { de: 'Aufzug', en: 'elevator' } }, { targetText: 'поменять', baseText: { de: 'wechseln', en: 'to change' } }],
    recall: { before: 'В комнате очень ', answer: 'шумно', after: '. Есть другая комната?', fallbackChoices: ['шумно', 'холодно', 'темно', 'жарко'] }, speakRequired: ['комнате', 'шумно', 'другая'],
    sceneCaption: { de: 'Die Rezeptionistin sieht auf deine Zimmerkarte und fragt: „Вас устраивает номер?“', en: 'The receptionist looks at your room card and asks: “Вас устраивает номер?”' },
    trophyWord: { word: 'шумно', meaning: { de: 'laut, geräuschvoll', en: 'noisy, loud' }, example: 'Около лифта ночью шумно.', whyThisWord: { de: 'Шумно benennt den konkreten Mangel, der deine Bitte um ein anderes Zimmer rechtfertigt.', en: 'Шумно names the concrete problem that justifies asking for another room.' } },
    distractors: ['окно во двор', 'ключ от номера.'], placeholderCaption: { de: 'Eine Zimmerkarte liegt neben einer Skizze, auf der der laute Aufzug direkt an der Wand markiert ist.', en: 'A room card lies beside a sketch marking the noisy elevator directly against the wall.' }, songMood: 'hotel noise fading as a quieter option comes into view', visualNotes: 'Reception desk, room card, elevator icon near the current room, quieter room highlighted across the hall.',
  }),
  makeRussianA2CompactLesson({
    slug: 'tolko-eta-upakovka', title: { de: 'Nur diese Packung', en: 'Only this package' },
    situation: { de: 'In der Apotheke wird dir noch ein Zusatzprodukt angeboten. Du lehnst freundlich ab und bleibst bei deiner Packung.', en: 'At the pharmacy, you are offered an extra product. Decline politely and keep only your package.' },
    pedagogicalGoal: 'Ein Zusatzangebot mit Нет, спасибо ablehnen und die gewünschte Auswahl mit только begrenzen.',
    targetText: 'Нет, спасибо. Только эта упаковка, пожалуйста.', baseText: { de: 'Nein, danke. Nur diese Packung, bitte.', en: 'No, thank you. Just this package, please.' },
    chunks: [{ targetText: 'Нет, спасибо.', baseText: { de: 'Nein, danke.', en: 'No, thank you.' } }, { targetText: 'Только эта упаковка,', baseText: { de: 'Nur diese Packung,', en: 'Just this package,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'нет, спасибо', baseText: { de: 'nein, danke', en: 'no, thank you' } }, { targetText: 'только', baseText: { de: 'nur', en: 'only' } }, { targetText: 'упаковка', baseText: { de: 'Packung', en: 'package' } }, { targetText: 'добавить', baseText: { de: 'hinzufügen', en: 'to add' } }, { targetText: 'достаточно', baseText: { de: 'genug', en: 'enough' } }],
    recall: { before: 'Нет, спасибо. Только эта ', answer: 'упаковка', after: ', пожалуйста.', fallbackChoices: ['упаковка', 'бутылка', 'банка', 'книга'] }, speakRequired: ['спасибо', 'Только', 'упаковка'],
    sceneCaption: { de: 'Die Apothekerin nimmt noch eine Tube aus dem Regal und fragt: „Добавить ещё крем?“', en: 'The pharmacist takes another tube from the shelf and asks: “Добавить ещё крем?”' },
    trophyWord: { word: 'упаковка', meaning: { de: 'Packung', en: 'package, pack' }, example: 'Эта упаковка лежит у кассы.', whyThisWord: { de: 'Упаковка markiert genau den einen Artikel, bei dem du nach dem abgelehnten Zusatzangebot bleibst.', en: 'Упаковка marks the one exact item you keep after declining the add-on.' } },
    distractors: ['ещё один крем', 'Оплата отдельно.'], placeholderCaption: { de: 'Eine ausgewählte Arzneipackung liegt allein neben einer zurückgestellten Tube.', en: 'One selected medicine package sits alone beside an extra tube being returned to the shelf.' }, songMood: 'a gentle no keeping a small purchase simple and clear', visualNotes: 'Pharmacy counter, one medicine package selected, optional cream moved back toward the shelf.',
  }),
  makeRussianA2CompactLesson({
    slug: 'nepravilnaya-summa', title: { de: 'Die Summe stimmt nicht', en: 'The total is wrong' },
    situation: { de: 'Beim Bezahlen bemerkst du eine falsche Summe auf der Rechnung. Du bittest darum, sie noch einmal zu prüfen.', en: 'While paying, you notice an incorrect total on the bill. Ask for it to be checked again.' },
    pedagogicalGoal: 'Eine falsche Rechnungsangabe benennen und mit einem höflichen perfektiven вы-Imperativ um erneute Prüfung bitten.',
    targetText: 'В счёте неправильная сумма. Посмотрите ещё раз, пожалуйста.', baseText: { de: 'Auf der Rechnung steht eine falsche Summe. Sehen Sie bitte noch einmal nach.', en: 'The total on the bill is wrong. Please look again.' },
    chunks: [{ targetText: 'В счёте неправильная сумма.', baseText: { de: 'Auf der Rechnung steht eine falsche Summe.', en: 'The total on the bill is wrong.' } }, { targetText: 'Посмотрите ещё раз,', baseText: { de: 'Sehen Sie noch einmal nach,', en: 'Please look again,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'в счёте', baseText: { de: 'auf der Rechnung; Präpositiv', en: 'on the bill; prepositional' } }, { targetText: 'неправильная сумма', baseText: { de: 'falsche Summe', en: 'incorrect total' } }, { targetText: 'посмотрите', baseText: { de: 'sehen Sie nach', en: 'please look' } }, { targetText: 'ещё раз', baseText: { de: 'noch einmal', en: 'again' } }, { targetText: 'проверить', baseText: { de: 'prüfen', en: 'to check' } }],
    recall: { before: 'В счёте неправильная ', answer: 'сумма', after: '. Посмотрите ещё раз, пожалуйста.', fallbackChoices: ['сумма', 'дата', 'подпись', 'строка'] }, speakRequired: ['счёте', 'сумма', 'Посмотрите'],
    sceneCaption: { de: 'Die Kassiererin dreht das Display zu dir und fragt: „Всё правильно в счёте?“', en: 'The cashier turns the display toward you and asks: “Всё правильно в счёте?”' },
    trophyWord: { word: 'сумма', meaning: { de: 'Summe, Gesamtbetrag', en: 'sum, total' }, example: 'Сумма в счёте слишком большая.', whyThisWord: { de: 'Сумма zeigt genau, welcher Teil der Rechnung geprüft und korrigiert werden muss.', en: 'Сумма identifies the exact part of the bill that needs checking and correction.' } },
    distractors: ['Оплатите сейчас.', 'карта у терминала.'], placeholderCaption: { de: 'Auf dem Kassendisplay ist ein unerwartet hoher Gesamtbetrag neben dem Papierbeleg markiert.', en: 'An unexpectedly high total is highlighted on the register display beside the paper bill.' }, songMood: 'a careful checkout pause catching one wrong number', visualNotes: 'Checkout counter, customer comparing bill and display, incorrect total circled for the cashier.',
  }),
  makeRussianA2CompactLesson({
    slug: 'upakovku-pomenshe', title: { de: 'Eine kleinere Packung', en: 'A smaller package' },
    situation: { de: 'In der Apotheke wird dir eine große Packung angeboten. Du bittest freundlich um eine kleinere.', en: 'At the pharmacy, you are offered a large package. Politely ask for a smaller one.' },
    pedagogicalGoal: 'Mit dem höflichen Imperativ Дайте und dem umgangsnahen Komparativ поменьше eine passendere Größe erbitten.',
    targetText: 'Дайте, пожалуйста, упаковку поменьше.', baseText: { de: 'Geben Sie mir bitte eine kleinere Packung.', en: 'Please give me a smaller package.' },
    chunks: [{ targetText: 'Дайте, пожалуйста,', baseText: { de: 'Geben Sie mir bitte', en: 'Please give me' } }, { targetText: 'упаковку', baseText: { de: 'eine Packung', en: 'a package' } }, { targetText: 'поменьше.', baseText: { de: 'eine kleinere.', en: 'a smaller one.' } }],
    terms: [{ targetText: 'дайте', baseText: { de: 'geben Sie mir', en: 'please give me' } }, { targetText: 'упаковку', baseText: { de: 'Packung im Akkusativ', en: 'package in the accusative' } }, { targetText: 'поменьше', baseText: { de: 'etwas kleiner', en: 'a little smaller' } }, { targetText: 'размер', baseText: { de: 'Größe', en: 'size' } }, { targetText: 'маленькая пачка', baseText: { de: 'kleine Packung', en: 'small pack' } }],
    recall: { before: 'Дайте, пожалуйста, упаковку ', answer: 'поменьше', after: '.', fallbackChoices: ['поменьше', 'подешевле', 'побольше', 'потяжелее'] }, speakRequired: ['Дайте', 'упаковку', 'поменьше'],
    sceneCaption: { de: 'Die Apothekerin hält die größte Packung hoch und fragt: „Вам большую упаковку?“', en: 'The pharmacist holds up the largest package and asks: “Вам большую упаковку?”' },
    trophyWord: { word: 'поменьше', meaning: { de: 'etwas kleiner', en: 'a little smaller' }, example: 'Мне нужна упаковка поменьше.', whyThisWord: { de: 'Поменьше korrigiert nicht das Produkt, sondern genau die unpraktische Packungsgröße.', en: 'Поменьше corrects not the product but the impractical package size itself.' } },
    distractors: ['самую большую.', 'две коробки рядом.'], placeholderCaption: { de: 'Eine große und eine kleine Arzneipackung liegen nebeneinander, die kleinere näher zur Kundin geschoben.', en: 'A large and a small medicine package sit side by side, with the smaller one moved closer to the customer.' }, songMood: 'a practical size adjustment made with one soft comparison', visualNotes: 'Pharmacy shelf, two package sizes, pharmacist switching from the largest box to a compact one.',
  }),
  makeRussianA2CompactLesson({
    slug: 'taksi-pryamo-na-vokzal', title: { de: 'Direkt zum Bahnhof', en: 'Straight to the station' },
    situation: { de: 'Der Taxifahrer nimmt an, dass du ins Zentrum möchtest. Du korrigierst das Ziel und bittest um die direkte Fahrt zum Bahnhof.', en: 'The taxi driver assumes you want the city center. Correct the destination and ask to go straight to the station.' },
    pedagogicalGoal: 'Mit не в X, а на Y zwei Richtungsangaben kontrastieren und das gewünschte Ziel mit прямо präzisieren.',
    targetText: 'Не в центр, а прямо на вокзал, пожалуйста.', baseText: { de: 'Nicht ins Zentrum, sondern direkt zum Bahnhof, bitte.', en: 'Not to the center, but straight to the station, please.' },
    chunks: [{ targetText: 'Не в центр,', baseText: { de: 'Nicht ins Zentrum,', en: 'Not to the center,' } }, { targetText: 'а прямо на вокзал,', baseText: { de: 'sondern direkt zum Bahnhof,', en: 'but straight to the station,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'в центр', baseText: { de: 'ins Zentrum; Richtungsakkusativ', en: 'to the center; directional accusative' } }, { targetText: 'на вокзал', baseText: { de: 'zum Bahnhof; Richtungsakkusativ', en: 'to the station; directional accusative' } }, { targetText: 'прямо', baseText: { de: 'direkt, geradeaus', en: 'straight, directly' } }, { targetText: 'адрес назначения', baseText: { de: 'Zieladresse', en: 'destination address' } }, { targetText: 'исправить', baseText: { de: 'korrigieren', en: 'to correct' } }],
    recall: { before: 'Не в центр, а прямо на ', answer: 'вокзал', after: ', пожалуйста.', fallbackChoices: ['вокзал', 'аэропорт', 'театр', 'музей'] }, speakRequired: ['центр', 'прямо', 'вокзал'],
    sceneCaption: { de: 'Der Fahrer tippt das Stadtzentrum als Ziel ein und fragt: „Вам в центр?“', en: 'The driver enters the city center as the destination and asks: “Вам в центр?”' },
    trophyWord: { word: 'прямо', meaning: { de: 'direkt, geradeaus', en: 'straight, directly' }, example: 'Поезжайте прямо до станции.', whyThisWord: { de: 'Прямо macht klar, dass der Bahnhof ohne den vermuteten Umweg über das Zentrum dein einziges Ziel ist.', en: 'Прямо makes clear that the station, without the assumed detour through downtown, is your only destination.' } },
    distractors: ['через старый мост', 'остановите здесь.'], placeholderCaption: { de: 'Auf dem Taxinavi wird das Zentrum gelöscht und der Bahnhof als direktes Ziel markiert.', en: 'The taxi navigation clears downtown and marks the station as the direct destination.' }, songMood: 'a mistaken taxi route snapping cleanly toward the station', visualNotes: 'Taxi dashboard, city-center pin replaced by station icon, direct route glowing on the map.',
  }),
  makeRussianA2CompactLesson({
    slug: 'drugoi-raz-ne-segodnya', title: { de: 'Vielleicht ein anderes Mal', en: 'Perhaps another time' },
    situation: { de: 'Eine Bekannte lädt dich noch für heute ein. Du lehnst ohne harten Ton ab und lässt einen späteren Termin offen.', en: 'An acquaintance invites you over today. Decline without sounding abrupt and leave open a later time.' },
    pedagogicalGoal: 'Mit не получится eine weiche Absage formulieren und mit Может быть, в другой раз eine Alternative offenlassen.',
    targetText: 'Сегодня не получится. Может быть, в другой раз.', baseText: { de: 'Heute klappt es nicht. Vielleicht ein anderes Mal.', en: 'Today will not work. Perhaps another time.' },
    chunks: [{ targetText: 'Сегодня не получится.', baseText: { de: 'Heute klappt es nicht.', en: 'Today will not work.' } }, { targetText: 'Может быть,', baseText: { de: 'Vielleicht', en: 'Perhaps' } }, { targetText: 'в другой раз.', baseText: { de: 'ein anderes Mal.', en: 'another time.' } }],
    terms: [{ targetText: 'не получится', baseText: { de: 'es klappt nicht', en: 'it will not work' } }, { targetText: 'может быть', baseText: { de: 'vielleicht', en: 'perhaps' } }, { targetText: 'в другой раз', baseText: { de: 'ein anderes Mal', en: 'another time' } }, { targetText: 'приглашение', baseText: { de: 'Einladung', en: 'invitation' } }, { targetText: 'отказ', baseText: { de: 'Absage, Ablehnung', en: 'refusal' } }],
    recall: { before: 'Сегодня не ', answer: 'получится', after: '. Может быть, в другой раз.', fallbackChoices: ['получится', 'случится', 'начнётся', 'закончится'] }, speakRequired: ['Сегодня', 'получится', 'другой'],
    sceneCaption: { de: 'Die Bekannte hält die Wohnungstür offen und fragt: „Вы придёте сегодня в гости?“', en: 'The acquaintance holds the apartment door open and asks: “Вы придёте сегодня в гости?”' },
    trophyWord: { word: 'получится', meaning: { de: 'es klappt, es wird gelingen', en: 'it will work out' }, example: 'Сегодня встретиться не получится.', whyThisWord: { de: 'Получится lässt die Absage sachlich und weich klingen, ohne eine komplizierte Erklärung zu verlangen.', en: 'Получится keeps the refusal matter-of-fact and gentle without requiring a complicated explanation.' } },
    distractors: ['обязательно сегодня.', 'после нашей встречи.'], placeholderCaption: { de: 'Eine offene Einladung für heute liegt neben einer leeren Kalenderseite für einen späteren Termin.', en: 'An open invitation for today rests beside a blank calendar page for a later date.' }, songMood: 'a soft refusal leaving the door open for another day', visualNotes: 'Apartment doorway, friendly invitation, phone calendar showing today busy and a later day still open.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_FIVE_METADATA,
  russianA2Practical5Inputs,
  { de: 'Du hast Russisch A2 Praxis 5 abgeschlossen und kannst Fehler höflich korrigieren und passende Alternativen erbitten.', en: 'You have completed Russian A2 Practical 5 and can politely correct mistakes and request suitable alternatives.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_SIX_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-6',
  title: 'Russian A2 Practical 6',
  shortTitle: 'A2 Practical 6',
  subtitle: { de: 'Dienstleistungen beauftragen, abholen und zeitlich klären', en: 'Arranging, collecting, and timing everyday services' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical6Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'postiraite-kogda-gotovo', title: { de: 'Wann ist die Wäsche fertig?', en: 'When will the laundry be ready?' },
    situation: { de: 'In der Wäscherei gibst du ein Hemd ab. Du beauftragst die Reinigung und fragst nach dem Abholzeitpunkt.', en: 'At the laundry, you drop off a shirt. Ask for it to be washed and find out when the order will be ready.' },
    pedagogicalGoal: 'Mit dem perfektiven вы-Imperativ Постирайте einen Auftrag geben und mit Когда будет готово? nach der Fertigstellung fragen.',
    targetText: 'Постирайте рубашку, пожалуйста. Когда будет готово?', baseText: { de: 'Waschen Sie bitte das Hemd. Wann ist es fertig?', en: 'Please wash the shirt. When will it be ready?' },
    chunks: [{ targetText: 'Постирайте рубашку,', baseText: { de: 'Waschen Sie das Hemd,', en: 'Wash the shirt,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }, { targetText: 'Когда будет готово?', baseText: { de: 'Wann ist es fertig?', en: 'When will it be ready?' } }],
    terms: [{ targetText: 'постирайте', baseText: { de: 'waschen Sie', en: 'please wash' } }, { targetText: 'рубашка', baseText: { de: 'Hemd', en: 'shirt' } }, { targetText: 'когда', baseText: { de: 'wann', en: 'when' } }, { targetText: 'будет готово', baseText: { de: 'wird fertig sein', en: 'will be ready' } }, { targetText: 'прачечная', baseText: { de: 'Wäscherei', en: 'laundry' } }],
    recall: { before: 'Постирайте ', answer: 'рубашку', after: ', пожалуйста. Когда будет готово?', fallbackChoices: ['рубашку', 'куртку', 'юбку', 'простыню'] }, speakRequired: ['Постирайте', 'рубашку', 'готово'],
    sceneCaption: { de: 'Die Mitarbeiterin öffnet den Wäschebeutel und fragt: „Что нужно постирать?“', en: 'The attendant opens the laundry bag and asks: “Что нужно постирать?”' },
    trophyWord: { word: 'постирайте', meaning: { de: 'waschen Sie', en: 'please wash' }, example: 'Постирайте эту рубашку отдельно.', whyThisWord: { de: 'Постирайте erteilt den konkreten Auftrag, bevor du den Abholzeitpunkt klärst.', en: 'Постирайте gives the concrete service instruction before you clarify pickup time.' } },
    distractors: ['Погладьте брюки,', 'завтра утром.'], placeholderCaption: { de: 'Ein Hemd liegt in einem beschrifteten Wäschebeutel neben einem noch leeren Abholschein.', en: 'A shirt rests in a labeled laundry bag beside a pickup slip with the time still blank.' }, songMood: 'a crisp laundry errand moving from handoff to pickup time', visualNotes: 'Neighborhood laundry counter, shirt in service bag, attendant holding a pickup ticket and checking the schedule.',
  }),
  makeRussianA2CompactLesson({
    slug: 'ekran-razbilsya-pochinit', title: { de: 'Der Bildschirm ist kaputt', en: 'The screen broke' },
    situation: { de: 'In der Handywerkstatt zeigst du einen gesprungenen Bildschirm. Du erklärst den Schaden und fragst nach einer Reparatur noch heute.', en: 'At a phone repair shop, you show a cracked screen. Explain the damage and ask whether it can be repaired today.' },
    pedagogicalGoal: 'Einen Schaden mit dem subjektbezogenen экран разбился melden und mit Можно починить? um Reparatur bitten.',
    targetText: 'Экран разбился. Можно починить его сегодня?', baseText: { de: 'Der Bildschirm ist zerbrochen. Kann man ihn heute reparieren?', en: 'The screen broke. Can it be repaired today?' },
    chunks: [{ targetText: 'Экран разбился.', baseText: { de: 'Der Bildschirm ist zerbrochen.', en: 'The screen broke.' } }, { targetText: 'Можно починить его', baseText: { de: 'Kann man ihn reparieren', en: 'Can it be repaired' } }, { targetText: 'сегодня?', baseText: { de: 'heute?', en: 'today?' } }],
    terms: [{ targetText: 'экран', baseText: { de: 'Bildschirm', en: 'screen' } }, { targetText: 'разбился', baseText: { de: 'ist zerbrochen; stimmt mit экран überein', en: 'broke; agrees with экран' } }, { targetText: 'починить', baseText: { de: 'reparieren', en: 'to repair' } }, { targetText: 'сегодня', baseText: { de: 'heute', en: 'today' } }, { targetText: 'мастерская', baseText: { de: 'Werkstatt', en: 'repair shop' } }],
    recall: { before: 'Экран разбился. Можно ', answer: 'починить', after: ' его сегодня?', fallbackChoices: ['починить', 'зарядить', 'проверить', 'заменить'] }, speakRequired: ['Экран', 'починить', 'сегодня'],
    sceneCaption: { de: 'Der Techniker betrachtet die Risse und fragt: „Что случилось с телефоном?“', en: 'The technician studies the cracks and asks: “Что случилось с телефоном?”' },
    trophyWord: { word: 'экран', meaning: { de: 'Bildschirm', en: 'screen' }, example: 'Экран телефона нужно заменить.', whyThisWord: { de: 'Экран benennt das beschädigte Teil, damit die Werkstatt sofort weiß, welche Reparatur du brauchst.', en: 'Экран names the damaged part so the repair shop immediately knows what service you need.' } },
    distractors: ['Купите новый чехол.', 'зарядка на столе.'], placeholderCaption: { de: 'Ein Handy mit gesprungenem Bildschirm liegt unter einer Werkstattlampe neben feinem Werkzeug.', en: 'A phone with a cracked screen lies under a repair lamp beside precision tools.' }, songMood: 'a sharp little accident meeting a practical repair question', visualNotes: 'Phone repair bench, cracked screen visible, technician inspecting it beneath a focused lamp.',
  }),
  makeRussianA2CompactLesson({
    slug: 'popolnite-pyatsot-rublei', title: { de: 'Fünfhundert Rubel aufladen', en: 'Top up five hundred rubles' },
    situation: { de: 'Am Serviceschalter möchtest du deine Fahrkarte aufladen. Du nennst den Betrag und bittest um die Buchung.', en: 'At the service counter, you want to top up your transport card. State the amount and ask for the credit.' },
    pedagogicalGoal: 'Mit Пополните einen einmaligen Serviceauftrag geben und den Betrag mit на плюс Akkusativ ausdrücken.',
    targetText: 'Пополните карту на пятьсот рублей, пожалуйста.', baseText: { de: 'Laden Sie die Karte bitte mit fünfhundert Rubel auf.', en: 'Please top up the card with five hundred rubles.' },
    chunks: [{ targetText: 'Пополните карту', baseText: { de: 'Laden Sie die Karte auf', en: 'Top up the card' } }, { targetText: 'на пятьсот рублей,', baseText: { de: 'mit fünfhundert Rubel,', en: 'with five hundred rubles,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'пополнить', baseText: { de: 'aufladen, Guthaben hinzufügen', en: 'to top up' } }, { targetText: 'карта', baseText: { de: 'Karte', en: 'card' } }, { targetText: 'пятьсот', baseText: { de: 'fünfhundert', en: 'five hundred' } }, { targetText: 'рублей', baseText: { de: 'Rubel im Genitiv Plural', en: 'rubles in the genitive plural' } }, { targetText: 'баланс', baseText: { de: 'Guthaben', en: 'balance' } }],
    recall: { before: 'Пополните карту на ', answer: 'пятьсот', after: ' рублей, пожалуйста.', fallbackChoices: ['пятьсот', 'двести', 'триста', 'восемьсот'] }, speakRequired: ['Пополните', 'пятьсот', 'рублей'],
    sceneCaption: { de: 'Die Mitarbeiterin legt die Fahrkarte auf das Lesegerät und fragt: „На какую сумму пополнить карту?“', en: 'The attendant places the transport card on the reader and asks: “На какую сумму пополнить карту?”' },
    trophyWord: { word: 'пополнить', meaning: { de: 'aufladen, auffüllen', en: 'to top up, refill' }, example: 'Можно пополнить карту здесь?', whyThisWord: { de: 'Пополнить ist das genaue Handlungsverb, mit dem du neues Guthaben auf die Fahrkarte bringen lässt.', en: 'Пополнить is the exact service verb for adding new credit to the transport card.' } },
    distractors: ['Проверьте билет,', 'у соседнего окна.'], placeholderCaption: { de: 'Eine Fahrkarte liegt auf dem Lesegerät, während der gewünschte Betrag als Wort auf dem Display erscheint.', en: 'A transport card rests on the reader while the requested amount appears in words on the display.' }, songMood: 'a quick card top-up restoring easy movement across the city', visualNotes: 'Transit service window, card reader, ruble balance increasing, customer ready for the next ride.',
  }),
  makeRussianA2CompactLesson({
    slug: 'priyom-v-chetverg', title: { de: 'Termin am Donnerstag', en: 'An appointment on Thursday' },
    situation: { de: 'Am Empfang einer Praxis wird nach deinem Wunschtag gefragt. Du bittest um einen Termin am Donnerstag.', en: 'At a clinic reception desk, you are asked which day you prefer. Ask for an appointment on Thursday.' },
    pedagogicalGoal: 'Mit Можно записаться? um einen Termin bitten und приём sowie den Wochentag korrekt verwenden.',
    targetText: 'Можно записаться на приём в четверг?', baseText: { de: 'Kann ich einen Termin für Donnerstag vereinbaren?', en: 'Can I make an appointment for Thursday?' },
    chunks: [{ targetText: 'Можно записаться', baseText: { de: 'Kann ich einen Termin vereinbaren', en: 'Can I make an appointment' } }, { targetText: 'на приём', baseText: { de: 'für eine Sprechstunde', en: 'for a consultation' } }, { targetText: 'в четверг?', baseText: { de: 'am Donnerstag?', en: 'on Thursday?' } }],
    terms: [{ targetText: 'записаться', baseText: { de: 'einen Termin vereinbaren', en: 'to make an appointment' } }, { targetText: 'приём', baseText: { de: 'Termin, Sprechstunde', en: 'appointment, consultation' } }, { targetText: 'в четверг', baseText: { de: 'am Donnerstag', en: 'on Thursday' } }, { targetText: 'свободное время', baseText: { de: 'freier Termin', en: 'available time' } }, { targetText: 'регистратура', baseText: { de: 'Anmeldung', en: 'reception desk' } }],
    recall: { before: 'Можно записаться на ', answer: 'приём', after: ' в четверг?', fallbackChoices: ['приём', 'сеанс', 'осмотр', 'урок'] }, speakRequired: ['записаться', 'приём', 'четверг'],
    sceneCaption: { de: 'Die Mitarbeiterin öffnet den Terminkalender und fragt: „На какой день вас записать?“', en: 'The receptionist opens the appointment calendar and asks: “На какой день вас записать?”' },
    trophyWord: { word: 'приём', meaning: { de: 'Termin, Sprechstunde', en: 'appointment, consultation' }, example: 'Приём начинается утром в четверг.', whyThisWord: { de: 'Приём benennt die konkrete Dienstleistung, für die du einen passenden Tag reservierst.', en: 'Приём names the specific service for which you are reserving a suitable day.' } },
    distractors: ['без записи', 'после выходных.'], placeholderCaption: { de: 'Im Praxiskalender ist am Donnerstag ein freies Feld neben einer leeren Terminkarte markiert.', en: 'The clinic calendar shows an open Thursday slot beside a blank appointment card.' }, songMood: 'an open calendar slot turning into a settled appointment', visualNotes: 'Clinic reception, Thursday slot highlighted, receptionist ready to enter the visitor’s name.',
  }),
  makeRussianA2CompactLesson({
    slug: 'kopiyu-klyucha', title: { de: 'Eine Schlüsselkopie', en: 'A copy of the key' },
    situation: { de: 'Im Schlüsseldienst brauchst du eine zusätzliche Kopie. Du gibst den Auftrag klar und höflich.', en: 'At a locksmith, you need an additional copy. Give the request clearly and politely.' },
    pedagogicalGoal: 'Mit Сделайте einen einmaligen Arbeitsauftrag geben und копию ключа im Akkusativ mit Genitivattribut bilden.',
    targetText: 'Сделайте, пожалуйста, ещё одну копию ключа.', baseText: { de: 'Machen Sie bitte noch eine Kopie des Schlüssels.', en: 'Please make one more copy of the key.' },
    chunks: [{ targetText: 'Сделайте, пожалуйста,', baseText: { de: 'Machen Sie bitte', en: 'Please make' } }, { targetText: 'ещё одну копию', baseText: { de: 'noch eine Kopie', en: 'one more copy' } }, { targetText: 'ключа.', baseText: { de: 'des Schlüssels.', en: 'of the key.' } }],
    terms: [{ targetText: 'сделайте', baseText: { de: 'machen Sie', en: 'please make' } }, { targetText: 'копия', baseText: { de: 'Kopie', en: 'copy' } }, { targetText: 'ещё одну', baseText: { de: 'noch eine; Akkusativ feminin', en: 'one more; feminine accusative' } }, { targetText: 'ключа', baseText: { de: 'des Schlüssels; Genitiv', en: 'of the key; genitive' } }, { targetText: 'мастер', baseText: { de: 'Handwerker, Fachmann', en: 'craftsperson, specialist' } }],
    recall: { before: 'Сделайте, пожалуйста, ещё одну ', answer: 'копию', after: ' ключа.', fallbackChoices: ['копию', 'фотографию', 'справку', 'квитанцию'] }, speakRequired: ['Сделайте', 'копию', 'ключа'],
    sceneCaption: { de: 'Der Schlüsselmacher nimmt den Originalschlüssel und fragt: „Что для вас сделать?“', en: 'The locksmith takes the original key and asks: “Что для вас сделать?”' },
    trophyWord: { word: 'копия', meaning: { de: 'Kopie', en: 'copy' }, example: 'Копия ключа будет готова скоро.', whyThisWord: { de: 'Копия unterscheidet deinen Auftrag klar von einer Reparatur oder einem völlig neuen Schloss.', en: 'Копия distinguishes the request clearly from a repair or an entirely new lock.' } },
    distractors: ['Почините замок.', 'новый брелок рядом.'], placeholderCaption: { de: 'Ein Originalschlüssel und ein leerer Rohling liegen nebeneinander an der Kopiermaschine.', en: 'An original key and a blank key sit side by side at the cutting machine.' }, songMood: 'metal and precision shaping one useful extra copy', visualNotes: 'Small locksmith shop, key-cutting machine, original key beside a fresh blank, careful hands at work.',
  }),
  makeRussianA2CompactLesson({
    slug: 'prishyol-za-posylkoi', title: { de: 'Die große Sendung abholen', en: 'Collecting the large parcel' },
    situation: { de: 'Am Abholschalter fragt die Mitarbeiterin, was du abholst. Du sagst, dass du wegen eines großen Pakets aus einem Geschäft gekommen bist.', en: 'At the pickup counter, the clerk asks what you are collecting. Say that you came for a large parcel from a shop.' },
    pedagogicalGoal: 'Mit der maskulinen Vergangenheitsform пришёл und за plus Instrumental den Zweck eines Besuchs ausdrücken.',
    targetText: 'Я пришёл за большой посылкой из магазина.', baseText: { de: 'Ich bin gekommen, um ein großes Paket aus dem Laden abzuholen.', en: 'I came to collect a large parcel from the shop.' },
    chunks: [{ targetText: 'Я пришёл', baseText: { de: 'Ich bin gekommen', en: 'I came' } }, { targetText: 'за большой посылкой', baseText: { de: 'um ein großes Paket abzuholen', en: 'to collect a large parcel' } }, { targetText: 'из магазина.', baseText: { de: 'aus dem Laden.', en: 'from the shop.' } }],
    terms: [{ targetText: 'пришёл', baseText: { de: 'ich bin gekommen (Mann; Frau: пришла)', en: 'I came (male; female: пришла)' }, alsoAccept: ['пришла'] }, { targetText: 'за посылкой', baseText: { de: 'um ein Paket abzuholen; Instrumental nach за', en: 'to collect a parcel; instrumental after за' } }, { targetText: 'большой посылкой', baseText: { de: 'großem Paket im Instrumental', en: 'large parcel in the instrumental' } }, { targetText: 'из магазина', baseText: { de: 'aus dem Laden; Genitiv nach из', en: 'from the shop; genitive after из' } }, { targetText: 'забирать', baseText: { de: 'abholen', en: 'to collect' } }],
    recall: { before: 'Я пришёл за большой ', answer: 'посылкой', after: ' из магазина.', fallbackChoices: ['посылкой', 'паспортом', 'билетом', 'ключом'] }, speakRequired: ['большой', 'посылкой', 'магазина'], genderForms: { voiced: 'пришёл', other: 'пришла' },
    sceneCaption: { de: 'Die Mitarbeiterin sieht auf die Abholliste und fragt: „Что вы забираете?“', en: 'The clerk checks the pickup list and asks: “Что вы забираете?”' },
    trophyWord: { word: 'посылка', meaning: { de: 'Paket, Sendung', en: 'parcel, package' }, example: 'Посылка из магазина уже на складе.', whyThisWord: { de: 'Посылка ist der konkrete Zweck deines Besuchs und verankert die neue Instrumentalkonstruktion.', en: 'Посылка is the concrete purpose of the visit and anchors the new instrumental construction.' } },
    distractors: ['для отправки письма', 'около дальней стойки.'], placeholderCaption: { de: 'Ein großes Paket mit Ladenetikett steht hinter dem Abholschalter neben einer Namensliste.', en: 'A large parcel with a shop label waits behind the pickup counter beside a name list.' }, songMood: 'a purposeful counter visit ending with a waiting parcel', visualNotes: 'Parcel pickup desk, large labeled box on the shelf, clerk matching it to the customer’s details.',
  }),
  makeRussianA2CompactLesson({
    slug: 'velosiped-na-dva-dnya', title: { de: 'Fahrrad für zwei Tage', en: 'A bicycle for two days' },
    situation: { de: 'Beim Fahrradverleih wirst du nach der Mietdauer gefragt. Du bittest um ein Fahrrad für zwei Tage.', en: 'At the bicycle rental desk, you are asked how long you need it. Ask for a bicycle for two days.' },
    pedagogicalGoal: 'Mit Можно взять…? eine kurze Miete erfragen und два дня mit der korrekten Genitivform verwenden.',
    targetText: 'Можно взять велосипед на два дня?', baseText: { de: 'Kann ich ein Fahrrad für zwei Tage nehmen?', en: 'Can I rent a bicycle for two days?' },
    chunks: [{ targetText: 'Можно взять', baseText: { de: 'Kann ich nehmen', en: 'Can I take' } }, { targetText: 'велосипед', baseText: { de: 'ein Fahrrad', en: 'a bicycle' } }, { targetText: 'на два дня?', baseText: { de: 'für zwei Tage?', en: 'for two days?' } }],
    terms: [{ targetText: 'взять', baseText: { de: 'nehmen, mieten', en: 'to take, rent' } }, { targetText: 'велосипед', baseText: { de: 'Fahrrad', en: 'bicycle' } }, { targetText: 'на два дня', baseText: { de: 'für zwei Tage; Genitiv Singular nach два', en: 'for two days; genitive singular after два' } }, { targetText: 'прокат', baseText: { de: 'Verleih', en: 'rental' } }, { targetText: 'вернуть', baseText: { de: 'zurückgeben', en: 'to return' } }],
    recall: { before: 'Можно взять велосипед на два ', answer: 'дня', after: '?', fallbackChoices: ['дня', 'часа', 'месяца', 'года'] }, speakRequired: ['взять', 'велосипед', 'дня'],
    sceneCaption: { de: 'Der Mitarbeiter stellt ein Fahrrad bereit und fragt: „На сколько дней вам нужен велосипед?“', en: 'The attendant rolls out a bicycle and asks: “На сколько дней вам нужен велосипед?”' },
    trophyWord: { word: 'велосипед', meaning: { de: 'Fahrrad', en: 'bicycle' }, example: 'Этот велосипед можно вернуть в пятницу.', whyThisWord: { de: 'Велосипед ist der konkrete Mietgegenstand, dessen Dauer du auf zwei Tage festlegst.', en: 'Велосипед is the specific rental item whose duration you set at two days.' } },
    distractors: ['купить новый шлем', 'рядом с парком.'], placeholderCaption: { de: 'Ein Leihfahrrad steht neben einem Vertrag, auf dem zwei Tage ausgeschrieben sind.', en: 'A rental bicycle stands beside an agreement with two days written out.' }, songMood: 'two open days unfolding on a bicycle through the city', visualNotes: 'Bike rental counter, city bicycle ready, two-day rental slip and helmet placed beside it.',
  }),
  makeRussianA2CompactLesson({
    slug: 'do-kotorogo-chasa', title: { de: 'Bis wann geöffnet?', en: 'How late are you open?' },
    situation: { de: 'Du möchtest später zu einem Servicegeschäft zurückkommen. Du fragst nach der heutigen Schließzeit.', en: 'You want to return to a service shop later. Ask how late it is open today.' },
    pedagogicalGoal: 'Mit До которого часа вы работаете? höflich und idiomatisch nach Öffnungszeiten fragen.',
    targetText: 'До которого часа вы работаете сегодня?', baseText: { de: 'Bis wie viel Uhr haben Sie heute geöffnet?', en: 'How late are you open today?' },
    chunks: [{ targetText: 'До которого часа', baseText: { de: 'Bis wie viel Uhr', en: 'Until what time' } }, { targetText: 'вы работаете', baseText: { de: 'haben Sie geöffnet', en: 'are you open' } }, { targetText: 'сегодня?', baseText: { de: 'heute?', en: 'today?' } }],
    terms: [{ targetText: 'до которого часа', baseText: { de: 'bis wie viel Uhr; Genitiv nach до', en: 'until what time; genitive after до' } }, { targetText: 'работаете', baseText: { de: 'Sie arbeiten, Sie haben geöffnet', en: 'you work, you are open' } }, { targetText: 'сегодня', baseText: { de: 'heute', en: 'today' } }, { targetText: 'часы работы', baseText: { de: 'Öffnungszeiten', en: 'opening hours' } }, { targetText: 'закрываться', baseText: { de: 'schließen', en: 'to close' } }],
    recall: { before: 'До которого часа вы ', answer: 'работаете', after: ' сегодня?', fallbackChoices: ['работаете', 'дежурите', 'принимаете', 'отвечаете'] }, speakRequired: ['которого', 'часа', 'работаете'],
    sceneCaption: { de: 'Der Mitarbeiter reicht dir eine Abholkarte und fragt: „Что вы хотите узнать?“', en: 'The attendant hands you a pickup card and asks: “Что вы хотите узнать?”' },
    trophyWord: { word: 'час', meaning: { de: 'Stunde, Uhr', en: 'hour, o’clock' }, example: 'Последний час работы начинается в семь.', whyThisWord: { de: 'Час ist das Zeitwort, mit dem du aus einer vagen Öffnungsangabe eine genaue Grenze machst.', en: 'Час is the time word that turns a vague opening schedule into an exact limit.' } },
    distractors: ['После обеда', 'завтра выходной.'], placeholderCaption: { de: 'Eine Abholkarte liegt neben einem Ladenschild, dessen Schließzeit noch erklärt werden muss.', en: 'A pickup card sits beside a shop-hours sign whose closing time still needs clarification.' }, songMood: 'a practical timing question keeping the evening errand possible', visualNotes: 'Service shop counter, opening-hours sign, pickup card, customer checking whether there is time to return.',
  }),
  makeRussianA2CompactLesson({
    slug: 'telefon-gotov-k-vydache', title: { de: 'Bereit zur Abholung?', en: 'Ready for pickup?' },
    situation: { de: 'Du kommst zur Handywerkstatt zurück. Bevor die Übergabe beginnt, fragst du, ob dein Telefon schon bereitliegt.', en: 'You return to the phone repair shop. Before the handoff begins, ask whether your phone is ready.' },
    pedagogicalGoal: 'Mit уже und готов к выдаче den aktuellen Status eines reparierten Gegenstands erfragen.',
    targetText: 'Мой телефон уже готов к выдаче?', baseText: { de: 'Ist mein Telefon schon zur Abholung bereit?', en: 'Is my phone ready for pickup already?' },
    chunks: [{ targetText: 'Мой телефон', baseText: { de: 'Mein Telefon', en: 'My phone' } }, { targetText: 'уже готов', baseText: { de: 'ist schon bereit', en: 'is already ready' } }, { targetText: 'к выдаче?', baseText: { de: 'zur Abholung?', en: 'for pickup?' } }],
    terms: [{ targetText: 'телефон', baseText: { de: 'Telefon', en: 'phone' } }, { targetText: 'уже готов', baseText: { de: 'schon fertig; готов stimmt mit телефон überein', en: 'already ready; готов agrees with телефон' } }, { targetText: 'к выдаче', baseText: { de: 'zur Ausgabe; Dativ nach к', en: 'for pickup; dative after к' } }, { targetText: 'ремонт', baseText: { de: 'Reparatur', en: 'repair' } }, { targetText: 'получить', baseText: { de: 'erhalten, abholen', en: 'to receive, collect' } }],
    recall: { before: 'Мой телефон уже готов к ', answer: 'выдаче', after: '?', fallbackChoices: ['выдаче', 'ремонту', 'осмотру', 'зарядке'] }, speakRequired: ['телефон', 'уже', 'выдаче'],
    sceneCaption: { de: 'Der Techniker erkennt dich am Schalter und fragt: „Вы пришли за телефоном?“', en: 'The technician recognizes you at the counter and asks: “Вы пришли за телефоном?”' },
    trophyWord: { word: 'выдача', meaning: { de: 'Ausgabe, Abholung', en: 'handover, pickup' }, example: 'Выдача готовых телефонов — во втором окне.', whyThisWord: { de: 'Выдача bezeichnet den letzten Serviceschritt nach der Reparatur: die Rückgabe an dich.', en: 'Выдача names the final service step after repair: handing the phone back to you.' } },
    distractors: ['нужен новый экран', 'чек в кармане.'], placeholderCaption: { de: 'Ein repariertes Telefon liegt verpackt im Abholfach hinter dem Werkstattschalter.', en: 'A repaired phone sits wrapped in the pickup cubby behind the repair counter.' }, songMood: 'a repaired phone waiting at the final handoff', visualNotes: 'Repair counter, finished phone in protective sleeve, pickup shelf and service receipt ready.',
  }),
  makeRussianA2CompactLesson({
    slug: 'pridu-v-pyatnitsu', title: { de: 'Dann komme ich am Freitag', en: 'I will come on Friday' },
    situation: { de: 'Die Mitarbeiterin nennt Freitag als Abholtag. Du bestätigst den Termin und bedankst dich.', en: 'The clerk gives Friday as the pickup day. Confirm when you will come and thank them.' },
    pedagogicalGoal: 'Mit тогда und dem perfektiven Futur приду einen Abholtermin bestätigen und die Erledigung höflich abschließen.',
    targetText: 'Тогда я приду в пятницу. Большое спасибо!', baseText: { de: 'Dann komme ich am Freitag. Vielen Dank!', en: 'Then I will come on Friday. Thank you very much!' },
    chunks: [{ targetText: 'Тогда я приду', baseText: { de: 'Dann komme ich', en: 'Then I will come' } }, { targetText: 'в пятницу.', baseText: { de: 'am Freitag.', en: 'on Friday.' } }, { targetText: 'Большое спасибо!', baseText: { de: 'Vielen Dank!', en: 'Thank you very much!' } }],
    terms: [{ targetText: 'тогда', baseText: { de: 'dann', en: 'then' } }, { targetText: 'приду', baseText: { de: 'ich werde kommen', en: 'I will come' } }, { targetText: 'в пятницу', baseText: { de: 'am Freitag; Akkusativ', en: 'on Friday; accusative' } }, { targetText: 'большое спасибо', baseText: { de: 'vielen Dank', en: 'thank you very much' } }, { targetText: 'забрать', baseText: { de: 'abholen', en: 'to pick up' } }],
    recall: { before: 'Тогда я приду в ', answer: 'пятницу', after: '. Большое спасибо!', fallbackChoices: ['пятницу', 'субботу', 'среду', 'четверг'] }, speakRequired: ['Тогда', 'приду', 'пятницу'],
    sceneCaption: { de: 'Die Mitarbeiterin trägt den Abholtag ein und sagt: „Приходите в пятницу.“', en: 'The clerk writes down the pickup day and says: “Приходите в пятницу.”' },
    trophyWord: { word: 'пятница', meaning: { de: 'Freitag', en: 'Friday' }, example: 'Пятница подходит для получения заказа.', whyThisWord: { de: 'Пятница gibt dem letzten Auftrag einen festen Abholtag und schließt die Erledigung planbar ab.', en: 'Пятница gives the final errand a firm pickup day and closes it with a workable plan.' } },
    distractors: ['Сегодня не успею.', 'после закрытия.'], placeholderCaption: { de: 'Auf dem Abholschein ist Freitag ausgeschrieben und mit einem kleinen Dankeshäkchen markiert.', en: 'Friday is written out on the pickup slip and marked with a small confirming check.' }, songMood: 'a week of errands closing on one clear Friday pickup', visualNotes: 'Service counter, Friday written on pickup ticket, customer thanking the clerk before leaving.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_SIX_METADATA,
  russianA2Practical6Inputs,
  { de: 'Du hast Russisch A2 Praxis 6 abgeschlossen und kannst Dienstleistungen beauftragen, zeitlich klären und abholen.', en: 'You have completed Russian A2 Practical 6 and can arrange, time, and collect everyday services.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-7',
  title: 'Russian A2 Practical 7',
  shortTitle: 'A2 Practical 7',
  subtitle: { de: 'Empfehlungen erfragen und Orte, Speisen und Geschenke beschreiben', en: 'Asking for recommendations and describing places, food, and gifts' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical7Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'samoe-vkusnoe-posovetuyte', title: { de: 'Die beste Empfehlung', en: 'The best recommendation' },
    situation: { de: 'In einem kleinen Restaurant wartet der Kellner auf deine Wahl. Du fragst nach dem leckersten Angebot und seiner Empfehlung.', en: 'In a small restaurant, the waiter is waiting for your choice. Ask about the tastiest option and his recommendation.' },
    pedagogicalGoal: 'Mit самое plus Adjektiv nach dem Spitzenangebot fragen und Что вы посоветуете? als höfliche Empfehlungsfrage verwenden.',
    targetText: 'Что у вас самое вкусное? Что вы посоветуете?', baseText: { de: 'Was ist bei Ihnen am leckersten? Was empfehlen Sie?', en: 'What is the tastiest thing you have? What do you recommend?' },
    chunks: [{ targetText: 'Что у вас', baseText: { de: 'Was ist bei Ihnen', en: 'What do you have' } }, { targetText: 'самое вкусное?', baseText: { de: 'am leckersten?', en: 'that is the tastiest?' } }, { targetText: 'Что вы посоветуете?', baseText: { de: 'Was empfehlen Sie?', en: 'What do you recommend?' } }],
    terms: [{ targetText: 'самое вкусное', baseText: { de: 'das Leckerste; Neutrum von самый', en: 'the tastiest; neuter form of самый' } }, { targetText: 'посоветуете', baseText: { de: 'Sie werden empfehlen, Sie empfehlen', en: 'you will recommend, you recommend' } }, { targetText: 'что у вас', baseText: { de: 'was gibt es bei Ihnen', en: 'what do you have' } }, { targetText: 'самый', baseText: { de: 'der aller-, der am meisten', en: 'the most' } }, { targetText: 'рекомендация', baseText: { de: 'Empfehlung', en: 'recommendation' } }],
    recall: { before: 'Что у вас самое вкусное? Что вы ', answer: 'посоветуете', after: '?', fallbackChoices: ['посоветуете', 'покажете', 'принесёте', 'приготовите'] }, speakRequired: ['самое', 'вкусное', 'посоветуете'],
    sceneCaption: { de: 'Der Kellner öffnet die Speisekarte und fragt: „Вы уже выбрали блюдо?“', en: 'The waiter opens the menu and asks: “Вы уже выбрали блюдо?”' },
    trophyWord: { word: 'самый', meaning: { de: 'der aller-, der am meisten', en: 'the most' }, example: 'Это самый популярный десерт.', whyThisWord: { de: 'Самый hilft dir, aus mehreren unbekannten Gerichten gezielt das Spitzenangebot herauszufinden.', en: 'Самый helps you identify the standout option among several unfamiliar dishes.' } },
    distractors: ['Я ещё выбираю.', 'Можно без мяса?'], placeholderCaption: { de: 'Eine geöffnete Speisekarte liegt neben drei sehr unterschiedlichen Tagesgerichten.', en: 'An open menu lies beside three very different daily dishes.' }, songMood: 'curious restaurant discovery with one standout choice', visualNotes: 'Intimate restaurant table, open menu, three plated specials, waiter ready to recommend a favorite.',
  }),
  makeRussianA2CompactLesson({
    slug: 'togda-etot-pirog', title: { de: 'Dann diesen Kuchen', en: 'That pie, then' },
    situation: { de: 'Der Kellner empfiehlt den Apfelkuchen. Du nimmst seine konkrete Empfehlung freundlich an.', en: 'The waiter recommends the apple pie. Accept his specific recommendation politely.' },
    pedagogicalGoal: 'Eine konkrete Empfehlung mit der knappen elliptischen Antwort Тогда этот… höflich annehmen.',
    targetText: 'Тогда этот пирог, пожалуйста.', baseText: { de: 'Dann diesen Kuchen, bitte.', en: 'That pie, then, please.' },
    chunks: [{ targetText: 'Тогда', baseText: { de: 'Dann', en: 'Then' } }, { targetText: 'этот пирог,', baseText: { de: 'diesen Kuchen,', en: 'this pie,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'тогда', baseText: { de: 'dann', en: 'then' } }, { targetText: 'этот пирог', baseText: { de: 'diesen Kuchen; Akkusativ wie Nominativ', en: 'this pie; accusative same as nominative' } }, { targetText: 'пирог', baseText: { de: 'Kuchen, gefüllte Pastete', en: 'pie, filled pastry' } }, { targetText: 'яблочный', baseText: { de: 'Apfel-', en: 'apple' } }, { targetText: 'рекомендовать', baseText: { de: 'empfehlen', en: 'to recommend' } }],
    recall: { before: 'Тогда этот ', answer: 'пирог', after: ', пожалуйста.', fallbackChoices: ['пирог', 'салат', 'омлет', 'десерт'] }, speakRequired: ['Тогда', 'пирог', 'пожалуйста'],
    sceneCaption: { de: 'Der Kellner zeigt auf das Foto des Nachtischs und sagt: „Советую яблочный пирог.“', en: 'The waiter points to the dessert photo and says: “Советую яблочный пирог.”' },
    trophyWord: { word: 'пирог', meaning: { de: 'Kuchen, gefüllte Pastete', en: 'pie, filled pastry' }, example: 'Этот пирог хорошо подходит к чаю.', whyThisWord: { de: 'Пирог macht aus der allgemeinen Empfehlung eine klare, sofort bestellbare Wahl.', en: 'Пирог turns the general recommendation into one clear choice you can order immediately.' } },
    distractors: ['Лучше салат,', 'Я только смотрю.'], placeholderCaption: { de: 'Ein Stück Apfelkuchen steht neben dem Foto, auf das der Kellner gerade gezeigt hat.', en: 'A slice of apple pie sits beside the photo the waiter has just indicated.' }, songMood: 'an easy recommendation becoming a confident order', visualNotes: 'Dessert menu, apple pie slice, waiter pointing, customer accepting the suggestion with a smile.',
  }),
  makeRussianA2CompactLesson({
    slug: 'gde-u-reki-gulyat', title: { de: 'An der Uferpromenade spazieren', en: 'Walking by the river' },
    situation: { de: 'An der Hotelrezeption nennt man dir einen Park und eine Uferpromenade. Du fragst, wo man am Fluss gut spazieren kann.', en: 'At hotel reception, you are told about a park and a riverside promenade. Ask where it is good to walk by the river.' },
    pedagogicalGoal: 'Mit где und dem Infinitiv гулять nach einem geeigneten Ort für eine Aktivität fragen.',
    targetText: 'Где у реки хорошо гулять?', baseText: { de: 'Wo kann man am Fluss gut spazieren?', en: 'Where is it good to walk by the river?' },
    chunks: [{ targetText: 'Где у реки', baseText: { de: 'Wo am Fluss', en: 'Where by the river' } }, { targetText: 'хорошо', baseText: { de: 'gut', en: 'is good' } }, { targetText: 'гулять?', baseText: { de: 'spazieren?', en: 'to walk?' } }],
    terms: [{ targetText: 'гулять', baseText: { de: 'spazieren gehen', en: 'to walk, stroll' } }, { targetText: 'у реки', baseText: { de: 'am Fluss; Genitiv nach у', en: 'by the river; genitive after у' } }, { targetText: 'где', baseText: { de: 'wo', en: 'where' } }, { targetText: 'набережная', baseText: { de: 'Uferpromenade', en: 'embankment, riverside promenade' } }, { targetText: 'прогулка', baseText: { de: 'Spaziergang', en: 'walk, stroll' } }],
    recall: { before: 'Где у реки хорошо ', answer: 'гулять', after: '?', fallbackChoices: ['гулять', 'работать', 'ночевать', 'покупать'] }, speakRequired: ['Где', 'реки', 'гулять'],
    sceneCaption: { de: 'Die Rezeptionistin markiert zwei Orte auf dem Stadtplan und sagt: „Рядом есть парк и набережная.“', en: 'The receptionist marks two places on the city map and says: “Рядом есть парк и набережная.”' },
    trophyWord: { word: 'гулять', meaning: { de: 'spazieren gehen', en: 'to walk, stroll' }, example: 'Вы можете гулять вдоль реки.', whyThisWord: { de: 'Гулять benennt genau die Freizeitaktivität, für die du einen passenden Ort suchst.', en: 'Гулять names the exact leisure activity for which you are seeking a suitable place.' } },
    distractors: ['Как пройти туда?', 'До парка далеко?'], placeholderCaption: { de: 'Ein Stadtplan zeigt einen grünen Park und eine lange Promenade entlang des Flusses.', en: 'A city map shows a green park and a long promenade beside the river.' }, songMood: 'an open riverside walk waiting beyond the hotel doors', visualNotes: 'Hotel map, river line, park and embankment highlighted, visitor deciding where to take a relaxed walk.',
  }),
  makeRussianA2CompactLesson({
    slug: 'park-blizko-k-reke', title: { de: 'Ein ruhiger Park am Fluss', en: 'A quiet park by the river' },
    situation: { de: 'Eine neue Bekannte fragt nach deinem Eindruck vom Park. Du beschreibst seine Ruhe und seine Lage am Fluss.', en: 'A new acquaintance asks what you think of the park. Describe its quiet atmosphere and location by the river.' },
    pedagogicalGoal: 'Einen Ort mit тихий, совсем близко und к plus Dativ knapp beschreiben.',
    targetText: 'Парк тихий и совсем близко к реке.', baseText: { de: 'Der Park ist ruhig und ganz nah am Fluss.', en: 'The park is quiet and very close to the river.' },
    chunks: [{ targetText: 'Парк тихий', baseText: { de: 'Der Park ist ruhig', en: 'The park is quiet' } }, { targetText: 'и совсем близко', baseText: { de: 'und ganz nah', en: 'and very close' } }, { targetText: 'к реке.', baseText: { de: 'am Fluss.', en: 'to the river.' } }],
    terms: [{ targetText: 'тихий', baseText: { de: 'ruhig; stimmt mit парк überein', en: 'quiet; agrees with парк' } }, { targetText: 'совсем близко', baseText: { de: 'ganz nah', en: 'very close' } }, { targetText: 'к реке', baseText: { de: 'zum Fluss; Dativ nach к', en: 'to the river; dative after к' } }, { targetText: 'река', baseText: { de: 'Fluss', en: 'river' } }, { targetText: 'описывать', baseText: { de: 'beschreiben', en: 'to describe' } }],
    recall: { before: 'Парк тихий и совсем близко к ', answer: 'реке', after: '.', fallbackChoices: ['реке', 'площади', 'станции', 'гостинице'] }, speakRequired: ['Парк', 'тихий', 'реке'],
    sceneCaption: { de: 'Die Bekannte schaut auf deine Fotos und fragt: „Что вы думаете о парке?“', en: 'The acquaintance looks at your photos and asks: “Что вы думаете о парке?”' },
    trophyWord: { word: 'река', meaning: { de: 'Fluss', en: 'river' }, example: 'Река находится недалеко от парка.', whyThisWord: { de: 'Река ist der klare Orientierungspunkt, der die Lage des ruhigen Parks verständlich macht.', en: 'Река is the clear landmark that makes the quiet park’s location easy to understand.' } },
    distractors: ['Там всегда люди.', 'около старого моста.'], placeholderCaption: { de: 'Ein stiller grüner Park liegt nur einen kurzen Weg vom sichtbaren Flussufer entfernt.', en: 'A quiet green park sits only a short walk from the visible riverbank.' }, songMood: 'soft leaves and nearby water shaping a peaceful city refuge', visualNotes: 'Quiet riverside park, trees, close waterline, two acquaintances looking through fresh city photos.',
  }),
  makeRussianA2CompactLesson({
    slug: 'kakoe-kafe-samoe-horoshee', title: { de: 'Das beste Café hier', en: 'The best cafe here' },
    situation: { de: 'Ein Nachbar erzählt, dass es in der Gegend viele Cafés gibt. Du fragst nach dem besten.', en: 'A neighbor says there are many cafes in the area. Ask which one is the best.' },
    pedagogicalGoal: 'Какое… самое хорошее? verwenden, um innerhalb einer bekannten Gruppe nach der besten Option zu fragen.',
    targetText: 'Какое кафе здесь самое хорошее?', baseText: { de: 'Welches Café hier ist am besten?', en: 'Which cafe here is the best?' },
    chunks: [{ targetText: 'Какое кафе', baseText: { de: 'Welches Café', en: 'Which cafe' } }, { targetText: 'здесь', baseText: { de: 'hier', en: 'here' } }, { targetText: 'самое хорошее?', baseText: { de: 'ist am besten?', en: 'is the best?' } }],
    terms: [{ targetText: 'кафе', baseText: { de: 'Café; unveränderliches Neutrum', en: 'cafe; indeclinable neuter noun' } }, { targetText: 'какое', baseText: { de: 'welches; Neutrum', en: 'which; neuter' } }, { targetText: 'самое хорошее', baseText: { de: 'das beste', en: 'the best' } }, { targetText: 'выбирать', baseText: { de: 'auswählen', en: 'to choose' } }, { targetText: 'местный', baseText: { de: 'örtlich, lokal', en: 'local' } }],
    recall: { before: 'Какое ', answer: 'кафе', after: ' здесь самое хорошее?', fallbackChoices: ['кафе', 'метро', 'радио', 'пальто'] }, speakRequired: ['Какое', 'кафе', 'хорошее'],
    sceneCaption: { de: 'Der Nachbar zeigt die Straße hinunter und sagt: „Здесь много разных кафе.“', en: 'The neighbor points down the street and says: “Здесь много разных кафе.”' },
    trophyWord: { word: 'кафе', meaning: { de: 'Café', en: 'cafe' }, example: 'Это кафе открыто до вечера.', whyThisWord: { de: 'Кафе ist die konkrete Ortskategorie, in der du die beste nahe Option herausfinden willst.', en: 'Кафе is the specific type of place in which you want to find the best nearby option.' } },
    distractors: ['Где свободный стол?', 'Мне нужен магазин.'], placeholderCaption: { de: 'Drei kleine Caféfassaden liegen nebeneinander in einer belebten Nachbarschaftsstraße.', en: 'Three small cafe fronts stand side by side on a lively neighborhood street.' }, songMood: 'a neighborhood full of choices narrowing to one favorite cafe', visualNotes: 'Street with several distinct cafes, neighbor pointing, visitor comparing signs and window displays.',
  }),
  makeRussianA2CompactLesson({
    slug: 'podarok-luchshe-podruge', title: { de: 'Ein Geschenk für eine Freundin', en: 'A gift for a friend' },
    situation: { de: 'In einem kleinen Laden fragt die Verkäuferin, für wen du suchst. Du bittest um Rat für ein Geschenk an eine Freundin.', en: 'In a small shop, the assistant asks who you are shopping for. Ask for advice on a gift for a female friend.' },
    pedagogicalGoal: 'Mit Какой подарок…? nach einem passenden Gegenstand fragen und подруге im Dativ verwenden.',
    targetText: 'Какой подарок лучше купить подруге?', baseText: { de: 'Welches Geschenk kauft man am besten für eine Freundin?', en: 'What gift is best to buy for a female friend?' },
    chunks: [{ targetText: 'Какой подарок', baseText: { de: 'Welches Geschenk', en: 'What gift' } }, { targetText: 'лучше купить', baseText: { de: 'kauft man am besten', en: 'is best to buy' } }, { targetText: 'подруге?', baseText: { de: 'für eine Freundin?', en: 'for a female friend?' } }],
    terms: [{ targetText: 'подарок', baseText: { de: 'Geschenk', en: 'gift' } }, { targetText: 'купить', baseText: { de: 'kaufen; perfektiver Infinitiv', en: 'to buy; perfective infinitive' } }, { targetText: 'подруге', baseText: { de: 'für eine Freundin; im Russischen Dativ', en: 'for a female friend; dative' } }, { targetText: 'сувенир', baseText: { de: 'Souvenir', en: 'souvenir' } }, { targetText: 'выбрать', baseText: { de: 'auswählen', en: 'to choose' } }],
    recall: { before: 'Какой подарок лучше купить ', answer: 'подруге', after: '?', fallbackChoices: ['подруге', 'коллеге', 'сестре', 'соседке'] }, speakRequired: ['Какой', 'подарок', 'подруге'],
    sceneCaption: { de: 'Die Verkäuferin nimmt eine kleine Geschenkbox und fragt: „Для кого вы выбираете подарок?“', en: 'The shop assistant picks up a small gift box and asks: “Для кого вы выбираете подарок?”' },
    trophyWord: { word: 'подарок', meaning: { de: 'Geschenk', en: 'gift' }, example: 'Этот подарок хорошо подходит вашей подруге.', whyThisWord: { de: 'Подарок hält die Beratung auf dein wirkliches Ziel gerichtet: etwas Passendes für eine bestimmte Person.', en: 'Подарок keeps the advice focused on your real goal: something suitable for a specific person.' } },
    distractors: ['Мне нравится открытка.', 'Это для меня.'], placeholderCaption: { de: 'Eine kleine Geschenkbox liegt zwischen Schmuck, Büchern und handgemachten Souvenirs.', en: 'A small gift box sits among jewelry, books, and handmade souvenirs.' }, songMood: 'thoughtful browsing for one personal gift', visualNotes: 'Cozy gift shop, varied small objects, assistant holding a box while the visitor considers a friend.',
  }),
  makeRussianA2CompactLesson({
    slug: 'russkiy-restoran-ryadom', title: { de: 'Ein russisches Restaurant', en: 'A Russian restaurant' },
    situation: { de: 'Die Rezeptionistin fragt, ob du einen Ort fürs Abendessen suchst. Du möchtest ihre Empfehlung für ein russisches Restaurant in Hotelnähe.', en: 'The receptionist asks whether you need somewhere for dinner. Ask for her recommendation for a Russian restaurant near the hotel.' },
    pedagogicalGoal: 'Eine Empfehlungsfrage mit einer konkreten Ortsart und рядом с plus Instrumental präzisieren.',
    targetText: 'Какой русский ресторан вы посоветуете рядом с гостиницей?', baseText: { de: 'Welches russische Restaurant nahe dem Hotel empfehlen Sie?', en: 'Which Russian restaurant near the hotel do you recommend?' },
    chunks: [{ targetText: 'Какой русский ресторан', baseText: { de: 'Welches russische Restaurant', en: 'Which Russian restaurant' } }, { targetText: 'вы посоветуете', baseText: { de: 'empfehlen Sie', en: 'do you recommend' } }, { targetText: 'рядом с гостиницей?', baseText: { de: 'nahe dem Hotel?', en: 'near the hotel?' } }],
    terms: [{ targetText: 'ресторан', baseText: { de: 'Restaurant', en: 'restaurant' } }, { targetText: 'русский ресторан', baseText: { de: 'russisches Restaurant', en: 'Russian restaurant' } }, { targetText: 'рядом с гостиницей', baseText: { de: 'nahe dem Hotel; Instrumental nach с', en: 'near the hotel; instrumental after с' } }, { targetText: 'посоветуете', baseText: { de: 'Sie empfehlen', en: 'you recommend' } }, { targetText: 'типичный', baseText: { de: 'typisch', en: 'typical' } }],
    recall: { before: 'Какой русский ', answer: 'ресторан', after: ' вы посоветуете рядом с гостиницей?', fallbackChoices: ['ресторан', 'театр', 'магазин', 'стадион'] }, speakRequired: ['русский', 'ресторан', 'гостиницей'],
    sceneCaption: { de: 'Die Rezeptionistin legt einen Stadtplan bereit und fragt: „Вы ищете место для ужина?“', en: 'The receptionist lays out a city map and asks: “Вы ищете место для ужина?”' },
    trophyWord: { word: 'ресторан', meaning: { de: 'Restaurant', en: 'restaurant' }, example: 'Этот ресторан находится рядом с гостиницей.', whyThisWord: { de: 'Ресторан grenzt die Empfehlung auf den passenden Ort für dein Abendessen ein.', en: 'Ресторан narrows the recommendation to the right kind of place for your dinner.' } },
    distractors: ['Где купить продукты?', 'Мне нужен завтрак.'], placeholderCaption: { de: 'Auf einem Stadtplan sind das Hotel und zwei russische Restaurants in der Nähe markiert.', en: 'A city map marks the hotel and two nearby Russian restaurants.' }, songMood: 'an evening meal taking shape from one local recommendation', visualNotes: 'Hotel desk, map with nearby restaurant markers, receptionist indicating a traditional dining option.',
  }),
  makeRussianA2CompactLesson({
    slug: 'vecherom-na-ploshchadi', title: { de: 'Abends auf dem Platz', en: 'The square at night' },
    situation: { de: 'Ein Besucher fragt dich selbst nach einem schönen Abendziel. Du empfiehlst den beleuchteten Platz und rätst ausdrücklich zu einem Besuch.', en: 'A visitor asks you for a beautiful evening destination. Recommend the illuminated square and strongly encourage a visit.' },
    pedagogicalGoal: 'Einen Ort mit на plus Präpositiv beschreiben und mit Сходите обязательно! höflich empfehlen.',
    targetText: 'Вечером на площади очень красиво. Сходите обязательно!', baseText: { de: 'Abends ist es auf dem Platz sehr schön. Gehen Sie unbedingt hin!', en: 'The square is very beautiful in the evening. Be sure to go!' },
    chunks: [{ targetText: 'Вечером на площади', baseText: { de: 'Abends auf dem Platz', en: 'In the evening on the square' } }, { targetText: 'очень красиво.', baseText: { de: 'ist es sehr schön.', en: 'it is very beautiful.' } }, { targetText: 'Сходите обязательно!', baseText: { de: 'Gehen Sie unbedingt hin!', en: 'Be sure to go!' } }],
    terms: [{ targetText: 'на площади', baseText: { de: 'auf dem Platz; Präpositiv', en: 'on the square; prepositional' } }, { targetText: 'красиво', baseText: { de: 'schön', en: 'beautiful' } }, { targetText: 'сходите', baseText: { de: 'gehen Sie einmal hin; perfektiver вы-Imperativ', en: 'go and visit; perfective вы-imperative' } }, { targetText: 'обязательно', baseText: { de: 'unbedingt', en: 'definitely, be sure to' } }, { targetText: 'вечером', baseText: { de: 'abends', en: 'in the evening' } }],
    recall: { before: 'Вечером на площади очень ', answer: 'красиво', after: '. Сходите обязательно!', fallbackChoices: ['красиво', 'светло', 'спокойно', 'прохладно'] }, speakRequired: ['площади', 'красиво', 'Сходите'],
    sceneCaption: { de: 'Ein Besucher zeigt auf seinen Stadtplan und fragt: „Куда здесь стоит сходить вечером?“', en: 'A visitor points to his city map and asks: “Куда здесь стоит сходить вечером?”' },
    trophyWord: { word: 'площадь', meaning: { de: 'Platz', en: 'square' }, example: 'Площадь особенно красивая вечером.', whyThisWord: { de: 'Площадь ist der konkrete Ort, den du nun selbstbewusst einem anderen Besucher empfiehlst.', en: 'Площадь is the specific place you can now confidently recommend to another visitor.' } },
    distractors: ['Днём там рынок.', 'Останьтесь в отеле.'], placeholderCaption: { de: 'Ein großer Stadtplatz leuchtet am Abend unter warmen Laternen und Fassadenlichtern.', en: 'A broad city square glows at night beneath warm streetlamps and lit facades.' }, songMood: 'warm evening lights opening across a memorable city square', visualNotes: 'Illuminated central square, evening pedestrians, ornate facades, visitor receiving an enthusiastic recommendation.',
  }),
  makeRussianA2CompactLesson({
    slug: 'sous-k-etomu-blyudu', title: { de: 'Was passt zu diesem Gericht?', en: 'What goes with this dish?' },
    situation: { de: 'Der Kellner fragt, was er zu deinem Hauptgericht bringen soll. Du erkundigst dich nach der passenden Soße.', en: 'The waiter asks what to bring with your main dish. Ask which sauce goes well with it.' },
    pedagogicalGoal: 'Mit хорошо подходит к plus Dativ nach einer passenden Ergänzung zu einem Gericht fragen.',
    targetText: 'Какой соус хорошо подходит к этому блюду?', baseText: { de: 'Welche Soße passt gut zu diesem Gericht?', en: 'Which sauce goes well with this dish?' },
    chunks: [{ targetText: 'Какой соус', baseText: { de: 'Welche Soße', en: 'Which sauce' } }, { targetText: 'хорошо подходит', baseText: { de: 'passt gut', en: 'goes well' } }, { targetText: 'к этому блюду?', baseText: { de: 'zu diesem Gericht?', en: 'with this dish?' } }],
    terms: [{ targetText: 'соус', baseText: { de: 'Soße', en: 'sauce' } }, { targetText: 'подходит', baseText: { de: 'passt', en: 'goes well, suits' } }, { targetText: 'к этому блюду', baseText: { de: 'zu diesem Gericht; Dativ nach к', en: 'with this dish; dative after к' } }, { targetText: 'добавка', baseText: { de: 'Beilage, Zusatz', en: 'extra, addition' } }, { targetText: 'сочетаться', baseText: { de: 'zusammenpassen', en: 'to pair well' } }],
    recall: { before: 'Какой ', answer: 'соус', after: ' хорошо подходит к этому блюду?', fallbackChoices: ['соус', 'напиток', 'салат', 'десерт'] }, speakRequired: ['соус', 'подходит', 'блюду'],
    sceneCaption: { de: 'Der Kellner deutet auf das Hauptgericht und fragt: „Что вы хотите к рыбе?“', en: 'The waiter gestures toward the main dish and asks: “Что вы хотите к рыбе?”' },
    trophyWord: { word: 'соус', meaning: { de: 'Soße', en: 'sauce' }, example: 'Этот соус подходит к рыбе.', whyThisWord: { de: 'Соус macht die abstrakte Frage nach einer passenden Ergänzung zu einer konkreten Restaurantentscheidung.', en: 'Соус turns the abstract pairing question into a concrete restaurant choice.' } },
    distractors: ['Принесите хлеб.', 'Без соли, пожалуйста.'], placeholderCaption: { de: 'Neben einem Fischgericht stehen drei kleine Schalen mit deutlich verschiedenen Soßen.', en: 'Three small bowls of distinctly different sauces sit beside a fish dish.' }, songMood: 'small flavors finding the right match at the table', visualNotes: 'Restaurant table, fish entree, three sauce bowls, waiter waiting while the visitor asks about pairing.',
  }),
  makeRussianA2CompactLesson({
    slug: 'spasibo-za-sovet', title: { de: 'Ein ausgezeichneter Rat', en: 'Excellent advice' },
    situation: { de: 'Der Kellner fragt, ob seine Empfehlung gepasst hat. Du gibst ein klares positives Urteil und bedankst dich für den Rat.', en: 'The waiter asks whether his recommendation worked out. Give a clear positive verdict and thank him for the advice.' },
    pedagogicalGoal: 'Eine Empfehlung mit очень вкусно bewerten und sich mit спасибо за plus Akkusativ gezielt bedanken.',
    targetText: 'Очень вкусно! Спасибо за отличный совет!', baseText: { de: 'Sehr lecker! Danke für den ausgezeichneten Rat!', en: 'Very tasty! Thank you for the excellent advice!' },
    chunks: [{ targetText: 'Очень вкусно!', baseText: { de: 'Sehr lecker!', en: 'Very tasty!' } }, { targetText: 'Спасибо', baseText: { de: 'Danke', en: 'Thank you' } }, { targetText: 'за отличный совет!', baseText: { de: 'für den ausgezeichneten Rat!', en: 'for the excellent advice!' } }],
    terms: [{ targetText: 'очень вкусно', baseText: { de: 'sehr lecker', en: 'very tasty' } }, { targetText: 'совет', baseText: { de: 'Rat, Empfehlung', en: 'advice, recommendation' } }, { targetText: 'за совет', baseText: { de: 'für den Rat; Akkusativ nach за', en: 'for the advice; accusative after за' } }, { targetText: 'отличный', baseText: { de: 'ausgezeichnet', en: 'excellent' } }, { targetText: 'оценка', baseText: { de: 'Bewertung', en: 'evaluation' } }],
    recall: { before: 'Очень вкусно! Спасибо за отличный ', answer: 'совет', after: '!', fallbackChoices: ['совет', 'подарок', 'рецепт', 'рассказ'] }, speakRequired: ['Очень', 'отличный', 'совет'],
    sceneCaption: { de: 'Der Kellner sieht den leeren Teller und fragt: „Ну как? Вам понравилось?“', en: 'The waiter sees the empty plate and asks: “Ну как? Вам понравилось?”' },
    trophyWord: { word: 'совет', meaning: { de: 'Rat, Empfehlung', en: 'advice, recommendation' }, example: 'Ваш совет очень полезный.', whyThisWord: { de: 'Совет schließt den ganzen Pfad: Du hast eine Empfehlung erfragt, ausprobiert und ausdrücklich gewürdigt.', en: 'Совет closes the whole path: you asked for a recommendation, tried it, and explicitly appreciated it.' } },
    distractors: ['Можно ещё соус?', 'В следующий раз.'], placeholderCaption: { de: 'Ein leerer Teller und eine kleine Soßenschale zeigen, dass die Empfehlung ein Erfolg war.', en: 'An empty plate and a small sauce bowl show that the recommendation was a success.' }, songMood: 'a successful recommendation ending in warm gratitude', visualNotes: 'Empty restaurant plate, satisfied visitor, waiter receiving thanks, warm closing moment at the table.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_SEVEN_METADATA,
  russianA2Practical7Inputs,
  { de: 'Du hast Russisch A2 Praxis 7 abgeschlossen und kannst Empfehlungen erfragen, annehmen und selbst geben.', en: 'You have completed Russian A2 Practical 7 and can ask for, accept, and give recommendations.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-8',
  title: 'Russian A2 Practical 8',
  shortTitle: 'A2 Practical 8',
  subtitle: { de: 'Auf Neuigkeiten reagieren und über Wetter und Befinden sprechen', en: 'Reacting to news and talking about weather and how things feel' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical8Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'pravda-rad-za-vas', title: { de: 'Wirklich? Das freut mich!', en: 'Really? I am glad!' },
    situation: { de: 'Ein neuer Freund erzählt dir von einer guten beruflichen Nachricht. Du reagierst überrascht und freust dich für ihn.', en: 'A new friend shares good news about work. React with surprise and say you are glad for him.' },
    pedagogicalGoal: 'Mit der festen Reaktion Правда? und der männlichen Kurzform рад freundlich auf gute Nachrichten reagieren.',
    targetText: 'Правда? Очень рад за вас!', baseText: { de: 'Wirklich? Ich freue mich sehr für Sie!', en: 'Really? I am very glad for you!' },
    chunks: [{ targetText: 'Правда?', baseText: { de: 'Wirklich?', en: 'Really?' } }, { targetText: 'Очень рад', baseText: { de: 'Ich freue mich sehr', en: 'I am very glad' } }, { targetText: 'за вас!', baseText: { de: 'für Sie!', en: 'for you!' } }],
    terms: [{ targetText: 'правда', baseText: { de: 'wirklich, wahr', en: 'really, true' } }, { targetText: 'рад', baseText: { de: 'froh (Mann; Frau: рада)', en: 'glad (male; female: рада)' }, alsoAccept: ['рада'] }, { targetText: 'за вас', baseText: { de: 'für Sie; Akkusativ nach за', en: 'for you; accusative after за' } }, { targetText: 'новость', baseText: { de: 'Nachricht', en: 'news' } }, { targetText: 'реакция', baseText: { de: 'Reaktion', en: 'reaction' } }],
    recall: { before: 'Правда? ', answer: 'Очень', after: ' рад за вас!', fallbackChoices: ['Очень', 'Немного', 'Совсем', 'Почти'] }, speakRequired: ['Правда', 'Очень', 'вас'], genderForms: { voiced: 'рад', other: 'рада' },
    sceneCaption: { de: 'Der Freund strahlt und sagt: „У меня отличная новость: новая работа!“', en: 'The friend beams and says: “У меня отличная новость: новая работа!”' },
    trophyWord: { word: 'правда', meaning: { de: 'wirklich, wahr', en: 'really, true' }, example: 'Правда, у вас новая работа?', whyThisWord: { de: 'Правда? gibt deiner Antwort sofort echte, freundliche Überraschung, bevor du deine Freude ausdrückst.', en: 'Правда? gives your reply genuine friendly surprise before you express your happiness.' } },
    distractors: ['Как интересно!', 'Я уже знаю.'], placeholderCaption: { de: 'Zwei Bekannte stehen vor einem Bürogebäude; einer zeigt lächelnd eine neue Zugangskarte.', en: 'Two acquaintances stand outside an office building while one smiles and shows a new access card.' }, songMood: 'bright surprise opening into generous shared happiness', visualNotes: 'Friendly street conversation, new work badge, delighted expression, respectful warmth between new adult friends.',
  }),
  makeRussianA2CompactLesson({
    slug: 'segodnya-ochen-zharko', title: { de: 'Heiß wie im Sommer', en: 'Hot like summer' },
    situation: { de: 'Dein Freund fragt, wie du die Hitze heute findest. Du vergleichst den ungewöhnlich warmen Tag mit dem Sommer.', en: 'Your friend asks how today’s heat feels. Compare the unusually warm day with summer.' },
    pedagogicalGoal: 'Mit dem unpersönlichen Wetterwort жарко und очень die Stärke einer Temperatur ausdrücken.',
    targetText: 'Сегодня очень жарко, как летом.', baseText: { de: 'Heute ist es sehr heiß, wie im Sommer.', en: 'It is very hot today, like summer.' },
    chunks: [{ targetText: 'Сегодня очень жарко,', baseText: { de: 'Heute ist es sehr heiß,', en: 'It is very hot today,' } }, { targetText: 'как', baseText: { de: 'wie', en: 'like' } }, { targetText: 'летом.', baseText: { de: 'im Sommer.', en: 'in summer.' } }],
    terms: [{ targetText: 'жарко', baseText: { de: 'heiß; unpersönliches Wetterwort', en: 'hot; impersonal weather word' } }, { targetText: 'очень', baseText: { de: 'sehr', en: 'very' } }, { targetText: 'летом', baseText: { de: 'im Sommer; Instrumental als Zeitangabe', en: 'in summer; instrumental time expression' } }, { targetText: 'жара', baseText: { de: 'Hitze', en: 'heat' } }, { targetText: 'температура', baseText: { de: 'Temperatur', en: 'temperature' } }],
    recall: { before: 'Сегодня очень ', answer: 'жарко', after: ', как летом.', fallbackChoices: ['жарко', 'холодно', 'сыро', 'ветрено'] }, speakRequired: ['Сегодня', 'жарко', 'летом'],
    sceneCaption: { de: 'Der Freund sucht im Schatten Schutz und fragt: „Как вам сегодняшняя жара?“', en: 'The friend steps into the shade and asks: “Как вам сегодняшняя жара?”' },
    trophyWord: { word: 'жарко', meaning: { de: 'heiß', en: 'hot' }, example: 'Вам не жарко на солнце?', whyThisWord: { de: 'Жарко ist die natürliche unpersönliche Form, mit der du die Hitze des ganzen Tages beschreibst.', en: 'Жарко is the natural impersonal form for describing how hot the whole day feels.' } },
    distractors: ['Небо совсем ясное.', 'Скоро станет темнее.'], placeholderCaption: { de: 'Starkes Sonnenlicht liegt über der Straße, während zwei Freunde im schmalen Schatten stehen.', en: 'Strong sunlight covers the street while two friends stand in a narrow strip of shade.' }, songMood: 'summer heat shimmering through an ordinary city day', visualNotes: 'Bright hot pavement, deep shade, summer-like sun, two friends discussing the surprising temperature.',
  }),
  makeRussianA2CompactLesson({
    slug: 'nemnogo-ustal-segodnya', title: { de: 'Heute etwas müde', en: 'A little tired today' },
    situation: { de: 'Dein Freund merkt, dass du heute stiller bist. Du sagst ehrlich, dass du ein wenig müde bist.', en: 'Your friend notices you are quieter today. Say honestly that you are a little tired.' },
    pedagogicalGoal: 'Mit немного die Stärke eines Zustands abschwächen und die männliche Form устал korrekt verwenden.',
    targetText: 'Сегодня после работы я немного устал.', baseText: { de: 'Heute bin ich nach der Arbeit ein wenig müde.', en: 'Today I am a little tired after work.' },
    chunks: [{ targetText: 'Сегодня', baseText: { de: 'Heute', en: 'Today' } }, { targetText: 'после работы', baseText: { de: 'nach der Arbeit', en: 'after work' } }, { targetText: 'я немного устал.', baseText: { de: 'bin ich ein wenig müde.', en: 'I am a little tired.' } }],
    terms: [{ targetText: 'устал', baseText: { de: 'müde geworden (Mann; Frau: устала)', en: 'got tired (male; female: устала)' }, alsoAccept: ['устала'] }, { targetText: 'немного', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'сегодня', baseText: { de: 'heute', en: 'today' } }, { targetText: 'после работы', baseText: { de: 'nach der Arbeit; Genitiv nach после', en: 'after work; genitive after после' } }, { targetText: 'отдохнуть', baseText: { de: 'sich ausruhen', en: 'to rest' } }],
    recall: { before: 'Сегодня после работы я ', answer: 'немного', after: ' устал.', fallbackChoices: ['немного', 'очень', 'совсем', 'почти'] }, speakRequired: ['Сегодня', 'работы', 'немного'], genderForms: { voiced: 'устал', other: 'устала' },
    sceneCaption: { de: 'Der Freund betrachtet dich aufmerksam und fragt: „Вы сегодня устали?“', en: 'The friend looks at you carefully and asks: “Вы сегодня устали?”' },
    trophyWord: { word: 'немного', meaning: { de: 'ein wenig', en: 'a little' }, example: 'Подождите немного, пожалуйста.', whyThisWord: { de: 'Немного macht die Antwort genauer und lässt den Zustand weniger dramatisch klingen.', en: 'Немного makes the reply more precise and keeps the condition from sounding too dramatic.' } },
    distractors: ['Мне нужен отдых.', 'Всё нормально.'], placeholderCaption: { de: 'Zwei Freunde sitzen kurz auf einer Bank; einer wirkt müde, aber ruhig und ansprechbar.', en: 'Two friends pause on a bench; one looks tired but calm and engaged.' }, songMood: 'a gentle honest pause in the middle of a busy day', visualNotes: 'City bench, mild fatigue, respectful friend checking in, understated and reassuring body language.',
  }),
  makeRussianA2CompactLesson({
    slug: 'mnogo-raboty-na-nedele', title: { de: 'Eine volle Woche', en: 'A busy week' },
    situation: { de: 'Dein Freund fragt, wie deine Woche läuft. Du erklärst, dass die Arbeit diese Woche besonders viel ist.', en: 'Your friend asks how your week is going. Explain that there is especially a lot of work this week.' },
    pedagogicalGoal: 'Mit много plus Genitiv eine große Menge ausdrücken und на этой неделе zeitlich einordnen.',
    targetText: 'На этой неделе очень много работы.', baseText: { de: 'Diese Woche gibt es sehr viel Arbeit.', en: 'There is a lot of work this week.' },
    chunks: [{ targetText: 'На этой неделе', baseText: { de: 'Diese Woche', en: 'This week' } }, { targetText: 'очень много', baseText: { de: 'sehr viel', en: 'a great deal of' } }, { targetText: 'работы.', baseText: { de: 'Arbeit.', en: 'work.' } }],
    terms: [{ targetText: 'на этой неделе', baseText: { de: 'in dieser Woche; Präpositiv', en: 'this week; prepositional' } }, { targetText: 'много работы', baseText: { de: 'viel Arbeit; Genitiv nach много', en: 'a lot of work; genitive after много' } }, { targetText: 'работы', baseText: { de: 'der Arbeit; Genitiv Singular', en: 'of work; genitive singular' } }, { targetText: 'график', baseText: { de: 'Zeitplan', en: 'schedule' } }, { targetText: 'дела', baseText: { de: 'Angelegenheiten, Aufgaben', en: 'things to do, tasks' } }],
    recall: { before: 'На этой неделе очень много ', answer: 'работы', after: '.', fallbackChoices: ['работы', 'музыки', 'снега', 'света'] }, speakRequired: ['этой', 'много', 'работы'],
    sceneCaption: { de: 'Der Freund klappt seinen Kalender zu und fragt: „Как проходит ваша неделя?“', en: 'The friend closes his calendar and asks: “Как проходит ваша неделя?”' },
    trophyWord: { word: 'много', meaning: { de: 'viel, viele', en: 'a lot, many' }, example: 'У вас много дел на этой неделе?', whyThisWord: { de: 'Много lässt dich eine volle Woche knapp erklären und löst zugleich den wichtigen Genitiv aus.', en: 'Много lets you explain a packed week briefly while also triggering the important genitive case.' } },
    distractors: ['После работы свободно.', 'Неделя только начинается.'], placeholderCaption: { de: 'Ein dicht beschriebener Wochenkalender liegt zwischen zwei Kaffeetassen auf dem Tisch.', en: 'A densely filled weekly calendar lies between two cups on the table.' }, songMood: 'a crowded week moving steadily one task at a time', visualNotes: 'Full paper calendar, task notes, friends discussing the week during a brief break.',
  }),
  makeRussianA2CompactLesson({
    slug: 'opyat-dozhd-zonta-net', title: { de: 'Schon wieder Regen', en: 'Rain again' },
    situation: { de: 'Vor dem Hinausgehen fragt dein Freund, ob du einen Schirm dabeihast. Du siehst den neuen Regen und stellst fest, dass keiner da ist.', en: 'Before going out, your friend asks whether you brought an umbrella. Notice the rain again and say you do not have one.' },
    pedagogicalGoal: 'Mit опять eine Wiederholung markieren und зонта нет als feste Genitivkonstruktion verwenden.',
    targetText: 'Опять дождь, а зонта совсем нет.', baseText: { de: 'Schon wieder Regen, und ich habe überhaupt keinen Schirm.', en: 'It is raining again, and there is no umbrella at all.' },
    chunks: [{ targetText: 'Опять дождь,', baseText: { de: 'Schon wieder Regen,', en: 'Rain again,' } }, { targetText: 'а зонта', baseText: { de: 'aber einen Schirm', en: 'but an umbrella' } }, { targetText: 'совсем нет.', baseText: { de: 'gibt es überhaupt nicht.', en: 'is completely missing.' } }],
    terms: [{ targetText: 'опять', baseText: { de: 'wieder, schon wieder', en: 'again' } }, { targetText: 'дождь', baseText: { de: 'Regen', en: 'rain' } }, { targetText: 'зонта совсем нет', baseText: { de: 'es gibt überhaupt keinen Schirm; Genitiv mit нет', en: 'there is no umbrella at all; genitive with нет' } }, { targetText: 'совсем', baseText: { de: 'ganz, überhaupt', en: 'completely, at all' } }, { targetText: 'зонт', baseText: { de: 'Regenschirm', en: 'umbrella' } }],
    recall: { before: 'Опять дождь, а ', answer: 'зонта', after: ' совсем нет.', fallbackChoices: ['зонта', 'плаща', 'шарфа', 'дождевика'] }, speakRequired: ['дождь', 'зонта', 'совсем'],
    sceneCaption: { de: 'Der Freund hört den Regen am Fenster und fragt: „Вы взяли зонт?“', en: 'The friend hears rain at the window and asks: “Вы взяли зонт?”' },
    trophyWord: { word: 'зонт', meaning: { de: 'Regenschirm', en: 'umbrella' }, example: 'У вас есть зонт?', whyThisWord: { de: 'Зонт ist der fehlende Gegenstand, an dem du die alltägliche Genitivform mit нет sofort brauchst.', en: 'Зонт is the missing item that makes the everyday genitive construction with нет immediately useful.' } },
    distractors: ['Возьмите мою куртку.', 'Скоро будет солнце.'], placeholderCaption: { de: 'Regentropfen laufen am Fenster hinunter; am leeren Haken hängt kein Schirm.', en: 'Raindrops run down the window while the umbrella hook stands empty.' }, songMood: 'rain returning with one small everyday complication', visualNotes: 'Window streaked with rain, empty umbrella hook, two friends realizing they must adjust their outing.',
  }),
  makeRussianA2CompactLesson({
    slug: 'oy-kak-zhal', title: { de: 'Wie schade!', en: 'What a shame!' },
    situation: { de: 'Dein Freund berichtet, dass seine geplante Reise ausfällt. Du reagierst mit ehrlichem Bedauern.', en: 'Your friend says his planned trip is being canceled. Respond with genuine sympathy.' },
    pedagogicalGoal: 'Die feste Reaktion Ой, как жаль! für schlechte Nachrichten verwenden und kurz weiterreagieren.',
    targetText: 'Как жаль! Это плохая новость.', baseText: { de: 'Wie schade! Das ist eine schlechte Nachricht.', en: 'What a shame! That is bad news.' },
    chunks: [{ targetText: 'Как жаль!', baseText: { de: 'Wie schade!', en: 'What a shame!' } }, { targetText: 'Это плохая', baseText: { de: 'Das ist eine schlechte', en: 'That is bad' } }, { targetText: 'новость.', baseText: { de: 'Nachricht.', en: 'news.' } }],
    terms: [{ targetText: 'как жаль', baseText: { de: 'wie schade', en: 'what a shame' } }, { targetText: 'плохая новость', baseText: { de: 'schlechte Nachricht', en: 'bad news' } }, { targetText: 'грустно', baseText: { de: 'traurig', en: 'sad' } }, { targetText: 'жаль', baseText: { de: 'schade, bedauerlich', en: 'a pity, a shame' } }, { targetText: 'поездка', baseText: { de: 'Reise, Ausflug', en: 'trip' } }],
    recall: { before: 'Как ', answer: 'жаль', after: '! Это плохая новость.', fallbackChoices: ['жаль', 'странно', 'поздно', 'трудно'] }, speakRequired: ['Как', 'жаль', 'новость'],
    sceneCaption: { de: 'Der Freund zeigt auf die Nachricht am Handy und sagt: „Моя поездка отменяется.“', en: 'The friend shows the message on his phone and says: “Моя поездка отменяется.”' },
    trophyWord: { word: 'жаль', meaning: { de: 'schade, bedauerlich', en: 'a pity, a shame' }, example: 'Как жаль! Вы не идёте с нами.', whyThisWord: { de: 'Жаль ist die kurze, natürliche Gefühlsreaktion, die deinem Freund Mitgefühl zeigt.', en: 'Жаль is the brief natural reaction that shows your friend genuine sympathy.' } },
    distractors: ['Здорово, поздравляю!', 'Это меня радует.'], placeholderCaption: { de: 'Auf einem Handybildschirm steht eine Reiseabsage, während der Freund enttäuscht danebensteht.', en: 'A cancellation notice fills the phone screen while the friend stands beside it looking disappointed.' }, songMood: 'a warm sympathetic response softening disappointing news', visualNotes: 'Phone with canceled trip message, disappointed friend, attentive listener responding with sincere concern.',
  }),
  makeRussianA2CompactLesson({
    slug: 'seychas-vsyo-otlichno', title: { de: 'Im Moment alles bestens', en: 'Everything is great now' },
    situation: { de: 'Dein Freund fragt direkt, wie es dir im Moment geht. Du antwortest ruhig und klar positiv.', en: 'Your friend directly asks how you are doing right now. Answer calmly and clearly that things are great.' },
    pedagogicalGoal: 'Mit сейчас einen gegenwärtigen Zustand fokussieren und всё отлично als natürliche Kurzbewertung verwenden.',
    targetText: 'Здорово! У меня сейчас всё отлично.', baseText: { de: 'Großartig! Bei mir ist gerade alles bestens.', en: 'Great! Everything is going very well for me right now.' },
    chunks: [{ targetText: 'Здорово!', baseText: { de: 'Großartig!', en: 'Great!' } }, { targetText: 'У меня сейчас', baseText: { de: 'Bei mir ist gerade', en: 'For me right now' } }, { targetText: 'всё отлично.', baseText: { de: 'alles bestens.', en: 'everything is going very well.' } }],
    terms: [{ targetText: 'здорово', baseText: { de: 'großartig, toll', en: 'great, wonderful' } }, { targetText: 'у меня', baseText: { de: 'bei mir, ich habe', en: 'with me, I have' } }, { targetText: 'сейчас', baseText: { de: 'jetzt, gerade', en: 'now, right now' } }, { targetText: 'всё отлично', baseText: { de: 'alles ist bestens', en: 'everything is great' } }, { targetText: 'отлично', baseText: { de: 'ausgezeichnet, bestens', en: 'great, excellent' } }],
    recall: { before: 'Здорово! У меня сейчас всё ', answer: 'отлично', after: '.', fallbackChoices: ['отлично', 'спокойно', 'трудно', 'обычно'] }, speakRequired: ['Здорово', 'сейчас', 'отлично'],
    sceneCaption: { de: 'Der Freund setzt sich zu dir und fragt: „Как у вас дела сейчас?“', en: 'The friend sits down beside you and asks: “Как у вас дела сейчас?”' },
    trophyWord: { word: 'отлично', meaning: { de: 'ausgezeichnet, bestens', en: 'great, excellent' }, example: 'У вас всё отлично?', whyThisWord: { de: 'Отлично gibt auf eine offene Frage nach dem Befinden eine klare, natürliche positive Antwort.', en: 'Отлично gives a clear, natural positive answer to an open question about how things are going.' } },
    distractors: ['Неделя очень долгая.', 'Мне нужно домой.'], placeholderCaption: { de: 'Zwei Freunde sitzen entspannt auf einer sonnigen Bank und sprechen ohne Eile.', en: 'Two friends sit relaxed on a sunny bench and talk without any hurry.' }, songMood: 'steady contentment in an easy everyday check-in', visualNotes: 'Calm park bench, open posture, relaxed faces, simple friendly conversation in the present moment.',
  }),
  makeRussianA2CompactLesson({
    slug: 'nu-nado-zhe-novost', title: { de: 'Na so was!', en: 'Well, imagine that!' },
    situation: { de: 'Dein Freund kündigt begeistert eine unerwartete gute Nachricht an. Du reagierst mit staunender Freude.', en: 'Your friend excitedly announces unexpected good news. React with delighted amazement.' },
    pedagogicalGoal: 'Die feste erstaunte Reaktion Ну надо же! erkennen und mit einer positiven Bewertung verbinden.',
    targetText: 'Ну надо же! Какая отличная новость!', baseText: { de: 'Na so was! Was für eine großartige Nachricht!', en: 'Well, imagine that! What excellent news!' },
    chunks: [{ targetText: 'Ну надо же!', baseText: { de: 'Na so was!', en: 'Well, imagine that!' } }, { targetText: 'Какая отличная', baseText: { de: 'Was für eine großartige', en: 'What excellent' } }, { targetText: 'новость!', baseText: { de: 'Nachricht!', en: 'news!' } }],
    terms: [{ targetText: 'ну надо же', baseText: { de: 'na so was, unglaublich', en: 'well, imagine that' } }, { targetText: 'какая', baseText: { de: 'was für eine; feminin', en: 'what a; feminine' } }, { targetText: 'отличная новость', baseText: { de: 'großartige Nachricht', en: 'excellent news' } }, { targetText: 'новость', baseText: { de: 'Nachricht', en: 'news' } }, { targetText: 'удивление', baseText: { de: 'Überraschung, Staunen', en: 'surprise, amazement' } }],
    recall: { before: 'Ну надо же! Какая отличная ', answer: 'новость', after: '!', fallbackChoices: ['новость', 'история', 'погода', 'музыка'] }, speakRequired: ['надо', 'отличная', 'новость'],
    sceneCaption: { de: 'Der Freund kann sein Lächeln kaum verbergen und sagt: „Мы переезжаем в новую квартиру!“', en: 'The friend can barely hide his smile and says: “Мы переезжаем в новую квартиру!”' },
    trophyWord: { word: 'новость', meaning: { de: 'Nachricht', en: 'news' }, example: 'Это отличная новость!', whyThisWord: { de: 'Новость benennt den Anlass für die feste erstaunte Reaktion und hält die Antwort konkret.', en: 'Новость names the reason for the fixed surprised reaction and keeps the reply concrete.' } },
    distractors: ['Как жаль!', 'Я не понимаю.'], placeholderCaption: { de: 'Ein Freund hält eine gute Nachricht auf dem Handy hoch und strahlt vor Überraschung.', en: 'A friend holds up good news on a phone and beams with surprise.' }, songMood: 'unexpected good news bursting into delighted amazement', visualNotes: 'Joyful friend, phone message, spontaneous wide smile, animated but respectful reaction between acquaintances.',
  }),
  makeRussianA2CompactLesson({
    slug: 'hochetsya-goryachego-kofe', title: { de: 'Lust auf heißen Kaffee', en: 'Craving hot coffee' },
    situation: { de: 'An einem kalten Morgen fragt dein Freund, was dir bei diesem Wetter guttun würde. Du nennst heißen Kaffee.', en: 'On a cold morning, your friend asks what would feel good in this weather. Say you feel like having hot coffee.' },
    pedagogicalGoal: 'Das unpersönliche хочется mit dem Genitiv горячего кофе verwenden und kaltes Wetter beschreiben.',
    targetText: 'Утром очень холодно. Хочется горячего кофе.', baseText: { de: 'Morgens ist es sehr kalt. Ich hätte gern heißen Kaffee.', en: 'It is very cold in the morning. I feel like having hot coffee.' },
    chunks: [{ targetText: 'Утром очень холодно.', baseText: { de: 'Morgens ist es sehr kalt.', en: 'It is very cold in the morning.' } }, { targetText: 'Хочется', baseText: { de: 'Man hat Lust auf', en: 'I feel like having' } }, { targetText: 'горячего кофе.', baseText: { de: 'heißen Kaffee.', en: 'hot coffee.' } }],
    terms: [{ targetText: 'хочется', baseText: { de: 'man hat Lust, einem ist nach', en: 'one feels like, one wants' } }, { targetText: 'горячего кофе', baseText: { de: 'heißen Kaffee; im Russischen Genitiv nach хочется', en: 'hot coffee; genitive after хочется' } }, { targetText: 'холодно', baseText: { de: 'kalt; unpersönlich', en: 'cold; impersonal' } }, { targetText: 'утром', baseText: { de: 'morgens; Instrumental als Zeitangabe', en: 'in the morning; instrumental time expression' } }, { targetText: 'согреться', baseText: { de: 'sich aufwärmen', en: 'to warm up' } }],
    recall: { before: 'Утром очень холодно. Хочется ', answer: 'горячего', after: ' кофе.', fallbackChoices: ['горячего', 'холодного', 'сладкого', 'крепкого'] }, speakRequired: ['Утром', 'холодно', 'Хочется'],
    sceneCaption: { de: 'Der Freund reibt sich die Hände und fragt: „Что вам хочется в такую погоду?“', en: 'The friend rubs his hands together and asks: “Что вам хочется в такую погоду?”' },
    trophyWord: { word: 'хочется', meaning: { de: 'man hat Lust, einem ist nach', en: 'one feels like, one wants' }, example: 'Вам хочется горячего кофе?', whyThisWord: { de: 'Хочется drückt einen spontanen Wunsch ohne gegendertes Sprecherwort aus und verlangt den wichtigen Genitiv.', en: 'Хочется expresses a spontaneous desire without a gendered speaker form and requires the important genitive.' } },
    distractors: ['Нужна тёплая куртка.', 'На улице ветер.'], placeholderCaption: { de: 'Kalter Morgennebel liegt vor dem Caféfenster, hinter dem eine dampfende Tasse wartet.', en: 'Cold morning mist hangs outside a cafe window while a steaming cup waits inside.' }, songMood: 'cold morning air drawing everyone toward one warm cup', visualNotes: 'Frosty morning window, friends outside, visible steam from a hot cup, inviting warm cafe light.',
  }),
  makeRussianA2CompactLesson({
    slug: 'otlichnyy-den-pravda', title: { de: 'Ein großartiger Tag', en: 'A great day' },
    situation: { de: 'Am Ende eines gemeinsamen Spaziergangs fragt dein Freund, wie du den Tag fandest. Du fasst ihn positiv zusammen und suchst Zustimmung.', en: 'At the end of a walk together, your friend asks what you thought of the day. Sum it up positively and invite agreement.' },
    pedagogicalGoal: 'Einen Tag mit отличный bewerten und правда? als kurze bestätigende Rückfrage anhängen.',
    targetText: 'Сегодня отличный день для прогулки, правда?', baseText: { de: 'Heute ist ein großartiger Tag für einen Spaziergang, oder?', en: 'Today is a great day for a walk, isn’t it?' },
    chunks: [{ targetText: 'Сегодня отличный день', baseText: { de: 'Heute ist ein großartiger Tag', en: 'Today is a great day' } }, { targetText: 'для прогулки,', baseText: { de: 'für einen Spaziergang,', en: 'for a walk,' } }, { targetText: 'правда?', baseText: { de: 'oder?', en: 'isn’t it?' } }],
    terms: [{ targetText: 'отличный', baseText: { de: 'großartig; stimmt mit день überein', en: 'excellent; agrees with день' } }, { targetText: 'день', baseText: { de: 'Tag', en: 'day' } }, { targetText: 'для прогулки', baseText: { de: 'für einen Spaziergang; Genitiv nach для', en: 'for a walk; genitive after для' } }, { targetText: 'правда', baseText: { de: 'nicht wahr, oder', en: 'right, isn’t it' } }, { targetText: 'впечатление', baseText: { de: 'Eindruck', en: 'impression' } }],
    recall: { before: 'Сегодня ', answer: 'отличный', after: ' день для прогулки, правда?', fallbackChoices: ['отличный', 'спокойный', 'тяжёлый', 'обычный'] }, speakRequired: ['Сегодня', 'день', 'прогулки'],
    sceneCaption: { de: 'Der Freund bleibt am Ende des Spaziergangs stehen und fragt: „Как вам наша прогулка?“', en: 'The friend pauses at the end of the walk and asks: “Как вам наша прогулка?”' },
    trophyWord: { word: 'прогулка', meaning: { de: 'Spaziergang', en: 'walk, stroll' }, example: 'Сегодня отличный день для прогулки.', whyThisWord: { de: 'Прогулка macht die positive Tagesbewertung konkret: Das Wetter lädt zu einer gemeinsamen Aktivität ein.', en: 'Прогулка makes the positive view of the day concrete: the weather invites a shared activity.' } },
    distractors: ['Пора идти домой.', 'Завтра будет дождь.'], placeholderCaption: { de: 'Zwei Freunde beenden bei warmem Abendlicht einen gelungenen Spaziergang durch die Stadt.', en: 'Two friends finish a successful city walk in warm evening light.' }, songMood: 'a good day settling into an easy shared conclusion', visualNotes: 'Golden-hour city path, two adult friends slowing at the end of a walk, content and conversational.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_EIGHT_METADATA,
  russianA2Practical8Inputs,
  { de: 'Du hast Russisch A2 Praxis 8 abgeschlossen und kannst auf Neuigkeiten reagieren sowie Wetter, Wünsche und Befinden beschreiben.', en: 'You have completed Russian A2 Practical 8 and can react to news and describe weather, wishes, and how things feel.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_NINE_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-9',
  title: 'Russian A2 Practical 9',
  shortTitle: 'A2 Practical 9',
  subtitle: { de: 'Probleme erklären, frühere Schritte nennen und höflich Lösungen erbitten', en: 'Explaining problems, naming earlier actions, and politely requesting solutions' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical9Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'dush-ne-rabotaet-pozvonila', title: { de: 'Die Dusche funktioniert nicht', en: 'The shower does not work' },
    situation: { de: 'An der Hotelrezeption fragt man, was passiert ist. Du erklärst das aktuelle Problem und sagst, dass du bereits angerufen hast.', en: 'At hotel reception, you are asked what happened. Explain the current problem and say that you already called.' },
    pedagogicalGoal: 'Ein aktuelles Problem mit не работает nennen und mit der femininen Vergangenheit позвонила einen früheren Reparaturschritt ergänzen.',
    targetText: 'Душ не работает. Я позвонила на ресепшен.', baseText: { de: 'Die Dusche funktioniert nicht. Ich habe an der Rezeption angerufen.', en: 'The shower does not work. I called reception.' },
    chunks: [{ targetText: 'Душ не работает.', baseText: { de: 'Die Dusche funktioniert nicht.', en: 'The shower does not work.' } }, { targetText: 'Я позвонила', baseText: { de: 'Ich habe angerufen', en: 'I called' } }, { targetText: 'на ресепшен.', baseText: { de: 'an der Rezeption.', en: 'reception.' } }],
    terms: [{ targetText: 'душ', baseText: { de: 'Dusche', en: 'shower' } }, { targetText: 'не работает', baseText: { de: 'funktioniert nicht', en: 'does not work' } }, { targetText: 'позвонила', baseText: { de: 'ich habe angerufen (Frau; Mann: позвонил)', en: 'I called (female; male: позвонил)' }, alsoAccept: ['позвонил'] }, { targetText: 'на ресепшен', baseText: { de: 'an die Rezeption', en: 'to reception' } }, { targetText: 'починить', baseText: { de: 'reparieren', en: 'to repair' } }],
    recall: { before: '', answer: 'Душ', after: ' не работает. Я позвонила на ресепшен.', fallbackChoices: ['Душ', 'Лифт', 'Телевизор', 'Холодильник'] }, speakRequired: ['Душ', 'работает', 'ресепшен'], genderForms: { voiced: 'позвонила', other: 'позвонил' },
    sceneCaption: { de: 'Die Rezeptionistin öffnet das Störungsformular und fragt: „Что случилось?“', en: 'The receptionist opens the maintenance form and asks: “Что случилось?”' },
    trophyWord: { word: 'душ', meaning: { de: 'Dusche', en: 'shower' }, example: 'Душ в вашем номере работает?', whyThisWord: { de: 'Душ benennt den defekten Gegenstand sofort, bevor du erklärst, welchen Schritt du schon unternommen hast.', en: 'Душ identifies the broken item immediately before you explain the step you already took.' } },
    distractors: ['Вода слишком горячая.', 'Принесите полотенце.'], placeholderCaption: { de: 'Ein Hotelbad mit trockener Dusche steht neben einem geöffneten Störungsformular an der Rezeption.', en: 'A hotel bathroom with a dry shower is shown beside an open maintenance form at reception.' }, songMood: 'a clear hotel problem moving toward a practical repair', visualNotes: 'Hotel reception and inset bathroom view, nonworking shower, clerk recording the issue after a prior call.',
  }),
  makeRussianA2CompactLesson({
    slug: 'zakazala-polchasa-zakaza-net', title: { de: 'Seit einer halben Stunde bestellt', en: 'Ordered half an hour ago' },
    situation: { de: 'Der Kellner fragt, wie lange du schon auf deine Bestellung wartest. Du nennst den früheren Bestellzeitpunkt und das aktuelle Fehlen.', en: 'The waiter asks how long you have been waiting for your order. State when you ordered and that it is still missing.' },
    pedagogicalGoal: 'Die feminine Vergangenheit заказала mit полчаса назад verbinden und заказа ещё нет als Genitivkonstruktion verwenden.',
    targetText: 'Я заказала полчаса назад, а заказа ещё нет.', baseText: { de: 'Ich habe vor einer halben Stunde bestellt, aber die Bestellung ist noch nicht da.', en: 'I ordered half an hour ago, but the order is still not here.' },
    chunks: [{ targetText: 'Я заказала', baseText: { de: 'Ich habe bestellt', en: 'I ordered' } }, { targetText: 'полчаса назад,', baseText: { de: 'vor einer halben Stunde,', en: 'half an hour ago,' } }, { targetText: 'а заказа ещё нет.', baseText: { de: 'aber die Bestellung ist noch nicht da.', en: 'but the order is still not here.' } }],
    terms: [{ targetText: 'заказала', baseText: { de: 'ich habe bestellt (Frau; Mann: заказал)', en: 'I ordered (female; male: заказал)' }, alsoAccept: ['заказал'] }, { targetText: 'полчаса назад', baseText: { de: 'vor einer halben Stunde', en: 'half an hour ago' } }, { targetText: 'заказа ещё нет', baseText: { de: 'die Bestellung ist noch nicht da; Genitiv mit нет', en: 'the order is still not here; genitive with нет' } }, { targetText: 'полчаса', baseText: { de: 'eine halbe Stunde', en: 'half an hour' } }, { targetText: 'задержка', baseText: { de: 'Verspätung, Verzögerung', en: 'delay' } }],
    recall: { before: 'Я заказала ', answer: 'полчаса', after: ' назад, а заказа ещё нет.', fallbackChoices: ['полчаса', 'час', 'минуту', 'неделю'] }, speakRequired: ['полчаса', 'назад', 'заказа'], genderForms: { voiced: 'заказала', other: 'заказал' },
    sceneCaption: { de: 'Der Kellner prüft seinen Block und fragt: „Вы давно ждёте заказ?“', en: 'The waiter checks his pad and asks: “Вы давно ждёте заказ?”' },
    trophyWord: { word: 'полчаса', meaning: { de: 'eine halbe Stunde', en: 'half an hour' }, example: 'Вы ждёте уже полчаса.', whyThisWord: { de: 'Полчаса macht die Verzögerung konkret und zeigt, dass die Bestellung nicht erst seit wenigen Minuten fehlt.', en: 'Полчаса makes the delay concrete and shows that the order has been missing for more than just a few minutes.' } },
    distractors: ['Можно меню?', 'Сейчас всё принесли.'], placeholderCaption: { de: 'Eine Uhr zeigt eine vergangene halbe Stunde neben einem weiterhin leeren Platz am Restauranttisch.', en: 'A clock marks half an hour beside a still-empty place setting at the restaurant table.' }, songMood: 'patient waiting turning into a calm precise complaint', visualNotes: 'Restaurant table, clock, order pad, empty serving space, customer explaining the delay without aggression.',
  }),
  makeRussianA2CompactLesson({
    slug: 'v-nomere-ne-rabotaet-wifi', title: { de: 'Kein WLAN im Zimmer', en: 'No Wi-Fi in the room' },
    situation: { de: 'Die Rezeptionistin bietet dir erneut das Passwort an. Du erklärst, dass nicht das Passwort, sondern die Verbindung im Zimmer das Problem ist.', en: 'The receptionist offers the password again. Explain that the issue is the connection in the room, not the password.' },
    pedagogicalGoal: 'Mit в plus Präpositiv den Ort eines technischen Problems nennen und не работает idiomatisch verwenden.',
    targetText: 'В номере совсем не работает вай-фай.', baseText: { de: 'Im Zimmer funktioniert das WLAN überhaupt nicht.', en: 'The Wi-Fi does not work at all in the room.' },
    chunks: [{ targetText: 'В номере', baseText: { de: 'Im Zimmer', en: 'In the room' } }, { targetText: 'совсем не работает', baseText: { de: 'funktioniert überhaupt nicht', en: 'does not work at all' } }, { targetText: 'вай-фай.', baseText: { de: 'das WLAN.', en: 'the Wi-Fi.' } }],
    terms: [{ targetText: 'в номере', baseText: { de: 'im Zimmer; Präpositiv', en: 'in the room; prepositional' } }, { targetText: 'совсем не работает', baseText: { de: 'funktioniert überhaupt nicht', en: 'does not work at all' } }, { targetText: 'вай-фай', baseText: { de: 'WLAN', en: 'Wi-Fi' } }, { targetText: 'сигнал', baseText: { de: 'Signal', en: 'signal' } }, { targetText: 'подключение', baseText: { de: 'Verbindung', en: 'connection' } }],
    recall: { before: 'В ', answer: 'номере', after: ' совсем не работает вай-фай.', fallbackChoices: ['номере', 'холле', 'кафе', 'лифте'] }, speakRequired: ['номере', 'совсем', 'работает'],
    sceneCaption: { de: 'Die Rezeptionistin hält die Passwortkarte hoch und fragt: „Вам нужен пароль от вай-фая?“', en: 'The receptionist holds up the password card and asks: “Вам нужен пароль от вай-фая?”' },
    trophyWord: { word: 'работает', meaning: { de: 'funktioniert, arbeitet', en: 'works, is functioning' }, example: 'Теперь телефон работает хорошо.', whyThisWord: { de: 'Работает ist das zentrale Zustandsverb, mit dessen Verneinung du technische Probleme knapp meldest.', en: 'Работает is the key state verb whose negation lets you report technical problems concisely.' } },
    distractors: ['Пароль на столе.', 'Интернет очень быстрый.'], placeholderCaption: { de: 'Ein Laptop zeigt im Hotelzimmer ein unterbrochenes WLAN-Symbol neben der Passwortkarte.', en: 'A laptop in the hotel room shows a disconnected Wi-Fi symbol beside the password card.' }, songMood: 'a quiet technical snag stated clearly at the front desk', visualNotes: 'Hotel room, laptop without connection, Wi-Fi icon, reception password card unable to solve the real issue.',
  }),
  makeRussianA2CompactLesson({
    slug: 'poteryala-koshelyok-pomogite', title: { de: 'Das Portemonnaie verloren', en: 'Lost wallet' },
    situation: { de: 'Am Informationsschalter fragt man, wie man dir helfen kann. Du sagst, was du verloren hast, und bittest höflich um Hilfe.', en: 'At an information desk, you are asked how they can help. Say what you lost and politely ask for assistance.' },
    pedagogicalGoal: 'Mit der femininen Vergangenheit потеряла einen Verlust melden und Помогите, пожалуйста als höfliche Reparaturbitte verwenden.',
    targetText: 'Я потеряла кошелёк. Помогите, пожалуйста.', baseText: { de: 'Ich habe mein Portemonnaie verloren. Helfen Sie mir bitte.', en: 'I lost my wallet. Please help me.' },
    chunks: [{ targetText: 'Я потеряла кошелёк.', baseText: { de: 'Ich habe mein Portemonnaie verloren.', en: 'I lost my wallet.' } }, { targetText: 'Помогите,', baseText: { de: 'Helfen Sie mir,', en: 'Please help me,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'потеряла', baseText: { de: 'ich habe verloren (Frau; Mann: потерял)', en: 'I lost (female; male: потерял)' }, alsoAccept: ['потерял'] }, { targetText: 'кошелёк', baseText: { de: 'Portemonnaie', en: 'wallet' } }, { targetText: 'помогите', baseText: { de: 'helfen Sie mir; вы-Imperativ', en: 'please help me; вы-imperative' } }, { targetText: 'бюро находок', baseText: { de: 'Fundbüro', en: 'lost-and-found office' } }, { targetText: 'информация', baseText: { de: 'Information, Auskunft', en: 'information desk, information' } }],
    recall: { before: 'Я потеряла ', answer: 'кошелёк', after: '. Помогите, пожалуйста.', fallbackChoices: ['кошелёк', 'паспорт', 'телефон', 'билет'] }, speakRequired: ['кошелёк', 'Помогите', 'пожалуйста'], genderForms: { voiced: 'потеряла', other: 'потерял' },
    sceneCaption: { de: 'Die Mitarbeiterin am Informationsschalter fragt: „Чем я могу вам помочь?“', en: 'The information clerk asks: “Чем я могу вам помочь?”' },
    trophyWord: { word: 'кошелёк', meaning: { de: 'Portemonnaie', en: 'wallet' }, example: 'Ваш кошелёк лежит в бюро находок.', whyThisWord: { de: 'Кошелёк benennt den verlorenen Gegenstand genau, damit die Hilfe sofort praktisch werden kann.', en: 'Кошелёк identifies the lost item precisely so the assistance can become practical immediately.' } },
    distractors: ['Я ищу выход.', 'Позовите охрану.'], placeholderCaption: { de: 'Ein leerer Platz in einer offenen Handtasche ist am Informationsschalter deutlich zu sehen.', en: 'An empty space in an open bag is clearly visible at the information desk.' }, songMood: 'an anxious loss becoming a clear request for help', visualNotes: 'Information counter, open bag, missing-wallet space, calm clerk ready to help search.',
  }),
  makeRussianA2CompactLesson({
    slug: 'taksee-net-vyzvat-drugoe', title: { de: 'Ein anderes Taxi rufen', en: 'Call another taxi' },
    situation: { de: 'Die Taxizentrale fragt, ob dein Wagen schon angekommen ist. Du meldest, dass er noch fehlt, und bittest um einen anderen.', en: 'The taxi dispatcher asks whether your car has arrived. Say it is still missing and ask for another one.' },
    pedagogicalGoal: 'Mit ещё нет das aktuelle Fehlen ausdrücken und Можно вызвать другое? als höfliche Lösung erfragen.',
    targetText: 'Такси ещё нет. Можно вызвать другое?', baseText: { de: 'Das Taxi ist noch nicht da. Kann man ein anderes rufen?', en: 'The taxi is still not here. Can you call another one?' },
    chunks: [{ targetText: 'Такси ещё нет.', baseText: { de: 'Das Taxi ist noch nicht da.', en: 'The taxi is still not here.' } }, { targetText: 'Можно вызвать', baseText: { de: 'Kann man rufen', en: 'Can you call' } }, { targetText: 'другое?', baseText: { de: 'ein anderes?', en: 'another one?' } }],
    terms: [{ targetText: 'такси ещё нет', baseText: { de: 'das Taxi ist noch nicht da; Genitivform fällt bei такси nicht auf', en: 'the taxi is still not here; the genitive is invisible on такси' } }, { targetText: 'вызвать', baseText: { de: 'rufen, bestellen', en: 'to call, summon' } }, { targetText: 'другое', baseText: { de: 'ein anderes; Neutrum zu такси', en: 'another one; neuter to match такси' } }, { targetText: 'машина', baseText: { de: 'Auto, Wagen', en: 'car, vehicle' } }, { targetText: 'диспетчер', baseText: { de: 'Disponent, Vermittler', en: 'dispatcher' } }],
    recall: { before: 'Такси ещё нет. Можно ', answer: 'вызвать', after: ' другое?', fallbackChoices: ['вызвать', 'проверить', 'увидеть', 'купить'] }, speakRequired: ['Такси', 'вызвать', 'другое'],
    sceneCaption: { de: 'Die Disponentin prüft den Auftrag und fragt: „Ваша машина уже приехала?“', en: 'The dispatcher checks the booking and asks: “Ваша машина уже приехала?”' },
    trophyWord: { word: 'вызвать', meaning: { de: 'rufen, bestellen', en: 'to call, summon' }, example: 'Можно вызвать другую машину?', whyThisWord: { de: 'Вызвать benennt die konkrete Reparaturhandlung, die das fehlende Taxi durch eine neue Fahrt ersetzt.', en: 'Вызвать names the concrete repair action that replaces the missing taxi with a new ride.' } },
    distractors: ['Я подожду здесь.', 'Водитель звонит.'], placeholderCaption: { de: 'Auf einer Taxi-App bleibt der erste Wagen stehen, während eine zweite Fahrt als Option erscheint.', en: 'A taxi app shows the first car stalled while a second ride appears as an option.' }, songMood: 'a delayed ride turning into a simple replacement request', visualNotes: 'Phone with taxi status, no car outside, dispatcher offering a practical second vehicle.',
  }),
  makeRussianA2CompactLesson({
    slug: 'nepravilnuyu-sdachu-dali', title: { de: 'Das falsche Wechselgeld', en: 'The wrong change' },
    situation: { de: 'Die Kassiererin fragt, ob nach der Zahlung alles stimmt. Du weist höflich auf das falsche Wechselgeld hin.', en: 'The cashier asks whether everything is correct after payment. Politely point out the incorrect change.' },
    pedagogicalGoal: 'Mit Вы дали eine höfliche vergangene вы-Handlung nennen und неправильную сдачу im femininen Akkusativ bilden.',
    targetText: 'Вы дали мне неправильную сдачу.', baseText: { de: 'Sie haben mir das falsche Wechselgeld gegeben.', en: 'You gave me the wrong change.' },
    chunks: [{ targetText: 'Вы дали мне', baseText: { de: 'Sie haben mir gegeben', en: 'You gave me' } }, { targetText: 'неправильную', baseText: { de: 'das falsche', en: 'the wrong' } }, { targetText: 'сдачу.', baseText: { de: 'Wechselgeld.', en: 'change.' } }],
    terms: [{ targetText: 'вы дали', baseText: { de: 'Sie haben gegeben; höfliche вы-Form ohne Sprecher-Gender', en: 'you gave; polite вы-form without speaker gender' } }, { targetText: 'неправильную сдачу', baseText: { de: 'falsches Wechselgeld; femininer Akkusativ', en: 'incorrect change; feminine accusative' } }, { targetText: 'сдача', baseText: { de: 'Wechselgeld', en: 'change' } }, { targetText: 'проверить', baseText: { de: 'prüfen', en: 'to check' } }, { targetText: 'монета', baseText: { de: 'Münze', en: 'coin' } }],
    recall: { before: 'Вы дали мне ', answer: 'неправильную', after: ' сдачу.', fallbackChoices: ['неправильную', 'мелкую', 'крупную', 'старую'] }, speakRequired: ['дали', 'неправильную', 'сдачу'],
    sceneCaption: { de: 'Die Kassiererin schließt die Geldlade und fragt: „Всё правильно?“', en: 'The cashier closes the cash drawer and asks: “Всё правильно?”' },
    trophyWord: { word: 'сдача', meaning: { de: 'Wechselgeld', en: 'change' }, example: 'Сдача лежит на прилавке.', whyThisWord: { de: 'Сдача benennt genau den Teil der Zahlung, den die Kassiererin noch einmal prüfen muss.', en: 'Сдача identifies the exact part of the payment that the cashier needs to check again.' } },
    distractors: ['Сколько с меня?', 'Оплата картой.'], placeholderCaption: { de: 'Münzen und Scheine liegen auf dem Kassentresen neben einer gerade geschlossenen Geldlade.', en: 'Coins and notes lie on the checkout counter beside a just-closed cash drawer.' }, songMood: 'a small checkout mistake corrected with calm precision', visualNotes: 'Register counter, change spread out visibly, customer pointing politely, cashier ready to recount.',
  }),
  makeRussianA2CompactLesson({
    slug: 'kupila-tovar-ne-rabotaet', title: { de: 'Heute gekauft, schon defekt', en: 'Bought today, already broken' },
    situation: { de: 'Der Verkäufer fragt, warum du noch am selben Tag zurückgekommen bist. Du verbindest den heutigen Kauf mit dem aktuellen Defekt.', en: 'The salesperson asks why you returned the same day. Connect today’s purchase with its current failure.' },
    pedagogicalGoal: 'Die feminine Vergangenheit купила mit einem aktuellen не работает-Satz zu einer klaren Reklamation verbinden.',
    targetText: 'Я купила этот товар сегодня, а он уже не работает.', baseText: { de: 'Ich habe diesen Artikel heute gekauft, aber er funktioniert schon nicht mehr.', en: 'I bought this item today, but it already isn’t working.' },
    chunks: [{ targetText: 'Я купила этот товар', baseText: { de: 'Ich habe diesen Artikel gekauft', en: 'I bought this item' } }, { targetText: 'сегодня,', baseText: { de: 'heute,', en: 'today,' } }, { targetText: 'а он уже не работает.', baseText: { de: 'aber er funktioniert schon nicht mehr.', en: 'but it already isn’t working.' } }],
    terms: [{ targetText: 'купила', baseText: { de: 'ich habe gekauft (Frau; Mann: купил)', en: 'I bought (female; male: купил)' }, alsoAccept: ['купил'] }, { targetText: 'этот товар', baseText: { de: 'diesen Artikel; Akkusativ wie Nominativ', en: 'this item; accusative same as nominative' } }, { targetText: 'уже не работает', baseText: { de: 'funktioniert schon nicht mehr', en: 'already does not work' } }, { targetText: 'товар', baseText: { de: 'Ware, Artikel', en: 'goods, item' } }, { targetText: 'возврат', baseText: { de: 'Rückgabe', en: 'return' } }],
    recall: { before: 'Я купила этот ', answer: 'товар', after: ' сегодня, а он уже не работает.', fallbackChoices: ['товар', 'телефон', 'прибор', 'билет'] }, speakRequired: ['товар', 'сегодня', 'работает'], genderForms: { voiced: 'купила', other: 'купил' },
    sceneCaption: { de: 'Der Verkäufer nimmt den Artikel zurück auf den Tresen und fragt: „Почему вы вернулись?“', en: 'The salesperson places the item back on the counter and asks: “Почему вы вернулись?”' },
    trophyWord: { word: 'товар', meaning: { de: 'Ware, Artikel', en: 'goods, item' }, example: 'Этот товар можно проверить в магазине.', whyThisWord: { de: 'Товар hält die Reklamation allgemein nutzbar, wenn du den Namen eines defekten Geräts noch nicht kennst.', en: 'Товар keeps the complaint broadly useful when you do not yet know the name of the faulty device.' } },
    distractors: ['Мне нужен другой цвет.', 'Цена была ниже.'], placeholderCaption: { de: 'Ein neu verpackter kleiner Artikel liegt geöffnet auf dem Ladentresen und zeigt keine Funktion.', en: 'A newly packaged small item lies open on the shop counter and shows no sign of working.' }, songMood: 'a same-day purchase returning for a straightforward repair', visualNotes: 'Shop counter, new item and packaging, customer demonstrating the failure, salesperson listening.',
  }),
  makeRussianA2CompactLesson({
    slug: 'sup-holodnyy-podogreyte', title: { de: 'Bitte aufwärmen', en: 'Please warm it up' },
    situation: { de: 'Der Kellner fragt, ob mit der Suppe alles in Ordnung ist. Du nennst das Temperaturproblem und bittest höflich ums Aufwärmen.', en: 'The waiter asks whether the soup is all right. State the temperature problem and politely ask for it to be warmed up.' },
    pedagogicalGoal: 'Einen Gegenstand mit холодный beschreiben und mit Подогрейте einen höflichen perfektiven вы-Imperativ verwenden.',
    targetText: 'Суп холодный. Подогрейте, пожалуйста.', baseText: { de: 'Die Suppe ist kalt. Wärmen Sie sie bitte auf.', en: 'The soup is cold. Please warm it up.' },
    chunks: [{ targetText: 'Суп холодный.', baseText: { de: 'Die Suppe ist kalt.', en: 'The soup is cold.' } }, { targetText: 'Подогрейте,', baseText: { de: 'Wärmen Sie sie auf,', en: 'Please warm it up,' } }, { targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'холодный', baseText: { de: 'kalt; stimmt mit суп überein', en: 'cold; agrees with суп' } }, { targetText: 'подогрейте', baseText: { de: 'wärmen Sie auf; perfektiver вы-Imperativ', en: 'please warm it up; perfective вы-imperative' } }, { targetText: 'подогреть', baseText: { de: 'aufwärmen', en: 'to warm up' } }, { targetText: 'температура', baseText: { de: 'Temperatur', en: 'temperature' } }, { targetText: 'горячий', baseText: { de: 'heiß', en: 'hot' } }],
    recall: { before: 'Суп холодный. ', answer: 'Подогрейте', after: ', пожалуйста.', fallbackChoices: ['Подогрейте', 'Принесите', 'Уберите', 'Посмотрите'] }, speakRequired: ['Суп', 'холодный', 'Подогрейте'],
    sceneCaption: { de: 'Der Kellner berührt vorsichtig die Schale und fragt: „С супом всё в порядке?“', en: 'The waiter carefully touches the bowl and asks: “С супом всё в порядке?”' },
    trophyWord: { word: 'подогреть', meaning: { de: 'aufwärmen', en: 'to warm up' }, example: 'Можно подогреть суп?', whyThisWord: { de: 'Подогреть benennt die genaue kleine Handlung, die das kalte Gericht wieder in Ordnung bringt.', en: 'Подогреть names the exact small action that fixes the cold dish.' } },
    distractors: ['Дайте другую ложку.', 'Всё очень хорошо.'], placeholderCaption: { de: 'Eine kaum dampfende Suppenschale steht vor dem Kellner, der sie zurücknehmen kann.', en: 'A barely steaming soup bowl sits before the waiter, ready to be taken back.' }, songMood: 'a simple restaurant repair handled with quiet courtesy', visualNotes: 'Restaurant table, cold soup bowl, waiter leaning in attentively, polite request rather than confrontation.',
  }),
  makeRussianA2CompactLesson({
    slug: 'sosednyaya-komnata-spala', title: { de: 'Das laute Nachbarzimmer', en: 'The noisy room next door' },
    situation: { de: 'Die Rezeptionistin fragt, warum du so müde wirkst. Du beschreibst das aktuelle Lärmproblem im Nebenzimmer und deine schlechte Nacht.', en: 'The receptionist asks why you look so tired. Describe the current noise next door and your bad night.' },
    pedagogicalGoal: 'Eine gegenwärtige Zimmerbeschreibung mit der femininen Vergangenheit спала in derselben Problemmeldung verbinden.',
    targetText: 'Соседняя комната очень шумная. Я почти не спала.', baseText: { de: 'Das Nachbarzimmer ist sehr laut. Ich habe kaum geschlafen.', en: 'The room next door is very noisy. I barely slept.' },
    chunks: [{ targetText: 'Соседняя комната', baseText: { de: 'Das Nachbarzimmer', en: 'The room next door' } }, { targetText: 'очень шумная.', baseText: { de: 'ist sehr laut.', en: 'is very noisy.' } }, { targetText: 'Я почти не спала.', baseText: { de: 'Ich habe fast nicht geschlafen.', en: 'I barely slept.' } }],
    terms: [{ targetText: 'спала', baseText: { de: 'ich habe geschlafen (Frau; Mann: спал)', en: 'I slept (female; male: спал)' }, alsoAccept: ['спал'] }, { targetText: 'соседняя комната', baseText: { de: 'Nachbarzimmer', en: 'room next door' } }, { targetText: 'шумная', baseText: { de: 'laut; feminin zu комната', en: 'noisy; feminine to agree with комната' } }, { targetText: 'почти не', baseText: { de: 'fast nicht, kaum', en: 'almost not, barely' } }, { targetText: 'тишина', baseText: { de: 'Ruhe, Stille', en: 'quiet, silence' } }],
    recall: { before: 'Соседняя комната очень ', answer: 'шумная', after: '. Я почти не спала.', fallbackChoices: ['шумная', 'маленькая', 'холодная', 'светлая'] }, speakRequired: ['Соседняя', 'комната', 'шумная'], genderForms: { voiced: 'спала', other: 'спал' },
    sceneCaption: { de: 'Die Rezeptionistin sieht deine müden Augen und fragt: „Почему вы сегодня не отдыхаете?“', en: 'The receptionist notices your tired eyes and asks: “Почему вы сегодня не отдыхаете?”' },
    trophyWord: { word: 'почти', meaning: { de: 'fast, beinahe', en: 'almost, nearly' }, example: 'Вы почти не спали ночью?', whyThisWord: { de: 'Почти zeigt, wie stark der Lärm deinen Schlaf beeinträchtigt hat, ohne eine absolute Aussage zu machen.', en: 'Почти shows how severely the noise affected your sleep without making an absolute statement.' } },
    distractors: ['В коридоре светло.', 'Утром стало лучше.'], placeholderCaption: { de: 'Eine dünne Hotelwand trennt ein ruhiges Bett von sichtbaren Geräuschen im Nachbarzimmer.', en: 'A thin hotel wall separates a quiet bed from visible commotion in the room next door.' }, songMood: 'a sleepless night distilled into one clear hotel complaint', visualNotes: 'Hotel corridor, adjoining doors, tired guest, subtle sound marks from next room, receptionist listening.',
  }),
  makeRussianA2CompactLesson({
    slug: 'teper-vsyo-rabotaet', title: { de: 'Jetzt funktioniert alles', en: 'Everything works now' },
    situation: { de: 'Nach den Reparaturen fragt die Rezeptionistin, ob nun alles in Ordnung ist. Du bestätigst die Lösung und bedankst dich.', en: 'After the repairs, the receptionist asks whether everything is all right now. Confirm the solution and give thanks.' },
    pedagogicalGoal: 'Mit теперь den gelösten aktuellen Zustand markieren und eine Reparatur höflich abschließen.',
    targetText: 'Теперь всё работает. Большое спасибо за помощь!', baseText: { de: 'Jetzt funktioniert alles. Vielen Dank für die Hilfe!', en: 'Everything works now. Thank you very much for the help!' },
    chunks: [{ targetText: 'Теперь всё работает.', baseText: { de: 'Jetzt funktioniert alles.', en: 'Everything works now.' } }, { targetText: 'Большое спасибо', baseText: { de: 'Vielen Dank', en: 'Thank you very much' } }, { targetText: 'за помощь!', baseText: { de: 'für die Hilfe!', en: 'for the help!' } }],
    terms: [{ targetText: 'теперь', baseText: { de: 'jetzt, nun', en: 'now' } }, { targetText: 'всё работает', baseText: { de: 'alles funktioniert', en: 'everything works' } }, { targetText: 'большое спасибо', baseText: { de: 'vielen Dank', en: 'thank you very much' } }, { targetText: 'за помощь', baseText: { de: 'für die Hilfe; Akkusativ nach за', en: 'for the help; accusative after за' } }, { targetText: 'решение', baseText: { de: 'Lösung', en: 'solution' } }],
    recall: { before: 'Теперь всё ', answer: 'работает', after: '. Большое спасибо за помощь!', fallbackChoices: ['работает', 'открывается', 'закрывается', 'загружается'] }, speakRequired: ['Теперь', 'работает', 'спасибо'],
    sceneCaption: { de: 'Die Rezeptionistin schließt den Reparaturauftrag und fragt: „Сейчас всё в порядке?“', en: 'The receptionist closes the maintenance ticket and asks: “Сейчас всё в порядке?”' },
    trophyWord: { word: 'теперь', meaning: { de: 'jetzt, nun', en: 'now' }, example: 'Теперь у вас всё работает.', whyThisWord: { de: 'Теперь setzt eine klare Grenze zwischen dem früheren Problem und dem gelösten Zustand.', en: 'Теперь draws a clear line between the earlier problem and the resolved state.' } },
    distractors: ['Нужен ещё мастер.', 'Проблема осталась.'], placeholderCaption: { de: 'Ein geschlossenes Reparaturformular liegt neben einer Dusche und einem WLAN-Symbol, die beide wieder funktionieren.', en: 'A closed maintenance form sits beside a shower and Wi-Fi symbol that are both working again.' }, songMood: 'a chain of small problems resolving into calm gratitude', visualNotes: 'Hotel desk, completed repair ticket, working icons, relieved guest thanking the receptionist.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_NINE_METADATA,
  russianA2Practical9Inputs,
  { de: 'Du hast Russisch A2 Praxis 9 abgeschlossen und kannst Probleme mit Vergangenheit und Gegenwart erklären und höflich lösen lassen.', en: 'You have completed Russian A2 Practical 9 and can explain problems using past and present and request polite solutions.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_A2_TEN_METADATA: GuidedPathMetadata = {
  id: 'russian-a2-practical-10',
  title: 'Russian A2 Practical 10',
  shortTitle: 'A2 Practical 10',
  subtitle: { de: 'Die eigene Geschichte erzählen und sich herzlich verabschieden', en: 'Telling your own story and saying a warm goodbye' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA2Practical10Inputs: RussianA2LessonInput[] = [
  makeRussianA2CompactLesson({
    slug: 'priekhal-iz-germanii', title: { de: 'Aus Deutschland nach Russland', en: 'From Germany to Russia' },
    situation: { de: 'Bei eurem letzten längeren Gespräch fragt dein Freund nach deinem Ausgangspunkt und deinem heutigen Wohnort. Du verbindest die frühere Ankunft mit deinem Leben jetzt.', en: 'During your last long conversation, your friend asks where your journey began and where you live now. Connect your earlier arrival with your life today.' },
    pedagogicalGoal: 'Mit der männlichen Vergangenheitsform приехал genau einen Rückblick geben und danach mit сейчас ins Präsens wechseln.',
    targetText: 'Я приехал из Германии. Сейчас я живу здесь.', baseText: { de: 'Ich bin aus Deutschland gekommen. Jetzt lebe ich hier.', en: 'I came from Germany. Now I live here.' },
    chunks: [{ targetText: 'Я приехал из Германии.', baseText: { de: 'Ich bin aus Deutschland gekommen.', en: 'I came from Germany.' } }, { targetText: 'Сейчас я живу', baseText: { de: 'Jetzt lebe ich', en: 'Now I live' } }, { targetText: 'здесь.', baseText: { de: 'hier.', en: 'here.' } }],
    terms: [{ targetText: 'приехал', baseText: { de: 'ich bin angekommen (Mann; Frau: приехала)', en: 'I arrived (male; female: приехала)' }, alsoAccept: ['приехала'] }, { targetText: 'из Германии', baseText: { de: 'aus Deutschland; Genitiv nach из', en: 'from Germany; genitive after из' } }, { targetText: 'сейчас', baseText: { de: 'jetzt, gerade', en: 'now, right now' } }, { targetText: 'жить', baseText: { de: 'leben, wohnen', en: 'to live' } }, { targetText: 'здесь', baseText: { de: 'hier', en: 'here' } }],
    recall: { before: 'Я приехал из ', answer: 'Германии', after: '. Сейчас я живу здесь.', fallbackChoices: ['Германии', 'Польши', 'Франции', 'Италии'] }, speakRequired: ['Германии', 'Сейчас', 'живу'], genderForms: { voiced: 'приехал', other: 'приехала' },
    sceneCaption: { de: 'Der Freund legt einen Stadtplan zwischen euch und fragt: „Откуда вы приехали и где живёте сейчас?“', en: 'The friend places a city map between you and asks: “Откуда вы приехали и где живёте сейчас?”' },
    trophyWord: { word: 'сейчас', meaning: { de: 'jetzt, gerade', en: 'now, right now' }, example: 'Сейчас вы живёте в России?', whyThisWord: { de: 'Сейчас verbindet deine Ankunft aus Deutschland mit deinem heutigen Leben hier.', en: 'Сейчас connects your arrival from Germany with your life here now.' } },
    distractors: ['Из Германии в Россию.', 'Здесь мой новый дом.'], placeholderCaption: { de: 'Auf einem Tisch liegen eine Deutschlandkarte und ein Stadtplan deines jetzigen Wohnorts nebeneinander.', en: 'A map of Germany and a map of your current city lie side by side on a table.' }, songMood: 'a reflective journey settling warmly into the present', visualNotes: 'Two friends at a kitchen table, Germany map beside a lived-in city map, calm evening light and a sense of arrival. Each map is clear but contains no flag-heavy imagery.',
  }),
  makeRussianA2CompactLesson({
    slug: 'rabotayu-v-ofise', title: { de: 'Mein Büro im Zentrum', en: 'My office downtown' },
    situation: { de: 'Dein Freund zeigt auf die Gebäude vor dem Fenster und fragt nach deiner Arbeit. Du nennst den Arbeitsplatz und seine Lage.', en: 'Your friend points to the buildings outside and asks about your work. Name your workplace and its location.' },
    pedagogicalGoal: 'Eine vertraute Präsensroutine mit в plus Präpositiv für Arbeitsplatz und Lage beschreiben.',
    targetText: 'Я работаю в офисе в центре.', baseText: { de: 'Ich arbeite in einem Büro im Zentrum.', en: 'I work in an office in the city center.' },
    chunks: [{ targetText: 'Я работаю', baseText: { de: 'Ich arbeite', en: 'I work' } }, { targetText: 'в офисе', baseText: { de: 'in einem Büro', en: 'in an office' } }, { targetText: 'в центре.', baseText: { de: 'im Zentrum.', en: 'in the city center.' } }],
    terms: [{ targetText: 'работать', baseText: { de: 'arbeiten', en: 'to work' } }, { targetText: 'в офисе', baseText: { de: 'im Büro; Präpositiv', en: 'in the office; prepositional' } }, { targetText: 'офис', baseText: { de: 'Büro', en: 'office' } }, { targetText: 'в центре', baseText: { de: 'im Zentrum; Präpositiv', en: 'in the center; prepositional' } }, { targetText: 'центр', baseText: { de: 'Zentrum, Innenstadt', en: 'center, downtown' } }],
    recall: { before: 'Я работаю в ', answer: 'офисе', after: ' в центре.', fallbackChoices: ['офисе', 'банке', 'магазине', 'отеле'] }, speakRequired: ['работаю', 'офисе', 'центре'],
    sceneCaption: { de: 'Der Freund blickt auf die Bürohäuser vor dem Fenster und fragt: „Где вы работаете?“', en: 'The friend looks at the office buildings outside the window and asks: “Где вы работаете?”' },
    trophyWord: { word: 'офис', meaning: { de: 'Büro', en: 'office' }, example: 'Ваш офис находится в центре?', whyThisWord: { de: 'Офис benennt den konkreten Ort deiner Arbeit und macht die kurze Alltagsbiografie anschaulich.', en: 'Офис names the concrete place where you work and makes the short everyday biography tangible.' } },
    distractors: ['После работы', 'мой новый адрес.'], placeholderCaption: { de: 'Ein heller Arbeitsplatz ist durch das Fenster eines zentral gelegenen Bürogebäudes zu sehen.', en: 'A bright workspace is visible through the window of a centrally located office building.' }, songMood: 'steady city work woven into an ordinary weekday', visualNotes: 'Central office district, modest desk by a window, papers and a coffee-free water glass, grounded everyday work rather than corporate glamour.',
  }),
  makeRussianA2CompactLesson({
    slug: 'uchu-russkiy-muzyka', title: { de: 'Warum ich Russisch lerne', en: 'Why I learn Russian' },
    situation: { de: 'Dein Freund sieht deine russischen Notizen und fragt nach deiner Motivation. Du antwortest mit genau einem persönlichen Grund.', en: 'Your friend notices your Russian notes and asks what motivates you. Give exactly one personal reason.' },
    pedagogicalGoal: 'Mit потому что genau einen einfachen Grund nennen und zwei vertraute Präsensverben verbinden.',
    targetText: 'Я учу русский, потому что люблю русскую музыку.', baseText: { de: 'Ich lerne Russisch, weil ich russische Musik liebe.', en: 'I study Russian because I love Russian music.' },
    chunks: [{ targetText: 'Я учу русский,', baseText: { de: 'Ich lerne Russisch,', en: 'I study Russian,' } }, { targetText: 'потому что люблю', baseText: { de: 'weil ich … liebe', en: 'because I love' } }, { targetText: 'русскую музыку.', baseText: { de: 'russische Musik.', en: 'Russian music.' } }],
    terms: [{ targetText: 'учить', baseText: { de: 'lernen', en: 'to study, to learn' } }, { targetText: 'русский язык', baseText: { de: 'russische Sprache', en: 'Russian language' } }, { targetText: 'потому что', baseText: { de: 'weil', en: 'because' } }, { targetText: 'любить', baseText: { de: 'lieben, gernhaben', en: 'to love, to like' } }, { targetText: 'русская музыка', baseText: { de: 'russische Musik', en: 'Russian music' } }],
    recall: { before: 'Я учу русский, потому что люблю русскую ', answer: 'музыку', after: '.', fallbackChoices: ['музыку', 'литературу', 'кухню', 'историю'] }, speakRequired: ['учу', 'потому', 'музыку'],
    sceneCaption: { de: 'Der Freund nimmt deine Vokabelnotizen zur Hand und fragt: „Почему вы учите русский?“', en: 'The friend picks up your vocabulary notes and asks: “Почему вы учите русский?”' },
    trophyWord: { word: 'музыка', meaning: { de: 'Musik', en: 'music' }, example: 'Эта музыка вам нравится?', whyThisWord: { de: 'Музыка gibt deiner Antwort einen echten persönlichen Grund statt einer abstrakten Lernformel.', en: 'Музыка gives your answer a genuine personal reason rather than an abstract study formula.' } },
    distractors: ['После концерта', 'новая книга.'], placeholderCaption: { de: 'Russische Notizen liegen neben Kopfhörern und einer geöffneten Musikliste auf dem Tisch.', en: 'Russian notes lie beside headphones and an open music playlist on the table.' }, songMood: 'language study carried by a favorite melody', visualNotes: 'Handwritten Cyrillic notes, headphones, simple waveform on a phone screen, friend recognizing the personal link between sound and study.',
  }),
  makeRussianA2CompactLesson({
    slug: 'v-rossii-dve-nedeli', title: { de: 'Schon zwei Wochen hier', en: 'Here for two weeks already' },
    situation: { de: 'Beim Blick auf den Kalender fragt dein Freund, wie lange du schon in Russland bist. Du antwortest mit der vertrauten verbfreien Zeitangabe.', en: 'Looking at the calendar, your friend asks how long you have been in Russia. Answer with the familiar verbless duration phrase.' },
    pedagogicalGoal: 'Die verbfreie Signatur Я в России уже две недели als vollständige Zeitangabe sicher verwenden.',
    targetText: 'Я в России уже две недели.', baseText: { de: 'Ich bin schon seit zwei Wochen in Russland.', en: 'I have been in Russia for two weeks already.' },
    chunks: [{ targetText: 'Я в России', baseText: { de: 'Ich bin in Russland', en: 'I am in Russia' } }, { targetText: 'уже', baseText: { de: 'schon', en: 'already' } }, { targetText: 'две недели.', baseText: { de: 'seit zwei Wochen.', en: 'for two weeks.' } }],
    terms: [{ targetText: 'в России', baseText: { de: 'in Russland; Präpositiv', en: 'in Russia; prepositional' } }, { targetText: 'уже', baseText: { de: 'schon, bereits', en: 'already' } }, { targetText: 'две недели', baseText: { de: 'zwei Wochen; Genitiv Singular nach две', en: 'two weeks; genitive singular after две' } }, { targetText: 'неделя', baseText: { de: 'Woche', en: 'week' } }, { targetText: 'сколько времени', baseText: { de: 'wie lange, wie viel Zeit', en: 'how long, how much time' } }],
    recall: { before: 'Я в России уже две ', answer: 'недели', after: '.', fallbackChoices: ['недели', 'минуты', 'ночи', 'встречи'] }, speakRequired: ['России', 'две', 'недели'],
    sceneCaption: { de: 'Der Freund zählt zwei markierte Kalenderwochen und fragt: „Сколько времени вы уже в России?“', en: 'The friend counts two marked calendar weeks and asks: “Сколько времени вы уже в России?”' },
    trophyWord: { word: 'уже', meaning: { de: 'schon, bereits', en: 'already' }, example: 'Вы уже две недели в России?', whyThisWord: { de: 'Уже verbindet den sichtbaren Zeitraum mit dem Gefühl, dass dein Aufenthalt längst Alltag geworden ist.', en: 'Уже links the visible duration with the sense that your stay has already become everyday life.' } },
    distractors: ['В следующем месяце', 'два дня назад.'], placeholderCaption: { de: 'Auf einem kleinen Kalender sind zwei vollständige Wochen des Aufenthalts farbig markiert.', en: 'Two complete weeks of the stay are highlighted on a small calendar.' }, songMood: 'two full weeks quietly becoming a life chapter', visualNotes: 'Table calendar with two weeks marked, city transit card and house key nearby, intimate proof that a visit has become a routine.',
  }),
  makeRussianA2CompactLesson({
    slug: 'semya-zvonyu-domoy', title: { de: 'Anrufe nach Hause', en: 'Calls back home' },
    situation: { de: 'Dein Freund fragt, ob deine Familie ebenfalls hier ist und wie ihr Kontakt haltet. Du nennst Deutschland und deine regelmäßigen Wochenendanrufe.', en: 'Your friend asks whether your family is here too and how you stay in touch. Mention Germany and your regular weekend calls.' },
    pedagogicalGoal: 'Eine familiäre Alltagssituation im Präsens beschreiben und каждые выходные als wiederkehrende Zeitangabe festigen.',
    targetText: 'Моя семья в Германии. Я звоню домой каждые выходные.', baseText: { de: 'Meine Familie ist in Deutschland. Ich rufe jedes Wochenende zu Hause an.', en: 'My family is in Germany. I call home every weekend.' },
    chunks: [{ targetText: 'Моя семья в Германии.', baseText: { de: 'Meine Familie ist in Deutschland.', en: 'My family is in Germany.' } }, { targetText: 'Я звоню домой', baseText: { de: 'Ich rufe zu Hause an', en: 'I call home' } }, { targetText: 'каждые выходные.', baseText: { de: 'jedes Wochenende.', en: 'every weekend.' } }],
    terms: [{ targetText: 'семья', baseText: { de: 'Familie', en: 'family' } }, { targetText: 'в Германии', baseText: { de: 'in Deutschland; Präpositiv', en: 'in Germany; prepositional' } }, { targetText: 'звонить', baseText: { de: 'anrufen', en: 'to call' } }, { targetText: 'домой', baseText: { de: 'nach Hause', en: 'homeward, home' } }, { targetText: 'каждые выходные', baseText: { de: 'jedes Wochenende', en: 'every weekend' } }],
    recall: { before: 'Моя ', answer: 'семья', after: ' в Германии. Я звоню домой каждые выходные.', fallbackChoices: ['семья', 'работа', 'подруга', 'сестра'] }, speakRequired: ['семья', 'звоню', 'выходные'],
    sceneCaption: { de: 'Der Freund sieht ein Familienfoto neben deinem Handy und fragt: „Ваша семья тоже здесь? Как часто вы звоните домой?“', en: 'The friend notices a family photo beside your phone and asks: “Ваша семья тоже здесь? Как часто вы звоните домой?”' },
    trophyWord: { word: 'семья', meaning: { de: 'Familie', en: 'family' }, example: 'Ваша семья живёт в Германии?', whyThisWord: { de: 'Семья erklärt, wem deine festen Wochenendanrufe gelten, und macht die Geschichte persönlich.', en: 'Семья explains who your regular weekend calls are for and makes the story personal.' } },
    distractors: ['В офисе каждый день.', 'Письмо приходит домой.'], placeholderCaption: { de: 'Ein Familienfoto steht neben einem Handy, auf dem ein regelmäßiger Wochenendanruf vorgemerkt ist.', en: 'A family photo sits beside a phone with a recurring weekend call marked.' }, songMood: 'weekend voices bridging the distance home', visualNotes: 'Warm apartment corner, family photo, phone call reminder, quiet closeness across distance without showing a live caller on screen.',
  }),
  makeRussianA2CompactLesson({
    slug: 'lyublyu-gotovit-gulyat', title: { de: 'Kochen und spazieren', en: 'Cooking and walking' },
    situation: { de: 'Dein Freund fragt, was du außerhalb der Arbeit gern machst. Du nennst zwei vertraute Freizeitaktivitäten.', en: 'Your friend asks what you enjoy outside work. Name two familiar leisure activities.' },
    pedagogicalGoal: 'Mit люблю plus zwei Infinitiven einfache persönliche Vorlieben im Präsens zusammenfassen.',
    targetText: 'Я люблю готовить и гулять.', baseText: { de: 'Ich koche und gehe gern spazieren.', en: 'I love cooking and going for walks.' },
    chunks: [{ targetText: 'Я люблю', baseText: { de: 'Ich liebe es', en: 'I love' } }, { targetText: 'готовить', baseText: { de: 'zu kochen', en: 'cooking' } }, { targetText: 'и гулять.', baseText: { de: 'und spazieren zu gehen.', en: 'and going for walks.' } }],
    terms: [{ targetText: 'любить', baseText: { de: 'lieben, gernhaben', en: 'to love, to like' } }, { targetText: 'готовить', baseText: { de: 'kochen, zubereiten', en: 'to cook, to prepare' } }, { targetText: 'гулять', baseText: { de: 'spazieren gehen', en: 'to walk, to stroll' } }, { targetText: 'свободное время', baseText: { de: 'Freizeit', en: 'free time' } }, { targetText: 'хобби', baseText: { de: 'Hobby', en: 'hobby' } }],
    recall: { before: 'Я люблю ', answer: 'готовить', after: ' и гулять.', fallbackChoices: ['готовить', 'читать', 'плавать', 'танцевать'] }, speakRequired: ['люблю', 'готовить', 'гулять'],
    sceneCaption: { de: 'Der Freund räumt ein Brettspiel beiseite und fragt: „Что вы любите делать в свободное время?“', en: 'The friend moves a board game aside and asks: “Что вы любите делать в свободное время?”' },
    trophyWord: { word: 'готовить', meaning: { de: 'kochen, zubereiten', en: 'to cook, to prepare' }, example: 'Вы любите готовить дома?', whyThisWord: { de: 'Готовить nennt eine konkrete Gewohnheit, die deine freie Zeit ebenso prägt wie die Spaziergänge.', en: 'Готовить names a concrete habit that shapes your free time alongside your walks.' } },
    distractors: ['На общей кухне.', 'По субботам.'], placeholderCaption: { de: 'Auf einer kleinen Küche liegen frische Zutaten neben Schuhen für einen späteren Spaziergang bereit.', en: 'Fresh ingredients in a small kitchen sit beside shoes ready for a later walk.' }, songMood: 'home cooking opening into an easy evening walk', visualNotes: 'Simple home kitchen with ingredients, walking shoes by the door, two relaxed hobbies shown in one coherent domestic scene.',
  }),
  makeRussianA2CompactLesson({
    slug: 'utrom-rabotayu-vecherom-uchu', title: { de: 'Mein Tagesrhythmus', en: 'My daily rhythm' },
    situation: { de: 'Dein Freund vergleicht eure Tagesabläufe und fragt nach deinem Morgen und Abend. Du stellst Arbeit und Russischlernen gegenüber.', en: 'Your friend compares your daily routines and asks about your mornings and evenings. Contrast work with studying Russian.' },
    pedagogicalGoal: 'Mit утром, а вечером zwei bekannte Präsensroutinen übersichtlich gegenüberstellen.',
    targetText: 'Утром я работаю, а вечером учу русский.', baseText: { de: 'Morgens arbeite ich, und abends lerne ich Russisch.', en: 'I work in the morning and study Russian in the evening.' },
    chunks: [{ targetText: 'Утром я работаю,', baseText: { de: 'Morgens arbeite ich,', en: 'I work in the morning,' } }, { targetText: 'а вечером', baseText: { de: 'und abends', en: 'and in the evening' } }, { targetText: 'учу русский.', baseText: { de: 'lerne ich Russisch.', en: 'I study Russian.' } }],
    terms: [{ targetText: 'утром', baseText: { de: 'morgens; Instrumental als Zeitangabe', en: 'in the morning; instrumental time expression' } }, { targetText: 'работать', baseText: { de: 'arbeiten', en: 'to work' } }, { targetText: 'вечером', baseText: { de: 'abends; Instrumental als Zeitangabe', en: 'in the evening; instrumental time expression' } }, { targetText: 'учить', baseText: { de: 'lernen', en: 'to study' } }, { targetText: 'русский язык', baseText: { de: 'russische Sprache', en: 'Russian language' } }],
    recall: { before: 'Утром я работаю, а ', answer: 'вечером', after: ' учу русский.', fallbackChoices: ['вечером', 'утром', 'днём', 'ночью'] }, speakRequired: ['Утром', 'вечером', 'русский'],
    sceneCaption: { de: 'Der Freund zeichnet eine Tageslinie auf Papier und fragt: „Что вы делаете утром и вечером?“', en: 'The friend draws a daily timeline on paper and asks: “Что вы делаете утром и вечером?”' },
    trophyWord: { word: 'утром', meaning: { de: 'morgens', en: 'in the morning' }, example: 'Утром вы работаете в офисе?', whyThisWord: { de: 'Утром setzt den ersten klaren Anker in deinem Tagesrhythmus, bevor der Abend dem Russischlernen gehört.', en: 'Утром sets the first clear anchor in your daily rhythm before the evening belongs to Russian study.' } },
    distractors: ['Днём в центре.', 'После урока домой.'], placeholderCaption: { de: 'Eine handgezeichnete Tageslinie verbindet einen Büroblock am Morgen mit einem russischen Heft am Abend.', en: 'A hand-drawn daily timeline connects an office block in the morning with a Russian notebook in the evening.' }, songMood: 'a balanced day moving from work into study', visualNotes: 'Paper timeline, morning office icon and evening Cyrillic notebook, clear left-to-right daily rhythm shared between friends.',
  }),
  makeRussianA2CompactLesson({
    slug: 'pochti-vsyo-ponimayu', title: { de: 'Fast alles verstehen', en: 'Understanding almost everything' },
    situation: { de: 'Dein Freund fragt nach deinen Fortschritten im Russischen. Du beschreibst ehrlich den Unterschied zwischen Verstehen und Sprechen.', en: 'Your friend asks about your progress in Russian. Honestly describe the difference between understanding and speaking.' },
    pedagogicalGoal: 'Mit уже почти einen Fortschritt markieren und ihn mit но sowie пока im Präsens einschränken.',
    targetText: 'Я уже почти всё понимаю, но говорю пока медленно.', baseText: { de: 'Ich verstehe schon fast alles, aber ich spreche vorerst noch langsam.', en: 'I understand almost everything now, but I still speak slowly for the time being.' },
    chunks: [{ targetText: 'Я уже почти всё понимаю,', baseText: { de: 'Ich verstehe schon fast alles,', en: 'I understand almost everything now,' } }, { targetText: 'но говорю', baseText: { de: 'aber ich spreche', en: 'but I speak' } }, { targetText: 'пока медленно.', baseText: { de: 'vorerst noch langsam.', en: 'slowly for now.' } }],
    terms: [{ targetText: 'уже почти всё', baseText: { de: 'schon fast alles', en: 'almost everything already' } }, { targetText: 'понимать', baseText: { de: 'verstehen', en: 'to understand' } }, { targetText: 'говорить', baseText: { de: 'sprechen', en: 'to speak' } }, { targetText: 'пока', baseText: { de: 'vorerst, noch', en: 'for now, so far' } }, { targetText: 'медленно', baseText: { de: 'langsam', en: 'slowly' } }],
    recall: { before: 'Я уже почти всё понимаю, но говорю ', answer: 'пока', after: ' медленно.', fallbackChoices: ['пока', 'иногда', 'обычно', 'всегда'] }, speakRequired: ['почти', 'понимаю', 'пока'],
    sceneCaption: { de: 'Der Freund schließt dein Übungsheft und fragt: „Вы уже хорошо понимаете и говорите по-русски?“', en: 'The friend closes your practice notebook and asks: “Вы уже хорошо понимаете и говорите по-русски?”' },
    trophyWord: { word: 'пока', meaning: { de: 'vorerst, noch', en: 'for now, so far' }, example: 'Вы пока говорите медленно, но понятно.', whyThisWord: { de: 'Пока macht die langsame Sprechgeschwindigkeit zu einem vorläufigen Lernstand statt zu einer festen Grenze.', en: 'Пока frames slow speech as a temporary stage of learning rather than a permanent limit.' } },
    distractors: ['Русский язык трудный.', 'Каждый день урок.'], placeholderCaption: { de: 'Ein fast vollständig ausgefülltes Übungsheft liegt neben einer kleinen Sprechblase mit langsam gesetzten Wörtern.', en: 'An almost completed practice notebook lies beside a speech bubble with slowly spaced words.' }, songMood: 'quiet pride in progress with room still to grow', visualNotes: 'Practice notebook nearly full, friend listening patiently, visual contrast between dense understanding notes and measured spoken words.',
  }),
  makeRussianA2CompactLesson({
    slug: 'v-sleduyushchem-godu-priedu', title: { de: 'Nächstes Jahr wieder', en: 'Back again next year' },
    situation: { de: 'Kurz vor dem Abschied fragt dein Freund, ob du Russland wieder besuchen wirst. Du nennst einen klaren Zeitpunkt für deine Rückkehr.', en: 'Shortly before goodbye, your friend asks whether you will visit Russia again. Give a clear time for your return.' },
    pedagogicalGoal: 'Mit der geschlechtsfreien Zukunftsform приеду eine spätere Rückkehr ankündigen.',
    targetText: 'В следующем году я приеду ещё раз.', baseText: { de: 'Nächstes Jahr komme ich noch einmal.', en: 'I will come again next year.' },
    chunks: [{ targetText: 'В следующем году', baseText: { de: 'Im nächsten Jahr', en: 'Next year' } }, { targetText: 'я приеду', baseText: { de: 'komme ich', en: 'I will come' } }, { targetText: 'ещё раз.', baseText: { de: 'noch einmal.', en: 'again.' } }],
    terms: [{ targetText: 'в следующем году', baseText: { de: 'im nächsten Jahr; Präpositiv', en: 'next year; prepositional' } }, { targetText: 'следующий', baseText: { de: 'nächster', en: 'next' } }, { targetText: 'год', baseText: { de: 'Jahr', en: 'year' } }, { targetText: 'приехать', baseText: { de: 'ankommen, herkommen', en: 'to arrive, to come' } }, { targetText: 'ещё раз', baseText: { de: 'noch einmal', en: 'one more time, again' } }],
    recall: { before: 'В следующем ', answer: 'году', after: ' я приеду ещё раз.', fallbackChoices: ['году', 'месяце', 'сезоне', 'веке'] }, speakRequired: ['следующем', 'приеду', 'раз'],
    sceneCaption: { de: 'Der Freund zeigt auf den Kalender des kommenden Jahres und fragt: „Вы ещё приедете в Россию?“', en: 'The friend points to next year’s calendar and asks: “Вы ещё приедете в Россию?”' },
    trophyWord: { word: 'год', meaning: { de: 'Jahr', en: 'year' }, example: 'Этот год для вас особенный?', whyThisWord: { de: 'Год gibt dem Wiedersehen einen klaren, realistischen Horizont statt eines unbestimmten Versprechens.', en: 'Год gives the reunion a clear, realistic horizon instead of leaving it as a vague promise.' } },
    distractors: ['В этом месяце.', 'Новая поездка.'], placeholderCaption: { de: 'Ein Kalenderblatt des nächsten Jahres liegt neben einer kleinen Reisetasche und einer markierten Rückkehr.', en: 'A page from next year’s calendar lies beside a small travel bag and a marked return.' }, songMood: 'a future reunion glowing beyond the goodbye', visualNotes: 'Next-year calendar, modest travel bag, one future date circled, hopeful promise without showing transport branding.',
  }),
  makeRussianA2CompactLesson({
    slug: 'spasibo-za-vsyo', title: { de: 'Danke für alles', en: 'Thank you for everything' },
    situation: { de: 'An der Haustür endet euer letztes Gespräch. Dein Freund merkt, dass du nun gehst, und du schließt eure gemeinsame Geschichte herzlich ab.', en: 'At the doorway, your final conversation comes to an end. Your friend sees that you are leaving, and you warmly close the story you shared.' },
    pedagogicalGoal: 'Mit zwei vertrauten festen Höflichkeitsblöcken den gesamten russischen A2-Weg warm und klar abschließen.',
    targetText: 'Большое спасибо за всё! До встречи!', baseText: { de: 'Vielen Dank für alles! Bis zum nächsten Mal!', en: 'Thank you very much for everything! See you again!' },
    chunks: [{ targetText: 'Большое спасибо', baseText: { de: 'Vielen Dank', en: 'Thank you very much' } }, { targetText: 'за всё!', baseText: { de: 'für alles!', en: 'for everything!' } }, { targetText: 'До встречи!', baseText: { de: 'Bis zum nächsten Mal!', en: 'See you again!' } }],
    terms: [{ targetText: 'большое спасибо', baseText: { de: 'vielen Dank', en: 'thank you very much' } }, { targetText: 'за всё', baseText: { de: 'für alles', en: 'for everything' } }, { targetText: 'до встречи', baseText: { de: 'bis zum nächsten Treffen, bis bald', en: 'until we meet again, see you' } }, { targetText: 'прощаться', baseText: { de: 'sich verabschieden', en: 'to say goodbye' } }, { targetText: 'отъезд', baseText: { de: 'Abreise', en: 'departure' } }],
    recall: { before: 'Большое спасибо за всё! До ', answer: 'встречи', after: '!', fallbackChoices: ['встречи', 'вечера', 'поезда', 'отъезда'] }, speakRequired: ['Большое', 'спасибо', 'встречи'],
    sceneCaption: { de: 'Der Freund hält dir an der offenen Tür die Jacke hin und fragt: „Вы уже уезжаете?“', en: 'The friend holds out your coat at the open door and asks: “Вы уже уезжаете?”' },
    trophyWord: { word: 'всё', meaning: { de: 'alles', en: 'everything' }, example: 'Большое спасибо за всё!', whyThisWord: { de: 'Всё bündelt die vielen Begegnungen des gesamten Weges in einem einzigen herzlichen Dank.', en: 'Всё gathers the many encounters from the whole journey into one heartfelt expression of thanks.' } },
    distractors: ['У открытой двери', 'последний разговор.'], placeholderCaption: { de: 'An einer offenen Wohnungstür liegen Jacke und kleine Reisetasche für einen warmen Abschied bereit.', en: 'A coat and small travel bag wait by an open apartment door for a warm farewell.' }, songMood: 'a grateful farewell that already carries the next meeting', visualNotes: 'Apartment doorway at golden hour, friend offering a coat, small bag ready, warm eye contact and restrained goodbye gesture.',
  }),
]

export const RUSSIAN_A2_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makeRussianA2PracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_A2_TEN_METADATA,
  russianA2Practical10Inputs,
  { de: 'Du hast den gesamten russischen A2-Weg abgeschlossen: Deine Geschichte trägt dich sicher durch Alltag, Gespräche und Abschied — bis zum nächsten Wiedersehen.', en: 'You have completed the full Russian A2 journey: your story now carries you confidently through daily life, conversation, and goodbye—until you meet again.' },
)
