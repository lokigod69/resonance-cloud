/**
 * Polish A2 — the Regular tier (10 paths × 10 lessons), per
 * docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md (§4 integration, §5 authoring
 * contract) and the spec in tmp\A2_POLISH_P1_P10_SPEC.md.
 *
 * Authoring contract highlights enforced in this module:
 * - Base locales are GERMAN + ENGLISH (matching Polish A1, baseLanguage
 *   'German'): every GuidedBaseContentText field carries both .de and .en.
 *   pedagogicalGoal is a German string (matching A1).
 * - Two-turn shape: sceneCaption carries the interlocutor's Polish line quoted
 *   inside both base-locale captions; the learner's corePhrase is the response.
 * - Register locked per path: formal/impersonal service Polish (proszę,
 *   poproszę, czy można, czy mogę, pan/pani only when the scene genders the
 *   interlocutor) in P1–P3, P5–P7, P9; informal ty-forms in the friend paths
 *   P4, P8, P10 — matching Polish A1's split (impersonal at counters, ty in
 *   social paths). No mid-path switches.
 * - THE §5.3 HARD CASE — Polish past tense is speaker-gendered (-łem/-łam):
 *   past forms appear ONLY in P3/P9 (+ marked recycling) and each corePhrase
 *   past form matches the path's TTS voice gender (rotation continues the A1
 *   roster Maria/Rysard/Marta/Wojech → A2 P1 Marta f, P2 Wojech m, P3 Maria f,
 *   P4 Rysard m, P5 Marta f, P6 Wojech m, P7 Maria f, P8 Rysard m, P9 Marta f,
 *   P10 Wojech m). Gendered terms teach BOTH forms (alsoAccept carries the
 *   other gender); typeRecall NEVER blanks a gendered form; speakRequired
 *   never contains one (the untested gender must be free to differ).
 * - Future = perfective non-past (spotkam się, kupię, zadzwonię — gender-free,
 *   the Polish A2 advantage); analytic będę + -ł participle is banned.
 * - Case discipline stays inside proven A1/A2 chunks: poproszę + accusative,
 *   potrzebuję/szukam + genitive, instrumental for transport and płacić kartą,
 *   locative after w/na in fixed places. No full paradigms.
 * - bo is the only subordinator (ponieważ banned as stiff).
 * - Trophies unique across the entire Polish guided corpus (A1 + A2),
 *   lowercase, single-word.
 * - TTS LIVE (2026-07-15, 496 clips / 0 failed, rotation Marta/Wojech/Maria/
 *   Rysard continuing the A1 roster — the per-path voice gender the gendered
 *   past forms were written against): ALL path/lesson/chunk ids in this module
 *   are FROZEN — never rename them; text changes need scoped audio reruns.
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

const POLISH_A2_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

type PolishA2VariantInput = {
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

export type PolishA2LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightPolishA2Variant(input: PolishA2VariantInput): GuidedLessonVibeVariant {
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
      language: 'pl-PL',
      // matches Polish A1's STT reality (0.65, not the Romance 0.8)
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
      genre: 'bright Polish acoustic',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

export function makePolishA2PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: PolishA2LessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('polish-a2-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `polish-a2-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
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
      steps: POLISH_A2_GUIDED_TODAY_STEPS,
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

export type PolishA2CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  targetText: string
  baseText: GuidedBaseContentText
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  /** alsoAccept: the OTHER speaker-gender form for gendered terms (kupiłam ↔ kupiłem) or a common alternate spelling — folded into acceptedAnswers. */
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText; alsoAccept?: string[] }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[]; alsoAccept?: string[] }
  /** Exactly the salient single words the speech check requires — never multi-word phrases, never a speaker-gendered form (-łem/-łam etc.), no apostrophes/hyphens. Diacritics KEPT ('spotkać' not 'spotkac'). */
  speakRequired: [string, string, string]
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

/** ogonki/kreska fold for learners typing without a Polish keyboard (ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z). NFD accent-stripping alone misses ł, which has no combining decomposition. */
const polishFold = (text: string): string => text
  .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
  .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
  .replace(/Ą/g, 'A').replace(/Ć/g, 'C').replace(/Ę/g, 'E').replace(/Ł/g, 'L')
  .replace(/Ń/g, 'N').replace(/Ó/g, 'O').replace(/Ś/g, 'S').replace(/Ź/g, 'Z').replace(/Ż/g, 'Z')

/** Accepted-answer variants: exact, folded, lowercase, and capitalized forms of the text plus every alsoAccept string (both-gender past forms ride in via alsoAccept). */
function polishA2Answers(text: string, alsoAccept: string[] = []): string[] {
  const variants = [text, ...alsoAccept].flatMap((value) => {
    const folded = polishFold(value)
    return [value, folded, value.toLowerCase(), folded.toLowerCase()]
  })
  const capitalized = variants.map((value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
  return [...new Set([...variants, ...capitalized])]
}

function polishA2SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
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

export function makePolishA2CompactLesson(input: PolishA2CompactLesson): PolishA2LessonInput {
  const prefix = input.slug.split('-')[0]
  const { alsoAccept: recallAlsoAccept, ...recall } = input.recall
  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: makeBrightPolishA2Variant({
      corePhrase: { targetText: input.targetText, baseText: input.baseText },
      meaning: input.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map(({ alsoAccept, ...term }, index) => ({
        id: `${prefix}-item-${index + 1}`,
        ...term,
        acceptedAnswers: polishA2Answers(term.targetText, alsoAccept),
      })),
      buildChips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      typeRecall: {
        ...recall,
        acceptedAnswers: polishA2Answers(recall.answer, recallAlsoAccept),
      },
      speakTarget: {
        baseCue: input.baseText,
        targetPhrase: input.targetText,
        ...polishA2SpeakTokens(input.targetText, input.speakRequired),
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderCaption: input.placeholderCaption,
      songMood: input.songMood,
      visualNotes: input.visualNotes,
    }),
  }
}

export const GUIDED_TODAY_PATH_POLISH_A2_ONE_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-1', title: 'Polnisch A2 Praxis 1', shortTitle: 'A2 Praxis 1',
  subtitle: { de: 'Vertraute Bestellungen, Rückfragen und Wege im polnischen Alltag', en: 'Familiar orders, follow-up questions, and directions in everyday Polish' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical1Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'poprosze-mala-kawe-jak-zwykle', title: { de: 'Wie immer', en: 'The usual' },
    situation: { de: 'Die Barista erkennt dich im Stammcafé und fragt nach deiner üblichen Bestellung. Du bestätigst sie mit der gewohnten Größe.', en: 'The barista recognizes you at your regular cafe and asks about your usual order. Confirm it with your usual size.' },
    pedagogicalGoal: 'Eine vertraute Bestellung mit poproszę und jak zwykle vollständig bestätigen.',
    targetText: 'Tak, poproszę małą kawę, jak zwykle.', baseText: { de: 'Ja, einen kleinen Kaffee, wie immer, bitte.', en: 'Yes, a small coffee as usual, please.' },
    chunks: [{ targetText: 'Tak, poproszę', baseText: { de: 'Ja, bitte', en: 'Yes, I would like' } }, { targetText: 'małą kawę,', baseText: { de: 'einen kleinen Kaffee,', en: 'a small coffee,' } }, { targetText: 'jak zwykle.', baseText: { de: 'wie immer.', en: 'as usual.' } }],
    terms: [{ targetText: 'poproszę', baseText: { de: 'ich hätte gern', en: 'I would like' } }, { targetText: 'małą kawę', baseText: { de: 'einen kleinen Kaffee', en: 'a small coffee' } }, { targetText: 'kawę', baseText: { de: 'Kaffee im Akkusativ', en: 'coffee in the accusative' } }, { targetText: 'jak zwykle', baseText: { de: 'wie immer', en: 'as usual' } }, { targetText: 'zwykle', baseText: { de: 'gewöhnlich', en: 'usually' } }],
    recall: { before: 'Tak, poproszę małą kawę, jak ', answer: 'zwykle', after: '.', fallbackChoices: ['zwykle', 'szybko', 'osobno', 'późno'] }, speakRequired: ['poproszę', 'małą', 'zwykle'],
    sceneCaption: { de: 'Die Barista greift schon nach einer Tasse und fragt: „To co zwykle?”', en: 'The barista is already reaching for a cup and asks: “To co zwykle?”' },
    trophyWord: { word: 'zwykle', meaning: { de: 'gewöhnlich; wie immer', en: 'usually; as usual' }, example: 'Zwykle piję małą kawę rano.', whyThisWord: { de: 'Mit zwykle bestätigst du, dass die Barista deine feste Bestellung richtig erkannt hat.', en: 'Zwykle confirms that the barista has correctly remembered your regular order.' } },
    distractors: ['bez mleka, proszę', 'dzisiaj dużą herbatę'], placeholderCaption: { de: 'Die Barista hält die vertraute kleine Tasse über die Espressomaschine.', en: 'The barista holds the familiar small cup beside the espresso machine.' }, songMood: 'a warm return to a cafe where the order is already known', visualNotes: 'Neighborhood cafe counter, familiar barista, small ceramic cup, easy recognition and a confirming nod.',
  }),
  makePolishA2CompactLesson({
    slug: 'na-wynos-ile-razem-kosztuje', title: { de: 'Zum Mitnehmen', en: 'To go' },
    situation: { de: 'Die Barista fragt, ob du bleibst oder den Kaffee mitnimmst. Du entscheidest dich dafür, den Kaffee mitzunehmen, und fragst nach dem Gesamtbetrag.', en: 'The barista asks whether you are staying or taking the coffee away. Choose takeaway and ask for the total.' },
    pedagogicalGoal: 'Eine Bestellung mit na wynos abschließen und nach der Gesamtsumme fragen.',
    targetText: 'Na wynos, poproszę. Ile to razem kosztuje?', baseText: { de: 'Zum Mitnehmen, bitte. Wie viel kostet das insgesamt?', en: 'To go, please. How much does that cost altogether?' },
    chunks: [{ targetText: 'Na wynos,', baseText: { de: 'Zum Mitnehmen,', en: 'To go,' } }, { targetText: 'poproszę.', baseText: { de: 'bitte.', en: 'please.' } }, { targetText: 'Ile to razem kosztuje?', baseText: { de: 'Wie viel kostet das insgesamt?', en: 'How much does that cost altogether?' } }],
    terms: [{ targetText: 'na wynos', baseText: { de: 'zum Mitnehmen', en: 'to go' } }, { targetText: 'ile to razem kosztuje', baseText: { de: 'wie viel kostet das insgesamt', en: 'how much does that cost altogether' } }, { targetText: 'razem', baseText: { de: 'zusammen, insgesamt', en: 'together, altogether' } }, { targetText: 'kosztuje', baseText: { de: 'es kostet', en: 'it costs' } }, { targetText: 'poproszę', baseText: { de: 'bitte; ich hätte gern', en: 'please; I would like' } }],
    recall: { before: 'Na wynos, poproszę. Ile to ', answer: 'razem', after: ' kosztuje?', fallbackChoices: ['razem', 'osobno', 'dzisiaj', 'zwykle'] }, speakRequired: ['wynos', 'razem', 'kosztuje'],
    sceneCaption: { de: 'Die Barista hält einen Deckel neben den Becher und fragt: „Na miejscu czy na wynos?”', en: 'The barista holds a lid beside the cup and asks: “Na miejscu czy na wynos?”' },
    trophyWord: { word: 'razem', meaning: { de: 'zusammen, insgesamt', en: 'together, altogether' }, example: 'Razem kosztuje to dwadzieścia złotych.', whyThisWord: { de: 'Razem macht klar, dass du nach dem Gesamtpreis der Mitnahmebestellung fragst.', en: 'Razem makes clear that you are asking for the takeaway order’s total price.' } },
    distractors: ['na miejscu, proszę', 'osobno za kawę'], placeholderCaption: { de: 'Ein verschlossener Kaffeebecher steht neben dem angezeigten Gesamtbetrag.', en: 'A lidded coffee cup stands beside a display showing the total.' }, songMood: 'a brisk takeaway order ending at the card terminal', visualNotes: 'Cafe counter, takeaway lid, payment display, customer ready to leave with the cup.',
  }),
  makePolishA2CompactLesson({
    slug: 'poprosze-doladowanie-za-trzydziesci', title: { de: 'Guthaben für dreißig Złoty', en: 'Thirty zloty of credit' },
    situation: { de: 'Am Kiosk fragt die Verkäuferin, ob du eine SIM-Karte oder Guthaben brauchst. Du wählst ein Guthaben für dreißig Złoty.', en: 'At a kiosk, the clerk asks whether you need a SIM card or phone credit. Choose a thirty-zloty top-up.' },
    pedagogicalGoal: 'Am Kiosk einen konkreten Guthabenbetrag mit poproszę und za nennen.',
    targetText: 'Poproszę doładowanie. Czy jest takie za trzydzieści złotych?', baseText: { de: 'Ich hätte gern eine Guthabenaufladung. Gibt es so eine für dreißig Złoty?', en: 'I would like a top-up. Do you have one for thirty zloty?' },
    chunks: [{ targetText: 'Poproszę doładowanie.', baseText: { de: 'Ich hätte gern eine Guthabenaufladung.', en: 'I would like a top-up.' } }, { targetText: 'Czy jest takie', baseText: { de: 'Gibt es so eine', en: 'Is there one' } }, { targetText: 'za trzydzieści złotych?', baseText: { de: 'für dreißig Złoty?', en: 'for thirty zloty?' } }],
    terms: [{ targetText: 'doładowanie', baseText: { de: 'Guthabenaufladung', en: 'phone top-up' } }, { targetText: 'za trzydzieści złotych', baseText: { de: 'für dreißig Złoty', en: 'for thirty zloty' } }, { targetText: 'trzydzieści', baseText: { de: 'dreißig', en: 'thirty' } }, { targetText: 'złotych', baseText: { de: 'Złoty nach einer größeren Zahl', en: 'zloty after a larger number' } }, { targetText: 'czy jest takie', baseText: { de: 'gibt es so eine', en: 'is there one like that' } }],
    recall: { before: 'Poproszę ', answer: 'doładowanie', after: '. Czy jest takie za trzydzieści złotych?', fallbackChoices: ['doładowanie', 'ubezpieczenie', 'opakowanie', 'czasopismo'] }, speakRequired: ['poproszę', 'doładowanie', 'trzydzieści'],
    sceneCaption: { de: 'Die Verkäuferin zeigt auf zwei Kartenhalter und fragt: „Karta SIM czy doładowanie?”', en: 'The clerk points to two card displays and asks: “Karta SIM czy doładowanie?”' },
    trophyWord: { word: 'doładowanie', meaning: { de: 'Guthabenaufladung', en: 'phone top-up' }, example: 'To doładowanie kosztuje trzydzieści złotych.', whyThisWord: { de: 'Doładowanie benennt am Kiosk genau die Dienstleistung, die dein Handy wieder nutzbar macht.', en: 'Doładowanie names the exact kiosk service that puts usable credit back on your phone.' } },
    distractors: ['kartę pamięci', 'etui za dwadzieścia'], placeholderCaption: { de: 'Karten für verschiedene Guthabenbeträge hängen hinter einem kleinen Kiosktresen.', en: 'Cards for several top-up amounts hang behind a small kiosk counter.' }, songMood: 'a practical kiosk stop with the exact amount ready', visualNotes: 'Compact kiosk, phone-credit cards, thirty-zloty label, clerk waiting for a precise choice.',
  }),
  makePolishA2CompactLesson({
    slug: 'ile-minut-trzeba-isc-pieszo', title: { de: 'Wie viele Minuten zu Fuß?', en: 'How many minutes on foot?' },
    situation: { de: 'Ein Passant sagt nur, dein Ziel sei gleich hinter der Ecke. Du fragst nach der tatsächlichen Gehzeit.', en: 'A passer-by only says your destination is just around the corner. Ask for the actual walking time.' },
    pedagogicalGoal: 'Eine vage Wegbeschreibung mit ile minut und pieszo präzisieren.',
    targetText: 'Ile minut trzeba iść stąd pieszo?', baseText: { de: 'Wie viele Minuten muss man von hier zu Fuß gehen?', en: 'How many minutes does it take to walk from here?' },
    chunks: [{ targetText: 'Ile minut', baseText: { de: 'wie viele Minuten', en: 'how many minutes' } }, { targetText: 'trzeba iść', baseText: { de: 'muss man gehen', en: 'does one need to walk' } }, { targetText: 'stąd pieszo?', baseText: { de: 'von hier zu Fuß?', en: 'on foot from here?' } }],
    terms: [{ targetText: 'ile minut', baseText: { de: 'wie viele Minuten', en: 'how many minutes' } }, { targetText: 'trzeba iść', baseText: { de: 'man muss gehen', en: 'one needs to walk' } }, { targetText: 'stąd', baseText: { de: 'von hier', en: 'from here' } }, { targetText: 'pieszo', baseText: { de: 'zu Fuß', en: 'on foot' } }, { targetText: 'minut', baseText: { de: 'Minuten', en: 'minutes' } }],
    recall: { before: 'Ile minut trzeba iść stąd ', answer: 'pieszo', after: '?', fallbackChoices: ['pieszo', 'rano', 'razem', 'ostrożnie'] }, speakRequired: ['minut', 'trzeba', 'pieszo'],
    sceneCaption: { de: 'Der Passant zeigt um die Ecke und sagt: „To zaraz za rogiem.”', en: 'The passer-by points around the corner and says: “To zaraz za rogiem.”' },
    trophyWord: { word: 'pieszo', meaning: { de: 'zu Fuß', en: 'on foot' }, example: 'Na rynek idę pieszo.', whyThisWord: { de: 'Pieszo macht aus der ungenauen Richtung eine praktische Frage nach deiner Gehzeit.', en: 'Pieszo turns a vague direction into a practical question about walking time.' } },
    distractors: ['autobusem przez centrum', 'za rogiem w prawo'], placeholderCaption: { de: 'Ein Wegweiser hinter der Straßenecke steht noch einige Gehminuten entfernt.', en: 'A sign beyond the street corner is still several minutes away on foot.' }, songMood: 'a curious city walk measured in minutes rather than blocks', visualNotes: 'Polish street corner, passer-by pointing, destination sign beyond the bend, walking route in view.',
  }),
  makePolishA2CompactLesson({
    slug: 'wszystko-w-porzadku-poprosze-rachunek', title: { de: 'Alles in Ordnung', en: 'Everything is fine' },
    situation: { de: 'Nach dem Essen fragt der Kellner, ob alles schmeckt. Du bestätigst es und bittest um die Rechnung.', en: 'After the meal, the waiter asks whether everything tastes good. Confirm it and ask for the bill.' },
    pedagogicalGoal: 'Eine Servicefrage positiv beantworten und anschließend mit poproszę die Rechnung verlangen.',
    targetText: 'Tak, wszystko jest w porządku. Poproszę rachunek.', baseText: { de: 'Ja, alles ist in Ordnung. Die Rechnung, bitte.', en: 'Yes, everything is fine. The bill, please.' },
    chunks: [{ targetText: 'Tak,', baseText: { de: 'Ja,', en: 'Yes,' } }, { targetText: 'wszystko jest w porządku.', baseText: { de: 'alles ist in Ordnung.', en: 'everything is fine.' } }, { targetText: 'Poproszę rachunek.', baseText: { de: 'Die Rechnung, bitte.', en: 'The bill, please.' } }],
    terms: [{ targetText: 'w porządku', baseText: { de: 'in Ordnung', en: 'all right' } }, { targetText: 'poproszę rachunek', baseText: { de: 'die Rechnung, bitte', en: 'the bill, please' } }, { targetText: 'rachunek', baseText: { de: 'Rechnung', en: 'bill' } }, { targetText: 'wszystko', baseText: { de: 'alles', en: 'everything' } }, { targetText: 'jest', baseText: { de: 'ist', en: 'is' } }],
    recall: { before: 'Tak, wszystko jest w porządku. Poproszę ', answer: 'rachunek', after: '.', fallbackChoices: ['rachunek', 'fartuch', 'garnek', 'obraz'] }, speakRequired: ['wszystko', 'porządku', 'rachunek'],
    sceneCaption: { de: 'Der Kellner nimmt einen leeren Teller auf und fragt: „Czy wszystko smakuje?”', en: 'The waiter picks up an empty plate and asks: “Czy wszystko smakuje?”' },
    trophyWord: { word: 'poproszę', meaning: { de: 'ich hätte gern; bitte', en: 'I would like; please' }, example: 'Poproszę rachunek i paragon.', whyThisWord: { de: 'Poproszę lässt dich nach der positiven Rückmeldung direkt und höflich zur Rechnung übergehen.', en: 'Poproszę lets you move politely from positive feedback to asking for the bill.' } },
    distractors: ['jeszcze jedną zupę', 'kartą przy barze'], placeholderCaption: { de: 'Ein abgeräumter Restauranttisch wartet neben einer geschlossenen Rechnungsmappe.', en: 'A cleared restaurant table sits beside a closed bill folder.' }, songMood: 'a satisfying meal ending with a calm request for the bill', visualNotes: 'Small restaurant, empty plate, attentive waiter, bill folder ready near the edge of the table.',
  }),
  makePolishA2CompactLesson({
    slug: 'mam-rezerwacje-na-nazwisko-nowak', title: { de: 'Auf den Namen Nowak', en: 'Under the name Nowak' },
    situation: { de: 'An der Hotelrezeption wird nach dem Namen der Buchung gefragt. Du nennst die vorhandene Reservierung klar.', en: 'At hotel reception, you are asked for the name on the booking. State the existing reservation clearly.' },
    pedagogicalGoal: 'Eine Hotelbuchung mit mam rezerwację na nazwisko identifizieren.',
    targetText: 'Mam rezerwację na nazwisko Nowak.', baseText: { de: 'Ich habe eine Reservierung auf den Namen Nowak.', en: 'I have a reservation under the name Nowak.' },
    chunks: [{ targetText: 'Mam rezerwację', baseText: { de: 'Ich habe eine Reservierung', en: 'I have a reservation' } }, { targetText: 'na nazwisko', baseText: { de: 'auf den Namen', en: 'under the name' } }, { targetText: 'Nowak.', baseText: { de: 'Nowak.', en: 'Nowak.' } }],
    terms: [{ targetText: 'mam rezerwację', baseText: { de: 'ich habe eine Reservierung', en: 'I have a reservation' } }, { targetText: 'na nazwisko', baseText: { de: 'auf den Namen', en: 'under the name' } }, { targetText: 'nazwisko', baseText: { de: 'Nachname', en: 'surname' } }, { targetText: 'rezerwację', baseText: { de: 'Reservierung im Akkusativ', en: 'reservation in the accusative' } }, { targetText: 'recepcja', baseText: { de: 'Rezeption', en: 'reception desk' } }],
    recall: { before: 'Mam rezerwację na ', answer: 'nazwisko', after: ' Nowak.', fallbackChoices: ['nazwisko', 'piętro', 'miejsce', 'śniadanie'] }, speakRequired: ['mam', 'rezerwację', 'nazwisko'],
    sceneCaption: { de: 'Der Rezeptionist öffnet die Buchungsliste und fragt: „Na jakie nazwisko jest rezerwacja?”', en: 'The receptionist opens the booking list and asks: “Na jakie nazwisko jest rezerwacja?”' },
    trophyWord: { word: 'nazwisko', meaning: { de: 'Nachname', en: 'surname' }, example: 'Proszę wpisać nazwisko na formularzu.', whyThisWord: { de: 'Nazwisko ist an der Rezeption der Schlüssel, mit dem die vorhandene Buchung gefunden wird.', en: 'Nazwisko is the key detail reception uses to find the existing booking.' } },
    distractors: ['pokój na dwie noce', 'klucz do pokoju'], placeholderCaption: { de: 'Eine Buchungsliste mit dem Namen Nowak liegt neben einer Hotel-Schlüsselkarte.', en: 'A booking list bearing the name Nowak lies beside a hotel key card.' }, songMood: 'a composed hotel arrival with the booking easy to find', visualNotes: 'Hotel reception, booking list, surname highlighted, key card waiting beside the keyboard.',
  }),
  makePolishA2CompactLesson({
    slug: 'nie-to-wszystko-ile-place', title: { de: 'Sonst nichts', en: 'Nothing else' },
    situation: { de: 'Die Apothekerin fragt, ob du noch etwas brauchst. Du verneinst und fragst nach dem Gesamtpreis.', en: 'The pharmacist asks whether you need anything else. Decline and ask for the total price.' },
    pedagogicalGoal: 'Einen Einkauf mit to wszystko beenden und in der Ich-Form nach dem Zahlbetrag fragen.',
    targetText: 'Nie, to wszystko. Ile razem płacę?', baseText: { de: 'Nein, das ist alles. Wie viel zahle ich insgesamt?', en: 'No, that is everything. How much do I pay altogether?' },
    chunks: [{ targetText: 'Nie, to wszystko.', baseText: { de: 'Nein, das ist alles.', en: 'No, that is everything.' } }, { targetText: 'Ile razem', baseText: { de: 'Wie viel insgesamt', en: 'How much altogether' } }, { targetText: 'płacę?', baseText: { de: 'zahle ich?', en: 'do I pay?' } }],
    terms: [{ targetText: 'to wszystko', baseText: { de: 'das ist alles', en: 'that is everything' } }, { targetText: 'ile razem', baseText: { de: 'wie viel insgesamt', en: 'how much altogether' } }, { targetText: 'płacę', baseText: { de: 'ich zahle', en: 'I pay' } }, { targetText: 'razem', baseText: { de: 'zusammen, insgesamt', en: 'together, altogether' } }, { targetText: 'nic więcej', baseText: { de: 'nichts weiter', en: 'nothing else' } }],
    recall: { before: 'Nie, to wszystko. Ile razem ', answer: 'płacę', after: '?', fallbackChoices: ['płacę', 'czekam', 'wracam', 'pytam'] }, speakRequired: ['wszystko', 'razem', 'płacę'],
    sceneCaption: { de: 'Die Apothekerin legt die Packung auf den Tresen und fragt: „Czy coś jeszcze?”', en: 'The pharmacist puts the packet on the counter and asks: “Czy coś jeszcze?”' },
    trophyWord: { word: 'płacę', meaning: { de: 'ich zahle', en: 'I pay' }, example: 'Płacę gotówką przy kasie.', whyThisWord: { de: 'Płacę macht die letzte Rückfrage an der Apothekenkasse persönlich und eindeutig.', en: 'Płacę makes the final question at the pharmacy counter personal and unambiguous.' } },
    distractors: ['jeszcze jedną rzecz', 'paragon z apteki'], placeholderCaption: { de: 'Eine Arzneipackung liegt allein neben dem Kartenleser auf dem Apothekentresen.', en: 'A single medicine packet rests beside the card reader on the pharmacy counter.' }, songMood: 'a tidy pharmacy purchase closing with one clear total', visualNotes: 'Pharmacy counter, one small packet, total on the register, no extra items in the basket.',
  }),
  makePolishA2CompactLesson({
    slug: 'przystanek-na-koncu-ulicy', title: { de: 'Am Ende der Straße', en: 'At the end of the street' },
    situation: { de: 'Ein Tourist fragt dich nach der Straßenbahnhaltestelle. Du gibst eine kurze Wegbeschreibung mit einem sichtbaren Orientierungspunkt.', en: 'A tourist asks you for the tram stop. Give a short direction tied to what is visible.' },
    pedagogicalGoal: 'Mit na końcu tej ulicy eine klare Ortsangabe geben.',
    targetText: 'Przystanek tramwajowy jest na końcu tej ulicy.', baseText: { de: 'Die Straßenbahnhaltestelle ist am Ende dieser Straße.', en: 'The tram stop is at the end of this street.' },
    chunks: [{ targetText: 'Przystanek tramwajowy', baseText: { de: 'Die Straßenbahnhaltestelle', en: 'The tram stop' } }, { targetText: 'jest na końcu', baseText: { de: 'ist am Ende', en: 'is at the end' } }, { targetText: 'tej ulicy.', baseText: { de: 'dieser Straße.', en: 'of this street.' } }],
    terms: [{ targetText: 'przystanek tramwajowy', baseText: { de: 'Straßenbahnhaltestelle', en: 'tram stop' } }, { targetText: 'na końcu', baseText: { de: 'am Ende', en: 'at the end' } }, { targetText: 'tej ulicy', baseText: { de: 'dieser Straße', en: 'of this street' } }, { targetText: 'końcu', baseText: { de: 'Ende im Lokativ', en: 'end in the locative' } }, { targetText: 'ulicy', baseText: { de: 'Straße im Genitiv', en: 'street in the genitive' } }],
    recall: { before: 'Przystanek tramwajowy jest na ', answer: 'końcu', after: ' tej ulicy.', fallbackChoices: ['końcu', 'początku', 'rogu', 'placu'] }, speakRequired: ['przystanek', 'końcu', 'ulicy'],
    sceneCaption: { de: 'Ein Tourist hält einen Stadtplan hoch und fragt: „Przepraszam, gdzie jest przystanek tramwajowy?”', en: 'A tourist holds up a city map and asks: “Przepraszam, gdzie jest przystanek tramwajowy?”' },
    trophyWord: { word: 'końcu', meaning: { de: 'am Ende', en: 'at the end' }, example: 'Sklep jest na końcu ulicy.', whyThisWord: { de: 'Końcu gibt dem Touristen einen festen Orientierungspunkt statt einer bloßen Richtung.', en: 'Końcu gives the tourist a fixed landmark rather than only a direction.' } },
    distractors: ['przy drugim skrzyżowaniu', 'obok dużego parku'], placeholderCaption: { de: 'Am Ende einer geraden Straße ist das Schild der Straßenbahnhaltestelle sichtbar.', en: 'The tram-stop sign is visible at the end of a straight street.' }, songMood: 'a helpful street-corner exchange with the stop in sight', visualNotes: 'Long city street, tram sign at the far end, tourist with map, local pointing straight ahead.',
  }),
  makePolishA2CompactLesson({
    slug: 'pol-kilo-jablek-i-cytryny', title: { de: 'Ein halbes Kilo', en: 'Half a kilo' },
    situation: { de: 'Der Markthändler fragt nach der Menge. Du bestellst ein halbes Kilo Äpfel und ergänzt zwei Zitronen.', en: 'The market vendor asks for the quantity. Order half a kilo of apples and add two lemons.' },
    pedagogicalGoal: 'Eine Gewichtsmenge nennen und mit i jeszcze einen zweiten Marktartikel ergänzen.',
    targetText: 'Poproszę pół kilo jabłek i jeszcze dwie cytryny.', baseText: { de: 'Ich hätte gern ein halbes Kilo Äpfel und noch zwei Zitronen.', en: 'I would like half a kilo of apples and two lemons as well.' },
    chunks: [{ targetText: 'Poproszę pół kilo jabłek', baseText: { de: 'Ich hätte gern ein halbes Kilo Äpfel', en: 'I would like half a kilo of apples' } }, { targetText: 'i jeszcze', baseText: { de: 'und noch', en: 'and also' } }, { targetText: 'dwie cytryny.', baseText: { de: 'zwei Zitronen.', en: 'two lemons.' } }],
    terms: [{ targetText: 'pół kilo', baseText: { de: 'ein halbes Kilo', en: 'half a kilo' } }, { targetText: 'jabłek', baseText: { de: 'Äpfel nach einer Mengenangabe', en: 'apples after a quantity' } }, { targetText: 'dwie cytryny', baseText: { de: 'zwei Zitronen', en: 'two lemons' } }, { targetText: 'cytryny', baseText: { de: 'Zitronen', en: 'lemons' } }, { targetText: 'i jeszcze', baseText: { de: 'und noch', en: 'and also' } }],
    recall: { before: 'Poproszę pół kilo jabłek i jeszcze dwie ', answer: 'cytryny', after: '.', fallbackChoices: ['cytryny', 'gruszki', 'śliwki', 'cebule'] }, speakRequired: ['poproszę', 'jabłek', 'cytryny'],
    sceneCaption: { de: 'Der Händler öffnet eine Papiertüte und fragt: „Ile jabłek podać?”', en: 'The vendor opens a paper bag and asks: “Ile jabłek podać?”' },
    trophyWord: { word: 'cytryny', meaning: { de: 'Zitronen', en: 'lemons' }, example: 'Dwie cytryny leżą obok jabłek.', whyThisWord: { de: 'Cytryny sind der zusätzliche Artikel, mit dem du aus der Mengenfrage eine vollständige Marktbestellung machst.', en: 'Cytryny are the extra item that turns the quantity answer into a complete market order.' } },
    distractors: ['kilogram ziemniaków', 'trzy czerwone papryki'], placeholderCaption: { de: 'Eine Waage zeigt ein halbes Kilo Äpfel, daneben liegen zwei Zitronen.', en: 'A scale shows half a kilo of apples with two lemons beside it.' }, songMood: 'a colorful market order measured and packed in one go', visualNotes: 'Outdoor produce stall, scale with apples, two lemons, open paper bag and vendor listening.',
  }),
  makePolishA2CompactLesson({
    slug: 'troche-znam-okolice-wokol-domu', title: { de: 'Schon etwas vertraut', en: 'A little familiar now' },
    situation: { de: 'Im Treppenhaus fragt ein Nachbar, ob alles in Ordnung ist. Du sagst, dass du die Gegend um dein Zuhause schon etwas kennst.', en: 'In the stairwell, a neighbor asks whether everything is all right. Say that you already know the area around your home a little.' },
    pedagogicalGoal: 'Mit już trochę ausdrücken, dass die neue Umgebung allmählich vertraut wird.',
    targetText: 'Tak, już trochę znam okolicę wokół domu.', baseText: { de: 'Ja, ich kenne die Gegend um das Haus schon ein wenig.', en: 'Yes, I already know the area around the house a little.' },
    chunks: [{ targetText: 'Tak, już trochę', baseText: { de: 'Ja, schon ein wenig', en: 'Yes, already a little' } }, { targetText: 'znam okolicę', baseText: { de: 'kenne ich die Gegend', en: 'I know the area' } }, { targetText: 'wokół domu.', baseText: { de: 'um das Haus.', en: 'around the house.' } }],
    terms: [{ targetText: 'już trochę', baseText: { de: 'schon ein wenig', en: 'a little already' } }, { targetText: 'znam', baseText: { de: 'ich kenne', en: 'I know' } }, { targetText: 'okolicę', baseText: { de: 'Gegend im Akkusativ', en: 'area in the accusative' } }, { targetText: 'wokół domu', baseText: { de: 'um das Haus', en: 'around the house' } }, { targetText: 'domu', baseText: { de: 'Haus im Genitiv', en: 'house in the genitive' } }],
    recall: { before: 'Tak, już trochę znam ', answer: 'okolicę', after: ' wokół domu.', fallbackChoices: ['okolicę', 'aptekę', 'torbę', 'książkę'] }, speakRequired: ['trochę', 'znam', 'okolicę'],
    sceneCaption: { de: 'Der Nachbar bleibt im Treppenhaus stehen und fragt: „Wszystko w porządku?”', en: 'The neighbor pauses in the stairwell and asks: “Wszystko w porządku?”' },
    trophyWord: { word: 'znam', meaning: { de: 'ich kenne', en: 'I know' }, example: 'Znam już sklep przy domu.', whyThisWord: { de: 'Znam zeigt dem Nachbarn, dass aus der fremden Adresse langsam deine vertraute Umgebung wird.', en: 'Znam shows the neighbor that the unfamiliar address is becoming a place you recognize.' } },
    distractors: ['dopiero szukam sklepu', 'często jadę tramwajem'], placeholderCaption: { de: 'Zwei Nachbarn sprechen im hellen Treppenhaus neben einem Plan des Viertels.', en: 'Two neighbors talk in a bright stairwell beside a small neighborhood map.' }, songMood: 'a quiet sense of belonging growing around the new home', visualNotes: 'Apartment stairwell, friendly neighbor, local map and familiar storefronts visible through the door.',
  }),
]

