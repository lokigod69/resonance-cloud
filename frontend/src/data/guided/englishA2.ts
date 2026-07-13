/**
 * English A2 — the Regular tier (10 paths × 10 lessons), per
 * docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md (§4 integration, §5 authoring
 * contract) and the phase-3 spec in tmp\A2_ENGLISH_P1_P10_SPEC.md.
 *
 * Authoring contract highlights enforced in this module:
 * - Base language is GERMAN (matching English A1): all GuidedBaseContentText
 *   fields carry .de only (du-form German, real umlauts, never digraphs);
 *   lesson.situation additionally carries the required .en rendering.
 * - Variety: American English throughout (en-US speak locale, matching A1's
 *   "center" / "to go" / "check out" evidence) — American spellings, no
 *   Britishisms (colour, favourite, queue, takeaway, lift, petrol).
 * - Two-turn shape: sceneCaption carries the interlocutor's English line quoted
 *   inside the .de caption; the learner's corePhrase is the response.
 * - Register: polite-neutral throughout; could/would politeness only as fixed
 *   chunks (Could I…, I'd like…), never as a conditional paradigm.
 * - Tense contract: present everywhere; simple past only from the whitelist
 *   (P3/P9 + light recycling); present perfect ONLY in the fixed patterns
 *   "I've already + participle" / "I haven't + participle + yet"; going-to
 *   future from P4 (no will-future). "because" is the only subordination.
 * - typeRecall never blanks a contracted form (don't, I've, it's).
 * - Trophies unique across the entire English guided corpus — A1 shipped THREE
 *   vibes (bright/wistful/sharp), so the forbidden list spans all 271 A1
 *   trophies, including most A2-favorite connectors (yet, still, almost, just).
 * - A2 is bright-only regardless of A1's extra vibes.
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

const ENGLISH_A2_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

type EnglishA2VariantInput = {
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

export type EnglishA2LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightEnglishA2Variant(input: EnglishA2VariantInput): GuidedLessonVibeVariant {
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
      language: 'en-US',
      passingThreshold: 0.8,
      maxRecordingSeconds: 12,
    },
    sceneCaption: input.sceneCaption,
    trophyWord: input.trophyWord,
    placeholderMedia: {
      type: 'video',
      caption: input.placeholderCaption,
    },
    songSeed: {
      genre: 'sunny indie pop',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

export function makeEnglishA2PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: EnglishA2LessonInput[],
  completionSituation: { de: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('english-a2-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `english-a2-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
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
      steps: ENGLISH_A2_GUIDED_TODAY_STEPS,
      estimatedMinutes: 5,
      fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
      status: 'active',
      nextLessonTeaser: {
        title: nextInput?.title ?? { de: 'Pfad abgeschlossen' },
        situation: {
          de: nextInput?.situation.de ?? completionSituation.de,
        },
      },
      vibeVariants: {
        bright: lessonInput.variant,
      },
    }
  })
}

export type EnglishA2CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  targetText: string
  baseText: GuidedBaseContentText
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[] }
  /** Exactly the salient single words the speech check requires — never multi-word phrases, never contracted forms (I've, don't — the check compares whitespace-split transcript tokens). */
  speakRequired: [string, string, string]
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

function englishA2Answers(text: string): string[] {
  const variants = [text, text.toLowerCase()]
  const capitalized = variants.map((value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
  return [...new Set([...variants, ...capitalized])]
}

function englishA2SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
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

export function makeEnglishA2CompactLesson(input: EnglishA2CompactLesson): EnglishA2LessonInput {
  const prefix = input.slug.split('-')[0]
  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: makeBrightEnglishA2Variant({
      corePhrase: { targetText: input.targetText, baseText: input.baseText },
      meaning: input.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map((term, index) => ({
        id: `${prefix}-item-${index + 1}`,
        ...term,
        acceptedAnswers: englishA2Answers(term.targetText),
      })),
      buildChips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      typeRecall: {
        ...input.recall,
        acceptedAnswers: englishA2Answers(input.recall.answer),
      },
      speakTarget: {
        baseCue: input.baseText,
        targetPhrase: input.targetText,
        ...englishA2SpeakTokens(input.targetText, input.speakRequired),
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderCaption: input.placeholderCaption,
      songMood: input.songMood,
      visualNotes: input.visualNotes,
    }),
  }
}

export const GUIDED_TODAY_PATH_ENGLISH_A2_ONE_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-1',
  title: 'English A2 Practical 1',
  shortTitle: 'A2 Practical 1',
  subtitle: { de: 'Wieder da: kurze Rückfragen im Alltag' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical1Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'yes-the-usual-a-latte-please',
    title: { de: 'Wie immer' },
    situation: { de: 'Die Barista erkennt dich und fragt nach deiner üblichen Bestellung – du bestätigst sie freundlich.', en: 'The barista recognizes you and asks for your usual order — confirm it politely.' },
    pedagogicalGoal: 'Eine vertraute Bestellung mit „the usual“ freundlich bestätigen.',
    targetText: 'Yes, the usual: a latte, please.',
    baseText: { de: 'Ja, wie immer: einen Latte, bitte.' },
    chunks: [{ targetText: 'Yes, the usual:', baseText: { de: 'Ja, wie immer:' } }, { targetText: 'a latte,', baseText: { de: 'einen Latte,' } }, { targetText: 'please.', baseText: { de: 'bitte.' } }],
    terms: [{ targetText: 'the usual', baseText: { de: 'das Übliche' } }, { targetText: 'latte', baseText: { de: 'Milchkaffee' } }, { targetText: 'usual order', baseText: { de: 'übliche Bestellung' } }, { targetText: 'please', baseText: { de: 'bitte' } }, { targetText: 'barista', baseText: { de: 'Barista' } }],
    recall: { before: 'Yes, the usual: a ', answer: 'latte', after: ', please.', fallbackChoices: ['latte', 'tea', 'juice', 'cookie'] },
    speakRequired: ['usual', 'latte', 'please'],
    sceneCaption: { de: 'Die Barista stellt eine Tasse bereit und fragt: „The usual?“' },
    trophyWord: { word: 'latte', meaning: { de: 'Milchkaffee' }, example: 'A latte is my usual coffee.', whyThisWord: { de: 'latte macht deine vertraute Bestellung an der Cafétheke präzise.' } },
    distractors: ['A large tea,', 'by the window.'],
    placeholderCaption: { de: 'Eine Barista an einer warmen Cafétheke mit einer dampfenden Tasse.' },
    songMood: 'a bright familiar morning at the neighborhood cafe',
    visualNotes: 'Morning cafe counter, a regular customer, a porcelain cup, and soft window light.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'to-go-please-whats-the-total-price',
    title: { de: 'Zum Mitnehmen' },
    situation: { de: 'Die Barista fragt, ob du hierbleibst oder dein Getränk mitnimmst – du wählst Mitnehmen und fragst am Tresen nach dem Gesamtbetrag.', en: 'The barista asks whether you are staying or taking your drink to go — choose to go and ask for the total at the counter.' },
    pedagogicalGoal: 'Mit „to go“ antworten und nach dem Gesamtbetrag fragen.',
    targetText: "To go, please. What's the total price?",
    baseText: { de: 'Zum Mitnehmen, bitte. Wie hoch ist der Gesamtpreis?' },
    chunks: [{ targetText: 'To go,', baseText: { de: 'Zum Mitnehmen,' } }, { targetText: 'please.', baseText: { de: 'bitte.' } }, { targetText: "What's the", baseText: { de: 'Wie hoch ist der' } }, { targetText: 'total price?', baseText: { de: 'Gesamtpreis?' } }],
    terms: [{ targetText: 'to go', baseText: { de: 'zum Mitnehmen' } }, { targetText: 'total', baseText: { de: 'Gesamtbetrag' } }, { targetText: 'counter', baseText: { de: 'Tresen' } }, { targetText: 'at the counter', baseText: { de: 'am Tresen' } }, { targetText: 'drink', baseText: { de: 'Getränk' } }],
    recall: { before: "To go, please. What's the total ", answer: 'price', after: '?', fallbackChoices: ['price', 'amount', 'cost', 'value'] },
    speakRequired: ['total', 'price', 'please'],
    sceneCaption: { de: 'Die Barista zeigt auf zwei Becher und fragt: „For here or to go?“' },
    trophyWord: { word: 'price', meaning: { de: 'Preis' }, example: 'The total price is on the receipt.', whyThisWord: { de: 'price hilft dir, an der Cafétheke nach dem Gesamtbetrag zu fragen.' } },
    distractors: ['For here today,', 'on my card.'],
    placeholderCaption: { de: 'Ein Pappbecher und ein Kartenleser stehen auf einer Cafétheke.' },
    songMood: 'a brisk to-go stop before a city walk',
    visualNotes: 'Cafe counter with a paper cup, contactless terminal, and a customer ready to leave.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-looking-for-a-sim-card-do-you-carry-those',
    title: { de: 'Eine SIM-Karte' },
    situation: { de: 'Im Telefonladen bietet ein Mitarbeiter Hilfe an – du sagst, was du suchst, und fragst, ob der Laden so etwas führt.', en: 'At the phone store, an assistant offers help — say what you are looking for and ask whether the store carries those.' },
    pedagogicalGoal: 'Eine Suche nennen und „Do you carry those?“ als feste Nachfrage verwenden.',
    targetText: "I'm looking for a SIM card. Do you carry those?",
    baseText: { de: 'Ich suche eine SIM-Karte. Führen Sie so etwas?' },
    chunks: [{ targetText: "I'm looking for", baseText: { de: 'Ich suche' } }, { targetText: 'a SIM card.', baseText: { de: 'eine SIM-Karte.' } }, { targetText: 'Do you carry those?', baseText: { de: 'Führen Sie so etwas?' } }],
    terms: [{ targetText: 'looking for', baseText: { de: 'suchen' } }, { targetText: 'SIM card', baseText: { de: 'SIM-Karte' } }, { targetText: 'carry', baseText: { de: 'führen' } }, { targetText: 'carry those', baseText: { de: 'so etwas führen' } }, { targetText: 'phone store', baseText: { de: 'Telefonladen' } }],
    recall: { before: "I'm looking for a SIM card. Do you ", answer: 'carry', after: ' those?', fallbackChoices: ['carry', 'sell', 'fix', 'charge'] },
    speakRequired: ['looking', 'card', 'carry'],
    sceneCaption: { de: 'Ein Mitarbeiter im Telefonladen lächelt und fragt: „Can I help you find something?“' },
    trophyWord: { word: 'carry', meaning: { de: 'führen' }, example: 'Do you carry phone chargers?', whyThisWord: { de: 'carry ist die natürliche Frage, wenn du wissen möchtest, ob ein Laden einen Artikel führt.' } },
    distractors: ['A new phone case,', 'with more data.'],
    placeholderCaption: { de: 'Ein heller Telefonladen mit SIM-Karten hinter dem Verkaufstresen.' },
    songMood: 'a practical city errand with a quick answer',
    visualNotes: 'Phone store with accessory walls, SIM packages, and an assistant ready to help.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'how-many-minutes-is-it-on-foot-from-here',
    title: { de: 'Wie viele Minuten?' },
    situation: { de: 'Ein Passant sagt nur, dass der Laden um die Ecke ist – du fragst genauer nach der Gehzeit.', en: 'A passerby only says that the store is around the corner — ask more precisely about the walking time.' },
    pedagogicalGoal: 'Eine vage Wegangabe mit einer Frage nach Minuten zu Fuß präzisieren.',
    targetText: 'How many minutes is it on foot to the store?',
    baseText: { de: 'Wie viele Minuten sind es zu Fuß zum Laden?' },
    chunks: [{ targetText: 'How many minutes', baseText: { de: 'Wie viele Minuten' } }, { targetText: 'is it on foot', baseText: { de: 'sind es zu Fuß' } }, { targetText: 'to the store?', baseText: { de: 'zum Laden?' } }],
    terms: [{ targetText: 'how many minutes', baseText: { de: 'wie viele Minuten' } }, { targetText: 'on foot', baseText: { de: 'zu Fuß' } }, { targetText: 'to the store', baseText: { de: 'zum Laden' } }, { targetText: 'around the corner', baseText: { de: 'um die Ecke' } }, { targetText: 'walking time', baseText: { de: 'Gehzeit' } }],
    recall: { before: 'How many minutes is it on ', answer: 'foot', after: ' to the store?', fallbackChoices: ['foot', 'train', 'bike', 'subway'] },
    speakRequired: ['minutes', 'foot', 'store'],
    sceneCaption: { de: 'Ein Passant deutet die Straße hinunter und sagt: „It’s right around the corner.“' },
    trophyWord: { word: 'foot', meaning: { de: 'Fuß' }, example: 'The library is ten minutes away on foot.', whyThisWord: { de: 'foot macht aus einer ungenauen Richtung eine konkrete Frage nach der Gehzeit.' } },
    distractors: ['Across the bridge,', 'after the traffic light.'],
    placeholderCaption: { de: 'Eine Straßenecke mit einem Wegweiser und einem Passanten, der den Weg zeigt.' },
    songMood: 'a curious walk through an unfamiliar block',
    visualNotes: 'City street corner, a local pointing down the block, and a walking route ahead.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'yes-thank-you-could-i-have-the-bill-please',
    title: { de: 'Die Rechnung, bitte' },
    situation: { de: 'Im Restaurant erkundigt sich die Bedienung, ob alles in Ordnung ist – du bestätigst es und bittest höflich um die Rechnung.', en: 'At the restaurant, the server asks whether everything is all right — confirm it and politely ask for the bill.' },
    pedagogicalGoal: 'Nach einer positiven Rückmeldung mit „Could I have …?“ um die Rechnung bitten.',
    targetText: 'Yes, thank you. Could I have the bill, please?',
    baseText: { de: 'Ja, danke. Könnte ich bitte die Rechnung haben?' },
    chunks: [{ targetText: 'Yes, thank you.', baseText: { de: 'Ja, danke.' } }, { targetText: 'Could I have', baseText: { de: 'Könnte ich haben' } }, { targetText: 'the bill, please?', baseText: { de: 'bitte die Rechnung?' } }],
    terms: [{ targetText: 'could I have', baseText: { de: 'könnte ich haben' } }, { targetText: 'bill', baseText: { de: 'Rechnung' } }, { targetText: 'thank you', baseText: { de: 'danke' } }, { targetText: 'restaurant server', baseText: { de: 'Bedienung im Restaurant' } }, { targetText: 'everything', baseText: { de: 'alles' } }],
    recall: { before: 'Yes, thank you. ', answer: 'Could', after: ' I have the bill, please?', fallbackChoices: ['Could', 'Would', 'May', 'Can'] },
    speakRequired: ['could', 'bill', 'please'],
    sceneCaption: { de: 'Die Bedienung nimmt die Teller weg und fragt: „Is everything all right?“' },
    trophyWord: { word: 'could', meaning: { de: 'könnte' }, example: 'Could I have some water, please?', whyThisWord: { de: 'could macht deine Bitte um die Rechnung freundlich und natürlich.' } },
    distractors: ['The dessert menu,', 'after another coffee.'],
    placeholderCaption: { de: 'Ein Restauranttisch nach dem Essen, während die Bedienung eine Rechnungsmappe bereithält.' },
    songMood: 'a relaxed lunch ending on a polite note',
    visualNotes: 'Small restaurant table, finished plates, and a server holding a discreet bill folder.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'my-booking-is-under-the-name-martin',
    title: { de: 'Auf den Namen Martin' },
    situation: { de: 'An der Hotelrezeption wird nach dem Namen deiner Buchung gefragt – du nennst ihn klar.', en: 'At the hotel reception, you are asked for the name on your booking — state it clearly.' },
    pedagogicalGoal: 'Eine Hotelbuchung mit „under the name“ eindeutig angeben.',
    targetText: 'My booking is under the name Martin.',
    baseText: { de: 'Meine Buchung läuft auf den Namen Martin.' },
    chunks: [{ targetText: 'My booking', baseText: { de: 'Meine Buchung' } }, { targetText: 'is under', baseText: { de: 'läuft auf' } }, { targetText: 'the name Martin.', baseText: { de: 'den Namen Martin.' } }],
    terms: [{ targetText: 'booking', baseText: { de: 'Buchung' } }, { targetText: 'under the name', baseText: { de: 'auf den Namen' } }, { targetText: 'name', baseText: { de: 'Name' } }, { targetText: 'hotel reception', baseText: { de: 'Hotelrezeption' } }, { targetText: 'reservation number', baseText: { de: 'Buchungsnummer' } }],
    recall: { before: 'My ', answer: 'booking', after: ' is under the name Martin.', fallbackChoices: ['booking', 'ticket', 'receipt', 'passport'] },
    speakRequired: ['booking', 'under', 'name'],
    sceneCaption: { de: 'Die Rezeptionistin schaut auf den Bildschirm und fragt: „What name is the booking under?“' },
    trophyWord: { word: 'booking', meaning: { de: 'Buchung' }, example: 'My booking is for two nights.', whyThisWord: { de: 'booking benennt genau das, wonach die Rezeption bei deiner Ankunft sucht.' } },
    distractors: ['For one night,', 'near the elevator.'],
    placeholderCaption: { de: 'Eine Rezeptionistin prüft eine Hotelbuchung auf einem Bildschirm.' },
    songMood: 'a calm arrival with a room waiting',
    visualNotes: 'Hotel reception, a booking screen, and a key card beside a polished counter.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'nothing-else-thanks-whats-the-total-please',
    title: { de: 'Nichts weiter' },
    situation: { de: 'In der Apotheke wird gefragt, ob du noch etwas brauchst – du verneinst und fragst höflich nach dem Gesamtbetrag.', en: 'At the pharmacy, you are asked whether you need anything else — decline and politely ask for the total.' },
    pedagogicalGoal: 'Eine Nachfrage in der Apotheke freundlich abschließen und nach dem Gesamtbetrag fragen.',
    targetText: "Nothing else, thanks. What's the total, please?",
    baseText: { de: 'Nichts weiter, danke. Wie hoch ist der Gesamtbetrag, bitte?' },
    chunks: [{ targetText: 'Nothing else,', baseText: { de: 'Nichts weiter,' } }, { targetText: 'thanks.', baseText: { de: 'danke.' } }, { targetText: "What's the total,", baseText: { de: 'Wie hoch ist der Gesamtbetrag,' } }, { targetText: 'please?', baseText: { de: 'bitte?' } }],
    terms: [{ targetText: 'nothing else', baseText: { de: 'nichts weiter' } }, { targetText: 'total', baseText: { de: 'Gesamtbetrag' } }, { targetText: 'pharmacy', baseText: { de: 'Apotheke' } }, { targetText: 'medicine', baseText: { de: 'Medikament' } }, { targetText: 'please', baseText: { de: 'bitte' } }],
    recall: { before: '', answer: 'Nothing', after: " else, thanks. What's the total, please?", fallbackChoices: ['Nothing', 'Something', 'Medicine', 'Water'] },
    speakRequired: ['nothing', 'else', 'total'],
    sceneCaption: { de: 'Der Apotheker stellt die Schachtel hin und fragt: „Anything else?“' },
    trophyWord: { word: 'nothing', meaning: { de: 'nichts' }, example: 'Nothing else is on my list today.', whyThisWord: { de: 'nothing hilft dir, eine Nachfrage an der Apothekentheke klar und höflich zu beenden.' } },
    distractors: ['A bottle of water,', 'for my headache.'],
    placeholderCaption: { de: 'Ein Apotheker steht hinter dem Tresen neben einer kleinen Medikamentenschachtel.' },
    songMood: 'a quick helpful errand on a quiet afternoon',
    visualNotes: 'Neighborhood pharmacy, a small medicine box on the counter, and a pharmacist ready to help.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'the-subway-is-at-the-end-of-the-street',
    title: { de: 'Am Ende der Straße' },
    situation: { de: 'Ein Tourist fragt dich nach der U-Bahn – du hilfst mit einer klaren Wegangabe.', en: 'A tourist asks you where the subway is — help with a clear direction.' },
    pedagogicalGoal: 'Eine Ortsangabe mit „at the end of the street“ verständlich weitergeben.',
    targetText: 'The subway is at the end of the street.',
    baseText: { de: 'Die U-Bahn ist am Ende der Straße.' },
    chunks: [{ targetText: 'The subway is', baseText: { de: 'Die U-Bahn ist' } }, { targetText: 'at the end', baseText: { de: 'am Ende' } }, { targetText: 'of the street.', baseText: { de: 'der Straße.' } }],
    terms: [{ targetText: 'subway', baseText: { de: 'U-Bahn' } }, { targetText: 'end of the street', baseText: { de: 'Ende der Straße' } }, { targetText: 'direction', baseText: { de: 'Wegbeschreibung' } }, { targetText: 'tourist', baseText: { de: 'Tourist' } }, { targetText: 'subway entrance', baseText: { de: 'U-Bahn-Eingang' } }],
    recall: { before: 'The ', answer: 'subway', after: ' is at the end of the street.', fallbackChoices: ['subway', 'market', 'library', 'pharmacy'] },
    speakRequired: ['subway', 'end', 'street'],
    sceneCaption: { de: 'Ein Tourist bleibt an der Ecke stehen und fragt: „Excuse me, where is the subway?“' },
    trophyWord: { word: 'subway', meaning: { de: 'U-Bahn' }, example: 'The subway stops near the market.', whyThisWord: { de: 'subway benennt das Ziel klar, wenn du jemandem in der Stadt den Weg erklärst.' } },
    distractors: ['Turn left here,', 'past the park.'],
    placeholderCaption: { de: 'Ein Tourist mit Stadtplan steht an einer Ecke nahe einem U-Bahn-Eingang.' },
    songMood: 'a friendly moment of local confidence',
    visualNotes: 'City corner, subway entrance down the block, and a helpful local pointing along the street.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'half-a-pound-of-apples-and-two-lemons-too',
    title: { de: 'Obst am Markt' },
    situation: { de: 'Am Obststand fragt der Händler nach der gewünschten Menge – du bestellst Äpfel und ergänzt zwei Zitronen.', en: 'At the fruit stand, the vendor asks how much you would like — order apples and add two lemons.' },
    pedagogicalGoal: 'Eine Menge mit „half a pound“ nennen und einen zweiten Artikel hinzufügen.',
    targetText: 'Half a pound of apples, and two lemons too.',
    baseText: { de: 'Ein halbes Pfund Äpfel und auch zwei Zitronen.' },
    chunks: [{ targetText: 'Half a pound', baseText: { de: 'ein halbes Pfund' } }, { targetText: 'of apples,', baseText: { de: 'Äpfel,' } }, { targetText: 'and two lemons too.', baseText: { de: 'und auch zwei Zitronen.' } }],
    terms: [{ targetText: 'half a pound', baseText: { de: 'ein halbes Pfund' } }, { targetText: 'apples', baseText: { de: 'Äpfel' } }, { targetText: 'lemons', baseText: { de: 'Zitronen' } }, { targetText: 'fruit stand', baseText: { de: 'Obststand' } }, { targetText: 'how much', baseText: { de: 'wie viel' } }],
    recall: { before: 'Half a ', answer: 'pound', after: ' of apples, and two lemons too.', fallbackChoices: ['pound', 'basket', 'bottle', 'slice'] },
    speakRequired: ['pound', 'apples', 'lemons'],
    sceneCaption: { de: 'Der Obsthändler hält eine Tüte auf und fragt: „How much would you like?“' },
    trophyWord: { word: 'pound', meaning: { de: 'Pfund' }, example: 'I need a pound of apples for pie.', whyThisWord: { de: 'pound gibt dir am Markt eine praktische Mengenangabe für Obst.' } },
    distractors: ['Three ripe peaches,', 'in a paper bag.'],
    placeholderCaption: { de: 'Ein Obststand mit Äpfeln, Zitronen und einer geöffneten Papiertüte.' },
    songMood: 'a colorful market stop with fruit in the sun',
    visualNotes: 'Market stall laden with apples and lemons, a vendor weighing fruit on a small scale.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-good-thanks-i-already-know-the-neighborhood-a-bit',
    title: { de: 'Schon etwas vertraut' },
    situation: { de: 'Im Treppenhaus fragt ein Nachbar, wie es dir geht – du beruhigst ihn und sagst, dass du die Gegend schon etwas kennst.', en: 'In the stairwell, a neighbor asks how you are doing — reassure them and say that you already know the neighborhood a bit.' },
    pedagogicalGoal: 'Auf eine freundliche Nachbarschaftsfrage positiv reagieren und „already“ verwenden.',
    targetText: "I'm good, thanks. I already know the neighborhood a bit.",
    baseText: { de: 'Mir geht es gut, danke. Ich kenne die Gegend schon ein bisschen.' },
    chunks: [{ targetText: "I'm good, thanks.", baseText: { de: 'Mir geht es gut, danke.' } }, { targetText: 'I already know', baseText: { de: 'Ich kenne schon' } }, { targetText: 'the neighborhood a bit.', baseText: { de: 'die Gegend ein bisschen.' } }],
    terms: [{ targetText: 'already know', baseText: { de: 'schon kennen' } }, { targetText: 'neighborhood', baseText: { de: 'Gegend' } }, { targetText: 'a bit', baseText: { de: 'ein bisschen' } }, { targetText: 'stairwell', baseText: { de: 'Treppenhaus' } }, { targetText: 'doing', baseText: { de: 'gehen' } }],
    recall: { before: "I'm good, thanks. I ", answer: 'already', after: ' know the neighborhood a bit.', fallbackChoices: ['already', 'usually', 'often', 'always'] },
    speakRequired: ['good', 'already', 'neighborhood'],
    sceneCaption: { de: 'Dein Nachbar öffnet im Treppenhaus die Tür und fragt: „How’s it going?“' },
    trophyWord: { word: 'already', meaning: { de: 'schon' }, example: 'I already know this street.', whyThisWord: { de: 'already zeigt deinem Nachbarn, dass dir die neue Gegend nicht mehr ganz fremd ist.' } },
    distractors: ['The elevator is slow,', 'on the top floor.'],
    placeholderCaption: { de: 'Zwei Nachbarn stehen im hellen Treppenhaus eines Wohnhauses.' },
    songMood: 'a warm everyday hello among new neighbors',
    visualNotes: 'Apartment stairwell, a friendly neighbor at a doorway, and a small sense of belonging.',
  }),
]

export const ENGLISH_A2_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_ONE_METADATA, englishA2Practical1Inputs,
  { de: 'Du hast Englisch A2 Praxis 1 abgeschlossen – du kannst vertraute Alltagsgespräche aufnehmen und passende Rückfragen stellen.' },
)

