/**
 * Cebuano A2 — the Regular tier (10 paths × 10 lessons), per
 * docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md (§4 integration, §5 authoring
 * contract) and the spec in tmp\A2_CEBUANO_P1_P10_SPEC.md.
 *
 * Authoring contract highlights enforced in this module:
 * - Base locales are GERMAN + ENGLISH (matching Cebuano A1, baseLanguage
 *   'German'): every GuidedBaseContentText field carries both .de and .en.
 *   pedagogicalGoal is a German string (matching A1). LOCALE HYGIENE gets
 *   extra review weight here — Cebuano A1 had systemic wrong-locale
 *   sceneCaption.de findings; every .de field must be real German.
 * - Two-turn shape: sceneCaption carries the interlocutor's Cebuano line
 *   quoted inside both base-locale captions; the learner's corePhrase is the
 *   response.
 * - Register: CEBUANO politeness — palihug as the request softener, informal
 *   ka/nimo/imong second person throughout (Cebuano has no du/Sie split; the
 *   service/friend distinction is carried by content and tone). Tagalog forms
 *   are banned (po, opo, pakisuyo, kayo — the validator enforces this).
 * - Aspect contract (Cebuano marks aspect, not tense): completed = ni-/naka-
 *   (+ na) from a whitelist, ONLY in P3/P9 (+ marked recycling); future/
 *   intent = mo-/mag- + time word (ugma, unya, sunod semana) from P4;
 *   progressive = nag-. Every base tense must be licensed by the target's
 *   aspect prefix or time word.
 * - Loanwords Cebuanos actually use (reserbasyon, resibo, taksi, menu, wifi,
 *   kape) are correct Cebuano — teach them; alsoAccept carries the alternate
 *   spellings (reservation, taxi, Wi-Fi …).
 * - kay is the only subordinator; comparatives = mas + adjective (P2),
 *   superlative = pinaka- (P7).
 * - Trophies unique across the entire Cebuano guided corpus (A1 + A2),
 *   lowercase, single-word.
 * - TTS LIVE (2026-07-15, 482 clips / 0 failed, voice Mayumi): ALL path/
 *   lesson/chunk ids in this module are FROZEN — never rename them; text
 *   changes need scoped audio reruns.
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

const CEBUANO_A2_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

type CebuanoA2VariantInput = {
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

export type CebuanoA2LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightCebuanoA2Variant(input: CebuanoA2VariantInput): GuidedLessonVibeVariant {
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
      language: 'ceb-PH',
      // matches Cebuano A1's STT reality (0.55 — ceb recognition is the noisiest)
      passingThreshold: 0.55,
      maxRecordingSeconds: 12,
    },
    sceneCaption: input.sceneCaption,
    trophyWord: input.trophyWord,
    placeholderMedia: {
      type: 'video',
      caption: input.placeholderCaption,
    },
    songSeed: {
      genre: 'bright Cebuano acoustic',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

export function makeCebuanoA2PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: CebuanoA2LessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('cebuano-a2-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `cebuano-a2-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
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
      steps: CEBUANO_A2_GUIDED_TODAY_STEPS,
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

export type CebuanoA2CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  targetText: string
  baseText: GuidedBaseContentText
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  /** alsoAccept: loanword/aspect-variant spellings (reservation, taxi, miabot/naabot) — folded into acceptedAnswers. */
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText; alsoAccept?: string[] }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[]; alsoAccept?: string[] }
  /** Exactly the salient single words the speech check requires — never multi-word phrases, NEVER a hyphenated/glottal word (kanus-a, bag-o split in the tokenizer; pick other words), no apostrophes. */
  speakRequired: [string, string, string]
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