export const POLISH_A2_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_ONE_METADATA, polishA2Practical1Inputs,
  { de: 'Du hast Polnisch A2 Praxis 1 abgeschlossen und kannst vertraute Alltagsgespräche sicher weiterführen.', en: 'You have completed Polish A2 Practical 1 and can confidently continue familiar everyday exchanges.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_TWO_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-2', title: 'Polnisch A2 Praxis 2', shortTitle: 'A2 Praxis 2',
  subtitle: { de: 'Auswählen, vergleichen und Entscheidungen kurz begründen', en: 'Choosing, comparing, and giving short reasons for decisions' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical2Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'poprosze-te-jablka-bo-tansze', title: { de: 'Die günstigeren Äpfel', en: 'The cheaper apples' },
    situation: { de: 'Der Markthändler zeigt zwei Apfelsorten mit unterschiedlichen Preisen. Du wählst die günstigere Sorte.', en: 'The market vendor shows two kinds of apples at different prices. Choose the cheaper kind.' },
    pedagogicalGoal: 'Eine Auswahl mit bo und dem objektbezogenen Komparativ tańsze begründen.',
    targetText: 'Poproszę te jabłka, bo są tańsze.', baseText: { de: 'Ich hätte gern diese Äpfel, weil sie günstiger sind.', en: 'I would like these apples because they are cheaper.' },
    chunks: [{ targetText: 'Poproszę', baseText: { de: 'Ich hätte gern', en: 'I would like' } }, { targetText: 'te jabłka,', baseText: { de: 'diese Äpfel,', en: 'these apples,' } }, { targetText: 'bo są tańsze.', baseText: { de: 'weil sie günstiger sind.', en: 'because they are cheaper.' } }],
    terms: [{ targetText: 'te jabłka', baseText: { de: 'diese Äpfel', en: 'these apples' } }, { targetText: 'tańsze', baseText: { de: 'günstiger bei mehreren Sachen', en: 'cheaper for plural things' } }, { targetText: 'bo', baseText: { de: 'weil', en: 'because' } }, { targetText: 'jabłka', baseText: { de: 'Äpfel', en: 'apples' } }, { targetText: 'poproszę', baseText: { de: 'ich hätte gern', en: 'I would like' } }],
    recall: { before: 'Poproszę te jabłka, bo są ', answer: 'tańsze', after: '.', fallbackChoices: ['tańsze', 'droższe', 'większe', 'kwaśniejsze'] }, speakRequired: ['poproszę', 'jabłka', 'tańsze'],
    sceneCaption: { de: 'Der Händler hält zwei Apfelsorten über ihre Preisschilder und fragt: „Które jabłka podać?”', en: 'The vendor holds two kinds of apples above their price tags and asks: “Które jabłka podać?”' },
    trophyWord: { word: 'tańsze', meaning: { de: 'günstiger', en: 'cheaper' }, example: 'Te jabłka są dziś tańsze.', whyThisWord: { de: 'Tańsze benennt genau den Preisunterschied, der deine Wahl am Marktstand entscheidet.', en: 'Tańsze names the exact price difference driving your choice at the market stall.' } },
    distractors: ['tamte gruszki', 'dwa kilo proszę'], placeholderCaption: { de: 'Zwei Apfelkisten stehen unter deutlich verschiedenen Preisschildern.', en: 'Two crates of apples sit beneath clearly different price tags.' }, songMood: 'a bright market comparison with an easy economical choice', visualNotes: 'Produce stall, two apple varieties, visible price labels, vendor waiting with a paper bag.',
  }),
  makePolishA2CompactLesson({
    slug: 'dzisiaj-mrozona-bo-goraco', title: { de: 'Heute kalt', en: 'Iced today' },
    situation: { de: 'Die Barista erwartet deine übliche heiße Bestellung. Wegen der Hitze wechselst du heute zur kalten Variante.', en: 'The barista expects your usual hot order. Because of the heat, switch to the iced version today.' },
    pedagogicalGoal: 'Eine heutige Abweichung mit dzisiaj und einem bo-Grund erklären.',
    targetText: 'Dzisiaj poproszę mrożoną, bo jest gorąco.', baseText: { de: 'Heute nehme ich einen Eiskaffee, weil es heiß ist.', en: 'Today I would like an iced coffee because it is hot.' },
    chunks: [{ targetText: 'Dzisiaj poproszę', baseText: { de: 'Heute nehme ich', en: 'Today I would like' } }, { targetText: 'mrożoną,', baseText: { de: 'einen Eiskaffee,', en: 'an iced coffee,' } }, { targetText: 'bo jest gorąco.', baseText: { de: 'weil es heiß ist.', en: 'because it is hot.' } }],
    terms: [{ targetText: 'dzisiaj', baseText: { de: 'heute', en: 'today' } }, { targetText: 'mrożoną', baseText: { de: 'eine kalte oder eisgekühlte', en: 'an iced one' } }, { targetText: 'jest gorąco', baseText: { de: 'es ist heiß', en: 'it is hot' } }, { targetText: 'gorąco', baseText: { de: 'heiß', en: 'hot' } }, { targetText: 'poproszę', baseText: { de: 'ich hätte gern', en: 'I would like' } }],
    recall: { before: 'Dzisiaj poproszę ', answer: 'mrożoną', after: ', bo jest gorąco.', fallbackChoices: ['mrożoną', 'czarną', 'małą', 'słodką'] }, speakRequired: ['dzisiaj', 'mrożoną', 'gorąco'],
    sceneCaption: { de: 'Die Barista schaut vom heißen Fenster zur Kaffeemaschine und fragt: „Znowu gorącą kawę?”', en: 'The barista looks from the hot window to the coffee machine and asks: “Znowu gorącą kawę?”' },
    trophyWord: { word: 'gorąco', meaning: { de: 'heiß', en: 'hot' }, example: 'Dzisiaj na zewnątrz jest gorąco.', whyThisWord: { de: 'Gorąco liefert den natürlichen Grund dafür, heute die kalte Kaffeevariante zu wählen.', en: 'Gorąco supplies the natural reason for choosing the iced coffee today.' } },
    distractors: ['ciepłą herbatę', 'bez lodu proszę'], placeholderCaption: { de: 'Kondenswasser läuft an einem kalten Becher vor einem sonnigen Caféfenster hinab.', en: 'Condensation runs down an iced cup in front of a sunny cafe window.' }, songMood: 'a cool change of routine on a hot afternoon', visualNotes: 'Sunlit cafe, iced coffee, heat beyond the window, barista switching from a ceramic cup to ice.',
  }),
  makePolishA2CompactLesson({
    slug: 'wole-granatowa-bo-rozmiar-lezy', title: { de: 'Die dunkelblaue', en: 'The navy one' },
    situation: { de: 'Eine Verkäuferin zeigt zwei Hemden in deiner Größe. Du wählst das dunkelblaue, weil der Schnitt gut sitzt.', en: 'A shop assistant shows two shirts in your size. Choose the navy one because the fit works well.' },
    pedagogicalGoal: 'Mit wolę eine Farbwahl treffen und sie durch Sitz und Größe begründen.',
    targetText: 'Wolę granatową, bo lepiej na mnie leży.', baseText: { de: 'Ich bevorzuge die dunkelblaue, weil sie mir besser passt.', en: 'I prefer the navy one because it fits me better.' },
    chunks: [{ targetText: 'Wolę', baseText: { de: 'Ich bevorzuge', en: 'I prefer' } }, { targetText: 'granatową,', baseText: { de: 'die dunkelblaue,', en: 'the navy one,' } }, { targetText: 'bo lepiej na mnie leży.', baseText: { de: 'weil sie mir besser passt.', en: 'because it fits me better.' } }],
    terms: [{ targetText: 'wolę', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }, { targetText: 'granatową', baseText: { de: 'die dunkelblaue im Akkusativ', en: 'the navy one in the accusative' } }, { targetText: 'ten rozmiar', baseText: { de: 'diese Größe', en: 'this size' } }, { targetText: 'dobrze leży', baseText: { de: 'sitzt gut', en: 'fits well' } }, { targetText: 'rozmiar', baseText: { de: 'Größe', en: 'size' } }],
    recall: { before: 'Wolę granatową, bo lepiej na mnie ', answer: 'leży', after: '.', fallbackChoices: ['leży', 'pasuje', 'wisi', 'wygląda'] }, speakRequired: ['wolę', 'granatową', 'leży'],
    sceneCaption: { de: 'Die Verkäuferin hält ein graues und ein dunkelblaues Hemd hoch und fragt: „Którą koszulę podać?”', en: 'The shop assistant holds up a gray and a navy shirt and asks: “Którą koszulę podać?”' },
    trophyWord: { word: 'granatową', meaning: { de: 'die dunkelblaue', en: 'the navy one' }, example: 'Poproszę granatową koszulę w tym rozmiarze.', whyThisWord: { de: 'Granatową macht deine sichtbare Farbwahl zwischen den beiden Hemden eindeutig.', en: 'Granatową makes your visible color choice between the two shirts unambiguous.' } },
    distractors: ['szarą w większym rozmiarze', 'ten sam materiał'], placeholderCaption: { de: 'Ein graues und ein dunkelblaues Hemd hängen vor dem Spiegel in derselben Größe.', en: 'A gray and a navy shirt hang before the mirror in the same size.' }, songMood: 'a confident clothing choice under clear fitting-room light', visualNotes: 'Small clothing shop, two shirts, size tag, mirror and a decisive hand toward the navy fabric.',
  }),
  makePolishA2CompactLesson({
    slug: 'wole-zupe-bo-lzejsza', title: { de: 'Die leichtere Suppe', en: 'The lighter soup' },
    situation: { de: 'Die Kellnerin bietet Suppe oder Pierogi an. Du entscheidest dich für die leichtere Suppe.', en: 'The server offers soup or pierogi. Choose the lighter soup.' },
    pedagogicalGoal: 'Zwischen zwei Gerichten mit wolę wählen und den Grund mit lżejsza nennen.',
    targetText: 'Dzisiaj wolę zupę, bo jest lżejsza.', baseText: { de: 'Heute bevorzuge ich die Suppe, weil sie leichter ist.', en: 'Today I prefer the soup because it is lighter.' },
    chunks: [{ targetText: 'Dzisiaj wolę', baseText: { de: 'Heute bevorzuge ich', en: 'Today I prefer' } }, { targetText: 'zupę,', baseText: { de: 'die Suppe,', en: 'the soup,' } }, { targetText: 'bo jest lżejsza.', baseText: { de: 'weil sie leichter ist.', en: 'because it is lighter.' } }],
    terms: [{ targetText: 'wolę zupę', baseText: { de: 'ich bevorzuge die Suppe', en: 'I prefer the soup' } }, { targetText: 'zupę', baseText: { de: 'Suppe im Akkusativ', en: 'soup in the accusative' } }, { targetText: 'lżejsza', baseText: { de: 'leichter bei einem femininen Gericht', en: 'lighter for a feminine dish' } }, { targetText: 'dzisiaj', baseText: { de: 'heute', en: 'today' } }, { targetText: 'pierogi', baseText: { de: 'gefüllte polnische Teigtaschen', en: 'Polish filled dumplings' } }],
    recall: { before: 'Dzisiaj wolę zupę, bo jest ', answer: 'lżejsza', after: '.', fallbackChoices: ['lżejsza', 'cięższa', 'droższa', 'ostrzejsza'] }, speakRequired: ['wolę', 'zupę', 'lżejsza'],
    sceneCaption: { de: 'Die Kellnerin zeigt auf zwei Tagesgerichte und fragt: „Zupa czy pierogi?”', en: 'The server points to two daily dishes and asks: “Zupa czy pierogi?”' },
    trophyWord: { word: 'lżejsza', meaning: { de: 'leichter', en: 'lighter' }, example: 'Ta zupa jest lżejsza od pierogów.', whyThisWord: { de: 'Lżejsza erklärt deine Suppenwahl durch die Eigenschaft, die bei diesem Mittagessen zählt.', en: 'Lżejsza explains the soup choice through the quality that matters for this meal.' } },
    distractors: ['pierogi z mięsem', 'dużą sałatkę'], placeholderCaption: { de: 'Eine leichte Suppe und ein Teller Pierogi stehen nebeneinander auf dem Tagesmenü.', en: 'A light soup and a plate of pierogi appear side by side on the daily menu.' }, songMood: 'a calm lunch choice favoring the lighter plate', visualNotes: 'Restaurant menu board, soup bowl, pierogi plate, server indicating both options.',
  }),
  makePolishA2CompactLesson({
    slug: 'ten-razowy-bo-bardziej-chrupiacy', title: { de: 'Das knusprigere Brot', en: 'The crunchier bread' },
    situation: { de: 'Die Bäckerin legt zwei Brote auf den Tresen. Du wählst das dunkle Brot, weil es heute knuspriger ist.', en: 'The baker puts two loaves on the counter. Choose the dark loaf because it is crunchier today.' },
    pedagogicalGoal: 'Eine Brotauswahl mit ten und einer vergleichenden Eigenschaft begründen.',
    targetText: 'Poproszę ten razowy, bo dziś jest bardziej chrupiący.', baseText: { de: 'Ich hätte gern das Vollkornbrot, weil es heute knuspriger ist.', en: 'I would like the wholegrain one because it is crunchier today.' },
    chunks: [{ targetText: 'Poproszę', baseText: { de: 'Ich hätte gern', en: 'I would like' } }, { targetText: 'ten razowy,', baseText: { de: 'das Vollkornbrot,', en: 'the wholegrain one,' } }, { targetText: 'bo dziś jest bardziej chrupiący.', baseText: { de: 'weil es heute knuspriger ist.', en: 'because it is crunchier today.' } }],
    terms: [{ targetText: 'ten razowy', baseText: { de: 'dieses Vollkornbrot', en: 'this wholegrain one' } }, { targetText: 'razowy', baseText: { de: 'Vollkorn-', en: 'wholegrain' } }, { targetText: 'bardziej chrupiący', baseText: { de: 'knuspriger', en: 'crunchier' } }, { targetText: 'chrupiący', baseText: { de: 'knusprig', en: 'crunchy' } }, { targetText: 'dziś', baseText: { de: 'heute', en: 'today' } }],
    recall: { before: 'Poproszę ten razowy, bo dziś jest bardziej ', answer: 'chrupiący', after: '.', fallbackChoices: ['chrupiący', 'miękki', 'suchy', 'ciężki'] }, speakRequired: ['poproszę', 'razowy', 'chrupiący'],
    sceneCaption: { de: 'Die Bäckerin legt ein helles und ein dunkles Brot auf ein Brett und fragt: „Który chleb podać?”', en: 'The baker places a light and a dark loaf on a board and asks: “Który chleb podać?”' },
    trophyWord: { word: 'chrupiący', meaning: { de: 'knusprig', en: 'crunchy' }, example: 'Ten razowy chleb jest chrupiący.', whyThisWord: { de: 'Chrupiący benennt die frische Textur, wegen der du genau dieses Brot auswählst.', en: 'Chrupiący names the fresh texture that makes you choose this particular loaf.' } },
    distractors: ['biały z makiem', 'dwie małe bułki'], placeholderCaption: { de: 'Ein dunkles knuspriges Brot liegt neben einem weicheren hellen Laib.', en: 'A dark crusty loaf rests beside a softer white loaf.' }, songMood: 'a cozy bakery comparison shaped by a crisp crust', visualNotes: 'Bakery board, two fresh loaves, textured dark crust, baker waiting with a bread bag.',
  }),
  makePolishA2CompactLesson({
    slug: 'wole-tramwaj-bo-jedzie-szybciej', title: { de: 'Mit der Straßenbahn', en: 'By tram' },
    situation: { de: 'An der Auskunft werden Bus und Straßenbahn verglichen. Du wählst die schnellere Straßenbahn.', en: 'At the information desk, the bus and tram are compared. Choose the faster tram.' },
    pedagogicalGoal: 'Zwei Verkehrsmittel mit wolę und szybciej vergleichen.',
    targetText: 'Wolę tramwaj, bo jedzie szybciej.', baseText: { de: 'Ich bevorzuge die Straßenbahn, weil sie schneller fährt.', en: 'I prefer the tram because it goes faster.' },
    chunks: [{ targetText: 'Wolę', baseText: { de: 'Ich bevorzuge', en: 'I prefer' } }, { targetText: 'tramwaj,', baseText: { de: 'die Straßenbahn,', en: 'the tram,' } }, { targetText: 'bo jedzie szybciej.', baseText: { de: 'weil sie schneller fährt.', en: 'because it goes faster.' } }],
    terms: [{ targetText: 'wolę tramwaj', baseText: { de: 'ich bevorzuge die Straßenbahn', en: 'I prefer the tram' } }, { targetText: 'tramwaj', baseText: { de: 'Straßenbahn', en: 'tram' } }, { targetText: 'jedzie', baseText: { de: 'fährt', en: 'goes by vehicle' } }, { targetText: 'szybciej', baseText: { de: 'schneller', en: 'faster' } }, { targetText: 'autobus', baseText: { de: 'Bus', en: 'bus' } }],
    recall: { before: 'Wolę tramwaj, bo jedzie ', answer: 'szybciej', after: '.', fallbackChoices: ['szybciej', 'wolniej', 'taniej', 'wygodniej'] }, speakRequired: ['wolę', 'tramwaj', 'szybciej'],
    sceneCaption: { de: 'Die Mitarbeiterin zeigt auf zwei Linien im Stadtplan und fragt: „Autobus czy tramwaj jest szybszy?”', en: 'The staff member points to two routes on the city map and asks: “Autobus czy tramwaj jest szybszy?”' },
    trophyWord: { word: 'szybciej', meaning: { de: 'schneller', en: 'faster' }, example: 'Tramwaj jedzie szybciej przez centrum.', whyThisWord: { de: 'Szybciej liefert an der Auskunft den entscheidenden Grund für die Straßenbahn.', en: 'Szybciej supplies the deciding reason for choosing the tram at the information desk.' } },
    distractors: ['autobusem przez most', 'pieszo do centrum'], placeholderCaption: { de: 'Auf einem Stadtplan verläuft die Straßenbahn direkter als die Buslinie.', en: 'On a city map, the tram route runs more directly than the bus route.' }, songMood: 'a city route decision with the quicker line highlighted', visualNotes: 'Transit information counter, route map, tram line in focus, bus route bending through traffic.',
  }),
  makePolishA2CompactLesson({
    slug: 'pokoj-od-podworza-spi-sie-spokojniej', title: { de: 'Zum Innenhof', en: 'Facing the courtyard' },
    situation: { de: 'Die Rezeptionistin bietet ein Zimmer zur Straße und eines zum Innenhof an. Du wählst die ruhigere Seite.', en: 'The receptionist offers a room facing the street and one facing the courtyard. Choose the quieter side.' },
    pedagogicalGoal: 'Eine Zimmerpräferenz mit od podwórza und der unpersönlichen się-Konstruktion begründen.',
    targetText: 'Wolę pokój od podwórza, bo śpi się tam spokojniej.', baseText: { de: 'Ich bevorzuge das Zimmer zum Innenhof, weil man dort ruhiger schläft.', en: 'I prefer the courtyard room because one sleeps more peacefully there.' },
    chunks: [{ targetText: 'Wolę pokój', baseText: { de: 'Ich bevorzuge das Zimmer', en: 'I prefer the room' } }, { targetText: 'od podwórza,', baseText: { de: 'zum Innenhof,', en: 'facing the courtyard,' } }, { targetText: 'bo śpi się tam spokojniej.', baseText: { de: 'weil man dort ruhiger schläft.', en: 'because one sleeps more peacefully there.' } }],
    terms: [{ targetText: 'pokój od podwórza', baseText: { de: 'Zimmer zum Innenhof', en: 'room facing the courtyard' } }, { targetText: 'podwórza', baseText: { de: 'Innenhof im Genitiv', en: 'courtyard in the genitive' } }, { targetText: 'śpi się', baseText: { de: 'man schläft', en: 'one sleeps' } }, { targetText: 'spokojniej', baseText: { de: 'ruhiger', en: 'more peacefully' } }, { targetText: 'tam', baseText: { de: 'dort', en: 'there' } }],
    recall: { before: 'Wolę pokój od podwórza, bo śpi się tam ', answer: 'spokojniej', after: '.', fallbackChoices: ['spokojniej', 'krócej', 'później', 'głośniej'] }, speakRequired: ['pokój', 'podwórza', 'spokojniej'],
    sceneCaption: { de: 'Die Rezeptionistin legt zwei Schlüsselkarten hin und fragt: „Pokój od ulicy czy od podwórza?”', en: 'The receptionist lays out two key cards and asks: “Pokój od ulicy czy od podwórza?”' },
    trophyWord: { word: 'spokojniej', meaning: { de: 'ruhiger, friedlicher', en: 'more peacefully' }, example: 'Od podwórza śpi się spokojniej.', whyThisWord: { de: 'Spokojniej erklärt, warum die Lage zum Innenhof für deine Nachtruhe besser ist.', en: 'Spokojniej explains why the courtyard side is better for a restful night.' } },
    distractors: ['większy od ulicy', 'z balkonem na park'], placeholderCaption: { de: 'Eine Schlüsselkarte zeigt zur lauten Straße, die andere zu einem stillen Innenhof.', en: 'One key card faces the noisy street and the other a quiet courtyard.' }, songMood: 'a gentle hotel choice settling toward a quiet night', visualNotes: 'Reception desk, two room cards, traffic visible on one side and a calm courtyard on the other.',
  }),
  makePolishA2CompactLesson({
    slug: 'te-buty-bo-sa-wygodniejsze', title: { de: 'Die bequemeren Schuhe', en: 'The more comfortable shoes' },
    situation: { de: 'Am Marktstand probierst du zwei Paar Schuhe. Du entscheidest dich für das bequemere Paar.', en: 'At a market stall, you try on two pairs of shoes. Choose the more comfortable pair.' },
    pedagogicalGoal: 'Eine Kaufentscheidung mit dem pluralischen Komparativ wygodniejsze begründen.',
    targetText: 'Poproszę te buty, bo są wygodniejsze.', baseText: { de: 'Ich hätte gern diese Schuhe, weil sie bequemer sind.', en: 'I would like these shoes because they are more comfortable.' },
    chunks: [{ targetText: 'Poproszę', baseText: { de: 'Ich hätte gern', en: 'I would like' } }, { targetText: 'te buty,', baseText: { de: 'diese Schuhe,', en: 'these shoes,' } }, { targetText: 'bo są wygodniejsze.', baseText: { de: 'weil sie bequemer sind.', en: 'because they are more comfortable.' } }],
    terms: [{ targetText: 'te buty', baseText: { de: 'diese Schuhe', en: 'these shoes' } }, { targetText: 'buty', baseText: { de: 'Schuhe', en: 'shoes' } }, { targetText: 'wygodniejsze', baseText: { de: 'bequemer bei mehreren Sachen', en: 'more comfortable for plural things' } }, { targetText: 'są', baseText: { de: 'sie sind', en: 'they are' } }, { targetText: 'poproszę', baseText: { de: 'ich hätte gern', en: 'I would like' } }],
    recall: { before: 'Poproszę te buty, bo są ', answer: 'wygodniejsze', after: '.', fallbackChoices: ['wygodniejsze', 'ciaśniejsze', 'cięższe', 'droższe'] }, speakRequired: ['poproszę', 'buty', 'wygodniejsze'],
    sceneCaption: { de: 'Der Verkäufer stellt zwei Paar vor den Spiegel und fragt: „Która para pasuje?”', en: 'The vendor sets two pairs in front of the mirror and asks: “Która para pasuje?”' },
    trophyWord: { word: 'wygodniejsze', meaning: { de: 'bequemer', en: 'more comfortable' }, example: 'Te buty są wygodniejsze na długi spacer.', whyThisWord: { de: 'Wygodniejsze benennt das Gefühl beim Anprobieren, das deine Kaufentscheidung bestimmt.', en: 'Wygodniejsze names the feeling during the fitting that determines your purchase.' } },
    distractors: ['czarne w większym rozmiarze', 'skarpetki z wełny'], placeholderCaption: { de: 'Zwei Paar Schuhe stehen vor einem kleinen Spiegel am Marktstand.', en: 'Two pairs of shoes sit before a small mirror at the market stall.' }, songMood: 'a practical market choice made with one comfortable step', visualNotes: 'Shoe stall, mirror, two pairs on a mat, customer testing the more comfortable fit.',
  }),
  makePolishA2CompactLesson({
    slug: 'mniejsza-butelke-bo-kosztuje-mniej', title: { de: 'Die kleinere Flasche', en: 'The smaller bottle' },
    situation: { de: 'Die Verkäuferin schlägt eine große Flasche vor. Du nimmst die kleinere, weil sie weniger kostet.', en: 'The clerk suggests a large bottle. Choose the smaller one because it costs less.' },
    pedagogicalGoal: 'Größe und Preis mit mniejszą und mniej in einer Begründung verbinden.',
    targetText: 'Poproszę mniejszą butelkę, bo kosztuje mniej.', baseText: { de: 'Ich hätte gern die kleinere Flasche, weil sie weniger kostet.', en: 'I would like the smaller bottle because it costs less.' },
    chunks: [{ targetText: 'Poproszę', baseText: { de: 'Ich hätte gern', en: 'I would like' } }, { targetText: 'mniejszą butelkę,', baseText: { de: 'die kleinere Flasche,', en: 'the smaller bottle,' } }, { targetText: 'bo kosztuje mniej.', baseText: { de: 'weil sie weniger kostet.', en: 'because it costs less.' } }],
    terms: [{ targetText: 'mniejszą butelkę', baseText: { de: 'die kleinere Flasche', en: 'the smaller bottle' } }, { targetText: 'butelkę', baseText: { de: 'Flasche im Akkusativ', en: 'bottle in the accusative' } }, { targetText: 'mniejszą', baseText: { de: 'die kleinere im Akkusativ', en: 'the smaller one in the accusative' } }, { targetText: 'kosztuje mniej', baseText: { de: 'kostet weniger', en: 'costs less' } }, { targetText: 'mniej', baseText: { de: 'weniger', en: 'less' } }],
    recall: { before: 'Poproszę ', answer: 'mniejszą', after: ' butelkę, bo kosztuje mniej.', fallbackChoices: ['mniejszą', 'większą', 'cięższą', 'droższą'] }, speakRequired: ['poproszę', 'butelkę', 'mniej'],
    sceneCaption: { de: 'Die Verkäuferin hebt zwei Größen aus dem Kühlregal und fragt: „Dużą czy małą butelkę?”', en: 'The clerk lifts two sizes from the cooler and asks: “Dużą czy małą butelkę?”' },
    trophyWord: { word: 'mniej', meaning: { de: 'weniger', en: 'less' }, example: 'Mała butelka kosztuje mniej.', whyThisWord: { de: 'Mniej verbindet die kleinere Größe direkt mit dem niedrigeren Preis.', en: 'Mniej links the smaller size directly to its lower price.' } },
    distractors: ['dużą butelkę gazowaną', 'dwa małe soki'], placeholderCaption: { de: 'Eine kleine und eine große Flasche stehen nebeneinander mit zwei Preisen.', en: 'A small and a large bottle stand side by side with two prices.' }, songMood: 'a simple shop choice balancing size and price', visualNotes: 'Cooler shelf, two bottle sizes, price stickers, clerk holding both at eye level.',
  }),
  makePolishA2CompactLesson({
    slug: 'wole-te-kawiarnie-bo-blisko-cicho', title: { de: 'Mein Lieblingsort', en: 'My favorite spot' },
    situation: { de: 'Eine Nachbarin fragt nach dem besten Ort in der Gegend. Du nennst das nahe, ruhige Café.', en: 'A neighbor asks about the best place in the area. Name the nearby quiet cafe.' },
    pedagogicalGoal: 'Einen bevorzugten Ort mit wolę und zwei einfachen Gründen beschreiben.',
    targetText: 'Wolę tę kawiarnię, bo jest blisko i jest tam cicho.', baseText: { de: 'Ich bevorzuge dieses Café, weil es nah ist und man dort Ruhe hat.', en: 'I prefer this cafe because it is close and quiet there.' },
    chunks: [{ targetText: 'Wolę', baseText: { de: 'Ich bevorzuge', en: 'I prefer' } }, { targetText: 'tę kawiarnię,', baseText: { de: 'dieses Café,', en: 'this cafe,' } }, { targetText: 'bo jest blisko i jest tam cicho.', baseText: { de: 'weil es nah ist und man dort Ruhe hat.', en: 'because it is close and quiet there.' } }],
    terms: [{ targetText: 'tę kawiarnię', baseText: { de: 'dieses Café im Akkusativ', en: 'this cafe in the accusative' } }, { targetText: 'kawiarnię', baseText: { de: 'Café im Akkusativ', en: 'cafe in the accusative' } }, { targetText: 'blisko', baseText: { de: 'nah', en: 'close' } }, { targetText: 'cicho', baseText: { de: 'ruhig, leise', en: 'quiet' } }, { targetText: 'wolę', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }],
    recall: { before: 'Wolę tę ', answer: 'kawiarnię', after: ', bo jest blisko i jest tam cicho.', fallbackChoices: ['kawiarnię', 'piekarnię', 'księgarnię', 'aptekę'] }, speakRequired: ['wolę', 'kawiarnię', 'cicho'],
    sceneCaption: { de: 'Die Nachbarin schaut über den kleinen Platz und fragt: „Które miejsce w okolicy jest najlepsze?”', en: 'The neighbor looks across the small square and asks: “Które miejsce w okolicy jest najlepsze?”' },
    trophyWord: { word: 'cicho', meaning: { de: 'ruhig, leise', en: 'quiet' }, example: 'W tej kawiarni jest rano cicho.', whyThisWord: { de: 'Cicho erklärt, warum gerade dieses nahe Café dein bevorzugter Ort geworden ist.', en: 'Cicho explains why this nearby cafe has become your preferred place.' } },
    distractors: ['park przy rzece', 'restaurację na rynku'], placeholderCaption: { de: 'Ein stilles Café liegt nur wenige Schritte vom kleinen Nachbarschaftsplatz entfernt.', en: 'A quiet cafe sits only a few steps from the small neighborhood square.' }, songMood: 'a peaceful neighborhood favorite found close to home', visualNotes: 'Quiet cafe frontage, nearby square, two neighbors talking while the calm interior is visible.',
  }),
]