export const GUIDED_TODAY_PATH_ENGLISH_A2_TWO_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-2',
  title: 'English A2 Practical 2',
  shortTitle: 'A2 Practical 2',
  subtitle: { de: 'Diese hier, weil: Vorlieben begründen' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical2Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'ill-take-these-because-theyre-cheaper',
    title: { de: 'Die günstigeren Tomaten' },
    situation: { de: 'Der Händler zeigt dir zwei Tomatensorten und fragt, welche du nehmen möchtest – du triffst eine begründete Wahl.', en: 'The vendor shows you two kinds of tomatoes and asks which you would like — make a reasoned choice.' },
    pedagogicalGoal: 'Eine Marktentscheidung mit „because“ und „cheaper“ begründen.',
    targetText: "I'll take these, because they're cheaper.",
    baseText: { de: 'Ich nehme diese, weil sie günstiger sind.' },
    chunks: [{ targetText: "I'll take these,", baseText: { de: 'Ich nehme diese,' } }, { targetText: "because they're", baseText: { de: 'weil sie' } }, { targetText: 'cheaper.', baseText: { de: 'günstiger sind.' } }],
    terms: [{ targetText: 'take these', baseText: { de: 'diese nehmen' } }, { targetText: 'because', baseText: { de: 'weil' } }, { targetText: 'cheaper', baseText: { de: 'günstiger' } }, { targetText: 'tomatoes', baseText: { de: 'Tomaten' } }, { targetText: 'vendor', baseText: { de: 'Händler' } }],
    recall: { before: "I'll take these, because they're ", answer: 'cheaper', after: '.', fallbackChoices: ['cheaper', 'riper', 'smaller', 'softer'] },
    speakRequired: ['take', 'these', 'cheaper'],
    sceneCaption: { de: 'Der Händler zeigt auf zwei Kisten und fragt: „Which tomatoes would you like?“' },
    trophyWord: { word: 'cheaper', meaning: { de: 'günstiger' }, example: 'These apples are cheaper than those.', whyThisWord: { de: 'cheaper gibt dir am Markt einen einfachen, konkreten Grund für deine Wahl.' } },
    distractors: ['The red ones,', 'for a salad.'],
    placeholderCaption: { de: 'Zwei Kisten mit unterschiedlich ausgezeichneten Tomaten an einem Marktstand.' },
    songMood: 'a colorful market decision in the morning sun',
    visualNotes: 'Close-up of tomato crates, price signs, and a shopper comparing the options.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'ill-have-juice-today-because-coffee-is-stronger',
    title: { de: 'Heute lieber Saft' },
    situation: { de: 'Im Café fragt die Barista nach deinem üblichen Kaffee – heute wählst du etwas anderes und nennst den Grund.', en: 'At the cafe, the barista asks about your usual coffee — today choose something else and give the reason.' },
    pedagogicalGoal: 'Eine Getränkewahl mit „stronger“ begründen.',
    targetText: "I'll have juice today, because coffee is stronger.",
    baseText: { de: 'Heute nehme ich Saft, weil Kaffee stärker ist.' },
    chunks: [{ targetText: "I'll have juice today,", baseText: { de: 'Heute nehme ich Saft,' } }, { targetText: 'because coffee', baseText: { de: 'weil Kaffee' } }, { targetText: 'is stronger.', baseText: { de: 'stärker ist.' } }],
    terms: [{ targetText: 'have juice', baseText: { de: 'Saft nehmen' } }, { targetText: 'today', baseText: { de: 'heute' } }, { targetText: 'stronger', baseText: { de: 'stärker' } }, { targetText: 'coffee', baseText: { de: 'Kaffee' } }, { targetText: 'usual drink', baseText: { de: 'übliches Getränk' } }],
    recall: { before: "I'll have juice today, because coffee is ", answer: 'stronger', after: '.', fallbackChoices: ['stronger', 'sweeter', 'colder', 'larger'] },
    speakRequired: ['juice', 'coffee', 'stronger'],
    sceneCaption: { de: 'Die Barista greift nach einer Tasse und fragt: „Your usual coffee today?“' },
    trophyWord: { word: 'stronger', meaning: { de: 'stärker' }, example: 'This coffee is stronger than tea.', whyThisWord: { de: 'stronger erklärt einfach, warum du heute lieber ein anderes Getränk nimmst.' } },
    distractors: ['A hot chocolate,', 'with extra ice.'],
    placeholderCaption: { de: 'Ein Saftglas steht neben einer unberührten Kaffeetasse an der Cafétheke.' },
    songMood: 'a gentle change of pace at a familiar cafe',
    visualNotes: 'Cafe counter with orange juice and coffee, as a regular chooses a different drink.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-prefer-the-blue-shirt-because-its-larger',
    title: { de: 'Das blaue Hemd' },
    situation: { de: 'Im Kleidungsladen hält die Verkäuferin zwei Hemden hoch – du bevorzugst das blaue, weil es größer ist.', en: 'In the clothing store, the assistant holds up two shirts — prefer the blue one because it is larger.' },
    pedagogicalGoal: 'Zwei Kleidungsstücke mit „larger“ vergleichen.',
    targetText: "I prefer the blue shirt because it's larger.",
    baseText: { de: 'Ich bevorzuge das blaue Hemd, weil es größer ist.' },
    chunks: [{ targetText: 'I prefer', baseText: { de: 'Ich bevorzuge' } }, { targetText: 'the blue shirt', baseText: { de: 'das blaue Hemd' } }, { targetText: "because it's larger.", baseText: { de: 'weil es größer ist.' } }],
    terms: [{ targetText: 'prefer', baseText: { de: 'bevorzugen' } }, { targetText: 'blue shirt', baseText: { de: 'blaues Hemd' } }, { targetText: 'larger', baseText: { de: 'größer' } }, { targetText: 'clothing store', baseText: { de: 'Kleidungsladen' } }, { targetText: 'size', baseText: { de: 'Größe' } }],
    recall: { before: 'I prefer the blue ', answer: 'shirt', after: " because it's larger.", fallbackChoices: ['shirt', 'jacket', 'skirt', 'sweater'] },
    speakRequired: ['blue', 'shirt', 'larger'],
    sceneCaption: { de: 'Die Verkäuferin hält beide Hemden vor dich und fragt: „Which one do you prefer?“' },
    trophyWord: { word: 'shirt', meaning: { de: 'Hemd' }, example: 'The blue shirt is larger than mine.', whyThisWord: { de: 'shirt verankert deinen Vergleich an einem konkreten Kleidungsstück im Laden.' } },
    distractors: ['The green jacket,', 'in a medium size.'],
    placeholderCaption: { de: 'Eine Verkäuferin zeigt ein blaues und ein helles Hemd auf einem Kleiderständer.' },
    songMood: 'a lighthearted fitting-room choice',
    visualNotes: 'Clothing rack, two shirts held side by side, and a shopper comparing their size.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'ill-take-the-salad-because-its-lighter-than-the-soup',
    title: { de: 'Etwas Leichteres' },
    situation: { de: 'Die Bedienung fragt, ob du Suppe oder Salat möchtest – du wählst den Salat und vergleichst die beiden Gerichte.', en: 'The server asks whether you would like soup or salad — choose the salad and compare the two dishes.' },
    pedagogicalGoal: 'Eine Bestellung mit „lighter than“ begründen.',
    targetText: "I'll take the salad because it's lighter than the soup.",
    baseText: { de: 'Ich nehme den Salat, weil er leichter als die Suppe ist.' },
    chunks: [{ targetText: "I'll take the salad", baseText: { de: 'Ich nehme den Salat' } }, { targetText: "because it's lighter", baseText: { de: 'weil er leichter ist' } }, { targetText: 'than the soup.', baseText: { de: 'als die Suppe.' } }],
    terms: [{ targetText: 'take the salad', baseText: { de: 'den Salat nehmen' } }, { targetText: 'lighter than', baseText: { de: 'leichter als' } }, { targetText: 'soup', baseText: { de: 'Suppe' } }, { targetText: 'salad', baseText: { de: 'Salat' } }, { targetText: 'restaurant dish', baseText: { de: 'Restaurantgericht' } }],
    recall: { before: "I'll take the salad because it's ", answer: 'lighter', after: ' than the soup.', fallbackChoices: ['lighter', 'hotter', 'saltier', 'larger'] },
    speakRequired: ['salad', 'lighter', 'soup'],
    sceneCaption: { de: 'Die Bedienung hält die Speisekarte offen und fragt: „Would you like soup or salad?“' },
    trophyWord: { word: 'lighter', meaning: { de: 'leichter' }, example: 'A salad is lighter than a sandwich.', whyThisWord: { de: 'lighter gibt dir im Restaurant einen einfachen Grund für deine Wahl.' } },
    distractors: ['The chicken sandwich,', 'after the soup.'],
    placeholderCaption: { de: 'Ein Restauranttisch mit einer grünen Salatschüssel und einer Suppenterrine.' },
    songMood: 'an easy lunch choice in a sunny bistro',
    visualNotes: 'Bistro table with salad and soup, an open menu, and a server waiting patiently.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'ill-take-this-bread-because-its-fresher',
    title: { de: 'Frischeres Brot' },
    situation: { de: 'In der Bäckerei zeigt dir der Bäcker zwei Brote – du nimmst das frischere.', en: 'At the bakery, the baker shows you two loaves — take the fresher one.' },
    pedagogicalGoal: 'Mit „fresher“ einen Brotvergleich abschließen.',
    targetText: "I'll take this bread because it's fresher.",
    baseText: { de: 'Ich nehme dieses Brot, weil es frischer ist.' },
    chunks: [{ targetText: "I'll take", baseText: { de: 'Ich nehme' } }, { targetText: 'this bread', baseText: { de: 'dieses Brot' } }, { targetText: "because it's fresher.", baseText: { de: 'weil es frischer ist.' } }],
    terms: [{ targetText: 'take this bread', baseText: { de: 'dieses Brot nehmen' } }, { targetText: 'bread', baseText: { de: 'Brot' } }, { targetText: 'fresher', baseText: { de: 'frischer' } }, { targetText: 'bakery', baseText: { de: 'Bäckerei' } }, { targetText: 'loaf', baseText: { de: 'Laib' } }],
    recall: { before: "I'll take this ", answer: 'bread', after: " because it's fresher.", fallbackChoices: ['bread', 'cake', 'cookie', 'cheese'] },
    speakRequired: ['bread', 'fresher', 'take'],
    sceneCaption: { de: 'Der Bäcker legt zwei Laibe auf das Papier und fragt: „Which loaf would you like?“' },
    trophyWord: { word: 'bread', meaning: { de: 'Brot' }, example: 'This bread is fresh this morning.', whyThisWord: { de: 'bread macht deinen Vergleich in der Bäckerei greifbar und direkt nützlich.' } },
    distractors: ['The sweet roll,', 'with a paper bag.'],
    placeholderCaption: { de: 'Zwei goldene Brotlaibe liegen auf Papier an einer Bäckereitheke.' },
    songMood: 'the warm scent of a just-opened bakery',
    visualNotes: 'Bakery counter, fresh loaves, and a baker comparing two crusty breads for a customer.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'ill-take-the-subway-because-its-faster-than-the-bus',
    title: { de: 'Lieber mit der U-Bahn' },
    situation: { de: 'Ein Nachbar fragt, ob du den Bus nimmst – du erklärst, warum die U-Bahn für dich besser passt.', en: 'A neighbor asks whether you are taking the bus — explain why the subway suits you better.' },
    pedagogicalGoal: 'U-Bahn und Bus mit „faster than“ vergleichen.',
    targetText: "I'll take the subway because it's faster than the bus.",
    baseText: { de: 'Ich nehme die U-Bahn, weil sie schneller als der Bus ist.' },
    chunks: [{ targetText: "I'll take the subway", baseText: { de: 'Ich nehme die U-Bahn' } }, { targetText: "because it's faster", baseText: { de: 'weil sie schneller ist' } }, { targetText: 'than the bus.', baseText: { de: 'als der Bus.' } }],
    terms: [{ targetText: 'take the subway', baseText: { de: 'die U-Bahn nehmen' } }, { targetText: 'faster than', baseText: { de: 'schneller als' } }, { targetText: 'bus', baseText: { de: 'Bus' } }, { targetText: 'subway', baseText: { de: 'U-Bahn' } }, { targetText: 'route', baseText: { de: 'Strecke' } }],
    recall: { before: "I'll take the subway because it's ", answer: 'faster', after: ' than the bus.', fallbackChoices: ['faster', 'cleaner', 'cheaper', 'quieter'] },
    speakRequired: ['subway', 'faster', 'bus'],
    sceneCaption: { de: 'Dein Nachbar wartet an der Haltestelle und fragt: „Are you taking the bus?“' },
    trophyWord: { word: 'faster', meaning: { de: 'schneller' }, example: 'The subway is faster than the bus.', whyThisWord: { de: 'faster liefert einen einfachen Grund für deine Verkehrsmittelwahl in der Stadt.' } },
    distractors: ['The bus stop,', 'after the bridge.'],
    placeholderCaption: { de: 'Ein U-Bahn-Zugang liegt neben einer belebten Bushaltestelle.' },
    songMood: 'a quick city route with a confident choice',
    visualNotes: 'Subway entrance and bus stop on the same street, as a commuter chooses the faster route.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-prefer-this-room-because-its-quieter-and-i-sleep-better',
    title: { de: 'Das ruhigere Zimmer' },
    situation: { de: 'An der Rezeption werden dir zwei Zimmer angeboten – du wählst das ruhigere, weil du dort besser schläfst.', en: 'At reception, you are offered two rooms — choose the quieter one because you sleep better there.' },
    pedagogicalGoal: 'Eine Zimmerwahl mit „quieter“ und einem einfachen Grund begründen.',
    targetText: "I prefer this room because it's quieter and I sleep better.",
    baseText: { de: 'Ich bevorzuge dieses Zimmer, weil es ruhiger ist und ich besser schlafe.' },
    chunks: [{ targetText: 'I prefer this room', baseText: { de: 'Ich bevorzuge dieses Zimmer' } }, { targetText: "because it's quieter", baseText: { de: 'weil es ruhiger ist' } }, { targetText: 'and I sleep better.', baseText: { de: 'und ich besser schlafe.' } }],
    terms: [{ targetText: 'prefer this room', baseText: { de: 'dieses Zimmer bevorzugen' } }, { targetText: 'quieter', baseText: { de: 'ruhiger' } }, { targetText: 'sleep better', baseText: { de: 'besser schlafen' } }, { targetText: 'hotel room', baseText: { de: 'Hotelzimmer' } }, { targetText: 'reception desk', baseText: { de: 'Rezeption' } }],
    recall: { before: "I prefer this room because it's ", answer: 'quieter', after: ' and I sleep better.', fallbackChoices: ['quieter', 'larger', 'brighter', 'cleaner'] },
    speakRequired: ['room', 'quieter', 'sleep'],
    sceneCaption: { de: 'Die Rezeptionistin zeigt zwei Schlüsselkarten und fragt: „Which room do you prefer?“' },
    trophyWord: { word: 'quieter', meaning: { de: 'ruhiger' }, example: 'This room is quieter at night.', whyThisWord: { de: 'quieter erklärt, warum dieses Zimmer besser zu deinem Schlaf passt.' } },
    distractors: ['The room upstairs,', 'with a balcony.'],
    placeholderCaption: { de: 'Zwei Schlüsselkarten liegen auf einem Rezeptionstresen vor einem ruhigen Flur.' },
    songMood: 'a peaceful evening settling into a new room',
    visualNotes: 'Hotel reception, two room keys, and a quiet corridor fading into soft evening light.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'ill-take-these-shoes-because-theyre-more-comfortable',
    title: { de: 'Die bequemeren Schuhe' },
    situation: { de: 'Auf dem Markt probierst du zwei Paar Schuhe an – du wählst das bequemere Paar.', en: 'At the market, you try on two pairs of shoes — choose the more comfortable pair.' },
    pedagogicalGoal: 'Schuhe mit „more comfortable“ vergleichen.',
    targetText: "I'll take these shoes because they're more comfortable.",
    baseText: { de: 'Ich nehme diese Schuhe, weil sie bequemer sind.' },
    chunks: [{ targetText: "I'll take", baseText: { de: 'Ich nehme' } }, { targetText: 'these shoes', baseText: { de: 'diese Schuhe' } }, { targetText: "because they're more comfortable.", baseText: { de: 'weil sie bequemer sind.' } }],
    terms: [{ targetText: 'these shoes', baseText: { de: 'diese Schuhe' } }, { targetText: 'more comfortable', baseText: { de: 'bequemer' } }, { targetText: 'take shoes', baseText: { de: 'Schuhe nehmen' } }, { targetText: 'shoe market', baseText: { de: 'Schuhstand auf dem Markt' } }, { targetText: 'pair of shoes', baseText: { de: 'Paar Schuhe' } }],
    recall: { before: "I'll take these shoes because they're more ", answer: 'comfortable', after: '.', fallbackChoices: ['comfortable', 'colorful', 'expensive', 'formal'] },
    speakRequired: ['shoes', 'more', 'comfortable'],
    sceneCaption: { de: 'Der Verkäufer stellt beide Paare vor dich und fragt: „Which pair feels better?“' },
    trophyWord: { word: 'comfortable', meaning: { de: 'bequem' }, example: 'These shoes are comfortable for walking.', whyThisWord: { de: 'comfortable gibt deiner Wahl am Markt einen klaren, alltagstauglichen Grund.' } },
    distractors: ['The black pair,', 'for a party.'],
    placeholderCaption: { de: 'Zwei Paar Schuhe liegen auf einer Marktbank, eines wird gerade anprobiert.' },
    songMood: 'a lively market find that feels just right',
    visualNotes: 'Shoe stall, customer trying on a pair, and a vendor holding the second option nearby.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'ill-take-the-smaller-bottle-because-it-costs-less',
    title: { de: 'Die kleinere Flasche' },
    situation: { de: 'Im Laden stehen zwei Flaschengrößen im Regal – du nimmst die kleinere, weil sie weniger kostet.', en: 'In the store, two bottle sizes are on the shelf — take the smaller one because it costs less.' },
    pedagogicalGoal: 'Mit „smaller“ und „costs less“ eine Größenwahl begründen.',
    targetText: "I'll take the smaller bottle because it costs less.",
    baseText: { de: 'Ich nehme die kleinere Flasche, weil sie weniger kostet.' },
    chunks: [{ targetText: "I'll take", baseText: { de: 'Ich nehme' } }, { targetText: 'the smaller bottle', baseText: { de: 'die kleinere Flasche' } }, { targetText: 'because it costs less.', baseText: { de: 'weil sie weniger kostet.' } }],
    terms: [{ targetText: 'smaller bottle', baseText: { de: 'kleinere Flasche' } }, { targetText: 'costs less', baseText: { de: 'kostet weniger' } }, { targetText: 'bottle size', baseText: { de: 'Flaschengröße' } }, { targetText: 'store shelf', baseText: { de: 'Ladenregal' } }, { targetText: 'price label', baseText: { de: 'Preisschild' } }],
    recall: { before: "I'll take the ", answer: 'smaller', after: ' bottle because it costs less.', fallbackChoices: ['smaller', 'larger', 'lighter', 'newer'] },
    speakRequired: ['smaller', 'bottle', 'costs'],
    sceneCaption: { de: 'Die Verkäuferin deutet auf beide Größen und fragt: „Which bottle would you like?“' },
    trophyWord: { word: 'smaller', meaning: { de: 'kleiner' }, example: 'The smaller bottle costs less.', whyThisWord: { de: 'smaller verbindet deine Größenwahl im Laden direkt mit dem Preis.' } },
    distractors: ['The large carton,', 'on the lower shelf.'],
    placeholderCaption: { de: 'Eine kleine und eine große Flasche mit Preisschildern stehen im Ladenregal.' },
    songMood: 'a simple practical choice on a shopping run',
    visualNotes: 'Store shelf with two bottle sizes, clear price labels, and a customer pointing at the smaller one.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'this-cafe-is-my-favorite-because-its-calm',
    title: { de: 'Dein Lieblingscafé' },
    situation: { de: 'Ein Nachbar fragt nach deinem Lieblingsort im Viertel – du nennst dieses Café und erklärst kurz, warum.', en: 'A neighbor asks for your favorite place in the neighborhood — name this cafe and briefly explain why.' },
    pedagogicalGoal: 'Eine Ortsvorliebe mit „favorite“ und „because“ begründen.',
    targetText: "This cafe is my favorite because it's close and quiet.",
    baseText: { de: 'Dieses Café ist mein Lieblingsort, weil es nah und ruhig ist.' },
    chunks: [{ targetText: 'This cafe is', baseText: { de: 'Dieses Café ist' } }, { targetText: 'my favorite', baseText: { de: 'mein Lieblingsort' } }, { targetText: "because it's close and quiet.", baseText: { de: 'weil es nah und ruhig ist.' } }],
    terms: [{ targetText: 'favorite', baseText: { de: 'Lieblingsort' } }, { targetText: 'close and quiet', baseText: { de: 'nah und ruhig' } }, { targetText: 'cafe', baseText: { de: 'Café' } }, { targetText: 'neighborhood', baseText: { de: 'Viertel' } }, { targetText: 'favorite place', baseText: { de: 'Lieblingsort' } }],
    recall: { before: 'This cafe is my ', answer: 'favorite', after: " because it's close and quiet.", fallbackChoices: ['favorite', 'choice', 'corner', 'table'] },
    speakRequired: ['cafe', 'favorite', 'quiet'],
    sceneCaption: { de: 'Dein Nachbar bleibt vor einem Platz stehen und fragt: „What’s your favorite place in the neighborhood?“' },
    trophyWord: { word: 'favorite', meaning: { de: 'Lieblings-' }, example: 'This cafe is my favorite place to read.', whyThisWord: { de: 'favorite macht aus einer einfachen Empfehlung deine persönliche Vorliebe.' } },
    distractors: ['The busy market,', 'after work.'],
    placeholderCaption: { de: 'Ein ruhiges Café an einer Wohnstraße mit einem kleinen Außentisch.' },
    songMood: 'a quiet local favorite shared with a neighbor',
    visualNotes: 'Calm neighborhood cafe, small terrace, and two neighbors chatting on their walk.',
  }),
]

export const ENGLISH_A2_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_TWO_METADATA, englishA2Practical2Inputs,
  { de: 'Du hast Englisch A2 Praxis 2 abgeschlossen – du kannst Vorlieben begründen und einfache Vergleiche im Alltag ziehen.' },
)

