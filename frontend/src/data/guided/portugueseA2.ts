/**
 * Portuguese (Brazilian) A2 — the Regular tier (10 paths × 10 lessons), per
 * docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md (§4 integration, §5 authoring
 * contract) and the phase-2 spec in tmp\A2_PORTUGUESE_P1_P10_SPEC.md.
 *
 * Authoring contract highlights enforced in this module:
 * - BRAZILIAN Portuguese throughout (ônibus, trem, banheiro, celular, café da
 *   manhã), matching the A1 corpus and the pt-BR speak code. European forms
 *   (autocarro, comboio, casa de banho, telemóvel) are banned.
 * - Two-turn shape: sceneCaption carries the interlocutor's Portuguese line; the
 *   learner's corePhrase is the response.
 * - Register: você throughout, ALL paths (matches Portuguese A1); desculpe, not
 *   desculpa.
 * - Tense contract: present everywhere; pretérito perfeito only from the 1sg
 *   whitelist (P3/P9 + light recycling); ir + infinitive from P4. No
 *   "tenho pagado"-type compound forms (iterative meaning in BR).
 * - Gender-safe production: no speaker-gender-marked adjectives in learner lines
 *   (estou com sono / tenho muito trabalho); obrigado never blanked or trophied.
 * - Arbiter rejected removing obrigado from learner phrases and distractors
 *   (documented A1/A2 precedent); keep obrigado wherever it appears.
 * - Locale hygiene: every .de field German (real umlauts), every .en field
 *   English; quoted interlocutor Portuguese inside captions is the only
 *   Portuguese in base fields.
 * - Trophies unique across the entire Portuguese guided corpus (A1 + A2).
 *
 * TTS FROZEN 2026-07-13: the bright batch ran for all ten paths (voice profiles
 * portuguese_a2_bright_p{n}_multiv2_v1, 491 clips, rotation Raquel/Lair/Carla
 * continuing the A1 roster). Path, lesson, and chunk ids are audio cache keys
 * now — renaming one silently downgrades it to browser speech; text changes
 * require a scoped rerun of the batch.
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

const PORTUGUESE_A2_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

type PortugueseA2VariantInput = {
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

export type PortugueseA2LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightPortugueseA2Variant(input: PortugueseA2VariantInput): GuidedLessonVibeVariant {
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
      language: 'pt-BR',
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
      genre: 'bright acoustic bossa-pop',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

export function makePortugueseA2PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: PortugueseA2LessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('portuguese-a2-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `portuguese-a2-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
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
      steps: PORTUGUESE_A2_GUIDED_TODAY_STEPS,
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

export type PortugueseA2CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  targetText: string
  baseText: GuidedBaseContentText
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[] }
  /** Exactly the salient single words the speech check requires — never multi-word phrases or hyphenated forms (the check compares whitespace-split transcript tokens). */
  speakRequired: [string, string, string]
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