export const POLISH_A2_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_TWO_METADATA, polishA2Practical2Inputs,
  { de: 'Du hast Polnisch A2 Praxis 2 abgeschlossen und kannst Auswahlentscheidungen vergleichen und kurz begründen.', en: 'You have completed Polish A2 Practical 2 and can compare choices and give short reasons.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_THREE_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-3', title: 'Polnisch A2 Praxis 3', shortTitle: 'A2 Praxis 3',
  subtitle: { de: 'Erste vergangene Handlungen mit klaren Zeitangaben', en: 'First past actions with clear time markers' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical3Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'juz-zaplacilam-wszystko-gotowe', title: { de: 'Schon bezahlt', en: 'Already paid' },
    situation: { de: 'Am Abholschalter wird nach der Zahlungsart gefragt. Du erklärst, dass du bereits an der Hauptkasse bezahlt hast.', en: 'At the pickup counter, the attendant asks about the payment method. Explain that you already paid at the main register.' },
    pedagogicalGoal: 'Mit już und der femininen Vergangenheitsform zapłaciłam eine abgeschlossene Zahlung melden.',
    targetText: 'Już zapłaciłam kartą przy kasie. Wszystko jest gotowe.', baseText: { de: 'Ich habe schon mit Karte an der Kasse bezahlt. Alles ist fertig.', en: 'I already paid by card at the register. Everything is ready.' },
    chunks: [{ targetText: 'Już zapłaciłam kartą', baseText: { de: 'Ich habe schon mit Karte bezahlt', en: 'I already paid by card' } }, { targetText: 'przy kasie.', baseText: { de: 'an der Kasse.', en: 'at the register.' } }, { targetText: 'Wszystko jest gotowe.', baseText: { de: 'Alles ist fertig.', en: 'Everything is ready.' } }],
    terms: [{ targetText: 'zapłaciłam', baseText: { de: 'ich habe bezahlt (Frau; Mann: zapłaciłem)', en: 'I paid (female; male: zapłaciłem)' }, alsoAccept: ['zapłaciłem'] }, { targetText: 'przy kasie', baseText: { de: 'an der Kasse', en: 'at the register' } }, { targetText: 'gotowe', baseText: { de: 'fertig, erledigt', en: 'ready, settled' } }, { targetText: 'wszystko', baseText: { de: 'alles', en: 'everything' } }, { targetText: 'już', baseText: { de: 'schon, bereits', en: 'already' } }],
    recall: { before: 'Już zapłaciłam kartą przy kasie. Wszystko jest ', answer: 'gotowe', after: '.', fallbackChoices: ['gotowe', 'otwarte', 'zajęte', 'wolne'] }, speakRequired: ['kartą', 'kasie', 'gotowe'],
    sceneCaption: { de: 'Die Mitarbeiterin am Abholschalter deutet auf das Terminal und fragt: „Płatność kartą czy gotówką?”', en: 'The attendant at the pickup counter gestures to the terminal and asks: “Płatność kartą czy gotówką?”' },
    trophyWord: { word: 'gotowe', meaning: { de: 'fertig, erledigt', en: 'ready, settled' }, example: 'Wszystko jest gotowe do odbioru.', whyThisWord: { de: 'Gotowe schließt die kurze Klärung ab: Nach deiner früheren Zahlung ist nichts mehr offen.', en: 'Gotowe closes the brief clarification: after your earlier payment, nothing remains to be done.' } },
    distractors: ['kartą przy terminalu', 'paragon w torbie'], placeholderCaption: { de: 'Auf dem Kassendisplay steht „bezahlt“, während die Karte schon im Portemonnaie steckt.', en: 'The register display shows paid while the card is already back in the wallet.' }, songMood: 'a quick payment check resolved with quiet certainty', visualNotes: 'Checkout counter, paid screen, receipt beside terminal, customer indicating the completed transaction.',
  }),
  makePolishA2CompactLesson({
    slug: 'przyjechalam-wczoraj-teraz-mam-pokoj', title: { de: 'Gestern angekommen', en: 'Arrived yesterday' },
    situation: { de: 'Der Rezeptionist fragt, seit wann die Reservierung läuft. Du nennst deine Ankunft gestern Abend und den jetzigen Zimmerstatus.', en: 'The receptionist asks when the booking began. State your arrival yesterday evening and your current room status.' },
    pedagogicalGoal: 'Mit przyjechałam und wczoraj wieczorem eine vergangene Ankunft zeitlich verorten.',
    targetText: 'Przyjechałam wczoraj wieczorem, teraz mam już pokój.', baseText: { de: 'Ich bin gestern Abend angekommen, jetzt habe ich schon ein Zimmer.', en: 'I arrived yesterday evening, and now I already have a room.' },
    chunks: [{ targetText: 'Przyjechałam wczoraj wieczorem,', baseText: { de: 'Ich bin gestern Abend angekommen,', en: 'I arrived yesterday evening,' } }, { targetText: 'teraz mam już', baseText: { de: 'jetzt habe ich schon', en: 'now I already have' } }, { targetText: 'pokój.', baseText: { de: 'ein Zimmer.', en: 'a room.' } }],
    terms: [{ targetText: 'przyjechałam', baseText: { de: 'ich bin angekommen (Frau; Mann: przyjechałem)', en: 'I arrived (female; male: przyjechałem)' }, alsoAccept: ['przyjechałem'] }, { targetText: 'wczoraj wieczorem', baseText: { de: 'gestern Abend', en: 'yesterday evening' } }, { targetText: 'wczoraj', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'mam już pokój', baseText: { de: 'ich habe schon ein Zimmer', en: 'I already have a room' } }, { targetText: 'wieczorem', baseText: { de: 'am Abend', en: 'in the evening' } }],
    recall: { before: 'Przyjechałam ', answer: 'wczoraj', after: ' wieczorem, teraz mam już pokój.', fallbackChoices: ['wczoraj', 'jutro', 'wcześniej', 'niedawno'] }, speakRequired: ['wczoraj', 'wieczorem', 'pokój'],
    sceneCaption: { de: 'Der Rezeptionist prüft die Daten und fragt: „Od kiedy pani tu jest?”', en: 'The receptionist checks the dates and asks: “Od kiedy pani tu jest?”' },
    trophyWord: { word: 'wczoraj', meaning: { de: 'gestern', en: 'yesterday' }, example: 'Od wczoraj pada deszcz.', whyThisWord: { de: 'Wczoraj setzt deine erste Ankunftserzählung klar in die Vergangenheit.', en: 'Wczoraj places your first arrival account clearly in the past.' } },
    distractors: ['dzisiaj rano w lobby', 'na jutro przy recepcji'], placeholderCaption: { de: 'Auf dem Hotelkalender ist der gestrige Abend neben der aktiven Zimmerkarte markiert.', en: 'The hotel calendar marks yesterday evening beside the active room card.' }, songMood: 'a calm hotel timeline moving from arrival to a room of your own', visualNotes: 'Reception desk, calendar with yesterday marked, room key active, evening arrival remembered briefly.',
  }),
  makePolishA2CompactLesson({
    slug: 'juz-zamowilam-zupe-teraz-czekam', title: { de: 'Schon bestellt', en: 'Already ordered' },
    situation: { de: 'Der Kellner fragt, ob er deine Bestellung aufnehmen darf. Du sagst, dass du die Suppe bereits bestellt hast und wartest.', en: 'The waiter asks whether he can take your order. Say that you have already ordered the soup and are waiting.' },
    pedagogicalGoal: 'Mit zamówiłam eine abgeschlossene Bestellung und mit teraz den aktuellen Zustand verbinden.',
    targetText: 'Już zamówiłam zupę, teraz czekam przy stoliku.', baseText: { de: 'Ich habe die Suppe schon bestellt, jetzt warte ich am Tisch.', en: 'I already ordered the soup, and now I am waiting at the table.' },
    chunks: [{ targetText: 'Już zamówiłam zupę,', baseText: { de: 'Ich habe die Suppe schon bestellt,', en: 'I already ordered the soup,' } }, { targetText: 'teraz czekam', baseText: { de: 'jetzt warte ich', en: 'now I am waiting' } }, { targetText: 'przy stoliku.', baseText: { de: 'am Tisch.', en: 'at the table.' } }],
    terms: [{ targetText: 'zamówiłam', baseText: { de: 'ich habe bestellt (Frau; Mann: zamówiłem)', en: 'I ordered (female; male: zamówiłem)' }, alsoAccept: ['zamówiłem'] }, { targetText: 'zupę', baseText: { de: 'Suppe im Akkusativ', en: 'soup in the accusative' } }, { targetText: 'teraz czekam', baseText: { de: 'jetzt warte ich', en: 'now I am waiting' } }, { targetText: 'przy stoliku', baseText: { de: 'am Tisch', en: 'at the table' } }, { targetText: 'czekam', baseText: { de: 'ich warte', en: 'I am waiting' } }],
    recall: { before: 'Już zamówiłam ', answer: 'zupę', after: ', teraz czekam przy stoliku.', fallbackChoices: ['zupę', 'sałatkę', 'herbatę', 'kanapkę'] }, speakRequired: ['zupę', 'teraz', 'czekam'],
    sceneCaption: { de: 'Der Kellner öffnet seinen Bestellblock und fragt: „Czy mogę przyjąć zamówienie?”', en: 'The waiter opens his order pad and asks: “Czy mogę przyjąć zamówienie?”' },
    trophyWord: { word: 'zupę', meaning: { de: 'Suppe im Akkusativ', en: 'soup in the accusative' }, example: 'Czekam przy stoliku na zupę.', whyThisWord: { de: 'Zupę benennt genau das Gericht, dessen Bestellung du gegenüber dem Kellner klärst.', en: 'Zupę names the exact dish whose order you are clarifying with the waiter.' } },
    distractors: ['menu na stoliku', 'wodę bez gazu'], placeholderCaption: { de: 'Ein Bestellbon für Suppe liegt neben einem noch leeren Platz am Tisch.', en: 'An order slip for soup lies beside a still-empty place at the table.' }, songMood: 'a patient restaurant pause after the order is already in', visualNotes: 'Restaurant table, soup marked on order pad, waiter checking, customer waiting calmly.',
  }),
  makePolishA2CompactLesson({
    slug: 'dzis-rano-kupilam-pomidory', title: { de: 'Heute Morgen gekauft', en: 'Bought this morning' },
    situation: { de: 'Der Händler fragt, ob du noch Tomaten brauchst. Du erklärst, dass du sie heute Morgen schon gekauft hast.', en: 'The vendor asks whether you still need tomatoes. Explain that you already bought them this morning.' },
    pedagogicalGoal: 'Mit kupiłam und dziś rano einen Kauf am selben Tag zeitlich einordnen.',
    targetText: 'Dziś rano kupiłam pomidory na targu.', baseText: { de: 'Heute Morgen habe ich Tomaten auf dem Markt gekauft.', en: 'This morning I bought tomatoes at the market.' },
    chunks: [{ targetText: 'Dziś rano', baseText: { de: 'Heute Morgen', en: 'This morning' } }, { targetText: 'kupiłam pomidory', baseText: { de: 'habe ich Tomaten gekauft', en: 'I bought tomatoes' } }, { targetText: 'na targu.', baseText: { de: 'auf dem Markt.', en: 'at the market.' } }],
    terms: [{ targetText: 'kupiłam', baseText: { de: 'ich habe gekauft (Frau; Mann: kupiłem)', en: 'I bought (female; male: kupiłem)' }, alsoAccept: ['kupiłem'] }, { targetText: 'dziś rano', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: 'pomidory', baseText: { de: 'Tomaten', en: 'tomatoes' } }, { targetText: 'na targu', baseText: { de: 'auf dem Markt', en: 'at the market' } }, { targetText: 'targu', baseText: { de: 'Markt im Lokativ', en: 'market in the locative' } }],
    recall: { before: 'Dziś rano kupiłam ', answer: 'pomidory', after: ' na targu.', fallbackChoices: ['pomidory', 'ogórki', 'ziemniaki', 'banany'] }, speakRequired: ['rano', 'pomidory', 'targu'],
    sceneCaption: { de: 'Der Händler zeigt auf eine Kiste Tomaten und fragt: „Podać jeszcze pomidory?”', en: 'The vendor points to a crate of tomatoes and asks: “Podać jeszcze pomidory?”' },
    trophyWord: { word: 'pomidory', meaning: { de: 'Tomaten', en: 'tomatoes' }, example: 'Pomidory z porannego targu są czerwone.', whyThisWord: { de: 'Pomidory sind der konkrete Einkauf, an dem du kupiłam mit einer nahen Zeitangabe übst.', en: 'Pomidory are the concrete purchase used to practice kupiłam with a recent time marker.' } },
    distractors: ['świeże ogórki rano', 'kilogram cebuli'], placeholderCaption: { de: 'Eine Tüte Tomaten vom Morgen steht neben einer vollen Marktkiste.', en: 'A bag of tomatoes from the morning sits beside a full market crate.' }, songMood: 'a bright morning market memory with ripe red tomatoes', visualNotes: 'Produce stall, red tomatoes, morning light, reusable bag showing the purchase is already done.',
  }),
  makePolishA2CompactLesson({
    slug: 'wczesniej-zrobilam-zakupy', title: { de: 'Die Einkäufe sind erledigt', en: 'Shopping done earlier' },
    situation: { de: 'Die Verkäuferin bietet weitere Ware an. Du sagst, dass du deine Einkäufe früher erledigt hast und jetzt nichts brauchst.', en: 'The vendor offers more goods. Say that you did your shopping earlier and need nothing now.' },
    pedagogicalGoal: 'Mit zrobiłam zakupy eine erledigte Besorgung ausdrücken und korrekt mit niczego verneinen.',
    targetText: 'Wcześniej zrobiłam zakupy, teraz niczego nie potrzebuję.', baseText: { de: 'Ich habe die Einkäufe vorhin schon erledigt, jetzt brauche ich nichts mehr.', en: 'I did my shopping earlier; now I do not need anything.' },
    chunks: [{ targetText: 'Wcześniej', baseText: { de: 'Früher', en: 'Earlier' } }, { targetText: 'zrobiłam zakupy,', baseText: { de: 'habe ich die Einkäufe erledigt,', en: 'I did my shopping,' } }, { targetText: 'teraz', baseText: { de: 'jetzt', en: 'now' } }, { targetText: 'niczego nie potrzebuję.', baseText: { de: 'brauche ich nichts.', en: 'I do not need anything.' } }],
    terms: [{ targetText: 'zrobiłam', baseText: { de: 'ich habe gemacht (Frau; Mann: zrobiłem)', en: 'I did (female; male: zrobiłem)' }, alsoAccept: ['zrobiłem'] }, { targetText: 'zrobiłam zakupy', baseText: { de: 'ich habe die Einkäufe erledigt', en: 'I did the shopping' }, alsoAccept: ['zrobiłem zakupy'] }, { targetText: 'zakupy', baseText: { de: 'Einkäufe', en: 'shopping' } }, { targetText: 'wcześniej', baseText: { de: 'früher, vorher', en: 'earlier' } }, { targetText: 'niczego nie potrzebuję', baseText: { de: 'ich brauche nichts', en: 'I do not need anything' } }],
    recall: { before: 'Wcześniej zrobiłam ', answer: 'zakupy', after: ', teraz niczego nie potrzebuję.', fallbackChoices: ['zakupy', 'zdjęcia', 'notatki', 'kanapki'] }, speakRequired: ['zakupy', 'teraz', 'potrzebuję'],
    sceneCaption: { de: 'Die Verkäuferin deutet auf die übrigen Kisten und fragt: „Co jeszcze podać?”', en: 'The vendor gestures to the remaining crates and asks: “Co jeszcze podać?”' },
    trophyWord: { word: 'zakupy', meaning: { de: 'Einkäufe, Shopping', en: 'shopping, purchases' }, example: 'Zakupy są już w torbie.', whyThisWord: { de: 'Zakupy fassen die frühere Besorgung zusammen und machen deine höfliche Ablehnung nachvollziehbar.', en: 'Zakupy sums up the earlier errand and makes your polite refusal easy to understand.' } },
    distractors: ['listę na jutro', 'warzywa z targu'], placeholderCaption: { de: 'Eine gefüllte Einkaufstasche steht neben dem Marktstand, weitere Kisten bleiben unberührt.', en: 'A full shopping bag stands beside the stall while the remaining crates are untouched.' }, songMood: 'an errand already complete and a market offer gently declined', visualNotes: 'Market aisle, full reusable bag, vendor offering another crate, customer signaling the shopping is done.',
  }),
  makePolishA2CompactLesson({
    slug: 'wczoraj-spalam-zle-dzis-lepiej', title: { de: 'Heute besser', en: 'Better today' },
    situation: { de: 'Beim Frühstück fragt das Hotelpersonal nach deiner Nacht. Du sagst, dass du schlecht geschlafen hast, dich heute aber besser fühlst.', en: 'At breakfast, hotel staff asks about your night. Say that you slept badly but feel better today.' },
    pedagogicalGoal: 'Die vergangene Form spałam mit einem gegenwärtigen Befinden kontrastieren.',
    targetText: 'Wczoraj źle spałam, ale dziś czuję się lepiej.', baseText: { de: 'Gestern habe ich schlecht geschlafen, aber heute fühle ich mich besser.', en: 'I slept badly yesterday, but today I feel better.' },
    chunks: [{ targetText: 'Wczoraj źle spałam,', baseText: { de: 'Gestern habe ich schlecht geschlafen,', en: 'I slept badly yesterday,' } }, { targetText: 'ale dziś', baseText: { de: 'aber heute', en: 'but today' } }, { targetText: 'czuję się lepiej.', baseText: { de: 'fühle ich mich besser.', en: 'I feel better.' } }],
    terms: [{ targetText: 'spałam', baseText: { de: 'ich habe geschlafen (Frau; Mann: spałem)', en: 'I slept (female; male: spałem)' }, alsoAccept: ['spałem'] }, { targetText: 'wczoraj', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'źle', baseText: { de: 'schlecht', en: 'badly' } }, { targetText: 'czuję się', baseText: { de: 'ich fühle mich', en: 'I feel' } }, { targetText: 'dziś', baseText: { de: 'heute', en: 'today' } }, { targetText: 'lepiej', baseText: { de: 'besser', en: 'better' } }],
    recall: { before: 'Wczoraj źle spałam, ale dziś czuję się ', answer: 'lepiej', after: '.', fallbackChoices: ['lepiej', 'gorzej', 'spokojniej', 'wolniej'] }, speakRequired: ['wczoraj', 'dziś', 'lepiej'],
    sceneCaption: { de: 'Die Mitarbeiterin stellt Tee auf den Frühstückstisch und fragt: „Jak minęła noc?”', en: 'The staff member sets tea on the breakfast table and asks: “Jak minęła noc?”' },
    trophyWord: { word: 'czuję', meaning: { de: 'ich fühle', en: 'I feel' }, example: 'Dziś czuję się znacznie lepiej.', whyThisWord: { de: 'Czuję verbindet die schlechte Nacht mit deinem besseren Zustand am heutigen Morgen.', en: 'Czuję connects the bad night with your improved state this morning.' } },
    distractors: ['rano piję herbatę', 'teraz potrzebuję ciszy'], placeholderCaption: { de: 'Am Frühstückstisch steht Tee neben einem zerknitterten Kissen vom Vorabend.', en: 'Tea sits on the breakfast table beside a rumpled pillow from the night before.' }, songMood: 'a tired night giving way to a gentler morning', visualNotes: 'Hotel breakfast room, tea, soft morning light, tired memory easing into visible relief.',
  }),
  makePolishA2CompactLesson({
    slug: 'juz-sprobowalam-lokalnego-dania', title: { de: 'Schon probiert', en: 'Already tried it' },
    situation: { de: 'Die Kellnerin fragt, ob das lokale Gericht neu für dich ist. Du sagst, dass du es probiert hast und wirklich magst.', en: 'The server asks whether the local dish is new to you. Say that you have tried it and genuinely like it.' },
    pedagogicalGoal: 'Mit spróbowałam eine erste Erfahrung nennen und sie im Präsens bewerten.',
    targetText: 'Już spróbowałam lokalnego dania i naprawdę mi smakuje.', baseText: { de: 'Ich habe das lokale Gericht schon probiert und es schmeckt mir wirklich.', en: 'I already tried the local dish, and I really like it.' },
    chunks: [{ targetText: 'Już spróbowałam', baseText: { de: 'Ich habe schon probiert', en: 'I already tried' } }, { targetText: 'lokalnego dania', baseText: { de: 'das lokale Gericht', en: 'the local dish' } }, { targetText: 'i naprawdę mi smakuje.', baseText: { de: 'und es schmeckt mir wirklich.', en: 'and I really like it.' } }],
    terms: [{ targetText: 'spróbowałam', baseText: { de: 'ich habe probiert (Frau; Mann: spróbowałem)', en: 'I tried (female; male: spróbowałem)' }, alsoAccept: ['spróbowałem'] }, { targetText: 'lokalnego dania', baseText: { de: 'des lokalen Gerichts', en: 'of the local dish' } }, { targetText: 'dania', baseText: { de: 'Gericht im Genitiv', en: 'dish in the genitive' } }, { targetText: 'naprawdę', baseText: { de: 'wirklich', en: 'really' } }, { targetText: 'mi smakuje', baseText: { de: 'es schmeckt mir', en: 'I like the taste' } }],
    recall: { before: 'Już spróbowałam lokalnego dania i ', answer: 'naprawdę', after: ' mi smakuje.', fallbackChoices: ['naprawdę', 'prawie', 'zwykle', 'osobno'] }, speakRequired: ['lokalnego', 'dania', 'naprawdę'],
    sceneCaption: { de: 'Die Kellnerin zeigt auf den regionalen Teller und fragt: „Czy próbuje pani tego dania pierwszy raz?”', en: 'The server points to the regional plate and asks: “Czy próbuje pani tego dania pierwszy raz?”' },
    trophyWord: { word: 'naprawdę', meaning: { de: 'wirklich', en: 'really' }, example: 'To danie naprawdę mi smakuje.', whyThisWord: { de: 'Naprawdę macht aus der bloßen Kostprobe ein ehrliches positives Urteil über das lokale Gericht.', en: 'Naprawdę turns a simple tasting into a sincere positive judgment about the local dish.' } },
    distractors: ['zupę na początek', 'pierogi bez mięsa'], placeholderCaption: { de: 'Ein regionales Gericht steht halb probiert vor einer erwartungsvoll wartenden Kellnerin.', en: 'A regional dish sits partly tasted while the server waits for the verdict.' }, songMood: 'a first local taste turning into genuine delight', visualNotes: 'Polish restaurant, regional plate, server watching for a reaction, diner visibly pleased after tasting.',
  }),
  makePolishA2CompactLesson({
    slug: 'jeszcze-nie-zobaczylam-starego-miasta', title: { de: 'Noch nicht gesehen', en: 'Not seen yet' },
    situation: { de: 'In der Touristeninformation wird nach der Altstadt gefragt. Du sagst, dass du sie noch nicht gesehen hast und eine gute Route suchst.', en: 'At tourist information, the old town comes up. Say that you have not seen it yet and are looking for a good route.' },
    pedagogicalGoal: 'Mit jeszcze nie zobaczyłam eine ausstehende Erfahrung und mit szukam den nächsten Schritt ausdrücken.',
    targetText: 'Jeszcze nie zobaczyłam starego miasta, szukam dobrej trasy.', baseText: { de: 'Ich habe die Altstadt noch nicht gesehen und suche eine gute Route.', en: 'I have not seen the old town yet, and I am looking for a good route.' },
    chunks: [{ targetText: 'Jeszcze nie zobaczyłam', baseText: { de: 'Ich habe noch nicht gesehen', en: 'I have not seen yet' } }, { targetText: 'starego miasta,', baseText: { de: 'die Altstadt,', en: 'the old town,' } }, { targetText: 'szukam dobrej trasy.', baseText: { de: 'ich suche eine gute Route.', en: 'I am looking for a good route.' } }],
    terms: [{ targetText: 'zobaczyłam', baseText: { de: 'ich habe gesehen (Frau; Mann: zobaczyłem)', en: 'I saw (female; male: zobaczyłem)' }, alsoAccept: ['zobaczyłem'] }, { targetText: 'jeszcze nie', baseText: { de: 'noch nicht', en: 'not yet' } }, { targetText: 'starego miasta', baseText: { de: 'die Altstadt im Genitiv nach der Verneinung', en: 'the old town in the genitive after negation' } }, { targetText: 'szukam', baseText: { de: 'ich suche', en: 'I am looking for' } }, { targetText: 'dobrej trasy', baseText: { de: 'einer guten Route', en: 'a good route' } }, { targetText: 'trasy', baseText: { de: 'Route im Genitiv', en: 'route in the genitive' } }],
    recall: { before: 'Jeszcze nie zobaczyłam starego miasta, szukam dobrej ', answer: 'trasy', after: '.', fallbackChoices: ['trasy', 'pogody', 'kolacji', 'naprawy'] }, speakRequired: ['jeszcze', 'miasta', 'trasy'],
    sceneCaption: { de: 'Die Mitarbeiterin legt einen Altstadtplan auf den Schalter und fragt: „Czy stare miasto jest już w planie?”', en: 'The staff member lays an old-town map on the counter and asks: “Czy stare miasto jest już w planie?”' },
    trophyWord: { word: 'trasy', meaning: { de: 'Route im Genitiv', en: 'route in the genitive' }, example: 'Szukam krótkiej trasy przez stare miasto.', whyThisWord: { de: 'Trasy benennt die konkrete Hilfe, die du nach der noch ausstehenden Besichtigung brauchst.', en: 'Trasy names the concrete help you need after saying the visit is still outstanding.' } },
    distractors: ['mapę z muzeami', 'bilet na tramwaj'], placeholderCaption: { de: 'Ein Altstadtplan liegt ungefaltet auf dem Informationsschalter, die Route ist noch offen.', en: 'An old-town map lies unfolded on the information counter with the route still undecided.' }, songMood: 'an unvisited old town opening into a new walking route', visualNotes: 'Tourist information desk, old-town map, route pencil poised, historic rooftops visible outside.',
  }),
  makePolishA2CompactLesson({
    slug: 'bylam-wczoraj-w-muzeum', title: { de: 'Gestern im Museum', en: 'At the museum yesterday' },
    situation: { de: 'Die Mitarbeiterin der Touristeninformation fragt nach deinem gestrigen Plan. Du nennst das Museum und dein heutiges Ziel.', en: 'The tourist-information clerk asks about yesterday’s plan. Name the museum and today’s destination.' },
    pedagogicalGoal: 'Mit byłam einen vergangenen Aufenthaltsort nennen und ihn einem heutigen Plan gegenüberstellen.',
    targetText: 'Byłam wczoraj w muzeum, dziś zwiedzam stare miasto.', baseText: { de: 'Ich war gestern im Museum, heute besichtige ich die Altstadt.', en: 'I was at the museum yesterday; today I am touring the old town.' },
    chunks: [{ targetText: 'Byłam wczoraj w muzeum,', baseText: { de: 'Ich war gestern im Museum,', en: 'I was at the museum yesterday,' } }, { targetText: 'dziś zwiedzam', baseText: { de: 'heute besichtige ich', en: 'today I am touring' } }, { targetText: 'stare miasto.', baseText: { de: 'die Altstadt.', en: 'the old town.' } }],
    terms: [{ targetText: 'byłam', baseText: { de: 'ich war (Frau; Mann: byłem)', en: 'I was (female; male: byłem)' }, alsoAccept: ['byłem'] }, { targetText: 'w muzeum', baseText: { de: 'im Museum', en: 'at the museum' } }, { targetText: 'muzeum', baseText: { de: 'Museum', en: 'museum' } }, { targetText: 'dziś', baseText: { de: 'heute', en: 'today' } }, { targetText: 'zwiedzam', baseText: { de: 'besichtigen', en: 'to tour, to sightsee' } }, { targetText: 'stare miasto', baseText: { de: 'Altstadt', en: 'old town' } }],
    recall: { before: 'Byłam wczoraj w ', answer: 'muzeum', after: ', dziś zwiedzam stare miasto.', fallbackChoices: ['muzeum', 'teatrze', 'parku', 'centrum'] }, speakRequired: ['wczoraj', 'muzeum', 'zwiedzam'],
    sceneCaption: { de: 'Die Mitarbeiterin blickt auf deinen kleinen Wochenplan und fragt: „A wczoraj? Muzeum czy stare miasto?”', en: 'The staff member looks at your small weekly plan and asks: “A wczoraj? Muzeum czy stare miasto?”' },
    trophyWord: { word: 'muzeum', meaning: { de: 'Museum', en: 'museum' }, example: 'Muzeum jest blisko starego miasta.', whyThisWord: { de: 'Muzeum verankert byłam an einem klaren Ort und macht den Wechsel zum heutigen Plan verständlich.', en: 'Muzeum anchors byłam to a clear place and makes the shift to today’s plan easy to follow.' } },
    distractors: ['na rynku rano', 'w hotelowej kawiarni'], placeholderCaption: { de: 'Auf einem Wochenplan ist das Museum gestern und die Altstadt heute markiert.', en: 'A weekly plan marks the museum yesterday and the old town today.' }, songMood: 'two days of exploring linked by a simple city memory', visualNotes: 'Tourist desk, weekly planner, museum ticket under yesterday and old-town map under today.',
  }),
  makePolishA2CompactLesson({
    slug: 'w-tym-tygodniu-zrobilam-duzo', title: { de: 'Eine volle Woche', en: 'A full week' },
    situation: { de: 'Der Händler fragt, wie deine Woche läuft. Du fasst sie kurz zusammen und sagst, dass du dich jetzt ausruhst.', en: 'The vendor asks how your week is going. Sum it up briefly and say that you are resting now.' },
    pedagogicalGoal: 'Mit w tym tygodniu und zrobiłam eine kurze Wochenbilanz ziehen.',
    targetText: 'W tym tygodniu zrobiłam dużo, teraz odpoczywam.', baseText: { de: 'Diese Woche habe ich viel gemacht, jetzt ruhe ich mich aus.', en: 'I did a lot this week, and now I am resting.' },
    chunks: [{ targetText: 'W tym tygodniu', baseText: { de: 'In dieser Woche', en: 'This week' } }, { targetText: 'zrobiłam dużo,', baseText: { de: 'habe ich viel gemacht,', en: 'I did a lot,' } }, { targetText: 'teraz odpoczywam.', baseText: { de: 'jetzt ruhe ich mich aus.', en: 'now I am resting.' } }],
    terms: [{ targetText: 'zrobiłam', baseText: { de: 'ich habe gemacht (Frau; Mann: zrobiłem)', en: 'I did (female; male: zrobiłem)' }, alsoAccept: ['zrobiłem'] }, { targetText: 'w tym tygodniu', baseText: { de: 'in dieser Woche', en: 'this week' } }, { targetText: 'dużo', baseText: { de: 'viel', en: 'a lot' } }, { targetText: 'teraz', baseText: { de: 'jetzt', en: 'now' } }, { targetText: 'odpoczywam', baseText: { de: 'ich ruhe mich aus', en: 'I am resting' } }],
    recall: { before: 'W tym tygodniu zrobiłam ', answer: 'dużo', after: ', teraz odpoczywam.', fallbackChoices: ['dużo', 'mało', 'niewiele', 'wszystko'] }, speakRequired: ['tygodniu', 'dużo', 'odpoczywam'],
    sceneCaption: { de: 'Der Händler schiebt die Kiste beiseite und fragt: „Jak mija ten tydzień?”', en: 'The vendor moves the crate aside and asks: “Jak mija ten tydzień?”' },
    trophyWord: { word: 'odpoczywam', meaning: { de: 'ich ruhe mich aus', en: 'I am resting' }, example: 'Po zakupach odpoczywam w parku.', whyThisWord: { de: 'Odpoczywam beendet die Wochenbilanz mit deinem gegenwärtigen Zustand statt mit einer weiteren vergangenen Handlung.', en: 'Odpoczywam ends the weekly recap with your present state rather than another past action.' } },
    distractors: ['jutro mam spotkanie', 'rano robię zakupy'], placeholderCaption: { de: 'Eine volle Einkaufstasche steht neben einer Bank, auf der nun Zeit zum Ausruhen ist.', en: 'A full shopping bag rests beside a bench where there is finally time to relax.' }, songMood: 'a busy week resolving into a slow moment of rest', visualNotes: 'Market edge, packed bag, nearby bench, late-afternoon calm after several completed errands.',
  }),
]

export const POLISH_A2_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_THREE_METADATA, polishA2Practical3Inputs,
  { de: 'Du hast Polnisch A2 Praxis 3 abgeschlossen und kannst erste vergangene Handlungen mit klaren Zeitangaben ausdrücken.', en: 'You have completed Polish A2 Practical 3 and can express first past actions with clear time markers.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_FOUR_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-4', title: 'Polnisch A2 Praxis 4', shortTitle: 'A2 Praxis 4',
  subtitle: { de: 'Pläne mit einem Freund machen und Änderungen klar absprechen', en: 'Making plans with a friend and agreeing on changes clearly' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical4Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'chetnie-spotkamy-sie-o-szostej', title: { de: 'Gern um sechs', en: 'Gladly at six' },
    situation: { de: 'Dein Freund lädt dich am Freitag auf einen Kaffee ein. Du nimmst an und schlägst gleich eine Uhrzeit vor.', en: 'Your friend invites you for coffee on Friday. Accept and suggest a time right away.' },
    pedagogicalGoal: 'Eine Einladung mit chętnie annehmen und mit spotkamy się eine konkrete Uhrzeit vorschlagen.',
    targetText: 'Chętnie. Spotkamy się w piątek o szóstej?', baseText: { de: 'Gern. Treffen wir uns am Freitag um sechs?', en: 'I’d love to. Shall we meet at six on Friday?' },
    chunks: [{ targetText: 'Chętnie.', baseText: { de: 'Gern.', en: 'Gladly.' } }, { targetText: 'Spotkamy się w piątek', baseText: { de: 'Treffen wir uns am Freitag', en: 'Shall we meet on Friday' } }, { targetText: 'o szóstej?', baseText: { de: 'um sechs?', en: 'at six?' } }],
    terms: [{ targetText: 'chętnie', baseText: { de: 'gern', en: 'gladly' } }, { targetText: 'spotkamy się', baseText: { de: 'wir treffen uns', en: 'we will meet' } }, { targetText: 'w piątek', baseText: { de: 'am Freitag', en: 'on Friday' } }, { targetText: 'o szóstej', baseText: { de: 'um sechs', en: 'at six' } }, { targetText: 'szóstej', baseText: { de: 'sechs Uhr nach o', en: 'six o’clock after o' } }],
    recall: { before: 'Chętnie. Spotkamy się w piątek o ', answer: 'szóstej', after: '?', fallbackChoices: ['szóstej', 'siódmej', 'ósmej', 'dziewiątej'] }, speakRequired: ['chętnie', 'piątek', 'szóstej'],
    sceneCaption: { de: 'Dein Freund lächelt und fragt: „Masz czas na kawę w piątek?”', en: 'Your friend smiles and asks: “Masz czas na kawę w piątek?”' },
    trophyWord: { word: 'chętnie', meaning: { de: 'gern', en: 'gladly' }, example: 'Chętnie spotkam się z tobą po pracy.', whyThisWord: { de: 'Chętnie macht deine Zusage zur Kaffeeeinladung freundlich und eindeutig.', en: 'Chętnie makes your acceptance of the coffee invitation friendly and clear.' } },
    distractors: ['dzisiaj przy kasie', 'nie mam chwili'], placeholderCaption: { de: 'Zwei Kaffeetassen stehen neben einem Kalender mit Freitag und sechs Uhr.', en: 'Two coffee cups sit beside a calendar marked Friday at six.' }, songMood: 'an easy coffee invitation turning into a definite Friday plan', visualNotes: 'Friendly neighborhood cafe, two cups, Friday circled on a pocket calendar, relaxed agreement.',
  }),
  makePolishA2CompactLesson({
    slug: 'jutro-pojde-do-muzeum', title: { de: 'Morgen ins Museum', en: 'The museum tomorrow' },
    situation: { de: 'Dein Freund fragt nach deinem Plan für morgen nach der Arbeit. Du nennst deinen Museumsbesuch.', en: 'Your friend asks about your plan for tomorrow after work. Tell them about your museum visit.' },
    pedagogicalGoal: 'Mit pójdę eine einfache, abgeschlossene Zukunftsabsicht und mit do ein Ziel ausdrücken.',
    targetText: 'Jutro pójdę do muzeum po pracy.', baseText: { de: 'Morgen gehe ich nach der Arbeit ins Museum.', en: 'Tomorrow I will go to the museum after work.' },
    chunks: [{ targetText: 'Jutro pójdę', baseText: { de: 'Morgen gehe ich', en: 'Tomorrow I will go' } }, { targetText: 'do muzeum', baseText: { de: 'ins Museum', en: 'to the museum' } }, { targetText: 'po pracy.', baseText: { de: 'nach der Arbeit.', en: 'after work.' } }],
    terms: [{ targetText: 'pójdę', baseText: { de: 'ich werde gehen', en: 'I will go' } }, { targetText: 'jutro', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'do muzeum', baseText: { de: 'ins Museum', en: 'to the museum' } }, { targetText: 'po pracy', baseText: { de: 'nach der Arbeit', en: 'after work' } }, { targetText: 'muzeum', baseText: { de: 'Museum', en: 'museum' } }],
    recall: { before: 'Jutro pójdę do ', answer: 'muzeum', after: ' po pracy.', fallbackChoices: ['muzeum', 'kina', 'parku', 'teatru'] }, speakRequired: ['jutro', 'muzeum', 'pracy'],
    sceneCaption: { de: 'Dein Freund zeigt auf den morgigen Tag und fragt: „Co zrobisz jutro po pracy?”', en: 'Your friend points to tomorrow and asks: “Co zrobisz jutro po pracy?”' },
    trophyWord: { word: 'pójdę', meaning: { de: 'ich werde gehen', en: 'I will go' }, example: 'Pójdę do muzeum po południu.', whyThisWord: { de: 'Pójdę setzt deinen Museumsbesuch als klaren nächsten Schritt in die Zukunft.', en: 'Pójdę places your museum visit clearly in the future as your next step.' } },
    distractors: ['zostaję dziś w domu', 'wczoraj przy rynku'], placeholderCaption: { de: 'Ein Museumsprospekt liegt auf einem Kalenderblatt für morgen nach Feierabend.', en: 'A museum leaflet rests on tomorrow’s calendar page after working hours.' }, songMood: 'a quiet plan for culture after the next workday', visualNotes: 'Museum brochure, work bag, tomorrow highlighted on a small calendar, late-afternoon city light.',
  }),
  makePolishA2CompactLesson({
    slug: 'moze-pojdziemy-do-kina', title: { de: 'Freitag ins Kino?', en: 'Cinema on Friday?' },
    situation: { de: 'Dein Freund hat am Freitagabend Zeit und fragt, was ihr machen könnt. Du schlägst das Kino vor.', en: 'Your friend is free on Friday evening and asks what you could do. Suggest the cinema.' },
    pedagogicalGoal: 'Mit może und pójdziemy einen gemeinsamen Plan als lockeren Vorschlag formulieren.',
    targetText: 'Może pójdziemy do kina w piątek?', baseText: { de: 'Vielleicht gehen wir am Freitag ins Kino?', en: 'Maybe we could go to the cinema on Friday?' },
    chunks: [{ targetText: 'Może pójdziemy', baseText: { de: 'Vielleicht gehen wir', en: 'Maybe we could go' } }, { targetText: 'do kina', baseText: { de: 'ins Kino', en: 'to the cinema' } }, { targetText: 'w piątek?', baseText: { de: 'am Freitag?', en: 'on Friday?' } }],
    terms: [{ targetText: 'może', baseText: { de: 'vielleicht', en: 'maybe' } }, { targetText: 'pójdziemy', baseText: { de: 'wir werden gehen', en: 'we will go' } }, { targetText: 'do kina', baseText: { de: 'ins Kino', en: 'to the cinema' } }, { targetText: 'kino', baseText: { de: 'Kino', en: 'cinema' } }, { targetText: 'w piątek', baseText: { de: 'am Freitag', en: 'on Friday' } }],
    recall: { before: 'Może ', answer: 'pójdziemy', after: ' do kina w piątek?', fallbackChoices: ['pójdziemy', 'zjemy', 'kupimy', 'wypijemy'] }, speakRequired: ['pójdziemy', 'kina', 'piątek'],
    sceneCaption: { de: 'Dein Freund steckt das Handy weg und fragt: „W piątek wieczorem mam czas. Co robimy?”', en: 'Your friend puts away their phone and asks: “W piątek wieczorem mam czas. Co robimy?”' },
    trophyWord: { word: 'kina', meaning: { de: 'ins Kino; des Kinos', en: 'to the cinema; of the cinema' }, example: 'Do kina pójdziemy po kolacji.', whyThisWord: { de: 'Kina gibt eurem freien Freitagabend ein konkretes gemeinsames Ziel.', en: 'Kina gives your free Friday evening a concrete shared destination.' } },
    distractors: ['zostańmy rano w domu', 'tramwajem do pracy'], placeholderCaption: { de: 'Ein Kinoprogramm liegt zwischen zwei Freunden, der Freitagabend ist markiert.', en: 'A cinema listing lies between two friends with Friday evening highlighted.' }, songMood: 'a spontaneous Friday cinema plan between friends', visualNotes: 'Two friends at a table, cinema listings on a phone, Friday evening circled, upbeat anticipation.',
  }),
  makePolishA2CompactLesson({
    slug: 'spotkamy-sie-o-osmej-na-rynku', title: { de: 'Um acht auf dem Marktplatz', en: 'At eight in the market square' },
    situation: { de: 'Dein Freund fragt nach Ort und Uhrzeit für euren Kinoabend. Du legst beides fest.', en: 'Your friend asks for the time and place for your cinema evening. Set both details.' },
    pedagogicalGoal: 'Einen gemeinsamen Plan mit spotkamy się, o plus Uhrzeit und na rynku festlegen.',
    targetText: 'Spotkamy się o ósmej na rynku.', baseText: { de: 'Wir treffen uns um acht auf dem Marktplatz.', en: 'We will meet at eight in the market square.' },
    chunks: [{ targetText: 'Spotkamy się', baseText: { de: 'Wir treffen uns', en: 'We will meet' } }, { targetText: 'o ósmej', baseText: { de: 'um acht', en: 'at eight' } }, { targetText: 'na rynku.', baseText: { de: 'auf dem Marktplatz.', en: 'in the market square.' } }],
    terms: [{ targetText: 'spotkamy się', baseText: { de: 'wir treffen uns', en: 'we will meet' } }, { targetText: 'o ósmej', baseText: { de: 'um acht', en: 'at eight' } }, { targetText: 'na rynku', baseText: { de: 'auf dem Marktplatz', en: 'in the market square' } }, { targetText: 'ósmej', baseText: { de: 'acht Uhr nach o', en: 'eight o’clock after o' } }, { targetText: 'rynku', baseText: { de: 'Marktplatz im Lokativ', en: 'market square in the locative' } }],
    recall: { before: 'Spotkamy się o ', answer: 'ósmej', after: ' na rynku.', fallbackChoices: ['ósmej', 'szóstej', 'siódmej', 'dziewiątej'] }, speakRequired: ['spotkamy', 'ósmej', 'rynku'],
    sceneCaption: { de: 'Dein Freund öffnet den Stadtplan und fragt: „To gdzie i o której?”', en: 'Your friend opens the city map and asks: “To gdzie i o której?”' },
    trophyWord: { word: 'ósmej', meaning: { de: 'um acht', en: 'at eight' }, example: 'O ósmej rynek jest pełen ludzi.', whyThisWord: { de: 'Ósmej macht aus der losen Kinoidee eine Verabredung mit fester Uhrzeit.', en: 'Ósmej turns the loose cinema idea into an arrangement with a fixed time.' } },
    distractors: ['przy kinie rano', 'w domu po pracy'], placeholderCaption: { de: 'Eine Uhr zeigt acht, daneben ist der zentrale Marktplatz auf dem Plan markiert.', en: 'A clock shows eight beside the central market square marked on the map.' }, songMood: 'a city rendezvous fixed precisely in time and place', visualNotes: 'Evening market square, clock at eight, two route lines meeting at one central point.',
  }),
  makePolishA2CompactLesson({
    slug: 'mozemy-przelozyc-na-sobote', title: { de: 'Auf Samstag verschieben', en: 'Move it to Saturday' },
    situation: { de: 'Der Freitag passt doch nicht, aber dein Freund hat am Samstag Zeit. Du schlägst vor, das Treffen zu verschieben.', en: 'Friday no longer works, but your friend is free on Saturday. Suggest moving the meeting.' },
    pedagogicalGoal: 'Eine Planänderung mit możemy przełożyć und na plus Wochentag vorschlagen.',
    targetText: 'Możemy przełożyć spotkanie na sobotę?', baseText: { de: 'Können wir das Treffen auf Samstag verschieben?', en: 'Can we move the meeting to Saturday?' },
    chunks: [{ targetText: 'Możemy', baseText: { de: 'Können wir', en: 'Can we' } }, { targetText: 'przełożyć spotkanie', baseText: { de: 'das Treffen verschieben', en: 'move the meeting' } }, { targetText: 'na sobotę?', baseText: { de: 'auf Samstag?', en: 'to Saturday?' } }],
    terms: [{ targetText: 'możemy', baseText: { de: 'wir können', en: 'we can' } }, { targetText: 'przełożyć', baseText: { de: 'verschieben', en: 'reschedule' } }, { targetText: 'spotkanie', baseText: { de: 'Treffen', en: 'meeting' } }, { targetText: 'na sobotę', baseText: { de: 'auf Samstag', en: 'to Saturday' } }, { targetText: 'sobotę', baseText: { de: 'Samstag nach na', en: 'Saturday after na' } }],
    recall: { before: 'Możemy ', answer: 'przełożyć', after: ' spotkanie na sobotę?', fallbackChoices: ['przełożyć', 'zostawić', 'zacząć', 'otworzyć'] }, speakRequired: ['możemy', 'przełożyć', 'sobotę'],
    sceneCaption: { de: 'Dein Freund prüft den Kalender und sagt: „W sobotę też mam czas. Co wolisz?”', en: 'Your friend checks the calendar and says: “W sobotę też mam czas. Co wolisz?”' },
    trophyWord: { word: 'przełożyć', meaning: { de: 'verschieben', en: 'reschedule' }, example: 'Możemy przełożyć spotkanie na sobotę.', whyThisWord: { de: 'Przełożyć rettet euren Plan, ohne dass ihr das Treffen ganz absagen müsst.', en: 'Przełożyć saves the plan without making you cancel the meeting altogether.' } },
    distractors: ['spotkanie w niedzielę', 'zostać do piątku'], placeholderCaption: { de: 'Ein Kalendereintrag wandert mit einem Pfeil von Freitag auf Samstag.', en: 'A calendar entry moves along an arrow from Friday to Saturday.' }, songMood: 'a flexible plan shifting neatly to a better day', visualNotes: 'Shared calendar, Friday crossed lightly, Saturday circled, two friends agreeing over the change.',
  }),
  makePolishA2CompactLesson({
    slug: 'nie-moge-bo-mam-duzo-pracy', title: { de: 'Heute klappt es nicht', en: 'I cannot today' },
    situation: { de: 'Dein Freund fragt, ob ihr euch heute Nachmittag trefft. Du sagst freundlich ab und nennst die Arbeit als Grund.', en: 'Your friend asks whether you are meeting this afternoon. Decline politely and give work as the reason.' },
    pedagogicalGoal: 'Mit nie mogę und einem kurzen bo-Grund eine heutige Verabredung höflich absagen.',
    targetText: 'Nie mogę dzisiaj, bo mam dużo pracy.', baseText: { de: 'Ich kann heute nicht, weil ich viel Arbeit habe.', en: 'I cannot today because I have a lot of work.' },
    chunks: [{ targetText: 'Nie mogę', baseText: { de: 'Ich kann nicht', en: 'I cannot' } }, { targetText: 'dzisiaj,', baseText: { de: 'heute,', en: 'today,' } }, { targetText: 'bo mam dużo pracy.', baseText: { de: 'weil ich viel Arbeit habe.', en: 'because I have a lot of work.' } }],
    terms: [{ targetText: 'nie mogę', baseText: { de: 'ich kann nicht', en: 'I cannot' } }, { targetText: 'dzisiaj', baseText: { de: 'heute', en: 'today' } }, { targetText: 'dużo pracy', baseText: { de: 'viel Arbeit', en: 'a lot of work' } }, { targetText: 'pracy', baseText: { de: 'Arbeit im Genitiv', en: 'work in the genitive' } }, { targetText: 'bo', baseText: { de: 'weil', en: 'because' } }],
    recall: { before: 'Nie mogę dzisiaj, bo mam dużo ', answer: 'pracy', after: '.', fallbackChoices: ['pracy', 'cukru', 'śniegu', 'mleka'] }, speakRequired: ['mogę', 'dzisiaj', 'pracy'],
    sceneCaption: { de: 'Dein Freund wartet auf eine Zusage und fragt: „Widzimy się dzisiaj po południu?”', en: 'Your friend waits for confirmation and asks: “Widzimy się dzisiaj po południu?”' },
    trophyWord: { word: 'pracy', meaning: { de: 'Arbeit im Genitiv', en: 'work in the genitive' }, example: 'Po pracy mam czas na kawę.', whyThisWord: { de: 'Pracy liefert einen einfachen, glaubwürdigen Grund für deine heutige Absage.', en: 'Pracy gives a simple, believable reason for declining today.' } },
    distractors: ['mogę po szóstej', 'spotkamy się na rynku'], placeholderCaption: { de: 'Ein voller Arbeitsplan liegt neben einer ungelesenen Einladung für den Nachmittag.', en: 'A full work schedule sits beside an unanswered invitation for the afternoon.' }, songMood: 'a friendly plan paused by one busy workday', visualNotes: 'Desk with a full task list, phone showing a friend’s invitation, calm apologetic response.',
  }),
  makePolishA2CompactLesson({
    slug: 'zapraszam-cie-na-kolacje', title: { de: 'Einladung zum Abendessen', en: 'Dinner invitation' },
    situation: { de: 'Dein Freund fragt nach eurem Sonntagabend. Du lädst ihn zum Abendessen ein.', en: 'Your friend asks about your Sunday evening. Invite them to dinner.' },
    pedagogicalGoal: 'Mit zapraszam cię na eine persönliche Einladung unter Freunden aussprechen.',
    targetText: 'Zapraszam cię na kolację w niedzielę.', baseText: { de: 'Ich lade dich am Sonntag zum Abendessen ein.', en: 'I am inviting you to dinner on Sunday.' },
    chunks: [{ targetText: 'Zapraszam cię', baseText: { de: 'Ich lade dich ein', en: 'I am inviting you' } }, { targetText: 'na kolację', baseText: { de: 'zum Abendessen', en: 'to dinner' } }, { targetText: 'w niedzielę.', baseText: { de: 'am Sonntag.', en: 'on Sunday.' } }],
    terms: [{ targetText: 'zapraszam', baseText: { de: 'ich lade ein', en: 'I invite' } }, { targetText: 'cię', baseText: { de: 'dich', en: 'you' } }, { targetText: 'na kolację', baseText: { de: 'zum Abendessen', en: 'to dinner' } }, { targetText: 'w niedzielę', baseText: { de: 'am Sonntag', en: 'on Sunday' } }, { targetText: 'kolację', baseText: { de: 'Abendessen im Akkusativ', en: 'dinner in the accusative' } }],
    recall: { before: '', answer: 'Zapraszam', after: ' cię na kolację w niedzielę.', fallbackChoices: ['Zapraszam', 'Czekam', 'Pytam', 'Wracam'] }, speakRequired: ['zapraszam', 'kolację', 'niedzielę'],
    sceneCaption: { de: 'Dein Freund schaut in den Wochenplan und fragt: „Co robimy w niedzielę wieczorem?”', en: 'Your friend looks at the weekly plan and asks: “Co robimy w niedzielę wieczorem?”' },
    trophyWord: { word: 'zapraszam', meaning: { de: 'ich lade ein', en: 'I invite' }, example: 'Zapraszam cię na kolację w domu.', whyThisWord: { de: 'Zapraszam macht dich selbst zum Gastgeber eures nächsten gemeinsamen Abends.', en: 'Zapraszam makes you the host of your next evening together.' } },
    distractors: ['spotkamy się rano', 'idziemy do kina'], placeholderCaption: { de: 'Zwei Teller und eine kleine Sonntagsnotiz liegen auf einem gedeckten Tisch.', en: 'Two plates and a small Sunday note sit on a dinner table.' }, songMood: 'a warm Sunday dinner invitation offered between friends', visualNotes: 'Cozy home table, two place settings, Sunday marked on a calendar, friendly anticipation.',
  }),
  makePolishA2CompactLesson({
    slug: 'spoznie-sie-piec-minut', title: { de: 'Fünf Minuten später', en: 'Five minutes late' },
    situation: { de: 'Dein Freund wartet am Treffpunkt und fragt, wo du bist. Du kündigst eine kurze Verspätung an.', en: 'Your friend is waiting at the meeting point and asks where you are. Tell them about a short delay.' },
    pedagogicalGoal: 'Mit spóźnię się und einer Minutenzahl eine kurze Verspätung ankündigen.',
    targetText: 'Spóźnię się o pięć minut, przepraszam.', baseText: { de: 'Ich verspäte mich um fünf Minuten, entschuldige.', en: 'I will be five minutes late, sorry.' },
    chunks: [{ targetText: 'Spóźnię się', baseText: { de: 'Ich verspäte mich', en: 'I will be late' } }, { targetText: 'o pięć minut,', baseText: { de: 'um fünf Minuten,', en: 'by five minutes,' } }, { targetText: 'przepraszam.', baseText: { de: 'entschuldige.', en: 'sorry.' } }],
    terms: [{ targetText: 'spóźnię się', baseText: { de: 'ich werde mich verspäten', en: 'I will be late' } }, { targetText: 'pięć minut', baseText: { de: 'fünf Minuten', en: 'five minutes' } }, { targetText: 'pięć', baseText: { de: 'fünf', en: 'five' } }, { targetText: 'minut', baseText: { de: 'Minuten nach einer Zahl', en: 'minutes after a number' } }, { targetText: 'przepraszam', baseText: { de: 'Entschuldigung', en: 'sorry' } }],
    recall: { before: '', answer: 'Spóźnię', after: ' się o pięć minut, przepraszam.', fallbackChoices: ['Spóźnię', 'Spotkam', 'Kupię', 'Zrobię'] }, speakRequired: ['spóźnię', 'pięć', 'minut'],
    sceneCaption: { de: 'Dein Freund schreibt vom Treffpunkt: „Gdzie jesteś?”', en: 'Your friend texts from the meeting point: “Gdzie jesteś?”' },
    trophyWord: { word: 'pięć', meaning: { de: 'fünf', en: 'five' }, example: 'Poczekaj pięć minut.', whyThisWord: { de: 'Pięć begrenzt die Verspätung auf eine kleine, konkrete Zeitspanne.', en: 'Pięć limits the delay to a small, concrete amount of time.' } },
    distractors: ['jestem już na rynku', 'wrócę za godzinę'], placeholderCaption: { de: 'Auf dem Handy steht eine kurze Nachricht, während die Uhr fünf Minuten Verzögerung zeigt.', en: 'A short message appears on the phone while the clock shows a five-minute delay.' }, songMood: 'a tiny delay handled with a quick honest message', visualNotes: 'Phone message, meeting point in view, clock shifted by five minutes, friend waiting calmly.',
  }),
  makePolishA2CompactLesson({
    slug: 'czyli-w-sobote-o-osmej', title: { de: 'Also Samstag um acht', en: 'So Saturday at eight' },
    situation: { de: 'Nach mehreren Änderungen nennt dein Freund Samstag, acht Uhr und den Marktplatz. Du bestätigst den neuen Plan vollständig.', en: 'After several changes, your friend names Saturday, eight o’clock, and the market square. Confirm the revised plan in full.' },
    pedagogicalGoal: 'Einen geänderten Plan mit czyli vollständig zurückspiegeln und mit tak bestätigen lassen.',
    targetText: 'Czyli w sobotę o ósmej na rynku, tak?', baseText: { de: 'Also am Samstag um acht auf dem Marktplatz, ja?', en: 'So Saturday at eight in the market square, right?' },
    chunks: [{ targetText: 'Czyli w sobotę', baseText: { de: 'Also am Samstag', en: 'So on Saturday' } }, { targetText: 'o ósmej', baseText: { de: 'um acht', en: 'at eight' } }, { targetText: 'na rynku, tak?', baseText: { de: 'auf dem Marktplatz, ja?', en: 'in the market square, right?' } }],
    terms: [{ targetText: 'czyli', baseText: { de: 'also, das heißt', en: 'so, that means' } }, { targetText: 'w sobotę', baseText: { de: 'am Samstag', en: 'on Saturday' } }, { targetText: 'o ósmej', baseText: { de: 'um acht', en: 'at eight' } }, { targetText: 'na rynku', baseText: { de: 'auf dem Marktplatz', en: 'in the market square' } }, { targetText: 'tak', baseText: { de: 'ja, richtig', en: 'yes, right' } }],
    recall: { before: '', answer: 'Czyli', after: ' w sobotę o ósmej na rynku, tak?', fallbackChoices: ['Czyli', 'Dlatego', 'Zawsze', 'Bardzo'] }, speakRequired: ['sobotę', 'ósmej', 'rynku'],
    sceneCaption: { de: 'Dein Freund fasst die Änderung zusammen: „Sobota, ósma, rynek.”', en: 'Your friend sums up the change: “Sobota, ósma, rynek.”' },
    trophyWord: { word: 'czyli', meaning: { de: 'also, das heißt', en: 'so, that means' }, example: 'Czyli mamy już plan.', whyThisWord: { de: 'Czyli zeigt, dass du alle drei geänderten Details richtig verstanden hast.', en: 'Czyli shows that you have understood all three revised details correctly.' } },
    distractors: ['w piątek po pracy', 'przy kinie o szóstej'], placeholderCaption: { de: 'Samstag, acht Uhr und der Marktplatz stehen gemeinsam in einer bestätigten Nachricht.', en: 'Saturday, eight o’clock, and the market square appear together in a confirmed message.' }, songMood: 'a changed plan clicking firmly into place', visualNotes: 'Text thread with three confirmed details, Saturday calendar tile, clock at eight, market-square pin.',
  }),
  makePolishA2CompactLesson({
    slug: 'w-weekend-zrobie-mala-wycieczke', title: { de: 'Ein kleiner Ausflug', en: 'A short trip' },
    situation: { de: 'Dein Freund fragt nach deinem Wochenendplan. Du erzählst von einem kurzen Ausflug aus der Stadt.', en: 'Your friend asks about your weekend plan. Tell them about a short trip out of town.' },
    pedagogicalGoal: 'Mit zrobię eine abgeschlossene Zukunftsabsicht für das Wochenende ausdrücken.',
    targetText: 'W weekend zrobię małą wycieczkę za miasto.', baseText: { de: 'Am Wochenende mache ich einen kleinen Ausflug ins Umland.', en: 'At the weekend I will take a short trip out of town.' },
    chunks: [{ targetText: 'W weekend', baseText: { de: 'Am Wochenende', en: 'At the weekend' } }, { targetText: 'zrobię małą wycieczkę', baseText: { de: 'mache ich einen kleinen Ausflug', en: 'I will take a short trip' } }, { targetText: 'za miasto.', baseText: { de: 'aus der Stadt.', en: 'out of town.' } }],
    terms: [{ targetText: 'zrobię', baseText: { de: 'ich werde machen', en: 'I will make' } }, { targetText: 'małą wycieczkę', baseText: { de: 'einen kleinen Ausflug', en: 'a short trip' } }, { targetText: 'wycieczkę', baseText: { de: 'Ausflug im Akkusativ', en: 'trip in the accusative' } }, { targetText: 'za miasto', baseText: { de: 'aus der Stadt hinaus', en: 'out of town' } }, { targetText: 'weekend', baseText: { de: 'Wochenende', en: 'weekend' } }],
    recall: { before: 'W weekend zrobię małą ', answer: 'wycieczkę', after: ' za miasto.', fallbackChoices: ['wycieczkę', 'kolację', 'rezerwację', 'kawę'] }, speakRequired: ['weekend', 'zrobię', 'wycieczkę'],
    sceneCaption: { de: 'Dein Freund schickt ein Foto aus der Umgebung und fragt: „Co zrobisz w weekend?”', en: 'Your friend sends a photo from the surrounding area and asks: “Co zrobisz w weekend?”' },
    trophyWord: { word: 'wycieczkę', meaning: { de: 'Ausflug im Akkusativ', en: 'trip in the accusative' }, example: 'W sobotę zrobię wycieczkę za miasto.', whyThisWord: { de: 'Wycieczkę gibt deinem Wochenende ein überschaubares, konkretes Ziel außerhalb der Stadt.', en: 'Wycieczkę gives your weekend a manageable, concrete destination beyond the city.' } },
    distractors: ['zostanę cały dzień', 'spotkamy się w kawiarni'], placeholderCaption: { de: 'Ein kleiner Rucksack liegt neben einer Karte mit einer kurzen Route aus der Stadt.', en: 'A small backpack lies beside a map showing a short route out of town.' }, songMood: 'a bright weekend escape just beyond the city', visualNotes: 'Small daypack, regional map, short route leaving town, open countryside in the distance.',
  }),
]