export const GUIDED_TODAY_PATH_ENGLISH_A2_THREE_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-3',
  title: 'English A2 Practical 3',
  shortTitle: 'A2 Practical 3',
  subtitle: { de: 'Gestern und gerade eben: erste Erfahrungen erzählen' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical3Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'i-already-paid-at-the-counter',
    title: { de: 'Schon bezahlt' },
    situation: { de: 'An der Cafétür fragt die Barista, ob du noch bezahlen möchtest – du erklärst, dass du es am Tresen schon getan hast.', en: 'At the cafe door, the barista asks whether you still want to pay — explain that you already paid at the counter.' },
    pedagogicalGoal: 'Mit „already paid“ sagen, dass eine Handlung bereits abgeschlossen ist.',
    targetText: 'I already paid at the counter.',
    baseText: { de: 'Ich habe schon am Tresen bezahlt.' },
    chunks: [{ targetText: 'I already', baseText: { de: 'Ich habe schon' } }, { targetText: 'paid', baseText: { de: 'bezahlt' } }, { targetText: 'at the counter.', baseText: { de: 'am Tresen.' } }],
    terms: [{ targetText: 'already paid', baseText: { de: 'schon bezahlt' } }, { targetText: 'counter', baseText: { de: 'Tresen' } }, { targetText: 'pay', baseText: { de: 'bezahlen' } }, { targetText: 'cafe door', baseText: { de: 'Cafétür' } }, { targetText: 'receipt', baseText: { de: 'Kassenbon' } }],
    recall: { before: 'I already ', answer: 'paid', after: ' at the counter.', fallbackChoices: ['paid', 'asked', 'called', 'waited'] },
    speakRequired: ['already', 'paid', 'counter'],
    sceneCaption: { de: 'Die Barista hält den Kartenleser hoch und fragt: „Would you like to pay now?“' },
    trophyWord: { word: 'counter', meaning: { de: 'Tresen' }, example: 'Please pay at the counter.', whyThisWord: { de: 'counter benennt den Ort, an dem du bereits bezahlt hast.' } },
    distractors: ['With my cash,', 'before the train.'],
    placeholderCaption: { de: 'Ein Kartenleser liegt auf einer Cafétheke neben einem Kassenbon.' },
    songMood: 'a quick morning stop already taken care of',
    visualNotes: 'Cafe exit, card terminal on the counter, and a customer ready to continue the day.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-got-in-last-night-around-ten',
    title: { de: 'Gestern angekommen' },
    situation: { de: 'An der Hotelrezeption fragt die Rezeptionistin nach deiner Ankunftszeit – du nennst die Uhrzeit von gestern Abend.', en: 'At the hotel reception, the receptionist asks when you arrived — give your arrival time from last night.' },
    pedagogicalGoal: 'Mit „got in“ eine einfache Ankunftszeit in der Vergangenheit nennen.',
    targetText: 'I got in last night, around ten.',
    baseText: { de: 'Ich bin gestern Abend gegen zehn angekommen.' },
    chunks: [{ targetText: 'I got in', baseText: { de: 'Ich bin angekommen' } }, { targetText: 'last night,', baseText: { de: 'gestern Abend,' } }, { targetText: 'around ten.', baseText: { de: 'gegen zehn.' } }],
    terms: [{ targetText: 'got in', baseText: { de: 'angekommen' } }, { targetText: 'last night', baseText: { de: 'gestern Abend' } }, { targetText: 'around ten', baseText: { de: 'gegen zehn' } }, { targetText: 'arrival time', baseText: { de: 'Ankunftszeit' } }, { targetText: 'receptionist', baseText: { de: 'Rezeptionistin' } }],
    recall: { before: 'I ', answer: 'got', after: ' in last night, around ten.', fallbackChoices: ['got', 'paid', 'bought', 'called'] },
    speakRequired: ['got', 'night', 'around'],
    sceneCaption: { de: 'Die Rezeptionistin prüft den Bildschirm und fragt: „What time did you get in?“' },
    trophyWord: { word: 'around', meaning: { de: 'gegen, ungefähr' }, example: 'The store opens around nine.', whyThisWord: { de: 'around hilft dir, eine ungefähre Ankunftszeit natürlich anzugeben.' } },
    distractors: ['After breakfast,', 'at the airport.'],
    placeholderCaption: { de: 'Eine Rezeptionistin prüft die Ankunftszeit auf einem Bildschirm im Hotel.' },
    songMood: 'a calm late arrival settling into town',
    visualNotes: 'Hotel reception at night, a clock near ten, and a traveler checking in after arrival.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-already-ordered-the-soup-at-the-counter',
    title: { de: 'Schon bestellt' },
    situation: { de: 'Die Bedienung fragt, ob du bestellen möchtest – du erklärst, dass du die Suppe bereits am Tresen bestellt hast.', en: 'The server asks whether you would like to order — explain that you already ordered the soup at the counter.' },
    pedagogicalGoal: 'Mit „already ordered“ sagen, dass eine Bestellung bereits erfolgt ist.',
    targetText: 'I already ordered the soup at the counter.',
    baseText: { de: 'Ich habe die Suppe schon am Tresen bestellt.' },
    chunks: [{ targetText: 'I already ordered', baseText: { de: 'Ich habe schon bestellt' } }, { targetText: 'the soup', baseText: { de: 'die Suppe' } }, { targetText: 'at the counter.', baseText: { de: 'am Tresen.' } }],
    terms: [{ targetText: 'already ordered', baseText: { de: 'schon bestellt' } }, { targetText: 'soup', baseText: { de: 'Suppe' } }, { targetText: 'at the counter', baseText: { de: 'am Tresen' } }, { targetText: 'restaurant order', baseText: { de: 'Restaurantbestellung' } }, { targetText: 'server', baseText: { de: 'Bedienung' } }],
    recall: { before: 'I already ', answer: 'ordered', after: ' the soup at the counter.', fallbackChoices: ['ordered', 'paid', 'bought', 'called'] },
    speakRequired: ['ordered', 'soup', 'counter'],
    sceneCaption: { de: 'Die Bedienung kommt an den Tisch und fragt: „Are you ready to order?“' },
    trophyWord: { word: 'soup', meaning: { de: 'Suppe' }, example: 'I ordered soup for lunch.', whyThisWord: { de: 'soup benennt genau das Gericht, das du bereits bestellt hast.' } },
    distractors: ['A table for two,', 'with extra bread.'],
    placeholderCaption: { de: 'Eine Dampfschüssel Suppe steht neben einem Bestellzettel an einem Restauranttisch.' },
    songMood: 'a simple lunch plan already in motion',
    visualNotes: 'Restaurant counter in the background, a bowl of soup, and a server checking on the order.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-bought-tomatoes-at-the-market-this-morning-before-work',
    title: { de: 'Tomaten am Morgen' },
    situation: { de: 'Ein Nachbar fragt nach deinem Einkauf – du erzählst, was du heute Morgen vor der Arbeit gekauft hast.', en: 'A neighbor asks about your shopping — say what you bought this morning before work.' },
    pedagogicalGoal: 'Mit „bought“ einen einfachen Einkauf von heute Morgen erzählen.',
    targetText: 'I bought tomatoes at the market this morning, before work.',
    baseText: { de: 'Ich habe heute Morgen vor der Arbeit Tomaten auf dem Markt gekauft.' },
    chunks: [{ targetText: 'I bought tomatoes', baseText: { de: 'Ich habe Tomaten gekauft' } }, { targetText: 'at the market', baseText: { de: 'auf dem Markt' } }, { targetText: 'this morning, before work.', baseText: { de: 'heute Morgen vor der Arbeit.' } }],
    terms: [{ targetText: 'bought tomatoes', baseText: { de: 'Tomaten gekauft' } }, { targetText: 'market', baseText: { de: 'Markt' } }, { targetText: 'this morning', baseText: { de: 'heute Morgen' } }, { targetText: 'before work', baseText: { de: 'vor der Arbeit' } }, { targetText: 'shopping bag', baseText: { de: 'Einkaufstasche' } }],
    recall: { before: 'I bought ', answer: 'tomatoes', after: ' at the market this morning, before work.', fallbackChoices: ['tomatoes', 'oranges', 'potatoes', 'carrots'] },
    speakRequired: ['bought', 'tomatoes', 'market'],
    sceneCaption: { de: 'Dein Nachbar sieht deine Tasche und fragt: „What did you buy this morning?“' },
    trophyWord: { word: 'tomatoes', meaning: { de: 'Tomaten' }, example: 'I bought tomatoes for dinner.', whyThisWord: { de: 'tomatoes gibt deiner kurzen Einkaufsgeschichte einen konkreten Gegenstand.' } },
    distractors: ['A new jacket,', 'after the office.'],
    placeholderCaption: { de: 'Eine Einkaufstasche mit roten Tomaten steht auf einem Marktstand.' },
    songMood: 'a fresh city morning before the workday',
    visualNotes: 'Market stall with tomatoes, a small shopping bag, and a regular making a quick morning stop.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-did-my-shopping-this-morning-at-the-market',
    title: { de: 'Der Einkauf ist erledigt' },
    situation: { de: 'Ein Händler erkennt dich wieder und fragt, ob du heute Morgen schon am Markt warst – du bestätigst es.', en: 'A vendor recognizes you and asks whether you were already at the market this morning — confirm it.' },
    pedagogicalGoal: 'Mit „did my shopping“ von einem abgeschlossenen Einkauf erzählen.',
    targetText: 'I did my shopping this morning at the market.',
    baseText: { de: 'Ich habe heute Morgen meinen Einkauf auf dem Markt erledigt.' },
    chunks: [{ targetText: 'I did my shopping', baseText: { de: 'Ich habe meinen Einkauf erledigt' } }, { targetText: 'this morning', baseText: { de: 'heute Morgen' } }, { targetText: 'at the market.', baseText: { de: 'auf dem Markt.' } }],
    terms: [{ targetText: 'did my shopping', baseText: { de: 'meinen Einkauf erledigt' } }, { targetText: 'this morning', baseText: { de: 'heute Morgen' } }, { targetText: 'market', baseText: { de: 'Markt' } }, { targetText: 'vendor', baseText: { de: 'Händler' } }, { targetText: 'shopping list', baseText: { de: 'Einkaufsliste' } }],
    recall: { before: 'I did my ', answer: 'shopping', after: ' this morning at the market.', fallbackChoices: ['shopping', 'laundry', 'cooking', 'walking'] },
    speakRequired: ['did', 'shopping', 'market'],
    sceneCaption: { de: 'Der Händler lächelt wiedererkennend und fragt: „Were you here this morning?“' },
    trophyWord: { word: 'shopping', meaning: { de: 'Einkauf' }, example: 'I did my shopping before lunch.', whyThisWord: { de: 'shopping fasst deinen erledigten Einkauf in einer natürlichen Alltagsformel zusammen.' } },
    distractors: ['For my sister,', 'near the station.'],
    placeholderCaption: { de: 'Ein Händler lächelt an einem Marktstand neben gefüllten Einkaufstaschen.' },
    songMood: 'a familiar market chat after a useful errand',
    visualNotes: 'Friendly market vendor, full shopping bag, and a quick conversation among fruit crates.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-slept-badly-yesterday-but-im-fine-today',
    title: { de: 'Heute wieder fit' },
    situation: { de: 'Dein Nachbar fragt, ob du gut geschlafen hast – du sagst, dass die Nacht gestern schlecht war, aber es dir heute gut geht.', en: 'Your neighbor asks whether you slept well — say that you slept badly yesterday but are fine today.' },
    pedagogicalGoal: 'Mit „slept badly“ über eine vergangene Nacht sprechen und den heutigen Zustand nennen.',
    targetText: "I slept badly yesterday, but I'm fine today.",
    baseText: { de: 'Ich habe gestern schlecht geschlafen, aber heute geht es mir gut.' },
    chunks: [{ targetText: 'I slept badly', baseText: { de: 'Ich habe schlecht geschlafen' } }, { targetText: 'yesterday,', baseText: { de: 'gestern,' } }, { targetText: "but I'm fine today.", baseText: { de: 'aber heute geht es mir gut.' } }],
    terms: [{ targetText: 'slept badly', baseText: { de: 'schlecht geschlafen' } }, { targetText: 'yesterday', baseText: { de: 'gestern' } }, { targetText: 'fine today', baseText: { de: 'heute gut dran' } }, { targetText: 'sleep well', baseText: { de: 'gut schlafen' } }, { targetText: 'night noise', baseText: { de: 'Lärm in der Nacht' } }],
    recall: { before: 'I slept ', answer: 'badly', after: " yesterday, but I'm fine today.", fallbackChoices: ['badly', 'quietly', 'deeply', 'quickly'] },
    speakRequired: ['slept', 'badly', 'yesterday'],
    sceneCaption: { de: 'Dein Nachbar trifft dich morgens und fragt: „Did you sleep well?“' },
    trophyWord: { word: 'badly', meaning: { de: 'schlecht' }, example: 'I slept badly because of the noise.', whyThisWord: { de: 'badly lässt dich eine schlechte Nacht kurz erklären, ohne lange zu klagen.' } },
    distractors: ['In the afternoon,', 'with the window open.'],
    placeholderCaption: { de: 'Ein Nachbar begrüßt dich morgens vor einem Wohnhaus mit einer Kaffeetasse.' },
    songMood: 'a slow morning that is getting better',
    visualNotes: 'Apartment entrance in morning light, a tired-but-smiling regular, and a neighbor with coffee.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'ive-already-tried-the-local-dish',
    title: { de: 'Schon probiert' },
    situation: { de: 'Die Bedienung empfiehlt dir ein typisches Gericht – du sagst, dass du es schon probiert hast.', en: 'The server recommends a local dish — say that you have already tried it.' },
    pedagogicalGoal: 'Das feste Muster „I’ve already tried …“ für eine bereits gemachte Erfahrung verwenden.',
    targetText: "I've already tried the local dish.",
    baseText: { de: 'Ich habe das örtliche Gericht schon probiert.' },
    chunks: [{ targetText: "I've already tried", baseText: { de: 'Ich habe schon probiert' } }, { targetText: 'the local', baseText: { de: 'das örtliche' } }, { targetText: 'dish.', baseText: { de: 'Gericht.' } }],
    terms: [{ targetText: 'already tried', baseText: { de: 'schon probiert' } }, { targetText: 'local dish', baseText: { de: 'örtliches Gericht' } }, { targetText: 'restaurant server', baseText: { de: 'Bedienung im Restaurant' } }, { targetText: 'recommendation', baseText: { de: 'Empfehlung' } }, { targetText: 'typical food', baseText: { de: 'typisches Essen' } }],
    recall: { before: "I've already ", answer: 'tried', after: ' the local dish.', fallbackChoices: ['tried', 'ordered', 'bought', 'called'] },
    speakRequired: ['already', 'tried', 'dish'],
    sceneCaption: { de: 'Die Bedienung zeigt auf die Spezialität und sagt: „You should try the local dish.“' },
    trophyWord: { word: 'dish', meaning: { de: 'Gericht' }, example: 'This local dish is delicious.', whyThisWord: { de: 'dish benennt die Spezialität, auf die du in diesem Restaurant reagierst.' } },
    distractors: ['A table outside,', 'with my friend.'],
    placeholderCaption: { de: 'Eine Bedienung zeigt in einem kleinen Restaurant auf ein örtliches Gericht auf der Speisekarte.' },
    songMood: 'a proud local flavor shared over lunch',
    visualNotes: 'Small restaurant, local special written on a menu board, and a server making a warm recommendation.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-havent-seen-the-cathedral-yet',
    title: { de: 'Die Kathedrale noch nicht' },
    situation: { de: 'Ein Tourist fragt, ob du die Kathedrale schon gesehen hast – du sagst, dass das noch nicht der Fall ist.', en: 'A tourist asks whether you have seen the cathedral — say that you have not seen it yet.' },
    pedagogicalGoal: 'Das feste Muster „I haven’t seen … yet“ für etwas noch nicht Erledigtes verwenden.',
    targetText: "I haven't seen the cathedral yet.",
    baseText: { de: 'Ich habe die Kathedrale noch nicht gesehen.' },
    chunks: [{ targetText: "I haven't seen", baseText: { de: 'Ich habe nicht gesehen' } }, { targetText: 'the cathedral', baseText: { de: 'die Kathedrale' } }, { targetText: 'yet.', baseText: { de: 'noch.' } }],
    terms: [{ targetText: 'haven’t seen', baseText: { de: 'nicht gesehen' } }, { targetText: 'cathedral', baseText: { de: 'Kathedrale' } }, { targetText: 'yet', baseText: { de: 'noch' } }, { targetText: 'tourist map', baseText: { de: 'Stadtplan für Touristen' } }, { targetText: 'city sight', baseText: { de: 'Sehenswürdigkeit' } }],
    recall: { before: "I haven't seen the ", answer: 'cathedral', after: ' yet.', fallbackChoices: ['cathedral', 'market', 'bridge', 'museum'] },
    speakRequired: ['seen', 'cathedral', 'yet'],
    sceneCaption: { de: 'Ein Tourist schaut auf den Stadtplan und fragt: „Have you seen the cathedral yet?“' },
    trophyWord: { word: 'cathedral', meaning: { de: 'Kathedrale' }, example: 'The cathedral is near the river.', whyThisWord: { de: 'cathedral benennt die Sehenswürdigkeit, die du noch auf deiner Liste hast.' } },
    distractors: ['After the bridge,', 'with a guidebook.'],
    placeholderCaption: { de: 'Ein Tourist hält nahe einer großen Kathedrale einen aufgefalteten Stadtplan.' },
    songMood: 'a curious afternoon with another landmark to find',
    visualNotes: 'Grand cathedral in the distance, tourist map in hand, and a quiet old-town street.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-finished-my-work-before-lunch-today',
    title: { de: 'Vor dem Mittagessen fertig' },
    situation: { de: 'Dein Kollege fragt, wann du mit deiner Arbeit fertig warst – du nennst den Zeitpunkt von heute.', en: 'Your colleague asks when you finished your work — give the time point from today.' },
    pedagogicalGoal: 'Mit „finished“ einen abgeschlossenen Arbeitszeitpunkt nennen.',
    targetText: 'I finished my work before lunch today.',
    baseText: { de: 'Ich habe meine Arbeit heute vor dem Mittagessen beendet.' },
    chunks: [{ targetText: 'I finished', baseText: { de: 'Ich habe beendet' } }, { targetText: 'my work', baseText: { de: 'meine Arbeit' } }, { targetText: 'before lunch today.', baseText: { de: 'heute vor dem Mittagessen.' } }],
    terms: [{ targetText: 'finished my work', baseText: { de: 'meine Arbeit beendet' } }, { targetText: 'before lunch', baseText: { de: 'vor dem Mittagessen' } }, { targetText: 'today', baseText: { de: 'heute' } }, { targetText: 'colleague', baseText: { de: 'Kollege' } }, { targetText: 'work task', baseText: { de: 'Arbeitsaufgabe' } }],
    recall: { before: 'I ', answer: 'finished', after: ' my work before lunch today.', fallbackChoices: ['finished', 'ordered', 'called', 'bought'] },
    speakRequired: ['finished', 'work', 'lunch'],
    sceneCaption: { de: 'Dein Kollege schaut auf die Uhr und fragt: „When did you finish your work?“' },
    trophyWord: { word: 'lunch', meaning: { de: 'Mittagessen' }, example: 'We eat lunch at one.', whyThisWord: { de: 'lunch verankert den Zeitpunkt deiner abgeschlossenen Arbeit im Alltag.' } },
    distractors: ['After the meeting,', 'at my desk.'],
    placeholderCaption: { de: 'Ein Schreibtisch mit einer erledigten Liste und einer Uhr kurz vor dem Mittagessen.' },
    songMood: 'a satisfying pause after finishing a task',
    visualNotes: 'Office desk, completed checklist, and a lunchtime clock after a productive morning.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-did-a-lot-this-week-at-work',
    title: { de: 'Eine volle Woche' },
    situation: { de: 'Dein Nachbar fragt, wie deine Woche bei der Arbeit war – du fasst sie kurz zusammen.', en: 'Your neighbor asks how your week at work was — give a short summary.' },
    pedagogicalGoal: 'Mit „did a lot“ eine arbeitsreiche Woche kurz zusammenfassen.',
    targetText: 'I did a lot this week at work.',
    baseText: { de: 'Ich habe diese Woche bei der Arbeit viel gemacht.' },
    chunks: [{ targetText: 'I did a lot', baseText: { de: 'Ich habe viel gemacht' } }, { targetText: 'this week', baseText: { de: 'diese Woche' } }, { targetText: 'at work.', baseText: { de: 'bei der Arbeit.' } }],
    terms: [{ targetText: 'did a lot', baseText: { de: 'viel gemacht' } }, { targetText: 'this week', baseText: { de: 'diese Woche' } }, { targetText: 'at work', baseText: { de: 'bei der Arbeit' } }, { targetText: 'work week', baseText: { de: 'Arbeitswoche' } }, { targetText: 'neighbor', baseText: { de: 'Nachbar' } }],
    recall: { before: 'I did a lot this ', answer: 'week', after: ' at work.', fallbackChoices: ['week', 'month', 'morning', 'evening'] },
    speakRequired: ['did', 'week', 'work'],
    sceneCaption: { de: 'Dein Nachbar trifft dich im Flur und fragt: „How was your week at work?“' },
    trophyWord: { word: 'week', meaning: { de: 'Woche' }, example: 'This week was full of work.', whyThisWord: { de: 'week hilft dir, deine vielen erledigten Dinge in einem einfachen Zeitraum zusammenzufassen.' } },
    distractors: ['At the new office,', 'with my manager.'],
    placeholderCaption: { de: 'Zwei Nachbarn sprechen im Flur eines Wohnhauses nach einer arbeitsreichen Woche.' },
    songMood: 'a relieved end-of-week conversation at home',
    visualNotes: 'Apartment hallway in early evening, two neighbors talking after a full workweek.',
  }),
]

export const ENGLISH_A2_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_THREE_METADATA, englishA2Practical3Inputs,
  { de: 'Du hast Englisch A2 Praxis 3 abgeschlossen – du kannst erste abgeschlossene Handlungen und einfache Erfahrungen aus dem Alltag erzählen.' },
)
export const GUIDED_TODAY_PATH_ENGLISH_A2_FOUR_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-4', title: 'English A2 Practical 4', shortTitle: 'A2 Practical 4', subtitle: { de: 'Pläne und Änderungen: etwas verabreden und verschieben' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical4Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'that-sounds-good-how-about-three-this-afternoon', title: { de: 'Kaffee um drei' }, situation: { de: 'Dein Freund schlägt einen Kaffee vor – du sagst zu und nennst eine Uhrzeit am Nachmittag.', en: 'Your friend suggests coffee — accept and suggest a time this afternoon.' }, pedagogicalGoal: 'Einen Vorschlag annehmen und mit „How about …?“ eine Zeit vorschlagen.', targetText: 'That sounds good. How about three this afternoon?', baseText: { de: 'Das klingt gut. Wie wäre es heute Nachmittag um drei?' },
    chunks: [{ targetText: 'That sounds good.', baseText: { de: 'Das klingt gut.' } }, { targetText: 'How about three', baseText: { de: 'Wie wäre es um drei' } }, { targetText: 'this afternoon?', baseText: { de: 'heute Nachmittag?' } }], terms: [{ targetText: 'sounds good', baseText: { de: 'klingt gut' } }, { targetText: 'how about', baseText: { de: 'wie wäre es mit' } }, { targetText: 'three', baseText: { de: 'drei Uhr' } }, { targetText: 'this afternoon', baseText: { de: 'heute Nachmittag' } }, { targetText: 'meet for coffee', baseText: { de: 'sich auf einen Kaffee treffen' } }],
    recall: { before: 'That sounds good. How about three this ', answer: 'afternoon', after: '?', fallbackChoices: ['afternoon', 'morning', 'evening', 'weekend'] }, speakRequired: ['sounds', 'three', 'afternoon'], sceneCaption: { de: 'Dein Freund schreibt dir: „Do you want to meet for coffee today?“' }, trophyWord: { word: 'afternoon', meaning: { de: 'Nachmittag' }, example: 'The afternoon is perfect for coffee with a friend.', whyThisWord: { de: 'afternoon hilft dir, eine Verabredung auf einen Teil des Tages festzulegen.' } }, distractors: ['At the cafe door,', 'with my coworker.'], placeholderCaption: { de: 'Zwei Freunde verabreden sich per Nachricht zu einem Kaffee am Nachmittag.' }, songMood: 'an easy afternoon coffee plan between friends', visualNotes: 'Phone message beside two coffee cups in warm afternoon light.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-going-to-visit-the-art-museum-tomorrow', title: { de: 'Morgen ins Museum' }, situation: { de: 'Dein Freund fragt nach deinem Plan für morgen – du erzählst von deinem Museumsbesuch.', en: 'Your friend asks about your plan for tomorrow — say that you are going to visit the art museum.' }, pedagogicalGoal: 'Einen festen Plan mit „I’m going to …“ ausdrücken.', targetText: "I'm going to visit the art museum tomorrow.", baseText: { de: 'Ich werde morgen das Kunstmuseum besuchen.' },
    chunks: [{ targetText: "I'm going to visit", baseText: { de: 'Ich werde besuchen' } }, { targetText: 'the art museum', baseText: { de: 'das Kunstmuseum' } }, { targetText: 'tomorrow.', baseText: { de: 'morgen.' } }], terms: [{ targetText: 'going to visit', baseText: { de: 'besuchen werden' } }, { targetText: 'art museum', baseText: { de: 'Kunstmuseum' } }, { targetText: 'tomorrow', baseText: { de: 'morgen' } }, { targetText: 'plan for tomorrow', baseText: { de: 'Plan für morgen' } }, { targetText: 'exhibition', baseText: { de: 'Ausstellung' } }],
    recall: { before: "I'm going to visit the ", answer: 'art', after: ' museum tomorrow.', fallbackChoices: ['art', 'city', 'history', 'small'] }, speakRequired: ['going', 'visit', 'museum'], sceneCaption: { de: 'Dein Freund sieht einen Stadtplan und fragt: „What are you going to do tomorrow?“' }, trophyWord: { word: 'art', meaning: { de: 'Kunst' }, example: 'The art museum has a new exhibition.', whyThisWord: { de: 'art benennt genau den Ort deines geplanten Besuchs.' } }, distractors: ['At the bus stop,', 'with my cousin.'], placeholderCaption: { de: 'Ein Stadtplan liegt neben einem Flyer für ein Kunstmuseum.' }, songMood: 'a curious plan for tomorrow in the city', visualNotes: 'Museum flyer and city map as a friend hears about tomorrow’s visit.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'id-like-to-see-a-movie-on-friday', title: { de: 'Film am Freitag' }, situation: { de: 'Dein Freund fragt, ob du am Freitag etwas unternehmen möchtest – du schlägst einen Film vor.', en: 'Your friend asks whether you want to do something on Friday — suggest seeing a movie.' }, pedagogicalGoal: 'Mit dem festen Baustein „I’d like to …“ einen gemeinsamen Plan nennen.', targetText: "I'd like to see a movie on Friday.", baseText: { de: 'Ich würde am Freitag gern einen Film sehen.' },
    chunks: [{ targetText: "I'd like to see", baseText: { de: 'Ich würde gern sehen' } }, { targetText: 'a movie', baseText: { de: 'einen Film' } }, { targetText: 'on Friday.', baseText: { de: 'am Freitag.' } }], terms: [{ targetText: 'like to see', baseText: { de: 'gern sehen wollen' } }, { targetText: 'movie', baseText: { de: 'Film' } }, { targetText: 'on Friday', baseText: { de: 'am Freitag' } }, { targetText: 'movie theater', baseText: { de: 'Kino' } }, { targetText: 'weekend plan', baseText: { de: 'Wochenendplan' } }],
    recall: { before: "I'd like to see a ", answer: 'movie', after: ' on Friday.', fallbackChoices: ['movie', 'concert', 'market', 'museum'] }, speakRequired: ['like', 'see', 'movie'], sceneCaption: { de: 'Dein Freund fragt dich: „Are you free on Friday evening?“' }, trophyWord: { word: 'movie', meaning: { de: 'Film' }, example: 'This movie starts at eight.', whyThisWord: { de: 'movie gibt deinem Vorschlag für Freitag ein klares gemeinsames Ziel.' } }, distractors: ['At my office,', 'after breakfast.'], placeholderCaption: { de: 'Ein Kinoplakat hängt neben zwei Freunden, die ihren Freitag planen.' }, songMood: 'a playful Friday-night plan with a friend', visualNotes: 'Movie poster outside a neighborhood theater, with friends choosing their evening.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'eight-at-the-square-works-for-me', title: { de: 'Treffen am Platz' }, situation: { de: 'Dein Freund nennt den zentralen Platz als Treffpunkt um acht – du stimmst Zeit und Ort zu.', en: 'Your friend suggests meeting at the square at eight — agree to the time and place.' }, pedagogicalGoal: 'Einer Verabredung mit Zeit und Ort klar zustimmen.', targetText: 'Eight at the square works for me.', baseText: { de: 'Acht Uhr am Platz passt für mich.' },
    chunks: [{ targetText: 'Eight', baseText: { de: 'Acht Uhr' } }, { targetText: 'at the square', baseText: { de: 'am Platz' } }, { targetText: 'works for me.', baseText: { de: 'passt für mich.' } }], terms: [{ targetText: 'eight', baseText: { de: 'acht Uhr' } }, { targetText: 'at the square', baseText: { de: 'am Platz' } }, { targetText: 'works for me', baseText: { de: 'passt für mich' } }, { targetText: 'meeting place', baseText: { de: 'Treffpunkt' } }, { targetText: 'city square', baseText: { de: 'Stadtplatz' } }],
    recall: { before: 'Eight at the ', answer: 'square', after: ' works for me.', fallbackChoices: ['square', 'corner', 'station', 'cafe'] }, speakRequired: ['eight', 'square', 'works'], sceneCaption: { de: 'Dein Freund fragt: „Can we meet at the square at eight?“' }, trophyWord: { word: 'square', meaning: { de: 'Platz' }, example: 'The square is busy on Saturday.', whyThisWord: { de: 'square macht den vereinbarten Treffpunkt in der Stadt eindeutig.' } }, distractors: ['At the river,', 'after the movie.'], placeholderCaption: { de: 'Zwei Freunde stehen an einem Brunnen auf einem Stadtplatz und planen ihren Abend.' }, songMood: 'a clear city meetup as evening begins', visualNotes: 'Town square fountain and warm lights as friends settle on a meeting time.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'can-we-move-it-to-saturday-morning', title: { de: 'Auf Samstag verschieben' }, situation: { de: 'Dein Freund fragt nach eurem Plan für Freitag – du bittest darum, ihn auf Samstagvormittag zu verschieben.', en: 'Your friend asks about your Friday plan — ask to move it to Saturday morning.' }, pedagogicalGoal: 'Einen Termin mit „Can we move it …?“ freundlich verschieben.', targetText: 'Can we move it to Saturday morning?', baseText: { de: 'Können wir es auf Samstagvormittag verschieben?' },
    chunks: [{ targetText: 'Can we move', baseText: { de: 'Können wir verschieben' } }, { targetText: 'it to Saturday', baseText: { de: 'es auf Samstag' } }, { targetText: 'morning?', baseText: { de: 'vormittag?' } }], terms: [{ targetText: 'can we move', baseText: { de: 'können wir verschieben' } }, { targetText: 'Saturday morning', baseText: { de: 'Samstagvormittag' } }, { targetText: 'move a plan', baseText: { de: 'einen Plan verschieben' } }, { targetText: 'Friday plan', baseText: { de: 'Plan für Freitag' } }, { targetText: 'different time', baseText: { de: 'andere Zeit' } }],
    recall: { before: 'Can we ', answer: 'move', after: ' it to Saturday morning?', fallbackChoices: ['move', 'bring', 'start', 'finish'] }, speakRequired: ['move', 'saturday', 'morning'], sceneCaption: { de: 'Dein Freund fragt: „Is Friday still good for you?“' }, trophyWord: { word: 'move', meaning: { de: 'verschieben' }, example: 'Can we move our coffee to Saturday?', whyThisWord: { de: 'move gibt dir eine einfache, höfliche Formulierung für eine Terminänderung.' } }, distractors: ['To the hotel,', 'with the bus.'], placeholderCaption: { de: 'Ein Kalender zeigt einen durchgestrichenen Freitag und einen markierten Samstagvormittag.' }, songMood: 'a flexible plan that finds a better time', visualNotes: 'Calendar page with Friday and Saturday highlighted while friends reschedule by phone.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-sorry-i-cant-come-because-i-work-tonight', title: { de: 'Heute keine Zeit' }, situation: { de: 'Dein Freund lädt dich heute Abend ein – du sagst freundlich ab und nennst deine Arbeit als Grund.', en: 'Your friend invites you over tonight — decline politely and give work as the reason.' }, pedagogicalGoal: 'Mit „I’m sorry, I can’t …“ freundlich absagen und einen Grund nennen.', targetText: "I'm sorry, I can't come because I work tonight.", baseText: { de: 'Es tut mir leid, ich kann nicht kommen, weil ich heute Abend arbeite.' },
    chunks: [{ targetText: "I'm sorry,", baseText: { de: 'Es tut mir leid,' } }, { targetText: "I can't come", baseText: { de: 'ich kann nicht kommen' } }, { targetText: 'because I work tonight.', baseText: { de: 'weil ich heute Abend arbeite.' } }], terms: [{ targetText: 'sorry', baseText: { de: 'tut mir leid' } }, { targetText: 'cannot come', baseText: { de: 'nicht kommen können' } }, { targetText: 'because', baseText: { de: 'weil' } }, { targetText: 'work tonight', baseText: { de: 'heute Abend arbeiten' } }, { targetText: 'decline politely', baseText: { de: 'freundlich absagen' } }],
    recall: { before: "I'm sorry, I can't come because I ", answer: 'work', after: ' tonight.', fallbackChoices: ['work', 'sleep', 'travel', 'cook'] }, speakRequired: ['sorry', 'come', 'work'], sceneCaption: { de: 'Dein Freund schreibt: „Do you want to come over tonight?“' }, trophyWord: { word: 'come', meaning: { de: 'kommen' }, example: 'Please come to dinner on Saturday.', whyThisWord: { de: 'come ist das zentrale Verb, wenn du eine Einladung freundlich ablehnst.' } }, distractors: ['At the cafe,', 'with my sister.'], placeholderCaption: { de: 'Eine Einladung leuchtet auf einem Handy neben einer Arbeitstasche auf.' }, songMood: 'a kind message when work changes the evening plan', visualNotes: 'Phone invitation beside a work bag as a regular writes a warm reply.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'id-like-to-invite-you-to-dinner-on-tuesday', title: { de: 'Einladung zum Essen' }, situation: { de: 'Dein Freund fragt nach deinem Plan für Dienstag – du lädst ihn freundlich zum Abendessen ein.', en: 'Your friend asks about your plan for Tuesday — invite them to dinner politely.' }, pedagogicalGoal: 'Mit „I’d like to invite you …“ eine freundliche Einladung aussprechen.', targetText: "I'd like to invite you to dinner on Tuesday.", baseText: { de: 'Ich möchte dich am Dienstag gern zum Abendessen einladen.' },
    chunks: [{ targetText: "I'd like to invite", baseText: { de: 'Ich möchte gern einladen' } }, { targetText: 'you to dinner', baseText: { de: 'dich zum Abendessen' } }, { targetText: 'on Tuesday.', baseText: { de: 'am Dienstag.' } }], terms: [{ targetText: 'like to invite', baseText: { de: 'gern einladen möchten' } }, { targetText: 'to dinner', baseText: { de: 'zum Abendessen' } }, { targetText: 'on Tuesday', baseText: { de: 'am Dienstag' } }, { targetText: 'friend', baseText: { de: 'Freund' } }, { targetText: 'dinner plan', baseText: { de: 'Plan zum Abendessen' } }],
    recall: { before: "I'd like to ", answer: 'invite', after: ' you to dinner on Tuesday.', fallbackChoices: ['invite', 'call', 'meet', 'thank'] }, speakRequired: ['like', 'invite', 'dinner'], sceneCaption: { de: 'Dein Freund fragt: „What are you doing on Tuesday?“' }, trophyWord: { word: 'dinner', meaning: { de: 'Abendessen' }, example: 'Dinner with friends is at seven.', whyThisWord: { de: 'dinner benennt den Anlass deiner freundlichen Einladung eindeutig.' } }, distractors: ['At the library,', 'before work.'], placeholderCaption: { de: 'Ein gedeckter Tisch für zwei steht bereit, während zwei Freunde Dienstag planen.' }, songMood: 'a warm invitation for a simple dinner together', visualNotes: 'Small dinner table for two with a handwritten Tuesday note beside the plates.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-going-to-be-a-few-minutes-late', title: { de: 'Ein paar Minuten später' }, situation: { de: 'Dein Freund wartet schon auf dich – du schreibst, dass du nur ein paar Minuten zu spät kommst.', en: 'Your friend is already waiting for you — say that you are going to be a few minutes late.' }, pedagogicalGoal: 'Eine kurze Verspätung mit „I’m going to be …“ ankündigen.', targetText: "I'm going to be a few minutes late.", baseText: { de: 'Ich werde ein paar Minuten zu spät sein.' },
    chunks: [{ targetText: "I'm going to be", baseText: { de: 'Ich werde sein' } }, { targetText: 'a few minutes', baseText: { de: 'ein paar Minuten' } }, { targetText: 'late.', baseText: { de: 'zu spät.' } }], terms: [{ targetText: 'going to be', baseText: { de: 'sein werden' } }, { targetText: 'a few minutes', baseText: { de: 'ein paar Minuten' } }, { targetText: 'late', baseText: { de: 'zu spät' } }, { targetText: 'wait for a friend', baseText: { de: 'auf einen Freund warten' } }, { targetText: 'arrival time', baseText: { de: 'Ankunftszeit' } }],
    recall: { before: "I'm going to be a few ", answer: 'minutes', after: ' late.', fallbackChoices: ['minutes', 'blocks', 'streets', 'hours'] }, speakRequired: ['going', 'minutes', 'late'], sceneCaption: { de: 'Dein Freund schreibt dir: „Are you almost here?“' }, trophyWord: { word: 'few', meaning: { de: 'ein paar' }, example: 'I need a few minutes before dinner.', whyThisWord: { de: 'few macht deine kleine Verspätung kurz und glaubwürdig.' } }, distractors: ['At the station,', 'after the show.'], placeholderCaption: { de: 'Ein Handy zeigt eine kurze Nachricht, während jemand schnell durch eine Stadtstraße geht.' }, songMood: 'a quick message while hurrying across town', visualNotes: 'Regular walking briskly along a city street and sending a reassuring text.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'were-meeting-at-eight-by-the-river-right', title: { de: 'Der geänderte Plan' }, situation: { de: 'Nach dem Verschieben fasst du euren Treffpunkt noch einmal zusammen und bittest deinen Freund um Bestätigung.', en: 'After rescheduling, repeat the meeting details and ask your friend to confirm them.' }, pedagogicalGoal: 'Einen geänderten Plan mit „right?“ kurz bestätigen lassen.', targetText: "We're meeting at eight by the river, right?", baseText: { de: 'Wir treffen uns um acht am Fluss, richtig?' },
    chunks: [{ targetText: "We're meeting at eight", baseText: { de: 'Wir treffen uns um acht' } }, { targetText: 'by the river,', baseText: { de: 'am Fluss,' } }, { targetText: 'right?', baseText: { de: 'richtig?' } }], terms: [{ targetText: 'meeting at eight', baseText: { de: 'Treffen um acht' } }, { targetText: 'by the river', baseText: { de: 'am Fluss' } }, { targetText: 'right', baseText: { de: 'richtig' } }, { targetText: 'changed plan', baseText: { de: 'geänderter Plan' } }, { targetText: 'confirm details', baseText: { de: 'Einzelheiten bestätigen' } }],
    recall: { before: "We're meeting at eight by the ", answer: 'river', after: ', right?', fallbackChoices: ['river', 'square', 'market', 'bridge'] }, speakRequired: ['meeting', 'eight', 'river'], sceneCaption: { de: 'Dein Freund schreibt nach der Änderung: „Saturday works for me.“' }, trophyWord: { word: 'river', meaning: { de: 'Fluss' }, example: 'The river is beautiful in the evening.', whyThisWord: { de: 'river macht euren neuen Treffpunkt nach der Planänderung klar.' } }, distractors: ['At the museum,', 'with the tickets.'], placeholderCaption: { de: 'Eine Nachricht mit dem neuen Treffpunkt liegt neben einer Karte mit einem Flussufer.' }, songMood: 'a settled plan beside the river at dusk', visualNotes: 'Riverside walkway at dusk with a map pin for the new meeting point.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-going-to-rest-before-a-short-trip', title: { de: 'Plan fürs Wochenende' }, situation: { de: 'Dein Freund fragt, was du am Wochenende vorhast – du nennst Ruhe und einen kurzen Ausflug.', en: 'Your friend asks about your weekend plans — say that you are going to rest before a short trip.' }, pedagogicalGoal: 'Mit „going to“ einen einfachen Wochenendplan ausdrücken.', targetText: "I'm going to rest before a short trip.", baseText: { de: 'Ich werde mich vor einem kurzen Ausflug ausruhen.' },
    chunks: [{ targetText: "I'm going to rest", baseText: { de: 'Ich werde mich ausruhen' } }, { targetText: 'before a short', baseText: { de: 'vor einem kurzen' } }, { targetText: 'trip.', baseText: { de: 'Ausflug.' } }], terms: [{ targetText: 'going to rest', baseText: { de: 'sich ausruhen werden' } }, { targetText: 'before', baseText: { de: 'vor' } }, { targetText: 'short trip', baseText: { de: 'kurzer Ausflug' } }, { targetText: 'weekend plan', baseText: { de: 'Wochenendplan' } }, { targetText: 'leave town', baseText: { de: 'die Stadt verlassen' } }],
    recall: { before: "I'm going to rest before a short ", answer: 'trip', after: '.', fallbackChoices: ['trip', 'movie', 'dinner', 'coffee'] }, speakRequired: ['going', 'rest', 'trip'], sceneCaption: { de: 'Dein Freund fragt: „What are you going to do this weekend?“' }, trophyWord: { word: 'trip', meaning: { de: 'Ausflug' }, example: 'Our short trip starts on Saturday.', whyThisWord: { de: 'trip gibt deinem Wochenendplan ein konkretes kleines Ziel.' } }, distractors: ['At the office,', 'with my neighbor.'], placeholderCaption: { de: 'Ein kleiner Rucksack steht neben einem Kalender mit einem freien Wochenende.' }, songMood: 'a restful weekend before a small adventure', visualNotes: 'Small backpack by a window and a quiet weekend calendar suggest a gentle trip.',
  }),
]

