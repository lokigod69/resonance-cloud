/**
 * Spanish A2 Practical 1 — "Back again" (two-turn exchanges).
 *
 * A2 pilot module per docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md (§4 integration
 * plan, §5 authoring contract). The learner is the Regular: the scene carries the
 * interlocutor's line (quoted Spanish inside the base-locale captions), the learner
 * builds/types/speaks the response.
 *
 * Authoring contract highlights enforced here:
 * - Tense contract: present tense only in this path (the A2 jump in P1 is
 *   interactional, not grammatical). Object pronouns (lo/la/me/le) appear ONLY as
 *   fixed chunks, never as a paradigm.
 * - Register: usted throughout, matching Spanish A1 (documented per §5.4).
 * - Locale hygiene: every .de field is German (real umlauts), every .en field is
 *   English; quoted interlocutor lines stay in Spanish by design (two-turn scene).
 * - Trophy words checked against all 100 Spanish A1 trophies for uniqueness.
 * - Vocabulary anchored to PCIC A1–A2 nociones específicas categories (§5.8).
 *
 * TTS FROZEN 2026-07-12: the bright batch ran for this path (voice profile
 * spanish_a2_bright_p1_multiv2_v1, 55 clips). Path id, lesson ids, and chunk ids
 * are audio cache keys now — renaming one silently downgrades it to browser
 * speech. Text changes require a rerun of the batch for the affected scope.
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

const SPANISH_A2_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

export const GUIDED_TODAY_PATH_SPANISH_A2_ONE_METADATA: GuidedPathMetadata = {
  id: 'spanish-a2-practical-1',
  title: 'Spanish A2 Practical 1',
  shortTitle: 'A2 Practical 1',
  subtitle: { de: 'Zwei Gesprächszüge: antworten und zurückfragen', en: 'Two-turn exchanges: answering and asking back' },
  level: 'A2',
  baseLanguage: 'German',
  targetLanguage: 'Spanish',
  estimatedMinutes: 5,
}

type SpanishA2VariantInput = {
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

type SpanishA2LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightSpanishA2Variant(input: SpanishA2VariantInput): GuidedLessonVibeVariant {
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
      language: 'es-ES',
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
      genre: 'sunny acoustic flamenco-light',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

function makeSpanishA2PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: SpanishA2LessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('spanish-a2-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `spanish-a2-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
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
      steps: SPANISH_A2_GUIDED_TODAY_STEPS,
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

const spanishA2Practical1Inputs: SpanishA2LessonInput[] = [
  {
    slug: 'lo-de-siempre',
    title: { de: 'Das Übliche', en: 'The usual' },
    situation: {
      en: 'Back at your regular cafe, the barista recognizes you and asks if you want your usual order — confirm it.',
      de: 'Zurück in deinem Stammcafé: Die Barista erkennt dich und fragt, ob es das Übliche sein soll — du bestätigst.',
    },
    pedagogicalGoal: 'Auf die Rückfrage „¿Lo de siempre?“ natürlich antworten und die eigene Standardbestellung mit lo de siempre bestätigen.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'Sí, lo de siempre: un café con leche, por favor.',
        baseText: { de: 'Ja, das Übliche: einen Milchkaffee, bitte.', en: 'Yes, the usual: a coffee with milk, please.' },
      },
      meaning: { de: 'Die Antwort des Stammgasts: bestätigen, was die andere Person schon vermutet.', en: 'The regular’s reply: confirming what the other person already guesses.' },
      chunks: [
        { id: 'siempre-si', targetText: 'Sí,', baseText: { de: 'Ja,', en: 'Yes,' } },
        { id: 'siempre-lo-de-siempre', targetText: 'lo de siempre:', baseText: { de: 'das Übliche:', en: 'the usual:' } },
        { id: 'siempre-cafe-con-leche', targetText: 'un café con leche,', baseText: { de: 'einen Milchkaffee,', en: 'a coffee with milk,' } },
        { id: 'siempre-por-favor', targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'siempre-item-lo-de-siempre', targetText: 'lo de siempre', baseText: { de: 'das Übliche', en: 'the usual' }, acceptedAnswers: ['lo de siempre', 'Lo de siempre'] },
        { id: 'siempre-item-siempre', targetText: 'siempre', baseText: { de: 'immer', en: 'always' }, acceptedAnswers: ['siempre', 'Siempre'] },
        { id: 'siempre-item-cafe', targetText: 'café', baseText: { de: 'Kaffee', en: 'coffee' }, acceptedAnswers: ['café', 'cafe', 'Café', 'Cafe'] },
        { id: 'siempre-item-leche', targetText: 'leche', baseText: { de: 'Milch', en: 'milk' }, acceptedAnswers: ['leche', 'Leche'] },
        { id: 'siempre-item-con-leche', targetText: 'con leche', baseText: { de: 'mit Milch', en: 'with milk' }, acceptedAnswers: ['con leche', 'Con leche'] },
      ],
      buildChips: ['Sí,', 'lo de siempre:', 'un café con leche,', 'por favor.', 'para llevar,', 'un té con limón.'],
      typeRecall: {
        before: 'Sí, lo de ',
        answer: 'siempre',
        after: ': un café con leche, por favor.',
        acceptedAnswers: ['siempre', 'Siempre'],
        fallbackChoices: ['siempre', 'ahora', 'luego', 'todo'],
      },
      speakTarget: {
        baseCue: { de: 'Ja, das Übliche: einen Milchkaffee, bitte.', en: 'Yes, the usual: a coffee with milk, please.' },
        targetPhrase: 'Sí, lo de siempre: un café con leche, por favor.',
        requiredTokens: ['siempre', 'café', 'leche'],
        optionalTokens: ['sí', 'lo', 'de', 'por', 'favor', 'un', 'con'],
      },
      sceneCaption: { de: 'Die Barista erkennt dich und fragt: „¿Lo de siempre?“ — du bist hier kein Fremder mehr.', en: 'The barista recognizes you and asks: “¿Lo de siempre?” — you are no longer a stranger here.' },
      trophyWord: {
        word: 'siempre',
        meaning: { de: 'immer', en: 'always' },
        example: 'Siempre tomo café por la mañana.',
        whyThisWord: { de: 'Mit siempre sagst du, was du immer tust — und lo de siempre macht daraus die Bestellung des Stammgasts.', en: 'siempre says what you always do — and lo de siempre turns it into the regular’s order.' },
      },
      placeholderCaption: { de: 'Vertrautes Café am Morgen, ein Nicken zwischen Stammgast und Barista.', en: 'A familiar cafe in the morning and a nod between regular and barista.' },
      songMood: 'familiar morning regular',
      visualNotes: 'Same cafe as week one, warmer familiarity, small knowing smile across the counter.',
    }),
  },
  {
    slug: 'para-llevar',
    title: { de: 'Hier oder zum Mitnehmen?', en: 'Here or to go?' },
    situation: {
      en: 'The cashier asks whether your order is for here or to go — pick to-go and ask what it all costs.',
      de: 'Die Person an der Kasse fragt, ob du hier trinkst oder alles mitnimmst — du wählst zum Mitnehmen und fragst nach dem Gesamtpreis.',
    },
    pedagogicalGoal: 'Aus der Alternativfrage „¿Para tomar aquí o para llevar?“ eine Option wählen und direkt eine eigene Frage anschließen.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'Para llevar, por favor. ¿Cuánto es todo?',
        baseText: { de: 'Zum Mitnehmen, bitte. Wie viel macht alles?', en: 'To go, please. How much is everything?' },
      },
      meaning: { de: 'Erst entscheiden, dann selbst weiterfragen — der zweite Gesprächszug gehört dir.', en: 'Decide first, then keep the exchange going with your own question.' },
      chunks: [
        { id: 'llevar-para-llevar', targetText: 'Para llevar,', baseText: { de: 'Zum Mitnehmen,', en: 'To go,' } },
        { id: 'llevar-por-favor', targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } },
        { id: 'llevar-cuanto-es', targetText: '¿Cuánto es', baseText: { de: 'Wie viel macht', en: 'How much is' } },
        { id: 'llevar-todo', targetText: 'todo?', baseText: { de: 'alles?', en: 'everything?' } },
      ],
      lessonItems: [
        { id: 'llevar-item-para-llevar', targetText: 'para llevar', baseText: { de: 'zum Mitnehmen', en: 'to go' }, acceptedAnswers: ['para llevar', 'Para llevar'] },
        { id: 'llevar-item-para-tomar-aqui', targetText: 'para tomar aquí', baseText: { de: 'für hier', en: 'for here' }, acceptedAnswers: ['para tomar aquí', 'para tomar aqui', 'Para tomar aquí', 'Para tomar aqui'] },
        { id: 'llevar-item-todo', targetText: 'todo', baseText: { de: 'alles', en: 'everything' }, acceptedAnswers: ['todo', 'Todo'] },
        { id: 'llevar-item-o', targetText: 'o', baseText: { de: 'oder', en: 'or' }, acceptedAnswers: ['o', 'O'] },
        { id: 'llevar-item-cuanto', targetText: 'cuánto', baseText: { de: 'wie viel', en: 'how much' }, acceptedAnswers: ['cuánto', 'cuanto', 'Cuánto', 'Cuanto'] },
      ],
      buildChips: ['Para llevar,', 'por favor.', '¿Cuánto es', 'todo?', 'aquí,', 'mañana?'],
      typeRecall: {
        before: 'Para ',
        answer: 'llevar',
        after: ', por favor. ¿Cuánto es todo?',
        acceptedAnswers: ['llevar', 'Llevar'],
        fallbackChoices: ['llevar', 'tomar', 'pagar', 'ver'],
      },
      speakTarget: {
        baseCue: { de: 'Zum Mitnehmen, bitte. Wie viel macht alles?', en: 'To go, please. How much is everything?' },
        targetPhrase: 'Para llevar, por favor. ¿Cuánto es todo?',
        requiredTokens: ['llevar', 'cuánto', 'todo'],
        optionalTokens: ['para', 'por', 'favor', 'es'],
      },
      sceneCaption: { de: 'An der Kasse wird nachgefragt: „¿Para tomar aquí o para llevar?“', en: 'At the register, the cashier asks: “¿Para tomar aquí o para llevar?”' },
      trophyWord: {
        word: 'todo',
        meaning: { de: 'alles', en: 'everything' },
        example: 'Gracias, todo está bien.',
        whyThisWord: { de: 'todo bündelt eine ganze Bestellung in ein Wort — perfekt für Preisfragen wie ¿Cuánto es todo?.', en: 'todo wraps the whole order into one word — perfect for price questions like ¿Cuánto es todo?.' },
      },
      placeholderCaption: { de: 'Kasse mit zwei Bechern, einer davon mit Deckel für unterwegs.', en: 'A register with two cups, one lidded for the road.' },
      songMood: 'quick friendly decision',
      visualNotes: 'Cafe register, to-go cup handed over, brisk midday rhythm.',
    }),
  },
  {
    slug: 'la-tarjeta-sim',
    title: { de: 'Haben Sie sie?', en: 'Do you have it?' },
    situation: {
      en: 'In a phone shop the clerk offers help — say you are looking for a SIM card and ask whether they have one.',
      de: 'Im Handyladen bietet dir der Verkäufer Hilfe an — du sagst, dass du eine SIM-Karte suchst, und fragst, ob er sie da hat.',
    },
    pedagogicalGoal: 'Auf „¿Le puedo ayudar?“ mit busco antworten und mit dem Objektpronomen la direkt zurückfragen.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'Sí, busco una tarjeta SIM para mi móvil. ¿La tiene?',
        baseText: { de: 'Ja, ich suche eine SIM-Karte für mein Handy. Haben Sie sie?', en: 'Yes, I am looking for a SIM card for my phone. Do you have it?' },
      },
      meaning: { de: 'Sagen, was du suchst — und mit einem kleinen la nach genau diesem Ding zurückfragen.', en: 'Say what you are looking for — and use a small la to ask back about exactly that thing.' },
      chunks: [
        { id: 'sim-si-busco', targetText: 'Sí, busco', baseText: { de: 'Ja, ich suche', en: 'Yes, I am looking for' } },
        { id: 'sim-una-tarjeta-sim', targetText: 'una tarjeta SIM', baseText: { de: 'eine SIM-Karte', en: 'a SIM card' } },
        { id: 'sim-para-mi-movil', targetText: 'para mi móvil.', baseText: { de: 'für mein Handy.', en: 'for my phone.' } },
        { id: 'sim-la-tiene', targetText: '¿La tiene?', baseText: { de: 'Haben Sie sie?', en: 'Do you have it?' } },
      ],
      lessonItems: [
        { id: 'sim-item-busco', targetText: 'busco', baseText: { de: 'ich suche', en: 'I am looking for' }, acceptedAnswers: ['busco', 'Busco'] },
        { id: 'sim-item-tarjeta-sim', targetText: 'una tarjeta SIM', baseText: { de: 'eine SIM-Karte', en: 'a SIM card' }, acceptedAnswers: ['una tarjeta SIM', 'una tarjeta sim', 'Una tarjeta SIM'] },
        { id: 'sim-item-movil', targetText: 'móvil', baseText: { de: 'Handy', en: 'mobile phone' }, acceptedAnswers: ['móvil', 'movil', 'Móvil', 'Movil'] },
        { id: 'sim-item-la-tiene', targetText: 'la tiene', baseText: { de: 'Sie haben sie', en: 'you have it' }, acceptedAnswers: ['la tiene', 'La tiene'] },
        { id: 'sim-item-tienda', targetText: 'tienda', baseText: { de: 'Laden', en: 'shop' }, acceptedAnswers: ['tienda', 'Tienda'] },
      ],
      buildChips: ['Sí, busco', 'una tarjeta SIM', 'para mi móvil.', '¿La tiene?', 'una funda nueva', 'para mi casa.'],
      typeRecall: {
        before: 'Sí, busco una tarjeta SIM para mi ',
        answer: 'móvil',
        after: '. ¿La tiene?',
        acceptedAnswers: ['móvil', 'movil', 'Móvil', 'Movil'],
        fallbackChoices: ['móvil', 'casa', 'hotel', 'coche'],
      },
      speakTarget: {
        baseCue: { de: 'Ja, ich suche eine SIM-Karte für mein Handy. Haben Sie sie?', en: 'Yes, I am looking for a SIM card for my phone. Do you have it?' },
        targetPhrase: 'Sí, busco una tarjeta SIM para mi móvil. ¿La tiene?',
        requiredTokens: ['busco', 'tarjeta', 'tiene'],
        optionalTokens: ['sí', 'una', 'sim', 'para', 'mi', 'móvil', 'la'],
      },
      sceneCaption: { de: 'Der Verkäufer im Handyladen fragt: „¿Le puedo ayudar en algo?“', en: 'The phone-shop clerk asks: “¿Le puedo ayudar en algo?”' },
      trophyWord: {
        word: 'móvil',
        meaning: { de: 'Handy', en: 'mobile phone' },
        example: 'Mi móvil funciona bien.',
        whyThisWord: { de: 'móvil ist das Alltagswort fürs Handy — und der Grund für diesen Einkauf: eine SIM-Karte für dein móvil.', en: 'móvil is the everyday word for a phone — and the reason for this errand: a SIM card for your móvil.' },
      },
      placeholderCaption: { de: 'Handyladen-Regal mit SIM-Karten und Zubehör.', en: 'A phone-shop shelf with SIM cards and accessories.' },
      songMood: 'purposeful shop errand',
      visualNotes: 'Small phone shop, SIM card blister on the counter, direct friendly service exchange.',
    }),
  },
  {
    slug: 'cuantos-minutos',
    title: { de: 'Wie viele Minuten?', en: 'How many minutes?' },
    situation: {
      en: 'You asked for the market and only got “it is close” — ask back how many minutes on foot that means.',
      de: 'Du hast nach dem Markt gefragt und nur die Antwort „Está cerca“ bekommen — du hakst nach, wie viele Minuten das zu Fuß bedeutet.',
    },
    pedagogicalGoal: 'Eine unvollständige Antwort mit einer präzisen Rückfrage auflösen: ¿Cuántos minutos a pie?',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: '¿Cerca? ¿Cuántos minutos a pie, más o menos?',
        baseText: { de: 'In der Nähe? Wie viele Minuten zu Fuß, ungefähr?', en: 'Close by? How many minutes on foot, roughly?' },
      },
      meaning: { de: 'Wenn die Antwort zu vage ist, fragst du so lange nach, bis du planen kannst.', en: 'When the answer is too vague, you ask back until you can actually plan.' },
      chunks: [
        { id: 'minutos-cerca', targetText: '¿Cerca?', baseText: { de: 'In der Nähe?', en: 'Close by?' } },
        { id: 'minutos-cuantos-minutos', targetText: '¿Cuántos minutos', baseText: { de: 'Wie viele Minuten', en: 'How many minutes' } },
        { id: 'minutos-a-pie', targetText: 'a pie,', baseText: { de: 'zu Fuß,', en: 'on foot,' } },
        { id: 'minutos-mas-o-menos', targetText: 'más o menos?', baseText: { de: 'ungefähr?', en: 'more or less?' } },
      ],
      lessonItems: [
        { id: 'minutos-item-cerca', targetText: 'cerca', baseText: { de: 'in der Nähe', en: 'nearby' }, acceptedAnswers: ['cerca', 'Cerca'] },
        { id: 'minutos-item-a-pie', targetText: 'a pie', baseText: { de: 'zu Fuß', en: 'on foot' }, acceptedAnswers: ['a pie', 'A pie'] },
        { id: 'minutos-item-mas-o-menos', targetText: 'más o menos', baseText: { de: 'ungefähr', en: 'roughly' }, acceptedAnswers: ['más o menos', 'mas o menos', 'Más o menos', 'Mas o menos'] },
        { id: 'minutos-item-cuantos', targetText: 'cuántos', baseText: { de: 'wie viele', en: 'how many' }, acceptedAnswers: ['cuántos', 'cuantos', 'Cuántos', 'Cuantos'] },
        { id: 'minutos-item-minutos', targetText: 'minutos', baseText: { de: 'Minuten', en: 'minutes' }, acceptedAnswers: ['minutos', 'Minutos'] },
      ],
      buildChips: ['¿Cerca?', '¿Cuántos minutos', 'a pie,', 'más o menos?', 'en coche,', '¿Lejos?'],
      typeRecall: {
        before: '¿Cerca? ¿Cuántos minutos a ',
        answer: 'pie',
        after: ', más o menos?',
        acceptedAnswers: ['pie', 'Pie'],
        fallbackChoices: ['pie', 'mano', 'coche', 'tren'],
      },
      speakTarget: {
        baseCue: { de: 'In der Nähe? Wie viele Minuten zu Fuß, ungefähr?', en: 'Close by? How many minutes on foot, roughly?' },
        targetPhrase: '¿Cerca? ¿Cuántos minutos a pie, más o menos?',
        requiredTokens: ['cerca', 'minutos', 'pie'],
        optionalTokens: ['cuántos', 'a', 'más', 'o', 'menos'],
      },
      sceneCaption: { de: 'Der Mann zeigt nur vage die Straße hinunter und sagt: „Está cerca.“', en: 'The man just gestures vaguely down the street and says: “Está cerca.”' },
      trophyWord: {
        word: 'pie',
        meaning: { de: 'Fuß', en: 'foot' },
        example: 'Voy al mercado a pie.',
        whyThisWord: { de: 'pie steckt in a pie — zu Fuß. So klärst du, ob „nah“ wirklich nah ist.', en: 'pie lives inside a pie — on foot. That is how you check whether “close” is actually close.' },
      },
      placeholderCaption: { de: 'Straßenszene mit vager Geste in Richtung Markt.', en: 'A street scene with a vague gesture toward the market.' },
      songMood: 'curious follow-up question',
      visualNotes: 'Sunlit street corner, questioning look, fingers counting minutes.',
    }),
  },
  {
    slug: 'todo-muy-rico',
    title: { de: 'Alles sehr lecker', en: 'Everything is delicious' },
    situation: {
      en: 'The waiter checks in on your meal — say everything is delicious and ask him to bring the bill.',
      de: 'Der Kellner fragt, ob alles in Ordnung ist — du lobst das Essen und bittest ihn, die Rechnung zu bringen.',
    },
    pedagogicalGoal: 'Auf „¿Todo bien?“ reagieren und mit ¿Me trae…? höflich die Rechnung anfordern.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'Sí, todo muy rico, gracias. ¿Me trae la cuenta?',
        baseText: { de: 'Ja, alles sehr lecker, danke. Bringen Sie mir bitte die Rechnung?', en: 'Yes, everything is delicious, thank you. Could you bring me the bill?' },
      },
      meaning: { de: 'Erst freundlich reagieren, dann den nächsten Schritt anstoßen — zwei Züge in einer Antwort.', en: 'React warmly first, then move the exchange forward — two moves in one reply.' },
      chunks: [
        { id: 'rico-si-todo-muy-rico', targetText: 'Sí, todo muy rico,', baseText: { de: 'Ja, alles sehr lecker,', en: 'Yes, everything is delicious,' } },
        { id: 'rico-gracias', targetText: 'gracias.', baseText: { de: 'danke.', en: 'thank you.' } },
        { id: 'rico-me-trae', targetText: '¿Me trae', baseText: { de: 'Bringen Sie mir bitte', en: 'Could you bring me' } },
        { id: 'rico-la-cuenta', targetText: 'la cuenta?', baseText: { de: 'die Rechnung?', en: 'the bill?' } },
      ],
      lessonItems: [
        { id: 'rico-item-rico', targetText: 'rico', baseText: { de: 'lecker', en: 'delicious' }, acceptedAnswers: ['rico', 'Rico'] },
        { id: 'rico-item-me-trae', targetText: 'me trae', baseText: { de: 'Sie bringen mir', en: 'you bring me' }, acceptedAnswers: ['me trae', 'Me trae'] },
        { id: 'rico-item-la-cuenta', targetText: 'la cuenta', baseText: { de: 'die Rechnung', en: 'the bill' }, acceptedAnswers: ['la cuenta', 'La cuenta'] },
        { id: 'rico-item-todo-bien', targetText: 'todo bien', baseText: { de: 'alles gut', en: 'all good' }, acceptedAnswers: ['todo bien', 'Todo bien'] },
        { id: 'rico-item-muy', targetText: 'muy', baseText: { de: 'sehr', en: 'very' }, acceptedAnswers: ['muy', 'Muy'] },
      ],
      buildChips: ['Sí, todo muy rico,', 'gracias.', '¿Me trae', 'la cuenta?', 'el menú?', 'muy caro,'],
      typeRecall: {
        before: 'Sí, todo muy ',
        answer: 'rico',
        after: ', gracias. ¿Me trae la cuenta?',
        acceptedAnswers: ['rico', 'Rico'],
        fallbackChoices: ['rico', 'caro', 'frío', 'tarde'],
      },
      speakTarget: {
        baseCue: { de: 'Ja, alles sehr lecker, danke. Bringen Sie mir bitte die Rechnung?', en: 'Yes, everything is delicious, thank you. Could you bring me the bill?' },
        targetPhrase: 'Sí, todo muy rico, gracias. ¿Me trae la cuenta?',
        requiredTokens: ['rico', 'trae', 'cuenta'],
        optionalTokens: ['sí', 'todo', 'muy', 'gracias', 'me', 'la'],
      },
      sceneCaption: { de: 'Der Kellner bleibt am Tisch stehen und fragt: „¿Todo bien?“', en: 'The waiter pauses at your table and asks: “¿Todo bien?”' },
      trophyWord: {
        word: 'rico',
        meaning: { de: 'lecker', en: 'delicious' },
        example: 'El pescado está muy rico.',
        whyThisWord: { de: 'rico ist das Alltagslob fürs Essen — mit está wird daraus ein ganzer Satz.', en: 'rico is the everyday compliment for food — with está it becomes a full sentence.' },
      },
      placeholderCaption: { de: 'Restauranttisch mit fast leeren Tellern und zufriedener Stimmung.', en: 'A restaurant table with nearly empty plates and a satisfied mood.' },
      songMood: 'satisfied dinner wrap-up',
      visualNotes: 'Warm restaurant light, finished plates, small gesture asking for the bill.',
    }),
  },
  {
    slug: 'a-nombre-de',
    title: { de: 'Auf welchen Namen?', en: 'Under what name?' },
    situation: {
      en: 'At the hotel desk the receptionist asks whether you have a reservation — confirm it and give the name it is under.',
      de: 'An der Hotelrezeption fragt die Rezeptionistin, ob du eine Reservierung hast — du bestätigst und nennst den Namen, auf den sie läuft.',
    },
    pedagogicalGoal: 'Auf „¿Tiene una reserva?“ bestätigen und den Namen mit a nombre de angeben — die feste Check-in-Formel.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'Sí, tengo una reserva a nombre de García.',
        baseText: { de: 'Ja, ich habe eine Reservierung auf den Namen García.', en: 'Yes, I have a reservation under the name García.' },
      },
      meaning: { de: 'Die Rückfrage bestätigen und im selben Zug den Namen liefern — eine Antwort, zwei Informationen.', en: 'Confirm the question and hand over the name in the same move — one reply, two pieces of information.' },
      chunks: [
        { id: 'nombre-si', targetText: 'Sí,', baseText: { de: 'Ja,', en: 'Yes,' } },
        { id: 'nombre-tengo-una-reserva', targetText: 'tengo una reserva', baseText: { de: 'ich habe eine Reservierung', en: 'I have a reservation' } },
        { id: 'nombre-a-nombre', targetText: 'a nombre', baseText: { de: 'auf den Namen', en: 'under the name' } },
        { id: 'nombre-de-garcia', targetText: 'de García.', baseText: { de: 'von García.', en: 'of García.' } },
      ],
      lessonItems: [
        { id: 'nombre-item-tengo-una-reserva', targetText: 'tengo una reserva', baseText: { de: 'ich habe eine Reservierung', en: 'I have a reservation' }, acceptedAnswers: ['tengo una reserva', 'Tengo una reserva'] },
        { id: 'nombre-item-a-nombre-de', targetText: 'a nombre de', baseText: { de: 'auf den Namen', en: 'under the name of' }, acceptedAnswers: ['a nombre de', 'A nombre de'] },
        { id: 'nombre-item-nombre', targetText: 'nombre', baseText: { de: 'Name', en: 'name' }, acceptedAnswers: ['nombre', 'Nombre'] },
        { id: 'nombre-item-una-reserva', targetText: 'una reserva', baseText: { de: 'eine Reservierung', en: 'a reservation' }, acceptedAnswers: ['una reserva', 'Una reserva'] },
        { id: 'nombre-item-tengo', targetText: 'tengo', baseText: { de: 'ich habe', en: 'I have' }, acceptedAnswers: ['tengo', 'Tengo'] },
      ],
      buildChips: ['Sí,', 'tengo una reserva', 'a nombre', 'de García.', 'para dos noches', 'no tengo'],
      typeRecall: {
        before: 'Sí, tengo una reserva a ',
        answer: 'nombre',
        after: ' de García.',
        acceptedAnswers: ['nombre', 'Nombre'],
        fallbackChoices: ['nombre', 'favor', 'lado', 'final'],
      },
      speakTarget: {
        baseCue: { de: 'Ja, ich habe eine Reservierung auf den Namen García.', en: 'Yes, I have a reservation under the name García.' },
        targetPhrase: 'Sí, tengo una reserva a nombre de García.',
        requiredTokens: ['tengo', 'reserva', 'nombre'],
        optionalTokens: ['sí', 'una', 'a', 'de', 'garcía'],
      },
      sceneCaption: { de: 'Die Rezeptionistin schaut in den Computer und fragt: „¿Tiene una reserva?“', en: 'The receptionist glances at the computer and asks: “¿Tiene una reserva?”' },
      trophyWord: {
        word: 'nombre',
        meaning: { de: 'Name', en: 'name' },
        example: '¿Cuál es su nombre, por favor?',
        whyThisWord: { de: 'nombre öffnet jeden Check-in: a nombre de García sagt, unter welchem Namen etwas gebucht ist.', en: 'nombre opens every check-in: a nombre de García says whose name the booking is under.' },
      },
      placeholderCaption: { de: 'Hotelrezeption mit Schlüsselkarten und ruhigem Abendlicht.', en: 'A hotel front desk with key cards and calm evening light.' },
      songMood: 'smooth check-in confirmation',
      visualNotes: 'Hotel lobby desk, passport ready, confident returning-guest posture.',
    }),
  },
  {
    slug: 'algo-mas',
    title: { de: 'Sonst noch etwas?', en: 'Anything else?' },
    situation: {
      en: 'The pharmacist hands you your medicine and asks whether you need anything else — decline and ask what you owe.',
      de: 'Die Apothekerin reicht dir dein Medikament und fragt, ob du noch etwas brauchst — du verneinst und fragst, was du schuldest.',
    },
    pedagogicalGoal: 'Auf „¿Algo más?“ mit nada más abschließen und mit ¿Cuánto le debo? zum Bezahlen überleiten.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'No, nada más, gracias. ¿Cuánto le debo?',
        baseText: { de: 'Nein, sonst nichts, danke. Wie viel schulde ich Ihnen?', en: 'No, nothing else, thank you. How much do I owe you?' },
      },
      meaning: { de: 'Ein höfliches Nein plus die Frage nach dem Preis — so endet ein Einkauf sauber.', en: 'A polite no plus the price question — the clean way to close a purchase.' },
      chunks: [
        { id: 'debo-no-nada-mas', targetText: 'No, nada más,', baseText: { de: 'Nein, sonst nichts,', en: 'No, nothing else,' } },
        { id: 'debo-gracias', targetText: 'gracias.', baseText: { de: 'danke.', en: 'thank you.' } },
        { id: 'debo-cuanto', targetText: '¿Cuánto', baseText: { de: 'Wie viel', en: 'How much' } },
        { id: 'debo-le-debo', targetText: 'le debo?', baseText: { de: 'schulde ich Ihnen?', en: 'do I owe you?' } },
      ],
      lessonItems: [
        { id: 'debo-item-algo-mas', targetText: 'algo más', baseText: { de: 'noch etwas', en: 'anything else' }, acceptedAnswers: ['algo más', 'algo mas', 'Algo más', 'Algo mas'] },
        { id: 'debo-item-nada-mas', targetText: 'nada más', baseText: { de: 'sonst nichts', en: 'nothing else' }, acceptedAnswers: ['nada más', 'nada mas', 'Nada más', 'Nada mas'] },
        { id: 'debo-item-le-debo', targetText: 'le debo', baseText: { de: 'ich schulde Ihnen', en: 'I owe you' }, acceptedAnswers: ['le debo', 'Le debo'] },
        { id: 'debo-item-debo', targetText: 'debo', baseText: { de: 'ich schulde', en: 'I owe' }, acceptedAnswers: ['debo', 'Debo'] },
        { id: 'debo-item-algo', targetText: 'algo', baseText: { de: 'etwas', en: 'something' }, acceptedAnswers: ['algo', 'Algo'] },
      ],
      buildChips: ['No, nada más,', 'gracias.', '¿Cuánto', 'le debo?', 'algo más,', 'me da?'],
      typeRecall: {
        before: 'No, nada más, gracias. ¿Cuánto le ',
        answer: 'debo',
        after: '?',
        acceptedAnswers: ['debo', 'Debo'],
        fallbackChoices: ['debo', 'doy', 'pago', 'pido'],
      },
      speakTarget: {
        baseCue: { de: 'Nein, sonst nichts, danke. Wie viel schulde ich Ihnen?', en: 'No, nothing else, thank you. How much do I owe you?' },
        targetPhrase: 'No, nada más, gracias. ¿Cuánto le debo?',
        requiredTokens: ['nada', 'más', 'debo'],
        optionalTokens: ['no', 'gracias', 'cuánto', 'le'],
      },
      sceneCaption: { de: 'Die Apothekerin legt die Schachtel auf den Tresen und fragt: „¿Algo más?“', en: 'The pharmacist places the box on the counter and asks: “¿Algo más?”' },
      trophyWord: {
        word: 'debo',
        meaning: { de: 'ich schulde', en: 'I owe' },
        example: 'Le debo dos euros.',
        whyThisWord: { de: 'debo stellt am Ende jedes Einkaufs die entscheidende Frage: ¿Cuánto le debo? — Wie viel schulde ich Ihnen?', en: 'debo asks the closing question of every purchase: ¿Cuánto le debo? — how much do I owe you?' },
      },
      placeholderCaption: { de: 'Apothekentresen mit einer Medikamentenschachtel.', en: 'A pharmacy counter with a medicine box.' },
      songMood: 'tidy polite closing',
      visualNotes: 'Bright pharmacy counter, single box, courteous payment moment.',
    }),
  },
  {
    slug: 'al-final-de-la-calle',
    title: { de: 'Diesmal hilfst du', en: 'This time you help' },
    situation: {
      en: 'A tourist stops you and asks for the metro station — this time you are the one who knows and gives directions.',
      de: 'Ein Tourist spricht dich an und fragt nach der Metrostation — diesmal kennst du dich aus und erklärst den Weg.',
    },
    pedagogicalGoal: 'Als Ortskundiger antworten: mit Sí, claro bestätigen und den Weg mit al final de la calle beschreiben.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'Sí, claro. Está al final de la calle.',
        baseText: { de: 'Ja, klar. Sie ist am Ende der Straße.', en: 'Yes, of course. It is at the end of the street.' },
      },
      meaning: { de: 'Der Rollentausch der zweiten Woche: Jetzt bist du die Person, die den Weg kennt.', en: 'The second-week role reversal: now you are the one who knows the way.' },
      chunks: [
        { id: 'calle-si-claro', targetText: 'Sí, claro.', baseText: { de: 'Ja, klar.', en: 'Yes, of course.' } },
        { id: 'calle-esta', targetText: 'Está', baseText: { de: 'Sie ist', en: 'It is' } },
        { id: 'calle-al-final', targetText: 'al final', baseText: { de: 'am Ende', en: 'at the end' } },
        { id: 'calle-de-la-calle', targetText: 'de la calle.', baseText: { de: 'der Straße.', en: 'of the street.' } },
      ],
      lessonItems: [
        { id: 'calle-item-claro', targetText: 'claro', baseText: { de: 'klar', en: 'of course' }, acceptedAnswers: ['claro', 'Claro'] },
        { id: 'calle-item-esta', targetText: 'está', baseText: { de: 'sie ist', en: 'it is' }, acceptedAnswers: ['está', 'esta', 'Está', 'Esta'] },
        { id: 'calle-item-al-final-de', targetText: 'al final de', baseText: { de: 'am Ende von', en: 'at the end of' }, acceptedAnswers: ['al final de', 'Al final de'] },
        { id: 'calle-item-la-calle', targetText: 'la calle', baseText: { de: 'die Straße', en: 'the street' }, acceptedAnswers: ['la calle', 'La calle'] },
        { id: 'calle-item-la-estacion', targetText: 'la estación', baseText: { de: 'die U-Bahn-Station', en: 'the station' }, acceptedAnswers: ['la estación', 'la estacion', 'La estación', 'La estacion'] },
      ],
      buildChips: ['Sí, claro.', 'Está', 'al final', 'de la calle.', 'a la izquierda.', 'No lo sé.'],
      typeRecall: {
        before: 'Sí, claro. Está al final de la ',
        answer: 'calle',
        after: '.',
        acceptedAnswers: ['calle', 'Calle'],
        fallbackChoices: ['calle', 'casa', 'ciudad', 'plaza'],
      },
      speakTarget: {
        baseCue: { de: 'Ja, klar. Sie ist am Ende der Straße.', en: 'Yes, of course. It is at the end of the street.' },
        targetPhrase: 'Sí, claro. Está al final de la calle.',
        requiredTokens: ['claro', 'final', 'calle'],
        optionalTokens: ['sí', 'está', 'al', 'de', 'la'],
      },
      sceneCaption: { de: 'Ein Tourist mit Handykarte fragt dich: „Perdone, ¿la estación de metro?“', en: 'A tourist holding a phone map asks you: “Perdone, ¿la estación de metro?”' },
      trophyWord: {
        word: 'calle',
        meaning: { de: 'Straße', en: 'street' },
        example: 'Vivo en esta calle.',
        whyThisWord: { de: 'calle ist das Grundwort jeder Wegbeschreibung — al final de la calle bringt Menschen ans Ziel.', en: 'calle is the base word of every direction — al final de la calle gets people where they are going.' },
      },
      placeholderCaption: { de: 'Straßenzug mit Metro-Schild in der Ferne.', en: 'A street with a metro sign in the distance.' },
      songMood: 'confident helpful local',
      visualNotes: 'City sidewalk, pointing down the street, relieved tourist, learner as local.',
    }),
  },
  {
    slug: 'medio-kilo',
    title: { de: 'Ein halbes Kilo', en: 'Half a kilo' },
    situation: {
      en: 'At the market stall the vendor asks how much you want — give the amount and ask for two lemons as well.',
      de: 'Am Marktstand fragt der Händler, wie viel du möchtest — du nennst die Menge und bittest zusätzlich um zwei Zitronen.',
    },
    pedagogicalGoal: 'Auf „¿Cuánto quiere?“ mit einer Mengenangabe antworten und mit también einen zweiten Wunsch anhängen.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'Medio kilo, por favor. ¿Me da también dos limones?',
        baseText: { de: 'Ein halbes Kilo, bitte. Geben Sie mir auch zwei Zitronen?', en: 'Half a kilo, please. Could you also give me two lemons?' },
      },
      meaning: { de: 'Menge nennen, dann direkt den nächsten Wunsch anschließen — Markt-Routine der zweiten Woche.', en: 'State the amount, then chain the next request — second-week market routine.' },
      chunks: [
        { id: 'medio-medio-kilo', targetText: 'Medio kilo,', baseText: { de: 'Ein halbes Kilo,', en: 'Half a kilo,' } },
        { id: 'medio-por-favor', targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } },
        { id: 'medio-me-da-tambien', targetText: '¿Me da también', baseText: { de: 'Geben Sie mir auch', en: 'Could you also give me' } },
        { id: 'medio-dos-limones', targetText: 'dos limones?', baseText: { de: 'zwei Zitronen?', en: 'two lemons?' } },
      ],
      lessonItems: [
        { id: 'medio-item-medio-kilo', targetText: 'medio kilo', baseText: { de: 'ein halbes Kilo', en: 'half a kilo' }, acceptedAnswers: ['medio kilo', 'Medio kilo'] },
        { id: 'medio-item-medio', targetText: 'medio', baseText: { de: 'halb', en: 'half' }, acceptedAnswers: ['medio', 'Medio'] },
        { id: 'medio-item-tambien', targetText: 'también', baseText: { de: 'auch', en: 'also' }, acceptedAnswers: ['también', 'tambien', 'También', 'Tambien'] },
        { id: 'medio-item-me-da', targetText: 'me da', baseText: { de: 'Sie geben mir', en: 'you give me' }, acceptedAnswers: ['me da', 'Me da'] },
        { id: 'medio-item-limones', targetText: 'limones', baseText: { de: 'Zitronen', en: 'lemons' }, acceptedAnswers: ['limones', 'Limones'] },
        { id: 'medio-item-tomates', targetText: 'tomates', baseText: { de: 'Tomaten', en: 'tomatoes' }, acceptedAnswers: ['tomates', 'Tomates'] },
      ],
      buildChips: ['Medio kilo,', 'por favor.', '¿Me da también', 'dos limones?', 'un kilo,', 'sin limones?'],
      typeRecall: {
        before: 'Medio kilo, por favor. ¿Me da ',
        answer: 'también',
        after: ' dos limones?',
        acceptedAnswers: ['también', 'tambien', 'También', 'Tambien'],
        fallbackChoices: ['también', 'solo', 'ahora', 'aquí'],
      },
      speakTarget: {
        baseCue: { de: 'Ein halbes Kilo, bitte. Geben Sie mir auch zwei Zitronen?', en: 'Half a kilo, please. Could you also give me two lemons?' },
        targetPhrase: 'Medio kilo, por favor. ¿Me da también dos limones?',
        requiredTokens: ['medio', 'kilo', 'limones'],
        optionalTokens: ['por', 'favor', 'me', 'da', 'también', 'dos'],
      },
      sceneCaption: { de: 'Der Händler wiegt schon Tomaten ab und fragt: „¿Cuánto quiere?“', en: 'The vendor is already weighing tomatoes and asks: “¿Cuánto quiere?”' },
      trophyWord: {
        word: 'medio',
        meaning: { de: 'halb', en: 'half' },
        example: 'Quiero medio kilo de queso.',
        whyThisWord: { de: 'Mit medio werden Mengen alltagstauglich: medio kilo und media hora sind häufige Wendungen.', en: 'medio makes everyday quantities easy: medio kilo and media hora are common phrases.' },
      },
      placeholderCaption: { de: 'Marktstand mit Tomatenkisten und einer Waage.', en: 'A market stall with tomato crates and a scale.' },
      songMood: 'lively market exchange',
      visualNotes: 'Morning market stall, swinging scale, tomatoes and lemons in paper bags.',
    }),
  },
  {
    slug: 'ya-conozco-el-barrio',
    title: { de: 'Schon fast zu Hause', en: 'Almost at home here' },
    situation: {
      en: 'Your neighbor greets you on the stairs and asks how things are going — tell her you already know the neighborhood a little.',
      de: 'Deine Nachbarin grüßt dich im Treppenhaus und fragt, wie es läuft — du erzählst, dass du das Viertel schon ein wenig kennst.',
    },
    pedagogicalGoal: 'Small Talk der zweiten Woche abschließen: auf ¿Qué tal? reagieren und mit ya + conocer den eigenen Fortschritt zeigen.',
    variant: makeBrightSpanishA2Variant({
      corePhrase: {
        targetText: 'Muy bien, gracias. Ya conozco un poco el barrio.',
        baseText: { de: 'Sehr gut, danke. Ich kenne das Viertel schon ein wenig.', en: 'Very well, thanks. I already know the neighborhood a bit.' },
      },
      meaning: { de: 'Der Stammgast-Abschluss: kurz reagieren und zeigen, wie weit du schon bist.', en: 'The regular’s close: react briefly and show how far you have come.' },
      chunks: [
        { id: 'barrio-muy-bien', targetText: 'Muy bien,', baseText: { de: 'Sehr gut,', en: 'Very well,' } },
        { id: 'barrio-gracias', targetText: 'gracias.', baseText: { de: 'danke.', en: 'thanks.' } },
        { id: 'barrio-ya-conozco', targetText: 'Ya conozco', baseText: { de: 'Ich kenne schon', en: 'I already know' } },
        { id: 'barrio-un-poco-el-barrio', targetText: 'un poco el barrio.', baseText: { de: 'das Viertel ein wenig.', en: 'the neighborhood a bit.' } },
      ],
      lessonItems: [
        { id: 'barrio-item-el-barrio', targetText: 'el barrio', baseText: { de: 'das Viertel', en: 'the neighborhood' }, acceptedAnswers: ['el barrio', 'El barrio'] },
        { id: 'barrio-item-ya', targetText: 'ya', baseText: { de: 'schon', en: 'already' }, acceptedAnswers: ['ya', 'Ya'] },
        { id: 'barrio-item-un-poco', targetText: 'un poco', baseText: { de: 'ein wenig', en: 'a little' }, acceptedAnswers: ['un poco', 'Un poco'] },
        { id: 'barrio-item-conozco', targetText: 'conozco', baseText: { de: 'ich kenne', en: 'I know' }, acceptedAnswers: ['conozco', 'Conozco'] },
        { id: 'barrio-item-que-tal', targetText: 'qué tal', baseText: { de: 'wie geht’s', en: 'how is it going' }, acceptedAnswers: ['qué tal', 'que tal', 'Qué tal', 'Que tal'] },
      ],
      buildChips: ['Muy bien,', 'gracias.', 'Ya conozco', 'un poco el barrio.', 'la ciudad entera.', 'Todavía no.'],
      typeRecall: {
        before: 'Muy bien, gracias. Ya conozco un poco el ',
        answer: 'barrio',
        after: '.',
        acceptedAnswers: ['barrio', 'Barrio'],
        fallbackChoices: ['barrio', 'banco', 'baño', 'barco'],
      },
      speakTarget: {
        baseCue: { de: 'Sehr gut, danke. Ich kenne das Viertel schon ein wenig.', en: 'Very well, thanks. I already know the neighborhood a bit.' },
        targetPhrase: 'Muy bien, gracias. Ya conozco un poco el barrio.',
        requiredTokens: ['conozco', 'barrio', 'poco'],
        optionalTokens: ['muy', 'bien', 'gracias', 'ya', 'el', 'un'],
      },
      sceneCaption: { de: 'Deine Nachbarin hält auf der Treppe kurz an: „¡Hola! ¿Qué tal? ¿Todo bien por aquí?“', en: 'Your neighbor pauses on the stairs: “¡Hola! ¿Qué tal? ¿Todo bien por aquí?”' },
      trophyWord: {
        word: 'barrio',
        meaning: { de: 'Stadtviertel', en: 'neighborhood' },
        example: 'Mi barrio es muy tranquilo.',
        whyThisWord: { de: 'barrio ist das Stammgast-Level in einem Wort: Wer sein barrio kennt, ist kein Tourist mehr.', en: 'barrio is the Regular level in one word: once you know your barrio, you are no longer a tourist.' },
      },
      placeholderCaption: { de: 'Treppenhausbegegnung mit offener Wohnungstür und Einkaufstasche.', en: 'A stairwell encounter with an open apartment door and a shopping bag.' },
      songMood: 'settled friendly milestone',
      visualNotes: 'Apartment stairwell, warm greeting, sense of belonging after two weeks.',
    }),
  },
]

export const SPANISH_A2_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeSpanishA2PracticalLessons(
  GUIDED_TODAY_PATH_SPANISH_A2_ONE_METADATA,
  spanishA2Practical1Inputs,
  {
    de: 'Du hast Spanisch A2 Praxis 1 abgeschlossen — zwei Gesprächszüge sind jetzt deine Normalform.',
    en: 'You have completed Spanish A2 Practical 1 — two-turn exchanges are now your normal.',
  },
)