export const POLISH_A2_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_FOUR_METADATA, polishA2Practical4Inputs,
  { de: 'Du hast Polnisch A2 Praxis 4 abgeschlossen und kannst mit einem Freund Pläne machen, ändern und bestätigen.', en: 'You have completed Polish A2 Practical 4 and can make, change, and confirm plans with a friend.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_FIVE_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-5', title: 'Polnisch A2 Praxis 5', shortTitle: 'A2 Praxis 5',
  subtitle: { de: 'Im Service höflich korrigieren, ablehnen und Alternativen verlangen', en: 'Correcting, declining, and requesting alternatives politely in service situations' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical5Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'przepraszam-zamowilam-herbate', title: { de: 'Tee, nicht Kaffee', en: 'Tea, not coffee' },
    situation: { de: 'Der Kellner bringt Kaffee, obwohl du Tee bestellt hast. Du korrigierst die Bestellung ruhig und eindeutig.', en: 'The waiter brings coffee even though you ordered tea. Correct the order calmly and clearly.' },
    pedagogicalGoal: 'Mit przepraszam und zamówiłam eine falsche Bestellung höflich korrigieren.',
    targetText: 'Przepraszam, zamówiłam herbatę, nie kawę.', baseText: { de: 'Entschuldigung, ich habe Tee bestellt, nicht Kaffee.', en: 'Excuse me, I ordered tea, not coffee.' },
    chunks: [{ targetText: 'Przepraszam,', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } }, { targetText: 'zamówiłam herbatę,', baseText: { de: 'ich habe Tee bestellt,', en: 'I ordered tea,' } }, { targetText: 'nie kawę.', baseText: { de: 'nicht Kaffee.', en: 'not coffee.' } }],
    terms: [{ targetText: 'zamówiłam', baseText: { de: 'ich habe bestellt (Frau; Mann: zamówiłem)', en: 'I ordered (female; male: zamówiłem)' }, alsoAccept: ['zamówiłem'] }, { targetText: 'przepraszam', baseText: { de: 'Entschuldigung', en: 'excuse me' } }, { targetText: 'herbatę', baseText: { de: 'Tee im Akkusativ', en: 'tea in the accusative' } }, { targetText: 'nie kawę', baseText: { de: 'nicht Kaffee', en: 'not coffee' } }, { targetText: 'kawę', baseText: { de: 'Kaffee im Akkusativ', en: 'coffee in the accusative' } }],
    recall: { before: '', answer: 'Przepraszam', after: ', zamówiłam herbatę, nie kawę.', fallbackChoices: ['Przepraszam', 'Dziękuję', 'Oczywiście', 'Niestety'] }, speakRequired: ['przepraszam', 'herbatę', 'kawę'],
    sceneCaption: { de: 'Der Kellner stellt eine Tasse Kaffee hin und sagt: „Oto kawa.”', en: 'The waiter sets down a cup of coffee and says: “Oto kawa.”' },
    trophyWord: { word: 'przepraszam', meaning: { de: 'Entschuldigung', en: 'excuse me' }, example: 'Przepraszam, to nie jest moja kawa.', whyThisWord: { de: 'Przepraszam eröffnet die Korrektur höflich, bevor du den bestellten Tee nennst.', en: 'Przepraszam opens the correction politely before you name the tea you ordered.' } },
    distractors: ['poproszę jeszcze kawę', 'herbata jest zimna'], placeholderCaption: { de: 'Eine Kaffeetasse steht neben einem Bestellzettel, auf dem Tee markiert ist.', en: 'A coffee cup sits beside an order slip with tea marked on it.' }, songMood: 'a mistaken cafe order corrected without tension', visualNotes: 'Cafe table, coffee cup, order slip showing tea, waiter pausing to listen to the correction.',
  }),
  makePolishA2CompactLesson({
    slug: 'bluzka-za-mala-czy-mozna-zamienic', title: { de: 'Zu klein', en: 'Too small' },
    situation: { de: 'Die Verkäuferin fragt, ob die Bluse passt. Du sagst, dass sie zu klein ist, und bittest um einen Umtausch.', en: 'The shop assistant asks whether the blouse fits. Say it is too small and ask for an exchange.' },
    pedagogicalGoal: 'Eine Passform mit za mała bewerten und mit czy można ją zamienić höflich um Umtausch bitten.',
    targetText: 'Przepraszam, ta bluzka jest za mała. Czy można ją zamienić?', baseText: { de: 'Entschuldigung, diese Bluse ist zu klein. Kann man sie umtauschen?', en: 'Excuse me, this blouse is too small. Can it be exchanged?' },
    chunks: [{ targetText: 'Przepraszam,', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } }, { targetText: 'ta bluzka jest za mała.', baseText: { de: 'diese Bluse ist zu klein.', en: 'this blouse is too small.' } }, { targetText: 'Czy można ją zamienić?', baseText: { de: 'Kann man sie umtauschen?', en: 'Can it be exchanged?' } }],
    terms: [{ targetText: 'ta bluzka', baseText: { de: 'diese Bluse', en: 'this blouse' } }, { targetText: 'za mała', baseText: { de: 'zu klein', en: 'too small' } }, { targetText: 'czy można', baseText: { de: 'kann man', en: 'is it possible to' } }, { targetText: 'zamienić', baseText: { de: 'umtauschen', en: 'exchange' } }, { targetText: 'ją', baseText: { de: 'sie', en: 'it' } }],
    recall: { before: 'Przepraszam, ta bluzka jest za ', answer: 'mała', after: '. Czy można ją zamienić?', fallbackChoices: ['mała', 'duża', 'długa', 'droga'] }, speakRequired: ['bluzka', 'mała', 'zamienić'],
    sceneCaption: { de: 'Die Verkäuferin sieht zur Umkleidekabine und fragt: „Czy rozmiar jest dobry?”', en: 'The shop assistant looks toward the fitting room and asks: “Czy rozmiar jest dobry?”' },
    trophyWord: { word: 'zamienić', meaning: { de: 'umtauschen, wechseln', en: 'exchange, swap' }, example: 'Tę bluzkę można zamienić przy kasie.', whyThisWord: { de: 'Zamienić benennt die konkrete Lösung, nachdem die Bluse zu klein ausgefallen ist.', en: 'Zamienić names the concrete solution after the blouse turns out to be too small.' } },
    distractors: ['ten rozmiar pasuje', 'poproszę paragon'], placeholderCaption: { de: 'Eine zu kleine Bluse liegt gefaltet neben dem Umtauschschalter.', en: 'A blouse that is too small lies folded beside the exchange counter.' }, songMood: 'a simple shop exchange handled with calm courtesy', visualNotes: 'Clothing shop, fitting-room mirror, blouse with a small size tag, assistant ready to exchange it.',
  }),
  makePolishA2CompactLesson({
    slug: 'raczej-wode-niegazowana', title: { de: 'Lieber stilles Wasser', en: 'Still water instead' },
    situation: { de: 'Die Kellnerin bietet Mineralwasser mit Kohlensäure an. Du bittest stattdessen um stilles Wasser.', en: 'The server offers sparkling water. Ask for still water instead.' },
    pedagogicalGoal: 'Eine Servicealternative mit raczej und zamiast höflich auswählen.',
    targetText: 'Poproszę raczej wodę niegazowaną zamiast gazowanej.', baseText: { de: 'Ich hätte lieber stilles Wasser statt Wasser mit Kohlensäure.', en: 'I would prefer still water instead of sparkling water.' },
    chunks: [{ targetText: 'Poproszę raczej', baseText: { de: 'Ich hätte lieber', en: 'I would prefer' } }, { targetText: 'wodę niegazowaną', baseText: { de: 'stilles Wasser', en: 'still water' } }, { targetText: 'zamiast gazowanej.', baseText: { de: 'statt Wasser mit Kohlensäure.', en: 'instead of sparkling water.' } }],
    terms: [{ targetText: 'raczej', baseText: { de: 'lieber, eher', en: 'rather' } }, { targetText: 'wodę niegazowaną', baseText: { de: 'stilles Wasser', en: 'still water' } }, { targetText: 'niegazowaną', baseText: { de: 'ohne Kohlensäure im Akkusativ', en: 'still in the accusative' } }, { targetText: 'zamiast', baseText: { de: 'anstatt', en: 'instead of' } }, { targetText: 'gazowanej', baseText: { de: 'Wasser mit Kohlensäure nach zamiast', en: 'sparkling water after zamiast' } }],
    recall: { before: 'Poproszę raczej wodę ', answer: 'niegazowaną', after: ' zamiast gazowanej.', fallbackChoices: ['niegazowaną', 'gazowaną', 'zimną', 'małą'] }, speakRequired: ['poproszę', 'wodę', 'niegazowaną'],
    sceneCaption: { de: 'Die Kellnerin hebt eine Flasche an und fragt: „Woda gazowana do obiadu?”', en: 'The server lifts a bottle and asks: “Woda gazowana do obiadu?”' },
    trophyWord: { word: 'raczej', meaning: { de: 'lieber, eher', en: 'rather' }, example: 'Raczej wybieram wodę niegazowaną.', whyThisWord: { de: 'Raczej macht aus der Ablehnung sofort eine höfliche alternative Wahl.', en: 'Raczej turns the refusal immediately into a polite alternative choice.' } },
    distractors: ['dwie wody gazowane', 'sok bez lodu'], placeholderCaption: { de: 'Eine Flasche stilles Wasser steht neben einer ungeöffneten Flasche mit Kohlensäure.', en: 'A bottle of still water stands beside an unopened sparkling bottle.' }, songMood: 'a quiet restaurant preference resolved in one phrase', visualNotes: 'Restaurant table, two water bottles with distinct labels, server switching to the still one.',
  }),
  makePolishA2CompactLesson({
    slug: 'nie-te-tylko-tamte-pomidory', title: { de: 'Nicht diese, sondern jene', en: 'Not these, those' },
    situation: { de: 'Der Markthändler greift nach der falschen Tomatenkiste. Du zeigst auf die andere Kiste.', en: 'The market vendor reaches for the wrong crate of tomatoes. Point to the other crate.' },
    pedagogicalGoal: 'Eine sichtbare Auswahl mit nie te, tylko tamte knapp und höflich korrigieren.',
    targetText: 'Nie te, tylko tamte pomidory, poproszę.', baseText: { de: 'Nicht diese, sondern die dortigen Tomaten, bitte.', en: 'Not these, the tomatoes over there, please.' },
    chunks: [{ targetText: 'Nie te,', baseText: { de: 'Nicht diese,', en: 'Not these,' } }, { targetText: 'tylko tamte pomidory,', baseText: { de: 'sondern die dortigen Tomaten,', en: 'the tomatoes over there,' } }, { targetText: 'poproszę.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'nie te', baseText: { de: 'nicht diese', en: 'not these' } }, { targetText: 'tylko tamte', baseText: { de: 'sondern jene dort', en: 'but those over there' } }, { targetText: 'tamte', baseText: { de: 'jene dort', en: 'those over there' } }, { targetText: 'pomidory', baseText: { de: 'Tomaten', en: 'tomatoes' } }, { targetText: 'poproszę', baseText: { de: 'bitte; ich hätte gern', en: 'please; I would like' } }],
    recall: { before: 'Nie te, tylko ', answer: 'tamte', after: ' pomidory, poproszę.', fallbackChoices: ['tamte', 'te', 'inne', 'duże'] }, speakRequired: ['tamte', 'pomidory', 'poproszę'],
    sceneCaption: { de: 'Der Händler greift zur nahen Kiste und fragt: „Te pomidory?”', en: 'The vendor reaches for the nearer crate and asks: “Te pomidory?”' },
    trophyWord: { word: 'tamte', meaning: { de: 'jene dort', en: 'those over there' }, example: 'Poproszę tamte pomidory z lewej.', whyThisWord: { de: 'Tamte lenkt den Händler eindeutig von der falschen zur gewünschten Kiste.', en: 'Tamte directs the vendor clearly from the wrong crate to the one you want.' } },
    distractors: ['te ogórki obok', 'kilogram czerwonych jabłek'], placeholderCaption: { de: 'Zwei Tomatenkisten stehen auseinander, eine Hand zeigt auf die weiter entfernte.', en: 'Two tomato crates stand apart while a hand points to the farther one.' }, songMood: 'a quick market correction guided by one clear gesture', visualNotes: 'Produce stall, two tomato crates, vendor reaching toward one while the customer points to the other.',
  }),
  makePolishA2CompactLesson({
    slug: 'zmienic-pokoj-za-duzo-halasu', title: { de: 'Zu viel Lärm', en: 'Too much noise' },
    situation: { de: 'Die Rezeptionistin fragt, ob dein Zimmer in Ordnung ist. Du erklärst das Lärmproblem und bittest um einen Wechsel.', en: 'The receptionist asks whether your room is all right. Explain the noise problem and ask for a change.' },
    pedagogicalGoal: 'Mit czy można zmienić pokój eine Lösung verlangen und den Grund mit za dużo plus Genitiv nennen.',
    targetText: 'Czy można zmienić pokój? Jest tu za dużo hałasu.', baseText: { de: 'Kann man das Zimmer wechseln? Hier ist zu viel Lärm.', en: 'Can I change rooms? There is too much noise here.' },
    chunks: [{ targetText: 'Czy można zmienić pokój?', baseText: { de: 'Kann man das Zimmer wechseln?', en: 'Can the room be changed?' } }, { targetText: 'Jest tu', baseText: { de: 'Hier ist', en: 'There is' } }, { targetText: 'za dużo hałasu.', baseText: { de: 'zu viel Lärm.', en: 'too much noise.' } }],
    terms: [{ targetText: 'zmienić pokój', baseText: { de: 'das Zimmer wechseln', en: 'change rooms' } }, { targetText: 'czy można', baseText: { de: 'kann man', en: 'is it possible to' } }, { targetText: 'za dużo', baseText: { de: 'zu viel', en: 'too much' } }, { targetText: 'hałasu', baseText: { de: 'Lärm im Genitiv', en: 'noise in the genitive' } }, { targetText: 'pokój', baseText: { de: 'Zimmer', en: 'room' } }],
    recall: { before: 'Czy można zmienić pokój? Jest tu za dużo ', answer: 'hałasu', after: '.', fallbackChoices: ['hałasu', 'światła', 'dymu', 'kurzu'] }, speakRequired: ['zmienić', 'pokój', 'hałasu'],
    sceneCaption: { de: 'Die Rezeptionistin sieht dich fragend an und sagt: „Czy ten pokój jest w porządku?”', en: 'The receptionist looks at you and asks: “Czy ten pokój jest w porządku?”' },
    trophyWord: { word: 'hałasu', meaning: { de: 'Lärm im Genitiv', en: 'noise in the genitive' }, example: 'W nocy jest tu za dużo hałasu.', whyThisWord: { de: 'Hałasu benennt den konkreten Grund, aus dem der Zimmerwechsel nötig ist.', en: 'Hałasu names the concrete reason why the room change is necessary.' } },
    distractors: ['pokój jest bardzo wygodny', 'poproszę dodatkowy ręcznik'], placeholderCaption: { de: 'Hinter einer Hotelzimmertür dringen Straßengeräusche bis zur Rezeption.', en: 'Street noise carries from behind a hotel-room door toward reception.' }, songMood: 'a noisy hotel room leading to one calm practical request', visualNotes: 'Hotel reception, room door near a busy street, visible sound lines, guest requesting a quieter option.',
  }),
  makePolishA2CompactLesson({
    slug: 'poprosze-tylko-to-opakowanie', title: { de: 'Nur diese Packung', en: 'Just this pack' },
    situation: { de: 'Die Apothekerin bietet eine größere Packung an. Du lehnst freundlich ab und bleibst bei der kleinen Packung.', en: 'The pharmacist offers a larger pack. Decline politely and keep the smaller pack.' },
    pedagogicalGoal: 'Ein Zusatzangebot mit nie, dziękuję ablehnen und die eigene Wahl mit tylko bekräftigen.',
    targetText: 'Nie, dziękuję. Poproszę tylko to opakowanie.', baseText: { de: 'Nein, danke. Ich hätte nur diese Packung gern.', en: 'No, thank you. I would just like this pack.' },
    chunks: [{ targetText: 'Nie, dziękuję.', baseText: { de: 'Nein, danke.', en: 'No, thank you.' } }, { targetText: 'Poproszę tylko', baseText: { de: 'Ich hätte nur gern', en: 'I would just like' } }, { targetText: 'to opakowanie.', baseText: { de: 'diese Packung.', en: 'this pack.' } }],
    terms: [{ targetText: 'nie, dziękuję', baseText: { de: 'nein, danke', en: 'no, thank you' } }, { targetText: 'tylko', baseText: { de: 'nur', en: 'only' } }, { targetText: 'to opakowanie', baseText: { de: 'diese Packung', en: 'this pack' } }, { targetText: 'opakowanie', baseText: { de: 'Packung', en: 'pack' } }, { targetText: 'poproszę', baseText: { de: 'ich hätte gern', en: 'I would like' } }],
    recall: { before: 'Nie, dziękuję. Poproszę ', answer: 'tylko', after: ' to opakowanie.', fallbackChoices: ['tylko', 'zaraz', 'osobno', 'często'] }, speakRequired: ['dziękuję', 'tylko', 'opakowanie'],
    sceneCaption: { de: 'Die Apothekerin zeigt auf eine größere Schachtel und fragt: „Może większe opakowanie?”', en: 'The pharmacist points to a larger box and asks: “Może większe opakowanie?”' },
    trophyWord: { word: 'opakowanie', meaning: { de: 'Packung', en: 'pack' }, example: 'Poproszę tylko to opakowanie.', whyThisWord: { de: 'Opakowanie hält deine Antwort bei genau dem Produkt, das du tatsächlich kaufen möchtest.', en: 'Opakowanie keeps your answer focused on the exact product you actually want to buy.' } },
    distractors: ['większe na zapas', 'jeszcze dwa produkty'], placeholderCaption: { de: 'Eine kleine Packung bleibt vor dir liegen, während die größere zurück ins Regal wandert.', en: 'A small pack remains in front of you while the larger one goes back on the shelf.' }, songMood: 'a polite refusal keeping a pharmacy purchase simple', visualNotes: 'Pharmacy counter, small and large packs, customer choosing only the smaller one with a thankful nod.',
  }),
  makePolishA2CompactLesson({
    slug: 'cos-sie-nie-zgadza-na-rachunku', title: { de: 'Etwas stimmt nicht', en: 'Something does not add up' },
    situation: { de: 'Der Kellner nennt den Gesamtbetrag, aber die Rechnung scheint nicht zu deiner Bestellung zu passen. Du weist ruhig darauf hin.', en: 'The waiter states the total, but the bill does not seem to match your order. Point it out calmly.' },
    pedagogicalGoal: 'Mit coś się chyba nie zgadza eine vorsichtige, höfliche Korrektur der Rechnung einleiten.',
    targetText: 'Przepraszam, coś się chyba nie zgadza na rachunku.', baseText: { de: 'Entschuldigung, auf der Rechnung stimmt wohl etwas nicht.', en: 'Excuse me, something does not seem right on the bill.' },
    chunks: [{ targetText: 'Przepraszam,', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } }, { targetText: 'coś się chyba nie zgadza', baseText: { de: 'etwas stimmt wohl nicht', en: 'something does not seem right' } }, { targetText: 'na rachunku.', baseText: { de: 'auf der Rechnung.', en: 'on the bill.' } }],
    terms: [{ targetText: 'coś', baseText: { de: 'etwas', en: 'something' } }, { targetText: 'chyba', baseText: { de: 'wohl, vermutlich', en: 'probably, it seems' } }, { targetText: 'nie zgadza się', baseText: { de: 'stimmt nicht', en: 'does not add up' } }, { targetText: 'na rachunku', baseText: { de: 'auf der Rechnung', en: 'on the bill' } }, { targetText: 'rachunku', baseText: { de: 'Rechnung im Lokativ', en: 'bill in the locative' } }],
    recall: { before: 'Przepraszam, coś się chyba nie ', answer: 'zgadza', after: ' na rachunku.', fallbackChoices: ['zgadza', 'kończy', 'zaczyna', 'mieści'] }, speakRequired: ['coś', 'chyba', 'rachunku'],
    sceneCaption: { de: 'Der Kellner legt die Rechnung hin und sagt: „Razem pięćdziesiąt złotych.”', en: 'The waiter sets down the bill and says: “Razem pięćdziesiąt złotych.”' },
    trophyWord: { word: 'zgadza', meaning: { de: 'stimmt, passt', en: 'matches, adds up' }, example: 'Coś się nie zgadza na tym rachunku.', whyThisWord: { de: 'Zgadza benennt das Problem vorsichtig, ohne dem Kellner sofort einen Fehler vorzuwerfen.', en: 'Zgadza identifies the problem cautiously without immediately accusing the waiter of an error.' } },
    distractors: ['wszystko jest zapłacone', 'zapłacić kartą'], placeholderCaption: { de: 'Ein Kassenbon liegt neben der Bestellung, zwei Beträge passen sichtbar nicht zusammen.', en: 'A receipt lies beside the order with two totals that visibly do not match.' }, songMood: 'a small billing mismatch raised with measured politeness', visualNotes: 'Restaurant table, bill and menu prices side by side, one total circled, calm conversation with the waiter.',
  }),
  makePolishA2CompactLesson({
    slug: 'czy-jest-inne-mniejsze-opakowanie', title: { de: 'Eine andere kleine Packung', en: 'A different smaller pack' },
    situation: { de: 'Die Apothekerin hat nur eine große Packung vor sich. Du fragst nach einer anderen, kleineren Variante.', en: 'The pharmacist has only a large pack in front of her. Ask for a different, smaller option.' },
    pedagogicalGoal: 'Mit inne und mniejsze nach einer passenden Alternative im Geschäft fragen.',
    targetText: 'Czy jest inne, mniejsze opakowanie?', baseText: { de: 'Gibt es eine andere, kleinere Packung?', en: 'Is there a different, smaller pack?' },
    chunks: [{ targetText: 'Czy jest', baseText: { de: 'Gibt es', en: 'Is there' } }, { targetText: 'inne, mniejsze', baseText: { de: 'eine andere, kleinere', en: 'a different, smaller' } }, { targetText: 'opakowanie?', baseText: { de: 'Packung?', en: 'pack?' } }],
    terms: [{ targetText: 'inne', baseText: { de: 'ein anderes', en: 'a different one' } }, { targetText: 'mniejsze', baseText: { de: 'kleiner bei einem sächlichen Wort', en: 'smaller for a neuter noun' } }, { targetText: 'opakowanie', baseText: { de: 'Packung', en: 'pack' } }, { targetText: 'czy jest', baseText: { de: 'gibt es', en: 'is there' } }, { targetText: 'inne opakowanie', baseText: { de: 'eine andere Packung', en: 'a different pack' } }],
    recall: { before: 'Czy jest ', answer: 'inne', after: ', mniejsze opakowanie?', fallbackChoices: ['inne', 'pełne', 'tanie', 'nowe'] }, speakRequired: ['inne', 'mniejsze', 'opakowanie'],
    sceneCaption: { de: 'Die Apothekerin hält eine große Packung hoch und sagt: „Mam tylko duże opakowanie.”', en: 'The pharmacist holds up a large pack and says: “Mam tylko duże opakowanie.”' },
    trophyWord: { word: 'inne', meaning: { de: 'ein anderes', en: 'a different one' }, example: 'Czy jest inne opakowanie tego leku?', whyThisWord: { de: 'Inne öffnet die Frage nach einer Alternative, statt die große Packung einfach abzulehnen.', en: 'Inne opens the request for an alternative instead of merely rejecting the large pack.' } },
    distractors: ['to duże wystarczy', 'dwie takie same paczki'], placeholderCaption: { de: 'Eine große Arzneipackung steht allein auf dem Tresen, daneben ist Platz für eine kleinere.', en: 'A large medicine pack stands alone on the counter with space beside it for a smaller one.' }, songMood: 'a pharmacy request searching calmly for the right size', visualNotes: 'Pharmacy shelf, one large package, empty smaller slot, customer asking for another option.',
  }),
  makePolishA2CompactLesson({
    slug: 'na-dworzec-nie-do-centrum', title: { de: 'Zum Bahnhof, nicht ins Zentrum', en: 'The station, not the center' },
    situation: { de: 'Der Taxifahrer geht von einer Fahrt ins Zentrum aus. Du korrigierst das Ziel zum Bahnhof.', en: 'The taxi driver assumes you are going to the center. Correct the destination to the station.' },
    pedagogicalGoal: 'Ein Fahrziel mit na plus Akkusativ nennen und es mit nie do vom falschen Ziel abgrenzen.',
    targetText: 'Na dworzec, nie do centrum, poproszę.', baseText: { de: 'Zum Bahnhof, nicht ins Zentrum, bitte.', en: 'To the station, not the center, please.' },
    chunks: [{ targetText: 'Na dworzec,', baseText: { de: 'Zum Bahnhof,', en: 'To the station,' } }, { targetText: 'nie do centrum,', baseText: { de: 'nicht ins Zentrum,', en: 'not the center,' } }, { targetText: 'poproszę.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'na dworzec', baseText: { de: 'zum Bahnhof', en: 'to the station' } }, { targetText: 'nie do centrum', baseText: { de: 'nicht ins Zentrum', en: 'not to the center' } }, { targetText: 'centrum', baseText: { de: 'Zentrum', en: 'center' } }, { targetText: 'dworzec', baseText: { de: 'Bahnhof', en: 'station' } }, { targetText: 'poproszę', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Na ', answer: 'dworzec', after: ', nie do centrum, poproszę.', fallbackChoices: ['dworzec', 'lotnisko', 'rynek', 'pocztę'] }, speakRequired: ['dworzec', 'centrum', 'poproszę'],
    sceneCaption: { de: 'Der Taxifahrer setzt den Blinker und fragt: „Do centrum, tak?”', en: 'The taxi driver turns on the indicator and asks: “Do centrum, tak?”' },
    trophyWord: { word: 'centrum', meaning: { de: 'Zentrum', en: 'center' }, example: 'Hotel jest blisko centrum.', whyThisWord: { de: 'Centrum ist das falsche Ziel, das du klar vom gewünschten Bahnhof abgrenzt.', en: 'Centrum is the wrong destination that you clearly distinguish from the station you want.' } },
    distractors: ['przez stary rynek', 'tutaj jest dobrze'], placeholderCaption: { de: 'Auf dem Taxinavi stehen Zentrum und Bahnhof als zwei verschiedene Ziele.', en: 'The taxi navigation shows the center and the station as two different destinations.' }, songMood: 'a taxi route corrected before the wrong turn begins', visualNotes: 'Taxi dashboard, two destination pins, station selected while the center route is dismissed.',
  }),
  makePolishA2CompactLesson({
    slug: 'niestety-dzisiaj-nie-moge', title: { de: 'Heute leider nicht', en: 'Unfortunately not today' },
    situation: { de: 'Ein Hotelmitarbeiter bietet dir einen Platz beim heutigen Abendessen an. Du lehnst höflich ab.', en: 'A hotel employee offers you a place at today’s dinner. Decline politely.' },
    pedagogicalGoal: 'Eine formelle Einladung mit dziękuję, ale niestety weich und vollständig ablehnen.',
    targetText: 'Dziękuję, ale niestety dzisiaj nie mogę.', baseText: { de: 'Danke, aber heute kann ich leider nicht.', en: 'Thank you, but unfortunately I cannot today.' },
    chunks: [{ targetText: 'Dziękuję,', baseText: { de: 'Danke,', en: 'Thank you,' } }, { targetText: 'ale niestety', baseText: { de: 'aber leider', en: 'but unfortunately' } }, { targetText: 'dzisiaj nie mogę.', baseText: { de: 'kann ich heute nicht.', en: 'I cannot today.' } }],
    terms: [{ targetText: 'dziękuję', baseText: { de: 'danke', en: 'thank you' } }, { targetText: 'niestety', baseText: { de: 'leider', en: 'unfortunately' } }, { targetText: 'dzisiaj', baseText: { de: 'heute', en: 'today' } }, { targetText: 'nie mogę', baseText: { de: 'ich kann nicht', en: 'I cannot' } }, { targetText: 'ale', baseText: { de: 'aber', en: 'but' } }],
    recall: { before: 'Dziękuję, ale ', answer: 'niestety', after: ' dzisiaj nie mogę.', fallbackChoices: ['niestety', 'chętnie', 'zwykle', 'prawie'] }, speakRequired: ['dziękuję', 'niestety', 'mogę'],
    sceneCaption: { de: 'Der Hotelmitarbeiter zeigt auf die Gästeliste und fragt: „Czy zapisać na dzisiejszą kolację?”', en: 'The hotel employee points to the guest list and asks: “Czy zapisać na dzisiejszą kolację?”' },
    trophyWord: { word: 'niestety', meaning: { de: 'leider', en: 'unfortunately' }, example: 'Niestety dzisiaj nie mam czasu.', whyThisWord: { de: 'Niestety dämpft die Ablehnung und hält deine Antwort trotz des Neins höflich.', en: 'Niestety softens the refusal and keeps your answer polite despite the no.' } },
    distractors: ['proszę mnie zapisać', 'będę o siódmej'], placeholderCaption: { de: 'Eine Gästeliste für das Abendessen liegt offen, dein Platz bleibt unmarkiert.', en: 'A dinner guest list lies open while your place remains unmarked.' }, songMood: 'a courteous invitation declined without awkwardness', visualNotes: 'Hotel lobby desk, dinner guest list, staff member offering a place, guest declining warmly.',
  }),
]

export const POLISH_A2_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_FIVE_METADATA, polishA2Practical5Inputs,
  { de: 'Du hast Polnisch A2 Praxis 5 abgeschlossen und kannst im Service höflich korrigieren, ablehnen und Alternativen verlangen.', en: 'You have completed Polish A2 Practical 5 and can correct, decline, and request alternatives politely in service situations.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_SIX_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-6', title: 'Polnisch A2 Praxis 6', shortTitle: 'A2 Praxis 6',
  subtitle: { de: 'Wäsche, Reparaturen, Termine und Abholungen selbstständig erledigen', en: 'Handling laundry, repairs, appointments, and pickups independently' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical6Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'oddaje-ubrania-do-prania', title: { de: 'In die Wäscherei', en: 'At the laundry' },
    situation: { de: 'Die Mitarbeiterin der Wäscherei fragt, was gereinigt werden soll. Du gibst die Kleidung ab und fragst nach dem Abholtermin.', en: 'The laundry clerk asks what needs cleaning. Drop off the clothes and ask about the pickup date.' },
    pedagogicalGoal: 'Kleidung mit do prania abgeben und im Präsens nach dem Termin odbioru fragen.',
    targetText: 'Chcę oddać te ubrania do prania. Kiedy można je odebrać?', baseText: { de: 'Ich möchte diese Kleidung zum Waschen abgeben. Wann kann ich sie abholen?', en: 'I would like to drop off these clothes for washing. When can I pick them up?' },
    chunks: [{ targetText: 'Chcę oddać te ubrania', baseText: { de: 'Ich möchte diese Kleidung abgeben', en: 'I want to drop off these clothes' } }, { targetText: 'do prania.', baseText: { de: 'zum Waschen.', en: 'for washing.' } }, { targetText: 'Kiedy można je odebrać?', baseText: { de: 'Wann kann man sie abholen?', en: 'When can they be picked up?' } }],
    terms: [{ targetText: 'oddaję', baseText: { de: 'ich gebe ab', en: 'I am dropping off' } }, { targetText: 'ubrania', baseText: { de: 'Kleidung', en: 'clothes' } }, { targetText: 'do prania', baseText: { de: 'zum Waschen', en: 'for washing' } }, { targetText: 'termin odbioru', baseText: { de: 'Abholtermin', en: 'pickup date' } }, { targetText: 'prania', baseText: { de: 'Waschen nach do', en: 'washing after do' } }],
    recall: { before: 'Chcę oddać te ubrania do ', answer: 'prania', after: '. Kiedy można je odebrać?', fallbackChoices: ['prania', 'naprawy', 'odbioru', 'wysyłki'] }, speakRequired: ['oddać', 'ubrania', 'prania'],
    sceneCaption: { de: 'Die Mitarbeiterin der Wäscherei öffnet die Annahmetasche und fragt: „Co jest do prania?”', en: 'The laundry clerk opens the intake bag and asks: “Co jest do prania?”' },
    trophyWord: { word: 'prania', meaning: { de: 'zum Waschen; des Waschens', en: 'for washing; of washing' }, example: 'Te ubrania są do prania.', whyThisWord: { de: 'Prania benennt den Zweck deines ersten Auftrags in der Wäscherei.', en: 'Prania names the purpose of your first errand at the laundry.' } },
    distractors: ['odbieram gotową koszulę', 'potrzebuję nowej torby'], placeholderCaption: { de: 'Eine Tasche mit Kleidung steht auf dem Annahmetresen neben einem Abholschein.', en: 'A bag of clothes sits on the intake counter beside a pickup slip.' }, songMood: 'a practical laundry drop-off with the next date in view', visualNotes: 'Laundry counter, bag of clothes, intake tag, clerk marking a pickup date on a paper slip.',
  }),
  makePolishA2CompactLesson({
    slug: 'potrzebuje-naprawy-telefonu', title: { de: 'Das Display funktioniert nicht', en: 'The screen does not work' },
    situation: { de: 'Im Reparaturladen fragt der Mitarbeiter nach dem Problem. Du sagst, dass dein Telefon repariert werden muss und der Bildschirm nicht funktioniert.', en: 'At the repair shop, the technician asks about the problem. Say your phone needs repair and the screen does not work.' },
    pedagogicalGoal: 'Mit potrzebuję plus Genitiv einen Reparaturbedarf nennen und das konkrete Problem im Präsens beschreiben.',
    targetText: 'Potrzebuję naprawy telefonu. Ekran nie działa.', baseText: { de: 'Mein Telefon muss repariert werden. Der Bildschirm funktioniert nicht.', en: 'I need the phone repaired. The screen does not work.' },
    chunks: [{ targetText: 'Potrzebuję naprawy telefonu.', baseText: { de: 'Ich brauche eine Reparatur des Telefons.', en: 'I need the phone repaired.' } }, { targetText: 'Ekran', baseText: { de: 'Der Bildschirm', en: 'The screen' } }, { targetText: 'nie działa.', baseText: { de: 'funktioniert nicht.', en: 'does not work.' } }],
    terms: [{ targetText: 'potrzebuję', baseText: { de: 'ich brauche', en: 'I need' } }, { targetText: 'naprawy', baseText: { de: 'Reparatur im Genitiv', en: 'repair in the genitive' } }, { targetText: 'telefonu', baseText: { de: 'Telefon im Genitiv', en: 'phone in the genitive' } }, { targetText: 'ekran', baseText: { de: 'Bildschirm', en: 'screen' } }, { targetText: 'nie działa', baseText: { de: 'funktioniert nicht', en: 'does not work' } }],
    recall: { before: 'Potrzebuję naprawy ', answer: 'telefonu', after: '. Ekran nie działa.', fallbackChoices: ['telefonu', 'zegarka', 'aparatu', 'komputera'] }, speakRequired: ['potrzebuję', 'telefonu', 'ekran'],
    sceneCaption: { de: 'Der Mitarbeiter nimmt das Telefon entgegen und fragt: „W czym problem?”', en: 'The technician takes the phone and asks: “W czym problem?”' },
    trophyWord: { word: 'naprawy', meaning: { de: 'Reparatur im Genitiv', en: 'repair in the genitive' }, example: 'Ten telefon jest do naprawy.', whyThisWord: { de: 'Naprawy fasst deinen Bedarf zusammen, bevor du den kaputten Bildschirm genauer nennst.', en: 'Naprawy sums up what you need before you identify the broken screen more precisely.' } },
    distractors: ['telefon jest już gotowy', 'poproszę nowe etui'], placeholderCaption: { de: 'Ein Telefon mit dunklem Display liegt auf einer Reparaturmatte.', en: 'A phone with a dark screen lies on a repair mat.' }, songMood: 'a broken screen explained clearly at a small repair counter', visualNotes: 'Phone repair shop, unresponsive screen, technician’s tools, customer pointing to the display.',
  }),
  makePolishA2CompactLesson({
    slug: 'doladowanie-za-trzydziesci-zlotych', title: { de: 'Guthaben für dreißig Złoty', en: 'Thirty-zloty top-up' },
    situation: { de: 'Die Kioskverkäuferin fragt nach dem gewünschten Guthabenbetrag. Du nennst dreißig Złoty.', en: 'The kiosk clerk asks how much phone credit you need. State thirty zloty.' },
    pedagogicalGoal: 'Mit potrzebuję plus Genitiv und za einen genauen Betrag für eine Dienstleistung nennen.',
    targetText: 'Potrzebuję doładowania za trzydzieści złotych.', baseText: { de: 'Ich brauche ein Guthaben für dreißig Złoty.', en: 'I need a top-up for thirty zloty.' },
    chunks: [{ targetText: 'Potrzebuję doładowania', baseText: { de: 'Ich brauche eine Guthabenaufladung', en: 'I need a top-up' } }, { targetText: 'za trzydzieści', baseText: { de: 'für dreißig', en: 'for thirty' } }, { targetText: 'złotych.', baseText: { de: 'Złoty.', en: 'zloty.' } }],
    terms: [{ targetText: 'potrzebuję doładowania', baseText: { de: 'ich brauche eine Guthabenaufladung', en: 'I need a top-up' } }, { targetText: 'doładowania', baseText: { de: 'Guthabenaufladung im Genitiv', en: 'top-up in the genitive' } }, { targetText: 'trzydzieści', baseText: { de: 'dreißig', en: 'thirty' } }, { targetText: 'za trzydzieści złotych', baseText: { de: 'für dreißig Złoty', en: 'for thirty zloty' } }, { targetText: 'złotych', baseText: { de: 'Złoty nach einer größeren Zahl', en: 'zloty after a larger number' } }],
    recall: { before: 'Potrzebuję doładowania za ', answer: 'trzydzieści', after: ' złotych.', fallbackChoices: ['trzydzieści', 'dwadzieścia', 'czterdzieści', 'pięćdziesiąt'] }, speakRequired: ['potrzebuję', 'trzydzieści', 'złotych'],
    sceneCaption: { de: 'Die Kioskverkäuferin zeigt auf die Betragsliste und fragt: „Jakie doładowanie podać?”', en: 'The kiosk clerk points to the amount list and asks: “Jakie doładowanie podać?”' },
    trophyWord: { word: 'trzydzieści', meaning: { de: 'dreißig', en: 'thirty' }, example: 'Doładowanie kosztuje trzydzieści złotych.', whyThisWord: { de: 'Trzydzieści macht deinen Auftrag am Kiosk eindeutig und sofort ausführbar.', en: 'Trzydzieści makes your kiosk request precise and immediately actionable.' } },
    distractors: ['kartę SIM na rok', 'nowy numer telefonu'], placeholderCaption: { de: 'Auf einer Kioskliste ist der Betrag von dreißig Złoty deutlich markiert.', en: 'Thirty zloty is clearly marked on a kiosk top-up list.' }, songMood: 'a precise kiosk errand completed with one exact amount', visualNotes: 'Kiosk counter, top-up amount board, thirty-zloty option highlighted, phone ready for credit.',
  }),
  makePolishA2CompactLesson({
    slug: 'chce-sie-umowic-na-czwartek', title: { de: 'Termin am Donnerstag', en: 'Thursday appointment' },
    situation: { de: 'An der Rezeption wird nach dem gewünschten Tag für deinen Termin gefragt. Du wählst Donnerstag und fragst nach einem freien Termin.', en: 'At reception, you are asked which day you want for your appointment. Choose Thursday and ask whether a slot is free.' },
    pedagogicalGoal: 'Sich mit chcę się umówić na plus Wochentag für einen Servicetermin anmelden.',
    targetText: 'Chcę się umówić na czwartek. Czy jest wolny termin?', baseText: { de: 'Ich möchte einen Termin für Donnerstag vereinbaren. Ist ein Termin frei?', en: 'I want to make an appointment for Thursday. Is there an available slot?' },
    chunks: [{ targetText: 'Chcę się umówić', baseText: { de: 'Ich möchte einen Termin vereinbaren', en: 'I want to make an appointment' } }, { targetText: 'na czwartek.', baseText: { de: 'für Donnerstag.', en: 'for Thursday.' } }, { targetText: 'Czy jest wolny termin?', baseText: { de: 'Ist ein Termin frei?', en: 'Is there an available slot?' } }],
    terms: [{ targetText: 'chcę się umówić', baseText: { de: 'ich möchte einen Termin vereinbaren', en: 'I want to make an appointment' } }, { targetText: 'na czwartek', baseText: { de: 'für Donnerstag', en: 'for Thursday' } }, { targetText: 'wolny termin', baseText: { de: 'freier Termin', en: 'available slot' } }, { targetText: 'termin', baseText: { de: 'Termin', en: 'appointment' } }, { targetText: 'czwartek', baseText: { de: 'Donnerstag', en: 'Thursday' } }],
    recall: { before: 'Chcę się umówić na ', answer: 'czwartek', after: '. Czy jest wolny termin?', fallbackChoices: ['czwartek', 'piątek', 'poniedziałek', 'wtorek'] }, speakRequired: ['umówić', 'czwartek', 'termin'],
    sceneCaption: { de: 'Die Mitarbeiterin öffnet den Terminkalender und fragt: „Na jaki dzień umówić wizytę?”', en: 'The receptionist opens the appointment calendar and asks: “Na jaki dzień umówić wizytę?”' },
    trophyWord: { word: 'termin', meaning: { de: 'Termin', en: 'appointment, slot' }, example: 'W czwartek jest wolny termin.', whyThisWord: { de: 'Termin benennt genau den freien Platz, den du für Donnerstag suchst.', en: 'Termin names the exact available slot you are seeking for Thursday.' } },
    distractors: ['przyjdę bez wizyty', 'potrzebuję recepty'], placeholderCaption: { de: 'Im Terminkalender ist am Donnerstag ein freies Feld sichtbar.', en: 'An open slot is visible on Thursday in the appointment calendar.' }, songMood: 'a service appointment finding its place on Thursday', visualNotes: 'Reception calendar, Thursday column, one open slot, staff member holding a scheduling pen.',
  }),
  makePolishA2CompactLesson({
    slug: 'chce-dorobic-klucz', title: { de: 'Einen Schlüssel nachmachen', en: 'Copy a key' },
    situation: { de: 'Der Schlüsseldienst fragt, was mit dem Schlüssel gemacht werden soll. Du bittest um eine Kopie und fragst nach dem möglichen Termin.', en: 'The locksmith asks what needs to be done with the key. Request a copy and ask when it can be ready.' },
    pedagogicalGoal: 'Mit dorobić klucz eine konkrete Dienstleistung bestellen und mit na kiedy nach dem Termin fragen.',
    targetText: 'Chcę dorobić klucz. Na kiedy może być gotowy?', baseText: { de: 'Ich möchte einen Schlüssel nachmachen lassen. Bis wann kann er fertig sein?', en: 'I want to have a key copied. When can it be ready?' },
    chunks: [{ targetText: 'Chcę dorobić klucz.', baseText: { de: 'Ich möchte einen Schlüssel nachmachen lassen.', en: 'I want to have a key copied.' } }, { targetText: 'Na kiedy', baseText: { de: 'Bis wann', en: 'By when' } }, { targetText: 'może być gotowy?', baseText: { de: 'kann er fertig sein?', en: 'can it be ready?' } }],
    terms: [{ targetText: 'dorobić klucz', baseText: { de: 'einen Schlüssel nachmachen', en: 'copy a key' } }, { targetText: 'dorobić', baseText: { de: 'nachmachen', en: 'make a copy' } }, { targetText: 'na kiedy', baseText: { de: 'bis wann', en: 'by when' } }, { targetText: 'może być gotowy', baseText: { de: 'kann fertig sein', en: 'can be ready' } }, { targetText: 'klucz', baseText: { de: 'Schlüssel', en: 'key' } }],
    recall: { before: 'Chcę ', answer: 'dorobić', after: ' klucz. Na kiedy może być gotowy?', fallbackChoices: ['dorobić', 'wysłać', 'wyprać', 'ugotować'] }, speakRequired: ['dorobić', 'klucz', 'gotowy'],
    sceneCaption: { de: 'Der Schlüsseldienst nimmt den Schlüssel und fragt: „Co trzeba zrobić z kluczem?”', en: 'The locksmith takes the key and asks: “Co trzeba zrobić z kluczem?”' },
    trophyWord: { word: 'dorobić', meaning: { de: 'nachmachen, eine Kopie anfertigen', en: 'make a copy' }, example: 'Tutaj można dorobić klucz.', whyThisWord: { de: 'Dorobić bezeichnet beim Schlüsseldienst genau den Auftrag für eine zweite Kopie.', en: 'Dorobić names the exact locksmith service needed for a second copy.' } },
    distractors: ['zamek nie działa', 'odbieram klucz dzisiaj'], placeholderCaption: { de: 'Ein Originalschlüssel liegt neben einem unbearbeiteten Rohling und einer Auftragskarte.', en: 'An original key lies beside a blank key and a service ticket.' }, songMood: 'a tiny locksmith errand turning one key into two', visualNotes: 'Locksmith counter, original key, blank copy, cutting machine, pickup date card.',
  }),
  makePolishA2CompactLesson({
    slug: 'mam-numer-odbioru-paczki', title: { de: 'Ein Paket abholen', en: 'Pick up a package' },
    situation: { de: 'Am Abholschalter wird gefragt, was für dich bereitliegt. Du sagst, dass du eine Abholnummer hast und ein Paket abholen möchtest.', en: 'At the pickup counter, you are asked what is waiting for you. Say you have a pickup number and want to collect a package.' },
    pedagogicalGoal: 'Mit numer odbioru und odebrać paczkę eine Abholung am Schalter einleiten.',
    targetText: 'Mam numer odbioru. Chcę odebrać paczkę.', baseText: { de: 'Ich habe eine Abholnummer. Ich möchte ein Paket abholen.', en: 'I have a pickup number. I want to collect a package.' },
    chunks: [{ targetText: 'Mam numer odbioru.', baseText: { de: 'Ich habe eine Abholnummer.', en: 'I have a pickup number.' } }, { targetText: 'Chcę odebrać', baseText: { de: 'Ich möchte abholen', en: 'I want to collect' } }, { targetText: 'paczkę.', baseText: { de: 'ein Paket.', en: 'a package.' } }],
    terms: [{ targetText: 'numer odbioru', baseText: { de: 'Abholnummer', en: 'pickup number' } }, { targetText: 'odebrać', baseText: { de: 'abholen', en: 'collect' } }, { targetText: 'paczkę', baseText: { de: 'Paket im Akkusativ', en: 'package in the accusative' } }, { targetText: 'chcę', baseText: { de: 'ich möchte', en: 'I want' } }, { targetText: 'mam numer', baseText: { de: 'ich habe eine Nummer', en: 'I have a number' } }],
    recall: { before: 'Mam numer ', answer: 'odbioru', after: '. Chcę odebrać paczkę.', fallbackChoices: ['odbioru', 'pokoju', 'stolika', 'biletu'] }, speakRequired: ['numer', 'odebrać', 'paczkę'],
    sceneCaption: { de: 'Der Mitarbeiter am Schalter sieht auf die Regale und fragt: „Co jest do odbioru?”', en: 'The clerk looks toward the shelves and asks: “Co jest do odbioru?”' },
    trophyWord: { word: 'paczkę', meaning: { de: 'Paket im Akkusativ', en: 'package in the accusative' }, example: 'Chcę odebrać paczkę po pracy.', whyThisWord: { de: 'Paczkę benennt den Gegenstand, den der Mitarbeiter anhand deiner Nummer suchen soll.', en: 'Paczkę names the item the clerk should find using your pickup number.' } },
    distractors: ['wysyłam list za granicę', 'potrzebuję nowego numeru'], placeholderCaption: { de: 'Ein Paket mit Abholnummer steht im Regal hinter dem Serviceschalter.', en: 'A package with a pickup number sits on the shelf behind the service counter.' }, songMood: 'a numbered parcel moving smoothly from shelf to hand', visualNotes: 'Pickup counter, parcel shelves, number slip, clerk locating the matching package.',
  }),
  makePolishA2CompactLesson({
    slug: 'chce-wynajac-rower-na-dwa-dni', title: { de: 'Ein Fahrrad für zwei Tage', en: 'A bike for two days' },
    situation: { de: 'Im Fahrradverleih wird nach der gewünschten Dauer gefragt. Du möchtest ein Fahrrad für zwei Tage mieten.', en: 'At the bike rental, you are asked how long you need it. Rent a bike for two days.' },
    pedagogicalGoal: 'Mit wynająć und na plus Zeitspanne eine Miete klar beauftragen.',
    targetText: 'Chcę wynająć rower na dwa dni.', baseText: { de: 'Ich möchte ein Fahrrad für zwei Tage mieten.', en: 'I want to rent a bike for two days.' },
    chunks: [{ targetText: 'Chcę wynająć', baseText: { de: 'Ich möchte mieten', en: 'I want to rent' } }, { targetText: 'rower', baseText: { de: 'ein Fahrrad', en: 'a bike' } }, { targetText: 'na dwa dni.', baseText: { de: 'für zwei Tage.', en: 'for two days.' } }],
    terms: [{ targetText: 'wynająć', baseText: { de: 'mieten', en: 'rent' } }, { targetText: 'rower', baseText: { de: 'Fahrrad', en: 'bike' } }, { targetText: 'na dwa dni', baseText: { de: 'für zwei Tage', en: 'for two days' } }, { targetText: 'dwa dni', baseText: { de: 'zwei Tage', en: 'two days' } }, { targetText: 'chcę', baseText: { de: 'ich möchte', en: 'I want' } }],
    recall: { before: 'Chcę ', answer: 'wynająć', after: ' rower na dwa dni.', fallbackChoices: ['wynająć', 'naprawić', 'sprzedać', 'zostawić'] }, speakRequired: ['wynająć', 'rower', 'dwa'],
    sceneCaption: { de: 'Der Mitarbeiter zeigt auf die Mieträder und fragt: „Na ile dni potrzebny jest rower?”', en: 'The clerk gestures toward the rental bikes and asks: “Na ile dni potrzebny jest rower?”' },
    trophyWord: { word: 'wynająć', meaning: { de: 'mieten', en: 'rent' }, example: 'Tutaj można wynająć rower.', whyThisWord: { de: 'Wynająć benennt die Dienstleistung, die das Fahrrad für zwei Tage verfügbar macht.', en: 'Wynająć names the service that makes the bike available for two days.' } },
    distractors: ['kupić nowy kask', 'jechać autobusem'], placeholderCaption: { de: 'Ein Mietfahrrad steht neben einem Formular, auf dem zwei Tage markiert sind.', en: 'A rental bike stands beside a form marked for two days.' }, songMood: 'a two-day bike rental opening the town beyond walking distance', visualNotes: 'Bike rental counter, city bicycle, two-day form, map attached to the handlebars.',
  }),
  makePolishA2CompactLesson({
    slug: 'do-ktorej-otwarte-w-sobote', title: { de: 'Samstags bis wann?', en: 'How late on Saturday?' },
    situation: { de: 'Ein Mitarbeiter sagt, dass die Servicestelle samstags kürzer arbeitet. Du fragst nach der genauen Schließzeit.', en: 'A staff member says the service desk has shorter hours on Saturday. Ask for the exact closing time.' },
    pedagogicalGoal: 'Mit do której nach dem Ende einer Öffnungszeit und mit w sobotę nach dem richtigen Tag fragen.',
    targetText: 'Do której jest otwarte w sobotę?', baseText: { de: 'Bis wann ist am Samstag geöffnet?', en: 'How late is it open on Saturday?' },
    chunks: [{ targetText: 'Do której', baseText: { de: 'Bis wann', en: 'Until what time' } }, { targetText: 'jest otwarte', baseText: { de: 'ist geöffnet', en: 'is it open' } }, { targetText: 'w sobotę?', baseText: { de: 'am Samstag?', en: 'on Saturday?' } }],
    terms: [{ targetText: 'do której', baseText: { de: 'bis wann', en: 'until what time' } }, { targetText: 'jest otwarte', baseText: { de: 'ist geöffnet', en: 'is open' } }, { targetText: 'w sobotę', baseText: { de: 'am Samstag', en: 'on Saturday' } }, { targetText: 'sobotę', baseText: { de: 'Samstag nach w', en: 'Saturday after w' } }, { targetText: 'której', baseText: { de: 'welcher Stunde', en: 'what time' } }],
    recall: { before: 'Do ', answer: 'której', after: ' jest otwarte w sobotę?', fallbackChoices: ['której', 'szóstej', 'siódmej', 'ósmej'] }, speakRequired: ['której', 'otwarte', 'sobotę'],
    sceneCaption: { de: 'Der Mitarbeiter zeigt auf die Wochenübersicht und sagt: „W sobotę pracujemy krócej.”', en: 'The staff member points to the weekly hours and says: “W sobotę pracujemy krócej.”' },
    trophyWord: { word: 'sobotę', meaning: { de: 'am Samstag', en: 'on Saturday' }, example: 'W sobotę punkt jest otwarty krócej.', whyThisWord: { de: 'Sobotę verankert deine Frage am Tag mit den abweichenden Öffnungszeiten.', en: 'Sobotę anchors your question to the day with different opening hours.' } },
    distractors: ['od poniedziałku rano', 'dzisiaj jest zamknięte'], placeholderCaption: { de: 'Auf einem Öffnungszeitenschild ist die Samstagszeile kürzer als die übrigen.', en: 'On an opening-hours sign, the Saturday line is shorter than the others.' }, songMood: 'a weekly schedule narrowed to one precise Saturday question', visualNotes: 'Service-hours board, Saturday row highlighted, closing time left for the clerk to clarify.',
  }),
  makePolishA2CompactLesson({
    slug: 'telefon-gotowy-do-odbioru', title: { de: 'Bereit zur Abholung?', en: 'Ready for pickup?' },
    situation: { de: 'Du kehrst in den Reparaturladen zurück. Der Mitarbeiter fragt, wie er helfen kann, und du fragst nach deinem Telefon.', en: 'You return to the repair shop. The technician asks how he can help, and you ask about your phone.' },
    pedagogicalGoal: 'Mit gotowy do odbioru den aktuellen Status einer Reparatur erfragen.',
    targetText: 'Czy telefon jest już gotowy do odbioru?', baseText: { de: 'Ist das Telefon schon zur Abholung bereit?', en: 'Is the phone ready for pickup yet?' },
    chunks: [{ targetText: 'Czy telefon', baseText: { de: 'Ist das Telefon', en: 'Is the phone' } }, { targetText: 'jest już gotowy', baseText: { de: 'schon bereit', en: 'ready yet' } }, { targetText: 'do odbioru?', baseText: { de: 'zur Abholung?', en: 'for pickup?' } }],
    terms: [{ targetText: 'gotowy do odbioru', baseText: { de: 'zur Abholung bereit', en: 'ready for pickup' } }, { targetText: 'do odbioru', baseText: { de: 'zur Abholung', en: 'for pickup' } }, { targetText: 'telefon', baseText: { de: 'Telefon', en: 'phone' } }, { targetText: 'gotowy', baseText: { de: 'bereit bei einem männlichen Gegenstand', en: 'ready for a masculine object' } }, { targetText: 'czy', baseText: { de: 'Fragepartikel', en: 'question particle' } }],
    recall: { before: 'Czy telefon jest już ', answer: 'gotowy', after: ' do odbioru?', fallbackChoices: ['gotowy', 'otwarty', 'dostępny', 'bezpieczny'] }, speakRequired: ['telefon', 'gotowy', 'odbioru'],
    sceneCaption: { de: 'Der Mitarbeiter erkennt dich am Reparaturschalter und fragt: „W czym mogę pomóc?”', en: 'The technician recognizes you at the repair counter and asks: “W czym mogę pomóc?”' },
    trophyWord: { word: 'odbioru', meaning: { de: 'Abholung im Genitiv', en: 'pickup in the genitive' }, example: 'Telefon jest gotowy do odbioru.', whyThisWord: { de: 'Odbioru bezeichnet den letzten Schritt, auf den du nach der Reparatur wartest.', en: 'Odbioru names the final step you are waiting for after the repair.' } },
    distractors: ['ekran nadal nie działa', 'potrzebuję nowej ładowarki'], placeholderCaption: { de: 'Ein repariertes Telefon liegt mit einem Abholzettel auf dem Serviceschalter.', en: 'A repaired phone lies on the service counter with a pickup slip.' }, songMood: 'a repaired phone nearly back in its owner’s hand', visualNotes: 'Repair counter, working phone screen, pickup tag, technician ready to return the device.',
  }),
  makePolishA2CompactLesson({
    slug: 'w-takim-razie-do-zobaczenia', title: { de: 'Dann bis Donnerstag', en: 'See you Thursday then' },
    situation: { de: 'Die Mitarbeiterin bestätigt die Abholung am Donnerstag. Du bedankst dich und beendest das Gespräch.', en: 'The staff member confirms pickup on Thursday. Thank them and close the exchange.' },
    pedagogicalGoal: 'Eine erledigte Absprache mit w takim razie zusammenfassen und höflich beenden.',
    targetText: 'Dziękuję. W takim razie do zobaczenia w czwartek.', baseText: { de: 'Danke. Dann bis Donnerstag.', en: 'Thank you. See you on Thursday then.' },
    chunks: [{ targetText: 'Dziękuję.', baseText: { de: 'Danke.', en: 'Thank you.' } }, { targetText: 'W takim razie', baseText: { de: 'Dann', en: 'In that case' } }, { targetText: 'do zobaczenia w czwartek.', baseText: { de: 'bis Donnerstag.', en: 'see you on Thursday.' } }],
    terms: [{ targetText: 'w takim razie', baseText: { de: 'dann, in diesem Fall', en: 'in that case' } }, { targetText: 'do zobaczenia', baseText: { de: 'bis dann, auf Wiedersehen', en: 'see you' } }, { targetText: 'w czwartek', baseText: { de: 'am Donnerstag', en: 'on Thursday' } }, { targetText: 'dziękuję', baseText: { de: 'danke', en: 'thank you' } }, { targetText: 'razie', baseText: { de: 'Fall im Lokativ', en: 'case in the locative' } }],
    recall: { before: 'Dziękuję. W takim razie do zobaczenia w ', answer: 'czwartek', after: '.', fallbackChoices: ['czwartek', 'piątek', 'poniedziałek', 'wtorek'] }, speakRequired: ['dziękuję', 'razie', 'czwartek'],
    sceneCaption: { de: 'Die Mitarbeiterin trägt die Abholung ein und sagt: „Zapraszamy w czwartek po odbiór.”', en: 'The staff member records the pickup and says: “Zapraszamy w czwartek po odbiór.”' },
    trophyWord: { word: 'razie', meaning: { de: 'Lokativform in der Wendung für „dann”', en: 'locative form used in the phrase “in that case”' }, example: 'W takim razie wszystko jest jasne.', whyThisWord: { de: 'Razie verbindet die bestätigte Abholung direkt mit deinem höflichen Abschied.', en: 'Razie links the confirmed pickup directly to your polite closing.' } },
    distractors: ['potrzebuję nowego terminu', 'jeszcze jedno pytanie'], placeholderCaption: { de: 'Ein bestätigter Donnerstagstermin steht neben einem geschlossenen Auftragszettel.', en: 'A confirmed Thursday pickup sits beside a completed service slip.' }, songMood: 'a full list of errands ending with one settled Thursday goodbye', visualNotes: 'Service counter, Thursday marked, completed ticket, polite nod as the errand closes.',
  }),
]