export const ENGLISH_A2_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_FOUR_METADATA, englishA2Practical4Inputs,
  { de: 'Du hast Englisch A2 Praxis 4 abgeschlossen – du kannst Pläne machen, Verabredungen ändern und freundlich absagen.' },
)
export const GUIDED_TODAY_PATH_ENGLISH_A2_FIVE_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-5', title: 'English A2 Practical 5', shortTitle: 'A2 Practical 5', subtitle: { de: 'Eigentlich nicht: freundlich korrigieren und Alternativen nennen' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical5Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'excuse-me-i-ordered-tea-not-coffee', title: { de: 'Tee, nicht Kaffee' }, situation: { de: 'Im Café bringt die Bedienung Kaffee – du korrigierst die Bestellung freundlich.', en: 'At the cafe, the server brings coffee — correct the order politely.' }, pedagogicalGoal: 'Eine falsche Bestellung mit „Excuse me“ und „not“ freundlich korrigieren.', targetText: 'Excuse me, I actually ordered tea, not coffee.', baseText: { de: 'Entschuldigung, ich habe eigentlich Tee bestellt, keinen Kaffee.' },
    chunks: [{ targetText: 'Excuse me,', baseText: { de: 'Entschuldigung,' } }, { targetText: 'I actually ordered tea,', baseText: { de: 'ich habe eigentlich Tee bestellt,' } }, { targetText: 'not coffee.', baseText: { de: 'keinen Kaffee.' } }], terms: [{ targetText: 'actually', baseText: { de: 'eigentlich' } }, { targetText: 'ordered tea', baseText: { de: 'Tee bestellt' } }, { targetText: 'not coffee', baseText: { de: 'keinen Kaffee' } }, { targetText: 'wrong order', baseText: { de: 'falsche Bestellung' } }, { targetText: 'server', baseText: { de: 'Bedienung' } }],
    recall: { before: 'Excuse me, I actually ', answer: 'ordered', after: ' tea, not coffee.', fallbackChoices: ['ordered', 'bought', 'called', 'made'] }, speakRequired: ['actually', 'ordered', 'tea'], sceneCaption: { de: 'Die Bedienung stellt eine Tasse hin und fragt: „Is this your coffee?“' }, trophyWord: { word: 'actually', meaning: { de: 'eigentlich' }, example: 'I actually ordered the salad.', whyThisWord: { de: 'actually macht eine freundliche Korrektur weicher und natürlicher.' } }, distractors: ['With extra milk,', 'at the window.'], placeholderCaption: { de: 'Eine Kaffeetasse steht vor einem Gast, der eigentlich Tee bestellt hat.' }, songMood: 'a polite correction at a familiar cafe', visualNotes: 'Cafe table with coffee and a tea bag as a customer gently corrects the server.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'could-you-exchange-this-shirt-for-a-larger-one', title: { de: 'Eine größere Größe' }, situation: { de: 'Im Kleidungsladen ist das Hemd zu klein – du bittest um einen Umtausch.', en: 'At the clothing store, the shirt is too small — ask to exchange it.' }, pedagogicalGoal: 'Mit „Could you …?“ höflich um einen Umtausch bitten.', targetText: 'Could you exchange this shirt for a larger one?', baseText: { de: 'Könnten Sie dieses Hemd gegen ein größeres umtauschen?' },
    chunks: [{ targetText: 'Could you exchange', baseText: { de: 'Könnten Sie umtauschen' } }, { targetText: 'this shirt', baseText: { de: 'dieses Hemd' } }, { targetText: 'for a larger one?', baseText: { de: 'gegen ein größeres?' } }], terms: [{ targetText: 'could you exchange', baseText: { de: 'könnten Sie umtauschen' } }, { targetText: 'this shirt', baseText: { de: 'dieses Hemd' } }, { targetText: 'larger one', baseText: { de: 'größeres Exemplar' } }, { targetText: 'clothing store', baseText: { de: 'Kleidungsladen' } }, { targetText: 'size', baseText: { de: 'Größe' } }],
    recall: { before: 'Could you ', answer: 'exchange', after: ' this shirt for a larger one?', fallbackChoices: ['exchange', 'carry', 'bring', 'wash'] }, speakRequired: ['exchange', 'shirt', 'larger'], sceneCaption: { de: 'Die Verkäuferin fragt: „Does the shirt fit?“' }, trophyWord: { word: 'exchange', meaning: { de: 'umtauschen' }, example: 'Could I exchange this shirt for a larger one?', whyThisWord: { de: 'exchange gibt dir die passende höfliche Bitte im Laden.' } }, distractors: ['With a blue jacket,', 'after the sale.'], placeholderCaption: { de: 'Ein zu kleines Hemd liegt neben einem größeren auf einem Ladentresen.' }, songMood: 'a practical fix in a bright clothing store', visualNotes: 'Two shirt sizes on a counter as a sales assistant helps with an exchange.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'could-i-have-still-water-instead-please', title: { de: 'Stilles Wasser' }, situation: { de: 'Im Restaurant bringt die Bedienung Sprudelwasser – du möchtest lieber stilles Wasser.', en: 'At the restaurant, the server brings sparkling water — ask for still water instead.' }, pedagogicalGoal: 'Mit „instead“ eine höfliche Alternative nennen.', targetText: 'Could I have still water instead, please?', baseText: { de: 'Könnte ich bitte stattdessen stilles Wasser haben?' },
    chunks: [{ targetText: 'Could I have', baseText: { de: 'Könnte ich haben' } }, { targetText: 'still water', baseText: { de: 'stilles Wasser' } }, { targetText: 'instead, please?', baseText: { de: 'stattdessen, bitte?' } }], terms: [{ targetText: 'could I have', baseText: { de: 'könnte ich haben' } }, { targetText: 'still water', baseText: { de: 'stilles Wasser' } }, { targetText: 'instead', baseText: { de: 'stattdessen' } }, { targetText: 'sparkling water', baseText: { de: 'Sprudelwasser' } }, { targetText: 'restaurant table', baseText: { de: 'Restauranttisch' } }],
    recall: { before: 'Could I have still water ', answer: 'instead', after: ', please?', fallbackChoices: ['instead', 'outside', 'quickly', 'together'] }, speakRequired: ['still', 'water', 'instead'], sceneCaption: { de: 'Die Bedienung stellt eine Flasche hin und fragt: „Sparkling water is okay?“' }, trophyWord: { word: 'instead', meaning: { de: 'stattdessen' }, example: 'Could I have juice instead, please?', whyThisWord: { de: 'instead zeigt freundlich, dass du eine andere Wahl möchtest.' } }, distractors: ['With a lemon,', 'after dinner.'], placeholderCaption: { de: 'Eine Flasche Sprudelwasser und ein Glas stilles Wasser stehen auf einem Restauranttisch.' }, songMood: 'a small restaurant adjustment made politely', visualNotes: 'Restaurant table with sparkling and still water as a guest asks for the preferred one.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'not-these-please-id-rather-have-those', title: { de: 'Lieber diese dort' }, situation: { de: 'Am Markt hält der Händler zwei Sorten Obst hoch – du zeigst höflich auf die andere Sorte.', en: 'At the market, the vendor holds up two kinds of fruit — politely point to the other kind.' }, pedagogicalGoal: 'Mit dem festen Baustein „I’d rather have …“ eine Alternative wählen.', targetText: "Not these, please. I'd rather have those.", baseText: { de: 'Nicht diese, bitte. Ich hätte lieber die dort.' },
    chunks: [{ targetText: 'Not these, please.', baseText: { de: 'Nicht diese, bitte.' } }, { targetText: "I'd rather have", baseText: { de: 'Ich hätte lieber' } }, { targetText: 'those.', baseText: { de: 'die dort.' } }], terms: [{ targetText: 'not these', baseText: { de: 'nicht diese' } }, { targetText: 'rather have', baseText: { de: 'lieber haben' } }, { targetText: 'those', baseText: { de: 'die dort' } }, { targetText: 'market fruit', baseText: { de: 'Obst am Markt' } }, { targetText: 'other kind', baseText: { de: 'andere Sorte' } }],
    recall: { before: "Not these, please. I'd ", answer: 'rather', after: ' have those.', fallbackChoices: ['rather', 'always', 'never', 'also'] }, speakRequired: ['rather', 'have', 'those'], sceneCaption: { de: 'Der Händler fragt: „Do you want these apples?“' }, trophyWord: { word: 'rather', meaning: { de: 'lieber' }, example: 'I would rather have the red apples.', whyThisWord: { de: 'rather hilft dir, eine andere Auswahl freundlich zu zeigen.' } }, distractors: ['The large bag,', 'for the office.'], placeholderCaption: { de: 'Zwei Obstkisten stehen am Marktstand, während ein Kunde auf die zweite zeigt.' }, songMood: 'a confident choice at a colorful market', visualNotes: 'Fruit crates in two colors while a shopper points to the preferred option.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'could-i-change-rooms-this-room-is-too-noisy', title: { de: 'Zu viel Lärm' }, situation: { de: 'Im Hotel ist dein Zimmer zu laut – du bittest an der Rezeption um einen Wechsel.', en: 'At the hotel, your room is too loud — ask reception to change rooms.' }, pedagogicalGoal: 'Eine Zimmeränderung mit einem einfachen Grund höflich erbitten.', targetText: 'Could I change rooms? This room is too noisy.', baseText: { de: 'Könnte ich das Zimmer wechseln? Dieses Zimmer ist zu laut.' },
    chunks: [{ targetText: 'Could I change rooms?', baseText: { de: 'Könnte ich das Zimmer wechseln?' } }, { targetText: 'This room', baseText: { de: 'Dieses Zimmer' } }, { targetText: 'is too noisy.', baseText: { de: 'ist zu laut.' } }], terms: [{ targetText: 'change rooms', baseText: { de: 'das Zimmer wechseln' } }, { targetText: 'too noisy', baseText: { de: 'zu laut' } }, { targetText: 'hotel room', baseText: { de: 'Hotelzimmer' } }, { targetText: 'reception desk', baseText: { de: 'Rezeption' } }, { targetText: 'different room', baseText: { de: 'anderes Zimmer' } }],
    recall: { before: 'Could I change rooms? This room is too ', answer: 'noisy', after: '.', fallbackChoices: ['noisy', 'small', 'clean', 'warm'] }, speakRequired: ['change', 'room', 'noisy'], sceneCaption: { de: 'Die Rezeptionistin fragt: „Is everything okay with your room?“' }, trophyWord: { word: 'noisy', meaning: { de: 'laut' }, example: 'The street is too noisy at night.', whyThisWord: { de: 'noisy gibt dir einen klaren, einfachen Grund für einen Zimmerwechsel.' } }, distractors: ['Near the elevator,', 'with a balcony.'], placeholderCaption: { de: 'Eine Rezeptionistin hört einem Gast vor einem lauten Hotelflur zu.' }, songMood: 'a calm request for a quieter hotel stay', visualNotes: 'Hotel reception with a key card and a corridor where noise comes through a door.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'no-thank-you-ill-have-just-this-sandwich', title: { de: 'Nur das Sandwich' }, situation: { de: 'An der Theke wird dir noch Kuchen angeboten – du lehnst freundlich ab und bleibst bei deinem Sandwich.', en: 'At the counter, you are offered cake too — decline politely and keep just the sandwich.' }, pedagogicalGoal: 'Ein Zusatzangebot höflich mit „No, thank you“ ablehnen.', targetText: "No, thank you. I'll have just this sandwich.", baseText: { de: 'Nein, danke. Ich nehme nur dieses Sandwich.' },
    chunks: [{ targetText: 'No, thank you.', baseText: { de: 'Nein, danke.' } }, { targetText: "I'll have", baseText: { de: 'Ich nehme' } }, { targetText: 'just this sandwich.', baseText: { de: 'nur dieses Sandwich.' } }], terms: [{ targetText: 'no thank you', baseText: { de: 'nein, danke' } }, { targetText: 'have just', baseText: { de: 'nur nehmen' } }, { targetText: 'this sandwich', baseText: { de: 'dieses Sandwich' } }, { targetText: 'extra cake', baseText: { de: 'zusätzlicher Kuchen' } }, { targetText: 'counter order', baseText: { de: 'Bestellung an der Theke' } }],
    recall: { before: "No, thank you. I'll have just this ", answer: 'sandwich', after: '.', fallbackChoices: ['sandwich', 'cookie', 'salad', 'soup'] }, speakRequired: ['have', 'just', 'sandwich'], sceneCaption: { de: 'Die Verkäuferin fragt: „Would you like cake too?“' }, trophyWord: { word: 'sandwich', meaning: { de: 'Sandwich' }, example: 'This sandwich is enough for lunch.', whyThisWord: { de: 'sandwich hilft dir, deine einfache Bestellung freundlich abzuschließen.' } }, distractors: ['A large coffee,', 'with my card.'], placeholderCaption: { de: 'Ein Sandwich liegt an einer Theke, während ein Stück Kuchen daneben angeboten wird.' }, songMood: 'a simple lunch choice with a polite no', visualNotes: 'Cafe counter with a sandwich and cake, as a customer keeps the order simple.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'excuse-me-the-amount-on-the-bill-isnt-correct', title: { de: 'Der falsche Betrag' }, situation: { de: 'Im Restaurant stimmt der Betrag auf der Rechnung nicht – du machst die Bedienung höflich darauf aufmerksam.', en: 'At the restaurant, the amount on the bill is not right — point it out politely to the server.' }, pedagogicalGoal: 'Mit „Excuse me“ ein Problem auf der Rechnung kurz ansprechen.', targetText: 'Excuse me, I think the amount on the bill is wrong.', baseText: { de: 'Entschuldigung, ich glaube, der Betrag auf der Rechnung stimmt nicht.' },
    chunks: [{ targetText: 'Excuse me,', baseText: { de: 'Entschuldigung,' } }, { targetText: 'I think the amount', baseText: { de: 'ich glaube, der Betrag' } }, { targetText: 'on the bill is wrong.', baseText: { de: 'auf der Rechnung stimmt nicht.' } }], terms: [{ targetText: 'amount', baseText: { de: 'Betrag' } }, { targetText: 'on the bill', baseText: { de: 'auf der Rechnung' } }, { targetText: 'is not correct', baseText: { de: 'stimmt nicht' } }, { targetText: 'restaurant bill', baseText: { de: 'Restaurantrechnung' } }, { targetText: 'check a number', baseText: { de: 'eine Zahl prüfen' } }],
    recall: { before: 'Excuse me, I think the ', answer: 'amount', after: ' on the bill is wrong.', fallbackChoices: ['amount', 'table', 'server', 'menu'] }, speakRequired: ['think', 'amount', 'bill'], sceneCaption: { de: 'Die Bedienung legt die Rechnung hin und fragt: „Is everything okay?“' }, trophyWord: { word: 'amount', meaning: { de: 'Betrag' }, example: 'The amount on this bill is not correct.', whyThisWord: { de: 'amount benennt genau den Teil der Rechnung, den du prüfen lassen möchtest.' } }, distractors: ['After the meal,', 'with a receipt.'], placeholderCaption: { de: 'Eine Restaurantrechnung mit einem markierten Betrag liegt auf einem Tisch.' }, songMood: 'a calm correction at the end of a meal', visualNotes: 'Restaurant bill with one highlighted number as a guest speaks quietly to a server.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'could-i-have-a-different-size-please', title: { de: 'Eine andere Größe' }, situation: { de: 'In der Apotheke zeigt dir die Verkäuferin eine Packung – du brauchst eine andere Größe.', en: 'At the pharmacy, the clerk shows you one pack — ask for a different size.' }, pedagogicalGoal: 'Mit „Could I have …?“ höflich nach einer anderen Größe fragen.', targetText: 'Could I have a different size, please?', baseText: { de: 'Könnte ich bitte eine andere Größe haben?' },
    chunks: [{ targetText: 'Could I have', baseText: { de: 'Könnte ich haben' } }, { targetText: 'a different size,', baseText: { de: 'eine andere Größe,' } }, { targetText: 'please?', baseText: { de: 'bitte?' } }], terms: [{ targetText: 'could I have', baseText: { de: 'könnte ich haben' } }, { targetText: 'different size', baseText: { de: 'andere Größe' } }, { targetText: 'please', baseText: { de: 'bitte' } }, { targetText: 'pharmacy pack', baseText: { de: 'Packung aus der Apotheke' } }, { targetText: 'smaller size', baseText: { de: 'kleinere Größe' } }],
    recall: { before: 'Could I have a ', answer: 'different', after: ' size, please?', fallbackChoices: ['different', 'smaller', 'larger', 'correct'] }, speakRequired: ['different', 'size', 'please'], sceneCaption: { de: 'Die Verkäuferin fragt: „Is this size okay for you?“' }, trophyWord: { word: 'different', meaning: { de: 'anders' }, example: 'Could I have a different size, please?', whyThisWord: { de: 'different hilft dir, ohne lange Erklärung nach einer anderen Größe zu fragen.' } }, distractors: ['With a doctor,', 'after work.'], placeholderCaption: { de: 'Zwei Packungen unterschiedlicher Größe stehen auf einer Apothekentheke.' }, songMood: 'a clear request at a helpful pharmacy', visualNotes: 'Pharmacy counter with two package sizes while a clerk offers an alternative.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'could-you-take-me-to-the-station-not-downtown', title: { de: 'Nicht in die Innenstadt' }, situation: { de: 'Im Taxi nennt der Fahrer die Innenstadt als Ziel – du korrigierst freundlich und nennst den Bahnhof.', en: 'In a cab, the driver names downtown as the destination — politely correct them and name the station.' }, pedagogicalGoal: 'Mit „not …“ ein Fahrtziel freundlich korrigieren.', targetText: 'Could you take me to the station, not downtown?', baseText: { de: 'Könnten Sie mich zum Bahnhof fahren, nicht in die Innenstadt?' },
    chunks: [{ targetText: 'Could you take me', baseText: { de: 'Könnten Sie mich fahren' } }, { targetText: 'to the station,', baseText: { de: 'zum Bahnhof,' } }, { targetText: 'not downtown?', baseText: { de: 'nicht in die Innenstadt?' } }], terms: [{ targetText: 'take me to', baseText: { de: 'mich fahren' } }, { targetText: 'the station', baseText: { de: 'der Bahnhof' } }, { targetText: 'not downtown', baseText: { de: 'nicht in die Innenstadt' } }, { targetText: 'cab driver', baseText: { de: 'Taxifahrer' } }, { targetText: 'destination', baseText: { de: 'Fahrtziel' } }],
    recall: { before: 'Could you take me to the station, not ', answer: 'downtown', after: '?', fallbackChoices: ['downtown', 'outside', 'home', 'upstairs'] }, speakRequired: ['take', 'station', 'downtown'], sceneCaption: { de: 'Der Fahrer fragt: „Downtown, right?“' }, trophyWord: { word: 'downtown', meaning: { de: 'Innenstadt' }, example: 'The station is downtown near the river.', whyThisWord: { de: 'downtown hilft dir, ein missverstandenes Fahrtziel klar zu korrigieren.' } }, distractors: ['At the airport,', 'with my bags.'], placeholderCaption: { de: 'Ein Taxifahrer schaut auf das Navigationsgerät, während der Fahrgast auf den Bahnhof zeigt.' }, songMood: 'a quick direction fix on a city ride', visualNotes: 'Cab interior with a map showing downtown and a station pin as the passenger corrects the route.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-sorry-i-cant-come-after-work', title: { de: 'Nach der Arbeit nicht' }, situation: { de: 'Dein Freund lädt dich nach der Arbeit ein – du lehnst die Einladung freundlich ab.', en: 'Your friend invites you over after work — decline the invitation politely.' }, pedagogicalGoal: 'Mit „I’m sorry, I can’t …“ eine Einladung kurz und freundlich ablehnen.', targetText: "I'm sorry, I can't come after work.", baseText: { de: 'Es tut mir leid, ich kann nach der Arbeit nicht kommen.' },
    chunks: [{ targetText: "I'm sorry,", baseText: { de: 'Es tut mir leid,' } }, { targetText: "I can't come", baseText: { de: 'ich kann nicht kommen' } }, { targetText: 'after work.', baseText: { de: 'nach der Arbeit.' } }], terms: [{ targetText: 'sorry', baseText: { de: 'tut mir leid' } }, { targetText: 'cannot come', baseText: { de: 'nicht kommen können' } }, { targetText: 'after work', baseText: { de: 'nach der Arbeit' } }, { targetText: 'friend invitation', baseText: { de: 'Einladung eines Freundes' } }, { targetText: 'decline', baseText: { de: 'ablehnen' } }],
    recall: { before: "I'm sorry, I can't come after ", answer: 'work', after: '.', fallbackChoices: ['work', 'dinner', 'coffee', 'school'] }, speakRequired: ['sorry', 'come', 'work'], sceneCaption: { de: 'Dein Freund fragt: „Do you want to come over after work?“' }, trophyWord: { word: 'work', meaning: { de: 'Arbeit' }, example: 'I go home after work every day.', whyThisWord: { de: 'work gibt deiner kurzen, höflichen Absage einen klaren zeitlichen Rahmen.' } }, distractors: ['At the station,', 'with my friend.'], placeholderCaption: { de: 'Eine Einladung nach der Arbeit steht auf einem Handy neben einem Büroausweis.' }, songMood: 'a warm but brief no after a busy workday', visualNotes: 'Office badge beside a friendly phone invitation as a regular sends a polite decline.',
  }),
]

