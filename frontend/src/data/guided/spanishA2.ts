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

type SpanishA2CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  targetText: string
  baseText: GuidedBaseContentText
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[] }
  /** Exactly the salient single words the speech check requires \u2014 never multi-word phrases (the check compares whitespace-split transcript tokens). */
  speakRequired: [string, string, string]
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

function spanishA2Answers(text: string): string[] {
  const accentless = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const variants = [text, accentless, text.toLowerCase(), accentless.toLowerCase()]
  const capitalized = variants.map((value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
  return [...new Set([...variants, ...capitalized])]
}

function spanishA2SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
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

function makeSpanishA2CompactLesson(input: SpanishA2CompactLesson): SpanishA2LessonInput {
  const prefix = input.slug.split('-')[0]
  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: makeBrightSpanishA2Variant({
      corePhrase: { targetText: input.targetText, baseText: input.baseText },
      meaning: input.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map((term, index) => ({
        id: `${prefix}-item-${index + 1}`,
        ...term,
        acceptedAnswers: spanishA2Answers(term.targetText),
      })),
      buildChips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      typeRecall: {
        ...input.recall,
        acceptedAnswers: spanishA2Answers(input.recall.answer),
      },
      speakTarget: {
        baseCue: input.baseText,
        targetPhrase: input.targetText,
        ...spanishA2SpeakTokens(input.targetText, input.speakRequired),
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderCaption: input.placeholderCaption,
      songMood: input.songMood,
      visualNotes: input.visualNotes,
    }),
  }
}

export const GUIDED_TODAY_PATH_SPANISH_A2_TWO_METADATA: GuidedPathMetadata = {
  id: 'spanish-a2-practical-2',
  title: 'Spanish A2 Practical 2',
  shortTitle: 'A2 Practical 2',
  subtitle: { de: 'Vorlieben begründen und vergleichen', en: 'Giving reasons and comparing choices' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Spanish', estimatedMinutes: 5,
}

const spanishA2Practical2Inputs: SpanishA2LessonInput[] = [
  makeSpanishA2CompactLesson({
    slug: 'prefiero-estos-tomates', title: { de: 'Diese Tomaten', en: 'These tomatoes' },
    situation: { de: 'Der Händler zeigt auf zwei Tomatensorten und fragt, welche du möchtest — du triffst deine Wahl mit einem Grund.', en: 'The vendor points to two kinds of tomatoes and asks which you want — make your choice and give a reason.' },
    pedagogicalGoal: 'Auf „¿Cuáles prefiere?“ mit prefiero antworten und die Wahl mit porque + Vergleich begründen.',
    targetText: 'Prefiero estos tomates porque son más maduros que esos.', baseText: { de: 'Ich bevorzuge diese Tomaten, weil sie reifer sind als jene.', en: 'I prefer these tomatoes because they are riper than those.' },
    chunks: [{ targetText: 'Prefiero estos tomates', baseText: { de: 'Ich bevorzuge diese Tomaten', en: 'I prefer these tomatoes' } }, { targetText: 'porque son', baseText: { de: 'weil sie sind', en: 'because they are' } }, { targetText: 'más maduros', baseText: { de: 'reifer', en: 'riper' } }, { targetText: 'que esos.', baseText: { de: 'als jene.', en: 'than those.' } }],
    terms: [{ targetText: 'prefiero', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }, { targetText: 'tomates', baseText: { de: 'Tomaten', en: 'tomatoes' } }, { targetText: 'porque', baseText: { de: 'weil', en: 'because' } }, { targetText: 'más maduros', baseText: { de: 'reifer', en: 'riper' } }, { targetText: 'esos', baseText: { de: 'jene', en: 'those' } }],
    recall: { before: 'Prefiero estos tomates ', answer: 'porque', after: ' son más maduros que esos.', fallbackChoices: ['porque', 'pero', 'también', 'ahora'] }, speakRequired: ['tomates', 'maduros', 'prefiero'],
    sceneCaption: { de: 'Der Händler hält zwei Kisten hoch und fragt: „¿Cuáles prefiere?“', en: 'The vendor holds up two crates and asks: “¿Cuáles prefiere?”' },
    trophyWord: { word: 'maduros', meaning: { de: 'reif', en: 'ripe' }, example: 'Estos plátanos están maduros.', whyThisWord: { de: 'maduros macht eine Marktentscheidung konkret: Du wählst die reiferen Tomaten.', en: 'maduros makes a market choice concrete: you choose the riper tomatoes.' } },
    distractors: ['Prefiero aquellos tomates', 'porque son muy caros.'], placeholderCaption: { de: 'Zwei Tomatenkisten an einem Marktstand.', en: 'Two crates of tomatoes at a market stall.' }, songMood: 'fresh market choice', visualNotes: 'Market stall, two tomato crates, decisive gesture.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'hoy-prefiero-un-zumo', title: { de: 'Heute lieber Saft', en: 'Juice today' },
    situation: { de: 'Im Café fragt die Barista nach deiner üblichen Bestellung — heute möchtest du etwas anderes und erklärst warum.', en: 'At the cafe, the barista asks for your usual order — today you want something different and explain why.' },
    pedagogicalGoal: 'Eine Bestellung freundlich ändern und mit weniger + Adjektiv vergleichen.',
    targetText: 'Hoy prefiero un zumo porque es menos fuerte que el café.', baseText: { de: 'Heute bevorzuge ich einen Saft, weil er weniger stark ist als Kaffee.', en: 'Today I prefer a juice because it is less strong than coffee.' },
    chunks: [{ targetText: 'Hoy prefiero un zumo', baseText: { de: 'Heute bevorzuge ich einen Saft', en: 'Today I prefer a juice' } }, { targetText: 'porque es', baseText: { de: 'weil er', en: 'because it is' } }, { targetText: 'menos fuerte', baseText: { de: 'weniger stark', en: 'less strong' } }, { targetText: 'que el café.', baseText: { de: 'als der Kaffee.', en: 'than coffee.' } }],
    terms: [{ targetText: 'hoy', baseText: { de: 'heute', en: 'today' } }, { targetText: 'zumo', baseText: { de: 'Saft', en: 'juice' } }, { targetText: 'menos', baseText: { de: 'weniger', en: 'less' } }, { targetText: 'fuerte', baseText: { de: 'stark', en: 'strong' } }, { targetText: 'café', baseText: { de: 'Kaffee', en: 'coffee' } }],
    recall: { before: 'Hoy prefiero un zumo porque es ', answer: 'menos', after: ' fuerte que el café.', fallbackChoices: ['menos', 'más', 'muy', 'casi'] }, speakRequired: ['zumo', 'menos', 'fuerte'],
    sceneCaption: { de: 'Die Barista lächelt und fragt: „¿Lo de siempre?“', en: 'The barista smiles and asks: “¿Lo de siempre?”' },
    trophyWord: { word: 'fuerte', meaning: { de: 'stark', en: 'strong' }, example: 'El café está muy fuerte.', whyThisWord: { de: 'fuerte erklärt hier ganz natürlich, warum heute ein Saft besser passt.', en: 'fuerte naturally explains why a juice suits you better today.' } },
    distractors: ['Hoy quiero un té', 'porque está caliente.'], placeholderCaption: { de: 'Cafétresen mit Saft und Espressomaschine.', en: 'Cafe counter with juice and an espresso machine.' }, songMood: 'easy cafe switch', visualNotes: 'Warm cafe, juice glass beside a coffee cup.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'prefiero-la-camisa-azul', title: { de: 'Das blaue Hemd', en: 'The blue shirt' },
    situation: { de: 'Im Laden hält die Verkäuferin zwei Hemden hoch — du sagst, welches du lieber nimmst und warum.', en: 'In a shop, the assistant holds up two shirts — say which one you prefer and why.' },
    pedagogicalGoal: 'Mit más bonita que zwei konkrete Kleidungsstücke vergleichen.',
    targetText: 'Prefiero la camisa azul porque es más bonita que la roja.', baseText: { de: 'Ich bevorzuge das blaue Hemd, weil es schöner ist als das rote.', en: 'I prefer the blue shirt because it is nicer than the red one.' },
    chunks: [{ targetText: 'Prefiero la camisa azul', baseText: { de: 'Ich bevorzuge das blaue Hemd', en: 'I prefer the blue shirt' } }, { targetText: 'porque es', baseText: { de: 'weil es', en: 'because it is' } }, { targetText: 'más bonita', baseText: { de: 'schöner ist', en: 'nicer' } }, { targetText: 'que la roja.', baseText: { de: 'als das rote.', en: 'than the red one.' } }],
    terms: [{ targetText: 'camisa', baseText: { de: 'Hemd', en: 'shirt' } }, { targetText: 'azul', baseText: { de: 'blau', en: 'blue' } }, { targetText: 'más bonita', baseText: { de: 'schöner', en: 'nicer' } }, { targetText: 'roja', baseText: { de: 'rot', en: 'red' } }, { targetText: 'prefiero', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }],
    recall: { before: 'Prefiero la camisa azul porque es ', answer: 'más bonita', after: ' que la roja.', fallbackChoices: ['más bonita', 'más cara', 'muy vieja', 'de color'] }, speakRequired: ['camisa', 'azul', 'bonita'],
    sceneCaption: { de: 'Die Verkäuferin fragt und zeigt auf beide Hemden: „¿Cuál le gusta más?“', en: 'The shop assistant points to both shirts and asks: “¿Cuál le gusta más?”' },
    trophyWord: { word: 'camisa', meaning: { de: 'Hemd', en: 'shirt' }, example: 'La camisa azul es nueva.', whyThisWord: { de: 'camisa verankert den Vergleich an einem klaren, konkreten Kleidungsstück.', en: 'camisa anchors the comparison in a clear, concrete item of clothing.' } },
    distractors: ['Prefiero la roja', 'porque es pequeña.'], placeholderCaption: { de: 'Zwei Hemden auf einem Kleiderständer.', en: 'Two shirts on a clothes rack.' }, songMood: 'bright shop choice', visualNotes: 'Clothing rack, blue and red shirts, helpful assistant.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'quiero-la-ensalada', title: { de: 'Etwas Leichteres', en: 'Something lighter' },
    situation: { de: 'Die Bedienung fragt, ob du die Suppe oder den Salat möchtest — du entscheidest dich und vergleichst.', en: 'The server asks whether you would like soup or salad — choose and compare.' },
    pedagogicalGoal: 'Ein Gericht auswählen und mit más ligera que begründen.',
    targetText: 'Quiero la ensalada porque es más ligera que la sopa.', baseText: { de: 'Ich möchte den Salat, weil er leichter ist als die Suppe.', en: 'I want the salad because it is lighter than the soup.' },
    chunks: [{ targetText: 'Quiero la ensalada', baseText: { de: 'Ich möchte den Salat', en: 'I want the salad' } }, { targetText: 'porque es', baseText: { de: 'weil er', en: 'because it is' } }, { targetText: 'más ligera', baseText: { de: 'leichter ist', en: 'lighter' } }, { targetText: 'que la sopa.', baseText: { de: 'als die Suppe.', en: 'than the soup.' } }],
    terms: [{ targetText: 'ensalada', baseText: { de: 'Salat', en: 'salad' } }, { targetText: 'ligera', baseText: { de: 'leicht', en: 'light' } }, { targetText: 'sopa', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'quiero', baseText: { de: 'ich möchte', en: 'I want' } }, { targetText: 'porque', baseText: { de: 'weil', en: 'because' } }],
    recall: { before: 'Quiero la ensalada porque es más ', answer: 'ligera', after: ' que la sopa.', fallbackChoices: ['ligera', 'caliente', 'grande', 'típica'] }, speakRequired: ['ensalada', 'ligera', 'sopa'],
    sceneCaption: { de: 'Die Bedienung fragt: „¿La sopa o la ensalada?“', en: 'The server asks: “¿La sopa o la ensalada?”' },
    trophyWord: { word: 'ligera', meaning: { de: 'leicht', en: 'light' }, example: 'La ensalada es ligera y rica.', whyThisWord: { de: 'ligera ist die praktische Begründung für eine leichte Mahlzeit.', en: 'ligera is a practical reason for choosing a light meal.' } },
    distractors: ['Quiero la sopa', 'porque está caliente.'], placeholderCaption: { de: 'Restauranttisch mit Suppe und Salat.', en: 'Restaurant table with soup and salad.' }, songMood: 'calm lunch choice', visualNotes: 'Simple restaurant table, soup bowl and green salad.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'este-pan-es-mas-fresco', title: { de: 'Frisches Brot', en: 'Fresh bread' },
    situation: { de: 'In der Bäckerei zeigt dir der Bäcker zwei Brote — du erklärst, welches du nimmst.', en: 'At the bakery, the baker shows you two loaves — explain which one you will take.' },
    pedagogicalGoal: 'Mit más fresco que eine frische Wahl in der Bäckerei ausdrücken.',
    targetText: 'Este pan es más fresco que el de ayer.', baseText: { de: 'Dieses Brot ist frischer als das von gestern.', en: 'This bread is fresher than yesterday’s one.' },
    chunks: [{ targetText: 'Este pan', baseText: { de: 'Dieses Brot', en: 'This bread' } }, { targetText: 'es más fresco', baseText: { de: 'ist frischer', en: 'is fresher' } }, { targetText: 'que el de ayer.', baseText: { de: 'als das von gestern.', en: 'than yesterday’s one.' } }],
    terms: [{ targetText: 'pan', baseText: { de: 'Brot', en: 'bread' } }, { targetText: 'fresco', baseText: { de: 'frisch', en: 'fresh' } }, { targetText: 'ayer', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'este', baseText: { de: 'dieser', en: 'this' } }, { targetText: 'más', baseText: { de: 'mehr', en: 'more' } }],
    recall: { before: 'Este pan es más ', answer: 'fresco', after: ' que el de ayer.', fallbackChoices: ['fresco', 'caro', 'grande', 'oscuro'] }, speakRequired: ['pan', 'fresco', 'ayer'],
    sceneCaption: { de: 'Der Bäcker fragt vor dem Regal: „¿Cuál quiere?“', en: 'The baker asks in front of the shelf: “¿Cuál quiere?”' },
    trophyWord: { word: 'pan', meaning: { de: 'Brot', en: 'bread' }, example: 'El pan está fresco hoy.', whyThisWord: { de: 'pan verankert den Frischevergleich an einem alltäglichen Kauf in der Bäckerei.', en: 'pan anchors the freshness comparison in an everyday bakery purchase.' } },
    distractors: ['Quiero ese pan', 'porque es muy pequeño.'], placeholderCaption: { de: 'Bäckereiregal mit zwei Brotlaiben.', en: 'Bakery shelf with two loaves of bread.' }, songMood: 'warm bakery morning', visualNotes: 'Golden bakery shelf, fresh loaves, friendly baker.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'voy-en-metro', title: { de: 'Mit der Metro', en: 'By metro' },
    situation: { de: 'Ein Nachbar fragt, ob du den Bus nimmst — du erklärst, warum du lieber mit der Metro fährst.', en: 'A neighbor asks whether you are taking the bus — explain why you prefer the metro.' },
    pedagogicalGoal: 'Zwei Verkehrsmittel mit más rápido que natürlich vergleichen.',
    targetText: 'Voy en metro porque es más rápido que el autobús.', baseText: { de: 'Ich fahre mit der Metro, weil sie schneller ist als der Bus.', en: 'I go by metro because it is faster than the bus.' },
    chunks: [{ targetText: 'Voy en metro', baseText: { de: 'Ich fahre mit der Metro', en: 'I go by metro' } }, { targetText: 'porque es', baseText: { de: 'weil sie', en: 'because it is' } }, { targetText: 'más rápido', baseText: { de: 'schneller ist', en: 'faster' } }, { targetText: 'que el autobús.', baseText: { de: 'als der Bus.', en: 'than the bus.' } }],
    terms: [{ targetText: 'metro', baseText: { de: 'Metro', en: 'metro' } }, { targetText: 'rápido', baseText: { de: 'schnell', en: 'fast' } }, { targetText: 'autobús', baseText: { de: 'Bus', en: 'bus' } }, { targetText: 'voy', baseText: { de: 'ich fahre', en: 'I go' } }, { targetText: 'porque', baseText: { de: 'weil', en: 'because' } }],
    recall: { before: 'Voy en metro porque es más ', answer: 'rápido', after: ' que el autobús.', fallbackChoices: ['rápido', 'cerca', 'barato', 'nuevo'] }, speakRequired: ['metro', 'rápido', 'autobús'],
    sceneCaption: { de: 'Dein Nachbar fragt an der Ecke: „¿Va en autobús?“', en: 'Your neighbor asks on the corner: “¿Va en autobús?”' },
    trophyWord: { word: 'rápido', meaning: { de: 'schnell', en: 'fast' }, example: 'El metro es rápido.', whyThisWord: { de: 'rápido gibt einen einfachen, alltagstauglichen Grund für die Metro.', en: 'rápido gives a simple everyday reason for taking the metro.' } },
    distractors: ['Voy en autobús', 'porque es tranquilo.'], placeholderCaption: { de: 'Metrozug neben einem Bus an einer Stadtstraße.', en: 'Metro train beside a bus on a city street.' }, songMood: 'quick city route', visualNotes: 'Metro entrance, bus passing, purposeful commute.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'prefiero-esta-habitacion', title: { de: 'Das ruhigere Zimmer', en: 'The quieter room' },
    situation: { de: 'An der Rezeption werden dir zwei Zimmer angeboten — du sagst, welches besser zum Schlafen passt.', en: 'At reception, you are offered two rooms — say which one is better for sleeping.' },
    pedagogicalGoal: 'Eine Zimmerwahl mit porque und más tranquila begründen.',
    targetText: 'Prefiero esta habitación porque es más tranquila para dormir.', baseText: { de: 'Ich bevorzuge dieses Zimmer, weil es zum Schlafen ruhiger ist.', en: 'I prefer this room because it is quieter for sleeping.' },
    chunks: [{ targetText: 'Prefiero esta habitación', baseText: { de: 'Ich bevorzuge dieses Zimmer', en: 'I prefer this room' } }, { targetText: 'porque es', baseText: { de: 'weil es', en: 'because it is' } }, { targetText: 'más tranquila', baseText: { de: 'ruhiger ist', en: 'quieter' } }, { targetText: 'para dormir.', baseText: { de: 'zum Schlafen.', en: 'for sleeping.' } }],
    terms: [{ targetText: 'habitación', baseText: { de: 'Zimmer', en: 'room' } }, { targetText: 'tranquila', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'dormir', baseText: { de: 'schlafen', en: 'to sleep' } }, { targetText: 'prefiero', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }, { targetText: 'para', baseText: { de: 'zum', en: 'for' } }],
    recall: { before: 'Prefiero esta habitación porque es más ', answer: 'tranquila', after: ' para dormir.', fallbackChoices: ['tranquila', 'grande', 'clara', 'moderna'] }, speakRequired: ['habitación', 'tranquila', 'dormir'],
    sceneCaption: { de: 'Die Rezeptionistin fragt: „¿Cuál habitación prefiere?“', en: 'The receptionist asks: “¿Cuál habitación prefiere?”' },
    trophyWord: { word: 'tranquila', meaning: { de: 'ruhig', en: 'quiet' }, example: 'La calle es tranquila por la noche.', whyThisWord: { de: 'tranquila gibt deiner Zimmerwahl einen klaren, persönlichen Zweck.', en: 'tranquila gives your room choice a clear personal purpose.' } },
    distractors: ['Prefiero la otra habitación', 'porque es grande.'], placeholderCaption: { de: 'Zwei Hoteltüren an einem ruhigen Flur.', en: 'Two hotel doors along a quiet corridor.' }, songMood: 'quiet hotel choice', visualNotes: 'Hotel hallway, two room keys, calm evening.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'prefiero-estos-zapatos', title: { de: 'Bequeme Schuhe', en: 'Comfortable shoes' },
    situation: { de: 'Auf dem Markt fragst du nach Schuhen, und der Verkäufer zeigt dir zwei Paare — du wählst das bequemere.', en: 'At the market, the seller shows you two pairs of shoes — choose the more comfortable pair.' },
    pedagogicalGoal: 'Eine Kaufentscheidung mit más cómodos formulieren.',
    targetText: 'Prefiero estos zapatos porque son más cómodos.', baseText: { de: 'Ich bevorzuge diese Schuhe, weil sie bequemer sind.', en: 'I prefer these shoes because they are more comfortable.' },
    chunks: [{ targetText: 'Prefiero estos zapatos', baseText: { de: 'Ich bevorzuge diese Schuhe', en: 'I prefer these shoes' } }, { targetText: 'porque son', baseText: { de: 'weil sie sind', en: 'because they are' } }, { targetText: 'más cómodos.', baseText: { de: 'bequemer.', en: 'more comfortable.' } }],
    terms: [{ targetText: 'zapatos', baseText: { de: 'Schuhe', en: 'shoes' } }, { targetText: 'cómodos', baseText: { de: 'bequem', en: 'comfortable' } }, { targetText: 'estos', baseText: { de: 'diese', en: 'these' } }, { targetText: 'más', baseText: { de: 'mehr', en: 'more' } }, { targetText: 'prefiero', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }],
    recall: { before: 'Prefiero estos zapatos porque son más ', answer: 'cómodos', after: '.', fallbackChoices: ['cómodos', 'baratos', 'nuevos', 'pequeños'] }, speakRequired: ['zapatos', 'cómodos', 'prefiero'],
    sceneCaption: { de: 'Der Verkäufer fragt und hält beide Paare hin: „¿Cuáles le gustan?“', en: 'The seller holds out both pairs and asks: “¿Cuáles le gustan?”' },
    trophyWord: { word: 'cómodos', meaning: { de: 'bequem', en: 'comfortable' }, example: 'Estos zapatos son cómodos.', whyThisWord: { de: 'cómodos ist der natürliche Grund, ein Paar Schuhe zu wählen.', en: 'cómodos is the natural reason for choosing a pair of shoes.' } },
    distractors: ['Prefiero esos zapatos', 'porque son rojos.'], placeholderCaption: { de: 'Zwei Paar Schuhe an einem Marktstand.', en: 'Two pairs of shoes at a market stall.' }, songMood: 'street market comfort', visualNotes: 'Shoe stall, learner trying a pair, helpful seller.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'quiero-la-botella-pequena', title: { de: 'Die kleine Flasche', en: 'The small bottle' },
    situation: { de: 'Im Laden fragt die Verkäuferin nach der Größe — du nimmst die kleinere Flasche und nennst den Preisgrund.', en: 'In the shop, the assistant asks which size — choose the smaller bottle and give the price reason.' },
    pedagogicalGoal: 'Mit cuesta menos einen einfachen Preisvergleich ausdrücken.',
    targetText: 'Quiero la botella pequeña porque cuesta menos.', baseText: { de: 'Ich möchte die kleine Flasche, weil sie weniger kostet.', en: 'I want the small bottle because it costs less.' },
    chunks: [{ targetText: 'Quiero', baseText: { de: 'Ich möchte', en: 'I want' } }, { targetText: 'la botella pequeña', baseText: { de: 'die kleine Flasche', en: 'the small bottle' } }, { targetText: 'porque cuesta', baseText: { de: 'weil sie kostet', en: 'because it costs' } }, { targetText: 'menos.', baseText: { de: 'weniger.', en: 'less.' } }],
    terms: [{ targetText: 'botella', baseText: { de: 'Flasche', en: 'bottle' } }, { targetText: 'pequeña', baseText: { de: 'klein', en: 'small' } }, { targetText: 'cuesta', baseText: { de: 'kostet', en: 'costs' } }, { targetText: 'menos', baseText: { de: 'weniger', en: 'less' } }, { targetText: 'quiero', baseText: { de: 'ich möchte', en: 'I want' } }],
    recall: { before: 'Quiero la botella pequeña porque cuesta ', answer: 'menos', after: '.', fallbackChoices: ['menos', 'mucho', 'ahora', 'bien'] }, speakRequired: ['botella', 'pequeña', 'menos'],
    sceneCaption: { de: 'Die Verkäuferin fragt vor zwei Flaschen: „¿Grande o pequeña?“', en: 'The shop assistant asks in front of two bottles: “¿Grande o pequeña?”' },
    trophyWord: { word: 'botella', meaning: { de: 'Flasche', en: 'bottle' }, example: 'Quiero una botella pequeña.', whyThisWord: { de: 'botella verbindet Größe und Preis in einer echten Kaufentscheidung.', en: 'botella connects size and price in a real purchase decision.' } },
    distractors: ['Quiero la botella grande', 'porque cuesta más.'], placeholderCaption: { de: 'Kleines und großes Getränk im Ladenregal.', en: 'Small and large drinks on a shop shelf.' }, songMood: 'simple price choice', visualNotes: 'Shop shelf, two bottle sizes, price labels.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'prefiero-este-cafe', title: { de: 'Dein Lieblingsort', en: 'Your favorite spot' },
    situation: { de: 'Deine Nachbarin fragt nach deinem Lieblingsort im Viertel — du empfiehlst dein Café und erklärst kurz warum.', en: 'Your neighbor asks for your favorite spot in the neighborhood — recommend your cafe and briefly explain why.' },
    pedagogicalGoal: 'Eine Ortsvorliebe mit cerca und tranquilo begründen.',
    targetText: 'Prefiero este café porque está cerca y es tranquilo.', baseText: { de: 'Ich bevorzuge dieses Café, weil es nah ist und ruhig ist.', en: 'I prefer this cafe because it is nearby and quiet.' },
    chunks: [{ targetText: 'Prefiero este café', baseText: { de: 'Ich bevorzuge dieses Café', en: 'I prefer this cafe' } }, { targetText: 'porque está cerca', baseText: { de: 'weil es nah ist', en: 'because it is nearby' } }, { targetText: 'y es tranquilo.', baseText: { de: 'und ruhig ist.', en: 'and it is quiet.' } }],
    terms: [{ targetText: 'prefiero', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }, { targetText: 'cerca', baseText: { de: 'nah', en: 'nearby' } }, { targetText: 'tranquilo', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'café', baseText: { de: 'Café', en: 'cafe' } }, { targetText: 'porque', baseText: { de: 'weil', en: 'because' } }],
    recall: { before: 'Prefiero este café porque está ', answer: 'cerca', after: ' y es tranquilo.', fallbackChoices: ['cerca', 'abierto', 'grande', 'nuevo'] }, speakRequired: ['café', 'cerca', 'tranquilo'],
    sceneCaption: { de: 'Deine Nachbarin fragt beim Spaziergang: „¿Cuál es su lugar favorito por aquí?“', en: 'Your neighbor asks while you walk: “¿Cuál es su lugar favorito por aquí?”' },
    trophyWord: { word: 'cerca', meaning: { de: 'nah', en: 'nearby' }, example: 'El café está cerca de casa.', whyThisWord: { de: 'cerca macht deine Empfehlung im Viertel sofort praktisch.', en: 'cerca makes your neighborhood recommendation immediately practical.' } },
    distractors: ['Prefiero otro café', 'porque es grande.'], placeholderCaption: { de: 'Ruhiges Café an einer Wohnstraße.', en: 'Quiet cafe on a residential street.' }, songMood: 'neighborhood favorite', visualNotes: 'Cozy cafe exterior, neighbor conversation, familiar street.',
  }),
]

export const SPANISH_A2_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makeSpanishA2PracticalLessons(
  GUIDED_TODAY_PATH_SPANISH_A2_TWO_METADATA, spanishA2Practical2Inputs,
  { de: 'Du hast Spanisch A2 Praxis 2 abgeschlossen — du kannst Vorlieben begründen und einfache Vergleiche ziehen.', en: 'You have completed Spanish A2 Practical 2 — you can give reasons for preferences and make simple comparisons.' },
)

export const GUIDED_TODAY_PATH_SPANISH_A2_THREE_METADATA: GuidedPathMetadata = {
  id: 'spanish-a2-practical-3', title: 'Spanish A2 Practical 3', shortTitle: 'A2 Practical 3',
  subtitle: { de: 'Gestern und gerade eben: erste Vergangenheitsformen', en: 'Yesterday and just now: first past forms' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Spanish', estimatedMinutes: 5,
}

const spanishA2Practical3Inputs: SpanishA2LessonInput[] = [
  makeSpanishA2CompactLesson({
    slug: 'ya-he-pagado', title: { de: 'Schon bezahlt', en: 'Already paid' }, situation: { de: 'An der Kasse fragt der Kassierer, ob du bezahlen möchtest — du sagst, dass du es schon getan hast.', en: 'At the counter, the cashier asks whether you want to pay — say that you have already done so.' }, pedagogicalGoal: 'Das Perfekt mit ya he pagado klar und höflich einsetzen.',
    targetText: 'Ya he pagado en la caja.', baseText: { de: 'Ich habe schon an der Kasse bezahlt.', en: 'I have already paid at the counter.' }, chunks: [{ targetText: 'Ya', baseText: { de: 'Schon', en: 'Already' } }, { targetText: 'he pagado', baseText: { de: 'habe ich bezahlt', en: 'I have paid' } }, { targetText: 'en la caja.', baseText: { de: 'an der Kasse.', en: 'at the counter.' } }], terms: [{ targetText: 'ya', baseText: { de: 'schon', en: 'already' } }, { targetText: 'he pagado', baseText: { de: 'ich habe bezahlt', en: 'I have paid' } }, { targetText: 'caja', baseText: { de: 'Kasse', en: 'counter' } }, { targetText: 'pagado', baseText: { de: 'bezahlt', en: 'paid' } }, { targetText: 'en la caja', baseText: { de: 'an der Kasse', en: 'at the counter' } }], recall: { before: 'Ya he ', answer: 'pagado', after: ' en la caja.', fallbackChoices: ['pagado', 'pedido', 'comprado', 'llegado'] }, speakRequired: ['pagado', 'caja', 'ya'], sceneCaption: { de: 'Der Kassierer fragt: „¿Quiere pagar aquí?“', en: 'The cashier asks: “¿Quiere pagar aquí?”' }, trophyWord: { word: 'pagado', meaning: { de: 'bezahlt', en: 'paid' }, example: 'Ya he pagado la cuenta.', whyThisWord: { de: 'pagado löst die häufige Situation, in der du schon bezahlt hast.', en: 'pagado handles the common situation where you have already paid.' } }, distractors: ['Quiero pagar ahora', 'con tarjeta, por favor.'], placeholderCaption: { de: 'Kassentresen mit einer Quittung.', en: 'Checkout counter with a receipt.' }, songMood: 'quick counter confirmation', visualNotes: 'Small shop counter, receipt in hand.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'llegue-ayer-al-hotel', title: { de: 'Ankunft gestern', en: 'Arrived yesterday' }, situation: { de: 'An der Hotelrezeption fragt man, wann du angekommen bist — du nennst den gestrigen Abend.', en: 'At hotel reception, you are asked when you arrived — name yesterday evening.' }, pedagogicalGoal: 'Das Indefinido llegué mit dem Zeitmarker ayer verwenden.',
    targetText: 'Llegué ayer por la noche al hotel.', baseText: { de: 'Ich kam gestern Abend im Hotel an.', en: 'I arrived at the hotel yesterday evening.' }, chunks: [{ targetText: 'Llegué ayer', baseText: { de: 'Ich kam gestern an', en: 'I arrived yesterday' } }, { targetText: 'por la noche', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: 'al hotel.', baseText: { de: 'im Hotel.', en: 'at the hotel.' } }], terms: [{ targetText: 'llegué', baseText: { de: 'ich kam an', en: 'I arrived' } }, { targetText: 'ayer', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'por la noche', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: 'hotel', baseText: { de: 'Hotel', en: 'hotel' } }, { targetText: 'ayer por la noche', baseText: { de: 'gestern Abend', en: 'yesterday evening' } }], recall: { before: '', answer: 'Llegué', after: ' ayer por la noche al hotel.', fallbackChoices: ['Llegué', 'Fui', 'Estuve', 'Pagué'] }, speakRequired: ['llegué', 'ayer', 'hotel'], sceneCaption: { de: 'Die Rezeptionistin fragt: „¿Cuándo llegó al hotel?“', en: 'The receptionist asks: “¿Cuándo llegó al hotel?”' }, trophyWord: { word: 'llegué', meaning: { de: 'ich kam an', en: 'I arrived' }, example: 'Llegué ayer por la mañana.', whyThisWord: { de: 'llegué verbindet eine klare Ankunft mit einem klaren Zeitpunkt.', en: 'llegué connects a clear arrival with a clear time.' } }, distractors: ['Llego esta tarde', 'al hotel nuevo.'], placeholderCaption: { de: 'Hotelrezeption bei Abendlicht.', en: 'Hotel reception in evening light.' }, songMood: 'arrival memory', visualNotes: 'Hotel lobby, suitcase, evening arrival.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'ya-he-pedido-la-sopa', title: { de: 'Schon bestellt', en: 'Already ordered' }, situation: { de: 'Die Bedienung fragt, ob du bereit bist zu bestellen — du hast deine Wahl schon getroffen.', en: 'The server asks whether you are ready to order — you have already made your choice.' }, pedagogicalGoal: 'Mit ya he pedido ausdrücken, dass die Bestellung bereits erledigt ist.',
    targetText: 'Ya he pedido la sopa, gracias.', baseText: { de: 'Ich habe die Suppe schon bestellt, danke.', en: 'I have already ordered the soup, thank you.' }, chunks: [{ targetText: 'Ya', baseText: { de: 'Schon', en: 'Already' } }, { targetText: 'he pedido', baseText: { de: 'habe ich bestellt', en: 'I have ordered' } }, { targetText: 'la sopa,', baseText: { de: 'die Suppe,', en: 'the soup,' } }, { targetText: 'gracias.', baseText: { de: 'danke.', en: 'thank you.' } }], terms: [{ targetText: 'he pedido', baseText: { de: 'ich habe bestellt', en: 'I have ordered' } }, { targetText: 'sopa', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'ya', baseText: { de: 'schon', en: 'already' } }, { targetText: 'pedido', baseText: { de: 'bestellt', en: 'ordered' } }, { targetText: 'gracias', baseText: { de: 'danke', en: 'thank you' } }], recall: { before: 'Ya he ', answer: 'pedido', after: ' la sopa, gracias.', fallbackChoices: ['pedido', 'pagado', 'comido', 'visto'] }, speakRequired: ['pedido', 'sopa', 'ya'], sceneCaption: { de: 'Die Bedienung kommt an den Tisch und fragt: „¿Ya sabe qué quiere?“', en: 'The server comes to the table and asks: “¿Ya sabe qué quiere?”' }, trophyWord: { word: 'pedido', meaning: { de: 'bestellt', en: 'ordered' }, example: 'Ya he pedido el menú.', whyThisWord: { de: 'pedido zeigt knapp, dass deine Restaurantbestellung schon erledigt ist.', en: 'pedido neatly shows that your restaurant order is already done.' } }, distractors: ['Quiero pedir ahora', 'la sopa del día.'], placeholderCaption: { de: 'Restauranttisch mit Speisekarte und Suppenschale.', en: 'Restaurant table with a menu and soup bowl.' }, songMood: 'settled restaurant order', visualNotes: 'Restaurant table, menu closed, relaxed reply.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'hoy-he-comprado-tomates', title: { de: 'Tomaten gekauft', en: 'Bought tomatoes' }, situation: { de: 'Deine Nachbarin fragt, ob du schon auf dem Markt warst — du erzählst, was du heute gekauft hast.', en: 'Your neighbor asks whether you have been to the market yet — say what you bought today.' }, pedagogicalGoal: 'Mit hoy he comprado eine heutige Erledigung im Perfekt ausdrücken.',
    targetText: 'Hoy he comprado tomates en el mercado.', baseText: { de: 'Heute habe ich Tomaten auf dem Markt gekauft.', en: 'Today I bought tomatoes at the market.' }, chunks: [{ targetText: 'Hoy he comprado', baseText: { de: 'Heute habe ich gekauft', en: 'Today I bought' } }, { targetText: 'tomates', baseText: { de: 'Tomaten', en: 'tomatoes' } }, { targetText: 'en el mercado.', baseText: { de: 'auf dem Markt.', en: 'at the market.' } }], terms: [{ targetText: 'he comprado', baseText: { de: 'ich habe gekauft', en: 'I have bought' } }, { targetText: 'tomates', baseText: { de: 'Tomaten', en: 'tomatoes' } }, { targetText: 'mercado', baseText: { de: 'Markt', en: 'market' } }, { targetText: 'hoy', baseText: { de: 'heute', en: 'today' } }, { targetText: 'comprado', baseText: { de: 'gekauft', en: 'bought' } }], recall: { before: 'Hoy he ', answer: 'comprado', after: ' tomates en el mercado.', fallbackChoices: ['comprado', 'pagado', 'pedido', 'terminado'] }, speakRequired: ['comprado', 'tomates', 'mercado'], sceneCaption: { de: 'Deine Nachbarin fragt mit Einkaufstasche: „¿Ha ido al mercado hoy?“', en: 'Your neighbor asks with a shopping bag: “¿Ha ido al mercado hoy?”' }, trophyWord: { word: 'comprado', meaning: { de: 'gekauft', en: 'bought' }, example: 'He comprado fruta hoy.', whyThisWord: { de: 'comprado macht einen Marktbesuch als heutige, abgeschlossene Handlung greifbar.', en: 'comprado makes a market visit tangible as a completed action today.' } }, distractors: ['Voy al mercado', 'para comprar tomates.'], placeholderCaption: { de: 'Markttasche mit Tomaten.', en: 'Market bag with tomatoes.' }, songMood: 'morning market update', visualNotes: 'Paper bag of tomatoes, neighbor chat on stairs.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'esta-manana-fui-al-mercado', title: { de: 'Heute Morgen', en: 'This morning' }, situation: { de: 'Dein Nachbar fragt, wann du auf dem Markt warst — du nennst den Morgen.', en: 'Your neighbor asks when you went to the market — name the morning.' }, pedagogicalGoal: 'Das Indefinido fui mit esta mañana sicher einsetzen.',
    targetText: 'Esta mañana fui al mercado temprano.', baseText: { de: 'Heute Morgen ging ich früh zum Markt.', en: 'This morning I went to the market early.' }, chunks: [{ targetText: 'Esta mañana', baseText: { de: 'Heute Morgen', en: 'This morning' } }, { targetText: 'fui', baseText: { de: 'ging ich', en: 'I went' } }, { targetText: 'al mercado', baseText: { de: 'zum Markt', en: 'to the market' } }, { targetText: 'temprano.', baseText: { de: 'früh.', en: 'early.' } }], terms: [{ targetText: 'fui', baseText: { de: 'ich ging', en: 'I went' } }, { targetText: 'esta mañana', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: 'mercado', baseText: { de: 'Markt', en: 'market' } }, { targetText: 'temprano', baseText: { de: 'früh', en: 'early' } }, { targetText: 'al mercado', baseText: { de: 'zum Markt', en: 'to the market' } }], recall: { before: 'Esta mañana ', answer: 'fui', after: ' al mercado temprano.', fallbackChoices: ['fui', 'llegué', 'estuve', 'pagué'] }, speakRequired: ['fui', 'mercado', 'temprano'], sceneCaption: { de: 'Dein Nachbar fragt: „¿Cuándo fue al mercado?“', en: 'Your neighbor asks: “¿Cuándo fue al mercado?”' }, trophyWord: { word: 'temprano', meaning: { de: 'früh', en: 'early' }, example: 'Fui temprano al mercado.', whyThisWord: { de: 'temprano gibt deiner abgeschlossenen Markt-Routine eine genaue Zeitfarbe.', en: 'temprano gives your completed market routine a precise time feel.' } }, distractors: ['Voy al mercado', 'por la tarde.'], placeholderCaption: { de: 'Früher Markt mit offenen Ständen.', en: 'Early market with open stalls.' }, songMood: 'early market walk', visualNotes: 'Morning light, market stalls just opening.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'ayer-estuve-mal', title: { de: 'Gestern nicht gut', en: 'Not well yesterday' }, situation: { de: 'Deine Nachbarin fragt, warum du gestern nicht draußen warst — du sagst kurz, dass es dir heute besser geht.', en: 'Your neighbor asks why you were not out yesterday — briefly say that you are better today.' }, pedagogicalGoal: 'Mit estuve einen vergangenen Zustand nennen und zur Gegenwart zurückkehren.',
    targetText: 'Ayer estuve mal, pero hoy estoy mejor.', baseText: { de: 'Gestern ging es mir schlecht, aber heute geht es mir besser.', en: 'Yesterday I was unwell, but today I am better.' }, chunks: [{ targetText: 'Ayer estuve mal,', baseText: { de: 'Gestern ging es mir schlecht,', en: 'Yesterday I was unwell,' } }, { targetText: 'pero hoy', baseText: { de: 'aber heute', en: 'but today' } }, { targetText: 'estoy mejor.', baseText: { de: 'geht es mir besser.', en: 'I am better.' } }], terms: [{ targetText: 'estuve', baseText: { de: 'ich war', en: 'I was' } }, { targetText: 'ayer', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'mal', baseText: { de: 'schlecht', en: 'unwell' } }, { targetText: 'hoy', baseText: { de: 'heute', en: 'today' } }, { targetText: 'estoy', baseText: { de: 'ich bin', en: 'I am' } }], recall: { before: 'Ayer ', answer: 'estuve', after: ' mal, pero hoy estoy mejor.', fallbackChoices: ['estuve', 'fui', 'llegué', 'comí'] }, speakRequired: ['estuve', 'mal', 'mejor'], sceneCaption: { de: 'Deine Nachbarin fragt besorgt: „¿Está mejor hoy?“', en: 'Your neighbor asks with concern: “¿Está mejor hoy?”' }, trophyWord: { word: 'estuve', meaning: { de: 'ich war', en: 'I was' }, example: 'Ayer estuve en casa.', whyThisWord: { de: 'estuve verbindet einen abgeschlossenen gestrigen Zustand mit dem Heute.', en: 'estuve connects a finished state yesterday with today.' } }, distractors: ['Hoy estoy mal', 'y no salgo.'], placeholderCaption: { de: 'Nachbarin im Hausflur mit besorgtem Blick.', en: 'Neighbor in a hallway with a concerned look.' }, songMood: 'gentle recovery update', visualNotes: 'Warm hallway, reassuring neighbor conversation.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'ya-he-comido-el-plato', title: { de: 'Das typische Gericht', en: 'The local dish' }, situation: { de: 'Die Bedienung fragt, ob du das typische Gericht probieren möchtest — du hast es bereits gegessen.', en: 'The server asks whether you want to try the local dish — you have already eaten it.' }, pedagogicalGoal: 'Mit ya he comido auf eine Restaurantempfehlung im Perfekt reagieren.',
    targetText: 'Ya he comido el plato típico.', baseText: { de: 'Ich habe das typische Gericht schon gegessen.', en: 'I have already eaten the local dish.' }, chunks: [{ targetText: 'Ya', baseText: { de: 'Schon', en: 'Already' } }, { targetText: 'he comido', baseText: { de: 'habe ich gegessen', en: 'I have eaten' } }, { targetText: 'el plato típico.', baseText: { de: 'das typische Gericht.', en: 'the local dish.' } }], terms: [{ targetText: 'he comido', baseText: { de: 'ich habe gegessen', en: 'I have eaten' } }, { targetText: 'plato', baseText: { de: 'Gericht', en: 'dish' } }, { targetText: 'típico', baseText: { de: 'typisch', en: 'local' } }, { targetText: 'ya', baseText: { de: 'schon', en: 'already' } }, { targetText: 'comido', baseText: { de: 'gegessen', en: 'eaten' } }], recall: { before: 'Ya he ', answer: 'comido', after: ' el plato típico.', fallbackChoices: ['comido', 'pedido', 'visto', 'hecho'] }, speakRequired: ['comido', 'plato', 'típico'], sceneCaption: { de: 'Die Bedienung empfiehlt: „¿Quiere probar el plato típico?“', en: 'The server recommends: “¿Quiere probar el plato típico?”' }, trophyWord: { word: 'típico', meaning: { de: 'typisch', en: 'local' }, example: 'Es un plato típico de aquí.', whyThisWord: { de: 'típico macht klar, dass es um die lokale Spezialität geht.', en: 'típico makes clear that this is the local specialty.' } }, distractors: ['Quiero comer ahora', 'la sopa del día.'], placeholderCaption: { de: 'Typisches Gericht auf einem Restauranttisch.', en: 'Local dish on a restaurant table.' }, songMood: 'local food milestone', visualNotes: 'Colorful local dish, server’s friendly recommendation.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'todavia-no-he-visto-la-catedral', title: { de: 'Noch nicht die Kathedrale', en: 'The cathedral, not yet' }, situation: { de: 'Ein Nachbar fragt, ob du die Kathedrale schon gesehen hast — du sagst, dass sie noch auf deiner Liste steht.', en: 'A neighbor asks whether you have seen the cathedral yet — say it is still on your list.' }, pedagogicalGoal: 'Mit todavía no he visto eine offene Erfahrung im Perfekt ausdrücken.',
    targetText: 'Todavía no he visto la catedral.', baseText: { de: 'Ich habe die Kathedrale noch nicht gesehen.', en: 'I have not seen the cathedral yet.' }, chunks: [{ targetText: 'Todavía no', baseText: { de: 'Noch nicht', en: 'Not yet' } }, { targetText: 'he visto', baseText: { de: 'habe ich gesehen', en: 'have I seen' } }, { targetText: 'la catedral.', baseText: { de: 'die Kathedrale.', en: 'the cathedral.' } }], terms: [{ targetText: 'todavía', baseText: { de: 'noch', en: 'yet' } }, { targetText: 'he visto', baseText: { de: 'ich habe gesehen', en: 'I have seen' } }, { targetText: 'catedral', baseText: { de: 'Kathedrale', en: 'cathedral' } }, { targetText: 'no', baseText: { de: 'nicht', en: 'not' } }, { targetText: 'visto', baseText: { de: 'gesehen', en: 'seen' } }], recall: { before: '', answer: 'Todavía', after: ' no he visto la catedral.', fallbackChoices: ['Todavía', 'Siempre', 'Ahora', 'Ayer'] }, speakRequired: ['todavía', 'visto', 'catedral'], sceneCaption: { de: 'Dein Nachbar fragt: „¿Ya ha visto la catedral?“', en: 'Your neighbor asks: “¿Ya ha visto la catedral?”' }, trophyWord: { word: 'todavía', meaning: { de: 'noch', en: 'yet' }, example: 'Todavía no he visto el museo.', whyThisWord: { de: 'todavía hält die Erfahrung offen, ohne dass du dich erklären musst.', en: 'todavía keeps the experience open without needing an explanation.' } }, distractors: ['Ya he visto', 'la plaza grande.'], placeholderCaption: { de: 'Kathedrale hinter einem Stadtplatz.', en: 'Cathedral beyond a city square.' }, songMood: 'curious city list', visualNotes: 'Cathedral in the distance, map in hand.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'hoy-he-terminado-temprano', title: { de: 'Früh fertig', en: 'Finished early' }, situation: { de: 'Deine Nachbarin fragt, ob du jetzt Zeit hast — du erklärst, dass du heute früh mit der Arbeit fertig warst.', en: 'Your neighbor asks whether you have time now — explain that you finished work early today.' }, pedagogicalGoal: 'Mit he terminado eine heutige, abgeschlossene Arbeitsaufgabe nennen.',
    targetText: 'Hoy he terminado temprano el trabajo.', baseText: { de: 'Heute habe ich die Arbeit früh beendet.', en: 'Today I finished work early.' }, chunks: [{ targetText: 'Hoy he terminado', baseText: { de: 'Heute habe ich beendet', en: 'Today I finished' } }, { targetText: 'temprano', baseText: { de: 'früh', en: 'early' } }, { targetText: 'el trabajo.', baseText: { de: 'die Arbeit.', en: 'the work.' } }], terms: [{ targetText: 'he terminado', baseText: { de: 'ich habe beendet', en: 'I have finished' } }, { targetText: 'temprano', baseText: { de: 'früh', en: 'early' } }, { targetText: 'trabajo', baseText: { de: 'Arbeit', en: 'work' } }, { targetText: 'hoy', baseText: { de: 'heute', en: 'today' } }, { targetText: 'terminado', baseText: { de: 'beendet', en: 'finished' } }], recall: { before: 'Hoy he ', answer: 'terminado', after: ' temprano el trabajo.', fallbackChoices: ['terminado', 'comprado', 'pagado', 'pedido'] }, speakRequired: ['terminado', 'temprano', 'trabajo'], sceneCaption: { de: 'Deine Nachbarin fragt: „¿Tiene tiempo ahora?“', en: 'Your neighbor asks: “¿Tiene tiempo ahora?”' }, trophyWord: { word: 'terminado', meaning: { de: 'beendet', en: 'finished' }, example: 'He terminado el trabajo.', whyThisWord: { de: 'terminado verwandelt einen freien Nachmittag in eine klare Antwort.', en: 'terminado turns a free afternoon into a clear reply.' } }, distractors: ['Termino mañana', 'el trabajo largo.'], placeholderCaption: { de: 'Schreibtisch nach einem frühen Arbeitsende.', en: 'Desk after an early end to the workday.' }, songMood: 'early finish relief', visualNotes: 'Tidy desk, daylight still outside, relaxed departure.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'esta-semana-he-hecho-muchas-cosas', title: { de: 'Eine volle Woche', en: 'A full week' }, situation: { de: 'Deine Nachbarin fragt, wie deine Woche war — du fasst deine vielen erledigten Dinge kurz zusammen.', en: 'Your neighbor asks how your week has been — briefly sum up the many things you have done.' }, pedagogicalGoal: 'Mit esta semana he hecho eine Woche im Perfekt zusammenfassen.',
    targetText: 'Esta semana he hecho muchas cosas.', baseText: { de: 'Diese Woche habe ich viele Dinge gemacht.', en: 'This week I have done many things.' }, chunks: [{ targetText: 'Esta semana', baseText: { de: 'Diese Woche', en: 'This week' } }, { targetText: 'he hecho', baseText: { de: 'habe ich gemacht', en: 'I have done' } }, { targetText: 'muchas cosas.', baseText: { de: 'viele Dinge.', en: 'many things.' } }], terms: [{ targetText: 'esta semana', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: 'he hecho', baseText: { de: 'ich habe gemacht', en: 'I have done' } }, { targetText: 'muchas cosas', baseText: { de: 'viele Dinge', en: 'many things' } }, { targetText: 'hecho', baseText: { de: 'gemacht', en: 'done' } }, { targetText: 'semana', baseText: { de: 'Woche', en: 'week' } }], recall: { before: 'Esta semana he ', answer: 'hecho', after: ' muchas cosas.', fallbackChoices: ['hecho', 'visto', 'comido', 'llegado'] }, speakRequired: ['semana', 'hecho', 'cosas'], sceneCaption: { de: 'Deine Nachbarin fragt: „¿Qué ha hecho esta semana?“', en: 'Your neighbor asks: “¿Qué ha hecho esta semana?”' }, trophyWord: { word: 'cosas', meaning: { de: 'Dinge', en: 'things' }, example: 'He hecho muchas cosas hoy.', whyThisWord: { de: 'cosas fasst eine volle, aber einfache Woche ganz natürlich zusammen.', en: 'cosas naturally sums up a full but simple week.' } }, distractors: ['Esta semana voy', 'a hacer más.'], placeholderCaption: { de: 'Nachbarngespräch mit Wochenplan auf einem Tisch.', en: 'Neighbor conversation with a weekly plan on a table.' }, songMood: 'busy week recap', visualNotes: 'Weekly notes, friendly doorstep catch-up.',
  }),
]

export const SPANISH_A2_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makeSpanishA2PracticalLessons(
  GUIDED_TODAY_PATH_SPANISH_A2_THREE_METADATA, spanishA2Practical3Inputs,
  { de: 'Du hast Spanisch A2 Praxis 3 abgeschlossen — du kannst erste abgeschlossene Erlebnisse klar einordnen.', en: 'You have completed Spanish A2 Practical 3 — you can clearly place your first completed experiences in time.' },
)

export const GUIDED_TODAY_PATH_SPANISH_A2_FOUR_METADATA: GuidedPathMetadata = {
  id: 'spanish-a2-practical-4', title: 'Spanish A2 Practical 4', shortTitle: 'A2 Practical 4',
  subtitle: { de: 'Pläne machen und freundlich ändern', en: 'Making plans and changing them politely' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Spanish', estimatedMinutes: 5,
}

const spanishA2Practical4Inputs: SpanishA2LessonInput[] = [
  makeSpanishA2CompactLesson({
    slug: 'vamos-a-tomar-un-cafe', title: { de: 'Kaffee um fünf', en: 'Coffee at five' }, situation: { de: 'Deine Nachbarin lädt dich auf einen Kaffee ein — du nimmst an und schlägst eine Uhrzeit vor.', en: 'Your neighbor invites you for coffee — accept and suggest a time.' }, pedagogicalGoal: 'Eine Einladung mit vamos a + Infinitiv und Uhrzeit annehmen.',
    targetText: 'Sí, vamos a tomar un café a las cinco.', baseText: { de: 'Ja, wir gehen um fünf einen Kaffee trinken.', en: 'Yes, let’s have a coffee at five.' }, chunks: [{ targetText: 'Sí, vamos a tomar', baseText: { de: 'Ja, wir gehen trinken', en: 'Yes, let’s have' } }, { targetText: 'un café', baseText: { de: 'einen Kaffee', en: 'a coffee' } }, { targetText: 'a las cinco.', baseText: { de: 'um fünf.', en: 'at five.' } }], terms: [{ targetText: 'vamos a tomar', baseText: { de: 'wir gehen trinken', en: 'let’s have' } }, { targetText: 'café', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'a las cinco', baseText: { de: 'um fünf', en: 'at five' } }, { targetText: 'tomar', baseText: { de: 'nehmen', en: 'to have' } }, { targetText: 'cinco', baseText: { de: 'fünf', en: 'five' } }], recall: { before: 'Sí, vamos a ', answer: 'tomar', after: ' un café a las cinco.', fallbackChoices: ['tomar', 'comer', 'ir', 'llegar'] }, speakRequired: ['tomar', 'café', 'cinco'], sceneCaption: { de: 'Deine Nachbarin fragt: „¿Tomamos un café esta tarde?“', en: 'Your neighbor asks: “¿Tomamos un café esta tarde?”' }, trophyWord: { word: 'tomar', meaning: { de: 'nehmen, trinken', en: 'to have, drink' }, example: 'Vamos a tomar un café.', whyThisWord: { de: 'tomar macht eine Kaffeeeinladung im Spanischen ganz selbstverständlich.', en: 'tomar makes a coffee invitation sound completely natural in Spanish.' } }, distractors: ['Vamos a cenar', 'a las ocho.'], placeholderCaption: { de: 'Caféterrasse am späten Nachmittag.', en: 'Cafe terrace in the late afternoon.' }, songMood: 'friendly coffee plan', visualNotes: 'Neighborly cafe invitation, late afternoon light.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'manana-voy-a-visitar-el-museo', title: { de: 'Morgen ins Museum', en: 'Museum tomorrow' }, situation: { de: 'Ein Nachbar fragt nach deinen Plänen für morgen — du erzählst vom Museum.', en: 'A neighbor asks about your plans for tomorrow — tell them about the museum.' }, pedagogicalGoal: 'Einen nahen Plan mit voy a + Infinitiv formulieren.',
    targetText: 'Mañana voy a visitar el museo.', baseText: { de: 'Morgen werde ich das Museum besuchen.', en: 'Tomorrow I am going to visit the museum.' }, chunks: [{ targetText: 'Mañana voy a', baseText: { de: 'Morgen werde ich', en: 'Tomorrow I am going to' } }, { targetText: 'visitar', baseText: { de: 'besuchen', en: 'visit' } }, { targetText: 'el museo.', baseText: { de: 'das Museum.', en: 'the museum.' } }], terms: [{ targetText: 'mañana', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'voy a visitar', baseText: { de: 'ich werde besuchen', en: 'I am going to visit' } }, { targetText: 'museo', baseText: { de: 'Museum', en: 'museum' } }, { targetText: 'visitar', baseText: { de: 'besuchen', en: 'to visit' } }, { targetText: 'voy a', baseText: { de: 'ich werde', en: 'I am going to' } }], recall: { before: 'Mañana voy a ', answer: 'visitar', after: ' el museo.', fallbackChoices: ['visitar', 'comprar', 'llamar', 'pagar'] }, speakRequired: ['visitar', 'museo', 'mañana'], sceneCaption: { de: 'Dein Nachbar fragt: „¿Qué va a hacer mañana?“', en: 'Your neighbor asks: “¿Qué va a hacer mañana?”' }, trophyWord: { word: 'visitar', meaning: { de: 'besuchen', en: 'to visit' }, example: 'Voy a visitar el museo mañana.', whyThisWord: { de: 'visitar macht einen konkreten Plan für einen Ort leicht ausdrückbar.', en: 'visitar makes a concrete plan for a place easy to express.' } }, distractors: ['Hoy voy a visitar', 'el parque grande.'], placeholderCaption: { de: 'Museumseingang mit Plakat.', en: 'Museum entrance with a poster.' }, songMood: 'curious museum plan', visualNotes: 'Museum facade, tomorrow’s plan on a phone.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'que-tal-si-vamos-al-cine', title: { de: 'Was ist mit Kino?', en: 'How about the cinema?' }, situation: { de: 'Dein Nachbar fragt, ob du am Freitag frei bist — du schlägst das Kino vor.', en: 'Your neighbor asks whether you are free on Friday — suggest the cinema.' }, pedagogicalGoal: 'Mit ¿Qué tal si…? einen einfachen Vorschlag machen.',
    targetText: '¿Qué tal si vamos al cine el viernes?', baseText: { de: 'Wie wäre es, wenn wir am Freitag ins Kino gehen?', en: 'How about going to the cinema on Friday?' }, chunks: [{ targetText: '¿Qué tal', baseText: { de: 'Wie wäre es', en: 'How about' } }, { targetText: 'si vamos', baseText: { de: 'wenn wir gehen', en: 'if we go' } }, { targetText: 'al cine', baseText: { de: 'ins Kino', en: 'to the cinema' } }, { targetText: 'el viernes?', baseText: { de: 'am Freitag?', en: 'on Friday?' } }], terms: [{ targetText: 'qué tal', baseText: { de: 'wie wäre es', en: 'how about' } }, { targetText: 'cine', baseText: { de: 'Kino', en: 'cinema' } }, { targetText: 'viernes', baseText: { de: 'Freitag', en: 'Friday' } }, { targetText: 'vamos', baseText: { de: 'wir gehen', en: 'we go' } }, { targetText: 'al cine', baseText: { de: 'ins Kino', en: 'to the cinema' } }], recall: { before: '¿Qué tal si vamos al cine el ', answer: 'viernes', after: '?', fallbackChoices: ['viernes', 'sábado', 'lunes', 'martes'] }, speakRequired: ['cine', 'viernes', 'vamos'], sceneCaption: { de: 'Dein Nachbar fragt: „¿Está libre el viernes?“', en: 'Your neighbor asks: “¿Está libre el viernes?”' }, trophyWord: { word: 'viernes', meaning: { de: 'Freitag', en: 'Friday' }, example: 'El viernes vamos al cine.', whyThisWord: { de: 'viernes verankert einen Vorschlag an einem konkreten Wochentag.', en: 'viernes anchors a suggestion to a concrete day of the week.' } }, distractors: ['Vamos al cine', 'esta mañana.'], placeholderCaption: { de: 'Kinokasse mit Abendprogramm.', en: 'Cinema box office with an evening program.' }, songMood: 'playful friday suggestion', visualNotes: 'Cinema marquee, two neighbors making plans.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'perfecto-quedamos-a-las-ocho', title: { de: 'Um acht auf dem Platz', en: 'At eight in the square' }, situation: { de: 'Deine Nachbarin schlägt den Platz vor — du stimmst zu und bestätigst Uhrzeit und Ort.', en: 'Your neighbor suggests the square — agree and confirm the time and place.' }, pedagogicalGoal: 'Mit quedar eine Verabredung an Zeit und Ort festmachen.',
    targetText: 'Perfecto, quedamos a las ocho en la plaza.', baseText: { de: 'Perfekt, wir treffen uns um acht auf dem Platz.', en: 'Perfect, we will meet at eight in the square.' }, chunks: [{ targetText: 'Perfecto, quedamos', baseText: { de: 'Perfekt, wir treffen uns', en: 'Perfect, we will meet' } }, { targetText: 'a las ocho', baseText: { de: 'um acht', en: 'at eight' } }, { targetText: 'en la plaza.', baseText: { de: 'auf dem Platz.', en: 'in the square.' } }], terms: [{ targetText: 'perfecto', baseText: { de: 'perfekt', en: 'perfect' } }, { targetText: 'quedamos', baseText: { de: 'wir treffen uns', en: 'we will meet' } }, { targetText: 'ocho', baseText: { de: 'acht', en: 'eight' } }, { targetText: 'plaza', baseText: { de: 'Platz', en: 'square' } }, { targetText: 'a las ocho', baseText: { de: 'um acht', en: 'at eight' } }], recall: { before: 'Perfecto, quedamos a las ', answer: 'ocho', after: ' en la plaza.', fallbackChoices: ['ocho', 'cinco', 'nueve', 'dos'] }, speakRequired: ['quedamos', 'ocho', 'plaza'], sceneCaption: { de: 'Deine Nachbarin fragt: „¿Quedamos en la plaza a las ocho?“', en: 'Your neighbor asks: “¿Quedamos en la plaza a las ocho?”' }, trophyWord: { word: 'plaza', meaning: { de: 'Platz', en: 'square' }, example: 'La plaza está en el centro.', whyThisWord: { de: 'plaza verankert eure Verabredung an einem festen, sichtbaren Ort.', en: 'plaza anchors your arrangement to a fixed, visible place.' } }, distractors: ['Quedamos en el café', 'a las cinco.'], placeholderCaption: { de: 'Stadtplatz mit Uhr am Abend.', en: 'City square with a clock in the evening.' }, songMood: 'clear evening arrangement', visualNotes: 'Town square clock, friendly plan confirmed.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'le-va-bien-quedar-el-sabado', title: { de: 'Auf Samstag verschieben', en: 'Move it to Saturday' }, situation: { de: 'Der Freitag passt deiner Nachbarin nicht mehr — du schlägst höflich Samstag vor.', en: 'Friday no longer works for your neighbor — politely suggest Saturday.' }, pedagogicalGoal: 'Einen anderen Termin mit ¿Le va bien…? vorschlagen.',
    targetText: '¿Le va bien quedar el sábado?', baseText: { de: 'Passt es Ihnen, sich am Samstag zu treffen?', en: 'Would meeting on Saturday work for you?' }, chunks: [{ targetText: '¿Le va bien', baseText: { de: 'Passt es Ihnen', en: 'Would it work for you' } }, { targetText: 'quedar', baseText: { de: 'sich zu treffen', en: 'to meet' } }, { targetText: 'el sábado?', baseText: { de: 'am Samstag?', en: 'on Saturday?' } }], terms: [{ targetText: 'le va bien', baseText: { de: 'passt es Ihnen', en: 'does it work for you' } }, { targetText: 'quedar', baseText: { de: 'sich treffen', en: 'to meet' } }, { targetText: 'sábado', baseText: { de: 'Samstag', en: 'Saturday' } }, { targetText: 'bien', baseText: { de: 'gut', en: 'well' } }, { targetText: 'el sábado', baseText: { de: 'am Samstag', en: 'on Saturday' } }], recall: { before: '¿Le va bien quedar el ', answer: 'sábado', after: '?', fallbackChoices: ['sábado', 'viernes', 'lunes', 'jueves'] }, speakRequired: ['quedar', 'sábado', 'bien'], sceneCaption: { de: 'Deine Nachbarin entschuldigt sich: „El viernes no puedo.“', en: 'Your neighbor apologizes: “El viernes no puedo.”' }, trophyWord: { word: 'sábado', meaning: { de: 'Samstag', en: 'Saturday' }, example: 'El sábado me va bien.', whyThisWord: { de: 'sábado bietet eine einfache, höfliche neue Option für einen Plan.', en: 'sábado offers a simple, polite new option for a plan.' } }, distractors: ['¿Le va bien hoy?', 'Quedamos mañana.'], placeholderCaption: { de: 'Kalender mit Freitag und Samstag.', en: 'Calendar showing Friday and Saturday.' }, songMood: 'gentle reschedule', visualNotes: 'Calendar, two dates, considerate neighbor exchange.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'lo-siento-no-puedo-ir', title: { de: 'Heute absagen', en: 'Cancel today' }, situation: { de: 'Deine Nachbarin wartet auf dich, aber du hast zu viel Arbeit — du sagst höflich ab.', en: 'Your neighbor is expecting you, but you have too much work — cancel politely.' }, pedagogicalGoal: 'Eine Verabredung mit Lo siento und einem einfachen Grund freundlich absagen.',
    targetText: 'Lo siento, no puedo ir. Tengo mucho trabajo.', baseText: { de: 'Es tut mir leid, ich kann nicht kommen. Ich habe viel Arbeit.', en: 'I’m sorry, I cannot make it. I have a lot of work.' }, chunks: [{ targetText: 'Lo siento,', baseText: { de: 'Es tut mir leid,', en: 'I’m sorry,' } }, { targetText: 'no puedo ir.', baseText: { de: 'ich kann nicht kommen.', en: 'I cannot make it.' } }, { targetText: 'Tengo mucho trabajo.', baseText: { de: 'Ich habe viel Arbeit.', en: 'I have a lot of work.' } }], terms: [{ targetText: 'lo siento', baseText: { de: 'es tut mir leid', en: 'I’m sorry' } }, { targetText: 'no puedo', baseText: { de: 'ich kann nicht', en: 'I cannot' } }, { targetText: 'ir', baseText: { de: 'gehen', en: 'to go' } }, { targetText: 'mucho trabajo', baseText: { de: 'viel Arbeit', en: 'a lot of work' } }, { targetText: 'tengo', baseText: { de: 'ich habe', en: 'I have' } }], recall: { before: 'Lo siento, no puedo ir. Tengo mucho ', answer: 'trabajo', after: '.', fallbackChoices: ['trabajo', 'tiempo', 'dinero', 'sueño'] }, speakRequired: ['siento', 'puedo', 'trabajo'], sceneCaption: { de: 'Deine Nachbarin schreibt: „¿Nos vemos ahora?“', en: 'Your neighbor writes: “¿Nos vemos ahora?”' }, trophyWord: { word: 'trabajo', meaning: { de: 'Arbeit', en: 'work' }, example: 'Tengo mucho trabajo hoy.', whyThisWord: { de: 'trabajo gibt einer höflichen Absage einen klaren, neutralen Grund.', en: 'trabajo gives a polite cancellation a clear, neutral reason.' } }, distractors: ['Lo siento, llego tarde', 'porque no puedo.'], placeholderCaption: { de: 'Handy mit Nachricht neben einem Schreibtisch.', en: 'Phone with a message beside a desk.' }, songMood: 'kind honest cancellation', visualNotes: 'Desk, phone message, considerate reply.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'le-invito-a-cenar-manana', title: { de: 'Einladung zum Essen', en: 'Dinner invitation' }, situation: { de: 'Deine Nachbarin hilft dir mit einer Adresse — du möchtest dich mit einer Einladung bedanken.', en: 'Your neighbor helps you with an address — you want to thank them with an invitation.' }, pedagogicalGoal: 'Mit Le invito a… eine höfliche Einladung aussprechen.',
    targetText: 'Le invito a cenar mañana en casa.', baseText: { de: 'Ich lade Sie morgen zum Abendessen zu mir ein.', en: 'I invite you to dinner at my place tomorrow.' }, chunks: [{ targetText: 'Le invito', baseText: { de: 'Ich lade Sie ein', en: 'I invite you' } }, { targetText: 'a cenar', baseText: { de: 'zum Abendessen', en: 'to dinner' } }, { targetText: 'mañana', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'en casa.', baseText: { de: 'bei mir.', en: 'at my place.' } }], terms: [{ targetText: 'le invito', baseText: { de: 'ich lade Sie ein', en: 'I invite you' } }, { targetText: 'cenar', baseText: { de: 'zu Abend essen', en: 'to have dinner' } }, { targetText: 'mañana', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'en casa', baseText: { de: 'bei mir', en: 'at my place' } }, { targetText: 'invito', baseText: { de: 'ich lade ein', en: 'I invite' } }], recall: { before: 'Le invito a ', answer: 'cenar', after: ' mañana en casa.', fallbackChoices: ['cenar', 'comer', 'tomar', 'salir'] }, speakRequired: ['invito', 'cenar', 'mañana'], sceneCaption: { de: 'Deine Nachbarin lächelt nach ihrer Hilfe: „No hay de qué.“', en: 'Your neighbor smiles after helping you: “No hay de qué.”' }, trophyWord: { word: 'cenar', meaning: { de: 'zu Abend essen', en: 'to have dinner' }, example: '¿Quiere cenar en casa mañana?', whyThisWord: { de: 'cenar verwandelt Dankbarkeit in eine warme, konkrete Einladung.', en: 'cenar turns gratitude into a warm, concrete invitation.' } }, distractors: ['Le invito al café', 'hoy por la tarde.'], placeholderCaption: { de: 'Gedeckter Esstisch in einer Wohnung.', en: 'Set dinner table in an apartment.' }, songMood: 'warm dinner invitation', visualNotes: 'Home table set for dinner, neighborly gratitude.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'voy-a-llegar-un-poco-tarde', title: { de: 'Ich komme etwas später', en: 'I’ll be a little late' }, situation: { de: 'Deine Nachbarin wartet schon am Platz — du schreibst ihr, dass du dich verspätest.', en: 'Your neighbor is already waiting in the square — message that you will be late.' }, pedagogicalGoal: 'Mit voy a llegar eine nahe Verspätung klar ankündigen.',
    targetText: 'Voy a llegar un poco tarde.', baseText: { de: 'Ich werde etwas spät kommen.', en: 'I am going to arrive a little late.' }, chunks: [{ targetText: 'Voy a llegar', baseText: { de: 'Ich werde kommen', en: 'I am going to arrive' } }, { targetText: 'un poco', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'tarde.', baseText: { de: 'spät.', en: 'late.' } }], terms: [{ targetText: 'voy a llegar', baseText: { de: 'ich werde kommen', en: 'I am going to arrive' } }, { targetText: 'un poco', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'tarde', baseText: { de: 'spät', en: 'late' } }, { targetText: 'llegar', baseText: { de: 'ankommen', en: 'to arrive' } }, { targetText: 'voy a', baseText: { de: 'ich werde', en: 'I am going to' } }], recall: { before: 'Voy a ', answer: 'llegar', after: ' un poco tarde.', fallbackChoices: ['llegar', 'salir', 'cenar', 'visitar'] }, speakRequired: ['llegar', 'poco', 'tarde'], sceneCaption: { de: 'Deine Nachbarin schreibt: „Ya estoy en la plaza.“', en: 'Your neighbor writes: “Ya estoy en la plaza.”' }, trophyWord: { word: 'llegar', meaning: { de: 'ankommen', en: 'to arrive' }, example: 'Voy a llegar tarde.', whyThisWord: { de: 'llegar macht eine kurze, höfliche Verspätungsnachricht möglich.', en: 'llegar makes a short, polite late-arrival message possible.' } }, distractors: ['Voy a llegar temprano', 'en la plaza.'], placeholderCaption: { de: 'Handykarte mit Weg zum Stadtplatz.', en: 'Phone map with a route to the city square.' }, songMood: 'quick late message', visualNotes: 'Phone in hand, walking quickly toward a square.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'entonces-quedamos-el-sabado', title: { de: 'Der neue Plan', en: 'The new plan' }, situation: { de: 'Deine Nachbarin fasst die Änderung zusammen — du wiederholst sie zur Bestätigung.', en: 'Your neighbor sums up the change — repeat it to confirm.' }, pedagogicalGoal: 'Einen geänderten Plan mit entonces und ¿no? sicher bestätigen.',
    targetText: 'Entonces quedamos el sábado a las ocho, ¿no?', baseText: { de: 'Dann treffen wir uns am Samstag um acht, oder?', en: 'So we are meeting on Saturday at eight, right?' }, chunks: [{ targetText: 'Entonces quedamos', baseText: { de: 'Dann treffen wir uns', en: 'So we are meeting' } }, { targetText: 'el sábado', baseText: { de: 'am Samstag', en: 'on Saturday' } }, { targetText: 'a las ocho,', baseText: { de: 'um acht,', en: 'at eight,' } }, { targetText: '¿no?', baseText: { de: 'oder?', en: 'right?' } }], terms: [{ targetText: 'entonces', baseText: { de: 'dann', en: 'so' } }, { targetText: 'quedamos', baseText: { de: 'wir treffen uns', en: 'we are meeting' } }, { targetText: 'sábado', baseText: { de: 'Samstag', en: 'Saturday' } }, { targetText: 'ocho', baseText: { de: 'acht', en: 'eight' } }, { targetText: 'a las ocho', baseText: { de: 'um acht', en: 'at eight' } }], recall: { before: '', answer: 'Entonces', after: ' quedamos el sábado a las ocho, ¿no?', fallbackChoices: ['Entonces', 'Ayer', 'Ahora', 'Nunca'] }, speakRequired: ['entonces', 'quedamos', 'sábado'], sceneCaption: { de: 'Deine Nachbarin sagt: „El sábado a las ocho está bien.“', en: 'Your neighbor says: “El sábado a las ocho está bien.”' }, trophyWord: { word: 'entonces', meaning: { de: 'dann', en: 'so' }, example: 'Entonces quedamos mañana.', whyThisWord: { de: 'entonces fasst einen neuen Plan in einem natürlichen Gesprächszug zusammen.', en: 'entonces sums up a new plan in a natural conversational turn.' } }, distractors: ['Quedamos el viernes', 'a las cinco, ¿no?'], placeholderCaption: { de: 'Zwei Nachrichten mit bestätigtem Termin.', en: 'Two messages confirming an arrangement.' }, songMood: 'plan neatly confirmed', visualNotes: 'Chat bubbles, calendar date and time confirmed.',
  }),
  makeSpanishA2CompactLesson({
    slug: 'este-fin-de-semana-voy-a-descansar', title: { de: 'Wochenendplan', en: 'Weekend plan' }, situation: { de: 'Deine Nachbarin fragt nach deinem Wochenende — du erzählst von deinem ruhigen Plan zu Hause.', en: 'Your neighbor asks about your weekend — tell them about your quiet plan at home.' }, pedagogicalGoal: 'Einen Wochenendplan mit voy a + Infinitiv abschließen.',
    targetText: 'Este fin de semana voy a descansar en casa.', baseText: { de: 'Dieses Wochenende werde ich mich zu Hause ausruhen.', en: 'This weekend I am going to rest at home.' }, chunks: [{ targetText: 'Este fin de semana', baseText: { de: 'Dieses Wochenende', en: 'This weekend' } }, { targetText: 'voy a descansar', baseText: { de: 'werde ich mich ausruhen', en: 'I am going to rest' } }, { targetText: 'en casa.', baseText: { de: 'zu Hause.', en: 'at home.' } }], terms: [{ targetText: 'fin de semana', baseText: { de: 'Wochenende', en: 'weekend' } }, { targetText: 'voy a descansar', baseText: { de: 'ich werde mich ausruhen', en: 'I am going to rest' } }, { targetText: 'en casa', baseText: { de: 'zu Hause', en: 'at home' } }, { targetText: 'descansar', baseText: { de: 'sich ausruhen', en: 'to rest' } }, { targetText: 'este', baseText: { de: 'dieses', en: 'this' } }], recall: { before: 'Este fin de semana voy a ', answer: 'descansar', after: ' en casa.', fallbackChoices: ['descansar', 'trabajar', 'llegar', 'cenar'] }, speakRequired: ['semana', 'descansar', 'casa'], sceneCaption: { de: 'Deine Nachbarin fragt: „¿Qué va a hacer este fin de semana?“', en: 'Your neighbor asks: “¿Qué va a hacer este fin de semana?”' }, trophyWord: { word: 'descansar', meaning: { de: 'sich ausruhen', en: 'to rest' }, example: 'Voy a descansar el domingo.', whyThisWord: { de: 'descansar schließt den Pfad mit einem einfachen, persönlichen Wochenendplan ab.', en: 'descansar closes the path with a simple personal weekend plan.' } }, distractors: ['Voy a visitar', 'el museo mañana.'], placeholderCaption: { de: 'Ruhige Wohnung mit Buch und Wochenendlicht.', en: 'Quiet apartment with a book and weekend light.' }, songMood: 'restful weekend plan', visualNotes: 'Cozy home, book and tea, unhurried weekend.',
  }),
]

export const SPANISH_A2_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makeSpanishA2PracticalLessons(
  GUIDED_TODAY_PATH_SPANISH_A2_FOUR_METADATA, spanishA2Practical4Inputs,
  { de: 'Du hast Spanisch A2 Praxis 4 abgeschlossen — du kannst Pläne machen, ändern und freundlich bestätigen.', en: 'You have completed Spanish A2 Practical 4 — you can make plans, change them, and confirm them politely.' },
)