export const POLISH_A2_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_SIX_METADATA, polishA2Practical6Inputs,
  { de: 'Du hast Polnisch A2 Praxis 6 abgeschlossen und kannst alltägliche Dienstleistungen, Termine und Abholungen selbstständig organisieren.', en: 'You have completed Polish A2 Practical 6 and can independently organize everyday services, appointments, and pickups.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-7', title: 'Polnisch A2 Praxis 7', shortTitle: 'A2 Praxis 7',
  subtitle: { de: 'Empfehlungen erfragen, Orte beschreiben und selbst Tipps geben', en: 'Asking for recommendations, describing places, and giving tips yourself' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical7Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'co-pani-poleca-na-obiad', title: { de: 'Was empfehlen Sie?', en: 'What do you recommend?' },
    situation: { de: 'Eine Kellnerin möchte deine Bestellung aufnehmen, aber du kennst die Gerichte noch nicht. Bitte sie um eine Empfehlung für das Mittagessen.', en: 'A waitress is ready to take your order, but you do not know the dishes yet. Ask her for a lunch recommendation.' },
    pedagogicalGoal: 'Eine weibliche Serviceperson mit Co pani poleca? nach einer Empfehlung fragen.',
    targetText: 'Jeszcze nie wiem. Co pani poleca na obiad?', baseText: { de: 'Ich weiß es noch nicht. Was empfehlen Sie zum Mittagessen?', en: 'I do not know yet. What do you recommend for lunch?' },
    chunks: [{ targetText: 'Jeszcze nie wiem.', baseText: { de: 'Ich weiß es noch nicht.', en: 'I do not know yet.' } }, { targetText: 'Co pani poleca', baseText: { de: 'Was empfehlen Sie', en: 'What do you recommend' } }, { targetText: 'na obiad?', baseText: { de: 'zum Mittagessen?', en: 'for lunch?' } }],
    terms: [{ targetText: 'jeszcze nie wiem', baseText: { de: 'ich weiß es noch nicht', en: 'I do not know yet' } }, { targetText: 'co pani poleca', baseText: { de: 'was empfehlen Sie', en: 'what do you recommend' } }, { targetText: 'poleca', baseText: { de: 'empfiehlt', en: 'recommends' } }, { targetText: 'na obiad', baseText: { de: 'zum Mittagessen', en: 'for lunch' } }, { targetText: 'obiad', baseText: { de: 'Mittagessen', en: 'lunch' } }],
    recall: { before: 'Jeszcze nie wiem. Co pani ', answer: 'poleca', after: ' na obiad?', fallbackChoices: ['poleca', 'podaje', 'gotuje', 'wybiera'] }, speakRequired: ['wiem', 'poleca', 'obiad'],
    sceneCaption: { de: 'Die Kellnerin öffnet ihren Bestellblock und fragt: „Czy mogę już przyjąć zamówienie?”', en: 'The waitress opens her order pad and asks: “Czy mogę już przyjąć zamówienie?”' },
    trophyWord: { word: 'poleca', meaning: { de: 'empfiehlt', en: 'recommends' }, example: 'Kellnerka poleca dzisiaj zupę.', whyThisWord: { de: 'Poleca verwandelt deine Unsicherheit in eine konkrete Bitte um den Rat der Kellnerin.', en: 'Poleca turns your uncertainty into a direct request for the waitress’s advice.' } },
    distractors: ['poproszę tylko kawę', 'znam już to danie'], placeholderCaption: { de: 'Eine offene Speisekarte liegt zwischen dir und der wartenden Kellnerin.', en: 'An open menu lies between you and the waiting waitress.' }, songMood: 'a curious lunch order guided by a local recommendation', visualNotes: 'Polish restaurant, open menu, female server with order pad, diner looking over unfamiliar dishes.',
  }),
  makePolishA2CompactLesson({
    slug: 'brzmi-dobrze-wezme-to-danie', title: { de: 'Das nehme ich', en: 'I will take that' },
    situation: { de: 'Der Kellner empfiehlt Pierogi mit Pilzen. Die Empfehlung klingt gut, und du entscheidest dich dafür.', en: 'The waiter recommends pierogi with mushrooms. The recommendation sounds good, so accept it.' },
    pedagogicalGoal: 'Eine Empfehlung mit brzmi dobrze annehmen und die Wahl mit wezmę festlegen.',
    targetText: 'Brzmi dobrze, wezmę to danie.', baseText: { de: 'Das klingt gut, ich nehme dieses Gericht.', en: 'That sounds good; I will take this dish.' },
    chunks: [{ targetText: 'Brzmi dobrze,', baseText: { de: 'Das klingt gut,', en: 'That sounds good,' } }, { targetText: 'wezmę', baseText: { de: 'ich nehme', en: 'I will take' } }, { targetText: 'to danie.', baseText: { de: 'dieses Gericht.', en: 'this dish.' } }],
    terms: [{ targetText: 'brzmi dobrze', baseText: { de: 'das klingt gut', en: 'that sounds good' } }, { targetText: 'wezmę', baseText: { de: 'ich nehme', en: 'I will take' } }, { targetText: 'to danie', baseText: { de: 'dieses Gericht', en: 'this dish' } }, { targetText: 'danie', baseText: { de: 'Gericht', en: 'dish' } }, { targetText: 'brzmi', baseText: { de: 'klingt', en: 'sounds' } }],
    recall: { before: 'Brzmi dobrze, ', answer: 'wezmę', after: ' to danie.', fallbackChoices: ['wezmę', 'kupię', 'zjem', 'podam'] }, speakRequired: ['brzmi', 'wezmę', 'danie'],
    sceneCaption: { de: 'Der Kellner zeigt auf die Tageskarte und sagt: „Polecam pierogi z grzybami.”', en: 'The waiter points to the daily menu and says: “Polecam pierogi z grzybami.”' },
    trophyWord: { word: 'wezmę', meaning: { de: 'ich nehme', en: 'I will take' }, example: 'Wezmę to danie z sałatką.', whyThisWord: { de: 'Wezmę macht aus der positiven Reaktion sofort eine klare Bestellung.', en: 'Wezmę turns the positive reaction directly into a clear order.' } },
    distractors: ['wolę inną zupę', 'bez grzybów proszę'], placeholderCaption: { de: 'Der Kellner zeigt auf Pierogi mit Pilzen, während du zustimmend nickst.', en: 'The waiter points to mushroom pierogi as you nod in agreement.' }, songMood: 'an appealing recommendation becoming an easy choice', visualNotes: 'Restaurant table, daily menu, mushroom pierogi pictured, waiter receiving a confident decision.',
  }),
  makePolishA2CompactLesson({
    slug: 'ktora-dzielnice-pani-poleca', title: { de: 'Ein Viertel zum Spazieren', en: 'A neighborhood for a walk' },
    situation: { de: 'Eine Mitarbeiterin der Touristeninformation zeigt mehrere Stadtviertel. Frage sie, welches sich für einen ruhigen Spaziergang eignet.', en: 'A female tourist-information clerk shows several neighborhoods. Ask which one suits a quiet walk.' },
    pedagogicalGoal: 'Mit Którą dzielnicę pani poleca? eine weibliche Mitarbeiterin nach einer konkreten Ortswahl fragen.',
    targetText: 'Którą dzielnicę pani poleca na spokojny spacer?', baseText: { de: 'Welches Viertel empfehlen Sie für einen ruhigen Spaziergang?', en: 'Which neighborhood do you recommend for a quiet walk?' },
    chunks: [{ targetText: 'Którą dzielnicę', baseText: { de: 'Welches Viertel', en: 'Which neighborhood' } }, { targetText: 'pani poleca', baseText: { de: 'empfehlen Sie', en: 'do you recommend' } }, { targetText: 'na spokojny spacer?', baseText: { de: 'für einen ruhigen Spaziergang?', en: 'for a quiet walk?' } }],
    terms: [{ targetText: 'którą dzielnicę', baseText: { de: 'welches Viertel im Akkusativ', en: 'which neighborhood in the accusative' } }, { targetText: 'dzielnicę', baseText: { de: 'Stadtviertel im Akkusativ', en: 'neighborhood in the accusative' } }, { targetText: 'pani poleca', baseText: { de: 'Sie empfehlen', en: 'you recommend' } }, { targetText: 'spokojny spacer', baseText: { de: 'ruhiger Spaziergang', en: 'quiet walk' } }, { targetText: 'spacer', baseText: { de: 'Spaziergang', en: 'walk' } }],
    recall: { before: 'Którą ', answer: 'dzielnicę', after: ' pani poleca na spokojny spacer?', fallbackChoices: ['dzielnicę', 'ulicę', 'trasę', 'kawiarnię'] }, speakRequired: ['dzielnicę', 'poleca', 'spacer'],
    sceneCaption: { de: 'Die Mitarbeiterin breitet mehrere Stadtpläne aus und sagt: „Mogę pokazać kilka dzielnic.”', en: 'The staff member spreads out several city maps and says: “Mogę pokazać kilka dzielnic.”' },
    trophyWord: { word: 'dzielnicę', meaning: { de: 'Stadtviertel im Akkusativ', en: 'neighborhood in the accusative' }, example: 'Tę dzielnicę warto zwiedzić pieszo.', whyThisWord: { de: 'Dzielnicę grenzt die Empfehlung auf einen überschaubaren Teil der Stadt ein.', en: 'Dzielnicę narrows the recommendation to a manageable part of the city.' } },
    distractors: ['park przy hotelu', 'centrum na zakupy'], placeholderCaption: { de: 'Mehrere farbig markierte Stadtviertel liegen auf Karten am Informationsschalter.', en: 'Several color-coded neighborhoods appear on maps at the information desk.' }, songMood: 'a city map opening toward a peaceful afternoon walk', visualNotes: 'Tourist information counter, female clerk, neighborhood maps, one quiet walking area waiting to be chosen.',
  }),
  makePolishA2CompactLesson({
    slug: 'park-cichy-ladny-obok-rzeki', title: { de: 'Der Park am Fluss', en: 'The park by the river' },
    situation: { de: 'Ein Mitarbeiter der Information fragt, wie der Park am Fluss ist. Beschreibe ihn mit zwei Eigenschaften und seiner Lage.', en: 'An information clerk asks what the riverside park is like. Describe it with two qualities and its location.' },
    pedagogicalGoal: 'Einen Ort mit zwei prädikativen Adjektiven und obok plus Genitiv beschreiben.',
    targetText: 'Ten park jest cichy i ładny. Leży obok rzeki.', baseText: { de: 'Dieser Park ist ruhig und schön. Er liegt neben dem Fluss.', en: 'This park is quiet and pretty. It lies beside the river.' },
    chunks: [{ targetText: 'Ten park', baseText: { de: 'Dieser Park', en: 'This park' } }, { targetText: 'jest cichy i ładny.', baseText: { de: 'ist ruhig und schön.', en: 'is quiet and pretty.' } }, { targetText: 'Leży obok rzeki.', baseText: { de: 'Er liegt neben dem Fluss.', en: 'It lies beside the river.' } }],
    terms: [{ targetText: 'ten park', baseText: { de: 'dieser Park', en: 'this park' } }, { targetText: 'cichy', baseText: { de: 'ruhig bei einem männlichen Ort', en: 'quiet for a masculine place' } }, { targetText: 'ładny', baseText: { de: 'schön bei einem männlichen Ort', en: 'pretty for a masculine place' } }, { targetText: 'obok rzeki', baseText: { de: 'neben dem Fluss', en: 'beside the river' } }, { targetText: 'rzeki', baseText: { de: 'Fluss im Genitiv', en: 'river in the genitive' } }],
    recall: { before: 'Ten park jest cichy i ładny. Leży obok ', answer: 'rzeki', after: '.', fallbackChoices: ['rzeki', 'ulicy', 'szkoły', 'poczty'] }, speakRequired: ['park', 'ładny', 'rzeki'],
    sceneCaption: { de: 'Der Mitarbeiter deutet auf eine Grünfläche im Stadtplan und fragt: „Jaki jest park nad rzeką?”', en: 'The clerk points to a green area on the city map and asks: “Jaki jest park nad rzeką?”' },
    trophyWord: { word: 'rzeki', meaning: { de: 'Fluss im Genitiv', en: 'river in the genitive' }, example: 'Park leży blisko rzeki.', whyThisWord: { de: 'Rzeki ergänzt die Beschreibung um eine leicht erkennbare Lage in der Stadt.', en: 'Rzeki adds an easy-to-recognize location to the park description.' } },
    distractors: ['jest głośny i duży', 'daleko od centrum'], placeholderCaption: { de: 'Ein stiller grüner Park erstreckt sich direkt neben einem breiten Fluss.', en: 'A quiet green park stretches directly beside a broad river.' }, songMood: 'a gentle riverside park described in calm bright colors', visualNotes: 'Green riverside park, benches, calm path, water visible beside trees, peaceful daytime atmosphere.',
  }),
  makePolishA2CompactLesson({
    slug: 'najlepsza-kawiarnia-najblizej-hotelu', title: { de: 'Das beste Café in der Nähe', en: 'The best cafe nearby' },
    situation: { de: 'Die Rezeptionistin nennt mehrere Cafés in der Umgebung. Sage, welches davon am besten und deinem Hotel am nächsten ist.', en: 'The receptionist names several cafes nearby. Say which one is best and closest to your hotel.' },
    pedagogicalGoal: 'Die festen Superlative najlepsza und najbliżej in einer Ortsbeschreibung verbinden.',
    targetText: 'Najlepsza kawiarnia jest najbliżej hotelu, przy rynku.', baseText: { de: 'Das beste Café liegt dem Hotel am nächsten, am Marktplatz.', en: 'The best cafe is closest to the hotel, by the market square.' },
    chunks: [{ targetText: 'Najlepsza kawiarnia', baseText: { de: 'Das beste Café', en: 'The best cafe' } }, { targetText: 'jest najbliżej hotelu,', baseText: { de: 'liegt dem Hotel am nächsten,', en: 'is closest to the hotel,' } }, { targetText: 'przy rynku.', baseText: { de: 'am Marktplatz.', en: 'by the market square.' } }],
    terms: [{ targetText: 'najlepsza kawiarnia', baseText: { de: 'das beste Café', en: 'the best cafe' } }, { targetText: 'najbliżej', baseText: { de: 'am nächsten', en: 'closest' } }, { targetText: 'hotelu', baseText: { de: 'Hotel im Genitiv', en: 'hotel in the genitive' } }, { targetText: 'przy rynku', baseText: { de: 'am Marktplatz', en: 'by the market square' } }, { targetText: 'kawiarnia', baseText: { de: 'Café', en: 'cafe' } }],
    recall: { before: 'Najlepsza kawiarnia jest ', answer: 'najbliżej', after: ' hotelu, przy rynku.', fallbackChoices: ['najbliżej', 'najdalej', 'wyżej', 'niżej'] }, speakRequired: ['najlepsza', 'najbliżej', 'hotelu'],
    sceneCaption: { de: 'Die Rezeptionistin markiert drei Cafés und fragt: „Która kawiarnia jest najlepsza?”', en: 'The receptionist marks three cafes and asks: “Która kawiarnia jest najlepsza?”' },
    trophyWord: { word: 'najbliżej', meaning: { de: 'am nächsten', en: 'closest' }, example: 'Ta kawiarnia jest najbliżej hotelu.', whyThisWord: { de: 'Najbliżej verbindet die beste Empfehlung mit dem kürzesten Weg von deinem Hotel.', en: 'Najbliżej connects the best recommendation with the shortest walk from your hotel.' } },
    distractors: ['restauracja obok dworca', 'daleko za parkiem'], placeholderCaption: { de: 'Drei Cafés sind auf einer Karte markiert, eines liegt direkt zwischen Hotel und Marktplatz.', en: 'Three cafes are marked on a map, with one directly between the hotel and market square.' }, songMood: 'the best nearby cafe found with one short route', visualNotes: 'Hotel map, three cafe pins, closest route highlighted toward the market square, receptionist pointing.',
  }),
  makePolishA2CompactLesson({
    slug: 'szukam-prezentu-czy-pani-ma-pomysl', title: { de: 'Ein Geschenk für einen Freund', en: 'A gift for a friend' },
    situation: { de: 'Eine Verkäuferin fragt, für wen das Geschenk sein soll. Erkläre, dass du etwas für einen Freund suchst, und bitte sie um eine Idee.', en: 'A shop assistant asks who the gift is for. Explain that you are looking for something for a friend and ask her for an idea.' },
    pedagogicalGoal: 'Mit szukam plus Genitiv einen Bedarf nennen und eine weibliche Verkäuferin nach einem pomysł fragen.',
    targetText: 'Szukam prezentu dla przyjaciela. Czy ma pani jakiś pomysł?', baseText: { de: 'Ich suche ein Geschenk für einen Freund. Haben Sie eine Idee?', en: 'I am looking for a gift for a friend. Do you have an idea?' },
    chunks: [{ targetText: 'Szukam prezentu', baseText: { de: 'Ich suche ein Geschenk', en: 'I am looking for a gift' } }, { targetText: 'dla przyjaciela.', baseText: { de: 'für einen Freund.', en: 'for a friend.' } }, { targetText: 'Czy ma pani', baseText: { de: 'Haben Sie', en: 'Do you have' } }, { targetText: 'jakiś pomysł?', baseText: { de: 'eine Idee?', en: 'an idea?' } }],
    terms: [{ targetText: 'szukam prezentu', baseText: { de: 'ich suche ein Geschenk', en: 'I am looking for a gift' } }, { targetText: 'prezentu', baseText: { de: 'Geschenk im Genitiv', en: 'gift in the genitive' } }, { targetText: 'dla przyjaciela', baseText: { de: 'für einen Freund', en: 'for a friend' } }, { targetText: 'jakiś pomysł', baseText: { de: 'eine Idee', en: 'an idea' } }, { targetText: 'czy ma pani', baseText: { de: 'haben Sie', en: 'do you have' } }],
    recall: { before: 'Szukam prezentu dla przyjaciela. Czy ma pani jakiś ', answer: 'pomysł', after: '?', fallbackChoices: ['pomysł', 'prezent', 'wybór', 'adres'] }, speakRequired: ['szukam', 'prezentu', 'pomysł'],
    sceneCaption: { de: 'Die Verkäuferin sieht auf das Geschenkregal und fragt: „Dla kogo ma być prezent?”', en: 'The shop assistant looks toward the gift shelf and asks: “Dla kogo ma być prezent?”' },
    trophyWord: { word: 'pomysł', meaning: { de: 'Idee', en: 'idea' }, example: 'Mam dobry pomysł na mały prezent.', whyThisWord: { de: 'Pomysł lädt die Verkäuferin ein, aus dem großen Angebot eine passende Richtung vorzuschlagen.', en: 'Pomysł invites the shop assistant to suggest a useful direction from the many options.' } },
    distractors: ['kupuję coś dla siebie', 'poproszę torbę papierową'], placeholderCaption: { de: 'Kleine Geschenkideen stehen in einem Regal, während die Verkäuferin auf deine Beschreibung wartet.', en: 'Small gift ideas fill a shelf while the assistant waits for your description.' }, songMood: 'a thoughtful gift search helped by one friendly idea', visualNotes: 'Gift shop, female assistant, small local items on shelves, customer considering a present for a friend.',
  }),
  makePolishA2CompactLesson({
    slug: 'typowa-polska-restauracja-blisko-hotelu', title: { de: 'Typisch polnisch essen', en: 'Typical Polish food' },
    situation: { de: 'Der Rezeptionist möchte wissen, welche Art von Lokal du suchst. Frage nach einem typisch polnischen Restaurant nahe dem Hotel.', en: 'The receptionist wants to know what kind of place you need. Ask for a typical Polish restaurant near the hotel.' },
    pedagogicalGoal: 'Mit Czy jest und einer Ortsangabe nach einer typisch polnischen Restaurantoption fragen.',
    targetText: 'Czy jest typowa polska restauracja blisko hotelu?', baseText: { de: 'Gibt es ein typisch polnisches Restaurant in der Nähe des Hotels?', en: 'Is there a typical Polish restaurant near the hotel?' },
    chunks: [{ targetText: 'Czy jest', baseText: { de: 'Gibt es', en: 'Is there' } }, { targetText: 'typowa polska restauracja', baseText: { de: 'ein typisch polnisches Restaurant', en: 'a typical Polish restaurant' } }, { targetText: 'blisko hotelu?', baseText: { de: 'in der Nähe des Hotels?', en: 'near the hotel?' } }],
    terms: [{ targetText: 'typowa', baseText: { de: 'typisch bei einem femininen Ort', en: 'typical for a feminine place' } }, { targetText: 'polska restauracja', baseText: { de: 'polnisches Restaurant', en: 'Polish restaurant' } }, { targetText: 'blisko hotelu', baseText: { de: 'nahe beim Hotel', en: 'near the hotel' } }, { targetText: 'restauracja', baseText: { de: 'Restaurant', en: 'restaurant' } }, { targetText: 'czy jest', baseText: { de: 'gibt es', en: 'is there' } }],
    recall: { before: 'Czy jest ', answer: 'typowa', after: ' polska restauracja blisko hotelu?', fallbackChoices: ['typowa', 'nowoczesna', 'mała', 'tania'] }, speakRequired: ['typowa', 'restauracja', 'hotelu'],
    sceneCaption: { de: 'Der Rezeptionist nimmt einen Stadtplan und fragt: „Jaki lokal ma być?”', en: 'The receptionist picks up a city map and asks: “Jaki lokal ma być?”' },
    trophyWord: { word: 'typowa', meaning: { de: 'typisch', en: 'typical' }, example: 'To jest typowa polska restauracja.', whyThisWord: { de: 'Typowa präzisiert, dass du nicht irgendein nahes Lokal, sondern lokale Küche suchst.', en: 'Typowa clarifies that you want local cuisine, not just any nearby restaurant.' } },
    distractors: ['kawiarnia przy rynku', 'bar otwarty rano'], placeholderCaption: { de: 'Der Rezeptionist zeigt auf ein traditionelles Restaurant wenige Straßen vom Hotel entfernt.', en: 'The receptionist points to a traditional restaurant a few streets from the hotel.' }, songMood: 'a short hotel recommendation leading toward traditional Polish food', visualNotes: 'Hotel reception, map, traditional restaurant icon nearby, receptionist indicating a short walking route.',
  }),
  makePolishA2CompactLesson({
    slug: 'polecam-rynek-wieczorem', title: { de: 'Der Marktplatz am Abend', en: 'The market square at night' },
    situation: { de: 'Ein anderer Hotelgast fragt, was man am Abend sehen sollte. Empfiehl den Marktplatz und beschreibe seine Atmosphäre.', en: 'Another hotel guest asks what is worth seeing in the evening. Recommend the market square and describe its atmosphere.' },
    pedagogicalGoal: 'Mit polecam selbst eine Empfehlung geben und einen Ort durch zwei Eigenschaften beschreiben.',
    targetText: 'Polecam rynek wieczorem. Jest piękny i spokojny.', baseText: { de: 'Ich empfehle den Marktplatz am Abend. Er ist schön und ruhig.', en: 'I recommend the market square in the evening. It is beautiful and peaceful.' },
    chunks: [{ targetText: 'Polecam rynek', baseText: { de: 'Ich empfehle den Marktplatz', en: 'I recommend the market square' } }, { targetText: 'wieczorem.', baseText: { de: 'am Abend.', en: 'in the evening.' } }, { targetText: 'Jest piękny i spokojny.', baseText: { de: 'Er ist schön und ruhig.', en: 'It is beautiful and peaceful.' } }],
    terms: [{ targetText: 'polecam', baseText: { de: 'ich empfehle', en: 'I recommend' } }, { targetText: 'rynek', baseText: { de: 'Marktplatz', en: 'market square' } }, { targetText: 'wieczorem', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: 'piękny', baseText: { de: 'schön bei einem männlichen Ort', en: 'beautiful for a masculine place' } }, { targetText: 'spokojny', baseText: { de: 'ruhig bei einem männlichen Ort', en: 'peaceful for a masculine place' } }],
    recall: { before: 'Polecam ', answer: 'rynek', after: ' wieczorem. Jest piękny i spokojny.', fallbackChoices: ['rynek', 'park', 'dworzec', 'hotel'] }, speakRequired: ['polecam', 'rynek', 'spokojny'],
    sceneCaption: { de: 'Ein Hotelgast klappt den Reiseführer zu und fragt: „Co warto zobaczyć wieczorem?”', en: 'A hotel guest closes the guidebook and asks: “Co warto zobaczyć wieczorem?”' },
    trophyWord: { word: 'rynek', meaning: { de: 'Marktplatz', en: 'market square' }, example: 'Polecam rynek wieczorem — wygląda pięknie.', whyThisWord: { de: 'Rynek ist der konkrete Ort, den du nun selbst einem anderen Besucher empfiehlst.', en: 'Rynek is the concrete place you now recommend to another visitor yourself.' } },
    distractors: ['muzeum jest zamknięte', 'rano przy dworcu'], placeholderCaption: { de: 'Der beleuchtete Marktplatz wirkt am Abend ruhig und einladend.', en: 'The illuminated market square looks calm and inviting in the evening.' }, songMood: 'a peaceful evening recommendation under warm market-square lights', visualNotes: 'Historic market square after dusk, warm lights, relaxed pedestrians, one traveler pointing it out to another.',
  }),
  makePolishA2CompactLesson({
    slug: 'ktore-ciasto-pani-poleca', title: { de: 'Kuchen zum Kaffee', en: 'Cake with coffee' },
    situation: { de: 'Eine Kellnerin bietet zur bereits servierten Tasse Kaffee mehrere Kuchen an. Bitte sie um eine Empfehlung.', en: 'A waitress offers several cakes with the coffee already on your table. Ask her for a recommendation.' },
    pedagogicalGoal: 'Eine weibliche Serviceperson mit Które ciasto pani poleca? nach einer passenden Auswahl fragen.',
    targetText: 'Które ciasto pani poleca do tej kawy?', baseText: { de: 'Welchen Kuchen empfehlen Sie zu diesem Kaffee?', en: 'Which cake do you recommend with this coffee?' },
    chunks: [{ targetText: 'Które ciasto', baseText: { de: 'Welchen Kuchen', en: 'Which cake' } }, { targetText: 'pani poleca', baseText: { de: 'empfehlen Sie', en: 'do you recommend' } }, { targetText: 'do tej kawy?', baseText: { de: 'zu diesem Kaffee?', en: 'with this coffee?' } }],
    terms: [{ targetText: 'które ciasto', baseText: { de: 'welchen Kuchen', en: 'which cake' } }, { targetText: 'ciasto', baseText: { de: 'Kuchen', en: 'cake' } }, { targetText: 'pani poleca', baseText: { de: 'Sie empfehlen', en: 'you recommend' } }, { targetText: 'do tej kawy', baseText: { de: 'zu diesem Kaffee', en: 'with this coffee' } }, { targetText: 'kawy', baseText: { de: 'Kaffee im Genitiv', en: 'coffee in the genitive' } }],
    recall: { before: 'Które ', answer: 'ciasto', after: ' pani poleca do tej kawy?', fallbackChoices: ['ciasto', 'danie', 'pieczywo', 'jabłko'] }, speakRequired: ['ciasto', 'poleca', 'kawy'],
    sceneCaption: { de: 'Die Kellnerin stellt den Kaffee ab und fragt: „Jakie ciasto podać do kawy?”', en: 'The waitress sets down the coffee and asks: “Jakie ciasto podać do kawy?”' },
    trophyWord: { word: 'ciasto', meaning: { de: 'Kuchen', en: 'cake' }, example: 'To ciasto dobrze pasuje do kawy.', whyThisWord: { de: 'Ciasto benennt genau die kleine Ergänzung, für die du den Rat der Kellnerin brauchst.', en: 'Ciasto names the exact extra item for which you need the waitress’s advice.' } },
    distractors: ['poproszę drugą kawę', 'bez cukru i mleka'], placeholderCaption: { de: 'Neben einer Tasse Kaffee stehen drei verschiedene Kuchenstücke zur Auswahl.', en: 'Three different slices of cake are displayed beside a cup of coffee.' }, songMood: 'a sweet cafe choice paired with a familiar cup of coffee', visualNotes: 'Cafe table, fresh coffee, three cake slices, female waitress waiting to recommend one.',
  }),
  makePolishA2CompactLesson({
    slug: 'to-jest-swietne-ma-pan-racje', title: { de: 'Sie haben recht', en: 'You are right' },
    situation: { de: 'Der Kellner fragt nach deinem Urteil über seine Empfehlung. Bedanke dich, lobe das Gericht und gib ihm recht.', en: 'The waiter asks for your verdict on his recommendation. Thank him, praise the dish, and say he was right.' },
    pedagogicalGoal: 'Eine Empfehlung im Präsens mit świetne bewerten und einem männlichen Kellner mit Ma pan rację zustimmen.',
    targetText: 'Dziękuję, to jest świetne. Ma pan rację.', baseText: { de: 'Danke, das ist ausgezeichnet. Sie haben recht.', en: 'Thank you, this is excellent. You are right.' },
    chunks: [{ targetText: 'Dziękuję,', baseText: { de: 'Danke,', en: 'Thank you,' } }, { targetText: 'to jest świetne.', baseText: { de: 'das ist ausgezeichnet.', en: 'this is excellent.' } }, { targetText: 'Ma pan rację.', baseText: { de: 'Sie haben recht.', en: 'You are right.' } }],
    terms: [{ targetText: 'to jest świetne', baseText: { de: 'das ist ausgezeichnet', en: 'this is excellent' } }, { targetText: 'ma pan rację', baseText: { de: 'Sie haben recht', en: 'you are right' } }, { targetText: 'rację', baseText: { de: 'recht in der festen Wendung', en: 'right in the fixed phrase' } }, { targetText: 'świetne', baseText: { de: 'ausgezeichnet', en: 'excellent' } }, { targetText: 'dziękuję', baseText: { de: 'danke', en: 'thank you' } }],
    recall: { before: 'Dziękuję, to jest świetne. Ma pan ', answer: 'rację', after: '.', fallbackChoices: ['rację', 'pytanie', 'miejsce', 'zamówienie'] }, speakRequired: ['dziękuję', 'świetne', 'rację'],
    sceneCaption: { de: 'Der Kellner sieht auf den leeren Teller und fragt: „I jak smakuje?”', en: 'The waiter looks at the empty plate and asks: “I jak smakuje?”' },
    trophyWord: { word: 'rację', meaning: { de: 'recht in der Wendung „recht haben”', en: 'right in the phrase “to be right”' }, example: 'Ma pan rację, to danie jest świetne.', whyThisWord: { de: 'Rację schließt den Pfad mit einem klaren Urteil über den Rat des Kellners ab.', en: 'Rację closes the path with a clear verdict on the waiter’s advice.' } },
    distractors: ['poproszę inne danie', 'jest trochę za zimne'], placeholderCaption: { de: 'Ein leerer Teller und ein zufriedenes Lächeln bestätigen die gute Empfehlung des Kellners.', en: 'An empty plate and a satisfied smile confirm the waiter’s good recommendation.' }, songMood: 'a successful recommendation ending in warm agreement', visualNotes: 'Restaurant table after the meal, empty plate, male waiter, diner thanking him with a satisfied expression.',
  }),
]