export const ENGLISH_A2_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_FIVE_METADATA, englishA2Practical5Inputs,
  { de: 'Du hast Englisch A2 Praxis 5 abgeschlossen – du kannst Missverständnisse freundlich korrigieren und Alternativen nennen.' },
)
export const GUIDED_TODAY_PATH_ENGLISH_A2_SIX_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-6', title: 'English A2 Practical 6', shortTitle: 'A2 Practical 6', subtitle: { de: 'Dinge erledigen: Dienste nutzen und Termine klären' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical6Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'i-need-to-pick-up-my-laundry-on-friday', title: { de: 'Wäsche abholen' }, situation: { de: 'In der Reinigung gibst du die Wäsche ab und fragst, wann sie bis Freitag fertig ist.', en: 'At the laundry, you hand in your clothes and ask when they will be ready by Friday.' }, pedagogicalGoal: 'Mit „I need to …“ eine einfache Abholung nennen.', targetText: 'I need my laundry by Friday. When is it ready?', baseText: { de: 'Ich brauche meine Wäsche bis Freitag. Wann ist sie fertig?' },
    chunks: [{ targetText: 'I need my laundry', baseText: { de: 'Ich brauche meine Wäsche' } }, { targetText: 'by Friday.', baseText: { de: 'bis Freitag.' } }, { targetText: 'When is it ready?', baseText: { de: 'Wann ist sie fertig?' } }], terms: [{ targetText: 'need to pick up', baseText: { de: 'abholen müssen' } }, { targetText: 'my laundry', baseText: { de: 'meine Wäsche' } }, { targetText: 'on Friday', baseText: { de: 'am Freitag' } }, { targetText: 'laundry service', baseText: { de: 'Wäscherei' } }, { targetText: 'collect clothes', baseText: { de: 'Kleidung abholen' } }],
    recall: { before: 'I need my ', answer: 'laundry', after: ' by Friday. When is it ready?', fallbackChoices: ['laundry', 'package', 'phone', 'bike'] }, speakRequired: ['laundry', 'friday', 'ready'], sceneCaption: { de: 'Die Mitarbeiterin nimmt deine Wäsche entgegen und fragt: „When do you need it back?“' }, trophyWord: { word: 'laundry', meaning: { de: 'Wäsche' }, example: 'My laundry is ready on Friday.', whyThisWord: { de: 'laundry benennt genau das, was du bei diesem Dienst abholen möchtest.' } }, distractors: ['At the hotel,', 'with my bag.'], placeholderCaption: { de: 'Eine Stofftasche mit frisch gereinigter Wäsche steht auf einem Ladentresen.' }, songMood: 'a practical Friday errand done smoothly', visualNotes: 'Laundry counter with a tagged clothes bag and a Friday pickup note.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-need-a-phone-repair-today', title: { de: 'Handyreparatur' }, situation: { de: 'Dein Handy ist kaputt und du gehst in ein Geschäft – du sagst, was du heute brauchst.', en: 'Your phone is broken and you go to a store — say what you need today.' }, pedagogicalGoal: 'Mit „I need …“ einen Dienst für ein Gerät nennen.', targetText: 'I need a phone repair today.', baseText: { de: 'Ich brauche heute eine Handyreparatur.' },
    chunks: [{ targetText: 'I need', baseText: { de: 'Ich brauche' } }, { targetText: 'a phone repair', baseText: { de: 'eine Handyreparatur' } }, { targetText: 'today.', baseText: { de: 'heute.' } }], terms: [{ targetText: 'need a repair', baseText: { de: 'eine Reparatur brauchen' } }, { targetText: 'phone repair', baseText: { de: 'Handyreparatur' } }, { targetText: 'today', baseText: { de: 'heute' } }, { targetText: 'phone store', baseText: { de: 'Handyladen' } }, { targetText: 'broken screen', baseText: { de: 'kaputter Bildschirm' } }],
    recall: { before: 'I need a phone ', answer: 'repair', after: ' today.', fallbackChoices: ['repair', 'number', 'charger', 'ticket'] }, speakRequired: ['need', 'phone', 'repair'], sceneCaption: { de: 'Der Mitarbeiter schaut auf dein Handy und fragt: „How can I help you today?“' }, trophyWord: { word: 'repair', meaning: { de: 'Reparatur' }, example: 'I need a repair for my phone.', whyThisWord: { de: 'repair sagt im Laden sofort, welchen Dienst du für dein Handy brauchst.' } }, distractors: ['For my laptop,', 'after lunch.'], placeholderCaption: { de: 'Ein Handy mit gesprungenem Bildschirm liegt auf einem Reparaturtresen.' }, songMood: 'a quick practical stop to fix a phone', visualNotes: 'Phone repair counter with a cracked screen and a helpful technician listening.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'id-like-to-add-ten-dollars-to-my-sim', title: { de: 'Guthaben aufladen' }, situation: { de: 'Im Handyladen ist dein Guthaben fast leer – du bittest darum, zehn Dollar auf deine SIM zu laden.', en: 'At the phone store, your credit is nearly empty — ask to add ten dollars to your SIM.' }, pedagogicalGoal: 'Mit „I’d like to …“ Guthaben für eine SIM-Karte nennen.', targetText: "I'd like to add ten dollars to my phone account.", baseText: { de: 'Ich möchte zehn Dollar auf mein Handyguthaben laden.' },
    chunks: [{ targetText: "I'd like to add", baseText: { de: 'Ich möchte laden' } }, { targetText: 'ten dollars', baseText: { de: 'zehn Dollar' } }, { targetText: 'to my phone account.', baseText: { de: 'auf mein Handyguthaben.' } }], terms: [{ targetText: 'like to add', baseText: { de: 'gern aufladen möchten' } }, { targetText: 'ten dollars', baseText: { de: 'zehn Dollar' } }, { targetText: 'phone account', baseText: { de: 'Handyguthaben' } }, { targetText: 'phone credit', baseText: { de: 'Handyguthaben' } }, { targetText: 'phone store', baseText: { de: 'Handyladen' } }],
    recall: { before: "I'd like to add ten ", answer: 'dollars', after: ' to my phone account.', fallbackChoices: ['dollars', 'minutes', 'numbers', 'cards'] }, speakRequired: ['add', 'dollars', 'phone'], sceneCaption: { de: 'Der Mitarbeiter fragt: „How much credit would you like to add?“' }, trophyWord: { word: 'dollars', meaning: { de: 'Dollar' }, example: 'Ten dollars is enough for my phone credit.', whyThisWord: { de: 'dollars gibt dir eine klare Summe für das Aufladen deiner SIM-Karte.' } }, distractors: ['At the market,', 'with a new phone.'], placeholderCaption: { de: 'Ein Handybildschirm zeigt wenig Guthaben neben einer SIM-Karte auf einem Tresen.' }, songMood: 'a quick top-up before a busy day', visualNotes: 'Phone store counter with a SIM card and a screen showing a small credit balance.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'id-like-to-make-an-appointment-for-thursday', title: { de: 'Termin am Donnerstag' }, situation: { de: 'Du rufst in einer Praxis an und möchtest einen Termin für Donnerstag vereinbaren.', en: 'You call a clinic and want to make an appointment for Thursday.' }, pedagogicalGoal: 'Mit „I’d like to make an appointment“ einen Termin vereinbaren.', targetText: "I'd like to make an appointment for Thursday.", baseText: { de: 'Ich möchte einen Termin für Donnerstag vereinbaren.' },
    chunks: [{ targetText: "I'd like to make", baseText: { de: 'Ich möchte vereinbaren' } }, { targetText: 'an appointment', baseText: { de: 'einen Termin' } }, { targetText: 'for Thursday.', baseText: { de: 'für Donnerstag.' } }], terms: [{ targetText: 'like to make', baseText: { de: 'gern vereinbaren möchten' } }, { targetText: 'an appointment', baseText: { de: 'einen Termin' } }, { targetText: 'for Thursday', baseText: { de: 'für Donnerstag' } }, { targetText: 'clinic call', baseText: { de: 'Anruf in einer Praxis' } }, { targetText: 'available time', baseText: { de: 'freie Uhrzeit' } }],
    recall: { before: "I'd like to make an ", answer: 'appointment', after: ' for Thursday.', fallbackChoices: ['appointment', 'order', 'exchange', 'reservation'] }, speakRequired: ['make', 'appointment', 'thursday'], sceneCaption: { de: 'Die Rezeptionistin fragt am Telefon: „How can I help you?“' }, trophyWord: { word: 'appointment', meaning: { de: 'Termin' }, example: 'I have an appointment on Thursday.', whyThisWord: { de: 'appointment ist das Schlüsselwort, wenn du einen festen Termin vereinbaren möchtest.' } }, distractors: ['At the station,', 'with my doctor.'], placeholderCaption: { de: 'Ein Kalender mit einem freien Donnerstag liegt neben einem Telefon in einer Praxis.' }, songMood: 'a calm call that secures a useful appointment', visualNotes: 'Clinic desk with a calendar and phone as a receptionist finds a Thursday slot.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'could-i-get-a-copy-of-this-key-please', title: { de: 'Schlüssel nachmachen' }, situation: { de: 'Im Schlüsseldienst brauchst du einen zweiten Schlüssel – du bittest höflich um eine Kopie.', en: 'At the key shop, you need a second key — politely ask for a copy.' }, pedagogicalGoal: 'Mit „Could I get …?“ höflich nach einer Kopie fragen.', targetText: 'Could I get a copy of this key, please?', baseText: { de: 'Könnte ich bitte eine Kopie von diesem Schlüssel bekommen?' },
    chunks: [{ targetText: 'Could I get', baseText: { de: 'Könnte ich bekommen' } }, { targetText: 'a copy', baseText: { de: 'eine Kopie' } }, { targetText: 'of this key, please?', baseText: { de: 'von diesem Schlüssel, bitte?' } }], terms: [{ targetText: 'could I get', baseText: { de: 'könnte ich bekommen' } }, { targetText: 'a copy', baseText: { de: 'eine Kopie' } }, { targetText: 'this key', baseText: { de: 'dieser Schlüssel' } }, { targetText: 'key shop', baseText: { de: 'Schlüsseldienst' } }, { targetText: 'second key', baseText: { de: 'zweiter Schlüssel' } }],
    recall: { before: 'Could I get a ', answer: 'copy', after: ' of this key, please?', fallbackChoices: ['copy', 'repair', 'ticket', 'receipt'] }, speakRequired: ['get', 'copy', 'key'], sceneCaption: { de: 'Der Mitarbeiter fragt: „What can I make for you?“' }, trophyWord: { word: 'copy', meaning: { de: 'Kopie' }, example: 'I need a copy of my apartment key.', whyThisWord: { de: 'copy benennt genau den Dienst, den du beim Schlüsseldienst brauchst.' } }, distractors: ['For my phone,', 'after work.'], placeholderCaption: { de: 'Ein Schlüssel liegt neben einer Maschine zum Nachmachen auf einem Werkstatttresen.' }, songMood: 'a useful small errand at a key shop', visualNotes: 'Key-cutting machine and one metal key as a customer asks for a duplicate.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-here-to-pick-up-a-package', title: { de: 'Paket abholen' }, situation: { de: 'Im Paketladen liegt eine Sendung für dich bereit – du sagst, warum du dort bist.', en: 'At a pickup location, a package is waiting for you — say why you are there.' }, pedagogicalGoal: 'Mit „I’m here to …“ den Grund für einen Besuch nennen.', targetText: "I'm here to pick up a package.", baseText: { de: 'Ich bin hier, um ein Paket abzuholen.' },
    chunks: [{ targetText: "I'm here", baseText: { de: 'Ich bin hier' } }, { targetText: 'to pick up', baseText: { de: 'um abzuholen' } }, { targetText: 'a package.', baseText: { de: 'ein Paket.' } }], terms: [{ targetText: 'here to pick up', baseText: { de: 'hier, um abzuholen' } }, { targetText: 'a package', baseText: { de: 'ein Paket' } }, { targetText: 'package shop', baseText: { de: 'Paketladen' } }, { targetText: 'pickup notice', baseText: { de: 'Abholbenachrichtigung' } }, { targetText: 'show ID', baseText: { de: 'Ausweis zeigen' } }],
    recall: { before: "I'm here to pick up a ", answer: 'package', after: '.', fallbackChoices: ['package', 'ticket', 'bicycle', 'receipt'] }, speakRequired: ['here', 'pick', 'package'], sceneCaption: { de: 'Der Mitarbeiter am Schalter fragt: „How can I help you?“' }, trophyWord: { word: 'package', meaning: { de: 'Paket' }, example: 'My package is at the shop today.', whyThisWord: { de: 'package sagt am Schalter sofort, was du abholen möchtest.' } }, distractors: ['At the pharmacy,', 'with my friend.'], placeholderCaption: { de: 'Ein Paket mit einem Abholschein liegt auf einem Schalter im Paketladen.' }, songMood: 'a quick pickup on an ordinary city errand', visualNotes: 'Package shop counter with a labeled parcel and a pickup notice in a customer’s hand.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'id-like-to-rent-a-bike-for-two-days', title: { de: 'Fahrrad für zwei Tage' }, situation: { de: 'Im Fahrradverleih planst du eine kleine Tour – du möchtest ein Rad für zwei Tage mieten.', en: 'At the bike rental, you plan a small tour — ask to rent a bike for two days.' }, pedagogicalGoal: 'Mit „I’d like to rent …“ eine Mietdauer nennen.', targetText: "I'd like to rent a bike for two days.", baseText: { de: 'Ich möchte ein Fahrrad für zwei Tage mieten.' },
    chunks: [{ targetText: "I'd like to rent", baseText: { de: 'Ich möchte mieten' } }, { targetText: 'a bike', baseText: { de: 'ein Fahrrad' } }, { targetText: 'for two days.', baseText: { de: 'für zwei Tage.' } }], terms: [{ targetText: 'like to rent', baseText: { de: 'gern mieten möchten' } }, { targetText: 'a bike', baseText: { de: 'ein Fahrrad' } }, { targetText: 'for two days', baseText: { de: 'für zwei Tage' } }, { targetText: 'bike rental', baseText: { de: 'Fahrradverleih' } }, { targetText: 'city ride', baseText: { de: 'Fahrt durch die Stadt' } }],
    recall: { before: "I'd like to ", answer: 'rent', after: ' a bike for two days.', fallbackChoices: ['rent', 'repair', 'carry', 'change'] }, speakRequired: ['rent', 'bike', 'days'], sceneCaption: { de: 'Der Mitarbeiter fragt: „How long would you like the bike?“' }, trophyWord: { word: 'rent', meaning: { de: 'mieten' }, example: 'We rent a bike for two days.', whyThisWord: { de: 'rent macht deine Bitte im Fahrradverleih klar und praktisch.' } }, distractors: ['At the museum,', 'with a helmet.'], placeholderCaption: { de: 'Ein Fahrrad steht vor einem Verleih neben einem Schild für zwei Tage.' }, songMood: 'a light city adventure on two wheels', visualNotes: 'Bike rental storefront with one bicycle ready for a two-day city ride.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'until-what-time-are-you-open-on-sundays', title: { de: 'Sonntags geöffnet' }, situation: { de: 'Vor einem Laden möchtest du die Öffnungszeit am Sonntag wissen – du fragst, wie lange geöffnet ist.', en: 'Outside a store, you want to know Sunday hours — ask how late it is open.' }, pedagogicalGoal: 'Mit „Until what time …?“ nach einer Öffnungszeit fragen.', targetText: 'Until what time are you open on Sundays?', baseText: { de: 'Bis wann haben Sie sonntags geöffnet?' },
    chunks: [{ targetText: 'Until what time', baseText: { de: 'Bis wann' } }, { targetText: 'are you open', baseText: { de: 'haben Sie geöffnet' } }, { targetText: 'on Sundays?', baseText: { de: 'sonntags?' } }], terms: [{ targetText: 'until what time', baseText: { de: 'bis wann' } }, { targetText: 'are you open', baseText: { de: 'haben Sie geöffnet' } }, { targetText: 'on Sundays', baseText: { de: 'sonntags' } }, { targetText: 'opening hours', baseText: { de: 'Öffnungszeiten' } }, { targetText: 'store door', baseText: { de: 'Ladentür' } }],
    recall: { before: '', answer: 'Until', after: ' what time are you open on Sundays?', fallbackChoices: ['Until', 'After', 'Before', 'Around'] }, speakRequired: ['until', 'time', 'open'], sceneCaption: { de: 'Der Ladenbesitzer hängt ein Schild auf und fragt: „Do you need our Sunday hours?“' }, trophyWord: { word: 'until', meaning: { de: 'bis' }, example: 'The store is open until six on Sundays.', whyThisWord: { de: 'until hilft dir, die genaue Endzeit der Öffnung zu erfragen.' } }, distractors: ['At the station,', 'after dinner.'], placeholderCaption: { de: 'Ein Ladenschild zeigt die Öffnungszeiten für Sonntag neben einer offenen Tür.' }, songMood: 'a useful question before a Sunday errand', visualNotes: 'Storefront with a Sunday-hours sign while a shopper checks the closing time.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-here-to-pick-up-my-phone-from-the-repair-shop', title: { de: 'Handy abholen' }, situation: { de: 'Du kommst zurück in den Handyladen, um dein Gerät aus der Werkstatt abzuholen.', en: 'You return to the phone store to collect your device from the repair shop.' }, pedagogicalGoal: 'Mit „I’m here to pick up …“ eine zweite Abholung klar nennen.', targetText: "I'm here to pick up my phone. Is it ready?", baseText: { de: 'Ich bin hier, um mein Handy abzuholen. Ist es fertig?' },
    chunks: [{ targetText: "I'm here to pick up", baseText: { de: 'Ich bin hier, um abzuholen' } }, { targetText: 'my phone.', baseText: { de: 'mein Handy.' } }, { targetText: 'Is it ready?', baseText: { de: 'Ist es fertig?' } }], terms: [{ targetText: 'here to pick up', baseText: { de: 'hier, um abzuholen' } }, { targetText: 'my phone', baseText: { de: 'mein Handy' } }, { targetText: 'repair shop', baseText: { de: 'Reparaturwerkstatt' } }, { targetText: 'phone store', baseText: { de: 'Handyladen' } }, { targetText: 'collect device', baseText: { de: 'Gerät abholen' } }],
    recall: { before: "I'm here to pick up my ", answer: 'phone', after: '. Is it ready?', fallbackChoices: ['phone', 'package', 'laundry', 'bike'] }, speakRequired: ['pick', 'phone', 'ready'], sceneCaption: { de: 'Der Mitarbeiter schaut auf den Abholschein und fragt: „What are you here to pick up?“' }, trophyWord: { word: 'phone', meaning: { de: 'Handy' }, example: 'My phone is at the repair shop.', whyThisWord: { de: 'phone benennt das Gerät, das du nach dem Service abholen möchtest.' } }, distractors: ['At the market,', 'with my key.'], placeholderCaption: { de: 'Ein Handy liegt neben einem Abholschein auf dem Tresen einer Reparaturwerkstatt.' }, songMood: 'a satisfying return for an important device', visualNotes: 'Repaired phone and pickup slip on a technician’s counter as the customer returns.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'perfect-ill-see-you-thursday-at-noon', title: { de: 'Bis Donnerstagmittag' }, situation: { de: 'Nach dem Termin vereinbaren du und die Mitarbeiterin die Abholung am Donnerstag um zwölf.', en: 'After arranging the service, you and the clerk confirm pickup at noon on Thursday.' }, pedagogicalGoal: 'Eine vereinbarte Uhrzeit mit einem festen Abschiedsbaustein bestätigen.', targetText: "Perfect, I'll see you Thursday at noon.", baseText: { de: 'Perfekt, dann sehe ich Sie am Donnerstag um zwölf.' },
    chunks: [{ targetText: 'Perfect,', baseText: { de: 'Perfekt,' } }, { targetText: "I'll see you", baseText: { de: 'dann sehe ich Sie' } }, { targetText: 'Thursday at noon.', baseText: { de: 'am Donnerstag um zwölf.' } }], terms: [{ targetText: 'perfect', baseText: { de: 'perfekt' } }, { targetText: 'see you', baseText: { de: 'Sie sehen' } }, { targetText: 'Thursday at noon', baseText: { de: 'Donnerstag um zwölf' } }, { targetText: 'pickup time', baseText: { de: 'Abholzeit' } }, { targetText: 'service desk', baseText: { de: 'Serviceschalter' } }],
    recall: { before: "Perfect, I'll see you Thursday at ", answer: 'noon', after: '.', fallbackChoices: ['noon', 'morning', 'night', 'weekend'] }, speakRequired: ['perfect', 'thursday', 'noon'], sceneCaption: { de: 'Die Mitarbeiterin lächelt und sagt: „Your pickup is Thursday at noon.“' }, trophyWord: { word: 'noon', meaning: { de: 'Mittag' }, example: 'We meet at noon on Thursday.', whyThisWord: { de: 'noon gibt deiner vereinbarten Abholung eine genaue Uhrzeit.' } }, distractors: ['At the station,', 'with my package.'], placeholderCaption: { de: 'Ein Serviceschalter zeigt einen Abholschein für Donnerstag um zwölf.' }, songMood: 'a neat final detail on a day of errands', visualNotes: 'Service desk, pickup receipt, and a clock at noon as a practical appointment is confirmed.',
  }),
]

export const ENGLISH_A2_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_SIX_METADATA, englishA2Practical6Inputs,
  { de: 'Du hast Englisch A2 Praxis 6 abgeschlossen – du kannst Dienste nutzen, Abholungen organisieren und Termine klären.' },
)