function portugueseA2Answers(text: string): string[] {
  const accentless = text.normalize('NFD').replace(/[̀-ͯ]/g, '')
  const variants = [text, accentless, text.toLowerCase(), accentless.toLowerCase()]
  const capitalized = variants.map((value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
  return [...new Set([...variants, ...capitalized])]
}

function portugueseA2SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
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

export function makePortugueseA2CompactLesson(input: PortugueseA2CompactLesson): PortugueseA2LessonInput {
  const prefix = input.slug.split('-')[0]
  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: makeBrightPortugueseA2Variant({
      corePhrase: { targetText: input.targetText, baseText: input.baseText },
      meaning: input.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map((term, index) => ({
        id: `${prefix}-item-${index + 1}`,
        ...term,
        acceptedAnswers: portugueseA2Answers(term.targetText),
      })),
      buildChips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      typeRecall: {
        ...input.recall,
        acceptedAnswers: portugueseA2Answers(input.recall.answer),
      },
      speakTarget: {
        baseCue: input.baseText,
        targetPhrase: input.targetText,
        ...portugueseA2SpeakTokens(input.targetText, input.speakRequired),
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderCaption: input.placeholderCaption,
      songMood: input.songMood,
      visualNotes: input.visualNotes,
    }),
  }
}

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_ONE_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-1',
  title: 'Portuguese A2 Practical 1',
  shortTitle: 'A2 Practical 1',
  subtitle: { de: 'Wieder da: kurze Alltagsgespräche', en: 'Back again: short everyday exchanges' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical1Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'sim-o-de-sempre', title: { de: 'Wie immer', en: 'The usual' },
    situation: { de: 'Die Barista kennt deine übliche Bestellung und fragt nach einer Bestätigung.', en: 'The barista knows your usual order and asks you to confirm it.' },
    pedagogicalGoal: 'Eine bekannte Cafébestellung mit de sempre freundlich bestätigen.',
    targetText: 'Sim, o de sempre: um café com leite, por favor.', baseText: { de: 'Ja, das Übliche: ein Milchkaffee, bitte.', en: 'Yes, the usual: a coffee with milk, please.' },
    chunks: [{ targetText: 'Sim, o de sempre:', baseText: { de: 'Ja, das Übliche:', en: 'Yes, the usual:' } }, { targetText: 'um café com leite,', baseText: { de: 'ein Milchkaffee,', en: 'a coffee with milk,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'de sempre', baseText: { de: 'wie immer', en: 'the usual' } }, { targetText: 'café', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'leite', baseText: { de: 'Milch', en: 'milk' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }, { targetText: 'sim', baseText: { de: 'ja', en: 'yes' } }],
    recall: { before: 'Sim, o de ', answer: 'sempre', after: ': um café com leite, por favor.', fallbackChoices: ['sempre', 'novo', 'grande', 'quente'] }, speakRequired: ['sempre', 'café', 'leite'],
    sceneCaption: { de: 'Die Barista stellt die Tasse bereit und fragt: „O de sempre?“', en: 'The barista sets out a cup and asks: “O de sempre?”' },
    trophyWord: { word: 'sempre', meaning: { de: 'immer', en: 'always' }, example: 'Eu peço café aqui sempre.', whyThisWord: { de: 'sempre macht klar, dass die Barista deine vertraute Bestellung kennt.', en: 'sempre makes it clear that the barista knows your familiar order.' } },
    distractors: ['um chá com limão', 'para comer aqui'], placeholderCaption: { de: 'Barista mit einer Tasse Milchkaffee am Tresen.', en: 'Barista with a cup of coffee with milk at the counter.' }, songMood: 'welcoming familiar café', visualNotes: 'Warm Brazilian café counter, regular customer greeted by name.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'para-viagem-quanto-fica', title: { de: 'Zum Mitnehmen', en: 'To go' },
    situation: { de: 'Die Barista fragt, ob du hier essen oder alles mitnehmen möchtest — du nimmst es mit und fragst nach dem Gesamtpreis.', en: 'The barista asks whether you will eat here or take everything away — choose to go and ask for the total.' },
    pedagogicalGoal: 'Para viagem sagen und mit quanto fica nach dem Gesamtpreis fragen.',
    targetText: 'Para viagem, por favor. Quanto fica tudo?', baseText: { de: 'Zum Mitnehmen, bitte. Wie viel kostet alles?', en: 'To go, please. How much is everything?' },
    chunks: [{ targetText: 'Para viagem,', baseText: { de: 'Zum Mitnehmen,', en: 'To go,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }, { targetText: 'Quanto fica tudo?', baseText: { de: 'Wie viel kostet alles?', en: 'How much is everything?' } }],
    terms: [{ targetText: 'viagem', baseText: { de: 'Reise; zum Mitnehmen', en: 'trip; to go' } }, { targetText: 'para viagem', baseText: { de: 'zum Mitnehmen', en: 'to go' } }, { targetText: 'quanto fica', baseText: { de: 'wie viel kostet es', en: 'how much is it' } }, { targetText: 'tudo', baseText: { de: 'alles', en: 'everything' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Para ', answer: 'viagem', after: ', por favor. Quanto fica tudo?', fallbackChoices: ['viagem', 'amanhã', 'mesa', 'casa'] }, speakRequired: ['viagem', 'quanto', 'tudo'],
    sceneCaption: { de: 'Die Barista zeigt auf den Tisch und fragt: „É para viagem ou para comer aqui?“', en: 'The barista points to the tables and asks: “É para viagem ou para comer aqui?”' },
    trophyWord: { word: 'viagem', meaning: { de: 'Reise; zum Mitnehmen', en: 'trip; to go' }, example: 'Quero este sanduíche para viagem.', whyThisWord: { de: 'viagem gehört zu der sehr häufigen Frage, ob du etwas mitnehmen möchtest.', en: 'viagem is part of the very common question of whether you want something to go.' } },
    distractors: ['Para comer aqui', 'Com cartão, por favor'], placeholderCaption: { de: 'Papiertüte und Kaffeebecher neben einer Café-Kasse.', en: 'Paper bag and coffee cup beside a cafe register.' }, songMood: 'quick takeaway stop', visualNotes: 'Cafe takeaway bag, counter display, friendly barista waiting.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'procurando-chip-celular', title: { de: 'Eine SIM-Karte', en: 'A SIM card' },
    situation: { de: 'Im Handyshop bietet ein Mitarbeiter Hilfe an — du suchst eine SIM-Karte für dein Handy und fragst, ob sie welche haben.', en: 'At the phone shop, an assistant offers help — you are looking for a SIM card for your phone and ask whether they have one.' },
    pedagogicalGoal: 'Im Laden mit estou procurando erklären, was du suchst, und mit vocês têm nachfragen.',
    targetText: 'Estou procurando um chip para o celular. Vocês têm?', baseText: { de: 'Ich suche eine SIM-Karte fürs Handy. Haben Sie welche?', en: 'I am looking for a SIM card for the phone. Do you have any?' },
    chunks: [{ targetText: 'Estou procurando', baseText: { de: 'Ich suche', en: 'I am looking for' } }, { targetText: 'um chip para o celular.', baseText: { de: 'eine SIM-Karte fürs Handy.', en: 'a SIM card for the phone.' } }, { targetText: 'Vocês têm?', baseText: { de: 'Haben Sie welche?', en: 'Do you have any?' } }],
    terms: [{ targetText: 'procurando', baseText: { de: 'suchend', en: 'looking for' } }, { targetText: 'chip', baseText: { de: 'SIM-Karte', en: 'SIM card' } }, { targetText: 'celular', baseText: { de: 'Handy', en: 'mobile phone' } }, { targetText: 'vocês têm', baseText: { de: 'haben Sie', en: 'do you have' } }, { targetText: 'estou', baseText: { de: 'ich bin', en: 'I am' } }],
    recall: { before: 'Estou ', answer: 'procurando', after: ' um chip para o celular. Vocês têm?', fallbackChoices: ['procurando', 'pagando', 'morando', 'voltando'] }, speakRequired: ['procurando', 'chip', 'celular'],
    sceneCaption: { de: 'Ein Mitarbeiter im Handyshop fragt: „Posso ajudar?“', en: 'A phone-shop assistant asks: “Posso ajudar?”' },
    trophyWord: { word: 'procurando', meaning: { de: 'suchend', en: 'looking for' }, example: 'Estou procurando uma farmácia perto daqui.', whyThisWord: { de: 'procurando eröffnet eine natürliche Bitte um Hilfe, wenn du etwas Bestimmtes brauchst.', en: 'procurando opens a natural request for help when you need something specific.' } },
    distractors: ['Quero carregar o celular', 'um fone novo'], placeholderCaption: { de: 'Handyshop mit SIM-Karten hinter einer Glasvitrine.', en: 'Phone shop with SIM cards behind a glass case.' }, songMood: 'helpful city errand', visualNotes: 'Bright phone shop, SIM card display, attentive assistant.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quantos-minutos-a-pe', title: { de: 'Wie viele Minuten?', en: 'How many minutes?' },
    situation: { de: 'Jemand sagt dir vage, dass der Ort ganz nah sei — du fragst nach der Gehzeit.', en: 'Someone vaguely says the place is very close — ask how long it takes on foot.' },
    pedagogicalGoal: 'Mit são quantos minutos a pé eine konkrete Gehzeit erfragen.',
    targetText: 'São quantos minutos a pé daqui?', baseText: { de: 'Wie viele Minuten sind es von hier zu Fuß?', en: 'How many minutes is it from here on foot?' },
    chunks: [{ targetText: 'São quantos minutos', baseText: { de: 'Wie viele Minuten sind es', en: 'How many minutes is it' } }, { targetText: 'a pé', baseText: { de: 'zu Fuß', en: 'on foot' } }, { targetText: 'daqui?', baseText: { de: 'von hier?', en: 'from here?' } }],
    terms: [{ targetText: 'quantos minutos', baseText: { de: 'wie viele Minuten', en: 'how many minutes' } }, { targetText: 'a pé', baseText: { de: 'zu Fuß', en: 'on foot' } }, { targetText: 'daqui', baseText: { de: 'von hier', en: 'from here' } }, { targetText: 'são', baseText: { de: 'sind es', en: 'is it' } }, { targetText: 'pé', baseText: { de: 'Fuß', en: 'foot' } }],
    recall: { before: 'São quantos ', answer: 'minutos', after: ' a pé daqui?', fallbackChoices: ['minutos', 'passos', 'metros', 'horas'] }, speakRequired: ['minutos', 'pé', 'daqui'],
    sceneCaption: { de: 'Ein Passant zeigt die Straße hinunter und sagt: „É pertinho, fica ali.“', en: 'A passerby points down the street and says: “É pertinho, fica ali.”' },
    trophyWord: { word: 'minutos', meaning: { de: 'Minuten', en: 'minutes' }, example: 'A estação fica a dez minutos daqui.', whyThisWord: { de: 'minutos macht aus einer ungenauen Wegbeschreibung eine hilfreiche Zeitangabe.', en: 'minutos turns a vague direction into a useful time estimate.' } },
    distractors: ['É muito longe', 'de ônibus rápido'], placeholderCaption: { de: 'Straßenecke mit einem Passanten, der in die Ferne zeigt.', en: 'Street corner with a passerby pointing into the distance.' }, songMood: 'curious city walk', visualNotes: 'Sunny sidewalk, street signs, visitor checking the route.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'pode-trazer-a-conta', title: { de: 'Die Rechnung bitte', en: 'The bill, please' },
    situation: { de: 'Nach dem Essen fragt der Kellner, ob alles in Ordnung ist — du bestätigst das und bittest um die Rechnung.', en: 'After the meal, the waiter asks whether everything is all right — confirm it and ask for the bill.' },
    pedagogicalGoal: 'Auf eine Kellnerfrage reagieren und mit pode trazer höflich um die Rechnung bitten.',
    targetText: 'Sim, está tudo muito bom. Pode trazer a conta?', baseText: { de: 'Ja, alles ist sehr gut. Können Sie die Rechnung bringen?', en: 'Yes, everything is very good. Can you bring the bill?' },
    chunks: [{ targetText: 'Sim, está tudo muito bom.', baseText: { de: 'Ja, alles ist sehr gut.', en: 'Yes, everything is very good.' } }, { targetText: 'Pode trazer', baseText: { de: 'Können Sie bringen', en: 'Can you bring' } }, { targetText: 'a conta?', baseText: { de: 'die Rechnung?', en: 'the bill?' } }],
    terms: [{ targetText: 'tudo muito bom', baseText: { de: 'alles sehr gut', en: 'everything very good' } }, { targetText: 'trazer', baseText: { de: 'bringen', en: 'to bring' } }, { targetText: 'conta', baseText: { de: 'Rechnung', en: 'bill' } }, { targetText: 'pode trazer', baseText: { de: 'können Sie bringen', en: 'can you bring' } }, { targetText: 'muito', baseText: { de: 'sehr', en: 'very' } }],
    recall: { before: 'Sim, está tudo muito bom. Pode ', answer: 'trazer', after: ' a conta?', fallbackChoices: ['trazer', 'fechar', 'escolher', 'deixar'] }, speakRequired: ['bom', 'trazer', 'conta'],
    sceneCaption: { de: 'Der Kellner räumt den Tisch ab und fragt: „Está tudo bem com a comida?“', en: 'The waiter clears the table and asks: “Está tudo bem com a comida?”' },
    trophyWord: { word: 'trazer', meaning: { de: 'bringen', en: 'to bring' }, example: 'Pode trazer um copo de água, por favor?', whyThisWord: { de: 'trazer hilft dir, im Restaurant höflich um etwas zu bitten.', en: 'trazer helps you politely ask for something in a restaurant.' } },
    distractors: ['A comida está fria', 'Quero pedir sobremesa'], placeholderCaption: { de: 'Restauranttisch nach dem Essen mit einer kleinen Rechnung.', en: 'Restaurant table after a meal with a small bill.' }, songMood: 'relaxed meal ending', visualNotes: 'Cozy restaurant, cleared plates, waiter approaching the table.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'reserva-em-nome-de-silva', title: { de: 'Reserviert auf Silva', en: 'Reserved under Silva' },
    situation: { de: 'An der Hotelrezeption wird nach deiner Reservierung gefragt — du nennst den Namen, unter dem sie gebucht ist.', en: 'At hotel reception, you are asked about your reservation — give the name it is booked under.' },
    pedagogicalGoal: 'Eine Hotelreservierung mit em nome de klar angeben.',
    targetText: 'Tenho uma reserva em nome de Silva.', baseText: { de: 'Ich habe eine Reservierung auf den Namen Silva.', en: 'I have a reservation under the name Silva.' },
    chunks: [{ targetText: 'Tenho uma reserva', baseText: { de: 'Ich habe eine Reservierung', en: 'I have a reservation' } }, { targetText: 'em nome de', baseText: { de: 'auf den Namen', en: 'under the name' } }, { targetText: 'Silva.', baseText: { de: 'Silva.', en: 'Silva.' } }],
    terms: [{ targetText: 'tenho', baseText: { de: 'ich habe', en: 'I have' } }, { targetText: 'reserva', baseText: { de: 'Reservierung', en: 'reservation' } }, { targetText: 'em nome de', baseText: { de: 'auf den Namen', en: 'under the name' } }, { targetText: 'nome', baseText: { de: 'Name', en: 'name' } }, { targetText: 'uma reserva', baseText: { de: 'eine Reservierung', en: 'a reservation' } }],
    recall: { before: 'Tenho uma ', answer: 'reserva', after: ' em nome de Silva.', fallbackChoices: ['reserva', 'mala', 'chamada', 'pergunta'] }, speakRequired: ['tenho', 'reserva', 'nome'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Buchungsliste und fragt: „A reserva está em nome de quem?“', en: 'The receptionist opens the booking list and asks: “A reserva está em nome de quem?”' },
    trophyWord: { word: 'tenho', meaning: { de: 'ich habe', en: 'I have' }, example: 'Tenho uma reserva para esta noite.', whyThisWord: { de: 'tenho ist der direkte Einstieg, wenn du deine Reservierung an der Rezeption nennst.', en: 'tenho is the direct opening when you state your reservation at reception.' } },
    distractors: ['Quero um quarto', 'Meu nome é Ana'], placeholderCaption: { de: 'Hotelrezeption mit geöffneter Reservierungsliste.', en: 'Hotel reception with an open reservation list.' }, songMood: 'calm hotel arrival', visualNotes: 'Hotel desk, reservation ledger, suitcase beside the guest.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quanto-devo-pela-pomada', title: { de: 'Was schulde ich?', en: 'What do I owe?' },
    situation: { de: 'In der Apotheke fragt die Verkäuferin, ob du noch etwas brauchst — du sagst nein und fragst nach dem Preis der Salbe.', en: 'At the pharmacy, the clerk asks whether you need anything else — say no and ask what you owe for the ointment.' },
    pedagogicalGoal: 'Eine Apotheke freundlich abschließen und mit quanto eu devo nach dem Preis fragen.',
    targetText: 'Não, só isso. Quanto eu devo pela pomada?', baseText: { de: 'Nein, nur das. Wie viel schulde ich für die Salbe?', en: 'No, just that. How much do I owe for the ointment?' },
    chunks: [{ targetText: 'Não, só isso.', baseText: { de: 'Nein, nur das.', en: 'No, just that.' } }, { targetText: 'Quanto eu devo', baseText: { de: 'Wie viel schulde ich', en: 'How much do I owe' } }, { targetText: 'pela pomada?', baseText: { de: 'für die Salbe?', en: 'for the ointment?' } }],
    terms: [{ targetText: 'só isso', baseText: { de: 'nur das', en: 'just that' } }, { targetText: 'devo', baseText: { de: 'ich schulde', en: 'I owe' } }, { targetText: 'quanto eu devo', baseText: { de: 'wie viel ich schulde', en: 'how much I owe' } }, { targetText: 'pomada', baseText: { de: 'Salbe', en: 'ointment' } }, { targetText: 'não', baseText: { de: 'nein', en: 'no' } }],
    recall: { before: 'Não, só isso. Quanto eu devo pela ', answer: 'pomada', after: '?', fallbackChoices: ['pomada', 'receita', 'vitamina', 'caixa'] }, speakRequired: ['só', 'devo', 'pomada'],
    sceneCaption: { de: 'Die Apothekerin legt die Salbe hin und fragt: „Mais alguma coisa?“', en: 'The pharmacist sets down the ointment and asks: “Mais alguma coisa?”' },
    trophyWord: { word: 'devo', meaning: { de: 'ich schulde', en: 'I owe' }, example: 'Quanto eu devo pela consulta?', whyThisWord: { de: 'devo gibt dir eine einfache, höfliche Frage nach dem fälligen Betrag.', en: 'devo gives you a simple, polite way to ask for the amount due.' } },
    distractors: ['Quero outra pomada', 'Para dor nas costas'], placeholderCaption: { de: 'Apothekentresen mit einer Salbentube und einem Preisetikett.', en: 'Pharmacy counter with an ointment tube and a price tag.' }, songMood: 'small health errand', visualNotes: 'Neat pharmacy counter, ointment tube, attentive pharmacist.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'metro-no-fim-da-rua', title: { de: 'Die Metro ist dort', en: 'The metro is there' },
    situation: { de: 'Ein anderer Tourist fragt dich nach der Metro — du erklärst, wo der Eingang ist.', en: 'Another tourist asks you about the metro — explain where the entrance is.' },
    pedagogicalGoal: 'Eine einfache Wegauskunft mit no fim desta rua geben.',
    targetText: 'O metrô fica no fim desta rua.', baseText: { de: 'Die Metro ist am Ende dieser Straße.', en: 'The metro is at the end of this street.' },
    chunks: [{ targetText: 'O metrô fica', baseText: { de: 'Die Metro ist', en: 'The metro is' } }, { targetText: 'no fim', baseText: { de: 'am Ende', en: 'at the end' } }, { targetText: 'desta rua.', baseText: { de: 'dieser Straße.', en: 'of this street.' } }],
    terms: [{ targetText: 'metrô', baseText: { de: 'Metro', en: 'metro' } }, { targetText: 'fica', baseText: { de: 'ist gelegen', en: 'is located' } }, { targetText: 'fim', baseText: { de: 'Ende', en: 'end' } }, { targetText: 'rua', baseText: { de: 'Straße', en: 'street' } }, { targetText: 'desta', baseText: { de: 'dieser', en: 'this' } }],
    recall: { before: 'O ', answer: 'metrô', after: ' fica no fim desta rua.', fallbackChoices: ['metrô', 'mercado', 'hotel', 'banco'] }, speakRequired: ['metrô', 'fim', 'rua'],
    sceneCaption: { de: 'Ein Tourist hält eine Karte hoch und fragt dich: „Onde fica o metrô?“', en: 'A tourist holds up a map and asks you: “Onde fica o metrô?”' },
    trophyWord: { word: 'fim', meaning: { de: 'Ende', en: 'end' }, example: 'A padaria fica no fim da rua.', whyThisWord: { de: 'fim macht deine Wegbeschreibung für den anderen Touristen präzise.', en: 'fim makes your direction clear for the other tourist.' } },
    distractors: ['Vire à esquerda', 'Perto da praça'], placeholderCaption: { de: 'Metroeingang am Ende einer belebten Straße.', en: 'Metro entrance at the end of a busy street.' }, songMood: 'confident city directions', visualNotes: 'Visitor points down a lively street toward a metro sign.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'meio-quilo-dois-limoes', title: { de: 'Ein halbes Kilo', en: 'Half a kilo' },
    situation: { de: 'Auf dem Wochenmarkt fragt ein Händler, wie viel Obst du möchtest — du bestellst ein halbes Kilo und zusätzlich Zitronen.', en: 'At the street market, a vendor asks how much fruit you would like — order half a kilo and add some lemons.' },
    pedagogicalGoal: 'Eine Marktmenge mit meio quilo angeben und mit também etwas ergänzen.',
    targetText: 'Meio quilo, e também dois limões, por favor.', baseText: { de: 'Ein halbes Kilo und außerdem zwei Zitronen, bitte.', en: 'Half a kilo, and also two lemons, please.' },
    chunks: [{ targetText: 'Meio quilo,', baseText: { de: 'Ein halbes Kilo,', en: 'Half a kilo,' } }, { targetText: 'e também dois limões,', baseText: { de: 'und außerdem zwei Zitronen,', en: 'and also two lemons,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'meio quilo', baseText: { de: 'ein halbes Kilo', en: 'half a kilo' } }, { targetText: 'também', baseText: { de: 'auch; außerdem', en: 'also' } }, { targetText: 'limões', baseText: { de: 'Zitronen', en: 'lemons' } }, { targetText: 'dois', baseText: { de: 'zwei', en: 'two' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Meio quilo, e também dois ', answer: 'limões', after: ', por favor.', fallbackChoices: ['limões', 'tomates', 'morangos', 'ovos'] }, speakRequired: ['meio', 'quilo', 'limões'],
    sceneCaption: { de: 'Der Händler hält Orangen hoch und fragt: „Quanto você quer?“', en: 'The vendor holds up oranges and asks: “Quanto você quer?”' },
    trophyWord: { word: 'limões', meaning: { de: 'Zitronen', en: 'lemons' }, example: 'Preciso de dois limões para o suco.', whyThisWord: { de: 'limões hilft dir, eine Marktbestellung um einen konkreten Zusatz zu erweitern.', en: 'limões helps you add a concrete extra item to a market order.' } },
    distractors: ['Só meio quilo', 'Uma sacola grande'], placeholderCaption: { de: 'Marktstand mit Zitrusfrüchten und einer Waage.', en: 'Street-market stall with citrus fruit and a scale.' }, songMood: 'lively market order', visualNotes: 'Colorful Brazilian street market, lemons on a scale, vendor listening.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'ja-conheco-o-bairro', title: { de: 'Das Viertel kennen', en: 'Knowing the neighborhood' },
    situation: { de: 'Im Treppenhaus fragt ein Nachbar, ob bei dir alles gut läuft — du sagst, dass du die Gegend schon etwas kennst.', en: 'In the stairwell, a neighbor asks whether things are going well — say that you already know the neighborhood a little.' },
    pedagogicalGoal: 'Mit já conheço einen kleinen Fortschritt im neuen Viertel ausdrücken.',
    targetText: 'Sim, já conheço um pouco o bairro.', baseText: { de: 'Ja, ich kenne das Viertel schon ein wenig.', en: 'Yes, I already know the neighborhood a little.' },
    chunks: [{ targetText: 'Sim, já conheço', baseText: { de: 'Ja, ich kenne schon', en: 'Yes, I already know' } }, { targetText: 'um pouco', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'o bairro.', baseText: { de: 'das Viertel.', en: 'the neighborhood.' } }],
    terms: [{ targetText: 'conheço', baseText: { de: 'ich kenne', en: 'I know' } }, { targetText: 'um pouco', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'bairro', baseText: { de: 'Viertel', en: 'neighborhood' } }, { targetText: 'já conheço', baseText: { de: 'ich kenne schon', en: 'I already know' } }, { targetText: 'já', baseText: { de: 'schon', en: 'already' } }],
    recall: { before: 'Sim, já conheço um pouco o ', answer: 'bairro', after: '.', fallbackChoices: ['bairro', 'prédio', 'centro', 'parque'] }, speakRequired: ['conheço', 'pouco', 'bairro'],
    sceneCaption: { de: 'Ein Nachbar trifft dich im Treppenhaus und fragt: „Tudo bem por aí?“', en: 'A neighbor meets you in the stairwell and asks: “Tudo bem por aí?”' },
    trophyWord: { word: 'bairro', meaning: { de: 'Viertel', en: 'neighborhood' }, example: 'Meu bairro tem uma feira aos sábados.', whyThisWord: { de: 'bairro verankert deinen kleinen Fortschritt direkt in der Gegend, in der du jetzt lebst.', en: 'bairro anchors your small progress in the area where you now live.' } },
    distractors: ['Ainda estou perdido', 'O prédio é novo'], placeholderCaption: { de: 'Zwei Nachbarn im hellen Treppenhaus eines Wohnhauses.', en: 'Two neighbors in a bright apartment-building stairwell.' }, songMood: 'friendly neighborhood confidence', visualNotes: 'Warm apartment stairwell, casual neighbor chat, familiar surroundings.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_ONE_METADATA, portugueseA2Practical1Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 1 abgeschlossen — du kannst kurze Alltagsgespräche sicher führen.', en: 'You have completed Portuguese A2 Practical 1 — you can handle short everyday exchanges confidently.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_TWO_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-2',
  title: 'Portuguese A2 Practical 2',
  shortTitle: 'A2 Practical 2',
  subtitle: { de: 'Diese hier, weil …', en: 'This one, because…' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical2Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'prefiro-estes-tomates', title: { de: 'Diese Tomaten', en: 'These tomatoes' },
    situation: { de: 'Auf dem Wochenmarkt hält der Händler zwei Tomatenkisten hoch und fragt, welche du möchtest — du triffst deine Wahl mit einem Grund.', en: 'At the street market, the vendor holds up two crates of tomatoes and asks which you want — make your choice and give a reason.' },
    pedagogicalGoal: 'Mit prefiro und mais … do que eine Marktentscheidung begründen.',
    targetText: 'Prefiro estes tomates porque estão mais maduros do que aqueles.', baseText: { de: 'Ich bevorzuge diese Tomaten, weil sie reifer sind als jene.', en: 'I prefer these tomatoes because they are riper than those.' },
    chunks: [{ targetText: 'Prefiro estes tomates', baseText: { de: 'Ich bevorzuge diese Tomaten', en: 'I prefer these tomatoes' } }, { targetText: 'porque estão mais maduros', baseText: { de: 'weil sie reifer sind', en: 'because they are riper' } }, { targetText: 'do que aqueles.', baseText: { de: 'als jene.', en: 'than those.' } }],
    terms: [{ targetText: 'prefiro', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }, { targetText: 'tomates', baseText: { de: 'Tomaten', en: 'tomatoes' } }, { targetText: 'maduros', baseText: { de: 'reif', en: 'ripe' } }, { targetText: 'aqueles', baseText: { de: 'jene', en: 'those' } }, { targetText: 'estes', baseText: { de: 'diese', en: 'these' } }],
    recall: { before: 'Prefiro estes tomates porque estão mais ', answer: 'maduros', after: ' do que aqueles.', fallbackChoices: ['maduros', 'doces', 'grandes', 'caros'] }, speakRequired: ['tomates', 'maduros', 'aqueles'],
    sceneCaption: { de: 'Der Händler hält zwei Kisten hoch und fragt: „Quais você prefere?“', en: 'The vendor holds up two crates and asks: “Quais você prefere?”' },
    trophyWord: { word: 'maduros', meaning: { de: 'reif', en: 'ripe' }, example: 'Estes abacates estão maduros.', whyThisWord: { de: 'maduros gibt dir einen konkreten Grund, am Markt die reiferen Tomaten zu wählen.', en: 'maduros gives you a concrete reason to choose the riper tomatoes at the market.' } },
    distractors: ['Prefiro aqueles tomates', 'porque são bem baratos'], placeholderCaption: { de: 'Zwei Tomatenkisten auf einem Marktstand.', en: 'Two crates of tomatoes at a street-market stall.' }, songMood: 'fresh market comparison', visualNotes: 'Open-air Brazilian market, two tomato crates, vendor waiting for a choice.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'hoje-prefiro-um-suco', title: { de: 'Heute lieber Saft', en: 'Juice today' },
    situation: { de: 'Im Café fragt die Barista nach deiner üblichen Bestellung — heute möchtest du Saft statt Kaffee und erklärst warum.', en: 'At the cafe, the barista asks for your usual order — today you want juice instead of coffee and explain why.' },
    pedagogicalGoal: 'Eine Bestellung ändern und mit menos … do que einen Grund nennen.',
    targetText: 'Hoje prefiro um suco porque é menos forte do que o café.', baseText: { de: 'Heute bevorzuge ich einen Saft, weil er weniger stark ist als der Kaffee.', en: 'Today I prefer a juice because it is less strong than coffee.' },
    chunks: [{ targetText: 'Hoje prefiro um suco', baseText: { de: 'Heute bevorzuge ich einen Saft', en: 'Today I prefer a juice' } }, { targetText: 'porque é menos forte', baseText: { de: 'weil er weniger stark ist', en: 'because it is less strong' } }, { targetText: 'do que o café.', baseText: { de: 'als der Kaffee.', en: 'than coffee.' } }],
    terms: [{ targetText: 'suco', baseText: { de: 'Saft', en: 'juice' } }, { targetText: 'menos forte', baseText: { de: 'weniger stark', en: 'less strong' } }, { targetText: 'café', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'prefiro', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }, { targetText: 'hoje', baseText: { de: 'heute', en: 'today' } }],
    recall: { before: 'Hoje prefiro um suco porque é menos ', answer: 'forte', after: ' do que o café.', fallbackChoices: ['forte', 'doce', 'frio', 'claro'] }, speakRequired: ['suco', 'forte', 'café'],
    sceneCaption: { de: 'Die Barista stellt deine übliche Tasse hin und fragt: „Vai querer o de sempre?“', en: 'The barista sets out your usual cup and asks: “Vai querer o de sempre?”' },
    trophyWord: { word: 'forte', meaning: { de: 'stark', en: 'strong' }, example: 'Este café é muito forte para mim.', whyThisWord: { de: 'forte erklärt ganz natürlich, warum dir heute ein milderer Saft besser passt.', en: 'forte naturally explains why a milder juice suits you better today.' } },
    distractors: ['Hoje quero chá', 'porque está gelado'], placeholderCaption: { de: 'Cafétheke mit Saftglas und Espressotasse.', en: 'Cafe counter with a juice glass and an espresso cup.' }, songMood: 'easy café switch', visualNotes: 'Cafe counter, bright juice beside a dark espresso, familiar barista.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'prefiro-a-camisa-azul', title: { de: 'Das blaue Hemd', en: 'The blue shirt' },
    situation: { de: 'Im Kleidungsgeschäft hält die Verkäuferin eine blaue und eine schwarze Bluse hoch — du sagst, welche dir besser gefällt.', en: 'In a clothing shop, the assistant holds up a blue and a black shirt — say which one you prefer.' },
    pedagogicalGoal: 'Mit fica mais bonita do que zwei Kleidungsstücke vergleichen.',
    targetText: 'Prefiro a camisa azul porque fica mais bonita do que a preta.', baseText: { de: 'Ich bevorzuge das blaue Hemd, weil es schöner wirkt als das schwarze.', en: 'I prefer the blue shirt because it looks nicer than the black one.' },
    chunks: [{ targetText: 'Prefiro a camisa azul', baseText: { de: 'Ich bevorzuge das blaue Hemd', en: 'I prefer the blue shirt' } }, { targetText: 'porque fica mais bonita', baseText: { de: 'weil es schöner wirkt', en: 'because it looks nicer' } }, { targetText: 'do que a preta.', baseText: { de: 'als das schwarze.', en: 'than the black one.' } }],
    terms: [{ targetText: 'camisa', baseText: { de: 'Hemd; Bluse', en: 'shirt' } }, { targetText: 'azul', baseText: { de: 'blau', en: 'blue' } }, { targetText: 'bonita', baseText: { de: 'schön', en: 'nice' } }, { targetText: 'preta', baseText: { de: 'schwarz', en: 'black' } }, { targetText: 'fica', baseText: { de: 'wirkt', en: 'looks' } }],
    recall: { before: 'Prefiro a camisa azul porque fica mais ', answer: 'bonita', after: ' do que a preta.', fallbackChoices: ['bonita', 'cara', 'larga', 'clara'] }, speakRequired: ['camisa', 'azul', 'bonita'],
    sceneCaption: { de: 'Die Verkäuferin zeigt auf beide Kleiderbügel und fragt: „Qual camisa você prefere?“', en: 'The shop assistant points to both hangers and asks: “Qual camisa você prefere?”' },
    trophyWord: { word: 'camisa', meaning: { de: 'Hemd; Bluse', en: 'shirt' }, example: 'A camisa azul fica bem com a calça.', whyThisWord: { de: 'camisa verankert deinen Vergleich an einem klaren Kleidungsstück im Laden.', en: 'camisa anchors your comparison in a clear item of clothing in the shop.' } },
    distractors: ['Quero a preta', 'porque é menor'], placeholderCaption: { de: 'Blaue und schwarze Hemden an einem Kleiderständer.', en: 'Blue and black shirts on a clothes rack.' }, songMood: 'bright shop choice', visualNotes: 'Clothing rack with blue and black shirts, helpful assistant nearby.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quero-a-salada-mais-leve', title: { de: 'Etwas Leichteres', en: 'Something lighter' },
    situation: { de: 'Im Restaurant fragt der Kellner, ob du Pasta oder Salat möchtest — du wählst den Salat mit einem Vergleich.', en: 'At the restaurant, the waiter asks whether you want pasta or salad — choose the salad with a comparison.' },
    pedagogicalGoal: 'Ein Gericht mit mais leve do que begründen.',
    targetText: 'Quero a salada porque é mais leve do que a massa.', baseText: { de: 'Ich möchte den Salat, weil er leichter ist als die Pasta.', en: 'I want the salad because it is lighter than the pasta.' },
    chunks: [{ targetText: 'Quero a salada', baseText: { de: 'Ich möchte den Salat', en: 'I want the salad' } }, { targetText: 'porque é mais leve', baseText: { de: 'weil er leichter ist', en: 'because it is lighter' } }, { targetText: 'do que a massa.', baseText: { de: 'als die Pasta.', en: 'than the pasta.' } }],
    terms: [{ targetText: 'salada', baseText: { de: 'Salat', en: 'salad' } }, { targetText: 'leve', baseText: { de: 'leicht', en: 'light' } }, { targetText: 'massa', baseText: { de: 'Pasta', en: 'pasta' } }, { targetText: 'quero', baseText: { de: 'ich möchte', en: 'I want' } }, { targetText: 'mais leve', baseText: { de: 'leichter', en: 'lighter' } }],
    recall: { before: 'Quero a salada porque é mais ', answer: 'leve', after: ' do que a massa.', fallbackChoices: ['leve', 'quente', 'grande', 'doce'] }, speakRequired: ['salada', 'leve', 'massa'],
    sceneCaption: { de: 'Der Kellner zeigt auf die Speisekarte und fragt: „Você quer a massa ou a salada?“', en: 'The waiter points to the menu and asks: “Você quer a massa ou a salada?”' },
    trophyWord: { word: 'leve', meaning: { de: 'leicht', en: 'light' }, example: 'Quero uma refeição leve hoje.', whyThisWord: { de: 'leve gibt dir einen einfachen Grund, im Restaurant etwas Leichteres zu wählen.', en: 'leve gives you a simple reason to choose something lighter at a restaurant.' } },
    distractors: ['Quero a massa', 'com muito queijo'], placeholderCaption: { de: 'Restauranttisch mit Salat und Pastateller.', en: 'Restaurant table with a salad and a pasta plate.' }, songMood: 'calm lunch choice', visualNotes: 'Simple lunch table, green salad and pasta bowl, waiter taking an order.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'escolho-pao-frances-fresquinho', title: { de: 'Frische Brötchen', en: 'Fresh bread rolls' },
    situation: { de: 'In der Bäckerei zeigt der Bäcker zwei Körbe mit brasilianischen Brötchen — du wählst den frischeren aus.', en: 'At the bakery, the baker shows two baskets of Brazilian bread rolls — choose the fresher one.' },
    pedagogicalGoal: 'In der Bäckerei mit mais fresquinho do que eine Wahl begründen.',
    targetText: 'Escolho este pão francês porque está mais fresquinho do que o outro.', baseText: { de: 'Ich wähle dieses brasilianische Brötchen, weil es frischer ist als das andere.', en: 'I choose this Brazilian bread roll because it is fresher than the other one.' },
    chunks: [{ targetText: 'Escolho este pão francês', baseText: { de: 'Ich wähle dieses brasilianische Brötchen', en: 'I choose this Brazilian bread roll' } }, { targetText: 'porque está mais fresquinho', baseText: { de: 'weil es frischer ist', en: 'because it is fresher' } }, { targetText: 'do que o outro.', baseText: { de: 'als das andere.', en: 'than the other one.' } }],
    terms: [{ targetText: 'escolho', baseText: { de: 'ich wähle', en: 'I choose' } }, { targetText: 'pão francês', baseText: { de: 'brasilianisches Brötchen', en: 'Brazilian bread roll' } }, { targetText: 'fresquinho', baseText: { de: 'ganz frisch', en: 'very fresh' } }, { targetText: 'outro', baseText: { de: 'anderer', en: 'other one' } }, { targetText: 'este', baseText: { de: 'dieses', en: 'this' } }],
    recall: { before: 'Escolho este pão francês porque está mais ', answer: 'fresquinho', after: ' do que o outro.', fallbackChoices: ['fresquinho', 'caro', 'pequeno', 'escuro'] }, speakRequired: ['escolho', 'pão', 'fresquinho'],
    sceneCaption: { de: 'Der Bäcker hält zwei Körbe hin und fragt: „Qual pão você vai levar?“', en: 'The baker holds out two baskets and asks: “Qual pão você vai levar?”' },
    trophyWord: { word: 'escolho', meaning: { de: 'ich wähle', en: 'I choose' }, example: 'Escolho as frutas mais maduras.', whyThisWord: { de: 'escolho macht deine Entscheidung in der Bäckerei klar und direkt.', en: 'escolho makes your bakery choice clear and direct.' } },
    distractors: ['Quero o outro pão', 'Para amanhã cedo'], placeholderCaption: { de: 'Bäckereitheke mit zwei Körben brasilianischer Brötchen.', en: 'Bakery counter with two baskets of Brazilian bread rolls.' }, songMood: 'warm bakery morning', visualNotes: 'Golden bakery counter, baskets of Brazilian bread rolls, baker presenting both.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'vou-de-metro-mais-rapido', title: { de: 'Lieber mit der Metro', en: 'Metro is faster' },
    situation: { de: 'Ein Nachbar fragt, ob du den Bus nimmst — du erklärst, warum du lieber mit der Metro fährst.', en: 'A neighbor asks whether you are taking the bus — explain why you prefer the metro.' },
    pedagogicalGoal: 'Zwei Verkehrsmittel mit mais rápido do que vergleichen.',
    targetText: 'Vou de metrô porque é mais rápido do que o ônibus.', baseText: { de: 'Ich fahre mit der Metro, weil sie schneller ist als der Bus.', en: 'I go by metro because it is faster than the bus.' },
    chunks: [{ targetText: 'Vou de metrô', baseText: { de: 'Ich fahre mit der Metro', en: 'I go by metro' } }, { targetText: 'porque é mais rápido', baseText: { de: 'weil sie schneller ist', en: 'because it is faster' } }, { targetText: 'do que o ônibus.', baseText: { de: 'als der Bus.', en: 'than the bus.' } }],
    terms: [{ targetText: 'metrô', baseText: { de: 'Metro', en: 'metro' } }, { targetText: 'rápido', baseText: { de: 'schnell', en: 'fast' } }, { targetText: 'ônibus', baseText: { de: 'Bus', en: 'bus' } }, { targetText: 'vou de', baseText: { de: 'ich fahre mit', en: 'I go by' } }, { targetText: 'porque', baseText: { de: 'weil', en: 'because' } }],
    recall: { before: 'Vou de metrô porque é mais ', answer: 'rápido', after: ' do que o ônibus.', fallbackChoices: ['rápido', 'barato', 'cheio', 'novo'] }, speakRequired: ['metrô', 'rápido', 'ônibus'],
    sceneCaption: { de: 'Dein Nachbar wartet an der Ecke und fragt: „Você vai de ônibus?“', en: 'Your neighbor waits on the corner and asks: “Você vai de ônibus?”' },
    trophyWord: { word: 'rápido', meaning: { de: 'schnell', en: 'fast' }, example: 'O metrô é rápido de manhã.', whyThisWord: { de: 'rápido liefert einen praktischen Grund für deine Wahl des Verkehrsmittels.', en: 'rápido gives a practical reason for your choice of transport.' } },
    distractors: ['Vou de táxi', 'porque está chovendo'], placeholderCaption: { de: 'Metroeingang neben einer Bushaltestelle in der Stadt.', en: 'Metro entrance beside a city bus stop.' }, songMood: 'quick city route', visualNotes: 'Metro sign and bus stop, commuter choosing a fast route.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quarto-mais-silencioso', title: { de: 'Das ruhigere Zimmer', en: 'The quieter room' },
    situation: { de: 'An der Rezeption zeigt man dir zwei Zimmer — du erklärst, welches zum Schlafen besser passt.', en: 'At reception, you are shown two rooms — explain which one suits sleeping better.' },
    pedagogicalGoal: 'Mit mais silencioso do que Zimmer vergleichen und mit durmo besser begründen.',
    targetText: 'Este quarto é mais silencioso do que o outro, então durmo melhor.', baseText: { de: 'Dieses Zimmer ist ruhiger als das andere, deshalb schlafe ich besser.', en: 'This room is quieter than the other one, so I sleep better.' },
    chunks: [{ targetText: 'Este quarto é', baseText: { de: 'Dieses Zimmer ist', en: 'This room is' } }, { targetText: 'mais silencioso do que o outro,', baseText: { de: 'ruhiger als das andere,', en: 'quieter than the other one,' } }, { targetText: 'então durmo melhor.', baseText: { de: 'deshalb schlafe ich besser.', en: 'so I sleep better.' } }],
    terms: [{ targetText: 'quarto', baseText: { de: 'Zimmer', en: 'room' } }, { targetText: 'silencioso', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'durmo', baseText: { de: 'ich schlafe', en: 'I sleep' } }, { targetText: 'outro', baseText: { de: 'anderer', en: 'other one' } }, { targetText: 'melhor', baseText: { de: 'besser', en: 'better' } }],
    recall: { before: 'Este quarto é mais ', answer: 'silencioso', after: ' do que o outro, então durmo melhor.', fallbackChoices: ['silencioso', 'claro', 'novo', 'alto'] }, speakRequired: ['quarto', 'silencioso', 'durmo'],
    sceneCaption: { de: 'Die Rezeptionistin zeigt auf zwei Schlüssel und fragt: „Qual quarto você prefere?“', en: 'The receptionist points to two keys and asks: “Qual quarto você prefere?”' },
    trophyWord: { word: 'silencioso', meaning: { de: 'ruhig', en: 'quiet' }, example: 'O quarto silencioso fica nos fundos.', whyThisWord: { de: 'silencioso verbindet deine Zimmerwahl mit dem klaren Ziel, besser zu schlafen.', en: 'silencioso connects your room choice to the clear goal of sleeping better.' } },
    distractors: ['Quero o quarto maior', 'Perto do elevador'], placeholderCaption: { de: 'Hotelflur mit zwei Türen und zwei Zimmerschlüsseln.', en: 'Hotel hallway with two doors and two room keys.' }, songMood: 'quiet hotel choice', visualNotes: 'Calm hotel corridor, two key cards, guest comparing rooms.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'sapatos-mais-confortaveis', title: { de: 'Bequemere Schuhe', en: 'More comfortable shoes' },
    situation: { de: 'Auf dem Wochenmarkt zeigt dir ein Verkäufer zwei Paar Schuhe — du nimmst das bequemere Paar.', en: 'At the street market, a seller shows you two pairs of shoes — choose the more comfortable pair.' },
    pedagogicalGoal: 'Mit mais confortáveis do que eine Kaufentscheidung formulieren.',
    targetText: 'Prefiro estes sapatos porque são mais confortáveis do que aqueles.', baseText: { de: 'Ich bevorzuge diese Schuhe, weil sie bequemer sind als jene.', en: 'I prefer these shoes because they are more comfortable than those.' },
    chunks: [{ targetText: 'Prefiro estes sapatos', baseText: { de: 'Ich bevorzuge diese Schuhe', en: 'I prefer these shoes' } }, { targetText: 'porque são mais confortáveis', baseText: { de: 'weil sie bequemer sind', en: 'because they are more comfortable' } }, { targetText: 'do que aqueles.', baseText: { de: 'als jene.', en: 'than those.' } }],
    terms: [{ targetText: 'sapatos', baseText: { de: 'Schuhe', en: 'shoes' } }, { targetText: 'confortáveis', baseText: { de: 'bequem', en: 'comfortable' } }, { targetText: 'aqueles', baseText: { de: 'jene', en: 'those' } }, { targetText: 'prefiro', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }, { targetText: 'são', baseText: { de: 'sie sind', en: 'they are' } }],
    recall: { before: 'Prefiro estes sapatos porque são mais ', answer: 'confortáveis', after: ' do que aqueles.', fallbackChoices: ['confortáveis', 'coloridos', 'baratos', 'pesados'] }, speakRequired: ['sapatos', 'confortáveis', 'aqueles'],
    sceneCaption: { de: 'Der Verkäufer hält zwei Paar Schuhe hoch und fragt: „Quais você gosta mais?“', en: 'The seller holds up two pairs of shoes and asks: “Quais você gosta mais?”' },
    trophyWord: { word: 'confortáveis', meaning: { de: 'bequem', en: 'comfortable' }, example: 'Estes sapatos são confortáveis para caminhar.', whyThisWord: { de: 'confortáveis ist ein natürlicher Grund, ein Paar Schuhe auf dem Markt zu wählen.', en: 'confortáveis is a natural reason to choose a pair of shoes at the market.' } },
    distractors: ['Prefiro os vermelhos', 'Para uma festa'], placeholderCaption: { de: 'Zwei Paar Schuhe auf einem Marktstand.', en: 'Two pairs of shoes at a street-market stall.' }, songMood: 'street market comfort', visualNotes: 'Shoe stall at an open-air market, shopper comparing two pairs.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'garrafa-menor-custa-menos', title: { de: 'Die kleinere Flasche', en: 'The smaller bottle' },
    situation: { de: 'Im Laden fragt die Verkäuferin nach der Größe — du wählst die kleinere Flasche, weil sie weniger kostet.', en: 'In a shop, the assistant asks which size you want — choose the smaller bottle because it costs less.' },
    pedagogicalGoal: 'Mit menor und custa menos do que einen Preisvergleich ausdrücken.',
    targetText: 'Quero a garrafa menor porque custa menos do que a grande.', baseText: { de: 'Ich möchte die kleinere Flasche, weil sie weniger kostet als die große.', en: 'I want the smaller bottle because it costs less than the large one.' },
    chunks: [{ targetText: 'Quero a garrafa menor', baseText: { de: 'Ich möchte die kleinere Flasche', en: 'I want the smaller bottle' } }, { targetText: 'porque custa menos', baseText: { de: 'weil sie weniger kostet', en: 'because it costs less' } }, { targetText: 'do que a grande.', baseText: { de: 'als die große.', en: 'than the large one.' } }],
    terms: [{ targetText: 'garrafa', baseText: { de: 'Flasche', en: 'bottle' } }, { targetText: 'menor', baseText: { de: 'kleiner', en: 'smaller' } }, { targetText: 'custa menos', baseText: { de: 'kostet weniger', en: 'costs less' } }, { targetText: 'grande', baseText: { de: 'groß', en: 'large' } }, { targetText: 'quero', baseText: { de: 'ich möchte', en: 'I want' } }],
    recall: { before: 'Quero a ', answer: 'garrafa', after: ' menor porque custa menos do que a grande.', fallbackChoices: ['garrafa', 'caixa', 'sacola', 'receita'] }, speakRequired: ['garrafa', 'menor', 'custa'],
    sceneCaption: { de: 'Die Verkäuferin hält zwei Flaschen hoch und fragt: „Você quer a pequena ou a grande?“', en: 'The shop assistant holds up two bottles and asks: “Você quer a pequena ou a grande?”' },
    trophyWord: { word: 'garrafa', meaning: { de: 'Flasche', en: 'bottle' }, example: 'A garrafa menor cabe na mochila.', whyThisWord: { de: 'garrafa macht deine Größen- und Preiswahl im Laden konkret.', en: 'garrafa makes your size and price choice in the shop concrete.' } },
    distractors: ['Quero a maior', 'Com gás, por favor'], placeholderCaption: { de: 'Kleiner Laden mit zwei unterschiedlich großen Flaschen.', en: 'Small shop with two bottles of different sizes.' }, songMood: 'practical shop decision', visualNotes: 'Corner shop shelf, two bottle sizes, price tags clearly visible.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'cafe-mais-tranquilo', title: { de: 'Der Lieblingsort', en: 'The favorite spot' },
    situation: { de: 'Ein Nachbar fragt, welches Café dir in der Gegend am besten gefällt — du nennst das nähere und ruhigere Café.', en: 'A neighbor asks which cafe you like best in the neighborhood — name the closer and quieter one.' },
    pedagogicalGoal: 'Einen Lieblingsort mit mais tranquilo und mais perto do que beschreiben.',
    targetText: 'Este café é mais tranquilo e fica mais perto do que o outro.', baseText: { de: 'Dieses Café ist ruhiger und liegt näher als das andere.', en: 'This cafe is quieter and closer than the other one.' },
    chunks: [{ targetText: 'Este café é', baseText: { de: 'Dieses Café ist', en: 'This cafe is' } }, { targetText: 'mais tranquilo', baseText: { de: 'ruhiger', en: 'quieter' } }, { targetText: 'e fica mais perto', baseText: { de: 'und liegt näher', en: 'and is closer' } }, { targetText: 'do que o outro.', baseText: { de: 'als das andere.', en: 'than the other one.' } }],
    terms: [{ targetText: 'café', baseText: { de: 'Café', en: 'cafe' } }, { targetText: 'tranquilo', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'perto', baseText: { de: 'nah', en: 'close' } }, { targetText: 'outro', baseText: { de: 'anderer', en: 'other one' } }, { targetText: 'mais perto', baseText: { de: 'näher', en: 'closer' } }],
    recall: { before: 'Este café é mais ', answer: 'tranquilo', after: ' e fica mais perto do que o outro.', fallbackChoices: ['tranquilo', 'cheio', 'caro', 'claro'] }, speakRequired: ['café', 'tranquilo', 'perto'],
    sceneCaption: { de: 'Dein Nachbar fragt auf dem Bürgersteig: „Qual café você mais gosta por aqui?“', en: 'Your neighbor asks on the sidewalk: “Qual café você mais gosta por aqui?”' },
    trophyWord: { word: 'tranquilo', meaning: { de: 'ruhig', en: 'quiet' }, example: 'Gosto de trabalhar em um café tranquilo.', whyThisWord: { de: 'tranquilo erklärt, warum genau dieses Café dein angenehmer Lieblingsort ist.', en: 'tranquilo explains why this particular cafe is your pleasant favorite spot.' } },
    distractors: ['O outro fica longe', 'Tem música alta'], placeholderCaption: { de: 'Zwei Cafés an einer ruhigen Wohnstraße.', en: 'Two cafes on a quiet residential street.' }, songMood: 'easy neighborhood preference', visualNotes: 'Quiet neighborhood cafe terrace, another busier cafe across the street.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_TWO_METADATA, portugueseA2Practical2Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 2 abgeschlossen — du kannst Vorlieben vergleichen und begründen.', en: 'You have completed Portuguese A2 Practical 2 — you can compare choices and give reasons.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_THREE_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-3',
  title: 'Portuguese A2 Practical 3',
  shortTitle: 'A2 Practical 3',
  subtitle: { de: 'Gestern und gerade eben', en: 'Yesterday and just now' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical3Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'ja-paguei-no-caixa', title: { de: 'Schon bezahlt', en: 'Already paid' },
    situation: { de: 'An der Kasse fragt die Kassiererin, ob du jetzt bezahlen möchtest — du hast bereits mit Karte bezahlt.', en: 'At the register, the cashier asks whether you would like to pay now — you have already paid by card.' },
    pedagogicalGoal: 'Die abgeschlossene Handlung paguei mit já am Kassentresen verwenden.',
    targetText: 'Já paguei no caixa com cartão.', baseText: { de: 'Ich habe schon an der Kasse mit Karte bezahlt.', en: 'I already paid at the register by card.' },
    chunks: [{ targetText: 'Já paguei', baseText: { de: 'Ich habe schon bezahlt', en: 'I already paid' } }, { targetText: 'no caixa', baseText: { de: 'an der Kasse', en: 'at the register' } }, { targetText: 'com cartão.', baseText: { de: 'mit Karte.', en: 'by card.' } }],
    terms: [{ targetText: 'paguei', baseText: { de: 'ich bezahlte', en: 'I paid' } }, { targetText: 'caixa', baseText: { de: 'Kasse', en: 'register' } }, { targetText: 'cartão', baseText: { de: 'Karte', en: 'card' } }, { targetText: 'já', baseText: { de: 'schon', en: 'already' } }, { targetText: 'com cartão', baseText: { de: 'mit Karte', en: 'by card' } }],
    recall: { before: 'Já ', answer: 'paguei', after: ' no caixa com cartão.', fallbackChoices: ['paguei', 'comprei', 'pedi', 'provei'] }, speakRequired: ['paguei', 'caixa', 'cartão'],
    sceneCaption: { de: 'Die Kassiererin hält das Kartenterminal hin und fragt: „Você quer pagar agora?“', en: 'The cashier holds out the card terminal and asks: “Você quer pagar agora?”' },
    trophyWord: { word: 'caixa', meaning: { de: 'Kasse', en: 'register' }, example: 'Paguei no caixa antes de sair.', whyThisWord: { de: 'caixa benennt genau den Ort, an dem du eine bereits erledigte Zahlung erklärst.', en: 'caixa names the exact place where you explain that payment is already done.' } },
    distractors: ['Vou pagar agora', 'Em dinheiro'], placeholderCaption: { de: 'Kassentresen mit Kartenlesegerät und Quittung.', en: 'Checkout counter with card reader and receipt.' }, songMood: 'quick counter confirmation', visualNotes: 'Small store register, card terminal, receipt already in the customer’s hand.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'cheguei-ontem-no-hotel', title: { de: 'Gestern angekommen', en: 'Arrived yesterday' },
    situation: { de: 'An der Hotelrezeption fragt man, wann du angekommen bist — du nennst den gestrigen Abend.', en: 'At hotel reception, you are asked when you arrived — name yesterday evening.' },
    pedagogicalGoal: 'Das Perfekt cheguei mit ontem à noite sicher einsetzen.',
    targetText: 'Cheguei ontem à noite no hotel.', baseText: { de: 'Ich bin gestern Abend im Hotel angekommen.', en: 'I arrived at the hotel yesterday evening.' },
    chunks: [{ targetText: 'Cheguei ontem', baseText: { de: 'Ich bin gestern angekommen', en: 'I arrived yesterday' } }, { targetText: 'à noite', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: 'no hotel.', baseText: { de: 'im Hotel.', en: 'at the hotel.' } }],
    terms: [{ targetText: 'cheguei', baseText: { de: 'ich bin angekommen', en: 'I arrived' } }, { targetText: 'ontem', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'à noite', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: 'hotel', baseText: { de: 'Hotel', en: 'hotel' } }, { targetText: 'no hotel', baseText: { de: 'im Hotel', en: 'at the hotel' } }],
    recall: { before: '', answer: 'Cheguei', after: ' ontem à noite no hotel.', fallbackChoices: ['Cheguei', 'Fui', 'Dormi', 'Terminei'] }, speakRequired: ['cheguei', 'ontem', 'hotel'],
    sceneCaption: { de: 'Die Rezeptionistin sieht auf den Pass und fragt: „Quando você chegou?“', en: 'The receptionist looks at your passport and asks: “Quando você chegou?”' },
    trophyWord: { word: 'cheguei', meaning: { de: 'ich kam an', en: 'I arrived' }, example: 'Cheguei cedo para a consulta.', whyThisWord: { de: 'cheguei verbindet deine Ankunft klar mit dem gestrigen Abend.', en: 'cheguei clearly connects your arrival with yesterday evening.' } },
    distractors: ['Chego amanhã cedo', 'Com minha família'], placeholderCaption: { de: 'Hotelrezeption bei Abendlicht mit einem Koffer.', en: 'Hotel reception in evening light with a suitcase.' }, songMood: 'arrival memory', visualNotes: 'Evening hotel lobby, traveler with suitcase, receptionist checking details.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'ja-pedi-a-sopa', title: { de: 'Schon bestellt', en: 'Already ordered' },
    situation: { de: 'Im Restaurant fragt der Kellner, ob du schon gewählt hast — du hast die Tagessuppe bereits bestellt.', en: 'At the restaurant, the waiter asks whether you have chosen — you have already ordered the soup of the day.' },
    pedagogicalGoal: 'Mit já pedi ausdrücken, dass eine Bestellung bereits erledigt ist.',
    targetText: 'Já pedi a sopa do dia, obrigado.', baseText: { de: 'Ich habe die Tagessuppe schon bestellt, danke.', en: 'I already ordered the soup of the day, thank you.' },
    chunks: [{ targetText: 'Já pedi', baseText: { de: 'Ich habe schon bestellt', en: 'I already ordered' } }, { targetText: 'a sopa do dia,', baseText: { de: 'die Tagessuppe,', en: 'the soup of the day,' } }, { targetText: 'obrigado.', baseText: { de: 'danke.', en: 'thank you.' } }],
    terms: [{ targetText: 'pedi', baseText: { de: 'ich bestellte', en: 'I ordered' } }, { targetText: 'sopa', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'do dia', baseText: { de: 'des Tages', en: 'of the day' } }, { targetText: 'já pedi', baseText: { de: 'ich habe schon bestellt', en: 'I already ordered' } }, { targetText: 'obrigado', baseText: { de: 'danke', en: 'thank you' } }],
    recall: { before: 'Já ', answer: 'pedi', after: ' a sopa do dia, obrigado.', fallbackChoices: ['pedi', 'paguei', 'comprei', 'provei'] }, speakRequired: ['pedi', 'sopa', 'dia'],
    sceneCaption: { de: 'Der Kellner kommt mit dem Notizblock und fragt: „Você já escolheu?“', en: 'The waiter comes with a notepad and asks: “Você já escolheu?”' },
    trophyWord: { word: 'sopa', meaning: { de: 'Suppe', en: 'soup' }, example: 'A sopa do dia está quente.', whyThisWord: { de: 'sopa macht deine bereits abgeschlossene Bestellung im Restaurant konkret.', en: 'sopa makes your already completed restaurant order concrete.' } },
    distractors: ['Quero pedir agora', 'Uma salada pequena'], placeholderCaption: { de: 'Restauranttisch mit Notizblock und dampfender Suppe.', en: 'Restaurant table with a notepad and steaming soup.' }, songMood: 'settled restaurant order', visualNotes: 'Restaurant table, waiter with notepad, soup already on its way.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'hoje-comprei-tomates-na-feira', title: { de: 'Tomaten auf dem Markt', en: 'Tomatoes at the market' },
    situation: { de: 'Eine Nachbarin fragt, ob du heute schon auf dem Wochenmarkt warst — du erzählst, was du früh gekauft hast.', en: 'A neighbor asks whether you have been to the street market today — say what you bought early.' },
    pedagogicalGoal: 'Mit hoje comprei eine heute abgeschlossene Besorgung ausdrücken.',
    targetText: 'Hoje comprei tomates na feira cedo.', baseText: { de: 'Heute habe ich früh Tomaten auf dem Wochenmarkt gekauft.', en: 'Today I bought tomatoes early at the street market.' },
    chunks: [{ targetText: 'Hoje comprei', baseText: { de: 'Heute habe ich gekauft', en: 'Today I bought' } }, { targetText: 'tomates na feira', baseText: { de: 'Tomaten auf dem Wochenmarkt', en: 'tomatoes at the street market' } }, { targetText: 'cedo.', baseText: { de: 'früh.', en: 'early.' } }],
    terms: [{ targetText: 'comprei', baseText: { de: 'ich habe gekauft', en: 'I bought' } }, { targetText: 'tomates', baseText: { de: 'Tomaten', en: 'tomatoes' } }, { targetText: 'feira', baseText: { de: 'Wochenmarkt', en: 'street market' } }, { targetText: 'cedo', baseText: { de: 'früh', en: 'early' } }, { targetText: 'na feira', baseText: { de: 'auf dem Wochenmarkt', en: 'at the street market' } }],
    recall: { before: 'Hoje ', answer: 'comprei', after: ' tomates na feira cedo.', fallbackChoices: ['comprei', 'paguei', 'fui', 'vi'] }, speakRequired: ['comprei', 'tomates', 'feira'],
    sceneCaption: { de: 'Deine Nachbarin trägt eine Stofftasche und fragt: „Você passou na feira hoje?“', en: 'Your neighbor carries a cloth bag and asks: “Você passou na feira hoje?”' },
    trophyWord: { word: 'tomates', meaning: { de: 'Tomaten', en: 'tomatoes' }, example: 'Comprei tomates para a salada.', whyThisWord: { de: 'tomates gibt deiner heutigen Markterledigung ein klares, alltägliches Detail.', en: 'tomates gives your market errand today a clear, everyday detail.' } },
    distractors: ['Vou à feira amanhã', 'Para comprar bananas'], placeholderCaption: { de: 'Stofftasche mit Tomaten auf dem Wochenmarkt.', en: 'Cloth bag with tomatoes at a street market.' }, songMood: 'morning market update', visualNotes: 'Morning street market, cloth bag of tomatoes, neighbor meeting outside.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'hoje-de-manha-fui-a-feira', title: { de: 'Heute Morgen', en: 'This morning' },
    situation: { de: 'Ein Nachbar fragt, wann du zum Wochenmarkt gegangen bist — du nennst den frühen Morgen.', en: 'A neighbor asks when you went to the street market — name the early morning.' },
    pedagogicalGoal: 'Das Perfekt fui mit hoje de manhã verwenden.',
    targetText: 'Hoje de manhã fui à feira bem cedo.', baseText: { de: 'Heute Morgen bin ich sehr früh zum Wochenmarkt gegangen.', en: 'This morning I went to the street market very early.' },
    chunks: [{ targetText: 'Hoje de manhã', baseText: { de: 'Heute Morgen', en: 'This morning' } }, { targetText: 'fui à feira', baseText: { de: 'bin ich zum Wochenmarkt gegangen', en: 'I went to the street market' } }, { targetText: 'bem cedo.', baseText: { de: 'sehr früh.', en: 'very early.' } }],
    terms: [{ targetText: 'manhã', baseText: { de: 'Morgen', en: 'morning' } }, { targetText: 'fui', baseText: { de: 'ich bin gegangen', en: 'I went' } }, { targetText: 'feira', baseText: { de: 'Wochenmarkt', en: 'street market' } }, { targetText: 'bem cedo', baseText: { de: 'sehr früh', en: 'very early' } }, { targetText: 'hoje de manhã', baseText: { de: 'heute Morgen', en: 'this morning' } }],
    recall: { before: 'Hoje de manhã ', answer: 'fui', after: ' à feira bem cedo.', fallbackChoices: ['fui', 'vi', 'dormi', 'fiz'] }, speakRequired: ['manhã', 'fui', 'feira'],
    sceneCaption: { de: 'Dein Nachbar schließt die Haustür auf und fragt: „Quando você foi à feira?“', en: 'Your neighbor unlocks the building door and asks: “Quando você foi à feira?”' },
    trophyWord: { word: 'cedo', meaning: { de: 'früh', en: 'early' }, example: 'Cheguei cedo para pegar pão.', whyThisWord: { de: 'cedo macht deutlich, dass dein Besuch auf dem Wochenmarkt früh am Morgen abgeschlossen war.', en: 'cedo makes clear that your visit to the street market was completed early in the morning.' } },
    distractors: ['Vou à feira tarde', 'Depois do trabalho'], placeholderCaption: { de: 'Früher Wochenmarkt mit gerade geöffneten Ständen.', en: 'Early street market with stalls just opening.' }, songMood: 'early market walk', visualNotes: 'Soft morning light over a Brazilian street market opening for the day.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'ontem-tive-dor-de-cabeca', title: { de: 'Gestern war es schwer', en: 'Yesterday was rough' },
    situation: { de: 'Eine Nachbarin fragt besorgt, warum du gestern nicht draußen warst — du erklärst kurz, dass es dir heute besser geht.', en: 'A neighbor asks with concern why you were not outside yesterday — briefly explain that you are better today.' },
    pedagogicalGoal: 'Mit tive einen vergangenen Zustand nennen und zur Gegenwart zurückkehren.',
    targetText: 'Ontem tive dor de cabeça, mas hoje estou melhor.', baseText: { de: 'Gestern hatte ich Kopfschmerzen, aber heute geht es mir besser.', en: 'Yesterday I had a headache, but today I am better.' },
    chunks: [{ targetText: 'Ontem tive dor de cabeça,', baseText: { de: 'Gestern hatte ich Kopfschmerzen,', en: 'Yesterday I had a headache,' } }, { targetText: 'mas hoje', baseText: { de: 'aber heute', en: 'but today' } }, { targetText: 'estou melhor.', baseText: { de: 'geht es mir besser.', en: 'I am better.' } }],
    terms: [{ targetText: 'tive', baseText: { de: 'ich hatte', en: 'I had' } }, { targetText: 'dor', baseText: { de: 'Schmerz', en: 'pain' } }, { targetText: 'dor de cabeça', baseText: { de: 'Kopfschmerzen', en: 'headache' } }, { targetText: 'melhor', baseText: { de: 'besser', en: 'better' } }, { targetText: 'hoje', baseText: { de: 'heute', en: 'today' } }],
    recall: { before: 'Ontem ', answer: 'tive', after: ' dor de cabeça, mas hoje estou melhor.', fallbackChoices: ['tive', 'fui', 'vi', 'dormi'] }, speakRequired: ['tive', 'dor', 'melhor'],
    sceneCaption: { de: 'Deine Nachbarin begegnet dir am Briefkasten und fragt: „Você está melhor hoje?“', en: 'Your neighbor meets you by the mailboxes and asks: “Você está melhor hoje?”' },
    trophyWord: { word: 'dor', meaning: { de: 'Schmerz', en: 'pain' }, example: 'Tenho dor no braço hoje.', whyThisWord: { de: 'dor lässt dich den Grund für einen schlechten Tag kurz und konkret nennen.', en: 'dor lets you name the reason for a difficult day briefly and concretely.' } },
    distractors: ['Hoje tenho trabalho', 'E saio mais tarde'], placeholderCaption: { de: 'Nachbarinnen am Briefkasten eines Wohnhauses.', en: 'Neighbors by the mailboxes of an apartment building.' }, songMood: 'gentle recovery update', visualNotes: 'Quiet apartment lobby, caring neighbor conversation, daylight returning.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'ja-provei-o-prato-tipico', title: { de: 'Das typische Gericht', en: 'The local dish' },
    situation: { de: 'Im Restaurant empfiehlt der Kellner das typische Gericht — du hast es schon probiert.', en: 'At the restaurant, the waiter recommends the local dish — you have already tried it.' },
    pedagogicalGoal: 'Mit já provei auf eine Restaurantempfehlung reagieren.',
    targetText: 'Já provei o prato típico daqui.', baseText: { de: 'Ich habe das typische Gericht von hier schon probiert.', en: 'I already tried the local dish from here.' },
    chunks: [{ targetText: 'Já provei', baseText: { de: 'Ich habe schon probiert', en: 'I already tried' } }, { targetText: 'o prato típico', baseText: { de: 'das typische Gericht', en: 'the local dish' } }, { targetText: 'daqui.', baseText: { de: 'von hier.', en: 'from here.' } }],
    terms: [{ targetText: 'provei', baseText: { de: 'ich probierte', en: 'I tried' } }, { targetText: 'prato', baseText: { de: 'Gericht', en: 'dish' } }, { targetText: 'típico', baseText: { de: 'typisch', en: 'typical' } }, { targetText: 'daqui', baseText: { de: 'von hier', en: 'from here' } }, { targetText: 'já', baseText: { de: 'schon', en: 'already' } }],
    recall: { before: 'Já ', answer: 'provei', after: ' o prato típico daqui.', fallbackChoices: ['provei', 'pedi', 'comi', 'fiz'] }, speakRequired: ['provei', 'prato', 'típico'],
    sceneCaption: { de: 'Der Kellner lächelt und empfiehlt: „Você quer provar o prato típico daqui?“', en: 'The waiter smiles and recommends: “Você quer provar o prato típico daqui?”' },
    trophyWord: { word: 'típico', meaning: { de: 'typisch', en: 'typical' }, example: 'Este prato típico leva feijão e arroz.', whyThisWord: { de: 'típico zeigt, dass der Kellner eine lokale Spezialität empfiehlt.', en: 'típico shows that the waiter is recommending a local specialty.' } },
    distractors: ['Quero provar agora', 'Com suco de laranja'], placeholderCaption: { de: 'Typisches Gericht auf einem Restauranttisch.', en: 'Local dish on a restaurant table.' }, songMood: 'local food milestone', visualNotes: 'Colorful Brazilian local dish, waiter recommending it with a warm smile.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'ainda-nao-vi-a-catedral', title: { de: 'Die Kathedrale noch nicht', en: 'The cathedral, not yet' },
    situation: { de: 'Ein Nachbar fragt, ob du die Kathedrale schon gesehen hast — du sagst, dass sie noch auf deiner Liste steht.', en: 'A neighbor asks whether you have seen the cathedral yet — say it is still on your list.' },
    pedagogicalGoal: 'Mit ainda não vi eine noch offene Erfahrung ausdrücken.',
    targetText: 'Ainda não vi a catedral da cidade.', baseText: { de: 'Ich habe die Kathedrale der Stadt noch nicht gesehen.', en: 'I have not seen the city cathedral yet.' },
    chunks: [{ targetText: 'Ainda não vi', baseText: { de: 'Ich habe noch nicht gesehen', en: 'I have not seen yet' } }, { targetText: 'a catedral', baseText: { de: 'die Kathedrale', en: 'the cathedral' } }, { targetText: 'da cidade.', baseText: { de: 'der Stadt.', en: 'of the city.' } }],
    terms: [{ targetText: 'ainda não', baseText: { de: 'noch nicht', en: 'not yet' } }, { targetText: 'vi', baseText: { de: 'ich sah', en: 'I saw' } }, { targetText: 'catedral', baseText: { de: 'Kathedrale', en: 'cathedral' } }, { targetText: 'cidade', baseText: { de: 'Stadt', en: 'city' } }, { targetText: 'da cidade', baseText: { de: 'der Stadt', en: 'of the city' } }],
    recall: { before: 'Ainda não ', answer: 'vi', after: ' a catedral da cidade.', fallbackChoices: ['vi', 'fui', 'fiz', 'tive'] }, speakRequired: ['vi', 'catedral', 'cidade'],
    sceneCaption: { de: 'Dein Nachbar zeigt auf eine Postkarte und fragt: „Você já viu a catedral?“', en: 'Your neighbor points to a postcard and asks: “Você já viu a catedral?”' },
    trophyWord: { word: 'catedral', meaning: { de: 'Kathedrale', en: 'cathedral' }, example: 'A catedral fica no centro histórico.', whyThisWord: { de: 'catedral benennt die Sehenswürdigkeit, die du noch besuchen möchtest.', en: 'catedral names the landmark that you still want to visit.' } },
    distractors: ['Já fui ao museu', 'No fim de semana'], placeholderCaption: { de: 'Kathedrale hinter einem Platz mit einer Postkarte im Vordergrund.', en: 'Cathedral beyond a square with a postcard in the foreground.' }, songMood: 'curious city list', visualNotes: 'Historic cathedral across a city square, visitor holding a postcard.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'terminei-o-trabalho-cedo', title: { de: 'Früh fertig', en: 'Finished early' },
    situation: { de: 'Eine Nachbarin fragt, ob du jetzt Zeit hast — du erklärst, dass du heute früh mit der Arbeit fertig geworden bist.', en: 'A neighbor asks whether you have time now — explain that you finished work early today.' },
    pedagogicalGoal: 'Mit terminei eine heute abgeschlossene Arbeitsaufgabe nennen.',
    targetText: 'Terminei o trabalho cedo hoje, então tenho tempo.', baseText: { de: 'Ich habe die Arbeit heute früh beendet, also habe ich Zeit.', en: 'I finished work early today, so I have time.' },
    chunks: [{ targetText: 'Terminei o trabalho', baseText: { de: 'Ich habe die Arbeit beendet', en: 'I finished work' } }, { targetText: 'cedo hoje,', baseText: { de: 'heute früh,', en: 'early today,' } }, { targetText: 'então tenho tempo.', baseText: { de: 'also habe ich Zeit.', en: 'so I have time.' } }],
    terms: [{ targetText: 'terminei', baseText: { de: 'ich habe beendet', en: 'I finished' } }, { targetText: 'trabalho', baseText: { de: 'Arbeit', en: 'work' } }, { targetText: 'cedo', baseText: { de: 'früh', en: 'early' } }, { targetText: 'tempo', baseText: { de: 'Zeit', en: 'time' } }, { targetText: 'então', baseText: { de: 'also', en: 'so' } }],
    recall: { before: '', answer: 'Terminei', after: ' o trabalho cedo hoje, então tenho tempo.', fallbackChoices: ['Terminei', 'Comprei', 'Paguei', 'Cheguei'] }, speakRequired: ['terminei', 'trabalho', 'tempo'],
    sceneCaption: { de: 'Deine Nachbarin hält ihre Jacke in der Hand und fragt: „Você tem tempo agora?“', en: 'Your neighbor holds a jacket and asks: “Você tem tempo agora?”' },
    trophyWord: { word: 'então', meaning: { de: 'also; dann', en: 'so; then' }, example: 'Terminei cedo, então posso sair.', whyThisWord: { de: 'então verbindet dein frühes Arbeitsende direkt mit deiner freien Zeit.', en: 'então connects your early finish directly to your free time.' } },
    distractors: ['Trabalho até tarde', 'Hoje de manhã'], placeholderCaption: { de: 'Schreibtisch am späten Vormittag mit abgeschlossener Aufgabenliste.', en: 'Desk in late morning with a completed task list.' }, songMood: 'early finish relief', visualNotes: 'Tidy desk, completed checklist, daylight still bright outside.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'fiz-muitas-coisas-esta-semana', title: { de: 'Eine volle Woche', en: 'A full week' },
    situation: { de: 'Im Treppenhaus fragt ein Nachbar, wie deine Woche war — du fasst kurz zusammen, dass du viel erledigt hast.', en: 'In the stairwell, a neighbor asks how your week was — briefly sum up that you got a lot done.' },
    pedagogicalGoal: 'Mit fiz viele abgeschlossene Erledigungen dieser Woche zusammenfassen.',
    targetText: 'Fiz muitas coisas esta semana por aqui.', baseText: { de: 'Ich habe diese Woche hier viele Dinge erledigt.', en: 'I did many things around here this week.' },
    chunks: [{ targetText: 'Fiz muitas coisas', baseText: { de: 'Ich habe viele Dinge erledigt', en: 'I did many things' } }, { targetText: 'esta semana', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: 'por aqui.', baseText: { de: 'hier in der Gegend.', en: 'around here.' } }],
    terms: [{ targetText: 'fiz', baseText: { de: 'ich habe gemacht; erledigt', en: 'I did' } }, { targetText: 'muitas coisas', baseText: { de: 'viele Dinge', en: 'many things' } }, { targetText: 'semana', baseText: { de: 'Woche', en: 'week' } }, { targetText: 'por aqui', baseText: { de: 'hier in der Gegend', en: 'around here' } }, { targetText: 'esta semana', baseText: { de: 'diese Woche', en: 'this week' } }],
    recall: { before: '', answer: 'Fiz', after: ' muitas coisas esta semana por aqui.', fallbackChoices: ['Fiz', 'Vi', 'Fui', 'Tive'] }, speakRequired: ['fiz', 'coisas', 'semana'],
    sceneCaption: { de: 'Dein Nachbar bleibt im Treppenhaus stehen und fragt: „Você fez muita coisa esta semana?“', en: 'Your neighbor stops in the stairwell and asks: “Você fez muita coisa esta semana?”' },
    trophyWord: { word: 'semana', meaning: { de: 'Woche', en: 'week' }, example: 'Esta semana fiz muitas coisas no bairro.', whyThisWord: { de: 'semana hilft dir, mehrere abgeschlossene Erledigungen als kurzen Rückblick zu bündeln.', en: 'semana helps you bundle several completed errands into a short recap.' } },
    distractors: ['Vou fazer mais', 'Na próxima semana'], placeholderCaption: { de: 'Nachbarn im Treppenhaus neben einem Wochenplan.', en: 'Neighbors in a stairwell beside a weekly planner.' }, songMood: 'busy week recap', visualNotes: 'Friendly stairwell chat, small weekly planner, sense of earned progress.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_THREE_METADATA, portugueseA2Practical3Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 3 abgeschlossen — du kannst erste abgeschlossene Erlebnisse klar einordnen.', en: 'You have completed Portuguese A2 Practical 3 — you can clearly place your first completed experiences in time.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_FOUR_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-4',
  title: 'Portuguese A2 Practical 4',
  shortTitle: 'A2 Practical 4',
  subtitle: { de: 'Pläne und Änderungen: gemeinsam verabreden', en: 'Plans and changes: making arrangements' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical4Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'claro-vamos-tomar-cafe', title: { de: 'Kaffee planen', en: 'Coffee plan' },
    situation: { de: 'Ein Nachbar schlägt vor, zusammen Kaffee zu trinken — du sagst zu und nennst eine Uhrzeit.', en: 'A neighbor suggests having coffee together — accept and name a time.' },
    pedagogicalGoal: 'Eine Einladung mit claro annehmen und mit às quatro eine konkrete Zeit vorschlagen.',
    targetText: 'Claro, vamos tomar um café às quatro.', baseText: { de: 'Klar, lass uns um vier einen Kaffee trinken.', en: 'Sure, let’s have coffee at four.' },
    chunks: [{ targetText: 'Claro,', baseText: { de: 'Klar,', en: 'Sure,' } }, { targetText: 'vamos tomar um café', baseText: { de: 'lass uns einen Kaffee trinken', en: 'let’s have coffee' } }, { targetText: 'às quatro.', baseText: { de: 'um vier.', en: 'at four.' } }],
    terms: [{ targetText: 'claro', baseText: { de: 'klar; natürlich', en: 'sure; of course' } }, { targetText: 'vamos tomar', baseText: { de: 'lass uns etwas trinken', en: 'let’s have a drink' } }, { targetText: 'café', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'às quatro', baseText: { de: 'um vier', en: 'at four' } }, { targetText: 'quatro', baseText: { de: 'vier', en: 'four' } }],
    recall: { before: 'Claro, vamos tomar um café às ', answer: 'quatro', after: '.', fallbackChoices: ['quatro', 'sete', 'nove', 'dez'] }, speakRequired: ['claro', 'tomar', 'quatro'],
    sceneCaption: { de: 'Dein Nachbar bleibt vor dem Café stehen und fragt: „Vamos tomar um café?“', en: 'Your neighbor stops outside the café and asks: “Vamos tomar um café?”' },
    trophyWord: { word: 'claro', meaning: { de: 'klar; natürlich', en: 'sure; of course' }, example: 'Claro, podemos ir juntos.', whyThisWord: { de: 'claro nimmt eine freundliche Einladung sofort und natürlich an.', en: 'claro accepts a friendly invitation right away and naturally.' } },
    distractors: ['mas estou sem tempo', 'o portão está fechado'], placeholderCaption: { de: 'Zwei Nachbarn vor einem Café mit freien Stühlen.', en: 'Two neighbors outside a café with empty chairs.' }, songMood: 'easy coffee invitation', visualNotes: 'Late-afternoon Brazilian café terrace, two neighbors making a casual plan.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'amanha-vou-visitar-o-museu-no-centro', title: { de: 'Morgen ins Museum', en: 'Museum tomorrow' },
    situation: { de: 'Eine Bekannte fragt nach deinen Plänen für morgen — du erzählst von deinem Museumsbesuch.', en: 'An acquaintance asks about your plans for tomorrow — tell them about your museum visit.' },
    pedagogicalGoal: 'Mit vou visitar einen einfachen Plan für morgen ausdrücken.',
    targetText: 'Amanhã vou visitar o museu no centro.', baseText: { de: 'Morgen besuche ich das Museum im Zentrum.', en: 'Tomorrow I’m going to visit the museum in the center.' },
    chunks: [{ targetText: 'Amanhã vou visitar', baseText: { de: 'Morgen besuche ich', en: 'Tomorrow I’m going to visit' } }, { targetText: 'o museu', baseText: { de: 'das Museum', en: 'the museum' } }, { targetText: 'no centro.', baseText: { de: 'im Zentrum.', en: 'in the center.' } }],
    terms: [{ targetText: 'amanhã', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'vou visitar', baseText: { de: 'ich werde besuchen', en: 'I’m going to visit' } }, { targetText: 'visitar', baseText: { de: 'besuchen', en: 'to visit' } }, { targetText: 'museu', baseText: { de: 'Museum', en: 'museum' } }, { targetText: 'no centro', baseText: { de: 'im Zentrum', en: 'in the center' } }],
    recall: { before: 'Amanhã vou ', answer: 'visitar', after: ' o museu no centro.', fallbackChoices: ['visitar', 'comprar', 'marcar', 'cozinhar'] }, speakRequired: ['amanhã', 'visitar', 'museu'],
    sceneCaption: { de: 'Eine Bekannte schaut auf den Kalender und fragt: „O que você vai fazer amanhã?“', en: 'An acquaintance looks at the calendar and asks: “O que você vai fazer amanhã?”' },
    trophyWord: { word: 'visitar', meaning: { de: 'besuchen', en: 'to visit' }, example: 'Quero visitar o museu no domingo.', whyThisWord: { de: 'visitar macht einen nahen Ausflugsplan konkret.', en: 'visitar makes a near-future outing plan concrete.' } },
    distractors: ['trabalho até tarde', 'uma consulta na quinta'], placeholderCaption: { de: 'Museumseingang mit einem Plakat für die morgige Ausstellung.', en: 'Museum entrance with a poster for tomorrow’s exhibition.' }, songMood: 'curious museum plan', visualNotes: 'Bright museum facade, friends checking the next day’s plan.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'que-tal-ir-ao-cinema', title: { de: 'Kino am Freitag', en: 'Cinema on Friday' },
    situation: { de: 'Ein Freund fragt, ob du am Freitag frei bist — du schlägst einen Kinoabend vor.', en: 'A friend asks whether you are free on Friday — suggest a cinema evening.' },
    pedagogicalGoal: 'Mit que tal eine Verabredung für Freitagabend vorschlagen.',
    targetText: 'Que tal ir ao cinema na sexta à noite?', baseText: { de: 'Wie wäre es, am Freitagabend ins Kino zu gehen?', en: 'How about going to the cinema on Friday night?' },
    chunks: [{ targetText: 'Que tal', baseText: { de: 'Wie wäre es', en: 'How about' } }, { targetText: 'ir ao cinema', baseText: { de: 'ins Kino zu gehen', en: 'going to the cinema' } }, { targetText: 'na sexta', baseText: { de: 'am Freitag', en: 'on Friday' } }, { targetText: 'à noite?', baseText: { de: 'abends?', en: 'at night?' } }],
    terms: [{ targetText: 'que tal', baseText: { de: 'wie wäre es', en: 'how about' } }, { targetText: 'ir ao cinema', baseText: { de: 'ins Kino gehen', en: 'go to the cinema' } }, { targetText: 'cinema', baseText: { de: 'Kino', en: 'cinema' } }, { targetText: 'sexta', baseText: { de: 'Freitag', en: 'Friday' } }, { targetText: 'à noite', baseText: { de: 'abends', en: 'at night' } }],
    recall: { before: 'Que tal ir ao ', answer: 'cinema', after: ' na sexta à noite?', fallbackChoices: ['cinema', 'mercado', 'trabalho', 'banco'] }, speakRequired: ['tal', 'cinema', 'noite'],
    sceneCaption: { de: 'Ein Freund schreibt dir: „Você está livre na sexta?“', en: 'A friend messages you: “Você está livre na sexta?”' },
    trophyWord: { word: 'cinema', meaning: { de: 'Kino', en: 'cinema' }, example: 'O cinema fica perto da praça.', whyThisWord: { de: 'cinema gibt deinem Vorschlag für einen entspannten Abend ein klares Ziel.', en: 'cinema gives your suggestion for a relaxed evening a clear destination.' } },
    distractors: ['ficar em casa', 'no sábado cedo'], placeholderCaption: { de: 'Kinoplakat neben einem beleuchteten Gehweg am Abend.', en: 'Cinema poster beside a lit sidewalk at night.' }, songMood: 'playful movie-night proposal', visualNotes: 'Brazilian street at dusk, cinema marquee, friends making Friday plans.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'perfeito-encontro-voce-na-praca', title: { de: 'Treffen um acht', en: 'Meet at eight' },
    situation: { de: 'Eine Freundin schlägt die Praça als Treffpunkt um acht vor — du bestätigst Zeit und Ort.', en: 'A friend suggests the praça as the meeting place at eight — confirm the time and place.' },
    pedagogicalGoal: 'Zeit und Treffpunkt mit encontro você na praça bestätigen.',
    targetText: 'Perfeito, encontro você na praça às oito.', baseText: { de: 'Perfekt, ich treffe dich um acht auf dem Platz.', en: 'Perfect, I’ll meet you at the square at eight.' },
    chunks: [{ targetText: 'Perfeito,', baseText: { de: 'Perfekt,', en: 'Perfect,' } }, { targetText: 'encontro você', baseText: { de: 'ich treffe dich', en: 'I’ll meet you' } }, { targetText: 'na praça', baseText: { de: 'auf dem Platz', en: 'at the square' } }, { targetText: 'às oito.', baseText: { de: 'um acht.', en: 'at eight.' } }],
    terms: [{ targetText: 'perfeito', baseText: { de: 'perfekt', en: 'perfect' } }, { targetText: 'encontro', baseText: { de: 'ich treffe', en: 'I meet' } }, { targetText: 'praça', baseText: { de: 'Platz', en: 'square' } }, { targetText: 'oito', baseText: { de: 'acht', en: 'eight' } }, { targetText: 'às oito', baseText: { de: 'um acht', en: 'at eight' } }],
    recall: { before: 'Perfeito, encontro você na ', answer: 'praça', after: ' às oito.', fallbackChoices: ['praça', 'rua', 'feira', 'ponte'] }, speakRequired: ['perfeito', 'encontro', 'praça'],
    sceneCaption: { de: 'Deine Freundin bestätigt den Plan und fragt: „Encontramos na praça às oito?“', en: 'Your friend confirms the plan and asks: “Encontramos na praça às oito?”' },
    trophyWord: { word: 'praça', meaning: { de: 'Platz', en: 'square' }, example: 'A praça fica perto do museu.', whyThisWord: { de: 'praça benennt den vertrauten Ort, an dem ihr euch trefft.', en: 'praça names the familiar place where you meet.' } },
    distractors: ['mas estou sem tempo', 'o portão está fechado'], placeholderCaption: { de: 'Brunnen auf einer Praça mit einer großen Uhr im Hintergrund.', en: 'Fountain in a praça with a large clock in the background.' }, songMood: 'confident meeting point', visualNotes: 'Evening town square, clock tower, friends agreeing where to meet.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'podemos-mudar-para-sabado', title: { de: 'Auf Samstag verschieben', en: 'Move it to Saturday' },
    situation: { de: 'Der ursprüngliche Termin passt nicht mehr — du fragst, ob ihr ihn auf Samstagvormittag verschieben könnt.', en: 'The original time no longer works — ask whether you can move it to Saturday morning.' },
    pedagogicalGoal: 'Mit podemos mudar einen Termin auf Samstagvormittag verschieben.',
    targetText: 'Podemos mudar para sábado de manhã?', baseText: { de: 'Können wir es auf Samstagvormittag verschieben?', en: 'Can we move it to Saturday morning?' },
    chunks: [{ targetText: 'Podemos mudar', baseText: { de: 'Können wir verschieben', en: 'Can we move' } }, { targetText: 'para sábado', baseText: { de: 'auf Samstag', en: 'to Saturday' } }, { targetText: 'de manhã?', baseText: { de: 'vormittags?', en: 'in the morning?' } }],
    terms: [{ targetText: 'podemos mudar', baseText: { de: 'können wir verschieben', en: 'can we move' } }, { targetText: 'mudar', baseText: { de: 'ändern; verschieben', en: 'change; move' } }, { targetText: 'sábado', baseText: { de: 'Samstag', en: 'Saturday' } }, { targetText: 'manhã', baseText: { de: 'Morgen; Vormittag', en: 'morning' } }, { targetText: 'sábado de manhã', baseText: { de: 'Samstagvormittag', en: 'Saturday morning' } }],
    recall: { before: 'Podemos mudar para ', answer: 'sábado', after: ' de manhã?', fallbackChoices: ['sábado', 'ontem', 'agora', 'tarde'] }, speakRequired: ['podemos', 'mudar', 'sábado'],
    sceneCaption: { de: 'Ein Freund schaut auf seinen Kalender und sagt: „Amanhã não dá para mim.“', en: 'A friend looks at the calendar and says: “Amanhã não dá para mim.”' },
    trophyWord: { word: 'sábado', meaning: { de: 'Samstag', en: 'Saturday' }, example: 'No sábado tenho mais tempo.', whyThisWord: { de: 'sábado bietet eine einfache, konkrete Alternative für euren Plan.', en: 'sábado gives a simple, concrete alternative for your plan.' } },
    distractors: ['o museu fecha cedo', 'com muito barulho'], placeholderCaption: { de: 'Kalender mit einem auf Samstag verschobenen Termin.', en: 'Calendar with an appointment moved to Saturday.' }, songMood: 'flexible rescheduling', visualNotes: 'Phone calendar with a Saturday morning slot highlighted.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'desculpe-hoje-nao-posso', title: { de: 'Heute nicht möglich', en: 'Can’t today' },
    situation: { de: 'Ein Nachbar lädt dich für heute Abend ein — du musst höflich absagen, weil du viel Arbeit hast.', en: 'A neighbor invites you out this evening — politely decline because you have a lot of work.' },
    pedagogicalGoal: 'Mit desculpe, não posso höflich absagen und einen einfachen Grund nennen.',
    targetText: 'Desculpe, hoje não posso; tenho muito trabalho.', baseText: { de: 'Entschuldige, heute kann ich nicht; ich habe viel Arbeit.', en: 'Sorry, I can’t today; I have a lot of work.' },
    chunks: [{ targetText: 'Desculpe,', baseText: { de: 'Entschuldige,', en: 'Sorry,' } }, { targetText: 'hoje não posso;', baseText: { de: 'heute kann ich nicht;', en: 'I can’t today;' } }, { targetText: 'tenho muito trabalho.', baseText: { de: 'ich habe viel Arbeit.', en: 'I have a lot of work.' } }],
    terms: [{ targetText: 'desculpe', baseText: { de: 'entschuldige', en: 'sorry' } }, { targetText: 'não posso', baseText: { de: 'ich kann nicht', en: 'I can’t' } }, { targetText: 'muito trabalho', baseText: { de: 'viel Arbeit', en: 'a lot of work' } }, { targetText: 'trabalho', baseText: { de: 'Arbeit', en: 'work' } }, { targetText: 'hoje', baseText: { de: 'heute', en: 'today' } }],
    recall: { before: 'Desculpe, hoje não posso; tenho muito ', answer: 'trabalho', after: '.', fallbackChoices: ['trabalho', 'café', 'sono', 'calor'] }, speakRequired: ['desculpe', 'posso', 'trabalho'],
    sceneCaption: { de: 'Dein Nachbar hält seine Jacke hoch und fragt: „Você quer sair hoje à noite?“', en: 'Your neighbor holds up a jacket and asks: “Você quer sair hoje à noite?”' },
    trophyWord: { word: 'trabalho', meaning: { de: 'Arbeit', en: 'work' }, example: 'Tenho muito trabalho nesta semana.', whyThisWord: { de: 'trabalho gibt deiner Absage einen einfachen, glaubwürdigen Grund.', en: 'trabalho gives your refusal a simple, believable reason.' } },
    distractors: ['mas estou sem dinheiro', 'a praça fica longe'], placeholderCaption: { de: 'Schreibtisch mit einer langen Aufgabenliste am Abend.', en: 'Desk with a long task list in the evening.' }, songMood: 'gentle busy-evening refusal', visualNotes: 'Warm apartment desk light, a full work list, neighbor invitation on a phone.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quero-convidar-voce-para-jantar', title: { de: 'Zum Abendessen einladen', en: 'Invite to dinner' },
    situation: { de: 'Eine Nachbarin fragt, ob du morgen etwas vorhast — du lädst sie zum Abendessen ein.', en: 'A neighbor asks whether you have plans tomorrow — invite her to dinner.' },
    pedagogicalGoal: 'Mit quero convidar você eine persönliche Einladung zum Essen aussprechen.',
    targetText: 'Quero convidar você para jantar amanhã.', baseText: { de: 'Ich möchte dich morgen zum Abendessen einladen.', en: 'I want to invite you to dinner tomorrow.' },
    chunks: [{ targetText: 'Quero convidar você', baseText: { de: 'Ich möchte dich einladen', en: 'I want to invite you' } }, { targetText: 'para jantar', baseText: { de: 'zum Abendessen', en: 'to dinner' } }, { targetText: 'amanhã.', baseText: { de: 'morgen.', en: 'tomorrow.' } }],
    terms: [{ targetText: 'quero convidar', baseText: { de: 'ich möchte einladen', en: 'I want to invite' } }, { targetText: 'convidar', baseText: { de: 'einladen', en: 'to invite' } }, { targetText: 'jantar', baseText: { de: 'zu Abend essen; Abendessen', en: 'have dinner; dinner' } }, { targetText: 'amanhã', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'para jantar', baseText: { de: 'zum Abendessen', en: 'to dinner' } }],
    recall: { before: 'Quero ', answer: 'convidar', after: ' você para jantar amanhã.', fallbackChoices: ['convidar', 'perguntar', 'esperar', 'pagar'] }, speakRequired: ['quero', 'convidar', 'jantar'],
    sceneCaption: { de: 'Deine Nachbarin kommt mit Einkäufen heim und fragt: „Você vai fazer alguma coisa amanhã?“', en: 'Your neighbor comes home with groceries and asks: “Você vai fazer alguma coisa amanhã?”' },
    trophyWord: { word: 'convidar', meaning: { de: 'einladen', en: 'to invite' }, example: 'Quero convidar você para um café.', whyThisWord: { de: 'convidar lässt deine Verabredung warm und direkt klingen.', en: 'convidar makes your invitation sound warm and direct.' } },
    distractors: ['depois do trabalho', 'mas não tenho tempo'], placeholderCaption: { de: 'Gedeckter kleiner Esstisch in einer Wohnung.', en: 'Small dinner table set in an apartment.' }, songMood: 'warm dinner invitation', visualNotes: 'Cozy Brazilian home dinner table, friendly neighbor invitation.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'vou-chegar-um-pouco-mais-tarde', title: { de: 'Ein wenig später', en: 'A little later' },
    situation: { de: 'Deine Freundin wartet um acht an der Praça — du schreibst ihr, dass du etwas später ankommst.', en: 'Your friend is waiting at the praça at eight — tell her you will arrive a little later.' },
    pedagogicalGoal: 'Mit vou chegar um pouco mais tarde eine kleine Verspätung höflich ankündigen.',
    targetText: 'Desculpe, vou chegar um pouco mais tarde.', baseText: { de: 'Entschuldige, ich werde etwas später ankommen.', en: 'Sorry, I’m going to arrive a little later.' },
    chunks: [{ targetText: 'Desculpe,', baseText: { de: 'Entschuldige,', en: 'Sorry,' } }, { targetText: 'vou chegar', baseText: { de: 'ich werde ankommen', en: 'I’m going to arrive' } }, { targetText: 'um pouco mais tarde.', baseText: { de: 'ein wenig später.', en: 'a little later.' } }],
    terms: [{ targetText: 'desculpe', baseText: { de: 'entschuldige', en: 'sorry' } }, { targetText: 'vou chegar', baseText: { de: 'ich werde ankommen', en: 'I’m going to arrive' } }, { targetText: 'chegar', baseText: { de: 'ankommen', en: 'to arrive' } }, { targetText: 'um pouco', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: 'mais tarde', baseText: { de: 'später', en: 'later' } }],
    recall: { before: 'Desculpe, vou chegar um pouco mais ', answer: 'tarde', after: '.', fallbackChoices: ['tarde', 'cedo', 'longe', 'junto'] }, speakRequired: ['chegar', 'pouco', 'tarde'],
    sceneCaption: { de: 'Deine Freundin schreibt aus der Praça: „Você chega às oito?“', en: 'Your friend messages from the praça: “Você chega às oito?”' },
    trophyWord: { word: 'tarde', meaning: { de: 'spät; später', en: 'late; later' }, example: 'Hoje saio mais tarde.', whyThisWord: { de: 'tarde hilft dir, eine kleine Planänderung freundlich mitzuteilen.', en: 'tarde helps you communicate a small change of plan politely.' } },
    distractors: ['mas estou sem tempo', 'o filme já começa'], placeholderCaption: { de: 'Handy mit einer Nachricht neben einer großen Praça-Uhr.', en: 'Phone with a message beside a large praça clock.' }, songMood: 'kind late-arrival note', visualNotes: 'Phone message on a city square bench, evening light and a clock.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'sabado-as-oito-na-praca-combinado', title: { de: 'Den neuen Plan bestätigen', en: 'Confirm the new plan' },
    situation: { de: 'Ihr habt die Verabredung verschoben — du wiederholst den neuen Zeitpunkt und fragst nach Bestätigung.', en: 'You have rescheduled the plan — repeat the new time and ask for confirmation.' },
    pedagogicalGoal: 'Einen geänderten Plan mit combinado kurz und klar bestätigen lassen.',
    targetText: 'Então, sábado às oito na praça, combinado?', baseText: { de: 'Also, Samstag um acht auf dem Platz, abgemacht?', en: 'So, Saturday at eight at the square, agreed?' },
    chunks: [{ targetText: 'Então, sábado às oito', baseText: { de: 'Also, Samstag um acht', en: 'So, Saturday at eight' } }, { targetText: 'na praça,', baseText: { de: 'auf dem Platz,', en: 'at the square,' } }, { targetText: 'combinado?', baseText: { de: 'abgemacht?', en: 'agreed?' } }],
    terms: [{ targetText: 'sábado', baseText: { de: 'Samstag', en: 'Saturday' } }, { targetText: 'às oito', baseText: { de: 'um acht', en: 'at eight' } }, { targetText: 'praça', baseText: { de: 'Platz', en: 'square' } }, { targetText: 'combinado', baseText: { de: 'abgemacht', en: 'agreed' } }, { targetText: 'sábado às oito', baseText: { de: 'Samstag um acht', en: 'Saturday at eight' } }],
    recall: { before: 'Então, sábado às oito na praça, ', answer: 'combinado', after: '?', fallbackChoices: ['combinado', 'ocupado', 'fechado', 'distante'] }, speakRequired: ['sábado', 'oito', 'combinado'],
    sceneCaption: { de: 'Dein Freund stimmt der Verschiebung zu und sagt: „Sábado para mim está ótimo.“', en: 'Your friend agrees to the change and says: “Sábado para mim está ótimo.”' },
    trophyWord: { word: 'combinado', meaning: { de: 'abgemacht', en: 'agreed' }, example: 'Sábado às oito, combinado?', whyThisWord: { de: 'combinado schließt eine Verabredung kurz und freundlich ab.', en: 'combinado closes an arrangement briefly and warmly.' } },
    distractors: ['o museu fecha cedo', 'mas estou no trabalho'], placeholderCaption: { de: 'Chat-Nachrichten mit bestätigtem Samstagstermin.', en: 'Chat messages with a confirmed Saturday appointment.' }, songMood: 'clear plan confirmation', visualNotes: 'Friendly chat confirmation, Saturday evening plan and town square icon.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'vou-descansar-e-fazer-uma-viagem', title: { de: 'Wochenendplan', en: 'Weekend plan' },
    situation: { de: 'Ein Nachbar fragt nach deinen Wochenendplänen — du erwähnst Erholung und einen kurzen Ausflug.', en: 'A neighbor asks about your weekend plans — mention rest and a short trip.' },
    pedagogicalGoal: 'Mit vou + Infinitiv zwei einfache Wochenendpläne verbinden.',
    targetText: 'No fim de semana, vou descansar e fazer uma viagem curta.', baseText: { de: 'Am Wochenende werde ich mich ausruhen und einen kurzen Ausflug machen.', en: 'At the weekend, I’m going to rest and take a short trip.' },
    chunks: [{ targetText: 'No fim de semana,', baseText: { de: 'Am Wochenende,', en: 'At the weekend,' } }, { targetText: 'vou descansar', baseText: { de: 'werde ich mich ausruhen', en: 'I’m going to rest' } }, { targetText: 'e fazer uma viagem curta.', baseText: { de: 'und einen kurzen Ausflug machen.', en: 'and take a short trip.' } }],
    terms: [{ targetText: 'fim de semana', baseText: { de: 'Wochenende', en: 'weekend' } }, { targetText: 'vou descansar', baseText: { de: 'ich werde mich ausruhen', en: 'I’m going to rest' } }, { targetText: 'descansar', baseText: { de: 'sich ausruhen', en: 'to rest' } }, { targetText: 'viagem', baseText: { de: 'Reise; Ausflug', en: 'trip' } }, { targetText: 'curta', baseText: { de: 'kurz', en: 'short' } }],
    recall: { before: 'No fim de semana, vou ', answer: 'descansar', after: ' e fazer uma viagem curta.', fallbackChoices: ['descansar', 'mudar', 'pagar', 'ligar'] }, speakRequired: ['fim', 'descansar', 'viagem'],
    sceneCaption: { de: 'Dein Nachbar schließt die Haustür auf und fragt: „Você tem planos para o fim de semana?“', en: 'Your neighbor unlocks the building door and asks: “Você tem planos para o fim de semana?”' },
    trophyWord: { word: 'descansar', meaning: { de: 'sich ausruhen', en: 'to rest' }, example: 'No domingo quero descansar em casa.', whyThisWord: { de: 'descansar gibt deinem Wochenendplan eine ruhige, persönliche Note.', en: 'descansar gives your weekend plan a calm, personal note.' } },
    distractors: ['mas o museu fecha', 'depois das oito'], placeholderCaption: { de: 'Kleiner Koffer neben einem entspannten Wochenendplaner.', en: 'Small suitcase beside a relaxed weekend planner.' }, songMood: 'restful short-trip anticipation', visualNotes: 'Weekend bag, train ticket, and a calm apartment morning.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_FOUR_METADATA, portugueseA2Practical4Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 4 abgeschlossen — du kannst Pläne machen, ändern und freundlich absagen.', en: 'You have completed Portuguese A2 Practical 4 — you can make plans, change them, and decline politely.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_FIVE_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-5',
  title: 'Portuguese A2 Practical 5',
  shortTitle: 'A2 Practical 5',
  subtitle: { de: 'Eigentlich nicht: höflich korrigieren', en: 'Actually, no: polite corrections' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical5Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'desculpe-pedi-um-cha', title: { de: 'Die falsche Bestellung', en: 'The wrong order' },
    situation: { de: 'Im Café stellt die Barista einen Kaffee hin — du korrigierst freundlich, dass du Tee bestellt hast.', en: 'At the café, the barista sets down a coffee — politely correct that you ordered tea.' },
    pedagogicalGoal: 'Mit pedi eine bereits gemachte Bestellung höflich korrigieren.',
    targetText: 'Desculpe, pedi um chá, não um café.', baseText: { de: 'Entschuldige, ich habe einen Tee bestellt, keinen Kaffee.', en: 'Sorry, I ordered tea, not coffee.' },
    chunks: [{ targetText: 'Desculpe, pedi', baseText: { de: 'Entschuldige, ich habe bestellt', en: 'Sorry, I ordered' } }, { targetText: 'um chá,', baseText: { de: 'einen Tee,', en: 'tea,' } }, { targetText: 'não um café.', baseText: { de: 'keinen Kaffee.', en: 'not coffee.' } }],
    terms: [{ targetText: 'pedi', baseText: { de: 'ich bestellte', en: 'I ordered' } }, { targetText: 'chá', baseText: { de: 'Tee', en: 'tea' } }, { targetText: 'café', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'pedi um chá', baseText: { de: 'ich bestellte einen Tee', en: 'I ordered tea' } }, { targetText: 'não um café', baseText: { de: 'keinen Kaffee', en: 'not coffee' } }],
    recall: { before: 'Desculpe, ', answer: 'pedi', after: ' um chá, não um café.', fallbackChoices: ['pedi', 'vi', 'fui', 'dormi'] }, speakRequired: ['pedi', 'chá', 'café'],
    sceneCaption: { de: 'Die Barista stellt eine Tasse hin und fragt: „Você pediu café ou chá?“', en: 'The barista sets down a cup and asks: “Você pediu café ou chá?”' },
    trophyWord: { word: 'pedi', meaning: { de: 'ich bestellte', en: 'I ordered' }, example: 'Pedi um suco sem açúcar.', whyThisWord: { de: 'pedi erklärt ruhig, was du ursprünglich bestellt hast.', en: 'pedi calmly explains what you originally ordered.' } },
    distractors: ['quero pedir agora', 'com leite e açúcar'], placeholderCaption: { de: 'Kaffeetasse und Teekanne auf einem Café-Tresen.', en: 'Coffee cup and teapot on a café counter.' }, songMood: 'gentle order correction', visualNotes: 'Brazilian café counter, coffee and tea side by side, kind barista.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'voce-pode-trocar-esta-camisa', title: { de: 'Zu klein', en: 'Too small' },
    situation: { de: 'Im Laden fragst du nach einem Umtausch, weil das Hemd zu klein ist.', en: 'In a shop, ask for an exchange because the shirt is too small.' },
    pedagogicalGoal: 'Mit você pode trocar höflich um einen Umtausch bitten.',
    targetText: 'Você pode trocar esta camisa? Está pequena.', baseText: { de: 'Können Sie dieses Hemd umtauschen? Es ist zu klein.', en: 'Can you exchange this shirt? It is too small.' },
    chunks: [{ targetText: 'Você pode trocar', baseText: { de: 'Können Sie umtauschen', en: 'Can you exchange' } }, { targetText: 'esta camisa?', baseText: { de: 'dieses Hemd?', en: 'this shirt?' } }, { targetText: 'Está pequena.', baseText: { de: 'Es ist zu klein.', en: 'It is too small.' } }],
    terms: [{ targetText: 'você pode trocar', baseText: { de: 'können Sie umtauschen', en: 'can you exchange' } }, { targetText: 'trocar', baseText: { de: 'umtauschen', en: 'to exchange' } }, { targetText: 'camisa', baseText: { de: 'Hemd; Bluse', en: 'shirt' } }, { targetText: 'esta camisa', baseText: { de: 'dieses Hemd', en: 'this shirt' } }, { targetText: 'pequena', baseText: { de: 'klein', en: 'small' } }],
    recall: { before: 'Você pode ', answer: 'trocar', after: ' esta camisa? Está pequena.', fallbackChoices: ['trocar', 'lavar', 'fechar', 'escolher'] }, speakRequired: ['pode', 'trocar', 'camisa'],
    sceneCaption: { de: 'Die Verkäuferin zeigt auf die Umkleide und fragt: „A camisa serve?“', en: 'The shop assistant points to the fitting room and asks: “A camisa serve?”' },
    trophyWord: { word: 'trocar', meaning: { de: 'umtauschen', en: 'to exchange' }, example: 'Posso trocar este tamanho?', whyThisWord: { de: 'trocar löst einen einfachen Umtausch im Laden höflich aus.', en: 'trocar politely starts a simple exchange in a shop.' } },
    distractors: ['mas não tenho recibo', 'o mercado fecha cedo'], placeholderCaption: { de: 'Hemd auf einem Ladentresen neben einer Umkleidekabine.', en: 'Shirt on a shop counter beside a fitting room.' }, songMood: 'calm shop solution', visualNotes: 'Clothing store counter, shirt neatly folded, helpful assistant.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'eu-queria-agua-sem-gas', title: { de: 'Stilles Wasser', en: 'Still water' },
    situation: { de: 'Im Restaurant fragt der Kellner, ob Wasser mit Kohlensäure in Ordnung ist — du bittest höflich um stilles Wasser.', en: 'At the restaurant, the waiter asks whether sparkling water is fine — politely ask for still water.' },
    pedagogicalGoal: 'Mit eu queria eine Bestellung freundlich auf eine Alternative ändern.',
    targetText: 'Eu queria água sem gás, por favor.', baseText: { de: 'Ich hätte gern stilles Wasser, bitte.', en: 'I would like still water, please.' },
    chunks: [{ targetText: 'Eu queria', baseText: { de: 'Ich hätte gern', en: 'I would like' } }, { targetText: 'água sem gás,', baseText: { de: 'stilles Wasser,', en: 'still water,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'queria', baseText: { de: 'ich hätte gern', en: 'I would like' } }, { targetText: 'água', baseText: { de: 'Wasser', en: 'water' } }, { targetText: 'gás', baseText: { de: 'Kohlensäure; Gas', en: 'sparkling water; gas' } }, { targetText: 'água sem gás', baseText: { de: 'stilles Wasser', en: 'still water' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Eu queria água sem ', answer: 'gás', after: ', por favor.', fallbackChoices: ['gás', 'gelo', 'leite', 'limão'] }, speakRequired: ['queria', 'água', 'gás'],
    sceneCaption: { de: 'Der Kellner stellt eine Flasche hin und fragt: „Água com gás está bom?“', en: 'The waiter sets down a bottle and asks: “Água com gás está bom?”' },
    trophyWord: { word: 'gás', meaning: { de: 'Kohlensäure; Gas', en: 'sparkling water; gas' }, example: 'Prefiro água sem gás no almoço.', whyThisWord: { de: 'gás unterscheidet die zwei sehr üblichen Wasseroptionen im Restaurant.', en: 'gás distinguishes the two very common water options at a restaurant.' } },
    distractors: ['um suco bem gelado', 'mas a sopa está fria'], placeholderCaption: { de: 'Zwei Wasserflaschen, eine still und eine mit Kohlensäure.', en: 'Two water bottles, one still and one sparkling.' }, songMood: 'quiet restaurant adjustment', visualNotes: 'Restaurant table, still and sparkling water bottles, attentive waiter.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'prefiro-aquelas-bananas-nao-quero-estas', title: { de: 'Diese dort', en: 'Those ones' },
    situation: { de: 'Auf dem Wochenmarkt zeigt der Händler auf die falschen Bananen — du zeigst höflich auf die anderen.', en: 'At the feira, the vendor points to the wrong bananas — politely point to the other ones.' },
    pedagogicalGoal: 'Mit aquelas und não estas eine einfache Auswahl höflich korrigieren.',
    targetText: 'Prefiro aquelas bananas, não quero estas.', baseText: { de: 'Ich bevorzuge jene Bananen, diese möchte ich nicht.', en: 'I prefer those bananas; I don’t want these.' },
    chunks: [{ targetText: 'Prefiro', baseText: { de: 'Ich bevorzuge', en: 'I prefer' } }, { targetText: 'aquelas bananas,', baseText: { de: 'jene Bananen,', en: 'those bananas;' } }, { targetText: 'não quero estas.', baseText: { de: 'diese möchte ich nicht.', en: 'I don’t want these.' } }],
    terms: [{ targetText: 'prefiro', baseText: { de: 'ich bevorzuge', en: 'I prefer' } }, { targetText: 'aquelas bananas', baseText: { de: 'jene Bananen', en: 'those bananas' } }, { targetText: 'bananas', baseText: { de: 'Bananen', en: 'bananas' } }, { targetText: 'estas', baseText: { de: 'diese', en: 'these' } }, { targetText: 'não quero estas', baseText: { de: 'diese möchte ich nicht', en: 'I don’t want these' } }],
    recall: { before: 'Prefiro aquelas ', answer: 'bananas', after: ', não quero estas.', fallbackChoices: ['bananas', 'maçãs', 'tomates', 'laranjas'] }, speakRequired: ['prefiro', 'aquelas', 'bananas'],
    sceneCaption: { de: 'Der Händler hält ein Bündel hoch und fragt: „Você quer estas bananas?“', en: 'The vendor holds up a bunch and asks: “Você quer estas bananas?”' },
    trophyWord: { word: 'bananas', meaning: { de: 'Bananen', en: 'bananas' }, example: 'Aquelas bananas estão bem maduras.', whyThisWord: { de: 'bananas gibt deiner Korrektur auf dem Wochenmarkt ein alltägliches, sichtbares Ziel.', en: 'bananas gives your feira correction an everyday, visible object.' } },
    distractors: ['para fazer suco', 'mas estão verdes'], placeholderCaption: { de: 'Zwei Bananenbündel an einem Wochenmarktstand.', en: 'Two bunches of bananas at a feira stall.' }, songMood: 'friendly market choice', visualNotes: 'Colorful Brazilian street market, vendor holding two banana bunches.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'voce-pode-trocar-meu-quarto', title: { de: 'Zu viel Lärm', en: 'Too much noise' },
    situation: { de: 'Im Hotel ist dein Zimmer sehr laut — du bittest die Rezeption höflich um einen Wechsel.', en: 'At the hotel, your room is very noisy — politely ask reception for a change.' },
    pedagogicalGoal: 'Mit você pode trocar eine Zimmeränderung wegen Lärm anfragen.',
    targetText: 'Você pode trocar meu quarto? Tem muito barulho.', baseText: { de: 'Können Sie mein Zimmer wechseln? Es ist sehr laut.', en: 'Can you change my room? There is a lot of noise.' },
    chunks: [{ targetText: 'Você pode trocar', baseText: { de: 'Können Sie wechseln', en: 'Can you change' } }, { targetText: 'meu quarto?', baseText: { de: 'mein Zimmer?', en: 'my room?' } }, { targetText: 'Tem muito barulho.', baseText: { de: 'Es ist sehr laut.', en: 'There is a lot of noise.' } }],
    terms: [{ targetText: 'trocar', baseText: { de: 'wechseln', en: 'to change' } }, { targetText: 'meu quarto', baseText: { de: 'mein Zimmer', en: 'my room' } }, { targetText: 'barulho', baseText: { de: 'Lärm', en: 'noise' } }, { targetText: 'muito barulho', baseText: { de: 'viel Lärm', en: 'a lot of noise' } }, { targetText: 'você pode trocar', baseText: { de: 'können Sie wechseln', en: 'can you change' } }],
    recall: { before: 'Você pode trocar meu quarto? Tem muito ', answer: 'barulho', after: '.', fallbackChoices: ['barulho', 'calor', 'espaço', 'café'] }, speakRequired: ['pode', 'quarto', 'barulho'],
    sceneCaption: { de: 'Die Rezeptionistin fragt nach deinem Zimmer: „Está tudo bem no quarto?“', en: 'The receptionist asks about your room: “Está tudo bem no quarto?”' },
    trophyWord: { word: 'barulho', meaning: { de: 'Lärm', en: 'noise' }, example: 'Tem muito barulho na rua hoje.', whyThisWord: { de: 'barulho benennt das Problem kurz, ohne eine lange Beschwerde zu machen.', en: 'barulho names the problem briefly without making a long complaint.' } },
    distractors: ['mas não tenho reserva', 'a cama é pequena'], placeholderCaption: { de: 'Hotelflur mit einer Rezeption und einer ruhigen Zimmertür.', en: 'Hotel corridor with reception and a quiet room door.' }, songMood: 'polite hotel repair', visualNotes: 'Hotel reception, weary traveler requesting a quieter room.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'so-quero-o-carregador', title: { de: 'Nur das Ladegerät', en: 'Just the charger' },
    situation: { de: 'Im Handyshop bietet der Verkäufer zusätzlich eine Hülle an — du lehnst freundlich ab und nimmst nur das Ladegerät für dieses Handy.', en: 'At the phone shop, the seller also offers a case — politely decline and take only the charger for this phone.' },
    pedagogicalGoal: 'Mit só quero eine Zusatzempfehlung freundlich ablehnen.',
    targetText: 'Não, só quero o carregador deste celular, obrigado.', baseText: { de: 'Nein, ich möchte nur das Ladegerät für dieses Handy, danke.', en: 'No, I only want the charger for this phone, thank you.' },
    chunks: [{ targetText: 'Não, só quero', baseText: { de: 'Nein, ich möchte nur', en: 'No, I only want' } }, { targetText: 'o carregador deste celular,', baseText: { de: 'das Ladegerät für dieses Handy,', en: 'the charger for this phone,' } }, { targetText: 'obrigado.', baseText: { de: 'danke.', en: 'thank you.' } }],
    terms: [{ targetText: 'só quero', baseText: { de: 'ich möchte nur', en: 'I only want' } }, { targetText: 'carregador', baseText: { de: 'Ladegerät', en: 'charger' } }, { targetText: 'deste celular', baseText: { de: 'für dieses Handy', en: 'for this phone' } }, { targetText: 'carregador deste celular', baseText: { de: 'Ladegerät für dieses Handy', en: 'charger for this phone' } }, { targetText: 'quero o carregador', baseText: { de: 'ich möchte das Ladegerät', en: 'I want the charger' } }],
    recall: { before: 'Não, só quero o ', answer: 'carregador', after: ' deste celular, obrigado.', fallbackChoices: ['carregador', 'celular', 'cartão', 'bilhete'] }, speakRequired: ['só', 'quero', 'carregador'],
    sceneCaption: { de: 'Der Verkäufer zeigt auf eine Handyhülle und fragt: „Você quer uma capa também?“', en: 'The seller points to a phone case and asks: “Você quer uma capa também?”' },
    trophyWord: { word: 'carregador', meaning: { de: 'Ladegerät', en: 'charger' }, example: 'Meu carregador fica na mochila.', whyThisWord: { de: 'carregador hilft dir, den einen Handyartikel klar zu benennen, den du brauchst.', en: 'carregador helps you clearly name the one phone item you need.' } },
    distractors: ['uma capa azul', 'mas não funciona'], placeholderCaption: { de: 'Ladegerät und Handyhülle auf einem Ladentresen.', en: 'Charger and phone case on a shop counter.' }, songMood: 'simple shop choice', visualNotes: 'Phone shop display, charger selected while a case remains aside.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'pode-conferir-o-total', title: { de: 'Der Betrag stimmt nicht', en: 'The total is wrong' },
    situation: { de: 'An der Kasse wirkt der Betrag auf deiner Rechnung nicht richtig — du bittest höflich um eine Prüfung.', en: 'At the checkout, the amount on your bill does not seem right — politely ask for it to be checked.' },
    pedagogicalGoal: 'Mit pode conferir eine kurze, höfliche Korrektur an der Kasse anbringen.',
    targetText: 'Desculpe, o total não está correto. Pode conferir?', baseText: { de: 'Entschuldige, der Gesamtbetrag stimmt nicht. Können Sie das prüfen?', en: 'Sorry, the total is not correct. Can you check it?' },
    chunks: [{ targetText: 'Desculpe,', baseText: { de: 'Entschuldige,', en: 'Sorry,' } }, { targetText: 'o total não está correto.', baseText: { de: 'der Gesamtbetrag stimmt nicht.', en: 'the total is not correct.' } }, { targetText: 'Pode conferir?', baseText: { de: 'Können Sie das prüfen?', en: 'Can you check it?' } }],
    terms: [{ targetText: 'total', baseText: { de: 'Gesamtbetrag', en: 'total' } }, { targetText: 'correto', baseText: { de: 'richtig', en: 'correct' } }, { targetText: 'pode conferir', baseText: { de: 'können Sie prüfen', en: 'can you check' } }, { targetText: 'conferir', baseText: { de: 'prüfen; nachsehen', en: 'to check' } }, { targetText: 'não está correto', baseText: { de: 'stimmt nicht', en: 'is not correct' } }],
    recall: { before: 'Desculpe, o total não está correto. Pode ', answer: 'conferir', after: '?', fallbackChoices: ['conferir', 'escrever', 'esperar', 'fechar'] }, speakRequired: ['total', 'correto', 'conferir'],
    sceneCaption: { de: 'Die Kassiererin dreht das Display zu dir und fragt: „O total está certo?“', en: 'The cashier turns the display toward you and asks: “O total está certo?”' },
    trophyWord: { word: 'conferir', meaning: { de: 'prüfen; nachsehen', en: 'to check' }, example: 'Pode conferir a conta, por favor?', whyThisWord: { de: 'conferir bittet um eine Lösung, ohne unfreundlich zu klingen.', en: 'conferir asks for a solution without sounding unfriendly.' } },
    distractors: ['o quarto está livre', 'mas quero outro'], placeholderCaption: { de: 'Kassendisplay mit einer Rechnung und einer prüfenden Hand.', en: 'Checkout display with a receipt and a hand checking it.' }, songMood: 'calm billing repair', visualNotes: 'Store checkout, receipt, polite customer asking the cashier to review the total.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'eu-queria-uma-embalagem-menor', title: { de: 'Eine kleinere Packung', en: 'A smaller pack' },
    situation: { de: 'In der Apotheke zeigt die Verkäuferin eine große Packung — du bittest höflich um eine kleinere.', en: 'At the pharmacy, the clerk shows a large pack — politely ask for a smaller one.' },
    pedagogicalGoal: 'Mit eu queria eine passende Größe in der Apotheke erbitten.',
    targetText: 'Eu queria uma embalagem menor, por favor.', baseText: { de: 'Ich hätte gern eine kleinere Packung, bitte.', en: 'I would like a smaller pack, please.' },
    chunks: [{ targetText: 'Eu queria', baseText: { de: 'Ich hätte gern', en: 'I would like' } }, { targetText: 'uma embalagem menor,', baseText: { de: 'eine kleinere Packung,', en: 'a smaller pack,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'queria', baseText: { de: 'ich hätte gern', en: 'I would like' } }, { targetText: 'embalagem', baseText: { de: 'Packung', en: 'pack' } }, { targetText: 'menor', baseText: { de: 'kleiner', en: 'smaller' } }, { targetText: 'uma embalagem', baseText: { de: 'eine Packung', en: 'a pack' } }, { targetText: 'embalagem menor', baseText: { de: 'kleinere Packung', en: 'smaller pack' } }],
    recall: { before: 'Eu queria uma ', answer: 'embalagem', after: ' menor, por favor.', fallbackChoices: ['embalagem', 'receita', 'farmácia', 'pomada'] }, speakRequired: ['queria', 'embalagem', 'menor'],
    sceneCaption: { de: 'Die Apothekerin hält zwei Schachteln hoch und fragt: „A embalagem grande está boa?“', en: 'The pharmacist holds up two boxes and asks: “A embalagem grande está boa?”' },
    trophyWord: { word: 'embalagem', meaning: { de: 'Packung', en: 'pack' }, example: 'Esta embalagem cabe na mochila.', whyThisWord: { de: 'embalagem hilft dir, eine praktische Packungsgröße zu erfragen.', en: 'embalagem helps you ask for a practical pack size.' } },
    distractors: ['mas está muito caro', 'com água sem gás'], placeholderCaption: { de: 'Zwei Medikamentenschachteln in unterschiedlicher Größe.', en: 'Two medicine boxes in different sizes.' }, songMood: 'practical pharmacy choice', visualNotes: 'Pharmacy counter, small and large medicine packs, thoughtful clerk.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'para-a-estacao-nao-para-o-centro', title: { de: 'Nicht ins Zentrum', en: 'Not to the center' },
    situation: { de: 'Der Taxifahrer fragt, ob du ins Zentrum fahren möchtest — du korrigierst das Ziel auf den Bahnhof.', en: 'The taxi driver asks whether you want to go downtown — correct the destination to the station.' },
    pedagogicalGoal: 'Mit não para eine Taxiroute höflich und klar korrigieren.',
    targetText: 'Para a estação, por favor, não para o centro.', baseText: { de: 'Zum Bahnhof, bitte, nicht ins Zentrum.', en: 'To the station, please, not to the center.' },
    chunks: [{ targetText: 'Para a estação,', baseText: { de: 'Zum Bahnhof,', en: 'To the station,' } }, { targetText: 'por favor,', baseText: { de: 'bitte,', en: 'please,' } }, { targetText: 'não para o centro.', baseText: { de: 'nicht ins Zentrum.', en: 'not to the center.' } }],
    terms: [{ targetText: 'estação', baseText: { de: 'Bahnhof; Station', en: 'station' } }, { targetText: 'centro', baseText: { de: 'Zentrum', en: 'center' } }, { targetText: 'para a estação', baseText: { de: 'zum Bahnhof', en: 'to the station' } }, { targetText: 'para o centro', baseText: { de: 'ins Zentrum', en: 'to the center' } }, { targetText: 'não para o centro', baseText: { de: 'nicht ins Zentrum', en: 'not to the center' } }],
    recall: { before: 'Para a estação, por favor, não para o ', answer: 'centro', after: '.', fallbackChoices: ['centro', 'hotel', 'museu', 'mercado'] }, speakRequired: ['estação', 'favor', 'centro'],
    sceneCaption: { de: 'Der Taxifahrer zeigt die Hauptstraße entlang und fragt: „Você vai para o centro?“', en: 'The taxi driver points along the main road and asks: “Você vai para o centro?”' },
    trophyWord: { word: 'centro', meaning: { de: 'Zentrum', en: 'center' }, example: 'A estação não fica no centro.', whyThisWord: { de: 'centro macht die hilfreiche Korrektur deines Fahrtziels deutlich.', en: 'centro makes the useful correction to your destination clear.' } },
    distractors: ['com duas malas', 'mas o trânsito para'], placeholderCaption: { de: 'Taxi an einer Kreuzung mit Schildern zum Bahnhof und ins Zentrum.', en: 'Taxi at an intersection with signs to the station and downtown.' }, songMood: 'clear taxi correction', visualNotes: 'Taxi dashboard, road signs for station and city center, rider giving a calm correction.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'desculpe-hoje-nao-posso-fico-em-casa', title: { de: 'Heute bleibe ich zu Hause', en: 'I’m staying home today' },
    situation: { de: 'Eine Nachbarin lädt dich für heute ein — du lehnst freundlich ab und sagst, dass du zu Hause bleibst.', en: 'A neighbor invites you out today — politely decline and say you are staying home.' },
    pedagogicalGoal: 'Mit hoje não posso eine Einladung sanft und vollständig ablehnen.',
    targetText: 'Desculpe, hoje não posso; fico em casa.', baseText: { de: 'Entschuldige, heute kann ich nicht; ich bleibe zu Hause.', en: 'Sorry, I can’t today; I’m staying home.' },
    chunks: [{ targetText: 'Desculpe,', baseText: { de: 'Entschuldige,', en: 'Sorry,' } }, { targetText: 'hoje não posso;', baseText: { de: 'heute kann ich nicht;', en: 'I can’t today;' } }, { targetText: 'fico em casa.', baseText: { de: 'ich bleibe zu Hause.', en: 'I’m staying home.' } }],
    terms: [{ targetText: 'desculpe', baseText: { de: 'entschuldige', en: 'sorry' } }, { targetText: 'hoje não posso', baseText: { de: 'heute kann ich nicht', en: 'I can’t today' } }, { targetText: 'fico em casa', baseText: { de: 'ich bleibe zu Hause', en: 'I’m staying home' } }, { targetText: 'casa', baseText: { de: 'Zuhause; Haus', en: 'home; house' } }, { targetText: 'fico', baseText: { de: 'ich bleibe', en: 'I stay' } }],
    recall: { before: 'Desculpe, hoje não posso; fico em ', answer: 'casa', after: '.', fallbackChoices: ['casa', 'praça', 'loja', 'rua'] }, speakRequired: ['hoje', 'fico', 'casa'],
    sceneCaption: { de: 'Deine Nachbarin lächelt und fragt: „Você quer jantar fora hoje?“', en: 'Your neighbor smiles and asks: “Você quer jantar fora hoje?”' },
    trophyWord: { word: 'casa', meaning: { de: 'Zuhause; Haus', en: 'home; house' }, example: 'Hoje quero ficar em casa.', whyThisWord: { de: 'casa gibt deiner höflichen Absage einen ruhigen, vollständigen Abschluss.', en: 'casa gives your polite refusal a calm, complete ending.' } },
    distractors: ['mas quero dançar', 'depois da meia-noite'], placeholderCaption: { de: 'Gemütliche Wohnung am Abend mit einem Buch auf dem Sofa.', en: 'Cozy apartment in the evening with a book on the sofa.' }, songMood: 'quiet at-home refusal', visualNotes: 'Warm apartment, rainy evening outside, a friendly message politely declined.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_FIVE_METADATA, portugueseA2Practical5Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 5 abgeschlossen — du kannst Fehler höflich korrigieren und passende Alternativen nennen.', en: 'You have completed Portuguese A2 Practical 5 — you can correct mistakes politely and name suitable alternatives.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_SIX_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-6',
  title: 'Portuguese A2 Practical 6',
  shortTitle: 'A2 Practical 6',
  subtitle: { de: 'Dinge erledigen: Hilfe und Abholung', en: 'Getting things done: services and pickups' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical6Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'para-quando-ficam-minhas-roupas', title: { de: 'Wäsche abgeben', en: 'Drop off laundry' },
    situation: { de: 'In der Wäscherei gibst du deine Kleidung ab und fragst, wann sie fertig ist.', en: 'At the laundry, you drop off your clothes and ask when they will be ready.' },
    pedagogicalGoal: 'Mit para quando eine klare Frage nach der Abholzeit stellen.',
    targetText: 'Para quando ficam minhas roupas, por favor?', baseText: { de: 'Bis wann sind meine Sachen fertig, bitte?', en: 'When will my clothes be ready, please?' },
    chunks: [{ targetText: 'Para quando ficam', baseText: { de: 'Bis wann sind', en: 'When will be' } }, { targetText: 'minhas roupas,', baseText: { de: 'meine Sachen,', en: 'my clothes,' } }, { targetText: 'por favor?', baseText: { de: 'bitte?', en: 'please?' } }],
    terms: [{ targetText: 'para quando', baseText: { de: 'bis wann', en: 'by when' } }, { targetText: 'ficam', baseText: { de: 'sind sie fertig', en: 'will they be ready' } }, { targetText: 'minhas roupas', baseText: { de: 'meine Sachen', en: 'my clothes' } }, { targetText: 'roupas', baseText: { de: 'Kleidung; Sachen', en: 'clothes' } }, { targetText: 'para quando ficam', baseText: { de: 'bis wann sind sie fertig', en: 'when will they be ready' } }],
    recall: { before: 'Para quando ficam minhas ', answer: 'roupas', after: ', por favor?', fallbackChoices: ['roupas', 'chaves', 'malas', 'cartas'] }, speakRequired: ['quando', 'ficam', 'roupas'],
    sceneCaption: { de: 'Die Mitarbeiterin der Wäscherei nimmt deine Tasche und fragt: „Você precisa das roupas logo?“', en: 'The laundry attendant takes your bag and asks: “Você precisa das roupas logo?”' },
    trophyWord: { word: 'roupas', meaning: { de: 'Kleidung; Sachen', en: 'clothes' }, example: 'Minhas roupas ficam prontas amanhã.', whyThisWord: { de: 'roupas macht deine Abholfrage in der Wäscherei konkret.', en: 'roupas makes your pickup question at the laundry concrete.' } },
    distractors: ['mas o celular caiu', 'com dez reais'], placeholderCaption: { de: 'Wäschetasche auf einem sauberen Tresen in einer Wäscherei.', en: 'Laundry bag on a clean counter in a laundromat.' }, songMood: 'practical laundry errand', visualNotes: 'Neighborhood laundromat, folded clothes, attendant writing a pickup slip.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'preciso-consertar-meu-celular', title: { de: 'Handy reparieren', en: 'Repair the phone' },
    situation: { de: 'Im Handyshop erklärst du, dass dein Handy repariert werden muss.', en: 'At the phone shop, explain that your phone needs repair.' },
    pedagogicalGoal: 'Mit preciso + Infinitiv eine einfache Reparaturbitte ausdrücken.',
    targetText: 'Preciso consertar meu celular, por favor.', baseText: { de: 'Ich muss mein Handy reparieren lassen, bitte.', en: 'I need to repair my phone, please.' },
    chunks: [{ targetText: 'Preciso consertar', baseText: { de: 'Ich muss reparieren', en: 'I need to repair' } }, { targetText: 'meu celular,', baseText: { de: 'mein Handy,', en: 'my phone,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'preciso consertar', baseText: { de: 'ich muss reparieren', en: 'I need to repair' } }, { targetText: 'consertar', baseText: { de: 'reparieren', en: 'to repair' } }, { targetText: 'celular', baseText: { de: 'Handy', en: 'mobile phone' } }, { targetText: 'meu celular', baseText: { de: 'mein Handy', en: 'my phone' } }, { targetText: 'preciso', baseText: { de: 'ich muss; ich brauche', en: 'I need' } }],
    recall: { before: 'Preciso ', answer: 'consertar', after: ' meu celular, por favor.', fallbackChoices: ['consertar', 'alugar', 'retirar', 'trocar'] }, speakRequired: ['preciso', 'consertar', 'celular'],
    sceneCaption: { de: 'Der Mitarbeiter schaut auf dein Handy und fragt: „O que aconteceu com o celular?“', en: 'The assistant looks at your phone and asks: “O que aconteceu com o celular?”' },
    trophyWord: { word: 'consertar', meaning: { de: 'reparieren', en: 'to repair' }, example: 'Preciso consertar a tela hoje.', whyThisWord: { de: 'consertar benennt die zentrale Hilfe, die du im Handyshop brauchst.', en: 'consertar names the central help you need at the phone shop.' } },
    distractors: ['mas perdi o bilhete', 'na feira de manhã'], placeholderCaption: { de: 'Handy mit gesprungenem Display auf einem Reparaturtresen.', en: 'Phone with a cracked screen on a repair counter.' }, songMood: 'helpful phone repair', visualNotes: 'Phone repair shop, technician examining a mobile screen with a small toolkit.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quero-uma-recarga-de-dez-reais', title: { de: 'Eine kleine Aufladung', en: 'A small top-up' },
    situation: { de: 'An der Kasse im Kiosk möchtest du dein Prepaid-Handy mit zehn Reais aufladen.', en: 'At a kiosk counter, you want to top up your prepaid phone with ten reais.' },
    pedagogicalGoal: 'Eine Prepaid-Aufladung mit dem natürlichen Betrag dez reais bestellen.',
    targetText: 'Quero uma recarga de dez reais, por favor.', baseText: { de: 'Ich möchte bitte eine Aufladung von zehn Reais.', en: 'I would like a top-up of ten reais, please.' },
    chunks: [{ targetText: 'Quero uma recarga', baseText: { de: 'Ich möchte eine Aufladung', en: 'I want a top-up' } }, { targetText: 'de dez reais,', baseText: { de: 'von zehn Reais,', en: 'of ten reais,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'recarga', baseText: { de: 'Aufladung', en: 'top-up' } }, { targetText: 'uma recarga', baseText: { de: 'eine Aufladung', en: 'a top-up' } }, { targetText: 'dez reais', baseText: { de: 'zehn Reais', en: 'ten reais' } }, { targetText: 'reais', baseText: { de: 'Reais', en: 'reais' } }, { targetText: 'quero uma recarga', baseText: { de: 'ich möchte eine Aufladung', en: 'I want a top-up' } }],
    recall: { before: 'Quero uma ', answer: 'recarga', after: ' de dez reais, por favor.', fallbackChoices: ['recarga', 'reserva', 'cópia', 'passagem'] }, speakRequired: ['quero', 'recarga', 'reais'],
    sceneCaption: { de: 'Der Kioskverkäufer zeigt auf das Aufladegerät und fragt: „Quanto você quer colocar?“', en: 'The kiosk seller points to the top-up terminal and asks: “Quanto você quer colocar?”' },
    trophyWord: { word: 'recarga', meaning: { de: 'Aufladung', en: 'top-up' }, example: 'Quero uma recarga para o celular.', whyThisWord: { de: 'recarga ist der übliche, direkte Name für eine brasilianische Prepaid-Aufladung.', en: 'recarga is the usual, direct name for a Brazilian prepaid top-up.' } },
    distractors: ['com água sem gás', 'mas o táxi espera'], placeholderCaption: { de: 'Kiosk-Tresen mit einem Prepaid-Aufladebildschirm.', en: 'Kiosk counter with a prepaid top-up screen.' }, songMood: 'quick kiosk errand', visualNotes: 'Brazilian corner kiosk, phone top-up terminal, small cash payment.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quero-marcar-para-quinta', title: { de: 'Termin am Donnerstag', en: 'Appointment on Thursday' },
    situation: { de: 'In einer Praxis fragt die Rezeption nach einem passenden Termin — du wählst Donnerstagvormittag.', en: 'At a clinic, reception asks for a suitable appointment — choose Thursday morning.' },
    pedagogicalGoal: 'Mit quero marcar einen Termin auf Donnerstagvormittag legen.',
    targetText: 'Quero marcar para quinta de manhã.', baseText: { de: 'Ich möchte für Donnerstagvormittag einen Termin vereinbaren.', en: 'I want to book for Thursday morning.' },
    chunks: [{ targetText: 'Quero marcar', baseText: { de: 'Ich möchte vereinbaren', en: 'I want to book' } }, { targetText: 'para quinta', baseText: { de: 'für Donnerstag', en: 'for Thursday' } }, { targetText: 'de manhã.', baseText: { de: 'vormittags.', en: 'in the morning.' } }],
    terms: [{ targetText: 'quero marcar', baseText: { de: 'ich möchte vereinbaren', en: 'I want to book' } }, { targetText: 'marcar', baseText: { de: 'vereinbaren; buchen', en: 'to book' } }, { targetText: 'quinta', baseText: { de: 'Donnerstag', en: 'Thursday' } }, { targetText: 'manhã', baseText: { de: 'Morgen; Vormittag', en: 'morning' } }, { targetText: 'quinta de manhã', baseText: { de: 'Donnerstagvormittag', en: 'Thursday morning' } }],
    recall: { before: 'Quero marcar para ', answer: 'quinta', after: ' de manhã.', fallbackChoices: ['quinta', 'ontem', 'agora', 'tarde'] }, speakRequired: ['quero', 'marcar', 'quinta'],
    sceneCaption: { de: 'Die Rezeptionistin schaut in den Kalender und fragt: „Qual dia é melhor para você?“', en: 'The receptionist looks at the calendar and asks: “Qual dia é melhor para você?”' },
    trophyWord: { word: 'quinta', meaning: { de: 'Donnerstag', en: 'Thursday' }, example: 'Na quinta tenho uma consulta cedo.', whyThisWord: { de: 'quinta gibt deiner Terminbitte einen klaren, alltagstauglichen Tag.', en: 'quinta gives your appointment request a clear, everyday day.' } },
    distractors: ['mas o médico saiu', 'com muito barulho'], placeholderCaption: { de: 'Kalender an einer Praxisrezeption mit markiertem Donnerstag.', en: 'Calendar at a clinic reception with Thursday marked.' }, songMood: 'organized appointment booking', visualNotes: 'Clinic reception, calendar open to Thursday morning, calm clerk.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'preciso-de-uma-copia-desta-chave', title: { de: 'Einen Schlüssel kopieren', en: 'Copy a key' },
    situation: { de: 'Beim Schlüsseldienst zeigst du deinen Schlüssel und bittest um eine Kopie.', en: 'At a key-cutting shop, show your key and ask for a copy.' },
    pedagogicalGoal: 'Mit preciso de + Nomen eine Kopie eines Schlüssels bestellen.',
    targetText: 'Preciso de uma cópia desta chave, por favor.', baseText: { de: 'Ich brauche bitte eine Kopie von diesem Schlüssel.', en: 'I need a copy of this key, please.' },
    chunks: [{ targetText: 'Preciso de uma cópia', baseText: { de: 'Ich brauche eine Kopie', en: 'I need a copy' } }, { targetText: 'desta chave,', baseText: { de: 'von diesem Schlüssel,', en: 'of this key,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'preciso de', baseText: { de: 'ich brauche', en: 'I need' } }, { targetText: 'cópia', baseText: { de: 'Kopie', en: 'copy' } }, { targetText: 'uma cópia', baseText: { de: 'eine Kopie', en: 'a copy' } }, { targetText: 'chave', baseText: { de: 'Schlüssel', en: 'key' } }, { targetText: 'desta chave', baseText: { de: 'von diesem Schlüssel', en: 'of this key' } }],
    recall: { before: 'Preciso de uma ', answer: 'cópia', after: ' desta chave, por favor.', fallbackChoices: ['cópia', 'recarga', 'reserva', 'sacola'] }, speakRequired: ['preciso', 'cópia', 'chave'],
    sceneCaption: { de: 'Der Schlüsseldienst nimmt deinen Schlüssel und fragt: „Você precisa de quantas cópias?“', en: 'The key cutter takes your key and asks: “Você precisa de quantas cópias?”' },
    trophyWord: { word: 'cópia', meaning: { de: 'Kopie', en: 'copy' }, example: 'Uma cópia da chave fica com meu vizinho.', whyThisWord: { de: 'cópia benennt genau den kleinen Service, den du beim Schlüsseldienst brauchst.', en: 'cópia names exactly the small service you need at the key-cutting shop.' } },
    distractors: ['mas perdi o celular', 'no museu amanhã'], placeholderCaption: { de: 'Schlüssel und frisch geschnittene Kopie auf einer Werkbank.', en: 'Key and freshly cut copy on a workbench.' }, songMood: 'small key-service errand', visualNotes: 'Key-cutting counter, metal key blank, craftsperson preparing a copy.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quero-retirar-um-pacote', title: { de: 'Ein Paket abholen', en: 'Pick up a package' },
    situation: { de: 'An der Paketstelle möchtest du ein Paket abholen, das für dich bereitliegt.', en: 'At the package counter, you want to collect a package that is waiting for you.' },
    pedagogicalGoal: 'Mit quero retirar eine Paketabholung einfach und höflich beginnen.',
    targetText: 'Quero retirar um pacote para mim.', baseText: { de: 'Ich möchte ein Paket für mich abholen.', en: 'I want to pick up a package for myself.' },
    chunks: [{ targetText: 'Quero retirar', baseText: { de: 'Ich möchte abholen', en: 'I want to pick up' } }, { targetText: 'um pacote', baseText: { de: 'ein Paket', en: 'a package' } }, { targetText: 'para mim.', baseText: { de: 'für mich.', en: 'for myself.' } }],
    terms: [{ targetText: 'quero retirar', baseText: { de: 'ich möchte abholen', en: 'I want to pick up' } }, { targetText: 'retirar', baseText: { de: 'abholen', en: 'to pick up' } }, { targetText: 'pacote', baseText: { de: 'Paket', en: 'package' } }, { targetText: 'um pacote', baseText: { de: 'ein Paket', en: 'a package' } }, { targetText: 'para mim', baseText: { de: 'für mich', en: 'for myself' } }],
    recall: { before: 'Quero retirar um ', answer: 'pacote', after: ' para mim.', fallbackChoices: ['pacote', 'quarto', 'bilhete', 'remédio'] }, speakRequired: ['quero', 'retirar', 'pacote'],
    sceneCaption: { de: 'Der Mitarbeiter an der Paketstelle fragt: „Você veio retirar alguma coisa?“', en: 'The package-counter attendant asks: “Você veio retirar alguma coisa?”' },
    trophyWord: { word: 'pacote', meaning: { de: 'Paket', en: 'package' }, example: 'Meu pacote chega hoje de manhã.', whyThisWord: { de: 'pacote lässt dich den Zweck deines Besuchs an der Abholstelle klar nennen.', en: 'pacote lets you clearly name the purpose of your visit to the pickup point.' } },
    distractors: ['mas está muito pesado', 'com água e café'], placeholderCaption: { de: 'Paketregal mit einer Abholnummer an einem Schalter.', en: 'Package shelf with a pickup number at a counter.' }, songMood: 'successful package pickup', visualNotes: 'Neighborhood parcel point, labeled package shelf, customer showing an ID card.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'quero-alugar-uma-bicicleta', title: { de: 'Ein Fahrrad mieten', en: 'Rent a bike' },
    situation: { de: 'Am Fahrradverleih möchtest du für zwei Tage ein Fahrrad ausleihen.', en: 'At the bike rental, you want to rent a bicycle for two days.' },
    pedagogicalGoal: 'Mit quero alugar eine Mietdauer für ein Fahrrad nennen.',
    targetText: 'Quero alugar uma bicicleta por dois dias.', baseText: { de: 'Ich möchte für zwei Tage ein Fahrrad mieten.', en: 'I want to rent a bicycle for two days.' },
    chunks: [{ targetText: 'Quero alugar', baseText: { de: 'Ich möchte mieten', en: 'I want to rent' } }, { targetText: 'uma bicicleta', baseText: { de: 'ein Fahrrad', en: 'a bicycle' } }, { targetText: 'por dois dias.', baseText: { de: 'für zwei Tage.', en: 'for two days.' } }],
    terms: [{ targetText: 'quero alugar', baseText: { de: 'ich möchte mieten', en: 'I want to rent' } }, { targetText: 'alugar', baseText: { de: 'mieten', en: 'to rent' } }, { targetText: 'bicicleta', baseText: { de: 'Fahrrad', en: 'bicycle' } }, { targetText: 'dois dias', baseText: { de: 'zwei Tage', en: 'two days' } }, { targetText: 'por dois dias', baseText: { de: 'für zwei Tage', en: 'for two days' } }],
    recall: { before: 'Quero alugar uma ', answer: 'bicicleta', after: ' por dois dias.', fallbackChoices: ['bicicleta', 'mala', 'camisa', 'mesa'] }, speakRequired: ['quero', 'alugar', 'bicicleta'],
    sceneCaption: { de: 'Der Verleiher zeigt auf die Fahrräder und fragt: „Por quantos dias você precisa?“', en: 'The rental attendant points to the bicycles and asks: “Por quantos dias você precisa?”' },
    trophyWord: { word: 'bicicleta', meaning: { de: 'Fahrrad', en: 'bicycle' }, example: 'A bicicleta fica perto da entrada.', whyThisWord: { de: 'bicicleta ist das klare, praktische Objekt deiner Mietanfrage.', en: 'bicicleta is the clear, practical object of your rental request.' } },
    distractors: ['mas o pneu está vazio', 'na quinta à noite'], placeholderCaption: { de: 'Reihe von Mietfahrrädern an einer sonnigen Promenade.', en: 'Row of rental bicycles on a sunny promenade.' }, songMood: 'active city exploration', visualNotes: 'Brazilian bike rental stand, bright bicycles ready for a two-day ride.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'ate-que-horas-voces-ficam-abertos', title: { de: 'Öffnungszeiten', en: 'Opening hours' },
    situation: { de: 'Vor einem Laden möchtest du wissen, wie lange er heute geöffnet bleibt.', en: 'Outside a shop, you want to know how late it stays open today.' },
    pedagogicalGoal: 'Mit até que horas nach den Öffnungszeiten fragen.',
    targetText: 'Até que horas vocês ficam abertos?', baseText: { de: 'Bis wie viel Uhr haben Sie geöffnet?', en: 'Until what time are you open?' },
    chunks: [{ targetText: 'Até que horas', baseText: { de: 'Bis wie viel Uhr', en: 'Until what time' } }, { targetText: 'vocês ficam', baseText: { de: 'haben Sie', en: 'are you' } }, { targetText: 'abertos?', baseText: { de: 'geöffnet?', en: 'open?' } }],
    terms: [{ targetText: 'até que horas', baseText: { de: 'bis wie viel Uhr', en: 'until what time' } }, { targetText: 'horas', baseText: { de: 'Uhr; Stunden', en: 'hours' } }, { targetText: 'ficam abertos', baseText: { de: 'haben geöffnet', en: 'stay open' } }, { targetText: 'abertos', baseText: { de: 'geöffnet', en: 'open' } }, { targetText: 'vocês ficam', baseText: { de: 'Sie bleiben', en: 'you stay' } }],
    recall: { before: 'Até que ', answer: 'horas', after: ' vocês ficam abertos?', fallbackChoices: ['horas', 'dias', 'reais', 'meses'] }, speakRequired: ['horas', 'ficam', 'abertos'],
    sceneCaption: { de: 'Die Ladenbesitzerin dreht das Schild an der Tür um und sagt: „A loja fecha mais tarde hoje.“', en: 'The shop owner turns the sign on the door and says: “A loja fecha mais tarde hoje.”' },
    trophyWord: { word: 'horas', meaning: { de: 'Uhr; Stunden', en: 'hours' }, example: 'A loja abre às nove horas.', whyThisWord: { de: 'horas macht deine Frage nach der Zeit im Laden präzise.', en: 'horas makes your question about shop hours precise.' } },
    distractors: ['mas o cartão não passa', 'com uma bicicleta'], placeholderCaption: { de: 'Ladentür mit einem Schild für die Öffnungszeiten.', en: 'Shop door with an opening-hours sign.' }, songMood: 'useful shop-hours question', visualNotes: 'Neighborhood storefront, owner turning an hours sign, early evening street.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'celular-ja-esta-pronto-para-retirar', title: { de: 'Das Handy ist fertig?', en: 'Is the phone ready?' },
    situation: { de: 'Du kommst zum Handyshop zurück und fragst, ob dein repariertes Handy schon abgeholt werden kann.', en: 'You return to the phone shop and ask whether your repaired phone is ready for pickup.' },
    pedagogicalGoal: 'Mit pronto nachfragen, ob ein Gegenstand zur Abholung bereit ist.',
    targetText: 'O celular já está pronto para retirar?', baseText: { de: 'Ist das Handy schon zur Abholung bereit?', en: 'Is the phone ready to pick up already?' },
    chunks: [{ targetText: 'O celular já está', baseText: { de: 'Ist das Handy schon', en: 'Is the phone already' } }, { targetText: 'pronto', baseText: { de: 'bereit', en: 'ready' } }, { targetText: 'para retirar?', baseText: { de: 'zur Abholung?', en: 'to pick up?' } }],
    terms: [{ targetText: 'celular', baseText: { de: 'Handy', en: 'mobile phone' } }, { targetText: 'já está pronto', baseText: { de: 'ist schon bereit', en: 'is ready already' } }, { targetText: 'pronto', baseText: { de: 'bereit', en: 'ready' } }, { targetText: 'retirar', baseText: { de: 'abholen', en: 'to pick up' } }, { targetText: 'para retirar', baseText: { de: 'zur Abholung', en: 'to pick up' } }],
    recall: { before: 'O celular já está ', answer: 'pronto', after: ' para retirar?', fallbackChoices: ['pronto', 'aberto', 'limpo', 'pequeno'] }, speakRequired: ['celular', 'pronto', 'retirar'],
    sceneCaption: { de: 'Der Mitarbeiter findet deinen Auftrag und fragt: „Você veio buscar o celular?“', en: 'The assistant finds your job slip and asks: “Você veio buscar o celular?”' },
    trophyWord: { word: 'pronto', meaning: { de: 'bereit', en: 'ready' }, example: 'O pacote está pronto para retirar.', whyThisWord: { de: 'pronto ist die zentrale Rückfrage, bevor du eine Reparatur abholst.', en: 'pronto is the key question before collecting a repair.' } },
    distractors: ['mas a tela caiu', 'com dez reais'], placeholderCaption: { de: 'Repariertes Handy auf einem Tresen neben einem Abholschein.', en: 'Repaired phone on a counter beside a pickup slip.' }, songMood: 'repair-ready relief', visualNotes: 'Phone repair counter, finished mobile phone and pickup ticket, relieved customer.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'perfeito-ate-quinta-volto-para-buscar', title: { de: 'Bis Donnerstag', en: 'Until Thursday' },
    situation: { de: 'Der Mitarbeiter bestätigt die Abholung am Donnerstag — du schließt die Erledigung freundlich ab.', en: 'The attendant confirms pickup on Thursday — close the errand politely.' },
    pedagogicalGoal: 'Mit até quinta und volto para buscar eine Abholung klar abschließen.',
    targetText: 'Perfeito, até quinta. Volto para buscar.', baseText: { de: 'Perfekt, bis Donnerstag. Ich komme zum Abholen wieder.', en: 'Perfect, until Thursday. I’ll come back to pick it up.' },
    chunks: [{ targetText: 'Perfeito,', baseText: { de: 'Perfekt,', en: 'Perfect,' } }, { targetText: 'até quinta.', baseText: { de: 'bis Donnerstag.', en: 'until Thursday.' } }, { targetText: 'Volto para buscar.', baseText: { de: 'Ich komme zum Abholen wieder.', en: 'I’ll come back to pick it up.' } }],
    terms: [{ targetText: 'perfeito', baseText: { de: 'perfekt', en: 'perfect' } }, { targetText: 'quinta', baseText: { de: 'Donnerstag', en: 'Thursday' } }, { targetText: 'volto', baseText: { de: 'ich komme wieder', en: 'I come back' } }, { targetText: 'buscar', baseText: { de: 'abholen', en: 'to collect' } }, { targetText: 'volto para buscar', baseText: { de: 'ich komme zum Abholen wieder', en: 'I come back to pick it up' } }],
    recall: { before: 'Perfeito, até quinta. Volto para ', answer: 'buscar', after: '.', fallbackChoices: ['buscar', 'marcar', 'trocar', 'pagar'] }, speakRequired: ['perfeito', 'volto', 'buscar'],
    sceneCaption: { de: 'Der Mitarbeiter gibt dir den Abholschein und sagt: „Pode buscar na quinta.“', en: 'The attendant hands you the pickup slip and says: “Pode buscar na quinta.”' },
    trophyWord: { word: 'buscar', meaning: { de: 'abholen', en: 'to collect' }, example: 'Volto amanhã para buscar o pacote.', whyThisWord: { de: 'buscar schließt eine Abholung mit einem klaren nächsten Schritt ab.', en: 'buscar closes a pickup with a clear next step.' } },
    distractors: ['mas o prazo mudou', 'com água gelada'], placeholderCaption: { de: 'Abholschein neben einem ordentlich verpackten Gegenstand.', en: 'Pickup slip beside a neatly packed item.' }, songMood: 'satisfying errand close', visualNotes: 'Service counter, pickup slip, friendly farewell for a Thursday return.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_SIX_METADATA, portugueseA2Practical6Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 6 abgeschlossen — du kannst typische Dienste anfragen, Zeiten klären und Abholungen erledigen.', en: 'You have completed Portuguese A2 Practical 6 — you can request everyday services, clarify times, and complete pickups.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-7',
  title: 'Portuguese A2 Practical 7',
  shortTitle: 'A2 Practical 7',
  subtitle: { de: 'Was empfehlen Sie? Beschreiben und empfehlen', en: 'What do you recommend? Describing and recommending' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical7Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'o-que-voce-recomenda-para-comer-aqui', title: { de: 'Etwas empfehlen', en: 'Recommend something' },
    situation: { de: 'Im Restaurant bietet der Kellner dir eine Empfehlung an — du fragst, was er hier zum Essen empfiehlt.', en: 'At the restaurant, the waiter offers you a recommendation — ask what he recommends to eat here.' },
    pedagogicalGoal: 'Mit O que você recomenda? nach einer persönlichen Essensempfehlung fragen.',
    targetText: 'O que você recomenda para comer aqui?', baseText: { de: 'Was empfiehlst du hier zum Essen?', en: 'What do you recommend to eat here?' },
    chunks: [{ targetText: 'O que você recomenda', baseText: { de: 'Was empfiehlst du', en: 'What do you recommend' } }, { targetText: 'para comer', baseText: { de: 'zum Essen', en: 'to eat' } }, { targetText: 'aqui?', baseText: { de: 'hier?', en: 'here?' } }],
    terms: [{ targetText: 'recomenda', baseText: { de: 'du empfiehlst', en: 'you recommend' } }, { targetText: 'recomendar', baseText: { de: 'empfehlen', en: 'to recommend' } }, { targetText: 'comer', baseText: { de: 'essen', en: 'to eat' } }, { targetText: 'para comer', baseText: { de: 'zum Essen', en: 'to eat' } }, { targetText: 'aqui', baseText: { de: 'hier', en: 'here' } }],
    recall: { before: 'O que você ', answer: 'recomenda', after: ' para comer aqui?', fallbackChoices: ['recomenda', 'prefere', 'procura', 'escolhe'] }, speakRequired: ['recomenda', 'comer', 'aqui'],
    sceneCaption: { de: 'Im Restaurant reicht dir der Kellner die Speisekarte und fragt: „Quer uma sugestão do cardápio?“', en: 'At the restaurant, the waiter hands you the menu and asks: “Quer uma sugestão do cardápio?”' },
    trophyWord: { word: 'recomenda', meaning: { de: 'du empfiehlst', en: 'you recommend' }, example: 'O que você recomenda para o almoço?', whyThisWord: { de: 'recomenda öffnet eine natürliche Frage nach einem lokalen Tipp.', en: 'recomenda opens a natural question for a local tip.' } },
    distractors: ['Eu quero o cardápio', 'Para beber agora'], placeholderCaption: { de: 'Kellner reicht in einem brasilianischen Restaurant eine Speisekarte.', en: 'Waiter handing over a menu in a Brazilian restaurant.' }, songMood: 'curious restaurant choice', visualNotes: 'Welcoming Brazilian restaurant table, menu open, waiter ready with a suggestion.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'entao-eu-quero-o-prato-do-dia-por-favor', title: { de: 'Die Empfehlung nehmen', en: 'Take the recommendation' },
    situation: { de: 'Der Kellner beschreibt das Tagesgericht — du entscheidest dich dafür.', en: 'The waiter describes the daily special — choose it.' },
    pedagogicalGoal: 'Eine Empfehlung mit então aufnehmen und das Tagesgericht bestellen.',
    targetText: 'Então, eu quero o prato do dia, por favor.', baseText: { de: 'Dann nehme ich bitte das Tagesgericht.', en: 'Then I would like the daily special, please.' },
    chunks: [{ targetText: 'Então, eu quero', baseText: { de: 'Dann nehme ich', en: 'Then I would like' } }, { targetText: 'o prato do dia,', baseText: { de: 'das Tagesgericht,', en: 'the daily special,' } }, { targetText: 'por favor.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: 'então', baseText: { de: 'dann; also', en: 'then; so' } }, { targetText: 'quero', baseText: { de: 'ich möchte', en: 'I want' } }, { targetText: 'prato', baseText: { de: 'Gericht', en: 'dish' } }, { targetText: 'prato do dia', baseText: { de: 'Tagesgericht', en: 'daily special' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Então, eu quero o ', answer: 'prato', after: ' do dia, por favor.', fallbackChoices: ['prato', 'suco', 'pão', 'peixe'] }, speakRequired: ['então', 'quero', 'prato'],
    sceneCaption: { de: 'Der Kellner nennt das Tagesgericht: „O prato do dia é peixe com arroz.“', en: 'The waiter names the daily special: “O prato do dia é peixe com arroz.”' },
    trophyWord: { word: 'prato', meaning: { de: 'Gericht', en: 'dish' }, example: 'Este prato tem arroz e feijão.', whyThisWord: { de: 'prato lässt dich eine Empfehlung im Restaurant klar benennen.', en: 'prato lets you name a restaurant recommendation clearly.' } },
    distractors: ['Eu prefiro a sopa', 'Com arroz e feijão'], placeholderCaption: { de: 'Tagesgericht mit Fisch, Reis und Salat auf einem Restauranttisch.', en: 'Daily special with fish, rice, and salad on a restaurant table.' }, songMood: 'easy confident order', visualNotes: 'Fresh lunch special arriving at a casual Brazilian restaurant table.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'eu-recomendo-o-bairro-antigo-para-caminhar', title: { de: 'Ein Viertel empfehlen', en: 'Recommend a neighborhood' },
    situation: { de: 'Dein Nachbar möchte spazieren gehen und fragt dich nach einem Viertel.', en: 'Your neighbor wants to go for a walk and asks you for a neighborhood.' },
    pedagogicalGoal: 'Mit eu recomendo eine einfache Orts-Empfehlung geben.',
    targetText: 'Eu recomendo o bairro antigo para caminhar.', baseText: { de: 'Ich empfehle das alte Viertel zum Spazierengehen.', en: 'I recommend the old neighborhood for walking.' },
    chunks: [{ targetText: 'Eu recomendo', baseText: { de: 'Ich empfehle', en: 'I recommend' } }, { targetText: 'o bairro antigo', baseText: { de: 'das alte Viertel', en: 'the old neighborhood' } }, { targetText: 'para caminhar.', baseText: { de: 'zum Spazierengehen.', en: 'for walking.' } }],
    terms: [{ targetText: 'recomendo', baseText: { de: 'ich empfehle', en: 'I recommend' } }, { targetText: 'bairro', baseText: { de: 'Viertel', en: 'neighborhood' } }, { targetText: 'antigo', baseText: { de: 'alt', en: 'old' } }, { targetText: 'caminhar', baseText: { de: 'spazieren gehen', en: 'to walk' } }, { targetText: 'bairro antigo', baseText: { de: 'altes Viertel', en: 'old neighborhood' } }],
    recall: { before: 'Eu ', answer: 'recomendo', after: ' o bairro antigo para caminhar.', fallbackChoices: ['recomendo', 'conheço', 'escolho', 'procuro'] }, speakRequired: ['recomendo', 'bairro', 'caminhar'],
    sceneCaption: { de: 'Dein Nachbar plant einen Spaziergang und fragt: „Qual bairro você recomenda para caminhar?“', en: 'Your neighbor is planning a walk and asks: “Qual bairro você recomenda para caminhar?”' },
    trophyWord: { word: 'antigo', meaning: { de: 'alt', en: 'old' }, example: 'O bairro antigo tem ruas bonitas.', whyThisWord: { de: 'antigo beschreibt einen naheliegenden Bereich für einen ruhigen Spaziergang.', en: 'antigo describes a natural area for a relaxed walk.' } },
    distractors: ['O bairro fica longe', 'Para nadar amanhã'], placeholderCaption: { de: 'Ruhige Straße mit alten Häusern und Bäumen in einem Viertel.', en: 'Quiet street with old houses and trees in a neighborhood.' }, songMood: 'gentle neighborhood walk', visualNotes: 'Historic Brazilian neighborhood, shaded sidewalk, relaxed afternoon walk.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'o-parque-e-tranquilo-e-bonito-fica-ao-lado-do-rio', title: { de: 'Der Park am Fluss', en: 'The park by the river' },
    situation: { de: 'Eine Nachbarin möchte wissen, wie der Park in der Nähe ist.', en: 'A neighbor wants to know what the nearby park is like.' },
    pedagogicalGoal: 'Einen Ort mit zwei Adjektiven und ao lado de beschreiben.',
    targetText: 'O parque é tranquilo e bonito; fica ao lado do rio.', baseText: { de: 'Der Park ist ruhig und schön; er liegt neben dem Fluss.', en: 'The park is quiet and beautiful; it is next to the river.' },
    chunks: [{ targetText: 'O parque é tranquilo', baseText: { de: 'Der Park ist ruhig', en: 'The park is quiet' } }, { targetText: 'e bonito; fica', baseText: { de: 'und schön; er liegt', en: 'and beautiful; it is' } }, { targetText: 'ao lado do rio.', baseText: { de: 'neben dem Fluss.', en: 'next to the river.' } }],
    terms: [{ targetText: 'parque', baseText: { de: 'Park', en: 'park' } }, { targetText: 'tranquilo', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'bonito', baseText: { de: 'schön', en: 'beautiful' } }, { targetText: 'ao lado de', baseText: { de: 'neben', en: 'next to' } }, { targetText: 'rio', baseText: { de: 'Fluss', en: 'river' } }],
    recall: { before: 'O parque é tranquilo e bonito; fica ao lado do ', answer: 'rio', after: '.', fallbackChoices: ['rio', 'mercado', 'cinema', 'museu'] }, speakRequired: ['parque', 'tranquilo', 'rio'],
    sceneCaption: { de: 'Deine Nachbarin zeigt auf die Grünanlage und fragt: „Como é o parque perto daqui?“', en: 'Your neighbor points to the green space and asks: “Como é o parque perto daqui?”' },
    trophyWord: { word: 'rio', meaning: { de: 'Fluss', en: 'river' }, example: 'O rio fica perto do parque.', whyThisWord: { de: 'rio ergänzt eine Ortsbeschreibung mit einem gut sichtbaren Orientierungspunkt.', en: 'rio adds a visible landmark to a location description.' } },
    distractors: ['O rio é muito fundo', 'Atrás do museu antigo'], placeholderCaption: { de: 'Ruhiger Park neben einem Fluss mit schattigen Bänken.', en: 'Quiet park beside a river with shaded benches.' }, songMood: 'calm riverside afternoon', visualNotes: 'Leafy riverside park, benches under trees, relaxed city neighborhood.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'o-cafe-e-pequeno-e-calmo-fica-perto-de-uma-livraria', title: { de: 'Ein Café in der Nähe', en: 'A nearby café' },
    situation: { de: 'An der Rezeption fragt jemand nach einem guten Café in der Nähe.', en: 'At reception, someone asks about a good café nearby.' },
    pedagogicalGoal: 'Ein Café mit zwei Adjektiven und perto de lokalisieren.',
    targetText: 'O café é pequeno e calmo; fica perto de uma livraria.', baseText: { de: 'Das Café ist klein und ruhig; es liegt nahe bei einer Buchhandlung.', en: 'The café is small and calm; it is near a bookstore.' },
    chunks: [{ targetText: 'O café é pequeno', baseText: { de: 'Das Café ist klein', en: 'The café is small' } }, { targetText: 'e calmo; fica', baseText: { de: 'und ruhig; es liegt', en: 'and calm; it is' } }, { targetText: 'perto de uma livraria.', baseText: { de: 'nahe bei einer Buchhandlung.', en: 'near a bookstore.' } }],
    terms: [{ targetText: 'café', baseText: { de: 'Café', en: 'café' } }, { targetText: 'pequeno', baseText: { de: 'klein', en: 'small' } }, { targetText: 'calmo', baseText: { de: 'ruhig', en: 'calm' } }, { targetText: 'perto de', baseText: { de: 'nahe bei', en: 'near' } }, { targetText: 'livraria', baseText: { de: 'Buchhandlung', en: 'bookstore' } }],
    recall: { before: 'O café é pequeno e calmo; fica perto de uma ', answer: 'livraria', after: '.', fallbackChoices: ['livraria', 'padaria', 'farmácia', 'estação'] }, speakRequired: ['café', 'calmo', 'livraria'],
    sceneCaption: { de: 'An der Hotelrezeption fragt ein Gast: „Tem um café bom perto daqui?“', en: 'At the hotel reception, a guest asks: “Tem um café bom perto daqui?”' },
    trophyWord: { word: 'livraria', meaning: { de: 'Buchhandlung', en: 'bookstore' }, example: 'A livraria fica perto de um café.', whyThisWord: { de: 'livraria macht deine Wegbeschreibung zu einem Café konkreter.', en: 'livraria makes a direction to a café more specific.' } },
    distractors: ['A livraria fecha cedo', 'Perto da estação grande'], placeholderCaption: { de: 'Kleines Café neben einer Buchhandlung in einer ruhigen Straße.', en: 'Small café beside a bookstore on a quiet street.' }, songMood: 'quiet local discovery', visualNotes: 'Cozy café and bookstore storefronts on a calm Brazilian side street.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'sim-procuro-um-presente-para-um-amigo-o-que-voce-recomenda', title: { de: 'Ein Geschenk auswählen', en: 'Choose a gift' },
    situation: { de: 'In einem kleinen Laden suchst du ein Geschenk für einen Freund.', en: 'In a small shop, you are looking for a gift for a friend.' },
    pedagogicalGoal: 'Mit procuro einen Geschenkbedarf nennen und mit o que você recomenda? um eine Empfehlung erfragen.',
    targetText: 'Sim, procuro um presente para um amigo. O que você recomenda?', baseText: { de: 'Ja, ich suche ein Geschenk für einen Freund. Was empfehlen Sie?', en: 'Yes, I’m looking for a gift for a friend. What do you recommend?' },
    chunks: [{ targetText: 'Sim, procuro', baseText: { de: 'Ja, ich suche', en: 'Yes, I’m looking for' } }, { targetText: 'um presente', baseText: { de: 'ein Geschenk', en: 'a gift' } }, { targetText: 'para um amigo.', baseText: { de: 'für einen Freund.', en: 'for a friend.' } }, { targetText: 'O que você recomenda?', baseText: { de: 'Was empfehlen Sie?', en: 'What do you recommend?' } }],
    terms: [{ targetText: 'procuro', baseText: { de: 'ich suche', en: 'I’m looking for' } }, { targetText: 'presente', baseText: { de: 'Geschenk', en: 'gift' } }, { targetText: 'para um amigo', baseText: { de: 'für einen Freund', en: 'for a friend' } }, { targetText: 'amigo', baseText: { de: 'Freund', en: 'friend' } }, { targetText: 'o que você recomenda', baseText: { de: 'was empfehlen Sie', en: 'what do you recommend' } }],
    recall: { before: 'Sim, procuro um ', answer: 'presente', after: ' para um amigo. O que você recomenda?', fallbackChoices: ['presente', 'caneca', 'camisa', 'garrafa'] }, speakRequired: ['procuro', 'presente', 'recomenda'],
    sceneCaption: { de: 'Eine Verkäuferin zeigt auf die Regale und fragt: „Você procura um presente para um amigo?“', en: 'A shop assistant points to the shelves and asks: “Você procura um presente para um amigo?”' },
    trophyWord: { word: 'presente', meaning: { de: 'Geschenk', en: 'gift' }, example: 'Este presente é para minha amiga.', whyThisWord: { de: 'presente steht im Mittelpunkt deiner freundlichen Bitte um eine Geschenkempfehlung.', en: 'presente is central to your friendly request for a gift recommendation.' } },
    distractors: ['Um presente barato', 'Para sua irmã'], placeholderCaption: { de: 'Bunte Tassen auf einem Regal in einem kleinen Geschenkeladen.', en: 'Colorful mugs on a shelf in a small gift shop.' }, songMood: 'thoughtful gift choice', visualNotes: 'Friendly gift shop, colorful handmade mugs, helpful assistant nearby.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'o-restaurante-e-tipico-e-pequeno-fica-perto-do-hotel', title: { de: 'Typisch essen gehen', en: 'Eat somewhere typical' },
    situation: { de: 'Du möchtest vom Hotel aus ein kleines, typisches Restaurant finden.', en: 'You want to find a small, typical restaurant from your hotel.' },
    pedagogicalGoal: 'Ein Restaurant mit zwei Adjektiven und perto de beschreiben.',
    targetText: 'O restaurante é típico e pequeno; fica perto do hotel.', baseText: { de: 'Das Restaurant ist typisch und klein; es liegt nahe beim Hotel.', en: 'The restaurant is typical and small; it is near the hotel.' },
    chunks: [{ targetText: 'O restaurante é típico', baseText: { de: 'Das Restaurant ist typisch', en: 'The restaurant is typical' } }, { targetText: 'e pequeno; fica', baseText: { de: 'und klein; es liegt', en: 'and small; it is' } }, { targetText: 'perto do hotel.', baseText: { de: 'nahe beim Hotel.', en: 'near the hotel.' } }],
    terms: [{ targetText: 'restaurante', baseText: { de: 'Restaurant', en: 'restaurant' } }, { targetText: 'típico', baseText: { de: 'typisch', en: 'typical' } }, { targetText: 'pequeno', baseText: { de: 'klein', en: 'small' } }, { targetText: 'perto do hotel', baseText: { de: 'nahe beim Hotel', en: 'near the hotel' } }, { targetText: 'hotel', baseText: { de: 'Hotel', en: 'hotel' } }],
    recall: { before: 'O restaurante é típico e ', answer: 'pequeno', after: '; fica perto do hotel.', fallbackChoices: ['pequeno', 'grande', 'caro', 'vazio'] }, speakRequired: ['restaurante', 'típico', 'pequeno'],
    sceneCaption: { de: 'Der Portier fragt, was du suchst: „Você conhece um restaurante típico perto do hotel?“', en: 'The porter asks what you are looking for: “Você conhece um restaurante típico perto do hotel?”' },
    trophyWord: { word: 'pequeno', meaning: { de: 'klein', en: 'small' }, example: 'O restaurante pequeno tem comida típica.', whyThisWord: { de: 'pequeno fügt einer Restaurantempfehlung ein hilfreiches Bild hinzu.', en: 'pequeno adds a helpful picture to a restaurant recommendation.' } },
    distractors: ['O hotel fica aberto', 'Atrás da praça'], placeholderCaption: { de: 'Kleines typisches Restaurant nahe einem Hotel in der Abenddämmerung.', en: 'Small typical restaurant near a hotel at dusk.' }, songMood: 'warm local dinner', visualNotes: 'Small Brazilian restaurant near a hotel, warm lights and welcoming entrance.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'eu-recomendo-a-praca-a-noite-e-bonita-e-animada', title: { de: 'Abends auf den Platz', en: 'The square at night' },
    situation: { de: 'Ein Tourist fragt dich, wohin du abends gern gehst.', en: 'A tourist asks where you like to go in the evening.' },
    pedagogicalGoal: 'Mit eu recomendo einen Abendort mit zwei Adjektiven empfehlen.',
    targetText: 'Eu recomendo a praça à noite: é bonita e animada.', baseText: { de: 'Ich empfehle den Platz abends: Er ist schön und lebhaft.', en: 'I recommend the square at night: it is beautiful and lively.' },
    chunks: [{ targetText: 'Eu recomendo a praça', baseText: { de: 'Ich empfehle den Platz', en: 'I recommend the square' } }, { targetText: 'à noite: é bonita', baseText: { de: 'abends: Er ist schön', en: 'at night: it is beautiful' } }, { targetText: 'e animada.', baseText: { de: 'und lebhaft.', en: 'and lively.' } }],
    terms: [{ targetText: 'recomendo', baseText: { de: 'ich empfehle', en: 'I recommend' } }, { targetText: 'praça', baseText: { de: 'Platz', en: 'square' } }, { targetText: 'à noite', baseText: { de: 'abends', en: 'at night' } }, { targetText: 'bonita', baseText: { de: 'schön', en: 'beautiful' } }, { targetText: 'animada', baseText: { de: 'lebhaft', en: 'lively' } }],
    recall: { before: 'Eu recomendo a praça à noite: é bonita e ', answer: 'animada', after: '.', fallbackChoices: ['animada', 'vazia', 'fechada', 'silenciosa'] }, speakRequired: ['recomendo', 'praça', 'animada'],
    sceneCaption: { de: 'Ein Tourist schaut auf die Karte und fragt: „Onde você gosta de ir à noite?“', en: 'A tourist looks at the map and asks: “Onde você gosta de ir à noite?”' },
    trophyWord: { word: 'animada', meaning: { de: 'lebhaft', en: 'lively' }, example: 'A praça fica animada à noite.', whyThisWord: { de: 'animada beschreibt eine lebendige Stimmung, die einen Abendort attraktiv macht.', en: 'animada describes a lively atmosphere that makes an evening place appealing.' } },
    distractors: ['A praça fica vazia', 'Depois do jantar'], placeholderCaption: { de: 'Belebter Platz mit Lichtern und Menschen am Abend.', en: 'Lively square with lights and people in the evening.' }, songMood: 'lively evening square', visualNotes: 'Brazilian town square at night, warm lights, people chatting, relaxed energy.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'eu-recomendo-suco-de-maracuja-com-o-peixe', title: { de: 'Saft zum Fisch', en: 'Juice with fish' },
    situation: { de: 'Zum Fisch möchtest du eine passende alkoholfreie Getränkempfehlung geben.', en: 'With fish, you want to give a suitable non-alcoholic drink recommendation.' },
    pedagogicalGoal: 'Mit eu recomendo ein Getränk passend zu einem Gericht vorschlagen.',
    targetText: 'Eu recomendo suco de maracujá com o peixe.', baseText: { de: 'Ich empfehle Maracujasaft zum Fisch.', en: 'I recommend passion fruit juice with the fish.' },
    chunks: [{ targetText: 'Eu recomendo', baseText: { de: 'Ich empfehle', en: 'I recommend' } }, { targetText: 'suco de maracujá', baseText: { de: 'Maracujasaft', en: 'passion fruit juice' } }, { targetText: 'com o peixe.', baseText: { de: 'zum Fisch.', en: 'with the fish.' } }],
    terms: [{ targetText: 'recomendo', baseText: { de: 'ich empfehle', en: 'I recommend' } }, { targetText: 'suco', baseText: { de: 'Saft', en: 'juice' } }, { targetText: 'maracujá', baseText: { de: 'Maracuja', en: 'passion fruit' } }, { targetText: 'peixe', baseText: { de: 'Fisch', en: 'fish' } }, { targetText: 'com o peixe', baseText: { de: 'zum Fisch', en: 'with the fish' } }],
    recall: { before: 'Eu recomendo suco de ', answer: 'maracujá', after: ' com o peixe.', fallbackChoices: ['maracujá', 'laranja', 'limão', 'morango'] }, speakRequired: ['recomendo', 'maracujá', 'peixe'],
    sceneCaption: { de: 'Der Kellner zeigt auf den Fisch und fragt: „Que bebida combina com o peixe?“', en: 'The waiter points to the fish and asks: “Que bebida combina com o peixe?”' },
    trophyWord: { word: 'maracujá', meaning: { de: 'Maracuja', en: 'passion fruit' }, example: 'Gosto de suco de maracujá gelado.', whyThisWord: { de: 'maracujá bringt einen typischen brasilianischen Saft in deine Empfehlung.', en: 'maracujá brings a typical Brazilian juice into your recommendation.' } },
    distractors: ['Com vinho branco', 'O peixe está frio'], placeholderCaption: { de: 'Maracujasaft neben einem Teller Fisch in einem Restaurant.', en: 'Passion fruit juice beside a plate of fish in a restaurant.' }, songMood: 'fresh tropical lunch', visualNotes: 'Tropical passion fruit juice and grilled fish at a sunny Brazilian lunch table.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'agradeco-pela-dica-voce-tem-razao-e-excelente', title: { de: 'Ein gutes Urteil', en: 'A good verdict' },
    situation: { de: 'Nach der Empfehlung fragt der Kellner, ob dir das Essen schmeckt.', en: 'After the recommendation, the waiter asks whether you like the food.' },
    pedagogicalGoal: 'Für einen Tipp danken und mit você tem razão ein positives Urteil geben.',
    targetText: 'Agradeço pela dica, você tem razão: é excelente.', baseText: { de: 'Danke für den Tipp, du hast recht: Es ist ausgezeichnet.', en: 'Thank you for the tip, you are right: it is excellent.' },
    chunks: [{ targetText: 'Agradeço pela dica,', baseText: { de: 'Danke für den Tipp,', en: 'Thank you for the tip,' } }, { targetText: 'você tem razão:', baseText: { de: 'du hast recht:', en: 'you are right:' } }, { targetText: 'é excelente.', baseText: { de: 'es ist ausgezeichnet.', en: 'it is excellent.' } }],
    terms: [{ targetText: 'agradeço', baseText: { de: 'ich danke', en: 'I thank' } }, { targetText: 'dica', baseText: { de: 'Tipp', en: 'tip' } }, { targetText: 'tem razão', baseText: { de: 'du hast recht', en: 'you are right' } }, { targetText: 'razão', baseText: { de: 'recht', en: 'right' } }, { targetText: 'excelente', baseText: { de: 'ausgezeichnet', en: 'excellent' } }],
    recall: { before: 'Agradeço pela dica, você tem ', answer: 'razão', after: ': é excelente.', fallbackChoices: ['razão', 'certeza', 'pressa', 'fome'] }, speakRequired: ['agradeço', 'razão', 'excelente'],
    sceneCaption: { de: 'Der Kellner kommt zurück und fragt: „A comida é boa?“', en: 'The waiter comes back and asks: “A comida é boa?”' },
    trophyWord: { word: 'excelente', meaning: { de: 'ausgezeichnet', en: 'excellent' }, example: 'O serviço deste restaurante é excelente.', whyThisWord: { de: 'excelente gibt deiner Empfehlung einen besonders klaren positiven Abschluss.', en: 'excelente gives your recommendation a particularly clear positive ending.' } },
    distractors: ['Não conheço este lugar', 'A comida é cara'], placeholderCaption: { de: 'Zufriedener Gast probiert ein empfohlenes Gericht im Restaurant.', en: 'Satisfied guest tasting a recommended dish in a restaurant.' }, songMood: 'warm satisfied conclusion', visualNotes: 'Happy diner enjoying a recommended local dish, warm restaurant ambience.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_SEVEN_METADATA, portugueseA2Practical7Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 7 abgeschlossen — du kannst Orte beschreiben und passende Empfehlungen geben.', en: 'You have completed Portuguese A2 Practical 7 — you can describe places and give suitable recommendations.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-8',
  title: 'Portuguese A2 Practical 8',
  shortTitle: 'A2 Practical 8',
  subtitle: { de: 'Wie läuft’s? Gefühle und Small Talk', en: 'How’s it going? Feelings and small talk' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical8Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'serio-que-bom-fico-muito-feliz-por-voce', title: { de: 'Gute Neuigkeiten', en: 'Good news' },
    situation: { de: 'Dein Nachbar erzählt dir erfreut von einer neuen Stelle.', en: 'Your neighbor happily tells you about a new job.' },
    pedagogicalGoal: 'Mit Sério? und Que bom! auf gute Neuigkeiten reagieren.',
    targetText: 'Sério? Que bom! Fico muito feliz por você.', baseText: { de: 'Wirklich? Wie schön! Ich freue mich sehr für dich.', en: 'Really? That is great! I am very happy for you.' },
    chunks: [{ targetText: 'Sério? Que bom!', baseText: { de: 'Wirklich? Wie schön!', en: 'Really? That is great!' } }, { targetText: 'Fico muito feliz', baseText: { de: 'Ich freue mich sehr', en: 'I am very happy' } }, { targetText: 'por você.', baseText: { de: 'für dich.', en: 'for you.' } }],
    terms: [{ targetText: 'sério', baseText: { de: 'wirklich', en: 'really' } }, { targetText: 'que bom', baseText: { de: 'wie schön', en: 'that is great' } }, { targetText: 'fico feliz', baseText: { de: 'ich freue mich', en: 'I am happy' } }, { targetText: 'feliz', baseText: { de: 'glücklich', en: 'happy' } }, { targetText: 'por você', baseText: { de: 'für dich', en: 'for you' } }],
    recall: { before: 'Sério? Que bom! Fico muito ', answer: 'feliz', after: ' por você.', fallbackChoices: ['feliz', 'triste', 'alegre', 'contente'] }, speakRequired: ['sério', 'feliz', 'você'],
    sceneCaption: { de: 'Dein Nachbar lächelt breit und sagt: „Tenho um emprego novo!“', en: 'Your neighbor smiles broadly and says: “Tenho um emprego novo!”' },
    trophyWord: { word: 'feliz', meaning: { de: 'glücklich', en: 'happy' }, example: 'Fico feliz com esta notícia.', whyThisWord: { de: 'feliz lässt deine positive Reaktion herzlich und klar klingen.', en: 'feliz makes your positive reaction sound warm and clear.' } },
    distractors: ['Que surpresa ruim', 'Não fico feliz'], placeholderCaption: { de: 'Zwei Nachbarn lächeln und teilen gute Neuigkeiten auf dem Gehweg.', en: 'Two neighbors smiling and sharing good news on the sidewalk.' }, songMood: 'bright good-news moment', visualNotes: 'Friendly neighbors on a sunny sidewalk, genuine shared excitement.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'esta-muito-calor-hoje-aqui-ne', title: { de: 'Ganz schön heiß', en: 'Very hot' },
    situation: { de: 'Draußen ist es an diesem Tag besonders heiß.', en: 'Outside, it is especially hot today.' },
    pedagogicalGoal: 'Mit está muito calor und né eine natürliche Wetterbemerkung machen.',
    targetText: 'Está muito calor hoje aqui, né?', baseText: { de: 'Heute ist es hier sehr heiß, oder?', en: 'It is very hot here today, right?' },
    chunks: [{ targetText: 'Está muito calor', baseText: { de: 'Es ist sehr heiß', en: 'It is very hot' } }, { targetText: 'hoje aqui,', baseText: { de: 'heute hier,', en: 'here today,' } }, { targetText: 'né?', baseText: { de: 'oder?', en: 'right?' } }],
    terms: [{ targetText: 'calor', baseText: { de: 'Hitze', en: 'heat' } }, { targetText: 'muito calor', baseText: { de: 'sehr heiß', en: 'very hot' } }, { targetText: 'hoje', baseText: { de: 'heute', en: 'today' } }, { targetText: 'aqui', baseText: { de: 'hier', en: 'here' } }, { targetText: 'né', baseText: { de: 'oder', en: 'right' } }],
    recall: { before: 'Está muito ', answer: 'calor', after: ' hoje aqui, né?', fallbackChoices: ['calor', 'frio', 'vento', 'sol'] }, speakRequired: ['calor', 'hoje', 'aqui'],
    sceneCaption: { de: 'Ein Nachbar fächelt sich Luft zu und sagt: „Nossa, está calor demais hoje.“', en: 'A neighbor fans themself and says: “Nossa, está calor demais hoje.”' },
    trophyWord: { word: 'calor', meaning: { de: 'Hitze', en: 'heat' }, example: 'No verão faz muito calor aqui.', whyThisWord: { de: 'calor ist das zentrale Wort für eine beiläufige Bemerkung über heißes Wetter.', en: 'calor is the key word for a casual remark about hot weather.' } },
    distractors: ['Está muito frio aqui', 'Amanhã está melhor'], placeholderCaption: { de: 'Sonniger Gehweg und Menschen, die sich im Schatten abkühlen.', en: 'Sunny sidewalk and people cooling down in the shade.' }, songMood: 'sunny tropical afternoon', visualNotes: 'Bright tropical heat, neighbors in shade with cold drinks, relaxed conversation.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'estou-com-sono-porque-dormi-pouco-ontem-a-noite', title: { de: 'Wenig Schlaf', en: 'Little sleep' },
    situation: { de: 'Ein Nachbar merkt, dass du müde wirkst.', en: 'A neighbor notices that you seem tired.' },
    pedagogicalGoal: 'Mit estou com sono Müdigkeit ausdrücken und mit dormi pouco einen Grund nennen.',
    targetText: 'Estou com sono porque dormi pouco ontem à noite.', baseText: { de: 'Ich bin schläfrig, weil ich gestern Nacht wenig geschlafen habe.', en: 'I am sleepy because I slept little last night.' },
    chunks: [{ targetText: 'Estou com sono', baseText: { de: 'Ich bin schläfrig', en: 'I am sleepy' } }, { targetText: 'porque dormi pouco', baseText: { de: 'weil ich wenig geschlafen habe', en: 'because I slept little' } }, { targetText: 'ontem à noite.', baseText: { de: 'gestern Nacht.', en: 'last night.' } }],
    terms: [{ targetText: 'sono', baseText: { de: 'Schläfrigkeit', en: 'sleepiness' } }, { targetText: 'dormi', baseText: { de: 'ich schlief', en: 'I slept' } }, { targetText: 'pouco', baseText: { de: 'wenig', en: 'little' } }, { targetText: 'ontem à noite', baseText: { de: 'gestern Nacht', en: 'last night' } }, { targetText: 'dormi pouco', baseText: { de: 'ich schlief wenig', en: 'I slept little' } }],
    recall: { before: 'Estou com ', answer: 'sono', after: ' porque dormi pouco ontem à noite.', fallbackChoices: ['sono', 'fome', 'pressa', 'sede'] }, speakRequired: ['sono', 'dormi', 'noite'],
    sceneCaption: { de: 'Dein Nachbar schaut dich aufmerksam an und fragt: „Você está com sono?“', en: 'Your neighbor looks at you attentively and asks: “Você está com sono?”' },
    trophyWord: { word: 'sono', meaning: { de: 'Schläfrigkeit', en: 'sleepiness' }, example: 'Estou com sono depois do almoço.', whyThisWord: { de: 'sono nennt Müdigkeit direkt und natürlich — estou com sono ist die Alltagsformel dafür.', en: 'sono names sleepiness without a gender-marked self-description.' } },
    distractors: ['Dormi bastante ontem', 'Estou sem trabalho'], placeholderCaption: { de: 'Müde Person mit einer Kaffeetasse am frühen Morgen.', en: 'Sleepy person with a coffee cup early in the morning.' }, songMood: 'soft sleepy morning', visualNotes: 'Quiet morning kitchen, warm coffee, gentle tired expression without drama.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'tenho-muito-trabalho-nesta-semana-mas-consigo-descansar-a-noite', title: { de: 'Viel zu tun', en: 'A lot to do' },
    situation: { de: 'Ein Freund fragt, ob du diese Woche viel zu tun hast.', en: 'A friend asks whether you have a lot to do this week.' },
    pedagogicalGoal: 'Mit tenho muito trabalho Belastung nennen und mit consigo eine positive Ergänzung geben.',
    targetText: 'Tenho muito trabalho nesta semana, mas consigo descansar à noite.', baseText: { de: 'Ich habe diese Woche viel Arbeit, aber ich schaffe es, mich abends auszuruhen.', en: 'I have a lot of work this week, but I manage to rest at night.' },
    chunks: [{ targetText: 'Tenho muito trabalho', baseText: { de: 'Ich habe viel Arbeit', en: 'I have a lot of work' } }, { targetText: 'nesta semana, mas', baseText: { de: 'diese Woche, aber', en: 'this week, but' } }, { targetText: 'consigo descansar à noite.', baseText: { de: 'ich schaffe es, mich abends auszuruhen.', en: 'I manage to rest at night.' } }],
    terms: [{ targetText: 'tenho muito trabalho', baseText: { de: 'ich habe viel Arbeit', en: 'I have a lot of work' } }, { targetText: 'semana', baseText: { de: 'Woche', en: 'week' } }, { targetText: 'consigo', baseText: { de: 'ich schaffe es', en: 'I manage' } }, { targetText: 'descansar', baseText: { de: 'sich ausruhen', en: 'to rest' } }, { targetText: 'à noite', baseText: { de: 'abends', en: 'at night' } }],
    recall: { before: 'Tenho muito trabalho nesta semana, mas ', answer: 'consigo', after: ' descansar à noite.', fallbackChoices: ['consigo', 'quero', 'prefiro', 'espero'] }, speakRequired: ['trabalho', 'consigo', 'descansar'],
    sceneCaption: { de: 'Ein Freund sieht auf deinen Kalender und fragt: „Você está com muito trabalho esta semana?“', en: 'A friend looks at your calendar and asks: “Você está com muito trabalho esta semana?”' },
    trophyWord: { word: 'consigo', meaning: { de: 'ich schaffe es', en: 'I manage' }, example: 'Consigo estudar um pouco à noite.', whyThisWord: { de: 'consigo zeigt, dass du trotz eines vollen Tages etwas bewältigst.', en: 'consigo shows that you manage something despite a full day.' } },
    distractors: ['Tenho pouco tempo', 'Descanso de manhã'], placeholderCaption: { de: 'Offener Kalender, Laptop und ruhiger Abend zu Hause.', en: 'Open calendar, laptop, and a quiet evening at home.' }, songMood: 'busy but balanced week', visualNotes: 'Work desk at dusk, calendar and laptop, calm evening pause after a busy day.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'esta-chovendo-de-novo-que-pena', title: { de: 'Regen schon wieder', en: 'Raining again' },
    situation: { de: 'Gerade fängt es draußen wieder an zu regnen.', en: 'It has just started raining outside again.' },
    pedagogicalGoal: 'Mit está chovendo de novo und que pena auf Regen reagieren.',
    targetText: 'Está chovendo de novo, que pena!', baseText: { de: 'Es regnet wieder, wie schade!', en: 'It is raining again, what a shame!' },
    chunks: [{ targetText: 'Está chovendo', baseText: { de: 'Es regnet', en: 'It is raining' } }, { targetText: 'de novo,', baseText: { de: 'wieder,', en: 'again,' } }, { targetText: 'que pena!', baseText: { de: 'wie schade!', en: 'what a shame!' } }],
    terms: [{ targetText: 'está chovendo', baseText: { de: 'es regnet', en: 'it is raining' } }, { targetText: 'chovendo', baseText: { de: 'regnend', en: 'raining' } }, { targetText: 'de novo', baseText: { de: 'wieder', en: 'again' } }, { targetText: 'que pena', baseText: { de: 'wie schade', en: 'what a shame' } }, { targetText: 'pena', baseText: { de: 'Schade', en: 'shame' } }],
    recall: { before: 'Está ', answer: 'chovendo', after: ' de novo, que pena!', fallbackChoices: ['chovendo', 'ventando', 'esfriando', 'escurecendo'] }, speakRequired: ['chovendo', 'novo', 'pena'],
    sceneCaption: { de: 'Jemand an der Bushaltestelle schaut nach oben und sagt: „Olha, está chovendo de novo.“', en: 'Someone at the bus stop looks up and says: “Olha, está chovendo de novo.”' },
    trophyWord: { word: 'chovendo', meaning: { de: 'regnend', en: 'raining' }, example: 'Está chovendo muito esta tarde.', whyThisWord: { de: 'chovendo ist die natürliche Form für eine beiläufige Wetterbeobachtung im Regen.', en: 'chovendo is the natural form for a casual weather observation in the rain.' } },
    distractors: ['Está fazendo sol', 'Que notícia boa'], placeholderCaption: { de: 'Regentropfen auf einer Bushaltestelle und Menschen unter Schirmen.', en: 'Raindrops at a bus stop and people under umbrellas.' }, songMood: 'gentle rainy pause', visualNotes: 'Soft rain over a Brazilian bus stop, umbrellas and reflective pavement.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'sinto-muito-isso-e-realmente-dificil', title: { de: 'Schlechte Nachrichten', en: 'Bad news' },
    situation: { de: 'Dein Nachbar erzählt dir, dass sein Hund krank ist.', en: 'Your neighbor tells you that their dog is sick.' },
    pedagogicalGoal: 'Mit sinto muito auf eine schwierige Nachricht einfühlsam reagieren.',
    targetText: 'Sinto muito, isso é realmente difícil.', baseText: { de: 'Es tut mir leid, das ist wirklich schwer.', en: 'I am sorry, that is really difficult.' },
    chunks: [{ targetText: 'Sinto muito,', baseText: { de: 'Es tut mir leid,', en: 'I am sorry,' } }, { targetText: 'isso é realmente', baseText: { de: 'das ist wirklich', en: 'that is really' } }, { targetText: 'difícil.', baseText: { de: 'schwer.', en: 'difficult.' } }],
    terms: [{ targetText: 'sinto muito', baseText: { de: 'es tut mir leid', en: 'I am sorry' } }, { targetText: 'realmente', baseText: { de: 'wirklich', en: 'really' } }, { targetText: 'difícil', baseText: { de: 'schwer', en: 'difficult' } }, { targetText: 'isso', baseText: { de: 'das', en: 'that' } }, { targetText: 'muito', baseText: { de: 'sehr', en: 'very' } }],
    recall: { before: 'Sinto muito, isso é realmente ', answer: 'difícil', after: '.', fallbackChoices: ['difícil', 'simples', 'rápido', 'claro'] }, speakRequired: ['sinto', 'realmente', 'difícil'],
    sceneCaption: { de: 'Dein Nachbar spricht leise und sagt: „Meu cachorro está doente.“', en: 'Your neighbor speaks softly and says: “Meu cachorro está doente.”' },
    trophyWord: { word: 'difícil', meaning: { de: 'schwer', en: 'difficult' }, example: 'Esta semana é difícil para ela.', whyThisWord: { de: 'difícil anerkennt eine belastende Nachricht ohne eine lange Erklärung.', en: 'difícil acknowledges a hard piece of news without a long explanation.' } },
    distractors: ['Não quero falar disso', 'Tudo está fácil'], placeholderCaption: { de: 'Zwei Nachbarn sprechen ruhig vor einem Wohnhaus miteinander.', en: 'Two neighbors talking quietly outside an apartment building.' }, songMood: 'gentle empathetic moment', visualNotes: 'Quiet, compassionate neighbor conversation outside a home, soft overcast light.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'esta-tudo-bastante-bem-e-com-voce', title: { de: 'Alles gut?', en: 'Everything good?' },
    situation: { de: 'Eine Kollegin fragt dich beim Kaffee, wie alles läuft.', en: 'A colleague asks you over coffee how everything is going.' },
    pedagogicalGoal: 'Mit bastante bem auf Small Talk reagieren und die Frage zurückgeben.',
    targetText: 'Está tudo bastante bem, e com você?', baseText: { de: 'Alles ist ziemlich gut, und bei dir?', en: 'Everything is quite good, and you?' },
    chunks: [{ targetText: 'Está tudo', baseText: { de: 'Alles ist', en: 'Everything is' } }, { targetText: 'bastante bem,', baseText: { de: 'ziemlich gut,', en: 'quite good,' } }, { targetText: 'e com você?', baseText: { de: 'und bei dir?', en: 'and you?' } }],
    terms: [{ targetText: 'tudo', baseText: { de: 'alles', en: 'everything' } }, { targetText: 'bastante', baseText: { de: 'ziemlich', en: 'quite' } }, { targetText: 'bem', baseText: { de: 'gut', en: 'well' } }, { targetText: 'bastante bem', baseText: { de: 'ziemlich gut', en: 'quite well' } }, { targetText: 'com você', baseText: { de: 'bei dir', en: 'with you' } }],
    recall: { before: 'Está tudo ', answer: 'bastante', after: ' bem, e com você?', fallbackChoices: ['bastante', 'muito', 'pouco', 'quase'] }, speakRequired: ['tudo', 'bastante', 'você'],
    sceneCaption: { de: 'Eine Kollegin setzt sich mit einem Kaffee zu dir und fragt: „Como vai tudo?“', en: 'A colleague sits down with coffee and asks: “Como vai tudo?”' },
    trophyWord: { word: 'bastante', meaning: { de: 'ziemlich', en: 'quite' }, example: 'O café está bastante quente.', whyThisWord: { de: 'bastante hilft dir, eine freundliche Antwort etwas abzustufen.', en: 'bastante helps you soften a friendly answer.' } },
    distractors: ['Estou muito triste', 'E sua família'], placeholderCaption: { de: 'Zwei Kolleginnen unterhalten sich mit Kaffee in einer Pause.', en: 'Two colleagues chatting over coffee during a break.' }, songMood: 'easy coffee break', visualNotes: 'Relaxed workplace coffee break, two colleagues in warm conversational light.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'que-noticia-otima-estou-muito-contente-por-voce', title: { de: 'Eine tolle Nachricht', en: 'Great news' },
    situation: { de: 'Dein Nachbar erzählt dir, dass er einen neuen Kurs beginnt.', en: 'Your neighbor tells you that they are starting a new course.' },
    pedagogicalGoal: 'Mit Que notícia ótima! begeistert auf gute Neuigkeiten reagieren.',
    targetText: 'Que notícia ótima! Estou muito contente por você.', baseText: { de: 'Was für tolle Neuigkeiten! Ich freue mich sehr für dich.', en: 'What great news! I am very happy for you.' },
    chunks: [{ targetText: 'Que notícia ótima!', baseText: { de: 'Was für tolle Neuigkeiten!', en: 'What great news!' } }, { targetText: 'Estou muito contente', baseText: { de: 'Ich freue mich sehr', en: 'I am very happy' } }, { targetText: 'por você.', baseText: { de: 'für dich.', en: 'for you.' } }],
    terms: [{ targetText: 'notícia', baseText: { de: 'Nachricht', en: 'news' } }, { targetText: 'ótima', baseText: { de: 'toll', en: 'great' } }, { targetText: 'contente', baseText: { de: 'froh', en: 'happy' } }, { targetText: 'muito contente', baseText: { de: 'sehr froh', en: 'very happy' } }, { targetText: 'por você', baseText: { de: 'für dich', en: 'for you' } }],
    recall: { before: 'Que ', answer: 'notícia', after: ' ótima! Estou muito contente por você.', fallbackChoices: ['notícia', 'pergunta', 'história', 'resposta'] }, speakRequired: ['notícia', 'ótima', 'contente'],
    sceneCaption: { de: 'Dein Nachbar wirkt gespannt und sagt: „Tenho uma notícia: começo um curso novo.“', en: 'Your neighbor looks excited and says: “Tenho uma notícia: começo um curso novo.”' },
    trophyWord: { word: 'notícia', meaning: { de: 'Nachricht', en: 'news' }, example: 'Tenho uma notícia boa para você.', whyThisWord: { de: 'notícia gibt deiner positiven Reaktion einen klaren Anlass.', en: 'notícia gives your positive reaction a clear reason.' } },
    distractors: ['Que pena mesmo', 'Estou pouco contente'], placeholderCaption: { de: 'Nachbarn teilen begeistert eine gute Neuigkeit auf einer Bank.', en: 'Neighbors enthusiastically sharing good news on a bench.' }, songMood: 'celebratory neighborhood news', visualNotes: 'Two neighbors sharing exciting news on a sunny bench, genuine joy.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'esta-bastante-frio-preciso-de-um-cafe-quente', title: { de: 'Kalter Morgen', en: 'Cold morning' },
    situation: { de: 'Am Morgen ist es ungewohnt kühl und du bestellst etwas Wärmendes.', en: 'The morning is unusually cold and you order something warming.' },
    pedagogicalGoal: 'Kühle mit bastante frio beschreiben und mit preciso de einen Wunsch nennen.',
    targetText: 'Está bastante frio, preciso de um café quente.', baseText: { de: 'Es ist ziemlich kalt, ich brauche einen heißen Kaffee.', en: 'It is quite cold; I need a hot coffee.' },
    chunks: [{ targetText: 'Está bastante frio,', baseText: { de: 'Es ist ziemlich kalt,', en: 'It is quite cold,' } }, { targetText: 'preciso de', baseText: { de: 'ich brauche', en: 'I need' } }, { targetText: 'um café quente.', baseText: { de: 'einen heißen Kaffee.', en: 'a hot coffee.' } }],
    terms: [{ targetText: 'frio', baseText: { de: 'kalt', en: 'cold' } }, { targetText: 'bastante frio', baseText: { de: 'ziemlich kalt', en: 'quite cold' } }, { targetText: 'preciso de', baseText: { de: 'ich brauche', en: 'I need' } }, { targetText: 'café', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: 'quente', baseText: { de: 'heiß', en: 'hot' } }],
    recall: { before: 'Está bastante frio, preciso de um café ', answer: 'quente', after: '.', fallbackChoices: ['quente', 'fraco', 'doce', 'grande'] }, speakRequired: ['frio', 'café', 'quente'],
    sceneCaption: { de: 'Die Barista schaut nach draußen und sagt: „De manhã está frio, né?“', en: 'The barista looks outside and says: “De manhã está frio, né?”' },
    trophyWord: { word: 'quente', meaning: { de: 'heiß', en: 'hot' }, example: 'Quero um chá quente de manhã.', whyThisWord: { de: 'quente macht deine kleine Bestellung an einem kalten Morgen passend.', en: 'quente makes your small order fit a cold morning.' } },
    distractors: ['O café está gelado', 'Preciso de água'], placeholderCaption: { de: 'Dampfender Kaffee auf einem Tisch an einem kühlen Morgen.', en: 'Steaming coffee on a table on a cool morning.' }, songMood: 'cozy cool morning', visualNotes: 'Steaming coffee by a café window on a cool Brazilian morning.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'que-dia-agradavel-ne-tudo-esta-muito-bem', title: { de: 'Ein angenehmer Tag', en: 'A pleasant day' },
    situation: { de: 'Am Ende eines ruhigen Tages triffst du deinen Nachbarn noch einmal.', en: 'At the end of a calm day, you meet your neighbor again.' },
    pedagogicalGoal: 'Einen guten Tagesabschluss mit agradável, né? und muito bem formulieren.',
    targetText: 'Que dia agradável, né? Tudo está muito bem.', baseText: { de: 'Was für ein angenehmer Tag, oder? Alles läuft sehr gut.', en: 'What a pleasant day, right? Everything is going very well.' },
    chunks: [{ targetText: 'Que dia agradável, né?', baseText: { de: 'Was für ein angenehmer Tag, oder?', en: 'What a pleasant day, right?' } }, { targetText: 'Tudo está', baseText: { de: 'Alles ist', en: 'Everything is' } }, { targetText: 'muito bem.', baseText: { de: 'sehr gut.', en: 'very well.' } }],
    terms: [{ targetText: 'dia', baseText: { de: 'Tag', en: 'day' } }, { targetText: 'agradável', baseText: { de: 'angenehm', en: 'pleasant' } }, { targetText: 'né', baseText: { de: 'oder', en: 'right' } }, { targetText: 'tudo', baseText: { de: 'alles', en: 'everything' } }, { targetText: 'muito bem', baseText: { de: 'sehr gut', en: 'very well' } }],
    recall: { before: 'Que dia ', answer: 'agradável', after: ', né? Tudo está muito bem.', fallbackChoices: ['agradável', 'curto', 'longo', 'nublado'] }, speakRequired: ['dia', 'agradável', 'bem'],
    sceneCaption: { de: 'Dein Nachbar lächelt zum Abschied und sagt: „O dia está tranquilo.“', en: 'Your neighbor smiles at farewell and says: “O dia está tranquilo.”' },
    trophyWord: { word: 'agradável', meaning: { de: 'angenehm', en: 'pleasant' }, example: 'A praça é agradável à noite.', whyThisWord: { de: 'agradável fasst die ruhige, positive Stimmung eines Tages zusammen.', en: 'agradável sums up a calm, positive day.' } },
    distractors: ['O dia está difícil', 'Está chovendo muito'], placeholderCaption: { de: 'Ruhige Straße im warmen Abendlicht nach einem angenehmen Tag.', en: 'Quiet street in warm evening light after a pleasant day.' }, songMood: 'contented evening wrap-up', visualNotes: 'Calm neighborhood street at golden hour, friendly farewell after a good day.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_EIGHT_METADATA, portugueseA2Practical8Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 8 abgeschlossen — du kannst über Wetter, Gefühle und deinen Alltag sprechen.', en: 'You have completed Portuguese A2 Practical 8 — you can talk about weather, feelings, and your everyday life.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_NINE_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-9',
  title: 'Portuguese A2 Practical 9',
  shortTitle: 'A2 Practical 9',
  subtitle: { de: 'Etwas stimmt nicht: Probleme lösen', en: 'Something’s wrong: solving problems' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical9Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'ja-liguei-mas-o-chuveiro-nao-funciona', title: { de: 'Die Dusche funktioniert nicht', en: 'The shower does not work' },
    situation: { de: 'Du rufst an der Hotelrezeption an, weil die Dusche in deinem Zimmer nicht funktioniert.', en: 'You call hotel reception because the shower in your room is not working.' },
    pedagogicalGoal: 'Mit já liguei eine frühere Handlung nennen und mit pode mandar alguém höflich eine Reparatur anfragen.',
    targetText: 'Já liguei, mas o chuveiro não funciona. Pode mandar alguém, por favor?', baseText: { de: 'Ich habe schon angerufen, aber die Dusche funktioniert nicht. Können Sie bitte jemanden schicken?', en: 'I already called, but the shower does not work. Can you send someone, please?' },
    chunks: [{ targetText: 'Já liguei, mas', baseText: { de: 'Ich habe schon angerufen, aber', en: 'I already called, but' } }, { targetText: 'o chuveiro não funciona.', baseText: { de: 'die Dusche funktioniert nicht.', en: 'the shower does not work.' } }, { targetText: 'Pode mandar alguém,', baseText: { de: 'Können Sie jemanden schicken,', en: 'Can you send someone,' } }, { targetText: 'por favor?', baseText: { de: 'bitte?', en: 'please?' } }],
    terms: [{ targetText: 'já liguei', baseText: { de: 'ich habe schon angerufen', en: 'I already called' } }, { targetText: 'chuveiro', baseText: { de: 'Dusche', en: 'shower' } }, { targetText: 'não funciona', baseText: { de: 'funktioniert nicht', en: 'does not work' } }, { targetText: 'mandar alguém', baseText: { de: 'jemanden schicken', en: 'send someone' } }, { targetText: 'alguém', baseText: { de: 'jemand', en: 'someone' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Já ', answer: 'liguei', after: ', mas o chuveiro não funciona. Pode mandar alguém, por favor?', fallbackChoices: ['liguei', 'paguei', 'comprei', 'perdi'] }, speakRequired: ['liguei', 'chuveiro', 'mandar'],
    sceneCaption: { de: 'Die Rezeptionistin fragt am Telefon: „Qual é o problema no quarto?“', en: 'The receptionist asks on the phone: “Qual é o problema no quarto?”' },
    trophyWord: { word: 'chuveiro', meaning: { de: 'Dusche', en: 'shower' }, example: 'O chuveiro do quarto está frio.', whyThisWord: { de: 'chuveiro benennt das konkrete Hotelproblem, das du kurz und höflich lösen möchtest.', en: 'chuveiro names the specific hotel problem you want to solve briefly and politely.' } },
    distractors: ['O chuveiro está quente', 'Vou esperar aqui'], placeholderCaption: { de: 'Hotelbad mit einer Dusche und einem Telefon neben dem Waschbecken.', en: 'Hotel bathroom with a shower and a phone beside the sink.' }, songMood: 'calm hotel repair request', visualNotes: 'Clean hotel bathroom, phone call to reception, practical repair request without drama.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'pedi-a-sopa-mas-ainda-nao-chegou', title: { de: 'Die Suppe kommt nicht', en: 'The soup has not arrived' },
    situation: { de: 'Im Restaurant wartest du schon eine Weile auf deine bestellte Suppe.', en: 'At the restaurant, you have been waiting a while for the soup you ordered.' },
    pedagogicalGoal: 'Mit pedi eine abgeschlossene Bestellung nennen und mit ainda não chegou freundlich nachfragen.',
    targetText: 'Pedi a sopa, mas ela ainda não chegou. Pode ver, por favor?', baseText: { de: 'Ich habe die Suppe bestellt, aber sie ist noch nicht gekommen. Können Sie bitte nachsehen?', en: 'I ordered the soup, but it has not arrived yet. Can you check, please?' },
    chunks: [{ targetText: 'Pedi a sopa,', baseText: { de: 'Ich habe die Suppe bestellt,', en: 'I ordered the soup,' } }, { targetText: 'mas ela ainda não chegou.', baseText: { de: 'aber sie ist noch nicht gekommen.', en: 'but it has not arrived yet.' } }, { targetText: 'Pode ver,', baseText: { de: 'Können Sie nachsehen,', en: 'Can you check,' } }, { targetText: 'por favor?', baseText: { de: 'bitte?', en: 'please?' } }],
    terms: [{ targetText: 'pedi', baseText: { de: 'ich bestellte', en: 'I ordered' } }, { targetText: 'sopa', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'ainda não', baseText: { de: 'noch nicht', en: 'not yet' } }, { targetText: 'chegou', baseText: { de: 'ist angekommen', en: 'arrived' } }, { targetText: 'pode ver', baseText: { de: 'können Sie nachsehen', en: 'can you check' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Pedi a sopa, mas ela ', answer: 'ainda', after: ' não chegou. Pode ver, por favor?', fallbackChoices: ['ainda', 'sempre', 'também', 'quase'] }, speakRequired: ['pedi', 'ainda', 'chegou'],
    sceneCaption: { de: 'Der Kellner sieht auf deinen Tisch und fragt: „A sopa já chegou?“', en: 'The waiter looks at your table and asks: “A sopa já chegou?”' },
    trophyWord: { word: 'ainda', meaning: { de: 'noch', en: 'yet; still' }, example: 'A sopa ainda não chegou.', whyThisWord: { de: 'ainda zeigt höflich, dass du auf etwas Bestelltes weiterhin wartest.', en: 'ainda politely shows that you are still waiting for something ordered.' } },
    distractors: ['A sopa está deliciosa', 'Quero pedir sobremesa'], placeholderCaption: { de: 'Restauranttisch mit leerem Platz für eine Suppe und einem Kellner in der Nähe.', en: 'Restaurant table with an empty place for soup and a waiter nearby.' }, songMood: 'patient restaurant follow-up', visualNotes: 'Warm restaurant table, a diner waiting calmly while a waiter checks the order.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'wifi-nao-esta-funcionando-liguei-antes', title: { de: 'Kein Internet im Zimmer', en: 'No internet in the room' },
    situation: { de: 'In deinem Hotelzimmer funktioniert das WLAN nicht, und du bittest die Rezeption um Hilfe.', en: 'The wi-fi in your hotel room is not working, and you ask reception for help.' },
    pedagogicalGoal: 'Mit liguei eine frühere Kontaktaufnahme nennen und mit não está funcionando ein aktuelles Problem beschreiben.',
    targetText: 'O wi-fi não está funcionando. Liguei antes; pode verificar, por favor?', baseText: { de: 'Das WLAN funktioniert nicht. Ich habe vorher angerufen; können Sie bitte nachsehen?', en: 'The wi-fi is not working. I called earlier; can you check, please?' },
    chunks: [{ targetText: 'O wi-fi não está funcionando.', baseText: { de: 'Das WLAN funktioniert nicht.', en: 'The wi-fi is not working.' } }, { targetText: 'Liguei antes;', baseText: { de: 'Ich habe vorher angerufen;', en: 'I called earlier;' } }, { targetText: 'pode verificar, por favor?', baseText: { de: 'können Sie bitte nachsehen?', en: 'can you check, please?' } }],
    terms: [{ targetText: 'wi-fi', baseText: { de: 'WLAN', en: 'wi-fi' } }, { targetText: 'não está funcionando', baseText: { de: 'funktioniert nicht', en: 'is not working' } }, { targetText: 'liguei antes', baseText: { de: 'ich rief vorher an', en: 'I called earlier' } }, { targetText: 'antes', baseText: { de: 'vorher', en: 'earlier' } }, { targetText: 'verificar', baseText: { de: 'nachsehen; prüfen', en: 'check' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'O wi-fi não está ', answer: 'funcionando', after: '. Liguei antes; pode verificar, por favor?', fallbackChoices: ['funcionando', 'aberto', 'pronto', 'silencioso'] }, speakRequired: ['liguei', 'antes', 'verificar'],
    sceneCaption: { de: 'Die Mitarbeiterin an der Rezeption nimmt den Hörer ab und sagt: „Como posso ajudar?“', en: 'The receptionist answers the phone and says: “Como posso ajudar?”' },
    trophyWord: { word: 'verificar', meaning: { de: 'nachsehen; prüfen', en: 'check' }, example: 'Pode verificar o wi-fi, por favor?', whyThisWord: { de: 'verificar gibt dir eine höfliche, klare Bitte, damit ein technisches Problem geprüft wird.', en: 'verificar gives you a polite, clear request to have a technical problem checked.' } },
    distractors: ['O sinal está ótimo', 'Preciso de uma senha'], placeholderCaption: { de: 'Hotelzimmer mit Laptop, WLAN-Symbol und Telefon zur Rezeption.', en: 'Hotel room with a laptop, wi-fi symbol, and a phone to reception.' }, songMood: 'quiet room tech fix', visualNotes: 'Simple hotel desk, laptop without connection, guest calmly contacting reception.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'perdi-a-chave-nao-consigo-entrar', title: { de: 'Ausgesperrt', en: 'Locked out' },
    situation: { de: 'Du stehst vor deinem Hotelzimmer und kannst nicht hinein, weil du den Schlüssel verloren hast.', en: 'You are outside your hotel room and cannot get in because you lost the key.' },
    pedagogicalGoal: 'Mit perdi einen Verlust nennen und mit não consigo entrar höflich um direkte Hilfe bitten.',
    targetText: 'Perdi a chave e não consigo entrar. Pode ajudar, por favor?', baseText: { de: 'Ich habe den Schlüssel verloren und kann nicht hinein. Können Sie bitte helfen?', en: 'I lost the key and cannot get in. Can you help, please?' },
    chunks: [{ targetText: 'Perdi a chave', baseText: { de: 'Ich habe den Schlüssel verloren', en: 'I lost the key' } }, { targetText: 'e não consigo entrar.', baseText: { de: 'und kann nicht hinein.', en: 'and cannot get in.' } }, { targetText: 'Pode ajudar, por favor?', baseText: { de: 'Können Sie bitte helfen?', en: 'Can you help, please?' } }],
    terms: [{ targetText: 'perdi', baseText: { de: 'ich verlor', en: 'I lost' } }, { targetText: 'chave', baseText: { de: 'Schlüssel', en: 'key' } }, { targetText: 'não consigo', baseText: { de: 'ich kann nicht', en: 'I cannot' } }, { targetText: 'entrar', baseText: { de: 'hineingehen', en: 'get in' } }, { targetText: 'pode ajudar', baseText: { de: 'können Sie helfen', en: 'can you help' } }],
    recall: { before: '', answer: 'Perdi', after: ' a chave e não consigo entrar. Pode ajudar, por favor?', fallbackChoices: ['Perdi', 'Achei', 'Comprei', 'Paguei'] }, speakRequired: ['perdi', 'consigo', 'entrar'],
    sceneCaption: { de: 'Die Rezeptionistin sieht dich vor der Tür stehen und fragt: „Você está bem?“', en: 'The receptionist sees you standing by the door and asks: “Você está bem?”' },
    trophyWord: { word: 'entrar', meaning: { de: 'hineingehen', en: 'get in' }, example: 'Não consigo entrar no quarto.', whyThisWord: { de: 'entrar macht das unmittelbare Problem klar, wenn du vor einer verschlossenen Tür stehst.', en: 'entrar makes the immediate problem clear when you are standing at a locked door.' } },
    distractors: ['A chave está na mesa', 'Quero outro quarto'], placeholderCaption: { de: 'Hotelflur mit verschlossener Zimmertür und einer Person bei der Rezeption.', en: 'Hotel corridor with a locked room door and a person at reception.' }, songMood: 'brief lockout solution', visualNotes: 'Quiet hotel corridor, guest asking reception for a quick, practical solution.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'taxi-ainda-nao-chegou-chamar-outro', title: { de: 'Das Taxi kommt nicht', en: 'The taxi has not arrived' },
    situation: { de: 'Du wartest vor dem Hotel auf ein Taxi, das noch nicht angekommen ist.', en: 'You are waiting outside the hotel for a taxi that has not arrived yet.' },
    pedagogicalGoal: 'Mit ainda não chegou ein ausstehendes Taxi nennen und mit pode chamar outro eine Lösung erbitten.',
    targetText: 'O táxi ainda não chegou. Pode chamar outro, por favor?', baseText: { de: 'Das Taxi ist noch nicht gekommen. Können Sie bitte ein anderes Taxi rufen?', en: 'The taxi has not arrived yet. Can you call another one, please?' },
    chunks: [{ targetText: 'O táxi ainda não chegou.', baseText: { de: 'Das Taxi ist noch nicht gekommen.', en: 'The taxi has not arrived yet.' } }, { targetText: 'Pode chamar outro,', baseText: { de: 'Können Sie ein anderes rufen,', en: 'Can you call another one,' } }, { targetText: 'por favor?', baseText: { de: 'bitte?', en: 'please?' } }],
    terms: [{ targetText: 'táxi', baseText: { de: 'Taxi', en: 'taxi' } }, { targetText: 'ainda não chegou', baseText: { de: 'ist noch nicht gekommen', en: 'has not arrived yet' } }, { targetText: 'chegou', baseText: { de: 'ist angekommen', en: 'arrived' } }, { targetText: 'chamar', baseText: { de: 'rufen', en: 'call' } }, { targetText: 'outro', baseText: { de: 'ein anderer', en: 'another one' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'O táxi ainda não chegou. Pode ', answer: 'chamar', after: ' outro, por favor?', fallbackChoices: ['chamar', 'trocar', 'buscar', 'marcar'] }, speakRequired: ['táxi', 'chegou', 'chamar'],
    sceneCaption: { de: 'Die Rezeptionistin schaut auf die Straße und sagt: „O táxi ainda não está aqui.“', en: 'The receptionist looks out to the street and says: “O táxi ainda não está aqui.”' },
    trophyWord: { word: 'chamar', meaning: { de: 'rufen', en: 'call' }, example: 'Pode chamar um táxi para mim?', whyThisWord: { de: 'chamar gibt dir eine kurze, natürliche Bitte, wenn ein Taxi ausbleibt.', en: 'chamar gives you a short, natural request when a taxi fails to arrive.' } },
    distractors: ['O táxi está esperando', 'Vou a pé agora'], placeholderCaption: { de: 'Hoteleingang mit wartender Person und leerer Straße für ein Taxi.', en: 'Hotel entrance with a waiting person and an empty street for a taxi.' }, songMood: 'patient curbside solution', visualNotes: 'Hotel entrance at dusk, receptionist and guest arranging a replacement taxi.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'paguei-dez-reais-falta-troco', title: { de: 'Ein Real fehlt', en: 'One real is missing' },
    situation: { de: 'An der Kasse bemerkst du, dass bei deinem Wechselgeld ein Real fehlt.', en: 'At the register, you notice that one real is missing from your change.' },
    pedagogicalGoal: 'Mit paguei eine Zahlung nennen und mit falta um real no troco höflich eine Korrektur anstoßen.',
    targetText: 'Paguei dez reais, mas falta um real no troco. Pode conferir?', baseText: { de: 'Ich habe zehn Reais bezahlt, aber ein Real fehlt im Wechselgeld. Können Sie das prüfen?', en: 'I paid ten reais, but one real is missing from the change. Can you check?' },
    chunks: [{ targetText: 'Paguei dez reais,', baseText: { de: 'Ich habe zehn Reais bezahlt,', en: 'I paid ten reais,' } }, { targetText: 'mas falta um real', baseText: { de: 'aber ein Real fehlt', en: 'but one real is missing' } }, { targetText: 'no troco.', baseText: { de: 'im Wechselgeld.', en: 'from the change.' } }, { targetText: 'Pode conferir?', baseText: { de: 'Können Sie das prüfen?', en: 'Can you check?' } }],
    terms: [{ targetText: 'paguei', baseText: { de: 'ich bezahlte', en: 'I paid' } }, { targetText: 'dez reais', baseText: { de: 'zehn Reais', en: 'ten reais' } }, { targetText: 'falta', baseText: { de: 'es fehlt', en: 'is missing' } }, { targetText: 'um real', baseText: { de: 'ein Real', en: 'one real' } }, { targetText: 'troco', baseText: { de: 'Wechselgeld', en: 'change' } }, { targetText: 'conferir', baseText: { de: 'prüfen', en: 'check' } }],
    recall: { before: 'Paguei dez reais, mas falta um real no ', answer: 'troco', after: '. Pode conferir?', fallbackChoices: ['troco', 'recibo', 'cartão', 'caixa'] }, speakRequired: ['paguei', 'reais', 'troco'],
    sceneCaption: { de: 'Die Kassiererin reicht dir das Wechselgeld und fragt: „Está tudo certo?“', en: 'The cashier hands you the change and asks: “Está tudo certo?”' },
    trophyWord: { word: 'troco', meaning: { de: 'Wechselgeld', en: 'change' }, example: 'O troco é um real.', whyThisWord: { de: 'troco hilft dir, einen kleinen Fehlbetrag an der Kasse sachlich anzusprechen.', en: 'troco helps you raise a small missing amount at the register calmly.' } },
    distractors: ['O preço está baixo', 'Quero pagar depois'], placeholderCaption: { de: 'Kassentresen mit Münzen, einem Zehn-Reais-Schein und einer Quittung.', en: 'Checkout counter with coins, a ten-real note, and a receipt.' }, songMood: 'calm cash correction', visualNotes: 'Small Brazilian shop counter, customer politely checking the change with the cashier.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'comprei-celular-hoje-nao-esta-funcionando', title: { de: 'Das neue Handy geht nicht', en: 'The new phone does not work' },
    situation: { de: 'Du kommst mit einem heute gekauften Handy in den Laden zurück, weil es nicht funktioniert.', en: 'You return to the shop with a phone bought today because it is not working.' },
    pedagogicalGoal: 'Mit comprei hoje einen Kauf nennen und mit não está funcionando höflich um eine Prüfung bitten.',
    targetText: 'Comprei este celular hoje, mas não está funcionando. Pode olhar, por favor?', baseText: { de: 'Ich habe dieses Handy heute gekauft, aber es funktioniert nicht. Können Sie bitte nachsehen?', en: 'I bought this phone today, but it is not working. Can you take a look, please?' },
    chunks: [{ targetText: 'Comprei este celular hoje,', baseText: { de: 'Ich habe dieses Handy heute gekauft,', en: 'I bought this phone today,' } }, { targetText: 'mas não está funcionando.', baseText: { de: 'aber es funktioniert nicht.', en: 'but it is not working.' } }, { targetText: 'Pode olhar, por favor?', baseText: { de: 'Können Sie bitte nachsehen?', en: 'Can you take a look, please?' } }],
    terms: [{ targetText: 'comprei', baseText: { de: 'ich kaufte', en: 'I bought' } }, { targetText: 'celular', baseText: { de: 'Handy', en: 'mobile phone' } }, { targetText: 'hoje', baseText: { de: 'heute', en: 'today' } }, { targetText: 'não está funcionando', baseText: { de: 'funktioniert nicht', en: 'is not working' } }, { targetText: 'olhar', baseText: { de: 'nachsehen', en: 'take a look' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Comprei este ', answer: 'celular', after: ' hoje, mas não está funcionando. Pode olhar, por favor?', fallbackChoices: ['celular', 'carregador', 'bilhete', 'pacote'] }, speakRequired: ['comprei', 'celular', 'olhar'],
    sceneCaption: { de: 'Der Verkäufer sieht das Gerät an und fragt: „O celular novo está bem?“', en: 'The salesperson looks at the device and asks: “O celular novo está bem?”' },
    trophyWord: { word: 'celular', meaning: { de: 'Handy', en: 'mobile phone' }, example: 'Meu celular novo não está funcionando.', whyThisWord: { de: 'celular ist das klare Alltagswort, um ein Problem mit einem neu gekauften Handy zu erklären.', en: 'celular is the clear everyday word for explaining a problem with a newly bought phone.' } },
    distractors: ['O celular está pronto', 'Quero uma capa azul'], placeholderCaption: { de: 'Handyshop mit einem neuen Telefon auf einem Servicetresen.', en: 'Phone shop with a new phone on a service counter.' }, songMood: 'helpful new-phone repair', visualNotes: 'Bright phone shop, customer returning a new device for a quick check.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'pedi-a-sopa-esta-fria-esquentar', title: { de: 'Die Suppe ist kalt', en: 'The soup is cold' },
    situation: { de: 'Deine Suppe kommt an, ist aber kalt, und du bittest freundlich um eine Lösung.', en: 'Your soup arrives but is cold, and you politely ask for a solution.' },
    pedagogicalGoal: 'Mit pedi eine frühere Bestellung nennen und mit pode esquentar eine höfliche Bitte formulieren.',
    targetText: 'Pedi a sopa, mas está fria. Pode esquentar, por favor?', baseText: { de: 'Ich habe die Suppe bestellt, aber sie ist kalt. Können Sie sie bitte warm machen?', en: 'I ordered the soup, but it is cold. Can you heat it, please?' },
    chunks: [{ targetText: 'Pedi a sopa,', baseText: { de: 'Ich habe die Suppe bestellt,', en: 'I ordered the soup,' } }, { targetText: 'mas está fria.', baseText: { de: 'aber sie ist kalt.', en: 'but it is cold.' } }, { targetText: 'Pode esquentar,', baseText: { de: 'Können Sie sie warm machen,', en: 'Can you heat it,' } }, { targetText: 'por favor?', baseText: { de: 'bitte?', en: 'please?' } }],
    terms: [{ targetText: 'pedi', baseText: { de: 'ich bestellte', en: 'I ordered' } }, { targetText: 'sopa', baseText: { de: 'Suppe', en: 'soup' } }, { targetText: 'fria', baseText: { de: 'kalt', en: 'cold' } }, { targetText: 'esquentar', baseText: { de: 'warm machen', en: 'heat' } }, { targetText: 'pode esquentar', baseText: { de: 'können Sie warm machen', en: 'can you heat' } }, { targetText: 'por favor', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: 'Pedi a sopa, mas está fria. Pode ', answer: 'esquentar', after: ', por favor?', fallbackChoices: ['esquentar', 'trocar', 'trazer', 'fechar'] }, speakRequired: ['pedi', 'fria', 'esquentar'],
    sceneCaption: { de: 'Der Kellner stellt die Schüssel ab und fragt: „A sopa está boa?“', en: 'The waiter sets down the bowl and asks: “A sopa está boa?”' },
    trophyWord: { word: 'esquentar', meaning: { de: 'warm machen', en: 'heat' }, example: 'Pode esquentar a sopa, por favor?', whyThisWord: { de: 'esquentar gibt dir eine direkte, höfliche Lösung für ein kaltes Essen.', en: 'esquentar gives you a direct, polite solution for cold food.' } },
    distractors: ['A sopa está pronta', 'Quero água sem gás'], placeholderCaption: { de: 'Restauranttisch mit einer dampflosen Schüssel Suppe und einem aufmerksamen Kellner.', en: 'Restaurant table with a bowl of cold soup and an attentive waiter.' }, songMood: 'gentle meal repair', visualNotes: 'Calm restaurant moment, waiter taking cold soup back to warm it properly.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'dormi-pouco-barulho-trocar-quarto', title: { de: 'Zu laut zum Schlafen', en: 'Too noisy to sleep' },
    situation: { de: 'Nach einer lauten Nacht bittest du an der Rezeption um ein anderes Zimmer.', en: 'After a noisy night, you ask reception for another room.' },
    pedagogicalGoal: 'Mit dormi pouco eine vergangene Nacht beschreiben und mit tem muito barulho eine höfliche Zimmeränderung begründen.',
    targetText: 'Dormi pouco porque tem muito barulho. Pode trocar meu quarto?', baseText: { de: 'Ich habe wenig geschlafen, weil es sehr laut ist. Können Sie mein Zimmer wechseln?', en: 'I slept little because there is a lot of noise. Can you change my room?' },
    chunks: [{ targetText: 'Dormi pouco', baseText: { de: 'Ich habe wenig geschlafen', en: 'I slept little' } }, { targetText: 'porque tem muito barulho.', baseText: { de: 'weil es sehr laut ist.', en: 'because there is a lot of noise.' } }, { targetText: 'Pode trocar meu quarto?', baseText: { de: 'Können Sie mein Zimmer wechseln?', en: 'Can you change my room?' } }],
    terms: [{ targetText: 'dormi', baseText: { de: 'ich schlief', en: 'I slept' } }, { targetText: 'pouco', baseText: { de: 'wenig', en: 'little' } }, { targetText: 'barulho', baseText: { de: 'Lärm', en: 'noise' } }, { targetText: 'trocar', baseText: { de: 'wechseln', en: 'change' } }, { targetText: 'meu quarto', baseText: { de: 'mein Zimmer', en: 'my room' } }, { targetText: 'porque', baseText: { de: 'weil', en: 'because' } }],
    recall: { before: 'Dormi ', answer: 'pouco', after: ' porque tem muito barulho. Pode trocar meu quarto?', fallbackChoices: ['pouco', 'bem', 'cedo', 'junto'] }, speakRequired: ['dormi', 'pouco', 'quarto'],
    sceneCaption: { de: 'Die Rezeptionistin fragt am Morgen: „O quarto está bom para você?“', en: 'The receptionist asks in the morning: “O quarto está bom para você?”' },
    trophyWord: { word: 'pouco', meaning: { de: 'wenig', en: 'little' }, example: 'Dormi pouco por causa do barulho.', whyThisWord: { de: 'pouco hilft dir, die Folge einer lauten Nacht in einem kurzen Satz zu nennen.', en: 'pouco helps you state the result of a noisy night in a short sentence.' } },
    distractors: ['O quarto é silencioso', 'Quero dormir cedo'], placeholderCaption: { de: 'Hotelrezeption am Morgen mit einer Person, die um ein ruhigeres Zimmer bittet.', en: 'Hotel reception in the morning with a guest asking for a quieter room.' }, songMood: 'tired morning room change', visualNotes: 'Soft morning hotel light, courteous reception conversation after a noisy night.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'liguei-agora-tudo-esta-funcionando', title: { de: 'Jetzt ist alles in Ordnung', en: 'Everything works now' },
    situation: { de: 'Nach der Reparatur kommt jemand vom Hotelpersonal noch einmal vorbei und fragt nach dem Ergebnis.', en: 'After the repair, a hotel staff member checks in again and asks whether it worked.' },
    pedagogicalGoal: 'Mit liguei antes auf eine frühere Handlung zurückblicken und mit agora tudo está funcionando die Lösung freundlich bestätigen.',
    targetText: 'Liguei antes, e agora tudo está funcionando. Obrigado pela ajuda.', baseText: { de: 'Ich habe vorher angerufen, und jetzt funktioniert alles. Danke für die Hilfe.', en: 'I called earlier, and now everything is working. Thank you for the help.' },
    chunks: [{ targetText: 'Liguei antes,', baseText: { de: 'Ich habe vorher angerufen,', en: 'I called earlier,' } }, { targetText: 'e agora tudo está funcionando.', baseText: { de: 'und jetzt funktioniert alles.', en: 'and now everything is working.' } }, { targetText: 'Obrigado pela ajuda.', baseText: { de: 'Danke für die Hilfe.', en: 'Thank you for the help.' } }],
    terms: [{ targetText: 'liguei antes', baseText: { de: 'ich rief vorher an', en: 'I called earlier' } }, { targetText: 'agora', baseText: { de: 'jetzt', en: 'now' } }, { targetText: 'tudo', baseText: { de: 'alles', en: 'everything' } }, { targetText: 'está funcionando', baseText: { de: 'funktioniert', en: 'is working' } }, { targetText: 'ajuda', baseText: { de: 'Hilfe', en: 'help' } }],
    recall: { before: 'Liguei antes, e ', answer: 'agora', after: ' tudo está funcionando. Obrigado pela ajuda.', fallbackChoices: ['agora', 'ontem', 'sempre', 'depois'] }, speakRequired: ['liguei', 'agora', 'funcionando'],
    sceneCaption: { de: 'Ein Mitarbeiter kommt zurück und fragt: „Agora está tudo bem?“', en: 'A staff member comes back and asks: “Agora está tudo bem?”' },
    trophyWord: { word: 'agora', meaning: { de: 'jetzt', en: 'now' }, example: 'Agora tudo está bem.', whyThisWord: { de: 'agora macht die Erleichterung deutlich, wenn ein Problem gerade gelöst wurde.', en: 'agora makes the relief clear when a problem has just been solved.' } },
    distractors: ['Ainda não funciona', 'Preciso de outro quarto'], placeholderCaption: { de: 'Hotelmitarbeiter prüft eine gelungene Reparatur, während der Gast dankbar nickt.', en: 'Hotel staff member checks a successful repair while the guest nods gratefully.' }, songMood: 'relieved repair resolution', visualNotes: 'Warm hotel service moment, practical fix complete and a polite thank-you.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_NINE_METADATA, portugueseA2Practical9Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 9 abgeschlossen — du kannst Probleme mit einer vergangenen Handlung und der aktuellen Situation höflich lösen.', en: 'You have completed Portuguese A2 Practical 9 — you can politely solve problems by linking a past action to the current situation.' },
)

export const GUIDED_TODAY_PATH_PORTUGUESE_A2_TEN_METADATA: GuidedPathMetadata = {
  id: 'portuguese-a2-practical-10',
  title: 'Portuguese A2 Practical 10',
  shortTitle: 'A2 Practical 10',
  subtitle: { de: 'Deine Geschichte: ankommen und verabschieden', en: 'Your story: arriving and saying goodbye' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Portuguese', estimatedMinutes: 5,
}

const portugueseA2Practical10Inputs: PortugueseA2LessonInput[] = [
  makePortugueseA2CompactLesson({
    slug: 'sou-da-alemanha-e-agora-moro-aqui', title: { de: 'Woher du kommst', en: 'Where you are from' },
    situation: { de: 'Ein neuer Nachbar fragt dich, woher du kommst und ob du jetzt in der Gegend wohnst.', en: 'A new neighbor asks where you are from and whether you live in the area now.' },
    pedagogicalGoal: 'Mit sou da und moro aqui kurz erzählen, woher du kommst und wo du jetzt lebst.',
    targetText: 'Sou da Alemanha e agora moro aqui.', baseText: { de: 'Ich komme aus Deutschland und wohne jetzt hier.', en: 'I am from Germany and live here now.' },
    chunks: [{ targetText: 'Sou da Alemanha', baseText: { de: 'Ich komme aus Deutschland', en: 'I am from Germany' } }, { targetText: 'e agora moro', baseText: { de: 'und wohne jetzt', en: 'and live now' } }, { targetText: 'aqui.', baseText: { de: 'hier.', en: 'here.' } }],
    terms: [{ targetText: 'sou da', baseText: { de: 'ich komme aus', en: 'I am from' } }, { targetText: 'Alemanha', baseText: { de: 'Deutschland', en: 'Germany' } }, { targetText: 'agora', baseText: { de: 'jetzt', en: 'now' } }, { targetText: 'moro', baseText: { de: 'ich wohne', en: 'I live' } }, { targetText: 'aqui', baseText: { de: 'hier', en: 'here' } }],
    recall: { before: 'Sou da Alemanha e agora ', answer: 'moro', after: ' aqui.', fallbackChoices: ['moro', 'trabalho', 'estudo', 'viajo'] }, speakRequired: ['sou', 'moro', 'aqui'],
    sceneCaption: { de: 'Dein neuer Nachbar stellt sich vor und fragt: „Você é daqui?“', en: 'Your new neighbor introduces themself and asks: “Você é daqui?”' },
    trophyWord: { word: 'aqui', meaning: { de: 'hier', en: 'here' }, example: 'Agora moro aqui perto.', whyThisWord: { de: 'aqui verankert deine kurze Vorstellung an deinem neuen Lebensort.', en: 'aqui anchors your brief introduction in the place where you now live.' } },
    distractors: ['Sou de outro bairro', 'Moro perto do rio'], placeholderCaption: { de: 'Zwei Nachbarn stellen sich vor einem Wohnhaus vor.', en: 'Two neighbors introducing themselves outside an apartment building.' }, songMood: 'warm newcomer introduction', visualNotes: 'Friendly Brazilian neighborhood introduction, open doorway and relaxed smiles.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'trabalho-escritorio-no-centro-perto-daqui', title: { de: 'Deine Arbeit', en: 'Your work' },
    situation: { de: 'Beim Kaffee fragt eine Nachbarin, wo du tagsüber arbeitest.', en: 'Over coffee, a neighbor asks where you work during the day.' },
    pedagogicalGoal: 'Mit trabalho em um escritório kurz sagen, wo du arbeitest.',
    targetText: 'Trabalho em um escritório no centro, perto daqui.', baseText: { de: 'Ich arbeite in einem Büro im Zentrum, ganz in der Nähe.', en: 'I work in an office downtown, nearby.' },
    chunks: [{ targetText: 'Trabalho em um escritório', baseText: { de: 'Ich arbeite in einem Büro', en: 'I work in an office' } }, { targetText: 'no centro,', baseText: { de: 'im Zentrum,', en: 'downtown,' } }, { targetText: 'perto daqui.', baseText: { de: 'ganz in der Nähe.', en: 'nearby.' } }],
    terms: [{ targetText: 'trabalho', baseText: { de: 'ich arbeite', en: 'I work' } }, { targetText: 'escritório', baseText: { de: 'Büro', en: 'office' } }, { targetText: 'no centro', baseText: { de: 'im Zentrum', en: 'downtown' } }, { targetText: 'perto', baseText: { de: 'nah', en: 'near' } }, { targetText: 'daqui', baseText: { de: 'von hier', en: 'from here' } }],
    recall: { before: 'Trabalho em um ', answer: 'escritório', after: ' no centro, perto daqui.', fallbackChoices: ['escritório', 'restaurante', 'mercado', 'museu'] }, speakRequired: ['trabalho', 'escritório', 'centro'],
    sceneCaption: { de: 'Eine Nachbarin setzt sich mit einem Kaffee zu dir und fragt: „Onde você trabalha?“', en: 'A neighbor sits down with coffee and asks: “Onde você trabalha?”' },
    trophyWord: { word: 'escritório', meaning: { de: 'Büro', en: 'office' }, example: 'Meu escritório fica no centro.', whyThisWord: { de: 'escritório gibt deiner kurzen Vorstellung einen konkreten Arbeitsort.', en: 'escritório gives your brief introduction a concrete workplace.' } },
    distractors: ['Trabalho só à noite', 'O escritório está fechado'], placeholderCaption: { de: 'Helles Bürofenster über einer Straße im Stadtzentrum.', en: 'Bright office window above a downtown street.' }, songMood: 'steady city workday', visualNotes: 'Brazilian city-center office, coffee conversation before a calm workday.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'estudo-portugues-porque-gosto-da-musica-brasileira', title: { de: 'Warum Portugiesisch?', en: 'Why Portuguese?' },
    situation: { de: 'Ein Freund fragt dich, warum du Portugiesisch lernst.', en: 'A friend asks why you are learning Portuguese.' },
    pedagogicalGoal: 'Mit porque einen persönlichen, einfachen Grund für das Portugiesischlernen geben.',
    targetText: 'Estudo português porque gosto da música brasileira.', baseText: { de: 'Ich lerne Portugiesisch, weil ich brasilianische Musik mag.', en: 'I study Portuguese because I like Brazilian music.' },
    chunks: [{ targetText: 'Estudo português', baseText: { de: 'Ich lerne Portugiesisch', en: 'I study Portuguese' } }, { targetText: 'porque gosto', baseText: { de: 'weil ich sie mag', en: 'because I like it' } }, { targetText: 'da música brasileira.', baseText: { de: 'brasilianische Musik.', en: 'Brazilian music.' } }],
    terms: [{ targetText: 'estudo', baseText: { de: 'ich lerne', en: 'I study' } }, { targetText: 'português', baseText: { de: 'Portugiesisch', en: 'Portuguese' } }, { targetText: 'porque', baseText: { de: 'weil', en: 'because' } }, { targetText: 'música', baseText: { de: 'Musik', en: 'music' } }, { targetText: 'brasileira', baseText: { de: 'brasilianisch', en: 'Brazilian' } }],
    recall: { before: 'Estudo português porque gosto da ', answer: 'música', after: ' brasileira.', fallbackChoices: ['música', 'comida', 'praça', 'família'] }, speakRequired: ['estudo', 'português', 'música'],
    sceneCaption: { de: 'Ein Freund fragt beim Spaziergang: „Por que você estuda português?“', en: 'A friend asks while you walk: “Por que você estuda português?”' },
    trophyWord: { word: 'música', meaning: { de: 'Musik', en: 'music' }, example: 'A música brasileira toca no café.', whyThisWord: { de: 'música gibt deiner persönlichen Antwort einen lebendigen und natürlichen Grund.', en: 'música gives your personal answer a lively, natural reason.' } },
    distractors: ['Porque trabalho muito', 'Estudo francês também'], placeholderCaption: { de: 'Freunde hören brasilianische Musik in einem Café.', en: 'Friends listening to Brazilian music in a café.' }, songMood: 'musical language motivation', visualNotes: 'Café speakers playing Brazilian music, friends talking about learning Portuguese.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'estou-aqui-ha-duas-semanas', title: { de: 'Seit zwei Wochen hier', en: 'Here for two weeks' },
    situation: { de: 'Dein Nachbar fragt, wie lange du schon in der Gegend bist.', en: 'Your neighbor asks how long you have been in the area.' },
    pedagogicalGoal: 'Mit há duas semanas die Dauer deines jetzigen Aufenthalts ausdrücken.',
    targetText: 'Estou aqui há duas semanas e gosto muito daqui.', baseText: { de: 'Ich bin seit zwei Wochen hier und mag es hier sehr.', en: 'I have been here for two weeks and like it here a lot.' },
    chunks: [{ targetText: 'Estou aqui há duas semanas', baseText: { de: 'Ich bin seit zwei Wochen hier', en: 'I have been here for two weeks' } }, { targetText: 'e gosto muito', baseText: { de: 'und mag es sehr', en: 'and like it a lot' } }, { targetText: 'daqui.', baseText: { de: 'hier.', en: 'here.' } }],
    terms: [{ targetText: 'estou aqui', baseText: { de: 'ich bin hier', en: 'I am here' } }, { targetText: 'há duas semanas', baseText: { de: 'seit zwei Wochen', en: 'for two weeks' } }, { targetText: 'semanas', baseText: { de: 'Wochen', en: 'weeks' } }, { targetText: 'gosto muito', baseText: { de: 'ich mag sehr', en: 'I like a lot' } }, { targetText: 'daqui', baseText: { de: 'hier', en: 'here' } }],
    recall: { before: 'Estou aqui ', answer: 'há', after: ' duas semanas e gosto muito daqui.', fallbackChoices: ['há', 'em', 'por', 'com'] }, speakRequired: ['aqui', 'há', 'semanas'],
    sceneCaption: { de: 'Dein Nachbar hält kurz an und fragt: „Você está aqui há muito tempo?“', en: 'Your neighbor stops for a moment and asks: “Você está aqui há muito tempo?”' },
    trophyWord: { word: 'daqui', meaning: { de: 'hier', en: 'from here; this place' }, example: 'Gosto muito daqui.', whyThisWord: { de: 'daqui macht deine positive Verbindung zu deinem neuen Ort persönlich.', en: 'daqui makes your positive connection to your new place personal.' } },
    distractors: ['Estou aqui amanhã', 'Moro longe daqui'], placeholderCaption: { de: 'Nachbarn reden vor einem Wohnhaus nach zwei Wochen in der neuen Gegend.', en: 'Neighbors talking outside an apartment building after two weeks in the new area.' }, songMood: 'settling into a new place', visualNotes: 'Comfortable neighborhood chat, newcomer already feeling at home after two weeks.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'minha-familia-esta-na-alemanha-falamos-domingo', title: { de: 'Die Familie zu Hause', en: 'Family back home' },
    situation: { de: 'Eine Nachbarin fragt, ob deine Familie auch in der Nähe wohnt.', en: 'A neighbor asks whether your family lives nearby too.' },
    pedagogicalGoal: 'Mit minha família está und falamos todo domingo über regelmäßigen Kontakt mit der Familie sprechen.',
    targetText: 'Minha família está na Alemanha, e falamos todo domingo.', baseText: { de: 'Meine Familie ist in Deutschland, und wir sprechen jeden Sonntag.', en: 'My family is in Germany, and we speak every Sunday.' },
    chunks: [{ targetText: 'Minha família está', baseText: { de: 'Meine Familie ist', en: 'My family is' } }, { targetText: 'na Alemanha,', baseText: { de: 'in Deutschland,', en: 'in Germany,' } }, { targetText: 'e falamos todo domingo.', baseText: { de: 'und wir sprechen jeden Sonntag.', en: 'and we speak every Sunday.' } }],
    terms: [{ targetText: 'minha família', baseText: { de: 'meine Familie', en: 'my family' } }, { targetText: 'Alemanha', baseText: { de: 'Deutschland', en: 'Germany' } }, { targetText: 'falamos', baseText: { de: 'wir sprechen', en: 'we speak' } }, { targetText: 'todo domingo', baseText: { de: 'jeden Sonntag', en: 'every Sunday' } }, { targetText: 'domingo', baseText: { de: 'Sonntag', en: 'Sunday' } }],
    recall: { before: 'Minha ', answer: 'família', after: ' está na Alemanha, e falamos todo domingo.', fallbackChoices: ['família', 'amiga', 'vizinha', 'colega'] }, speakRequired: ['família', 'falamos', 'domingo'],
    sceneCaption: { de: 'Eine Nachbarin fragt freundlich: „Sua família mora perto daqui?“', en: 'A neighbor asks warmly: “Sua família mora perto daqui?”' },
    trophyWord: { word: 'família', meaning: { de: 'Familie', en: 'family' }, example: 'Minha família fala comigo todo domingo.', whyThisWord: { de: 'família hilft dir, den regelmäßigen Kontakt zu Menschen zu Hause einfach zu beschreiben.', en: 'família helps you simply describe regular contact with people back home.' } },
    distractors: ['Minha família trabalha aqui', 'Falamos só amanhã'], placeholderCaption: { de: 'Person ruft die Familie an einem ruhigen Sonntag per Video an.', en: 'Person video-calling family on a quiet Sunday.' }, songMood: 'warm weekly family call', visualNotes: 'Cozy home video call, warm Sunday light, lasting connection across distance.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'gosto-de-cozinhar-e-caminhar-no-bairro', title: { de: 'Was du gern machst', en: 'What you enjoy doing' },
    situation: { de: 'Ein Nachbar fragt, was du am Wochenende gern machst.', en: 'A neighbor asks what you like doing at the weekend.' },
    pedagogicalGoal: 'Mit gosto de zwei vertraute Freizeitaktivitäten nennen.',
    targetText: 'Gosto de cozinhar e caminhar no bairro.', baseText: { de: 'Ich koche gern und gehe gern im Viertel spazieren.', en: 'I like cooking and walking around the neighborhood.' },
    chunks: [{ targetText: 'Gosto de cozinhar', baseText: { de: 'Ich koche gern', en: 'I like cooking' } }, { targetText: 'e caminhar', baseText: { de: 'und gehe spazieren', en: 'and walking' } }, { targetText: 'no bairro.', baseText: { de: 'im Viertel.', en: 'around the neighborhood.' } }],
    terms: [{ targetText: 'gosto de', baseText: { de: 'ich mag; ich mache gern', en: 'I like' } }, { targetText: 'cozinhar', baseText: { de: 'kochen', en: 'cook' } }, { targetText: 'caminhar', baseText: { de: 'spazieren gehen', en: 'walk' } }, { targetText: 'bairro', baseText: { de: 'Viertel', en: 'neighborhood' } }, { targetText: 'no bairro', baseText: { de: 'im Viertel', en: 'in the neighborhood' } }],
    recall: { before: 'Gosto de ', answer: 'cozinhar', after: ' e caminhar no bairro.', fallbackChoices: ['cozinhar', 'trabalhar', 'viajar', 'esperar'] }, speakRequired: ['gosto', 'cozinhar', 'caminhar'],
    sceneCaption: { de: 'Dein Nachbar schlägt einen Spaziergang vor und fragt: „O que você gosta de fazer no fim de semana?“', en: 'Your neighbor suggests a walk and asks: “O que você gosta de fazer no fim de semana?”' },
    trophyWord: { word: 'cozinhar', meaning: { de: 'kochen', en: 'cook' }, example: 'Gosto de cozinhar aos domingos.', whyThisWord: { de: 'cozinhar lässt deine Vorstellung durch eine alltägliche, persönliche Vorliebe lebendig werden.', en: 'cozinhar makes your introduction more vivid through an everyday personal preference.' } },
    distractors: ['Quero ficar no hotel', 'Caminho só de táxi'], placeholderCaption: { de: 'Person kocht zu Hause und spaziert später durch ein grünes Viertel.', en: 'Person cooking at home and later walking through a leafy neighborhood.' }, songMood: 'easy weekend routine', visualNotes: 'Home cooking followed by a relaxed neighborhood walk in warm afternoon light.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'de-manha-trabalho-a-noite-estudo-portugues', title: { de: 'Dein Tagesrhythmus', en: 'Your daily rhythm' },
    situation: { de: 'Beim Abendspaziergang fragt ein Freund, wie dein normaler Tag aussieht.', en: 'On an evening walk, a friend asks what your usual day is like.' },
    pedagogicalGoal: 'Mit de manhã und à noite eine einfache tägliche Routine beschreiben.',
    targetText: 'De manhã trabalho, e à noite estudo português.', baseText: { de: 'Morgens arbeite ich, und abends lerne ich Portugiesisch.', en: 'In the morning I work, and at night I study Portuguese.' },
    chunks: [{ targetText: 'De manhã trabalho,', baseText: { de: 'Morgens arbeite ich,', en: 'In the morning I work,' } }, { targetText: 'e à noite', baseText: { de: 'und abends', en: 'and at night' } }, { targetText: 'estudo português.', baseText: { de: 'lerne ich Portugiesisch.', en: 'I study Portuguese.' } }],
    terms: [{ targetText: 'de manhã', baseText: { de: 'morgens', en: 'in the morning' } }, { targetText: 'trabalho', baseText: { de: 'ich arbeite', en: 'I work' } }, { targetText: 'à noite', baseText: { de: 'abends', en: 'at night' } }, { targetText: 'estudo', baseText: { de: 'ich lerne', en: 'I study' } }, { targetText: 'português', baseText: { de: 'Portugiesisch', en: 'Portuguese' } }],
    recall: { before: 'De manhã trabalho, e à noite ', answer: 'estudo', after: ' português.', fallbackChoices: ['estudo', 'descanso', 'cozinho', 'caminho'] }, speakRequired: ['manhã', 'noite', 'estudo'],
    sceneCaption: { de: 'Ein Freund fragt auf dem Gehweg: „Como é seu dia normal?“', en: 'A friend asks on the sidewalk: “Como é seu dia normal?”' },
    trophyWord: { word: 'estudo', meaning: { de: 'ich lerne', en: 'I study' }, example: 'Estudo português à noite.', whyThisWord: { de: 'estudo fasst einen wichtigen Teil deiner neuen Alltagsroutine zusammen.', en: 'estudo sums up an important part of your new daily routine.' } },
    distractors: ['Trabalho no domingo', 'Estudo no escritório'], placeholderCaption: { de: 'Morgendlicher Schreibtisch und abendliches Portugiesischbuch auf demselben Tisch.', en: 'Morning work desk and an evening Portuguese book on the same table.' }, songMood: 'steady evening study habit', visualNotes: 'Daily rhythm from office morning to calm Portuguese study at home in the evening.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'entendo-quase-tudo-e-falo-devagar', title: { de: 'Dein Fortschritt', en: 'Your progress' },
    situation: { de: 'Eine Nachbarin fragt, ob du im Alltag schon viel Portugiesisch verstehst.', en: 'A neighbor asks whether you already understand much Portuguese in daily life.' },
    pedagogicalGoal: 'Mit entendo quase tudo und falo devagar den eigenen Fortschritt realistisch beschreiben.',
    targetText: 'Entendo quase tudo e falo devagar agora.', baseText: { de: 'Ich verstehe jetzt fast alles und spreche langsam.', en: 'I understand almost everything and speak slowly now.' },
    chunks: [{ targetText: 'Entendo quase tudo', baseText: { de: 'Ich verstehe fast alles', en: 'I understand almost everything' } }, { targetText: 'e falo devagar', baseText: { de: 'und spreche langsam', en: 'and speak slowly' } }, { targetText: 'agora.', baseText: { de: 'jetzt.', en: 'now.' } }],
    terms: [{ targetText: 'entendo', baseText: { de: 'ich verstehe', en: 'I understand' } }, { targetText: 'quase tudo', baseText: { de: 'fast alles', en: 'almost everything' } }, { targetText: 'falo', baseText: { de: 'ich spreche', en: 'I speak' } }, { targetText: 'devagar', baseText: { de: 'langsam', en: 'slowly' } }, { targetText: 'agora', baseText: { de: 'jetzt', en: 'now' } }],
    recall: { before: 'Entendo ', answer: 'quase', after: ' tudo e falo devagar agora.', fallbackChoices: ['quase', 'muito', 'pouco', 'sempre'] }, speakRequired: ['entendo', 'quase', 'devagar'],
    sceneCaption: { de: 'Eine Nachbarin lächelt und fragt: „Você entende bastante português agora?“', en: 'A neighbor smiles and asks: “Você entende bastante português agora?”' },
    trophyWord: { word: 'quase', meaning: { de: 'fast; beinahe', en: 'almost' }, example: 'Entendo quase tudo agora.', whyThisWord: { de: 'quase lässt dich deinen Fortschritt zuversichtlich, aber ehrlich ausdrücken.', en: 'quase lets you describe your progress confidently but honestly.' } },
    distractors: ['Não entendo nada', 'Falo muito rápido'], placeholderCaption: { de: 'Nachbarn reden langsam und freundlich auf einer Bank im Viertel.', en: 'Neighbors speaking slowly and warmly on a neighborhood bench.' }, songMood: 'quiet language confidence', visualNotes: 'Relaxed neighborhood conversation, learner speaking slowly with growing confidence.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'ano-que-vem-vou-voltar-para-ca', title: { de: 'Wiederkommen', en: 'Coming back' },
    situation: { de: 'Ein Freund fragt, ob du die Gegend im nächsten Jahr wieder besuchen möchtest.', en: 'A friend asks whether you would like to visit the area again next year.' },
    pedagogicalGoal: 'Mit vou voltar einen einfachen Plan für das nächste Jahr ausdrücken.',
    targetText: 'Ano que vem vou voltar para cá.', baseText: { de: 'Nächstes Jahr werde ich hierher zurückkommen.', en: 'Next year I am going to come back here.' },
    chunks: [{ targetText: 'Ano que vem', baseText: { de: 'nächstes Jahr', en: 'next year' } }, { targetText: 'vou voltar', baseText: { de: 'werde ich zurückkommen', en: 'I am going to come back' } }, { targetText: 'para cá.', baseText: { de: 'hierher.', en: 'here.' } }],
    terms: [{ targetText: 'ano que vem', baseText: { de: 'nächstes Jahr', en: 'next year' } }, { targetText: 'vou voltar', baseText: { de: 'ich werde zurückkommen', en: 'I am going to come back' } }, { targetText: 'voltar', baseText: { de: 'zurückkommen', en: 'come back' } }, { targetText: 'para cá', baseText: { de: 'hierher', en: 'here' } }, { targetText: 'vem', baseText: { de: 'kommt', en: 'comes' } }],
    recall: { before: 'Ano que vem vou ', answer: 'voltar', after: ' para cá.', fallbackChoices: ['voltar', 'trabalhar', 'mudar', 'pagar'] }, speakRequired: ['ano', 'vem', 'voltar'],
    sceneCaption: { de: 'Ein Freund zeigt auf den Kalender und fragt: „Você volta no ano que vem?“', en: 'A friend points to the calendar and asks: “Você volta no ano que vem?”' },
    trophyWord: { word: 'voltar', meaning: { de: 'zurückkommen', en: 'come back' }, example: 'Quero voltar para cá no próximo ano.', whyThisWord: { de: 'voltar schließt deine Geschichte mit einem einfachen, positiven Plan ab.', en: 'voltar closes your story with a simple, positive plan.' } },
    distractors: ['Volto só amanhã', 'Quero mudar de bairro'], placeholderCaption: { de: 'Zwei Freunde mit einem Kalender und Blick auf die vertraute Nachbarschaft.', en: 'Two friends with a calendar, looking over the familiar neighborhood.' }, songMood: 'hopeful return plan', visualNotes: 'Warm farewell planning, familiar neighborhood view and a marked next-year calendar.',
  }),
  makePortugueseA2CompactLesson({
    slug: 'fiz-amigos-aqui-obrigado-por-estas-duas-semanas-ate-a-proxima', title: { de: 'Der Abschied', en: 'The goodbye' },
    situation: { de: 'Am letzten Abend verabschiedest du dich von deinem Nachbarn und dankst ihm für die gemeinsame Zeit.', en: 'On your last evening, you say goodbye to your neighbor and thank them for the time together.' },
    pedagogicalGoal: 'Mit fiz einen kurzen Rückblick geben und mit obrigado por estas duas semanas freundlich Abschied nehmen.',
    targetText: 'Fiz amigos aqui. Obrigado por estas duas semanas. Até a próxima!', baseText: { de: 'Ich habe hier Freunde gefunden. Danke für diese zwei Wochen. Bis zum nächsten Mal!', en: 'I made friends here. Thank you for these two weeks. See you next time!' },
    chunks: [{ targetText: 'Fiz amigos aqui.', baseText: { de: 'Ich habe hier Freunde gefunden.', en: 'I made friends here.' } }, { targetText: 'Obrigado por', baseText: { de: 'Danke für', en: 'Thank you for' } }, { targetText: 'estas duas semanas.', baseText: { de: 'diese zwei Wochen.', en: 'these two weeks.' } }, { targetText: 'Até a próxima!', baseText: { de: 'Bis zum nächsten Mal!', en: 'See you next time!' } }],
    terms: [{ targetText: 'fiz', baseText: { de: 'ich machte; fand', en: 'I made' } }, { targetText: 'amigos', baseText: { de: 'Freunde', en: 'friends' } }, { targetText: 'aqui', baseText: { de: 'hier', en: 'here' } }, { targetText: 'duas semanas', baseText: { de: 'zwei Wochen', en: 'two weeks' } }, { targetText: 'estas duas semanas', baseText: { de: 'diese zwei Wochen', en: 'these two weeks' } }, { targetText: 'até a próxima', baseText: { de: 'bis zum nächsten Mal', en: 'see you next time' } }],
    recall: { before: 'Fiz ', answer: 'amigos', after: ' aqui. Obrigado por estas duas semanas. Até a próxima!', fallbackChoices: ['amigos', 'planos', 'trabalhos', 'cursos'] }, speakRequired: ['fiz', 'amigos', 'semanas'],
    sceneCaption: { de: 'Dein Nachbar winkt an der Tür und sagt: „Boa viagem amanhã.“', en: 'Your neighbor waves at the door and says: “Boa viagem amanhã.”' },
    trophyWord: { word: 'amigos', meaning: { de: 'Freunde', en: 'friends' }, example: 'Meus amigos moram aqui.', whyThisWord: { de: 'amigos gibt deinem Abschied einen warmen Rückblick auf die Menschen, die du kennengelernt hast.', en: 'amigos gives your goodbye a warm reflection on the people you have met.' } },
    distractors: ['Fiz uma viagem longa', 'Obrigado pelo café'], placeholderCaption: { de: 'Zwei Nachbarn verabschieden sich herzlich an einer Wohnungstür am Abend.', en: 'Two neighbors warmly saying goodbye at an apartment door in the evening.' }, songMood: 'warm grateful farewell', visualNotes: 'Gentle evening farewell between neighbors, warm doorway light and a grateful smile.',
  }),
]

export const PORTUGUESE_A2_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makePortugueseA2PracticalLessons(
  GUIDED_TODAY_PATH_PORTUGUESE_A2_TEN_METADATA, portugueseA2Practical10Inputs,
  { de: 'Du hast Portugiesisch A2 Praxis 10 abgeschlossen — du kannst deine Geschichte erzählen, deinen Alltag beschreiben und dich herzlich verabschieden.', en: 'You have completed Portuguese A2 Practical 10 — you can tell your story, describe your everyday life, and say goodbye warmly.' },
)