export const POLISH_A2_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_SEVEN_METADATA, polishA2Practical7Inputs,
  { de: 'Du hast Polnisch A2 Praxis 7 abgeschlossen und kannst Empfehlungen erfragen, Orte beschreiben und eigene Tipps geben.', en: 'You have completed Polish A2 Practical 7 and can ask for recommendations, describe places, and give tips of your own.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-8', title: 'Polnisch A2 Praxis 8', shortTitle: 'A2 Praxis 8',
  subtitle: { de: 'Mit einem Freund über Neuigkeiten, Wetter und das eigene Befinden sprechen', en: 'Talking with a friend about news, weather, and how you feel' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical8Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'naprawde-super-bardzo-sie-ciesze', title: { de: 'Das sind gute Neuigkeiten', en: 'That is great news' },
    situation: { de: 'Dein Freund erzählt dir, dass er eine neue Stelle bekommen hat. Reagiere überrascht und freue dich mit ihm.', en: 'Your friend tells you that he got a new job. React with surprise and share his happiness.' },
    pedagogicalGoal: 'Auf eine gute Nachricht unter Freunden mit Naprawdę?, Super und cieszę się reagieren.',
    targetText: 'Naprawdę? Super, bardzo się cieszę!', baseText: { de: 'Wirklich? Super, ich freue mich sehr!', en: 'Really? Great, I am very happy!' },
    chunks: [{ targetText: 'Naprawdę?', baseText: { de: 'Wirklich?', en: 'Really?' } }, { targetText: 'Super,', baseText: { de: 'Super,', en: 'Great,' } }, { targetText: 'bardzo się cieszę!', baseText: { de: 'ich freue mich sehr!', en: 'I am very happy!' } }],
    terms: [{ targetText: 'naprawdę', baseText: { de: 'wirklich', en: 'really' } }, { targetText: 'super', baseText: { de: 'super', en: 'great' } }, { targetText: 'cieszę się', baseText: { de: 'ich freue mich', en: 'I am happy' } }, { targetText: 'bardzo', baseText: { de: 'sehr', en: 'very' } }, { targetText: 'bardzo się cieszę', baseText: { de: 'ich freue mich sehr', en: 'I am very happy' } }],
    recall: { before: 'Naprawdę? ', answer: 'Super', after: ', bardzo się cieszę!', fallbackChoices: ['Super', 'Szkoda', 'Dobrze', 'Spokojnie'] }, speakRequired: ['naprawdę', 'super', 'cieszę'],
    sceneCaption: { de: 'Dein Freund kommt strahlend herein und sagt: „Mam nową pracę!”', en: 'Your friend walks in beaming and says: “Mam nową pracę!”' },
    trophyWord: { word: 'super', meaning: { de: 'super, großartig', en: 'great, fantastic' }, example: 'Super, cieszę się razem z tobą!', whyThisWord: { de: 'Super gibt deiner ersten spontanen Freude über die Nachricht eine natürliche Stimme.', en: 'Super gives your first spontaneous happiness about the news a natural voice.' } },
    distractors: ['to trudna wiadomość', 'nie mam teraz czasu'], placeholderCaption: { de: 'Zwei Freunde teilen die Freude über eine neue Stelle in der hellen Küche.', en: 'Two friends share the excitement of a new job in a bright kitchen.' }, songMood: 'a burst of shared happiness after wonderful news', visualNotes: 'Two male friends in a kitchen, one sharing job news, the other reacting with genuine excitement.',
  }),
  makePolishA2CompactLesson({
    slug: 'jest-dzis-goraco-prawda', title: { de: 'Ganz schön heiß heute', en: 'Hot today, right?' },
    situation: { de: 'Dein Freund kommentiert die starke Sonne. Bestätige die Hitze und frage, ob er Wasser dabeihat.', en: 'Your friend comments on the strong sun. Confirm the heat and ask whether he has water.' },
    pedagogicalGoal: 'Mit prawda? unter Freunden Zustimmung suchen und mit Masz…? direkt nachfragen.',
    targetText: 'Jest dziś gorąco, prawda? Masz wodę?', baseText: { de: 'Heute ist es heiß, oder? Hast du Wasser?', en: 'It is hot today, right? Do you have water?' },
    chunks: [{ targetText: 'Jest dziś gorąco,', baseText: { de: 'Heute ist es heiß,', en: 'It is hot today,' } }, { targetText: 'prawda?', baseText: { de: 'oder?', en: 'right?' } }, { targetText: 'Masz wodę?', baseText: { de: 'Hast du Wasser?', en: 'Do you have water?' } }],
    terms: [{ targetText: 'jest gorąco', baseText: { de: 'es ist heiß', en: 'it is hot' } }, { targetText: 'dziś', baseText: { de: 'heute', en: 'today' } }, { targetText: 'prawda', baseText: { de: 'oder, nicht wahr', en: 'right, is that not so' } }, { targetText: 'masz', baseText: { de: 'du hast', en: 'you have' } }, { targetText: 'wodę', baseText: { de: 'Wasser im Akkusativ', en: 'water in the accusative' } }],
    recall: { before: 'Jest dziś gorąco, ', answer: 'prawda', after: '? Masz wodę?', fallbackChoices: ['prawda', 'chyba', 'znowu', 'trochę'] }, speakRequired: ['gorąco', 'prawda', 'wodę'],
    sceneCaption: { de: 'Dein Freund hält die Hand über die Augen und sagt: „Ale dziś grzeje!”', en: 'Your friend shades his eyes and says: “Ale dziś grzeje!”' },
    trophyWord: { word: 'prawda', meaning: { de: 'oder; nicht wahr', en: 'right; is that not so' }, example: 'Dzisiaj jest naprawdę gorąco, prawda?', whyThisWord: { de: 'Prawda macht aus der Wetterbemerkung ein kurzes gemeinsames Gespräch.', en: 'Prawda turns the weather comment into a brief shared exchange.' } },
    distractors: ['jutro będzie chłodno', 'mam kawę w domu'], placeholderCaption: { de: 'Zwei Freunde stehen in greller Sonne, eine Wasserflasche ist fast leer.', en: 'Two friends stand in bright sunlight beside an almost empty water bottle.' }, songMood: 'a hot sunny pause shared between two friends', visualNotes: 'Sunny street, male friends squinting in the heat, water bottle visible, warm summer colors.',
  }),
  makePolishA2CompactLesson({
    slug: 'jestem-zmeczony-bo-malo-spalem', title: { de: 'Zu wenig geschlafen', en: 'Not enough sleep' },
    situation: { de: 'Dein Freund bemerkt, dass du müde aussiehst. Erkläre deinen Zustand und sage, dass du wenig geschlafen hast.', en: 'Your friend notices that you look tired. Explain how you feel and say that you slept little.' },
    pedagogicalGoal: 'Den männlichen Zustand zmęczony mit einem kurzen bo-Grund und dem Vergangenheitsrecycling spałem verbinden.',
    targetText: 'Dziś jestem zmęczony, bo w nocy mało spałem.', baseText: { de: 'Heute bin ich müde, weil ich in der Nacht wenig geschlafen habe.', en: 'I am tired today because I did not sleep much last night.' },
    chunks: [{ targetText: 'Dziś jestem zmęczony,', baseText: { de: 'Heute bin ich müde,', en: 'I am tired today,' } }, { targetText: 'bo w nocy', baseText: { de: 'weil ich in der Nacht', en: 'because last night' } }, { targetText: 'mało spałem.', baseText: { de: 'wenig geschlafen habe.', en: 'I did not sleep much.' } }],
    terms: [{ targetText: 'zmęczony', baseText: { de: 'müde (Mann; Frau: zmęczona)', en: 'tired (male; female: zmęczona)' }, alsoAccept: ['zmęczona'] }, { targetText: 'spałem', baseText: { de: 'ich habe geschlafen (Mann; Frau: spałam)', en: 'I slept (male; female: spałam)' }, alsoAccept: ['spałam'] }, { targetText: 'mało', baseText: { de: 'wenig', en: 'little' } }, { targetText: 'w nocy', baseText: { de: 'in der Nacht', en: 'at night' } }, { targetText: 'dziś', baseText: { de: 'heute', en: 'today' } }],
    recall: { before: 'Dziś jestem zmęczony, bo w nocy ', answer: 'mało', after: ' spałem.', fallbackChoices: ['mało', 'dużo', 'krótko', 'dobrze'] }, speakRequired: ['jestem', 'mało', 'nocy'],
    sceneCaption: { de: 'Dein Freund sieht dein müdes Gesicht und fragt: „Wyglądasz na zmęczonego. Wszystko dobrze?”', en: 'Your friend sees your tired face and asks: “Wyglądasz na zmęczonego. Wszystko dobrze?”' },
    trophyWord: { word: 'mało', meaning: { de: 'wenig', en: 'little, not much' }, example: 'Mam mało czasu na sen.', whyThisWord: { de: 'Mało erklärt knapp, warum du dich heute müde fühlst.', en: 'Mało briefly explains why you feel tired today.' } },
    distractors: ['jestem pełen energii', 'dzisiaj śpię długo'], placeholderCaption: { de: 'Ein müder Freund sitzt mit einer fast unberührten Tasse am Küchentisch.', en: 'A tired friend sits at the kitchen table beside an almost untouched cup.' }, songMood: 'a sleepy morning explained in one honest sentence', visualNotes: 'Morning kitchen, tired male speaker, soft light, friend listening with concern, untouched coffee.',
  }),
  makePolishA2CompactLesson({
    slug: 'mam-duzo-pracy-w-tym-tygodniu', title: { de: 'Eine arbeitsreiche Woche', en: 'A busy week' },
    situation: { de: 'Dein Freund fragt, ob du Zeit für einen Spaziergang hast. Erkläre, dass du diese Woche viel Arbeit hast.', en: 'Your friend asks whether you have time for a walk. Explain that you have a lot of work this week.' },
    pedagogicalGoal: 'Mit nie mam czasu korrekt verneinen und die Belastung mit dużo pracy begründen.',
    targetText: 'Nie mam czasu. Mam dużo pracy w tym tygodniu.', baseText: { de: 'Ich habe keine Zeit. Ich habe diese Woche viel Arbeit.', en: 'I do not have time. I have a lot of work this week.' },
    chunks: [{ targetText: 'Nie mam czasu.', baseText: { de: 'Ich habe keine Zeit.', en: 'I do not have time.' } }, { targetText: 'Mam dużo pracy', baseText: { de: 'Ich habe viel Arbeit', en: 'I have a lot of work' } }, { targetText: 'w tym tygodniu.', baseText: { de: 'in dieser Woche.', en: 'this week.' } }],
    terms: [{ targetText: 'nie mam czasu', baseText: { de: 'ich habe keine Zeit', en: 'I do not have time' } }, { targetText: 'dużo pracy', baseText: { de: 'viel Arbeit', en: 'a lot of work' } }, { targetText: 'w tym tygodniu', baseText: { de: 'in dieser Woche', en: 'this week' } }, { targetText: 'czasu', baseText: { de: 'Zeit im Genitiv nach der Verneinung', en: 'time in the genitive after negation' } }, { targetText: 'pracy', baseText: { de: 'Arbeit im Genitiv', en: 'work in the genitive' } }],
    recall: { before: 'Nie mam czasu. Mam ', answer: 'dużo', after: ' pracy w tym tygodniu.', fallbackChoices: ['dużo', 'mało', 'trochę', 'dosyć'] }, speakRequired: ['czasu', 'dużo', 'tygodniu'],
    sceneCaption: { de: 'Dein Freund nimmt seine Jacke und fragt: „Masz teraz czas na spacer?”', en: 'Your friend picks up his jacket and asks: “Masz teraz czas na spacer?”' },
    trophyWord: { word: 'dużo', meaning: { de: 'viel', en: 'a lot' }, example: 'W tym tygodniu mam dużo pracy.', whyThisWord: { de: 'Dużo zeigt sofort, warum der Spaziergang in dieser Woche schwer unterzubringen ist.', en: 'Dużo immediately shows why the walk is hard to fit in this week.' } },
    distractors: ['chętnie idę do parku', 'spotkamy się za godzinę'], placeholderCaption: { de: 'Ein voller Wochenplan liegt zwischen zwei Freunden, daneben wartet eine Spazierjacke.', en: 'A full weekly planner lies between two friends beside a jacket ready for a walk.' }, songMood: 'a friendly invitation meeting one unusually busy week', visualNotes: 'Apartment entryway, friend holding a jacket, crowded work planner on table, apologetic but relaxed mood.',
  }),
  makePolishA2CompactLesson({
    slug: 'szkoda-znowu-pada', title: { de: 'Schon wieder Regen', en: 'Rain again' },
    situation: { de: 'Dein Freund schlägt den Park vor, doch draußen beginnt es wieder zu regnen. Reagiere und schlage das Café vor.', en: 'Your friend suggests the park, but it starts raining again. React and suggest the cafe instead.' },
    pedagogicalGoal: 'Mit Szkoda reagieren, mit znowu pada das Wetter benennen und unter Freunden einen Ersatzplan vorschlagen.',
    targetText: 'Szkoda, znowu pada. Zostańmy dziś w kawiarni.', baseText: { de: 'Schade, es regnet schon wieder. Bleiben wir heute im Café.', en: 'That is a shame; it is raining again. Let us stay in the cafe today.' },
    chunks: [{ targetText: 'Szkoda,', baseText: { de: 'Schade,', en: 'That is a shame,' } }, { targetText: 'znowu pada.', baseText: { de: 'es regnet schon wieder.', en: 'it is raining again.' } }, { targetText: 'Zostańmy dziś', baseText: { de: 'Bleiben wir heute', en: 'Let us stay today' } }, { targetText: 'w kawiarni.', baseText: { de: 'im Café.', en: 'in the cafe.' } }],
    terms: [{ targetText: 'szkoda', baseText: { de: 'schade', en: 'that is a shame' } }, { targetText: 'znowu', baseText: { de: 'schon wieder', en: 'again' } }, { targetText: 'pada', baseText: { de: 'es regnet', en: 'it is raining' } }, { targetText: 'zostańmy', baseText: { de: 'bleiben wir', en: 'let us stay' } }, { targetText: 'w kawiarni', baseText: { de: 'im Café', en: 'in the cafe' } }],
    recall: { before: 'Szkoda, ', answer: 'znowu', after: ' pada. Zostańmy dziś w kawiarni.', fallbackChoices: ['znowu', 'rzadko', 'czasem', 'prawie'] }, speakRequired: ['szkoda', 'znowu', 'kawiarni'],
    sceneCaption: { de: 'Dein Freund blickt zur dunklen Wolke und fragt: „Idziemy teraz do parku?”', en: 'Your friend looks at the dark cloud and asks: “Idziemy teraz do parku?”' },
    trophyWord: { word: 'znowu', meaning: { de: 'schon wieder', en: 'again' }, example: 'Znowu pada nad całym miastem.', whyThisWord: { de: 'Znowu drückt die kleine Enttäuschung aus, dass der Regen euren Plan erneut ändert.', en: 'Znowu expresses the small disappointment that rain is changing the plan again.' } },
    distractors: ['słońce jest mocne', 'idziemy nad rzekę'], placeholderCaption: { de: 'Regen läuft am Caféfenster hinab, während der Park draußen leer bleibt.', en: 'Rain runs down the cafe window while the park outside remains empty.' }, songMood: 'a rainy plan change softened by a cozy cafe', visualNotes: 'Two friends by a cafe window, rain outside, empty park path, warm indoor table waiting.',
  }),
  makePolishA2CompactLesson({
    slug: 'o-nie-przykro-mi', title: { de: 'Das tut mir leid', en: 'I am sorry' },
    situation: { de: 'Dein Freund sagt, dass sein Fahrrad wieder kaputt ist. Zeige Mitgefühl und biete deine Hilfe an.', en: 'Your friend says his bike is broken again. Show sympathy and offer your help.' },
    pedagogicalGoal: 'Auf eine schlechte Nachricht mit przykro mi reagieren und mit Mogę ci pomóc? Hilfe anbieten.',
    targetText: 'O nie, przykro mi. Mogę ci pomóc?', baseText: { de: 'Oh nein, das tut mir leid. Kann ich dir helfen?', en: 'Oh no, I am sorry. Can I help you?' },
    chunks: [{ targetText: 'O nie,', baseText: { de: 'Oh nein,', en: 'Oh no,' } }, { targetText: 'przykro mi.', baseText: { de: 'das tut mir leid.', en: 'I am sorry.' } }, { targetText: 'Mogę ci pomóc?', baseText: { de: 'Kann ich dir helfen?', en: 'Can I help you?' } }],
    terms: [{ targetText: 'przykro mi', baseText: { de: 'das tut mir leid', en: 'I am sorry' } }, { targetText: 'mogę', baseText: { de: 'ich kann', en: 'I can' } }, { targetText: 'ci', baseText: { de: 'dir', en: 'you' } }, { targetText: 'pomóc', baseText: { de: 'helfen', en: 'help' } }, { targetText: 'o nie', baseText: { de: 'oh nein', en: 'oh no' } }],
    recall: { before: 'O nie, ', answer: 'przykro', after: ' mi. Mogę ci pomóc?', fallbackChoices: ['przykro', 'miło', 'wesoło', 'łatwo'] }, speakRequired: ['przykro', 'mogę', 'pomóc'],
    sceneCaption: { de: 'Dein Freund schiebt sein Fahrrad herein und sagt: „Mój rower znowu nie działa.”', en: 'Your friend wheels in his bike and says: “Mój rower znowu nie działa.”' },
    trophyWord: { word: 'przykro', meaning: { de: 'leid in der Wendung „das tut mir leid”', en: 'sorry in the phrase “I am sorry”' }, example: 'Przykro mi z powodu twojego roweru.', whyThisWord: { de: 'Przykro zeigt deinem Freund zuerst Mitgefühl, bevor du eine praktische Hilfe anbietest.', en: 'Przykro shows your friend sympathy before you offer practical help.' } },
    distractors: ['to świetna wiadomość', 'kup nowy rower'], placeholderCaption: { de: 'Ein Freund steht mit einem defekten Fahrrad im Flur, der andere bietet Hilfe an.', en: 'One friend stands with a broken bike in the hallway while the other offers help.' }, songMood: 'a disappointing problem met with immediate friendship', visualNotes: 'Apartment hallway, broken bicycle chain, concerned male friends, one ready to help.',
  }),
  makePolishA2CompactLesson({
    slug: 'dosc-dobrze-troche-zmeczony', title: { de: 'Ziemlich gut', en: 'Quite well' },
    situation: { de: 'Dein Freund fragt beiläufig, wie es läuft. Sage, dass es ziemlich gut geht, du aber etwas müde bist.', en: 'Your friend casually asks how things are going. Say that things are quite good, but you are a little tired.' },
    pedagogicalGoal: 'Das Befinden mit dość abschwächen und den männlichen Zustand zmęczony korrekt nennen.',
    targetText: 'Dość dobrze, tylko jestem trochę zmęczony.', baseText: { de: 'Ziemlich gut, ich bin nur etwas müde.', en: 'Quite well; I am just a little tired.' },
    chunks: [{ targetText: 'Dość dobrze,', baseText: { de: 'Ziemlich gut,', en: 'Quite well,' } }, { targetText: 'tylko jestem', baseText: { de: 'ich bin nur', en: 'I am just' } }, { targetText: 'trochę zmęczony.', baseText: { de: 'etwas müde.', en: 'a little tired.' } }],
    terms: [{ targetText: 'dość dobrze', baseText: { de: 'ziemlich gut', en: 'quite well' } }, { targetText: 'dość', baseText: { de: 'ziemlich', en: 'quite' } }, { targetText: 'trochę', baseText: { de: 'etwas', en: 'a little' } }, { targetText: 'zmęczony', baseText: { de: 'müde (Mann; Frau: zmęczona)', en: 'tired (male; female: zmęczona)' }, alsoAccept: ['zmęczona'] }, { targetText: 'tylko', baseText: { de: 'nur', en: 'just' } }],
    recall: { before: '', answer: 'Dość', after: ' dobrze, tylko jestem trochę zmęczony.', fallbackChoices: ['Dość', 'Bardzo', 'Całkiem', 'Trochę'] }, speakRequired: ['dość', 'dobrze', 'trochę'],
    sceneCaption: { de: 'Dein Freund setzt sich neben dich und fragt: „Jak leci?”', en: 'Your friend sits down beside you and asks: “Jak leci?”' },
    trophyWord: { word: 'dość', meaning: { de: 'ziemlich', en: 'quite' }, example: 'Dzisiaj czuję się dość dobrze.', whyThisWord: { de: 'Dość lässt dich ein gemischtes, aber insgesamt positives Befinden natürlich ausdrücken.', en: 'Dość lets you express a mixed but generally positive state naturally.' } },
    distractors: ['wszystko idzie źle', 'mam mnóstwo energii'], placeholderCaption: { de: 'Zwei Freunde sitzen entspannt auf einer Bank, einer wirkt nur ein wenig müde.', en: 'Two friends sit comfortably on a bench, with one looking only a little tired.' }, songMood: 'an ordinary check-in answered with quiet honesty', visualNotes: 'Neighborhood bench, two male friends chatting, relaxed posture, slight tiredness without worry.',
  }),
  makePolishA2CompactLesson({
    slug: 'swietnie-idziemy-na-koncert', title: { de: 'Zusammen zum Konzert', en: 'Going to the concert' },
    situation: { de: 'Dein Freund hat zwei Konzertkarten bekommen. Reagiere begeistert und bestätige euren gemeinsamen Plan.', en: 'Your friend has two concert tickets. React enthusiastically and confirm your shared plan.' },
    pedagogicalGoal: 'Mit Świetnie! begeistert reagieren und einen gemeinsamen Plan im Präsens bestätigen.',
    targetText: 'Świetnie! To idziemy razem na koncert.', baseText: { de: 'Großartig! Dann gehen wir zusammen zum Konzert.', en: 'Great! We are going to the concert together, then.' },
    chunks: [{ targetText: 'Świetnie!', baseText: { de: 'Großartig!', en: 'Great!' } }, { targetText: 'To idziemy razem', baseText: { de: 'Dann gehen wir zusammen', en: 'Then we are going together' } }, { targetText: 'na koncert.', baseText: { de: 'zum Konzert.', en: 'to the concert.' } }],
    terms: [{ targetText: 'świetnie', baseText: { de: 'großartig', en: 'great' } }, { targetText: 'idziemy', baseText: { de: 'wir gehen', en: 'we are going' } }, { targetText: 'razem', baseText: { de: 'zusammen', en: 'together' } }, { targetText: 'na koncert', baseText: { de: 'zum Konzert', en: 'to the concert' } }, { targetText: 'koncert', baseText: { de: 'Konzert', en: 'concert' } }],
    recall: { before: '', answer: 'Świetnie', after: '! To idziemy razem na koncert.', fallbackChoices: ['Świetnie', 'Szkoda', 'Niestety', 'Spokojnie'] }, speakRequired: ['świetnie', 'idziemy', 'koncert'],
    sceneCaption: { de: 'Dein Freund hält zwei Karten hoch und sagt: „Mam dwa bilety na koncert!”', en: 'Your friend holds up two tickets and says: “Mam dwa bilety na koncert!”' },
    trophyWord: { word: 'świetnie', meaning: { de: 'großartig', en: 'great' }, example: 'Świetnie, spotkamy się przed koncertem.', whyThisWord: { de: 'Świetnie bringt deine Begeisterung über den gemeinsamen Abend sofort auf den Punkt.', en: 'Świetnie captures your excitement about the shared evening immediately.' } },
    distractors: ['nie lubię tej muzyki', 'idę tam sam'], placeholderCaption: { de: 'Zwei Konzertkarten werden zwischen Freunden hochgehalten, beide freuen sich.', en: 'Two concert tickets are held up between friends as both smile.' }, songMood: 'two concert tickets sparking instant shared excitement', visualNotes: 'Two male friends, concert tickets, energetic reaction, evening plans forming in a bright room.',
  }),
  makePolishA2CompactLesson({
    slug: 'jest-mi-zimno-potrzebuje-kawy', title: { de: 'Ein kalter Morgen', en: 'A cold morning' },
    situation: { de: 'Dein Freund bemerkt die morgendliche Kälte. Sage, dass dir kalt ist, du hungrig bist und einen heißen Kaffee brauchst.', en: 'Your friend notices the cold morning. Say that you are cold and hungry and need a hot coffee.' },
    pedagogicalGoal: 'Den neutralen Zustand jest mi zimno mit dem männlichen Adjektiv głodny und potrzebuję plus Genitiv verbinden.',
    targetText: 'Jest mi zimno i jestem głodny. Potrzebuję gorącej kawy.', baseText: { de: 'Mir ist kalt und ich bin hungrig. Ich brauche einen heißen Kaffee.', en: 'I am cold and hungry. I need a hot coffee.' },
    chunks: [{ targetText: 'Jest mi zimno', baseText: { de: 'Mir ist kalt', en: 'I am cold' } }, { targetText: 'i jestem głodny.', baseText: { de: 'und ich bin hungrig.', en: 'and I am hungry.' } }, { targetText: 'Potrzebuję gorącej kawy.', baseText: { de: 'Ich brauche einen heißen Kaffee.', en: 'I need a hot coffee.' } }],
    terms: [{ targetText: 'jest mi zimno', baseText: { de: 'mir ist kalt', en: 'I am cold' } }, { targetText: 'głodny', baseText: { de: 'hungrig (Mann; Frau: głodna)', en: 'hungry (male; female: głodna)' }, alsoAccept: ['głodna'] }, { targetText: 'potrzebuję', baseText: { de: 'ich brauche', en: 'I need' } }, { targetText: 'gorącej kawy', baseText: { de: 'einen heißen Kaffee im Genitiv', en: 'hot coffee in the genitive' } }, { targetText: 'kawy', baseText: { de: 'Kaffee im Genitiv', en: 'coffee in the genitive' } }],
    recall: { before: 'Jest mi zimno i jestem głodny. Potrzebuję gorącej ', answer: 'kawy', after: '.', fallbackChoices: ['kawy', 'herbaty', 'zupy', 'wody'] }, speakRequired: ['zimno', 'potrzebuję', 'kawy'],
    sceneCaption: { de: 'Dein Freund zieht den Reißverschluss der Jacke hoch und sagt: „Ale rano jest zimno!”', en: 'Your friend zips up his jacket and says: “Ale rano jest zimno!”' },
    trophyWord: { word: 'zimno', meaning: { de: 'kalt', en: 'cold' }, example: 'Rano jest mi zimno bez kurtki.', whyThisWord: { de: 'Zimno beschreibt das morgendliche Gefühl ohne eine geschlechtsspezifische Form.', en: 'Zimno describes the morning feeling without using a gendered form.' } },
    distractors: ['jest mi za gorąco', 'mam zimną wodę'], placeholderCaption: { de: 'Zwei Freunde stehen an einem kalten Morgen vor einem Café mit dampfenden Tassen.', en: 'Two friends stand outside a cafe on a cold morning beside steaming cups.' }, songMood: 'a chilly morning warming toward coffee and breakfast', visualNotes: 'Cold morning street, zipped jackets, cafe window, steaming coffee, hungry male speaker.',
  }),
  makePolishA2CompactLesson({
    slug: 'to-jest-udany-dzien', title: { de: 'Ein gelungener Tag', en: 'A good day' },
    situation: { de: 'Dein Freund fragt am Abend, wie du dich fühlst. Fasse den Tag positiv zusammen und frage nach seiner Zustimmung.', en: 'Your friend asks in the evening how you feel. Sum up the day positively and ask whether he agrees.' },
    pedagogicalGoal: 'Einen Tag im Präsens mit udany bewerten und das eigene Befinden mit czuję się ausdrücken.',
    targetText: 'To jest udany dzień, prawda? Czuję się dobrze.', baseText: { de: 'Das ist ein gelungener Tag, oder? Ich fühle mich gut.', en: 'This is a good day, right? I feel well.' },
    chunks: [{ targetText: 'To jest udany dzień,', baseText: { de: 'Das ist ein gelungener Tag,', en: 'This is a good day,' } }, { targetText: 'prawda?', baseText: { de: 'oder?', en: 'right?' } }, { targetText: 'Czuję się dobrze.', baseText: { de: 'Ich fühle mich gut.', en: 'I feel well.' } }],
    terms: [{ targetText: 'udany dzień', baseText: { de: 'gelungener Tag', en: 'good day' } }, { targetText: 'udany', baseText: { de: 'gelungen bei einem männlichen Gegenstand', en: 'successful for a masculine thing' } }, { targetText: 'prawda', baseText: { de: 'oder, nicht wahr', en: 'right, is that not so' } }, { targetText: 'czuję się', baseText: { de: 'ich fühle mich', en: 'I feel' } }, { targetText: 'dobrze', baseText: { de: 'gut', en: 'well' } }],
    recall: { before: 'To jest ', answer: 'udany', after: ' dzień, prawda? Czuję się dobrze.', fallbackChoices: ['udany', 'trudny', 'długi', 'zwykły'] }, speakRequired: ['udany', 'dzień', 'dobrze'],
    sceneCaption: { de: 'Dein Freund lehnt sich am Abend zurück und fragt: „Jak się dzisiaj czujesz?”', en: 'Your friend leans back in the evening and asks: “Jak się dzisiaj czujesz?”' },
    trophyWord: { word: 'udany', meaning: { de: 'gelungen', en: 'successful, good' }, example: 'To jest naprawdę udany dzień.', whyThisWord: { de: 'Udany fasst die vielen kleinen positiven Momente des Tages in einem Urteil zusammen.', en: 'Udany sums up the day’s many small positive moments in one verdict.' } },
    distractors: ['jestem bardzo smutny', 'jutro mam dużo pracy'], placeholderCaption: { de: 'Zwei Freunde sitzen am Ende eines angenehmen Tages entspannt auf einem Balkon.', en: 'Two friends relax on a balcony at the end of a pleasant day.' }, songMood: 'a satisfying day winding down in good company', visualNotes: 'Evening balcony, two male friends, warm city light, calm smiles after a day that went well.',
  }),
]