export const GUIDED_TODAY_PATH_ENGLISH_A2_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-7',
  title: 'English A2 Practical 7',
  shortTitle: 'A2 Practical 7',
  subtitle: { de: 'Was empfehlen Sie? Essen, Orte und Ideen beschreiben' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical7Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'what-do-you-recommend-for-dinner-tonight', title: { de: 'Empfehlung zum Abendessen' }, situation: { de: 'In einem neuen Restaurant fragt die Bedienung, was du gern essen möchtest – du bittest um eine Empfehlung für das Abendessen.', en: 'At a new restaurant, the server asks what you would like to eat — ask for a dinner recommendation.' }, pedagogicalGoal: 'Mit „What do you recommend?“ freundlich nach einer Empfehlung fragen.', targetText: 'What do you recommend for dinner tonight?', baseText: { de: 'Was empfehlen Sie heute Abend zum Essen?' },
    chunks: [{ targetText: 'What do you recommend', baseText: { de: 'Was empfehlen Sie' } }, { targetText: 'for dinner', baseText: { de: 'zum Abendessen' } }, { targetText: 'tonight?', baseText: { de: 'heute Abend?' } }], terms: [{ targetText: 'recommend', baseText: { de: 'empfehlen' } }, { targetText: 'for dinner', baseText: { de: 'zum Abendessen' } }, { targetText: 'tonight', baseText: { de: 'heute Abend' } }, { targetText: 'restaurant server', baseText: { de: 'Bedienung im Restaurant' } }, { targetText: 'special dish', baseText: { de: 'Tagesgericht' } }],
    recall: { before: 'What do you ', answer: 'recommend', after: ' for dinner tonight?', fallbackChoices: ['recommend', 'order', 'prefer', 'choose'] }, speakRequired: ['recommend', 'dinner', 'tonight'], sceneCaption: { de: 'Die Bedienung reicht dir die Speisekarte und fragt: „Would you like to hear about our specials?“' }, trophyWord: { word: 'recommend', meaning: { de: 'empfehlen' }, example: 'What do you recommend for dinner?', whyThisWord: { de: 'recommend öffnet dir im Restaurant eine natürliche Frage nach einem guten Gericht.' } }, distractors: ['The bill, please,', 'for two people.'], placeholderCaption: { de: 'Eine Bedienung hält in einem neuen Restaurant eine Speisekarte mit Tagesgerichten bereit.' }, songMood: 'a curious first meal in a welcoming neighborhood restaurant', visualNotes: 'Warm restaurant table, open menu, and a server describing the evening specials.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'that-sounds-delicious-ill-take-that-please', title: { de: 'Das nehme ich' }, situation: { de: 'Die Bedienung beschreibt dir ein Gericht, das gut klingt – du nimmst die Empfehlung freundlich an.', en: 'The server describes a dish that sounds good — accept the recommendation politely.' }, pedagogicalGoal: 'Eine Empfehlung mit „That sounds delicious“ annehmen und eine feste Bestellformel verwenden.', targetText: "That sounds delicious. I'll take that, please.", baseText: { de: 'Das klingt lecker. Das nehme ich bitte.' },
    chunks: [{ targetText: 'That sounds delicious.', baseText: { de: 'Das klingt lecker.' } }, { targetText: "I'll take that,", baseText: { de: 'Das nehme ich,' } }, { targetText: 'please.', baseText: { de: 'bitte.' } }], terms: [{ targetText: 'sounds delicious', baseText: { de: 'klingt lecker' } }, { targetText: 'take that', baseText: { de: 'das nehmen' } }, { targetText: 'recommendation', baseText: { de: 'Empfehlung' } }, { targetText: 'main dish', baseText: { de: 'Hauptgericht' } }, { targetText: 'restaurant order', baseText: { de: 'Bestellung im Restaurant' } }],
    recall: { before: 'That sounds ', answer: 'delicious', after: ". I'll take that, please.", fallbackChoices: ['delicious', 'expensive', 'different', 'ready'] }, speakRequired: ['sounds', 'delicious', 'please'], sceneCaption: { de: 'Die Bedienung sagt über das Gericht: „It has fresh vegetables and a light sauce.“' }, trophyWord: { word: 'delicious', meaning: { de: 'lecker' }, example: 'This soup sounds delicious.', whyThisWord: { de: 'delicious hilft dir, eine appetitliche Empfehlung spontan anzunehmen.' } }, distractors: ['The menu again,', 'with extra bread.'], placeholderCaption: { de: 'Ein appetitliches Gericht mit Gemüse und heller Soße wird an einen Restauranttisch gebracht.' }, songMood: 'an easy yes to a tempting local dish', visualNotes: 'Colorful dinner plate arriving at a small table while a guest accepts the server’s suggestion.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'which-neighborhood-do-you-recommend-for-a-walk', title: { de: 'Ein Viertel zum Spazieren' }, situation: { de: 'Du möchtest durch ein schönes Viertel laufen und fragst einen Einheimischen nach einem Tipp.', en: 'You want to walk through a pleasant neighborhood and ask a local for a suggestion.' }, pedagogicalGoal: 'Nach einem Viertel für einen Spaziergang fragen und „recommend“ wiedererkennen.', targetText: 'Which neighborhood do you recommend for a walk?', baseText: { de: 'Welches Viertel empfehlen Sie für einen Spaziergang?' },
    chunks: [{ targetText: 'Which neighborhood', baseText: { de: 'Welches Viertel' } }, { targetText: 'do you recommend', baseText: { de: 'empfehlen Sie' } }, { targetText: 'for a walk?', baseText: { de: 'für einen Spaziergang?' } }], terms: [{ targetText: 'which neighborhood', baseText: { de: 'welches Viertel' } }, { targetText: 'for a walk', baseText: { de: 'für einen Spaziergang' } }, { targetText: 'local person', baseText: { de: 'einheimische Person' } }, { targetText: 'street market', baseText: { de: 'Straßenmarkt' } }, { targetText: 'city walk', baseText: { de: 'Spaziergang durch die Stadt' } }],
    recall: { before: 'Which ', answer: 'neighborhood', after: ' do you recommend for a walk?', fallbackChoices: ['neighborhood', 'restaurant', 'station', 'ticket'] }, speakRequired: ['neighborhood', 'recommend', 'walk'], sceneCaption: { de: 'Ein Einheimischer fragt dich an der Straßenecke: „Are you looking for a nice area to explore?“' }, trophyWord: { word: 'neighborhood', meaning: { de: 'Viertel' }, example: 'This neighborhood is good for a walk.', whyThisWord: { de: 'neighborhood macht deine Frage nach einem passenden Stadtviertel genauer.' } }, distractors: ['Near the station,', 'after lunch.'], placeholderCaption: { de: 'Eine ruhige Straße mit kleinen Geschäften lädt zu einem Spaziergang durch ein Viertel ein.' }, songMood: 'an open afternoon exploring a new part of town', visualNotes: 'Tree-lined neighborhood street, small shops, and a local pointing toward a pleasant walking area.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'the-park-is-green-and-quiet-right-by-the-river', title: { de: 'Der Park am Fluss' }, situation: { de: 'Du fragst nach einem schönen Ort im Freien, und ein Einheimischer beschreibt dir einen Park am Fluss.', en: 'You ask about a pleasant outdoor place, and a local describes a park by the river.' }, pedagogicalGoal: 'Einen Ort mit zwei Adjektiven und einer Ortsangabe beschreiben.', targetText: 'The park is green and quiet, right by the river.', baseText: { de: 'Der Park ist grün und ruhig, direkt am Fluss.' },
    chunks: [{ targetText: 'The park is green', baseText: { de: 'Der Park ist grün' } }, { targetText: 'and quiet,', baseText: { de: 'und ruhig,' } }, { targetText: 'right by the river.', baseText: { de: 'direkt am Fluss.' } }], terms: [{ targetText: 'green', baseText: { de: 'grün' } }, { targetText: 'quiet', baseText: { de: 'ruhig' } }, { targetText: 'right by', baseText: { de: 'direkt an' } }, { targetText: 'the river', baseText: { de: 'der Fluss' } }, { targetText: 'outdoor place', baseText: { de: 'Ort im Freien' } }],
    recall: { before: 'The park is ', answer: 'green', after: ' and quiet, right by the river.', fallbackChoices: ['green', 'small', 'busy', 'closed'] }, speakRequired: ['park', 'green', 'river'], sceneCaption: { de: 'Der Einheimische lächelt und sagt: „The park is just behind the bridge.“' }, trophyWord: { word: 'green', meaning: { de: 'grün' }, example: 'The park is green in summer.', whyThisWord: { de: 'green gibt deiner Beschreibung des Parks ein klares, freundliches Bild.' } }, distractors: ['Next to the hotel,', 'after the bridge.'], placeholderCaption: { de: 'Ein grüner, ruhiger Park liegt direkt neben einem Fluss und einer kleinen Brücke.' }, songMood: 'a calm riverside pause in a green city park', visualNotes: 'Leafy park lawn beside a river, with a small bridge and quiet paths in afternoon light.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-recommend-the-cafe-next-to-the-library', title: { de: 'Das Café bei der Bibliothek' }, situation: { de: 'Jemand fragt dich nach einem guten Café in der Nähe – du empfiehlst eines neben der Bibliothek.', en: 'Someone asks you about a good cafe nearby — recommend one next to the library.' }, pedagogicalGoal: 'Ein Café mit einer Ortskette aus „next to“ empfehlen.', targetText: 'I recommend the cafe next to the library.', baseText: { de: 'Ich empfehle das Café neben der Bibliothek.' },
    chunks: [{ targetText: 'I recommend', baseText: { de: 'Ich empfehle' } }, { targetText: 'the cafe', baseText: { de: 'das Café' } }, { targetText: 'next to the library.', baseText: { de: 'neben der Bibliothek.' } }], terms: [{ targetText: 'cafe', baseText: { de: 'Café' } }, { targetText: 'next to', baseText: { de: 'neben' } }, { targetText: 'library', baseText: { de: 'Bibliothek' } }, { targetText: 'good cafe', baseText: { de: 'gutes Café' } }, { targetText: 'nearby place', baseText: { de: 'Ort in der Nähe' } }],
    recall: { before: 'I recommend the cafe next to the ', answer: 'library', after: '.', fallbackChoices: ['library', 'hotel', 'market', 'river'] }, speakRequired: ['recommend', 'cafe', 'library'], sceneCaption: { de: 'Ein Besucher fragt dich: „Is there a good coffee shop near here?“' }, trophyWord: { word: 'library', meaning: { de: 'Bibliothek' }, example: 'The cafe is next to the library.', whyThisWord: { de: 'library macht die Lage deines empfohlenen Cafés leicht verständlich.' } }, distractors: ['For dinner tonight,', 'behind the park.'], placeholderCaption: { de: 'Ein kleines Café steht direkt neben dem Eingang einer Bibliothek.' }, songMood: 'a friendly local tip over coffee and books', visualNotes: 'Cozy cafe storefront beside a library entrance, with books visible through one window.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-recommend-a-photo-book-for-your-friend', title: { de: 'Ein Geschenk für einen Freund' }, situation: { de: 'In einem kleinen Laden fragst du nach einer Geschenkidee für einen Freund – die Verkäuferin bittet dich um einen Vorschlag.', en: 'In a small shop, you discuss a gift idea for a friend — the clerk asks you for a suggestion.' }, pedagogicalGoal: 'Eine einfache Geschenkidee mit „I recommend“ nennen.', targetText: 'I recommend a photo book for your friend.', baseText: { de: 'Ich empfehle ein Fotobuch für Ihren Freund.' },
    chunks: [{ targetText: 'I recommend', baseText: { de: 'Ich empfehle' } }, { targetText: 'a photo book', baseText: { de: 'ein Fotobuch' } }, { targetText: 'for your friend.', baseText: { de: 'für Ihren Freund.' } }], terms: [{ targetText: 'photo book', baseText: { de: 'Fotobuch' } }, { targetText: 'for your friend', baseText: { de: 'für Ihren Freund' } }, { targetText: 'gift idea', baseText: { de: 'Geschenkidee' } }, { targetText: 'small shop', baseText: { de: 'kleiner Laden' } }, { targetText: 'birthday gift', baseText: { de: 'Geburtstagsgeschenk' } }],
    recall: { before: 'I recommend a ', answer: 'photo', after: ' book for your friend.', fallbackChoices: ['photo', 'small', 'paper', 'travel'] }, speakRequired: ['recommend', 'photo', 'friend'], sceneCaption: { de: 'Die Verkäuferin fragt: „Do you have an idea for a birthday gift?“' }, trophyWord: { word: 'photo', meaning: { de: 'Foto' }, example: 'A photo book is a personal gift.', whyThisWord: { de: 'photo gibt deiner Geschenkidee einen persönlichen und konkreten Charakter.' } }, distractors: ['At the restaurant,', 'next to the door.'], placeholderCaption: { de: 'Ein Fotobuch mit buntem Einband liegt als Geschenkidee auf einem Ladentisch.' }, songMood: 'a thoughtful little gift found during an afternoon errand', visualNotes: 'Small gift shop counter with a photo book, ribbon, and a clerk offering ideas.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'the-mexican-restaurant-behind-the-hotel-is-excellent', title: { de: 'Restaurant hinter dem Hotel' }, situation: { de: 'Ein Gast im Hotel sucht ein typisches Restaurant in der Nähe – du beschreibst eines hinter dem Hotel.', en: 'A hotel guest is looking for a typical restaurant nearby — describe one behind the hotel.' }, pedagogicalGoal: 'Ein Restaurant mit „behind“ und einer positiven Beschreibung nennen.', targetText: 'The Mexican restaurant behind the hotel is excellent.', baseText: { de: 'Das mexikanische Restaurant hinter dem Hotel ist ausgezeichnet.' },
    chunks: [{ targetText: 'The Mexican restaurant', baseText: { de: 'Das mexikanische Restaurant' } }, { targetText: 'behind the hotel', baseText: { de: 'hinter dem Hotel' } }, { targetText: 'is excellent.', baseText: { de: 'ist ausgezeichnet.' } }], terms: [{ targetText: 'Mexican restaurant', baseText: { de: 'mexikanisches Restaurant' } }, { targetText: 'behind the hotel', baseText: { de: 'hinter dem Hotel' } }, { targetText: 'excellent', baseText: { de: 'ausgezeichnet' } }, { targetText: 'hotel guest', baseText: { de: 'Hotelgast' } }, { targetText: 'typical food', baseText: { de: 'typisches Essen' } }],
    recall: { before: 'The Mexican restaurant behind the hotel is ', answer: 'excellent', after: '.', fallbackChoices: ['excellent', 'smaller', 'open', 'ready'] }, speakRequired: ['mexican', 'hotel', 'excellent'], sceneCaption: { de: 'Ein Hotelgast fragt dich: „Where can I eat typical local food?“' }, trophyWord: { word: 'excellent', meaning: { de: 'ausgezeichnet' }, example: 'The restaurant behind the hotel is excellent.', whyThisWord: { de: 'excellent bewertet das Restaurant klar und positiv für einen anderen Gast.' } }, distractors: ['Near the subway,', 'with a reservation.'], placeholderCaption: { de: 'Hinter einem Hotel leuchtet das Schild eines beliebten mexikanischen Restaurants.' }, songMood: 'a confident local recommendation just around the hotel block', visualNotes: 'Hotel entrance in the foreground and a warmly lit Mexican restaurant sign behind it.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-recommend-the-square-at-night-for-live-music', title: { de: 'Musik am Platz' }, situation: { de: 'Ein Besucher sucht am Abend einen lebendigen Ort – du empfiehlst den Platz wegen der Musik.', en: 'A visitor is looking for a lively place in the evening — recommend the square for its music.' }, pedagogicalGoal: 'Einen Ort für den Abend mit einer klaren Begründung empfehlen.', targetText: 'I recommend the square at night for live music.', baseText: { de: 'Ich empfehle den Platz am Abend wegen der Livemusik.' },
    chunks: [{ targetText: 'I recommend', baseText: { de: 'Ich empfehle' } }, { targetText: 'the square at night', baseText: { de: 'den Platz am Abend' } }, { targetText: 'for live music.', baseText: { de: 'wegen der Livemusik.' } }], terms: [{ targetText: 'the square', baseText: { de: 'der Platz' } }, { targetText: 'at night', baseText: { de: 'am Abend' } }, { targetText: 'live music', baseText: { de: 'Livemusik' } }, { targetText: 'lively place', baseText: { de: 'lebendiger Ort' } }, { targetText: 'evening plan', baseText: { de: 'Plan für den Abend' } }],
    recall: { before: 'I recommend the square at night for live ', answer: 'music', after: '.', fallbackChoices: ['music', 'coffee', 'dinner', 'walking'] }, speakRequired: ['square', 'night', 'music'], sceneCaption: { de: 'Ein Besucher fragt dich: „Where is a fun place to go this evening?“' }, trophyWord: { word: 'music', meaning: { de: 'Musik' }, example: 'There is live music at the square.', whyThisWord: { de: 'music erklärt kurz und klar, warum der Platz am Abend eine gute Wahl ist.' } }, distractors: ['Behind the library,', 'for a quiet walk.'], placeholderCaption: { de: 'Am Abend spielt eine kleine Band auf einem belebten Platz vor Cafés.' }, songMood: 'a lively evening square with a small band and warm lights', visualNotes: 'Open city square at night, live musicians, cafe tables, and strings of warm lights.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-recommend-white-wine-with-the-fish', title: { de: 'Wein zum Fisch' }, situation: { de: 'Deine Begleitung fragt, was du zum Fisch empfiehlst – du gibst eine einfache Empfehlung.', en: 'Your dinner companion asks what you recommend with the fish — you give a simple recommendation.' }, pedagogicalGoal: 'Eine Getränkewahl mit „with the fish“ empfehlen.', targetText: 'I recommend white wine with the fish.', baseText: { de: 'Ich empfehle Weißwein zum Fisch.' },
    chunks: [{ targetText: 'I recommend', baseText: { de: 'Ich empfehle' } }, { targetText: 'white wine', baseText: { de: 'Weißwein' } }, { targetText: 'with the fish.', baseText: { de: 'zum Fisch.' } }], terms: [{ targetText: 'white wine', baseText: { de: 'Weißwein' } }, { targetText: 'with the fish', baseText: { de: 'zum Fisch' } }, { targetText: 'drink choice', baseText: { de: 'Getränkewahl' } }, { targetText: 'restaurant meal', baseText: { de: 'Mahlzeit im Restaurant' } }, { targetText: 'glass of wine', baseText: { de: 'Glas Wein' } }],
    recall: { before: 'I recommend ', answer: 'white', after: ' wine with the fish.', fallbackChoices: ['white', 'cold', 'small', 'local'] }, speakRequired: ['recommend', 'white', 'fish'], sceneCaption: { de: 'Deine Begleitung fragt: „What do you recommend with the fish?“' }, trophyWord: { word: 'white', meaning: { de: 'weiß' }, example: 'White wine goes well with fish.', whyThisWord: { de: 'white macht deine einfache Weinempfehlung zum Fisch eindeutig.' } }, distractors: ['A table near the window,', 'after the soup.'], placeholderCaption: { de: 'Ein Glas Weißwein steht neben einem Teller mit Fisch auf einem Restauranttisch.' }, songMood: 'a relaxed dinner choice with a simple pairing', visualNotes: 'Restaurant table with a fish dish, a glass of white wine, and soft evening light.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'the-pasta-is-delicious-youre-right-about-this-place', title: { de: 'Ein guter Tipp' }, situation: { de: 'Nach dem Essen fragst du den Freund, der dir das Restaurant empfohlen hat, nach seiner Meinung – du bestätigst seinen Tipp.', en: 'After the meal, you speak with the friend who recommended the restaurant — confirm that the suggestion was good.' }, pedagogicalGoal: 'Ein Gericht bewerten und einer Empfehlung im Präsens zustimmen.', targetText: "The pasta is delicious. You're right about this place.", baseText: { de: 'Die Pasta ist lecker. Du hast recht: Dieser Ort ist gut.' },
    chunks: [{ targetText: 'The pasta is delicious.', baseText: { de: 'Die Pasta ist lecker.' } }, { targetText: "You're right", baseText: { de: 'Du hast recht:' } }, { targetText: 'about this place.', baseText: { de: 'Dieser Ort ist gut.' } }], terms: [{ targetText: 'pasta', baseText: { de: 'Pasta' } }, { targetText: 'delicious', baseText: { de: 'lecker' } }, { targetText: 'right about', baseText: { de: 'mit etwas recht haben' } }, { targetText: 'this place', baseText: { de: 'dieser Ort' } }, { targetText: 'good tip', baseText: { de: 'guter Tipp' } }],
    recall: { before: 'The ', answer: 'pasta', after: " is delicious. You're right about this place.", fallbackChoices: ['pasta', 'coffee', 'market', 'river'] }, speakRequired: ['pasta', 'delicious', 'place'], sceneCaption: { de: 'Dein Freund fragt nach dem Essen: „Do you like the restaurant? I think it\'s great.“' }, trophyWord: { word: 'pasta', meaning: { de: 'Pasta' }, example: 'The pasta is delicious at this place.', whyThisWord: { de: 'pasta gibt deiner positiven Rückmeldung zum empfohlenen Restaurant einen konkreten Fokus.' } }, distractors: ['The menu is here,', 'behind the hotel.'], placeholderCaption: { de: 'Ein Teller Pasta steht auf einem Tisch, während zwei Freunde über das Restaurant sprechen.' }, songMood: 'a satisfied dinner ending with trust in a friend’s advice', visualNotes: 'Two friends at a restaurant table, a finished pasta dish, and an approving smile.',
  }),
]

export const ENGLISH_A2_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_SEVEN_METADATA, englishA2Practical7Inputs,
  { de: 'Du hast Englisch A2 Praxis 7 abgeschlossen – du kannst Empfehlungen erfragen, Orte beschreiben und passende Ideen nennen.' },
)

export const GUIDED_TODAY_PATH_ENGLISH_A2_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-8',
  title: 'English A2 Practical 8',
  shortTitle: 'A2 Practical 8',
  subtitle: { de: 'Wie läuft’s? Gefühle, Wetter und kurze Reaktionen' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical8Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'thats-amazing-news-im-so-happy-for-you', title: { de: 'Tolle Neuigkeiten' }, situation: { de: 'Dein Freund erzählt dir erfreuliche Neuigkeiten – du reagierst begeistert und freust dich für ihn.', en: 'Your friend tells you good news — react with enthusiasm and say that you are happy for them.' }, pedagogicalGoal: 'Auf gute Neuigkeiten mit einer kurzen, herzlichen Reaktion antworten.', targetText: "That's amazing news! I'm so happy for you.", baseText: { de: 'Das sind tolle Neuigkeiten! Ich freue mich so für dich.' },
    chunks: [{ targetText: "That's amazing news!", baseText: { de: 'Das sind tolle Neuigkeiten!' } }, { targetText: "I'm so happy", baseText: { de: 'Ich freue mich so' } }, { targetText: 'for you.', baseText: { de: 'für dich.' } }], terms: [{ targetText: 'amazing news', baseText: { de: 'tolle Neuigkeiten' } }, { targetText: 'happy for you', baseText: { de: 'mich für dich freuen' } }, { targetText: 'good news', baseText: { de: 'gute Neuigkeiten' } }, { targetText: 'friend', baseText: { de: 'Freund' } }, { targetText: 'reaction', baseText: { de: 'Reaktion' } }],
    recall: { before: "That's ", answer: 'amazing', after: " news! I'm so happy for you.", fallbackChoices: ['amazing', 'different', 'quiet', 'small'] }, speakRequired: ['amazing', 'happy', 'news'], sceneCaption: { de: 'Dein Freund strahlt und sagt: „I got the job!“' }, trophyWord: { word: 'amazing', meaning: { de: 'toll' }, example: 'That is amazing news.', whyThisWord: { de: 'amazing zeigt deinem Freund sofort, dass du dich wirklich mitfreust.' } }, distractors: ['At the office,', 'after the rain.'], placeholderCaption: { de: 'Zwei Freunde freuen sich draußen über eine gute Nachricht.' }, songMood: 'bright shared excitement after wonderful news', visualNotes: 'Two friends smiling and celebrating a happy message on a sunny street.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'its-very-hot-today-isnt-it', title: { de: 'Ein heißer Tag' }, situation: { de: 'Du triffst deinen Freund draußen an einem besonders heißen Tag und sprichst das Wetter an.', en: 'You meet your friend outside on a particularly hot day and mention the weather.' }, pedagogicalGoal: 'Das Wetter mit „very“ beschreiben und eine kurze Rückfrage anhängen.', targetText: "It's very hot today, isn't it?", baseText: { de: 'Heute ist es sehr heiß, nicht wahr?' },
    chunks: [{ targetText: "It's very hot", baseText: { de: 'Es ist sehr heiß' } }, { targetText: 'today,', baseText: { de: 'heute,' } }, { targetText: "isn't it?", baseText: { de: 'nicht wahr?' } }], terms: [{ targetText: 'very hot', baseText: { de: 'sehr heiß' } }, { targetText: 'today', baseText: { de: 'heute' } }, { targetText: 'weather', baseText: { de: 'Wetter' } }, { targetText: 'outside', baseText: { de: 'draußen' } }, { targetText: 'hot day', baseText: { de: 'heißer Tag' } }],
    recall: { before: "It's very ", answer: 'hot', after: " today, isn't it?", fallbackChoices: ['hot', 'cold', 'quiet', 'ready'] }, speakRequired: ['very', 'hot', 'today'], sceneCaption: { de: 'Dein Freund wischt sich die Stirn und sagt: „I need some cold water.“' }, trophyWord: { word: 'hot', meaning: { de: 'heiß' }, example: 'It is very hot today.', whyThisWord: { de: 'hot lässt dich das Wetter im kurzen Gespräch direkt benennen.' } }, distractors: ['Near the river,', 'after dinner.'], placeholderCaption: { de: 'Zwei Freunde stehen an einem heißen Tag mit Wasserflaschen draußen.' }, songMood: 'a sunny hot-day chat with cold water nearby', visualNotes: 'Bright summer street, two friends in the shade, and water bottles catching the light.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-sleepy-because-i-slept-badly-last-night', title: { de: 'Schlecht geschlafen' }, situation: { de: 'Dein Freund fragt, warum du heute müde wirkst – du erklärst kurz, dass du letzte Nacht schlecht geschlafen hast.', en: 'Your friend asks why you seem tired today — briefly explain that you slept badly last night.' }, pedagogicalGoal: 'Einen einfachen aktuellen Zustand mit einem past-tense Grund verbinden.', targetText: "I'm sleepy because I slept badly last night.", baseText: { de: 'Ich bin müde, weil ich letzte Nacht schlecht geschlafen habe.' },
    chunks: [{ targetText: "I'm sleepy because", baseText: { de: 'Ich bin müde, weil' } }, { targetText: 'I slept badly', baseText: { de: 'ich schlecht geschlafen habe' } }, { targetText: 'last night.', baseText: { de: 'letzte Nacht.' } }], terms: [{ targetText: 'sleepy', baseText: { de: 'müde' } }, { targetText: 'slept badly', baseText: { de: 'schlecht geschlafen' } }, { targetText: 'last night', baseText: { de: 'letzte Nacht' } }, { targetText: 'feel tired', baseText: { de: 'müde sein' } }, { targetText: 'morning chat', baseText: { de: 'Gespräch am Morgen' } }],
    recall: { before: "I'm sleepy because I ", answer: 'slept', after: ' badly last night.', fallbackChoices: ['slept', 'walked', 'worked', 'waited'] }, speakRequired: ['sleepy', 'slept', 'night'], sceneCaption: { de: 'Dein Freund schaut dich an und fragt: „Did you sleep well last night?“' }, trophyWord: { word: 'because', meaning: { de: 'weil' }, example: 'I am sleepy because I slept badly.', whyThisWord: { de: 'because verbindet deinen Zustand einfach mit einem klaren Grund.' } }, distractors: ['At the station,', 'with my coffee.'], placeholderCaption: { de: 'Ein müder Freund hält am Morgen einen Kaffeebecher und gähnt.' }, songMood: 'a soft slow morning after a restless night', visualNotes: 'Sleepy person with a coffee cup in gentle morning light, talking with a friend.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-have-a-lot-of-work-at-the-office-this-week', title: { de: 'Viel Arbeit' }, situation: { de: 'Dein Freund fragt, warum du diese Woche wenig Zeit hast – du beschreibst deine Arbeitssituation.', en: 'Your friend asks why you have little time this week — describe your work situation.' }, pedagogicalGoal: 'Mit „a lot of work“ einen vollen Zeitraum im Präsens beschreiben.', targetText: 'I have a lot of work at the office this week.', baseText: { de: 'Ich habe diese Woche viel Arbeit im Büro.' },
    chunks: [{ targetText: 'I have a lot of work', baseText: { de: 'Ich habe viel Arbeit' } }, { targetText: 'at the office', baseText: { de: 'im Büro' } }, { targetText: 'this week.', baseText: { de: 'diese Woche.' } }], terms: [{ targetText: 'a lot of work', baseText: { de: 'viel Arbeit' } }, { targetText: 'at the office', baseText: { de: 'im Büro' } }, { targetText: 'this week', baseText: { de: 'diese Woche' } }, { targetText: 'little time', baseText: { de: 'wenig Zeit' } }, { targetText: 'work situation', baseText: { de: 'Arbeitssituation' } }],
    recall: { before: 'I have a lot of work at the ', answer: 'office', after: ' this week.', fallbackChoices: ['office', 'hotel', 'market', 'station'] }, speakRequired: ['work', 'office', 'week'], sceneCaption: { de: 'Dein Freund fragt: „Why are you so busy this week?“' }, trophyWord: { word: 'office', meaning: { de: 'Büro' }, example: 'I have a lot of work at the office.', whyThisWord: { de: 'office macht deinen Grund für die volle Woche konkret und alltagsnah.' } }, distractors: ['By the river,', 'after the movie.'], placeholderCaption: { de: 'Ein Schreibtisch im Büro ist diese Woche mit Arbeitsunterlagen bedeckt.' }, songMood: 'a focused week balanced by a caring friend checking in', visualNotes: 'Busy office desk with papers, a calendar, and a phone showing a friend’s message.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'its-raining-again-what-a-shame-for-our-walk', title: { de: 'Regen beim Spaziergang' }, situation: { de: 'Du und dein Freund wolltet spazieren gehen, aber es beginnt wieder zu regnen – du reagierst enttäuscht.', en: 'You and your friend planned to go for a walk, but it starts raining again — react with disappointment.' }, pedagogicalGoal: 'Auf Regen mit einer kurzen Reaktion und „What a shame“ antworten.', targetText: "It's raining again. What a shame! We can't go for our walk.", baseText: { de: 'Es regnet schon wieder. Wie schade! Wir können nicht spazieren gehen.' },
    chunks: [{ targetText: "It's raining again.", baseText: { de: 'Es regnet schon wieder.' } }, { targetText: 'What a shame!', baseText: { de: 'Wie schade!' } }, { targetText: "We can't go for our walk.", baseText: { de: 'Wir können nicht spazieren gehen.' } }], terms: [{ targetText: 'raining again', baseText: { de: 'wieder regnen' } }, { targetText: 'what a shame', baseText: { de: 'wie schade' } }, { targetText: 'our walk', baseText: { de: 'unser Spaziergang' } }, { targetText: 'rainy weather', baseText: { de: 'regnerisches Wetter' } }, { targetText: 'umbrella', baseText: { de: 'Regenschirm' } }],
    recall: { before: "It's ", answer: 'raining', after: " again. What a shame! We can't go for our walk.", fallbackChoices: ['raining', 'working', 'waiting', 'walking'] }, speakRequired: ['raining', 'shame', 'walk'], sceneCaption: { de: 'Dein Freund schaut aus dem Fenster und sagt: „It is raining again.“' }, trophyWord: { word: 'raining', meaning: { de: 'regnend' }, example: 'It is raining again this morning.', whyThisWord: { de: 'raining benennt das Wetter, auf das du im kleinen Gespräch sofort reagierst.' } }, distractors: ['At the cafe,', 'with an umbrella.'], placeholderCaption: { de: 'Regen fällt auf einen Gehweg, während zwei Freunde ihren Spaziergang verschieben.' }, songMood: 'a gentle rainy-day setback with an umbrella by the door', visualNotes: 'Rainy window, umbrella leaning nearby, and two friends changing their walking plan.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'oh-no-thats-awful-are-you-okay', title: { de: 'Schlechte Nachricht' }, situation: { de: 'Dein Freund erzählt dir von einer schlechten Nachricht – du reagierst mit Mitgefühl und fragst nach.', en: 'Your friend tells you bad news — react with sympathy and ask if they are okay.' }, pedagogicalGoal: 'Mitgefühl zeigen und mit einer kurzen Frage nach dem Befinden fragen.', targetText: "Oh no, that's awful. Are you okay?", baseText: { de: 'Oh nein, das ist furchtbar. Geht es dir gut?' },
    chunks: [{ targetText: 'Oh no,', baseText: { de: 'Oh nein,' } }, { targetText: "that's awful.", baseText: { de: 'das ist furchtbar.' } }, { targetText: 'Are you okay?', baseText: { de: 'Geht es dir gut?' } }], terms: [{ targetText: 'oh no', baseText: { de: 'oh nein' } }, { targetText: 'awful', baseText: { de: 'furchtbar' } }, { targetText: 'are you okay', baseText: { de: 'geht es dir gut' } }, { targetText: 'bad news', baseText: { de: 'schlechte Nachricht' } }, { targetText: 'show sympathy', baseText: { de: 'Mitgefühl zeigen' } }],
    recall: { before: "Oh no, that's ", answer: 'awful', after: '. Are you okay?', fallbackChoices: ['awful', 'amazing', 'quiet', 'local'] }, speakRequired: ['awful', 'are', 'okay'], sceneCaption: { de: 'Dein Freund sagt leise: „My bag is missing.“' }, trophyWord: { word: 'awful', meaning: { de: 'furchtbar' }, example: 'That is awful news.', whyThisWord: { de: 'awful zeigt sofort, dass du die schlechte Nachricht ernst nimmst.' } }, distractors: ['At the office,', 'for our dinner.'], placeholderCaption: { de: 'Ein Freund wirkt besorgt, während die andere Person aufmerksam zuhört.' }, songMood: 'a quiet caring moment between close friends', visualNotes: 'Two friends on a bench, one worried and one listening with calm concern.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'everything-is-pretty-good-thanks-for-asking', title: { de: 'Alles gut' }, situation: { de: 'Dein Freund fragt, wie es dir geht – du gibst eine entspannte, positive Antwort.', en: 'Your friend asks how you are doing — give a relaxed, positive answer.' }, pedagogicalGoal: 'Mit „pretty good“ den eigenen Zustand locker und positiv beschreiben.', targetText: 'Everything is pretty good, thanks for asking.', baseText: { de: 'Alles ist ziemlich gut, danke fürs Fragen.' },
    chunks: [{ targetText: 'Everything is', baseText: { de: 'Alles ist' } }, { targetText: 'pretty good,', baseText: { de: 'ziemlich gut,' } }, { targetText: 'thanks for asking.', baseText: { de: 'danke fürs Fragen.' } }], terms: [{ targetText: 'everything', baseText: { de: 'alles' } }, { targetText: 'pretty good', baseText: { de: 'ziemlich gut' } }, { targetText: 'thanks for asking', baseText: { de: 'danke fürs Fragen' } }, { targetText: 'how is everything', baseText: { de: 'wie läuft alles' } }, { targetText: 'positive answer', baseText: { de: 'positive Antwort' } }],
    recall: { before: 'Everything is ', answer: 'pretty', after: ' good, thanks for asking.', fallbackChoices: ['pretty', 'very', 'too', 'more'] }, speakRequired: ['everything', 'pretty', 'good'], sceneCaption: { de: 'Dein Freund fragt beim Kaffee: „How is everything going?“' }, trophyWord: { word: 'pretty', meaning: { de: 'ziemlich' }, example: 'Everything is pretty good today.', whyThisWord: { de: 'pretty macht deine positive Antwort locker und natürlich, ohne zu stark zu klingen.' } }, distractors: ['At the museum,', 'because of work.'], placeholderCaption: { de: 'Zwei Freunde trinken Kaffee und unterhalten sich entspannt.' }, songMood: 'an easy warm catch-up over coffee', visualNotes: 'Friends at a cafe table, relaxed smiles, and afternoon coffee during a simple check-in.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'thats-fantastic-im-so-excited-for-you', title: { de: 'Das ist fantastisch' }, situation: { de: 'Dein Freund hat eine besonders gute Nachricht und erzählt sie dir sofort – du reagierst voller Freude.', en: 'Your friend has especially good news and tells you right away — react with joy.' }, pedagogicalGoal: 'Eine sehr positive Reaktion mit „fantastic“ und „excited“ ausdrücken.', targetText: "That's fantastic! I'm so excited for you.", baseText: { de: 'Das ist fantastisch! Ich freue mich so für dich.' },
    chunks: [{ targetText: "That's fantastic!", baseText: { de: 'Das ist fantastisch!' } }, { targetText: "I'm so excited", baseText: { de: 'Ich freue mich so' } }, { targetText: 'for you.', baseText: { de: 'für dich.' } }], terms: [{ targetText: 'fantastic', baseText: { de: 'fantastisch' } }, { targetText: 'excited for you', baseText: { de: 'mich für dich freuen' } }, { targetText: 'good result', baseText: { de: 'gutes Ergebnis' } }, { targetText: 'friend news', baseText: { de: 'Nachricht eines Freundes' } }, { targetText: 'happy reaction', baseText: { de: 'freudige Reaktion' } }],
    recall: { before: "That's ", answer: 'fantastic', after: "! I'm so excited for you.", fallbackChoices: ['fantastic', 'awful', 'quiet', 'ready'] }, speakRequired: ['fantastic', 'excited', 'you'], sceneCaption: { de: 'Dein Freund ruft dich an und sagt: „My family is coming to visit!“' }, trophyWord: { word: 'fantastic', meaning: { de: 'fantastisch' }, example: 'That is fantastic news.', whyThisWord: { de: 'fantastic verstärkt deine Freude über eine besonders gute Nachricht.' } }, distractors: ['At the station,', 'after the rain.'], placeholderCaption: { de: 'Eine Person lächelt beim Telefonat über eine erfreuliche Nachricht.' }, songMood: 'sparkling excitement during a happy phone call', visualNotes: 'Friend smiling into a phone in a bright room after hearing joyful news.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'its-cold-this-morning-i-need-a-coffee', title: { de: 'Kalter Morgen' }, situation: { de: 'An einem kalten Morgen triffst du deinen Freund vor dem Café und sagst, was du brauchst.', en: 'On a cold morning, you meet your friend outside the cafe and say what you need.' }, pedagogicalGoal: 'Das Wetter und ein einfaches Bedürfnis in zwei kurzen Sätzen nennen.', targetText: "It's cold this morning. I need a coffee.", baseText: { de: 'Es ist heute Morgen kalt. Ich brauche einen Kaffee.' },
    chunks: [{ targetText: "It's cold this morning.", baseText: { de: 'Es ist heute Morgen kalt.' } }, { targetText: 'I need', baseText: { de: 'Ich brauche' } }, { targetText: 'a coffee.', baseText: { de: 'einen Kaffee.' } }], terms: [{ targetText: 'cold', baseText: { de: 'kalt' } }, { targetText: 'this morning', baseText: { de: 'heute Morgen' } }, { targetText: 'need a coffee', baseText: { de: 'einen Kaffee brauchen' } }, { targetText: 'cold morning', baseText: { de: 'kalter Morgen' } }, { targetText: 'cafe door', baseText: { de: 'Cafétür' } }],
    recall: { before: "It's ", answer: 'cold', after: ' this morning. I need a coffee.', fallbackChoices: ['cold', 'hot', 'busy', 'local'] }, speakRequired: ['cold', 'morning', 'coffee'], sceneCaption: { de: 'Dein Freund zieht die Jacke zu und sagt: „It is cold this morning.“' }, trophyWord: { word: 'cold', meaning: { de: 'kalt' }, example: 'It is cold this morning.', whyThisWord: { de: 'cold benennt das Wetter und macht deine Kaffeepause sofort nachvollziehbar.' } }, distractors: ['At the office,', 'for two days.'], placeholderCaption: { de: 'Zwei Freunde stehen an einem kalten Morgen vor einem Café mit warmem Licht.' }, songMood: 'a crisp cold morning softened by the promise of coffee', visualNotes: 'Cool morning street, cafe window glowing warmly, and friends heading inside for coffee.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'what-a-fun-day-at-the-park-right', title: { de: 'Ein schöner Tag im Park' }, situation: { de: 'Nach einem gemeinsamen Nachmittag im Park blickt dein Freund auf den Tag zurück – du stimmst ihm zu.', en: 'After an afternoon together in the park, your friend looks back on the day — agree with them.' }, pedagogicalGoal: 'Einen gelungenen Tag mit einer kurzen Ausruf- und Rückfrageformel abschließen.', targetText: 'What a fun day at the park, right?', baseText: { de: 'Was für ein schöner Tag im Park, oder?' },
    chunks: [{ targetText: 'What a fun day', baseText: { de: 'Was für ein schöner Tag' } }, { targetText: 'at the park,', baseText: { de: 'im Park,' } }, { targetText: 'right?', baseText: { de: 'oder?' } }], terms: [{ targetText: 'fun day', baseText: { de: 'schöner Tag' } }, { targetText: 'at the park', baseText: { de: 'im Park' } }, { targetText: 'right', baseText: { de: 'oder' } }, { targetText: 'afternoon together', baseText: { de: 'gemeinsamer Nachmittag' } }, { targetText: 'good wrap-up', baseText: { de: 'schöner Abschluss' } }],
    recall: { before: 'What a ', answer: 'fun', after: ' day at the park, right?', fallbackChoices: ['fun', 'cold', 'small', 'quiet'] }, speakRequired: ['fun', 'day', 'park'], sceneCaption: { de: 'Dein Freund packt die Decke ein und sagt: „I love days like this.“' }, trophyWord: { word: 'fun', meaning: { de: 'schön' }, example: 'We had a fun day at the park.', whyThisWord: { de: 'fun gibt eurem gemeinsamen Tag im Park einen leichten, positiven Abschluss.' } }, distractors: ['Behind the hotel,', 'because of rain.'], placeholderCaption: { de: 'Zwei Freunde packen nach einem entspannten Nachmittag im Park eine Picknickdecke ein.' }, songMood: 'a sunny gentle wrap-up after a fun day outdoors', visualNotes: 'Late-afternoon park, folded picnic blanket, and two friends smiling as they head home.',
  }),
]