/** Accepted-answer variants: exact, lowercase, capitalized, hyphen-fused (kanus-a → kanusa) forms of the text plus every alsoAccept string. */
function cebuanoA2Answers(text: string, alsoAccept: string[] = []): string[] {
  const variants = [text, ...alsoAccept].flatMap((value) => {
    const fused = value.replace(/-/g, '')
    return [value, value.toLowerCase(), fused, fused.toLowerCase()]
  })
  const capitalized = variants.map((value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
  return [...new Set([...variants, ...capitalized])]
}

function cebuanoA2SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
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

export function makeCebuanoA2CompactLesson(input: CebuanoA2CompactLesson): CebuanoA2LessonInput {
  const prefix = input.slug.split('-')[0]
  const { alsoAccept: recallAlsoAccept, ...recall } = input.recall
  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: makeBrightCebuanoA2Variant({
      corePhrase: { targetText: input.targetText, baseText: input.baseText },
      meaning: input.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map(({ alsoAccept, ...term }, index) => ({
        id: `${prefix}-item-${index + 1}`,
        ...term,
        acceptedAnswers: cebuanoA2Answers(term.targetText, alsoAccept),
      })),
      buildChips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      typeRecall: {
        ...recall,
        acceptedAnswers: cebuanoA2Answers(recall.answer, recallAlsoAccept),
      },
      speakTarget: {
        baseCue: input.baseText,
        targetPhrase: input.targetText,
        ...cebuanoA2SpeakTokens(input.targetText, input.speakRequired),
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderCaption: input.placeholderCaption,
      songMood: input.songMood,
      visualNotes: input.visualNotes,
    }),
  }
}

export const GUIDED_TODAY_PATH_CEBUANO_A2_ONE_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-1', title: 'Cebuano A2 Praxis 1', shortTitle: 'A2 Praxis 1',
  subtitle: { de: 'Vertraute Bestellungen, Rückfragen und Wege im Alltag', en: 'Familiar orders, follow-up questions, and everyday directions' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical1Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'mao-ra-gihapon', title: { de: 'Wie immer', en: 'The usual' },
    situation: { de: 'Die Barista in deinem Stammcafé erkennt dich und fragt nach deiner üblichen Bestellung. Du bestätigst sie.', en: 'The barista at your regular cafe recognizes you and asks about your usual order. Confirm it.' },
    pedagogicalGoal: 'Eine vertraute Bestellung an der Theke vollständig und freundlich bestätigen.',
    targetText: 'Oo, mao ra gihapon, usa ka kape.', baseText: { de: 'Ja, wie immer, einen Kaffee.', en: 'Yes, the usual, one coffee.' },
    chunks: [{ targetText: 'Oo, mao ra gihapon,', baseText: { de: 'Ja, wie immer,', en: 'Yes, the usual,' } }, { targetText: 'usa ka', baseText: { de: 'einen', en: 'one' } }, { targetText: 'kape.', baseText: { de: 'Kaffee.', en: 'coffee.' } }],
    terms: [{ targetText: 'gihapon', baseText: { de: 'immer noch; wieder wie zuvor', en: 'still; again as before' } }, { targetText: 'usa ka', baseText: { de: 'ein Stück; ein', en: 'one item; one' } }, { targetText: 'kape', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'mao ra', baseText: { de: 'genau dasselbe', en: 'just the same' } }, { targetText: 'Oo', baseText: { de: 'ja', en: 'yes' } }],
    recall: { before: 'Oo, mao ra ', answer: 'gihapon', after: ', usa ka kape.', fallbackChoices: ['gihapon', 'kagahapon', 'sayo', 'diretso'] }, speakRequired: ['gihapon', 'usa', 'kape'],
    sceneCaption: { de: 'Die Barista greift schon nach einer Tasse und fragt: „Mao ra gihapon?"', en: 'The barista is already reaching for a cup and asks: “Mao ra gihapon?”' },
    trophyWord: { word: 'gihapon', meaning: { de: 'immer noch; wieder wie zuvor', en: 'still; again as before' }, example: 'Mao ra gihapon akong gusto.', whyThisWord: { de: 'Mit diesem Wort bestätigst du in deinem Stammcafé mühelos eine vertraute Gewohnheit.', en: 'This word lets you confirm a familiar habit effortlessly at your regular cafe.' } },
    distractors: ['duha ka tsa', 'walay asukar'], placeholderCaption: { de: 'Eine vertraute Barista hält eine weiße Tasse über den Tresen.', en: 'A familiar barista holds a white cup over the counter.' }, songMood: 'a warm familiar coffee stop with an easy nod', visualNotes: 'Neighborhood cafe, regular customer at the counter, one cup already waiting in the barista hand.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'dad-on-pila-tanan', title: { de: 'Zum Mitnehmen', en: 'To go' },
    situation: { de: 'Die Barista fragt, ob du den Kaffee hier trinkst oder mitnimmst. Du wählst Mitnehmen und fragst nach dem Gesamtpreis.', en: 'The barista asks whether you will drink the coffee here or take it away. Choose to go and ask for the total.' },
    pedagogicalGoal: 'Eine Mitnahmebestellung abschließen und direkt nach dem Gesamtpreis fragen.',
    targetText: 'Dad-on lang ang kape, palihug. Pila tanan?', baseText: { de: 'Den Kaffee nur zum Mitnehmen, bitte. Wie viel kostet alles zusammen?', en: 'Just the coffee to go, please. How much is everything altogether?' },
    chunks: [{ targetText: 'Dad-on lang ang kape,', baseText: { de: 'Den Kaffee nur zum Mitnehmen,', en: 'Just the coffee to go,' } }, { targetText: 'palihug.', baseText: { de: 'bitte.', en: 'please.' } }, { targetText: 'Pila tanan?', baseText: { de: 'Wie viel kostet alles zusammen?', en: 'How much is everything altogether?' } }],
    terms: [{ targetText: 'Dad-on', baseText: { de: 'zum Mitnehmen', en: 'to be taken away' } }, { targetText: 'kape', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'Pila', baseText: { de: 'wie viel', en: 'how much' } }, { targetText: 'tanan', baseText: { de: 'alles zusammen', en: 'everything altogether' } }, { targetText: 'lang', baseText: { de: 'nur; einfach', en: 'just; only' } }],
    recall: { before: 'Dad-on lang ang kape, palihug. ', answer: 'Pila', after: ' tanan?', fallbackChoices: ['Pila', 'Asa', 'Kinsa', 'Kanus-a'] }, speakRequired: ['kape', 'pila', 'tanan'],
    sceneCaption: { de: 'Die Barista zeigt auf einen Becher mit Deckel und fragt: „Dinhi ra o dad-on?"', en: 'The barista points to a cup with a lid and asks: “Dinhi ra o dad-on?”' },
    trophyWord: { word: 'pila', meaning: { de: 'wie viel; wie viele', en: 'how much; how many' }, example: 'Pila tanan akong bayran?', whyThisWord: { de: 'Mit dieser Frage erfährst du nach deiner Bestellung sofort den fälligen Gesamtbetrag.', en: 'This question gets you the total due immediately after your order.' } },
    distractors: ['dinhi ra ang kape', 'duha ka tasa'], placeholderCaption: { de: 'Ein Kaffeebecher mit Deckel steht neben einem kleinen Kassendisplay.', en: 'A lidded coffee cup stands beside a small register display.' }, songMood: 'a quick takeaway order before stepping back outside', visualNotes: 'Cafe counter, takeaway lid, register total hidden until the customer asks.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'load-para-sa-selpon', title: { de: 'Guthaben fürs Handy', en: 'Phone load' },
    situation: { de: 'An einem Mobilfunkstand fragt die Verkäuferin, was du brauchst. Du suchst Guthaben für dein Handy und fragst, ob es verfügbar ist.', en: 'At a mobile counter, the clerk asks what you need. You are looking for phone load and ask whether it is available.' },
    pedagogicalGoal: 'Einen konkreten Bedarf nennen und mit naa nach der Verfügbarkeit fragen.',
    targetText: 'Gusto ko og load para sa selpon. Naa kay ana?', baseText: { de: 'Ich möchte Guthaben für mein Handy. Haben Sie so etwas?', en: 'I want load for my phone. Do you have that?' },
    chunks: [{ targetText: 'Gusto ko og load', baseText: { de: 'Ich möchte Guthaben', en: 'I want load' } }, { targetText: 'para sa selpon.', baseText: { de: 'für mein Handy.', en: 'for my phone.' } }, { targetText: 'Naa kay ana?', baseText: { de: 'Haben Sie das da?', en: 'Do you have that?' } }],
    terms: [{ targetText: 'Gusto', baseText: { de: 'möchten; wollen', en: 'want' } }, { targetText: 'load', baseText: { de: 'Handyguthaben', en: 'phone credit' } }, { targetText: 'selpon', baseText: { de: 'Handy', en: 'mobile phone' }, alsoAccept: ['cellphone'] }, { targetText: 'para sa', baseText: { de: 'für', en: 'for' } }, { targetText: 'Naa mo', baseText: { de: 'haben Sie', en: 'do you have' } }],
    recall: { before: 'Gusto ko og load para sa ', answer: 'selpon', after: '. Naa kay ana?', fallbackChoices: ['selpon', 'botelya', 'payong', 'sapatos'], alsoAccept: ['cellphone'] }, speakRequired: ['gusto', 'load', 'selpon'],
    sceneCaption: { de: 'Die Verkäuferin deutet auf die Karten hinter dem Tresen und fragt: „Unsa may kinahanglan nimo?"', en: 'The clerk gestures to the cards behind the counter and asks: “Unsa may kinahanglan nimo?”' },
    trophyWord: { word: 'selpon', meaning: { de: 'Handy', en: 'mobile phone' }, example: 'Kinahanglan og load ang akong selpon.', whyThisWord: { de: 'Das Wort benennt genau das Gerät, für das du am Mobilfunkstand Guthaben brauchst.', en: 'This word names the exact device that needs load at the mobile counter.' } },
    distractors: ['bag-ong sim kard', 'kable para sa selpon'], placeholderCaption: { de: 'Prepaid-Karten hängen hinter einem kleinen Mobilfunktresen.', en: 'Prepaid cards hang behind a small mobile-phone counter.' }, songMood: 'a practical connection errand in a bright phone kiosk', visualNotes: 'Compact phone kiosk, prepaid cards, handset on the counter, clerk pointing to load options.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'pila-ka-minutos', title: { de: 'Wie viele Minuten zu Fuß?', en: 'How many minutes on foot?' },
    situation: { de: 'Ein Passant sagt nur, dein Ziel sei ganz in der Nähe. Du fragst nach einer konkreten Gehzeit.', en: 'A passer-by only says your destination is very close. Ask for a specific walking time.' },
    pedagogicalGoal: 'Eine vage Wegauskunft mit pila ka in eine konkrete Zeitangabe verwandeln.',
    targetText: 'Pila ka minutos ang lakaw gikan dinhi?', baseText: { de: 'Wie viele Minuten dauert der Fußweg von hier?', en: 'How many minutes is the walk from here?' },
    chunks: [{ targetText: 'Pila ka minutos', baseText: { de: 'Wie viele Minuten', en: 'How many minutes' } }, { targetText: 'ang lakaw', baseText: { de: 'dauert der Fußweg', en: 'is the walk' } }, { targetText: 'gikan dinhi?', baseText: { de: 'von hier?', en: 'from here?' } }],
    terms: [{ targetText: 'minutos', baseText: { de: 'Minuten', en: 'minutes' } }, { targetText: 'lakaw', baseText: { de: 'Fußweg; Gehen', en: 'walk; walking' } }, { targetText: 'gikan dinhi', baseText: { de: 'von hier', en: 'from here' } }, { targetText: 'Pila ka', baseText: { de: 'wie viele', en: 'how many' } }, { targetText: 'duol', baseText: { de: 'nah', en: 'near' } }],
    recall: { before: 'Pila ka ', answer: 'minutos', after: ' ang lakaw gikan dinhi?', fallbackChoices: ['minutos', 'kilometro', 'pesos', 'adlaw'] }, speakRequired: ['pila', 'minutos', 'lakaw'],
    sceneCaption: { de: 'Ein Passant zeigt die Straße entlang und sagt: „Duol ra kaayo gikan dinhi."', en: 'A passer-by points down the street and says: “Duol ra kaayo gikan dinhi.”' },
    trophyWord: { word: 'minutos', meaning: { de: 'Minuten', en: 'minutes' }, example: 'Napulo ka minutos ang lakaw.', whyThisWord: { de: 'Mit dieser Zeiteinheit wird aus einer vagen Richtungsangabe eine brauchbare Gehzeit.', en: 'This time unit turns a vague direction into a useful walking estimate.' } },
    distractors: ['duol sa eskina', 'sakay og jeep'], placeholderCaption: { de: 'Ein langer Gehweg führt zu einem kleinen Schild in der Ferne.', en: 'A long sidewalk leads toward a small sign in the distance.' }, songMood: 'a curious walking question on a sunny city block', visualNotes: 'Cebu street corner, passer-by pointing, clear sidewalk and a destination not quite visible.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'maayo-ang-pagkaon', title: { de: 'Die Rechnung, bitte', en: 'The bill, please' },
    situation: { de: 'Nach dem Essen fragt der Kellner, ob alles in Ordnung ist. Du bestätigst es und bittest um die Rechnung.', en: 'After the meal, the server asks whether everything is all right. Confirm it and ask for the bill.' },
    pedagogicalGoal: 'Auf eine Servicefrage positiv reagieren und anschließend höflich die Rechnung verlangen.',
    targetText: 'Oo, maayo ra ang pagkaon. Ang bayranan, palihug.', baseText: { de: 'Ja, das Essen ist gut. Die Rechnung, bitte.', en: 'Yes, the food is good. The bill, please.' },
    chunks: [{ targetText: 'Oo, maayo ra ang pagkaon.', baseText: { de: 'Ja, das Essen ist gut.', en: 'Yes, the food is good.' } }, { targetText: 'Ang bayranan,', baseText: { de: 'Die Rechnung,', en: 'The bill,' } }, { targetText: 'palihug.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'pagkaon', baseText: { de: 'Essen; Speise', en: 'food; meal' } }, { targetText: 'bayranan', baseText: { de: 'Rechnung', en: 'bill' } }, { targetText: 'maayo ra', baseText: { de: 'ist gut; ist in Ordnung', en: 'is good; is all right' } }, { targetText: 'palihug', baseText: { de: 'bitte', en: 'please' } }, { targetText: 'Oo', baseText: { de: 'ja', en: 'yes' } }],
    recall: { before: 'Oo, maayo ra ang ', answer: 'pagkaon', after: '. Ang bayranan, palihug.', fallbackChoices: ['pagkaon', 'kwarto', 'biyahe', 'tambal'] }, speakRequired: ['maayo', 'pagkaon', 'bayranan'],
    sceneCaption: { de: 'Der Kellner räumt die leeren Teller ab und fragt: „Maayo ra ang tanan?"', en: 'The server clears the empty plates and asks: “Maayo ra ang tanan?”' },
    trophyWord: { word: 'pagkaon', meaning: { de: 'Essen; Speise', en: 'food; meal' }, example: 'Maayo kaayo ang pagkaon dinhi.', whyThisWord: { de: 'Damit beantwortest du die Frage des Kellners konkret, bevor du um die Rechnung bittest.', en: 'It lets you answer the server specifically before asking for the bill.' } },
    distractors: ['dugang nga tubig', 'usa pa ka putahe'], placeholderCaption: { de: 'Leere Teller und eine geschlossene Rechnungsmappe liegen auf einem Restauranttisch.', en: 'Empty plates and a closed bill folder sit on a restaurant table.' }, songMood: 'a satisfying meal ending with a polite request', visualNotes: 'Casual Cebu restaurant, cleared plates, server waiting beside a small bill folder.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'reserbasyon-ni-ana', title: { de: 'Unter dem Namen Ana', en: 'Under the name Ana' },
    situation: { de: 'An der Hotelrezeption fragt die Mitarbeiterin nach deiner Buchung. Du nennst die Reservierung unter dem Namen Ana.', en: 'At hotel reception, the clerk asks about your booking. State the reservation under the name Ana.' },
    pedagogicalGoal: 'Eine vorhandene Hotelreservierung mit Anzahl und Namen klar nennen.',
    targetText: 'Naa koy usa ka reserbasyon dinhi sa ngalan ni Ana.', baseText: { de: 'Ich habe hier eine Reservierung auf den Namen Ana.', en: 'I have one reservation here under the name Ana.' },
    chunks: [{ targetText: 'Naa koy usa ka reserbasyon', baseText: { de: 'Ich habe eine Reservierung', en: 'I have one reservation' } }, { targetText: 'dinhi', baseText: { de: 'hier', en: 'here' } }, { targetText: 'sa ngalan ni Ana.', baseText: { de: 'auf den Namen Ana.', en: 'under the name Ana.' } }],
    terms: [{ targetText: 'reserbasyon', baseText: { de: 'Reservierung', en: 'reservation' }, alsoAccept: ['reservation'] }, { targetText: 'usa ka', baseText: { de: 'eine; ein Stück', en: 'one; one item' } }, { targetText: 'sa ngalan ni', baseText: { de: 'auf den Namen von', en: 'under the name of' } }, { targetText: 'Naa koy', baseText: { de: 'ich habe', en: 'I have' } }, { targetText: 'ngalan', baseText: { de: 'Name', en: 'name' } }],
    recall: { before: 'Naa koy usa ka ', answer: 'reserbasyon', after: ' dinhi sa ngalan ni Ana.', fallbackChoices: ['reserbasyon', 'pakete', 'tiket', 'resibo'], alsoAccept: ['reservation'] }, speakRequired: ['usa', 'reserbasyon', 'ngalan'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Buchungsliste und fragt: „Unsa ang ngalan sa reserbasyon?"', en: 'The receptionist opens the booking list and asks: “Unsa ang ngalan sa reserbasyon?”' },
    trophyWord: { word: 'usa', meaning: { de: 'eins; ein Stück', en: 'one; one item' }, example: 'Usa ka kwarto ang akong reserbasyon.', whyThisWord: { de: 'Die Zahl macht an der Rezeption sofort klar, dass du genau eine Buchung suchst.', en: 'The number makes it immediately clear at reception that you are looking for exactly one booking.' } },
    distractors: ['duha ka kwarto', 'para karong gabii'], placeholderCaption: { de: 'Eine Rezeptionistin prüft eine Buchungsliste neben einer Schlüsselkarte.', en: 'A receptionist checks a booking list beside a key card.' }, songMood: 'a calm hotel check-in with the booking ready', visualNotes: 'Hotel reception, booking screen, one key card, clerk waiting for the reservation name.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'wala-nay-lain', title: { de: 'Sonst nichts', en: 'Nothing else' },
    situation: { de: 'In der Apotheke fragt die Mitarbeiterin, ob du noch etwas brauchst. Du verneinst und fragst nach dem Gesamtbetrag.', en: 'At the pharmacy, the clerk asks whether you need anything else. Decline and ask for the total amount.' },
    pedagogicalGoal: 'Einen kleinen Einkauf mit wala nay lain abschließen und nach dem Betrag fragen.',
    targetText: 'Wala nay lain. Pila tanan akong bayran?', baseText: { de: 'Sonst nichts. Wie viel muss ich insgesamt bezahlen?', en: 'Nothing else. How much do I have to pay altogether?' },
    chunks: [{ targetText: 'Wala nay lain.', baseText: { de: 'Sonst nichts.', en: 'Nothing else.' } }, { targetText: 'Pila tanan', baseText: { de: 'Wie viel insgesamt', en: 'How much altogether' } }, { targetText: 'akong bayran?', baseText: { de: 'muss ich bezahlen?', en: 'do I have to pay?' } }],
    terms: [{ targetText: 'Wala nay', baseText: { de: 'es gibt nichts mehr', en: 'there is nothing more' } }, { targetText: 'lain', baseText: { de: 'anderes; sonstiges', en: 'other; else' } }, { targetText: 'Pila tanan', baseText: { de: 'wie viel insgesamt', en: 'how much altogether' } }, { targetText: 'bayran', baseText: { de: 'zu bezahlen', en: 'to be paid' } }, { targetText: 'akong', baseText: { de: 'von mir; mein', en: 'by me; my' } }],
    recall: { before: 'Wala nay ', answer: 'lain', after: '. Pila tanan akong bayran?', fallbackChoices: ['lain', 'mahal', 'gamay', 'duol'] }, speakRequired: ['wala', 'lain', 'bayran'],
    sceneCaption: { de: 'Die Apothekerin legt eine kleine Packung an die Kasse und fragt: „Naa pay lain?"', en: 'The pharmacist places a small packet by the register and asks: “Naa pay lain?”' },
    trophyWord: { word: 'lain', meaning: { de: 'anderes; sonstiges', en: 'other; else' }, example: 'Wala na koy lain nga kinahanglan.', whyThisWord: { de: 'Mit diesem Wort beendest du den Einkauf eindeutig, ohne unhöflich oder knapp zu wirken.', en: 'This word closes the purchase clearly without sounding rude or abrupt.' } },
    distractors: ['usa pa ka tambal', 'naa koy reseta'], placeholderCaption: { de: 'Eine Arzneipackung liegt neben dem Kassendisplay einer kleinen Apotheke.', en: 'A medicine packet rests beside the register display in a small pharmacy.' }, songMood: 'a tidy pharmacy errand coming to a clear close', visualNotes: 'Neighborhood pharmacy counter, one packet, clerk ready to total the purchase.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'hunongan-sa-tumoy', title: { de: 'Am Ende der Straße', en: 'At the end of the street' },
    situation: { de: 'Ein Tourist fragt dich nach der Jeepney-Haltestelle. Du gibst eine kurze Wegauskunft bis zum Straßenende.', en: 'A tourist asks you for the jeepney stop. Give a short direction to the end of the street.' },
    pedagogicalGoal: 'Eine Haltestelle mit einem klaren Orientierungspunkt beschreiben.',
    targetText: 'Ang hunongan sa jeep naa sa tumoy sa dalan.', baseText: { de: 'Die Jeepney-Haltestelle ist am Ende der Straße.', en: 'The jeepney stop is at the end of the street.' },
    chunks: [{ targetText: 'Ang hunongan sa jeep', baseText: { de: 'Die Jeepney-Haltestelle', en: 'The jeepney stop' } }, { targetText: 'naa sa tumoy', baseText: { de: 'ist am Ende', en: 'is at the end' } }, { targetText: 'sa dalan.', baseText: { de: 'der Straße.', en: 'of the street.' } }],
    terms: [{ targetText: 'hunongan', baseText: { de: 'Haltestelle', en: 'stop' } }, { targetText: 'jeep', baseText: { de: 'Jeepney', en: 'jeepney' } }, { targetText: 'tumoy', baseText: { de: 'Ende', en: 'end' } }, { targetText: 'dalan', baseText: { de: 'Straße', en: 'street' } }, { targetText: 'naa sa', baseText: { de: 'befindet sich an', en: 'is at' } }],
    recall: { before: 'Ang hunongan sa jeep naa sa ', answer: 'tumoy', after: ' sa dalan.', fallbackChoices: ['tumoy', 'tunga', 'atubangan', 'likod'] }, speakRequired: ['hunongan', 'tumoy', 'dalan'],
    sceneCaption: { de: 'Ein Tourist hält einen Stadtplan hoch und fragt: „Asa ang hunongan sa jeep?"', en: 'A tourist holds up a city map and asks: “Asa ang hunongan sa jeep?”' },
    trophyWord: { word: 'tumoy', meaning: { de: 'Ende', en: 'end' }, example: 'Naa ang tindahan sa tumoy sa dalan.', whyThisWord: { de: 'Dieses Ortswort gibt einem Besucher einen sichtbaren und leicht merkbaren Zielpunkt.', en: 'This location word gives a visitor a visible, easy-to-remember destination.' } },
    distractors: ['liko sa tuo', 'tapad sa botika'], placeholderCaption: { de: 'Eine gerade Straße führt zu einer Jeepney-Haltestelle am fernen Ende.', en: 'A straight street leads to a jeepney stop at the far end.' }, songMood: 'a friendly moment of giving directions downtown', visualNotes: 'Cebu street, tourist with map, jeepney stop sign visible at the end of the block.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'tunga-kilo-mangga', title: { de: 'Ein halbes Kilo', en: 'Half a kilo' },
    situation: { de: 'Die Markthändlerin fragt nach der gewünschten Menge. Du bestellst ein halbes Kilo und fügst zwei Mangos hinzu.', en: 'The market vendor asks how much you want. Order half a kilo and add two mangoes.' },
    pedagogicalGoal: 'Eine Marktmenge nennen und einen zweiten Artikel natürlich ergänzen.',
    targetText: 'Tunga sa kilo, palihug, ug duha ka mangga usab.', baseText: { de: 'Ein halbes Kilo, bitte, und außerdem zwei Mangos.', en: 'Half a kilo, please, and two mangoes as well.' },
    chunks: [{ targetText: 'Tunga sa kilo,', baseText: { de: 'Ein halbes Kilo,', en: 'Half a kilo,' } }, { targetText: 'palihug,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'ug duha ka mangga usab.', baseText: { de: 'und außerdem zwei Mangos.', en: 'and two mangoes as well.' } }],
    terms: [{ targetText: 'Tunga', baseText: { de: 'Hälfte; halb', en: 'half' } }, { targetText: 'kilo', baseText: { de: 'Kilogramm', en: 'kilogram' } }, { targetText: 'duha ka', baseText: { de: 'zwei Stück', en: 'two items' } }, { targetText: 'mangga', baseText: { de: 'Mango', en: 'mango' } }, { targetText: 'usab', baseText: { de: 'auch; außerdem', en: 'also; as well' } }],
    recall: { before: '', answer: 'Tunga', after: ' sa kilo, palihug, ug duha ka mangga usab.', fallbackChoices: ['Tunga', 'Usa', 'Duha', 'Tulo'] }, speakRequired: ['tunga', 'kilo', 'mangga'],
    sceneCaption: { de: 'Die Markthändlerin hält die Schaufel über der Waage und fragt: „Pila ka kilo?"', en: 'The market vendor holds the scoop over the scale and asks: “Pila ka kilo?”' },
    trophyWord: { word: 'tunga', meaning: { de: 'Hälfte; halb', en: 'half' }, example: 'Tunga sa kilo nga mangga, palihug.', whyThisWord: { de: 'Damit bestellst du auf dem Markt genau die kleine Menge, die du wirklich brauchst.', en: 'It lets you order exactly the small amount you actually need at the market.' } },
    distractors: ['usa ka pinya', 'tulo ka saging'], placeholderCaption: { de: 'Mangos liegen neben einer Waage und einer offenen Papiertüte am Marktstand.', en: 'Mangoes sit beside a scale and an open paper bag at a market stall.' }, songMood: 'a colorful market order measured just right', visualNotes: 'Fruit stall, metal scale, mangoes, vendor scoop paused for the requested amount.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'kabalo-na-sa-dapit', title: { de: 'Schon etwas vertraut', en: 'A little familiar now' },
    situation: { de: 'Ein Nachbar fragt, wie es dir geht. Du sagst, dass du dich inzwischen schon etwas in der Gegend auskennst.', en: 'A neighbor asks how you are doing. Say that you already know the area a little now.' },
    pedagogicalGoal: 'Im kurzen Nachbarschaftsgespräch Vertrautheit mit dem neuen Alltag ausdrücken.',
    targetText: 'Maayo ra ko. Kabalo na ko gamay niining dapita.', baseText: { de: 'Mir geht es gut. Ich kenne mich in dieser Gegend jetzt ein bisschen aus.', en: 'I am doing well. I know this area a little now.' },
    chunks: [{ targetText: 'Maayo ra ko.', baseText: { de: 'Mir geht es gut.', en: 'I am doing well.' } }, { targetText: 'Kabalo na ko gamay', baseText: { de: 'Ich kenne mich jetzt ein bisschen aus', en: 'I know a little now' } }, { targetText: 'niining dapita.', baseText: { de: 'in dieser Gegend.', en: 'in this area.' } }],
    terms: [{ targetText: 'Kabalo', baseText: { de: 'wissen; sich auskennen', en: 'know; be familiar with' } }, { targetText: 'gamay', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'niining dapita', baseText: { de: 'in dieser Gegend', en: 'in this area' } }, { targetText: 'Maayo ra', baseText: { de: 'es geht gut', en: 'doing well' } }, { targetText: 'na', baseText: { de: 'jetzt; inzwischen', en: 'now; by now' } }],
    recall: { before: 'Maayo ra ko. ', answer: 'Kabalo', after: ' na ko gamay niining dapita.', fallbackChoices: ['Kabalo', 'Ganahan', 'Naghulat', 'Nagpuyo'] }, speakRequired: ['kabalo', 'gamay', 'dapita'],
    sceneCaption: { de: 'Ein Nachbar bleibt im Treppenhaus stehen und fragt: „Kumusta man?"', en: 'A neighbor pauses in the stairwell and asks: “Kumusta man?”' },
    trophyWord: { word: 'kabalo', meaning: { de: 'wissen; sich auskennen', en: 'know; be familiar with' }, example: 'Kabalo na ko sa dalan paingon sa merkado.', whyThisWord: { de: 'Das Wort zeigt deinem Nachbarn, dass die neue Umgebung langsam zu deinem Alltag wird.', en: 'This word shows your neighbor that the new surroundings are becoming part of your daily life.' } },
    distractors: ['bag-o pa ko dinhi', 'layo ang merkado'], placeholderCaption: { de: 'Zwei Nachbarn begegnen sich entspannt in einem hellen Treppenhaus.', en: 'Two neighbors meet casually in a bright stairwell.' }, songMood: 'a warm hallway greeting with growing local confidence', visualNotes: 'Apartment stairwell, familiar neighbor, relaxed smiles, everyday Cebu neighborhood beyond the doorway.',
  }),
]

export const CEBUANO_A2_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_ONE_METADATA, cebuanoA2Practical1Inputs,
  { de: 'Du hast Cebuano A2 Praxis 1 abgeschlossen und kannst vertraute Alltagsgespräche sicher weiterführen.', en: 'You have completed Cebuano A2 Practical 1 and can confidently continue familiar everyday exchanges.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_TWO_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-2', title: 'Cebuano A2 Praxis 2', shortTitle: 'A2 Praxis 2',
  subtitle: { de: 'Auswählen, vergleichen und Entscheidungen begründen', en: 'Choosing, comparing, and giving reasons for decisions' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical2Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'kini-kay-mas-barato', title: { de: 'Dieses ist günstiger', en: 'This one is cheaper' },
    situation: { de: 'Auf dem Markt zeigt die Händlerin zwei Gemüsesorten. Du nimmst diese hier, weil sie günstiger ist.', en: 'At the market, the vendor shows you two kinds of vegetables. Take this one because it is cheaper.' },
    pedagogicalGoal: 'Eine sichtbare Auswahl mit kay und mas barato knapp begründen.',
    targetText: 'Kini lang, palihug, kay mas barato.', baseText: { de: 'Nur dieses hier, bitte, weil es günstiger ist.', en: 'Just this one, please, because it is cheaper.' },
    chunks: [{ targetText: 'Kini lang,', baseText: { de: 'Nur dieses hier,', en: 'Just this one,' } }, { targetText: 'palihug,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'kay mas barato.', baseText: { de: 'weil es günstiger ist.', en: 'because it is cheaper.' } }],
    terms: [{ targetText: 'Kini', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: 'barato', baseText: { de: 'günstig; billig', en: 'cheap; inexpensive' } }, { targetText: 'mas barato', baseText: { de: 'günstiger', en: 'cheaper' } }, { targetText: 'kay', baseText: { de: 'weil', en: 'because' } }, { targetText: 'lang', baseText: { de: 'nur', en: 'just; only' } }],
    recall: { before: 'Kini lang, palihug, kay mas ', answer: 'barato', after: '.', fallbackChoices: ['barato', 'mahal', 'presko', 'dako'] }, speakRequired: ['kini', 'mas', 'barato'],
    sceneCaption: { de: 'Die Händlerin hält zwei Bündel Gemüse hoch und fragt: „Asa niini ang imong gusto?“', en: 'The vendor holds up two bundles of vegetables and asks: “Asa niini ang imong gusto?”' },
    trophyWord: { word: 'barato', meaning: { de: 'günstig; billig', en: 'cheap; inexpensive' }, example: 'Barato ang mga utanon karon.', whyThisWord: { de: 'Dieses Adjektiv nennt auf dem Markt einen klaren und alltäglichen Grund für deine Wahl.', en: 'This adjective gives a clear, everyday reason for your market choice.' } },
    distractors: ['kana nga dako', 'duha ka putos'], placeholderCaption: { de: 'Zwei Gemüsebündel mit unterschiedlichen Preisschildern liegen auf einem Marktstand.', en: 'Two vegetable bundles with different price tags sit on a market stall.' }, songMood: 'a bright market choice guided by a small saving', visualNotes: 'Produce stall, two bundles, clear price cards and one decisive pointing hand.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'tubig-kay-mas-init', title: { de: 'Heute lieber Wasser', en: 'Water today' },
    situation: { de: 'In einer Carinderia fragt die Bedienung nach deinem üblichen Getränk. Heute wählst du wegen der Hitze Wasser.', en: 'At a carinderia, the server asks about your usual drink. Today, choose water because of the heat.' },
    pedagogicalGoal: 'Eine Getränkewahl mit karon und einem Wettervergleich begründen.',
    targetText: 'Tubig lang karon, palihug, kay mas init ang adlaw.', baseText: { de: 'Heute nur Wasser, bitte, weil der Tag heißer ist.', en: 'Just water today, please, because the day is hotter.' },
    chunks: [{ targetText: 'Tubig lang karon,', baseText: { de: 'Heute nur Wasser,', en: 'Just water today,' } }, { targetText: 'palihug,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'kay mas init ang adlaw.', baseText: { de: 'weil der Tag heißer ist.', en: 'because the day is hotter.' } }],
    terms: [{ targetText: 'Tubig', baseText: { de: 'Wasser', en: 'water' } }, { targetText: 'karon', baseText: { de: 'heute; jetzt', en: 'today; now' } }, { targetText: 'init', baseText: { de: 'heiß', en: 'hot' } }, { targetText: 'adlaw', baseText: { de: 'Tag', en: 'day' } }, { targetText: 'mas init', baseText: { de: 'heißer', en: 'hotter' } }],
    recall: { before: 'Tubig lang karon, palihug, kay mas ', answer: 'init', after: ' ang adlaw.', fallbackChoices: ['init', 'bugnaw', 'mubo', 'hayag'] }, speakRequired: ['tubig', 'init', 'adlaw'],
    sceneCaption: { de: 'Die Bedienung greift nach dem Getränkekühler und fragt: „Mao ra gihapon imong ilimnon karon?“', en: 'The server reaches toward the drink cooler and asks: “Mao ra gihapon imong ilimnon karon?”' },
    trophyWord: { word: 'init', meaning: { de: 'heiß', en: 'hot' }, example: 'Init kaayo ang adlaw karon.', whyThisWord: { de: 'Das Wort verbindet die spürbare Hitze direkt mit deiner anderen Getränkewahl.', en: 'This word connects the noticeable heat directly to your different drink choice.' } },
    distractors: ['tsa nga init', 'duha ka ilimnon'], placeholderCaption: { de: 'Eine kalte Wasserflasche steht auf dem Tresen einer offenen Carinderia.', en: 'A cold bottle of water stands on the counter of an open-air carinderia.' }, songMood: 'a cool drink change on a hot Cebu afternoon', visualNotes: 'Open-air carinderia, bright heat outside, chilled water near the server hand.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'asul-sakto-ang-sukod', title: { de: 'Das blaue passt besser', en: 'The blue one fits better' },
    situation: { de: 'In einem Kleidungsgeschäft zeigt dir die Verkäuferin mehrere Farben und Größen. Du wählst das blaue Stück mit der passenderen Größe.', en: 'In a clothing shop, the clerk shows you several colors and sizes. Choose the blue item with the better-fitting size.' },
    pedagogicalGoal: 'Farbe und passende Größe in einer begründeten Kaufentscheidung verbinden.',
    targetText: 'Kana nga asul, palihug, kay mas sakto ang sukod.', baseText: { de: 'Das blaue dort, bitte, weil die Größe besser passt.', en: 'That blue one, please, because the size fits better.' },
    chunks: [{ targetText: 'Kana nga asul,', baseText: { de: 'Das blaue dort,', en: 'That blue one,' } }, { targetText: 'palihug,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'kay mas sakto ang sukod.', baseText: { de: 'weil die Größe besser passt.', en: 'because the size fits better.' } }],
    terms: [{ targetText: 'asul', baseText: { de: 'blau', en: 'blue' } }, { targetText: 'sakto', baseText: { de: 'passend; genau richtig', en: 'suitable; just right' } }, { targetText: 'sukod', baseText: { de: 'Größe; Maß', en: 'size; measurement' } }, { targetText: 'Kana', baseText: { de: 'jenes dort', en: 'that one' } }, { targetText: 'mas sakto', baseText: { de: 'passender', en: 'more suitable' } }],
    recall: { before: 'Kana nga ', answer: 'asul', after: ', palihug, kay mas sakto ang sukod.', fallbackChoices: ['asul', 'pula', 'puti', 'itom'] }, speakRequired: ['asul', 'sakto', 'sukod'],
    sceneCaption: { de: 'Die Verkäuferin hält zwei Hemden nebeneinander und fragt: „Unsa nga kolor ug sukod imong gusto?"', en: 'The clerk holds two shirts side by side and asks: “Unsa nga kolor ug sukod imong gusto?”' },
    trophyWord: { word: 'asul', meaning: { de: 'blau', en: 'blue' }, example: 'Ang asul nga sinina ang akong gusto.', whyThisWord: { de: 'Mit diesem Farbnamen beziehst du dich eindeutig auf das passende Kleidungsstück vor dir.', en: 'This color word points unambiguously to the suitable piece of clothing in front of you.' } },
    distractors: ['ang dako nga pula', 'gamay nga sinina'], placeholderCaption: { de: 'Ein blaues und ein rotes Hemd hängen neben einem Spiegel im Laden.', en: 'A blue and a red shirt hang beside a mirror in the shop.' }, songMood: 'a clear color choice in a small clothing shop', visualNotes: 'Clothing counter, blue and red shirts, size tags and a mirror catching soft light.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sabaw-mas-gaan', title: { de: 'Die leichtere Suppe', en: 'The lighter soup' },
    situation: { de: 'Im Restaurant nennt die Bedienung zwei Gerichte. Du wählst die leichtere, weniger scharfe Suppe.', en: 'At the restaurant, the server names two dishes. Choose the lighter, less spicy soup.' },
    pedagogicalGoal: 'Ein Gericht mit zwei einfachen Eigenschaften vergleichen und auswählen.',
    targetText: 'Kini nga sabaw, kay mas gaan ug dili kaayo halang.', baseText: { de: 'Diese Suppe, weil sie leichter und nicht so scharf ist.', en: 'This soup, because it is lighter and not too spicy.' },
    chunks: [{ targetText: 'Kini nga sabaw,', baseText: { de: 'Diese Suppe,', en: 'This soup,' } }, { targetText: 'kay mas gaan', baseText: { de: 'weil sie leichter ist', en: 'because it is lighter' } }, { targetText: 'ug dili kaayo halang.', baseText: { de: 'und nicht so scharf.', en: 'and not too spicy.' } }],
    terms: [{ targetText: 'sabaw', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'gaan', baseText: { de: 'leicht', en: 'light' } }, { targetText: 'halang', baseText: { de: 'scharf', en: 'spicy' } }, { targetText: 'dili kaayo', baseText: { de: 'nicht so sehr', en: 'not too' } }, { targetText: 'mas gaan', baseText: { de: 'leichter', en: 'lighter' } }],
    recall: { before: 'Kini nga sabaw, kay mas ', answer: 'gaan', after: ' ug dili kaayo halang.', fallbackChoices: ['gaan', 'bug-at', 'tam-is', 'mahal'] }, speakRequired: ['sabaw', 'gaan', 'halang'],
    sceneCaption: { de: 'Die Bedienung zeigt auf zwei Gerichte in der Karte und fragt: „Sabaw o halang nga putahe ang imong gusto?"', en: 'The server points to two dishes on the menu and asks: “Sabaw o halang nga putahe ang imong gusto?”' },
    trophyWord: { word: 'gaan', meaning: { de: 'leicht', en: 'light' }, example: 'Gaan ra kining sabawa para sa paniudto.', whyThisWord: { de: 'Damit erklärst du im Restaurant, warum die Suppe besser zu deinem heutigen Appetit passt.', en: 'It explains at the restaurant why the soup better suits your appetite today.' } },
    distractors: ['ang sinugba nga baboy', 'dugang nga sili'], placeholderCaption: { de: 'Eine helle Suppe steht neben einem kräftig gewürzten Gericht auf der Speisekarte.', en: 'A light soup sits beside a richly spiced dish on the menu.' }, songMood: 'a gentle lunch choice with a lighter flavor', visualNotes: 'Restaurant menu, clear soup bowl, spicy grilled dish, customer choosing calmly.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'pan-mas-presko', title: { de: 'Das frischere Brot', en: 'The fresher bread' },
    situation: { de: 'In einer Bäckerei liegen Brot von gestern und frisches Brot von heute. Du wählst das frischere.', en: 'At a bakery, yesterday’s bread and today’s fresh bread are on display. Choose the fresher one.' },
    pedagogicalGoal: 'Eine Auswahl in der Bäckerei mit mas presko und einer Zeitangabe begründen.',
    targetText: 'Kini nga pan, palihug, kay mas presko karon.', baseText: { de: 'Dieses Brot, bitte, weil es heute frischer ist.', en: 'This bread, please, because it is fresher today.' },
    chunks: [{ targetText: 'Kini nga pan,', baseText: { de: 'Dieses Brot,', en: 'This bread,' } }, { targetText: 'palihug,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'kay mas presko karon.', baseText: { de: 'weil es heute frischer ist.', en: 'because it is fresher today.' } }],
    terms: [{ targetText: 'pan', baseText: { de: 'Brot', en: 'bread' } }, { targetText: 'presko', baseText: { de: 'frisch', en: 'fresh' } }, { targetText: 'karon', baseText: { de: 'heute; jetzt', en: 'today; now' } }, { targetText: 'mas presko', baseText: { de: 'frischer', en: 'fresher' } }, { targetText: 'Kini nga', baseText: { de: 'dieses', en: 'this' } }],
    recall: { before: 'Kini nga ', answer: 'pan', after: ', palihug, kay mas presko karon.', fallbackChoices: ['pan', 'kape', 'sabaw', 'prutas'] }, speakRequired: ['pan', 'presko', 'karon'],
    sceneCaption: { de: 'Die Verkäuferin legt zwei Brote auf ein Blech und fragt: „Asa niining duha ka pan ang imong gusto?"', en: 'The clerk places two loaves on a tray and asks: “Asa niining duha ka pan ang imong gusto?”' },
    trophyWord: { word: 'pan', meaning: { de: 'Brot', en: 'bread' }, example: 'Presko ang pan kada buntag.', whyThisWord: { de: 'Das konkrete Produktwort macht deine Wahl zwischen den beiden Broten eindeutig.', en: 'This concrete product word makes your choice between the two loaves unambiguous.' } },
    distractors: ['kana nga daan', 'duha ka keyk'], placeholderCaption: { de: 'Zwei Brote liegen unter warmem Licht auf einem Bäckereiblech.', en: 'Two loaves rest under warm light on a bakery tray.' }, songMood: 'a cozy bakery choice made for freshness', visualNotes: 'Small bakery, two loaves with different bake times, warm tray and paper bag nearby.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'taksi-mas-paspas', title: { de: 'Das Taxi ist schneller', en: 'The taxi is faster' },
    situation: { de: 'An einem Verkehrsschalter fragt ein Mitarbeiter, ob du mit dem Jeepney oder dem Taxi zum Hotel möchtest. Du wählst die schnellere Möglichkeit.', en: 'At a transport counter, a staff member asks whether you want a jeepney or taxi to the hotel. Choose the faster option.' },
    pedagogicalGoal: 'Zwei Verkehrsmittel vergleichen und die schnellere Wahl mit kay begründen.',
    targetText: 'Taksi lang, palihug, kay mas paspas paingon sa hotel.', baseText: { de: 'Ein Taxi, bitte, weil man damit schneller zum Hotel kommt.', en: 'Just a taxi, please, because it is faster to the hotel.' },
    chunks: [{ targetText: 'Taksi lang,', baseText: { de: 'Nur ein Taxi,', en: 'Just a taxi,' } }, { targetText: 'palihug,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'kay mas paspas paingon sa hotel.', baseText: { de: 'weil man damit schneller zum Hotel kommt.', en: 'because it is faster to the hotel.' } }],
    terms: [{ targetText: 'Taksi', baseText: { de: 'Taxi', en: 'taxi' }, alsoAccept: ['taxi'] }, { targetText: 'paspas', baseText: { de: 'schnell', en: 'fast' } }, { targetText: 'paingon sa', baseText: { de: 'in Richtung; nach', en: 'toward; to' } }, { targetText: 'hotel', baseText: { de: 'Hotel', en: 'hotel' } }, { targetText: 'mas paspas', baseText: { de: 'schneller', en: 'faster' } }],
    recall: { before: 'Taksi lang, palihug, kay mas ', answer: 'paspas', after: ' paingon sa hotel.', fallbackChoices: ['paspas', 'hinay', 'mahal', 'duol'] }, speakRequired: ['taksi', 'paspas', 'hotel'],
    sceneCaption: { de: 'Der Mitarbeiter zeigt auf die Jeepney- und Taxischilder und fragt: „Jeep ba o taksi ang mas gusto nimo?"', en: 'The staff member points to the jeepney and taxi signs and asks: “Jeep ba o taksi ang mas gusto nimo?”' },
    trophyWord: { word: 'paspas', meaning: { de: 'schnell', en: 'fast' }, example: 'Mas paspas ang taksi paingon sa hotel.', whyThisWord: { de: 'Das Adjektiv begründet deine Verkehrswahl, wenn du ohne Umweg zum Hotel möchtest.', en: 'This adjective explains your transport choice when you want to reach the hotel without delay.' } },
    distractors: ['jeep lang palihug', 'maglakaw gikan dinhi'], placeholderCaption: { de: 'Ein Taxi und ein Jeepney warten unter zwei Schildern vor dem Verkehrsschalter.', en: 'A taxi and a jeepney wait beneath two signs outside the transport counter.' }, songMood: 'a quick city transfer with a clear choice', visualNotes: 'Transport desk, taxi and jeepney visible outside, hotel pin marked on a simple route board.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'kwarto-mas-hilom', title: { de: 'Das ruhigere Zimmer', en: 'The quieter room' },
    situation: { de: 'Die Rezeptionistin zeigt dir zwei Zimmer. Du bevorzugst das ruhigere, weil es besser zum Schlafen ist.', en: 'The receptionist shows you two rooms. Prefer the quieter one because it is better for sleeping.' },
    pedagogicalGoal: 'Eine Zimmerwahl mit zwei zusammengehörigen Komfortgründen erklären.',
    targetText: 'Kini nga kwarto, kay mas hilom ug mas maayo para matulog.', baseText: { de: 'Dieses Zimmer, weil es ruhiger und besser zum Schlafen ist.', en: 'This room, because it is quieter and better for sleeping.' },
    chunks: [{ targetText: 'Kini nga kwarto,', baseText: { de: 'Dieses Zimmer,', en: 'This room,' } }, { targetText: 'kay mas hilom', baseText: { de: 'weil es ruhiger ist', en: 'because it is quieter' } }, { targetText: 'ug mas maayo para matulog.', baseText: { de: 'und besser zum Schlafen.', en: 'and better for sleeping.' } }],
    terms: [{ targetText: 'kwarto', baseText: { de: 'Zimmer', en: 'room' } }, { targetText: 'hilom', baseText: { de: 'ruhig; still', en: 'quiet; silent' } }, { targetText: 'mas maayo', baseText: { de: 'besser', en: 'better' } }, { targetText: 'para matulog', baseText: { de: 'zum Schlafen', en: 'for sleeping' } }, { targetText: 'mas hilom', baseText: { de: 'ruhiger', en: 'quieter' } }],
    recall: { before: 'Kini nga kwarto, kay mas ', answer: 'hilom', after: ' ug mas maayo para matulog.', fallbackChoices: ['hilom', 'saba', 'dako', 'mahal'] }, speakRequired: ['kwarto', 'hilom', 'matulog'],
    sceneCaption: { de: 'Die Rezeptionistin legt zwei Schlüsselkarten hin und fragt: „Asa niining duha ka kwarto ang imong gusto?"', en: 'The receptionist lays down two key cards and asks: “Asa niining duha ka kwarto ang imong gusto?”' },
    trophyWord: { word: 'hilom', meaning: { de: 'ruhig; still', en: 'quiet; silent' }, example: 'Hilom ang kwarto sa luyo.', whyThisWord: { de: 'Damit nennst du genau die Eigenschaft, die für eine erholsame Nacht im Hotel zählt.', en: 'It names the exact quality that matters for a restful night at the hotel.' } },
    distractors: ['ang dako nga kwarto', 'duol sa elevator'], placeholderCaption: { de: 'Zwei Schlüsselkarten liegen auf dem Tresen vor einem ruhigen Hotelflur.', en: 'Two key cards lie on the counter before a quiet hotel corridor.' }, songMood: 'a calm room choice for a restful night', visualNotes: 'Hotel reception, two room keys, one corridor near the lift and one quiet corridor farther back.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sandalyas-mas-humok', title: { de: 'Die weicheren Sandalen', en: 'The softer sandals' },
    situation: { de: 'An einem Marktstand probierst du zwei Paar Sandalen. Du nimmst das weichere und bequemere Paar.', en: 'At a market stall, you try on two pairs of sandals. Take the softer, more comfortable pair.' },
    pedagogicalGoal: 'Eine Kaufentscheidung mit zwei Komforteigenschaften begründen.',
    targetText: 'Kining sandalyas, kay mas humok ug komportable.', baseText: { de: 'Diese Sandalen, weil sie weicher und bequem sind.', en: 'These sandals, because they are softer and comfortable.' },
    chunks: [{ targetText: 'Kining sandalyas,', baseText: { de: 'Diese Sandalen,', en: 'These sandals,' } }, { targetText: 'kay mas humok', baseText: { de: 'weil sie weicher sind', en: 'because they are softer' } }, { targetText: 'ug komportable.', baseText: { de: 'und bequem.', en: 'and comfortable.' } }],
    terms: [{ targetText: 'sandalyas', baseText: { de: 'Sandalen', en: 'sandals' } }, { targetText: 'humok', baseText: { de: 'weich', en: 'soft' } }, { targetText: 'komportable', baseText: { de: 'bequem', en: 'comfortable' } }, { targetText: 'mas humok', baseText: { de: 'weicher', en: 'softer' } }, { targetText: 'Kining', baseText: { de: 'diese hier', en: 'these here' } }],
    recall: { before: 'Kining sandalyas, kay mas ', answer: 'humok', after: ' ug komportable.', fallbackChoices: ['humok', 'gahi', 'mahal', 'gamay'] }, speakRequired: ['sandalyas', 'humok', 'komportable'],
    sceneCaption: { de: 'Die Händlerin stellt zwei Paar vor dich und fragt: „Asa niining sandalyas ang mas komportable?"', en: 'The vendor places two pairs in front of you and asks: “Asa niining sandalyas ang mas komportable?”' },
    trophyWord: { word: 'sandalyas', meaning: { de: 'Sandalen', en: 'sandals' }, example: 'Komportable kining sandalyas sa paglakaw.', whyThisWord: { de: 'Das Wort hält deine Auswahl am Markt eindeutig beim Paar, das du gerade anprobierst.', en: 'This word keeps your market choice clearly focused on the pair you are trying on.' } },
    distractors: ['kana nga sapatos', 'dako nga tsinelas'], placeholderCaption: { de: 'Zwei Paar Sandalen stehen auf einer kleinen Matte am Marktstand.', en: 'Two pairs of sandals sit on a small mat at the market stall.' }, songMood: 'an easy market choice made for comfortable walking', visualNotes: 'Footwear stall, two sandal pairs, woven mat and a customer testing the softer sole.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'gamay-nga-botelya', title: { de: 'Die kleinere Flasche', en: 'The smaller bottle' },
    situation: { de: 'Im Laden bietet dir die Verkäuferin eine große Flasche an. Du wählst die kleinere, weil ihr Preis niedriger ist.', en: 'In a shop, the clerk offers you a large bottle. Choose the smaller one because its price is lower.' },
    pedagogicalGoal: 'Größe und Preis in einer kurzen begründeten Auswahl verbinden.',
    targetText: 'Ang gamay nga botelya, palihug, kay mas ubos ang presyo.', baseText: { de: 'Die kleine Flasche, bitte, weil der Preis niedriger ist.', en: 'The small bottle, please, because the price is lower.' },
    chunks: [{ targetText: 'Ang gamay nga botelya,', baseText: { de: 'Die kleine Flasche,', en: 'The small bottle,' } }, { targetText: 'palihug,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'kay mas ubos ang presyo.', baseText: { de: 'weil der Preis niedriger ist.', en: 'because the price is lower.' } }],
    terms: [{ targetText: 'gamay', baseText: { de: 'klein', en: 'small' } }, { targetText: 'botelya', baseText: { de: 'Flasche', en: 'bottle' } }, { targetText: 'ubos', baseText: { de: 'niedrig', en: 'low' } }, { targetText: 'presyo', baseText: { de: 'Preis', en: 'price' } }, { targetText: 'mas ubos', baseText: { de: 'niedriger', en: 'lower' } }],
    recall: { before: 'Ang gamay nga ', answer: 'botelya', after: ', palihug, kay mas ubos ang presyo.', fallbackChoices: ['botelya', 'baso', 'kahon', 'putos'] }, speakRequired: ['gamay', 'botelya', 'presyo'],
    sceneCaption: { de: 'Die Verkäuferin hebt eine große Flasche aus dem Regal und fragt: „Dako nga botelya ang imong gusto?"', en: 'The clerk lifts a large bottle from the shelf and asks: “Dako nga botelya ang imong gusto?”' },
    trophyWord: { word: 'botelya', meaning: { de: 'Flasche', en: 'bottle' }, example: 'Gamay nga botelya lang ang akong paliton.', whyThisWord: { de: 'Damit benennst du genau die kleinere Packungsgröße, deren Preis du vergleichst.', en: 'It names the exact smaller package size whose price you are comparing.' } },
    distractors: ['ang dako nga garapon', 'duha ka lata'], placeholderCaption: { de: 'Eine kleine und eine große Flasche stehen vor zwei Preisschildern im Regal.', en: 'A small and a large bottle stand before two price labels on a shelf.' }, songMood: 'a simple shop choice that costs a little less', visualNotes: 'Convenience-store shelf, two bottle sizes, price tags and the smaller bottle selected.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'kapihan-duol-ug-hilom', title: { de: 'Mein Lieblingscafé', en: 'My favorite cafe' },
    situation: { de: 'Ein Nachbar fragt nach deinem Lieblingsort in der Gegend. Du nennst dieses Café, weil es näher und ruhig ist.', en: 'A neighbor asks about your favorite spot in the area. Name this cafe because it is closer and quiet.' },
    pedagogicalGoal: 'Einen Lieblingsort mit zwei einfachen Eigenschaften begründen.',
    targetText: 'Kini nga kapihan, kay mas duol ug hilom.', baseText: { de: 'Dieses Café, weil es näher und ruhig ist.', en: 'This cafe, because it is closer and quiet.' },
    chunks: [{ targetText: 'Kini nga kapihan,', baseText: { de: 'Dieses Café,', en: 'This cafe,' } }, { targetText: 'kay mas duol', baseText: { de: 'weil es näher ist', en: 'because it is closer' } }, { targetText: 'ug hilom.', baseText: { de: 'und ruhig.', en: 'and quiet.' } }],
    terms: [{ targetText: 'kapihan', baseText: { de: 'Café; Kaffeehaus', en: 'cafe; coffee shop' } }, { targetText: 'duol', baseText: { de: 'nah', en: 'near' } }, { targetText: 'hilom', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'mas duol', baseText: { de: 'näher', en: 'closer' } }, { targetText: 'Kini nga', baseText: { de: 'dieses', en: 'this' } }],
    recall: { before: 'Kini nga ', answer: 'kapihan', after: ', kay mas duol ug hilom.', fallbackChoices: ['kapihan', 'merkado', 'parke', 'hotel'] }, speakRequired: ['kapihan', 'duol', 'hilom'],
    sceneCaption: { de: 'Der Nachbar schaut zur nahen Caféterrasse und fragt: „Asa imong paborito nga lugar dinhi?"', en: 'The neighbor looks toward the nearby cafe terrace and asks: “Asa imong paborito nga lugar dinhi?”' },
    trophyWord: { word: 'kapihan', meaning: { de: 'Café; Kaffeehaus', en: 'cafe; coffee shop' }, example: 'Hilom kining kapihan sa hapon.', whyThisWord: { de: 'Das Ortswort macht deine Empfehlung persönlich und eindeutig für die Nachbarschaft.', en: 'This place word makes your neighborhood recommendation personal and specific.' } },
    distractors: ['kana nga parke', 'layo nga tindahan'], placeholderCaption: { de: 'Ein ruhiges kleines Café liegt an einer nahen Seitenstraße.', en: 'A quiet small cafe sits on a nearby side street.' }, songMood: 'a quiet neighborhood cafe that feels newly familiar', visualNotes: 'Leafy Cebu side street, small cafe terrace, neighbor and learner looking toward the entrance.',
  }),
]

export const CEBUANO_A2_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_TWO_METADATA, cebuanoA2Practical2Inputs,
  { de: 'Du hast Cebuano A2 Praxis 2 abgeschlossen und kannst Entscheidungen vergleichen und verständlich begründen.', en: 'You have completed Cebuano A2 Practical 2 and can compare choices and explain your reasons clearly.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_THREE_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-3', title: 'Cebuano A2 Praxis 3', shortTitle: 'A2 Praxis 3',
  subtitle: { de: 'Erledigte Dinge von gestern und gerade eben erzählen', en: 'Talking about completed events from yesterday and just now' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical3Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'nibayad-na-ko', title: { de: 'Schon bezahlt', en: 'Already paid' },
    situation: { de: 'An der Kasse fragt die Mitarbeiterin, ob du noch bezahlen musst. Du sagst, dass du bereits früher an der Kasse bezahlt hast.', en: 'At the counter, the clerk asks whether you still need to pay. Say that you already paid at the register earlier.' },
    pedagogicalGoal: 'Mit nibayad und na eine bereits abgeschlossene Zahlung ausdrücken.',
    targetText: 'Nibayad na ko didto sa kaha ganina.', baseText: { de: 'Ich habe vorhin dort an der Kasse bezahlt.', en: 'I already paid there at the register earlier.' },
    chunks: [{ targetText: 'Nibayad na ko', baseText: { de: 'Ich habe bereits bezahlt', en: 'I already paid' } }, { targetText: 'didto sa kaha', baseText: { de: 'dort an der Kasse', en: 'there at the register' } }, { targetText: 'ganina.', baseText: { de: 'vorhin.', en: 'earlier.' } }],
    terms: [{ targetText: 'Nibayad', baseText: { de: 'hat bezahlt', en: 'paid' } }, { targetText: 'na', baseText: { de: 'bereits; schon', en: 'already' } }, { targetText: 'kaha', baseText: { de: 'Kasse', en: 'cash register' } }, { targetText: 'ganina', baseText: { de: 'vorhin; heute früher', en: 'earlier today' } }, { targetText: 'didto', baseText: { de: 'dort', en: 'there' } }],
    recall: { before: '', answer: 'Nibayad', after: ' na ko didto sa kaha ganina.', fallbackChoices: ['Nibayad', 'Nipalit', 'Nikaon', 'Niadto'] }, speakRequired: ['nibayad', 'kaha', 'ganina'],
    sceneCaption: { de: 'Die Kassiererin prüft den offenen Betrag und fragt: „Mobayad pa ka dinhi?"', en: 'The cashier checks the open amount and asks: “Mobayad pa ka dinhi?”' },
    trophyWord: { word: 'nibayad', meaning: { de: 'hat bezahlt', en: 'paid' }, example: 'Nibayad na ko sa kaha.', whyThisWord: { de: 'Die abgeschlossene Form beendet ein Missverständnis an der Kasse sofort und eindeutig.', en: 'The completed form resolves a payment misunderstanding at the counter immediately and clearly.' } },
    distractors: ['bayad sa kard', 'naa pay sukli'], placeholderCaption: { de: 'Eine Kassiererin schaut zwischen dem Beleg und der bereits geschlossenen Kassenlade hin und her.', en: 'A cashier looks between the receipt and the already closed register drawer.' }, songMood: 'a quick payment check resolved with confidence', visualNotes: 'Service counter, receipt in hand, cash register, customer indicating the other payment point.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'niabot-gahapon-sa-gabii', title: { de: 'Gestern Abend angekommen', en: 'Arrived last night' },
    situation: { de: 'An der Hotelrezeption fragt die Mitarbeiterin nach deiner Ankunft. Du sagst, dass du gestern Abend im Hotel angekommen bist.', en: 'At hotel reception, the clerk asks about your arrival. Say that you arrived at the hotel yesterday evening.' },
    pedagogicalGoal: 'Die bekannte abgeschlossene Form niabot mit einer eindeutigen vergangenen Zeitangabe verwenden.',
    targetText: 'Niabot ko sa hotel gahapon sa gabii.', baseText: { de: 'Ich bin gestern Abend im Hotel angekommen.', en: 'I arrived at the hotel yesterday evening.' },
    chunks: [{ targetText: 'Niabot ko sa hotel', baseText: { de: 'Ich bin im Hotel angekommen', en: 'I arrived at the hotel' } }, { targetText: 'gahapon', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'sa gabii.', baseText: { de: 'am Abend.', en: 'in the evening.' } }],
    terms: [{ targetText: 'Niabot', baseText: { de: 'ist angekommen', en: 'arrived' }, alsoAccept: ['Miabot', 'Naabot'] }, { targetText: 'gahapon', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'sa gabii', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: 'hotel', baseText: { de: 'Hotel', en: 'hotel' } }, { targetText: 'niabot ko', baseText: { de: 'ich bin angekommen', en: 'I arrived' } }],
    recall: { before: 'Niabot ko sa hotel ', answer: 'gahapon', after: ' sa gabii.', fallbackChoices: ['gahapon', 'ganina', 'karon', 'ugma'] }, speakRequired: ['niabot', 'hotel', 'gahapon'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Gästeliste und fragt: „Kanus-a ka niabot sa hotel?"', en: 'The receptionist opens the guest list and asks: “Kanus-a ka niabot sa hotel?”' },
    trophyWord: { word: 'gahapon', meaning: { de: 'gestern', en: 'yesterday' }, example: 'Gahapon ko niabot sa Cebu.', whyThisWord: { de: 'Die Zeitangabe verankert deine Ankunft eindeutig am Vortag und stützt die abgeschlossene Form.', en: 'This time word anchors your arrival clearly on the previous day and supports the completed form.' } },
    distractors: ['karong buntag', 'sunod semana'], placeholderCaption: { de: 'Eine geöffnete Gästeliste liegt neben dem Ankunftsdatum auf dem Hotelbildschirm.', en: 'An open guest list lies beside the arrival date on the hotel screen.' }, songMood: 'a calm hotel check-in recalling the previous evening', visualNotes: 'Hotel desk, guest list, evening arrival date and a small suitcase beside the customer.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nahuman-na-pag-order', title: { de: 'Schon bestellt', en: 'Already ordered' },
    situation: { de: 'Der Kellner fragt, ob du schon bestellt hast. Du bestätigst die abgeschlossene Bestellung und zeigst auf deine Wahl.', en: 'The server asks whether you have already ordered. Confirm the completed order and point out your choice.' },
    pedagogicalGoal: 'Mit nahuman na einen abgeschlossenen Bestellvorgang ausdrücken.',
    targetText: 'Nahuman na ko sa pag-order. Mao na akong order.', baseText: { de: 'Ich habe die Bestellung abgeschlossen. Das ist meine Bestellung.', en: 'I have finished ordering. That is my order.' },
    chunks: [{ targetText: 'Nahuman na ko', baseText: { de: 'Ich bin fertig', en: 'I have finished' } }, { targetText: 'sa pag-order.', baseText: { de: 'mit dem Bestellen.', en: 'ordering.' } }, { targetText: 'Mao na akong order.', baseText: { de: 'Das ist meine Bestellung.', en: 'That is my order.' } }],
    terms: [{ targetText: 'Nahuman', baseText: { de: 'ist fertig geworden; hat beendet', en: 'finished; completed' } }, { targetText: 'pag-order', baseText: { de: 'Bestellen; Bestellvorgang', en: 'ordering; order process' } }, { targetText: 'order', baseText: { de: 'Bestellung', en: 'order' } }, { targetText: 'Mao na', baseText: { de: 'das ist es', en: 'that is it' } }, { targetText: 'akong order', baseText: { de: 'meine Bestellung', en: 'my order' } }],
    recall: { before: 'Nahuman na ko sa pag-order. Mao na akong ', answer: 'order', after: '.', fallbackChoices: ['order', 'bayranan', 'resibo', 'menu'] }, speakRequired: ['nahuman', 'mao', 'order'],
    sceneCaption: { de: 'Der Kellner hält seinen Bestellblock bereit und fragt: „Naka-order na ka sa imong pagkaon?"', en: 'The server holds his order pad ready and asks: “Naka-order na ka sa imong pagkaon?”' },
    trophyWord: { word: 'order', meaning: { de: 'Bestellung', en: 'order' }, example: 'Mao na akong order para sa paniudto.', whyThisWord: { de: 'Das geläufige Lehnwort bezeichnet genau die Bestellung, die der Kellner gerade bestätigen möchte.', en: 'This common loanword names the exact order the server is trying to confirm.' } },
    distractors: ['wala pa ko andam', 'dugang nga sabaw'], placeholderCaption: { de: 'Ein Kellner wartet mit geöffnetem Bestellblock neben einer aufgeschlagenen Speisekarte.', en: 'A server waits with an open order pad beside an open menu.' }, songMood: 'a restaurant choice settling into a clear order', visualNotes: 'Dining table, menu open to one selected dish, server pencil poised over the order pad.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nipalit-prutas-ganina', title: { de: 'Obst von heute Morgen', en: 'Fruit from this morning' },
    situation: { de: 'Eine Markthändlerin fragt, wann du das Obst gekauft hast. Du antwortest, dass du es heute Morgen gekauft hast.', en: 'A market vendor asks when you bought the fruit. Say that you bought it earlier this morning.' },
    pedagogicalGoal: 'Nipalit mit ganina sa buntag als klar abgeschlossene Handlung verwenden.',
    targetText: 'Nipalit ko og prutas ganina sa buntag.', baseText: { de: 'Ich habe das Obst heute Morgen gekauft.', en: 'I bought fruit earlier this morning.' },
    chunks: [{ targetText: 'Nipalit ko og prutas', baseText: { de: 'Ich habe das Obst gekauft', en: 'I bought fruit' } }, { targetText: 'ganina', baseText: { de: 'vorhin', en: 'earlier' } }, { targetText: 'sa buntag.', baseText: { de: 'heute Morgen.', en: 'this morning.' } }],
    terms: [{ targetText: 'Nipalit', baseText: { de: 'hat gekauft', en: 'bought' } }, { targetText: 'prutas', baseText: { de: 'Obst', en: 'fruit' } }, { targetText: 'ganina', baseText: { de: 'vorhin; heute früher', en: 'earlier today' } }, { targetText: 'sa buntag', baseText: { de: 'am Morgen', en: 'in the morning' } }, { targetText: 'nipalit ko', baseText: { de: 'ich habe gekauft', en: 'I bought' } }],
    recall: { before: 'Nipalit ko og ', answer: 'prutas', after: ' ganina sa buntag.', fallbackChoices: ['prutas', 'pan', 'tambal', 'sinina'] }, speakRequired: ['nipalit', 'prutas', 'ganina'],
    sceneCaption: { de: 'Die Markthändlerin zeigt auf deine Obsttüte und fragt: „Kanus-a ka nipalit og prutas?"', en: 'The market vendor points to your fruit bag and asks: “Kanus-a ka nipalit og prutas?”' },
    trophyWord: { word: 'ganina', meaning: { de: 'vorhin; heute früher', en: 'earlier today' }, example: 'Nipalit ko ganina og prutas.', whyThisWord: { de: 'Diese Zeitangabe ordnet den Einkauf natürlich einem früheren Zeitpunkt desselben Tages zu.', en: 'This time word naturally places the purchase at an earlier point on the same day.' } },
    distractors: ['sa tindahan ugma', 'duha ka mangga'], placeholderCaption: { de: 'Eine gefüllte Obsttüte liegt auf der Waage eines morgendlichen Marktstands.', en: 'A filled fruit bag rests on the scale at a morning market stall.' }, songMood: 'a fresh morning purchase remembered at the market', visualNotes: 'Morning fruit stall, filled bag, soft early light and vendor asking about the purchase.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nakakita-sa-kinahanglan', title: { de: 'Alles gefunden', en: 'Found everything' },
    situation: { de: 'Ein Händler fragt, ob du noch etwas kaufen musst. Du sagst, dass du vorhin alles gefunden hast, was du brauchst.', en: 'A vendor asks whether you still need to buy anything. Say that you found everything you need earlier.' },
    pedagogicalGoal: 'Mit nakakita na den erfolgreichen Abschluss einer Einkaufssuche ausdrücken.',
    targetText: 'Nakakita na ko sa tanan nakong kinahanglan ganina.', baseText: { de: 'Ich habe vorhin alles gefunden, was ich brauche.', en: 'I found everything I need earlier.' },
    chunks: [{ targetText: 'Nakakita na ko', baseText: { de: 'Ich habe gefunden', en: 'I found' } }, { targetText: 'sa tanan nakong kinahanglan', baseText: { de: 'alles, was ich brauche', en: 'everything I need' } }, { targetText: 'ganina.', baseText: { de: 'vorhin.', en: 'earlier.' } }],
    terms: [{ targetText: 'Nakakita', baseText: { de: 'hat gefunden; hat gesehen', en: 'found; saw' } }, { targetText: 'tanan', baseText: { de: 'alles', en: 'everything' } }, { targetText: 'kinahanglan', baseText: { de: 'brauchen; nötig', en: 'need; necessary' } }, { targetText: 'ganina', baseText: { de: 'vorhin', en: 'earlier' } }, { targetText: 'nakong kinahanglan', baseText: { de: 'was ich brauche', en: 'that I need' } }],
    recall: { before: '', answer: 'Nakakita', after: ' na ko sa tanan nakong kinahanglan ganina.', fallbackChoices: ['Nakakita', 'Nibayad', 'Nikaon', 'Niadto'] }, speakRequired: ['nakakita', 'tanan', 'kinahanglan'],
    sceneCaption: { de: 'Der Händler blickt auf deine gefüllten Taschen und fragt: „Naa pa kay paliton?"', en: 'The vendor looks at your full bags and asks: “Naa pa kay paliton?”' },
    trophyWord: { word: 'kinahanglan', meaning: { de: 'brauchen; nötig', en: 'need; necessary' }, example: 'Naa na koy tanan nakong kinahanglan.', whyThisWord: { de: 'Das Wort fasst beim letzten Marktstand genau die Dinge zusammen, wegen denen du unterwegs warst.', en: 'This word gathers together exactly the things that brought you out shopping.' } },
    distractors: ['naa pay kulang', 'mobalik sa tindahan'], placeholderCaption: { de: 'Mehrere gefüllte Einkaufstaschen stehen am letzten Marktstand.', en: 'Several full shopping bags rest at the final market stall.' }, songMood: 'a satisfying errand ending with every item found', visualNotes: 'Market aisle, full reusable bags, final vendor stall and a relieved customer glance.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'natulog-dili-maayo', title: { de: 'Schlecht geschlafen', en: 'Slept badly' },
    situation: { de: 'Beim Frühstück fragt die Hotelmitarbeiterin nach deiner Nacht. Du sagst, dass du schlecht geschlafen hast, heute aber nicht mehr müde bist.', en: 'At breakfast, the hotel staff member asks about your night. Say that you slept badly but are no longer tired today.' },
    pedagogicalGoal: 'Eine abgeschlossene Nacht mit natulog beschreiben und ihr einen aktuellen Zustand gegenüberstellen.',
    targetText: 'Wala ko katulog og maayo, pero dili na ko kapoy karon.', baseText: { de: 'Ich habe nicht gut geschlafen, aber jetzt bin ich nicht mehr müde.', en: 'I did not sleep well, but I am not tired anymore now.' },
    chunks: [{ targetText: 'Wala ko katulog og maayo,', baseText: { de: 'Ich habe nicht gut geschlafen,', en: 'I did not sleep well,' } }, { targetText: 'pero dili na ko', baseText: { de: 'aber ich bin nicht mehr', en: 'but I am no longer' } }, { targetText: 'kapoy karon.', baseText: { de: 'jetzt müde.', en: 'tired now.' } }],
    terms: [{ targetText: 'katulog', baseText: { de: 'schlafen (Form nach wala)', en: 'to get sleep (form after wala)' } }, { targetText: 'dili maayo', baseText: { de: 'nicht gut; schlecht', en: 'not well; badly' } }, { targetText: 'kapoy', baseText: { de: 'müde', en: 'tired' } }, { targetText: 'pero', baseText: { de: 'aber', en: 'but' } }, { targetText: 'karon', baseText: { de: 'heute; jetzt', en: 'today; now' } }],
    recall: { before: 'Wala ko katulog og ', answer: 'maayo', after: ', pero dili na ko kapoy karon.', fallbackChoices: ['maayo', 'dugay', 'sayo', 'kusog'] }, speakRequired: ['katulog', 'kapoy', 'karon'],
    sceneCaption: { de: 'Die Hotelmitarbeiterin schenkt beim Frühstück Kaffee ein und fragt: „Maayo ba imong tulog?"', en: 'The hotel staff member pours coffee at breakfast and asks: “Maayo ba imong tulog?”' },
    trophyWord: { word: 'kapoy', meaning: { de: 'müde', en: 'tired' }, example: 'Dili na ko kapoy human sa pamahaw.', whyThisWord: { de: 'Mit diesem Zustandswort stellst du deinem schlechten Schlaf eine bessere Verfassung am Morgen gegenüber.', en: 'This state word contrasts your poor sleep with feeling better in the morning.' } },
    distractors: ['maayo akong tulog', 'gusto pa ko matulog'], placeholderCaption: { de: 'Eine Kaffeetasse dampft auf dem Frühstückstisch nach einer unruhigen Nacht.', en: 'A coffee cup steams on the breakfast table after a restless night.' }, songMood: 'a slow morning recovering after a rough night', visualNotes: 'Hotel breakfast room, coffee being poured, tired eyes beginning to brighten in morning light.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nikaon-na-og-lechon', title: { de: 'Lechon schon probiert', en: 'Already tried lechon' },
    situation: { de: 'In einem Restaurant fragt die Bedienung, ob du das lokale Lechon schon probiert hast. Du bestätigst, dass du es hier gegessen hast.', en: 'At a restaurant, the server asks whether you have tried the local lechon. Confirm that you have eaten it here.' },
    pedagogicalGoal: 'Mit nikaon na eine abgeschlossene lokale Essenserfahrung ausdrücken.',
    targetText: 'Nikaon na ko og lechon dinhi sa Cebu.', baseText: { de: 'Ich habe hier in Cebu schon Lechon gegessen.', en: 'I have already eaten lechon here in Cebu.' },
    chunks: [{ targetText: 'Nikaon na ko', baseText: { de: 'Ich habe schon gegessen', en: 'I have already eaten' } }, { targetText: 'og lechon', baseText: { de: 'Lechon', en: 'lechon' } }, { targetText: 'dinhi sa Cebu.', baseText: { de: 'hier in Cebu.', en: 'here in Cebu.' } }],
    terms: [{ targetText: 'Nikaon', baseText: { de: 'hat gegessen', en: 'ate' } }, { targetText: 'lechon', baseText: { de: 'Lechon; Spanferkelgericht', en: 'lechon; roast pig dish' } }, { targetText: 'dinhi sa Cebu', baseText: { de: 'hier in Cebu', en: 'here in Cebu' } }, { targetText: 'na', baseText: { de: 'schon; bereits', en: 'already' } }, { targetText: 'nikaon ko', baseText: { de: 'ich habe gegessen', en: 'I ate' } }],
    recall: { before: 'Nikaon na ko og ', answer: 'lechon', after: ' dinhi sa Cebu.', fallbackChoices: ['lechon', 'sabaw', 'pan', 'prutas'] }, speakRequired: ['nikaon', 'lechon', 'cebu'],
    sceneCaption: { de: 'Die Bedienung zeigt auf die lokale Spezialität und fragt: „Nakatilaw na ka og lechon?"', en: 'The server points to the local specialty and asks: “Nakatilaw na ka og lechon?”' },
    trophyWord: { word: 'lechon', meaning: { de: 'Lechon; Spanferkelgericht', en: 'lechon; roast pig dish' }, example: 'Nikaon mi og lechon sa pista.', whyThisWord: { de: 'Das Gericht macht deine abgeschlossene Erfahrung konkret und eindeutig mit Cebu verbunden.', en: 'This dish makes your completed experience concrete and unmistakably connected to Cebu.' } },
    distractors: ['wala pa ko gutom', 'gusto ko og sabaw'], placeholderCaption: { de: 'Eine Portion Lechon steht als lokale Spezialität auf dem Restauranttisch.', en: 'A serving of lechon sits on the restaurant table as the local specialty.' }, songMood: 'a lively local food memory shared at the table', visualNotes: 'Cebu restaurant, lechon platter, server pointing proudly, customer recognizing the dish.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'wala-pa-makakita-simbahan', title: { de: 'Die alte Kirche noch nicht gesehen', en: 'Not seen the old church yet' },
    situation: { de: 'Am Informationsschalter fragt ein Mitarbeiter nach der alten Kirche. Du sagst, dass du sie noch nicht gesehen hast.', en: 'At the information desk, a staff member asks about the old church. Say that you have not seen it yet.' },
    pedagogicalGoal: 'Eine noch nicht abgeschlossene Erfahrung mit wala pa und makakita ausdrücken.',
    targetText: 'Wala pa ko makakita sa karaang simbahan.', baseText: { de: 'Ich habe die alte Kirche noch nicht gesehen.', en: 'I have not seen the old church yet.' },
    chunks: [{ targetText: 'Wala pa ko', baseText: { de: 'Ich habe noch nicht', en: 'I have not yet' } }, { targetText: 'makakita', baseText: { de: 'gesehen', en: 'seen' } }, { targetText: 'sa karaang simbahan.', baseText: { de: 'die alte Kirche.', en: 'the old church.' } }],
    terms: [{ targetText: 'Wala pa', baseText: { de: 'noch nicht', en: 'not yet' } }, { targetText: 'makakita', baseText: { de: 'sehen; zu Gesicht bekommen', en: 'see; get to see' } }, { targetText: 'karaang', baseText: { de: 'alt', en: 'old' } }, { targetText: 'simbahan', baseText: { de: 'Kirche', en: 'church' } }, { targetText: 'karaang simbahan', baseText: { de: 'alte Kirche', en: 'old church' } }],
    recall: { before: 'Wala pa ko ', answer: 'makakita', after: ' sa karaang simbahan.', fallbackChoices: ['makakita', 'mopalit', 'moinom', 'mobalik'] }, speakRequired: ['wala', 'makakita', 'simbahan'],
    sceneCaption: { de: 'Der Mitarbeiter markiert eine Sehenswürdigkeit auf dem Plan und fragt: „Nakita na nimo ang karaang simbahan?"', en: 'The staff member marks a sight on the map and asks: “Nakita na nimo ang karaang simbahan?”' },
    trophyWord: { word: 'simbahan', meaning: { de: 'Kirche', en: 'church' }, example: 'Duol sa plasa ang karaang simbahan.', whyThisWord: { de: 'Das konkrete Sehenswürdigkeitswort macht deutlich, welche Erfahrung auf deiner Liste noch fehlt.', en: 'This specific sight word makes clear which experience is still missing from your list.' } },
    distractors: ['nakakita na ko', 'niadto ko gahapon'], placeholderCaption: { de: 'Eine alte Kirche ist auf einem gefalteten Stadtplan deutlich markiert.', en: 'An old church is clearly marked on a folded city map.' }, songMood: 'an unfinished city discovery waiting on the map', visualNotes: 'Tourism desk, folded map, old church icon circled, customer looking toward the suggested route.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'niadto-sa-museyo', title: { de: 'Gestern im Museum', en: 'At the museum yesterday' },
    situation: { de: 'Am Besucherschalter fragt die Mitarbeiterin nach deinem Museumsausflug. Du sagst, dass du gestern Nachmittag dort warst.', en: 'At the visitor desk, the clerk asks about your museum trip. Say that you went there yesterday afternoon.' },
    pedagogicalGoal: 'Einen abgeschlossenen Besuch mit niadto und einer vergangenen Zeitangabe erzählen.',
    targetText: 'Niadto ko sa museyo gahapon sa hapon.', baseText: { de: 'Ich bin gestern Nachmittag ins Museum gegangen.', en: 'I went to the museum yesterday afternoon.' },
    chunks: [{ targetText: 'Niadto ko sa museyo', baseText: { de: 'Ich bin ins Museum gegangen', en: 'I went to the museum' } }, { targetText: 'gahapon', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'sa hapon.', baseText: { de: 'am Nachmittag.', en: 'in the afternoon.' } }],
    terms: [{ targetText: 'Niadto', baseText: { de: 'ist hingegangen', en: 'went' } }, { targetText: 'museyo', baseText: { de: 'Museum', en: 'museum' } }, { targetText: 'gahapon', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'sa hapon', baseText: { de: 'am Nachmittag', en: 'in the afternoon' } }, { targetText: 'niadto ko', baseText: { de: 'ich bin hingegangen', en: 'I went' } }],
    recall: { before: 'Niadto ko sa ', answer: 'museyo', after: ' gahapon sa hapon.', fallbackChoices: ['museyo', 'merkado', 'hotel', 'botika'] }, speakRequired: ['niadto', 'museyo', 'gahapon'],
    sceneCaption: { de: 'Die Mitarbeiterin zeigt auf das Museumsfoto und fragt: „Kanus-a ka niadto sa museyo?"', en: 'The clerk points to the museum photo and asks: “Kanus-a ka niadto sa museyo?”' },
    trophyWord: { word: 'museyo', meaning: { de: 'Museum', en: 'museum' }, example: 'Nindot ang museyo sa siyudad.', whyThisWord: { de: 'Der Ort gibt deiner Erzählung vom gestrigen Ausflug ein klares und einprägsames Ziel.', en: 'The place gives your story about yesterday’s outing a clear, memorable destination.' } },
    distractors: ['moadto ko ugma', 'sa parke karon'], placeholderCaption: { de: 'Ein Museumsfoto und ein Besuchsplan liegen auf dem Informationsschalter.', en: 'A museum photo and visitor map lie on the information counter.' }, songMood: 'a thoughtful afternoon memory from the city museum', visualNotes: 'Visitor desk, museum brochure, afternoon photo and customer recalling the previous day.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nakahuman-daghang-buluhaton', title: { de: 'Viele Erledigungen geschafft', en: 'Completed many errands' },
    situation: { de: 'Die Markthändlerin, die dich inzwischen kennt, fragt nach deiner Woche. Du sagst, dass du diese Woche schon viel erledigt hast.', en: 'The market vendor who now knows you asks about your week. Say that you have completed a lot this week.' },
    pedagogicalGoal: 'Mehrere abgeschlossene Erledigungen mit nakahuman na zusammenfassen.',
    targetText: 'Nakahuman na ko og daghang buluhaton karong semanaha.', baseText: { de: 'Ich habe diese Woche schon viele Erledigungen abgeschlossen.', en: 'I have already completed many errands this week.' },
    chunks: [{ targetText: 'Nakahuman na ko', baseText: { de: 'Ich habe schon abgeschlossen', en: 'I have already completed' } }, { targetText: 'og daghang buluhaton', baseText: { de: 'viele Erledigungen', en: 'many errands' } }, { targetText: 'karong semanaha.', baseText: { de: 'diese Woche.', en: 'this week.' } }],
    terms: [{ targetText: 'Nakahuman', baseText: { de: 'hat geschafft; hat abgeschlossen', en: 'managed to finish; completed' } }, { targetText: 'daghang', baseText: { de: 'viele', en: 'many' } }, { targetText: 'buluhaton', baseText: { de: 'Erledigung; Aufgabe', en: 'errand; task' } }, { targetText: 'karong semanaha', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: 'nakahuman na ko', baseText: { de: 'ich habe schon abgeschlossen', en: 'I have already completed' } }],
    recall: { before: 'Nakahuman na ko og daghang ', answer: 'buluhaton', after: ' karong semanaha.', fallbackChoices: ['buluhaton', 'pagkaon', 'sinina', 'tambal'] }, speakRequired: ['nakahuman', 'daghang', 'buluhaton'],
    sceneCaption: { de: 'Die vertraute Markthändlerin lächelt über ihre Auslage und fragt: „Kumusta imong semana dinhi?"', en: 'The familiar market vendor smiles across her stall and asks: “Kumusta imong semana dinhi?”' },
    trophyWord: { word: 'buluhaton', meaning: { de: 'Erledigung; Aufgabe', en: 'errand; task' }, example: 'Daghan akong buluhaton karong semanaha.', whyThisWord: { de: 'Das Wort bündelt am Ende des Pfads deine vielen einzelnen Wege und Aufgaben dieser Woche.', en: 'This word gathers your many separate trips and tasks from the week at the end of the path.' } },
    distractors: ['gamay pa akong nahimo', 'daghan pa ang paliton'], placeholderCaption: { de: 'Gefüllte Taschen und eine abgehakte Einkaufsliste liegen am vertrauten Marktstand.', en: 'Full bags and a checked-off shopping list rest at the familiar market stall.' }, songMood: 'a proud weekly recap at a now familiar market stall', visualNotes: 'Regular vendor, checked list, full bags, warm recognition after a productive week.',
  }),
]

export const CEBUANO_A2_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_THREE_METADATA, cebuanoA2Practical3Inputs,
  { de: 'Du hast Cebuano A2 Praxis 3 abgeschlossen und kannst über kürzlich abgeschlossene Alltagserlebnisse sprechen.', en: 'You have completed Cebuano A2 Practical 3 and can talk about recently completed everyday experiences.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_FOUR_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-4', title: 'Cebuano A2 Praxis 4', shortTitle: 'A2 Praxis 4',
  subtitle: { de: 'Pläne machen, Zeiten vorschlagen und Treffen verschieben', en: 'Making plans, suggesting times, and rescheduling meetups' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical4Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'magkita-ugma-alas-tres', title: { de: 'Kaffee morgen', en: 'Coffee tomorrow' },
    situation: { de: 'Dein Freund lädt dich morgen auf einen Kaffee ein. Du sagst zu und schlägst drei Uhr vor.', en: 'Your friend invites you for coffee tomorrow. Accept and suggest three o’clock.' },
    pedagogicalGoal: 'Mit magkita und ugma ein Treffen annehmen und eine konkrete Uhrzeit vorschlagen.',
    targetText: 'Sige, magkita ta ugma sa alas tres?', baseText: { de: 'Gerne, wollen wir uns morgen um drei Uhr treffen?', en: 'Sure, shall we meet tomorrow at three?' },
    chunks: [{ targetText: 'Sige,', baseText: { de: 'Gerne,', en: 'Sure,' } }, { targetText: 'magkita ta ugma', baseText: { de: 'wollen wir uns morgen treffen', en: 'shall we meet tomorrow' } }, { targetText: 'sa alas tres?', baseText: { de: 'um drei Uhr?', en: 'at three?' } }],
    terms: [{ targetText: 'Sige', baseText: { de: 'gerne; einverstanden', en: 'sure; all right' } }, { targetText: 'magkita', baseText: { de: 'sich treffen', en: 'meet each other' } }, { targetText: 'ugma', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'alas tres', baseText: { de: 'um drei Uhr', en: 'at three o’clock' } }, { targetText: 'magkita ta', baseText: { de: 'treffen wir uns', en: 'let us meet' } }],
    recall: { before: 'Sige, magkita ta ugma sa ', answer: 'alas tres', after: '?', fallbackChoices: ['alas tres', 'alas dos', 'alas singko', 'alas otso'] }, speakRequired: ['sige', 'magkita', 'ugma'],
    sceneCaption: { de: 'Dein Freund hebt seine Kaffeetasse und fragt: „Kape ta ugma?"', en: 'Your friend lifts his coffee cup and asks: “Kape ta ugma?”' },
    trophyWord: { word: 'magkita', meaning: { de: 'sich treffen', en: 'meet each other' }, example: 'Magkita ta ugma sa kapihan.', whyThisWord: { de: 'Mit diesem Verb wird aus der lockeren Einladung sofort ein gemeinsamer Plan.', en: 'This verb turns the casual invitation into a shared plan right away.' } },
    distractors: ['karon sa buntag', 'sa merkado unya'], placeholderCaption: { de: 'Zwei Freunde planen bei einer Kaffeetasse ihr nächstes Treffen.', en: 'Two friends plan their next meetup over a cup of coffee.' }, songMood: 'a cheerful coffee plan taking shape between friends', visualNotes: 'Neighborhood cafe, two friends, one phone calendar open beside a warm coffee cup.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'motan-aw-bag-ong-eksibit', title: { de: 'Morgen ins Museum', en: 'The museum tomorrow' },
    situation: { de: 'Dein Freund fragt nach deinem Plan für morgen. Du erzählst von der neuen Ausstellung im Museum.', en: 'Your friend asks about your plan for tomorrow. Tell them about the new exhibition at the museum.' },
    pedagogicalGoal: 'Mit motan-aw und ugma eine konkrete Absicht für den nächsten Tag ausdrücken.',
    targetText: 'Ugma motan-aw ko sa bag-ong eksibit sa museyo.', baseText: { de: 'Morgen werde ich mir die neue Ausstellung im Museum ansehen.', en: 'Tomorrow I will see the new exhibition at the museum.' },
    chunks: [{ targetText: 'Ugma motan-aw ko', baseText: { de: 'Morgen werde ich mir ansehen', en: 'Tomorrow I will see' } }, { targetText: 'sa bag-ong eksibit', baseText: { de: 'die neue Ausstellung', en: 'the new exhibition' } }, { targetText: 'sa museyo.', baseText: { de: 'im Museum.', en: 'at the museum.' } }],
    terms: [{ targetText: 'motan-aw', baseText: { de: 'ansehen werden', en: 'will watch; will see' } }, { targetText: 'bag-ong', baseText: { de: 'neu', en: 'new' } }, { targetText: 'eksibit', baseText: { de: 'Ausstellung', en: 'exhibition' } }, { targetText: 'museyo', baseText: { de: 'Museum', en: 'museum' } }, { targetText: 'Ugma', baseText: { de: 'morgen', en: 'tomorrow' } }],
    recall: { before: 'Ugma motan-aw ko sa bag-ong ', answer: 'eksibit', after: ' sa museyo.', fallbackChoices: ['eksibit', 'salida', 'konsiyerto', 'baligya'] }, speakRequired: ['ugma', 'eksibit', 'museyo'],
    sceneCaption: { de: 'Dein Freund klappt seinen Stadtplan auf und fragt: „Unsa imong plano ugma?"', en: 'Your friend opens a city map and asks: “Unsa imong plano ugma?”' },
    trophyWord: { word: 'eksibit', meaning: { de: 'Ausstellung', en: 'exhibition' }, example: 'Bag-o ang eksibit sa museyo.', whyThisWord: { de: 'Das Wort benennt genau den neuen Teil des Museums, den du morgen besuchen möchtest.', en: 'This word names the exact new part of the museum you intend to visit tomorrow.' } },
    distractors: ['sa daang simbahan', 'karong hapon'], placeholderCaption: { de: 'Ein Plakat für eine neue Ausstellung hängt am Eingang des Stadtmuseums.', en: 'A poster for a new exhibition hangs at the entrance to the city museum.' }, songMood: 'a curious tomorrow plan sparked by a museum poster', visualNotes: 'Museum entrance, colorful exhibition poster, folded map and an eager visitor pointing ahead.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sine-karong-biyernes', title: { de: 'Freitag ins Kino', en: 'Cinema on Friday' },
    situation: { de: 'Dein Freund möchte am Freitag ausgehen. Du schlägst gemeinsam einen Kinobesuch vor.', en: 'Your friend wants to go out on Friday. Suggest going to the cinema together.' },
    pedagogicalGoal: 'Mit motan-aw ta und einer Wochentagsangabe einen lockeren gemeinsamen Plan vorschlagen.',
    targetText: 'Motan-aw ta og sine karong Biyernes, uy?', baseText: { de: 'Wollen wir diesen Freitag einen Film ansehen?', en: 'Shall we watch a film this Friday?' },
    chunks: [{ targetText: 'Motan-aw ta', baseText: { de: 'Wollen wir ansehen', en: 'Shall we watch' } }, { targetText: 'og sine', baseText: { de: 'einen Film', en: 'a film' } }, { targetText: 'karong Biyernes, uy?', baseText: { de: 'diesen Freitag?', en: 'this Friday?' } }],
    terms: [{ targetText: 'Motan-aw', baseText: { de: 'ansehen werden', en: 'will watch' } }, { targetText: 'sine', baseText: { de: 'Kino; Film', en: 'cinema; film' } }, { targetText: 'karong Biyernes', baseText: { de: 'diesen Freitag', en: 'this Friday' } }, { targetText: 'uy', baseText: { de: 'freundliche Anredepartikel', en: 'friendly attention particle' } }, { targetText: 'motan-aw ta', baseText: { de: 'sehen wir uns an', en: 'let us watch' } }],
    recall: { before: 'Motan-aw ta og ', answer: 'sine', after: ' karong Biyernes, uy?', fallbackChoices: ['sine', 'balita', 'dula', 'eksibit'] }, speakRequired: ['sine', 'karong', 'biyernes'],
    sceneCaption: { de: 'Dein Freund zeigt auf die Freizeitangebote und fragt: „Ganahan ka mogawas karong Biyernes?"', en: 'Your friend points to the entertainment listings and asks: “Ganahan ka mogawas karong Biyernes?”' },
    trophyWord: { word: 'sine', meaning: { de: 'Kino; Film', en: 'cinema; film' }, example: 'Nindot ang sine karong Biyernes.', whyThisWord: { de: 'Das Wort macht aus dem allgemeinen Wunsch auszugehen einen klaren gemeinsamen Vorschlag.', en: 'This word turns the general wish to go out into a clear shared suggestion.' } },
    distractors: ['sa balay lang', 'ugma sa buntag'], placeholderCaption: { de: 'Zwei Freunde betrachten ein Kinoprogramm für Freitagabend.', en: 'Two friends look over a cinema listing for Friday evening.' }, songMood: 'a playful Friday movie plan between close friends', visualNotes: 'Cinema listings, Friday highlighted, two friends comparing film posters under marquee lights.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'plasa-alas-otso', title: { de: 'Um acht auf dem Platz', en: 'At the plaza at eight' },
    situation: { de: 'Dein Freund fragt nach Ort und Zeit für euer Treffen. Du bestätigst den Platz und acht Uhr heute Abend.', en: 'Your friend asks where and when to meet. Confirm the plaza and eight o’clock tonight.' },
    pedagogicalGoal: 'Einen vereinbarten Treffpunkt mit einer genauen Uhrzeit und karong gabii festlegen.',
    targetText: 'Sige, magkita ta sa plasa alas otso karong gabii.', baseText: { de: 'Gut, wir treffen uns heute Abend um acht auf dem Platz.', en: 'All right, we will meet at the plaza at eight tonight.' },
    chunks: [{ targetText: 'Sige, magkita ta', baseText: { de: 'Gut, wir treffen uns', en: 'All right, we will meet' } }, { targetText: 'sa plasa alas otso', baseText: { de: 'um acht auf dem Platz', en: 'at the plaza at eight' } }, { targetText: 'karong gabii.', baseText: { de: 'heute Abend.', en: 'tonight.' } }],
    terms: [{ targetText: 'plasa', baseText: { de: 'Platz', en: 'plaza; square' } }, { targetText: 'alas otso', baseText: { de: 'um acht Uhr', en: 'at eight o’clock' } }, { targetText: 'karong gabii', baseText: { de: 'heute Abend', en: 'tonight' } }, { targetText: 'magkita ta', baseText: { de: 'wir treffen uns', en: 'we will meet' } }, { targetText: 'Sige', baseText: { de: 'gut; einverstanden', en: 'all right' } }],
    recall: { before: 'Sige, magkita ta sa ', answer: 'plasa', after: ' alas otso karong gabii.', fallbackChoices: ['plasa', 'hotel', 'museyo', 'merkado'] }, speakRequired: ['magkita', 'plasa', 'otso'],
    sceneCaption: { de: 'Dein Freund öffnet den Kalender und fragt: „Unsa orasa ug asa ta magkita?"', en: 'Your friend opens the calendar and asks: “Unsa orasa ug asa ta magkita?”' },
    trophyWord: { word: 'plasa', meaning: { de: 'Platz', en: 'plaza; square' }, example: 'Magkita ta sa plasa alas otso.', whyThisWord: { de: 'Der bekannte öffentliche Ort gibt eurem Abendplan einen eindeutigen Treffpunkt.', en: 'The familiar public place gives your evening plan an unambiguous meeting point.' } },
    distractors: ['sa kapihan alas tres', 'ugma sa museyo'], placeholderCaption: { de: 'Ein beleuchteter Stadtplatz ist auf einem Handyplan als Treffpunkt markiert.', en: 'A lit city plaza is marked as the meeting point on a phone map.' }, songMood: 'an evening meetup fixed beneath the plaza lights', visualNotes: 'City plaza at dusk, clock showing eight, phone map pin and friends confirming the location.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sabado-na-lang', title: { de: 'Lieber am Samstag', en: 'Saturday instead' },
    situation: { de: 'Dein Freund kann am Freitag nicht. Du schlägst vor, euer Treffen auf Samstag zu verschieben.', en: 'Your friend cannot make Friday. Suggest moving your meetup to Saturday.' },
    pedagogicalGoal: 'Mit Pwede ba und na lang eine einfache Terminänderung vorschlagen.',
    targetText: 'Pwede ba sa Sabado na lang ta magkita?', baseText: { de: 'Können wir uns stattdessen am Samstag treffen?', en: 'Could we meet on Saturday instead?' },
    chunks: [{ targetText: 'Pwede ba', baseText: { de: 'Können wir', en: 'Could we' } }, { targetText: 'sa Sabado na lang', baseText: { de: 'stattdessen am Samstag', en: 'on Saturday instead' } }, { targetText: 'ta magkita?', baseText: { de: 'uns treffen?', en: 'meet?' } }],
    terms: [{ targetText: 'Pwede ba', baseText: { de: 'ist es möglich; können wir', en: 'is it possible; could we' } }, { targetText: 'Sabado', baseText: { de: 'Samstag', en: 'Saturday' } }, { targetText: 'na lang', baseText: { de: 'stattdessen; lieber', en: 'instead' } }, { targetText: 'magkita', baseText: { de: 'sich treffen', en: 'meet each other' } }, { targetText: 'sa Sabado', baseText: { de: 'am Samstag', en: 'on Saturday' } }],
    recall: { before: 'Pwede ba sa ', answer: 'Sabado', after: ' na lang ta magkita?', fallbackChoices: ['Sabado', 'Domingo', 'Lunes', 'Biyernes'] }, speakRequired: ['pwede', 'sabado', 'magkita'],
    sceneCaption: { de: 'Dein Freund schüttelt beim Blick auf Freitag den Kopf und sagt: „Dili ko kalugar sa Biyernes."', en: 'Your friend shakes their head while looking at Friday and says: “Dili ko kalugar sa Biyernes.”' },
    trophyWord: { word: 'sabado', meaning: { de: 'Samstag', en: 'Saturday' }, example: 'Sa Sabado na lang ta magkita.', whyThisWord: { de: 'Der Wochentag gibt dem verschobenen Treffen sofort einen neuen festen Platz im Kalender.', en: 'This weekday immediately gives the rescheduled meetup a new fixed place in the calendar.' } },
    distractors: ['sa Biyernes gihapon', 'karong gabii dayon'], placeholderCaption: { de: 'Ein Kalender zeigt den gestrichenen Freitag und den markierten Samstag.', en: 'A calendar shows Friday crossed out and Saturday highlighted.' }, songMood: 'a relaxed plan sliding neatly to Saturday', visualNotes: 'Phone calendar, Friday unavailable, Saturday circled, two friends settling on the new day.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'naa-koy-trabaho', title: { de: 'Wegen der Arbeit absagen', en: 'Canceling because of work' },
    situation: { de: 'Dein Freund fragt, ob euer Plan für heute noch gilt. Du sagst höflich ab, weil du später arbeiten musst.', en: 'Your friend asks whether today’s plan is still on. Decline politely because you have work later.' },
    pedagogicalGoal: 'Mit Dili ko kaya und einer kay-Begründung eine Verabredung freundlich absagen.',
    targetText: 'Dili ko kaya karon, kay naa koy trabaho unya.', baseText: { de: 'Heute schaffe ich es nicht, weil ich später arbeiten muss.', en: 'I cannot make it today because I have work later.' },
    chunks: [{ targetText: 'Dili ko kaya karon,', baseText: { de: 'Heute schaffe ich es nicht,', en: 'I cannot make it today,' } }, { targetText: 'kay naa koy trabaho', baseText: { de: 'weil ich arbeiten muss', en: 'because I have work' } }, { targetText: 'unya.', baseText: { de: 'später.', en: 'later.' } }],
    terms: [{ targetText: 'Dili ko kaya', baseText: { de: 'ich schaffe es nicht', en: 'I cannot make it' } }, { targetText: 'trabaho', baseText: { de: 'Arbeit', en: 'work' } }, { targetText: 'unya', baseText: { de: 'später', en: 'later' } }, { targetText: 'karon', baseText: { de: 'heute; jetzt', en: 'today; now' } }, { targetText: 'kay', baseText: { de: 'weil', en: 'because' } }],
    recall: { before: 'Dili ko kaya karon, kay naa koy ', answer: 'trabaho', after: ' unya.', fallbackChoices: ['trabaho', 'klase', 'bisita', 'reserbasyon'] }, speakRequired: ['dili', 'kaya', 'trabaho'],
    sceneCaption: { de: 'Dein Freund zeigt auf euren heutigen Kalendereintrag und fragt: „Madayon ta karong hapon?“', en: 'Your friend points to today’s calendar entry and asks: “Madayon ta karong hapon?”' },
    trophyWord: { word: 'trabaho', meaning: { de: 'Arbeit', en: 'work' }, example: 'Naa koy trabaho unya sa hapon.', whyThisWord: { de: 'Der konkrete Grund lässt deine Absage ehrlich und freundlich statt abweisend klingen.', en: 'The concrete reason makes your cancellation sound honest and friendly rather than dismissive.' } },
    distractors: ['sige karong hapon', 'magkita ta dayon'], placeholderCaption: { de: 'Ein Arbeitstermin überschneidet sich auf dem Handykalender mit einer Verabredung.', en: 'A work appointment overlaps with a meetup on a phone calendar.' }, songMood: 'a gentle cancellation handled honestly between friends', visualNotes: 'Two calendar blocks overlapping, friend waiting for an answer, work bag ready by the door.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'manihapon-karong-gabii', title: { de: 'Einladung zum Abendessen', en: 'Dinner invitation' },
    situation: { de: 'Dein Freund fragt, ob du heute Abend frei bist. Du schlägst ein gemeinsames Abendessen vor und lädst ihn ein.', en: 'Your friend asks whether you are free tonight. Suggest dinner together and offer to pay.' },
    pedagogicalGoal: 'Mit manihapon ta und mobayad eine Einladung für heute Abend aussprechen.',
    targetText: 'Manihapon ta karong gabii; ako ang mobayad.', baseText: { de: 'Lass uns heute Abend zusammen essen; ich bezahle.', en: 'Let us have dinner tonight; I will pay.' },
    chunks: [{ targetText: 'Manihapon ta karong gabii;', baseText: { de: 'Lass uns heute Abend zusammen essen;', en: 'Let us have dinner tonight;' } }, { targetText: 'ako ang', baseText: { de: 'ich werde', en: 'I will' } }, { targetText: 'mobayad.', baseText: { de: 'bezahlen.', en: 'pay.' } }],
    terms: [{ targetText: 'Manihapon', baseText: { de: 'zu Abend essen', en: 'have dinner' } }, { targetText: 'karong gabii', baseText: { de: 'heute Abend', en: 'tonight' } }, { targetText: 'mobayad', baseText: { de: 'bezahlen werden', en: 'will pay' } }, { targetText: 'ako ang mobayad', baseText: { de: 'ich bezahle', en: 'I will pay' } }, { targetText: 'manihapon ta', baseText: { de: 'lass uns zu Abend essen', en: 'let us have dinner' } }],
    recall: { before: '', answer: 'Manihapon', after: ' ta karong gabii; ako ang mobayad.', fallbackChoices: ['Manihapon', 'Magpamahaw', 'Maglakaw', 'Magpabilin'] }, speakRequired: ['manihapon', 'gabii', 'mobayad'],
    sceneCaption: { de: 'Dein Freund schließt am Abend seinen Laptop und fragt: „Libre ka karong gabii?"', en: 'Your friend closes their laptop in the evening and asks: “Libre ka karong gabii?”' },
    trophyWord: { word: 'manihapon', meaning: { de: 'zu Abend essen', en: 'have dinner' }, example: 'Manihapon ta sa gamay nga karinderya.', whyThisWord: { de: 'Das Verb verwandelt die freie Zeit am Abend in eine warme, konkrete Einladung.', en: 'This verb turns free time in the evening into a warm, concrete invitation.' } },
    distractors: ['kape sa buntag', 'ikaw ang mobayad'], placeholderCaption: { de: 'Zwei Freunde stehen am Abend vor einer kleinen, hellen Karinderya.', en: 'Two friends stand outside a small, brightly lit carinderia in the evening.' }, songMood: 'a generous dinner invitation under warm evening lights', visualNotes: 'Small carinderia at night, two friends approaching, one gesturing toward the table and the bill.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'naulahi-gamay', title: { de: 'Ein paar Minuten später', en: 'A few minutes late' },
    situation: { de: 'Dein Freund wartet am Treffpunkt und fragt, wo du bist. Du sagst, dass du etwas spät dran bist und später ankommst.', en: 'Your friend is waiting at the meeting point and asks where you are. Say that you are a little late and will arrive later.' },
    pedagogicalGoal: 'Die bekannte Form naulahi kurz wiederholen und mit moabot plus unya die spätere Ankunft ankündigen.',
    targetText: 'Naulahi ko gamay, pero moabot ko unya.', baseText: { de: 'Ich bin etwas spät dran, aber ich komme später an.', en: 'I am a little late, but I will arrive later.' },
    chunks: [{ targetText: 'Naulahi ko gamay,', baseText: { de: 'Ich bin etwas spät dran,', en: 'I am a little late,' } }, { targetText: 'pero moabot ko', baseText: { de: 'aber ich komme an', en: 'but I will arrive' } }, { targetText: 'unya.', baseText: { de: 'später.', en: 'later.' } }],
    terms: [{ targetText: 'Naulahi', baseText: { de: 'hat sich verspätet; ist spät dran', en: 'was delayed; is late' } }, { targetText: 'gamay', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'moabot', baseText: { de: 'ankommen werden', en: 'will arrive' } }, { targetText: 'unya', baseText: { de: 'später', en: 'later' } }, { targetText: 'pero', baseText: { de: 'aber', en: 'but' } }],
    recall: { before: 'Naulahi ko ', answer: 'gamay', after: ', pero moabot ko unya.', fallbackChoices: ['gamay', 'kaayo', 'usab', 'karon'] }, speakRequired: ['naulahi', 'gamay', 'moabot'],
    sceneCaption: { de: 'Dein Freund wartet unter der Uhr auf dem Platz und fragt am Telefon: „Asa na ka?"', en: 'Your friend waits beneath the plaza clock and asks on the phone: “Asa na ka?”' },
    trophyWord: { word: 'gamay', meaning: { de: 'ein wenig; klein', en: 'a little; small' }, example: 'Gamay ra ang akong kalangan.', whyThisWord: { de: 'Das Wort begrenzt die Verspätung und beruhigt deinen wartenden Freund.', en: 'This word limits the delay and reassures your waiting friend.' } },
    distractors: ['naa na ko dinhi', 'dili ko moabot'], placeholderCaption: { de: 'Ein Freund wartet unter einer großen Uhr und hält sein Handy ans Ohr.', en: 'A friend waits beneath a large clock with a phone held to their ear.' }, songMood: 'a small delay softened by a reassuring message', visualNotes: 'Plaza clock, waiting friend, incoming phone call and the learner hurrying along a nearby street.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sabado-sa-plasa-ha', title: { de: 'Den neuen Plan bestätigen', en: 'Confirming the new plan' },
    situation: { de: 'Dein Freund fragt, ob es beim Freitag bleibt. Du wiederholst den geänderten Termin und Ort zur Bestätigung.', en: 'Your friend asks whether Friday is still the plan. Repeat the changed day and place to confirm.' },
    pedagogicalGoal: 'Einen geänderten Plan mit magkita und der freundlichen Rückfrage ha absichern.',
    targetText: 'Sa Sabado ta magkita sa plasa, ha?', baseText: { de: 'Wir treffen uns am Samstag auf dem Platz, ja?', en: 'We will meet at the plaza on Saturday, right?' },
    chunks: [{ targetText: 'Sa Sabado', baseText: { de: 'Am Samstag', en: 'On Saturday' } }, { targetText: 'ta magkita sa plasa,', baseText: { de: 'treffen wir uns auf dem Platz,', en: 'we will meet at the plaza,' } }, { targetText: 'ha?', baseText: { de: 'ja?', en: 'right?' } }],
    terms: [{ targetText: 'Sa Sabado', baseText: { de: 'am Samstag', en: 'on Saturday' } }, { targetText: 'magkita', baseText: { de: 'sich treffen', en: 'meet each other' } }, { targetText: 'plasa', baseText: { de: 'Platz', en: 'plaza; square' } }, { targetText: 'ha', baseText: { de: 'ja; nicht wahr', en: 'right; okay' } }, { targetText: 'ta magkita', baseText: { de: 'wir treffen uns', en: 'we will meet' } }],
    recall: { before: 'Sa Sabado ta magkita sa ', answer: 'plasa', after: ', ha?', fallbackChoices: ['plasa', 'kapihan', 'hotel', 'museyo'] }, speakRequired: ['sabado', 'magkita', 'plasa'],
    sceneCaption: { de: 'Dein Freund zeigt auf den alten Kalendereintrag und fragt: „Biyernes gihapon ta?"', en: 'Your friend points to the old calendar entry and asks: “Biyernes gihapon ta?”' },
    trophyWord: { word: 'ha', meaning: { de: 'ja; nicht wahr', en: 'right; okay' }, example: 'Sa alas otso ta, ha?', whyThisWord: { de: 'Die kleine Rückfrage holt eine letzte freundliche Bestätigung für den geänderten Plan ein.', en: 'This small tag invites one final friendly confirmation of the changed plan.' } },
    distractors: ['sa Biyernes sa sine', 'ugma alas tres'], placeholderCaption: { de: 'Ein alter und ein neuer Treffpunkt stehen nebeneinander in einem Handykalender.', en: 'An old and a new meetup entry sit side by side in a phone calendar.' }, songMood: 'a changed plan clicking into place with one friendly check', visualNotes: 'Phone calendar, Friday crossed out, Saturday plaza entry highlighted and a confirming message bubble.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'baybayon-sunod-semana', title: { de: 'Nächste Woche ans Meer', en: 'The beach next week' },
    situation: { de: 'Dein Freund fragt nach eurem Plan für nächste Woche. Du erinnerst dich und nennst euren kurzen Ausflug ans Meer.', en: 'Your friend asks about your plan for next week. Remember and name your short trip to the beach.' },
    pedagogicalGoal: 'Mit moadto und sunod semana einen gemeinsamen Plan für die nächste Woche ausdrücken.',
    targetText: 'Bitaw, moadto ta sa baybayon sunod semana.', baseText: { de: 'Stimmt, wir fahren nächste Woche ans Meer.', en: 'Right, we will go to the beach next week.' },
    chunks: [{ targetText: 'Bitaw,', baseText: { de: 'Stimmt,', en: 'Right,' } }, { targetText: 'moadto ta sa baybayon', baseText: { de: 'wir fahren ans Meer', en: 'we will go to the beach' } }, { targetText: 'sunod semana.', baseText: { de: 'nächste Woche.', en: 'next week.' } }],
    terms: [{ targetText: 'Bitaw', baseText: { de: 'stimmt; tatsächlich', en: 'right; indeed' } }, { targetText: 'moadto', baseText: { de: 'hingehen; hinfahren werden', en: 'will go' } }, { targetText: 'baybayon', baseText: { de: 'Strand; Küste', en: 'beach; coast' } }, { targetText: 'sunod semana', baseText: { de: 'nächste Woche', en: 'next week' } }, { targetText: 'moadto ta', baseText: { de: 'wir werden hinfahren', en: 'we will go' } }],
    recall: { before: 'Bitaw, moadto ta sa ', answer: 'baybayon', after: ' sunod semana.', fallbackChoices: ['baybayon', 'bukid', 'museyo', 'merkado'] }, speakRequired: ['bitaw', 'moadto', 'baybayon'],
    sceneCaption: { de: 'Dein Freund scrollt durch eure Nachrichten und fragt: „Unsa atong plano sunod semana?"', en: 'Your friend scrolls through your messages and asks: “Unsa atong plano sunod semana?”' },
    trophyWord: { word: 'baybayon', meaning: { de: 'Strand; Küste', en: 'beach; coast' }, example: 'Moadto mi sa baybayon sunod semana.', whyThisWord: { de: 'Der Zielort macht aus dem vagen Wochenplan einen konkreten kleinen Ausflug.', en: 'The destination turns the vague weekly plan into a concrete short trip.' } },
    distractors: ['karong gabii sa plasa', 'magtrabaho sa hotel'], placeholderCaption: { de: 'Ein Strandfoto ist in einem Nachrichtenverlauf für nächste Woche markiert.', en: 'A beach photo is marked in a message thread for next week.' }, songMood: 'a bright coastal plan waiting just beyond the week', visualNotes: 'Phone messages, beach photo, next-week calendar and two friends imagining the coast.',
  }),
]

export const CEBUANO_A2_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_FOUR_METADATA, cebuanoA2Practical4Inputs,
  { de: 'Du hast Cebuano A2 Praxis 4 abgeschlossen und kannst Pläne vorschlagen, ändern und freundlich bestätigen.', en: 'You have completed Cebuano A2 Practical 4 and can suggest, change, and confirm plans with friends.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_FIVE_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-5', title: 'Cebuano A2 Praxis 5', shortTitle: 'A2 Praxis 5',
  subtitle: { de: 'Missverständnisse höflich korrigieren und Alternativen wählen', en: 'Correcting misunderstandings politely and choosing alternatives' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical5Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'tsa-dili-kape', title: { de: 'Tee statt Kaffee', en: 'Tea, not coffee' },
    situation: { de: 'Die Barista stellt Kaffee hin, obwohl du Tee möchtest. Du korrigierst die Bestellung höflich.', en: 'The barista sets down coffee even though you want tea. Correct the order politely.' },
    pedagogicalGoal: 'Mit Pasaylo und dili eine falsche Getränkebestellung knapp und höflich korrigieren.',
    targetText: 'Pasaylo, tsa akong gusto, dili kape.', baseText: { de: 'Entschuldigung, ich möchte Tee, keinen Kaffee.', en: 'Sorry, I want tea, not coffee.' },
    chunks: [{ targetText: 'Pasaylo,', baseText: { de: 'Entschuldigung,', en: 'Sorry,' } }, { targetText: 'tsa akong gusto,', baseText: { de: 'ich möchte Tee,', en: 'tea is what I want,' } }, { targetText: 'dili kape.', baseText: { de: 'keinen Kaffee.', en: 'not coffee.' } }],
    terms: [{ targetText: 'Pasaylo', baseText: { de: 'Entschuldigung', en: 'sorry; excuse me' } }, { targetText: 'tsa', baseText: { de: 'Tee', en: 'tea' } }, { targetText: 'ang ako', baseText: { de: 'meines; für mich', en: 'mine; for me' } }, { targetText: 'dili', baseText: { de: 'nicht; nein', en: 'not; no' } }, { targetText: 'kape', baseText: { de: 'Kaffee', en: 'coffee' } }],
    recall: { before: 'Pasaylo, ', answer: 'tsa', after: ' akong gusto, dili kape.', fallbackChoices: ['tsa', 'tubig', 'dyus', 'sabaw'] }, speakRequired: ['pasaylo', 'tsa', 'kape'],
    sceneCaption: { de: 'Die Barista stellt eine Tasse vor dich und sagt: „Mao ni imong kape."', en: 'The barista sets a cup in front of you and says: “Mao ni imong kape.”' },
    trophyWord: { word: 'tsa', meaning: { de: 'Tee', en: 'tea' }, example: 'Tsa ang akong gusto, dili kape.', whyThisWord: { de: 'Das Getränkewort benennt eindeutig, was anstelle des hingestellten Kaffees bestellt war.', en: 'This drink word clearly names what was ordered instead of the coffee that arrived.' } },
    distractors: ['dugang nga asukar', 'mao ra gihapon'], placeholderCaption: { de: 'Eine Kaffeetasse steht neben einer noch leeren Teetasse auf dem Tresen.', en: 'A coffee cup stands beside an empty tea cup on the counter.' }, songMood: 'a calm cafe correction made without friction', visualNotes: 'Cafe counter, coffee served by mistake, tea tin visible behind the attentive barista.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'ilisi-og-mas-dako', title: { de: 'Eine größere Größe', en: 'A larger size' },
    situation: { de: 'Im Geschäft ist der Artikel viel zu klein. Du bittest darum, ihn gegen eine größere Größe auszutauschen.', en: 'At the shop, the item is much too small. Ask to exchange it for a larger size.' },
    pedagogicalGoal: 'Mit palihug ilisi eine konkrete Reklamation und die gewünschte Ersatzgröße ausdrücken.',
    targetText: 'Gamay ra kaayo kini; palihug ilisi og mas dako.', baseText: { de: 'Das hier ist viel zu klein; bitte tauschen Sie es gegen ein größeres um.', en: 'This is much too small; please exchange it for a larger one.' },
    chunks: [{ targetText: 'Gamay ra kaayo kini;', baseText: { de: 'Das hier ist viel zu klein;', en: 'This is much too small;' } }, { targetText: 'palihug ilisi', baseText: { de: 'bitte tauschen Sie es um', en: 'please exchange it' } }, { targetText: 'og mas dako.', baseText: { de: 'gegen ein größeres.', en: 'for a larger one.' } }],
    terms: [{ targetText: 'Gamay', baseText: { de: 'klein', en: 'small' } }, { targetText: 'kaayo', baseText: { de: 'sehr; zu sehr', en: 'very; too' } }, { targetText: 'ilisi', baseText: { de: 'tauschen Sie es um', en: 'exchange it' } }, { targetText: 'mas dako', baseText: { de: 'größer', en: 'larger' } }, { targetText: 'dako', baseText: { de: 'groß', en: 'large' } }],
    recall: { before: 'Gamay ra kaayo kini; palihug ilisi og mas ', answer: 'dako', after: '.', fallbackChoices: ['dako', 'humok', 'taas', 'barato'] }, speakRequired: ['gamay', 'ilisi', 'dako'],
    sceneCaption: { de: 'Die Verkäuferin zeigt auf das kleinste Stück und sagt: „Kini ang pinakagamay nga sukod."', en: 'The clerk points to the smallest item and says: “Kini ang pinakagamay nga sukod.”' },
    trophyWord: { word: 'dako', meaning: { de: 'groß', en: 'large' }, example: 'Mas dako nga sukod ang akong kinahanglan.', whyThisWord: { de: 'Das Adjektiv nennt beim Umtausch genau die Größe, die das Problem löst.', en: 'This adjective names the exact size that solves the problem during the exchange.' } },
    distractors: ['pareho nga sukod', 'kana nga asul'], placeholderCaption: { de: 'Ein zu kleines Kleidungsstück liegt neben derselben Ware in einer größeren Größe.', en: 'An item that is too small lies beside the same product in a larger size.' }, songMood: 'a practical shop exchange ending with the right fit', visualNotes: 'Clothing counter, small size tag, larger replacement ready in the clerk hand.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'tubig-na-lang', title: { de: 'Lieber Wasser', en: 'Water instead' },
    situation: { de: 'Im Restaurant bringt die Bedienung Saft. Du lehnst ihn ab und bittest stattdessen um Wasser.', en: 'At the restaurant, the server brings juice. Decline it and ask for water instead.' },
    pedagogicalGoal: 'Mit dili und na lang eine unerwünschte Auswahl höflich durch eine Alternative ersetzen.',
    targetText: 'Dili ko gusto og dyus; tubig na lang, palihug.', baseText: { de: 'Ich möchte keinen Saft; stattdessen nur Wasser, bitte.', en: 'I do not want juice; just water instead, please.' },
    chunks: [{ targetText: 'Dili ko gusto og dyus;', baseText: { de: 'Ich möchte keinen Saft;', en: 'I do not want juice;' } }, { targetText: 'tubig na lang,', baseText: { de: 'stattdessen nur Wasser,', en: 'just water instead,' } }, { targetText: 'palihug.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'dyus', baseText: { de: 'Saft', en: 'juice' } }, { targetText: 'tubig', baseText: { de: 'Wasser', en: 'water' } }, { targetText: 'na lang', baseText: { de: 'stattdessen; lieber', en: 'instead; just' } }, { targetText: 'Dili ko gusto', baseText: { de: 'ich möchte nicht', en: 'I do not want' } }, { targetText: 'palihug', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Dili ko gusto og dyus; tubig na ', answer: 'lang', after: ', palihug.', fallbackChoices: ['lang', 'usab', 'gihapon', 'dayon'] }, speakRequired: ['dyus', 'tubig', 'lang'],
    sceneCaption: { de: 'Die Bedienung stellt ein Glas vor dich und sagt: „Mao ni imong dyus."', en: 'The server sets a glass in front of you and says: “Mao ni imong dyus.”' },
    trophyWord: { word: 'lang', meaning: { de: 'nur; lieber; stattdessen', en: 'just; only; instead' }, example: 'Tubig na lang akong imnon.', whyThisWord: { de: 'Das kleine Wort macht die gewünschte Alternative weich und selbstverständlich.', en: 'This small word makes the requested alternative sound gentle and natural.' } },
    distractors: ['dugang nga dyus', 'kape nga init'], placeholderCaption: { de: 'Ein Saftglas wird gegen eine klare Flasche Wasser ausgetauscht.', en: 'A glass of juice is being replaced with a clear bottle of water.' }, songMood: 'a simple restaurant swap handled with an easy tone', visualNotes: 'Restaurant table, juice on one side, water bottle being set down by the server.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'dili-kini-kana', title: { de: 'Nicht diese, sondern jene', en: 'Not these, those' },
    situation: { de: 'Die Markthändlerin greift nach den falschen Mangos. Du zeigst höflich auf die anderen.', en: 'The market vendor reaches for the wrong mangoes. Politely point to the other ones.' },
    pedagogicalGoal: 'Mit dili kini und kana eine sichtbare Auswahl eindeutig korrigieren.',
    targetText: 'Pasaylo, dili kini; kana ang akong gusto.', baseText: { de: 'Entschuldigung, nicht diese hier; jene dort möchte ich.', en: 'Sorry, not these; those are the ones I want.' },
    chunks: [{ targetText: 'Pasaylo, dili kini;', baseText: { de: 'Entschuldigung, nicht diese hier;', en: 'Sorry, not these;' } }, { targetText: 'kana ang', baseText: { de: 'jene dort sind', en: 'those are' } }, { targetText: 'akong gusto.', baseText: { de: 'die, die ich möchte.', en: 'the ones I want.' } }],
    terms: [{ targetText: 'dili kini', baseText: { de: 'nicht diese hier', en: 'not these' } }, { targetText: 'kana', baseText: { de: 'jene dort', en: 'those' } }, { targetText: 'gusto', baseText: { de: 'möchten; wollen', en: 'want' } }, { targetText: 'Pasaylo', baseText: { de: 'Entschuldigung', en: 'sorry; excuse me' } }, { targetText: 'akong gusto', baseText: { de: 'die, die ich möchte', en: 'the ones I want' } }],
    recall: { before: 'Pasaylo, dili kini; kana ang akong ', answer: 'gusto', after: '.', fallbackChoices: ['gusto', 'bayad', 'sukli', 'resibo'] }, speakRequired: ['pasaylo', 'dili', 'gusto'],
    sceneCaption: { de: 'Die Händlerin nimmt die Mangos direkt vor ihr und fragt: „Kini nga mga mangga?"', en: 'The vendor picks up the mangoes in front of her and asks: “Kini nga mga mangga?”' },
    trophyWord: { word: 'gusto', meaning: { de: 'möchten; wollen', en: 'want' }, example: 'Kana ang akong gusto nga mangga.', whyThisWord: { de: 'Das Verb macht klar, dass dein Hinweis eine bewusste Auswahl und keine bloße Ortsangabe ist.', en: 'This verb makes clear that your gesture is a deliberate choice, not merely a location cue.' } },
    distractors: ['kini nga presko', 'duha ka kilo'], placeholderCaption: { de: 'Zwei Gruppen Mangos liegen getrennt auf einem Marktstand, während eine Hand auf die hintere zeigt.', en: 'Two groups of mangoes sit apart on a market stall while a hand points to the farther group.' }, songMood: 'a clear market correction made with a polite gesture', visualNotes: 'Fruit stall, two mango piles, vendor holding the wrong group and customer pointing to the other.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'saba-ilisi-kwarto', title: { de: 'Ein anderes Zimmer', en: 'A different room' },
    situation: { de: 'An der Hotelrezeption ist das angebotene Zimmer sehr laut. Du bittest höflich um einen Wechsel.', en: 'At hotel reception, the offered room is very noisy. Politely ask for a change.' },
    pedagogicalGoal: 'Ein Zimmerproblem mit saba benennen und mit palihug ilisi um Abhilfe bitten.',
    targetText: 'Saba kaayo kini nga kwarto; palihug ilisi.', baseText: { de: 'Dieses Zimmer ist sehr laut; bitte geben Sie mir ein anderes.', en: 'This room is very noisy; please give me another one.' },
    chunks: [{ targetText: 'Saba kaayo', baseText: { de: 'Sehr laut', en: 'Very noisy' } }, { targetText: 'kini nga kwarto;', baseText: { de: 'ist dieses Zimmer;', en: 'is this room;' } }, { targetText: 'palihug ilisi.', baseText: { de: 'bitte geben Sie mir ein anderes.', en: 'please give me another one.' } }],
    terms: [{ targetText: 'Saba', baseText: { de: 'laut', en: 'noisy' } }, { targetText: 'kwarto', baseText: { de: 'Zimmer', en: 'room' } }, { targetText: 'kaayo', baseText: { de: 'sehr', en: 'very' } }, { targetText: 'ilisi', baseText: { de: 'geben Sie mir ein anderes', en: 'give me another one' } }, { targetText: 'kini nga', baseText: { de: 'dieses', en: 'this' } }],
    recall: { before: '', answer: 'Saba', after: ' kaayo kini nga kwarto; palihug ilisi.', fallbackChoices: ['Saba', 'Hilom', 'Dako', 'Hayag'] }, speakRequired: ['saba', 'kwarto', 'ilisi'],
    sceneCaption: { de: 'Die Rezeptionistin schiebt dir eine Schlüsselkarte zu und sagt: „Kini ang imong kwarto."', en: 'The receptionist slides a key card toward you and says: “Kini ang imong kwarto.”' },
    trophyWord: { word: 'saba', meaning: { de: 'laut', en: 'noisy' }, example: 'Saba kaayo ang kwarto duol sa dalan.', whyThisWord: { de: 'Das Adjektiv benennt den konkreten Grund für deinen Zimmerwechsel ohne lange Erklärung.', en: 'This adjective states the concrete reason for your room change without a long explanation.' } },
    distractors: ['duol sa elevator', 'maayo ra kini'], placeholderCaption: { de: 'Eine Schlüsselkarte liegt vor einem Zimmer neben einer lauten Straße.', en: 'A key card sits in front of a room beside a noisy street.' }, songMood: 'a hotel problem stated calmly and clearly', visualNotes: 'Hotel desk, room key, traffic visible through a window and receptionist ready to offer another room.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'dili-na-kini-lang', title: { de: 'Nur dieses', en: 'Just this one' },
    situation: { de: 'Die Verkäuferin bietet dir noch einen zusätzlichen Artikel an. Du lehnst freundlich ab und bleibst bei deiner Auswahl.', en: 'The shop clerk offers you one more item. Decline politely and keep only your chosen item.' },
    pedagogicalGoal: 'Mit Dili na und kini na lang ein Zusatzangebot kurz und freundlich ablehnen.',
    targetText: 'Dili na, kini na lang, salamat.', baseText: { de: 'Nein, nichts weiter, nur dieses hier, danke.', en: 'No, nothing else, just this one, thank you.' },
    chunks: [{ targetText: 'Dili na,', baseText: { de: 'Nein, nichts weiter,', en: 'No, nothing else,' } }, { targetText: 'kini na lang,', baseText: { de: 'nur dieses hier,', en: 'just this one,' } }, { targetText: 'salamat.', baseText: { de: 'danke.', en: 'thank you.' } }],
    terms: [{ targetText: 'Dili na', baseText: { de: 'nein, nichts mehr', en: 'no more; no' } }, { targetText: 'kini', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: 'na lang', baseText: { de: 'nur; lieber', en: 'just; instead' } }, { targetText: 'salamat', baseText: { de: 'danke', en: 'thank you' } }, { targetText: 'kini na lang', baseText: { de: 'nur dieses hier', en: 'just this one' } }],
    recall: { before: '', answer: 'Dili', after: ' na, kini na lang, salamat.', fallbackChoices: ['Dili', 'Oo', 'Sige', 'Pwede'] }, speakRequired: ['dili', 'lang', 'salamat'],
    sceneCaption: { de: 'Die Verkäuferin hält einen zweiten Artikel hoch und fragt: „Gusto pa ka og usa?"', en: 'The clerk holds up a second item and asks: “Gusto pa ka og usa?”' },
    trophyWord: { word: 'dili', meaning: { de: 'nicht; nein', en: 'not; no' }, example: 'Dili na, kini na lang, salamat.', whyThisWord: { de: 'Das klare Nein beendet das Zusatzangebot, während der restliche Satz den Ton freundlich hält.', en: 'The clear no closes the extra offer while the rest of the sentence keeps the tone friendly.' } },
    distractors: ['usa pa ka putos', 'kana usab palihug'], placeholderCaption: { de: 'Ein ausgewählter Artikel liegt an der Kasse, während ein zweiter zurück ins Regal wandert.', en: 'One selected item sits at the register while a second is returned to the shelf.' }, songMood: 'a gentle no that keeps the checkout easy', visualNotes: 'Shop counter, one chosen item, clerk offering another and customer declining with a smile.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sayop-ang-total', title: { de: 'Die Summe stimmt nicht', en: 'The total looks wrong' },
    situation: { de: 'Im Restaurant wirkt die Summe auf der Rechnung falsch. Du weist höflich darauf hin und bittest um eine erneute Prüfung.', en: 'At the restaurant, the total on the bill looks wrong. Point it out politely and ask for another check.' },
    pedagogicalGoal: 'Mit murag sayop eine vorsichtige Korrektur formulieren und mit palihug um Prüfung bitten.',
    targetText: 'Pasaylo, murag sayop ang total; palihug susiha usab.', baseText: { de: 'Entschuldigung, die Summe scheint falsch zu sein; bitte prüfen Sie noch einmal.', en: 'Sorry, the total seems wrong; please check it again.' },
    chunks: [{ targetText: 'Pasaylo, murag sayop ang total;', baseText: { de: 'Entschuldigung, die Summe scheint falsch zu sein;', en: 'Sorry, the total seems wrong;' } }, { targetText: 'palihug susiha', baseText: { de: 'bitte prüfen Sie', en: 'please check it' } }, { targetText: 'usab.', baseText: { de: 'noch einmal.', en: 'again.' } }],
    terms: [{ targetText: 'murag', baseText: { de: 'es scheint; offenbar', en: 'it seems; apparently' } }, { targetText: 'sayop', baseText: { de: 'falsch; fehlerhaft', en: 'wrong; incorrect' } }, { targetText: 'total', baseText: { de: 'Gesamtsumme', en: 'total' } }, { targetText: 'susiha', baseText: { de: 'prüfen Sie', en: 'check it' } }, { targetText: 'usab', baseText: { de: 'noch einmal; wieder', en: 'again' } }],
    recall: { before: 'Pasaylo, murag ', answer: 'sayop', after: ' ang total; palihug susiha usab.', fallbackChoices: ['sayop', 'sakto', 'mahal', 'ubos'] }, speakRequired: ['sayop', 'total', 'susiha'],
    sceneCaption: { de: 'Die Kassiererin dreht das Display zu dir und fragt: „Sakto ba ang bayranan?"', en: 'The cashier turns the display toward you and asks: “Sakto ba ang bayranan?”' },
    trophyWord: { word: 'sayop', meaning: { de: 'falsch; fehlerhaft', en: 'wrong; incorrect' }, example: 'Murag sayop ang total sa resibo.', whyThisWord: { de: 'Das Adjektiv benennt das Problem vorsichtig, ohne der Mitarbeiterin einen Vorwurf zu machen.', en: 'This adjective names the problem cautiously without accusing the staff member.' } },
    distractors: ['sakto ra tanan', 'naa koy sukli'], placeholderCaption: { de: 'Eine Restaurantrechnung und ein Kassendisplay zeigen unterschiedliche Summen.', en: 'A restaurant bill and register display show different totals.' }, songMood: 'a careful bill correction resolved at the counter', visualNotes: 'Restaurant register, printed bill, mismatched total and cashier checking the figures again.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'mas-gamay-nga-putos', title: { de: 'Eine kleinere Packung', en: 'A smaller pack' },
    situation: { de: 'In der Apotheke ist die angebotene Packung zu groß. Du bittest stattdessen um eine kleinere.', en: 'At the pharmacy, the offered pack is too large. Ask for a smaller one instead.' },
    pedagogicalGoal: 'Eine angebotene Packungsgröße mit dili ablehnen und eine kleinere Alternative wählen.',
    targetText: 'Dili kini; mas gamay nga putos na lang, palihug.', baseText: { de: 'Nicht diese; stattdessen eine kleinere Packung, bitte.', en: 'Not this one; a smaller pack instead, please.' },
    chunks: [{ targetText: 'Dili kini;', baseText: { de: 'Nicht diese;', en: 'Not this one;' } }, { targetText: 'mas gamay nga putos', baseText: { de: 'eine kleinere Packung', en: 'a smaller pack' } }, { targetText: 'na lang, palihug.', baseText: { de: 'stattdessen, bitte.', en: 'instead, please.' } }],
    terms: [{ targetText: 'mas gamay', baseText: { de: 'kleiner', en: 'smaller' } }, { targetText: 'putos', baseText: { de: 'Packung; Päckchen', en: 'pack; packet' } }, { targetText: 'Dili kini', baseText: { de: 'nicht diese', en: 'not this one' } }, { targetText: 'na lang', baseText: { de: 'stattdessen', en: 'instead' } }, { targetText: 'palihug', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Dili kini; mas gamay nga ', answer: 'putos', after: ' na lang, palihug.', fallbackChoices: ['putos', 'botelya', 'kahon', 'tableta'] }, speakRequired: ['gamay', 'putos', 'palihug'],
    sceneCaption: { de: 'Die Apothekerin hebt eine große Packung hoch und fragt: „Kini nga dako nga putos?"', en: 'The pharmacist holds up a large pack and asks: “Kini nga dako nga putos?”' },
    trophyWord: { word: 'putos', meaning: { de: 'Packung; Päckchen', en: 'pack; packet' }, example: 'Gamay nga putos lang ang akong kinahanglan.', whyThisWord: { de: 'Das konkrete Verpackungswort macht deine gewünschte Alternative in der Apotheke eindeutig.', en: 'This concrete packaging word makes your requested alternative at the pharmacy unambiguous.' } },
    distractors: ['dako nga botelya', 'duha ka tableta'], placeholderCaption: { de: 'Eine große und eine kleine Arzneipackung liegen nebeneinander am Apothekentresen.', en: 'A large and a small medicine pack lie side by side at the pharmacy counter.' }, songMood: 'a precise pharmacy request for only what is needed', visualNotes: 'Pharmacy counter, two pack sizes, customer indicating the smaller box.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'estasyon-dili-mall', title: { de: 'Zum Bahnhof, nicht zum Einkaufszentrum', en: 'The station, not the mall' },
    situation: { de: 'Der Taxifahrer nennt das Einkaufszentrum als Ziel. Du korrigierst ihn höflich und nennst den Bahnhof.', en: 'The taxi driver names the mall as the destination. Correct them politely and state the station.' },
    pedagogicalGoal: 'Ein falsches Fahrziel mit Pasaylo und dili eindeutig berichtigen.',
    targetText: 'Pasaylo, paingon ko sa estasyon, dili sa mall.', baseText: { de: 'Entschuldigung, ich fahre zum Bahnhof, nicht zum Einkaufszentrum.', en: 'Sorry, I am heading to the station, not the mall.' },
    chunks: [{ targetText: 'Pasaylo,', baseText: { de: 'Entschuldigung,', en: 'Sorry,' } }, { targetText: 'paingon ko sa estasyon,', baseText: { de: 'ich fahre zum Bahnhof,', en: 'I am heading to the station,' } }, { targetText: 'dili sa mall.', baseText: { de: 'nicht zum Einkaufszentrum.', en: 'not to the mall.' } }],
    terms: [{ targetText: 'estasyon', baseText: { de: 'Bahnhof; Station', en: 'station' } }, { targetText: 'mall', baseText: { de: 'Einkaufszentrum', en: 'mall' } }, { targetText: 'paingon', baseText: { de: 'auf dem Weg nach; in Richtung', en: 'heading to; toward' } }, { targetText: 'dili sa', baseText: { de: 'nicht zum', en: 'not to the' } }, { targetText: 'Pasaylo', baseText: { de: 'Entschuldigung', en: 'sorry; excuse me' } }],
    recall: { before: 'Pasaylo, paingon ko sa ', answer: 'estasyon', after: ', dili sa mall.', fallbackChoices: ['estasyon', 'hotel', 'merkado', 'pantalan'] }, speakRequired: ['pasaylo', 'estasyon', 'mall'],
    sceneCaption: { de: 'Der Taxifahrer zeigt auf die Straße zum Einkaufszentrum und fragt: „Sa mall ta?"', en: 'The taxi driver points toward the road to the mall and asks: “Sa mall ta?”' },
    trophyWord: { word: 'mall', meaning: { de: 'Einkaufszentrum', en: 'mall' }, example: 'Duol ang mall sa hotel.', whyThisWord: { de: 'Das geläufige Ortswort markiert in der Korrektur genau das Ziel, zu dem du nicht fahren möchtest.', en: 'This common place word marks the exact destination you do not want in the correction.' } },
    distractors: ['sa mall dayon', 'hunong sa hotel'], placeholderCaption: { de: 'Auf dem Navigationsgerät sind Bahnhof und Einkaufszentrum als verschiedene Ziele markiert.', en: 'The navigation screen marks the station and mall as different destinations.' }, songMood: 'a taxi route corrected before the turn', visualNotes: 'Taxi dashboard, two destination pins, driver waiting before choosing the road.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'dili-mahimo-karon', title: { de: 'Heute leider nicht', en: 'Not today' },
    situation: { de: 'Ein Hotelmitarbeiter lädt dich zu einer Veranstaltung heute ein. Du lehnst höflich ab und schlägst ein anderes Mal vor.', en: 'A hotel staff member invites you to an event today. Decline politely and suggest another time.' },
    pedagogicalGoal: 'Eine Einladung mit Pasaylo und dili ko kalugar höflich ablehnen.',
    targetText: 'Pasaylo, dili ko kalugar karon; sa sunod na lang.', baseText: { de: 'Entschuldigung, ich kann heute nicht; ein andermal.', en: 'Sorry, I cannot make it today; next time instead.' },
    chunks: [{ targetText: 'Pasaylo,', baseText: { de: 'Entschuldigung,', en: 'Sorry,' } }, { targetText: 'dili ko kalugar karon;', baseText: { de: 'ich kann heute nicht;', en: 'I cannot make it right now;' } }, { targetText: 'sa sunod na lang.', baseText: { de: 'ein andermal.', en: 'next time instead.' } }],
    terms: [{ targetText: 'kalugar', baseText: { de: 'es einrichten können, Zeit haben', en: 'to be able to make it' } }, { targetText: 'karon', baseText: { de: 'heute; jetzt', en: 'today; now' } }, { targetText: 'sa sunod', baseText: { de: 'beim nächsten Mal', en: 'next time' } }, { targetText: 'na lang', baseText: { de: 'lieber; stattdessen', en: 'instead' } }, { targetText: 'Pasaylo', baseText: { de: 'Entschuldigung', en: 'sorry; excuse me' } }],
    recall: { before: 'Pasaylo, dili ko ', answer: 'kalugar', after: ' karon; sa sunod na lang.', fallbackChoices: ['kalugar', 'ganahan', 'kabalo', 'kapoy'] }, speakRequired: ['pasaylo', 'kalugar', 'karon'],
    sceneCaption: { de: 'Der Hotelmitarbeiter hält das Veranstaltungsprogramm hoch und fragt: „Apil ka sa kalihokan karon?"', en: 'The hotel staff member holds up the event program and asks: “Apil ka sa kalihokan karon?”' },
    trophyWord: { word: 'kalugar', meaning: { de: 'es einrichten können', en: 'to be able to make it' }, example: 'Dili ko kalugar karon sa hapon.', whyThisWord: { de: 'Kalugar ist die idiomatische Absage: Es passt gerade nicht in deinen Tag.', en: 'Kalugar is the idiomatic way to say you cannot fit it in right now.' } },
    distractors: ['moapil ko karon', 'sige dayon ta'], placeholderCaption: { de: 'Ein Veranstaltungsprogramm liegt zwischen einem Hotelmitarbeiter und einem höflich ablehnenden Gast.', en: 'An event program sits between a hotel staff member and a guest declining politely.' }, songMood: 'a courteous invitation declined without closing the door', visualNotes: 'Hotel lobby, event flyer, staff member offering it and guest responding warmly but firmly.',
  }),
]

export const CEBUANO_A2_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_FIVE_METADATA, cebuanoA2Practical5Inputs,
  { de: 'Du hast Cebuano A2 Praxis 5 abgeschlossen und kannst Fehler höflich korrigieren und passende Alternativen verlangen.', en: 'You have completed Cebuano A2 Practical 5 and can correct mistakes politely and request suitable alternatives.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_SIX_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-6', title: 'Cebuano A2 Praxis 6', shortTitle: 'A2 Praxis 6',
  subtitle: { de: 'Wäsche, Reparaturen, Termine und andere Erledigungen organisieren', en: 'Arranging laundry, repairs, appointments, and other errands' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical6Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'labada-kanus-a-mahuman', title: { de: 'Wäsche abgeben', en: 'Dropping off laundry' },
    situation: { de: 'In einer Wäscherei fragt die Mitarbeiterin nach deiner Kleidung. Du gibst sie zum Waschen ab und fragst, wann sie fertig ist.', en: 'At a laundry shop, the attendant asks about your clothes. Drop them off for washing and ask when they will be ready.' },
    pedagogicalGoal: 'Eine Wäscheabgabe mit para sa labada benennen und mit Kanus-a mahuman nach der Fertigstellung fragen.',
    targetText: 'Para sa labada kini. Kanus-a mahuman?', baseText: { de: 'Das ist für die Wäsche. Wann ist sie fertig?', en: 'This is for the laundry. When will it be ready?' },
    chunks: [{ targetText: 'Para sa labada kini.', baseText: { de: 'Das ist für die Wäsche.', en: 'This is for the laundry.' } }, { targetText: 'Kanus-a', baseText: { de: 'Wann', en: 'When' } }, { targetText: 'mahuman?', baseText: { de: 'ist sie fertig?', en: 'will it be ready?' } }],
    terms: [{ targetText: 'labada', baseText: { de: 'Wäsche; Wäschewaschen', en: 'laundry; washing' } }, { targetText: 'Para sa', baseText: { de: 'für', en: 'for' } }, { targetText: 'Kanus-a', baseText: { de: 'wann', en: 'when' } }, { targetText: 'mahuman', baseText: { de: 'fertig sein; fertig werden', en: 'be ready; be finished' } }, { targetText: 'kini', baseText: { de: 'dieses hier', en: 'this' } }],
    recall: { before: 'Para sa ', answer: 'labada', after: ' kini. Kanus-a mahuman?', fallbackChoices: ['labada', 'plantsa', 'kumpuni', 'arkila'] }, speakRequired: ['labada', 'kini', 'mahuman'],
    sceneCaption: { de: 'Die Mitarbeiterin nimmt den Kleiderbeutel entgegen und fragt: „Kini ba ang imong labada?“', en: 'The attendant takes the bag of clothes and asks: “Kini ba ang imong labada?”' },
    trophyWord: { word: 'labada', meaning: { de: 'Wäsche; Wäschewaschen', en: 'laundry; washing' }, example: 'Para sa labada kining mga sinina.', whyThisWord: { de: 'Das Wort nennt am Schalter sofort den Dienst, für den du die Kleidung abgibst.', en: 'This word immediately names the service for which you are leaving the clothes at the counter.' } },
    distractors: ['para sa uga nga sinina', 'kuhaon karong hapon'], placeholderCaption: { de: 'Ein beschrifteter Kleiderbeutel liegt auf dem Tresen einer kleinen Wäscherei.', en: 'A labeled bag of clothes rests on the counter of a small laundry shop.' }, songMood: 'a tidy laundry errand beginning at the service counter', visualNotes: 'Laundry counter, clothes bag, order tag and attendant checking the contents.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'guba-ang-selpon', title: { de: 'Das Handy reparieren lassen', en: 'Phone repair' },
    situation: { de: 'In einer Handywerkstatt fragt der Techniker nach dem Problem. Du sagst, dass dein Handy kaputt ist, und bittest um Reparatur.', en: 'At a phone repair shop, the technician asks about the problem. Say that your phone is broken and ask for a repair.' },
    pedagogicalGoal: 'Ein Geräteproblem mit guba benennen und mit palihug ayoha eine direkte Reparaturbitte formulieren.',
    targetText: 'Guba ang akong selpon; palihug ayoha kini.', baseText: { de: 'Mein Handy ist kaputt; bitte reparieren Sie es.', en: 'My phone is broken; please repair it.' },
    chunks: [{ targetText: 'Guba ang akong selpon;', baseText: { de: 'Mein Handy ist kaputt;', en: 'My phone is broken;' } }, { targetText: 'palihug ayoha', baseText: { de: 'bitte reparieren Sie', en: 'please repair' } }, { targetText: 'kini.', baseText: { de: 'es.', en: 'it.' } }],
    terms: [{ targetText: 'Guba', baseText: { de: 'kaputt; defekt', en: 'broken; damaged' } }, { targetText: 'selpon', baseText: { de: 'Handy', en: 'mobile phone' }, alsoAccept: ['cellphone'] }, { targetText: 'ayoha', baseText: { de: 'reparieren Sie es', en: 'repair it' } }, { targetText: 'palihug', baseText: { de: 'bitte', en: 'please' } }, { targetText: 'akong selpon', baseText: { de: 'mein Handy', en: 'my phone' } }],
    recall: { before: '', answer: 'Guba', after: ' ang akong selpon; palihug ayoha kini.', fallbackChoices: ['Guba', 'Saba', 'Hinay', 'Init'] }, speakRequired: ['guba', 'selpon', 'ayoha'],
    sceneCaption: { de: 'Der Techniker legt das Handy auf seine Arbeitsmatte und fragt: „Unsa ang problema sa imong selpon?“', en: 'The technician places the phone on a work mat and asks: “Unsa ang problema sa imong selpon?”' },
    trophyWord: { word: 'guba', meaning: { de: 'kaputt; defekt', en: 'broken; damaged' }, example: 'Guba ang selpon ug kinahanglan og ayo.', whyThisWord: { de: 'Das Zustandswort bringt das Geräteproblem in der Werkstatt ohne technische Erklärung auf den Punkt.', en: 'This state word captures the device problem at the repair shop without a technical explanation.' } },
    distractors: ['bag-ong selpon', 'load nga baynte'], placeholderCaption: { de: 'Ein geöffnetes Handy liegt auf einer Reparaturmatte neben kleinen Werkzeugen.', en: 'An opened phone lies on a repair mat beside small tools.' }, songMood: 'a practical repair request at a focused workbench', visualNotes: 'Phone repair kiosk, device on anti-static mat, technician listening before reaching for tools.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'load-singkwenta-pesos', title: { de: 'Guthaben für fünfzig Pesos', en: 'Fifty pesos of load' },
    situation: { de: 'Am Mobilfunkstand fragt die Verkäuferin nach dem Betrag. Du bittest um ein Guthaben von fünfzig Pesos.', en: 'At the mobile counter, the clerk asks for the amount. Request fifty pesos of phone load.' },
    pedagogicalGoal: 'Einen genauen Guthabenbetrag mit singkwenta pesos und palihug bestellen.',
    targetText: 'Kinahanglan kog load nga singkwenta pesos, palihug.', baseText: { de: 'Ich brauche bitte ein Guthaben von fünfzig Pesos.', en: 'I need fifty pesos of phone load, please.' },
    chunks: [{ targetText: 'Kinahanglan kog load', baseText: { de: 'Ich brauche Handyguthaben', en: 'I need phone load' } }, { targetText: 'nga singkwenta pesos,', baseText: { de: 'im Wert von fünfzig Pesos,', en: 'worth fifty pesos,' } }, { targetText: 'palihug.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'Kinahanglan', baseText: { de: 'brauchen; nötig', en: 'need; necessary' } }, { targetText: 'load', baseText: { de: 'Handyguthaben', en: 'phone load' } }, { targetText: 'singkwenta', baseText: { de: 'fünfzig', en: 'fifty' } }, { targetText: 'pesos', baseText: { de: 'Pesos', en: 'pesos' } }, { targetText: 'singkwenta pesos', baseText: { de: 'fünfzig Pesos', en: 'fifty pesos' } }],
    recall: { before: 'Kinahanglan kog load nga ', answer: 'singkwenta', after: ' pesos, palihug.', fallbackChoices: ['singkwenta', 'baynte', 'traynta', 'sesenta'] }, speakRequired: ['kinahanglan', 'load', 'singkwenta'],
    sceneCaption: { de: 'Die Verkäuferin öffnet das Aufladefenster und fragt: „Pila ka pesos nga load?"', en: 'The clerk opens the top-up screen and asks: “Pila ka pesos nga load?”' },
    trophyWord: { word: 'singkwenta', meaning: { de: 'fünfzig', en: 'fifty' }, example: 'Singkwenta pesos nga load, palihug.', whyThisWord: { de: 'Die Zahl legt am Mobilfunkstand den gewünschten Betrag eindeutig fest.', en: 'This number sets the requested amount unambiguously at the mobile counter.' } },
    distractors: ['bag-ong sim kard', 'load para ugma'], placeholderCaption: { de: 'Auf dem Display eines Mobilfunkstands ist ein Guthabenbetrag von fünfzig Pesos ausgewählt.', en: 'A mobile-counter screen shows a fifty-peso load amount selected.' }, songMood: 'a quick phone top-up keeping the day connected', visualNotes: 'Mobile kiosk, top-up screen, fifty-peso option highlighted and phone number ready.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'appointment-karong-huwebes', title: { de: 'Termin am Donnerstag', en: 'Appointment on Thursday' },
    situation: { de: 'An einer Rezeption fragt die Mitarbeiterin nach deinem Wunschtermin. Du bittest um einen Termin für diesen Donnerstag.', en: 'At a reception desk, the clerk asks when you want an appointment. Request one for this Thursday.' },
    pedagogicalGoal: 'Einen Terminwunsch mit appointment und einer konkreten Wochentagsangabe äußern.',
    targetText: 'Gusto ko og appointment karong huwebes, palihug.', baseText: { de: 'Ich möchte bitte einen Termin für diesen Donnerstag.', en: 'I would like an appointment this Thursday, please.' },
    chunks: [{ targetText: 'Gusto ko og appointment', baseText: { de: 'Ich möchte einen Termin', en: 'I would like an appointment' } }, { targetText: 'karong huwebes,', baseText: { de: 'für diesen Donnerstag,', en: 'this Thursday,' } }, { targetText: 'palihug.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'appointment', baseText: { de: 'Termin', en: 'appointment' } }, { targetText: 'huwebes', baseText: { de: 'Donnerstag', en: 'Thursday' } }, { targetText: 'karong huwebes', baseText: { de: 'diesen Donnerstag', en: 'this Thursday' } }, { targetText: 'Gusto ko', baseText: { de: 'ich möchte', en: 'I would like' } }, { targetText: 'palihug', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Gusto ko og appointment karong ', answer: 'huwebes', after: ', palihug.', fallbackChoices: ['huwebes', 'lunes', 'martes', 'biyernes'] }, speakRequired: ['gusto', 'appointment', 'huwebes'],
    sceneCaption: { de: 'Die Mitarbeiterin zeigt auf den offenen Terminkalender und fragt: „Kanus-a imong gusto nga appointment?"', en: 'The clerk points to the open appointment calendar and asks: “Kanus-a imong gusto nga appointment?”' },
    trophyWord: { word: 'huwebes', meaning: { de: 'Donnerstag', en: 'Thursday' }, example: 'Huwebes ang akong appointment.', whyThisWord: { de: 'Der Wochentag setzt den gewünschten Termin im Kalender präzise fest.', en: 'This weekday places the requested appointment precisely in the calendar.' } },
    distractors: ['ugma sa buntag', 'walay appointment'], placeholderCaption: { de: 'In einem offenen Terminkalender ist der Donnerstag hervorgehoben.', en: 'Thursday is highlighted in an open appointment calendar.' }, songMood: 'a clear appointment finding its place in the week', visualNotes: 'Reception desk, weekly calendar, Thursday slot highlighted and clerk ready to enter a name.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'kopya-niining-yabi', title: { de: 'Eine Schlüsselkopie', en: 'A key copy' },
    situation: { de: 'Beim Schlüsseldienst fragt der Mitarbeiter, was du brauchst. Du bittest um eine Kopie deines Schlüssels.', en: 'At a key-cutting shop, the worker asks what you need. Request a copy of your key.' },
    pedagogicalGoal: 'Mit kopya niining yabi eine konkrete Dienstleistung am Schlüsselschalter verlangen.',
    targetText: 'Gusto ko og kopya niining yabi, palihug.', baseText: { de: 'Ich möchte bitte eine Kopie dieses Schlüssels.', en: 'I would like a copy of this key, please.' },
    chunks: [{ targetText: 'Gusto ko og kopya', baseText: { de: 'Ich möchte eine Kopie', en: 'I would like a copy' } }, { targetText: 'niining yabi,', baseText: { de: 'dieses Schlüssels,', en: 'of this key,' } }, { targetText: 'palihug.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'kopya', baseText: { de: 'Kopie', en: 'copy' } }, { targetText: 'yabi', baseText: { de: 'Schlüssel', en: 'key' } }, { targetText: 'niining', baseText: { de: 'von diesem', en: 'of this' } }, { targetText: 'Gusto ko', baseText: { de: 'ich möchte', en: 'I would like' } }, { targetText: 'palihug', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Gusto ko og ', answer: 'kopya', after: ' niining yabi, palihug.', fallbackChoices: ['kopya', 'resibo', 'hulagway', 'listahan'] }, speakRequired: ['kopya', 'yabi', 'palihug'],
    sceneCaption: { de: 'Der Mitarbeiter deutet auf die Schlüsselmaschine und fragt: „Unsa imong kinahanglan?"', en: 'The worker gestures toward the key-cutting machine and asks: “Unsa imong kinahanglan?”' },
    trophyWord: { word: 'kopya', meaning: { de: 'Kopie', en: 'copy' }, example: 'Usa ka kopya sa yabi, palihug.', whyThisWord: { de: 'Das Wort bezeichnet genau das zusätzliche Exemplar, das der Schlüsseldienst anfertigen soll.', en: 'This word names the exact extra item the key-cutting service should make.' } },
    distractors: ['bag-ong kandado', 'duha ka yabi'], placeholderCaption: { de: 'Ein einzelner Schlüssel liegt neben einem unbearbeiteten Rohling an der Kopiermaschine.', en: 'A single key lies beside an uncut blank at the key-copying machine.' }, songMood: 'a small practical request shaped in metal', visualNotes: 'Key-cutting counter, original key, blank copy and compact cutting machine ready.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'paket-sa-ngalan-ana', title: { de: 'Ein Paket abholen', en: 'Picking up a package' },
    situation: { de: 'Am Paketschalter fragt die Mitarbeiterin nach deinem Anliegen. Du sagst, dass du wegen deines Pakets da bist, und nennst den Namen Ana.', en: 'At the package counter, the clerk asks why you are there. Say you are there for your package and give the name Ana.' },
    pedagogicalGoal: 'Mit ania ko para sa den Grund des Besuchs nennen und den Abholnamen ergänzen.',
    targetText: 'Ania ko para sa akong paket. Ana ang ngalan.', baseText: { de: 'Ich bin wegen meines Pakets hier. Der Name ist Ana.', en: 'I am here for my package. The name is Ana.' },
    chunks: [{ targetText: 'Ania ko para sa akong paket.', baseText: { de: 'Ich bin wegen meines Pakets hier.', en: 'I am here for my package.' } }, { targetText: 'Ana ang', baseText: { de: 'Ana ist der', en: 'Ana is the' } }, { targetText: 'ngalan.', baseText: { de: 'Name.', en: 'name.' } }],
    terms: [{ targetText: 'paket', baseText: { de: 'Paket', en: 'package' } }, { targetText: 'Ania ko', baseText: { de: 'ich bin hier', en: 'I am here' } }, { targetText: 'para sa', baseText: { de: 'wegen; für', en: 'for' } }, { targetText: 'ngalan', baseText: { de: 'Name', en: 'name' } }, { targetText: 'Ana', baseText: { de: 'Ana', en: 'Ana' } }],
    recall: { before: 'Ania ko para sa akong ', answer: 'paket', after: '. Ana ang ngalan.', fallbackChoices: ['paket', 'resibo', 'sulat', 'order'] }, speakRequired: ['paket', 'ana', 'ngalan'],
    sceneCaption: { de: 'Die Mitarbeiterin öffnet die Abholliste und fragt: „Unsa ang imong kuhaon?“', en: 'The clerk opens the pickup list and asks: “Unsa ang imong kuhaon?”' },
    trophyWord: { word: 'paket', meaning: { de: 'Paket', en: 'package' }, example: 'Naa ang paket sa ngalan ni Ana.', whyThisWord: { de: 'Das Wort nennt am Abholschalter sofort den Gegenstand, den die Mitarbeiterin suchen soll.', en: 'This word immediately names the item the clerk should look for at the pickup counter.' } },
    distractors: ['para sa sulat', 'wala koy ngalan'], placeholderCaption: { de: 'Mehrere beschriftete Pakete stehen hinter einem kleinen Abholschalter.', en: 'Several labeled packages stand behind a small pickup counter.' }, songMood: 'a package errand moving smoothly through the pickup desk', visualNotes: 'Parcel counter, pickup list, boxes with labels and clerk searching for the named package.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'bisikleta-duha-ka-adlaw', title: { de: 'Ein Fahrrad für zwei Tage', en: 'A bicycle for two days' },
    situation: { de: 'Bei einem Verleih fragt der Mitarbeiter nach dem gewünschten Fahrzeug. Du fragst nach einem Fahrrad für zwei Tage.', en: 'At a rental shop, the clerk asks which vehicle you want. Ask for a bicycle available for two days.' },
    pedagogicalGoal: 'Mit naa moy und maarkila nach einem verfügbaren Mietfahrzeug für eine feste Dauer fragen.',
    targetText: 'Naa moy bisikleta nga maarkila sulod sa duha ka adlaw?', baseText: { de: 'Haben Sie ein Fahrrad, das man für zwei Tage mieten kann?', en: 'Do you have a bicycle available to rent for two days?' },
    chunks: [{ targetText: 'Naa moy bisikleta', baseText: { de: 'Haben Sie ein Fahrrad', en: 'Do you have a bicycle' } }, { targetText: 'nga maarkila', baseText: { de: 'das man mieten kann', en: 'available to rent' } }, { targetText: 'sulod sa duha ka adlaw?', baseText: { de: 'für zwei Tage?', en: 'for two days?' } }],
    terms: [{ targetText: 'bisikleta', baseText: { de: 'Fahrrad', en: 'bicycle' } }, { targetText: 'maarkila', baseText: { de: 'mietbar; zu mieten', en: 'available to rent' } }, { targetText: 'sulod sa', baseText: { de: 'für die Dauer von', en: 'for the duration of' } }, { targetText: 'duha ka adlaw', baseText: { de: 'zwei Tage', en: 'two days' } }, { targetText: 'Naa moy', baseText: { de: 'haben Sie', en: 'do you have' } }],
    recall: { before: 'Naa moy ', answer: 'bisikleta', after: ' nga maarkila sulod sa duha ka adlaw?', fallbackChoices: ['bisikleta', 'motor', 'awto', 'bangka'] }, speakRequired: ['bisikleta', 'maarkila', 'duha'],
    sceneCaption: { de: 'Der Mitarbeiter zeigt auf die verfügbaren Fahrzeuge und fragt: „Unsa nga sakyanan imong gusto?"', en: 'The clerk points to the available vehicles and asks: “Unsa nga sakyanan imong gusto?”' },
    trophyWord: { word: 'bisikleta', meaning: { de: 'Fahrrad', en: 'bicycle' }, example: 'Naa moy bisikleta nga maarkila?', whyThisWord: { de: 'Das Fahrzeugwort grenzt deine Mietanfrage klar von den Motorrollern und Autos ab.', en: 'This vehicle word clearly distinguishes your rental request from the scooters and cars.' } },
    distractors: ['usa ka adlaw lang', 'motor nga mahal'], placeholderCaption: { de: 'Ein Fahrrad steht neben Motorrollern vor einem kleinen Verleihschalter.', en: 'A bicycle stands beside scooters in front of a small rental counter.' }, songMood: 'a light two-day ride beginning at the rental rack', visualNotes: 'Rental shop, bicycle selected among scooters, two-day tag hanging from the handlebar.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'abli-hangtod-alas-kuwatro', title: { de: 'Bis vier Uhr geöffnet', en: 'Open until four' },
    situation: { de: 'An einem Serviceschalter möchtest du die Öffnungszeit für heute Nachmittag prüfen. Du fragst, ob bis vier Uhr geöffnet ist.', en: 'At a service counter, you want to check today’s afternoon hours. Ask whether it stays open until four.' },
    pedagogicalGoal: 'Mit abli hangtod und einer Uhrzeit nach heutigen Öffnungszeiten fragen.',
    targetText: 'Abli mo hangtod alas kuwatro karong hapon?', baseText: { de: 'Haben Sie heute Nachmittag bis vier Uhr geöffnet?', en: 'Are you open until four this afternoon?' },
    chunks: [{ targetText: 'Abli mo', baseText: { de: 'Haben Sie geöffnet', en: 'Are you open' } }, { targetText: 'hangtod alas kuwatro', baseText: { de: 'bis vier Uhr', en: 'until four' } }, { targetText: 'karong hapon?', baseText: { de: 'heute Nachmittag?', en: 'this afternoon?' } }],
    terms: [{ targetText: 'Abli', baseText: { de: 'geöffnet', en: 'open' } }, { targetText: 'hangtod', baseText: { de: 'bis', en: 'until' } }, { targetText: 'alas kuwatro', baseText: { de: 'um vier Uhr', en: 'at four o’clock' } }, { targetText: 'karong hapon', baseText: { de: 'heute Nachmittag', en: 'this afternoon' } }, { targetText: 'kuwatro', baseText: { de: 'vier', en: 'four' } }],
    recall: { before: 'Abli mo hangtod ', answer: 'alas kuwatro', after: ' karong hapon?', fallbackChoices: ['alas kuwatro', 'alas dos', 'alas tres', 'alas singko'] }, speakRequired: ['abli', 'kuwatro', 'hapon'],
    sceneCaption: { de: 'Die Mitarbeiterin deutet auf das Schild mit den Öffnungszeiten und sagt: „Balik lang karong hapon.“', en: 'The clerk points to the opening-hours sign and says: “Balik lang karong hapon.”' },
    trophyWord: { word: 'kuwatro', meaning: { de: 'vier', en: 'four' }, example: 'Abli ang opisina hangtod alas kuwatro.', whyThisWord: { de: 'Die Zahl macht aus der allgemeinen Frage eine genaue und brauchbare Öffnungszeit.', en: 'This number turns the general question into a precise, useful opening time.' } },
    distractors: ['sirado karong hapon', 'abli ugma sa buntag'], placeholderCaption: { de: 'Ein Öffnungszeitenschild zeigt vier Uhr neben einem Serviceschalter.', en: 'An opening-hours sign shows four o’clock beside a service counter.' }, songMood: 'an afternoon errand timed before the doors close', visualNotes: 'Service window, hours sign, clock approaching four and customer checking before leaving.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'ania-ang-resibo', title: { de: 'Das Handy abholen', en: 'Collecting the phone' },
    situation: { de: 'In der Handywerkstatt fragt der Mitarbeiter, was du abholen möchtest. Du nennst dein Handy und zeigst den Beleg.', en: 'At the phone repair shop, the worker asks what you want to collect. Name your phone and show the receipt.' },
    pedagogicalGoal: 'Einen Abholgegenstand nennen und mit ania ang resibo den passenden Beleg vorzeigen.',
    targetText: 'Nahuman na ba ang akong selpon? Ania ang resibo.', baseText: { de: 'Ist mein Handy schon fertig? Hier ist der Beleg.', en: 'Is my phone done already? Here is the receipt.' },
    chunks: [{ targetText: 'Nahuman na ba', baseText: { de: 'Ist schon fertig', en: 'Is it done already' } }, { targetText: 'ang akong selpon?', baseText: { de: 'mein Handy?', en: 'my phone?' } }, { targetText: 'Ania ang resibo.', baseText: { de: 'Hier ist der Beleg.', en: 'Here is the receipt.' } }],
    terms: [{ targetText: 'selpon', baseText: { de: 'Handy', en: 'mobile phone' }, alsoAccept: ['cellphone'] }, { targetText: 'ania', baseText: { de: 'hier ist; hier sind', en: 'here is; here are' } }, { targetText: 'resibo', baseText: { de: 'Beleg; Quittung', en: 'receipt' } }, { targetText: 'palihug', baseText: { de: 'bitte', en: 'please' } }, { targetText: 'ang akong selpon', baseText: { de: 'mein Handy', en: 'my phone' } }],
    recall: { before: 'Nahuman na ba ang akong selpon? Ania ang ', answer: 'resibo', after: '.', fallbackChoices: ['resibo', 'tiket', 'yabi', 'kopya'] }, speakRequired: ['nahuman', 'selpon', 'resibo'],
    sceneCaption: { de: 'Der Mitarbeiter öffnet das Abholfach und fragt: „Unsa ang imong kuhaon?"', en: 'The worker opens the pickup shelf and asks: “Unsa ang imong kuhaon?”' },
    trophyWord: { word: 'ania', meaning: { de: 'hier ist; hier sind', en: 'here is; here are' }, example: 'Ania ang akong resibo sa selpon.', whyThisWord: { de: 'Mit diesem Wort übergibst du den Beleg direkt und bringst die Abholung zügig voran.', en: 'This word lets you present the receipt directly and move the pickup along quickly.' } },
    distractors: ['bag-ong selpon', 'wala ang resibo'], placeholderCaption: { de: 'Ein repariertes Handy liegt im Abholfach, während ein Beleg über den Tresen gereicht wird.', en: 'A phone rests on the pickup shelf while a receipt is handed across the counter.' }, songMood: 'a repair errand closing with the receipt in hand', visualNotes: 'Repair counter, phone in pickup tray, receipt presented and worker matching the ticket.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'appointment-nako-huwebes', title: { de: 'Der Termin steht', en: 'Appointment confirmed' },
    situation: { de: 'Die Mitarbeiterin bestätigt deinen Termin am Donnerstag. Du bedankst dich und wiederholst den Tag.', en: 'The clerk confirms your appointment for Thursday. Thank them and repeat the day.' },
    pedagogicalGoal: 'Eine Terminbestätigung mit salamat annehmen und den festgelegten Wochentag wiederholen.',
    targetText: 'Salamat. Ang appointment nako kay huwebes.', baseText: { de: 'Danke. Mein Termin ist am Donnerstag.', en: 'Thank you. My appointment is on Thursday.' },
    chunks: [{ targetText: 'Salamat.', baseText: { de: 'Danke.', en: 'Thank you.' } }, { targetText: 'Ang appointment nako', baseText: { de: 'Mein Termin', en: 'My appointment' } }, { targetText: 'kay huwebes.', baseText: { de: 'ist am Donnerstag.', en: 'is on Thursday.' } }],
    terms: [{ targetText: 'appointment', baseText: { de: 'Termin', en: 'appointment' } }, { targetText: 'huwebes', baseText: { de: 'Donnerstag', en: 'Thursday' } }, { targetText: 'Salamat', baseText: { de: 'danke', en: 'thank you' } }, { targetText: 'nako', baseText: { de: 'mein; von mir', en: 'my; of mine' } }, { targetText: 'kay huwebes', baseText: { de: 'ist am Donnerstag', en: 'is on Thursday' } }],
    recall: { before: 'Salamat. Ang ', answer: 'appointment', after: ' nako kay huwebes.', fallbackChoices: ['appointment', 'resibo', 'paket', 'selpon'] }, speakRequired: ['salamat', 'appointment', 'huwebes'],
    sceneCaption: { de: 'Die Mitarbeiterin trägt den Termin ein und sagt: „Huwebes ang imong appointment."', en: 'The clerk enters the appointment and says: “Huwebes ang imong appointment.”' },
    trophyWord: { word: 'appointment', meaning: { de: 'Termin', en: 'appointment' }, example: 'Huwebes ang akong appointment sa opisina.', whyThisWord: { de: 'Das geläufige Lehnwort fasst die bestätigte Erledigung am Ende des Gesprächs klar zusammen.', en: 'This common loanword neatly summarizes the confirmed errand at the end of the exchange.' } },
    distractors: ['martes ang adlaw', 'wala koy oras'], placeholderCaption: { de: 'Ein bestätigter Donnerstagstermin erscheint auf dem Bildschirm an der Rezeption.', en: 'A confirmed Thursday appointment appears on the reception screen.' }, songMood: 'a week of errands settling into one confirmed appointment', visualNotes: 'Reception screen, Thursday appointment saved, clerk and customer acknowledging the final detail.',
  }),
]

export const CEBUANO_A2_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_SIX_METADATA, cebuanoA2Practical6Inputs,
  { de: 'Du hast Cebuano A2 Praxis 6 abgeschlossen und kannst alltägliche Dienstleistungen und Erledigungen selbstständig organisieren.', en: 'You have completed Cebuano A2 Practical 6 and can independently arrange everyday services and errands.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-7', title: 'Cebuano A2 Praxis 7', shortTitle: 'A2 Praxis 7',
  subtitle: { de: 'Empfehlungen einholen und Orte, Speisen und Geschenke beschreiben', en: 'Asking for recommendations and describing places, food, and gifts' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical7Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'nindot-nga-kaonon', title: { de: 'Was schmeckt hier?', en: 'What is good here?' },
    situation: { de: 'In einem kleinen Restaurant fragt die Bedienung, wonach dir ist. Du bittest um eine leckere und günstige Empfehlung.', en: 'At a small restaurant, the server asks what you are looking for. Ask for a tasty and inexpensive recommendation.' },
    pedagogicalGoal: 'Mit Unsa may nindot nach einer Empfehlung fragen und zwei gewünschte Eigenschaften mit ug verbinden.',
    targetText: 'Unsa may nindot nga putahe dinhi? Kanang lami ug barato.', baseText: { de: 'Was gibt es hier für ein gutes Gericht? Eines, das lecker und günstig ist.', en: 'What is a good dish here? Something tasty and cheap.' },
    chunks: [{ targetText: 'Unsa may nindot', baseText: { de: 'Was gibt es Gutes', en: 'What is good' } }, { targetText: 'nga putahe dinhi?', baseText: { de: 'für ein Gericht hier?', en: 'as a dish here?' } }, { targetText: 'Kanang lami ug barato.', baseText: { de: 'Eines, das lecker und günstig ist.', en: 'Something tasty and cheap.' } }],
    terms: [{ targetText: 'putahe', baseText: { de: 'Gericht', en: 'dish' } }, { targetText: 'nindot', baseText: { de: 'gut; empfehlenswert', en: 'good; recommendable' } }, { targetText: 'Kanang', baseText: { de: 'etwas von der Art', en: 'something like that' } }, { targetText: 'lami', baseText: { de: 'lecker', en: 'tasty' } }, { targetText: 'barato', baseText: { de: 'günstig', en: 'inexpensive' } }],
    recall: { before: 'Unsa may nindot nga ', answer: 'putahe', after: ' dinhi? Kanang lami ug barato.', fallbackChoices: ['putahe', 'ilimnon', 'prutas', 'pan'] }, speakRequired: ['nindot', 'putahe', 'barato'],
    sceneCaption: { de: 'Die Bedienung reicht dir die Speisekarte und fragt: „Unsang klase nga pagkaon imong gusto?“', en: 'The server hands you the menu and asks: “Unsang klase nga pagkaon imong gusto?”' },
    trophyWord: { word: 'putahe', meaning: { de: 'Gericht', en: 'dish' }, example: 'Daghan og lami nga putahe dinhi.', whyThisWord: { de: 'Putahe ist das Alltagswort für ein Gericht — genau das, wonach du am Tresen fragst.', en: 'Putahe is the everyday word for a dish — exactly what you are asking about at the counter.' } },
    distractors: ['usa ka kape', 'mahal kaayo'], placeholderCaption: { de: 'Eine Bedienung hält eine offene Speisekarte über einen kleinen Restauranttisch.', en: 'A server holds an open menu over a small restaurant table.' }, songMood: 'a bright first recommendation over a simple local menu', visualNotes: 'Small Cebu eatery, open menu, server waiting while two affordable dishes sit on a nearby counter.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sige-kana-na-lang', title: { de: 'Die Empfehlung annehmen', en: 'Accepting the recommendation' },
    situation: { de: 'Die Bedienung empfiehlt das beliebteste Gericht des Hauses. Du nimmst den Vorschlag freundlich an.', en: 'The server recommends the house favorite. Accept the suggestion politely.' },
    pedagogicalGoal: 'Eine Serviceempfehlung mit Sige annehmen und die Wahl mit kay mas lami begründen.',
    targetText: 'Sige, kana na lang, palihug, kay mas lami.', baseText: { de: 'Gut, dann nehme ich das bitte, weil es leckerer ist.', en: 'All right, I will take that one, please, because it is tastier.' },
    chunks: [{ targetText: 'Sige, kana na lang,', baseText: { de: 'Gut, dann nehme ich das,', en: 'All right, I will take that one,' } }, { targetText: 'palihug,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'kay mas lami.', baseText: { de: 'weil es leckerer ist.', en: 'because it is tastier.' } }],
    terms: [{ targetText: 'Sige', baseText: { de: 'gut; einverstanden', en: 'all right; agreed' } }, { targetText: 'kana', baseText: { de: 'jenes; das dort', en: 'that one' } }, { targetText: 'na lang', baseText: { de: 'dann lieber; stattdessen', en: 'then; instead' } }, { targetText: 'mas lami', baseText: { de: 'leckerer', en: 'tastier' } }, { targetText: 'palihug', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: '', answer: 'Sige', after: ', kana na lang, palihug, kay mas lami.', fallbackChoices: ['Sige', 'Dili', 'Tingali', 'Unya'] }, speakRequired: ['sige', 'lang', 'lami'],
    sceneCaption: { de: 'Die Bedienung zeigt auf das Tagesgericht und sagt: „Mao ni ang among pinakalami nga putahe.“', en: 'The server points to the daily special and says: “Mao ni ang among pinakalami nga putahe.”' },
    trophyWord: { word: 'sige', meaning: { de: 'gut; einverstanden', en: 'all right; agreed' }, example: 'Sige, kana na lang akong kan-on.', whyThisWord: { de: 'Mit diesem Wort nimmst du einen Vorschlag sofort an, ohne dabei schroff zu klingen.', en: 'This word lets you accept a suggestion immediately without sounding abrupt.' } },
    distractors: ['dili kana', 'duha ka putahe'], placeholderCaption: { de: 'Eine Schale des Tagesgerichts steht zwischen der Bedienung und dem Gast.', en: 'A bowl of the daily special sits between the server and the guest.' }, songMood: 'an easy yes to a trusted house recommendation', visualNotes: 'Restaurant counter, daily dish under warm light, server pointing while the customer nods.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'pinakanindot-nga-dapit', title: { de: 'Ein schöner Ort zum Spazieren', en: 'A nice place to walk' },
    situation: { de: 'Am Informationsschalter fragt die Mitarbeiterin, welche Art von Ausflug du suchst. Du fragst nach dem schönsten Ort für einen Spaziergang.', en: 'At an information desk, the clerk asks what kind of outing you want. Ask for the nicest place to take a walk.' },
    pedagogicalGoal: 'Mit pinaka- eine herausgehobene Empfehlung für einen Ort erfragen.',
    targetText: 'Asa ang pinakanindot nga dapit para maglakaw dinhi?', baseText: { de: 'Wo ist hier der schönste Ort zum Spazierengehen?', en: 'Where is the nicest place to take a walk here?' },
    chunks: [{ targetText: 'Asa ang pinakanindot nga dapit', baseText: { de: 'Wo ist der schönste Ort', en: 'Where is the nicest place' } }, { targetText: 'para maglakaw', baseText: { de: 'zum Spazierengehen', en: 'to take a walk' } }, { targetText: 'dinhi?', baseText: { de: 'hier?', en: 'here?' } }],
    terms: [{ targetText: 'pinakanindot', baseText: { de: 'am schönsten', en: 'nicest; most beautiful' } }, { targetText: 'dapit', baseText: { de: 'Ort; Gegend', en: 'place; area' } }, { targetText: 'maglakaw', baseText: { de: 'spazieren gehen', en: 'take a walk' } }, { targetText: 'para', baseText: { de: 'für; um zu', en: 'for; in order to' } }, { targetText: 'Asa', baseText: { de: 'wo', en: 'where' } }],
    recall: { before: 'Asa ang pinakanindot nga ', answer: 'dapit', after: ' para maglakaw dinhi?', fallbackChoices: ['dapit', 'dalan', 'tindahan', 'kwarto'] }, speakRequired: ['pinakanindot', 'dapit', 'maglakaw'],
    sceneCaption: { de: 'Die Mitarbeiterin zeigt auf einen Stadtplan und fragt: „Nangita ka og dapit para maglakaw?“', en: 'The clerk points to a city map and asks: “Nangita ka og dapit para maglakaw?”' },
    trophyWord: { word: 'dapit', meaning: { de: 'Ort; Gegend', en: 'place; area' }, example: 'Hilom kining dapit para maglakaw.', whyThisWord: { de: 'Das Ortswort macht aus einer allgemeinen Freizeitfrage die Suche nach einem konkreten Ziel.', en: 'This place word turns a general leisure question into a search for a concrete destination.' } },
    distractors: ['sakay og taksi', 'sulod sa mall'], placeholderCaption: { de: 'Auf einem Stadtplan sind ein Park und mehrere Spazierwege markiert.', en: 'A park and several walking routes are marked on a city map.' }, songMood: 'a curious city walk beginning with one clear recommendation', visualNotes: 'Tourist information desk, city map, green park marker and a short riverside walking route.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'parke-tapad-sa-suba', title: { de: 'Der Park am Fluss', en: 'The riverside park' },
    situation: { de: 'Die Mitarbeiterin fragt, wie der empfohlene Park ist. Du beschreibst ihn als ruhig und sauber und nennst seine Lage.', en: 'The clerk asks what the recommended park is like. Describe it as quiet and clean and state its location.' },
    pedagogicalGoal: 'Zwei Adjektive mit ug verbinden und einen Ort mit tapad sa genau einordnen.',
    targetText: 'Hilom ug limpyo ang parke, tapad sa suba.', baseText: { de: 'Der Park ist ruhig und sauber, direkt neben dem Fluss.', en: 'The park is quiet and clean, right beside the river.' },
    chunks: [{ targetText: 'Hilom ug limpyo', baseText: { de: 'Ruhig und sauber', en: 'Quiet and clean' } }, { targetText: 'ang parke,', baseText: { de: 'ist der Park,', en: 'is the park,' } }, { targetText: 'tapad sa suba.', baseText: { de: 'direkt neben dem Fluss.', en: 'right beside the river.' } }],
    terms: [{ targetText: 'limpyo', baseText: { de: 'sauber', en: 'clean' } }, { targetText: 'hilom', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'parke', baseText: { de: 'Park', en: 'park' } }, { targetText: 'tapad sa', baseText: { de: 'direkt neben', en: 'right beside' } }, { targetText: 'suba', baseText: { de: 'Fluss', en: 'river' } }],
    recall: { before: 'Hilom ug limpyo ang parke, tapad sa ', answer: 'suba', after: '.', fallbackChoices: ['suba', 'dalan', 'hotel', 'merkado'] }, speakRequired: ['hilom', 'limpyo', 'suba'],
    sceneCaption: { de: 'Die Mitarbeiterin tippt auf den Park und fragt: „Kumusta ang parke didto?“', en: 'The clerk taps the park on the map and asks: “Kumusta ang parke didto?”' },
    trophyWord: { word: 'suba', meaning: { de: 'Fluss', en: 'river' }, example: 'Tapad sa suba ang hilom nga parke.', whyThisWord: { de: 'Der Fluss ist der sichtbare Orientierungspunkt, mit dem du die Lage des Parks eindeutig beschreibst.', en: 'The river is the visible landmark that lets you describe the park location clearly.' } },
    distractors: ['saba ug hugaw', 'atubangan sa mall'], placeholderCaption: { de: 'Ein sauberer, stiller Parkweg verläuft unmittelbar an einem Fluss.', en: 'A clean, quiet park path runs directly beside a river.' }, songMood: 'a calm green pause beside the moving river', visualNotes: 'Riverside park, clean path, shaded benches and quiet water just beyond the rail.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'pinakaduol-nga-kapihan', title: { de: 'Das beste Café in der Nähe', en: 'The best nearby cafe' },
    situation: { de: 'Am Hotelschalter fragt die Mitarbeiterin, ob du Kaffee oder Essen suchst. Du fragst nach dem nächsten Café mit besonders gutem Kaffee.', en: 'At the hotel desk, the clerk asks whether you want coffee or food. Ask for the nearest cafe with especially good coffee.' },
    pedagogicalGoal: 'Mit pinakaduol und pinakalami zwei Superlative in einer Empfehlungssuche verwenden.',
    targetText: 'Asa ang pinakaduol nga kapihan? Gusto ko og pinakalami nga kape.', baseText: { de: 'Wo ist das nächste Café? Ich möchte den leckersten Kaffee.', en: 'Where is the nearest cafe? I want the tastiest coffee.' },
    chunks: [{ targetText: 'Asa ang pinakaduol nga kapihan?', baseText: { de: 'Wo ist das nächste Café?', en: 'Where is the nearest cafe?' } }, { targetText: 'Gusto ko', baseText: { de: 'Ich möchte', en: 'I want' } }, { targetText: 'og pinakalami nga kape.', baseText: { de: 'den leckersten Kaffee.', en: 'the tastiest coffee.' } }],
    terms: [{ targetText: 'pinakaduol', baseText: { de: 'am nächsten', en: 'nearest' } }, { targetText: 'kapihan', baseText: { de: 'Café; Kaffeehaus', en: 'cafe; coffee shop' } }, { targetText: 'pinakalami', baseText: { de: 'am leckersten', en: 'tastiest' } }, { targetText: 'kape', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'Gusto ko', baseText: { de: 'ich möchte', en: 'I want' } }],
    recall: { before: 'Asa ang ', answer: 'pinakaduol', after: ' nga kapihan? Gusto ko og pinakalami nga kape.', fallbackChoices: ['pinakaduol', 'pinakalayo', 'pinakadako', 'pinakahilom'] }, speakRequired: ['pinakaduol', 'kapihan', 'pinakalami'],
    sceneCaption: { de: 'Die Hotelmitarbeiterin zeigt zur Straße und fragt: „Gusto ka og kape o pagkaon?“', en: 'The hotel clerk points toward the street and asks: “Gusto ka og kape o pagkaon?”' },
    trophyWord: { word: 'pinakaduol', meaning: { de: 'am nächsten', en: 'nearest' }, example: 'Kini ang pinakaduol nga kapihan sa hotel.', whyThisWord: { de: 'Der Superlativ hilft dir, aus mehreren Möglichkeiten die mit dem kürzesten Weg auszuwählen.', en: 'This superlative helps you choose the option with the shortest walk from several possibilities.' } },
    distractors: ['layo sa hotel', 'tubig nga bugnaw'], placeholderCaption: { de: 'Eine Hotelkarte zeigt ein Café gleich hinter der nächsten Straßenecke.', en: 'A hotel map shows a cafe just beyond the next street corner.' }, songMood: 'a nearby coffee search with the best cup in mind', visualNotes: 'Hotel desk map, nearest cafe circled, coffee cup icon and a short route out the lobby.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'pasalubong-para-sa-higala', title: { de: 'Ein Geschenk für einen Freund', en: 'A gift for a friend' },
    situation: { de: 'In einem Souvenirladen fragt die Verkäuferin, für wen das Geschenk gedacht ist. Du bittest um eine gute Geschenkidee für deinen Freund.', en: 'At a souvenir shop, the clerk asks who the gift is for. Ask for a good gift idea for your friend.' },
    pedagogicalGoal: 'Mit Unsa may nindot nga pasalubong nach einer passenden Geschenkempfehlung fragen.',
    targetText: 'Unsa may nindot nga pasalubong para sa akong higala?', baseText: { de: 'Was wäre ein schönes Mitbringsel für meinen Freund?', en: 'What would be a nice gift for my friend?' },
    chunks: [{ targetText: 'Unsa may nindot nga pasalubong', baseText: { de: 'Was wäre ein schönes Mitbringsel', en: 'What would be a nice gift' } }, { targetText: 'para sa akong', baseText: { de: 'für meinen', en: 'for my' } }, { targetText: 'higala?', baseText: { de: 'Freund?', en: 'friend?' } }],
    terms: [{ targetText: 'pasalubong', baseText: { de: 'Mitbringsel; Reisegeschenk', en: 'souvenir gift; travel gift' } }, { targetText: 'higala', baseText: { de: 'Freund; Freundin', en: 'friend' } }, { targetText: 'para sa', baseText: { de: 'für', en: 'for' } }, { targetText: 'nindot', baseText: { de: 'schön; gut', en: 'nice; good' } }, { targetText: 'akong', baseText: { de: 'mein', en: 'my' } }],
    recall: { before: 'Unsa may nindot nga ', answer: 'pasalubong', after: ' para sa akong higala?', fallbackChoices: ['pasalubong', 'tambal', 'resibo', 'pliti'] }, speakRequired: ['nindot', 'pasalubong', 'higala'],
    sceneCaption: { de: 'Die Verkäuferin deutet auf das Geschenkregal und fragt: „Para kang kinsa ang regalo?“', en: 'The clerk gestures toward the gift shelf and asks: “Para kang kinsa ang regalo?”' },
    trophyWord: { word: 'pasalubong', meaning: { de: 'Mitbringsel; Reisegeschenk', en: 'souvenir gift; travel gift' }, example: 'Nindot kining pasalubong para sa akong higala.', whyThisWord: { de: 'Das Wort bezeichnet genau das kleine Geschenk, das du von deiner Reise mitbringen möchtest.', en: 'This word names the small gift you want to bring home from your trip.' } },
    distractors: ['para sa akong kwarto', 'usa ka botelya'], placeholderCaption: { de: 'Kleine lokale Geschenke stehen ordentlich in einem Regal neben der Kasse.', en: 'Small local gifts are arranged neatly on a shelf beside the register.' }, songMood: 'a thoughtful souvenir choice for someone back home', visualNotes: 'Souvenir shop, woven gifts and small food packages, clerk helping select one for a friend.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'karinderya-duol-sa-hotel', title: { de: 'Eine typische Garküche', en: 'A typical local eatery' },
    situation: { de: 'An der Hotelrezeption fragt die Mitarbeiterin, ob du in der Nähe essen möchtest. Du fragst nach einer guten Garküche beim Hotel.', en: 'At hotel reception, the clerk asks whether you want to eat nearby. Ask for a good local eatery near the hotel.' },
    pedagogicalGoal: 'Eine Empfehlung für einen typischen Essensort mit maayong und duol sa erfragen.',
    targetText: 'Asa ang maayong karinderya nga duol sa hotel?', baseText: { de: 'Wo ist eine gute Garküche in der Nähe des Hotels?', en: 'Where is a good local eatery near the hotel?' },
    chunks: [{ targetText: 'Asa ang maayong karinderya', baseText: { de: 'Wo ist eine gute Garküche', en: 'Where is a good local eatery' } }, { targetText: 'nga duol', baseText: { de: 'in der Nähe', en: 'that is near' } }, { targetText: 'sa hotel?', baseText: { de: 'des Hotels?', en: 'the hotel?' } }],
    terms: [{ targetText: 'karinderya', baseText: { de: 'einfache Garküche', en: 'local eatery' } }, { targetText: 'maayong', baseText: { de: 'gut; empfehlenswert', en: 'good; recommendable' } }, { targetText: 'duol sa', baseText: { de: 'in der Nähe von', en: 'near' } }, { targetText: 'hotel', baseText: { de: 'Hotel', en: 'hotel' } }, { targetText: 'Asa', baseText: { de: 'wo', en: 'where' } }],
    recall: { before: 'Asa ang maayong ', answer: 'karinderya', after: ' nga duol sa hotel?', fallbackChoices: ['karinderya', 'botika', 'kapihan', 'estasyon'] }, speakRequired: ['maayong', 'karinderya', 'hotel'],
    sceneCaption: { de: 'Die Rezeptionistin blickt zur Hoteltür und fragt: „Gusto ka mokaon duol sa hotel?“', en: 'The receptionist looks toward the hotel door and asks: “Gusto ka mokaon duol sa hotel?”' },
    trophyWord: { word: 'karinderya', meaning: { de: 'einfache Garküche', en: 'local eatery' }, example: 'Lami ug barato ang pagkaon sa karinderya.', whyThisWord: { de: 'Das Wort führt dich zu einem einfachen, typischen Essensort statt zu einem formellen Restaurant.', en: 'This word guides you to a simple, typical place to eat instead of a formal restaurant.' } },
    distractors: ['mahal nga restawran', 'layo sa siyudad'], placeholderCaption: { de: 'Eine kleine Garküche mit offenen Speiseschalen liegt nahe beim Hotel.', en: 'A small local eatery with open food trays sits near the hotel.' }, songMood: 'a local meal waiting just around the hotel corner', visualNotes: 'Modest carinderia, covered dishes, hotel sign visible farther down the same street.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'merkado-luyo-sa-plasa', title: { de: 'Der Nachtmarkt', en: 'The night market' },
    situation: { de: 'Ein Besucher fragt dich, wo er heute Abend günstig essen kann. Du empfiehlst den Nachtmarkt hinter dem Platz.', en: 'A visitor asks where they can eat inexpensively tonight. Recommend the night market behind the plaza.' },
    pedagogicalGoal: 'Selbst eine Empfehlung geben und Lage sowie zwei Eigenschaften des Essens zusammenfassen.',
    targetText: 'Nindot ang merkado sa gabii luyo sa plasa. Lami ug barato ang pagkaon.', baseText: { de: 'Der Nachtmarkt hinter dem Platz ist schön. Das Essen ist lecker und günstig.', en: 'The night market behind the plaza is nice. The food is tasty and inexpensive.' },
    chunks: [{ targetText: 'Nindot ang merkado sa gabii', baseText: { de: 'Der Nachtmarkt ist schön', en: 'The night market is nice' } }, { targetText: 'luyo sa plasa.', baseText: { de: 'hinter dem Platz.', en: 'behind the plaza.' } }, { targetText: 'Lami ug barato ang pagkaon.', baseText: { de: 'Das Essen ist lecker und günstig.', en: 'The food is tasty and inexpensive.' } }],
    terms: [{ targetText: 'merkado', baseText: { de: 'Markt', en: 'market' } }, { targetText: 'sa gabii', baseText: { de: 'am Abend; nachts', en: 'at night' } }, { targetText: 'luyo sa', baseText: { de: 'hinter', en: 'behind' } }, { targetText: 'plasa', baseText: { de: 'Platz', en: 'plaza; square' } }, { targetText: 'barato', baseText: { de: 'günstig', en: 'inexpensive' } }],
    recall: { before: 'Nindot ang ', answer: 'merkado', after: ' sa gabii luyo sa plasa. Lami ug barato ang pagkaon.', fallbackChoices: ['merkado', 'museyo', 'hotel', 'botika'] }, speakRequired: ['merkado', 'plasa', 'barato'],
    sceneCaption: { de: 'Der Besucher schaut die Straße entlang und fragt: „Asa ko makakaon og barato karong gabii?“', en: 'The visitor looks down the street and asks: “Asa ko makakaon og barato karong gabii?”' },
    trophyWord: { word: 'merkado', meaning: { de: 'Markt', en: 'market' }, example: 'Luyo sa plasa ang merkado sa gabii.', whyThisWord: { de: 'Der konkrete Ort macht deine Empfehlung für ein günstiges Abendessen sofort nutzbar.', en: 'This concrete place makes your recommendation for an inexpensive evening meal immediately useful.' } },
    distractors: ['mahal ang pagkaon', 'duol sa baybayon'], placeholderCaption: { de: 'Helle Essensstände füllen einen Nachtmarkt hinter einem öffentlichen Platz.', en: 'Bright food stalls fill a night market behind a public plaza.' }, songMood: 'a lively night market glowing behind the plaza', visualNotes: 'Evening food market, plaza lights in front, rows of affordable dishes and people browsing.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'hinam-is-uban-sa-kape', title: { de: 'Etwas Süßes zum Kaffee', en: 'Something sweet with coffee' },
    situation: { de: 'Die Barista fragt, ob du etwas Süßes möchtest. Du fragst nach der leckersten Begleitung zum Kaffee.', en: 'The barista asks whether you want something sweet. Ask for the tastiest accompaniment to your coffee.' },
    pedagogicalGoal: 'Mit pinakalami nach der besten Wahl fragen und zwei Speisen mit uban sa verbinden.',
    targetText: 'Unsa may pinakalami nga hinam-is uban sa kape?', baseText: { de: 'Was ist die leckerste Süßspeise zum Kaffee?', en: 'What is the tastiest sweet to have with coffee?' },
    chunks: [{ targetText: 'Unsa may pinakalami nga hinam-is', baseText: { de: 'Was ist die leckerste Süßspeise', en: 'What is the tastiest sweet' } }, { targetText: 'uban', baseText: { de: 'zusammen', en: 'together' } }, { targetText: 'sa kape?', baseText: { de: 'mit dem Kaffee?', en: 'with coffee?' } }],
    terms: [{ targetText: 'hinam-is', baseText: { de: 'Süßspeise', en: 'sweet; dessert' } }, { targetText: 'pinakalami', baseText: { de: 'am leckersten', en: 'tastiest' } }, { targetText: 'uban sa', baseText: { de: 'zusammen mit', en: 'together with' } }, { targetText: 'kape', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'Unsa may', baseText: { de: 'was ist denn', en: 'what is' } }],
    recall: { before: 'Unsa may ', answer: 'pinakalami', after: ' nga hinam-is uban sa kape?', fallbackChoices: ['pinakalami', 'pinakabarato', 'pinakaduol', 'pinakagamay'] }, speakRequired: ['pinakalami', 'uban', 'kape'],
    sceneCaption: { de: 'Die Barista zeigt auf die Kuchenvitrine und fragt: „Naa kay gusto nga hinam-is?“', en: 'The barista points to the cake display and asks: “Naa kay gusto nga hinam-is?”' },
    trophyWord: { word: 'uban', meaning: { de: 'zusammen mit; Begleitung', en: 'together with; accompanying' }, example: 'Lami ang hinam-is uban sa kape.', whyThisWord: { de: 'Das Wort verbindet den Kaffee natürlich mit der Süßspeise, die du dazu auswählen möchtest.', en: 'This word naturally links the coffee with the sweet you want to choose alongside it.' } },
    distractors: ['walay asukar', 'duha ka tubig'], placeholderCaption: { de: 'Eine Tasse Kaffee steht neben mehreren kleinen Süßspeisen in einer Vitrine.', en: 'A cup of coffee sits beside several small sweets in a display case.' }, songMood: 'a sweet cafe choice beside a fresh cup of coffee', visualNotes: 'Cafe display, coffee cup, several local sweets and the barista ready to recommend one.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sakto-ang-timpla', title: { de: 'Genau richtig gewürzt', en: 'Seasoned just right' },
    situation: { de: 'Nach dem Essen fragt die Bedienung nach deinem Urteil. Du bedankst dich und lobst Geschmack und Würzung.', en: 'After the meal, the server asks for your verdict. Thank them and praise the flavor and seasoning.' },
    pedagogicalGoal: 'Eine Empfehlung mit einem kurzen Urteil aus lami kaayo und sakto ang timpla abschließen.',
    targetText: 'Salamat, lami kaayo kini. Sakto ang timpla.', baseText: { de: 'Danke, das ist sehr lecker. Die Würzung ist genau richtig.', en: 'Thank you, this is very tasty. The seasoning is just right.' },
    chunks: [{ targetText: 'Salamat,', baseText: { de: 'Danke,', en: 'Thank you,' } }, { targetText: 'lami kaayo kini.', baseText: { de: 'das ist sehr lecker.', en: 'this is very tasty.' } }, { targetText: 'Sakto ang timpla.', baseText: { de: 'Die Würzung ist genau richtig.', en: 'The seasoning is just right.' } }],
    terms: [{ targetText: 'Salamat', baseText: { de: 'danke', en: 'thank you' } }, { targetText: 'lami kaayo', baseText: { de: 'sehr lecker', en: 'very tasty' } }, { targetText: 'Sakto', baseText: { de: 'genau richtig', en: 'just right' } }, { targetText: 'timpla', baseText: { de: 'Würzung; Mischung', en: 'seasoning; blend' } }, { targetText: 'kini', baseText: { de: 'dieses hier', en: 'this' } }],
    recall: { before: 'Salamat, lami kaayo kini. Sakto ang ', answer: 'timpla', after: '.', fallbackChoices: ['timpla', 'presyo', 'sukod', 'kolor'] }, speakRequired: ['salamat', 'lami', 'timpla'],
    sceneCaption: { de: 'Die Bedienung nimmt den leeren Teller entgegen und fragt: „Kumusta ang pagkaon?“', en: 'The server takes the empty plate and asks: “Kumusta ang pagkaon?”' },
    trophyWord: { word: 'timpla', meaning: { de: 'Würzung; Mischung', en: 'seasoning; blend' }, example: 'Sakto ang timpla sa sabaw.', whyThisWord: { de: 'Das Wort macht dein Lob genauer als ein allgemeines Kompliment und bezieht es auf die Würzung.', en: 'This word makes your praise more specific than a general compliment by focusing on the seasoning.' } },
    distractors: ['mahal kaayo kini', 'kulang og asin'], placeholderCaption: { de: 'Ein leerer Teller und eine kleine Schale mit Gewürzen stehen auf dem Tisch.', en: 'An empty plate and a small bowl of seasonings rest on the table.' }, songMood: 'a satisfied verdict after a well-seasoned local meal', visualNotes: 'Restaurant table after the meal, empty plate, seasoning bowl and server listening to the verdict.',
  }),
]

export const CEBUANO_A2_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_SEVEN_METADATA, cebuanoA2Practical7Inputs,
  { de: 'Du hast Cebuano A2 Praxis 7 abgeschlossen und kannst Empfehlungen einholen, beschreiben und selbst weitergeben.', en: 'You have completed Cebuano A2 Practical 7 and can ask for, describe, and share recommendations.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-8', title: 'Cebuano A2 Praxis 8', shortTitle: 'A2 Praxis 8',
  subtitle: { de: 'Gefühle, Wetter und Neuigkeiten im Gespräch mit Freunden', en: 'Feelings, weather, and news in conversations with friends' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical8Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'nindot-kaayo-uy', title: { de: 'Das sind tolle Neuigkeiten', en: 'That is great news' },
    situation: { de: 'Dein Freund erzählt dir von seiner neuen Arbeit. Du reagierst begeistert und freust dich für ihn.', en: 'Your friend tells you about a new job. React enthusiastically and show that you are happy for them.' },
    pedagogicalGoal: 'Auf gute Nachrichten mit nindot kaayo und dem freundschaftlichen uy spontan reagieren.',
    targetText: 'Mao ba? Nindot kaayo na, uy! Maayo gyud para nimo.', baseText: { de: 'Wirklich? Das sind tolle Neuigkeiten! Das ist wirklich gut für dich.', en: 'Really? That is great news! That is very good for you.' },
    chunks: [{ targetText: 'Mao ba?', baseText: { de: 'Wirklich?', en: 'Really?' } }, { targetText: 'Nindot kaayo na, uy!', baseText: { de: 'Das sind tolle Neuigkeiten!', en: 'That is great news!' } }, { targetText: 'Maayo gyud para nimo.', baseText: { de: 'Das ist wirklich gut für dich.', en: 'That is very good for you.' } }],
    terms: [{ targetText: 'Mao ba', baseText: { de: 'wirklich; ist das so', en: 'really; is that so' } }, { targetText: 'Nindot kaayo', baseText: { de: 'sehr schön; großartig', en: 'very nice; great' } }, { targetText: 'uy', baseText: { de: 'hey; Mensch', en: 'hey; wow' } }, { targetText: 'gyud', baseText: { de: 'wirklich; ganz bestimmt', en: 'really; definitely' } }, { targetText: 'para nimo', baseText: { de: 'für dich', en: 'for you' } }, { targetText: 'Maayo', baseText: { de: 'gut; schön', en: 'good; nice' } }],
    recall: { before: 'Mao ba? Nindot kaayo na, uy! Maayo ', answer: 'gyud', after: ' para nimo.', fallbackChoices: ['gyud', 'tingali', 'usab', 'karon'] }, speakRequired: ['nindot', 'maayo', 'gyud'],
    sceneCaption: { de: 'Dein Freund lächelt breit und sagt: „Naa koy bag-ong trabaho!“', en: 'Your friend smiles broadly and says: “Naa koy bag-ong trabaho!”' },
    trophyWord: { word: 'gyud', meaning: { de: 'wirklich; ganz bestimmt', en: 'really; definitely' }, example: 'Maayo gyud ang balita nimo.', whyThisWord: { de: 'Der Verstärker macht deine Freude über die Nachricht ehrlich und deutlich.', en: 'This intensifier makes your happiness about the news sound sincere and clear.' } },
    distractors: ['dili maayo', 'para sa trabaho'], placeholderCaption: { de: 'Zwei Freunde stehen vor einem Café, und einer zeigt glücklich auf eine neue Arbeitskarte.', en: 'Two friends stand outside a cafe, and one happily shows a new work card.' }, songMood: 'a burst of shared happiness over good news', visualNotes: 'Friendly sidewalk conversation, bright smile, new employee card and an immediate warm reaction.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'init-lagi-bugnaw-tubig', title: { de: 'Ein heißer Tag', en: 'A hot day' },
    situation: { de: 'Dein Freund bemerkt die starke Hitze. Du stimmst zu und sagst, dass du kaltes Wasser brauchst.', en: 'Your friend comments on the strong heat. Agree and say that you need cold water.' },
    pedagogicalGoal: 'Mit init kaayo über das Wetter sprechen und mit lagi freundschaftlich zustimmen.',
    targetText: 'Init lagi kaayo karon. Kinahanglan ko og bugnaw nga tubig.', baseText: { de: 'Es ist heute wirklich heiß. Ich brauche kaltes Wasser.', en: 'It really is hot today. I need cold water.' },
    chunks: [{ targetText: 'Init lagi kaayo karon.', baseText: { de: 'Es ist heute wirklich heiß.', en: 'It really is hot today.' } }, { targetText: 'Kinahanglan ko og', baseText: { de: 'Ich brauche', en: 'I need' } }, { targetText: 'bugnaw nga tubig.', baseText: { de: 'kaltes Wasser.', en: 'cold water.' } }],
    terms: [{ targetText: 'Init kaayo', baseText: { de: 'sehr heiß', en: 'very hot' } }, { targetText: 'lagi', baseText: { de: 'allerdings; genau', en: 'indeed; exactly' } }, { targetText: 'bugnaw', baseText: { de: 'kalt', en: 'cold' } }, { targetText: 'tubig', baseText: { de: 'Wasser', en: 'water' } }, { targetText: 'Kinahanglan', baseText: { de: 'brauchen; nötig', en: 'need; necessary' } }],
    recall: { before: 'Init lagi kaayo karon. Kinahanglan ko og ', answer: 'bugnaw', after: ' nga tubig.', fallbackChoices: ['bugnaw', 'init', 'tam-is', 'gamay'] }, speakRequired: ['init', 'bugnaw', 'tubig'],
    sceneCaption: { de: 'Dein Freund wischt sich die Stirn und fragt: „Init kaayo karon?“', en: 'Your friend wipes their forehead and asks: “Init kaayo karon?”' },
    trophyWord: { word: 'bugnaw', meaning: { de: 'kalt', en: 'cold' }, example: 'Bugnaw nga tubig ang akong kinahanglan.', whyThisWord: { de: 'Das Adjektiv benennt genau die Erfrischung, die du an einem heißen Tag suchst.', en: 'This adjective names the exact refreshment you want on a hot day.' } },
    distractors: ['init nga kape', 'daghang asukar'], placeholderCaption: { de: 'Zwei Freunde suchen im Schatten Schutz, während eine kalte Wasserflasche beschlägt.', en: 'Two friends shelter in the shade while condensation forms on a cold water bottle.' }, songMood: 'a hot afternoon relieved by cold water', visualNotes: 'Sunny Cebu street, friends in shade, cold bottle with condensation and strong midday light.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'wala-katulog-katulgon', title: { de: 'Heute sehr schläfrig', en: 'Very sleepy today' },
    situation: { de: 'Dein Freund sieht dich gähnen und fragt, warum du so schläfrig bist. Du erzählst, dass du letzte Nacht schlecht geschlafen hast.', en: 'Your friend sees you yawning and asks why you are so sleepy. Say that you did not sleep well last night.' },
    pedagogicalGoal: 'Einen abgeschlossenen negativen Rückblick mit wala ko katulog und den heutigen Zustand mit katulgon ausdrücken.',
    targetText: 'Wala ko katulog og maayo kagabii. Katulgon kaayo ko karon.', baseText: { de: 'Ich habe letzte Nacht nicht gut geschlafen. Heute bin ich sehr schläfrig.', en: 'I did not sleep well last night. I am very sleepy today.' },
    chunks: [{ targetText: 'Wala ko katulog og maayo', baseText: { de: 'Ich habe nicht gut geschlafen', en: 'I did not sleep well' } }, { targetText: 'kagabii.', baseText: { de: 'letzte Nacht.', en: 'last night.' } }, { targetText: 'Katulgon kaayo ko karon.', baseText: { de: 'Heute bin ich sehr schläfrig.', en: 'I am very sleepy today.' } }],
    terms: [{ targetText: 'Wala ko katulog', baseText: { de: 'ich habe nicht geschlafen', en: 'I did not sleep' } }, { targetText: 'kagabii', baseText: { de: 'letzte Nacht', en: 'last night' } }, { targetText: 'Katulgon', baseText: { de: 'schläfrig', en: 'sleepy' } }, { targetText: 'og maayo', baseText: { de: 'gut', en: 'well' } }, { targetText: 'karon', baseText: { de: 'heute; jetzt', en: 'today; now' } }],
    recall: { before: 'Wala ko katulog og maayo kagabii. ', answer: 'Katulgon', after: ' kaayo ko karon.', fallbackChoices: ['Katulgon', 'Gutom', 'Busog', 'Lipay'] }, speakRequired: ['katulog', 'kagabii', 'katulgon'],
    sceneCaption: { de: 'Dein Freund bemerkt dein Gähnen und fragt: „Ngano katulgon ka karon?“', en: 'Your friend notices you yawning and asks: “Ngano katulgon ka karon?”' },
    trophyWord: { word: 'katulgon', meaning: { de: 'schläfrig', en: 'sleepy' }, example: 'Katulgon kaayo ko human sa mubo nga tulog.', whyThisWord: { de: 'Das Zustandswort verbindet die schlechte Nacht direkt mit deinem Gefühl am heutigen Tag.', en: 'This state word connects the poor night directly with how you feel today.' } },
    distractors: ['maayo akong tulog', 'kusog kaayo karon'], placeholderCaption: { de: 'Ein müder Freund gähnt über einer noch unberührten Tasse am Morgen.', en: 'A tired friend yawns over an untouched cup in the morning.' }, songMood: 'a sleepy morning after a restless night', visualNotes: 'Morning cafe table, visible yawn, heavy eyes and a cup waiting to help.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'daghang-trabaho-kaya-ra', title: { de: 'Eine arbeitsreiche Woche', en: 'A busy week' },
    situation: { de: 'Dein Freund fragt, wie deine Arbeitswoche läuft. Du sagst, dass du viel zu tun hast, aber damit zurechtkommst.', en: 'Your friend asks how your workweek is going. Say that you have a lot of work but can manage it.' },
    pedagogicalGoal: 'Einen intensiven gegenwärtigen Zustand mit daghan kaayo beschreiben und mit pero kaya ra relativieren.',
    targetText: 'Daghan kaayo kog trabaho karong semanaha, pero kaya ra.', baseText: { de: 'Ich habe diese Woche sehr viel Arbeit, aber ich komme zurecht.', en: 'I have a lot of work this week, but I can manage.' },
    chunks: [{ targetText: 'Daghan kaayo kog trabaho', baseText: { de: 'Ich habe sehr viel Arbeit', en: 'I have a lot of work' } }, { targetText: 'karong semanaha,', baseText: { de: 'diese Woche,', en: 'this week,' } }, { targetText: 'pero kaya ra.', baseText: { de: 'aber ich komme zurecht.', en: 'but I can manage.' } }],
    terms: [{ targetText: 'Daghan kaayo', baseText: { de: 'sehr viel', en: 'a lot' } }, { targetText: 'trabaho', baseText: { de: 'Arbeit', en: 'work' } }, { targetText: 'karong semanaha', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: 'pero', baseText: { de: 'aber', en: 'but' } }, { targetText: 'kaya ra', baseText: { de: 'es ist zu schaffen', en: 'it is manageable' } }],
    recall: { before: 'Daghan kaayo kog trabaho karong semanaha, pero ', answer: 'kaya', after: ' ra.', fallbackChoices: ['kaya', 'kapoy', 'guba', 'sayop'] }, speakRequired: ['daghan', 'trabaho', 'kaya'],
    sceneCaption: { de: 'Dein Freund klappt seinen Kalender zu und fragt: „Kumusta imong semana sa trabaho?“', en: 'Your friend closes their calendar and asks: “Kumusta imong semana sa trabaho?”' },
    trophyWord: { word: 'kaya', meaning: { de: 'schaffen; bewältigen können', en: 'manage; be able to handle' }, example: 'Daghan ang buluhaton, pero kaya ra.', whyThisWord: { de: 'Das Wort zeigt, dass die Woche anstrengend ist, ohne dass du dich davon überwältigt fühlst.', en: 'This word shows that the week is demanding without making you sound overwhelmed.' } },
    distractors: ['walay trabaho', 'dugay nga bakasyon'], placeholderCaption: { de: 'Ein voller Wochenkalender liegt zwischen zwei Freunden auf dem Tisch.', en: 'A full weekly calendar lies on the table between two friends.' }, songMood: 'a busy week held together with quiet confidence', visualNotes: 'Friends at a table, crowded planner, work notes and a calm reassuring expression.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'ulan-na-pud-bitaw', title: { de: 'Schon wieder Regen', en: 'Rain again' },
    situation: { de: 'Dein Freund bemerkt, dass es wieder regnet. Du stimmst zu und sagst, dass du später einen Regenschirm mitnimmst.', en: 'Your friend notices that it is raining again. Agree and say that you will bring an umbrella later.' },
    pedagogicalGoal: 'Mit ulan na pud auf wiederkehrendes Wetter reagieren und eine spätere Absicht mit mag- plus unya nennen.',
    targetText: 'Bitaw, ulan na pud. Magdala ko og payong unya.', baseText: { de: 'Stimmt, es regnet schon wieder. Ich nehme später einen Schirm mit.', en: 'It really is raining again. I will bring an umbrella later.' },
    chunks: [{ targetText: 'Bitaw,', baseText: { de: 'Stimmt,', en: 'Right,' } }, { targetText: 'ulan na pud.', baseText: { de: 'es regnet schon wieder.', en: 'it is raining again.' } }, { targetText: 'Magdala ko og payong unya.', baseText: { de: 'Ich nehme später einen Schirm mit.', en: 'I will bring an umbrella later.' } }],
    terms: [{ targetText: 'Ulan', baseText: { de: 'Regen; es regnet', en: 'rain; it is raining' } }, { targetText: 'na pud', baseText: { de: 'schon wieder', en: 'again' } }, { targetText: 'bitaw', baseText: { de: 'tatsächlich; stimmt', en: 'indeed; true' } }, { targetText: 'Magdala', baseText: { de: 'mitnehmen werden', en: 'will bring' } }, { targetText: 'payong', baseText: { de: 'Regenschirm', en: 'umbrella' } }],
    recall: { before: 'Bitaw, ', answer: 'ulan', after: ' na pud. Magdala ko og payong unya.', fallbackChoices: ['ulan', 'init', 'hangin', 'adlaw'] }, speakRequired: ['ulan', 'magdala', 'payong'],
    sceneCaption: { de: 'Dein Freund schaut zu den ersten Tropfen und sagt: „Nagsugod na ang ulan.“', en: 'Your friend looks at the first drops and says: “Nagsugod na ang ulan.”' },
    trophyWord: { word: 'ulan', meaning: { de: 'Regen; es regnet', en: 'rain; it is raining' }, example: 'Ulan na pud karong hapon.', whyThisWord: { de: 'Das Wetterwort eröffnet eine natürliche Reaktion auf das, was ihr beide gerade draußen seht.', en: 'This weather word opens a natural reaction to what you can both see outside.' } },
    distractors: ['ibilin ang payong', 'init kaayo karon'], placeholderCaption: { de: 'Regentropfen laufen an einer Caféscheibe hinab, neben der ein Regenschirm lehnt.', en: 'Raindrops run down a cafe window beside a waiting umbrella.' }, songMood: 'rain returning while an umbrella waits by the door', visualNotes: 'Cafe window, fresh rain, umbrella near the entrance and friends watching the weather turn.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sayang-kaayo', title: { de: 'Wie schade', en: 'What a shame' },
    situation: { de: 'Dein Freund erzählt, dass seine Reise nicht stattfinden kann. Du reagierst mitfühlend und hoffst, dass sonst alles in Ordnung ist.', en: 'Your friend says that their trip cannot go ahead. React sympathetically and hope that everything else is all right.' },
    pedagogicalGoal: 'Mit Sayang kaayo auf schlechte Nachrichten reagieren und mit unta einen sanften Wunsch äußern.',
    targetText: 'Sayang kaayo. Maayo ra unta ang tanan.', baseText: { de: 'Wie schade. Hoffentlich ist sonst alles in Ordnung.', en: 'What a shame. I hope everything else is all right.' },
    chunks: [{ targetText: 'Sayang kaayo.', baseText: { de: 'Wie schade.', en: 'What a shame.' } }, { targetText: 'Maayo ra unta', baseText: { de: 'Hoffentlich ist', en: 'I hope' } }, { targetText: 'ang tanan.', baseText: { de: 'sonst alles in Ordnung.', en: 'everything else is all right.' } }],
    terms: [{ targetText: 'Sayang', baseText: { de: 'schade', en: 'what a shame' } }, { targetText: 'kaayo', baseText: { de: 'sehr', en: 'very' } }, { targetText: 'unta', baseText: { de: 'hoffentlich; wäre doch', en: 'hopefully; if only' } }, { targetText: 'Maayo ra', baseText: { de: 'in Ordnung', en: 'all right' } }, { targetText: 'tanan', baseText: { de: 'alles', en: 'everything' } }],
    recall: { before: '', answer: 'Sayang', after: ' kaayo. Maayo ra unta ang tanan.', fallbackChoices: ['Sayang', 'Sige', 'Salamat', 'Tingali'] }, speakRequired: ['sayang', 'maayo', 'unta'],
    sceneCaption: { de: 'Dein Freund senkt den Blick und sagt: „Dili na madayon ang among biyahe.“', en: 'Your friend looks down and says: “Dili na madayon ang among biyahe.”' },
    trophyWord: { word: 'sayang', meaning: { de: 'schade', en: 'what a shame' }, example: 'Dili madayon ang biyahe; sayang kaayo.', whyThisWord: { de: 'Mit diesem kurzen Reaktionswort zeigst du sofort Mitgefühl, ohne die schlechte Nachricht zu dramatisieren.', en: 'This short reaction word shows sympathy immediately without dramatizing the bad news.' } },
    distractors: ['nindot kaayo', 'maayo ang biyahe'], placeholderCaption: { de: 'Zwei Freunde sitzen ruhig zusammen, während ein unbenutztes Reiseticket auf dem Tisch liegt.', en: 'Two friends sit quietly together while an unused travel ticket rests on the table.' }, songMood: 'a gentle sympathetic pause after disappointing news', visualNotes: 'Quiet friend conversation, travel ticket set aside and a warm attentive expression.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'lingaw-ang-mga-adlaw', title: { de: 'Eigentlich ganz gut', en: 'Pretty good overall' },
    situation: { de: 'Dein Freund fragt, wie es dir in letzter Zeit geht. Du sagst, dass alles gut ist und deine Tage gerade unterhaltsam sind.', en: 'Your friend asks how things have been lately. Say that everything is good and your days are enjoyable now.' },
    pedagogicalGoal: 'Eine lockere Zustandsfrage mit maayo ra beantworten und den Alltag mit lingaw beschreiben.',
    targetText: 'Maayo ra kaayo. Lingaw kaayo ko karon.', baseText: { de: 'Mir geht es ziemlich gut. Ich habe gerade viel Spaß.', en: 'I am doing pretty well. I am having a lot of fun now.' },
    chunks: [{ targetText: 'Maayo ra kaayo.', baseText: { de: 'Mir geht es ziemlich gut.', en: 'I am doing pretty well.' } }, { targetText: 'Lingaw kaayo ko', baseText: { de: 'Ich habe viel Spaß', en: 'I am having a lot of fun' } }, { targetText: 'karon.', baseText: { de: 'gerade.', en: 'now.' } }],
    terms: [{ targetText: 'Maayo ra', baseText: { de: 'ganz gut', en: 'pretty good' } }, { targetText: 'Lingaw', baseText: { de: 'unterhaltsam; vergnüglich', en: 'fun; enjoyable' } }, { targetText: 'mga adlaw', baseText: { de: 'Tage', en: 'days' } }, { targetText: 'akong', baseText: { de: 'meine', en: 'my' } }, { targetText: 'karon', baseText: { de: 'jetzt; gerade', en: 'now' } }],
    recall: { before: 'Maayo ra kaayo. ', answer: 'Lingaw', after: ' kaayo ko karon.', fallbackChoices: ['Lingaw', 'Kapoy', 'Saba', 'Mahal'] }, speakRequired: ['maayo', 'lingaw', 'karon'],
    sceneCaption: { de: 'Dein Freund lehnt sich entspannt zurück und fragt: „Kumusta ang tanan karon?“', en: 'Your friend leans back comfortably and asks: “Kumusta ang tanan karon?”' },
    trophyWord: { word: 'lingaw', meaning: { de: 'unterhaltsam; vergnüglich', en: 'fun; enjoyable' }, example: 'Lingaw kaayo ang akong adlaw dinhi.', whyThisWord: { de: 'Das Wort gibt deiner allgemeinen Antwort eine persönliche, positive Einzelheit.', en: 'This word adds a personal, positive detail to your general answer.' } },
    distractors: ['lisod ang tanan', 'walay oras karon'], placeholderCaption: { de: 'Zwei Freunde unterhalten sich entspannt auf einer ruhigen Terrasse.', en: 'Two friends chat comfortably on a quiet terrace.' }, songMood: 'an easy catch-up about days that feel enjoyable', visualNotes: 'Relaxed terrace, two friends with drinks, open posture and a calm neighborhood background.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'bitaw-lipay-ko', title: { de: 'Das ist wirklich großartig', en: 'That really is wonderful' },
    situation: { de: 'Dein Freund erzählt, dass seine Reise morgen doch stattfindet. Du reagierst erfreut und sagst, dass du dich für ihn freust.', en: 'Your friend says that their trip is going ahead tomorrow after all. React happily and say that you are glad for them.' },
    pedagogicalGoal: 'Mit Bitaw eine starke positive Reaktion eröffnen und den eigenen Zustand mit lipay ausdrücken.',
    targetText: 'Bitaw, maayo kaayo! Lipay gyud ko para nimo.', baseText: { de: 'Wirklich, das ist großartig! Ich freue mich sehr für dich.', en: 'Really, that is wonderful! I am very happy for you.' },
    chunks: [{ targetText: 'Bitaw, maayo kaayo!', baseText: { de: 'Wirklich, das ist großartig!', en: 'Really, that is wonderful!' } }, { targetText: 'Lipay gyud ko', baseText: { de: 'Ich freue mich sehr', en: 'I am very happy' } }, { targetText: 'para nimo.', baseText: { de: 'für dich.', en: 'for you.' } }],
    terms: [{ targetText: 'Bitaw', baseText: { de: 'wirklich; tatsächlich', en: 'really; indeed' } }, { targetText: 'Lipay', baseText: { de: 'froh; glücklich', en: 'happy; glad' } }, { targetText: 'gyud', baseText: { de: 'wirklich; sehr', en: 'really; very' } }, { targetText: 'para nimo', baseText: { de: 'für dich', en: 'for you' } }, { targetText: 'maayo kaayo', baseText: { de: 'großartig', en: 'wonderful' } }],
    recall: { before: 'Bitaw, maayo kaayo! ', answer: 'Lipay', after: ' gyud ko para nimo.', fallbackChoices: ['Lipay', 'Kapoy', 'Gutom', 'Katulgon'] }, speakRequired: ['bitaw', 'lipay', 'nimo'],
    sceneCaption: { de: 'Dein Freund hält die Bestätigung hoch und sagt: „Madayon ang akong biyahe ugma!“', en: 'Your friend holds up the confirmation and says: “Madayon ang akong biyahe ugma!”' },
    trophyWord: { word: 'lipay', meaning: { de: 'froh; glücklich', en: 'happy; glad' }, example: 'Lipay gyud ko para sa akong higala.', whyThisWord: { de: 'Das Zustandswort macht deutlich, dass du die gute Nachricht deines Freundes persönlich mitfreust.', en: 'This state word makes it clear that you personally share your friend’s happiness.' } },
    distractors: ['sayang kaayo', 'dili madayon'], placeholderCaption: { de: 'Ein Freund zeigt strahlend eine bestätigte Reise auf seinem Handy.', en: 'A friend beams while showing a confirmed trip on their phone.' }, songMood: 'good news returning with an even brighter reaction', visualNotes: 'Friends together, travel confirmation on a phone and an immediate joyful response.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'bugnaw-ulan-buntag', title: { de: 'Ein kalter, regnerischer Morgen', en: 'A cold rainy morning' },
    situation: { de: 'Dein Freund fragt nach dem Wetter draußen. Du beschreibst den kalten, regnerischen Morgen und sagst, dass du heißen Kaffee brauchst.', en: 'Your friend asks about the weather outside. Describe the cold rainy morning and say that you need hot coffee.' },
    pedagogicalGoal: 'Zwei Wetterzustände mit ug verbinden und daraus einen gegenwärtigen Bedarf ableiten.',
    targetText: 'Bugnaw ug ulan karong buntag. Kinahanglan kog init nga kape.', baseText: { de: 'Heute Morgen ist es kalt und regnerisch. Ich brauche heißen Kaffee.', en: 'It is cold and rainy this morning. I need hot coffee.' },
    chunks: [{ targetText: 'Bugnaw ug ulan', baseText: { de: 'Kalt und regnerisch', en: 'Cold and rainy' } }, { targetText: 'karong buntag.', baseText: { de: 'ist es heute Morgen.', en: 'this morning.' } }, { targetText: 'Kinahanglan kog init nga kape.', baseText: { de: 'Ich brauche heißen Kaffee.', en: 'I need hot coffee.' } }],
    terms: [{ targetText: 'Bugnaw', baseText: { de: 'kalt', en: 'cold' } }, { targetText: 'ulan', baseText: { de: 'regnerisch; Regen', en: 'rainy; rain' } }, { targetText: 'buntag', baseText: { de: 'Morgen', en: 'morning' } }, { targetText: 'init nga kape', baseText: { de: 'heißer Kaffee', en: 'hot coffee' } }, { targetText: 'Kinahanglan kog', baseText: { de: 'ich brauche', en: 'I need' } }],
    recall: { before: 'Bugnaw ug ulan karong ', answer: 'buntag', after: '. Kinahanglan kog init nga kape.', fallbackChoices: ['buntag', 'hapon', 'gabii', 'semana'] }, speakRequired: ['bugnaw', 'buntag', 'kape'],
    sceneCaption: { de: 'Dein Freund schaut durch das nasse Fenster und fragt: „Kumusta ang panahon sa gawas?“', en: 'Your friend looks through the wet window and asks: “Kumusta ang panahon sa gawas?”' },
    trophyWord: { word: 'buntag', meaning: { de: 'Morgen', en: 'morning' }, example: 'Bugnaw ug ulan karong buntag.', whyThisWord: { de: 'Die Tageszeit verankert deine Wetterbeschreibung genau in diesem kalten Morgen.', en: 'This time of day anchors your weather description in this particular cold morning.' } },
    distractors: ['bugnaw nga tubig', 'init kaayo sa gawas'], placeholderCaption: { de: 'Regen liegt auf dem Fenster, während zwei dampfende Kaffeetassen drinnen stehen.', en: 'Rain covers the window while two steaming cups of coffee sit inside.' }, songMood: 'a warm coffee answer to a cold rainy morning', visualNotes: 'Rainy morning window, warm cafe interior, steaming coffee and friends watching the gray street.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nindot-adlaw-istorya', title: { de: 'Ein schöner Tag zusammen', en: 'A good day together' },
    situation: { de: 'Am Ende eures Treffens fragt dein Freund, wie dein Tag heute läuft. Du beschreibst ihn als schönen Tag mit einem unterhaltsamen Gespräch.', en: 'At the end of your meetup, your friend asks how your day is going. Describe it as a good day with an enjoyable conversation.' },
    pedagogicalGoal: 'Ein freundschaftliches Gespräch mit einer kurzen Wetter- und Gesprächsbewertung abrunden.',
    targetText: 'Nindot nga adlaw karon, no? Lingaw kaayo ang istorya.', baseText: { de: 'Heute ist ein schöner Tag, oder? Das Gespräch ist sehr unterhaltsam.', en: 'It is a lovely day today, right? The conversation is very enjoyable.' },
    chunks: [{ targetText: 'Nindot nga adlaw karon, no?', baseText: { de: 'Heute ist ein schöner Tag, oder?', en: 'It is a lovely day today, right?' } }, { targetText: 'Lingaw kaayo', baseText: { de: 'Sehr unterhaltsam', en: 'Very enjoyable' } }, { targetText: 'ang istorya.', baseText: { de: 'ist das Gespräch.', en: 'is the conversation.' } }],
    terms: [{ targetText: 'Nindot nga adlaw', baseText: { de: 'schöner Tag', en: 'lovely day' } }, { targetText: 'no', baseText: { de: 'oder; nicht wahr', en: 'right; isn’t it' } }, { targetText: 'Lingaw kaayo', baseText: { de: 'sehr unterhaltsam', en: 'very enjoyable' } }, { targetText: 'istorya', baseText: { de: 'Gespräch; Geschichte', en: 'conversation; story' } }, { targetText: 'karon', baseText: { de: 'heute; jetzt', en: 'today; now' } }],
    recall: { before: 'Nindot nga adlaw karon, no? Lingaw kaayo ang ', answer: 'istorya', after: '.', fallbackChoices: ['istorya', 'trabaho', 'biyahe', 'pagkaon'] }, speakRequired: ['nindot', 'lingaw', 'istorya'],
    sceneCaption: { de: 'Dein Freund lächelt zum Abschied und fragt: „Kumusta imong adlaw karon?“', en: 'Your friend smiles as you part and asks: “Kumusta imong adlaw karon?”' },
    trophyWord: { word: 'istorya', meaning: { de: 'Gespräch; Geschichte', en: 'conversation; story' }, example: 'Lingaw kaayo ang among istorya karon.', whyThisWord: { de: 'Das Wort fasst zusammen, was diesen gemeinsamen Tag persönlich und angenehm gemacht hat.', en: 'This word sums up what made the day together feel personal and enjoyable.' } },
    distractors: ['saba ang dalan', 'kapoy kaayo ko'], placeholderCaption: { de: 'Zwei Freunde beenden ein lebhaftes Gespräch im warmen Licht des späten Nachmittags.', en: 'Two friends finish a lively conversation in the warm light of late afternoon.' }, songMood: 'a bright day closing on an easy conversation', visualNotes: 'Late afternoon terrace, friends saying goodbye, empty cups and relaxed smiles after a long chat.',
  }),
]

export const CEBUANO_A2_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_EIGHT_METADATA, cebuanoA2Practical8Inputs,
  { de: 'Du hast Cebuano A2 Praxis 8 abgeschlossen und kannst mit Freunden über Gefühle, Neuigkeiten und Wetter sprechen.', en: 'You have completed Cebuano A2 Practical 8 and can talk with friends about feelings, news, and weather.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_NINE_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-9', title: 'Cebuano A2 Praxis 9', shortTitle: 'A2 Praxis 9',
  subtitle: { de: 'Probleme erklären, bereits Geschehenes nennen und höflich um Lösungen bitten', en: 'Explaining problems, stating what already happened, and asking politely for solutions' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical9Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'shower-dili-mogana', title: { de: 'Die Dusche funktioniert nicht', en: 'The shower does not work' },
    situation: { de: 'An der Hotelrezeption fragt die Mitarbeiterin nach dem Problem im Bad. Du erklärst, dass die Dusche nicht funktioniert, erwähnst deinen früheren Anruf und bittest um Reparatur.', en: 'At hotel reception, the clerk asks about the bathroom problem. Explain that the shower does not work, mention your earlier call, and ask for a repair.' },
    pedagogicalGoal: 'Ein gegenwärtiges Geräteproblem mit dili mogana und eine abgeschlossene Handlung mit nitawag na in derselben Antwort verbinden.',
    targetText: 'Dili mogana ang shower. Nitawag na ko sa reception, palihug ayoha.', baseText: { de: 'Die Dusche funktioniert nicht. Ich habe bereits an der Rezeption angerufen; bitte reparieren Sie sie.', en: 'The shower does not work. I already called reception; please repair it.' },
    chunks: [{ targetText: 'Dili mogana ang shower.', baseText: { de: 'Die Dusche funktioniert nicht.', en: 'The shower does not work.' } }, { targetText: 'Nitawag na ko sa reception,', baseText: { de: 'Ich habe bereits an der Rezeption angerufen;', en: 'I already called reception;' } }, { targetText: 'palihug ayoha.', baseText: { de: 'bitte reparieren Sie sie.', en: 'please repair it.' } }],
    terms: [{ targetText: 'mogana', baseText: { de: 'funktionieren', en: 'work; function' } }, { targetText: 'shower', baseText: { de: 'Dusche', en: 'shower' } }, { targetText: 'Nitawag', baseText: { de: 'hat angerufen', en: 'called' } }, { targetText: 'reception', baseText: { de: 'Rezeption', en: 'reception' } }, { targetText: 'ayoha', baseText: { de: 'reparieren Sie es', en: 'repair it' } }],
    recall: { before: 'Dili ', answer: 'mogana', after: ' ang shower. Nitawag na ko sa reception, palihug ayoha.', fallbackChoices: ['mogana', 'limpyo', 'bugnaw', 'saba'] }, speakRequired: ['mogana', 'shower', 'nitawag'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet den Wartungsplan und fragt: „Unsa ang problema sa shower?“', en: 'The receptionist opens the maintenance log and asks: “Unsa ang problema sa shower?”' },
    trophyWord: { word: 'mogana', meaning: { de: 'funktionieren', en: 'work; function' }, example: 'Dili mogana ang shower sa kwarto.', whyThisWord: { de: 'Das Verb benennt ein technisches Problem klar, ohne dass du die Ursache kennen musst.', en: 'This verb states a technical problem clearly without requiring you to know the cause.' } },
    distractors: ['limpyo ang shower', 'wala koy tualya'], placeholderCaption: { de: 'Eine Rezeptionistin notiert eine defekte Dusche in einem Wartungsbuch.', en: 'A receptionist records a broken shower in a maintenance log.' }, songMood: 'a calm hotel repair request after an unanswered call', visualNotes: 'Hotel reception, maintenance log, shower icon and guest explaining the repeated problem.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'sabaw-wala-pa-moabot', title: { de: 'Die Suppe fehlt noch', en: 'The soup has not arrived' },
    situation: { de: 'Die Bedienung fragt, ob deine Bestellung vollständig ist. Du sagst, dass du die Suppe schon bestellt hast, sie aber noch fehlt, und bittest um Prüfung.', en: 'The server asks whether your order is complete. Say that you already ordered the soup, that it has not arrived, and ask them to check.' },
    pedagogicalGoal: 'Eine abgeschlossene Bestellung mit nahuman na und ein noch bestehendes Problem mit wala pa moabot verbinden.',
    targetText: 'Niabot na ang ubang pagkaon, pero wala pa moabot ang sabaw. Palihug susiha.', baseText: { de: 'Das übrige Essen ist schon da, aber die Suppe ist noch nicht gekommen. Bitte sehen Sie nach.', en: 'The rest of the food has arrived, but the soup has not come yet. Please check.' },
    chunks: [{ targetText: 'Niabot na ang ubang pagkaon,', baseText: { de: 'Das übrige Essen ist schon da,', en: 'The rest of the food has arrived,' } }, { targetText: 'pero wala pa moabot ang sabaw.', baseText: { de: 'aber die Suppe ist noch nicht gekommen.', en: 'but the soup has not come yet.' } }, { targetText: 'Palihug susiha.', baseText: { de: 'Bitte sehen Sie nach.', en: 'Please check.' } }],
    terms: [{ targetText: 'ubang pagkaon', baseText: { de: 'das übrige Essen', en: 'the rest of the food' } }, { targetText: 'wala pa', baseText: { de: 'noch nicht', en: 'not yet' } }, { targetText: 'moabot', baseText: { de: 'ankommen (erwartet)', en: 'to arrive (expected)' } }, { targetText: 'sabaw', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'susiha', baseText: { de: 'prüfen Sie es', en: 'check it' } }],
    recall: { before: 'Niabot na ang ubang pagkaon, pero wala pa moabot ang ', answer: 'sabaw', after: '. Palihug susiha.', fallbackChoices: ['sabaw', 'kape', 'pan', 'prutas'] }, speakRequired: ['niabot', 'sabaw', 'susiha'],
    sceneCaption: { de: 'Die Bedienung schaut auf deinen Tisch und fragt: „Kompleto na ang imong order?“', en: 'The server looks at your table and asks: “Kompleto na ang imong order?”' },
    trophyWord: { word: 'sabaw', meaning: { de: 'Suppe', en: 'soup' }, example: 'Wala pa moabot ang akong sabaw.', whyThisWord: { de: 'Das konkrete Gericht macht sofort deutlich, welcher Teil der Bestellung noch fehlt.', en: 'This specific dish makes it immediately clear which part of the order is still missing.' } },
    distractors: ['kompleto ang order', 'dugang nga pan'], placeholderCaption: { de: 'Auf einem Restauranttisch steht ein leerer Platz neben den bereits servierten Gerichten.', en: 'An empty place remains on a restaurant table beside the dishes already served.' }, songMood: 'a missing soup handled with a clear polite reminder', visualNotes: 'Restaurant table, other dishes present, empty soup place and server checking an order pad.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'wifi-walay-sinyal', title: { de: 'Kein WLAN-Signal', en: 'No wifi signal' },
    situation: { de: 'Die Rezeptionistin fragt, ob das WLAN im Zimmer funktioniert. Du sagst, dass du bereits im Zimmer angekommen bist, dort aber kein Signal hast, und bittest um Prüfung.', en: 'The receptionist asks whether the wifi works in the room. Say that you already reached the room but have no signal there, and ask them to check.' },
    pedagogicalGoal: 'Die abgeschlossene Ankunft mit niabot na und den gegenwärtigen Zustand mit walay sinyal verbinden.',
    targetText: 'Nitawag na ko gikan sa kwarto, pero walay sinyal gihapon ang wifi. Palihug susiha.', baseText: { de: 'Ich habe schon aus dem Zimmer angerufen, aber das WLAN hat immer noch kein Signal. Bitte sehen Sie nach.', en: 'I already called from the room, but the wifi still has no signal. Please check.' },
    chunks: [{ targetText: 'Nitawag na ko gikan sa kwarto,', baseText: { de: 'Ich habe schon aus dem Zimmer angerufen,', en: 'I already called from the room,' } }, { targetText: 'pero walay sinyal gihapon ang wifi.', baseText: { de: 'aber das WLAN hat immer noch kein Signal.', en: 'but the wifi still has no signal.' } }, { targetText: 'Palihug susiha.', baseText: { de: 'Bitte sehen Sie nach.', en: 'Please check.' } }],
    terms: [{ targetText: 'Niabot na', baseText: { de: 'bereits angekommen', en: 'already arrived' } }, { targetText: 'walay sinyal', baseText: { de: 'kein Signal', en: 'no signal' } }, { targetText: 'sinyal', baseText: { de: 'Signal', en: 'signal' } }, { targetText: 'wifi', baseText: { de: 'WLAN', en: 'wifi' }, alsoAccept: ['Wi-Fi'] }, { targetText: 'susiha', baseText: { de: 'prüfen Sie es', en: 'check it' } }],
    recall: { before: 'Nitawag na ko gikan sa kwarto, pero walay ', answer: 'sinyal', after: ' gihapon ang wifi. Palihug susiha.', fallbackChoices: ['sinyal', 'tubig', 'sukli', 'resibo'] }, speakRequired: ['nitawag', 'sinyal', 'wifi'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Netzwerkliste und fragt: „Mogana ba ang wifi sa imong kwarto?“', en: 'The receptionist opens the network list and asks: “Mogana ba ang wifi sa imong kwarto?”' },
    trophyWord: { word: 'sinyal', meaning: { de: 'Signal', en: 'signal' }, example: 'Walay sinyal ang wifi sa kwarto.', whyThisWord: { de: 'Das Wort beschreibt das sichtbare WLAN-Problem genauer als eine allgemeine Beschwerde.', en: 'This word describes the visible wifi problem more precisely than a general complaint.' } },
    distractors: ['kusog ang wifi', 'naa sa lobby'], placeholderCaption: { de: 'Auf einem Handy im Hotelzimmer ist ein WLAN-Symbol ohne Balken zu sehen.', en: 'A phone in a hotel room shows a wifi icon with no signal bars.' }, songMood: 'a quiet connection problem explained at the front desk', visualNotes: 'Hotel room phone screen, empty wifi bars and reception staff checking a network panel.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nawala-ang-yabi', title: { de: 'Der Schlüssel ist weg', en: 'The key is lost' },
    situation: { de: 'An der Rezeption fragt die Mitarbeiterin nach deinem Schlüssel. Du erklärst, dass du ihn verloren hast, nicht ins Zimmer kommst und Hilfe brauchst.', en: 'At reception, the clerk asks about your key. Explain that you lost it, cannot enter the room, and need help.' },
    pedagogicalGoal: 'Ein abgeschlossenes Missgeschick mit nawala und die gegenwärtige Folge mit dili makasulod verbinden.',
    targetText: 'Nawala nako ang yabi. Dili ko makasulod; palihug tabangi ko.', baseText: { de: 'Ich habe meinen Schlüssel verloren. Ich komme nicht hinein; bitte helfen Sie mir.', en: 'I lost my key. I cannot get in; please help me.' },
    chunks: [{ targetText: 'Nawala nako ang yabi.', baseText: { de: 'Ich habe meinen Schlüssel verloren.', en: 'I lost my key.' } }, { targetText: 'Dili ko makasulod;', baseText: { de: 'Ich komme nicht hinein;', en: 'I cannot get in;' } }, { targetText: 'palihug tabangi ko.', baseText: { de: 'bitte helfen Sie mir.', en: 'please help me.' } }],
    terms: [{ targetText: 'Nawala', baseText: { de: 'verloren gegangen', en: 'got lost' } }, { targetText: 'yabi', baseText: { de: 'Schlüssel', en: 'key' } }, { targetText: 'makasulod', baseText: { de: 'hineinkommen können', en: 'be able to enter' } }, { targetText: 'tabangi', baseText: { de: 'helfen Sie', en: 'help' } }, { targetText: 'nako', baseText: { de: 'von mir; mir', en: 'by me; me' } }],
    recall: { before: '', answer: 'Nawala', after: ' nako ang yabi. Dili ko makasulod; palihug tabangi ko.', fallbackChoices: ['Nawala', 'Nipalit', 'Nikaon', 'Niinom'] }, speakRequired: ['nawala', 'yabi', 'makasulod'],
    sceneCaption: { de: 'Die Rezeptionistin schaut auf deine leeren Hände und fragt: „Asa ang imong yabi?“', en: 'The receptionist looks at your empty hands and asks: “Asa ang imong yabi?”' },
    trophyWord: { word: 'nawala', meaning: { de: 'verloren gegangen', en: 'got lost' }, example: 'Nawala nako ang yabi sa kwarto.', whyThisWord: { de: 'Die abgeschlossene Form erklärt sofort, warum du jetzt nicht in dein Zimmer kommst.', en: 'This completed form immediately explains why you cannot enter your room now.' } },
    distractors: ['ania ang yabi', 'abli ang pultahan'], placeholderCaption: { de: 'Ein leerer Schlüsselanhänger liegt vor der Rezeptionistin auf dem Hoteltresen.', en: 'An empty key tag lies on the hotel counter in front of the receptionist.' }, songMood: 'a lost key problem met with a direct request for help', visualNotes: 'Hotel desk, empty key tag, guest unable to enter and receptionist ready to issue help.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'taksi-wala-pa', title: { de: 'Das Taxi ist noch nicht da', en: 'The taxi is not here yet' },
    situation: { de: 'Der Mitarbeiter fragt, ob dein Taxi schon da ist. Du sagst, dass du bereits bezahlt hast, das Taxi aber fehlt, und bittest um ein anderes.', en: 'The clerk asks whether your taxi is already there. Say that you already paid, that the taxi is still missing, and ask them to find another one.' },
    pedagogicalGoal: 'Eine abgeschlossene Zahlung mit nibayad na und ein fortbestehendes Fehlen mit wala pa in einer Beschwerde kombinieren.',
    targetText: 'Nibayad na ko; wala pa ang taksi. Palihug pangita og lain.', baseText: { de: 'Ich habe bereits bezahlt; das Taxi ist noch nicht da. Bitte suchen Sie ein anderes.', en: 'I already paid; the taxi is not here yet. Please find another one.' },
    chunks: [{ targetText: 'Nibayad na ko;', baseText: { de: 'Ich habe bereits bezahlt;', en: 'I already paid;' } }, { targetText: 'wala pa ang taksi.', baseText: { de: 'das Taxi ist noch nicht da.', en: 'the taxi is not here yet.' } }, { targetText: 'Palihug pangita og lain.', baseText: { de: 'Bitte suchen Sie ein anderes.', en: 'Please find another one.' } }],
    terms: [{ targetText: 'Nibayad na', baseText: { de: 'bereits bezahlt', en: 'already paid' } }, { targetText: 'wala pa', baseText: { de: 'noch nicht da', en: 'not here yet' } }, { targetText: 'taksi', baseText: { de: 'Taxi', en: 'taxi' }, alsoAccept: ['taxi'] }, { targetText: 'pangita', baseText: { de: 'suchen Sie', en: 'find; look for' } }, { targetText: 'lain', baseText: { de: 'ein anderes', en: 'another one' } }],
    recall: { before: 'Nibayad na ko; wala pa ang taksi. Palihug ', answer: 'pangita', after: ' og lain.', fallbackChoices: ['pangita', 'bayad', 'sulod', 'balik'] }, speakRequired: ['nibayad', 'taksi', 'pangita'],
    sceneCaption: { de: 'Der Mitarbeiter blickt zum leeren Taxistand und fragt: „Naa na ba ang imong taksi?“', en: 'The clerk looks toward the empty taxi stand and asks: “Naa na ba ang imong taksi?”' },
    trophyWord: { word: 'pangita', meaning: { de: 'suchen; finden', en: 'look for; find' }, example: 'Palihug pangita og lain nga taksi.', whyThisWord: { de: 'Das Verb macht aus der Beschwerde eine klare Bitte um eine sofortige Alternative.', en: 'This verb turns the complaint into a clear request for an immediate alternative.' } },
    distractors: ['moabot na ang taksi', 'wala pa ko mobayad'], placeholderCaption: { de: 'Ein leerer Taxistand ist durch die Glastür eines Serviceschalters zu sehen.', en: 'An empty taxi stand is visible through the glass door of a service desk.' }, songMood: 'a delayed taxi solved by asking for another', visualNotes: 'Transport desk, empty taxi rank, paid receipt and clerk beginning a new search.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'kulang-ang-sukli', title: { de: 'Zu wenig Wechselgeld', en: 'Not enough change' },
    situation: { de: 'Die Kassiererin sagt, dein Wechselgeld stimme. Du erklärst, dass du bereits bezahlt hast, aber fünf Pesos fehlen, und bittest um Prüfung.', en: 'The cashier says your change is correct. Explain that you already paid but five pesos are missing, and ask them to check.' },
    pedagogicalGoal: 'Eine abgeschlossene Zahlung und einen gegenwärtig falschen Betrag mit nibayad na und kulang verbinden.',
    targetText: 'Nibayad na ko, pero kulang og singko pesos ang sukli. Palihug susiha.', baseText: { de: 'Ich habe bereits bezahlt, aber beim Wechselgeld fehlen fünf Pesos. Bitte prüfen Sie es.', en: 'I already paid, but the change is five pesos short. Please check it.' },
    chunks: [{ targetText: 'Nibayad na ko,', baseText: { de: 'Ich habe bereits bezahlt,', en: 'I already paid,' } }, { targetText: 'pero kulang og singko pesos ang sukli.', baseText: { de: 'aber beim Wechselgeld fehlen fünf Pesos.', en: 'but the change is five pesos short.' } }, { targetText: 'Palihug susiha.', baseText: { de: 'Bitte prüfen Sie es.', en: 'Please check it.' } }],
    terms: [{ targetText: 'Nibayad na', baseText: { de: 'bereits bezahlt', en: 'already paid' } }, { targetText: 'kulang', baseText: { de: 'zu wenig; es fehlt', en: 'short; lacking' } }, { targetText: 'singko pesos', baseText: { de: 'fünf Pesos', en: 'five pesos' } }, { targetText: 'sukli', baseText: { de: 'Wechselgeld', en: 'change' } }, { targetText: 'susiha', baseText: { de: 'prüfen Sie es', en: 'check it' } }],
    recall: { before: 'Nibayad na ko, pero kulang og singko pesos ang ', answer: 'sukli', after: '. Palihug susiha.', fallbackChoices: ['sukli', 'presyo', 'resibo', 'bayranan'] }, speakRequired: ['nibayad', 'kulang', 'sukli'],
    sceneCaption: { de: 'Die Kassiererin schiebt die Münzen zu dir und sagt: „Sakto na ang imong sukli.“', en: 'The cashier slides the coins toward you and says: “Sakto na ang imong sukli.”' },
    trophyWord: { word: 'sukli', meaning: { de: 'Wechselgeld', en: 'change' }, example: 'Kulang og singko pesos ang sukli.', whyThisWord: { de: 'Das Wort benennt genau den Betrag, bei dem du nach dem Bezahlen einen Fehler bemerkst.', en: 'This word names the exact amount where you notice an error after paying.' } },
    distractors: ['sakto ang sukli', 'mahal ang presyo'], placeholderCaption: { de: 'Ein paar Münzen und ein Kassenbon liegen getrennt auf einem Ladentresen.', en: 'A few coins and a receipt lie separated on a shop counter.' }, songMood: 'a small money error corrected calmly at the counter', visualNotes: 'Checkout counter, coins short by five pesos, receipt visible and cashier recounting.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nipalit-pero-guba', title: { de: 'Heute gekauft, schon kaputt', en: 'Bought today, already broken' },
    situation: { de: 'Im Laden fragt die Verkäuferin nach dem Problem mit dem Artikel. Du sagst, dass du ihn heute gekauft hast, er aber kaputt ist und nicht funktioniert, und bittest um Umtausch.', en: 'At the shop, the clerk asks what is wrong with the item. Say that you bought it today but it is broken and does not work, and ask for a replacement.' },
    pedagogicalGoal: 'Den abgeschlossenen Kauf mit nipalit und den jetzigen Defekt mit guba sowie dili mogana zusammenführen.',
    targetText: 'Nipalit ko niini karon, pero guba ug dili mogana. Palihug ilisi.', baseText: { de: 'Ich habe das heute gekauft, aber es ist kaputt und funktioniert nicht. Bitte tauschen Sie es um.', en: 'I bought this today, but it is broken and does not work. Please replace it.' },
    chunks: [{ targetText: 'Nipalit ko niini karon,', baseText: { de: 'Ich habe das heute gekauft,', en: 'I bought this today,' } }, { targetText: 'pero guba ug dili mogana.', baseText: { de: 'aber es ist kaputt und funktioniert nicht.', en: 'but it is broken and does not work.' } }, { targetText: 'Palihug ilisi.', baseText: { de: 'Bitte tauschen Sie es um.', en: 'Please replace it.' } }],
    terms: [{ targetText: 'Nipalit', baseText: { de: 'hat gekauft', en: 'bought' } }, { targetText: 'niini', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: 'guba', baseText: { de: 'kaputt', en: 'broken' } }, { targetText: 'mogana', baseText: { de: 'funktionieren', en: 'work; function' } }, { targetText: 'ilisi', baseText: { de: 'tauschen Sie es um', en: 'replace it' } }],
    recall: { before: 'Nipalit ko niini karon, pero guba ug dili mogana. Palihug ', answer: 'ilisi', after: '.', fallbackChoices: ['ilisi', 'putosa', 'sukda', 'lista'] }, speakRequired: ['nipalit', 'guba', 'ilisi'],
    sceneCaption: { de: 'Die Verkäuferin nimmt den Artikel entgegen und fragt: „Unsa ang problema niini?“', en: 'The clerk takes the item and asks: “Unsa ang problema niini?”' },
    trophyWord: { word: 'ilisi', meaning: { de: 'tauschen Sie es um', en: 'replace it' }, example: 'Guba kini; palihug ilisi.', whyThisWord: { de: 'Der Imperativ fordert nach der klaren Fehlerbeschreibung direkt eine passende Lösung an.', en: 'This imperative asks directly for the right solution after the problem has been explained.' } },
    distractors: ['mogana kini', 'daan na kaayo'], placeholderCaption: { de: 'Ein defekter kleiner Artikel liegt neben einem Kaufbeleg auf dem Ladentresen.', en: 'A small broken item lies beside its purchase receipt on the shop counter.' }, songMood: 'a same-day purchase returned with a clear repair request', visualNotes: 'Shop counter, broken item, receipt dated today and clerk preparing a replacement.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'bugnaw-ang-sabaw', title: { de: 'Die Suppe ist kalt', en: 'The soup is cold' },
    situation: { de: 'Die Bedienung fragt, ob die Suppe in Ordnung ist. Du sagst, dass du sie bereits probiert hast, sie aber kalt ist, und bittest ums Aufwärmen.', en: 'The server asks whether the soup is all right. Say that you already tasted it but it is cold, and ask them to warm it.' },
    pedagogicalGoal: 'Die abgeschlossene Handlung mit nikaon na und den gegenwärtigen Zustand mit bugnaw in einer Reparaturbitte verbinden.',
    targetText: 'Nikaon na ko og gamay, pero bugnaw ang sabaw. Palihug inita.', baseText: { de: 'Ich habe schon ein wenig gegessen, aber die Suppe ist kalt. Bitte wärmen Sie sie auf.', en: 'I already ate a little, but the soup is cold. Please warm it.' },
    chunks: [{ targetText: 'Nikaon na ko og gamay,', baseText: { de: 'Ich habe schon ein wenig gegessen,', en: 'I already ate a little,' } }, { targetText: 'pero bugnaw ang sabaw.', baseText: { de: 'aber die Suppe ist kalt.', en: 'but the soup is cold.' } }, { targetText: 'Palihug inita.', baseText: { de: 'Bitte wärmen Sie sie auf.', en: 'Please warm it.' } }],
    terms: [{ targetText: 'Nikaon na', baseText: { de: 'hat schon gegessen', en: 'already ate' } }, { targetText: 'gamay', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'bugnaw', baseText: { de: 'kalt', en: 'cold' } }, { targetText: 'sabaw', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'inita', baseText: { de: 'wärmen Sie es auf', en: 'warm it' } }],
    recall: { before: 'Nikaon na ko og gamay, pero bugnaw ang sabaw. Palihug ', answer: 'inita', after: '.', fallbackChoices: ['inita', 'bugnawa', 'tam-isa', 'putosa'] }, speakRequired: ['nikaon', 'bugnaw', 'inita'],
    sceneCaption: { de: 'Die Bedienung deutet auf die Suppenschale und fragt: „Maayo ra ang sabaw?“', en: 'The server gestures toward the soup bowl and asks: “Maayo ra ang sabaw?”' },
    trophyWord: { word: 'inita', meaning: { de: 'wärmen Sie es auf', en: 'warm it' }, example: 'Bugnaw ang sabaw; palihug inita.', whyThisWord: { de: 'Der Imperativ nennt genau die kleine Handlung, mit der die Bedienung das Problem lösen kann.', en: 'This imperative names the exact small action that lets the server solve the problem.' } },
    distractors: ['init na ang sabaw', 'dugang nga tubig'], placeholderCaption: { de: 'Vor dem Gast steht eine nicht mehr dampfende Suppenschale, aus der schon ein paar Löffel fehlen.', en: 'A soup bowl that is no longer steaming sits in front of the guest.' }, songMood: 'a cold bowl turned into a simple polite solution', visualNotes: 'Restaurant table, cold soup without steam, server listening and kitchen visible behind.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'natulog-pero-saba', title: { de: 'Zu laut zum Schlafen', en: 'Too noisy to sleep' },
    situation: { de: 'Die Rezeptionistin fragt, wie du geschlafen hast. Du erklärst, dass du schlecht geschlafen hast, weil das Zimmer noch immer laut ist, und bittest um einen Wechsel.', en: 'The receptionist asks how you slept. Explain that you slept poorly because the room is still noisy, and ask for a change.' },
    pedagogicalGoal: 'Das abgeschlossene natulog mit der gegenwärtigen Zimmerbeschreibung saba gihapon in einer Antwort kombinieren.',
    targetText: 'Natulog ko, pero dili maayo. Saba gihapon ang kwarto; palihug ilisi.', baseText: { de: 'Ich habe geschlafen, aber nicht gut. Das Zimmer ist immer noch laut; bitte wechseln Sie es.', en: 'I slept, but not well. The room is still noisy; please change it.' },
    chunks: [{ targetText: 'Natulog ko, pero dili maayo.', baseText: { de: 'Ich habe geschlafen, aber nicht gut.', en: 'I slept, but not well.' } }, { targetText: 'Saba gihapon ang kwarto;', baseText: { de: 'Das Zimmer ist immer noch laut;', en: 'The room is still noisy;' } }, { targetText: 'palihug ilisi.', baseText: { de: 'bitte wechseln Sie es.', en: 'please change it.' } }],
    terms: [{ targetText: 'Natulog', baseText: { de: 'hat geschlafen', en: 'slept' } }, { targetText: 'pero', baseText: { de: 'aber', en: 'but' } }, { targetText: 'dili maayo', baseText: { de: 'nicht gut', en: 'not well' } }, { targetText: 'saba gihapon', baseText: { de: 'immer noch laut', en: 'still noisy' } }, { targetText: 'ilisi', baseText: { de: 'wechseln Sie es', en: 'change it' } }],
    recall: { before: 'Natulog ko, ', answer: 'pero', after: ' dili maayo. Saba gihapon ang kwarto; palihug ilisi.', fallbackChoices: ['pero', 'unya', 'dayon', 'usab'] }, speakRequired: ['natulog', 'saba', 'kwarto'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Zimmerübersicht und fragt: „Maayo ba imong tulog kagabii?“', en: 'The receptionist opens the room list and asks: “Maayo ba imong tulog kagabii?”' },
    trophyWord: { word: 'pero', meaning: { de: 'aber', en: 'but' }, example: 'Natulog ko, pero saba ang kwarto.', whyThisWord: { de: 'Der Konnektor stellt dem abgeschlossenen Schlaf sofort das weiterhin bestehende Problem gegenüber.', en: 'This connector immediately contrasts the completed sleep with the problem that still exists.' } },
    distractors: ['hilom ang kwarto', 'maayo akong tulog'], placeholderCaption: { de: 'Ein Gast steht müde an der Rezeption, während auf dem Plan ein anderes Zimmer frei ist.', en: 'A tired guest stands at reception while another room shows as available on the plan.' }, songMood: 'a restless night answered by a calm room-change request', visualNotes: 'Hotel desk in morning light, tired guest, noisy-room marker and an available quiet room.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nahuman-na-pag-ayo', title: { de: 'Jetzt funktioniert alles', en: 'Everything works now' },
    situation: { de: 'Der Techniker bittet dich, das reparierte Gerät zu testen. Du bestätigst, dass die Reparatur abgeschlossen ist, alles funktioniert, und bedankst dich.', en: 'The technician asks you to test the repaired device. Confirm that the repair is finished, everything works, and thank them.' },
    pedagogicalGoal: 'Den Abschluss mit nahuman na und den jetzigen funktionierenden Zustand mit mogana na zusammenfassen.',
    targetText: 'Nahuman na ang pag-ayo; mogana na ang tanan. Daghang salamat sa tabang.', baseText: { de: 'Die Reparatur ist abgeschlossen; jetzt funktioniert alles. Vielen Dank für Ihre Hilfe.', en: 'The repair is complete; everything works now. Thank you very much for your help.' },
    chunks: [{ targetText: 'Nahuman na ang pag-ayo;', baseText: { de: 'Die Reparatur ist abgeschlossen;', en: 'The repair is complete;' } }, { targetText: 'mogana na ang tanan.', baseText: { de: 'jetzt funktioniert alles.', en: 'everything works now.' } }, { targetText: 'Daghang salamat sa tabang.', baseText: { de: 'Vielen Dank für Ihre Hilfe.', en: 'Thank you very much for your help.' } }],
    terms: [{ targetText: 'Nahuman na', baseText: { de: 'abgeschlossen; fertig', en: 'finished; complete' } }, { targetText: 'pag-ayo', baseText: { de: 'Reparatur', en: 'repair' } }, { targetText: 'mogana na', baseText: { de: 'funktioniert jetzt', en: 'works now' } }, { targetText: 'Daghang salamat', baseText: { de: 'vielen Dank', en: 'thank you very much' } }, { targetText: 'tabang', baseText: { de: 'Hilfe', en: 'help' } }],
    recall: { before: '', answer: 'Nahuman', after: ' na ang pag-ayo; mogana na ang tanan. Daghang salamat sa tabang.', fallbackChoices: ['Nahuman', 'Nagsugod', 'Nawala', 'Niabot'] }, speakRequired: ['nahuman', 'mogana', 'tabang'],
    sceneCaption: { de: 'Der Techniker reicht dir das Gerät und sagt: „Sulayi na ang selpon, palihug.“', en: 'The technician hands you the device and says: “Sulayi na ang selpon, palihug.”' },
    trophyWord: { word: 'nahuman', meaning: { de: 'abgeschlossen; fertig', en: 'finished; complete' }, example: 'Nahuman na ang pag-ayo sa selpon.', whyThisWord: { de: 'Die abgeschlossene Form markiert das Ende der Reparatur, bevor du den funktionierenden Zustand bestätigst.', en: 'This completed form marks the end of the repair before you confirm that the device works.' } },
    distractors: ['guba gihapon', 'wala pay tabang'], placeholderCaption: { de: 'Ein repariertes Handy leuchtet auf der Werkbank, während der Techniker es zurückgibt.', en: 'A repaired phone lights up on the workbench as the technician hands it back.' }, songMood: 'a repaired device working again at the end of the service arc', visualNotes: 'Repair counter, powered-on phone, technician returning it and customer confirming success.',
  }),
]

export const CEBUANO_A2_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_NINE_METADATA, cebuanoA2Practical9Inputs,
  { de: 'Du hast Cebuano A2 Praxis 9 abgeschlossen und kannst Probleme mit ihrem Verlauf erklären und höflich konkrete Lösungen verlangen.', en: 'You have completed Cebuano A2 Practical 9 and can explain problems with what happened and politely request concrete solutions.' },
)

export const GUIDED_TODAY_PATH_CEBUANO_A2_TEN_METADATA: GuidedPathMetadata = {
  id: 'cebuano-a2-practical-10', title: 'Cebuano A2 Praxis 10', shortTitle: 'A2 Praxis 10',
  subtitle: { de: 'Herkunft, Alltag, Fortschritte und ein herzlicher Abschied', en: 'Origins, daily life, progress, and a warm goodbye' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Cebuano', estimatedMinutes: 5,
}

const cebuanoA2Practical10Inputs: CebuanoA2LessonInput[] = [
  makeCebuanoA2CompactLesson({
    slug: 'nagpuyo-sa-siyudad', title: { de: 'Jetzt in der Stadt', en: 'Living in the city now' },
    situation: { de: 'Dein Freund fragt, woher du kommst und wo du jetzt wohnst. Du erzählst, dass du aus Deutschland kommst und nun hier in der Stadt lebst.', en: 'Your friend asks where you are from and where you live now. Say that you are from Germany and now live here in the city.' },
    pedagogicalGoal: 'Herkunft und gegenwärtigen Wohnort mit Taga- und nagpuyo na in einer persönlichen Antwort verbinden.',
    targetText: 'Taga-Alemanya ko ug nagpuyo na ko dinhi sa siyudad.', baseText: { de: 'Ich komme aus Deutschland und wohne jetzt hier in der Stadt.', en: 'I am from Germany and now live here in the city.' },
    chunks: [{ targetText: 'Taga-Alemanya ko', baseText: { de: 'Ich komme aus Deutschland', en: 'I am from Germany' } }, { targetText: 'ug nagpuyo na ko dinhi', baseText: { de: 'und wohne jetzt hier', en: 'and now live here' } }, { targetText: 'sa siyudad.', baseText: { de: 'in der Stadt.', en: 'in the city.' } }],
    terms: [{ targetText: 'Taga-Alemanya', baseText: { de: 'aus Deutschland', en: 'from Germany' } }, { targetText: 'nagpuyo', baseText: { de: 'wohnt; lebt', en: 'lives; is living' } }, { targetText: 'nagpuyo na', baseText: { de: 'wohnt jetzt', en: 'now lives' } }, { targetText: 'dinhi', baseText: { de: 'hier', en: 'here' } }, { targetText: 'siyudad', baseText: { de: 'Stadt', en: 'city' } }],
    recall: { before: 'Taga-Alemanya ko ug nagpuyo na ko dinhi sa ', answer: 'siyudad', after: '.', fallbackChoices: ['siyudad', 'barangay', 'baybayon', 'balay'] }, speakRequired: ['nagpuyo', 'dinhi', 'siyudad'],
    sceneCaption: { de: 'Dein Freund deutet erst auf dich und dann auf die Straße und fragt: „Taga-asa ka, ug asa ka nagpuyo karon?“', en: 'Your friend gestures first toward you and then toward the street and asks: “Taga-asa ka, ug asa ka nagpuyo karon?”' },
    trophyWord: { word: 'siyudad', meaning: { de: 'Stadt', en: 'city' }, example: 'Daghan og nindot nga dapit sa siyudad.', whyThisWord: { de: 'Das Ortswort macht deutlich, dass dein neues Zuhause nicht nur das Land, sondern diese konkrete Stadt ist.', en: 'This place word makes it clear that your new home is not just the country but this particular city.' } },
    distractors: ['wala ko dinhi', 'sa sunod tuig'], placeholderCaption: { de: 'Zwei Freunde stehen auf einer belebten Straße, während einer auf die umliegenden Häuser zeigt.', en: 'Two friends stand on a lively street while one points toward the surrounding buildings.' }, songMood: 'a personal story beginning on a now familiar city street', visualNotes: 'Friendly Cebu street conversation, apartment buildings nearby and the learner indicating the city around them.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'opisina-sa-sentro', title: { de: 'Mein Büro im Zentrum', en: 'My office downtown' },
    situation: { de: 'Dein Freund fragt nach deiner Arbeit in der Stadt. Du sagst, dass du in einem Büro im Zentrum arbeitest.', en: 'Your friend asks about your work in the city. Say that you work in an office downtown.' },
    pedagogicalGoal: 'Die gegenwärtige Arbeit mit nagtrabaho und einem genauen Ort beschreiben.',
    targetText: 'Nagtrabaho ko sa opisina sa sentro.', baseText: { de: 'Ich arbeite in einem Büro im Stadtzentrum.', en: 'I work in an office in the city center.' },
    chunks: [{ targetText: 'Nagtrabaho ko', baseText: { de: 'Ich arbeite', en: 'I work' } }, { targetText: 'sa opisina', baseText: { de: 'in einem Büro', en: 'in an office' } }, { targetText: 'sa sentro.', baseText: { de: 'im Stadtzentrum.', en: 'in the city center.' } }],
    terms: [{ targetText: 'Nagtrabaho', baseText: { de: 'arbeitet', en: 'works; is working' } }, { targetText: 'opisina', baseText: { de: 'Büro', en: 'office' } }, { targetText: 'sentro', baseText: { de: 'Zentrum', en: 'center' } }, { targetText: 'sa opisina', baseText: { de: 'im Büro', en: 'in the office' } }, { targetText: 'sa sentro', baseText: { de: 'im Zentrum', en: 'in the center' } }],
    recall: { before: 'Nagtrabaho ko sa ', answer: 'opisina', after: ' sa sentro.', fallbackChoices: ['opisina', 'tindahan', 'hotel', 'karinderya'] }, speakRequired: ['nagtrabaho', 'opisina', 'sentro'],
    sceneCaption: { de: 'Dein Freund blickt zu den Gebäuden im Zentrum und fragt: „Asa ka nagtrabaho dinhi?“', en: 'Your friend looks toward the buildings downtown and asks: “Asa ka nagtrabaho dinhi?”' },
    trophyWord: { word: 'opisina', meaning: { de: 'Büro', en: 'office' }, example: 'Naa sa sentro ang akong opisina.', whyThisWord: { de: 'Das Wort gibt deiner Arbeitserzählung einen konkreten und leicht vorstellbaren Ort.', en: 'This word gives your work story a concrete, easy-to-picture setting.' } },
    distractors: ['sa merkado ugma', 'wala koy opisina'], placeholderCaption: { de: 'Ein schlichtes Bürogebäude steht zwischen Geschäften im Stadtzentrum.', en: 'A simple office building stands among shops in the city center.' }, songMood: 'a steady workday in the heart of the city', visualNotes: 'Downtown office exterior, morning foot traffic and two friends talking about the learner\'s daily work.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nagtuon-para-makasabot', title: { de: 'Warum ich Cebuano lerne', en: 'Why I learn Cebuano' },
    situation: { de: 'Dein Freund fragt, warum du Cebuano lernst. Du erklärst, dass du die Menschen verstehen möchtest.', en: 'Your friend asks why you are learning Cebuano. Explain that you want to understand the people.' },
    pedagogicalGoal: 'Eine persönliche Motivation mit kay begründen und makasabot als Ziel nennen.',
    targetText: 'Nagtuon ko og Cebuano, kay gusto ko makasabot sa mga tawo.', baseText: { de: 'Ich lerne Cebuano, weil ich die Menschen verstehen möchte.', en: 'I am learning Cebuano because I want to understand the people.' },
    chunks: [{ targetText: 'Nagtuon ko og Cebuano,', baseText: { de: 'Ich lerne Cebuano,', en: 'I am learning Cebuano,' } }, { targetText: 'kay gusto ko makasabot', baseText: { de: 'weil ich verstehen möchte', en: 'because I want to understand' } }, { targetText: 'sa mga tawo.', baseText: { de: 'die Menschen.', en: 'the people.' } }],
    terms: [{ targetText: 'Nagtuon', baseText: { de: 'lernt', en: 'studies; is learning' } }, { targetText: 'Cebuano', baseText: { de: 'Cebuano', en: 'Cebuano' } }, { targetText: 'kay', baseText: { de: 'weil', en: 'because' } }, { targetText: 'makasabot', baseText: { de: 'verstehen können', en: 'be able to understand' } }, { targetText: 'tawo', baseText: { de: 'Mensch; Person', en: 'person; people' } }],
    recall: { before: 'Nagtuon ko og Cebuano, kay gusto ko makasabot sa mga ', answer: 'tawo', after: '.', fallbackChoices: ['tawo', 'bisita', 'higala', 'pamilya'] }, speakRequired: ['nagtuon', 'makasabot', 'tawo'],
    sceneCaption: { de: 'Dein Freund legt das Lernheft auf den Tisch und fragt: „Ngano nagtuon ka og Cebuano?“', en: 'Your friend places the study notebook on the table and asks: “Ngano nagtuon ka og Cebuano?”' },
    trophyWord: { word: 'tawo', meaning: { de: 'Mensch; Person', en: 'person; people' }, example: 'Maayo kaayo ang mga tawo dinhi.', whyThisWord: { de: 'Das Wort rückt die Menschen in den Mittelpunkt deines persönlichen Grundes, Cebuano zu lernen.', en: 'This word puts people at the heart of your personal reason for learning Cebuano.' } },
    distractors: ['dili ko kasabot', 'para sa trabaho'], placeholderCaption: { de: 'Ein Cebuano-Lernheft liegt offen zwischen zwei Freunden an einem kleinen Tisch.', en: 'A Cebuano study notebook lies open between two friends at a small table.' }, songMood: 'a sincere reason for learning shared over an open notebook', visualNotes: 'Friends at a cafe table, handwritten language notes and an attentive personal conversation.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'duha-na-ka-semana', title: { de: 'Zwei Wochen hier', en: 'Two weeks here' },
    situation: { de: 'Dein Freund fragt, ob du schon lange hier bist. Du sagst, dass es inzwischen zwei Wochen sind und die Zeit schnell vergeht.', en: 'Your friend asks whether you have been here long. Say that it has now been two weeks and that time passes quickly.' },
    pedagogicalGoal: 'Eine laufende Aufenthaltsdauer mit Duha na ka semana ko dinhi ausdrücken.',
    targetText: 'Duha na ka semana ko dinhi. Paspas kaayo ang panahon.', baseText: { de: 'Ich bin seit zwei Wochen hier. Die Zeit vergeht sehr schnell.', en: 'I have been here for two weeks. Time passes very quickly.' },
    chunks: [{ targetText: 'Duha na ka semana ko dinhi.', baseText: { de: 'Ich bin seit zwei Wochen hier.', en: 'I have been here for two weeks.' } }, { targetText: 'Paspas kaayo', baseText: { de: 'Sehr schnell', en: 'Very quickly' } }, { targetText: 'ang panahon.', baseText: { de: 'vergeht die Zeit.', en: 'time passes.' } }],
    terms: [{ targetText: 'Duha ka', baseText: { de: 'zwei', en: 'two' } }, { targetText: 'semana', baseText: { de: 'Woche', en: 'week' } }, { targetText: 'dinhi', baseText: { de: 'hier', en: 'here' } }, { targetText: 'Paspas kaayo', baseText: { de: 'sehr schnell', en: 'very quickly' } }, { targetText: 'panahon', baseText: { de: 'Zeit', en: 'time' } }],
    recall: { before: 'Duha na ka ', answer: 'semana', after: ' ko dinhi. Paspas kaayo ang panahon.', fallbackChoices: ['semana', 'adlaw', 'bulan', 'tuig'] }, speakRequired: ['duha', 'semana', 'dinhi'],
    sceneCaption: { de: 'Dein Freund zählt lächelnd die Tage im Kalender und fragt: „Dugay na ka dinhi?“', en: 'Your friend smiles while counting the days on the calendar and asks: “Dugay na ka dinhi?”' },
    trophyWord: { word: 'semana', meaning: { de: 'Woche', en: 'week' }, example: 'Duha na ka semana ko dinhi.', whyThisWord: { de: 'Diese Zeiteinheit macht die Dauer deines Aufenthalts konkret: Aus einzelnen Tagen sind zwei vertraute Wochen geworden.', en: 'This time unit makes the length of your stay concrete: separate days have become two familiar weeks.' } },
    distractors: ['usa ka adlaw lang', 'sunod tuig pa'], placeholderCaption: { de: 'Auf einem kleinen Kalender sind zwei vollständige Wochen markiert.', en: 'Two complete weeks are marked on a small calendar.' }, songMood: 'two full weeks passing quickly in a place that feels familiar', visualNotes: 'Calendar with fourteen days marked, familiar neighborhood details and friends reflecting on the stay.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'pamilya-sa-alemanya', title: { de: 'Familie zu Hause', en: 'Family back home' },
    situation: { de: 'Dein Freund fragt, wo deine Familie lebt. Du sagst, dass sie in Deutschland ist und ihr jede Woche telefoniert.', en: 'Your friend asks where your family lives. Say that they are in Germany and that you have a call every week.' },
    pedagogicalGoal: 'Den Wohnort der Familie und eine regelmäßige wöchentliche Verbindung unmarkiert beschreiben.',
    targetText: 'Naa sa Alemanya akong pamilya. Magtawag mi kada semana.', baseText: { de: 'Meine Familie ist in Deutschland. Wir telefonieren jede Woche.', en: 'My family is in Germany. We call each week.' },
    chunks: [{ targetText: 'Naa sa Alemanya', baseText: { de: 'In Deutschland ist', en: 'In Germany is' } }, { targetText: 'akong pamilya.', baseText: { de: 'meine Familie.', en: 'my family.' } }, { targetText: 'Magtawag mi kada semana.', baseText: { de: 'Wir telefonieren jede Woche.', en: 'We call each week.' } }],
    terms: [{ targetText: 'pamilya', baseText: { de: 'Familie', en: 'family' } }, { targetText: 'Alemanya', baseText: { de: 'Deutschland', en: 'Germany' } }, { targetText: 'Kada semana', baseText: { de: 'jede Woche', en: 'every week' } }, { targetText: 'tawag', baseText: { de: 'Anruf; Telefonat', en: 'call; phone call' } }, { targetText: 'among', baseText: { de: 'unser', en: 'our' } }],
    recall: { before: 'Naa sa Alemanya akong ', answer: 'pamilya', after: '. Magtawag mi kada semana.', fallbackChoices: ['pamilya', 'higala', 'silingan', 'bisita'] }, speakRequired: ['pamilya', 'magtawag', 'semana'],
    sceneCaption: { de: 'Dein Freund bemerkt das Familienfoto neben deinem Handy und fragt: „Asa nagpuyo imong pamilya?“', en: 'Your friend notices the family photo beside your phone and asks: “Asa nagpuyo imong pamilya?”' },
    trophyWord: { word: 'pamilya', meaning: { de: 'Familie', en: 'family' }, example: 'Naa sa Alemanya ang akong pamilya.', whyThisWord: { de: 'Das Wort verbindet dein neues Leben in Cebu mit den Menschen, zu denen du zu Hause Kontakt hältst.', en: 'This word connects your new life in Cebu with the people you keep in touch with back home.' } },
    distractors: ['wala koy selpon', 'kada adlaw dinhi'], placeholderCaption: { de: 'Ein Familienfoto liegt neben einem Handy mit einem wöchentlichen Anruf im Kalender.', en: 'A family photo rests beside a phone with a weekly call in the calendar.' }, songMood: 'a warm weekly call keeping home close', visualNotes: 'Family photo, phone call reminder and two friends talking about loved ones back home.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'pagluto-ug-paglakaw', title: { de: 'Kochen und Spaziergänge', en: 'Cooking and walks' },
    situation: { de: 'Dein Freund fragt, was du in deiner freien Zeit gern machst. Du erzählst vom Kochen und von Spaziergängen im Viertel.', en: 'Your friend asks what you enjoy doing in your free time. Tell them about cooking and walks around the neighborhood.' },
    pedagogicalGoal: 'Zwei vertraute Freizeitbeschäftigungen mit ganahan ko sa zusammenfassen.',
    targetText: 'Ganahan ko sa pagluto ug paglakaw sa barangay.', baseText: { de: 'Ich koche gern und gehe gern im Viertel spazieren.', en: 'I like cooking and walking around the neighborhood.' },
    chunks: [{ targetText: 'Ganahan ko sa pagluto', baseText: { de: 'Ich koche gern', en: 'I like cooking' } }, { targetText: 'ug paglakaw', baseText: { de: 'und gehe gern spazieren', en: 'and walking' } }, { targetText: 'sa barangay.', baseText: { de: 'im Viertel.', en: 'around the neighborhood.' } }],
    terms: [{ targetText: 'Ganahan', baseText: { de: 'mögen; gernhaben', en: 'like; enjoy' } }, { targetText: 'pagluto', baseText: { de: 'Kochen', en: 'cooking' } }, { targetText: 'paglakaw', baseText: { de: 'Spazierengehen', en: 'walking' } }, { targetText: 'barangay', baseText: { de: 'Stadtviertel; Barangay', en: 'neighborhood; barangay' } }, { targetText: 'ganahan ko sa', baseText: { de: 'ich mag', en: 'I like' } }],
    recall: { before: 'Ganahan ko sa pagluto ug paglakaw sa ', answer: 'barangay', after: '.', fallbackChoices: ['barangay', 'parke', 'baybayon', 'siyudad'] }, speakRequired: ['ganahan', 'pagluto', 'barangay'],
    sceneCaption: { de: 'Dein Freund zeigt auf deinen Kochtopf und deine Schuhe und fragt: „Unsa imong ganahan buhaton sa libre nga oras?“', en: 'Your friend points to your cooking pot and shoes and asks: “Unsa imong ganahan buhaton sa libre nga oras?”' },
    trophyWord: { word: 'barangay', meaning: { de: 'Stadtviertel; Barangay', en: 'neighborhood; barangay' }, example: 'Nindot ang paglakaw sa barangay.', whyThisWord: { de: 'Das Wort macht aus einem allgemeinen Spaziergang eine vertraute Runde durch dein eigenes Viertel.', en: 'This word turns a general walk into a familiar route through your own neighborhood.' } },
    distractors: ['matulog tibuok adlaw', 'wala koy oras'], placeholderCaption: { de: 'Ein Kochtopf und bequeme Schuhe stehen bereit für zwei ruhige Freizeitbeschäftigungen.', en: 'A cooking pot and comfortable shoes are ready for two relaxed hobbies.' }, songMood: 'simple hobbies making the neighborhood feel like home', visualNotes: 'Home kitchen, walking shoes by the door and a familiar barangay street beyond.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'rutina-buntag-ug-gabii', title: { de: 'Mein Tagesablauf', en: 'My daily routine' },
    situation: { de: 'Dein Freund fragt nach deinem Tagesablauf. Du beschreibst Arbeit am Morgen und Cebuano-Lernen am Abend.', en: 'Your friend asks about your daily routine. Describe work in the morning and Cebuano study in the evening.' },
    pedagogicalGoal: 'Einen einfachen Tagesablauf mit zwei Tageszeiten und vertrauten Tätigkeiten ordnen.',
    targetText: 'Rutina nako ang trabaho sa buntag ug pagtuon og Cebuano sa gabii.', baseText: { de: 'Mein Tagesablauf besteht aus Arbeit am Morgen und Cebuano-Lernen am Abend.', en: 'My routine is work in the morning and studying Cebuano in the evening.' },
    chunks: [{ targetText: 'Rutina nako ang trabaho', baseText: { de: 'Zu meinem Tagesablauf gehört die Arbeit', en: 'My routine includes work' } }, { targetText: 'sa buntag', baseText: { de: 'am Morgen', en: 'in the morning' } }, { targetText: 'ug pagtuon og Cebuano sa gabii.', baseText: { de: 'und Cebuano-Lernen am Abend.', en: 'and studying Cebuano in the evening.' } }],
    terms: [{ targetText: 'Rutina', baseText: { de: 'Tagesablauf; Routine', en: 'routine; daily routine' } }, { targetText: 'trabaho', baseText: { de: 'Arbeit', en: 'work' } }, { targetText: 'buntag', baseText: { de: 'Morgen', en: 'morning' } }, { targetText: 'pagtuon', baseText: { de: 'Lernen', en: 'studying' } }, { targetText: 'gabii', baseText: { de: 'Abend', en: 'evening' } }],
    recall: { before: '', answer: 'Rutina', after: ' nako ang trabaho sa buntag ug pagtuon og Cebuano sa gabii.', fallbackChoices: ['Rutina', 'Plano', 'Trabaho', 'Biyahe'] }, speakRequired: ['rutina', 'trabaho', 'cebuano'],
    sceneCaption: { de: 'Dein Freund schaut auf deinen Tagesplan und fragt: „Unsa imong rutina kada adlaw?“', en: 'Your friend looks at your daily planner and asks: “Unsa imong rutina kada adlaw?”' },
    trophyWord: { word: 'rutina', meaning: { de: 'Tagesablauf; Routine', en: 'routine; daily routine' }, example: 'Trabaho sa buntag ang rutina nako.', whyThisWord: { de: 'Das Wort bündelt Arbeit und Lernen zu einem klaren Bild deines Alltags in Cebu.', en: 'This word gathers work and study into a clear picture of your daily life in Cebu.' } },
    distractors: ['tulog sa buntag', 'walay pagtuon'], placeholderCaption: { de: 'Ein Tagesplan zeigt einen Arbeitsblock am Morgen und ein Sprachheft am Abend.', en: 'A daily planner shows a work block in the morning and a language notebook in the evening.' }, songMood: 'a balanced daily rhythm from morning work to evening study', visualNotes: 'Simple day planner, office icon in the morning, Cebuano notes beside an evening lamp.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'kasabot-pero-hinay', title: { de: 'Fortschritte beim Cebuano-Lernen', en: 'Progress in Cebuano' },
    situation: { de: 'Dein Freund fragt nach deinen Fortschritten beim Cebuano-Lernen. Du sagst, dass du fast alles verstehst, aber noch langsam sprichst.', en: 'Your friend asks about your progress in Cebuano. Say that you understand almost everything but still speak slowly.' },
    pedagogicalGoal: 'Einen gegenwärtigen Lernfortschritt mit kasabot na und hinay ausgewogen beschreiben.',
    targetText: 'Kasabot na ko sa halos tanan, pero hinay pa akong pagsulti.', baseText: { de: 'Ich verstehe schon fast alles, aber ich spreche noch langsam.', en: 'I understand almost everything now, but I still speak slowly.' },
    chunks: [{ targetText: 'Kasabot na ko sa halos tanan,', baseText: { de: 'Ich verstehe schon fast alles,', en: 'I understand almost everything now,' } }, { targetText: 'pero hinay', baseText: { de: 'aber langsam', en: 'but slowly' } }, { targetText: 'pa akong pagsulti.', baseText: { de: 'spreche ich noch.', en: 'is how I speak.' } }],
    terms: [{ targetText: 'Kasabot na', baseText: { de: 'versteht schon', en: 'understands now' } }, { targetText: 'halos tanan', baseText: { de: 'fast alles', en: 'almost everything' } }, { targetText: 'pero', baseText: { de: 'aber', en: 'but' } }, { targetText: 'hinay', baseText: { de: 'langsam', en: 'slowly' } }, { targetText: 'pagsulti', baseText: { de: 'Sprechen', en: 'speaking' } }],
    recall: { before: 'Kasabot na ko sa halos tanan, pero ', answer: 'hinay', after: ' pa akong pagsulti.', fallbackChoices: ['hinay', 'paspas', 'maayo', 'klaro'] }, speakRequired: ['kasabot', 'hinay', 'pagsulti'],
    sceneCaption: { de: 'Dein Freund schiebt das Cebuano-Heft zu dir und fragt: „Kumusta na imong Cebuano?“', en: 'Your friend slides the Cebuano notebook toward you and asks: “Kumusta na imong Cebuano?”' },
    trophyWord: { word: 'hinay', meaning: { de: 'langsam', en: 'slowly' }, example: 'Hinay pa akong pagsulti sa Cebuano.', whyThisWord: { de: 'Das Wort lässt dich deinen Fortschritt ehrlich beschreiben, ohne das bereits Erreichte kleinzureden.', en: 'This word lets you describe your progress honestly without diminishing what you already understand.' } },
    distractors: ['wala ko kasabot', 'paspas kaayo'], placeholderCaption: { de: 'Zwei Freunde sprechen entspannt neben einem gut gefüllten Cebuano-Notizbuch.', en: 'Two friends talk comfortably beside a well-used Cebuano notebook.' }, songMood: 'quiet confidence growing through every careful sentence', visualNotes: 'Friendly practice conversation, full notebook, patient pacing and a confident understanding smile.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'mobalik-sunod-tuig', title: { de: 'Nächstes Jahr zurück', en: 'Back next year' },
    situation: { de: 'Dein Freund fragt, ob du wieder nach Cebu kommst. Du versprichst, nächstes Jahr zurückzukehren, und lobst den Ort.', en: 'Your friend asks whether you will come back to Cebu. Promise to return next year and say how much you like it here.' },
    pedagogicalGoal: 'Mit mobalik und sunod tuig einen einzigen klaren Zukunftsplan ausdrücken.',
    targetText: 'Mobalik ko sunod tuig. Nindot kaayo dinhi.', baseText: { de: 'Ich komme nächstes Jahr zurück. Es ist sehr schön hier.', en: 'I will come back next year. It is very nice here.' },
    chunks: [{ targetText: 'Mobalik ko sunod tuig.', baseText: { de: 'Ich komme nächstes Jahr zurück.', en: 'I will come back next year.' } }, { targetText: 'Nindot kaayo', baseText: { de: 'Sehr schön', en: 'Very nice' } }, { targetText: 'dinhi.', baseText: { de: 'ist es hier.', en: 'it is here.' } }],
    terms: [{ targetText: 'Mobalik', baseText: { de: 'zurückkommen werden', en: 'will return' } }, { targetText: 'sunod tuig', baseText: { de: 'nächstes Jahr', en: 'next year' } }, { targetText: 'tuig', baseText: { de: 'Jahr', en: 'year' } }, { targetText: 'Nindot kaayo', baseText: { de: 'sehr schön', en: 'very nice' } }, { targetText: 'dinhi', baseText: { de: 'hier', en: 'here' } }],
    recall: { before: 'Mobalik ko sunod ', answer: 'tuig', after: '. Nindot kaayo dinhi.', fallbackChoices: ['tuig', 'semana', 'bulan', 'adlaw'] }, speakRequired: ['mobalik', 'sunod', 'tuig'],
    sceneCaption: { de: 'Dein Freund zeigt auf den Kalender des nächsten Jahres und fragt: „Mobalik pa ka dinhi?“', en: 'Your friend points to next year on the calendar and asks: “Mobalik pa ka dinhi?”' },
    trophyWord: { word: 'tuig', meaning: { de: 'Jahr', en: 'year' }, example: 'Mobalik ko sunod tuig.', whyThisWord: { de: 'Die Zeiteinheit macht aus einem vagen Wiedersehen einen klaren und glaubwürdigen Plan.', en: 'This time unit turns a vague reunion into a clear, believable plan.' } },
    distractors: ['mopabilin ko karon', 'dili ko mobalik'], placeholderCaption: { de: 'Zwei Freunde markieren das kommende Jahr in einem Kalender vor einer vertrauten Straßenszene.', en: 'Two friends mark the coming year on a calendar in front of a familiar street scene.' }, songMood: 'a warm promise to return when another year comes around', visualNotes: 'Calendar turned to next year, familiar Cebu street and friends sharing a confident return plan.',
  }),
  makeCebuanoA2CompactLesson({
    slug: 'nahuman-duha-ka-semana', title: { de: 'Abschied nach zwei Wochen', en: 'Goodbye after two weeks' },
    situation: { de: 'Beim Abschied fragt dein Freund nach deinen zwei Wochen. Du blickst auf deine Erledigungen zurück, bedankst dich herzlich und wünschst ihm alles Gute.', en: 'As you say goodbye, your friend asks about your two weeks. Look back on what you completed, thank them warmly, and wish them well.' },
    pedagogicalGoal: 'Mit nakahuman na auf einen vertrauten Abschluss zurückblicken und den gesamten Kurs herzlich abrunden.',
    targetText: 'Nakahuman na ko og daghang buluhaton niining duha ka semana. Daghang salamat! Amping kanunay!', baseText: { de: 'Ich habe in diesen zwei Wochen viele Erledigungen geschafft. Vielen Dank! Pass immer gut auf dich auf!', en: 'I completed many errands in these two weeks. Thank you very much! Always take care!' },
    chunks: [{ targetText: 'Nakahuman na ko og daghang buluhaton', baseText: { de: 'Ich habe viele Erledigungen geschafft', en: 'I completed many errands' } }, { targetText: 'niining duha ka semana.', baseText: { de: 'in diesen zwei Wochen.', en: 'in these two weeks.' } }, { targetText: 'Daghang salamat! Amping kanunay!', baseText: { de: 'Vielen Dank! Pass immer gut auf dich auf!', en: 'Thank you very much! Always take care!' } }],
    terms: [{ targetText: 'Nakahuman', baseText: { de: 'hat geschafft; hat abgeschlossen', en: 'completed; managed to finish' } }, { targetText: 'buluhaton', baseText: { de: 'Erledigung; Aufgabe', en: 'errand; task' } }, { targetText: 'niining duha ka semana', baseText: { de: 'in diesen zwei Wochen', en: 'in these two weeks' } }, { targetText: 'Daghang salamat', baseText: { de: 'vielen Dank', en: 'thank you very much' } }, { targetText: 'kanunay', baseText: { de: 'immer; jederzeit', en: 'always' } }],
    recall: { before: 'Nakahuman na ko og daghang buluhaton niining duha ka semana. Daghang salamat! Amping ', answer: 'kanunay', after: '!', fallbackChoices: ['kanunay', 'usab', 'karon', 'dayon'] }, speakRequired: ['nakahuman', 'buluhaton', 'kanunay'],
    sceneCaption: { de: 'Dein Freund bleibt beim Abschied noch einen Moment stehen und fragt: „Kumusta imong duha ka semana dinhi?“', en: 'Your friend pauses for one more moment as you say goodbye and asks: “Kumusta imong duha ka semana dinhi?”' },
    trophyWord: { word: 'kanunay', meaning: { de: 'immer; jederzeit', en: 'always' }, example: 'Amping kanunay sa imong paglakaw.', whyThisWord: { de: 'Das Wort trägt die Fürsorge aus eurem Abschied über diese zwei Wochen hinaus.', en: 'This word carries the care in your goodbye beyond these two weeks.' } },
    distractors: ['daghan pa ang buhaton', 'wala pay nahuman'], placeholderCaption: { de: 'Zwei Freunde verabschieden sich herzlich neben einem Kalender mit zwei markierten Wochen.', en: 'Two friends share a warm goodbye beside a calendar with two marked weeks.' }, songMood: 'a grateful farewell closing two weeks of familiar city life', visualNotes: 'Warm goodbye between friends, two-week calendar, packed bag and familiar neighborhood in soft evening light.',
  }),
]

export const CEBUANO_A2_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makeCebuanoA2PracticalLessons(
  GUIDED_TODAY_PATH_CEBUANO_A2_TEN_METADATA, cebuanoA2Practical10Inputs,
  { de: 'Du hast den gesamten Cebuano-A2-Kurs abgeschlossen; aus dem Stammgast ist ein vertrauter Gesprächspartner geworden, der seine Geschichte erzählen und herzlich Abschied nehmen kann.', en: 'You have completed the entire Cebuano A2 course; the regular has become a familiar conversation partner who can share a story and say a warm goodbye.' },
)