export const POLISH_A2_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_EIGHT_METADATA, polishA2Practical8Inputs,
  { de: 'Du hast Polnisch A2 Praxis 8 abgeschlossen und kannst mit einem Freund über Neuigkeiten, Wetter und dein Befinden sprechen.', en: 'You have completed Polish A2 Practical 8 and can talk with a friend about news, weather, and how you feel.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_NINE_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-9', title: 'Polnisch A2 Praxis 9', shortTitle: 'A2 Praxis 9',
  subtitle: { de: 'Alltagsprobleme mit Vergangenheit und Gegenwart höflich lösen', en: 'Solving everyday problems politely with past and present' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical9Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'prysznic-nie-dziala-zadzwonilam', title: { de: 'Die Dusche funktioniert nicht', en: 'The shower does not work' },
    situation: { de: 'Ein Hotelmitarbeiter fragt nach dem Problem mit der Dusche. Sage, dass sie nicht funktioniert, du schon die Rezeption angerufen hast und eine Prüfung möchtest.', en: 'A hotel employee asks about the problem with the shower. Say it does not work, you already called reception, and you want it checked.' },
    pedagogicalGoal: 'Die feminine Vergangenheit zadzwoniłam mit dem aktuellen Problem nie działa und einer höflichen Lösung verbinden.',
    targetText: 'Prysznic nie działa. Zadzwoniłam już do recepcji. Czy można to sprawdzić?', baseText: { de: 'Die Dusche funktioniert nicht. Ich habe schon an der Rezeption angerufen. Kann man das prüfen?', en: 'The shower does not work. I already called reception. Can this be checked?' },
    chunks: [{ targetText: 'Prysznic nie działa.', baseText: { de: 'Die Dusche funktioniert nicht.', en: 'The shower does not work.' } }, { targetText: 'Zadzwoniłam już do recepcji.', baseText: { de: 'Ich habe schon an der Rezeption angerufen.', en: 'I already called reception.' } }, { targetText: 'Czy można', baseText: { de: 'Kann man', en: 'Can someone' } }, { targetText: 'to sprawdzić?', baseText: { de: 'das prüfen?', en: 'check this?' } }],
    terms: [{ targetText: 'zadzwoniłam', baseText: { de: 'ich habe angerufen (Frau; Mann: zadzwoniłem)', en: 'I called (female; male: zadzwoniłem)' }, alsoAccept: ['zadzwoniłem'] }, { targetText: 'prysznic', baseText: { de: 'Dusche', en: 'shower' } }, { targetText: 'nie działa', baseText: { de: 'funktioniert nicht', en: 'does not work' } }, { targetText: 'do recepcji', baseText: { de: 'an der Rezeption', en: 'reception' } }, { targetText: 'sprawdzić', baseText: { de: 'prüfen', en: 'check' } }],
    recall: { before: 'Prysznic nie działa. Zadzwoniłam już do ', answer: 'recepcji', after: '. Czy można to sprawdzić?', fallbackChoices: ['recepcji', 'obsługi', 'administracji', 'restauracji'] }, speakRequired: ['prysznic', 'recepcji', 'sprawdzić'],
    sceneCaption: { de: 'Der Hotelmitarbeiter öffnet den Werkzeugkoffer und fragt: „Co się dzieje z prysznicem?”', en: 'The hotel employee opens his toolbox and asks: “Co się dzieje z prysznicem?”' },
    trophyWord: { word: 'prysznic', meaning: { de: 'Dusche', en: 'shower' }, example: 'Prysznic w tym pokoju nie działa.', whyThisWord: { de: 'Prysznic benennt sofort das defekte Gerät, damit der Mitarbeiter die richtige Reparatur beginnen kann.', en: 'Prysznic immediately identifies the broken fixture so the employee can begin the correct repair.' } },
    distractors: ['woda jest już ciepła', 'proszę nowy ręcznik'], placeholderCaption: { de: 'Ein Hotelmitarbeiter prüft eine Dusche, während die Rezeption auf dem Telefon angezeigt wird.', en: 'A hotel employee checks a shower while reception is shown on the phone.' }, songMood: 'a hotel repair request moving calmly toward a solution', visualNotes: 'Hotel bathroom, silent shower, maintenance worker with tools, phone showing a completed call to reception.',
  }),
  makePolishA2CompactLesson({
    slug: 'zamowilam-zupe-nadal-jej-nie-ma', title: { de: 'Die Suppe fehlt noch', en: 'The soup is still missing' },
    situation: { de: 'Der Kellner fragt, ob deine Bestellung vollständig ist. Sage, dass du Suppe bestellt hast, sie aber weiterhin fehlt, und bitte um eine Prüfung.', en: 'The waiter asks whether your order is complete. Say that you ordered soup, it is still missing, and ask for a check.' },
    pedagogicalGoal: 'Die feminine Vergangenheit zamówiłam mit dem aktuellen Fehlen nadal jej nie ma in einer Serviceklärung mischen.',
    targetText: 'Zamówiłam zupę, ale nadal jej nie ma. Czy można to sprawdzić?', baseText: { de: 'Ich habe Suppe bestellt, aber sie ist immer noch nicht da. Kann man das prüfen?', en: 'I ordered soup, but it is still not here. Can this be checked?' },
    chunks: [{ targetText: 'Zamówiłam zupę,', baseText: { de: 'Ich habe Suppe bestellt,', en: 'I ordered soup,' } }, { targetText: 'ale nadal jej nie ma.', baseText: { de: 'aber sie ist immer noch nicht da.', en: 'but it is still not here.' } }, { targetText: 'Czy można', baseText: { de: 'Kann man', en: 'Can someone' } }, { targetText: 'to sprawdzić?', baseText: { de: 'das prüfen?', en: 'check this?' } }],
    terms: [{ targetText: 'zamówiłam', baseText: { de: 'ich habe bestellt (Frau; Mann: zamówiłem)', en: 'I ordered (female; male: zamówiłem)' }, alsoAccept: ['zamówiłem'] }, { targetText: 'zupę', baseText: { de: 'Suppe im Akkusativ', en: 'soup in the accusative' } }, { targetText: 'nadal', baseText: { de: 'immer noch', en: 'still' } }, { targetText: 'jej nie ma', baseText: { de: 'sie ist nicht da', en: 'it is not here' } }, { targetText: 'sprawdzić', baseText: { de: 'prüfen', en: 'check' } }],
    recall: { before: 'Zamówiłam zupę, ale ', answer: 'nadal', after: ' jej nie ma. Czy można to sprawdzić?', fallbackChoices: ['nadal', 'zawsze', 'czasem', 'prawie'] }, speakRequired: ['zupę', 'nadal', 'sprawdzić'],
    sceneCaption: { de: 'Der Kellner blickt auf den leeren Platz am Tisch und fragt: „Czy zamówienie jest kompletne?”', en: 'The waiter looks at the empty place on the table and asks: “Czy zamówienie jest kompletne?”' },
    trophyWord: { word: 'nadal', meaning: { de: 'immer noch', en: 'still' }, example: 'Zupy nadal nie ma na stole.', whyThisWord: { de: 'Nadal macht klar, dass die frühere Bestellung bis jetzt noch nicht angekommen ist.', en: 'Nadal makes clear that the earlier order has still not arrived.' } },
    distractors: ['reszta już jest', 'poproszę drugie danie'], placeholderCaption: { de: 'Ein leerer Suppenplatz bleibt neben den bereits servierten Tellern frei.', en: 'An empty soup place remains beside the dishes already served.' }, songMood: 'a missing soup order checked without turning into a complaint', visualNotes: 'Restaurant table, served dishes, empty soup setting, waiter checking the order pad.',
  }),
  makePolishA2CompactLesson({
    slug: 'zadzwonilam-wi-fi-nie-dziala', title: { de: 'Kein WLAN im Zimmer', en: 'No Wi-Fi in the room' },
    situation: { de: 'Die Rezeption fragt, ob die Verbindung jetzt funktioniert. Sage, dass du angerufen hast, weil das WLAN im Zimmer nicht funktioniert, und bitte um Hilfe.', en: 'Reception asks whether the connection works now. Say that you called because the Wi-Fi in the room does not work, and ask for help.' },
    pedagogicalGoal: 'Die feminine Vergangenheit zadzwoniłam mit einem gegenwärtigen bo-Grund und Czy można pomóc? verbinden.',
    targetText: 'Zadzwoniłam do recepcji, bo wi-fi w pokoju nie działa. Czy można mi pomóc?', baseText: { de: 'Ich habe an der Rezeption angerufen, weil das WLAN im Zimmer nicht funktioniert. Können Sie mir helfen?', en: 'I called reception because the Wi-Fi in the room does not work. Can you help me?' },
    chunks: [{ targetText: 'Zadzwoniłam do recepcji,', baseText: { de: 'Ich habe an der Rezeption angerufen,', en: 'I called reception,' } }, { targetText: 'bo wi-fi w pokoju', baseText: { de: 'weil das WLAN im Zimmer', en: 'because the Wi-Fi in the room' } }, { targetText: 'nie działa.', baseText: { de: 'nicht funktioniert.', en: 'does not work.' } }, { targetText: 'Czy można mi pomóc?', baseText: { de: 'Kann man mir helfen?', en: 'Can someone help me?' } }],
    terms: [{ targetText: 'zadzwoniłam', baseText: { de: 'ich habe angerufen (Frau; Mann: zadzwoniłem)', en: 'I called (female; male: zadzwoniłem)' }, alsoAccept: ['zadzwoniłem'] }, { targetText: 'do recepcji', baseText: { de: 'an der Rezeption', en: 'reception' } }, { targetText: 'wi-fi', baseText: { de: 'WLAN', en: 'Wi-Fi' } }, { targetText: 'w pokoju', baseText: { de: 'im Zimmer', en: 'in the room' } }, { targetText: 'nie działa', baseText: { de: 'funktioniert nicht', en: 'does not work' } }, { targetText: 'czy można mi pomóc', baseText: { de: 'kann man mir helfen', en: 'can someone help me' } }],
    recall: { before: 'Zadzwoniłam do ', answer: 'recepcji', after: ', bo wi-fi w pokoju nie działa. Czy można mi pomóc?', fallbackChoices: ['recepcji', 'obsługi', 'restauracji', 'informacji'] }, speakRequired: ['recepcji', 'pokoju', 'pomóc'],
    sceneCaption: { de: 'Die Mitarbeiterin sieht auf den Routerstatus und fragt: „Czy połączenie już działa?”', en: 'The staff member checks the router status and asks: “Czy połączenie już działa?”' },
    trophyWord: { word: 'recepcji', meaning: { de: 'Rezeption im Genitiv', en: 'reception in the genitive' }, example: 'Numer recepcji jest obok telefonu.', whyThisWord: { de: 'Recepcji verbindet deinen früheren Anruf mit der Stelle, die das aktuelle Problem lösen kann.', en: 'Recepcji connects your earlier call with the desk that can solve the current problem.' } },
    distractors: ['połączenie jest szybkie', 'mam internet w lobby'], placeholderCaption: { de: 'Ein Laptop zeigt keine Verbindung, während der Routerstatus an der Rezeption geprüft wird.', en: 'A laptop shows no connection while reception checks the router status.' }, songMood: 'a silent hotel connection problem routed to the right desk', visualNotes: 'Hotel room laptop offline, reception router dashboard, phone call already made, staff preparing to help.',
  }),
  makePolishA2CompactLesson({
    slug: 'zgubilam-klucz-nie-moge-wejsc', title: { de: 'Der Schlüssel ist weg', en: 'The key is missing' },
    situation: { de: 'Der Rezeptionist fragt, wie er helfen kann. Sage, dass du den Schlüssel verloren hast, jetzt nicht hineinkommst, und bitte um Hilfe.', en: 'The receptionist asks how he can help. Say that you lost the key, cannot get in now, and ask for help.' },
    pedagogicalGoal: 'Die feminine Vergangenheit zgubiłam mit dem aktuellen Problem nie mogę wejść in einer höflichen Bitte verbinden.',
    targetText: 'Zgubiłam klucz i teraz nie mogę wejść. Czy można mi pomóc?', baseText: { de: 'Ich habe den Schlüssel verloren und komme jetzt nicht ins Zimmer. Können Sie mir helfen?', en: 'I lost my key and cannot get into my room now. Can you help me?' },
    chunks: [{ targetText: 'Zgubiłam klucz', baseText: { de: 'Ich habe den Schlüssel verloren', en: 'I lost the key' } }, { targetText: 'i teraz', baseText: { de: 'und jetzt', en: 'and now' } }, { targetText: 'nie mogę wejść.', baseText: { de: 'kann ich nicht hineingehen.', en: 'I cannot get in.' } }, { targetText: 'Czy można mi pomóc?', baseText: { de: 'Kann man mir helfen?', en: 'Can someone help me?' } }],
    terms: [{ targetText: 'zgubiłam', baseText: { de: 'ich habe verloren (Frau; Mann: zgubiłem)', en: 'I lost (female; male: zgubiłem)' }, alsoAccept: ['zgubiłem'] }, { targetText: 'klucz', baseText: { de: 'Schlüssel', en: 'key' } }, { targetText: 'nie mogę', baseText: { de: 'ich kann nicht', en: 'I cannot' } }, { targetText: 'wejść', baseText: { de: 'hineingehen', en: 'get in' } }, { targetText: 'pomóc mi', baseText: { de: 'mir helfen', en: 'help me' } }],
    recall: { before: 'Zgubiłam klucz i teraz nie mogę ', answer: 'wejść', after: '. Czy można mi pomóc?', fallbackChoices: ['wejść', 'wyjść', 'wrócić', 'czekać'] }, speakRequired: ['klucz', 'wejść', 'pomóc'],
    sceneCaption: { de: 'Der Rezeptionist sieht dich vor dem Schalter warten und fragt: „W czym mogę pomóc?”', en: 'The receptionist sees you waiting at the desk and asks: “W czym mogę pomóc?”' },
    trophyWord: { word: 'wejść', meaning: { de: 'hineingehen', en: 'get in, enter' }, example: 'Bez karty nie można wejść do pokoju.', whyThisWord: { de: 'Wejść benennt die unmittelbare Folge des verlorenen Schlüssels und macht den Hilfebedarf klar.', en: 'Wejść names the immediate result of the lost key and makes the need for help clear.' } },
    distractors: ['mam zapasową kartę', 'pokój jest otwarty'], placeholderCaption: { de: 'Eine verschlossene Hotelzimmertür steht hinter einem leeren Platz am Schlüsselbrett.', en: 'A locked hotel-room door appears beside an empty space on the key board.' }, songMood: 'a lost key problem brought calmly to reception', visualNotes: 'Hotel desk, empty key slot, locked room door in background, receptionist ready to issue a replacement.',
  }),
  makePolishA2CompactLesson({
    slug: 'zadzwonilam-po-taksowke-zamowic-kolejna', title: { de: 'Ein anderes Taxi', en: 'Another taxi' },
    situation: { de: 'Die Rezeptionistin fragt, ob das bestellte Taxi angekommen ist. Sage, dass du angerufen hast, es aber noch fehlt, und bitte um ein anderes.', en: 'The receptionist asks whether the taxi arrived. Say that you called, it is still missing, and ask for another one.' },
    pedagogicalGoal: 'Die feminine Vergangenheit zadzwoniłam mit dem aktuellen Fehlen und czy można plus Infinitiv verbinden.',
    targetText: 'Zadzwoniłam po taksówkę, ale nadal jej nie ma. Czy można zamówić kolejną?', baseText: { de: 'Ich habe ein Taxi gerufen, aber es ist immer noch nicht da. Kann man ein anderes bestellen?', en: 'I called for a taxi, but it is still not here. Can another one be ordered?' },
    chunks: [{ targetText: 'Zadzwoniłam po taksówkę,', baseText: { de: 'Ich habe ein Taxi gerufen,', en: 'I called for a taxi,' } }, { targetText: 'ale nadal jej nie ma.', baseText: { de: 'aber es ist immer noch nicht da.', en: 'but it is still not here.' } }, { targetText: 'Czy można zamówić', baseText: { de: 'Kann man bestellen', en: 'Can someone order' } }, { targetText: 'kolejną?', baseText: { de: 'ein anderes?', en: 'another one?' } }],
    terms: [{ targetText: 'zadzwoniłam', baseText: { de: 'ich habe angerufen (Frau; Mann: zadzwoniłem)', en: 'I called (female; male: zadzwoniłem)' }, alsoAccept: ['zadzwoniłem'] }, { targetText: 'zadzwonić po taksówkę', baseText: { de: 'ein Taxi rufen', en: 'call for a taxi' } }, { targetText: 'nadal jej nie ma', baseText: { de: 'es ist immer noch nicht da', en: 'it is still not here' } }, { targetText: 'zamówić', baseText: { de: 'bestellen', en: 'order' } }, { targetText: 'kolejną', baseText: { de: 'eine weitere im Akkusativ', en: 'another one in the accusative' } }],
    recall: { before: 'Zadzwoniłam po taksówkę, ale nadal jej nie ma. Czy można ', answer: 'zamówić', after: ' kolejną?', fallbackChoices: ['zamówić', 'zatrzymać', 'sprawdzić', 'odwołać'] }, speakRequired: ['taksówkę', 'zamówić', 'kolejną'],
    sceneCaption: { de: 'Die Rezeptionistin blickt durch die leere Einfahrt und fragt: „Czy taksówka już przyjechała?”', en: 'The receptionist looks through the empty driveway and asks: “Czy taksówka już przyjechała?”' },
    trophyWord: { word: 'kolejną', meaning: { de: 'eine weitere', en: 'another one' }, example: 'Proszę zamówić kolejną taksówkę.', whyThisWord: { de: 'Kolejną richtet das Gespräch sofort auf eine einfache Ersatzlösung statt auf eine längere Beschwerde.', en: 'Kolejną directs the exchange immediately toward a simple replacement instead of a longer complaint.' } },
    distractors: ['ta już czeka przed hotelem', 'pojadę jutro autobusem'], placeholderCaption: { de: 'Die Hotelzufahrt bleibt leer, während die Rezeptionistin eine neue Taxibestellung öffnet.', en: 'The hotel driveway remains empty as the receptionist opens a new taxi booking.' }, songMood: 'a missing taxi replaced with one calm request', visualNotes: 'Hotel entrance, empty taxi lane, receptionist at booking screen, guest waiting with a small bag.',
  }),
  makePolishA2CompactLesson({
    slug: 'zaplacilam-brakuje-jednego-zlotego', title: { de: 'Ein Złoty fehlt', en: 'One zloty is missing' },
    situation: { de: 'Die Kassiererin legt das Wechselgeld hin. Sage, dass du bar bezahlt hast, ein Złoty fehlt, und bitte sie, das Wechselgeld zu prüfen.', en: 'The cashier puts down the change. Say that you paid cash, one zloty is missing, and ask her to check the change.' },
    pedagogicalGoal: 'Die feminine Vergangenheit zapłaciłam mit dem aktuellen brakuje und einer höflichen Prüfbitte mischen.',
    targetText: 'Zapłaciłam gotówką, ale brakuje jednego złotego. Czy można sprawdzić resztę?', baseText: { de: 'Ich habe bar bezahlt, aber ein Złoty fehlt. Kann man das Wechselgeld prüfen?', en: 'I paid cash, but one zloty is missing. Can the change be checked?' },
    chunks: [{ targetText: 'Zapłaciłam gotówką,', baseText: { de: 'Ich habe bar bezahlt,', en: 'I paid cash,' } }, { targetText: 'ale brakuje jednego złotego.', baseText: { de: 'aber ein Złoty fehlt.', en: 'but one zloty is missing.' } }, { targetText: 'Czy można', baseText: { de: 'Kann man', en: 'Can someone' } }, { targetText: 'sprawdzić resztę?', baseText: { de: 'das Wechselgeld prüfen?', en: 'check the change?' } }],
    terms: [{ targetText: 'zapłaciłam', baseText: { de: 'ich habe bezahlt (Frau; Mann: zapłaciłem)', en: 'I paid (female; male: zapłaciłem)' }, alsoAccept: ['zapłaciłem'] }, { targetText: 'gotówką', baseText: { de: 'bar, mit Bargeld', en: 'in cash' } }, { targetText: 'brakuje', baseText: { de: 'es fehlt', en: 'is missing' } }, { targetText: 'jednego złotego', baseText: { de: 'ein Złoty im Genitiv', en: 'one zloty in the genitive' } }, { targetText: 'resztę', baseText: { de: 'Wechselgeld im Akkusativ', en: 'change in the accusative' } }],
    recall: { before: 'Zapłaciłam gotówką, ale brakuje jednego złotego. Czy można sprawdzić ', answer: 'resztę', after: '?', fallbackChoices: ['resztę', 'cenę', 'kwotę', 'kasę'] }, speakRequired: ['gotówką', 'brakuje', 'resztę'],
    sceneCaption: { de: 'Die Kassiererin schiebt Münzen über den Tresen und sagt: „Oto reszta.”', en: 'The cashier slides coins across the counter and says: “Oto reszta.”' },
    trophyWord: { word: 'resztę', meaning: { de: 'Wechselgeld im Akkusativ', en: 'change in the accusative' }, example: 'Proszę jeszcze raz sprawdzić resztę.', whyThisWord: { de: 'Resztę benennt genau den kleinen Betrag, der ohne Vorwurf noch einmal geprüft werden soll.', en: 'Resztę names the exact small amount that needs checking again without making an accusation.' } },
    distractors: ['wszystko się zgadza', 'płacę teraz kartą'], placeholderCaption: { de: 'Münzen liegen neben einem Kassenbon, eine Ein-Złoty-Lücke ist sichtbar.', en: 'Coins lie beside a receipt with a one-zloty gap visible.' }, songMood: 'a tiny cash mismatch corrected with quiet precision', visualNotes: 'Shop counter, coins, receipt, cashier recounting change, customer pointing calmly to the amount.',
  }),
  makePolishA2CompactLesson({
    slug: 'kupilam-ladowarke-nie-dziala', title: { de: 'Das neue Ladegerät ist defekt', en: 'The new charger is faulty' },
    situation: { de: 'Der Verkäufer fragt nach dem Problem mit dem heute gekauften Ladegerät. Erkläre, dass es jetzt nicht funktioniert, und bitte um Umtausch.', en: 'The clerk asks about the charger you bought today. Explain that it does not work now and ask for an exchange.' },
    pedagogicalGoal: 'Die feminine Vergangenheit kupiłam mit dem aktuellen nie działa und Czy można ją wymienić? verbinden.',
    targetText: 'Kupiłam tę ładowarkę dzisiaj, ale teraz nie działa. Czy można ją wymienić?', baseText: { de: 'Ich habe dieses Ladegerät heute gekauft, aber jetzt funktioniert es nicht. Kann man es umtauschen?', en: 'I bought this charger today, but now it does not work. Can it be exchanged?' },
    chunks: [{ targetText: 'Kupiłam tę ładowarkę dzisiaj,', baseText: { de: 'Ich habe dieses Ladegerät heute gekauft,', en: 'I bought this charger today,' } }, { targetText: 'ale teraz nie działa.', baseText: { de: 'aber jetzt funktioniert es nicht.', en: 'but now it does not work.' } }, { targetText: 'Czy można ją', baseText: { de: 'Kann man es', en: 'Can it be' } }, { targetText: 'wymienić?', baseText: { de: 'umtauschen?', en: 'exchanged?' } }],
    terms: [{ targetText: 'kupiłam', baseText: { de: 'ich habe gekauft (Frau; Mann: kupiłem)', en: 'I bought (female; male: kupiłem)' }, alsoAccept: ['kupiłem'] }, { targetText: 'tę ładowarkę', baseText: { de: 'dieses Ladegerät im Akkusativ', en: 'this charger in the accusative' } }, { targetText: 'dzisiaj', baseText: { de: 'heute', en: 'today' } }, { targetText: 'nie działa', baseText: { de: 'funktioniert nicht', en: 'does not work' } }, { targetText: 'wymienić', baseText: { de: 'umtauschen', en: 'exchange' } }],
    recall: { before: 'Kupiłam tę ładowarkę dzisiaj, ale teraz nie ', answer: 'działa', after: '. Czy można ją wymienić?', fallbackChoices: ['działa', 'ładuje', 'pasuje', 'świeci'] }, speakRequired: ['ładowarkę', 'działa', 'wymienić'],
    sceneCaption: { de: 'Der Verkäufer nimmt das Ladegerät entgegen und fragt: „Co się dzieje z ładowarką?”', en: 'The clerk takes the charger and asks: “Co się dzieje z ładowarką?”' },
    trophyWord: { word: 'działa', meaning: { de: 'funktioniert', en: 'works' }, example: 'Ta ładowarka nie działa poprawnie.', whyThisWord: { de: 'Działa benennt den gegenwärtigen Defekt, der den Umtausch nach dem heutigen Kauf begründet.', en: 'Działa names the current fault that justifies the exchange after today’s purchase.' } },
    distractors: ['jest w dobrym stanie', 'poproszę nowy telefon'], placeholderCaption: { de: 'Ein neues Ladegerät liegt ohne Stromanzeige neben dem heutigen Kassenbon.', en: 'A new charger lies without a power light beside today’s receipt.' }, songMood: 'a faulty new purchase moved smoothly toward an exchange', visualNotes: 'Electronics counter, charger with no indicator light, same-day receipt, clerk preparing a replacement.',
  }),
  makePolishA2CompactLesson({
    slug: 'zamowilam-goraca-zupe-jest-zimna', title: { de: 'Die Suppe ist kalt', en: 'The soup is cold' },
    situation: { de: 'Die Kellnerin fragt, ob mit der Suppe alles stimmt. Sage, dass du eine heiße Suppe bestellt hast, sie aber kalt ist, und bitte ums Aufwärmen.', en: 'The waitress asks whether the soup is all right. Say that you ordered hot soup, it is cold, and ask for it to be warmed.' },
    pedagogicalGoal: 'Die feminine Vergangenheit zamówiłam mit der gegenwärtigen Eigenschaft zimna und czy można plus Infinitiv mischen.',
    targetText: 'Zamówiłam gorącą zupę, ale jest zimna. Czy można ją podgrzać?', baseText: { de: 'Ich habe eine heiße Suppe bestellt, aber sie ist kalt. Kann man sie aufwärmen?', en: 'I ordered hot soup, but it is cold. Can it be warmed up?' },
    chunks: [{ targetText: 'Zamówiłam gorącą zupę,', baseText: { de: 'Ich habe eine heiße Suppe bestellt,', en: 'I ordered hot soup,' } }, { targetText: 'ale jest zimna.', baseText: { de: 'aber sie ist kalt.', en: 'but it is cold.' } }, { targetText: 'Czy można ją', baseText: { de: 'Kann man sie', en: 'Can it be' } }, { targetText: 'podgrzać?', baseText: { de: 'aufwärmen?', en: 'warmed up?' } }],
    terms: [{ targetText: 'zamówiłam', baseText: { de: 'ich habe bestellt (Frau; Mann: zamówiłem)', en: 'I ordered (female; male: zamówiłem)' }, alsoAccept: ['zamówiłem'] }, { targetText: 'gorącą zupę', baseText: { de: 'heiße Suppe im Akkusativ', en: 'hot soup in the accusative' } }, { targetText: 'zimna', baseText: { de: 'kalt bei einer femininen Sache', en: 'cold for a feminine thing' } }, { targetText: 'podgrzać', baseText: { de: 'aufwärmen', en: 'warm up' } }, { targetText: 'czy można', baseText: { de: 'kann man', en: 'is it possible to' } }],
    recall: { before: 'Zamówiłam gorącą zupę, ale jest ', answer: 'zimna', after: '. Czy można ją podgrzać?', fallbackChoices: ['zimna', 'gorąca', 'słona', 'gęsta'] }, speakRequired: ['zupę', 'zimna', 'podgrzać'],
    sceneCaption: { de: 'Die Kellnerin sieht auf die volle Schüssel und fragt: „Czy z zupą wszystko w porządku?”', en: 'The waitress looks at the full bowl and asks: “Czy z zupą wszystko w porządku?”' },
    trophyWord: { word: 'podgrzać', meaning: { de: 'aufwärmen', en: 'warm up' }, example: 'Czy można podgrzać tę zupę?', whyThisWord: { de: 'Podgrzać nennt sofort die kleine Lösung, die aus der kalten Suppe wieder die bestellte Mahlzeit macht.', en: 'Podgrzać immediately names the small fix that turns the cold soup back into the meal you ordered.' } },
    distractors: ['proszę inne danie', 'zupa bardzo smakuje'], placeholderCaption: { de: 'Eine kalte Suppenschüssel steht vor der Kellnerin, die sie gleich zurücknehmen kann.', en: 'A cold bowl of soup sits before the waitress, ready to be taken back for warming.' }, songMood: 'a cold soup fixed with one simple courteous request', visualNotes: 'Restaurant table, full soup bowl without steam, female waitress ready to warm it, calm exchange.',
  }),
  makePolishA2CompactLesson({
    slug: 'zle-spalam-za-duzo-halasu', title: { de: 'Zu laut zum Schlafen', en: 'Too noisy to sleep' },
    situation: { de: 'Die Rezeptionistin fragt, ob das Zimmer bequem ist. Sage, dass du schlecht geschlafen hast, weil es jetzt zu viel Lärm gibt, und frage nach einem ruhigeren Ort.', en: 'The receptionist asks whether the room is comfortable. Say that you slept badly because there is too much noise now, and ask for somewhere quieter.' },
    pedagogicalGoal: 'Die feminine Vergangenheit spałam mit dem aktuellen jest za dużo hałasu und der Lösungsfrage Czy jest gdzieś ciszej? verbinden.',
    targetText: 'Źle spałam, bo w pokoju jest za dużo hałasu. Czy jest gdzieś ciszej?', baseText: { de: 'Ich habe schlecht geschlafen, weil im Zimmer zu viel Lärm ist. Ist es irgendwo ruhiger?', en: 'I slept badly because there is too much noise in the room. Is there somewhere quieter?' },
    chunks: [{ targetText: 'Źle spałam,', baseText: { de: 'Ich habe schlecht geschlafen,', en: 'I slept badly,' } }, { targetText: 'bo w pokoju jest', baseText: { de: 'weil im Zimmer', en: 'because in the room there is' } }, { targetText: 'za dużo hałasu.', baseText: { de: 'zu viel Lärm ist.', en: 'too much noise.' } }, { targetText: 'Czy jest gdzieś ciszej?', baseText: { de: 'Ist es irgendwo ruhiger?', en: 'Is it quieter anywhere?' } }],
    terms: [{ targetText: 'spałam', baseText: { de: 'ich habe geschlafen (Frau; Mann: spałem)', en: 'I slept (female; male: spałem)' }, alsoAccept: ['spałem'] }, { targetText: 'źle', baseText: { de: 'schlecht', en: 'badly' } }, { targetText: 'w pokoju', baseText: { de: 'im Zimmer', en: 'in the room' } }, { targetText: 'za dużo hałasu', baseText: { de: 'zu viel Lärm', en: 'too much noise' } }, { targetText: 'ciszej', baseText: { de: 'ruhiger', en: 'quieter' } }],
    recall: { before: 'Źle spałam, bo w pokoju jest za dużo hałasu. Czy jest gdzieś ', answer: 'ciszej', after: '?', fallbackChoices: ['ciszej', 'głośniej', 'cieplej', 'jaśniej'] }, speakRequired: ['pokoju', 'hałasu', 'ciszej'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet den Zimmerplan und fragt: „Czy pokój jest wygodny?”', en: 'The receptionist opens the room plan and asks: “Czy pokój jest wygodny?”' },
    trophyWord: { word: 'ciszej', meaning: { de: 'ruhiger, leiser', en: 'quieter' }, example: 'Od podwórza jest zwykle ciszej.', whyThisWord: { de: 'Ciszej lenkt das Gespräch vom Lärmproblem direkt zu einer besseren Zimmeroption.', en: 'Ciszej moves the exchange directly from the noise problem to a better room option.' } },
    distractors: ['pokój jest bardzo wygodny', 'rano wyjeżdżam z hotelu'], placeholderCaption: { de: 'Auf dem Zimmerplan liegt ein ruhiger Raum zum Innenhof abseits der lauten Straße.', en: 'The room plan shows a quiet courtyard room away from the noisy street.' }, songMood: 'a restless night redirected toward a quieter room', visualNotes: 'Hotel desk, room plan, noisy street-side room and quiet courtyard option, receptionist comparing locations.',
  }),
  makePolishA2CompactLesson({
    slug: 'zadzwonilam-rano-teraz-wszystko-dziala', title: { de: 'Jetzt funktioniert alles', en: 'Everything works now' },
    situation: { de: 'Der Hotelmitarbeiter fragt, ob das Problem behoben ist. Sage, dass du morgens angerufen hast, jetzt alles funktioniert, und bedanke dich.', en: 'The hotel employee asks whether the problem is fixed. Say that you called in the morning, everything works now, and thank them.' },
    pedagogicalGoal: 'Die feminine Vergangenheit zadzwoniłam mit dem gelösten Präsenszustand wszystko działa und einem Dank verbinden.',
    targetText: 'Zadzwoniłam rano, a teraz wszystko działa. Bardzo dziękuję za pomoc.', baseText: { de: 'Ich habe heute Morgen angerufen, und jetzt funktioniert alles. Vielen Dank für die Hilfe.', en: 'I called this morning, and now everything works. Thank you very much for the help.' },
    chunks: [{ targetText: 'Zadzwoniłam rano,', baseText: { de: 'Ich habe heute Morgen angerufen,', en: 'I called this morning,' } }, { targetText: 'a teraz wszystko działa.', baseText: { de: 'und jetzt funktioniert alles.', en: 'and now everything works.' } }, { targetText: 'Bardzo dziękuję', baseText: { de: 'Vielen Dank', en: 'Thank you very much' } }, { targetText: 'za pomoc.', baseText: { de: 'für die Hilfe.', en: 'for the help.' } }],
    terms: [{ targetText: 'zadzwoniłam', baseText: { de: 'ich habe angerufen (Frau; Mann: zadzwoniłem)', en: 'I called (female; male: zadzwoniłem)' }, alsoAccept: ['zadzwoniłem'] }, { targetText: 'rano', baseText: { de: 'am Morgen', en: 'in the morning' } }, { targetText: 'teraz', baseText: { de: 'jetzt', en: 'now' } }, { targetText: 'wszystko działa', baseText: { de: 'alles funktioniert', en: 'everything works' } }, { targetText: 'za pomoc', baseText: { de: 'für die Hilfe', en: 'for the help' } }],
    recall: { before: 'Zadzwoniłam ', answer: 'rano', after: ', a teraz wszystko działa. Bardzo dziękuję za pomoc.', fallbackChoices: ['rano', 'wieczorem', 'wczoraj', 'wcześniej'] }, speakRequired: ['rano', 'działa', 'pomoc'],
    sceneCaption: { de: 'Der Hotelmitarbeiter schließt den Werkzeugkoffer und fragt: „Czy teraz wszystko jest w porządku?”', en: 'The hotel employee closes his toolbox and asks: “Czy teraz wszystko jest w porządku?”' },
    trophyWord: { word: 'rano', meaning: { de: 'am Morgen', en: 'in the morning' }, example: 'Rano recepcja odebrała telefon.', whyThisWord: { de: 'Rano setzt den früheren Anruf klar vor den jetzt gelösten Zustand.', en: 'Rano places the earlier call clearly before the problem that is now solved.' } },
    distractors: ['problem nadal wraca', 'potrzebuję nowego pokoju'], placeholderCaption: { de: 'Der Hotelmitarbeiter schließt zufrieden den Werkzeugkoffer, alle Anzeigen funktionieren wieder.', en: 'The hotel employee closes the toolbox as every indicator works again.' }, songMood: 'a repaired hotel problem ending in clear gratitude', visualNotes: 'Hotel maintenance scene, working shower and router indicators, closed toolbox, guest thanking the employee.',
  }),
]