export const ENGLISH_A2_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_EIGHT_METADATA, englishA2Practical8Inputs,
  { de: 'Du hast Englisch A2 Praxis 8 abgeschlossen – du kannst über Wetter und Gefühle sprechen und auf Neuigkeiten reagieren.' },
)

export const GUIDED_TODAY_PATH_ENGLISH_A2_NINE_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-9',
  title: 'English A2 Practical 9',
  shortTitle: 'A2 Practical 9',
  subtitle: { de: 'Etwas stimmt nicht: Probleme freundlich lösen' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical9Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'the-shower-doesnt-work-i-called-the-front-desk-earlier-thank-you', title: { de: 'Die Dusche funktioniert nicht' }, situation: { de: 'Die Hotelmanagerin bietet dir Hilfe an – du erklärst das Problem und sagst, dass du schon an der Rezeption angerufen hast.', en: 'The hotel manager offers to help — explain the problem and say that you already called the front desk.' }, pedagogicalGoal: 'Ein aktuelles Problem und einen früheren Anruf in einer kurzen, höflichen Antwort verbinden.', targetText: "The shower doesn't work, but I called the front desk earlier. Thank you.", baseText: { de: 'Die Dusche funktioniert nicht, aber ich habe vorher an der Rezeption angerufen. Danke.' },
    chunks: [{ targetText: "The shower doesn't work,", baseText: { de: 'Die Dusche funktioniert nicht,' } }, { targetText: 'but I called the front desk', baseText: { de: 'aber ich habe an der Rezeption angerufen' } }, { targetText: 'earlier. Thank you.', baseText: { de: 'vorher. Danke.' } }], terms: [{ targetText: 'shower', baseText: { de: 'Dusche' } }, { targetText: "doesn't work", baseText: { de: 'funktioniert nicht' } }, { targetText: 'front desk', baseText: { de: 'Rezeption' } }, { targetText: 'earlier', baseText: { de: 'vorher' } }, { targetText: 'hotel manager', baseText: { de: 'Hotelmanagerin' } }],
    recall: { before: 'The ', answer: 'shower', after: " doesn't work, but I called the front desk earlier. Thank you.", fallbackChoices: ['shower', 'elevator', 'window', 'television'] }, speakRequired: ['shower', 'called', 'front'], sceneCaption: { de: 'Die Hotelmanagerin sagt: „I can send someone now.“' }, trophyWord: { word: 'shower', meaning: { de: 'Dusche' }, example: 'The shower does not work in my room.', whyThisWord: { de: 'shower benennt das Problem im Hotelzimmer sofort und eindeutig.' } }, distractors: ['The water is cold.', 'After the movie.'], placeholderCaption: { de: 'Eine Hotelmanagerin spricht vor einer Badezimmertür mit einem Gast.' }, songMood: 'a calm hotel problem resolved with kind help', visualNotes: 'Hotel hallway outside a bathroom, with a manager offering help and a relaxed guest.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-ordered-soup-but-the-meal-hasnt-come-yet-is-it-ready', title: { de: 'Die Bestellung fehlt' }, situation: { de: 'Deine Suppe ist noch nicht gekommen – du fragst den Kellner freundlich nach dem Stand deiner Bestellung.', en: 'Your soup has not arrived yet — politely ask the server about the status of your order.' }, pedagogicalGoal: 'Eine frühere Bestellung, einen offenen Stand und eine kurze Rückfrage verbinden.', targetText: "I ordered soup, but the meal hasn't come yet. Is it ready?", baseText: { de: 'Ich habe Suppe bestellt, aber das Essen ist noch nicht gekommen. Ist es fertig?' },
    chunks: [{ targetText: 'I ordered soup,', baseText: { de: 'Ich habe Suppe bestellt,' } }, { targetText: "but the meal hasn't come yet.", baseText: { de: 'aber das Essen ist noch nicht gekommen.' } }, { targetText: 'Is it ready?', baseText: { de: 'Ist es fertig?' } }], terms: [{ targetText: 'ordered soup', baseText: { de: 'Suppe bestellt' } }, { targetText: 'meal', baseText: { de: 'Essen' } }, { targetText: "hasn't come yet", baseText: { de: 'ist noch nicht gekommen' } }, { targetText: 'ready', baseText: { de: 'fertig' } }, { targetText: 'server', baseText: { de: 'Kellner' } }],
    recall: { before: 'I ordered soup, but the ', answer: 'meal', after: " hasn't come yet. Is it ready?", fallbackChoices: ['meal', 'table', 'drink', 'receipt'] }, speakRequired: ['ordered', 'meal', 'ready'], sceneCaption: { de: 'Der Kellner fragt: „Is everything okay with your order?“' }, trophyWord: { word: 'meal', meaning: { de: 'Essen' }, example: 'Our meal is ready now.', whyThisWord: { de: 'meal hilft dir, höflich nach deiner noch fehlenden Bestellung zu fragen.' } }, distractors: ['At the counter,', 'With a sandwich.'], placeholderCaption: { de: 'Ein Kellner prüft eine Bestellung, während eine Person auf ihre Suppe wartet.' }, songMood: 'a patient restaurant moment with a helpful server', visualNotes: 'Restaurant table with a place setting and a server checking an order ticket.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'the-wi-fi-connection-in-my-room-doesnt-work-i-called-yesterday', title: { de: 'Keine Verbindung im Zimmer' }, situation: { de: 'Die Hotelmitarbeiterin kommt, um deine Verbindung zu prüfen – du erklärst, dass sie im Zimmer nicht funktioniert und dass du gestern angerufen hast.', en: 'A hotel employee comes to check your connection — explain that it does not work in your room and that you called yesterday.' }, pedagogicalGoal: 'Ein aktuelles Technikproblem mit einem Anruf von gestern verbinden.', targetText: "The Wi-Fi connection in my room doesn't work. I called yesterday.", baseText: { de: 'Die WLAN-Verbindung in meinem Zimmer funktioniert nicht. Ich habe gestern angerufen.' },
    chunks: [{ targetText: 'The Wi-Fi connection', baseText: { de: 'Die WLAN-Verbindung' } }, { targetText: "in my room doesn't work.", baseText: { de: 'in meinem Zimmer funktioniert nicht.' } }, { targetText: 'I called yesterday.', baseText: { de: 'Ich habe gestern angerufen.' } }], terms: [{ targetText: 'Wi-Fi connection', baseText: { de: 'WLAN-Verbindung' } }, { targetText: 'in my room', baseText: { de: 'in meinem Zimmer' } }, { targetText: "doesn't work", baseText: { de: 'funktioniert nicht' } }, { targetText: 'yesterday', baseText: { de: 'gestern' } }, { targetText: 'hotel employee', baseText: { de: 'Hotelmitarbeiterin' } }],
    recall: { before: 'The Wi-Fi ', answer: 'connection', after: " in my room doesn't work. I called yesterday.", fallbackChoices: ['connection', 'restaurant', 'elevator', 'receipt'] }, speakRequired: ['connection', 'room', 'called'], sceneCaption: { de: 'Die Hotelmitarbeiterin sagt: „I can look at it now.“' }, trophyWord: { word: 'connection', meaning: { de: 'Verbindung' }, example: 'The Wi-Fi connection is slow today.', whyThisWord: { de: 'connection macht dein Technikproblem im Hotelzimmer klar benennbar.' } }, distractors: ['Near the elevator,', 'After lunch.'], placeholderCaption: { de: 'Eine Hotelmitarbeiterin prüft mit einem Tablet die WLAN-Verbindung in einem Zimmer.' }, songMood: 'a practical hotel fix for a lost connection', visualNotes: 'Hotel room with a tablet showing a Wi-Fi symbol as an employee checks the connection.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-lost-my-key-but-the-door-is-open-now-thank-you', title: { de: 'Die offene Tür' }, situation: { de: 'Du hast deinen Schlüssel verloren, aber die Rezeptionistin hat dir die Tür geöffnet – du bedankst dich.', en: 'You lost your key, but the receptionist opened the door for you — thank them.' }, pedagogicalGoal: 'Ein vergangenes Missgeschick und die aktuelle Lösung höflich zusammenfassen.', targetText: 'I lost my key, but the door is open now. Thank you.', baseText: { de: 'Ich habe meinen Schlüssel verloren, aber die Tür ist jetzt offen. Danke.' },
    chunks: [{ targetText: 'I lost my key,', baseText: { de: 'Ich habe meinen Schlüssel verloren,' } }, { targetText: 'but the door', baseText: { de: 'aber die Tür' } }, { targetText: 'is open now. Thank you.', baseText: { de: 'ist jetzt offen. Danke.' } }], terms: [{ targetText: 'lost my key', baseText: { de: 'meinen Schlüssel verloren' } }, { targetText: 'door', baseText: { de: 'Tür' } }, { targetText: 'open now', baseText: { de: 'jetzt offen' } }, { targetText: 'receptionist', baseText: { de: 'Rezeptionistin' } }, { targetText: 'thank you', baseText: { de: 'danke' } }],
    recall: { before: 'I lost my key, but the ', answer: 'door', after: ' is open now. Thank you.', fallbackChoices: ['door', 'window', 'hotel', 'street'] }, speakRequired: ['lost', 'door', 'open'], sceneCaption: { de: 'Die Rezeptionistin öffnet die Tür und sagt: „Here you are.“' }, trophyWord: { word: 'door', meaning: { de: 'Tür' }, example: 'The door is open now.', whyThisWord: { de: 'door hilft dir, die einfache Lösung nach einem verlorenen Schlüssel zu benennen.' } }, distractors: ['At the window,', 'With my bag.'], placeholderCaption: { de: 'Eine Rezeptionistin öffnet einem erleichterten Hotelgast die Zimmertür.' }, songMood: 'a small hotel mishap ending in relief', visualNotes: 'Hotel room door opening as a receptionist helps a relieved guest inside.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-called-for-a-cab-but-it-isnt-here-please-call-another', title: { de: 'Das Taxi kommt nicht' }, situation: { de: 'Dein bestelltes Taxi ist noch nicht da – du bittest den Portier, ein anderes zu rufen.', en: 'The cab you called for has not arrived — ask the porter to call another one.' }, pedagogicalGoal: 'Einen früheren Anruf und ein aktuelles Verkehrsproblem mit einer höflichen Bitte verbinden.', targetText: "I called for a cab, but it isn't here. Please call another.", baseText: { de: 'Ich habe ein Taxi gerufen, aber es ist nicht hier. Bitte rufen Sie ein anderes.' },
    chunks: [{ targetText: 'I called for a cab,', baseText: { de: 'Ich habe ein Taxi gerufen,' } }, { targetText: "but it isn't here.", baseText: { de: 'aber es ist nicht hier.' } }, { targetText: 'Please call another.', baseText: { de: 'Bitte rufen Sie ein anderes.' } }], terms: [{ targetText: 'called for a cab', baseText: { de: 'ein Taxi gerufen' } }, { targetText: 'here', baseText: { de: 'hier' } }, { targetText: 'another', baseText: { de: 'ein anderes' } }, { targetText: 'porter', baseText: { de: 'Portier' } }, { targetText: 'call a cab', baseText: { de: 'ein Taxi rufen' } }],
    recall: { before: "I called for a cab, but it isn't here. Please call ", answer: 'another', after: '.', fallbackChoices: ['another', 'later', 'inside', 'downtown'] }, speakRequired: ['called', 'cab', 'another'], sceneCaption: { de: 'Der Portier fragt: „Do you want me to call another cab?“' }, trophyWord: { word: 'another', meaning: { de: 'ein anderer, eine andere, ein anderes' }, example: 'Please call another cab.', whyThisWord: { de: 'another macht deine Bitte um ein Ersatz-Taxi kurz und eindeutig.' } }, distractors: ['Before dinner,', 'At the airport.'], placeholderCaption: { de: 'Ein Portier spricht vor dem Hotel mit einem Gast, der auf ein Taxi wartet.' }, songMood: 'a brief travel delay handled with calm help', visualNotes: 'Hotel entrance with a porter checking the street while a guest waits for a cab.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-paid-but-a-dollar-is-missing-could-you-check-the-change', title: { de: 'Ein Dollar fehlt' }, situation: { de: 'Nach dem Bezahlen fehlt dir ein Dollar im Rückgeld – du sprichst die Kassiererin freundlich darauf an.', en: 'After paying, one dollar is missing from your change — politely mention it to the cashier.' }, pedagogicalGoal: 'Eine vergangene Zahlung und ein aktuelles Problem mit dem Rückgeld klar verbinden.', targetText: 'I paid, but a dollar is missing. Could you check the change?', baseText: { de: 'Ich habe bezahlt, aber ein Dollar fehlt. Könnten Sie das Rückgeld prüfen?' },
    chunks: [{ targetText: 'I paid, but', baseText: { de: 'Ich habe bezahlt, aber' } }, { targetText: 'a dollar is missing.', baseText: { de: 'ein Dollar fehlt.' } }, { targetText: 'Could you check the change?', baseText: { de: 'Könnten Sie das Rückgeld prüfen?' } }], terms: [{ targetText: 'paid', baseText: { de: 'bezahlt' } }, { targetText: 'dollar', baseText: { de: 'Dollar' } }, { targetText: 'missing', baseText: { de: 'fehlend' } }, { targetText: 'check the change', baseText: { de: 'das Rückgeld prüfen' } }, { targetText: 'cashier', baseText: { de: 'Kassiererin' } }],
    recall: { before: 'I paid, but a dollar is ', answer: 'missing', after: '. Could you check the change?', fallbackChoices: ['missing', 'ready', 'smaller', 'quiet'] }, speakRequired: ['paid', 'dollar', 'missing'], sceneCaption: { de: 'Die Kassiererin fragt: „Is there a problem with the change?“' }, trophyWord: { word: 'missing', meaning: { de: 'fehlend' }, example: 'One dollar is missing from the change.', whyThisWord: { de: 'missing hilft dir, einen kleinen Fehler beim Rückgeld freundlich anzusprechen.' } }, distractors: ['For the receipt,', 'At the market.'], placeholderCaption: { de: 'Eine Kassiererin prüft Münzen und Scheine neben einer Kasse.' }, songMood: 'a clear, polite correction at a busy counter', visualNotes: 'Cashier counting change carefully beside a receipt and a small register.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-bought-this-today-but-it-doesnt-work-could-i-get-a-refund', title: { de: 'Ein kaputter Kauf' }, situation: { de: 'Ein Gegenstand, den du heute gekauft hast, funktioniert nicht – du bittest im Laden um dein Geld zurück.', en: 'An item you bought today does not work — ask the store for a refund.' }, pedagogicalGoal: 'Einen Kauf von heute und ein aktuelles Problem mit einer höflichen Bitte verbinden.', targetText: "I bought this today, but it doesn't work. Could I get a refund?", baseText: { de: 'Ich habe das heute gekauft, aber es funktioniert nicht. Könnte ich mein Geld zurückbekommen?' },
    chunks: [{ targetText: 'I bought this today,', baseText: { de: 'Ich habe das heute gekauft,' } }, { targetText: "but it doesn't work.", baseText: { de: 'aber es funktioniert nicht.' } }, { targetText: 'Could I get a refund?', baseText: { de: 'Könnte ich mein Geld zurückbekommen?' } }], terms: [{ targetText: 'bought today', baseText: { de: 'heute gekauft' } }, { targetText: "doesn't work", baseText: { de: 'funktioniert nicht' } }, { targetText: 'refund', baseText: { de: 'Rückerstattung' } }, { targetText: 'get a refund', baseText: { de: 'sein Geld zurückbekommen' } }, { targetText: 'store clerk', baseText: { de: 'Verkäuferin' } }],
    recall: { before: "I bought this today, but it doesn't work. Could I get a ", answer: 'refund', after: '?', fallbackChoices: ['refund', 'receipt', 'repair', 'discount'] }, speakRequired: ['bought', 'work', 'refund'], sceneCaption: { de: 'Die Verkäuferin fragt: „What seems to be the problem?“' }, trophyWord: { word: 'refund', meaning: { de: 'Rückerstattung' }, example: 'Could I get a refund for this item?', whyThisWord: { de: 'refund gibt dir die klare, höfliche Bitte, wenn ein neuer Kauf nicht funktioniert.' } }, distractors: ['At the phone store,', 'Before work.'], placeholderCaption: { de: 'Eine Verkäuferin nimmt einen kleinen defekten Gegenstand an einer Ladentheke entgegen.' }, songMood: 'a straightforward store return handled politely', visualNotes: 'Store counter with a small broken item, receipt, and a clerk ready to help.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'the-soup-is-cold-i-ordered-it-hot-could-you-heat-it-up', title: { de: 'Kalte Suppe' }, situation: { de: 'Deine Suppe ist kalt, obwohl du sie heiß bestellt hast – du bittest den Kellner um Hilfe.', en: 'Your soup is cold even though you ordered it hot — ask the server for help.' }, pedagogicalGoal: 'Ein aktuelles Essensproblem und eine frühere Bestellung mit einer höflichen Bitte verbinden.', targetText: 'The soup is cold, but I ordered it hot. Could you heat it up?', baseText: { de: 'Die Suppe ist kalt, aber ich habe sie heiß bestellt. Könnten Sie sie aufwärmen?' },
    chunks: [{ targetText: 'The soup is cold,', baseText: { de: 'Die Suppe ist kalt,' } }, { targetText: 'but I ordered it hot.', baseText: { de: 'aber ich habe sie heiß bestellt.' } }, { targetText: 'Could you heat it up?', baseText: { de: 'Könnten Sie sie aufwärmen?' } }], terms: [{ targetText: 'soup', baseText: { de: 'Suppe' } }, { targetText: 'cold', baseText: { de: 'kalt' } }, { targetText: 'ordered it hot', baseText: { de: 'sie heiß bestellt' } }, { targetText: 'heat it up', baseText: { de: 'sie aufwärmen' } }, { targetText: 'server', baseText: { de: 'Kellner' } }],
    recall: { before: 'The soup is cold, but I ordered it hot. Could you ', answer: 'heat', after: ' it up?', fallbackChoices: ['heat', 'bring', 'make', 'serve'] }, speakRequired: ['soup', 'ordered', 'heat'], sceneCaption: { de: 'Der Kellner fragt: „Is the soup okay?“' }, trophyWord: { word: 'heat', meaning: { de: 'erwärmen' }, example: 'Could you heat the soup up?', whyThisWord: { de: 'heat gibt dir eine kurze, praktische Bitte, wenn dein Essen kalt ist.' } }, distractors: ['With some bread,', 'At the table.'], placeholderCaption: { de: 'Eine Person spricht mit einem Kellner über eine dampflose Schüssel Suppe.' }, songMood: 'a small restaurant fix with a warm outcome', visualNotes: 'Restaurant table with a bowl of soup as a server listens and offers to help.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-slept-badly-because-the-room-is-too-loud-could-you-change-it', title: { de: 'Zu lautes Zimmer' }, situation: { de: 'Du hast wegen des Lärms schlecht geschlafen – du bittest an der Rezeption um ein anderes Zimmer.', en: 'You slept badly because of the noise — ask the front desk for a different room.' }, pedagogicalGoal: 'Eine schlechte Nacht und ein aktuelles Zimmerproblem mit einer höflichen Bitte verbinden.', targetText: 'I slept badly because the room is too loud. Could you change it?', baseText: { de: 'Ich habe schlecht geschlafen, weil das Zimmer zu laut ist. Könnten Sie es wechseln?' },
    chunks: [{ targetText: 'I slept badly because', baseText: { de: 'Ich habe schlecht geschlafen, weil' } }, { targetText: 'the room is too loud.', baseText: { de: 'das Zimmer zu laut ist.' } }, { targetText: 'Could you change it?', baseText: { de: 'Könnten Sie es wechseln?' } }], terms: [{ targetText: 'slept badly', baseText: { de: 'schlecht geschlafen' } }, { targetText: 'too loud', baseText: { de: 'zu laut' } }, { targetText: 'change it', baseText: { de: 'es wechseln' } }, { targetText: 'front desk', baseText: { de: 'Rezeption' } }, { targetText: 'room problem', baseText: { de: 'Zimmerproblem' } }],
    recall: { before: 'I slept badly because the room is too ', answer: 'loud', after: '. Could you change it?', fallbackChoices: ['loud', 'small', 'cold', 'clean'] }, speakRequired: ['slept', 'room', 'loud'], sceneCaption: { de: 'Die Rezeptionistin fragt: „Did you sleep well last night?“' }, trophyWord: { word: 'loud', meaning: { de: 'laut' }, example: 'The room is too loud at night.', whyThisWord: { de: 'loud hilft dir, den Grund für deine schlechte Nacht kurz und klar zu erklären.' } }, distractors: ['After the movie,', 'Near the river.'], placeholderCaption: { de: 'Eine müde Person spricht morgens an der Hotelrezeption über ein zu lautes Zimmer.' }, songMood: 'a quiet request after a noisy night', visualNotes: 'Tired hotel guest speaking to a receptionist in a calm morning lobby.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'everything-works-now-i-called-yesterday-thank-you-for-the-service', title: { de: 'Jetzt funktioniert alles' }, situation: { de: 'Nach einer Reparatur prüfst du alles noch einmal – es funktioniert wieder, und du bedankst dich beim Mitarbeiter.', en: 'After a repair, you check everything once more — it works again, and you thank the employee.' }, pedagogicalGoal: 'Eine frühere Kontaktaufnahme und eine aktuelle Lösung freundlich abschließen.', targetText: 'Everything works now because I called yesterday. Thank you for the service.', baseText: { de: 'Jetzt funktioniert alles, weil ich gestern angerufen habe. Danke für den Service.' },
    chunks: [{ targetText: 'Everything works now', baseText: { de: 'Jetzt funktioniert alles' } }, { targetText: 'because I called yesterday.', baseText: { de: 'weil ich gestern angerufen habe.' } }, { targetText: 'Thank you for the service.', baseText: { de: 'Danke für den Service.' } }], terms: [{ targetText: 'everything works', baseText: { de: 'alles funktioniert' } }, { targetText: 'called yesterday', baseText: { de: 'gestern angerufen' } }, { targetText: 'service', baseText: { de: 'Service' } }, { targetText: 'thank you', baseText: { de: 'danke' } }, { targetText: 'repair result', baseText: { de: 'Reparaturergebnis' } }],
    recall: { before: 'Everything works now because I called yesterday. Thank you for the ', answer: 'service', after: '.', fallbackChoices: ['service', 'ticket', 'weather', 'market'] }, speakRequired: ['everything', 'called', 'service'], sceneCaption: { de: 'Der Mitarbeiter fragt: „Does everything work now?“' }, trophyWord: { word: 'service', meaning: { de: 'Service' }, example: 'Thank you for the service today.', whyThisWord: { de: 'service gibt deinem Dank nach einer gelungenen Reparatur einen freundlichen Abschluss.' } }, distractors: ['At the pharmacy,', 'Before noon.'], placeholderCaption: { de: 'Ein Hotelmitarbeiter und ein Gast prüfen nach einer Reparatur gemeinsam ein Gerät.' }, songMood: 'a grateful final note after a practical repair', visualNotes: 'Helpful hotel employee and guest smiling beside a repaired appliance in a bright room.',
  }),
]

export const ENGLISH_A2_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_NINE_METADATA, englishA2Practical9Inputs,
  { de: 'Du hast Englisch A2 Praxis 9 abgeschlossen – du kannst Probleme schildern, freundlich um Hilfe bitten und Lösungen bestätigen.' },
)

export const GUIDED_TODAY_PATH_ENGLISH_A2_TEN_METADATA: GuidedPathMetadata = {
  id: 'english-a2-practical-10',
  title: 'English A2 Practical 10',
  shortTitle: 'A2 Practical 10',
  subtitle: { de: 'Deine Geschichte: vom Ankommen bis zum Wiedersehen' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'English', estimatedMinutes: 5,
}

const englishA2Practical10Inputs: EnglishA2LessonInput[] = [
  makeEnglishA2CompactLesson({
    slug: 'im-from-germany-and-i-live-here-in-the-city-now', title: { de: 'Woher ich komme' }, situation: { de: 'Dein Freund fragt, woher du kommst und ob du jetzt hier wohnst – du antwortest mit deiner kurzen Geschichte.', en: 'Your friend asks where you are from and whether you live here now — answer with your short story.' }, pedagogicalGoal: 'Herkunft und den aktuellen Wohnort in zwei einfachen Aussagen verbinden.', targetText: "I'm from Germany, and I live here in the city now.", baseText: { de: 'Ich komme aus Deutschland, und ich wohne jetzt hier in der Stadt.' },
    chunks: [{ targetText: "I'm from Germany,", baseText: { de: 'Ich komme aus Deutschland,' } }, { targetText: 'and I live here', baseText: { de: 'und ich wohne hier' } }, { targetText: 'in the city now.', baseText: { de: 'jetzt in der Stadt.' } }], terms: [{ targetText: 'from Germany', baseText: { de: 'aus Deutschland' } }, { targetText: 'live here', baseText: { de: 'hier wohnen' } }, { targetText: 'city', baseText: { de: 'Stadt' } }, { targetText: 'now', baseText: { de: 'jetzt' } }, { targetText: 'short story', baseText: { de: 'kurze Geschichte' } }],
    recall: { before: "I'm from Germany, and I live here in the ", answer: 'city', after: ' now.', fallbackChoices: ['city', 'hotel', 'country', 'office'] }, speakRequired: ['germany', 'live', 'city'], sceneCaption: { de: 'Dein Freund fragt: „Where are you from? Do you live here now?“' }, trophyWord: { word: 'city', meaning: { de: 'Stadt' }, example: 'I live in this city now.', whyThisWord: { de: 'city hilft dir, deinen neuen Wohnort in deiner persönlichen Geschichte zu nennen.' } }, distractors: ['At the station,', 'With my family.'], placeholderCaption: { de: 'Zwei Freunde unterhalten sich auf einer Stadtstraße über Herkunft und neues Zuhause.' }, songMood: 'a warm personal introduction in a familiar city', visualNotes: 'Two friends talking on a neighborhood street with the city stretching behind them.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-work-downtown-in-a-small-office-every-day', title: { de: 'Mein Arbeitsplatz' }, situation: { de: 'Dein Freund fragt, wo du arbeitest – du beschreibst deinen Alltag im Büro in der Innenstadt.', en: 'Your friend asks where you work — describe your daily routine at a downtown office.' }, pedagogicalGoal: 'Den eigenen Arbeitsplatz und einen regelmäßigen Alltagssatz beschreiben.', targetText: 'I work downtown in a small office every day.', baseText: { de: 'Ich arbeite jeden Tag in einem kleinen Büro in der Innenstadt.' },
    chunks: [{ targetText: 'I work downtown', baseText: { de: 'Ich arbeite in der Innenstadt' } }, { targetText: 'in a small office', baseText: { de: 'in einem kleinen Büro' } }, { targetText: 'every day.', baseText: { de: 'jeden Tag.' } }], terms: [{ targetText: 'work downtown', baseText: { de: 'in der Innenstadt arbeiten' } }, { targetText: 'small office', baseText: { de: 'kleines Büro' } }, { targetText: 'every day', baseText: { de: 'jeden Tag' } }, { targetText: 'workplace', baseText: { de: 'Arbeitsplatz' } }, { targetText: 'daily routine', baseText: { de: 'Tagesablauf' } }],
    recall: { before: 'I work downtown in a small office ', answer: 'every', after: ' day.', fallbackChoices: ['every', 'other', 'quiet', 'next'] }, speakRequired: ['work', 'office', 'every'], sceneCaption: { de: 'Dein Freund fragt beim Spaziergang: „Where do you work?“' }, trophyWord: { word: 'every', meaning: { de: 'jeder, jede, jedes' }, example: 'I work every day this week.', whyThisWord: { de: 'every macht aus deinem Arbeitsplatz einen klaren Satz über deinen regelmäßigen Alltag.' } }, distractors: ['Near the river,', 'After dinner.'], placeholderCaption: { de: 'Ein kleines Bürogebäude steht zwischen hohen Häusern in der Innenstadt.' }, songMood: 'a steady weekday rhythm in the middle of town', visualNotes: 'Compact downtown office building with commuters beginning an ordinary workday.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-study-english-because-i-want-to-talk-to-people-here', title: { de: 'Warum ich Englisch lerne' }, situation: { de: 'Dein Freund fragt, warum du Englisch lernst – du nennst einen einfachen persönlichen Grund.', en: 'Your friend asks why you study English — give a simple personal reason.' }, pedagogicalGoal: 'Mit „because“ einen einfachen Grund für das Englischlernen nennen.', targetText: 'I study English because I want to talk to people here.', baseText: { de: 'Ich lerne Englisch, weil ich hier mit Leuten sprechen möchte.' },
    chunks: [{ targetText: 'I study English', baseText: { de: 'Ich lerne Englisch' } }, { targetText: 'because I want to', baseText: { de: 'weil ich … möchte' } }, { targetText: 'talk to people here.', baseText: { de: 'hier mit Leuten sprechen.' } }], terms: [{ targetText: 'study English', baseText: { de: 'Englisch lernen' } }, { targetText: 'because', baseText: { de: 'weil' } }, { targetText: 'talk to people', baseText: { de: 'mit Leuten sprechen' } }, { targetText: 'personal reason', baseText: { de: 'persönlicher Grund' } }, { targetText: 'friend question', baseText: { de: 'Frage eines Freundes' } }],
    recall: { before: 'I study English because I want to talk to ', answer: 'people', after: ' here.', fallbackChoices: ['people', 'movies', 'trains', 'prices'] }, speakRequired: ['study', 'talk', 'people'], sceneCaption: { de: 'Dein Freund fragt dich: „Why do you study English?“' }, trophyWord: { word: 'people', meaning: { de: 'Leute' }, example: 'I like talking to people here.', whyThisWord: { de: 'people macht deinen persönlichen Grund fürs Englischlernen direkt und menschlich.' } }, distractors: ['At the museum,', 'Before lunch.'], placeholderCaption: { de: 'Zwei Freunde sprechen draußen über das Lernen einer neuen Sprache.' }, songMood: 'an open, hopeful reason for learning a new language', visualNotes: 'Two friends talking on a bench, with a small English notebook open between them.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'its-my-second-week-here-and-i-know-the-area-well', title: { de: 'Meine zweite Woche' }, situation: { de: 'Dein Freund fragt, ob dies deine zweite Woche in der Stadt ist – du sagst, dass du die Gegend schon gut kennst.', en: 'Your friend asks whether this is your second week in the city — say that it is your second week and that you know the area well.' }, pedagogicalGoal: 'Die zweite Woche vor Ort und eine wachsende Vertrautheit im Präsens ausdrücken.', targetText: "It's my second week here, and I know the area well.", baseText: { de: 'Es ist meine zweite Woche hier, und ich kenne die Gegend schon gut.' },
    chunks: [{ targetText: "It's my second week here,", baseText: { de: 'Es ist meine zweite Woche hier,' } }, { targetText: 'and I know', baseText: { de: 'und ich kenne' } }, { targetText: 'the area well.', baseText: { de: 'die Gegend schon gut.' } }], terms: [{ targetText: 'second week', baseText: { de: 'zweite Woche' } }, { targetText: 'here', baseText: { de: 'hier' } }, { targetText: 'know the area', baseText: { de: 'die Gegend kennen' } }, { targetText: 'well', baseText: { de: 'gut' } }, { targetText: 'city life', baseText: { de: 'Stadtleben' } }],
    recall: { before: "It's my ", answer: 'second', after: ' week here, and I know the area well.', fallbackChoices: ['second', 'first', 'short', 'busy'] }, speakRequired: ['second', 'week', 'area'], sceneCaption: { de: 'Dein Freund fragt: „Is this your first week in the city?“' }, trophyWord: { word: 'second', meaning: { de: 'zweite, zweiter, zweites' }, example: 'It is my second week here.', whyThisWord: { de: 'second gibt deiner kleinen Geschichte einen klaren Zeitpunkt in deinem neuen Alltag.' } }, distractors: ['At the hotel,', 'With my coffee.'], placeholderCaption: { de: 'Eine Person schaut mit einem Freund auf einen Stadtplan und kennt schon viele Wege.' }, songMood: 'growing confidence during a second week in town', visualNotes: 'Friends looking at a city map with familiar streets marked during a relaxed afternoon.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'my-family-lives-back-home-and-i-call-them-every-week', title: { de: 'Meine Familie' }, situation: { de: 'Dein Freund fragt nach deiner Familie zu Hause – du erzählst, dass ihr regelmäßig telefoniert.', en: 'Your friend asks about your family back home — say that you call each other regularly.' }, pedagogicalGoal: 'Über die Familie zu Hause und einen regelmäßigen Kontakt sprechen.', targetText: 'My family lives back home, and I call them every week.', baseText: { de: 'Meine Familie lebt zu Hause, und ich rufe sie jede Woche an.' },
    chunks: [{ targetText: 'My family lives back home,', baseText: { de: 'Meine Familie lebt zu Hause,' } }, { targetText: 'and I call them', baseText: { de: 'und ich rufe sie an' } }, { targetText: 'every week.', baseText: { de: 'jede Woche.' } }], terms: [{ targetText: 'family', baseText: { de: 'Familie' } }, { targetText: 'back home', baseText: { de: 'zu Hause' } }, { targetText: 'call them', baseText: { de: 'sie anrufen' } }, { targetText: 'every week', baseText: { de: 'jede Woche' } }, { targetText: 'regular contact', baseText: { de: 'regelmäßiger Kontakt' } }],
    recall: { before: 'My ', answer: 'family', after: ' lives back home, and I call them every week.', fallbackChoices: ['family', 'office', 'friend', 'hotel'] }, speakRequired: ['family', 'lives', 'week'], sceneCaption: { de: 'Dein Freund fragt: „Do you talk to your family often?“' }, trophyWord: { word: 'family', meaning: { de: 'Familie' }, example: 'My family lives back home.', whyThisWord: { de: 'family hilft dir, bei einem persönlichen Gespräch einfach von den Menschen zu Hause zu erzählen.' } }, distractors: ['Near the station,', 'After work.'], placeholderCaption: { de: 'Eine Person telefoniert lächelnd mit ihrer Familie, während ein Freund daneben zuhört.' }, songMood: 'a gentle call home during a new life in town', visualNotes: 'Person smiling at a phone on a quiet street while staying connected with family.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-like-cooking-and-walking-around-the-neighborhood', title: { de: 'Was ich gern mache' }, situation: { de: 'Dein Freund fragt nach deinen Hobbys – du erzählst von zwei einfachen Dingen, die du gern machst.', en: 'Your friend asks about your hobbies — talk about two simple things you like doing.' }, pedagogicalGoal: 'Zwei einfache Freizeitaktivitäten in einer natürlichen Antwort verbinden.', targetText: 'I like cooking and walking around the neighborhood.', baseText: { de: 'Ich koche gern und gehe gern durch das Viertel spazieren.' },
    chunks: [{ targetText: 'I like cooking', baseText: { de: 'Ich koche gern' } }, { targetText: 'and walking around', baseText: { de: 'und gehe gern durch' } }, { targetText: 'the neighborhood.', baseText: { de: 'das Viertel spazieren.' } }], terms: [{ targetText: 'cooking', baseText: { de: 'kochen' } }, { targetText: 'walking around', baseText: { de: 'spazieren gehen' } }, { targetText: 'neighborhood', baseText: { de: 'Viertel' } }, { targetText: 'hobby', baseText: { de: 'Hobby' } }, { targetText: 'free time', baseText: { de: 'Freizeit' } }],
    recall: { before: 'I like ', answer: 'cooking', after: ' and walking around the neighborhood.', fallbackChoices: ['cooking', 'working', 'waiting', 'traveling'] }, speakRequired: ['cooking', 'walking', 'neighborhood'], sceneCaption: { de: 'Dein Freund fragt beim Spaziergang: „What do you like doing in your free time?“' }, trophyWord: { word: 'cooking', meaning: { de: 'Kochen' }, example: 'Cooking is one of my hobbies.', whyThisWord: { de: 'cooking gibt deiner Antwort auf die Hobbyfrage eine persönliche, alltagsnahe Seite.' } }, distractors: ['At the office,', 'Before dinner.'], placeholderCaption: { de: 'Zwei Freunde gehen durch ihr Viertel, während sie über Hobbys sprechen.' }, songMood: 'an easy walk through a familiar neighborhood', visualNotes: 'Two friends strolling past neighborhood shops while sharing simple weekend hobbies.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-work-in-the-morning-and-study-english-in-the-evening', title: { de: 'Mein Tagesablauf' }, situation: { de: 'Dein Freund fragt nach deinem typischen Tag – du beschreibst Arbeit am Morgen und Englisch am Abend.', en: 'Your friend asks about your typical day — describe work in the morning and English in the evening.' }, pedagogicalGoal: 'Einen einfachen Tagesablauf mit zwei regelmäßigen Teilen beschreiben.', targetText: 'I work in the morning and study English in the evening.', baseText: { de: 'Ich arbeite am Morgen und lerne am Abend Englisch.' },
    chunks: [{ targetText: 'I work in the morning', baseText: { de: 'Ich arbeite am Morgen' } }, { targetText: 'and study English', baseText: { de: 'und lerne Englisch' } }, { targetText: 'in the evening.', baseText: { de: 'am Abend.' } }], terms: [{ targetText: 'in the morning', baseText: { de: 'am Morgen' } }, { targetText: 'study English', baseText: { de: 'Englisch lernen' } }, { targetText: 'in the evening', baseText: { de: 'am Abend' } }, { targetText: 'daily routine', baseText: { de: 'Tagesablauf' } }, { targetText: 'work and study', baseText: { de: 'arbeiten und lernen' } }],
    recall: { before: 'I work in the morning and ', answer: 'study', after: ' English in the evening.', fallbackChoices: ['study', 'travel', 'wait', 'cook'] }, speakRequired: ['work', 'study', 'evening'], sceneCaption: { de: 'Dein Freund fragt: „What do you usually do during the day?“' }, trophyWord: { word: 'study', meaning: { de: 'lernen' }, example: 'I study English in the evening.', whyThisWord: { de: 'study macht deinen regelmäßigen Englischteil im Tagesablauf klar.' } }, distractors: ['At the market,', 'After the movie.'], placeholderCaption: { de: 'Ein Schreibtisch mit einem englischen Heft steht am Abend neben einer Arbeitsmappe.' }, songMood: 'a balanced day of work and language learning', visualNotes: 'Morning work bag beside an evening desk with an English notebook and warm lamp.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-understand-much-more-now-but-i-speak-slowly', title: { de: 'Mein Fortschritt' }, situation: { de: 'Dein Freund fragt, ob Englisch jetzt leichter für dich ist – du beschreibst deinen Fortschritt ehrlich.', en: 'Your friend asks whether English is easier for you now — describe your progress honestly.' }, pedagogicalGoal: 'Fortschritt im Verstehen und ein noch langsames Sprechen zusammen ausdrücken.', targetText: 'I understand much more now, but I speak slowly.', baseText: { de: 'Ich verstehe jetzt viel mehr, aber ich spreche langsam.' },
    chunks: [{ targetText: 'I understand much more', baseText: { de: 'Ich verstehe viel mehr' } }, { targetText: 'now, but I speak', baseText: { de: 'jetzt, aber ich spreche' } }, { targetText: 'slowly.', baseText: { de: 'langsam.' } }], terms: [{ targetText: 'understand', baseText: { de: 'verstehen' } }, { targetText: 'much more', baseText: { de: 'viel mehr' } }, { targetText: 'speak slowly', baseText: { de: 'langsam sprechen' } }, { targetText: 'progress', baseText: { de: 'Fortschritt' } }, { targetText: 'honest answer', baseText: { de: 'ehrliche Antwort' } }],
    recall: { before: 'I ', answer: 'understand', after: ' much more now, but I speak slowly.', fallbackChoices: ['understand', 'remember', 'travel', 'finish'] }, speakRequired: ['understand', 'speak', 'slowly'], sceneCaption: { de: 'Dein Freund fragt lächelnd: „Do you understand more English now?“' }, trophyWord: { word: 'understand', meaning: { de: 'verstehen' }, example: 'I understand much more now.', whyThisWord: { de: 'understand lässt dich deinen echten Fortschritt beim Englischlernen selbstbewusst benennen.' } }, distractors: ['At the library,', 'With a ticket.'], placeholderCaption: { de: 'Zwei Freunde üben Englisch an einem kleinen Tisch und lächeln über den Fortschritt.' }, songMood: 'quiet confidence as new language skills grow', visualNotes: 'Friends practicing English together at a small table, with notes and encouraging smiles.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'im-going-to-come-back-next-year', title: { de: 'Nächstes Jahr wiederkommen' }, situation: { de: 'Dein Freund fragt, ob du nächstes Jahr wiederkommen möchtest – du erzählst von deinem klaren Plan.', en: 'Your friend asks whether you want to come back next year — share your clear plan.' }, pedagogicalGoal: 'Einen einfachen Zukunftsplan mit „going to“ ausdrücken.', targetText: "I'm going to come back next year.", baseText: { de: 'Ich werde nächstes Jahr wiederkommen.' },
    chunks: [{ targetText: "I'm going to", baseText: { de: 'Ich werde' } }, { targetText: 'come back', baseText: { de: 'wiederkommen' } }, { targetText: 'next year.', baseText: { de: 'nächstes Jahr.' } }], terms: [{ targetText: 'going to', baseText: { de: 'werden' } }, { targetText: 'come back', baseText: { de: 'wiederkommen' } }, { targetText: 'next year', baseText: { de: 'nächstes Jahr' } }, { targetText: 'future plan', baseText: { de: 'Zukunftsplan' } }, { targetText: 'friend question', baseText: { de: 'Frage eines Freundes' } }],
    recall: { before: "I'm going to come back next ", answer: 'year', after: '.', fallbackChoices: ['year', 'week', 'morning', 'time'] }, speakRequired: ['going', 'come', 'year'], sceneCaption: { de: 'Dein Freund fragt: „Are you going to come back next year?“' }, trophyWord: { word: 'year', meaning: { de: 'Jahr' }, example: 'I am going to come back next year.', whyThisWord: { de: 'year gibt deinem Zukunftsplan einen klaren, persönlichen Zeitpunkt.' } }, distractors: ['After work,', 'At the station.'], placeholderCaption: { de: 'Zwei Freunde schauen auf einen Kalender mit dem nächsten Jahr und lächeln sich an.' }, songMood: 'a hopeful promise to return next year', visualNotes: 'Friends beside a calendar, pointing to next year with a hopeful smile.',
  }),
  makeEnglishA2CompactLesson({
    slug: 'i-arrived-two-weeks-ago-and-i-want-to-return-thank-you', title: { de: 'Auf Wiedersehen, bis bald' }, situation: { de: 'Dein Freund verabschiedet sich warm von dir – du blickst kurz auf deine Ankunft zurück und sagst, dass du wiederkommen möchtest.', en: 'Your friend says a warm goodbye — briefly look back on your arrival and say that you want to return.' }, pedagogicalGoal: 'Eine vergangene Ankunft, einen aktuellen Wunsch und einen warmen Abschied verbinden.', targetText: 'I arrived two weeks ago, and I want to return. Thank you!', baseText: { de: 'Ich bin vor zwei Wochen angekommen und möchte wiederkommen. Danke!' },
    chunks: [{ targetText: 'I arrived two weeks ago,', baseText: { de: 'Ich bin vor zwei Wochen angekommen,' } }, { targetText: 'and I want to return.', baseText: { de: 'und ich möchte wiederkommen.' } }, { targetText: 'Thank you!', baseText: { de: 'Danke!' } }], terms: [{ targetText: 'arrived', baseText: { de: 'angekommen' } }, { targetText: 'two weeks ago', baseText: { de: 'vor zwei Wochen' } }, { targetText: 'want to return', baseText: { de: 'wiederkommen möchten' } }, { targetText: 'thank you', baseText: { de: 'danke' } }, { targetText: 'warm goodbye', baseText: { de: 'warmer Abschied' } }],
    recall: { before: 'I arrived two weeks ago, and I want to ', answer: 'return', after: '. Thank you!', fallbackChoices: ['return', 'travel', 'leave', 'wait'] }, speakRequired: ['arrived', 'return', 'thank'], sceneCaption: { de: 'Dein Freund sagt beim Abschied: „I hope you come back next year.“' }, trophyWord: { word: 'return', meaning: { de: 'zurückkehren' }, example: 'I want to return next year.', whyThisWord: { de: 'return macht deinen Abschied warm und zeigt, dass du wiederkommen möchtest.' } }, distractors: ['At the airport,', 'Before dinner.'], placeholderCaption: { de: 'Zwei Freunde verabschieden sich warm auf einer Stadtstraße und schauen einander lächelnd an.' }, songMood: 'a warm farewell with a promise to return', visualNotes: 'Two close friends saying goodbye on a familiar city street, hopeful and smiling.',
  }),
]

export const ENGLISH_A2_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makeEnglishA2PracticalLessons(
  GUIDED_TODAY_PATH_ENGLISH_A2_TEN_METADATA, englishA2Practical10Inputs,
  { de: 'Du hast den englischen A2-Kurs abgeschlossen – der Regular verabschiedet sich mit einer eigenen Geschichte und einem Plan zum Wiederkommen.' },
)