export const POLISH_A2_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_NINE_METADATA, polishA2Practical9Inputs,
  { de: 'Du hast Polnisch A2 Praxis 9 abgeschlossen und kannst Alltagsprobleme mit Vergangenheit, Gegenwart und einer höflichen Lösung verbinden.', en: 'You have completed Polish A2 Practical 9 and can connect everyday problems with past actions, present states, and polite solutions.' },
)

export const GUIDED_TODAY_PATH_POLISH_A2_TEN_METADATA: GuidedPathMetadata = {
  id: 'polish-a2-practical-10', title: 'Polnisch A2 Praxis 10', shortTitle: 'A2 Praxis 10',
  subtitle: { de: 'Die eigene Geschichte erzählen und sich von einem Freund verabschieden', en: 'Telling your story and saying goodbye to a friend' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Polish', estimatedMinutes: 5,
}

const polishA2Practical10Inputs: PolishA2LessonInput[] = [
  makePolishA2CompactLesson({
    slug: 'jestem-z-niemiec-mieszkam-tutaj', title: { de: 'Jetzt wohne ich hier', en: 'I live here now' },
    situation: { de: 'Dein Freund fragt, woher du kommst und wo du jetzt wohnst. Erzähle ihm kurz von deinem neuen Zuhause.', en: 'Your friend asks where you are from and where you live now. Tell him briefly about your new home.' },
    pedagogicalGoal: 'Herkunft und aktuellen Wohnort mit jestem z und mieszkam zusammenfassen.',
    targetText: 'Jestem z Niemiec i teraz mieszkam tutaj.', baseText: { de: 'Ich komme aus Deutschland und wohne jetzt hier.', en: 'I am from Germany, and I live here now.' },
    chunks: [{ targetText: 'Jestem z Niemiec', baseText: { de: 'Ich komme aus Deutschland', en: 'I am from Germany' } }, { targetText: 'i teraz mieszkam', baseText: { de: 'und wohne jetzt', en: 'and now I live' } }, { targetText: 'tutaj.', baseText: { de: 'hier.', en: 'here.' } }],
    terms: [{ targetText: 'jestem z Niemiec', baseText: { de: 'ich komme aus Deutschland', en: 'I am from Germany' } }, { targetText: 'mieszkam', baseText: { de: 'ich wohne', en: 'I live' } }, { targetText: 'teraz', baseText: { de: 'jetzt', en: 'now' } }, { targetText: 'tutaj', baseText: { de: 'hier', en: 'here' } }, { targetText: 'Niemiec', baseText: { de: 'Deutschland nach z', en: 'Germany after z' } }],
    recall: { before: 'Jestem z Niemiec i teraz ', answer: 'mieszkam', after: ' tutaj.', fallbackChoices: ['mieszkam', 'pracuję', 'czekam', 'odpoczywam'] }, speakRequired: ['jestem', 'mieszkam', 'tutaj'],
    sceneCaption: { de: 'Am Abend fragt dich dein Freund auf dem Marktplatz: „Skąd jesteś i gdzie teraz mieszkasz?”', en: 'In the evening, your friend asks you in the market square: “Skąd jesteś i gdzie teraz mieszkasz?”' },
    trophyWord: { word: 'mieszkam', meaning: { de: 'ich wohne', en: 'I live' }, example: 'Teraz mieszkam blisko rynku.', whyThisWord: { de: 'Mieszkam macht aus deinem Herkunftsort eine Geschichte über dein jetziges Zuhause.', en: 'Mieszkam turns your place of origin into a story about your home now.' } },
    distractors: ['jestem tu na weekend', 'wracam dziś do hotelu'], placeholderCaption: { de: 'Zwei Freunde stehen auf dem vertrauten Marktplatz nahe deinem neuen Zuhause.', en: 'Two friends stand in the familiar market square near your new home.' }, songMood: 'a personal story beginning with a new home in a familiar town', visualNotes: 'Evening market square, two male friends talking, apartment lights nearby, a relaxed sense of belonging.',
  }),
  makePolishA2CompactLesson({
    slug: 'pracuje-w-biurze-w-centrum', title: { de: 'Mein Büro im Zentrum', en: 'My office downtown' },
    situation: { de: 'Beim gemeinsamen Kaffee fragt dein Freund nach deiner Arbeit. Sage, dass du in einem Büro im Stadtzentrum arbeitest.', en: 'Over coffee, your friend asks about your work. Say that you work in an office in the city center.' },
    pedagogicalGoal: 'Den Arbeitsort mit pracuję sowie zwei vertrauten Ortsangaben beschreiben.',
    targetText: 'Pracuję w biurze w centrum miasta.', baseText: { de: 'Ich arbeite in einem Büro im Stadtzentrum.', en: 'I work in an office in the city center.' },
    chunks: [{ targetText: 'Pracuję w biurze', baseText: { de: 'Ich arbeite in einem Büro', en: 'I work in an office' } }, { targetText: 'w centrum', baseText: { de: 'im Zentrum', en: 'in the center' } }, { targetText: 'miasta.', baseText: { de: 'der Stadt.', en: 'of the city.' } }],
    terms: [{ targetText: 'pracuję', baseText: { de: 'ich arbeite', en: 'I work' } }, { targetText: 'w biurze', baseText: { de: 'im Büro', en: 'in an office' } }, { targetText: 'biurze', baseText: { de: 'Büro im Lokativ', en: 'office in the locative' } }, { targetText: 'w centrum', baseText: { de: 'im Zentrum', en: 'in the center' } }, { targetText: 'miasta', baseText: { de: 'Stadt im Genitiv', en: 'city in the genitive' } }],
    recall: { before: 'Pracuję w ', answer: 'biurze', after: ' w centrum miasta.', fallbackChoices: ['biurze', 'hotelu', 'sklepie', 'muzeum'] }, speakRequired: ['pracuję', 'biurze', 'centrum'],
    sceneCaption: { de: 'Dein Freund stellt die Kaffeetasse ab und fragt: „Gdzie teraz pracujesz?”', en: 'Your friend sets down his coffee cup and asks: “Gdzie teraz pracujesz?”' },
    trophyWord: { word: 'biurze', meaning: { de: 'im Büro', en: 'in an office' }, example: 'W biurze pracuję od rana.', whyThisWord: { de: 'Biurze gibt deiner persönlichen Geschichte einen konkreten Arbeitsort mitten in der Stadt.', en: 'Biurze gives your personal story a concrete workplace in the middle of town.' } },
    distractors: ['w domu przy parku', 'na rynku wieczorem'], placeholderCaption: { de: 'Ein helles Bürofenster liegt zwischen den vertrauten Gebäuden im Stadtzentrum.', en: 'A bright office window sits among the familiar buildings in the city center.' }, songMood: 'a steady workday anchored in the center of town', visualNotes: 'City-center office, desk by a window, recognizable market-square rooftops, warm everyday rhythm.',
  }),
  makePolishA2CompactLesson({
    slug: 'ucze-sie-polskiego-chce-mowic', title: { de: 'Warum Polnisch?', en: 'Why Polish?' },
    situation: { de: 'Dein Freund hört, wie du im Café Polnisch bestellst, und fragt nach deinem Grund fürs Lernen. Erkläre dein Ziel.', en: 'Your friend hears you order in Polish at the cafe and asks why you are learning. Explain your goal.' },
    pedagogicalGoal: 'Mit bo einen persönlichen Lernweg begründen und chcę mówić als Ziel nennen.',
    targetText: 'Uczę się polskiego, bo chcę mówić po polsku.', baseText: { de: 'Ich lerne Polnisch, weil ich Polnisch sprechen möchte.', en: 'I am learning Polish because I want to speak Polish.' },
    chunks: [{ targetText: 'Uczę się polskiego,', baseText: { de: 'Ich lerne Polnisch,', en: 'I am learning Polish,' } }, { targetText: 'bo chcę mówić', baseText: { de: 'weil ich sprechen möchte', en: 'because I want to speak' } }, { targetText: 'po polsku.', baseText: { de: 'Polnisch.', en: 'in Polish.' } }],
    terms: [{ targetText: 'uczę się', baseText: { de: 'ich lerne', en: 'I am learning' } }, { targetText: 'polskiego', baseText: { de: 'Polnisch im Genitiv', en: 'Polish in the genitive' } }, { targetText: 'bo', baseText: { de: 'weil', en: 'because' } }, { targetText: 'chcę mówić', baseText: { de: 'ich möchte sprechen', en: 'I want to speak' } }, { targetText: 'mówić', baseText: { de: 'sprechen', en: 'speak' } }, { targetText: 'po polsku', baseText: { de: 'auf Polnisch', en: 'in Polish' } }],
    recall: { before: 'Uczę się polskiego, bo chcę ', answer: 'mówić', after: ' po polsku.', fallbackChoices: ['mówić', 'czytać', 'pisać', 'słuchać'] }, speakRequired: ['uczę', 'mówić', 'polsku'],
    sceneCaption: { de: 'Dein Freund lächelt nach deiner Bestellung und fragt: „Dlaczego uczysz się polskiego?”', en: 'Your friend smiles after your order and asks: “Dlaczego uczysz się polskiego?”' },
    trophyWord: { word: 'mówić', meaning: { de: 'sprechen', en: 'speak' }, example: 'Chcę mówić po polsku w kawiarni.', whyThisWord: { de: 'Mówić benennt das praktische Ziel, das hinter deinem Lernen im Alltag steht.', en: 'Mówić names the practical everyday goal behind your learning.' } },
    distractors: ['ale nie mam czasu', 'tylko w weekend'], placeholderCaption: { de: 'Auf dem Cafétisch liegen ein kleines Notizbuch und eine erfolgreich aufgegebene Bestellung.', en: 'A small notebook and a successfully placed order sit on the cafe table.' }, songMood: 'a clear reason for learning spoken over familiar cafe sounds', visualNotes: 'Neighborhood cafe, two friends, Polish notes beside a cup, confident conversation after ordering.',
  }),
  makePolishA2CompactLesson({
    slug: 'jestem-tu-od-dwoch-tygodni', title: { de: 'Seit zwei Wochen', en: 'For two weeks' },
    situation: { de: 'Beim Spaziergang fragt dein Freund, wie lange du schon hier bist. Nenne die zwei Wochen und sage, dass du die Stadt schon etwas kennst.', en: 'During a walk, your friend asks how long you have been here. Name the two weeks and say you already know the city a little.' },
    pedagogicalGoal: 'Die Aufenthaltsdauer mit od dwóch tygodni ausdrücken und mit einem vertrauten Präsenssatz ergänzen.',
    targetText: 'Jestem tu od dwóch tygodni. Już trochę znam miasto.', baseText: { de: 'Ich bin seit zwei Wochen hier. Ich kenne die Stadt schon ein wenig.', en: 'I have been here for two weeks. I already know the city a little.' },
    chunks: [{ targetText: 'Jestem tu', baseText: { de: 'Ich bin hier', en: 'I am here' } }, { targetText: 'od dwóch tygodni.', baseText: { de: 'seit zwei Wochen.', en: 'for two weeks.' } }, { targetText: 'Już trochę znam', baseText: { de: 'Ich kenne schon ein wenig', en: 'I already know a little' } }, { targetText: 'miasto.', baseText: { de: 'die Stadt.', en: 'the city.' } }],
    terms: [{ targetText: 'od dwóch tygodni', baseText: { de: 'seit zwei Wochen', en: 'for two weeks' } }, { targetText: 'dwóch', baseText: { de: 'zwei nach od', en: 'two after od' } }, { targetText: 'tygodni', baseText: { de: 'Wochen im Genitiv', en: 'weeks in the genitive' } }, { targetText: 'trochę', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'znam miasto', baseText: { de: 'ich kenne die Stadt', en: 'I know the city' } }],
    recall: { before: 'Jestem tu od ', answer: 'dwóch', after: ' tygodni. Już trochę znam miasto.', fallbackChoices: ['dwóch', 'trzech', 'czterech', 'pięciu'] }, speakRequired: ['dwóch', 'tygodni', 'miasto'],
    sceneCaption: { de: 'Beim Spaziergang zeigt dein Freund auf den Kalender und fragt: „Jak długo już tutaj jesteś?”', en: 'During the walk, your friend points to the calendar and asks: “Jak długo już tutaj jesteś?”' },
    trophyWord: { word: 'tygodni', meaning: { de: 'Wochen im Genitiv', en: 'weeks in the genitive' }, example: 'Mieszkam tutaj od dwóch tygodni.', whyThisWord: { de: 'Tygodni verankert deine ganze A2-Geschichte in den zwei Wochen, die du hier verbracht hast.', en: 'Tygodni anchors your whole A2 story in the two weeks you have spent here.' } },
    distractors: ['od początku miesiąca', 'jeszcze nie znam ulic'], placeholderCaption: { de: 'Zwei markierte Wochen stehen auf einem Kalender neben einem vertrauten Stadtplan.', en: 'Two marked weeks appear on a calendar beside a now-familiar city map.' }, songMood: 'two full weeks turning an unfamiliar town into a known place', visualNotes: 'Walking route, pocket calendar with two weeks marked, familiar streets and landmarks around two friends.',
  }),
  makePolishA2CompactLesson({
    slug: 'moja-rodzina-jest-w-niemczech', title: { de: 'Meine Familie zu Hause', en: 'My family back home' },
    situation: { de: 'Dein Freund sieht ein Familienfoto und fragt, ob deine Familie auch hier lebt. Erzähle, wo sie ist und wie oft du anrufst.', en: 'Your friend sees a family photo and asks whether your family lives here too. Say where they are and how often you call.' },
    pedagogicalGoal: 'Über die Familie im Präsens sprechen und mit co tydzień eine regelmäßige Gewohnheit nennen.',
    targetText: 'Moja rodzina mieszka w Niemczech. Dzwonię do nich co tydzień.', baseText: { de: 'Meine Familie lebt in Deutschland. Ich rufe sie jede Woche an.', en: 'My family lives in Germany. I call them every week.' },
    chunks: [{ targetText: 'Moja rodzina mieszka w Niemczech.', baseText: { de: 'Meine Familie lebt in Deutschland.', en: 'My family lives in Germany.' } }, { targetText: 'Dzwonię do nich', baseText: { de: 'Ich rufe sie an', en: 'I call them' } }, { targetText: 'co tydzień.', baseText: { de: 'jede Woche.', en: 'every week.' } }],
    terms: [{ targetText: 'moja rodzina', baseText: { de: 'meine Familie', en: 'my family' } }, { targetText: 'w Niemczech', baseText: { de: 'in Deutschland', en: 'in Germany' } }, { targetText: 'dzwonię', baseText: { de: 'ich rufe an', en: 'I call' } }, { targetText: 'dzwonię do nich', baseText: { de: 'ich rufe sie an', en: 'I call them' } }, { targetText: 'co tydzień', baseText: { de: 'jede Woche', en: 'every week' } }],
    recall: { before: 'Moja ', answer: 'rodzina', after: ' mieszka w Niemczech. Dzwonię do nich co tydzień.', fallbackChoices: ['rodzina', 'siostra', 'mama', 'żona'] }, speakRequired: ['rodzina', 'niemczech', 'tydzień'],
    sceneCaption: { de: 'Dein Freund betrachtet das Foto und fragt: „A twoja rodzina też mieszka tutaj?”', en: 'Your friend looks at the photo and asks: “A twoja rodzina też mieszka tutaj?”' },
    trophyWord: { word: 'rodzina', meaning: { de: 'Familie', en: 'family' }, example: 'Moja rodzina mieszka w Niemczech.', whyThisWord: { de: 'Rodzina verbindet dein neues Leben in Polen mit den Menschen, die du jede Woche anrufst.', en: 'Rodzina connects your new life in Poland with the people you call every week.' } },
    distractors: ['moi znajomi są tutaj', 'piszę tylko wieczorem'], placeholderCaption: { de: 'Ein Familienfoto liegt neben dem Telefon mit einem wöchentlichen Anruf im Kalender.', en: 'A family photo lies beside a phone with a weekly call marked on the calendar.' }, songMood: 'a warm weekly call connecting two homes', visualNotes: 'Family photo, phone on a cafe table, weekly reminder, friend listening with gentle interest.',
  }),
  makePolishA2CompactLesson({
    slug: 'lubie-gotowac-i-chodzic-na-spacery', title: { de: 'Kochen und spazieren', en: 'Cooking and walking' },
    situation: { de: 'Dein Freund fragt, was du nach der Arbeit gern machst. Erzähle von Kochen und Spaziergängen in der Gegend.', en: 'Your friend asks what you like doing after work. Tell him about cooking and walks around the neighborhood.' },
    pedagogicalGoal: 'Zwei Freizeitaktivitäten mit lubię plus Infinitiv in einem natürlichen Satz verbinden.',
    targetText: 'Lubię gotować i chodzić na spacery po okolicy.', baseText: { de: 'Ich koche gern und gehe gern in der Gegend spazieren.', en: 'I like cooking and going for walks around the neighborhood.' },
    chunks: [{ targetText: 'Lubię gotować', baseText: { de: 'Ich koche gern', en: 'I like cooking' } }, { targetText: 'i chodzić na spacery', baseText: { de: 'und gehe gern spazieren', en: 'and going for walks' } }, { targetText: 'po okolicy.', baseText: { de: 'in der Gegend.', en: 'around the neighborhood.' } }],
    terms: [{ targetText: 'lubię', baseText: { de: 'ich mag', en: 'I like' } }, { targetText: 'gotować', baseText: { de: 'kochen', en: 'cook' } }, { targetText: 'chodzić na spacery', baseText: { de: 'spazieren gehen', en: 'go for walks' } }, { targetText: 'spacery', baseText: { de: 'Spaziergänge', en: 'walks' } }, { targetText: 'po okolicy', baseText: { de: 'durch die Gegend', en: 'around the neighborhood' } }],
    recall: { before: 'Lubię ', answer: 'gotować', after: ' i chodzić na spacery po okolicy.', fallbackChoices: ['gotować', 'czytać', 'pływać', 'tańczyć'] }, speakRequired: ['lubię', 'gotować', 'spacery'],
    sceneCaption: { de: 'Dein Freund öffnet die Küchentür und fragt: „Co lubisz robić po pracy?”', en: 'Your friend opens the kitchen door and asks: “Co lubisz robić po pracy?”' },
    trophyWord: { word: 'gotować', meaning: { de: 'kochen', en: 'cook' }, example: 'Lubię gotować kolację dla przyjaciół.', whyThisWord: { de: 'Gotować zeigt eine alltägliche Seite deines Lebens jenseits von Arbeit und Besorgungen.', en: 'Gotować shows an everyday side of your life beyond work and errands.' } },
    distractors: ['odpoczywać cały dzień', 'jeździć rano autobusem'], placeholderCaption: { de: 'Ein Kochtopf und bequeme Schuhe stehen für deine beiden Lieblingsbeschäftigungen bereit.', en: 'A cooking pot and comfortable shoes stand ready for your two favorite activities.' }, songMood: 'home cooking and neighborhood walks filling a free evening', visualNotes: 'Cozy kitchen, simple meal, walking shoes by the door, neighborhood path visible outside.',
  }),
  makePolishA2CompactLesson({
    slug: 'rano-pracuje-wieczorem-ucze-sie', title: { de: 'Mein normaler Tag', en: 'My usual day' },
    situation: { de: 'Auf dem Weg ins Büro fragt dein Freund nach deinem normalen Tagesablauf. Fasse Morgen und Abend kurz zusammen.', en: 'On the way to the office, your friend asks about your usual daily routine. Sum up the morning and evening briefly.' },
    pedagogicalGoal: 'Einen Tagesablauf mit rano, a wieczorem und zwei Präsenshandlungen ordnen.',
    targetText: 'Rano pracuję, a wieczorem uczę się polskiego.', baseText: { de: 'Morgens arbeite ich, und abends lerne ich Polnisch.', en: 'I work in the morning, and I study Polish in the evening.' },
    chunks: [{ targetText: 'Rano pracuję,', baseText: { de: 'Morgens arbeite ich,', en: 'I work in the morning,' } }, { targetText: 'a wieczorem', baseText: { de: 'und abends', en: 'and in the evening' } }, { targetText: 'uczę się polskiego.', baseText: { de: 'lerne ich Polnisch.', en: 'I study Polish.' } }],
    terms: [{ targetText: 'rano', baseText: { de: 'morgens', en: 'in the morning' } }, { targetText: 'pracuję', baseText: { de: 'ich arbeite', en: 'I work' } }, { targetText: 'wieczorem', baseText: { de: 'abends', en: 'in the evening' } }, { targetText: 'uczę się', baseText: { de: 'ich lerne', en: 'I study' } }, { targetText: 'polskiego', baseText: { de: 'Polnisch im Genitiv', en: 'Polish in the genitive' } }],
    recall: { before: 'Rano ', answer: 'pracuję', after: ', a wieczorem uczę się polskiego.', fallbackChoices: ['pracuję', 'odpoczywam', 'gotuję', 'spaceruję'] }, speakRequired: ['rano', 'pracuję', 'polskiego'],
    sceneCaption: { de: 'Dein Freund geht neben dir her und fragt: „Jak wygląda twój zwykły dzień?”', en: 'Your friend walks beside you and asks: “Jak wygląda twój zwykły dzień?”' },
    trophyWord: { word: 'pracuję', meaning: { de: 'ich arbeite', en: 'I work' }, example: 'Rano pracuję w biurze w centrum.', whyThisWord: { de: 'Pracuję setzt den festen Morgenpunkt in deinem inzwischen vertrauten Tagesrhythmus.', en: 'Pracuję sets the morning anchor in your now-familiar daily rhythm.' } },
    distractors: ['w południe robię zakupy', 'nocą jestem w hotelu'], placeholderCaption: { de: 'Ein Tagesplan zeigt morgens das Büro und abends ein polnisches Notizbuch.', en: 'A daily planner shows the office in the morning and a Polish notebook in the evening.' }, songMood: 'a balanced weekday moving from office hours to evening study', visualNotes: 'Split-day scene, city office in morning light, Polish notebook under an evening lamp, steady routine.',
  }),
  makePolishA2CompactLesson({
    slug: 'rozumiem-prawie-wszystko-mowie-powoli', title: { de: 'Fast alles verstehen', en: 'Understanding almost everything' },
    situation: { de: 'Nach einem kurzen Gespräch fragt dein Freund, wie dein Polnisch vorankommt. Beschreibe ehrlich, was schon gut klappt.', en: 'After a short conversation, your friend asks how your Polish is progressing. Describe honestly what already works well.' },
    pedagogicalGoal: 'Fortschritt mit prawie ausdrücken und Verstehen sowie langsames Sprechen gegenüberstellen.',
    targetText: 'Rozumiem prawie wszystko, ale mówię jeszcze dość powoli.', baseText: { de: 'Ich verstehe fast alles, aber ich spreche noch ziemlich langsam.', en: 'I understand almost everything, but I still speak quite slowly.' },
    chunks: [{ targetText: 'Rozumiem prawie wszystko,', baseText: { de: 'Ich verstehe fast alles,', en: 'I understand almost everything,' } }, { targetText: 'ale mówię jeszcze', baseText: { de: 'aber ich spreche noch', en: 'but I still speak' } }, { targetText: 'dość powoli.', baseText: { de: 'ziemlich langsam.', en: 'quite slowly.' } }],
    terms: [{ targetText: 'rozumiem', baseText: { de: 'ich verstehe', en: 'I understand' } }, { targetText: 'prawie', baseText: { de: 'fast, beinahe', en: 'almost' } }, { targetText: 'wszystko', baseText: { de: 'alles', en: 'everything' } }, { targetText: 'mówię', baseText: { de: 'ich spreche', en: 'I speak' } }, { targetText: 'dość', baseText: { de: 'ziemlich', en: 'quite' } }, { targetText: 'powoli', baseText: { de: 'langsam', en: 'slowly' } }],
    recall: { before: 'Rozumiem ', answer: 'prawie', after: ' wszystko, ale mówię jeszcze dość powoli.', fallbackChoices: ['prawie', 'zawsze', 'czasem', 'rzadko'] }, speakRequired: ['rozumiem', 'prawie', 'powoli'],
    sceneCaption: { de: 'Nach eurem Gespräch nickt dein Freund und fragt: „Jak ci idzie polski?”', en: 'After your conversation, your friend nods and asks: “Jak ci idzie polski?”' },
    trophyWord: { word: 'prawie', meaning: { de: 'fast, beinahe', en: 'almost' }, example: 'Prawie wszystko rozumiem bez pomocy.', whyThisWord: { de: 'Prawie zeigt deinen großen Fortschritt, ohne das langsame Sprechen zu verstecken.', en: 'Prawie shows how far you have come without hiding that your speaking is still slow.' } },
    distractors: ['niczego jeszcze nie znam', 'piszę tylko po niemiecku'], placeholderCaption: { de: 'Zwei Freunde unterhalten sich ruhig, während ein fast vollständig verstandener Stadtplan zwischen ihnen liegt.', en: 'Two friends talk calmly with an almost fully understood city guide between them.' }, songMood: 'quiet confidence growing through a careful Polish conversation', visualNotes: 'Two friends at a table, Polish city guide, relaxed eye contact, deliberate speech and visible understanding.',
  }),
  makePolishA2CompactLesson({
    slug: 'duzo-sie-nauczylem-wroce', title: { de: 'Nächstes Jahr zurück', en: 'Back next year' },
    situation: { de: 'Beim letzten Spaziergang fragt dein Freund, was du jetzt kannst und was du für nächstes Jahr planst. Ziehe Bilanz und kündige deine Rückkehr an.', en: 'During your last walk, your friend asks what you can do now and what you plan for next year. Sum up your progress and say you will return.' },
    pedagogicalGoal: 'Mit nauczyłem się den eigenen Fortschritt bilanzieren und mit wrócę einen Plan für das nächste Jahr nennen.',
    targetText: 'Dużo się tutaj nauczyłem. W przyszłym roku wrócę.', baseText: { de: 'Ich habe hier viel gelernt. Nächstes Jahr komme ich zurück.', en: 'I learned a lot here. I will come back next year.' },
    chunks: [{ targetText: 'Dużo się tutaj nauczyłem.', baseText: { de: 'Ich habe hier viel gelernt.', en: 'I learned a lot here.' } }, { targetText: 'W przyszłym roku', baseText: { de: 'Nächstes Jahr', en: 'Next year' } }, { targetText: 'wrócę.', baseText: { de: 'komme ich zurück.', en: 'I will come back.' } }],
    terms: [{ targetText: 'nauczyłem się', baseText: { de: 'ich habe gelernt (Mann; Frau: nauczyłam się)', en: 'I learned (male; female: nauczyłam się)' }, alsoAccept: ['nauczyłam się'] }, { targetText: 'dużo', baseText: { de: 'viel', en: 'a lot' } }, { targetText: 'tutaj', baseText: { de: 'hier', en: 'here' } }, { targetText: 'w przyszłym roku', baseText: { de: 'im nächsten Jahr', en: 'next year' } }, { targetText: 'wrócę', baseText: { de: 'ich komme zurück', en: 'I will come back' } }],
    recall: { before: 'Dużo się tutaj nauczyłem. W ', answer: 'przyszłym', after: ' roku wrócę.', fallbackChoices: ['przyszłym', 'tym', 'każdym', 'zeszłym'] }, speakRequired: ['dużo', 'przyszłym', 'wrócę'],
    sceneCaption: { de: 'Beim letzten Spaziergang fragt dein Freund: „Co już umiesz i jaki masz plan na przyszły rok?”', en: 'During your last walk, your friend asks: “Co już umiesz i jaki masz plan na przyszły rok?”' },
    trophyWord: { word: 'wrócę', meaning: { de: 'ich komme zurück', en: 'I will come back' }, example: 'W przyszłym roku wrócę do Polski.', whyThisWord: { de: 'Wrócę richtet deinen Rückblick nach vorn und hält die Verbindung zu deinem Freund und der Stadt offen.', en: 'Wrócę turns your reflection toward the future and keeps your connection to your friend and the town open.' } },
    distractors: ['teraz zostaję w domu', 'dzisiaj idę do muzeum'], placeholderCaption: { de: 'Der Weg führt am vertrauten Viertel vorbei, während das nächste Jahr im Kalender markiert ist.', en: 'The path passes the familiar neighborhood while next year is marked on a calendar.' }, songMood: 'a proud reflection opening into a promise to return', visualNotes: 'Last neighborhood walk, two male friends, familiar skyline, next year circled on a small calendar.',
  }),
  makePolishA2CompactLesson({
    slug: 'dziekuje-za-te-tygodnie', title: { de: 'Bis zum nächsten Mal', en: 'Until next time' },
    situation: { de: 'Dein Freund begleitet dich zum Bahnsteig. Bedanke dich für die gemeinsamen Wochen, sage, was sie dir bedeuten, und verabschiede dich.', en: 'Your friend walks you to the platform. Thank him for the weeks you shared, say what they mean to you, and say goodbye.' },
    pedagogicalGoal: 'Den gesamten Aufenthalt mit Dank, einer persönlichen Bewertung im Präsens und do zobaczenia warm abschließen.',
    targetText: 'Dziękuję za te tygodnie. To dla mnie ważne. Do zobaczenia!', baseText: { de: 'Danke für diese Wochen. Das ist mir wichtig. Bis zum nächsten Mal!', en: 'Thank you for these weeks. That means a lot to me. See you!' },
    chunks: [{ targetText: 'Dziękuję za te tygodnie.', baseText: { de: 'Danke für diese Wochen.', en: 'Thank you for these weeks.' } }, { targetText: 'To dla mnie ważne.', baseText: { de: 'Das ist mir wichtig.', en: 'That means a lot to me.' } }, { targetText: 'Do zobaczenia!', baseText: { de: 'Bis zum nächsten Mal!', en: 'See you!' } }],
    terms: [{ targetText: 'dziękuję', baseText: { de: 'danke', en: 'thank you' } }, { targetText: 'te tygodnie', baseText: { de: 'diese Wochen', en: 'these weeks' } }, { targetText: 'dla mnie', baseText: { de: 'für mich', en: 'to me' } }, { targetText: 'ważne', baseText: { de: 'wichtig (Neutrum nach to)', en: 'important (neuter after to)' } }, { targetText: 'do zobaczenia', baseText: { de: 'auf Wiedersehen, bis dann', en: 'see you' } }],
    recall: { before: 'Dziękuję za te tygodnie. To dla mnie ', answer: 'ważne', after: '. Do zobaczenia!', fallbackChoices: ['ważne', 'piękne', 'ciekawe', 'trudne'] }, speakRequired: ['dziękuję', 'tygodnie', 'ważne'],
    sceneCaption: { de: 'Dein Freund steht mit dir am Bahnsteig und sagt: „Już czas na twój pociąg. Do zobaczenia!”', en: 'Your friend stands with you on the platform and says: “Już czas na twój pociąg. Do zobaczenia!”' },
    trophyWord: { word: 'ważne', meaning: { de: 'wichtig', en: 'important' }, example: 'Te tygodnie są dla mnie ważne.', whyThisWord: { de: 'Ważne gibt dem Abschied Wärme und zeigt, dass die gemeinsamen Wochen mehr als nur eine Reise waren.', en: 'Ważne gives the goodbye warmth and shows that the shared weeks were more than just a trip.' } },
    distractors: ['to zwykły dzień', 'nie znam tego miasta'], placeholderCaption: { de: 'Zwei Freunde verabschieden sich auf dem Bahnsteig vor dem Zug aus der vertrauten Stadt.', en: 'Two friends say goodbye on the platform beside the train leaving the familiar town.' }, songMood: 'a warm station goodbye carrying gratitude and friendship forward', visualNotes: 'Railway platform, two male friends, small travel bag, familiar town behind them, warm farewell before boarding.',
  }),
]

export const POLISH_A2_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makePolishA2PracticalLessons(
  GUIDED_TODAY_PATH_POLISH_A2_TEN_METADATA, polishA2Practical10Inputs,
  { de: 'Du hast den gesamten polnischen A2-Praxiskurs abgeschlossen: Aus vertrauten Orten, Gesprächen und kleinen Erfolgen ist ein Stück Alltag geworden.', en: 'You have completed the full Polish A2 practical course: familiar places, conversations, and small successes have become part of everyday life.' },
)
